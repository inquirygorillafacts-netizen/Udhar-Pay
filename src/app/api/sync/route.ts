import { summarizeFormDataAndSync, type OfflineFormInput } from '@/ai/flows/offline-form-sync';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body: OfflineFormInput = await request.json();
    
    if (!body.formData) {
      return NextResponse.json({ error: 'formData is required' }, { status: 400 });
    }

    const result = await summarizeFormDataAndSync(body);

    console.log('Sync successful:', result);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Sync API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}
