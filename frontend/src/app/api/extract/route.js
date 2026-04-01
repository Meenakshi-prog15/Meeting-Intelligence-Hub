import { NextResponse } from 'next/server';
import { extractInsights } from '../../../lib/aiService';

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { text, filename } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'No transcript text provided' }, { status: 400 });
    }

    const insights = await extractInsights(text);
    
    return NextResponse.json(insights);
  } catch (error) {
    const msg = error?.message || String(error);
    console.error("Extract API Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
