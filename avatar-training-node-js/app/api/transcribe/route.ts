import { NextRequest, NextResponse } from 'next/server';
import { transcribe } from '@/lib/whisper';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'audio file is required' }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const transcript = await transcribe(buffer);

    if (!transcript.trim()) {
      return NextResponse.json({ error: 'Could not transcribe audio' }, { status: 422 });
    }

    return NextResponse.json({ transcript });
  } catch (err) {
    console.error('[API /transcribe] Error:', err);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
