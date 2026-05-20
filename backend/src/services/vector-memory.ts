import { prisma } from '../lib/db'
import { logger } from '../lib/logger'
import OpenAI from 'openai'

let _openai: OpenAI | null = null

function getOpenAI() {
  if (!_openai && process.env.OPENAI_API_KEY) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return _openai
}

export class VectorMemory {
  // Store agent memory with embedding
  async store(agentId: string, content: string, metadata: Record<string, any> = {}): Promise<void> {
    try {
      let embedding: number[] | null = null

      const openai = getOpenAI()
      if (openai) {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: content,
        })
        embedding = response.data[0].embedding
      }

      // We use $executeRaw because Prisma doesn't natively support vector types in create yet
      if (embedding) {
        const vectorStr = `[${embedding.join(',')}]`
        await prisma.$executeRawUnsafe(
          `INSERT INTO "agent_memories" (id, agent_id, content, embedding, metadata, created_at) 
           VALUES ($1, $2, $3, $4::vector, $5, NOW())`,
          this.generateId(),
          agentId,
          content,
          vectorStr,
          JSON.stringify(metadata)
        )
      } else {
        await prisma.agentMemory.create({
          data: {
            agentId,
            content,
            metadata,
          }
        })
      }
    } catch (error) {
      logger.error('Failed to store agent memory', { error, agentId })
    }
  }

  // Retrieve relevant context for an agent
  async retrieve(agentId: string, query: string, limit: number = 5): Promise<string[]> {
    try {
      const openai = getOpenAI()
      if (openai) {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: query,
        })
        const embedding = response.data[0].embedding
        const vectorStr = `[${embedding.join(',')}]`

        // Vector similarity search
        const memories: any[] = await prisma.$queryRawUnsafe(
          `SELECT content FROM "agent_memories" 
           WHERE agent_id = $1 
           ORDER BY embedding <=> $2::vector 
           LIMIT $3`,
          agentId,
          vectorStr,
          limit
        )
        
        if (memories.length > 0) {
          return memories.map(m => m.content)
        }
      }

      // Fallback: Simple contains search
      const memories = await prisma.agentMemory.findMany({
        where: {
          agentId,
          content: { contains: query, mode: 'insensitive' },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })

      if (memories.length === 0) {
        const recent = await prisma.agentMemory.findMany({
          where: { agentId },
          orderBy: { createdAt: 'desc' },
          take: limit,
        })
        return recent.map(m => m.content)
      }

      return memories.map(m => m.content)
    } catch (error) {
      logger.error('Failed to retrieve agent memory', { error, agentId })
      return []
    }
  }

  async getContextString(agentId: string, currentTask: string): Promise<string> {
    const relevant = await this.retrieve(agentId, currentTask, 10)
    if (relevant.length === 0) return ''

    return `\n\nPrevious context and learnings:\n${relevant.map((m, i) => `${i + 1}. ${m}`).join('\n')}`
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }
}

export const vectorMemory = new VectorMemory()
