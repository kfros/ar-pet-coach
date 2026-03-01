import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Ionicons } from '@expo/vector-icons';
import { auth, storage, db } from '../services/firebaseConfig';
import { ref, uploadBytes } from 'firebase/storage';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, limit, getDocs } from 'firebase/firestore';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSpring, useReducedMotion } from 'react-native-reanimated';
import { COLORS, FONTS, SHADOWS } from '../constants/Theme';

// Initialize Gemini
// Note: In a real app, use a secure backend proxy or Firebase Functions to hide this key.
// Using EXPO_PUBLIC_GEMINI_API_KEY from env for this MVP.
const GEN_AI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEN_AI_KEY);

const PulsingMicrophone = ({ isRecording, analyzing, onPress }: any) => {
    const reducedMotion = useReducedMotion();
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.2);

    useEffect(() => {
        if (isRecording && !reducedMotion) {
            scale.value = withRepeat(withTiming(1.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }), -1, true);
            opacity.value = withRepeat(withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }), -1, true);
        } else {
            scale.value = withTiming(1);
            opacity.value = withTiming(0);
        }
    }, [isRecording, reducedMotion]);

    const animatedHaloStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
        position: 'absolute',
        width: 100, height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.primaryLight,
    }));

    return (
        <View style={{ justifyContent: 'center', alignItems: 'center', width: 140, height: 140 }}>
            {isRecording && <Animated.View style={animatedHaloStyle} />}
            <TouchableOpacity
                style={[
                    styles.recordButton,
                    isRecording ? { backgroundColor: COLORS.primary } : styles.idleBtn,
                    analyzing && styles.disabledBtn
                ]}
                onPress={onPress}
                disabled={analyzing}
            >
                {analyzing ? (
                    <ActivityIndicator size="large" color="#fff" />
                ) : (
                    <Ionicons
                        name={isRecording ? "stop" : "mic"}
                        size={40}
                        color={isRecording ? "#fff" : COLORS.primary}
                    />
                )}
            </TouchableOpacity>
        </View>
    );
};

const AnimatedWaveform = ({ isRecording, metering }: any) => {
    const reducedMotion = useReducedMotion();
    const height1 = useSharedValue(10);
    const height2 = useSharedValue(10);
    const height3 = useSharedValue(10);
    const height4 = useSharedValue(10);

    useEffect(() => {
        if (isRecording && !reducedMotion) {
            const normalized = Math.max(10, Math.min(40, ((metering + 60) / 60) * 40));
            height1.value = withSpring(normalized * 0.8 + Math.random() * 5);
            height2.value = withSpring(normalized * 1.2 + Math.random() * 5);
            height3.value = withSpring(normalized * 0.9 + Math.random() * 5);
            height4.value = withSpring(normalized * 1.1 + Math.random() * 5);
        } else {
            height1.value = withTiming(10);
            height2.value = withTiming(10);
            height3.value = withTiming(10);
            height4.value = withTiming(10);
        }
    }, [metering, isRecording, reducedMotion]);

    const style1 = useAnimatedStyle(() => ({ height: height1.value }));
    const style2 = useAnimatedStyle(() => ({ height: height2.value }));
    const style3 = useAnimatedStyle(() => ({ height: height3.value }));
    const style4 = useAnimatedStyle(() => ({ height: height4.value }));

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 50, justifyContent: 'center', marginTop: 30 }}>
            <Animated.View style={[styles.waveBar, style1]} />
            <Animated.View style={[styles.waveBar, style2]} />
            <Animated.View style={[styles.waveBar, style3]} />
            <Animated.View style={[styles.waveBar, style4]} />
        </View>
    );
};

