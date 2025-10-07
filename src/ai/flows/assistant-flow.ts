'use server';
/**
 * @fileOverview A conversational AI assistant flow that processes text input,
 * generates a spoken response using a third-party Text-to-Speech service (Murf.ai),
 * and returns it as an audio data.
 *
 * - `askAiAssistant` - A function that orchestrates the text-to-text and text-to-speech process.
 * - `AssistantInput` - The input type for the `askAiAssistant` function.
 * - `AssistantOutput` - The return type for the `askAiAssistant` function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { ChatMessage } from '@/lib/ai-memory';
import axios from 'axios';


const DEFAULT_VOICE_ID = 'it-IT-lorenzo';

// Define the input schema for the assistant
const AssistantInputSchema = z.object({
  query: z.string().describe("The user's spoken query as text."),
  history: z.array(z.object({
      sender: z.enum(['user', 'ai']),
      text: z.string(),
  })).optional().describe('The conversation history.'),
  generateAudio: z.boolean().optional().default(true).describe('Whether to generate an audio response.'),
  voiceId: z.string().optional().default(DEFAULT_VOICE_ID).describe('The voice to use for the audio response.'),
});
export type AssistantInput = z.infer<typeof AssistantInputSchema>;

// Define the output schema for the assistant
const AssistantOutputSchema = z.object({
  text: z.string().describe("The AI's textual response."),
  audio: z.string().optional().describe("The AI's spoken response as a base64-encoded WAV data URI."),
});
export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;


// Define the input for the audio generation part
const GenerateAudioInputSchema = z.object({
    text: z.string(),
    voiceId: z.string().optional().default(DEFAULT_VOICE_ID),
});

/**
 * Generates audio from text using the Murf.ai API.
 */
const generateAudioFlow = ai.defineFlow(
    {
        name: 'generateAudioFlow',
        inputSchema: GenerateAudioInputSchema,
        outputSchema: z.object({ audio: z.string() }),
    },
    async ({ text, voiceId }) => {
        try {
            const response = await axios.post('https://api.murf.ai/v1/speech:synthesize', {
                text: text,
                voice: voiceId || DEFAULT_VOICE_ID,
                format: 'wav', // Requesting WAV format
                sampleRate: 24000,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': process.env.NEXT_PUBLIC_MURFAI_API_KEY,
                },
                responseType: 'arraybuffer' // Get response as a buffer
            });

            // Convert the binary audio data to a base64 data URI
            const audioBuffer = Buffer.from(response.data, 'binary');
            const audioBase64 = audioBuffer.toString('base64');
            
            return {
                audio: `data:audio/wav;base64,${audioBase64}`,
            };

        } catch (error) {
            console.error("Error calling Murf.ai API:", error);
            throw new Error("Failed to generate audio from Murf.ai");
        }
    }
);


// Define the main flow for the AI assistant
const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AssistantInputSchema,
    outputSchema: AssistantOutputSchema,
  },
  async ({ query, history = [], generateAudio, voiceId }) => {
    
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
    const responseText = textResponse;

    // If audio generation is disabled, return only the text
    if (!generateAudio) {
        return {
            text: responseText,
        };
    }
    
    // Clean the text for TTS by removing markdown characters like asterisks
    const cleanTextForTts = responseText.replace(/\*/g, '');
    
    // Convert the text response to speech using the dedicated audio flow
    const { audio } = await generateAudioFlow({ text: cleanTextForTts, voiceId: voiceId });

    return {
        text: responseText,
        audio: audio,
    };
  }
);

/**
 * Public-facing wrapper function to invoke the assistant flow.
 * @param input The user's query and conversation history.
 * @returns The AI's text response and optionally the spoken audio data URI.
 */
export async function askAiAssistant(input: AssistantInput): Promise<AssistantOutput> {
  return assistantFlow(input);
}
