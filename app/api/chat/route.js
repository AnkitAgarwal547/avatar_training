import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { question, context, apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No API key provided' },
        { status: 400 }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a friendly and knowledgeable training instructor avatar. You help employees learn through interactive training sessions. Keep your responses concise (2-3 sentences), encouraging, and educational. Current training context: ${context || 'General training'}`,
          },
          {
            role: 'user',
            content: question,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    const answer = data.choices[0].message.content;

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
}
