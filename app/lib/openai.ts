import OpenAI from 'openai';

let client: OpenAI | null = null;

// Optional OpenAI-compatible gateway (e.g. OpenRouter). When set, the OpenAI
// SDK is pointed at this base URL instead of api.openai.com, so an OpenRouter
// key + OpenRouter model slug (e.g. "anthropic/claude-haiku-4.5") runs Claude,
// GPT, Gemini, etc. through one OpenAI-shaped endpoint.
export const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || '';

export function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      ...(OPENAI_BASE_URL ? { baseURL: OPENAI_BASE_URL } : {}),
    });
  }
  return client;
}

// True when talking to OpenAI directly (not a third-party gateway like
// OpenRouter, which doesn't expose the audio/speech endpoint).
export const IS_NATIVE_OPENAI =
  !OPENAI_BASE_URL || OPENAI_BASE_URL.includes('api.openai.com');

export const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
export const TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
