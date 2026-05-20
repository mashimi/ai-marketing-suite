import { Worker } from 'bullmq';
import { ScrapingService } from '../services/scraper';
import { aiService } from '../services/ai.service';
import { redis } from '../lib/redis';
import { prisma } from '../lib/db';

export const competitorWorker = new Worker('competitor-pulse', async (job) => {
  const { projectId, urls, userId } = job.data;

  for (const url of urls) {
    const currentData = await ScrapingService.deepCrawl(url);
    const previousData = await redis.get(`last-crawl:${url}`);

    if (previousData && JSON.stringify(currentData) !== previousData) {
      // AI determines if the change is significant (e.g., pricing or feature launch)
      const analysis = await aiService.generate({
        tier: 'SMART',
        system: "Analyze if the competitor made a strategic change.",
        prompt: `Old Site: ${previousData}\nNew Site: ${JSON.stringify(currentData)}`
      });

      // Notify the User
      await prisma.notification.create({
        data: {
          userId,
          type: 'info',
          title: `Competitor Update: ${url}`,
          message: analysis.content
        }
      });
    }

    // Save for next comparison
    await redis.set(`last-crawl:${url}`, JSON.stringify(currentData));
  }
}, { connection: redis });
