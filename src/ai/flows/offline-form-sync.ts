'use server';

/**
 * @fileOverview This file defines a Genkit flow for summarizing form data using generative AI and enabling background synchronization for offline form submissions.
 *
 * - `summarizeFormDataAndSync` - A function that handles the summarization and synchronization of form data.
 * - `OfflineFormInput` - The input type for the summarizeFormDataAndSync function.
 * - `OfflineFormOutput` - The return type for the summarizeFormDataAndSync function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OfflineFormInputSchema = z.object({
  formData: z.record(z.string()).describe('The form data to be summarized and synced.'),
});
export type OfflineFormInput = z.infer<typeof OfflineFormInputSchema>;

const OfflineFormOutputSchema = z.object({
  summary: z.string().describe('A brief summary of the form data.'),
  syncStatus: z.string().describe('The status of the background synchronization.'),
});
export type OfflineFormOutput = z.infer<typeof OfflineFormOutputSchema>;

export async function summarizeFormDataAndSync(input: OfflineFormInput): Promise<OfflineFormOutput> {
  return offlineFormSyncFlow(input);
}

const summarizeFormPrompt = ai.definePrompt({
  name: 'summarizeFormPrompt',
  input: {schema: OfflineFormInputSchema},
  output: {schema: z.object({summary: z.string()})},
  prompt: `You are an AI assistant that summarizes form data.

  Summarize the following form data into a concise summary:
  {{#each formData}}
  {{@key}}: {{this}}
  {{/each}}
  `,
});

const offlineFormSyncFlow = ai.defineFlow(
  {
    name: 'offlineFormSyncFlow',
    inputSchema: OfflineFormInputSchema,
    outputSchema: OfflineFormOutputSchema,
  },
  async input => {
    const {output} = await summarizeFormPrompt(input);

    // Simulate background synchronization (replace with actual sync logic)
    const syncStatus = 'Data stored locally and will be synced when online.';

    return {
      summary: output!.summary,
      syncStatus,
    };
  }
);
