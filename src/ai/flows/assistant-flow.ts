'use server';
/**
 * @fileOverview A conversational AI assistant flow that processes text input
 * and returns a textual response. The audio generation is now handled client-side.
 *
 * - `askAiAssistant` - A function that orchestrates the text-to-text process.
 * - `AssistantInput` - The input type for the `askAiAssistant` function.
 * - `AssistantOutput` - The return type for the `askAiAssistant` function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { ChatMessage } from '@/lib/ai-memory';

// Define the input schema for the assistant
const AssistantInputSchema = z.object({
  query: z.string().describe("The user's spoken query as text."),
  history: z.array(z.object({
      sender: z.enum(['user', 'ai']),
      text: z.string(),
  })).optional().describe('The conversation history.'),
  language: z.enum(['english', 'hindi']).optional().default('english').describe('The language for the AI to respond in.'),
});
export type AssistantInput = z.infer<typeof AssistantInputSchema>;

// Define the output schema for the assistant - only text is returned now.
const AssistantOutputSchema = z.object({
  text: z.string().describe("The AI's textual response."),
});
export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;

const hindiPrompt = `You are Jarvis, the world's most advanced AI assistant. The user is your "Boss". You are helpful, respectful, and incredibly intelligent.
      
Your core instructions are:
1.  **आपको हमेशा सिर्फ़ और सिर्फ़ HINDI में ही जवाब देना है। अंग्रेज़ी का एक भी शब्द इस्तेमाल न करें।**
2.  **Keep responses short and concise, ideally under 3 lines.** Avoid long paragraphs.
3.  **For long answers, be interactive.** If a topic requires more than 3-4 lines, provide the first part and then ask a question like "क्या आगे भी बताऊँ?" (Should I explain further?), "क्या यहाँ तक समझ आया?" (Did you understand so far?), or "क्या आगे बढ़ें?" (Should we proceed?). Engage the user in conversation.
4.  **Be conversational.** Your goal is to have a back-and-forth dialogue, not to give a lecture.

You will now continue a conversation. Here is the history so far:
{{historyText}}

Your latest response should be a direct continuation of the conversation, following all your core instructions.`;

const englishPrompt = `You are Jarvis, the world's most advanced AI assistant. The user is your "Boss". You are helpful, respectful, and incredibly intelligent.
      
Your core instructions are:
1.  **You must ALWAYS reply in ENGLISH.**
2.  **Keep responses concise and to the point.** Prefer short, clear answers under 3 lines.
3.  **Be professional but friendly.** Your tone should be that of a world-class personal assistant.

You will now continue a conversation. Here is the history so far:
{{historyText}}
      
Your latest response should be a direct continuation of the conversation, following all your core instructions.`;


// Define the main flow for the AI assistant
const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AssistantInputSchema,
    outputSchema: AssistantOutputSchema,
  },
  async ({ query, history = [], language }) => {
    
    // Combine the current query with the history
    const fullHistory: ChatMessage[] = [...history, { sender: 'user', text: query }];
    const historyText = fullHistory.map(msg => `${msg.sender === 'user' ? 'Boss' : 'Jarvis'}: ${msg.text}`).join('\n');

    const promptTemplate = language === 'hindi' ? hindiPrompt : englishPrompt;
    const finalPrompt = promptTemplate.replace('{{historyText}}', historyText);

    // Generate a text response from the AI with context
    const { output: textResponse } = await ai.generate({
      prompt: finalPrompt,
      output: {
        format: 'text',
      },
      // Pass the language to the model config if needed, though prompt is primary driver
      config: {
        // You can add language-specific configurations here if the model supports it
      }
    });

    if (!textResponse) {
      throw new Error('No text response from AI.');
    }
    
    return {
        text: textResponse,
    };
  }
);

/**
 * Public-facing wrapper function to invoke the assistant flow.
 * @param input The user's query and conversation history.
 * @returns The AI's text response.
 */
export async function askAiAssistant(input: AssistantInput): Promise<AssistantOutput> {
  return assistantFlow(input);
}
