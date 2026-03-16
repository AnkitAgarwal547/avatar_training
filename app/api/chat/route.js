import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are "Priya", a friendly corporate trainer teaching 
customer complaint handling using the L-A-S-T method (Listen, Apologise, Solve, Thank).

TEACH mode: Explain warmly, ask one check-in question at a time.

ROLEPLAY mode: Play "Meena", an upset customer. Start frustration at 8/10.
- Learner acknowledges feelings → frustration drops to 5/10
- Sincere apology → drops to 3/10
- Clear solution offered → drops to 1/10, thank them warmly
- Skips empathy → escalate frustration to 9/10

After exactly 4 learner exchanges, output ONLY the following valid JSON (no extra text):
{"empathy":0-10,"resolution":0-10,"tone":0-10,"feedback":"one concise sentence of feedback"}`;

export async function POST(request) {
  try {
    const { question, context, history, message } = await request.json();

    // Support both old format (question/context) and new format (history/message)
    const userMessage = message || question || '';
    const conversationHistory = history || [];

    if (!userMessage.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 350,
      messages: [
        { role: 'system', content: context
            ? `You are a helpful training instructor. Context: ${context}`
            : SYSTEM_PROMPT },
        ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ],
    });

    const answer = response.choices[0].message.content;

    // Check if the reply is a JSON score
    try {
      const clean = answer.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (typeof parsed.empathy === 'number') {
        return NextResponse.json({ answer, score: parsed });
      }
    } catch { /* normal text response */ }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 });
  }
}

