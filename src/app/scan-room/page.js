'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, storage, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function ScanRoom() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const petId = searchParams.get('petId') || 'default-pet';

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const workerRef = useRef(null);

    // State
    const [stream, setStream] = useState(null);
    const [user, setUser] = useState(null);
    const [capturedImages, setCapturedImages] = useState([]); // Array of DataURLs
    const [isCompiling, setIsCompiling] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressStatus, setProgressStatus] = useState('');
    const [error, setError] = useState(null);
    const [status, setStatus] = useState('');
    const [roomName, setRoomName] = useState('My Room'); // Default name
    const [isNaming, setIsNaming] = useState(false); // UI state for naming input

    const MIN_PHOTOS = 3;

    // Auth
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                setError('Please log in.');
            }
        });
        return () => unsubscribe();
    }, []);

    // Camera Init
    useEffect(() => {
        let currentStream;
        const startCamera = async () => {
            try {
                if (videoRef.current) videoRef.current.srcObject = null;
                const constraints = {
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1280 }, // Lower res for compiler performance
                        height: { ideal: 720 }
                    }
                };
                currentStream = await navigator.mediaDevices.getUserMedia(constraints);
                setStream(currentStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = currentStream;
                    videoRef.current.onloadedmetadata = async () => {
                        try {
                            await videoRef.current.play();
                        } catch (e) {
                            if (e.name !== 'AbortError') {
                                console.error("Play error:", e);
                            }
                        }
                    };
                }
                setStatus('Ready to scan');
            } catch (err) {
                console.error("Camera error:", err);
                setError('Camera access denied.');
            }
        };

        if (capturedImages.length < MIN_PHOTOS) {
            startCamera();
        }

        return () => {
            if (currentStream) currentStream.getTracks().forEach(track => track.stop());
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };
    }, []);

    const getInstruction = (index) => {
        const spots = [
            "Spot 1: Pet's Bed",
            "Spot 2: Sofa / Favorites",
            "Spot 3: Door / Entrance",
            "Spot 4: Window Area",
            "Spot 5: Food Bowl",
            "Spot 6: Flexible Spot"
        ];
        return spots[index] || "Capture another distinct spot";
    };

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImages(prev => [...prev, dataUrl]);
    };

    const handleCompileClick = () => {
        if (!user || capturedImages.length < 3) return;
        setIsNaming(true); // Show naming input first
    };

    const handleCompileConfirm = async () => {
        setIsNaming(false);
        setIsCompiling(true);
        setStatus('Initializing compiler...');
        setProgress(0);

        // Stop camera to save battery during compilation
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        // Terminate old worker if exists
        if (workerRef.current) workerRef.current.terminate();

        // Create new Worker (Module type for ESM imports)
        const worker = new Worker('/worker/compiler.js', { type: 'module' });
        workerRef.current = worker;

        worker.onerror = (err) => {
            console.error("Worker Error Event:", err);
            // Try to extract message
            const msg = err.message || "Unknown error (check console)";
            setError(`Compiler worker failed: ${msg}. Try disabling ad-blockers.`);
            setIsCompiling(false);
        };

        worker.postMessage({ type: 'compile', images: capturedImages });

        worker.onmessage = async (e) => {
            const { type, percent, status, blob, error } = e.data;

            if (type === 'progress') {
                if (status) setStatus(status);
                setProgress(Math.round(percent));
                setProgressStatus(status);
            } else if (type === 'complete') {
                await handleUpload(blob);
            } else if (type === 'error') {
                setError('Compilation failed: ' + error);
                setIsCompiling(false);
            }
        };
    };

    const handleUpload = async (mindBlob) => {
        try {
            setStatus('Uploading targets...');
            setProgressStatus('Saving all spot data...');
            const timestamp = Date.now();

            // 1. Upload .mind file
            const mindPath = `mind-targets/${user.uid}/${petId}/${timestamp}.mind`;
            const mindRef = ref(storage, mindPath);
            await uploadBytes(mindRef, mindBlob);
            const mindDownloadURL = await getDownloadURL(mindRef);

            // 2. Upload Thumbnails (in parallel)
            const thumbnailPromises = capturedImages.map(async (imgDataUrl, index) => {
                const response = await fetch(imgDataUrl);
                const blob = await response.blob();
                const thumbPath = `mind-targets/${user.uid}/${petId}/${timestamp}_thumb_${index}.jpg`;
                const thumbRef = ref(storage, thumbPath);
                await uploadBytes(thumbRef, blob);
                return await getDownloadURL(thumbRef);
            });

            const thumbnailUrls = await Promise.all(thumbnailPromises);

            // 3. Save to Firestore
            const safeZonesRef = collection(db, 'users', user.uid, 'pets', petId, 'safeZones');
            const newDoc = await addDoc(safeZonesRef, {
                type: 'mindar',
                name: roomName || 'Untitled Room',
                fileUrl: mindDownloadURL,
                storagePath: mindPath,
                thumbnails: thumbnailUrls,
                targetCount: capturedImages.length,
                markerStatus: 'ready',
                createdAt: serverTimestamp()
            });

            setStatus('Done!');

            setTimeout(() => {
                window.location.href = `/mindar-safe-zone.html?userId=${user.uid}&petId=${petId}&zoneId=${newDoc.id}`;
            }, 1000);

        } catch (err) {
            console.error(err);
            setError('Upload failed: ' + err.message);
            setIsCompiling(false);
        }
    };

    const handleReset = () => {
        setCapturedImages([]);
        setIsCompiling(false);
        setError(null);
        setProgress(0);
        if (videoRef.current && videoRef.current.paused) videoRef.current.play();
    };

    return (
        <div className="fixed inset-0 bg-black text-white font-sans overflow-hidden touch-none h-[100dvh]">
            {/* Camera View or Compilation Background */}
            {!isCompiling ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover z-0"
                />
            ) : (
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 flex items-center justify-center">
                    <div className="text-center p-8">
                        <div className="text-6xl mb-4 animate-bounce">🐾</div>
                        <p className="text-white/60 text-sm bg-dark">Creating your pet&apos;s safe zone...</p>
                    </div>
                </div>
            )}

            {/* Hidden Canvas */}
            <canvas ref={canvasRef} className="hidden" style={{ display: 'none' }} />

            {/* Overlay UI */}
            <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6">

                {/* Top Bar */}
                <div className="flex justify-between items-start pt-safe">
                    <div>
                        <h1 className="text-lg font-bold drop-shadow-md text-info">Scan Safe Zone</h1>
                        <p className="text-sm text-white/80 drop-shadow-md">
                            {user ? `${capturedImages.length}/at least ${MIN_PHOTOS} photos` : 'Loading...'}
                        </p>
                    </div>
                    {capturedImages.length > 0 && !isCompiling && (
                        <button onClick={handleReset} className="pointer-events-auto text-sm text-red-400 bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
                            Reset
                        </button>
                    )}
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="pointer-events-auto text-sm text-white/90 bg-white/10 px-3 py-1 rounded-full backdrop-blur-md ml-2 hover:bg-white/20 transition-colors"
                    >
                        Cancel
                    </button>
                </div>

                {/* Center Message */}
                <div className="self-center text-center">
                    {!isCompiling && capturedImages.length < MIN_PHOTOS && (
                        <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 animate-fade-in-up">
                            <p className="font-semibold text-lg">{getInstruction(capturedImages.length)}</p>
                        </div>
                    )}
                </div>

                {/* Bottom Controls */}
                <div className="pb-safe flex flex-col items-center gap-4">
                    {/* Progress Bar (Compiling) */}
                    {isCompiling && (
                        <div className="w-full max-w-xs bg-slate-900/95 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl">
                            <h3 className="text-center font-bold mb-2 text-white bg-dark">{status}</h3>
                            <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                            <p className="text-xs text-center mt-2 text-white/70 bg-dark">{progressStatus} ({progress}%)</p>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/90 text-white bg-dark px-4 py-2 rounded-lg text-sm font-bold shadow-lg mb-2">
                            {error}
                        </div>
                    )}

                    {/* Capture Button */}
                    {!isCompiling && !isNaming && (
                        <div className="pointer-events-auto">
                            {capturedImages.length < 6 ? (
                                <button
                                    onClick={handleCapture}
                                    className="w-20 h-20 rounded-full border-4 border-white/40 bg-white/20 p-1 flex items-center justify-center active:scale-95 transition-transform"
                                >
                                    <div className="w-16 h-16 rounded-full bg-white shadow-lg">Capture zone</div>
                                </button>
                            ) : (
                                <div className="text-center bg-black/50 p-2 rounded-lg">Max photos reached</div>
                            )}
                        </div>
                    )}

                    {/* Compile Button */}
                    {!isCompiling && !isNaming && capturedImages.length >= MIN_PHOTOS && (
                        <button
                            onClick={handleCompileClick}
                            className="pointer-events-auto w-full max-w-xs py-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl font-bold text-lg shadow-xl active:scale-95 transition-transform animate-bounce-subtle"
                        >
                            Compile & Save ({capturedImages.length})
                        </button>
                    )}

                    {/* Naming Input Overlay */}
                    {isNaming && (
                        <div className="bg-black/80 backdrop-blur-md p-6 rounded-2xl border border-white/20 w-full max-w-sm flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
                            <h3 className="text-xl font-bold text-center">Name this Safe Zone</h3>
                            <input
                                type="text"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                placeholder="e.g. Living Room"
                                className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                                autoFocus
                            />
                            <div className="flex gap-3 mt-2">
                                <button
                                    onClick={() => setIsNaming(false)}
                                    className="flex-1 bg-white/10 text-white py-3 rounded-lg font-semibold hover:bg-white/20 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCompileConfirm}
                                    className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors shadow-lg"
                                >
                                    Start Compiling
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}