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
});
export type AssistantInput = z.infer<typeof AssistantInputSchema>;

// Define the output schema for the assistant - only text is returned now.
const AssistantOutputSchema = z.object({
  text: z.string().describe("The AI's textual response."),
});
export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;

// Define the main flow for the AI assistant
const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AssistantInputSchema,
    outputSchema: AssistantOutputSchema,
  },
  async ({ query, history = [] }) => {
    
    // Combine the current query with the history
    const fullHistory: ChatMessage[] = [...history, { sender: 'user', text: query }];
    const historyText = fullHistory.map(msg => `${msg.sender === 'user' ? 'Boss' : 'Jarvis'}: ${msg.text}`).join('\n');

    // Generate a text response from the AI with context
    const { output: textResponse } = await ai.generate({
      prompt: `You are Jarvis, the world's most advanced AI assistant. The user is your "Boss". You are helpful, respectful, and incredibly intelligent.
      Your response length should be appropriate to the user's query. For simple questions, give a short and direct answer. For open-ended requests like storytelling, provide a more detailed response.
      You will now continue a conversation. Here is the history so far:
      ${historyText}
      
      IMPORTANT: You must ALWAYS reply in HINDI. Never use English. Your response should be a direct continuation of the conversation.
      
      Your latest response should be to the last message from the Boss.`,
      output: {
        format: 'text',
      },
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
