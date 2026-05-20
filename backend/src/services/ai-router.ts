import OpenAI from 'openai'
import { logger } from '../lib/logger'
import { prisma } from '../lib/db'
import { redis } from '../lib/redis'
import crypto from 'crypto'

interface ModelConfig {
  provider: 'deepseek' | 'openai' | 'anthropic' | 'google'
  model: string
  maxTokens: number
  temperature: number
  costPer1kInput: number
  costPer1kOutput: number
}

const MODELS: Record<string, ModelConfig> = {
  'deepseek-chat': {
    provider: 'deepseek',
    model: 'deepseek-chat',
    maxTokens: 4000,
    temperature: 0.7,
    costPer1kInput: 0.00014,
    costPer1kOutput: 0.00028,
  },
  'gpt-4o': {
    provider: 'openai',
    model: 'gpt-4o',
    maxTokens: 4000,
    temperature: 0.7,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
  },
  'claude-3-5-sonnet': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4000,
    temperature: 0.7,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
}

// Task routing logic
function selectModel(task: string, complexity: 'low' | 'medium' | 'high', userPlan: string): string {
  if (userPlan === 'enterprise') {
    if (task === 'content_writer' && complexity === 'high') return 'claude-3-5-sonnet'
    if (complexity === 'high' || task === 'competitor_analysis') return 'gpt-4o'
  }
  
  if (userPlan === 'pro') {
    if (complexity === 'high') return 'gpt-4o'
  }

  // Default / Free plan
  return 'deepseek-chat'
}

export class AIRouter {
  private clients: Map<string, any> = new Map()

  constructor() {
    if (process.env.DEEPSEEK_API_KEY) {
      this.clients.set('deepseek', new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      }))
    }
    
    if (process.env.OPENAI_API_KEY) {
      this.clients.set('openai', new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      }))
    }
    // Anthropic and Google clients would be initialized here if using their SDKs directly
  }

  async generate(params: {
    task: string
    complexity?: 'low' | 'medium' | 'high'
    systemPrompt: string
    userPrompt: string
    userId: string
    userPlan: string
    stream?: boolean
  }): Promise<{ content: string; usage: any; model: string } | ReadableStream> {
    const modelKey = selectModel(params.task, params.complexity || 'medium', params.userPlan)
    const config = MODELS[modelKey]
    const client = this.clients.get(config.provider)

    if (!client) {
      logger.warn(`AI client not configured for ${config.provider}, falling back to DeepSeek`)
      return this.generateFallback(params)
    }

    // Check semantic cache first
    const cached = await this.checkCache(params.userPrompt)
    if (cached && !params.stream) {
      logger.info('AI cache hit', { task: params.task })
      return { content: cached, usage: { cached: true }, model: modelKey }
    }

    try {
      if (params.stream) {
        return this.streamResponse(client, config, params)
      }

      const response = await client.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      })

      const content = response.choices[0]?.message?.content || ''
      const usage = response.usage

      // Store in cache (async)
      this.storeCache(params.userPrompt, content).catch(err => logger.error('Cache store failed', err))

      // Log usage (async)
      this.logUsage(params.userId, modelKey, usage, params.task).catch(err => logger.error('Usage log failed', err))

      return { content, usage, model: modelKey }
    } catch (error) {
      logger.error('AI generation failed, falling back', { error, model: modelKey })
      return this.generateFallback(params)
    }
  }

  private async generateFallback(params: any): Promise<{ content: string; usage: any; model: string }> {
    const fallback = this.clients.get('deepseek')
    if (!fallback) {
      throw new Error('No AI clients configured (including fallback)')
    }

    const response = await fallback.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    })

    return {
      content: response.choices[0]?.message?.content || '',
      usage: response.usage,
      model: 'deepseek-chat-fallback',
    }
  }

  private async streamResponse(client: any, config: ModelConfig, params: any): Promise<ReadableStream> {
    const stream = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: true,
    })

    const encoder = new TextEncoder()
    const self = this

    return new ReadableStream({
      async start(controller) {
        let fullContent = ''
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            fullContent += content
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content, done: false })}\n\n`))
          }
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: '', done: true })}\n\n`))
          
          // Async storage after stream completes
          Promise.all([
            self.storeCache(params.userPrompt, fullContent),
            self.logUsage(params.userId, config.model, { total_tokens: 0 }, params.task) // Simplified usage for streaming
          ]).catch(err => logger.error('Post-stream logging failed', err))
          
          controller.close()
        } catch (error) {
          logger.error('Streaming failed', error)
          controller.error(error)
        }
      }
    })
  }

  private async checkCache(prompt: string): Promise<string | null> {
    try {
      const hash = crypto.createHash('md5').update(prompt).digest('hex')
      return await redis.get(`ai:cache:${hash}`)
    } catch (error) {
      return null
    }
  }

  private async storeCache(prompt: string, response: string): Promise<void> {
    try {
      const hash = crypto.createHash('md5').update(prompt).digest('hex')
      await redis.setex(`ai:cache:${hash}`, 86400, response) // 24h TTL
    } catch (error) {
      logger.error('Failed to store AI cache', error)
    }
  }

  private async logUsage(userId: string, model: string, usage: any, task: string): Promise<void> {
    const config = MODELS[model] || MODELS['deepseek-chat']
    if (!usage) return

    const promptTokens = usage.prompt_tokens || 0
    const completionTokens = usage.completion_tokens || 0
    
    const cost = (promptTokens / 1000 * config.costPer1kInput) +
                 (completionTokens / 1000 * config.costPer1kOutput)

    await prisma.eventLog.create({
      data: {
        userId,
        type: 'ai_usage',
        payload: { 
          model, 
          task, 
          tokens: usage.total_tokens || (promptTokens + completionTokens), 
          cost 
        },
      }
    })
  }
}

export const aiRouter = new AIRouter()
