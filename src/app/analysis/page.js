'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mic, Square, Play, ChevronLeft, Loader2, RotateCw } from 'lucide-react';
import { auth, storage, db } from '@/lib/firebase';
import { ref, uploadBytes } from 'firebase/storage';
import { doc, updateDoc, serverTimestamp, collection, query, getDocs, limit, setDoc } from 'firebase/firestore';
import { analyzeBark } from '../actions/analyze';

import SpectrogramAnalyzer from '@/components/SpectrogramAnalyzer';

export default function Analysis() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [recording, setRecording] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [audioData, setAudioData] = useState({ context: null, source: null });

    // Refs
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);
    const spectrogramRef = useRef(null);

    // Telemetry Refs
    const barkCountRef = useRef(0);
    const maxIntensityRef = useRef(0);
    const lastBarkTimeRef = useRef(0);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // 1. Setup Audio
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContextRef.current = new AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
            sourceRef.current.connect(analyserRef.current);

            // Pass to Spectrogram Component
            setAudioData({
                context: audioContextRef.current,
                source: sourceRef.current
            });

            // Reset Telemetry
            barkCountRef.current = 0;
            maxIntensityRef.current = 0;
            lastBarkTimeRef.current = 0;

            // Start Analysis Loop
            analyzeAudioStream();

            // 2. Setup MediaRecorder
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            mediaRecorderRef.current.onstop = handleAnalysis;
            mediaRecorderRef.current.start();

            setRecording(true);
            setTimeLeft(30);
            setResult(null);

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
            console.error("Mic error:", err);
            alert("Microphone access denied. Please enable permissions.");
        }
    };

    const analyzeAudioStream = () => {
        if (!analyserRef.current || !recording) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
            if (!recording) return;

            analyserRef.current.getByteFrequencyData(dataArray);

            // Calculate Volume
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;
            const normalizedVol = average / 255;

            // Update Max Intensity
            if (normalizedVol > maxIntensityRef.current) {
                maxIntensityRef.current = normalizedVol;
            }

            // Detect Barks
            const now = Date.now();
            if (normalizedVol > 0.25 && (now - lastBarkTimeRef.current > 400)) {
                barkCountRef.current += 1;
                lastBarkTimeRef.current = now;
            }

            requestAnimationFrame(checkVolume);
        };

        checkVolume();
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            setAudioData({ context: null, source: null }); // Stop spectrogram

            if (audioContextRef.current) {
                audioContextRef.current.close();
            }

            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

            setRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const handleAnalysis = async () => {
        setAnalyzing(true);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

        const timestamp = Date.now();
        const user = auth.currentUser;

        // Get Spectrogram PNG
        let imageBlob = null;
        if (spectrogramRef.current) {
            imageBlob = await spectrogramRef.current.getBlob();
        }

        const formData = new FormData();
        formData.append('audio', blob);
        formData.append('intensity', maxIntensityRef.current.toFixed(2));
        formData.append('barkCount', barkCountRef.current.toString());
        formData.append('duration', (30 - timeLeft).toString());

        try {
            // Upload to Firebase
            if (user) {
                const audioRef = ref(storage, `analysis/${user.uid}/${timestamp}.webm`);
                uploadBytes(audioRef, blob).catch(e => console.error("Audio upload failed", e));

                if (imageBlob) {
                    const imgRef = ref(storage, `analysis/${user.uid}/${timestamp}.png`);
                    uploadBytes(imgRef, imageBlob).catch(e => console.error("PNG upload failed", e));
                }
            }

            const analysisResult = await analyzeBark(formData);
            setResult(analysisResult);
            // No auto-save here, wait for user confirmation
        } catch (error) {
            console.error("Analysis failed:", error);
            setResult({ score: 0, tip: "Error analyzing audio.", details: "Please try again." });
        } finally {
            setAnalyzing(false);
        }
    };

    const handleReset = () => {
        setResult(null);
        setRecording(false);
        setTimeLeft(30);
        barkCountRef.current = 0;
        maxIntensityRef.current = 0;
        lastBarkTimeRef.current = 0;
        if (spectrogramRef.current) spectrogramRef.current.reset();
    };

    const handleSaveAndExit = async () => {
        if (!result || !auth.currentUser) {
            router.push('/dashboard');
            return;
        }

        try {
            const user = auth.currentUser;
            let petId = searchParams.get('petId');

            if (!petId) {
                // Fetch first pet if not specified
                const petsRef = collection(db, 'users', user.uid, 'pets');
                const q = query(petsRef, limit(1));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    petId = snapshot.docs[0].id;
                }
            }

            if (petId) {
                // Use setDoc with merge for robustness
                await setDoc(doc(db, 'users', user.uid, 'pets', petId), {
                    anxietyScore: result.score,
                    lastAnalysis: serverTimestamp(),
                    lastAnalysisResult: result
                }, { merge: true });
            }
        } catch (e) {
            console.error("Save failed", e);
        } finally {
            router.push('/dashboard');
        }
    };

    return (
        <main className="min-h-screen bg-background flex flex-col">
            <header className="p-4 flex items-center gap-4 border-b border-border bg-card">
                <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-muted rounded-full">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-xl font-bold">AI Analysis</h1>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-fade-in">

                {/* Visualization Area */}
                <div className="w-full max-w-md relative group">
                    <SpectrogramAnalyzer
                        ref={spectrogramRef}
                        audioContext={audioData.context}
                        sourceNode={audioData.source}
                        recording={recording}
                    />
                    {!recording && (result || barkCountRef.current > 0) && (
                        <button
                            onClick={handleReset}
                            className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-red-500/80 transition-colors"
                            title="Reset Spectrogram"
                        >
                            <RotateCw size={16} />
                        </button>
                    )}
                </div>

                {!result && (
                    <>
                        <div className="text-center space-y-2">
                            <div className="text-6xl font-mono tabular-nums tracking-tighter">
                                {recording ? `00:${timeLeft < 10 ? '0' : ''}${timeLeft}` : '00:30'}
                            </div>
                            <p className="text-muted-foreground">
                                {recording ? "Recording Bark..." : "Tap mic to analyze"}
                            </p>
                        </div>

                        <div className="relative flex justify-center py-4">
                            {recording && (
                                <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping scale-75" />
                            )}

                            <button
                                onClick={recording ? stopRecording : startRecording}
                                disabled={analyzing}
                                className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl hover:scale-105 ${recording ? 'bg-destructive text-white' : 'bg-primary text-white'
                                    }`}
                            >
                                {analyzing ? (
                                    <Loader2 size={40} className="animate-spin" />
                                ) : recording ? (
                                    <Square size={40} fill="currentColor" />
                                ) : (
                                    <Mic size={40} />
                                )}
                            </button>
                        </div>
                    </>
                )}

                {result && (
                    <div className="w-full max-w-md space-y-6 animate-fade-in">
                        <div className={`card text-center p-8 space-y-4 border-primary/50 ${result.score >= 7 ? 'bg-red-500/10' : result.score >= 4 ? 'bg-orange-500/10' : 'bg-green-500/10'
                            }`}>
                            <h3 className="text-lg font-medium text-muted-foreground">Anxiety Score</h3>
                            <div className={`text-6xl font-bold ${result.score >= 7 ? 'text-red-500' : result.score >= 4 ? 'text-orange-500' : 'text-green-500'
                                }`}>
                                {result.score}/10
                            </div>
                            <p className="text-sm font-medium opacity-80">
                                {result.score >= 9 ? "Severe Panic Detected" :
                                    result.score >= 7 ? "High Anxiety Detected" :
                                        result.score >= 4 ? "Mild Stress Detected" :
                                            "Normal Behavior"}
                            </p>
                        </div>

                        <div className="card p-6 space-y-4">
                            <h3 className="font-bold flex items-center gap-2">
                                <span className="text-xl">💡</span> AI Tip
                            </h3>
                            <p className="text-lg">{result.tip}</p>
                            <div className="h-px bg-border" />
                            <p className="text-sm text-muted-foreground">{result.details}</p>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={handleReset} className="btn btn-outline flex-1">
                                Record Again
                            </button>
                            <button onClick={handleSaveAndExit} className="btn btn-primary flex-1">
                                Save & Exit
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </main>
    );
}
