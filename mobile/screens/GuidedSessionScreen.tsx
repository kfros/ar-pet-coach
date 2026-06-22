import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Easing, ActivityIndicator, Dimensions, Alert, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import { useSubscription } from '../components/SubscriptionManager';
import SessionService from '../services/sessionService';
import { useCalmAudio } from '../hooks/useCalmAudio';
import { Session, SessionStep, AnxietyLevel, AnxietySign, PositiveSign, CheckIn, CheckInProfile, CheckInSignOption } from '../types/Session';
import { getCheckInProfile } from '../appContent/checkInProfiles';
import {
    MEDICAL_SEVERE_SIGNS,
    BEHAVIORAL_SEVERE_SIGNS,
    SEVERE_SIGN_LOGIC,
    IN_SESSION_SAFETY_PROMPT
} from '../appContent/routineSafety';
import { calculateCheckinScore } from '../services/progressScoring';
import {
    getOutdoorConfidenceLevel,
    getOutdoorConfidenceProgressionState,
    resolveOutdoorActiveLevel
} from '../appContent/outdoorConfidenceLevels';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FOOTER_SPACE = 230;

const ANXIETY_LEVELS: { id: AnxietyLevel; label: string; color: string }[] = [
    { id: 'calm', label: 'Calm', color: '#10B981' },
    { id: 'mild', label: 'Mild', color: '#F59E0B' },
    { id: 'moderate', label: 'Moderate', color: '#F97316' },
    { id: 'high', label: 'High', color: '#EF4444' }
];

const ANXIETY_SIGNS: { id: AnxietySign; label: string }[] = [
    { id: 'hiding', label: 'Hiding' },
    { id: 'trembling_or_shaking', label: 'Trembling / Shaking' },
    { id: 'panting', label: 'Panting' },
    { id: 'pacing_or_restless', label: 'Pacing / Restless' },
    { id: 'owner_seeking', label: 'Seeking Owner' },
    { id: 'scanning_or_alert', label: 'Scanning / Alert' },
    { id: 'freezing', label: 'Freezing' },
    { id: 'barking_whining_howling', label: 'Vocalizing' },
    { id: 'drooling', label: 'Drooling' },
    { id: 'not_accepting_treats', label: 'Refusing Treats' },
    { id: 'aggression', label: 'Aggression' },
    { id: 'self_harm', label: 'Self-Harm' },
    { id: 'bolting_or_escape_attempts', label: 'Escape Attempts' },
    { id: 'collapse_or_breathing_trouble', label: 'Breathing Trouble' },
    { id: 'repeated_vomiting_or_diarrhea', label: 'Vomiting / Diarrhea' },
    { id: 'other', label: 'Other' }
];

const POSITIVE_SIGNS: { id: PositiveSign; label: string }[] = [
    { id: 'relaxed_body', label: 'Relaxed Body' },
    { id: 'soft_eyes', label: 'Soft Eyes' },
    { id: 'slower_breathing', label: 'Slower Breathing' },
    { id: 'settled_nearby', label: 'Settled Nearby' },
    { id: 'took_treats_calmly', label: 'Took Treats Calmly' },
    { id: 'resting_or_lying_down', label: 'Resting / Lying Down' },
    { id: 'less_pacing', label: 'Less Pacing' },
    { id: 'more_responsive', label: 'More Responsive' },
    { id: 'chose_safe_spot', label: 'Chose Safe Spot' },
    { id: 'fell_asleep', label: 'Fell Asleep' }
];

const HINT_STORAGE_KEY = 'guidedFocusCircleHintDismissed';
const REPEAT_STORAGE_KEY = 'backgroundSoundRepeatEnabled';

const MILESTONE_OPTIONS = [
    { id: "doorway_calm", label: "Stayed calm near the door" },
    { id: "open_edge", label: "Handled the door opening" },
    { id: "one_step", label: "Took one calm step" },
    { id: "short_pause", label: "Paused briefly outside" },
    { id: "few_steps", label: "Walked a few calm steps away" },
    { id: "hundred_steps", label: "Managed around 100 steps" },
    { id: "ten_min_walk", label: "Managed an easy 10-minute walk" },
    { id: "none_yet", label: "None of these yet" }
];

const MILESTONE_EXPLANATIONS: Record<string, { title: string, body: string, primaryCTA: string, secondaryCTA?: string }> = {
    none_yet: {
        title: "That is useful information",
        body: "Next time, make the step easier. Try staying further from the exit, opening the door less, or shortening the session.",
        primaryCTA: "See easier options"
    },
    doorway_calm: {
        title: "Good starting point",
        body: "Repeat this same easy edge once more before making it harder.",
        primaryCTA: "Repeat this level",
        secondaryCTA: "See next level"
    },
    open_edge: {
        title: "Next level available",
        body: "You can try one tiny step next time. Keep it optional and stop before panic.",
        primaryCTA: "View next level",
        secondaryCTA: "Repeat this level"
    },
    one_step: {
        title: "Tiny step logged",
        body: "Repeat one calm step before asking for more distance.",
        primaryCTA: "Repeat this level",
        secondaryCTA: "View next level"
    },
    short_pause: {
        title: "Short pause logged",
        body: "Next time, you can repeat the short outside pause or try a few calm steps away if your dog stays comfortable.",
        primaryCTA: "Repeat this level",
        secondaryCTA: "View next level"
    },
    few_steps: {
        title: "First steps logged",
        body: "Keep this route easy. If signs stay low, the next target can be around 100 calm steps.",
        primaryCTA: "Repeat this level",
        secondaryCTA: "View next level"
    },
    hundred_steps: {
        title: "Longer distance logged",
        body: "Repeat this before aiming for an easy 10-minute walk.",
        primaryCTA: "Repeat this level",
        secondaryCTA: "View next level"
    },
    ten_min_walk: {
        title: "Easy walk logged",
        body: "Keep using easy routes and return to shorter levels whenever signs look stronger.",
        primaryCTA: "Done",
        secondaryCTA: "Review levels"
    }
};

