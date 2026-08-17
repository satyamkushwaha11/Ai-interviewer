'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { useToast } from './Toast';
import { loadVoices, pickVoice, pitchFor } from '@/app/lib/browserVoice';
import { fetchJson, toUserMessage } from '@/app/lib/fetchJson';
import type { InterviewConfig, TurnMessage } from '@/app/lib/types';

interface Props {
  config: InterviewConfig;
  /** The session row created by POST /api/sessions; every turn is checked against it. */
  sessionId: string;
  onFinish: (history: TurnMessage[]) => void;
}

/** How long to wait on the model before offering a retry. */
const TURN_TIMEOUT_MS = 75_000;
/** Hosted TTS is a nicety; fall back to the browser voice quickly if it stalls. */
const TTS_TIMEOUT_MS = 20_000;

type Phase = 'loading' | 'speaking' | 'listening' | 'thinking' | 'done' | 'error';

interface AudioGraph {
  ctx: AudioContext;
  analyser: AnalyserNode;
  buffer: Uint8Array<ArrayBuffer>;
}

/** The slice of the Web Speech `SpeechRecognition` interface this component drives. */
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

/**
 * Recognition errors after which auto-restarting is pointless: the next
 * start() would fail the same way. Everything else ('no-speech', 'aborted')
 * is routine and `onend` simply restarts.
 */
const TERMINAL_MIC_ERRORS: Record<string, { title: string; message: string }> = {
  'not-allowed': {
    title: 'Microphone blocked',
    message:
      'Microphone access is blocked. Allow it in your browser settings, or type your answer below.',
  },
  'service-not-allowed': {
    title: 'Microphone blocked',
    message:
      'Microphone access is blocked. Allow it in your browser settings, or type your answer below.',
  },
  'audio-capture': {
    title: 'No microphone',
    message: 'No microphone was found. Type your answer below instead.',
  },
  // Browsers whose speech service is disabled (Brave, unbranded Chromium,
  // Opera) fail like this on every start; retrying would spin
  // start→error→end forever with the mic looking live and nothing transcribed.
  network: {
    title: 'Speech recognition unavailable',
    message:
      'Speech recognition could not reach its service — some browsers (e.g. Brave) block it. Tap the mic to retry, use Chrome, or type your answer below.',
  },
};

/** Resting heights (px) for the orb's equaliser bars. */
const ORB_BARS = [26, 44, 34, 56, 38, 48, 28];

/** Used only when a session somehow arrives without a role plan. */
const FALLBACK_STAGES: { key: string; title: string; hint: string }[] = [
  { key: 'opening', title: 'Opening', hint: 'Greeting & first question' },
  { key: 'core', title: 'Core questions', hint: 'Depth & follow-ups' },
  { key: 'wrap-up', title: 'Wrap-up', hint: 'Final probes & sign-off' },
];