export default function AnalysisScreen({ navigation, route }: any) {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [permissionResponse, requestPermission] = Audio.usePermissions();
    const [isRecording, setIsRecording] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [metering, setMetering] = useState(0); // -160 to 0
    const [maxIntensity, setMaxIntensity] = useState(0);
    const [barkCount, setBarkCount] = useState(0);
    const [petData, setPetData] = useState<any>(null);
    const [currentPetId, setCurrentPetId] = useState<string | null>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const lastBarkTimeRef = useRef(0);

    useEffect(() => {
        fetchPetProfile();
        return () => {
            if (recording) {
                stopRecording();
            }
        };
    }, []);

    const fetchPetProfile = async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            let id = route.params?.petId;
            let data = null;

            if (id) {
                const docSnap = await getDoc(doc(db, 'users', user.uid, 'pets', id));
                if (docSnap.exists()) {
                    data = docSnap.data();
                }
            } else {
                const q = query(collection(db, 'users', user.uid, 'pets'), limit(1));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    id = querySnapshot.docs[0].id;
                    data = querySnapshot.docs[0].data();
                }
            }

            if (id && data) {
                console.log("Analysis for pet:", data.name, data.breed);
                setCurrentPetId(id);
                setPetData(data);
            }
        } catch (e) {
            console.error("Error fetching pet profile:", e);
        }
    };

    const startRecording = async () => {
        try {
            if (permissionResponse?.status !== 'granted') {
                const permission = await requestPermission();
                if (permission.status !== 'granted') {
                    Alert.alert("Permission needed", "Microphone access is required to analyze audio.");
                    return;
                }
            }

            // Reset Telemetry
            setResult(null);
            setMaxIntensity(0);
            setBarkCount(0);
            lastBarkTimeRef.current = 0;

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY,
                (status) => {
                    if (status.isRecording && status.metering !== undefined) {
                        setMetering(status.metering);

                        // normalize -160 (silence) to 0 (loud) -> 0 to 1
                        // typical range is -60 to 0 for speech
                        // let's say -60 is 0.1, 0 is 1.0
                        const normalized = Math.min(1, Math.max(0, (status.metering + 60) / 60));

                        if (normalized > maxIntensity) setMaxIntensity(normalized);

                        // Simple Bark Detection (Threshold > 0.6 & debounce 400ms)
                        const now = Date.now();
                        if (normalized > 0.6 && (now - lastBarkTimeRef.current > 400)) {
                            setBarkCount(prev => prev + 1);
                            lastBarkTimeRef.current = now;
                        }
                    }
                },
                100 // update every 100ms
            );

            setRecording(recording);
            setIsRecording(true);
            setTimeLeft(30);

            // Timer
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        stopRecording();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert("Error", "Failed to start recording.");
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            console.log('Recording stopped and stored at', uri);

            if (uri) {
                analyzeAudio(uri);
            }
        } catch (err) {
            console.error('Failed to stop recording', err);
        } finally {
            setRecording(null);
        }
    };

    const analyzeAudio = async (uri: string) => {
        if (!GEN_AI_KEY) {
            Alert.alert("Config Error", "Gemini API Key is missing. Check your .env file.");
            return;
        }

        setAnalyzing(true);
        try {
            // 1. Read file as Base64
            const base64Audio = await FileSystem.readAsStringAsync(uri, {
                encoding: 'base64',
            });

            // 2. Gemini Analysis
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `
            Analyze this dog bark audio for separation anxiety.
            
            Context Telemetry:
            - Max Intensity (0-1): ${maxIntensity.toFixed(2)}
            - Bark Count (approx): ${barkCount}
            - Duration: ${30 - timeLeft}s
            - Pet Breed: ${petData?.breed || 'Unknown'}
            - Pet Age: ${petData?.age || 'Unknown'}

            Goal: Determine the Anxiety Level (1-10) and provide a nature of barking (alert, panic, playful, angry, etc.) short Tip.
            
            Scoring Guide:
            - 1-3: Normal behavior, playful barking, or silence.
            - 4-6: Mild stress, alert barking, occasional whining.
            - 7-8: High anxiety, repetitive barking, howling, sustained whining.
            - 9-10: Severe panic, frantic barking/panting, distress.

            Return ONLY valid JSON in this format:
            {
                "score": number, 
                "tip": "string advice (max 15 words)",
                "details": "string reasoning"
            }
            `;

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        mimeType: 'audio/mp4', // iOS/Android usually save as m4a/mp4 container
                        data: base64Audio
                    }
                }
            ]);

            const response = await result.response;
            const text = response.text();
            console.log("Gemini Response:", text);

            const jsonStr = text.replace(/```json|```/g, '').trim();
            const data = JSON.parse(jsonStr);
            setResult(data);

            // 3. Upload to Firebase (Background)
            uploadToFirebase(uri);

        } catch (error: any) {
            console.error("Analysis Error:", error);
            Alert.alert("Analysis Failed", error.message);
        } finally {
            setAnalyzing(false);
        }
    };

    const uploadToFirebase = async (uri: string) => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const blob = await new Promise<Blob>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.onload = function () {
                    resolve(xhr.response);
                };
                xhr.onerror = function (e) {
                    console.log(e);
                    reject(new TypeError('Network request failed'));
                };
                xhr.responseType = 'blob';
                xhr.open('GET', uri, true);
                xhr.send(null);
            });

            const timestamp = Date.now();
            const audioRef = ref(storage, `analysis/${user.uid}/${timestamp}.m4a`);
            await uploadBytes(audioRef, blob);
            console.log("Audio uploaded to Firebase");
        } catch (e) {
            console.error("Upload failed", e);
        }
    };

    const handleSaveAndExit = async () => {
        if (!result || !auth.currentUser) {
            navigation.goBack();
            return;
        }

        try {
            const user = auth.currentUser;

            if (currentPetId) {
                await setDoc(doc(db, 'users', user.uid, 'pets', currentPetId), {
                    anxietyScore: result.score,
                    lastAnalysis: serverTimestamp(),
                    lastAnalysisResult: result
                }, { merge: true });
            }
        } catch (e) {
            console.error("Save failed", e);
        } finally {
            navigation.goBack();
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>AI Analysis</Text>
            </View>

            <View style={styles.content}>
                {!result ? (
                    <View style={styles.recordContainer}>
                        <PulsingMicrophone isRecording={isRecording} analyzing={analyzing} onPress={isRecording ? stopRecording : startRecording} />

                        <AnimatedWaveform isRecording={isRecording} metering={metering} />

                        <Text style={[styles.timer, { marginTop: 20 }]}>
                            {isRecording ? `00:${timeLeft < 10 ? '0' : ''}${timeLeft}` : '00:30'}
                        </Text>
                        <Text style={styles.status}>
                            {isRecording ? "Listening for stress patterns…" : "Tap mic to analyze"}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.resultContainer}>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryTitle}>Analysis Complete</Text>

                            <View style={styles.metricRow}>
                                <Text style={styles.metricLabel}>Stress Probability</Text>
                                <Text style={[styles.metricValue, { color: COLORS.primary }]}>{Math.round((result.score / 10) * 100)}%</Text>
                            </View>

                            <View style={styles.metricRow}>
                                <Text style={styles.metricLabel}>Bark/Stress Intensity</Text>
                                <View style={styles.barBg}>
                                    <View style={[styles.barFill, { width: `${result.score * 10}%`, backgroundColor: COLORS.primary }]} />
                                </View>
                            </View>

                            <View style={styles.divider} />

                            <Text style={styles.tipTitle}>💡 Suggested Action</Text>
                            <Text style={styles.tipText}>{result.tip}</Text>
                            {result.details ? <Text style={styles.detailsText}>{result.details}</Text> : null}
                        </View>

                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.outlineBtn]}
                                onPress={() => setResult(null)}
                            >
                                <Text style={styles.outlineBtnText}>Start New Analysis</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.primaryBtn]}
                                onPress={handleSaveAndExit}
                            >
                                <Text style={styles.primaryBtnText}>Save & Exit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 5,
        marginRight: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recordContainer: {
        alignItems: 'center',
        width: '100%',
        marginTop: 40,
    },
    timer: {
        fontSize: 48,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    status: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginBottom: 40,
    },
    recordButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
        zIndex: 10,
    },
    idleBtn: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: COLORS.primaryLight,
    },
    disabledBtn: {
        backgroundColor: '#9ca3af',
    },
    waveBar: {
        width: 8,
        backgroundColor: COLORS.primary,
        borderRadius: 4,
    },
    resultContainer: {
        width: '100%',
        gap: 20,
    },
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        ...SHADOWS.small,
    },
    summaryTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 24,
        textAlign: 'center',
    },
    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    metricLabel: {
        fontSize: 16,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    metricValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    barBg: {
        width: 120,
        height: 8,
        backgroundColor: '#f3f4f6',
        borderRadius: 4,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 4,
    },
    tipTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        color: COLORS.text,
    },
    tipText: {
        fontSize: 16,
        lineHeight: 24,
        color: COLORS.text,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginTop: 20,
        marginBottom: 15,
    },
    detailsText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 8,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
    },
    actionBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    primaryBtn: {
        backgroundColor: COLORS.primary,
    },
    outlineBtn: {
        borderWidth: 1,
        borderColor: COLORS.primary,
        backgroundColor: '#fff',
    },
    primaryBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    outlineBtnText: {
        color: COLORS.primary,
        fontWeight: '600',
    },
});
