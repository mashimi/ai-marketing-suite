import OpenAI from 'openai'
import { logger } from '../lib/logger'
import { redis } from '../lib/redis'

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
})

export interface DeepSeekResponse {
  content: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

// --- Circuit Breaker ---
class CircuitBreaker {
  private failures: number = 0
  private lastFailureTime: number = 0
  private readonly threshold: number = 5
  private readonly resetTimeout: number = 60000 // 1 minute
  private isOpen: boolean = false

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      const elapsed = Date.now() - this.lastFailureTime
      if (elapsed > this.resetTimeout) {
        this.isOpen = false
        this.failures = 0
        logger.info('Circuit breaker reset - attempting calls again')
      } else {
        throw new Error('Circuit breaker is open - too many failures')
      }
    }

    try {
      const result = await fn()
      this.failures = 0
      return result
    } catch (error) {
      this.failures++
      this.lastFailureTime = Date.now()
      if (this.failures >= this.threshold) {
        this.isOpen = true
        logger.error('Circuit breaker opened due to repeated failures', { failures: this.failures })
      }
      throw error
    }
  }

  getState() { return { isOpen: this.isOpen, failures: this.failures } }
}

const circuitBreaker = new CircuitBreaker()

// --- Exponential Backoff ---
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      // Don't retry on auth errors or invalid requests
      if (error?.status === 401 || error?.status === 400 || error?.status === 422) {
        throw error
      }
      const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000)
      logger.warn(`DeepSeek call failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${Math.round(delay)}ms`, { error: error?.message })
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw lastError
}

interface CallWithRetryParams {
  systemPrompt: string
  userPrompt: string
  responseFormat?: { type: 'json_object' | 'text' }
  temperature?: number
  maxTokens?: number
}

