export type AnxietySign =
    | 'hiding'
    | 'trembling_or_shaking'
    | 'panting'
    | 'pacing_or_restless'
    | 'owner_seeking'
    | 'scanning_or_alert'
    | 'freezing'
    | 'barking_whining_howling'
    | 'drooling'
    | 'bolting_or_escape_attempts'
    | 'not_accepting_treats'
    | 'other';

export type AnxietyLevel = 'calm' | 'mild' | 'moderate' | 'high';

export interface CheckIn {
    id: string;
    petId: string;
    sessionId: string;
    timestamp: string;
    phase: 'before' | 'after';
    overallLevel: AnxietyLevel;
    selectedSigns: AnxietySign[];
    notes?: string;
}

export type VisualCue = 'pulse' | 'dim' | 'pause' | 'reward' | 'observe';

export interface SessionStep {
    id: string;
    title: string;
    instruction: string;
    durationSeconds: number;
    visualCue: VisualCue;
    canSkip: boolean;
}

export interface Session {
    id: string;
    title: string;
    subtitle: string;
    trigger: string;
    durationMinutes: number;
    difficulty: 'easy' | 'moderate';
    accessLevel: 'free' | 'premium';
    goal: string;
    beforeYouStart: string[];
    steps: SessionStep[];
    whatToWatchFor: string[];
    stopIf: string[];
    afterSession: string[];
    tags: string[];
    recommendedForTriggers: string[];
}

export interface SessionHistoryEntry {
    id: string;
    petId: string;
    sessionId: string;
    completedAt: string;
    durationSeconds: number;
    completed: boolean;
    stoppedEarly: boolean;
    beforeCheckin?: CheckIn;
    afterCheckin?: CheckIn;
    resultSummary?: string;
}
