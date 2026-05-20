import { prisma } from '../../lib/db'
import { logger } from '../../lib/logger'
import { redis } from '../../lib/redis'
import { DeepSeekService } from '../deepseek'

export interface EntityExtraction {
  name: string
  type: string
  relevance: number
}

export interface ImplicitQuestion {
  question: string
  frequency: number
}

export class GEOEntityAnalyzer {
  /**
   * Extract entities from content using NLP via DeepSeek
   */
  static async extractEntities(content: string): Promise<EntityExtraction[]> {
    const cacheKey = `geo:entities:${Buffer.from(content.slice(0, 200)).toString('base64')}`
    
    try {
      const cached = await redis.get(cacheKey)
      if (cached) return JSON.parse(cached)
    } catch {
      // cache miss
    }

    try {
      const response = await DeepSeekService.callWithRetry({
        systemPrompt: `You are an NLP entity extraction expert. Extract named entities and key concepts from the content. Return as JSON array.`,
        userPrompt: `Extract entities from this content. For each, provide name, type (person, organization, location, product, concept, technology, event), and relevance (0-1). Return as JSON array:\n\n${content.slice(0, 3000)}`,
        responseFormat: { type: 'json_object' as const }
      })

      let entities: EntityExtraction[] = []
      try {
        const parsed = JSON.parse(response)
        entities = Array.isArray(parsed) ? parsed : parsed.entities || parsed.entitites || []
      } catch {
        // fallback extraction using regex patterns
        entities = this.fallbackExtractEntities(content)
      }

      // Cache for 24 hours
      try {
        await redis.setex(cacheKey, 86400, JSON.stringify(entities))
      } catch {
        // ignore
      }

      return entities
    } catch (err) {
      logger.error('Entity extraction failed, using fallback', { error: err })
      return this.fallbackExtractEntities(content)
    }
  }

  /**
   * Regex-based fallback entity extraction
   */
  private static fallbackExtractEntities(content: string): EntityExtraction[] {
    const entities: EntityExtraction[] = []
    const patterns = [
      // Capitalized multi-word phrases (potential named entities)
      { type: 'concept', regex: /[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}/g },
      // Quoted terms
      { type: 'concept', regex: /"([^"]{3,})"/g },
      // Markdown headers
      { type: 'concept', regex: /##+\s+(.+)$/gm },
    ]

    const seen = new Set<string>()
    for (const { type, regex } of patterns) {
      const matches = content.matchAll(regex)
      for (const match of matches) {
        const name = (match[1] || match[0]).trim().slice(0, 100)
        if (!seen.has(name) && name.length > 2) {
          seen.add(name)
          entities.push({ name, type, relevance: 0.3 })
        }
      }
    }

    return entities
  }

  /**
   * Analyze entity coverage for a project's content vs what competitors cover
   */
  static async analyzeEntityCoverage(projectId: string): Promise<{
    ourEntities: EntityExtraction[]
    gaps: { entity: string; type: string; competitorCoverage: number; ourCoverage: number; impact: string }[]
    implicitQuestions: ImplicitQuestion[]
  }> {
    // Get all published content
    const contentPieces = await prisma.contentPiece.findMany({
      where: { projectId, status: 'published' },
      select: { title: true, content: true }
    })

    const allContent = contentPieces.map(c => `${c.title}\n${c.content}`).join('\n\n')
    
    // Extract our entities
    const ourEntities = await this.extractEntities(allContent)

    // Get competitor entities from citation index
    const existingCoverage = await prisma.gEOEntityCoverage.findMany({
      where: { projectId }
    })

    // Find gaps
    const gaps = existingCoverage
      .filter((e: any) => (e.ourCoverage ?? 0) < (e.competitorAvgCoverage ?? 0) - 0.1)
      .map((e: any) => ({
        entity: e.entityName,
        type: e.entityType,
        competitorCoverage: e.competitorAvgCoverage ?? 0,
        ourCoverage: e.ourCoverage ?? 0,
        impact: (e.semanticRelevance ?? 0) > 0.7 ? 'high' : (e.semanticRelevance ?? 0) > 0.4 ? 'medium' : 'low'
      }))
      .sort((a: { competitorCoverage: number; ourCoverage: number }, b: { competitorCoverage: number; ourCoverage: number }) => (b.competitorCoverage - b.ourCoverage) - (a.competitorCoverage - a.ourCoverage))

    // Extract implicit questions
    const implicitQuestions = await this.extractImplicitQuestions(allContent, existingCoverage)

    return { ourEntities, gaps, implicitQuestions }
  }

