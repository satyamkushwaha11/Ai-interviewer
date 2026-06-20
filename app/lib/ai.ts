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

export const GEMINI_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-1.5-flash';

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

const RATE_LIMIT_RESET_MS = 60000;
const rateLimitedKeys = new Map<string, number>();

const geminiProvider: AIProvider = {
  name: 'gemini',
  async chat(messages, opts) {
    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey) throw new Error('Gemini selected but GEMINI_API_KEY is missing');
    const apiKeys = rawKey.split(',').map((k) => k.trim()).filter((k) => k.length > 0);

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

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Begin.' }] });
    }

    const body = {
      ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
      contents,
      generationConfig: {
        ...(opts?.temperature != null ? { temperature: opts.temperature } : {}),
        ...(opts?.maxTokens != null ? { maxOutputTokens: opts.maxTokens } : {}),
        ...(opts?.json ? { responseMimeType: 'application/json' } : {}),
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CHAT_MODEL}:generateContent`;

    let lastError: Error | null = null;
    const now = Date.now();

    for (const apiKey of apiKeys) {
      const limitedUntil = rateLimitedKeys.get(apiKey);
      if (limitedUntil && now < limitedUntil) {
        continue; // Skip this key as it is currently in its cooldown period
      }

      try {
        const res = await fetch(`${url}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const detail = await res.text();
          const detailLower = detail.toLowerCase();
          
          if (res.status === 429 || res.status === 503 || detailLower.includes('quota') || detailLower.includes('rate limit')) {
            rateLimitedKeys.set(apiKey, Date.now() + RATE_LIMIT_RESET_MS);
            throw new Error(`Rate limit hit: ${res.status}`);
          }
          throw new Error(`Gemini API error ${res.status}: ${detail}`);
        }

        // Success! Clear any existing rate limit for this key
        rateLimitedKeys.delete(apiKey);

        const data = (await res.json()) as GeminiResponse;
        return (
          data.candidates?.[0]?.content?.parts
            ?.map((p) => p.text ?? '')
            .join('')
            .trim() ?? ''
        );
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (lastError.message.includes('Rate limit hit')) {
          continue;
        } else {
          throw lastError;
        }
      }
    }

    if (lastError) {
      throw lastError;
    }
    
    throw new Error('All configured Gemini API keys are currently rate limited. Please try again in a minute.');
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
