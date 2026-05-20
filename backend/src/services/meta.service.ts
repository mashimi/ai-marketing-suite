import { aiService } from './ai.service';

export class MetaService {
  /**
   * Generates 3 variations of Facebook Ads (A/B testing ready)
   */
  static async generateAdCopy(productInfo: string, audience: string, context: string) {
    const prompt = `Create a Facebook Ad campaign for: ${productInfo}. 
    Target Audience: ${audience}. 
    Brand Context: ${context}.
    
    Provide 3 variations:
    1. Direct Response (Pain point focused)
    2. Storytelling (Empathy focused)
    3. Social Proof (Results focused)
    
    For each, provide: [Headline], [Primary Text], [Call to Action Button].`;

    return await aiService.generate({
      tier: 'SMART',
      system: "You are a senior Meta Ads Media Buyer and Copywriter.",
      prompt
    });
  }

  /**
   * AI-powered comment moderation for Facebook Pages
   */
  static async handleComment(commentText: string, context: string) {
    return await aiService.generate({
      tier: 'CHEAP',
      system: `You are a friendly community manager. Use this brand info: ${context}`,
      prompt: `Reply to this Facebook comment: "${commentText}". If it's a question, answer it. If it's a complaint, be empathetic and offer a support link.`
    });
  }
}
