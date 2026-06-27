import { IS_NATIVE_OPENAI, TTS_MODEL, getOpenAI } from '@/app/lib/openai';
import type { Difficulty, Gender } from '@/app/lib/types';

export const runtime = 'nodejs';

// Steerable voices from the gpt-4o-mini-tts family (the model behind openai.fm).
// Picked for a natural, credible interviewer delivery rather than an "assistant" timbre.
const VOICE_BY_GENDER: Record<Gender, string> = {
  male: 'ash', // clear, confident, articulate
  female: 'coral', // warm, composed, professional
};

const DEFAULT_VOICE = 'coral';

// Per-rigor delivery steering. `instructions` only affects gpt-4o-mini-tts voices.
const TONE_BY_DIFFICULTY: Record<Difficulty, string> = {
  easy: 'Warm, encouraging and relaxed; speak at an unhurried, reassuring pace.',
  medium: 'Professional and balanced; a steady, neutral corporate cadence.',
  hard: 'Firm, analytical and exacting; crisp delivery with deliberate pauses.',
  brutal: 'Cool, clipped and high-pressure; minimal warmth, surgical precision.',
};

function buildInstructions(difficulty?: Difficulty): string {
  const tone = TONE_BY_DIFFICULTY[difficulty ?? 'medium'] ?? TONE_BY_DIFFICULTY.medium;
  return [
    'Affect: a senior human hiring manager conducting a live voice interview.',
    'Voice: composed, credible and natural — never robotic, peppy, or sing-song.',
    'Delivery: clear enunciation with natural sentence rhythm and brief pauses at commas and between thoughts.',
    'Sound like a real professional on a phone or video call, not a cheerful assistant.',
    `Tone: ${tone}`,
  ].join(' ');
}

// gpt-4o-mini-tts (and dated variants) support `instructions`; tts-1/tts-1-hd do not.
const SUPPORTS_INSTRUCTIONS = TTS_MODEL.includes('gpt-4o-mini-tts');

export async function POST(request: Request) {
  const { text, gender, difficulty } = (await request.json()) as {
    text: string;
    gender: Gender;
    difficulty?: Difficulty;
  };
  const openai = getOpenAI();
  if (!openai) {
    return new Response('TTS disabled (no OPENAI_API_KEY)', { status: 501 });
  }
  // OpenAI-compatible gateways (e.g. OpenRouter) don't expose the audio/speech
  // endpoint. Bail early so the client falls back to browser speech instead of
  // throwing on an unsupported request.
  if (!IS_NATIVE_OPENAI) {
    return new Response('TTS unavailable on this provider', { status: 501 });
  }

  const audio = await openai.audio.speech.create({
    model: TTS_MODEL,
    voice: VOICE_BY_GENDER[gender] ?? DEFAULT_VOICE,
    input: text,
    ...(SUPPORTS_INSTRUCTIONS ? { instructions: buildInstructions(difficulty) } : {}),
    response_format: 'mp3',
  });

  return new Response(audio.body, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
  });
}
