import OpenAI from 'openai'
import { logger } from '../lib/logger'

// ─── Model Tiers ──────────────────────────────────────────────────────────────
//
//  CHEAP      → gpt-4o-mini    (simple tasks: keyword tagging, summarisation)
//  SMART      → deepseek-chat  (general content generation, social responses)
//  REASONING  → deepseek-reasoner (complex audits, strategy, multi-step analysis)
//  FALLBACK   → gpt-4o         (automatic failover when DeepSeek is unavailable)
//
// ──────────────────────────────────────────────────────────────────────────────

const MODELS = {
  CHEAP: { provider: 'openai' as const, name: 'gpt-4o-mini' },
  SMART: { provider: 'deepseek' as const, name: 'deepseek-chat' },
  REASONING: { provider: 'deepseek' as const, name: 'deepseek-reasoner' },
  FALLBACK: { provider: 'openai' as const, name: 'gpt-4o' },
}

export type AITier = keyof typeof MODELS

export interface AIResponse {
  content: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  cost: {
    estimated: number   // USD
    provider: string
  }
}

// Estimated cost per 1M tokens (input/output blended) in USD
const COST_PER_1M: Record<string, number> = {
  'gpt-4o-mini': 0.30,
  'deepseek-chat': 0.14,
  'deepseek-reasoner': 0.55,
  'gpt-4o': 15.00,
}

// ─── Circuit Breaker ───────────────────────────────────────────────────────────
class CircuitBreaker {
  private failures = 0
  private lastFailure = 0
  private readonly threshold = 4
  private readonly resetMs = 60_000

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.failures >= this.threshold) {
      if (Date.now() - this.lastFailure < this.resetMs) {
        throw new Error('Circuit breaker OPEN — DeepSeek unavailable, using fallback')
      }
      this.reset()
    }
    try {
      const result = await fn()
      this.reset()
      return result
    } catch (err) {
      this.failures++
      this.lastFailure = Date.now()
      throw err
    }
  }

  private reset() {
    this.failures = 0
    this.lastFailure = 0
  }

  isOpen() {
    return this.failures >= this.threshold && (Date.now() - this.lastFailure) < this.resetMs
  }
}

