import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, Platform, ScrollView } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withDelay,
    Easing,
    useReducedMotion,
} from 'react-native-reanimated';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Ionicons } from '@expo/vector-icons';
import { auth, storage, db } from '../services/firebaseConfig';
import { ref, uploadBytes } from 'firebase/storage';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, limit, getDocs } from 'firebase/firestore';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import { getAnxietyColor, getAnxietyBgColor, getAnxietyLabel } from '../helpers/anxietyGradient';

const GEN_AI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEN_AI_KEY);

// ── Animated Waveform Bars ──────────────────────────────

function WaveformBars({ isActive }: { isActive: boolean }) {
    const reducedMotion = useReducedMotion();
    const bars = [
        useSharedValue(0.3),
        useSharedValue(0.3),
        useSharedValue(0.3),
        useSharedValue(0.3),
        useSharedValue(0.3),
    ];

    useEffect(() => {
        if (!isActive || reducedMotion) {
            bars.forEach(b => { b.value = withTiming(0.3, { duration: 300 }); });
            return;
        }
        bars.forEach((bar, i) => {
            bar.value = withDelay(i * 120,
                withRepeat(
                    withSequence(
                        withTiming(0.5 + Math.random() * 0.5, { duration: 300 + i * 80, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0.15 + Math.random() * 0.2, { duration: 250 + i * 60, easing: Easing.inOut(Easing.ease) }),
                    ),
                    -1, true,
                ),
            );
        });
    }, [isActive]);

    const barStyles = bars.map(bar =>
        useAnimatedStyle(() => ({ height: `${bar.value * 100}%` }))
    );

    return (
        <View style={wfStyles.container}>
            {barStyles.map((style, i) => (
                <Animated.View key={i} style={[wfStyles.bar, style]} />
            ))}
        </View>
    );
}

const wfStyles = StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'flex-end', height: 50, gap: 6, marginBottom: 20 },
    bar: { width: 8, backgroundColor: COLORS.primary, borderRadius: 4, opacity: 0.7 },
});

// ── Pulsing Record Circle ───────────────────────────────

function PulsingCircle({ isActive }: { isActive: boolean }) {
    const reducedMotion = useReducedMotion();
    const scale = useSharedValue(1);
    const glowOpacity = useSharedValue(0);

    useEffect(() => {
        if (!isActive || reducedMotion) {
            scale.value = withTiming(1, { duration: 300 });
            glowOpacity.value = withTiming(0, { duration: 300 });
            return;
        }
        scale.value = withRepeat(
            withSequence(
                withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
            ), -1, true,
        );
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(0.25, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.08, { duration: 600, easing: Easing.inOut(Easing.ease) }),
            ), -1, true,
        );
    }, [isActive]);

    const circleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value, transform: [{ scale: scale.value * 1.4 }] }));

    return (
        <View style={pulseStyles.wrapper}>
            <Animated.View style={[pulseStyles.glow, glowStyle]} />
            <Animated.View style={[pulseStyles.circle, circleStyle]}>
                <Ionicons name={isActive ? 'stop' : 'mic'} size={40} color="#fff" />
            </Animated.View>
        </View>
    );
}

const pulseStyles = StyleSheet.create({
    wrapper: { alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    glow: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.primary },
    circle: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', ...SHADOWS.small },
});

// ── Main Screen ─────────────────────────────────────────