function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function Interview({ config, sessionId, onFinish }: Props) {
  const [history, setHistory] = useState<TurnMessage[]>([]);
  const [phase, setPhase] = useState<Phase>('loading');
  const [currentQuestion, setCurrentQuestion] = useState('');

  // STT State
  const [committedText, setCommittedText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [sttSupported, setSttSupported] = useState(true);
  const [isMicActive, setIsMicActive] = useState(false);
  const [micError, setMicError] = useState('');
  const [turnError, setTurnError] = useState('');
  const { error: toastError, warning: toastWarning, info: toastInfo } = useToast();

  // UI State
  const [typing, setTyping] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const recognitionRef = useRef<Recognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioGraphRef = useRef<AudioGraph | null>(null);
  const amplitudeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const historyRef = useRef<TurnMessage[]>(history);
  const scrollRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => { historyRef.current = history; }, [history]);

  const initialFetchDone = useRef(false);
  const shouldListenRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  // The browser-speech notice is worth saying once per session, not per turn.
  const ttsNoticeShown = useRef(false);
  // Once hosted TTS has failed (not configured, gateway without audio, or a
  // timeout) stop trying: every later question would otherwise wait out the
  // same failure before the browser voice took over.
  const hostedTtsUnavailable = useRef(false);
  const voiceNoticeOnce = useCallback(
    (message: string, title: string) => {
      if (ttsNoticeShown.current) return;
      ttsNoticeShown.current = true;
      toastInfo(message, { title });
    },
    [toastInfo],
  );
  // Mirrors of the draft so recognition callbacks and submit read the same
  // values without depending on render closures.
  const committedRef = useRef('');
  const interimRef = useRef('');
  // Set when an answer is submitted. Chrome finalises the pending interim
  // result *after* stop() (a late `onresult`, then `onend`); both must be
  // ignored or the just-sent text reappears as the draft of the next answer.
  // Cleared by the next `onstart`, i.e. once a fresh session owns the events.
  const discardUntilStartRef = useRef(false);

  useEffect(() => { committedRef.current = committedText; }, [committedText]);
  useEffect(() => { interimRef.current = interimText; }, [interimText]);

  // Session clock
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // A reload or closed tab mid-interview loses the session; make the browser
  // ask first once there is something to lose.
  useEffect(() => {
    if (phase === 'done' || history.length < 2) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase, history.length]);

  // Auto-scroll to bottom of transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, committedText, interimText]);

  const ensureAudioGraph = (): AudioGraph => {
    if (audioGraphRef.current) return audioGraphRef.current;
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC!();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.6;
    const buffer = new Uint8Array(new ArrayBuffer(analyser.fftSize));
    const graph = { ctx, analyser, buffer };
    audioGraphRef.current = graph;
    return graph;
  };

  const startAmplitudeLoop = () => {
    if (rafRef.current !== null) return;
    const loop = () => {
      const graph = audioGraphRef.current;
      if (graph) {
        graph.analyser.getByteTimeDomainData(graph.buffer);
        let sum = 0;
        for (let i = 0; i < graph.buffer.length; i++) {
          const v = (graph.buffer[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / graph.buffer.length);
        amplitudeRef.current = rms;
      }
      // Drive the orb's bars straight off the analyser, bypassing React state
      // so this stays a style write rather than a re-render every frame.
      orbRef.current?.style.setProperty(
        '--amp',
        (1 + Math.min(1.4, amplitudeRef.current * 7)).toFixed(3),
      );
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const playTts = useCallback(
    async (text: string) => {
      setPhase('speaking');
      try {
        if (hostedTtsUnavailable.current) throw new Error('hosted TTS disabled for this session');
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, gender: config.gender, difficulty: config.difficulty }),
          signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
        });
        if (!res.ok) throw new Error(`TTS failed (${res.status})`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.crossOrigin = 'anonymous';
        audioRef.current = audio;

        const graph = ensureAudioGraph();
        if (graph.ctx.state === 'suspended') await graph.ctx.resume();
        const source = graph.ctx.createMediaElementSource(audio);
        source.connect(graph.analyser);
        graph.analyser.connect(graph.ctx.destination);
        startAmplitudeLoop();

        await new Promise<void>((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            amplitudeRef.current = 0;
            resolve();
          };
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
      } catch {
        // Fallback to browser TTS if the API is unavailable (e.g. an
        // OpenAI-compatible gateway with no audio/speech endpoint).
        hostedTtsUnavailable.current = true;
        if (!('speechSynthesis' in window)) {
          voiceNoticeOnce(
            'This browser has no speech output — questions are text only.',
            'Voice unavailable',
          );
          return;
        }
        const voices = await loadVoices();
        const voice = pickVoice(voices, config.gender);

        await new Promise<void>((resolve) => {
          window.speechSynthesis.cancel(); // Cancel any previous speech
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = voice?.lang || 'en-US';
          if (voice) utterance.voice = voice;
          utterance.pitch = pitchFor(config.gender, voice);
          utterance.rate = 0.98;

          let fakeSyncRaf: number | null = null;
          let started = false;
          let settled = false;

          const fakeSyncLoop = () => {
            if (window.speechSynthesis.speaking) {
              amplitudeRef.current = 0.3 + Math.random() * 0.4;
              fakeSyncRaf = requestAnimationFrame(fakeSyncLoop);
            } else {
              amplitudeRef.current = 0;
            }
          };

          // Chrome drops `onend` for long utterances and while backgrounded. If
          // this promise never settled the interview would hang on "speaking"
          // forever, with the mic disabled — so every exit routes through here.
          const finish = () => {
            if (settled) return;
            settled = true;
            clearInterval(keepAlive);
            clearTimeout(watchdog);
            if (fakeSyncRaf !== null) cancelAnimationFrame(fakeSyncRaf);
            amplitudeRef.current = 0;
            resolve();
          };

          // Chrome pauses synthesis after ~15s; a pause/resume ping keeps it going.
          const keepAlive = setInterval(() => {
            if (!started) return;
            if (!window.speechSynthesis.speaking) {
              finish();
              return;
            }
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }, 5000);

          // Hard ceiling derived from length, so a silent failure cannot strand us.
          const estimatedMs = Math.min(90_000, 5_000 + text.split(/\s+/).length * 450);
          const watchdog = setTimeout(finish, estimatedMs);

          utterance.onstart = () => {
            started = true;
            // Only worth saying once we know the browser voice actually works.
            voiceNoticeOnce(
              "Using your browser's built-in voice — the hosted voice is unavailable.",
              'Voice fallback',
            );
            // The orb reads amplitudeRef through this loop; without it the
            // fake sync below animates nothing.
            startAmplitudeLoop();
            fakeSyncLoop();
          };
          utterance.onend = finish;
          utterance.onerror = (e) => {
            // Chrome on Linux without a speech engine fails instantly with
            // 'synthesis-failed'; the question is then never spoken. Tell the
            // candidate to read it rather than leaving them waiting for audio.
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
              voiceNoticeOnce(
                'Your browser could not play the interviewer’s voice — read each question on screen and answer as usual.',
                'Voice unavailable',
              );
            }
            finish();
          };

          // A throw here would reject playTts and strand the turn on "speaking",
          // leaving the candidate with a disabled mic and no way to answer.
          try {
            window.speechSynthesis.speak(utterance);
          } catch {
            finish();
          }
        });
      }
    },
    [config.gender, config.difficulty, voiceNoticeOnce],
  );

  const fetchNext = useCallback(
    async (updated: TurnMessage[]) => {
      setPhase('thinking');
      setTurnError('');

      let data: { question: string; done: boolean; degraded?: boolean; notice?: string };
      try {
        data = await fetchJson<typeof data>('/api/interview-turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, history: updated }),
          signal: AbortSignal.timeout(TURN_TIMEOUT_MS),
        });
      } catch (err) {
        // Park in a recoverable state: the answer stays in history so a retry
        // continues the interview instead of restarting it.
        const message = toUserMessage(err);
        setTurnError(message);
        setPhase('error');
        toastError(message, { title: 'Could not get the next question', key: 'turn' });
        return;
      }

      if (data.degraded && data.notice) {
        toastWarning(data.notice, { title: 'Running in fallback mode', key: 'turn-degraded' });
      }

      const nextHistory = [
        ...updated,
        { role: 'interviewer' as const, content: data.question },
      ];
      setHistory(nextHistory);
      setCurrentQuestion(data.question);
      // Audio is a nicety; never let it block the candidate from answering.
      try {
        await playTts(data.question);
      } catch (err) {
        console.error('TTS playback failed, continuing without audio:', err);
      }
      if (data.done) {
        setPhase('done');
        onFinish(nextHistory);
      } else {
        setPhase('listening');
      }
    },
    [sessionId, onFinish, playTts, toastError, toastWarning],
  );

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = null;
  }, []);

  /**
   * Chrome throws InvalidStateError when the previous session has not finished
   * tearing down. Swallowing that throw silently kills the microphone for the
   * rest of the turn, so back off and try again a few times.
   */
  const startWithRetry = useCallback(() => {
    clearRestartTimer();
    let attempt = 0;
    const tryStart = () => {
      restartTimerRef.current = null;
      if (!shouldListenRef.current) return;
      try {
        recognitionRef.current?.start();
      } catch {
        attempt += 1;
        if (attempt <= 4) restartTimerRef.current = window.setTimeout(tryStart, 400 * attempt);
      }
    };
    tryStart();
  }, [clearRestartTimer]);

  const startListening = useCallback(() => {
    shouldListenRef.current = true;
    startWithRetry();
  }, [startWithRetry]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    clearRestartTimer();
    try {
      recognitionRef.current?.stop();
    } catch {}
  }, [clearRestartTimer]);

  useEffect(() => {
    const SR =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!SR) {
      setTimeout(() => setSttSupported(false), 0);
      return;
    }
    const rec = new (SR as new () => Recognition)();
    rec.continuous = true;
    rec.interimResults = true;
    // The recogniser is markedly better with the speaker's own English variant
    // (en-IN, en-GB, …) than with a hard-coded en-US.
    rec.lang = /^en(-|$)/i.test(navigator.language) ? navigator.language : 'en-US';
    recognitionRef.current = rec;

    rec.onstart = () => {
      discardUntilStartRef.current = false;
      setIsMicActive(true);
      setMicError('');
    };

    rec.onend = () => {
      setIsMicActive(false);

      // Commit whatever was heard (see discardUntilStartRef).
      if (!discardUntilStartRef.current && interimRef.current) {
        const committed = committedRef.current;
        const merged = committed + (committed ? ' ' : '') + interimRef.current;
        committedRef.current = merged;
        interimRef.current = '';
        setCommittedText(merged);
        setInterimText('');
      }

      // Chrome ends the session on its own after a silence. The restart must
      // happen regardless of the commit guard above, or the mic dies for the
      // rest of the turn and the candidate talks into a dead microphone.
      if (shouldListenRef.current) startWithRetry();
    };

    rec.onerror = (event) => {
      const terminal = TERMINAL_MIC_ERRORS[event?.error ?? ''];
      if (!terminal) return;
      shouldListenRef.current = false;
      setMicError(terminal.message);
      toastError(terminal.message, { title: terminal.title, key: 'mic' });
    };

    rec.onresult = (event) => {
      if (discardUntilStartRef.current) return;
      let sessionText = '';
      for (let i = 0; i < event.results.length; i++) {
        sessionText += event.results[i][0].transcript;
      }
      interimRef.current = sessionText;
      setInterimText(sessionText);
    };

    // Deps are all identity-stable, so this runs once; the teardown makes a
    // re-run (Fast Refresh) safe instead of leaving a live orphan session.
    return () => {
      rec.onstart = rec.onend = rec.onerror = rec.onresult = null;
      try {
        rec.stop();
      } catch {}
      if (recognitionRef.current === rec) recognitionRef.current = null;
    };
  }, [startWithRetry, toastError]);

  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    fetchNext([]);
    return () => {
      stopListening();
      audioRef.current?.pause();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      audioGraphRef.current?.ctx.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Voice-first: open the mic as soon as the interviewer stops talking, and
  // close it while they are speaking or thinking.
  useEffect(() => {
    if (!sttSupported) return;
    if (phase === 'listening') startListening();
    else stopListening();
  }, [phase, sttSupported, startListening, stopListening]);

  const submitAnswer = async () => {
    const committed = committedRef.current;
    const interim = interimRef.current;
    const finalAnswer = (committed + (committed && interim ? ' ' : '') + interim).trim();
    if (!finalAnswer) return;

    // Must precede stop(): the session's late events belong to this answer.
    discardUntilStartRef.current = true;
    stopListening();

    committedRef.current = '';
    interimRef.current = '';
    setCommittedText('');
    setInterimText('');

    const updated: TurnMessage[] = [
      ...historyRef.current,
      { role: 'candidate', content: finalAnswer },
    ];
    setHistory(updated);
    await fetchNext(updated);
  };

  /** Cut the interviewer off; playTts resolves and the turn advances to listening. */
  const skipSpeech = () => {
    audioRef.current?.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  /**
   * Switching the mic off sends the answer.
   *
   * Keyed off whether a draft exists rather than `isMicActive`: Chrome ends
   * recognition on its own after a silence and the restart can fail, which
   * would otherwise leave the button showing "start" on a finished answer and
   * swallow the click.
   */
  const handleMicClick = () => {
    if (phase === 'speaking') {
      skipSpeech();
      return;
    }
    if ((committedRef.current + interimRef.current).trim()) {
      submitAnswer();
      return;
    }
    if (isMicActive) {
      stopListening();
      // The candidate usually taps here expecting to send. Say plainly that
      // nothing was transcribed rather than silently switching the mic off.
      toastInfo(
        'Nothing was transcribed yet. Tap the mic to listen again, or type your answer.',
        { title: 'Nothing heard', key: 'mic-empty' },
      );
    } else {
      startListening();
    }
  };

  const repeatQuestion = async () => {
    if (phase !== 'listening' || !currentQuestion) return;
    stopListening();
    await playTts(currentQuestion);
    setPhase('listening');
  };

  const endEarly = () => {
    const answered = historyRef.current.some((m) => m.role === 'candidate');
    if (
      answered &&
      phase !== 'done' &&
      !window.confirm('End the interview now? You will be graded on the answers given so far.')
    ) {
      return;
    }
    stopListening();
    audioRef.current?.pause();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    onFinish(historyRef.current);
  };

  /** Re-request the turn that failed, keeping the transcript intact. */
  const retryTurn = () => {
    fetchNext(historyRef.current);
  };

  const phaseLabel = {
    loading: 'Initializing session',
    thinking: 'Analyzing your answer',
    speaking: 'Interviewer speaking',
    listening: 'Listening…',
    done: 'Session complete',
    error: 'Connection problem',
  }[phase];

  const combinedDraft = committedText + (committedText && interimText ? ' ' : '') + interimText;

  const asked = history.filter((m) => m.role === 'interviewer').length;
  const totalTurns = Math.max(config.targetTurns ?? 12, asked);

  // The rail mirrors the agenda the interviewer is actually working through,
  // using the same even split as the server (see currentAreaIndex).
  // Don't trust the payload's shape: a malformed plan should degrade to the
  // generic rail, not crash the live session mid-interview.
  const planAreas = Array.isArray(config.plan?.areas) ? config.plan.areas : [];
  const stages = planAreas.length
    ? planAreas.map((a, i) => ({
        key: a?.key || `area-${i}`,
        title: a?.title || `Section ${i + 1}`,
        hint: a?.focus || '',
      }))
    : FALLBACK_STAGES;
  const answered = Math.max(0, asked - 1);
  const stageIndex =
    phase === 'done'
      ? stages.length
      : Math.min(stages.length - 1, Math.floor(answered / Math.max(1, totalTurns / stages.length)));

  const showComposer = typing || !sttSupported;
  const hasDraft = combinedDraft.trim().length > 0;
  const micLabel =
    phase === 'speaking'
      ? 'Skip and answer now'
      : hasDraft
        ? 'Stop and send answer'
        : isMicActive
          ? 'Stop listening'
          : 'Start speaking';

  const sidebar = (
    <>
      <div>
        <h2 className="mb-1 font-display text-label-md uppercase tracking-widest text-on-surface-variant">
          Interview plan
        </h2>
        {config.plan?.roleFamily && (
          <p className="mb-5 font-display text-label-sm text-primary-fixed">
            {config.plan.roleFamily}
          </p>
        )}
        <div className="relative">
          <div className="absolute bottom-2 left-3 top-2 w-0.5 bg-surface-container-high" />
          {stages.map((stage, i) => {
            const done = i < stageIndex;
            const active = i === stageIndex;
            return (
              <div
                key={stage.key}
                className={`relative z-10 mb-8 flex items-start gap-4 ${
                  !done && !active ? 'opacity-50' : ''
                }`}
              >
                <div
                  className={`flex h-6 w-6 flex-none items-center justify-center rounded-full ${
                    done
                      ? 'bg-primary-fixed shadow-[0_0_10px_rgba(185,246,0,0.3)]'
                      : active
                        ? 'border-2 border-primary-fixed bg-background'
                        : 'border-2 border-surface-variant bg-background'
                  }`}
                >
                  {done && <Icon name="check" className="h-3.5 w-3.5 text-on-primary-fixed" />}
                  {active && <div className="h-2 w-2 animate-pulse rounded-full bg-primary-fixed" />}
                </div>
                <div>
                  <h3
                    className={`font-display text-label-md ${
                      active ? 'font-bold text-primary-fixed' : 'text-on-surface'
                    }`}
                  >
                    {stage.title}
                  </h3>
                  <p
                    className={`mt-1 line-clamp-2 font-display text-label-sm ${
                      active ? 'text-primary-fixed/80' : 'text-on-surface-variant'
                    }`}
                  >
                    {done ? 'Completed' : active ? 'In progress' : stage.hint}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transcript */}
      <div className="flex flex-col">
        <h2 className="mb-3 font-display text-label-md uppercase tracking-widest text-on-surface-variant">
          Transcript
        </h2>
        <div ref={scrollRef} className="scroll-slim max-h-72 min-h-32 space-y-4 overflow-y-auto pr-1">
          {history.length === 0 && (
            <p className="font-display text-label-sm text-on-surface-variant/60">
              Establishing secure connection…
            </p>
          )}
          {history.map((m, i) => (
            <div
              key={i}
              className={`border-l-2 pl-3 ${
                m.role === 'interviewer' ? 'border-primary-fixed' : 'border-outline-variant'
              }`}
            >
              <div className="mb-1 font-display text-label-sm uppercase tracking-widest text-on-surface-variant/60">
                {m.role === 'interviewer' ? 'Interviewer' : 'You'}
              </div>
              <p className="text-body-md leading-relaxed text-on-surface">{m.content}</p>
            </div>
          ))}
          {combinedDraft && (
            <div className="border-l-2 border-primary-fixed/40 pl-3">
              <div className="mb-1 font-display text-label-sm uppercase tracking-widest text-primary-fixed/60">
                Drafting
              </div>
              <p className="text-body-md leading-relaxed text-on-surface-variant">
                {combinedDraft}
                <span className="ml-1.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary-fixed align-middle" />
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel mt-auto shrink-0 rounded-xl p-4">
        <div className="mb-2 flex items-center gap-3">
          <Icon name="analysis" className="h-5 w-5 text-primary-fixed" />
          <span className="font-display text-label-sm text-on-surface">Analysis active</span>
        </div>
        <p className="font-display text-label-sm leading-relaxed text-on-surface-variant">
          Tone, clarity, and problem-solving methodology are graded at the end of the session.
        </p>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Session header */}
      <header className="fixed top-0 z-50 flex h-20 w-full items-center justify-between border-b border-white/5 bg-background/80 px-5 backdrop-blur-md md:px-16">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={endEarly}
            aria-label="End session"
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-white/5 hover:text-primary-fixed"
          >
            <Icon name="close" />
          </button>
          <span className="font-display text-headline-md font-bold tracking-tight text-primary-fixed">
            AI Interviewer
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setTranscriptOpen((v) => !v)}
            className="glass-panel flex items-center gap-2 rounded-full px-4 py-2 font-display text-label-sm text-on-surface transition-colors hover:bg-white/10 lg:hidden"
          >
            <Icon name="chat" className="h-4 w-4" />
            Transcript
          </button>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-surface-container-high px-4 py-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-error" />
            <span className="font-display text-label-sm text-on-surface">
              {formatClock(elapsed)} REC
            </span>
          </div>
        </div>
      </header>

      <main className="flex h-screen w-full pt-20">
        {/* Sidebar */}
        <aside className="hidden h-full w-80 flex-col gap-8 overflow-y-auto border-r border-white/5 bg-surface-container-low/50 p-8 backdrop-blur-xl lg:flex">
          {sidebar}
        </aside>

        {/* Mobile transcript drawer */}
        {transcriptOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setTranscriptOpen(false)}
              aria-hidden="true"
            />
            <aside className="relative ml-auto flex h-full w-[85%] max-w-sm flex-col gap-8 overflow-y-auto border-l border-white/5 bg-surface-container p-6 pt-24 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setTranscriptOpen(false)}
                aria-label="Close transcript"
                className="absolute right-4 top-24 flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-white/5"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
              {sidebar}
            </aside>
          </div>
        )}

        {/* Central interaction zone */}
        {/*
          The scroll container must not centre its children: with
          `justify-center`, overflow spills off both ends and the top of a long
          question becomes unreachable. Centring happens on the inner wrapper
          via `my-auto` + `min-h-full` instead.
        */}
        <section className="scroll-slim relative flex flex-1 flex-col overflow-y-auto px-5 py-8 md:px-16">
          <div className="pointer-events-none fixed inset-0 flex items-center justify-center opacity-[0.07]">
            <div className="h-[560px] w-[560px] rounded-full bg-primary-fixed blur-[150px]" />
          </div>

          <div className="relative my-auto flex w-full flex-col items-center">
          {/* Current question */}
          <div className="z-10 mb-10 max-w-3xl text-center">
            <div className="badge mx-auto mb-6 w-fit">
              <Icon name="chat" className="h-4 w-4" />
              {asked > 0 ? `Question ${asked} of ${totalTurns}` : 'Connecting…'}
            </div>
            <h1 className="mx-auto mb-4 max-w-2xl font-display text-body-lg font-semibold leading-relaxed text-on-surface md:text-headline-md">
              {currentQuestion || 'Establishing secure connection…'}
            </h1>
            <button
              type="button"
              onClick={repeatQuestion}
              disabled={phase !== 'listening' || !currentQuestion}
              className="mx-auto flex items-center gap-2 font-display text-label-md text-on-surface-variant transition-colors hover:text-primary-fixed disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="replay" className="h-4 w-4" />
              Repeat question
            </button>
          </div>

          {/* Visualizer */}
          <div className="relative z-10 mb-10 flex h-56 w-56 items-center justify-center">
            {phase === 'speaking' && (
              <>
                <div className="pulse-ring absolute inset-0 rounded-full border border-primary-fixed/30" />
                <div
                  className="pulse-ring absolute inset-0 rounded-full border border-primary-fixed/20"
                  style={{ animationDelay: '-0.5s' }}
                />
              </>
            )}
            <div
              ref={orbRef}
              className={`relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary-fixed to-surface-tint transition-shadow duration-500 ${
                phase === 'speaking' ? 'ai-glow' : 'glow-accent'
              }`}
            >
              <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-30">
                {ORB_BARS.map((h, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-black transition-transform duration-100 ease-out"
                    style={{
                      height: `${h}px`,
                      transform:
                        phase === 'speaking' ? 'scaleY(var(--amp, 1))' : 'scaleY(0.55)',
                      transitionDelay: `${i * 15}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Turn failed — recoverable, transcript intact */}
          {phase === 'error' && (
            <div className="animate-fade-in-up z-10 mb-8 w-full max-w-xl rounded-2xl border border-error/30 bg-error-container/25 p-5 text-center">
              <p className="font-display text-label-md text-error">{turnError}</p>
              <p className="mt-1 text-body-md text-on-surface-variant">
                Your answers are safe — retry to continue from here.
              </p>
              <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={retryTurn}
                  className="btn-accent flex items-center justify-center gap-2 px-5 py-2.5 font-display text-label-md"
                >
                  <Icon name="replay" className="h-4 w-4" />
                  Retry
                </button>
                <button
                  type="button"
                  onClick={endEarly}
                  className="btn-ghost px-5 py-2.5 font-display text-label-md"
                >
                  End &amp; grade what I have
                </button>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="z-10 flex flex-col items-center gap-6">
            <p
              className={`font-display text-label-md ${
                phase === 'listening'
                  ? 'animate-pulse text-primary-fixed'
                  : 'text-on-surface-variant'
              }`}
            >
              {phaseLabel}
            </p>

            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setTyping((v) => !v)}
                aria-label="Type answer instead"
                className={`glass-panel flex h-14 w-14 items-center justify-center rounded-full transition-all hover:bg-white/10 ${
                  showComposer ? 'text-primary-fixed' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Icon name="keyboard" />
              </button>

              <button
                type="button"
                onClick={handleMicClick}
                disabled={!sttSupported || (phase !== 'listening' && phase !== 'speaking')}
                title={micLabel}
                aria-label={micLabel}
                className={`flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                  isMicActive || phase === 'speaking'
                    ? 'border-error bg-error/10 text-error shadow-[0_0_30px_rgba(255,180,171,0.2)]'
                    : 'border-primary-fixed bg-surface-container-lowest text-primary-fixed shadow-[0_0_30px_rgba(185,246,0,0.15)] hover:bg-primary-fixed/10'
                }`}
              >
                <Icon
                  name={phase === 'speaking' ? 'stop' : isMicActive ? 'stop' : 'mic'}
                  className="h-8 w-8"
                />
              </button>

              <button
                type="button"
                onClick={endEarly}
                aria-label="End session"
                title="End session"
                className="flex h-14 w-14 items-center justify-center rounded-full border border-error/30 bg-error/10 text-error transition-all hover:border-error/60 hover:bg-error/20 hover:shadow-[0_0_20px_rgba(255,180,171,0.2)]"
              >
                <Icon name="call-end" className="h-6 w-6" />
              </button>
            </div>

            {micError ? (
              <p className="flex max-w-md items-start gap-2 rounded-xl border border-error/30 bg-error-container/30 px-4 py-3 text-center font-display text-label-sm text-error">
                {micError}
              </p>
            ) : (
              <p className="max-w-md text-center font-display text-label-sm text-on-surface-variant/60">
                {!sttSupported
                  ? 'Speech recognition isn’t supported in this browser — type your answer below.'
                  : isMicActive
                    ? 'Speak your answer, then tap the mic again to send it.'
                    : phase === 'listening'
                      ? 'Tap the mic to answer, or use the keyboard to type.'
                      : ''}
              </p>
            )}
          </div>

          {/* Live spoken draft — the send affordance for voice answers */}
          {!showComposer && combinedDraft.trim() && (
            <div className="animate-fade-in-up z-10 mt-8 w-full max-w-2xl">
              <div className="glass-panel rounded-2xl p-4">
                <div className="mb-2 font-display text-label-sm uppercase tracking-widest text-primary-fixed/70">
                  Your answer
                </div>
                <p className="max-h-40 overflow-y-auto text-body-md leading-relaxed text-on-surface">
                  {combinedDraft}
                  {isMicActive && (
                    <span className="ml-1.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary-fixed align-middle" />
                  )}
                </p>
                <div className="mt-3 flex items-center justify-between gap-4 border-t border-white/5 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      committedRef.current = '';
                      interimRef.current = '';
                      setCommittedText('');
                      setInterimText('');
                    }}
                    className="font-display text-label-sm text-on-surface-variant transition-colors hover:text-error"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={submitAnswer}
                    disabled={phase !== 'listening'}
                    className="btn-accent flex items-center gap-2 px-5 py-2 font-display text-label-md"
                  >
                    <Icon name="send" className="h-4 w-4" />
                    Send answer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Composer */}
          {showComposer && (
            <div className="animate-fade-in-up z-10 mt-8 w-full max-w-2xl">
              <div className="glass-panel rounded-2xl p-4">
                <textarea
                  className="w-full resize-none bg-transparent p-2 text-body-md leading-relaxed text-on-surface outline-none placeholder:text-on-surface-variant/40"
                  rows={3}
                  value={committedText}
                  placeholder={
                    phase !== 'listening'
                      ? 'Waiting for the interviewer…'
                      : 'Type your response, or use the mic to speak…'
                  }
                  onChange={(e) => setCommittedText(e.target.value)}
                  disabled={phase !== 'listening'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitAnswer();
                    }
                  }}
                />
                <div className="mt-2 flex items-center justify-between gap-4 border-t border-white/5 pt-3">
                  <span className="font-display text-label-sm text-on-surface-variant/60">
                    {isMicActive ? 'Listening…' : 'Press Enter to send'}
                  </span>
                  <button
                    type="button"
                    onClick={submitAnswer}
                    disabled={phase !== 'listening' || !combinedDraft.trim()}
                    className="btn-accent flex items-center gap-2 px-5 py-2 font-display text-label-md"
                  >
                    <Icon name="send" className="h-4 w-4" />
                    Send answer
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>
        </section>
      </main>
    </div>
  );
}
