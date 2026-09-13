// Shared flat-file data contract between the Node engine (engine/) and the dashboard.

export type ATS = 'greenhouse' | 'lever' | 'ashby' | 'workable' | 'workday' | 'other';
export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type JobStatus =
  | 'new'
  | 'scored'
  | 'cv_ready'
  | 'needs_you'
  | 'applied'
  | 'responded'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'discarded'
  | 'skip';

export type ParkReason =
  | 'captcha'
  | 'email_verification'
  | 'account_wall'
  | 'workday'
  | 'legal_question'
  | 'ghost'
  | 'low_fit'
  | 'unknown_form';

export interface Salary {
  min?: number;
  max?: number;
  currency: string;
  period?: string;
}

export interface Job {
  id: string;
  company: string;
  title: string;
  url: string;
  location: string;
  ats: ATS;
  boardToken?: string;
  postedAt?: string;
  discoveredAt: string;
  updatedAt: string;
  status: JobStatus;
  salary?: Salary;
  score?: number;
  grade?: Grade;
  matchPct?: number;
  archetype?: string;
  rationale?: string;
  reasons?: string[];
  gaps?: string[];
  legitimacy?: 'high' | 'medium' | 'caution';
  cvPath?: string;
  pdfPath?: string;
  appliedAt?: string;
  parkedReason?: ParkReason;
  parkedNote?: string;
  demo?: boolean;
}

export interface EeoAnswers {
  gender?: string;
  race?: string;
  veteran?: string;
  disability?: string;
}

export interface LegalAnswers {
  workAuthorized?: boolean;
  requiresSponsorship?: boolean;
  relocation?: string;
  noticePeriod?: string;
  salaryExpectation?: string;
  startDate?: string;
  referralSource?: string;
  criminalDisclosure?: string;
  ee?: EeoAnswers;
}

export interface Profile {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  currentEmployer?: string;
  currentTitle?: string;
  headline: string;
  targetRoles: string[];
  archetypes?: string[];
  superpowers?: string[];
  dealBreakers?: string[];
  compensation: { currency: string; floor?: number; target?: number };
  legal: LegalAnswers;
  onboarded: boolean;
  isDemo: boolean;
  updatedAt: string;
}

export interface Prefs {
  autonomy: boolean;
  autoSubmit: boolean;
  liveApply: boolean;
  minScore: number;
  dailyCap: number;
  perCompanyCap: number;
  scanIntervalMin: number;
  workingHours: { start: number; end: number };
  theme: 'day' | 'dusk';
  blockedCompanies: string[];
  updatedAt?: string;
}

export interface Company {
  name: string;
  ats: ATS;
  token: string;
  careersUrl?: string;
  enabled: boolean;
}

export type ActivityPhase = 'scan' | 'score' | 'tailor' | 'apply' | 'command' | 'run' | 'system';
export type ActivityLevel = 'info' | 'good' | 'warn' | 'bad';

export interface ActivityEvent {
  id: string;
  ts: string;
  phase: ActivityPhase;
  level: ActivityLevel;
  grade?: Grade;
  message: string;
  company?: string;
  jobId?: string;
}

export interface Run {
  id: string;
  startedAt: string;
  endedAt: string;
  boards: number;
  newJobs: number;
  scored: number;
  cvs: number;
  applied: number;
  parked: number;
  durationMs?: number;
  seeded?: boolean;
}

export type CommandType =
  | 'discard'
  | 'mark_applied'
  | 'scan_now'
  | 'pause'
  | 'resume'
  | 'save_prefs'
  | 'save_company'
  | 'park'
  | 'mark_cv'
  | 'mark_status';

export interface Command {
  id: string;
  ts: string;
  type: CommandType;
  jobId?: string;
  payload?: Record<string, unknown>;
  done?: boolean;
  doneAt?: string;
}

export interface Snapshot {
  profile: Profile;
  prefs: Prefs;
  companies: Company[];
  jobs: Job[];
  runs: Run[];
  activity: ActivityEvent[];
  generatedAt: string;
}
