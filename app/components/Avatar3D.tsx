'use client';

import { useGLTF } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useRef, type MutableRefObject } from 'react';
import type { Mesh, Object3D } from 'three';
import type { Gender } from '@/app/lib/types';

interface Props {
  gender: Gender;
  amplitudeRef: MutableRefObject<number>;
  speaking: boolean;
}

function ProceduralHead({ gender, amplitudeRef, speaking }: Props) {
  const headRef = useRef<Mesh>(null);
  const mouthRef = useRef<Mesh>(null);
  const lEyeLid = useRef<Mesh>(null);
  const rEyeLid = useRef<Mesh>(null);
  const blinkTimerRef = useRef(0);

  const skin = gender === 'female' ? '#f5c4a8' : '#e0a586';
  const hair = gender === 'female' ? '#3a2418' : '#1a1208';

  useFrame((_, delta) => {
    if (headRef.current) {
      const t = performance.now() / 1000;
      headRef.current.rotation.y = Math.sin(t * 0.4) * 0.08;
      headRef.current.position.y = 0.02 * Math.sin(t * 1.5);
    }
    if (mouthRef.current) {
      const target = speaking ? Math.min(0.6, amplitudeRef.current * 1.4) : 0;
      const s = mouthRef.current.scale;
      s.y += (0.2 + target * 2.2 - s.y) * 0.4;
      s.x += (1 - (target * 0.2) - s.x) * 0.3;
    }
    blinkTimerRef.current -= delta;
    if (blinkTimerRef.current <= 0) {
      const closed = blinkTimerRef.current > -0.12;
      const sY = closed ? 0.1 : 1;
      if (lEyeLid.current) lEyeLid.current.scale.y = sY;
      if (rEyeLid.current) rEyeLid.current.scale.y = sY;
      if (blinkTimerRef.current < -0.12) blinkTimerRef.current = 3 + Math.random() * 3;
    }
  });

  return (
    <group ref={headRef as unknown as React.Ref<Object3D>}>
      <mesh>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.7, 0.1]} scale={[1.02, 0.55, 1.02]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color={hair} roughness={0.8} />
      </mesh>
      <mesh position={[-0.3, 0.15, 0.82]}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0.3, 0.15, 0.82]}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[-0.3, 0.15, 0.92]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color="#2a1a10" />
      </mesh>
      <mesh position={[0.3, 0.15, 0.92]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color="#2a1a10" />
      </mesh>
      <mesh ref={lEyeLid} position={[-0.3, 0.22, 0.88]} scale={[1, 1, 1]}>
        <sphereGeometry args={[0.13, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh ref={rEyeLid} position={[0.3, 0.22, 0.88]} scale={[1, 1, 1]}>
        <sphereGeometry args={[0.13, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh ref={mouthRef} position={[0, -0.35, 0.82]} scale={[1, 0.2, 1]}>
        <sphereGeometry args={[0.18, 24, 16]} />
        <meshStandardMaterial color="#6b2330" roughness={0.4} />
      </mesh>
    </group>
  );
}

function GlbAvatar({ url, amplitudeRef, speaking }: { url: string; amplitudeRef: MutableRefObject<number>; speaking: boolean }) {
  const { scene } = useGLTF(url);
  const rootRef = useRef<Object3D>(null);

  useFrame(() => {
    if (rootRef.current) {
      const t = performance.now() / 1000;
      rootRef.current.rotation.y = Math.sin(t * 0.4) * 0.08;
    }
    const target = speaking ? Math.min(1, amplitudeRef.current * 1.6) : 0;
    scene.traverse((obj) => {
      const mesh = obj as Mesh & {
        morphTargetDictionary?: Record<string, number>;
        morphTargetInfluences?: number[];
      };
      const dict = mesh.morphTargetDictionary;
      const inf = mesh.morphTargetInfluences;
      if (!dict || !inf) return;
      for (const key of ['jawOpen', 'mouthOpen', 'viseme_aa']) {
        const idx = dict[key];
        if (idx !== undefined) inf[idx] += (target - inf[idx]) * 0.5;
      }
    });
  });

  return <primitive ref={rootRef} object={scene} scale={1.4} position={[0, -1.6, 0]} />;
}

export default function Avatar3D(props: Props) {
  const url =
    props.gender === 'female'
      ? process.env.NEXT_PUBLIC_AVATAR_FEMALE_URL
      : process.env.NEXT_PUBLIC_AVATAR_MALE_URL;

  return (
    <div className="w-full aspect-square rounded-2xl overflow-hidden relative card">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-sky-500/10 pointer-events-none" />
      <Canvas camera={{ position: [0, 0.1, 3], fov: 35 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 3, 4]} intensity={1.0} color="#f5d7ff" />
        <directionalLight position={[-2, 1, 2]} intensity={0.4} color="#a7c4ff" />
        <Suspense fallback={null}>
          {url ? (
            <GlbAvatar url={url} amplitudeRef={props.amplitudeRef} speaking={props.speaking} />
          ) : (
            <ProceduralHead {...props} />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
