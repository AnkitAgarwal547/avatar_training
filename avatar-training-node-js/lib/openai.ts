import OpenAI from 'openai';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ScoreResult {
  empathy: number;
  resolution: number;
  tone: number;
  feedback: string;
}

// Lazy singleton — created on first call so that dotenv in server.ts
// has already populated process.env before we read OPENAI_API_KEY.
let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

const SYSTEM_PROMPT = `You are "Priya", a friendly corporate trainer teaching 
customer complaint handling using the L-A-S-T method (Listen, Apologise, Solve, Thank).

TEACH mode: Explain warmly, ask one check-in question at a time.

ROLEPLAY mode: Play "Meena", an upset customer. Start frustration at 8/10.
- Learner acknowledges feelings → frustration drops to 5/10
- Sincere apology → drops to 3/10
- Clear solution offered → drops to 1/10, thank them warmly
- Skips empathy → escalate frustration to 9/10

Continue the roleplay conversation. Do not output JSON or scores. Keep the dialogue going so the learner can practise as long as they like.`;

/**
 * Send a message to GPT-4o and get a reply.
 * Maintains conversation history for multi-turn dialogue.
 *
 * @param history - Previous conversation messages
 * @param userMessage - The new user message
 * @returns GPT-4o response text (may be JSON after 4 exchanges)
 */
export async function chat(
  history: Message[],
  userMessage: string
): Promise<string> {
  const response = await getClient().chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 350,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ],
  });

  return response.choices[0].message.content ?? '';
}

/**
 * Try to parse a score JSON object from a GPT reply.
 * Returns null if the reply is not a valid score object.
 */
export function tryParseScore(text: string): ScoreResult | null {
  try {
    // GPT sometimes wraps JSON in markdown code fences — strip them
    const clean = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(clean) as Partial<ScoreResult>;

    if (
      typeof parsed.empathy === 'number' &&
      typeof parsed.resolution === 'number' &&
      typeof parsed.tone === 'number' &&
      typeof parsed.feedback === 'string'
    ) {
      return parsed as ScoreResult;
    }
  } catch {
    // Not JSON — normal dialogue response
  }
  return null;
}
