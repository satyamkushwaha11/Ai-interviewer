import OpenAI from 'openai';

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
export const TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