export default function GuidedSessionScreen({ navigation, route }: any) {
    const insets = useSafeAreaInsets();
    const { sessionId, petId } = route.params;
    const session = SessionService.getSessionById(sessionId);
    const { trackCalmingSession } = useSubscription();

    const [phase, setPhase] = useState<'before_checkin' | 'active' | 'after_checkin'>('before_checkin');
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    // Collapsible check-in section expansion states
    const [beforeStressExpanded, setBeforeStressExpanded] = useState(true);
    const [beforeSafetyExpanded, setBeforeSafetyExpanded] = useState(false);
    const [afterStressExpanded, setAfterStressExpanded] = useState(true);
    const [afterPositiveExpanded, setAfterPositiveExpanded] = useState(true);
    const [afterSafetyExpanded, setAfterSafetyExpanded] = useState(false);

    const sessionPolicy = session?.backgroundSoundPolicy;
    const initialAudioEnabled = sessionPolicy ? sessionPolicy.defaultEnabled : true;
    const [audioEnabled, setAudioEnabled] = useState(initialAudioEnabled);
    const [repeatEnabled, setRepeatEnabled] = useState(false);
    const [showHint, setShowHint] = useState(false);

    // Milestone progression prompt state
    const [showMilestonePrompt, setShowMilestonePrompt] = useState(false);
    const [selectedMilestones, setSelectedMilestones] = useState<string[]>([]);
    const [milestoneExplanation, setMilestoneExplanation] = useState<any | null>(null);
    const handleToggleMilestone = (id: string) => {
        setSelectedMilestones((prev) => {
            if (id === 'none_yet') {
                return ['none_yet'];
            }
            const filtered = prev.filter(x => x !== 'none_yet');
            if (filtered.includes(id)) {
                return filtered.filter(x => x !== id);
            } else {
                return [...filtered, id];
            }
        });
    };
    const [showEasierHelperModal, setShowEasierHelperModal] = useState(false);
    const [entryId] = useState(() => `session_${Date.now()}`);
    const profile = getCheckInProfile(session?.checkInProfileId);

    const savedBeforeCheckinRef = useRef<CheckIn | undefined>(undefined);
    const savedAfterCheckinRef = useRef<CheckIn | undefined>(undefined);
    const savedCompletedAtRef = useRef<string | undefined>(undefined);

    const [selectedLevelId, setSelectedLevelId] = useState<string>(route.params?.level || 'doorway_calm');

    useEffect(() => {
        const loadSelectedLevel = async () => {
            if (sessionId === 'outdoor_confidence_reset') {
                try {
                    const state = await getOutdoorConfidenceProgressionState(petId);
                    const resolved = resolveOutdoorActiveLevel({
                        requestedLevel: route.params?.level,
                        storedSelectedLevel: state.storedSelectedLevel,
                        achievedLevel: state.achievedLevel,
                        unlockedLevels: state.unlockedLevels,
                        newlyUnlockedLevel: state.newlyUnlockedLevel
                    });
                    setSelectedLevelId(resolved);
                } catch (e) {
                    console.error(e);
                    setSelectedLevelId(route.params?.level || 'doorway_calm');
                }
            }
        };
        loadSelectedLevel();
    }, [petId, sessionId, route.params?.level]);

    const getDynamicSteps = () => {
        const rawSteps = session?.steps || [];
        if (sessionId === 'outdoor_confidence_reset' && rawSteps.length === 6) {
            const updatedSteps = [...rawSteps];
            const levelInfo = getOutdoorConfidenceLevel(selectedLevelId);
            if (levelInfo) {
                updatedSteps[3] = {
                    ...updatedSteps[3],
                    title: levelInfo.label,
                    instruction: levelInfo.description,
                    durationSeconds: levelInfo.durationSeconds || 45
                };
            }
            return updatedSteps;
        }
        return rawSteps;
    };

    const steps = getDynamicSteps();
    const currentStep = steps[currentStepIndex];

    const stepPolicy = currentStep?.backgroundSoundPolicy;
    const currentSoundMode = stepPolicy?.mode || sessionPolicy?.mode || 'calm_music';
    const isSoundAllowed = currentSoundMode !== 'none';
    const showAudioControls = stepPolicy ? stepPolicy.showControls : (sessionPolicy ? sessionPolicy.showControls : true);

    // Audio Hook
    const { isPlaying, stopAudio, handleNext, pauseAudio, resumeAudio } = useCalmAudio(
        phase === 'active' && audioEnabled && isSoundAllowed
    );
    const wasSoundPlayingBeforePause = useRef(false);
    const [beforeLevel, setBeforeLevel] = useState<AnxietyLevel | null>(null);
    const [beforeSigns, setBeforeSigns] = useState<string[]>([]);
    const [afterLevel, setAfterLevel] = useState<AnxietyLevel | null>(null);
    const [afterSigns, setAfterSigns] = useState<string[]>([]);
    const [afterPositiveSigns, setAfterPositiveSigns] = useState<string[]>([]);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const dimAnim = useRef(new Animated.Value(0)).current;
    const timerRef = useRef<any>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [showNextStepPrompt, setShowNextStepPrompt] = useState(false);
    const [showSafetyNotice, setShowSafetyNotice] = useState<{ title: string, body: string, type: 'medical' | 'behavioral' } | null>(null);
    const [showFinalSafetyPrompt, setShowFinalSafetyPrompt] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            const repeatOn = await AsyncStorage.getItem(REPEAT_STORAGE_KEY);
            if (repeatOn === 'true') setRepeatEnabled(true);
        };
        loadSettings();

        return () => {
            try {
                stopAudio();
            } catch (e) {
                console.error(e);
            }
            if (pulseLoop.current) {
                pulseLoop.current.stop();
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            setShowNextStepPrompt(false);
        };
    }, []);

    useEffect(() => {
        if (phase === 'active' && currentStep) {
            startStep(currentStep);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [phase, currentStepIndex]);

    const isPausedRef = useRef(isPaused);
    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    const startStep = (step: SessionStep) => {
        setTimeLeft(step.durationSeconds || 0);
        setShowNextStepPrompt(false);

        // GFM-001: Smooth transition for visual cues
        const targetDim = step.visualCue === 'dim' ? 1 : 0;
        Animated.timing(dimAnim, {
            toValue: targetDim,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease)
        }).start();

        // Pulse is managed by the isPaused/phase/currentStepIndex effect
        // (it will detect the new step index and start with resetValues=true)

        // Start Timer
        if (timerRef.current) clearInterval(timerRef.current);
        if (step.durationSeconds && step.durationSeconds > 0) {
            timerRef.current = setInterval(() => {
                if (isPausedRef.current) return;

                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        // GFM-003: Show prompt instead of auto-advancing
                        setShowNextStepPrompt(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
    };

    const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
    const pulseStartedForStep = useRef<number>(-1);
    const isGoingUp = useRef(true);

    const startPulsing = (resetValues: boolean) => {
        if (pulseLoop.current) pulseLoop.current.stop();

        // Рекурсивная функция для идеального дыхания (заменяет Animated.loop)
        const triggerNextPhase = (up: boolean, duration: number) => {
            isGoingUp.current = up;
            const targetScale = up ? 1.04 : 0.96;
            const targetOpacity = up ? 1.0 : 0.82;

            pulseLoop.current = Animated.parallel([
                Animated.timing(pulseAnim, { toValue: targetScale, duration, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
                Animated.timing(opacityAnim, { toValue: targetOpacity, duration, useNativeDriver: true, easing: Easing.inOut(Easing.sin) })
            ]);

            pulseLoop.current.start(({ finished }) => {
                // Запускаем следующую фазу ТОЛЬКО если текущая завершилась сама (не была остановлена паузой)
                if (finished) {
                    triggerNextPhase(!up, 2600); // Следующая фаза всегда идет в обратном направлении и занимает полные 2600мс
                }
            });
        };

        if (resetValues) {
            // Старт нового шага: круг находится в центре.
            pulseAnim.setValue(1);
            opacityAnim.setValue(0.91);

            // Запускаем первую вводную фазу (Вдох от центра до максимума за 1300мс)
            triggerNextPhase(true, 1300);
        } else {
            // Снятие с паузы: продолжаем двигаться в том же направлении, в котором остановились.
            // Никаких скачков или резких смен курса.
            triggerNextPhase(isGoingUp.current, 2600);
        }
    };

    useEffect(() => {
        if (isPaused) {
            if (pulseLoop.current) pulseLoop.current.stop();
        } else if (phase === 'active' && currentStep?.visualCue === 'pulse') {
            // On resume: don't reset values. On new step: reset.
            const isNewStep = pulseStartedForStep.current !== currentStepIndex;
            pulseStartedForStep.current = currentStepIndex;
            // focus circle is disabled by default
            // startPulsing(isNewStep);
        }
    }, [isPaused, phase, currentStepIndex]);

    const handleNextStep = () => {
        setShowNextStepPrompt(false);
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            setPhase('after_checkin');
        }
    };

    const handlePrevStep = () => {
        setShowNextStepPrompt(false);
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
            setIsPaused(false);
        }
    };

    const togglePause = async () => {
        const newPaused = !isPaused;
        setIsPaused(newPaused);

        if (newPaused) {
            // Pausing
            wasSoundPlayingBeforePause.current = isPlaying;
            if (isPlaying) {
                await pauseAudio();
            }
        } else {
            // Resuming
            if (wasSoundPlayingBeforePause.current && audioEnabled) {
                await resumeAudio();
            }
        }
    };

    const handleEndSession = () => {
        Alert.alert(
            "End this session?",
            "This will save the session as stopped early.",
            [
                { text: "Keep Going", style: "cancel" },
                { text: "End Session", style: "destructive", onPress: () => finalizeSession(true) }
            ]
        );
    };

    const dismissHint = async () => {
        await AsyncStorage.setItem(HINT_STORAGE_KEY, 'true');
        setShowHint(false);
    };

    const toggleRepeat = async () => {
        const newValue = !repeatEnabled;
        setRepeatEnabled(newValue);
        await AsyncStorage.setItem(REPEAT_STORAGE_KEY, newValue.toString());
    };

    const handleSkipCheckin = () => {
        setPhase('active');
    };

    const toggleSign = (sign: string, isBefore: boolean) => {
        const current = isBefore ? beforeSigns : afterSigns;
        const setter = isBefore ? setBeforeSigns : setAfterSigns;
        if (current.includes(sign)) {
            setter(current.filter(s => s !== sign));
        } else {
            const newSigns = [...current, sign];
            setter(newSigns);

            // GFM-005: Severe sign logic
            if (isBefore && session?.severeNoticeEnabled) {
                const hasMedical = newSigns.some(s => MEDICAL_SEVERE_SIGNS.includes(s as any));
                const hasBehavioral = newSigns.some(s => BEHAVIORAL_SEVERE_SIGNS.includes(s as any));

                if (hasMedical) {
                    setShowSafetyNotice({
                        title: SEVERE_SIGN_LOGIC.medical.title,
                        body: SEVERE_SIGN_LOGIC.medical.body,
                        type: 'medical'
                    });
                } else if (hasBehavioral) {
                    setShowSafetyNotice({
                        title: SEVERE_SIGN_LOGIC.behavioral.title,
                        body: SEVERE_SIGN_LOGIC.behavioral.body,
                        type: 'behavioral'
                    });
                }
            }
        }
    };

    const togglePositiveSign = (sign: string) => {
        if (afterPositiveSigns.includes(sign)) {
            setAfterPositiveSigns(afterPositiveSigns.filter(s => s !== sign));
        } else {
            setAfterPositiveSigns([...afterPositiveSigns, sign]);
        }
    };

    const finalizeSession = async (stoppedEarly = false) => {
        if (stoppedEarly) {
            saveSession(true);
        } else {
            setPhase('after_checkin');
        }
    };

    const saveSession = async (stoppedEarly = false, milestonesToSave?: string[] | null) => {
        if (!session) return;
        setIsSaving(true);

        // Stop audio immediately
        try {
            stopAudio();
        } catch (e) {
            console.error('Error stopping audio:', e);
        }
        if (pulseLoop.current) {
            pulseLoop.current.stop();
        }
        // Stop timer and next step prompt immediately
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setShowNextStepPrompt(false);
        setIsPaused(true);

        let beforeCheckin = savedBeforeCheckinRef.current;
        if (!beforeCheckin && beforeLevel) {
            beforeCheckin = {
                id: `before_${Date.now()}`,
                petId,
                sessionId,
                timestamp: new Date().toISOString(),
                phase: 'before',
                overallLevel: beforeLevel || 'calm',
                selectedSigns: beforeSigns as any
            };
            savedBeforeCheckinRef.current = beforeCheckin;
        }

        let afterCheckin = savedAfterCheckinRef.current;
        if (!afterCheckin && !stoppedEarly && afterLevel) {
            afterCheckin = {
                id: `after_${Date.now()}`,
                petId,
                sessionId,
                timestamp: new Date().toISOString(),
                phase: 'after',
                overallLevel: afterLevel || 'calm',
                selectedSigns: afterSigns as any,
                positiveSigns: afterPositiveSigns as any
            };
            savedAfterCheckinRef.current = afterCheckin;
        }

        let completedAt = savedCompletedAtRef.current;
        if (!completedAt) {
            completedAt = new Date().toISOString();
            savedCompletedAtRef.current = completedAt;
        }

        let highestMilestone: string | undefined = undefined;
        let milestonesArr: string[] = [];

        if (milestonesToSave && milestonesToSave.length > 0) {
            milestonesArr = milestonesToSave;
            const OUTDOOR_LEVELS = [
                'doorway_calm',
                'open_edge',
                'one_step',
                'short_pause',
                'few_steps',
                'hundred_steps',
                'ten_min_walk'
            ];
            let maxIndex = -1;
            for (const m of milestonesToSave) {
                const idx = OUTDOOR_LEVELS.indexOf(m);
                if (idx > maxIndex) {
                    maxIndex = idx;
                    highestMilestone = m;
                }
            }
            if (milestonesToSave.includes('none_yet')) {
                highestMilestone = 'none_yet';
            }
        }

        try {
            await SessionService.saveSessionHistory({
                id: entryId,
                petId,
                sessionId,
                completedAt,
                durationSeconds: steps.slice(0, currentStepIndex + 1).reduce((acc, s) => acc + (s.durationSeconds || 0), 0),
                completed: !stoppedEarly,
                stoppedEarly: stoppedEarly,
                beforeCheckin: beforeCheckin,
                afterCheckin: afterCheckin,
                outdoorMilestone: highestMilestone || undefined,
                outdoorMilestones: milestonesArr.length > 0 ? milestonesArr : undefined
            });

            await trackCalmingSession();

            // Calculate check-in scores using profile
            const scoreResult = calculateCheckinScore(afterCheckin, profile);
            const prevScore = beforeLevel ? calculateCheckinScore(beforeCheckin, profile) : null;
            const worsened = prevScore !== null && (scoreResult.score - prevScore.score) >= 2;
            const hasAfterSevere = afterSigns.some(s => MEDICAL_SEVERE_SIGNS.includes(s as any) || BEHAVIORAL_SEVERE_SIGNS.includes(s as any));

            if (sessionId === 'outdoor_confidence_reset' && !stoppedEarly) {
                if (milestonesToSave === null || milestonesToSave === undefined) {
                    setShowMilestonePrompt(true);
                } else {
                    // Load currently unlocked levels using routine-specific storage key
                    const unlockedData = await AsyncStorage.getItem(`chillpup_outdoor_confidence_levels_${petId}`);
                    let unlockedLevelsList = ['doorway_calm'];
                    if (unlockedData) {
                        unlockedLevelsList = JSON.parse(unlockedData);
                    }

                    let newLvlUnlocked: string | null = null;
                    if (highestMilestone && highestMilestone !== 'none_yet') {
                        await AsyncStorage.setItem(`chillpup_outdoor_confidence_achieved_level_${petId}`, highestMilestone);
                        const OUTDOOR_LEVELS = [
                            'doorway_calm',
                            'open_edge',
                            'one_step',
                            'short_pause',
                            'few_steps',
                            'hundred_steps',
                            'ten_min_walk'
                        ];
                        const idx = OUTDOOR_LEVELS.indexOf(highestMilestone);
                        if (idx >= 0) {
                            // Backfill levels up to idx
                            const achieved = OUTDOOR_LEVELS.slice(0, idx + 1);
                            // Unlock next level (idx + 1)
                            const nextLvl = idx < OUTDOOR_LEVELS.length - 1 ? OUTDOOR_LEVELS[idx + 1] : null;

                            const levelsToUnlock = [...achieved];
                            if (nextLvl) {
                                levelsToUnlock.push(nextLvl);
                            }

                            // Build unique list of newly unlocked levels
                            const updatedUnlockedList = Array.from(new Set([...unlockedLevelsList, ...levelsToUnlock]));
                            await AsyncStorage.setItem(`chillpup_outdoor_confidence_levels_${petId}`, JSON.stringify(updatedUnlockedList));

                            // If the next level was NOT previously unlocked, it is newly available!
                            if (nextLvl && !unlockedLevelsList.includes(nextLvl)) {
                                newLvlUnlocked = nextLvl;
                                await AsyncStorage.setItem(`chillpup_newly_unlocked_outdoor_confidence_level_${petId}`, nextLvl);
                            }
                        }
                    }

                    // Check if trend is increased
                    const trend = typeof SessionService.getStressSignsTrend === 'function'
                        ? await SessionService.getStressSignsTrend(petId)
                        : null;
                    const isTrendIncreased = trend && (trend.status === 'increased' || trend.status === 'severe');
                    const stressSignsIncreased = worsened || hasAfterSevere || isTrendIncreased;

                    let explanationCopy;
                    if (highestMilestone === 'none_yet') {
                        explanationCopy = {
                            title: "That is useful information",
                            body: "Nothing new needs to be unlocked today. Next time, make the level easier and end while your dog can still recover.",
                            primaryCTA: "Done",
                            secondaryCTA: "Review easier steps"
                        };
                    } else if (stressSignsIncreased) {
                        explanationCopy = {
                            title: "Use an easier step next time",
                            body: "You saved this session. Next time, make the setup easier, shorter, or farther from the outdoor edge.",
                            primaryCTA: "Done",
                            secondaryCTA: "Review easier steps"
                        };
                    } else if (newLvlUnlocked) {
                        explanationCopy = {
                            title: "New level available for next time",
                            body: "Based on what you logged today, another outdoor level is available. You do not need to try it today. Repeating an easier level is always okay.",
                            primaryCTA: "Done",
                            secondaryCTA: "Review progress"
                        };
                    } else {
                        explanationCopy = {
                            title: "Progress saved",
                            body: "This session was saved. Next time, keep the step small and easy enough for your dog to recover.",
                            primaryCTA: "Done"
                        };
                    }

                    setMilestoneExplanation(explanationCopy);
                }
            } else {
                if (!stoppedEarly && (worsened || hasAfterSevere)) {
                    setShowFinalSafetyPrompt(true);
                } else {
                    navigation.navigate('Dashboard');
                }
            }
        } catch (error) {
            console.error('Error saving session:', error);
            navigation.navigate('Dashboard');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCTANavigation = (ctaText: string) => {
        setShowMilestonePrompt(false);
        setMilestoneExplanation(null);
        setSelectedMilestones([]);

        if (ctaText === 'Done') {
            navigation.navigate('Dashboard');
        } else if (ctaText === 'Review progress' || ctaText === 'Review easier steps') {
            navigation.navigate('SessionPreview', { sessionId: 'outdoor_confidence_reset', petId });
        } else {
            navigation.navigate('Dashboard');
        }
    };

    const renderCheckin = (isBefore: boolean) => {
        const level = isBefore ? beforeLevel : afterLevel;
        const setLevel = isBefore ? setBeforeLevel : setAfterLevel;
        const signs = isBefore ? beforeSigns : afterSigns;

        const selectableSigns = [...profile.stressSigns, ...profile.severeSigns];
        const positiveSigns = profile.positiveSigns || [];
        const selectedOptionsWithHelper = selectableSigns.filter(s => signs.includes(s.id) && s.helperText);

        const renderCollapsibleSection = (
            id: string,
            title: string,
            items: CheckInSignOption[],
            selectedIds: string[],
            isExpanded: boolean,
            onToggle: () => void,
            isCaution: boolean = false,
            isPositive: boolean = false
        ) => {
            const selectedCount = selectedIds.length;
            const selectedItems = items.filter(item => selectedIds.includes(item.id));

            return (
                <View style={styles.collapsibleSectionContainer} key={id}>
                    <Pressable
                        style={[
                            styles.sectionHeader,
                            isCaution && styles.sectionHeaderCaution
                        ]}
                        onPress={onToggle}
                        testID={`section-header-${id}`}
                    >
                        <Text style={[
                            styles.sectionHeaderTitle,
                            isCaution && styles.sectionHeaderTitleCaution
                        ]}>
                            {selectedCount > 0 ? `${title} · ${selectedCount} selected` : title}
                        </Text>
                        <View style={styles.sectionHeaderRight}>
                            <Text style={[
                                styles.expandCollapseLabel,
                                isCaution && styles.expandCollapseLabelCaution
                            ]}>
                                {isExpanded ? 'Hide' : 'Show'}
                            </Text>
                            <Ionicons
                                name={isExpanded ? "chevron-up" : "chevron-down"}
                                size={16}
                                color={isCaution ? "#9A5B00" : COLORS.textSecondary}
                            />
                        </View>
                    </Pressable>

                    {isExpanded ? (
                        <View style={styles.sectionContent}>
                            <View style={styles.signsContainer}>
                                {items.map((sign) => {
                                    const isSelected = selectedIds.includes(sign.id);
                                    return (
                                        <Pressable
                                            key={sign.id}
                                            style={[
                                                styles.signChip,
                                                isSelected && (isPositive ? styles.positiveSignChipSelected : styles.signChipSelected)
                                            ]}
                                            onPress={() => isPositive ? togglePositiveSign(sign.id) : toggleSign(sign.id, isBefore)}
                                        >
                                            <Text style={[
                                                styles.signText,
                                                isSelected && (isPositive ? styles.positiveSignTextSelected : styles.signTextSelected)
                                            ]}>
                                                {sign.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    ) : (
                        selectedCount > 0 && (
                            <View style={styles.sectionContentCollapsed}>
                                <View style={styles.signsContainerCollapsed}>
                                    {selectedItems.map((sign) => (
                                        <View
                                            key={sign.id}
                                            style={[
                                                styles.signChipCollapsed,
                                                isPositive && styles.positiveSignChipCollapsed
                                            ]}
                                        >
                                            <Text style={[
                                                styles.signTextCollapsed,
                                                isPositive && styles.positiveSignTextCollapsed
                                            ]}>
                                                {sign.label}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )
                    )}
                </View>
            );
        };

        return (
            <ScrollView contentContainerStyle={styles.checkinScroll}>
                <Text style={styles.checkinTitle}>{isBefore ? 'Calm Check-In' : 'After-Session Check-In'}</Text>
                <Text style={styles.checkinSubtitle}>{isBefore ? profile.beforePrompt : profile.afterPrompt}</Text>

                <View style={styles.levelContainer}>
                    {ANXIETY_LEVELS.map((lvl) => (
                        <Pressable
                            key={lvl.id}
                            style={[
                                styles.levelButton,
                                level === lvl.id && { backgroundColor: lvl.color, borderColor: lvl.color }
                            ]}
                            onPress={() => setLevel(lvl.id)}
                        >
                            <Text style={[styles.levelLabel, level === lvl.id && { color: '#fff' }]}>{lvl.label}</Text>
                        </Pressable>
                    ))}
                </View>

                <View style={{ marginTop: 16 }}>
                    {isBefore ? (
                        <>
                            {renderCollapsibleSection(
                                'stress_signs',
                                'Stress signs',
                                profile.stressSigns,
                                beforeSigns.filter(id => profile.stressSigns.some(s => s.id === id)),
                                beforeStressExpanded,
                                () => setBeforeStressExpanded(!beforeStressExpanded)
                            )}

                            {renderCollapsibleSection(
                                'safety_stop_signs',
                                'Safety / stop signs',
                                profile.severeSigns,
                                beforeSigns.filter(id => profile.severeSigns.some(s => s.id === id)),
                                beforeSafetyExpanded,
                                () => setBeforeSafetyExpanded(!beforeSafetyExpanded),
                                true
                            )}
                        </>
                    ) : (
                        <>
                            {renderCollapsibleSection(
                                'stress_signs',
                                'Stress signs still present',
                                profile.stressSigns,
                                afterSigns.filter(id => profile.stressSigns.some(s => s.id === id)),
                                afterStressExpanded,
                                () => setAfterStressExpanded(!afterStressExpanded)
                            )}

                            {profile.showPositiveSignsAfter && positiveSigns.length > 0 && renderCollapsibleSection(
                                'positive_recovery_signs',
                                'Recovery signs',
                                positiveSigns,
                                afterPositiveSigns,
                                afterPositiveExpanded,
                                () => setAfterPositiveExpanded(!afterPositiveExpanded),
                                false,
                                true
                            )}

                            {renderCollapsibleSection(
                                'safety_stop_signs',
                                'Safety / stop signs',
                                profile.severeSigns,
                                afterSigns.filter(id => profile.severeSigns.some(s => s.id === id)),
                                afterSafetyExpanded,
                                () => setAfterSafetyExpanded(!afterSafetyExpanded),
                                true
                            )}
                        </>
                    )}
                </View>

                {selectedOptionsWithHelper.map((s) => (
                    <View key={s.id} style={styles.signHelperBox}>
                        <Ionicons name="information-circle-outline" size={16} color="#9A5B00" style={{ marginRight: 6 }} />
                        <Text style={styles.signHelperText}>{s.helperText}</Text>
                    </View>
                ))}

                <Pressable
                    style={styles.checkinNextButton}
                    onPress={() => {
                        if (isBefore) {
                            if (showSafetyNotice?.type === 'medical' && SEVERE_SIGN_LOGIC.medical.blockStart) {
                                return;
                            }
                            setPhase('active');
                        } else {
                            if (sessionId === 'outdoor_confidence_reset') {
                                saveSession(false, null);
                            } else {
                                saveSession();
                            }
                        }
                    }}
                >
                    <Text style={styles.checkinNextText}>{isBefore ? 'Start Session' : 'Finish & Save'}</Text>
                </Pressable>

                {isBefore && (
                    <Pressable style={styles.skipButton} onPress={handleSkipCheckin}>
                        <Text style={styles.skipText}>Skip Check-in</Text>
                    </Pressable>
                )}
            </ScrollView>
        );
    };

    if (!session) return null;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header / Progress bar */}
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
                    <Ionicons name="close" size={28} color={COLORS.text} />
                </Pressable>
                {phase === 'active' && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${((currentStepIndex + 1) / steps.length) * 100}%` }]} />
                        </View>
                        <Text style={styles.progressText}>
                            {sessionId === 'outdoor_confidence_reset'
                                ? `Routine step ${currentStepIndex + 1} of ${steps.length}`
                                : `Step ${currentStepIndex + 1} of ${steps.length}`
                            }
                        </Text>
                        {sessionId === 'outdoor_confidence_reset' && (() => {
                            const lvlInfo = getOutdoorConfidenceLevel(selectedLevelId);
                            return lvlInfo ? (
                                <Text style={styles.outdoorProgressSubText}>
                                    {`Outdoor level ${lvlInfo.levelIndex} of 7: ${lvlInfo.label}`}
                                </Text>
                            ) : null;
                        })()}
                    </View>
                )}
                <View style={{ width: 28 }} />
            </View>

            <View style={{ flex: 1 }}>
                {phase === 'before_checkin' && renderCheckin(true)}
                {phase === 'after_checkin' && renderCheckin(false)}

                {phase === 'active' && currentStep && (
                    <View style={{ flex: 1, position: 'relative' }}>
                        <ScrollView
                            style={styles.activeSessionArea}
                            contentContainerStyle={[
                                styles.activeSessionScroll,
                                { paddingBottom: FOOTER_SPACE + Math.max(insets.bottom, 20) }
                            ]}
                        >
                            <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', opacity: dimAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }) }]} />

                            <View style={styles.stepInfo}>
                                <Text style={styles.sessionStepTitle}>{session.title}</Text>
                                {sessionId === 'outdoor_confidence_reset' && currentStepIndex === 3 && (() => {
                                    const lvlInfo = getOutdoorConfidenceLevel(selectedLevelId);
                                    return lvlInfo ? (
                                        <Text style={styles.dynamicStepHeader} testID="dynamic-step-header">
                                            {`Today’s outdoor level: ${lvlInfo.label}`}
                                        </Text>
                                    ) : null;
                                })()}
                                <Text style={styles.stepTitle}>{currentStep.title}</Text>
                                <Text style={styles.stepInstruction}>{currentStep.instruction}</Text>
                                {currentStep.id === 'outdoor_check_body' && (
                                    <Pressable
                                        style={styles.easierHelperLink}
                                        onPress={() => setShowEasierHelperModal(true)}
                                    >
                                        <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                                        <Text style={styles.easierHelperLinkText}>How to make it easier</Text>
                                    </Pressable>
                                )}
                            </View>

                            <View style={styles.visualAreaWrapper}>
                                {(() => {
                                    const isSpecialOutdoorLevel = sessionId === 'outdoor_confidence_reset' && 
                                        currentStepIndex === 3 && 
                                        (selectedLevelId === 'hundred_steps' || selectedLevelId === 'ten_min_walk');

                                    const hasValidDuration = currentStep?.durationSeconds > 0;

                                    if (isSpecialOutdoorLevel) {
                                        return (
                                            <View style={styles.timerWrapper} testID="session-step-timer">
                                                <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                                                <Text style={styles.timerText}>Keep it short and easy today.</Text>
                                            </View>
                                        );
                                    }

                                    if (hasValidDuration && timeLeft > 0) {
                                        return (
                                            <View style={styles.timerWrapper} testID="session-step-timer">
                                                <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                                                <Text style={styles.timerText}>
                                                    {timeLeft > 60
                                                        ? `Suggested time: about ${Math.ceil(timeLeft / 60)} min`
                                                        : `Suggested time: about ${timeLeft} sec`}
                                                </Text>
                                            </View>
                                        );
                                    }

                                    return null;
                                })()}

                                <View style={[styles.visualArea, { height: sessionId === 'outdoor_confidence_reset' ? 100 : 220 }]}>
                                    {/* focus-pulse-circle is disabled by default */}
                                    {isPaused && (
                                        <View style={styles.pausedOverlay}>
                                            <Ionicons name="pause" size={48} color={COLORS.primary} />
                                            <Text style={styles.pausedText}>Paused</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </ScrollView>

                        <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                            {showAudioControls ? (
                                <View style={styles.controlGrid}>
                                    <Pressable
                                        style={styles.controlToggle}
                                        onPress={() => setAudioEnabled(!audioEnabled)}
                                    >
                                        <Ionicons
                                            name={audioEnabled ? "volume-medium" : "volume-mute"}
                                            size={18}
                                            color={audioEnabled ? COLORS.primary : COLORS.textSecondary}
                                        />
                                        <View>
                                            <Text style={[styles.controlLabel, !audioEnabled && { color: COLORS.textSecondary }]}>Sound</Text>
                                            <Text style={[styles.controlState, !audioEnabled && { color: COLORS.textSecondary }]}>{audioEnabled ? 'On' : 'Off'}</Text>
                                        </View>
                                    </Pressable>

                                    <Pressable
                                        style={styles.controlToggle}
                                        onPress={toggleRepeat}
                                    >
                                        <Ionicons
                                            name="refresh"
                                            size={18}
                                            color={repeatEnabled ? COLORS.primary : COLORS.textSecondary}
                                        />
                                        <View>
                                            <Text style={[styles.controlLabel, !repeatEnabled && { color: COLORS.textSecondary }]}>Repeat</Text>
                                            <Text style={[styles.controlState, !repeatEnabled && { color: COLORS.textSecondary }]}>{repeatEnabled ? 'On' : 'Off'}</Text>
                                        </View>
                                    </Pressable>

                                    <Pressable
                                        style={styles.controlToggle}
                                        onPress={handleNext}
                                    >
                                        <Ionicons name="play-skip-forward" size={18} color={COLORS.primary} />
                                        <View>
                                            <Text style={styles.controlLabel}>Next</Text>
                                            <Text style={styles.controlState}>Sound</Text>
                                        </View>
                                    </Pressable>

                                    <Pressable
                                        style={styles.controlToggle}
                                        onPress={togglePause}
                                    >
                                        <Ionicons name={isPaused ? "play" : "pause"} size={18} color={COLORS.primary} />
                                        <View>
                                            <Text style={styles.controlLabel}>{isPaused ? 'Resume' : 'Pause'}</Text>
                                        </View>
                                    </Pressable>
                                </View>
                            ) : (
                                <View style={styles.controlGrid}>
                                    <Pressable
                                        style={[styles.controlToggle, { width: '97%', justifyContent: 'center', alignItems: 'center' }]}
                                        onPress={togglePause}
                                    >
                                        <Ionicons name={isPaused ? "play" : "pause"} size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                                        <View>
                                            <Text style={styles.controlLabel}>{isPaused ? 'Resume' : 'Pause'}</Text>
                                        </View>
                                    </Pressable>
                                </View>
                            )}

                            <View style={styles.stepControlsRow}>
                                <Pressable
                                    style={[styles.stepNavBtn, currentStepIndex === 0 && styles.stepNavBtnDisabled]}
                                    disabled={currentStepIndex === 0}
                                    onPress={handlePrevStep}
                                >
                                    <Ionicons name="chevron-back" size={18} color={currentStepIndex === 0 ? '#A1B1B8' : COLORS.primary} />
                                    <Text style={[styles.stepNavBtnText, currentStepIndex === 0 && { color: '#A1B1B8' }]}>Previous</Text>
                                </Pressable>

                                <Pressable style={styles.primaryActionBtn} onPress={handleNextStep}>
                                    <Text style={styles.primaryActionBtnText}>
                                        {currentStepIndex < steps.length - 1 ? 'Next Step' : 'Finish Session'}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={18} color="#fff" />
                                </Pressable>
                            </View>

                            <Pressable style={styles.endSessionBtn} onPress={handleEndSession}>
                                <Text style={styles.endSessionText}>End Session</Text>
                            </Pressable>
                        </View>
                    </View>
                )}
            </View>

            <Modal visible={showHint} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIcon}><Ionicons name="eye-outline" size={40} color={COLORS.primary} /></View>
                        <Text style={styles.modalTitle}>Calm visual guide</Text>
                        <Text style={styles.modalBody}>Use the circle as a soft visual anchor while you follow the steps.</Text>
                        <Pressable style={styles.modalBtn} onPress={dismissHint}>
                            <Text style={styles.modalBtnText}>Got it</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <Modal visible={showNextStepPrompt} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={[styles.modalIcon, { backgroundColor: '#E0F2FE' }]}>
                            <Ionicons name="notifications-outline" size={40} color={COLORS.primary} />
                        </View>
                        <Text style={styles.modalTitle}>Ready for the next step?</Text>
                        <Text style={styles.modalBody}>You can continue, or stay here a little longer if your dog needs more time.</Text>

                        <View style={{ width: '100%', gap: 12 }}>
                            <Pressable style={styles.modalBtn} onPress={handleNextStep}>
                                <Text style={styles.modalBtnText}>Next Step</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.border }]}
                                onPress={() => setShowNextStepPrompt(false)}
                            >
                                <Text style={[styles.modalBtnText, { color: COLORS.textSecondary }]}>Stay Here</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={!!showSafetyNotice} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={[styles.modalIcon, showSafetyNotice?.type === 'medical' ? { backgroundColor: '#FEE2E2' } : { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons
                                name={showSafetyNotice?.type === 'medical' ? "medical-outline" : "alert-circle-outline"}
                                size={40}
                                color={showSafetyNotice?.type === 'medical' ? "#EF4444" : "#D97706"}
                            />
                        </View>
                        <Text style={styles.modalTitle}>{showSafetyNotice?.title}</Text>
                        <Text style={styles.modalBody}>{showSafetyNotice?.body}</Text>

                        <View style={{ width: '100%', gap: 12 }}>
                            {showSafetyNotice?.type === 'behavioral' && (
                                <Pressable
                                    style={styles.modalBtn}
                                    onPress={() => {
                                        setShowSafetyNotice(null);
                                        navigation.navigate('SessionPreview', { sessionId: 'daily_calm_reset', petId });
                                    }}
                                >
                                    <Text style={styles.modalBtnText}>{SEVERE_SIGN_LOGIC.behavioral.primaryCTA}</Text>
                                </Pressable>
                            )}
                            <Pressable
                                style={[styles.modalBtn, showSafetyNotice?.type === 'medical' ? { backgroundColor: '#EF4444' } : { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.border }]}
                                onPress={() => {
                                    setShowSafetyNotice(null);
                                    if (showSafetyNotice?.type === 'medical' && SEVERE_SIGN_LOGIC.medical.blockStart) {
                                        navigation.goBack();
                                    } else {
                                        navigation.goBack();
                                    }
                                }}
                            >
                                <Text style={[styles.modalBtnText, showSafetyNotice?.type !== 'medical' && { color: COLORS.textSecondary }]}>
                                    {showSafetyNotice?.type === 'medical' ? SEVERE_SIGN_LOGIC.medical.primaryCTA : SEVERE_SIGN_LOGIC.behavioral.secondaryCTA}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={showFinalSafetyPrompt} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={[styles.modalIcon, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="leaf-outline" size={40} color="#D97706" />
                        </View>
                        <Text style={styles.modalTitle}>{IN_SESSION_SAFETY_PROMPT.title}</Text>
                        <Text style={styles.modalBody}>
                            {sessionId === 'outdoor_confidence_reset'
                                ? "Recent check-ins show stronger stress signs. We suggest returning to an easier level next time. Move at your dog's pace."
                                : IN_SESSION_SAFETY_PROMPT.body
                            }
                        </Text>

                        <Pressable style={styles.modalBtn} onPress={() => navigation.navigate('Dashboard')}>
                            <Text style={styles.modalBtnText}>{IN_SESSION_SAFETY_PROMPT.primaryCTA}</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Easier setup helper modal */}
            <Modal visible={showEasierHelperModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={[styles.modalIcon, { backgroundColor: '#E0F2FE' }]}>
                            <Ionicons name="information-circle-outline" size={40} color={COLORS.primary} />
                        </View>
                        <Text style={styles.modalTitle}>How to make it easier</Text>
                        <ScrollView style={{ width: '100%', maxHeight: 220, marginBottom: 20 }} showsVerticalScrollIndicator={true}>
                            {[
                                "Move farther from the door or exit.",
                                "Practice with the door closed first.",
                                "Open the door only a crack.",
                                "Stay inside and only look toward the exit.",
                                "Choose a quieter time of day.",
                                "Use a calmer hallway, porch, yard, or building exit.",
                                "Shorten the session to 10–20 seconds.",
                                "End while your dog can still recover."
                            ].map((item, index) => (
                                <View key={index} style={styles.helperItemRow}>
                                    <Text style={styles.helperItemDot}>•</Text>
                                    <Text style={styles.helperItemText}>{item}</Text>
                                </View>
                            ))}
                        </ScrollView>
                        <Pressable style={styles.modalBtn} onPress={() => setShowEasierHelperModal(false)}>
                            <Text style={styles.modalBtnText}>Got it</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Outdoor Confidence progression prompt */}
            <Modal visible={showMilestonePrompt} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { maxHeight: '90%', width: '90%', padding: 20 }]}>
                        {!milestoneExplanation ? (
                            <>
                                <View style={[styles.modalIcon, { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E6F7F2', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }]}>
                                    <Ionicons name="trophy-outline" size={22} color={COLORS.primary} />
                                </View>
                                <Text style={[styles.modalTitle, { fontSize: 18, marginBottom: 6 }]}>What did your dog manage today?</Text>
                                <Text style={[styles.modalBody, { fontSize: 13, marginBottom: 8 }]}>
                                    Choose everything your dog managed. You can always repeat easier steps.
                                </Text>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, alignSelf: 'flex-start' }}>
                                    Choose all that apply.
                                </Text>

                                <ScrollView
                                    style={{ width: '100%', maxHeight: 320, marginBottom: 16 }}
                                    showsVerticalScrollIndicator={true}
                                >
                                    {MILESTONE_OPTIONS.map((opt) => {
                                        const isSelected = selectedMilestones.includes(opt.id);
                                        return (
                                            <Pressable
                                                key={opt.id}
                                                style={[
                                                    styles.milestoneOption,
                                                    isSelected && styles.milestoneOptionSelected
                                                ]}
                                                onPress={() => handleToggleMilestone(opt.id)}
                                            >
                                                <Ionicons 
                                                    name={isSelected ? "checkbox" : "square-outline"} 
                                                    size={20} 
                                                    color={isSelected ? "#fff" : COLORS.textSecondary} 
                                                    style={{ marginRight: 10 }}
                                                />
                                                <Text style={[
                                                    styles.milestoneOptionText,
                                                    isSelected && styles.milestoneOptionTextSelected
                                                ]}>{opt.label}</Text>
                                            </Pressable>
                                        );
                                    })}
                                </ScrollView>

                                <View style={{ width: '100%', gap: 10 }}>
                                    <Pressable
                                        style={[styles.modalBtn, selectedMilestones.length === 0 && { opacity: 0.5 }]}
                                        disabled={selectedMilestones.length === 0}
                                        onPress={async () => {
                                            if (selectedMilestones.length === 0) return;
                                            await saveSession(false, selectedMilestones);
                                        }}
                                    >
                                        <Text style={styles.modalBtnText}>Save Progress</Text>
                                    </Pressable>
                                    <Pressable style={styles.modalSkipBtn} onPress={() => {
                                        setShowMilestonePrompt(false);
                                        setMilestoneExplanation(null);
                                        setSelectedMilestones([]);
                                        navigation.navigate('Dashboard');
                                    }}>
                                        <Text style={styles.modalSkipBtnText}>Skip</Text>
                                    </Pressable>
                                </View>
                            </>
                        ) : (
                            <>
                                <View style={[styles.modalIcon, { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E6F7F2', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }]}>
                                    <Ionicons name="star-outline" size={22} color={COLORS.primary} />
                                </View>
                                <Text style={[styles.modalTitle, { fontSize: 18, marginBottom: 12 }]}>{milestoneExplanation.title}</Text>
                                <Text style={[styles.modalBody, { fontSize: 14, marginBottom: 20 }]}>
                                    {milestoneExplanation.body}
                                </Text>

                                <View style={{ width: '100%', gap: 12 }}>
                                    <Pressable
                                        style={styles.modalBtn}
                                        onPress={() => {
                                            handleCTANavigation(milestoneExplanation.primaryCTA);
                                        }}
                                    >
                                        <Text style={styles.modalBtnText}>{milestoneExplanation.primaryCTA}</Text>
                                    </Pressable>
                                    {milestoneExplanation.secondaryCTA && (
                                        <Pressable
                                            style={[styles.modalBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.border }]}
                                            onPress={() => {
                                                handleCTANavigation(milestoneExplanation.secondaryCTA!);
                                            }}
                                        >
                                            <Text style={[styles.modalBtnText, { color: COLORS.textSecondary }]}>{milestoneExplanation.secondaryCTA}</Text>
                                        </Pressable>
                                    )}
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {isSaving && (
                <View style={styles.saveOverlay}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.saveText}>Saving Session...</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F6FAF8' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
    closeButton: { padding: 4 },
    progressContainer: { flex: 1, gap: 4 },
    progressBarBg: { height: 6, backgroundColor: '#E3ECEF', borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: COLORS.primary },
    progressText: { ...FONTS.tiny, color: COLORS.textSecondary, fontWeight: '600' },

    checkinScroll: { padding: 20, paddingBottom: 40 },
    checkinTitle: { ...FONTS.h2, color: COLORS.text, textAlign: 'center', marginBottom: 8 },
    checkinSubtitle: { ...FONTS.body, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 32 },
    levelContainer: { flexDirection: 'row', gap: 8, marginBottom: 32 },
    levelButton: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    levelLabel: { ...FONTS.small, fontWeight: '700', color: COLORS.textSecondary },
    signsTitle: { ...FONTS.body, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
    signsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
    signChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border },
    signChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    signText: { ...FONTS.small, color: COLORS.textSecondary },
    signTextSelected: { color: '#fff', fontWeight: '600' },

    positiveSignChipSelected: { backgroundColor: '#10B981', borderColor: '#10B981' },
    positiveSignTextSelected: { color: '#fff', fontWeight: '600' },
    checkinNextButton: { backgroundColor: COLORS.primary, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
    checkinNextText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    skipButton: { marginTop: 16, alignSelf: 'center', padding: 10 },
    skipText: { ...FONTS.body, color: COLORS.textSecondary },

    activeSessionArea: { flex: 1 },
    activeSessionScroll: { flexGrow: 1, justifyContent: 'space-between', paddingVertical: 10 },
    stepInfo: { paddingHorizontal: 30, alignItems: 'center', marginTop: 10 },
    sessionStepTitle: { ...FONTS.tiny, color: COLORS.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    selectedLevelBadge: {
        backgroundColor: '#E6F7F2',
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: 'bold',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    stepTitle: { ...FONTS.h2, color: '#17212F', textAlign: 'center', marginBottom: 12 },
    stepInstruction: { ...FONTS.body, color: '#52616B', textAlign: 'center', lineHeight: 24 },

    visualAreaWrapper: { alignItems: 'center', gap: 12 },
    timerWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DDF4EF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    timerText: { ...FONTS.small, color: COLORS.primary, fontWeight: '600' },
    visualArea: { height: 220, width: 220, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    mainCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#0F8A7A', opacity: 0.15 },
    pausedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(246, 250, 248, 0.8)', justifyContent: 'center', alignItems: 'center', borderRadius: 110 },
    pausedText: { ...FONTS.small, fontWeight: '700', color: COLORS.primary, marginTop: 4 },

    stickyFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#F6FAF8',
        paddingTop: 12,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        alignItems: 'center',
        gap: 12,
    },
    controls: { paddingHorizontal: 20, alignItems: 'center', gap: 12, paddingBottom: 20 },
    controlGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%', justifyContent: 'center' },
    controlToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '47%', minHeight: 52, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff', borderRadius: 24, ...SHADOWS.small },
    controlLabel: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
    controlState: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary },

    primaryActionBtn: { flex: 2, backgroundColor: COLORS.primary, height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...SHADOWS.medium },
    primaryActionBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

    endSessionBtn: { padding: 12 },
    endSessionText: { ...FONTS.body, color: '#B94A48', fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 30 },
    modalCard: { backgroundColor: '#fff', borderRadius: 24, padding: 30, alignItems: 'center', width: '100%', ...SHADOWS.large },
    modalIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#DDF4EF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    modalTitle: { ...FONTS.h2, color: COLORS.text, marginBottom: 12, textAlign: 'center' },
    modalBody: { ...FONTS.body, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 30 },
    modalBtn: { backgroundColor: COLORS.primary, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', width: '100%' },
    modalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },

    saveOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    saveText: { marginTop: 16, ...FONTS.body, color: COLORS.text },

    // Milestone selection options styling
    milestoneOption: {
        width: '100%',
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    milestoneOptionSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary
    },
    milestoneOptionText: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
        flex: 1
    },
    milestoneOptionTextSelected: {
        color: '#fff',
        fontWeight: '700'
    },
    stepControlsRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    stepNavBtn: {
        flex: 1,
        height: 56,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    stepNavBtnDisabled: {
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
    },
    stepNavBtnText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    modalSkipBtn: {
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        marginTop: 4,
    },
    modalSkipBtnText: {
        color: COLORS.textSecondary,
        fontWeight: '600',
        fontSize: 15,
        textAlign: 'center',
    },
    easierHelperLink: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        padding: 6,
    },
    easierHelperLinkText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    helperItemRow: {
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'flex-start',
        paddingHorizontal: 10,
        width: '100%',
    },
    helperItemDot: {
        fontSize: 16,
        color: COLORS.primary,
        marginRight: 8,
        lineHeight: 18,
    },
    helperItemText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        flex: 1,
        lineHeight: 20,
    },
    signHelperBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF8E8',
        borderWidth: 1,
        borderColor: '#F4D08A',
        borderRadius: 12,
        padding: 12,
        marginVertical: 12,
        width: '100%',
    },
    signHelperText: {
        flex: 1,
        fontSize: 13,
        color: '#9A5B00',
        fontWeight: '500',
        lineHeight: 18,
    },
    collapsibleSectionContainer: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 14,
        overflow: 'hidden',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    sectionHeaderCaution: {
        backgroundColor: '#FFF8E8',
        borderBottomColor: '#F4D08A',
    },
    sectionHeaderTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.text,
    },
    sectionHeaderTitleCaution: {
        color: '#9A5B00',
    },
    sectionHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    expandCollapseLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.primary,
    },
    expandCollapseLabelCaution: {
        color: '#9A5B00',
    },
    sectionContent: {
        padding: 16,
    },
    sectionContentCollapsed: {
        paddingTop: 0,
        paddingBottom: 14,
        paddingHorizontal: 16,
    },
    signsContainerCollapsed: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    signChipCollapsed: {
        backgroundColor: '#EEF2F6',
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#D2D9E2',
    },
    positiveSignChipCollapsed: {
        backgroundColor: '#ECFDF5',
        borderColor: '#A7F3D0',
    },
    signTextCollapsed: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    positiveSignTextCollapsed: {
        color: '#065F46',
    },
    outdoorProgressSubText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#0F766E',
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dynamicStepHeader: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0F766E',
        backgroundColor: '#EEF8F6',
        borderColor: '#CDECE5',
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 12,
        alignSelf: 'flex-start',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
