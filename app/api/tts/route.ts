import { TTS_MODEL, getOpenAI } from '@/app/lib/openai';
import type { Gender } from '@/app/lib/types';

export const runtime = 'nodejs';

const VOICE_BY_GENDER: Record<Gender, string> = {
  male: 'onyx',
  female: 'shimmer',
};

export async function POST(request: Request) {
  const { text, gender } = (await request.json()) as { text: string; gender: Gender };
  const openai = getOpenAI();
  if (!openai) {
    return new Response('TTS disabled (no OPENAI_API_KEY)', { status: 501 });
  }

  const audio = await openai.audio.speech.create({
    model: TTS_MODEL,
    voice: VOICE_BY_GENDER[gender] ?? 'alloy',
    input: text,
    response_format: 'mp3',
  });

  return new Response(audio.body, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
  });
}
