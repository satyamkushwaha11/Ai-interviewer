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
  
  // STT State
  const [committedText, setCommittedText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [sttSupported, setSttSupported] = useState(true);
  const [isMicActive, setIsMicActive] = useState(false);

  const recognitionRef = useRef<unknown>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioGraphRef = useRef<AudioGraph | null>(null);
  const amplitudeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const historyRef = useRef<TurnMessage[]>(history);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => { historyRef.current = history; }, [history]);
  
  const initialFetchDone = useRef(false);
  const shouldListenRef = useRef(false);

  // Auto-scroll to bottom of chat
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
          body: JSON.stringify({ text, gender: config.gender, difficulty: config.difficulty }),
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
        // Fallback to browser TTS if API fails
        await new Promise<void>((resolve) => {
          if (!('speechSynthesis' in window)) {
            resolve();
            return;
          }
          window.speechSynthesis.cancel(); // Cancel any previous speech
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          const voices = window.speechSynthesis.getVoices();
          const isFemale = config.gender === 'female';
          const voice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes(isFemale ? 'female' : 'male')) || voices.find(v => v.lang.startsWith('en')) || voices[0];
          if (voice) utterance.voice = voice;
          
          let fakeSyncRaf: number;
          const fakeSyncLoop = () => {
            if (window.speechSynthesis.speaking) {
              amplitudeRef.current = 0.3 + Math.random() * 0.4;
              fakeSyncRaf = requestAnimationFrame(fakeSyncLoop);
            } else {
              amplitudeRef.current = 0;
            }
          };
          
          utterance.onstart = () => fakeSyncLoop();
          utterance.onend = () => {
            cancelAnimationFrame(fakeSyncRaf);
            amplitudeRef.current = 0;
            resolve();
          };
          utterance.onerror = () => {
            cancelAnimationFrame(fakeSyncRaf);
            amplitudeRef.current = 0;
            resolve();
          };
          
          window.speechSynthesis.speak(utterance);
        });
      }
    },
    [config.gender, config.difficulty],
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
      setTimeout(() => setSttSupported(false), 0);
      return;
    }
    const rec = new (SR as new () => unknown)() as {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: (() => void) | null;
      onstart: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    };
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    
    rec.onstart = () => setIsMicActive(true);
    rec.onend = () => {
      setIsMicActive(false);
      // When the session ends natively, commit the interim text
      setCommittedText(prev => prev + (prev && interimText ? ' ' : '') + interimText);
      setInterimText('');
      
      if (shouldListenRef.current) {
        try {
          rec.start();
        } catch {}
      }
    };
    
    rec.onresult = (event) => {
      let sessionText = '';
      for (let i = 0; i < event.results.length; i++) {
        sessionText += event.results[i][0].transcript;
      }
      setInterimText(sessionText);
    };
    rec.onerror = () => {};
    recognitionRef.current = rec;
  }, [interimText]);

  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    fetchNext([]);
    return () => {
      try {
        (recognitionRef.current as { stop?: () => void } | null)?.stop?.();
      } catch {}
      audioRef.current?.pause();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      audioGraphRef.current?.ctx.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startListening = () => {
    shouldListenRef.current = true;
    try {
      (recognitionRef.current as { start: () => void } | null)?.start();
    } catch {}
  };

  const stopListening = () => {
    shouldListenRef.current = false;
    try {
      (recognitionRef.current as { stop: () => void } | null)?.stop();
    } catch {}
  };

  const submitAnswer = async () => {
    stopListening();
    const finalAnswer = (committedText + (committedText && interimText ? ' ' : '') + interimText).trim();
    if (!finalAnswer) return;
    const updated: TurnMessage[] = [
      ...historyRef.current,
      { role: 'candidate', content: finalAnswer },
    ];
    setHistory(updated);
    setCommittedText('');
    setInterimText('');
    await fetchNext(updated);
  };

  const endEarly = () => {
    stopListening();
    audioRef.current?.pause();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    onFinish(historyRef.current);
  };

  const phaseLabel = {
    loading: 'Initializing SYS.CORE',
    thinking: 'Processing Context',
    speaking: 'Transmitting',
    listening: 'Awaiting Input',
    done: 'Session Terminated',
  }[phase];

  const phaseDotColor = phase === 'listening' ? 'bg-emerald-400' : phase === 'speaking' ? 'bg-indigo-400' : 'bg-zinc-500';

  const combinedDraft = committedText + (committedText && interimText ? ' ' : '') + interimText;

  return (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row h-[85vh] relative bg-zinc-950 border border-zinc-800/60 rounded-xl overflow-hidden shadow-2xl">
      
      {/* Left Column: Mascot & Status */}
      <div className="w-full md:w-[35%] lg:w-[30%] border-b md:border-b-0 md:border-r border-zinc-800/60 bg-zinc-900/30 flex flex-col items-center justify-center p-8 relative shrink-0">
        <button
          type="button"
          onClick={endEarly}
          className="absolute top-4 left-4 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-rose-400 transition-colors px-3 py-1 border border-transparent hover:border-rose-900/50 hover:bg-rose-950/30 rounded"
        >
          End Session
        </button>

        <div className="w-40 h-40 sm:w-56 sm:h-56 mb-8 relative">
          <div className={`absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl transition-opacity duration-500 ${phase === 'speaking' ? 'opacity-100' : 'opacity-0'}`} />
          <Avatar3D
            gender={config.gender}
            amplitudeRef={amplitudeRef}
            speaking={phase === 'speaking'}
          />
        </div>
        
        <div className="text-center z-10">
          <div className="text-base font-bold text-zinc-100 tracking-wide mb-3">
            {config.role ? `System: ${config.role}` : 'System: AI Interviewer'}
          </div>
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-950/50 px-4 py-2 rounded-full border border-zinc-800/80">
            <span className={`w-2 h-2 rounded-full shadow-lg ${phaseDotColor} ${phase === 'thinking' ? 'animate-pulse' : ''}`} />
            {phaseLabel}
          </div>
        </div>
      </div>

      {/* Right Column: Chat Interface */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-zinc-950 to-zinc-900/50">
        
        {/* Chat Feed */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {history.length === 0 && (
            <div className="flex items-center justify-center h-full text-zinc-600 font-mono text-sm tracking-widest uppercase">
              [ Establishing Secure Connection ]
            </div>
          )}
          {history.map((m, i) => (
            <div key={i} className={`flex w-full ${m.role === 'interviewer' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-md ${
                m.role === 'interviewer' 
                  ? 'bg-zinc-900 border border-zinc-800/80 text-zinc-300' 
                  : 'bg-indigo-950/40 border border-indigo-900/50 text-indigo-100'
              }`}>
                <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${
                  m.role === 'interviewer' ? 'text-zinc-500' : 'text-indigo-400'
                }`}>
                  {m.role === 'interviewer' ? 'Interviewer' : 'You'}
                </div>
                <div className="text-sm leading-relaxed font-medium">
                  {m.content}
                </div>
              </div>
            </div>
          ))}
          {/* Current typing draft indicator */}
          {phase === 'listening' && combinedDraft && (
            <div className="flex w-full justify-end animate-fade-in-up">
              <div className="max-w-[85%] rounded-2xl px-5 py-4 bg-indigo-950/20 border border-indigo-900/30 text-indigo-200/70 shadow-md">
                <div className="text-[10px] font-bold uppercase tracking-widest mb-2 text-indigo-500/50">
                  Drafting
                </div>
                <div className="text-sm leading-relaxed font-medium">
                  {combinedDraft}
                  <span className="inline-block w-1.5 h-4 ml-1.5 bg-indigo-400/80 animate-pulse align-middle rounded-sm" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="flex-none p-4 bg-zinc-900/80 border-t border-zinc-800 backdrop-blur-md">
          <div className="relative flex flex-col gap-3">
            <textarea
              className="w-full bg-zinc-950 border border-zinc-800/80 p-4 pr-12 text-sm leading-relaxed text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none rounded-xl transition-all shadow-inner"
              rows={2}
              value={committedText}
              placeholder={
                phase !== 'listening' ? 'Awaiting system...' :
                sttSupported ? 'Type your response, or enable mic to speak...' : 'Type your response...'
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
            
            <div className="absolute right-4 top-4 flex items-center gap-2">
              {sttSupported && phase === 'listening' && (
                <button
                  type="button"
                  onClick={isMicActive ? stopListening : startListening}
                  className={`p-2 rounded-lg transition-all ${
                    isMicActive 
                      ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.3)]' 
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}
                  title={isMicActive ? "Stop Recording" : "Start Recording"}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {isMicActive ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    )}
                  </svg>
                </button>
              )}
            </div>

            <div className="flex justify-between items-center px-1">
              <div className="text-[10px] text-zinc-500 font-medium">
                {isMicActive ? 'Listening...' : 'Press Enter to transmit'}
              </div>
              <button
                type="button"
                onClick={submitAnswer}
                disabled={phase !== 'listening' || !combinedDraft.trim()}
                className="btn-primary px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-indigo-500/20 disabled:shadow-none disabled:opacity-50"
              >
                Transmit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