export default function AnalysisScreen({ navigation, route }: any) {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [permissionResponse, requestPermission] = Audio.usePermissions();
    const [isRecording, setIsRecording] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [metering, setMetering] = useState(0);
    const [maxIntensity, setMaxIntensity] = useState(0);
    const [barkCount, setBarkCount] = useState(0);
    const [petData, setPetData] = useState<any>(null);
    const [currentPetId, setCurrentPetId] = useState<string | null>(null);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastBarkTimeRef = useRef(0);

    useEffect(() => {
        fetchPetProfile();
        return () => { if (recording) stopRecording(); };
    }, []);

    const fetchPetProfile = async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            let id = route.params?.petId;
            let data = null;
            if (id) {
                const docSnap = await getDoc(doc(db, 'users', user.uid, 'pets', id));
                if (docSnap.exists()) data = docSnap.data();
            } else {
                const q = query(collection(db, 'users', user.uid, 'pets'), limit(1));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) { id = querySnapshot.docs[0].id; data = querySnapshot.docs[0].data(); }
            }
            if (id && data) { setCurrentPetId(id); setPetData(data); }
        } catch (e) { console.error("Error fetching pet profile:", e); }
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
            setResult(null); setMaxIntensity(0); setBarkCount(0); lastBarkTimeRef.current = 0;
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, staysActiveInBackground: true });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY,
                (status) => {
                    if (status.isRecording && status.metering !== undefined) {
                        setMetering(status.metering);
                        const normalized = Math.min(1, Math.max(0, (status.metering + 60) / 60));
                        if (normalized > maxIntensity) setMaxIntensity(normalized);
                        const now = Date.now();
                        if (normalized > 0.6 && (now - lastBarkTimeRef.current > 400)) {
                            setBarkCount(prev => prev + 1);
                            lastBarkTimeRef.current = now;
                        }
                    }
                },
                100,
            );
            setRecording(recording); setIsRecording(true); setTimeLeft(30);
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => { if (prev <= 1) { stopRecording(); return 0; } return prev - 1; });
            }, 1000);
        } catch (err) { console.error('Failed to start recording', err); Alert.alert("Error", "Failed to start recording."); }
    };

    const stopRecording = async () => {
        if (!recording) return;
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            if (uri) analyzeAudio(uri);
        } catch (err) { console.error('Failed to stop recording', err); }
        finally { setRecording(null); }
    };

    const analyzeAudio = async (uri: string) => {
        if (!GEN_AI_KEY) { Alert.alert("Config Error", "Gemini API Key is missing."); return; }
        setAnalyzing(true);
        try {
            const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `Analyze this dog bark audio for separation anxiety.
Context: Max Intensity (0-1): ${maxIntensity.toFixed(2)}, Bark Count: ${barkCount}, Duration: ${30 - timeLeft}s, Breed: ${petData?.breed || 'Unknown'}, Age: ${petData?.age || 'Unknown'}
Scoring: 1-3 Normal, 4-6 Mild stress, 7-8 High anxiety, 9-10 Severe panic.
Return ONLY valid JSON: {"score": number, "tip": "string (max 15 words)", "details": "string reasoning", "stressProbability": number}`;

            const genResult = await model.generateContent([prompt, { inlineData: { mimeType: 'audio/mp4', data: base64Audio } }]);
            const text = (await genResult.response).text();
            const jsonStr = text.replace(/```json|```/g, '').trim();
            const data = JSON.parse(jsonStr);
            setResult(data);
            uploadToFirebase(uri);
        } catch (error: any) { console.error("Analysis Error:", error); Alert.alert("Analysis Failed", error.message); }
        finally { setAnalyzing(false); }
    };

    const uploadToFirebase = async (uri: string) => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            const blob = await new Promise<Blob>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.onload = () => resolve(xhr.response);
                xhr.onerror = () => reject(new TypeError('Network request failed'));
                xhr.responseType = 'blob'; xhr.open('GET', uri, true); xhr.send(null);
            });
            const audioRef = ref(storage, `analysis/${user.uid}/${Date.now()}.m4a`);
            await uploadBytes(audioRef, blob);
        } catch (e) { console.error("Upload failed", e); }
    };

    const handleSaveAndExit = async () => {
        if (!result || !auth.currentUser) { navigation.goBack(); return; }
        try {
            const user = auth.currentUser;
            if (currentPetId) {
                await setDoc(doc(db, 'users', user.uid, 'pets', currentPetId), {
                    anxietyScore: result.score, lastAnalysis: serverTimestamp(), lastAnalysisResult: result,
                }, { merge: true });
            }
        } catch (e) { console.error("Save failed", e); }
        finally { navigation.goBack(); }
    };

    const scoreColor = result ? getAnxietyColor(result.score) : COLORS.primary;
    const scoreBg = result ? getAnxietyBgColor(result.score) : '#F3F4F6';
    const scoreLabel = result ? getAnxietyLabel(result.score) : '';
    const stressProb = result?.stressProbability ?? Math.round((result?.score ?? 0) * 10);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </Pressable>
                <Text style={styles.title}>AI Analysis</Text>
            </View>

            <View style={styles.content}>
                {!result ? (
                    <View style={styles.recordSection}>
                        <Text style={styles.listeningText}>
                            {isRecording ? 'Listening for stress-related barking patterns…'
                                : analyzing ? 'Analyzing audio with AI…'
                                    : 'Tap to start listening'}
                        </Text>
                        <Pressable onPress={isRecording ? stopRecording : startRecording} disabled={analyzing}>
                            <PulsingCircle isActive={isRecording} />
                        </Pressable>
                        <WaveformBars isActive={isRecording} />
                        <Text style={styles.timer}>
                            {isRecording ? `00:${timeLeft < 10 ? '0' : ''}${timeLeft}` : '00:30'}
                        </Text>
                        {analyzing && (
                            <View style={styles.analyzingRow}>
                                <ActivityIndicator size="small" color={COLORS.primary} />
                                <Text style={styles.analyzingText}>Processing with Gemini AI...</Text>
                            </View>
                        )}
                        {(barkCount > 0 || maxIntensity > 0) && (
                            <View style={styles.liveMetrics}>
                                <Text style={styles.liveMetricText}>Barks detected: {barkCount}</Text>
                                <Text style={styles.liveMetricText}>Peak intensity: {(maxIntensity * 100).toFixed(0)}%</Text>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.resultsSection}>
                        <View style={[styles.scoreCard, { backgroundColor: scoreBg, borderColor: scoreColor + '30' }]}>
                            <Text style={styles.scoreLabel}>Anxiety Score</Text>
                            <Text style={[styles.scoreValue, { color: scoreColor }]}>{result.score}/10</Text>
                            <Text style={[styles.scoreLevelText, { color: scoreColor }]}>{scoreLabel}</Text>
                        </View>
                        <View style={styles.metricsRow}>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>Bark Intensity</Text>
                                <View style={styles.metricBarBg}>
                                    <View style={[styles.metricBarFill, { width: `${Math.max(5, maxIntensity * 100)}%`, backgroundColor: scoreColor }]} />
                                </View>
                                <Text style={styles.metricValue}>{(maxIntensity * 100).toFixed(0)}%</Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>Stress Prob.</Text>
                                <View style={styles.circleProgress}>
                                    <Text style={[styles.circleProgressText, { color: scoreColor }]}>{stressProb}%</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.actionCard}>
                            <Ionicons name="bulb-outline" size={20} color={COLORS.primary} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.actionCardLabel}>Suggested Action</Text>
                                <Text style={styles.actionCardText}>{result.tip}</Text>
                            </View>
                        </View>
                        <View style={styles.detailsCard}>
                            <Text style={styles.detailsTitle}>Analysis Details</Text>
                            <Text style={styles.detailsText}>{result.details}</Text>
                        </View>
                        <View style={styles.buttonsRow}>
                            <Pressable
                                style={({ pressed }) => [styles.outlineBtn, pressed && { backgroundColor: '#F3F4F6' }]}
                                onPress={() => setResult(null)}
                            >
                                <Text style={styles.outlineBtnText}>Start New Analysis</Text>
                            </Pressable>
                            <Pressable
                                style={({ pressed }) => [styles.primaryBtn, pressed && { backgroundColor: COLORS.primaryDark, transform: [{ scale: 0.98 }] }]}
                                onPress={handleSaveAndExit}
                            >
                                <Text style={styles.primaryBtnText}>Save & Exit</Text>
                            </Pressable>
                        </View>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: COLORS.backgroundLight },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    backBtn: { padding: 5, marginRight: 10 },
    title: { ...FONTS.h3, color: COLORS.text },
    content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
    recordSection: { alignItems: 'center', width: '100%' },
    listeningText: { ...FONTS.body, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
    timer: { fontSize: 48, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
    analyzingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
    analyzingText: { ...FONTS.caption, color: COLORS.primary },
    liveMetrics: { marginTop: 16, backgroundColor: '#fff', borderRadius: SIZES.radius, padding: 12, width: '100%', gap: 4, ...SHADOWS.small },
    liveMetricText: { ...FONTS.caption, color: COLORS.textSecondary },
    resultsSection: { width: '100%', gap: 16 },
    scoreCard: { borderRadius: SIZES.radius, padding: 24, alignItems: 'center', borderWidth: 1 },
    scoreLabel: { ...FONTS.caption, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
    scoreValue: { fontSize: 56, fontWeight: 'bold', marginBottom: 4 },
    scoreLevelText: { ...FONTS.body, fontWeight: '600' },
    metricsRow: { flexDirection: 'row', gap: 12 },
    metricCard: { flex: 1, backgroundColor: '#fff', borderRadius: SIZES.radius, padding: 16, alignItems: 'center', ...SHADOWS.small },
    metricLabel: { ...FONTS.small, color: COLORS.textSecondary, marginBottom: 8, fontWeight: '600' },
    metricBarBg: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, width: '100%', overflow: 'hidden', marginBottom: 6 },
    metricBarFill: { height: '100%', borderRadius: 4 },
    metricValue: { ...FONTS.h3, color: COLORS.text },
    circleProgress: { width: 56, height: 56, borderRadius: 28, borderWidth: 4, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    circleProgressText: { ...FONTS.body, fontWeight: 'bold' },
    actionCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: SIZES.radius, padding: 16, alignItems: 'center', gap: 12, ...SHADOWS.small },
    actionCardLabel: { ...FONTS.small, color: COLORS.textSecondary, fontWeight: '600' },
    actionCardText: { ...FONTS.body, color: COLORS.text, marginTop: 2 },
    detailsCard: { backgroundColor: '#fff', borderRadius: SIZES.radius, padding: 16, ...SHADOWS.small },
    detailsTitle: { ...FONTS.caption, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
    detailsText: { ...FONTS.caption, color: COLORS.textSecondary, lineHeight: 20 },
    buttonsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
    outlineBtn: { flex: 1, padding: 16, borderRadius: SIZES.radius, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff' },
    outlineBtnText: { ...FONTS.caption, fontWeight: '600', color: COLORS.text },
    primaryBtn: { flex: 1, padding: 16, borderRadius: SIZES.radius, alignItems: 'center', backgroundColor: COLORS.primary },
    primaryBtnText: { ...FONTS.caption, fontWeight: 'bold', color: '#fff' },
});
