'use server';
/**
 * @fileOverview A conversational AI assistant flow that processes text input,
 * generates a spoken response using Murf.ai, and returns it as audio data.
 *
 * - `askAiAssistant` - A function that orchestrates the text-to-text and text-to-speech process.
 * - `generateGreetingAudio` - A function that generates a standard audio greeting.
 * - `AssistantInput` - The input type for the `askAiAssistant` function.
 * - `AssistantOutput` - The return type for the `askAiAssistant` function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import axios from 'axios';
import { PassThrough } from 'stream';

// Define the input schema for the assistant
const AssistantInputSchema = z.object({
  query: z.string().describe('The user\'s spoken query as text.'),
  generateAudio: z.boolean().optional().default(true).describe('Whether to generate an audio response.'),
});
export type AssistantInput = z.infer<typeof AssistantInputSchema>;

// Define the output schema for the assistant
const AssistantOutputSchema = z.object({
  text: z.string().describe('The AI\'s textual response.'),
  audio: z.string().optional().describe("The AI\'s spoken response as a base64-encoded WAV data URI."),
});
export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;

// Define a simple output schema for just audio
const AudioOutputSchema = z.object({
    audio: z.string().describe("The AI's spoken response as a base64-encoded WAV data URI."),
});
export type AudioOutput = z.infer<typeof AudioOutputSchema>;


const generateAudioFlow = ai.defineFlow(
    {
        name: 'generateAudioFlow',
        inputSchema: z.string(),
        outputSchema: AudioOutputSchema,
    },
    async (text) => {
         try {
            const murfResponse = await axios.post(
                "https://api.murf.ai/v1/speech/stream",
                {
                    text: text,
                    voiceId: "en-US-terrell", // A standard, clear voice
                    format: "WAV",
                    sampleRate: 24000,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "api-key": process.env.MURF_API_KEY,
                    },
                    responseType: 'stream',
                }
            );
            
            const audioStream = murfResponse.data as PassThrough;

            const chunks: any[] = [];
            for await (const chunk of audioStream) {
                chunks.push(chunk);
            }
            
            const audioBuffer = Buffer.concat(chunks);
            const audioBase64 = audioBuffer.toString('base64');


            if (!audioBase64) {
                throw new Error("Murf.ai did not return an audio file.");
            }

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
  async ({ query, generateAudio }) => {
    // 1. Generate a text response from the AI
    const { output: textResponse } = await ai.generate({
      prompt: `You are a helpful AI assistant for the Udhar Pay app. Keep your answers concise and friendly. User's query: ${query}`,
      model: 'googleai/gemini-2.0-flash',
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
    
    // 2. Convert the text response to speech using the dedicated audio flow
    const audioData = await generateAudioFlow(responseText);

    return {
        text: responseText,
        audio: audioData.audio,
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


/**
 * Generates only the audio for the initial greeting.
 * @returns The audio data URI for the greeting.
 */
export async function generateGreetingAudio(): Promise<AudioOutput> {
    const greetingText = "How can I help you?";
    return generateAudioFlow(greetingText);
}
