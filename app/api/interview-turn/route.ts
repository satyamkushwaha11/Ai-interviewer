import { getAIProvider, type ChatMessage } from '@/app/lib/ai';
import { buildInterviewerSystemPrompt } from '@/app/lib/prompts';
import type { InterviewConfig, TurnMessage } from '@/app/lib/types';

export const runtime = 'nodejs';

const END_TOKEN = 'END_INTERVIEW';
const HISTORY_WINDOW = 8; // keep last N messages (~4 turns)

export async function POST(request: Request) {
  const { config, history } = (await request.json()) as {
    config: InterviewConfig;
    history: TurnMessage[];
  };

  const asked = history.filter((m) => m.role === 'interviewer').length;
  const target = config.targetTurns ?? 12;

  const ai = getAIProvider();
  if (!ai) {
    const stub =
      asked === 0
        ? "Hi, thanks for joining. Let's start — can you walk me through your background?"
        : asked >= target
          ? `Thanks for your time, that's all I have.\n${END_TOKEN}`
          : 'Interesting — can you give a specific example of that?';
    return Response.json({ question: stub.replace(END_TOKEN, '').trim(), done: stub.includes(END_TOKEN) });
  }

  const system = buildInterviewerSystemPrompt(config);
  const windowed = history.slice(-HISTORY_WINDOW);
  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    ...windowed.map((m) => ({
      role: (m.role === 'interviewer' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.content,
    })),
  ];

  const raw = (await ai.chat(messages, { temperature: 0.7, maxTokens: 200 })).trim();
  const done = raw.includes(END_TOKEN);
  const question = raw.replace(END_TOKEN, '').trim();
  return Response.json({ question, done });
}
