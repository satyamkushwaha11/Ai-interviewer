'use client';

import { useState } from 'react';
import type { Difficulty, Gender, InterviewConfig, InterviewMode } from '@/app/lib/types';

interface Props {
  onStart: (config: InterviewConfig) => void;
}

const DIFFICULTIES: { value: Difficulty; label: string; hint: string }[] = [
  { value: 'easy', label: 'Easy', hint: 'Warm + encouraging' },
  { value: 'medium', label: 'Medium', hint: 'Balanced probing' },
  { value: 'hard', label: 'Hard', hint: 'Senior-level depth' },
  { value: 'brutal', label: 'Brutal', hint: 'Top-tier, unforgiving' },
];

export default function SetupForm({ onStart }: Props) {
  const [mode, setMode] = useState<InterviewMode>('targeted');
  const [resume, setResume] = useState('');
  const [jd, setJd] = useState('');
  const [role, setRole] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [durationMin, setDurationMin] = useState(15);
  const [gender, setGender] = useState<Gender>('female');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');

  async function handlePdf(file: File) {
    setParsing(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/parse-resume', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse PDF');
      setResume(data.text);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setParsing(false);
    }
  }

  const canStart = resume.trim().length > 50 && (mode === 'general' || jd.trim().length > 20);

  function start() {
    onStart({
      mode,
      resume: resume.trim(),
      jd: mode === 'targeted' ? jd.trim() : undefined,
      role: role.trim() || undefined,
      difficulty,
      durationMin,
      gender,
    });
  }

  return (
    <div className="max-w-2xl mx-auto card p-6 sm:p-8 space-y-8">
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-zinc-300">Interview mode</h2>
          <span className="text-xs text-zinc-500">Step 1 of 3</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('targeted')}
            className={`pill p-4 text-left ${mode === 'targeted' ? 'pill-active' : ''}`}
          >
            <div className="font-medium text-sm">Targeted</div>
            <div className="text-xs text-zinc-500 mt-1">Resume + job description</div>
          </button>
          <button
            type="button"
            onClick={() => setMode('general')}
            className={`pill p-4 text-left ${mode === 'general' ? 'pill-active' : ''}`}
          >
            <div className="font-medium text-sm">General</div>
            <div className="text-xs text-zinc-500 mt-1">Based on your background</div>
          </button>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-zinc-300">Your resume</h2>
          <label className="text-xs text-violet-400 hover:text-violet-300 cursor-pointer">
            {parsing ? 'Parsing…' : 'Upload PDF'}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handlePdf(e.target.files[0])}
              disabled={parsing}
            />
          </label>
        </div>
        <textarea
          className="input w-full p-3 text-sm leading-relaxed"
          rows={7}
          placeholder={parsing ? 'Parsing your PDF…' : 'Paste resume text, or upload a PDF above.'}
          value={resume}
          onChange={(e) => setResume(e.target.value)}
        />
      </section>

      {mode === 'targeted' && (
        <section>
          <h2 className="text-sm font-medium text-zinc-300 mb-3">Job description</h2>
          <textarea
            className="input w-full p-3 text-sm leading-relaxed"
            rows={5}
            placeholder="Paste the job description you're preparing for."
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
        </section>
      )}

      <section className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Role <span className="text-zinc-500 font-normal">(optional)</span></label>
          <input
            className="input w-full px-3 py-2 text-sm"
            placeholder="Senior Backend Engineer"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Duration</label>
          <select
            className="input w-full px-3 py-2 text-sm"
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
          >
            <option value={5}>5 min · quick</option>
            <option value={15}>15 min · standard</option>
            <option value={30}>30 min · full loop</option>
            <option value={45}>45 min · deep dive</option>
          </select>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-zinc-300 mb-3">Difficulty</h2>
        <div className="grid grid-cols-4 gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDifficulty(d.value)}
              className={`pill p-3 text-left ${difficulty === d.value ? 'pill-active' : ''}`}
            >
              <div className="text-sm font-medium">{d.label}</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">{d.hint}</div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-zinc-300 mb-3">Interviewer voice</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setGender('female')}
            className={`pill p-3 ${gender === 'female' ? 'pill-active' : ''}`}
          >
            Female
          </button>
          <button
            type="button"
            onClick={() => setGender('male')}
            className={`pill p-3 ${gender === 'male' ? 'pill-active' : ''}`}
          >
            Male
          </button>
        </div>
      </section>

      {error && <div className="text-sm text-rose-400">{error}</div>}

      <button
        type="button"
        disabled={!canStart || parsing}
        onClick={start}
        className="btn-primary w-full py-3 text-sm"
      >
        Start interview →
      </button>
    </div>
  );
}
