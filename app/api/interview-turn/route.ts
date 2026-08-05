import { getAIProvider, type ChatMessage } from '@/app/lib/ai';
import { buildAreaSteer, buildInterviewerSystemPrompt } from '@/app/lib/prompts';
import type { InterviewConfig, TurnMessage } from '@/app/lib/types';

export const runtime = 'nodejs';

const END_TOKEN = 'END_INTERVIEW';
const HISTORY_WINDOW = 8; // keep last N messages (~4 turns)

/**
 * Which agenda area this turn belongs to — turns are spread evenly across the
 * plan. Returns -1 when the session has no plan.
 */
export function currentAreaIndex(asked: number, target: number, areaCount: number): number {
  if (areaCount <= 0) return -1;
  const perArea = Math.max(1, target / areaCount);
  return Math.min(areaCount - 1, Math.floor(asked / perArea));
}

export async function POST(request: Request) {
  const { config, history } = (await request.json()) as {
    config: InterviewConfig;
    history: TurnMessage[];
  };

  const asked = history.filter((m) => m.role === 'interviewer').length;
  const target = config.targetTurns ?? 12;

  const stubTurn = () => {
    const stub =
      asked === 0
        ? "Hi, thanks for joining. Let's start — can you walk me through your background?"
        : asked >= target
          ? `Thanks for your time, that's all I have.\n${END_TOKEN}`
          : 'Interesting — can you give a specific example of that?';
    return Response.json({
      question: stub.replace(END_TOKEN, '').trim(),
      done: stub.includes(END_TOKEN),
    });
  };

  const ai = getAIProvider();
  if (!ai) return stubTurn();

  const system = buildInterviewerSystemPrompt(config);
  const windowed = history.slice(-HISTORY_WINDOW);
  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    ...windowed.map((m) => ({
      role: (m.role === 'interviewer' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.content,
    })),
  ];

  // Appended last so the cached prefix (system + history) stays byte-stable
  // while the model still gets an explicit steer to the current agenda area.
  const areas = config.plan?.areas ?? [];
  const areaIndex = currentAreaIndex(asked, target, areas.length);
  if (areaIndex >= 0 && asked < target) {
    messages.push({
      role: 'system',
      content: buildAreaSteer(areas[areaIndex], areaIndex, areas.length),
    });
  }

  try {
    const raw = (await ai.chat(messages, { temperature: 0.7, maxTokens: 200 })).trim();
    const done = raw.includes(END_TOKEN);
    const question = raw.replace(END_TOKEN, '').trim();
    // An empty model reply would stall the interview; fall back to a stub.
    if (!question) return stubTurn();
    return Response.json({ question, done });
  } catch (err) {
    console.error('interview-turn failed:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    let friendlyMessage = "I'm sorry, but my AI system encountered an error. Please check your API configuration.";
    if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota')) {
      friendlyMessage = "You have exceeded your Gemini API free tier rate limit. Please wait a short moment for the limit to reset before we continue.";
    } else if (errorMessage.includes('API key not valid') || errorMessage.includes('401') || errorMessage.includes('403')) {
      friendlyMessage = "Your API key appears to be invalid or missing. Please check your configuration.";
    }

    return Response.json({ 
      question: friendlyMessage, 
      done: false 
    });
  }
}
