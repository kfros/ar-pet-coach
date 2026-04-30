import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Easing, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import { useSubscription } from '../components/SubscriptionManager';
import SessionService from '../services/sessionService';
import { useCalmAudio } from '../hooks/useCalmAudio';
import { Session, SessionStep, AnxietyLevel, AnxietySign, CheckIn } from '../types/Session';

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
    { id: 'bolting_or_escape_attempts', label: 'Trying to Escape' },
    { id: 'not_accepting_treats', label: 'Refusing Treats' },
    { id: 'other', label: 'Other' }
];

export default function GuidedSessionScreen({ navigation, route }: any) {
    const { sessionId, petId } = route.params;
    const session = SessionService.getSessionById(sessionId);
    const { trackCalmingSession } = useSubscription();

    const [phase, setPhase] = useState<'before_checkin' | 'active' | 'after_checkin'>('before_checkin');
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(true);
    
    // Audio Hook
    const { isPlaying, stopAudio } = useCalmAudio(phase === 'active' && audioEnabled);
    const [beforeLevel, setBeforeLevel] = useState<AnxietyLevel | null>(null);
    const [beforeSigns, setBeforeSigns] = useState<AnxietySign[]>([]);
    const [afterLevel, setAfterLevel] = useState<AnxietyLevel | null>(null);
    const [afterSigns, setAfterSigns] = useState<AnxietySign[]>([]);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const dimAnim = useRef(new Animated.Value(0)).current;
    const timerRef = useRef<any>(null);
    const [isPaused, setIsPaused] = useState(false);

    const steps = session?.steps || [];
    const currentStep = steps[currentStepIndex];

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
        
        // Reset animations
        pulseAnim.setValue(1);
        dimAnim.setValue(0);

        // Start Visual Cues
        if (step.visualCue === 'pulse') {
            startPulsing();
        } else if (step.visualCue === 'dim') {
            Animated.timing(dimAnim, { toValue: 1, duration: 2000, useNativeDriver: true }).start();
        }

        // Start Timer
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            if (isPausedRef.current) return; // Respect pause state
            
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleNextStep();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const startPulsing = () => {
        Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(pulseAnim, { toValue: 1.04, duration: 1300, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
                    Animated.timing(opacityAnim, { toValue: 1.0, duration: 1300, useNativeDriver: true, easing: Easing.inOut(Easing.sin) })
                ]),
                Animated.parallel([
                    Animated.timing(pulseAnim, { toValue: 0.96, duration: 1300, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
                    Animated.timing(opacityAnim, { toValue: 0.82, duration: 1300, useNativeDriver: true, easing: Easing.inOut(Easing.sin) })
                ])
            ])
        ).start();
    };

    useEffect(() => {
        if (isPaused) {
            pulseAnim.stopAnimation();
            opacityAnim.stopAnimation();
        } else if (phase === 'active' && currentStep?.visualCue === 'pulse') {
            startPulsing();
        }
    }, [isPaused, phase, currentStepIndex]);

    const handleNextStep = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            setPhase('after_checkin');
        }
    };

    const togglePause = () => {
        setIsPaused(!isPaused);
    };

    const handleEndSession = () => {
        Alert.alert(
            "End Session?",
            "Your progress so far will be saved.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "End", style: "destructive", onPress: () => setPhase('after_checkin') }
            ]
        );
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
            setter([...current, sign]);
        }
    };

    const saveSession = async () => {
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
            selectedSigns: afterSigns
        };

        try {
            await SessionService.saveSessionHistory({
                id: `session_${Date.now()}`,
                petId,
                sessionId,
                completedAt: new Date().toISOString(),
                durationSeconds: steps.reduce((acc, s) => acc + s.durationSeconds, 0),
                completed: true,
                stoppedEarly: false,
                beforeCheckin: beforeLevel ? beforeCheckin : undefined,
                afterCheckin: afterLevel ? afterCheckin : undefined
            });

            await trackCalmingSession();
            navigation.replace('Dashboard');
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
                <Text style={styles.checkinTitle}>{isBefore ? 'How is your dog right now?' : 'How is your dog after the session?'}</Text>
                <Text style={styles.checkinSubtitle}>Choose the overall level and any visible signs.</Text>

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

                <Text style={styles.signsTitle}>Visible Signs (optional)</Text>
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

                <Pressable
                    style={styles.checkinNextButton}
                    onPress={() => isBefore ? setPhase('active') : saveSession()}
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
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${((currentStepIndex + 1) / steps.length) * 100}%` }]} />
                    </View>
                )}
                <View style={{ width: 28 }} /> 
            </View>

            <View style={{ flex: 1 }}>
                {phase === 'before_checkin' && renderCheckin(true)}
                {phase === 'after_checkin' && renderCheckin(false)}
                
                {phase === 'active' && currentStep && (
                    <View style={styles.activeSessionArea}>
                        <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', opacity: dimAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }) }]} />
                        
                        <View style={styles.stepInfo}>
                            <Text style={styles.stepTitle}>{currentStep.title}</Text>
                            <Text style={styles.stepInstruction}>{currentStep.instruction}</Text>
                        </View>

                        <View style={styles.visualArea}>
                            <Animated.View style={[
                                styles.mainCircle,
                                { transform: [{ scale: pulseAnim }], opacity: opacityAnim }
                            ]} />
                            {currentStep.visualCue === 'reward' && (
                                <View style={styles.iconOverlay}>
                                    <Ionicons name="star" size={60} color="#fff" />
                                </View>
                            )}
                            {currentStep.visualCue === 'pause' && (
                                <View style={styles.iconOverlay}>
                                    <Ionicons name="pause" size={60} color="#fff" />
                                </View>
                            )}
                            <Text style={styles.timerLarge}>{timeLeft}s</Text>
                            {isPaused && (
                                <View style={styles.pausedOverlay}>
                                    <Ionicons name="pause" size={48} color={COLORS.primary} />
                                    <Text style={styles.pausedText}>Paused</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.controls}>
                            <View style={styles.controlRow}>
                                <Pressable 
                                    style={styles.audioToggle} 
                                    onPress={() => setAudioEnabled(!audioEnabled)}
                                >
                                    <Ionicons 
                                        name={audioEnabled ? "volume-medium" : "volume-mute"} 
                                        size={20} 
                                        color={audioEnabled ? COLORS.primary : COLORS.textSecondary} 
                                    />
                                    <Text style={[styles.audioText, !audioEnabled && { color: COLORS.textSecondary }]}>
                                        Background Sound: {audioEnabled ? 'On' : 'Off'}
                                    </Text>
                                </Pressable>

                                <Pressable 
                                    style={styles.pauseBtn} 
                                    onPress={togglePause}
                                >
                                    <Ionicons name={isPaused ? "play" : "pause"} size={20} color={COLORS.primary} />
                                    <Text style={styles.pauseBtnText}>{isPaused ? 'Resume' : 'Pause'}</Text>
                                </Pressable>
                            </View>

                            <Pressable style={styles.primaryActionBtn} onPress={handleNextStep}>
                                <Text style={styles.primaryActionBtnText}>Next Step</Text>
                                <Ionicons name="chevron-forward" size={18} color="#fff" />
                            </Pressable>

                            <Pressable style={styles.endSessionBtn} onPress={handleEndSession}>
                                <Text style={styles.endSessionText}>End Session</Text>
                            </Pressable>
                        </View>
                    </View>
                )}
            </View>

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
    container: { flex: 1, backgroundColor: COLORS.calmBg },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
    closeButton: { padding: 4 },
    progressBarBg: { flex: 1, height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: COLORS.primary },
    
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
    checkinNextButton: { backgroundColor: COLORS.primary, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
    checkinNextText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    skipButton: { marginTop: 16, alignSelf: 'center', padding: 10 },
    skipText: { ...FONTS.body, color: COLORS.textSecondary },

    activeSessionArea: { flex: 1, justifyContent: 'space-between', paddingVertical: 20 },
    stepInfo: { paddingHorizontal: 30, alignItems: 'center', marginTop: 20 },
    stepTitle: { ...FONTS.h1, color: '#17212F', textAlign: 'center', marginBottom: 12 },
    stepInstruction: { ...FONTS.body, color: '#52616B', textAlign: 'center', lineHeight: 26 },
    visualArea: { height: 260, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    mainCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#0F8A7A', opacity: 0.15 },
    iconOverlay: { position: 'absolute', opacity: 0.8 },
    timerLarge: { position: 'absolute', fontSize: 44, fontWeight: 'bold', color: '#0F8A7A' },
    pausedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(246, 250, 248, 0.8)', justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
    pausedText: { ...FONTS.h3, color: COLORS.primary, marginTop: 10 },
    
    controls: { paddingHorizontal: 30, alignItems: 'center', gap: 12, paddingBottom: 20 },
    controlRow: { flexDirection: 'row', gap: 10, width: '100%', justifyContent: 'center' },
    audioToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#fff', borderRadius: 20, ...SHADOWS.small },
    audioText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
    pauseBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#fff', borderRadius: 20, ...SHADOWS.small },
    pauseBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
    
    primaryActionBtn: { backgroundColor: COLORS.primary, width: '100%', height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...SHADOWS.medium },
    primaryActionBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    
    endSessionBtn: { padding: 12 },
    endSessionText: { ...FONTS.body, color: COLORS.error, fontWeight: '600' },
    
    saveOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    saveText: { marginTop: 16, ...FONTS.body, color: COLORS.text }
});
