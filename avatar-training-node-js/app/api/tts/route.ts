import { NextRequest, NextResponse } from 'next/server';
import { synthesise } from '@/lib/kokoro';

export async function POST(request: NextRequest) {
  try {
    const { text, voice } = (await request.json()) as {
      text: string;
      voice?: string;
    };

    if (!text?.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const { audio, phonemes } = await synthesise(text, voice);

    return NextResponse.json({
      audio: Array.from(audio),  // Float32Array → plain array for JSON transport
      phonemes,
    });
  } catch (err) {
    console.error('[API /tts] Error:', err);
    return NextResponse.json({ error: 'TTS synthesis failed' }, { status: 500 });
  }
}
