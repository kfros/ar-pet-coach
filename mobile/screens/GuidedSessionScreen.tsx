import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Easing, ActivityIndicator, Dimensions, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import { useSubscription } from '../components/SubscriptionManager';
import SessionService from '../services/sessionService';
import { useCalmAudio } from '../hooks/useCalmAudio';
import { Session, SessionStep, AnxietyLevel, AnxietySign, PositiveSign, CheckIn } from '../types/Session';
import { 
    MEDICAL_SEVERE_SIGNS, 
    BEHAVIORAL_SEVERE_SIGNS, 
    SEVERE_SIGN_LOGIC,
    IN_SESSION_SAFETY_PROMPT
} from '../appContent/routineSafety';
import { calculateCheckinScore } from '../services/progressScoring';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

export default function GuidedSessionScreen({ navigation, route }: any) {
    const { sessionId, petId } = route.params;
    const session = SessionService.getSessionById(sessionId);
    const { trackCalmingSession } = useSubscription();

    const [phase, setPhase] = useState<'before_checkin' | 'active' | 'after_checkin'>('before_checkin');
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [repeatEnabled, setRepeatEnabled] = useState(false);
    const [showHint, setShowHint] = useState(false);

    // Audio Hook
    const { isPlaying, stopAudio, handleNext, pauseAudio, resumeAudio } = useCalmAudio(phase === 'active' && audioEnabled);
    const wasSoundPlayingBeforePause = useRef(false);
    const [beforeLevel, setBeforeLevel] = useState<AnxietyLevel | null>(null);
    const [beforeSigns, setBeforeSigns] = useState<AnxietySign[]>([]);
    const [afterLevel, setAfterLevel] = useState<AnxietyLevel | null>(null);
    const [afterSigns, setAfterSigns] = useState<AnxietySign[]>([]);
    const [afterPositiveSigns, setAfterPositiveSigns] = useState<PositiveSign[]>([]);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const dimAnim = useRef(new Animated.Value(0)).current;
    const timerRef = useRef<any>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [showNextStepPrompt, setShowNextStepPrompt] = useState(false);
    const [showSafetyNotice, setShowSafetyNotice] = useState<{ title: string, body: string, type: 'medical' | 'behavioral' } | null>(null);
    const [showFinalSafetyPrompt, setShowFinalSafetyPrompt] = useState(false);

    const steps = session?.steps || [];
    const currentStep = steps[currentStepIndex];

    useEffect(() => {
        const loadSettings = async () => {
            const hintDismissed = await AsyncStorage.getItem(HINT_STORAGE_KEY);
            const repeatOn = await AsyncStorage.getItem(REPEAT_STORAGE_KEY);
            if (!hintDismissed) setShowHint(true);
            if (repeatOn === 'true') setRepeatEnabled(true);
        };
        loadSettings();
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
        setTimeLeft(step.durationSeconds);
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
            startPulsing(isNewStep);
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

    const toggleSign = (sign: AnxietySign, isBefore: boolean) => {
        const current = isBefore ? beforeSigns : afterSigns;
        const setter = isBefore ? setBeforeSigns : setAfterSigns;
        if (current.includes(sign)) {
            setter(current.filter(s => s !== sign));
        } else {
            const newSigns = [...current, sign];
            setter(newSigns);

            // GFM-005: Severe sign logic
            if (isBefore && session?.severeNoticeEnabled) {
                const hasMedical = newSigns.some(s => MEDICAL_SEVERE_SIGNS.includes(s));
                const hasBehavioral = newSigns.some(s => BEHAVIORAL_SEVERE_SIGNS.includes(s));

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

    const togglePositiveSign = (sign: PositiveSign) => {
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

    const saveSession = async (stoppedEarly = false) => {
        if (!session) return;
        setIsSaving(true);

        const beforeCheckin: CheckIn = {
            id: `before_${Date.now()}`,
            petId,
            sessionId,
            timestamp: new Date().toISOString(),
            phase: 'before',
            overallLevel: beforeLevel || 'calm',
            selectedSigns: beforeSigns
        };

        const afterCheckin: CheckIn = {
            id: `after_${Date.now()}`,
            petId,
            sessionId,
            timestamp: new Date().toISOString(),
            phase: 'after',
            overallLevel: afterLevel || 'calm',
            selectedSigns: afterSigns,
            positiveSigns: afterPositiveSigns
        };

        try {
            const result = await SessionService.saveSessionHistory({
                id: `session_${Date.now()}`,
                petId,
                sessionId,
                completedAt: new Date().toISOString(),
                durationSeconds: steps.slice(0, currentStepIndex + 1).reduce((acc, s) => acc + s.durationSeconds, 0),
                completed: !stoppedEarly,
                stoppedEarly: stoppedEarly,
                beforeCheckin: beforeLevel ? beforeCheckin : undefined,
                afterCheckin: !stoppedEarly && afterLevel ? afterCheckin : undefined
            });

            await trackCalmingSession();

            // Check if we should show safety prompt
            const scoreResult = calculateCheckinScore(afterCheckin);
            const prevScore = beforeLevel ? calculateCheckinScore(beforeCheckin) : null;
            const worsened = prevScore !== null && (scoreResult.score - prevScore.score) >= 2;
            const hasAfterSevere = afterSigns.some(s => MEDICAL_SEVERE_SIGNS.includes(s) || BEHAVIORAL_SEVERE_SIGNS.includes(s));

            if (!stoppedEarly && (worsened || hasAfterSevere)) {
                setShowFinalSafetyPrompt(true);
            } else {
                navigation.replace('Dashboard');
            }
        } catch (error) {
            console.error('Error saving session:', error);
            navigation.replace('Dashboard');
        } finally {
            setIsSaving(false);
        }
    };

    const renderCheckin = (isBefore: boolean) => {
        const level = isBefore ? beforeLevel : afterLevel;
        const setLevel = isBefore ? setBeforeLevel : setAfterLevel;
        const signs = isBefore ? beforeSigns : afterSigns;

        return (
            <ScrollView contentContainerStyle={styles.checkinScroll}>
                <Text style={styles.checkinTitle}>{isBefore ? 'Calm Check-In' : 'After-Session Check-In'}</Text>
                <Text style={styles.checkinSubtitle}>{isBefore ? 'How is your dog right now?' : 'How is your dog after the routine?'}</Text>

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

                <Text style={styles.signsTitle}>Signs Noted (optional)</Text>
                <View style={styles.signsContainer}>
                    {ANXIETY_SIGNS.map((sign) => (
                        <Pressable
                            key={sign.id}
                            style={[
                                styles.signChip,
                                signs.includes(sign.id) && styles.signChipSelected
                            ]}
                            onPress={() => toggleSign(sign.id, isBefore)}
                        >
                            <Text style={[styles.signText, signs.includes(sign.id) && styles.signTextSelected]}>{sign.label}</Text>
                        </Pressable>
                    ))}
                </View>

                {!isBefore && (
                    <>
                        <Text style={styles.signsTitle}>Positive Signs (optional)</Text>
                        <View style={styles.signsContainer}>
                            {POSITIVE_SIGNS.map((sign) => (
                                <Pressable
                                    key={sign.id}
                                    style={[
                                        styles.signChip,
                                        afterPositiveSigns.includes(sign.id) && styles.positiveSignChipSelected
                                    ]}
                                    onPress={() => togglePositiveSign(sign.id)}
                                >
                                    <Text style={[styles.signText, afterPositiveSigns.includes(sign.id) && styles.positiveSignTextSelected]}>{sign.label}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </>
                )}

                <Pressable
                    style={styles.checkinNextButton}
                    onPress={() => {
                        if (isBefore) {
                            if (showSafetyNotice?.type === 'medical' && SEVERE_SIGN_LOGIC.medical.blockStart) {
                                // Blocked
                                return;
                            }
                            setPhase('active');
                        } else {
                            saveSession();
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
                        <Text style={styles.progressText}>Step {currentStepIndex + 1} of {steps.length}</Text>
                    </View>
                )}
                <View style={{ width: 28 }} />
            </View>

            <View style={{ flex: 1 }}>
                {phase === 'before_checkin' && renderCheckin(true)}
                {phase === 'after_checkin' && renderCheckin(false)}

                {phase === 'active' && currentStep && (
                    <ScrollView 
                        style={styles.activeSessionArea}
                        contentContainerStyle={styles.activeSessionScroll}
                    >
                        <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', opacity: dimAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }) }]} />

                        <View style={styles.stepInfo}>
                            <Text style={styles.sessionStepTitle}>{session.title}</Text>
                            <Text style={styles.stepTitle}>{currentStep.title}</Text>
                            <Text style={styles.stepInstruction}>{currentStep.instruction}</Text>
                        </View>

                        <View style={styles.visualAreaWrapper}>
                            <View style={styles.timerWrapper} testID="session-step-timer">
                                <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                                <Text style={styles.timerText}>
                                    Suggested time: about {timeLeft > 60 ? `${Math.ceil(timeLeft / 60)} min` : `${timeLeft} sec`}
                                </Text>
                            </View>

                            <View style={styles.visualArea}>
                                <Animated.View
                                    testID="focus-pulse-circle"
                                    style={[
                                        styles.mainCircle,
                                        { transform: [{ scale: pulseAnim }], opacity: opacityAnim }
                                    ]}
                                />
                                {isPaused && (
                                    <View style={styles.pausedOverlay}>
                                        <Ionicons name="pause" size={48} color={COLORS.primary} />
                                        <Text style={styles.pausedText}>Paused</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.controls}>
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

                            <Pressable style={styles.primaryActionBtn} onPress={handleNextStep}>
                                <Text style={styles.primaryActionBtnText}>
                                    {currentStepIndex < steps.length - 1 ? 'Next Step' : 'Finish Session'}
                                </Text>
                                <Ionicons name="chevron-forward" size={18} color="#fff" />
                            </Pressable>

                            <Pressable style={styles.endSessionBtn} onPress={handleEndSession}>
                                <Text style={styles.endSessionText}>End Session</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
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
                                    onPress={() => setShowSafetyNotice(null)}
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
                                        // End session for behavioral secondary
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
                        <Text style={styles.modalBody}>{IN_SESSION_SAFETY_PROMPT.body}</Text>

                        <Pressable style={styles.modalBtn} onPress={() => navigation.replace('Dashboard')}>
                            <Text style={styles.modalBtnText}>{IN_SESSION_SAFETY_PROMPT.primaryCTA}</Text>
                        </Pressable>
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
    stepTitle: { ...FONTS.h2, color: '#17212F', textAlign: 'center', marginBottom: 12 },
    stepInstruction: { ...FONTS.body, color: '#52616B', textAlign: 'center', lineHeight: 24 },

    visualAreaWrapper: { alignItems: 'center', gap: 12 },
    timerWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DDF4EF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    timerText: { ...FONTS.small, color: COLORS.primary, fontWeight: '600' },
    visualArea: { height: 220, width: 220, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    mainCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#0F8A7A', opacity: 0.15 },
    pausedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(246, 250, 248, 0.8)', justifyContent: 'center', alignItems: 'center', borderRadius: 110 },
    pausedText: { ...FONTS.small, fontWeight: '700', color: COLORS.primary, marginTop: 4 },

    controls: { paddingHorizontal: 20, alignItems: 'center', gap: 12, paddingBottom: 20 },
    controlGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%', justifyContent: 'center' },
    controlToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '47%', minHeight: 52, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff', borderRadius: 24, ...SHADOWS.small },
    controlLabel: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
    controlState: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary },

    primaryActionBtn: { backgroundColor: COLORS.primary, width: '100%', height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...SHADOWS.medium },
    primaryActionBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

    endSessionBtn: { padding: 12 },
    endSessionText: { ...FONTS.body, color: '#B94A48', fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 30 },
    modalCard: { backgroundColor: '#fff', borderRadius: 24, padding: 30, alignItems: 'center', width: '100%', ...SHADOWS.large },
    modalIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#DDF4EF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    modalTitle: { ...FONTS.h2, color: COLORS.text, marginBottom: 12 },
    modalBody: { ...FONTS.body, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 30 },
    modalBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 25 },
    modalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    saveOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    saveText: { marginTop: 16, ...FONTS.body, color: COLORS.text }
});
