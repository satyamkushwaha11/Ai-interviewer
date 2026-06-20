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
    <div className="max-w-2xl mx-auto card p-6 sm:p-10 space-y-10">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-zinc-100 tracking-wide">Interview configuration</h2>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-900 px-3 py-1 rounded-md border border-zinc-800">Step 1 of 3</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode('targeted')}
            className={`pill p-5 text-left ${mode === 'targeted' ? 'pill-active' : ''}`}
          >
            <div className="font-semibold text-sm tracking-wide">Targeted</div>
            <div className="text-xs text-zinc-400 mt-1.5 leading-relaxed">Resume + Job description</div>
          </button>
          <button
            type="button"
            onClick={() => setMode('general')}
            className={`pill p-5 text-left ${mode === 'general' ? 'pill-active' : ''}`}
          >
            <div className="font-semibold text-sm tracking-wide">General</div>
            <div className="text-xs text-zinc-400 mt-1.5 leading-relaxed">Based on background only</div>
          </button>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-zinc-100 tracking-wide">Candidate Resume</h2>
          <label className="text-xs font-semibold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 cursor-pointer bg-indigo-950/50 border border-indigo-900/50 hover:bg-indigo-900/50 px-3 py-1.5 rounded-md transition-colors">
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
          className="input w-full p-4 text-sm leading-relaxed"
          rows={7}
          placeholder={parsing ? 'Parsing PDF document...' : 'Paste resume text, or upload a PDF above.'}
          value={resume}
          onChange={(e) => setResume(e.target.value)}
        />
      </section>

      {mode === 'targeted' && (
        <section className="animate-fade-in-up">
          <h2 className="text-base font-semibold text-zinc-100 tracking-wide mb-4">Job Description</h2>
          <textarea
            className="input w-full p-4 text-sm leading-relaxed"
            rows={5}
            placeholder="Paste the target job description."
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
        </section>
      )}

      <section className="grid grid-cols-2 gap-6 p-6 rounded-md bg-zinc-900 border border-zinc-800">
        <div>
          <label className="block text-sm font-semibold text-zinc-100 tracking-wide mb-3">Target Role <span className="text-zinc-500 font-normal text-xs uppercase tracking-wider ml-2">Optional</span></label>
          <input
            className="input w-full px-4 py-3 text-sm"
            placeholder="e.g. Senior Software Engineer"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-zinc-100 tracking-wide mb-3">Duration</label>
          <select
            className="input w-full px-4 py-3 text-sm appearance-none bg-no-repeat bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%2371717A%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center]"
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
          >
            <option value={5}>5 min · Screener</option>
            <option value={15}>15 min · Standard</option>
            <option value={30}>30 min · Full loop</option>
            <option value={45}>45 min · Deep dive</option>
          </select>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-100 tracking-wide mb-4">Rigor</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDifficulty(d.value)}
              className={`pill p-4 text-center sm:text-left ${difficulty === d.value ? 'pill-active' : ''}`}
            >
              <div className="text-sm font-semibold tracking-wide">{d.label}</div>
              <div className="text-[11px] text-zinc-400 mt-1 leading-relaxed hidden sm:block">{d.hint}</div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-100 tracking-wide mb-4">Interviewer Voice</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setGender('female')}
            className={`pill p-4 font-medium tracking-wide ${gender === 'female' ? 'pill-active' : ''}`}
          >
            Female Associate
          </button>
          <button
            type="button"
            onClick={() => setGender('male')}
            className={`pill p-4 font-medium tracking-wide ${gender === 'male' ? 'pill-active' : ''}`}
          >
            Male Associate
          </button>
        </div>
      </section>

      {error && <div className="text-sm font-medium text-red-400 bg-red-950/50 border border-red-900/50 rounded-md p-4">{error}</div>}

      <div className="pt-4 border-t border-zinc-800">
        <button
          type="button"
          disabled={!canStart || parsing}
          onClick={start}
          className="btn-primary w-full py-4 text-base font-semibold tracking-wide flex items-center justify-center gap-2"
        >
          {parsing ? 'Parsing PDF...' : 'Initialize Session'}
        </button>
      </div>
    </div>
  );
}
