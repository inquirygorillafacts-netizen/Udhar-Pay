'use server';
/**
 * @fileOverview A conversational AI assistant flow that processes text input,
 * generates a spoken response, and returns it as audio data.
 *
 * - `askAiAssistant` - A function that orchestrates the text-to-text and text-to-speech process.
 * - `AssistantInput` - The input type for the `askAiAssistant` function.
 * - `AssistantOutput` - The return type for the `askAiAssistant` function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import wav from 'wav';

// Define the input schema for the assistant
const AssistantInputSchema = z.object({
  query: z.string().describe('The user\'s spoken query as text.'),
  generateAudio: z.boolean().optional().default(true).describe('Whether to generate an audio response.'),
});
export type AssistantInput = z.infer<typeof AssistantInputSchema>;

// Define the output schema for the assistant
const AssistantOutputSchema = z.object({
  text: z.string().describe('The AI\'s textual response.'),
  audio: z.string().optional().describe("The AI's spoken response as a base64-encoded WAV data URI."),
});
export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;

/**
 * Converts raw PCM audio buffer to a base64-encoded WAV string.
 * @param pcmData Buffer containing the raw PCM audio data.
 * @returns A promise that resolves to the base64-encoded WAV string.
 */
async function toWav(pcmData: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels: 1,
      sampleRate: 24000,
      bitDepth: 16,
    });

    const bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', (d) => bufs.push(d));
    writer.on('end', () => {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

// Define the main flow for the AI assistant
const assistantFlow = ai.defineFlow(
  {
    name: 'assistantFlow',
    inputSchema: AssistantInputSchema,
    outputSchema: AssistantOutputSchema,
  },
  async ({ query, generateAudio }) => {
    // 1. Generate a text response from the AI
    const { output: textResponse } = await ai.generate({
      prompt: `You are a helpful AI assistant for the Udhar Pay app. Keep your answers concise and friendly. User's query: ${query}`,
      model: 'googleai/gemini-2.5-flash',
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

    // 2. Convert the text response to speech
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      prompt: responseText,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' },
          },
        },
      },
    });

    if (!media || !media.url) {
      throw new Error('Failed to generate audio from TTS model.');
    }
    
    // The TTS model returns raw PCM data in a data URI. We need to convert it to WAV.
    const audioBuffer = Buffer.from(media.url.substring(media.url.indexOf(',') + 1), 'base64');
    const wavBase64 = await toWav(audioBuffer);

    return {
      text: responseText,
      audio: `data:audio/wav;base64,${wavBase64}`,
    };
  }
);

/**
 * Public-facing wrapper function to invoke the assistant flow.
 * @param input The user's query.
 * @returns The AI's text response and optionally the spoken audio data URI.
 */
export async function askAiAssistant(input: AssistantInput): Promise<AssistantOutput> {
  return assistantFlow(input);
}