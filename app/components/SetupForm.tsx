'use client';

import { useState } from 'react';
import Icon from './Icon';
import type { Difficulty, Gender, InterviewConfig, InterviewFocus, InterviewMode } from '@/app/lib/types';

interface Props {
  onStart: (config: InterviewConfig) => void;
}

const DIFFICULTIES: { value: Difficulty; label: string; hint: string }[] = [
  { value: 'easy', label: 'Easy', hint: 'Warm + encouraging' },
  { value: 'medium', label: 'Medium', hint: 'Balanced probing' },
  { value: 'hard', label: 'Hard', hint: 'Senior-level depth' },
  { value: 'brutal', label: 'Brutal', hint: 'Top-tier, unforgiving' },
];

const FOCUSES: { value: InterviewFocus; label: string; hint: string }[] = [
  { value: 'mixed', label: 'Mixed', hint: 'Technical + behavioral' },
  { value: 'technical', label: 'Technical', hint: 'Tech depth + design' },
  { value: 'behavioral', label: 'Behavioral', hint: 'Experience + STAR' },
];

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const ACCEPT = `application/pdf,${DOCX_MIME},.pdf,.docx`;

/** Browsers are inconsistent about MIME types, so fall back to the extension. */
function isSupportedResume(file: File) {
  const name = file.name.toLowerCase();
  return (
    file.type === 'application/pdf' ||
    file.type === DOCX_MIME ||
    name.endsWith('.pdf') ||
    name.endsWith('.docx')
  );
}

const SELECT_ARROW =
  "bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%23c3caac%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')]";

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <label className="label-bar flex items-center gap-2 font-display text-label-md text-on-surface">
        {children}
      </label>
      {hint}
    </div>
  );
}

