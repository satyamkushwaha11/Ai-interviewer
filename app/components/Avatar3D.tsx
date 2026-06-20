'use client';

import { useEffect, useState } from 'react';
import type { Gender } from '@/app/lib/types';
import { DotLottieReact, type DotLottie } from '@lottiefiles/dotlottie-react';

interface Props {
  gender: Gender;
  amplitudeRef: React.MutableRefObject<number>;
  speaking: boolean;
}

export default function Avatar3D({ speaking }: Props) {
  const [mounted, setMounted] = useState(false);
  const [dotLottie, setDotLottie] = useState<DotLottie | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (dotLottie) {
      if (speaking) {
        dotLottie.play();
      } else {
        dotLottie.pause();
      }
    }
  }, [speaking, dotLottie]);

  const dotLottieRefCallback = (lottie: DotLottie) => {
    setDotLottie(lottie);
  };

  return (
    <div className="w-full aspect-square bg-zinc-950/50 rounded-2xl border border-white/10 relative overflow-hidden shadow-2xl flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent pointer-events-none z-10" />
      
      {mounted && (
        <div className="w-full h-full z-0 flex items-center justify-center bg-zinc-900/50">
          <DotLottieReact
            src="https://assets-v2.lottiefiles.com/a/03898126-a47c-11ef-b019-23eb60b6d8b0/Kx2hPa32Hg.lottie"
            loop
            autoplay={speaking}
            dotLottieRefCallback={dotLottieRefCallback}
            className={`w-[150%] h-[150%] scale-[1.5] sm:scale-[1.7] transform origin-center transition-all duration-300 ${speaking ? 'opacity-100' : 'opacity-70'}`}
          />
        </div>
      )}
      
      {/* Overlay Tech Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
      
      <div className="absolute bottom-4 right-4 z-20 text-[10px] font-mono tracking-widest text-zinc-500 uppercase flex flex-col items-end">
        <span>INTERVIEWER</span>
        <span className={speaking ? 'text-emerald-400' : 'text-zinc-500'}>
          {speaking ? 'SPEAKING' : 'LISTENING'}
        </span>
      </div>
    </div>
  );
}