  /**
   * Extract implicit follow-up questions that content should answer
   */
  static async extractImplicitQuestions(
    content: string,
    existingCoverage: { implicitQuestions: string[] }[]
  ): Promise<ImplicitQuestion[]> {
    // Collect existing implicit questions from DB
    const existingQuestions = new Map<string, number>()
    for (const coverage of existingCoverage) {
      const questions = coverage.implicitQuestions as string[]
      if (Array.isArray(questions)) {
        for (const q of questions) {
          existingQuestions.set(q, (existingQuestions.get(q) || 0) + 1)
        }
      }
    }

    if (existingQuestions.size > 0) {
      return Array.from(existingQuestions.entries())
      .map(([question, frequency]: [string, number]) => ({ question, frequency }))
        .sort((a: { frequency: number }, b: { frequency: number }) => b.frequency - a.frequency)
        .slice(0, 10)
    }

    // Generate implicit questions via DeepSeek
    try {
      const response = await DeepSeekService.callWithRetry({
        systemPrompt: `You are a content analysis expert. Given a piece of content, identify the implicit follow-up questions that readers are likely to have - questions that the content hints at but doesn't fully answer. These are the questions AI search engines would want the content to answer for comprehensive coverage.`,
        userPrompt: `Analyze this content and list 5-10 implicit follow-up questions that readers would logically ask next. These should be questions that AI search engines like ChatGPT would want the content to cover for completeness.\n\nContent:\n${content.slice(0, 3000)}\n\nReturn as JSON: { "questions": ["question 1?", "question 2?"] }`,
        responseFormat: { type: 'json_object' as const }
      })

      const parsed = JSON.parse(response)
      const questions = parsed.questions || []
      return questions.map((q: string) => ({ question: q, frequency: 1 }))
    } catch (err) {
      logger.error('Failed to extract implicit questions', { error: err })
      return []
    }
  }

  /**
   * Record entity coverage in the database
   */
  static async recordEntityCoverage(
    projectId: string,
    entities: EntityExtraction[],
    competitorDomain: string
  ): Promise<void> {
    for (const entity of entities) {
      const existing = await prisma.gEOEntityCoverage.findFirst({
        where: {
          projectId,
          entityName: entity.name
        }
      })

      if (existing) {
        // Update competitor coverage average
        const competitorAvg = existing.competitorAvgCoverage ?? 0
        const newAvg = (competitorAvg + entity.relevance) / 2
        await prisma.gEOEntityCoverage.update({
          where: { id: existing.id },
          data: {
            competitorAvgCoverage: Math.min(newAvg, 1),
            ourCoverage: existing.ourCoverage ?? 0, // will be updated separately when our content is analyzed
            semanticRelevance: Math.max(existing.semanticRelevance ?? 0, entity.relevance),
            lastScrapedAt: new Date()
          }
        })
      } else {
        await prisma.gEOEntityCoverage.create({
          data: {
            projectId,
            entityName: entity.name,
            entityType: entity.type,
            ourCoverage: 0,
            competitorAvgCoverage: entity.relevance,
            semanticRelevance: entity.relevance,
            lastScrapedAt: new Date()
          }
        })
      }
    }
  }

  /**
   * Update our own entity coverage after analyzing our content
   */
  static async updateOurEntityCoverage(projectId: string): Promise<void> {
    const contentPieces = await prisma.contentPiece.findMany({
      where: { projectId, status: 'published' },
      select: { content: true, title: true }
    })

    const allContent = contentPieces.map(c => `${c.title}\n${c.content}`).join('\n\n')
    const ourEntities = await this.extractEntities(allContent)

    for (const entity of ourEntities) {
      const existing = await prisma.gEOEntityCoverage.findFirst({
        where: { projectId, entityName: entity.name }
      })

      if (existing) {
        await prisma.gEOEntityCoverage.update({
          where: { id: existing.id },
          data: {
            ourCoverage: Math.min((entity.relevance * 1.2), 1),
            semanticRelevance: entity.relevance,
            lastScrapedAt: new Date()
          }
        })
      } else {
        await prisma.gEOEntityCoverage.create({
          data: {
            projectId,
            entityName: entity.name,
            entityType: entity.type,
            ourCoverage: entity.relevance,
            competitorAvgCoverage: 0,
            semanticRelevance: entity.relevance,
            lastScrapedAt: new Date()
          }
        })
      }
    }
  }
}