export default function SetupForm({ onStart }: Props) {
  const [mode, setMode] = useState<InterviewMode>('targeted');
  const [resume, setResume] = useState('');
  const [jd, setJd] = useState('');
  const [role, setRole] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [focus, setFocus] = useState<InterviewFocus>('mixed');
  const [durationMin, setDurationMin] = useState(15);
  const [gender, setGender] = useState<Gender>('female');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);

  async function handleResumeFile(file: File) {
    setParsing(true);
    setError('');
    setFileName(file.name);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/parse-resume', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to read that file');
      setResume(data.text);
    } catch (e) {
      setFileName('');
      setError((e as Error).message);
    } finally {
      setParsing(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!isSupportedResume(file)) {
      setError('Only PDF and DOCX resumes are supported.');
      return;
    }
    handleResumeFile(file);
  }

  const canStart = resume.trim().length > 50 && (mode === 'general' || jd.trim().length > 20);

  function start() {
    onStart({
      mode,
      resume: resume.trim(),
      jd: mode === 'targeted' ? jd.trim() : undefined,
      role: role.trim() || undefined,
      difficulty,
      focus,
      durationMin,
      gender,
    });
  }

  return (
    <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/5 bg-surface-container/60 p-5 shadow-2xl backdrop-blur-2xl md:p-8">
      <div className="tech-grid pointer-events-none absolute inset-0" />

      <div className="relative flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col items-center gap-2 text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-surface-container-high">
            <Icon name="sliders" className="h-6 w-6 text-primary-fixed" />
          </div>
          <h2 className="font-display text-headline-lg-mobile text-on-surface md:text-headline-lg">
            Configure interview context
          </h2>
          <p className="max-w-lg text-body-md text-on-surface-variant">
            Provide your background and the target role parameters. The interviewer calibrates
            intensity and domain specificity accordingly.
          </p>
        </header>

        {/* Mode */}
        <section className="flex flex-col gap-2">
          <FieldLabel>Session mode</FieldLabel>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('targeted')}
              className={`pill p-5 text-left ${mode === 'targeted' ? 'pill-active' : ''}`}
            >
              <div className="font-display text-label-md font-semibold">Targeted</div>
              <div className="mt-1.5 text-label-sm leading-relaxed opacity-70">
                Resume + job description
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMode('general')}
              className={`pill p-5 text-left ${mode === 'general' ? 'pill-active' : ''}`}
            >
              <div className="font-display text-label-md font-semibold">General</div>
              <div className="mt-1.5 text-label-sm leading-relaxed opacity-70">
                Based on background only
              </div>
            </button>
          </div>
        </section>

        {/* Resume */}
        <section className="flex flex-col gap-2">
          <FieldLabel
            hint={
              <span className="font-display text-label-sm text-on-surface-variant/60">
                PDF or DOCX
              </span>
            }
          >
            Candidate profile
          </FieldLabel>

          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`group relative flex h-40 cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-dashed bg-surface transition-all duration-300 ${
              dragging
                ? 'border-primary-fixed bg-surface-container-high/70'
                : 'border-outline-variant hover:border-primary-fixed/50 hover:bg-surface-container-high/50'
            }`}
          >
            <input
              type="file"
              accept={ACCEPT}
              aria-label="Upload resume (PDF or DOCX)"
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              onChange={(e) => e.target.files?.[0] && handleResumeFile(e.target.files[0])}
              disabled={parsing}
            />
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high transition-colors group-hover:bg-primary-fixed/20">
              <Icon
                name="upload"
                className="h-5 w-5 text-on-surface-variant transition-colors group-hover:text-primary-fixed"
              />
            </div>
            <div className="pointer-events-none px-4 text-center">
              {parsing ? (
                <>
                  <p className="font-display text-label-md text-primary-fixed">Reading {fileName}…</p>
                  <p className="mt-1 font-display text-label-sm text-on-surface-variant">
                    Extracting text from your document
                  </p>
                </>
              ) : fileName ? (
                <>
                  <p className="font-display text-label-md text-primary-fixed">{fileName}</p>
                  <p className="mt-1 font-display text-label-sm text-on-surface-variant">
                    Ready for analysis — click to replace
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-label-md text-on-surface transition-colors group-hover:text-primary-fixed">
                    Drag &amp; drop your resume here
                  </p>
                  <p className="mt-1 font-display text-label-sm text-on-surface-variant">
                    or click to browse local files
                  </p>
                </>
              )}
            </div>
            <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-primary-fixed opacity-50 transition-all duration-700 ease-out group-hover:w-full" />
          </div>

          {resume.trim().length > 0 && resume.trim().length <= 50 && (
            <p className="font-display text-label-sm text-error">
              Only {resume.trim().length} characters were extracted — this file may be
              image-based. Try a text-based PDF or DOCX export.
            </p>
          )}

          {/* Extracted text, so you can confirm the parse before starting */}
          {resume.trim().length > 0 && (
            <div className="animate-fade-in-up mt-1 overflow-hidden rounded-2xl border border-white/5 bg-surface-container-low">
              <button
                type="button"
                onClick={() => setPreviewOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-white/5"
              >
                <span className="flex items-center gap-2 font-display text-label-md text-primary-fixed">
                  <Icon name="check-circle" className="h-4 w-4" />
                  Extracted text
                  <span className="text-on-surface-variant/60">
                    · {resume.trim().length.toLocaleString()} characters
                  </span>
                </span>
                <span className="font-display text-label-sm text-on-surface-variant">
                  {previewOpen ? 'Hide' : 'Show'}
                </span>
              </button>
              {previewOpen && (
                <pre className="scroll-slim max-h-64 overflow-y-auto whitespace-pre-wrap border-t border-white/5 px-4 py-3 font-body text-body-md leading-relaxed text-on-surface-variant">
                  {resume}
                </pre>
              )}
            </div>
          )}
        </section>

        {/* Job description */}
        {mode === 'targeted' && (
          <section className="animate-fade-in-up flex flex-col gap-2">
            <FieldLabel>Target job description</FieldLabel>
            <textarea
              className="field w-full resize-none p-4 text-body-md leading-relaxed"
              rows={6}
              placeholder="Paste the full job description, requirements, and responsibilities here. The interviewer analyses key skills and generates targeted technical and behavioural questions…"
              value={jd}
              onChange={(e) => setJd(e.target.value)}
            />
          </section>
        )}

        {/* Role + duration */}
        <section className="grid gap-6 rounded-2xl border border-white/5 bg-surface-container-low p-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <FieldLabel
              hint={
                <span className="font-display text-label-sm uppercase tracking-widest text-on-surface-variant/60">
                  Optional
                </span>
              }
            >
              Target role
            </FieldLabel>
            <input
              className="field w-full px-4 py-3 text-body-md"
              placeholder="e.g. Senior Software Engineer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel>Duration</FieldLabel>
            <select
              className={`field w-full appearance-none bg-no-repeat px-4 py-3 text-body-md bg-[position:right_12px_center] ${SELECT_ARROW}`}
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

        {/* Rigor */}
        <section className="flex flex-col gap-2">
          <FieldLabel>Rigor</FieldLabel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDifficulty(d.value)}
                className={`pill p-4 text-center sm:text-left ${
                  difficulty === d.value ? 'pill-active' : ''
                }`}
              >
                <div className="font-display text-label-md font-semibold">{d.label}</div>
                <div className="mt-1 hidden text-[11px] leading-relaxed opacity-70 sm:block">
                  {d.hint}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Focus */}
        <section className="flex flex-col gap-2">
          <FieldLabel>Interview focus</FieldLabel>
          <div className="grid grid-cols-3 gap-3">
            {FOCUSES.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFocus(f.value)}
                className={`pill p-4 text-center sm:text-left ${focus === f.value ? 'pill-active' : ''}`}
              >
                <div className="font-display text-label-md font-semibold">{f.label}</div>
                <div className="mt-1 hidden text-[11px] leading-relaxed opacity-70 sm:block">
                  {f.hint}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Voice */}
        <section className="flex flex-col gap-2">
          <FieldLabel>Interviewer voice</FieldLabel>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setGender('female')}
              className={`pill p-4 font-display text-label-md ${gender === 'female' ? 'pill-active' : ''}`}
            >
              Female associate
            </button>
            <button
              type="button"
              onClick={() => setGender('male')}
              className={`pill p-4 font-display text-label-md ${gender === 'male' ? 'pill-active' : ''}`}
            >
              Male associate
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-error/30 bg-error-container/30 p-4 text-body-md text-error">
            {error}
          </div>
        )}

        <div className="h-px w-full bg-white/5" />

        <div className="flex justify-end">
          <button
            type="button"
            disabled={!canStart || parsing}
            onClick={start}
            className="btn-accent neon-glow shimmer group relative w-full overflow-hidden px-8 py-4 font-display text-label-md md:w-auto"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Icon name="bot" className="h-5 w-5" />
              {parsing ? 'Reading document…' : 'Generate interview'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
