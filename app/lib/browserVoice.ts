import type { Gender } from './types';

/**
 * Voice selection for the browser `speechSynthesis` fallback.
 *
 * This path is used whenever /api/tts is unavailable — notably when
 * OPENAI_BASE_URL points at an OpenAI-compatible gateway (OpenRouter and
 * friends) that does not expose the audio/speech endpoint.
 *
 * Matching on the literal words "male"/"female" is not enough: only a handful
 * of voices are named that way ("Google UK English Male"), while most ship
 * under a personal name ("Samantha", "Daniel", "Microsoft David"). Without the
 * name tables below every session ends up on whichever English voice happens to
 * be first, which is why the interviewer always sounded the same.
 */

const MALE_NAMES = [
  'male', 'david', 'mark', 'alex', 'daniel', 'george', 'james', 'guy', 'ryan',
  'thomas', 'fred', 'rishi', 'aaron', 'arthur', 'brian', 'christopher', 'eric',
  'liam', 'william', 'oliver', 'gordon', 'lee', 'ravi', 'prabhat', 'juan',
  'diego', 'tom', 'jorge', 'nathan', 'roger', 'andrew', 'brandon',
];

const FEMALE_NAMES = [
  'female', 'zira', 'samantha', 'victoria', 'karen', 'moira', 'tessa', 'fiona',
  'susan', 'allison', 'ava', 'serena', 'catherine', 'amelie', 'hazel', 'linda',
  'heera', 'sonia', 'emma', 'sophia', 'olivia', 'aria', 'jenny', 'michelle',
  'nova', 'nicky', 'joana', 'kathy', 'princess', 'shelley', 'anna', 'zoe',
];

function matches(name: string, tokens: string[]): boolean {
  const lower = name.toLowerCase();
  return tokens.some((t) => lower.includes(t));
}

/**
 * `getVoices()` is empty until the voice list loads in most browsers, so the
 * first question would otherwise always use the default voice. Resolves early
 * once voices arrive, and gives up after `timeoutMs` rather than blocking TTS.
 */
export function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    const existing = window.speechSynthesis.getVoices();
    if (existing.length) {
      resolve(existing);
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener('voiceschanged', finish);
      resolve(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis.addEventListener('voiceschanged', finish);
    setTimeout(finish, timeoutMs);
  });
}

/**
 * Best English voice for the requested gender. Returns null when nothing
 * suitable exists, in which case the caller should lean on pitch alone.
 */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  gender: Gender,
): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
  const pool = english.length ? english : voices;
  if (!pool.length) return null;

  const wanted = gender === 'male' ? MALE_NAMES : FEMALE_NAMES;
  const opposite = gender === 'male' ? FEMALE_NAMES : MALE_NAMES;

  // 1. A voice explicitly matching the requested gender.
  const exact = pool.find((v) => matches(v.name, wanted));
  if (exact) return exact;

  // 2. Failing that, anything not clearly the opposite gender, preferring a
  //    local voice since network voices can lag behind the animation.
  const neutral = pool.filter((v) => !matches(v.name, opposite));
  if (neutral.length) {
    return neutral.find((v) => v.localService) ?? neutral[0];
  }

  return pool[0];
}

/** Pitch nudge so the two options still differ when only one voice exists. */
export function pitchFor(gender: Gender, voice: SpeechSynthesisVoice | null): number {
  if (voice && matches(voice.name, gender === 'male' ? MALE_NAMES : FEMALE_NAMES)) {
    return 1; // The voice already matches; leave it alone.
  }
  return gender === 'male' ? 0.75 : 1.2;
}
