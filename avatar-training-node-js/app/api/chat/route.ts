import { NextRequest, NextResponse } from 'next/server';
import { chat, tryParseScore, Message } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const { history, message } = (await request.json()) as {
      history: Message[];
      message: string;
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const reply = await chat(history ?? [], message);
    const score = tryParseScore(reply);

    if (score) {
      return NextResponse.json({ answer: reply, score });
    }

    return NextResponse.json({ answer: reply });
  } catch (err) {
    console.error('[API /chat] Error:', err);
    return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 });
  }
}
