import axios from 'axios';
import { aiService } from './ai.service';

export class WhatsAppService {
  /**
   * Sends an AI-generated reply to a customer on WhatsApp
   */
  static async sendAIReply(customerPhone: string, incomingMessage: string, context: string) {
    // 1. Generate the AI Response
    const aiResponse = await aiService.generate({
      tier: 'SMART',
      system: `You are a helpful sales assistant on WhatsApp. Answer using ONLY these facts: ${context}`,
      prompt: incomingMessage
    });

    // 2. Push to Meta Cloud API (Official WhatsApp API)
    // NOTE: In production, process.env.WHATSAPP_PHONE_ID and process.env.META_ACCESS_TOKEN 
    // would be fetched from the 'integrations' table for the specific project.
    const url = `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
    
    if (process.env.WHATSAPP_PHONE_ID && process.env.META_ACCESS_TOKEN) {
      await axios.post(url, {
        messaging_product: "whatsapp",
        to: customerPhone,
        type: "text",
        text: { body: aiResponse.content }
      }, {
        headers: { Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}` }
      });
    } else {
      console.log('WhatsApp credentials missing, simulated reply:', aiResponse.content);
    }
  }
}
