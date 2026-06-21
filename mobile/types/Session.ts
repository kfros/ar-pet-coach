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

export type RoutineCategory =
    | 'foundation'
    | 'walk_fear'
    | 'noise_support'
    | 'home_triggers'
    | 'alone_time'
    | 'care_handling';

export type BackgroundSoundMode =
    | 'none'
    | 'calm_music'
    | 'white_noise'
    | 'brown_noise'
    | 'owner_choice';

export interface BackgroundSoundPolicy {
    mode: BackgroundSoundMode;
    defaultEnabled: boolean;
    showControls: boolean;
    label?: string;
    helperText?: string;
}

export interface SessionStep {
    id: string;
    title: string;
    instruction: string;
    durationSeconds: number;
    visualCue: VisualCue;
    canSkip: boolean;
    backgroundSoundPolicy?: BackgroundSoundPolicy;
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
    category?: RoutineCategory | string;
    categoryLabel?: string;
    categoryOrder?: number;
    displayOrder?: number;
    backgroundSoundPolicy?: BackgroundSoundPolicy;
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
    schemaVersion?: number;
    checkInProfileId?: CheckInProfileId;
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
    schemaVersion?: number;
    createdAt?: string;
    updatedAt?: string;
    syncStatus?: 'pending' | 'synced';
    outdoorMilestone?: string;
    outdoorMilestones?: string[];
}

export type StressSignsTrendStatus =
  | 'not_enough_data'
  | 'easing'
  | 'same'
  | 'increased'
  | 'mixed'
  | 'severe';

export type StressSignsTrendPoint = {
  id: string;
  sessionId: string;
  sessionTitle?: string;
  completedAt: string;
  sequenceNumber: number;
  stressSignsScore: number;
  levelLabel: string;
  stoppedEarly: boolean;
  hasSevereSigns: boolean;
  source: 'after_checkin' | 'before_checkin';
};

export type StressSignsTrendSummary = {
  status: StressSignsTrendStatus;
  componentTitle: 'Stress Signs Trend';
  statusTitle: string;
  body: string;
  helper?: string;
  points: StressSignsTrendPoint[];
  latestScore: number | null;
  previousScore: number | null;
  averageDelta: number | null;
  latestCompletedAt: string | null;
  minRequiredCheckins: number;
  hasEnoughData: boolean;
  legend: string;
};

export type CheckInProfileId =
  | 'general_calm'
  | 'outdoor_confidence'
  | 'noise_support'
  | 'visitors'
  | 'being_alone'
  | 'care_handling';

export type CheckInSignKind =
  | 'stress'
  | 'positive'
  | 'severe';

export interface CheckInSignOption {
  id: string;
  label: string;
  kind: CheckInSignKind;
  scoreWeight?: number;
  safetyLevel?: 'none' | 'caution' | 'behavioral_stop' | 'medical_stop';
  helperText?: string;
}

export interface CheckInProfile {
  id: CheckInProfileId;
  title: string;
  beforePrompt: string;
  afterPrompt: string;
  stressSigns: CheckInSignOption[];
  positiveSigns?: CheckInSignOption[];
  severeSigns: CheckInSignOption[];
  showPositiveSignsAfter: boolean;
  milestonePromptEnabled?: boolean;
}

