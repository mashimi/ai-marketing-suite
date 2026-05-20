import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { prisma } from '../lib/db';
import { logger } from '../lib/logger';

const openai = new OpenAI();

// Initialize Pinecone (Optional, requires API key)
let pinecone: Pinecone | null = null;
if (process.env.PINECONE_API_KEY) {
  pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
}

const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'brand-vault';

export class VaultService {
  // Adds a document (PDF text or Company Info) to the Vault
  static async addToVault(projectId: string, text: string) {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    const embeddingVector = embeddingResponse.data[0].embedding;

    // Save to PostgreSQL
    const record = await prisma.brandKnowledge.create({
      data: {
        projectId,
        content: text,
        metadata: { hasVector: !!pinecone }
      }
    });

    // Upsert to Pinecone if configured
    if (pinecone) {
      try {
        const index = pinecone.Index(PINECONE_INDEX_NAME);
        await index.upsert({
          records: [{
            id: record.id,
            values: embeddingVector,
            metadata: { projectId, textChunk: text.substring(0, 8000) } // Store text chunk in metadata
          }]
        });
      } catch (error) {
        logger.error('Failed to upsert to Pinecone', { error });
      }
    }

    return record;
  }

  // Finds the most relevant brand facts for a content topic
  static async getContext(projectId: string, query: string) {
    if (pinecone) {
      try {
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: query,
        });
        
        const index = pinecone.Index(PINECONE_INDEX_NAME);
        const queryResult = await index.query({
          vector: embeddingResponse.data[0].embedding,
          filter: { projectId: { $eq: projectId } },
          topK: 5,
          includeMetadata: true
        });

        if (queryResult.matches && queryResult.matches.length > 0) {
          return queryResult.matches
            .map(match => match.metadata?.textChunk || '')
            .join("\n---\n");
        }
      } catch (error) {
        logger.error('Pinecone search failed, falling back to DB', { error });
      }
    }

    // Fallback: basic DB fetch
    const documents = await prisma.brandKnowledge.findMany({
      where: { projectId },
      take: 5
    });
    
    return documents.map(d => d.content).join("\n---\n");
  }
}
