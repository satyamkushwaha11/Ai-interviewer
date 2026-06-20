import { getAIProvider } from '@/app/lib/ai';
import { buildProfileSummaryPrompt } from '@/app/lib/prompts';
import type { InterviewMode } from '@/app/lib/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { resume, jd, role, mode } = (await request.json()) as {
    resume: string;
    jd?: string;
    role?: string;
    mode: InterviewMode;
  };

  const fallbackSummary = () =>
    `Candidate:\n- Background: (see resume)\n- Stack: (see resume)\n\n${mode === 'targeted' && jd ? `Role target:\n- Role: ${role || 'n/a'}\n- JD: ${jd.slice(0, 200)}\n` : ''}`;

  const ai = getAIProvider();
  if (!ai) {
    return Response.json({ summary: fallbackSummary() });
  }

  const userBlock = [
    `Mode: ${mode}`,
    role ? `Target role: ${role}` : '',
    `Resume:\n${resume.slice(0, 8000)}`,
    mode === 'targeted' && jd ? `Job description:\n${jd.slice(0, 4000)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const summary = await ai.chat(
      [
        { role: 'system', content: buildProfileSummaryPrompt() },
        { role: 'user', content: userBlock },
      ],
      { temperature: 0.2, maxTokens: 500 }
    );
    return Response.json({ summary: summary || fallbackSummary() });
  } catch (err) {
    console.error('summarize-profile failed:', err);
    return Response.json({ summary: fallbackSummary() });
  }
}
