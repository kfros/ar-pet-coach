import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import { useSubscription } from '../components/SubscriptionManager';
import { auth, db, firestore } from '../services/firebaseConfig';

const SESSION_STEPS = [
    {
        id: 'initial_checkin',
        title: 'How is your pet feeling?',
        subtitle: 'Select the current anxiety level',
        type: 'checkin'
    },
    {
        id: 'get_ready',
        title: 'Get Ready',
        subtitle: 'Find a quiet place for your pet to relax.',
        duration: 5,
        type: 'timer'
    },
    {
        id: 'gentle_breathing',
        title: 'Gentle Visual Guide',
        subtitle: 'Breathe slowly and follow the circle…',
        duration: 30,
        type: 'pulsing'
    },
    {
        id: 'final_checkin',
        title: 'How are they now?',
        subtitle: 'Select the new anxiety level',
        type: 'checkin'
    }
];

export default function GuidedSessionScreen({ navigation, route }: any) {
    const { trackCalmingSession } = useSubscription(); // We reuse trackARSession for metrics
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [anxietyBefore, setAnxietyBefore] = useState<number | null>(null);
    const [anxietyAfter, setAnxietyAfter] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const timerRef = useRef<any>(null);

    const currentStep = SESSION_STEPS[currentStepIndex];

    useEffect(() => {
        if (currentStep.type === 'timer' || currentStep.type === 'pulsing') {
            startTimer(currentStep.duration || 10);
        }
        
        if (currentStep.type === 'pulsing') {
            startPulsing();
        } else {
            pulseAnim.setValue(1);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [currentStepIndex]);

    const startTimer = (seconds: number) => {
        setTimeLeft(seconds);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleNext();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const startPulsing = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.4,
                    duration: 4000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 4000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const handleNext = () => {
        if (currentStepIndex < SESSION_STEPS.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            saveSession();
        }
    };

    const saveSession = async () => {
        setIsSaving(true);
        const user = auth().currentUser;
        const petId = route.params?.petId;

        try {
            if (user && petId) {
                await db.collection('users').doc(user.uid).collection('pets').doc(petId).collection('sessions').add({
                    type: 'guided_focus',
                    anxietyBefore,
                    anxietyAfter,
                    duration: 60, // approximate
                    timestamp: firestore.FieldValue.serverTimestamp(),
                });

                // Update pet's current anxiety score
                if (anxietyAfter !== null) {
                    await db.collection('users').doc(user.uid).collection('pets').doc(petId).update({
                        anxietyScore: anxietyAfter,
                        lastSessionAt: firestore.FieldValue.serverTimestamp()
                    });
                }
            }
            await trackCalmingSession(); // track for progress metrics
            navigation.replace('Dashboard');
        } catch (error) {
            console.error('Error saving session:', error);
            navigation.replace('Dashboard');
        } finally {
            setIsSaving(false);
        }
    };

    const renderCheckin = (isBefore: boolean) => (
        <View style={styles.checkinContainer}>
            <Text style={styles.stepTitle}>{currentStep.title}</Text>
            <Text style={styles.stepSubtitle}>{currentStep.subtitle}</Text>
            <View style={styles.scoreRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <Pressable
                        key={score}
                        style={[
                            styles.scoreButton,
                            (isBefore ? anxietyBefore : anxietyAfter) === score && styles.scoreButtonSelected
                        ]}
                        onPress={() => isBefore ? setAnxietyBefore(score) : setAnxietyAfter(score)}
                    >
                        <Text style={[
                            styles.scoreText,
                            (isBefore ? anxietyBefore : anxietyAfter) === score && styles.scoreTextSelected
                        ]}>{score}</Text>
                    </Pressable>
                ))}
            </View>
            <Pressable
                style={[
                    styles.primaryButton,
                    ((isBefore ? anxietyBefore : anxietyAfter) === null) && styles.buttonDisabled
                ]}
                disabled={(isBefore ? anxietyBefore : anxietyAfter) === null}
                onPress={handleNext}
            >
                <Text style={styles.primaryButtonText}>Continue</Text>
            </Pressable>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
                    <Ionicons name="close" size={28} color={COLORS.text} />
                </Pressable>
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${((currentStepIndex + 1) / SESSION_STEPS.length) * 100}%` }]} />
                </View>
            </View>

            <View style={styles.content}>
                {currentStep.type === 'checkin' && renderCheckin(currentStep.id === 'initial_checkin')}

                {(currentStep.type === 'timer' || currentStep.type === 'pulsing') && (
                    <View style={styles.sessionArea}>
                        <Text style={styles.stepTitle}>{currentStep.title}</Text>
                        <Text style={styles.stepSubtitle}>{currentStep.subtitle}</Text>
                        
                        <View style={styles.visualContainer}>
                            <Animated.View style={[
                                styles.pulseCircle,
                                { transform: [{ scale: pulseAnim }] }
                            ]} />
                            {currentStep.type === 'timer' && (
                                <Text style={styles.timerText}>{timeLeft}</Text>
                            )}
                        </View>
                    </View>
                )}
            </View>

            {isSaving && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.overlayText}>Saving progress...</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundLight,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        gap: 20,
    },
    closeButton: {
        padding: 5,
    },
    progressContainer: {
        flex: 1,
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    checkinContainer: {
        alignItems: 'center',
    },
    stepTitle: {
        ...FONTS.h2,
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 10,
    },
    stepSubtitle: {
        ...FONTS.body,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 40,
    },
    scoreRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 40,
    },
    scoreButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    scoreButtonSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    scoreText: {
        ...FONTS.body,
        color: COLORS.text,
    },
    scoreTextSelected: {
        color: '#fff',
        fontWeight: 'bold',
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        width: '100%',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    sessionArea: {
        alignItems: 'center',
    },
    visualContainer: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
    },
    pulseCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.primary,
        opacity: 0.2,
        position: 'absolute',
    },
    timerText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayText: {
        marginTop: 10,
        ...FONTS.body,
        color: COLORS.text,
    }
});
