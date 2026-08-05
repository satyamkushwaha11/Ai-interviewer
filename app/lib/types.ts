export type Difficulty = 'easy' | 'medium' | 'hard' | 'brutal';

export type InterviewMode = 'targeted' | 'general';

// What the interviewer should weight: technology depth, past-experience/behavioral, or a blend of both.
export type InterviewFocus = 'mixed' | 'technical' | 'behavioral';

export type Gender = 'male' | 'female';

/** One competency area the interview works through, in order. */
export interface InterviewArea {
  /** Stable slug, e.g. "database". */
  key: string;
  /** Shown to the candidate in the progress rail, e.g. "Database". */
  title: string;
  /** What the interviewer should actually probe in this area. */
  focus: string;
  /** Seed questions for this area. The interviewer adapts rather than reads them out. */
  probes?: string[];
}

/** The ordered agenda for a session, derived from the role and resume. */
export interface InterviewPlan {
  /** e.g. "Fullstack Developer", "AI Engineer", "HR Generalist". */
  roleFamily: string;
  areas: InterviewArea[];
}

export interface InterviewConfig {
  mode: InterviewMode;
  resume: string;
  jd?: string;
  role?: string;
  difficulty: Difficulty;
  focus?: InterviewFocus;
  durationMin: number;
  gender: Gender;
  summary?: string;
  targetTurns?: number;
  plan?: InterviewPlan;
}

export interface TurnMessage {
  role: 'interviewer' | 'candidate';
  content: string;
}

export interface TurnResponse {
  question: string;
  done: boolean;
}

export interface ReportSection {
  score: number;
  notes: string;
}

export interface InterviewReport {
  overall: number;
  summary: string;
  communication: ReportSection;
  knowledge: ReportSection;
  problemSolving: ReportSection;
  roleFit: ReportSection;
  strengths: string[];
  improvements: string[];
  perQuestion: { question: string; answer: string; feedback: string; score: number }[];
}
