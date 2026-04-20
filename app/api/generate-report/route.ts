import { CHAT_MODEL, getOpenAI } from '@/app/lib/openai';
import { buildReportSystemPrompt } from '@/app/lib/prompts';
import type { InterviewConfig, InterviewReport, TurnMessage } from '@/app/lib/types';

export const runtime = 'nodejs';

function stubReport(history: TurnMessage[]): InterviewReport {
  const pairs: InterviewReport['perQuestion'] = [];
  for (let i = 0; i < history.length - 1; i++) {
    if (history[i].role === 'interviewer' && history[i + 1]?.role === 'candidate') {
      pairs.push({
        question: history[i].content,
        answer: history[i + 1].content,
        feedback: 'Stubbed feedback (no OPENAI_API_KEY set).',
        score: 7,
      });
    }
  }
  return {
    overall: 7,
    summary: 'Stubbed report — set OPENAI_API_KEY for real analysis.',
    communication: { score: 7, notes: 'Stub' },
    knowledge: { score: 7, notes: 'Stub' },
    problemSolving: { score: 7, notes: 'Stub' },
    roleFit: { score: 7, notes: 'Stub' },
    strengths: ['Stub strength'],
    improvements: ['Stub improvement'],
    perQuestion: pairs,
  };
}

export async function POST(request: Request) {
  const { config, history } = (await request.json()) as {
    config: InterviewConfig;
    history: TurnMessage[];
  };

  const openai = getOpenAI();
  if (!openai) return Response.json({ report: stubReport(history) });

  const transcript = history
    .map((m) => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
    .join('\n\n');

  const contextBlock = `Mode: ${config.mode}\nRole: ${config.role || 'n/a'}\nDifficulty: ${config.difficulty}\n\nResume:\n${config.resume}\n\n${config.jd ? `Job description:\n${config.jd}\n\n` : ''}Transcript:\n${transcript}`;

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: buildReportSystemPrompt() },
      { role: 'user', content: contextBlock },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 2500,
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  let report: InterviewReport;
  try {
    report = JSON.parse(raw) as InterviewReport;
  } catch {
    report = stubReport(history);
    report.summary = 'Report parse failed — showing stub.';
  }
  return Response.json({ report });
}
