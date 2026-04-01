import { NextResponse } from 'next/server';
import { queryTranscript } from '../../../lib/aiService';

export const maxDuration = 60; // Just in case it's a long transcript

export async function POST(request) {
  try {
    const { question, transcript } = await request.json();

    if (!question || !transcript) {
      return NextResponse.json({ error: 'Missing question or transcript' }, { status: 400 });
    }

    const answer = await queryTranscript(transcript, question);
    
    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Query API Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to answer question' }, { status: 500 });
  }
}
