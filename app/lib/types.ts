export type Difficulty = 'easy' | 'medium' | 'hard' | 'brutal';

export type InterviewMode = 'targeted' | 'general';

export type Gender = 'male' | 'female';

export interface InterviewConfig {
  mode: InterviewMode;
  resume: string;
  jd?: string;
  role?: string;
  difficulty: Difficulty;
  durationMin: number;
  gender: Gender;
  summary?: string;
  targetTurns?: number;
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
