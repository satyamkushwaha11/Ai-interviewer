import { CHAT_MODEL, getOpenAI } from './openai';

/**
 * Unified AI provider layer.
 *
 * A developer can pick the backing model provider for the whole site with the
 * `AI_PROVIDER` env var ("openai" | "gemini"). If it is unset (or set to a
 * provider whose API key is missing) we auto-select: OpenAI when an
 * OPENAI_API_KEY exists, otherwise Gemini when a GEMINI_API_KEY exists.
 *
 * Routes never talk to a vendor SDK directly — they call `getAIProvider()` and
 * use the provider-agnostic `chat()` method, so swapping providers is a config
 * change, not a code change.
 */

export type ProviderName = 'openai' | 'gemini';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** Ask the model to return a single JSON object. */
  json?: boolean;
}

export interface AIProvider {
  name: ProviderName;
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
}

export const GEMINI_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';

function hasOpenAI(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

function hasGemini(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/** Resolve which provider to use, honoring the developer override when possible. */
export function resolveProviderName(): ProviderName | null {
  const configured = (process.env.AI_PROVIDER || '').trim().toLowerCase();

  // Explicit developer choice wins when its key is available.
  if (configured === 'openai' && hasOpenAI()) return 'openai';
  if (configured === 'gemini' && hasGemini()) return 'gemini';

  // Auto-select: prefer OpenAI, fall back to Gemini.
  if (hasOpenAI()) return 'openai';
  if (hasGemini()) return 'gemini';
  return null;
}

// --- OpenAI implementation ---------------------------------------------------

const openAIProvider: AIProvider = {
  name: 'openai',
  async chat(messages, opts) {
    const openai = getOpenAI();
    if (!openai) throw new Error('OpenAI selected but OPENAI_API_KEY is missing');

    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: opts?.temperature,
      max_tokens: opts?.maxTokens,
      ...(opts?.json ? { response_format: { type: 'json_object' as const } } : {}),
    });

    return completion.choices[0]?.message?.content?.trim() ?? '';
  },
};

// --- Gemini implementation (REST, no SDK dependency) -------------------------

interface GeminiPart {
  text?: string;
}
interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
}

const geminiProvider: AIProvider = {
  name: 'gemini',
  async chat(messages, opts) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini selected but GEMINI_API_KEY is missing');

    // Gemini takes the system prompt separately and uses "model"/"user" roles.
    const systemText = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    // Gemini rejects a request with empty `contents` (HTTP 400). This happens
    // when the only input is a system prompt — e.g. the first interview turn,
    // where the model is expected to open the conversation. OpenAI accepts a
    // system-only request, so inject a minimal user turn to keep parity.
    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Begin.' }] });
    }

    // Gemini 2.5+/3.x "flash" models spend hidden "thinking" tokens that count
    // against maxOutputTokens, which can starve short replies. Disable it so the
    // whole budget goes to the answer. Only flash models allow a 0 budget; pro
    // models reject it, so we leave those alone.
    const allowsNoThinking = /flash/i.test(GEMINI_CHAT_MODEL);

    const body = {
      ...(systemText ? { system_instruction: { parts: [{ text: systemText }] } } : {}),
      contents,
      generationConfig: {
        ...(opts?.temperature != null ? { temperature: opts.temperature } : {}),
        ...(opts?.maxTokens != null ? { maxOutputTokens: opts.maxTokens } : {}),
        ...(opts?.json ? { responseMimeType: 'application/json' } : {}),
        ...(allowsNoThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CHAT_MODEL}:generateContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${detail}`);
    }

    const data = (await res.json()) as GeminiResponse;
    return (
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? '')
        .join('')
        .trim() ?? ''
    );
  },
};

/**
 * Returns the active AI provider, or `null` when no provider is configured
 * (no usable API key) so callers can fall back to their stub responses.
 */
export function getAIProvider(): AIProvider | null {
  const name = resolveProviderName();
  if (name === 'openai') return openAIProvider;
  if (name === 'gemini') return geminiProvider;
  return null;
}
