'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Avatar3D from './Avatar3D';
import type { InterviewConfig, TurnMessage } from '@/app/lib/types';

interface Props {
  config: InterviewConfig;
  onFinish: (history: TurnMessage[]) => void;
}

type Phase = 'loading' | 'speaking' | 'listening' | 'thinking' | 'done';

interface AudioGraph {
  ctx: AudioContext;
  analyser: AnalyserNode;
  buffer: Uint8Array<ArrayBuffer>;
}

export default function Interview({ config, onFinish }: Props) {
  const [history, setHistory] = useState<TurnMessage[]>([]);
  const [phase, setPhase] = useState<Phase>('loading');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [liveAnswer, setLiveAnswer] = useState('');
  const [sttSupported, setSttSupported] = useState(true);

  const recognitionRef = useRef<unknown>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioGraphRef = useRef<AudioGraph | null>(null);
  const amplitudeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const historyRef = useRef<TurnMessage[]>([]);
  historyRef.current = history;

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
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const playTts = useCallback(
    async (text: string) => {
      setPhase('speaking');
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, gender: config.gender }),
        });
        if (!res.ok) throw new Error('TTS failed');
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
        // silent — user can still read the question
      }
    },
    [config.gender],
  );

  const fetchNext = useCallback(
    async (updated: TurnMessage[]) => {
      setPhase('thinking');
      const res = await fetch('/api/interview-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, history: updated }),
      });
      const data = (await res.json()) as { question: string; done: boolean };
      const nextHistory = [
        ...updated,
        { role: 'interviewer' as const, content: data.question },
      ];
      setHistory(nextHistory);
      setCurrentQuestion(data.question);
      await playTts(data.question);
      if (data.done) {
        setPhase('done');
        onFinish(nextHistory);
      } else {
        setPhase('listening');
      }
    },
    [config, onFinish, playTts],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!SR) {
      setSttSupported(false);
      return;
    }
    const rec = new (SR as new () => unknown)() as {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: (() => void) | null;
      start: () => void;
      stop: () => void;
    };
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (event) => {
      let finalText = '';
      for (let i = 0; i < event.results.length; i++) {
        finalText += event.results[i][0].transcript;
      }
      setLiveAnswer(finalText.trim());
    };
    rec.onerror = () => {};
    recognitionRef.current = rec;
  }, []);

  useEffect(() => {
    fetchNext([]);
    return () => {
      try {
        (recognitionRef.current as { stop?: () => void } | null)?.stop?.();
      } catch {}
      audioRef.current?.pause();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      audioGraphRef.current?.ctx.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startListening = () => {
    setLiveAnswer('');
    try {
      (recognitionRef.current as { start: () => void } | null)?.start();
    } catch {}
  };

  const stopListening = () => {
    try {
      (recognitionRef.current as { stop: () => void } | null)?.stop();
    } catch {}
  };

  const submitAnswer = async () => {
    stopListening();
    const answer = liveAnswer.trim();
    if (!answer) return;
    const updated: TurnMessage[] = [
      ...historyRef.current,
      { role: 'candidate', content: answer },
    ];
    setHistory(updated);
    setLiveAnswer('');
    await fetchNext(updated);
  };

  const endEarly = () => {
    stopListening();
    audioRef.current?.pause();
    onFinish(historyRef.current);
  };

  const phaseLabel = {
    loading: 'Preparing',
    thinking: 'Thinking',
    speaking: 'Speaking',
    listening: 'Your turn',
    done: 'Complete',
  }[phase];

  const phaseDotColor = phase === 'listening' ? 'bg-emerald-400' : phase === 'speaking' ? 'bg-violet-400' : 'bg-zinc-500';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-6 items-start">
        <div className="w-full max-w-[16rem] mx-auto md:mx-0">
          <Avatar3D
            gender={config.gender}
            amplitudeRef={amplitudeRef}
            speaking={phase === 'speaking'}
          />
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-zinc-400">
            <span className={`w-1.5 h-1.5 rounded-full ${phaseDotColor} ${phase === 'speaking' || phase === 'listening' ? 'dot-pulse' : ''}`} />
            {phaseLabel}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Question</div>
          <div className="text-lg leading-relaxed text-zinc-100 min-h-[4.5rem]">
            {currentQuestion || <span className="text-zinc-500">…</span>}
          </div>
        </div>
      </div>

      <div className="mt-6 card p-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-zinc-300">Your answer</label>
          <span className="text-xs text-zinc-500">{liveAnswer.length} chars</span>
        </div>
        <textarea
          className="input w-full p-3 text-sm leading-relaxed"
          rows={5}
          value={liveAnswer}
          placeholder={sttSupported ? 'Tap the mic to speak — or type here.' : 'Type your answer (mic not supported in this browser).'}
          onChange={(e) => setLiveAnswer(e.target.value)}
          disabled={phase !== 'listening'}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {sttSupported && (
            <>
              <button
                type="button"
                onClick={startListening}
                disabled={phase !== 'listening'}
                className="btn-secondary px-4 py-2 text-sm flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Start mic
              </button>
              <button
                type="button"
                onClick={stopListening}
                disabled={phase !== 'listening'}
                className="btn-secondary px-4 py-2 text-sm"
              >
                Stop mic
              </button>
            </>
          )}
          <button
            type="button"
            onClick={endEarly}
            className="btn-secondary px-4 py-2 text-sm"
          >
            End interview
          </button>
          <button
            type="button"
            onClick={submitAnswer}
            disabled={phase !== 'listening' || !liveAnswer.trim()}
            className="btn-primary ml-auto px-5 py-2 text-sm"
          >
            Submit →
          </button>
        </div>
      </div>

      <details className="mt-6 card p-4">
        <summary className="cursor-pointer text-sm text-zinc-400 flex items-center gap-2">
          <span>Transcript</span>
          <span className="text-xs text-zinc-600">· {history.length} turn{history.length === 1 ? '' : 's'}</span>
        </summary>
        <div className="mt-3 space-y-3 text-sm">
          {history.map((m, i) => (
            <div key={i} className="flex gap-3">
              <div className={`w-16 shrink-0 text-xs uppercase tracking-wider ${m.role === 'interviewer' ? 'text-violet-400' : 'text-sky-400'}`}>
                {m.role === 'interviewer' ? 'Them' : 'You'}
              </div>
              <div className="text-zinc-300 leading-relaxed">{m.content}</div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
