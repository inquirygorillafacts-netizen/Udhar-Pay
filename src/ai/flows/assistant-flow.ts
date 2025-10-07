'use server';
/**
 * @fileOverview A conversational AI assistant flow that processes text input,
 * generates a spoken response using Google's Text-to-Speech, and returns it as an audio data.
 *
 * - `askAiAssistant` - A function that orchestrates the text-to-text and text-to-speech process.
 * - `AssistantInput` - The input type for the `askAiAssistant` function.
 * - `AssistantOutput` - The return type for the `askAiAssistant` function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import wav from 'wav';
import type { ChatMessage } from '@/lib/ai-memory';
import { googleAI } from '@genkit-ai/googleai';


const DEFAULT_VOICE_ID = 'Algenib';


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


const GenerateAudioInputSchema = z.object({
    text: z.string(),
    voiceId: z.string().optional().default(DEFAULT_VOICE_ID),
});

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

const generateAudioFlow = ai.defineFlow(
    {
        name: 'generateAudioFlow',
        inputSchema: GenerateAudioInputSchema,
        outputSchema: z.object({ audio: z.string() }),
    },
    async ({ text, voiceId }) => {
        try {
            const { media } = await ai.generate({
                model: googleAI('gemini-2.5-flash-preview-tts'),
                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voiceId || DEFAULT_VOICE_ID },
                        },
                    },
                },
                prompt: text,
            });

            if (!media || !media.url) {
                console.error("Google TTS API did not return a valid audio file.", {media});
                throw new Error("Google TTS API did not return a valid audio file.");
            }
            
            const audioBuffer = Buffer.from(
                media.url.substring(media.url.indexOf(',') + 1),
                'base64'
            );

            const audioBase64 = await toWav(audioBuffer);

            return {
                audio: `data:audio/wav;base64,${audioBase64}`,
            };

        } catch (error) {
            console.error("Error calling Google TTS API:", error);
            throw new Error("Failed to generate audio from Google TTS");
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
