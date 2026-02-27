import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Ionicons } from '@expo/vector-icons';
import { auth, storage, db } from '../services/firebaseConfig';
import { ref, uploadBytes } from 'firebase/storage';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, limit, getDocs } from 'firebase/firestore';

// Initialize Gemini
// Note: In a real app, use a secure backend proxy or Firebase Functions to hide this key.
// Using EXPO_PUBLIC_GEMINI_API_KEY from env for this MVP.
const GEN_AI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEN_AI_KEY);

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
                        <View style={styles.metrics}>
                            <Text style={styles.metricText}>Barks: {barkCount}</Text>
                            <View style={styles.intensityBar}>
                                <View style={[styles.intensityFill, { height: `${maxIntensity * 100}%` }]} />
                            </View>
                        </View>

                        <Text style={styles.timer}>
                            {isRecording ? `00:${timeLeft < 10 ? '0' : ''}${timeLeft}` : '00:30'}
                        </Text>
                        <Text style={styles.status}>
                            {isRecording ? "Recording..." : "Tap mic to analyze"}
                        </Text>

                        <TouchableOpacity
                            style={[
                                styles.recordButton,
                                isRecording ? styles.recordingBtn : styles.idleBtn,
                                analyzing && styles.disabledBtn
                            ]}
                            onPress={isRecording ? stopRecording : startRecording}
                            disabled={analyzing}
                        >
                            {analyzing ? (
                                <ActivityIndicator size="large" color="#fff" />
                            ) : (
                                <Ionicons
                                    name={isRecording ? "stop" : "mic"}
                                    size={40}
                                    color="#fff"
                                />
                            )}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.resultContainer}>
                        <View style={[
                            styles.scoreCard,
                            result.score >= 7 ? styles.bgRed : result.score >= 4 ? styles.bgOrange : styles.bgGreen
                        ]}>
                            <Text style={styles.scoreLabel}>Anxiety Score</Text>
                            <Text style={[
                                styles.scoreValue,
                                result.score >= 7 ? styles.textRed : result.score >= 4 ? styles.textOrange : styles.textGreen
                            ]}>
                                {result.score}/10
                            </Text>
                            <Text style={styles.scoreDesc}>
                                {result.score >= 9 ? "Severe Panic" :
                                    result.score >= 7 ? "High Anxiety" :
                                        result.score >= 4 ? "Mild Stress" :
                                            "Normal/Playful"}
                            </Text>
                        </View>

                        <View style={styles.tipCard}>
                            <Text style={styles.tipTitle}>💡 AI Tip</Text>
                            <Text style={styles.tipText}>{result.tip}</Text>
                            <View style={styles.divider} />
                            <Text style={styles.detailsText}>{result.details}</Text>
                        </View>

                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.outlineBtn]}
                                onPress={() => setResult(null)}
                            >
                                <Text style={styles.outlineBtnText}>Record Again</Text>
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
    },
    metrics: {
        position: 'absolute',
        top: -50,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15
    },
    metricText: {
        color: '#666',
        fontWeight: '600'
    },
    intensityBar: {
        width: 10,
        height: 50,
        backgroundColor: '#eee',
        borderRadius: 5,
        overflow: 'hidden',
        justifyContent: 'flex-end'
    },
    intensityFill: {
        backgroundColor: '#ef4444',
        width: '100%'
    },
    timer: {
        fontSize: 64,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    status: {
        fontSize: 16,
        color: '#666',
        marginBottom: 40,
    },
    recordButton: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    idleBtn: {
        backgroundColor: '#2563eb',
    },
    recordingBtn: {
        backgroundColor: '#ef4444',
        transform: [{ scale: 1.1 }],
        borderWidth: 4,
        borderColor: '#fee2e2'
    },
    disabledBtn: {
        backgroundColor: '#9ca3af',
    },
    resultContainer: {
        width: '100%',
        gap: 20,
    },
    scoreCard: {
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
    },
    bgRed: { backgroundColor: '#fef2f2', borderColor: '#fee2e2' },
    bgOrange: { backgroundColor: '#fff7ed', borderColor: '#ffedd5' },
    bgGreen: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' },
    textRed: { color: '#ef4444' },
    textOrange: { color: '#f97316' },
    textGreen: { color: '#22c55e' },
    scoreLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    scoreValue: {
        fontSize: 64,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    scoreDesc: {
        fontSize: 16,
        fontWeight: '600',
        opacity: 0.8,
    },
    tipCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    tipTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    tipText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginTop: 20,
        marginBottom: 15,
    },
    detailsText: {
        fontSize: 14,
        color: '#666',
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
        backgroundColor: '#2563eb',
    },
    outlineBtn: {
        borderWidth: 1,
        borderColor: '#e5e5e5',
        backgroundColor: '#fff',
    },
    primaryBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    outlineBtnText: {
        color: '#333',
        fontWeight: '600',
    },
});