export class DeepSeekService {
  /**
   * Core method with retry logic + circuit breaker for all DeepSeek calls
   */
  static async callWithRetry(params: CallWithRetryParams): Promise<string> {
    return circuitBreaker.call(async () => {
      return withRetry(async () => {
        const response = await deepseek.chat.completions.create({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: params.systemPrompt },
            { role: 'user', content: params.userPrompt },
          ],
          temperature: params.temperature ?? 0.3,
          max_tokens: params.maxTokens ?? 4000,
          ...(params.responseFormat?.type === 'json_object' ? { response_format: { type: 'json_object' as const } } : {}),
        })

        const content = response.choices[0]?.message?.content || ''
        const usage = response.usage
        logger.info('DeepSeek API call', { 
          promptTokens: usage?.prompt_tokens, 
          completionTokens: usage?.completion_tokens,
          hasContent: content.length > 0 
        })

        return content
      })
    })
  }

  static async generateContent(params: {
    topic: string
    type: string
    tone: string
    keywords: string[]
    wordCount?: number
  }): Promise<DeepSeekResponse> {
    const systemPrompt = `You are an expert SEO content writer. Generate high-quality, engaging content optimized for search engines.

Rules:
- Use the provided keywords naturally throughout the content
- Write in the specified tone
- Include proper heading structure (H1, H2, H3)
- Add meta description suggestion
- Include internal linking suggestions
- Optimize for featured snippets where possible
- Ensure readability score is high (short sentences, active voice)
- Add a compelling call-to-action at the end`

    const userPrompt = `Generate a ${params.type} about "${params.topic}".
Tone: ${params.tone}
Keywords to include: ${params.keywords.join(', ')}
Target word count: ${params.wordCount || 1000} words

Please provide:
1. SEO-optimized title
2. Meta description (150-160 chars)
3. Full content with proper markdown formatting
4. Suggested internal links
5. Key takeaways summary`

    try {
      const response = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      })

      const content = response.choices[0]?.message?.content || ''
      const usage = response.usage

      logger.info('Content generated', { topic: params.topic, tokens: usage?.total_tokens })

      return {
        content,
        usage: {
          promptTokens: usage?.prompt_tokens || 0,
          completionTokens: usage?.completion_tokens || 0,
          totalTokens: usage?.total_tokens || 0,
        },
      }
    } catch (error) {
      logger.error('DeepSeek content generation failed', { error, params })
      throw error
    }
  }

  static async analyzeSEO(params: {
    url: string
    content?: string
    competitors?: string[]
  }): Promise<DeepSeekResponse> {
    const systemPrompt = `You are an expert SEO analyst. Analyze websites and provide actionable SEO recommendations.

Rules:
- Be specific and actionable
- Prioritize by impact and difficulty
- Include technical, on-page, and off-page factors
- Provide competitor insights
- Suggest keyword opportunities
- Format output as structured JSON when possible`

    const userPrompt = `Perform a comprehensive SEO audit for: ${params.url}
${params.content ? `\nPage content: ${params.content.substring(0, 2000)}` : ''}
${params.competitors ? `\nCompetitors: ${params.competitors.join(', ')}` : ''}

Provide analysis in this strict JSON format:
{
  "overallScore": number,
  "categories": [
    { "name": string, "score": number, "weight": number, "status": "good" | "warning" | "error" }
  ],
  "issues": [
    { "id": string, "category": string, "severity": "critical" | "warning" | "info", "title": string, "description": string, "impact": "high" | "medium" | "low", "fix": string }
  ],
  "recommendations": [
    { "id": string, "priority": number, "category": string, "title": string, "description": string, "expectedImpact": string, "difficulty": "easy" | "medium" | "hard", "estimatedTime": string }
  ],
  "competitors": [
    { "domain": string, "authority": number, "overlap": number, "traffic": number }
  ],
  "keywords": [
    { "keyword": string, "volume": "low" | "medium" | "high", "difficulty": number, "intent": string }
  ]
}

Return ONLY the JSON object.`

    try {
      const response = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      })

      return {
        content: response.choices[0]?.message?.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      }
    } catch (error) {
      logger.error('DeepSeek SEO analysis failed', { error, params })
      throw error
    }
  }

  static async optimizeForGEO(params: {
    content: string
    targetPlatforms: string[]
    keywords: string[]
  }): Promise<DeepSeekResponse> {
    const systemPrompt = `You are a GEO (Generative Engine Optimization) expert. Optimize content for AI search engines like ChatGPT, Claude, and Perplexity.

Rules:
- Structure content for AI comprehension (clear headings, bullet points)
- Include entity relationships and semantic context
- Add FAQ sections that AI engines commonly cite
- Use natural language that matches conversational queries
- Include statistics and data points AI engines trust
- Optimize for "People Also Ask" style queries`

    const userPrompt = `Optimize this content for AI search engines (${params.targetPlatforms.join(', ')}):

Original content: ${params.content.substring(0, 3000)}

Target keywords: ${params.keywords.join(', ')}

Provide:
1. Optimized content with better AI visibility
2. Suggested FAQ section (5-7 questions)
3. Entity markup suggestions
4. Conversational query optimization
5. Structured data recommendations`

    try {
      const response = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 4000,
      })

      return {
        content: response.choices[0]?.message?.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      }
    } catch (error) {
      logger.error('DeepSeek GEO optimization failed', { error, params })
      throw error
    }
  }

  static async researchKeywords(params: {
    seed: string
    count?: number
  }): Promise<DeepSeekResponse> {
    const systemPrompt = `You are a keyword research expert. Find high-value keywords with search intent analysis.

Rules:
- Include search volume estimates (low/medium/high)
- Assess keyword difficulty (0-100)
- Identify search intent (informational, navigational, transactional, commercial)
- Suggest long-tail variations
- Include CPC estimates
- Note SERP features for each keyword`

    const userPrompt = `Research keywords related to: "${params.seed}"
Return ${params.count || 20} keywords in this format for each:
- Keyword
- Search Volume (low/medium/high)
- Difficulty (0-100)
- CPC ($)
- Intent
- Long-tail variations (3-5)
- SERP features`

    try {
      const response = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 4000,
      })

      return {
        content: response.choices[0]?.message?.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      }
    } catch (error) {
      logger.error('DeepSeek keyword research failed', { error, params })
      throw error
    }
  }

  static async analyzeCompetitor(params: {
    domain: string
    ourDomain?: string
  }): Promise<DeepSeekResponse> {
    const systemPrompt = `You are a competitive analysis expert. Analyze competitor websites and identify opportunities.

Rules:
- Focus on actionable insights
- Identify content gaps
- Note backlink strategies
- Analyze their keyword targeting
- Identify their top performing content
- Suggest differentiation strategies`

    const userPrompt = `Analyze competitor: ${params.domain}
${params.ourDomain ? `Our domain: ${params.ourDomain}` : ''}

Provide:
1. Content strategy analysis
2. Keyword targeting insights
3. Backlink strategy observations
4. Top content themes
5. Content gaps we can exploit
6. Differentiation opportunities
7. Quick wins we can implement`

    try {
      const response = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 3000,
      })

      return {
        content: response.choices[0]?.message?.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      }
    } catch (error) {
      logger.error('DeepSeek competitor analysis failed', { error, params })
      throw error
    }
  }

  static async generateSocialResponse(params: {
    mention: string
    platform: string
    tone: string
    context: string
  }): Promise<DeepSeekResponse> {
    const systemPrompt = `You are a social media engagement expert. Craft responses to mentions and comments.

Rules:
- Match the platform's culture and norms
- Be authentic and helpful
- Include subtle CTAs when appropriate
- Keep responses concise
- Avoid overly promotional language
- Show expertise without being arrogant`

    const userPrompt = `Platform: ${params.platform}
Mention/Comment: ${params.mention}
Context about our product: ${params.context}
Tone: ${params.tone}

Generate 3 response options (short, medium, detailed)`

    try {
      const response = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      })

      return {
        content: response.choices[0]?.message?.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      }
    } catch (error) {
      logger.error('DeepSeek social response failed', { error, params })
      throw error
    }
  }

  // --- GEO Methods ---

  static async simulateAISearch(params: {
    query: string
    platform: string
    url?: string
  }): Promise<{ position: number; url?: string; title?: string; snippet?: string; recommendations?: any }> {
    const systemPrompt = `You are a search engine simulation engine for AI platforms. Simulate the response of ${params.platform} to the user's query.`
    const userPrompt = `Query: "${params.query}"
${params.url ? `Target URL to look for: ${params.url}` : ''}

Provide a realistic simulated search result in JSON format:
{
  "position": number (1-10, where 1 is best, or 99 if not found),
  "url": string,
  "title": string,
  "snippet": string
}`

    try {
      const response = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })

      const content = response.choices[0]?.message?.content || '{}'
      return JSON.parse(content)
    } catch (error) {
      logger.error('DeepSeek simulateAISearch failed', { error, params })
      return { position: 99 }
    }
  }

  static async optimizeForGEOStructured(params: {
    content: { title: string; body: string }[]
    targetPlatforms: string[]
    keywords: string[]
    url?: string
  }): Promise<{ score: number; actions: string[]; schemaSuggestions: string[]; faqSuggestions: string[] }> {
    const systemPrompt = `You are a GEO (Generative Engine Optimization) expert. Analyze content and provide structured recommendations.`
    const userPrompt = `Target platforms: ${params.targetPlatforms.join(', ')}
Keywords: ${params.keywords.join(', ')}
Content samples: ${JSON.stringify(params.content.slice(0, 3))}

Provide JSON recommendations:
{
  "score": number (0-100),
  "actions": ["specific action 1", "specific action 2"],
  "schemaSuggestions": ["FAQ", "Article"],
  "faqSuggestions": ["question 1", "question 2"]
}`

    try {
      const response = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      })

      const content = response.choices[0]?.message?.content || '{}'
      return JSON.parse(content)
    } catch (error) {
      logger.error('DeepSeek optimizeForGEOStructured failed', { error, params })
      return { score: 50, actions: [], schemaSuggestions: [], faqSuggestions: [] }
    }
  }

  static async rewriteForGEO(params: {
    originalContent: string
    recommendations: string[]
    query: string
  }): Promise<{ content: string; scoreChange: number }> {
    const systemPrompt = `You are an expert AI content writer specializing in Generative Engine Optimization. Rewrite content based on recommendations.`
    const userPrompt = `Query to optimize for: "${params.query}"
Recommendations to apply: ${JSON.stringify(params.recommendations)}
Original content:
${params.originalContent}

Provide JSON result:
{
  "content": "Full markdown rewritten content here...",
  "scoreChange": number (estimated improvement 1-50)
}`

    try {
      const response = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      })

      const content = response.choices[0]?.message?.content || '{}'
      return JSON.parse(content)
    } catch (error) {
      logger.error('DeepSeek rewriteForGEO failed', { error, params })
      return { content: params.originalContent, scoreChange: 0 }
    }
  }
}
