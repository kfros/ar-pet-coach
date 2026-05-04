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
    | 'aggression'
    | 'self_harm'
    | 'collapse_or_breathing_trouble'
    | 'repeated_vomiting_or_diarrhea'
    | 'other';

export type PositiveSign =
    | 'relaxed_body'
    | 'soft_eyes'
    | 'slower_breathing'
    | 'settled_nearby'
    | 'took_treats_calmly'
    | 'resting_or_lying_down'
    | 'less_pacing'
    | 'more_responsive'
    | 'chose_safe_spot'
    | 'fell_asleep';

export type AnxietyLevel = 'calm' | 'mild' | 'moderate' | 'high';

export interface CheckIn {
    id: string;
    petId: string;
    sessionId: string;
    timestamp: string;
    phase: 'before' | 'after';
    overallLevel: AnxietyLevel;
    selectedSigns: AnxietySign[];
    positiveSigns?: PositiveSign[];
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
    
    // New fields for premium routines
    category?: string;
    estimatedDurationSeconds?: number;
    suggestedTimeCopy?: string;
    description?: string;
    suitableFor?: string[];
    notFor?: string[];
    sourcePrinciples?: string[];
    safetyNotes?: string[];
    beforeCheckinEnabled?: boolean;
    afterCheckinEnabled?: boolean;
    severeNoticeEnabled?: boolean;
    iconKey?: string;
    fallbacks?: SessionFallback[];
}

export interface SessionFallback {
    type: 'routine' | 'info';
    routineId?: string;
    title: string;
    body: string;
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