// ─── AIService ─────────────────────────────────────────────────────────────────
class AIService {
  private deepseek = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
  })

  private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  })

  private breaker = new CircuitBreaker()

  // ── Core generate method ─────────────────────────────────────────────────
  async generate(params: {
    prompt: string
    system?: string
    tier: AITier
    jsonMode?: boolean
    maxTokens?: number
    temperature?: number
  }): Promise<AIResponse> {
    const config = MODELS[params.tier]
    const isDeepSeek = config.provider === 'deepseek'

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: params.system || 'You are an expert AI marketing assistant.' },
      { role: 'user', content: params.prompt },
    ]

    const callOptions = {
      model: config.name,
      messages,
      temperature: params.temperature ?? (params.tier === 'REASONING' ? 0.3 : 0.7),
      max_tokens: params.maxTokens ?? 4000,
      ...(params.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    }

    // Try primary provider (with circuit breaker for DeepSeek)
    try {
      let response: OpenAI.Chat.Completions.ChatCompletion

      if (isDeepSeek) {
        response = await this.breaker.call(() =>
          this.deepseek.chat.completions.create(callOptions)
        )
      } else {
        response = await this.openai.chat.completions.create(callOptions)
      }

      return this.formatResponse(response, config.name, config.provider)
    } catch (primaryErr) {
      logger.warn(`AI primary [${config.name}] failed — switching to GPT-4o fallback`, {
        error: (primaryErr as Error).message,
        tier: params.tier,
      })

      // Automatic fallback to OpenAI GPT-4o
      try {
        const fallbackResponse = await this.openai.chat.completions.create({
          ...callOptions,
          model: MODELS.FALLBACK.name,
        })
        return this.formatResponse(fallbackResponse, MODELS.FALLBACK.name, 'openai')
      } catch (fallbackErr) {
        logger.error('All AI providers failed', { fallbackErr })
        throw new Error(`All AI providers unavailable: ${(fallbackErr as Error).message}`)
      }
    }
  }

  // ── Streaming generate (for real-time UX) ────────────────────────────────
  async *stream(params: {
    prompt: string
    system?: string
    tier: AITier
  }): AsyncGenerator<string> {
    const config = MODELS[params.tier]
    const client = config.provider === 'deepseek' ? this.deepseek : this.openai

    const stream = await client.chat.completions.create({
      model: config.name,
      messages: [
        { role: 'system', content: params.system || '' },
        { role: 'user', content: params.prompt },
      ],
      stream: true,
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) yield delta
    }
  }

  // ── Convenience wrappers used across the codebase ────────────────────────

  /** Simple task: keyword categorization, tagging — uses cheap model */
  async cheap(prompt: string, system?: string): Promise<string> {
    const res = await this.generate({ prompt, system, tier: 'CHEAP' })
    return res.content
  }

  /** General task: content writing, social responses — uses DeepSeek Chat */
  async smart(prompt: string, system?: string, jsonMode = false): Promise<string> {
    const res = await this.generate({ prompt, system, tier: 'SMART', jsonMode })
    return res.content
  }

  /** Complex task: auditing, strategy — uses DeepSeek Reasoner */
  async reason(prompt: string, system?: string, jsonMode = false): Promise<string> {
    const res = await this.generate({ prompt, system, tier: 'REASONING', jsonMode })
    return res.content
  }

  // ── Backward-compatible DeepSeekService methods ──────────────────────────
  // These match the old DeepSeekService API so existing queue.ts doesn't break

  async generateContent(params: {
    topic: string; type: string; tone: string; keywords: string[]; wordCount?: number
  }) {
    const prompt = `Generate a ${params.type} about "${params.topic}".
Tone: ${params.tone}
Keywords to include: ${params.keywords.join(', ')}
Target word count: ${params.wordCount || 1000} words

Provide:
1. SEO-optimized title
2. Meta description (150-160 chars)
3. Full content with proper markdown formatting
4. Suggested internal links
5. Key takeaways summary`

    const res = await this.generate({
      prompt,
      system: 'You are an expert SEO content writer. Generate high-quality, engaging content optimized for search engines.',
      tier: 'SMART',
      maxTokens: 4000,
      temperature: 0.7,
    })
    return { content: res.content, usage: res.usage }
  }

  async analyzeSEO(params: { url: string; content?: string; competitors?: string[] }) {
    const prompt = `Perform a comprehensive SEO audit for: ${params.url}
${params.content ? `\nPage content: ${params.content.substring(0, 2000)}` : ''}
${params.competitors ? `\nCompetitors: ${params.competitors.join(', ')}` : ''}

Provide analysis in this strict JSON format:
{
  "overallScore": number,
  "categories": [{ "name": string, "score": number, "weight": number, "status": "good"|"warning"|"error" }],
  "issues": [{ "id": string, "category": string, "severity": "critical"|"warning"|"info", "title": string, "description": string, "impact": "high"|"medium"|"low", "fix": string }],
  "recommendations": [{ "id": string, "priority": number, "category": string, "title": string, "description": string, "expectedImpact": string, "difficulty": "easy"|"medium"|"hard", "estimatedTime": string }],
  "competitors": [{ "domain": string, "authority": number, "overlap": number, "traffic": number }],
  "keywords": [{ "keyword": string, "volume": "low"|"medium"|"high", "difficulty": number, "intent": string }]
}

Return ONLY the JSON object.`

    const res = await this.generate({
      prompt,
      system: 'You are an expert SEO analyst. Analyze websites and provide actionable SEO recommendations.',
      tier: 'REASONING',
      jsonMode: true,
      maxTokens: 4000,
      temperature: 0.3,
    })
    return { content: res.content, usage: res.usage }
  }

  async optimizeForGEO(params: { content: string; targetPlatforms: string[]; keywords: string[] }) {
    const prompt = `Optimize this content for AI search engines (${params.targetPlatforms.join(', ')}):

Original content: ${params.content.substring(0, 3000)}

Target keywords: ${params.keywords.join(', ')}

Provide:
1. Optimized content with better AI visibility
2. Suggested FAQ section (5-7 questions)
3. Entity markup suggestions
4. Conversational query optimization
5. Structured data recommendations`

    const res = await this.generate({
      prompt,
      system: 'You are a GEO (Generative Engine Optimization) expert. Optimize content for AI search engines.',
      tier: 'SMART',
      temperature: 0.5,
    })
    return { content: res.content, usage: res.usage }
  }

  async researchKeywords(params: { seed: string; count?: number }) {
    const prompt = `Research keywords related to: "${params.seed}"
Return ${params.count || 20} keywords with: Keyword, Search Volume, Difficulty (0-100), CPC ($), Intent, Long-tail variations, SERP features`
    const res = await this.generate({ prompt, tier: 'CHEAP', temperature: 0.4 })
    return { content: res.content, usage: res.usage }
  }

  async analyzeCompetitor(params: { domain: string; ourDomain?: string }) {
    const prompt = `Analyze competitor: ${params.domain}
${params.ourDomain ? `Our domain: ${params.ourDomain}` : ''}
Provide: Content strategy, Keyword targeting, Backlink strategy, Top content themes, Content gaps, Differentiation opportunities, Quick wins`
    const res = await this.generate({
      prompt,
      system: 'You are a competitive analysis expert.',
      tier: 'SMART',
      maxTokens: 3000,
      temperature: 0.4,
    })
    return { content: res.content, usage: res.usage }
  }

  async generateSocialResponse(params: { mention: string; platform: string; tone: string; context: string }) {
    const prompt = `Platform: ${params.platform}
Mention/Comment: ${params.mention}
Context about our product: ${params.context}
Tone: ${params.tone}
Generate 3 response options (short, medium, detailed)`
    const res = await this.generate({
      prompt,
      system: 'You are a social media engagement expert.',
      tier: 'CHEAP',
      maxTokens: 1500,
      temperature: 0.7,
    })
    return { content: res.content, usage: res.usage }
  }

  async simulateAISearch(params: { query: string; platform: string; url?: string }) {
    const prompt = `Query: "${params.query}"
${params.url ? `Target URL to look for: ${params.url}` : ''}
Provide a realistic simulated search result in JSON:
{ "position": number, "url": string, "title": string, "snippet": string }`
    try {
      const res = await this.generate({ prompt, tier: 'CHEAP', jsonMode: true, temperature: 0.1 })
      return JSON.parse(res.content)
    } catch { return { position: 99 } }
  }

  async optimizeForGEOStructured(params: { content: { title: string; body: string }[]; targetPlatforms: string[]; keywords: string[]; url?: string }) {
    const prompt = `Target platforms: ${params.targetPlatforms.join(', ')}
Keywords: ${params.keywords.join(', ')}
Content samples: ${JSON.stringify(params.content.slice(0, 3))}
Provide JSON: { "score": number, "actions": string[], "schemaSuggestions": string[], "faqSuggestions": string[] }`
    try {
      const res = await this.generate({ prompt, tier: 'SMART', jsonMode: true, temperature: 0.2 })
      return JSON.parse(res.content)
    } catch { return { score: 50, actions: [], schemaSuggestions: [], faqSuggestions: [] } }
  }

  async rewriteForGEO(params: { originalContent: string; recommendations: string[]; query: string }) {
    const prompt = `Query to optimize for: "${params.query}"
Recommendations: ${JSON.stringify(params.recommendations)}
Original content:\n${params.originalContent}
Provide JSON: { "content": "rewritten markdown...", "scoreChange": number }`
    try {
      const res = await this.generate({ prompt, tier: 'REASONING', jsonMode: true, temperature: 0.3 })
      return JSON.parse(res.content)
    } catch { return { content: params.originalContent, scoreChange: 0 } }
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  private formatResponse(
    res: OpenAI.Chat.Completions.ChatCompletion,
    model: string,
    provider: string
  ): AIResponse {
    const usage = res.usage
    const totalTokens = usage?.total_tokens || 0
    const costPer1M = COST_PER_1M[model] ?? 1.0
    return {
      content: res.choices[0]?.message?.content || '',
      model,
      usage: {
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens,
      },
      cost: {
        estimated: parseFloat(((totalTokens / 1_000_000) * costPer1M).toFixed(6)),
        provider,
      },
    }
  }
}

// Singleton — import this everywhere instead of DeepSeekService
export const aiService = new AIService()

// Backward-compat alias so existing imports of DeepSeekService keep working
export const DeepSeekService = aiService
