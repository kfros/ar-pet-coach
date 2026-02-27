'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Layers } from 'lucide-react';
import * as THREE from 'three';
import PetPoseDetector from '@/components/PetPoseDetector';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp, onSnapshot, writeBatch } from 'firebase/firestore';

// Note: MindAR is loaded via Script tag, so we access it via window.MINDAR

export default function SafeZonesPage() {
    const router = useRouter();
    const containerRef = useRef(null);
    const videoRef = useRef(null); // Reference to the video element MindAR creates/uses
    const [arReady, setArReady] = useState(false);
    const [posePoints, setPosePoints] = useState([]); // [{x,y,z}, ...]
    const [showHeatmap, setShowHeatmap] = useState(true);
    const mindThreeRef = useRef(null);
    const heatmapPointsRef = useRef(null); // THREE.Points
    const anchorRef = useRef(null);
    const raycaster = useRef(new THREE.Raycaster());
    const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)); // Z-up plane in anchor space? MindAR targets are usually XY plane.
    // MindAR Image targets: The image is in XY plane, Z is up out of the image.

    // Session Management
    const sessionIdRef = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    const lastSaveTime = useRef(0);


    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (mindThreeRef.current) {
                mindThreeRef.current.stop();
                mindThreeRef.current.renderer.setAnimationLoop(null);
            }
        };
    }, []);

    // Use Suspense or useSearchParams in Next.js 13+
    // But for client component, let's just parse window.location or useSearchParams
    const searchParams = useSearchParams();

    // Auth & Pet Context would be better, but URL params are used in dashboard
    const userId = searchParams.get('userId');
    const petId = searchParams.get('petId');
    const zoneId = searchParams.get('zoneId');
    const heatmapParam = searchParams.get('heatmap');

    const [logs, setLogs] = useState([]);
    const addLog = (msg) => {
        console.log(msg);
        setLogs(prev => [...prev.slice(-10), msg]); // Keep last 10 logs
    };

    useEffect(() => {
        if (heatmapParam === 'true') setShowHeatmap(true);
    }, [heatmapParam]);

    const initAR = async (forceDemo = false, retryCount = 0) => {
        addLog(`initAR called (attempt ${retryCount}). forceDemo=${forceDemo}`);

        if (!containerRef.current) {
            addLog("CRITICAL: containerRef is null. Component might be unmounted.");
            return;
        }

        if (!window.MINDAR) {
            addLog("window.MINDAR is missing.");
            if (retryCount < 20) {
                addLog(`Retrying in 500ms... (${retryCount + 1}/20)`);
                setTimeout(() => initAR(forceDemo, retryCount + 1), 500);
            } else {
                addLog("Gave up waiting for MINDAR. Check script URL or network.");
            }
            return;
        }

        const { MindARThree } = window.MINDAR.IMAGE;
        if (!MindARThree) {
            addLog("window.MINDAR.IMAGE is missing or invalid structure.");
            console.log("MINDAR structure:", window.MINDAR);
            return;
        }

        // --- Demo Fallback ---
        const DEMO_URL = "https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.2/examples/image-tracking/assets/card-example/card.mind";
        if (forceDemo) {
            addLog("Forcing Demo URL");
            startMindAR(DEMO_URL);
            return;
        }

        // --- Fetch Dynamic Target ---
        try {
            addLog("Starting Firestore fetch...");
            const { doc, getDoc, collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');
            // const { auth } = await import('@/lib/firebase'); // Unused

            let targetSrc = '/targets.mind'; // Default Fallback
            addLog(`Params: userId=${userId?.slice(0, 5)}... petId=${petId} zoneId=${zoneId}`);

            if (userId && petId) {
                if (zoneId) {
                    addLog("Fetching specific zone...");
                    const dRef = doc(db, 'users', userId, 'pets', petId, 'safeZones', zoneId);
                    const snap = await getDoc(dRef);
                    if (snap.exists() && snap.data().fileUrl) {
                        targetSrc = snap.data().fileUrl;
                        addLog("Found Zone URL: " + targetSrc);
                    } else {
                        addLog("Zone doc not found or no fileUrl");
                    }
                } else {
                    addLog("Fetching latest zone...");
                    const zRef = collection(db, 'users', userId, 'pets', petId, 'safeZones');
                    const q = query(zRef, where('type', '==', 'mindar'), orderBy('createdAt', 'desc'), limit(1));
                    const snap = await getDocs(q);
                    if (!snap.empty && snap.docs[0].data().fileUrl) {
                        targetSrc = snap.docs[0].data().fileUrl;
                        addLog("Found Latest Zone URL: " + targetSrc);
                    } else {
                        addLog("No existing Safe Zone found.");
                    }
                }
            } else {
                addLog("Missing params, using default /targets.mind");
            }

            startMindAR(targetSrc);

        } catch (e) {
            addLog("Error fetching safe zone: " + e.message);
            console.error(e);
            startMindAR('/targets.mind');
        }
    };

    const startMindAR = async (targetSrc) => {
        addLog("Initializing MindARThree with: " + targetSrc);
        const { MindARThree } = window.MINDAR.IMAGE;

        try {
            const mindThree = new MindARThree({
                container: containerRef.current,
                imageTargetSrc: targetSrc,
                filterMinCF: 0.0001,
                filterBeta: 0.001,
            });

            mindThreeRef.current = mindThree;
            const { renderer, scene, camera } = mindThree;

            const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
            scene.add(light);

            const anchor = mindThree.addAnchor(0);
            anchorRef.current = anchor;

            // Debug Box
            const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            const material = new THREE.MeshNormalMaterial({ transparent: true, opacity: 0.5 });
            const box = new THREE.Mesh(geometry, material);
            // anchor.group.add(box); // Disable box, enable Hit Plane

            // Invisible Hit Plane for Raycasting (Infinite or large)
            const planeGeo = new THREE.PlaneGeometry(100, 100);
            const planeMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
            const hitPlane = new THREE.Mesh(planeGeo, planeMat);
            hitPlane.name = "hitPlane";
            anchor.group.add(hitPlane);

            // Heatmap Points
            const pointsGeo = new THREE.BufferGeometry();
            const pointsMat = new THREE.PointsMaterial({ size: 0.1, vertexColors: true });
            const pointsObj = new THREE.Points(pointsGeo, pointsMat);
            heatmapPointsRef.current = pointsObj;
            anchor.group.add(pointsObj);

            addLog("Calling mindThree.start()...");
            await mindThree.start();
            addLog("mindThree.start() succeeded!");

            const video = containerRef.current.querySelector('video');
            videoRef.current = video;

            renderer.setAnimationLoop(() => {
                renderer.render(scene, camera);
            });

            setArReady(true);
        } catch (err) {
            addLog("MindAR Start Error: " + err.message);
            console.error("MindAR Start Error:", err);
        }
    };

    // Watchdog for missing target file
    useEffect(() => {
        let timeoutId;
        if (!arReady) {
            timeoutId = setTimeout(() => {
                setShowTimeout(true);
                addLog("Timeout triggered (10s)");
            }, 10000); // 10s timeout
        }
        return () => clearTimeout(timeoutId);
    }, [arReady]);

    const [showTimeout, setShowTimeout] = useState(false);

    const handleUseDemo = () => {
        addLog("Switching to Demo...");
        if (mindThreeRef.current) {
            mindThreeRef.current.stop();
            mindThreeRef.current.renderer.setAnimationLoop(null);
            containerRef.current.innerHTML = ''; // Clear container
        }
        setShowTimeout(false);
        initAR(true);
    };

    // Batch Buffer
    const pointBufferRef = useRef([]);

    // Flush buffer loop
    useEffect(() => {
        if (!userId || !petId) return;

        const interval = setInterval(async () => {
            if (pointBufferRef.current.length === 0) return;

            const pointsToSave = [...pointBufferRef.current];
            pointBufferRef.current = []; // Clear buffer immediately

            // Limit to max 20 points per flush
            const chunk = pointsToSave.slice(0, 20);

            try {
                const batch = writeBatch(db);
                const colRef = collection(db, 'users', userId, 'pets', petId, 'activityPoints');

                chunk.forEach(pt => {
                    const newRef = doc(colRef);
                    batch.set(newRef, pt);
                });

                await batch.commit();
                addLog(`Saved batch of ${chunk.length} points.`);
            } catch (e) {
                addLog("Batch save ERROR: " + e.message);
                console.error("Batch save error", e);
            }

        }, 2000); // Flush every 2 seconds

        return () => clearInterval(interval);
    }, [userId, petId]);

    const handlePoseDetected = (poseData) => {
        // Expecting { normalized, allNormalized, world, hasPet }
        if (!poseData) return;

        if (poseData.hasPet === false) {
            // Throttle "no pet" logs to avoid spamming
            if (Math.random() < 0.05) addLog("No pet detected (throttled check)");
            return;
        }

        if (!poseData.normalized) {
            addLog("Pet detected, but NO POSE landmarks found.");
            return;
        }

        const { normalized } = poseData;

        if (!mindThreeRef.current || !anchorRef.current) {
            addLog("AR System not ready for raycast.");
            return;
        }

        const { camera } = mindThreeRef.current;

        // 1. Convert to NDC
        const ndc = new THREE.Vector2(
            (normalized.x - 0.5) * 2,
            -(normalized.y - 0.5) * 2
        );

        // 2. Raycast
        raycaster.current.setFromCamera(ndc, camera);

        // 3. Intersect Hit Plane
        const hitPlane = anchorRef.current.group.getObjectByName("hitPlane");
        if (hitPlane) {
            const intersects = raycaster.current.intersectObject(hitPlane);
            if (intersects.length > 0) {
                const point = intersects[0].point;
                const localPoint = anchorRef.current.group.worldToLocal(point.clone());

                // Add to Heatmap Visuals (Local State Immediate Feedback)
                setPosePoints(prev => {
                    const next = [...prev, { ...localPoint, intensity: 1 }]; // Default high intensity for new points
                    if (next.length > 1500) return next.slice(-1500);
                    return next;
                });

                // Add to Persistence Buffer
                pointBufferRef.current.push({
                    x: localPoint.x,
                    y: localPoint.y,
                    z: localPoint.z,
                    t: Date.now(),
                    sessionId: sessionIdRef.current,
                    timestamp: serverTimestamp()
                });

                // Throttle success log
                if (Math.random() < 0.1) addLog(`Point added: ${localPoint.x.toFixed(2)}, ${localPoint.y.toFixed(2)}`);

            } else {
                addLog("Raycast missed hitPlane.");
            }
        } else {
            addLog("hitPlane not found in anchor group.");
        }
    };

    // Firestore Listener (Accumulated History)
    useEffect(() => {
        if (!userId || !petId) return;

        const q = query(
            collection(db, 'users', userId, 'pets', petId, 'activityPoints'),
            orderBy('timestamp', 'desc'),
            limit(2000)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const pts = [];
            snapshot.forEach(doc => {
                const d = doc.data();
                if (d.x !== undefined) pts.push({ x: d.x, y: d.y, z: d.z, intensity: d.intensity });
            });
            // We replace state with server truth. 
            // Note: This might cause "flicker" if local points aren't synced yet.
            // Ideally we merge. But for simplicity, existing heatmap overwrites are usually fine if latency is low.
            if (pts.length > 0) setPosePoints(pts);
        });

        return () => unsubscribe();
    }, [userId, petId]);

    // Update Three.js Heatmap from React State
    useEffect(() => {
        if (heatmapPointsRef.current && showHeatmap) {
            const positions = [];
            const colors = [];
            const color = new THREE.Color();

            posePoints.forEach(p => {
                positions.push(p.x, p.y, p.z || 0);

                // Randomish color or based on density (simulated)
                color.setHSL(0.0, 1.0, 0.5); // Red
                colors.push(color.r, color.g, color.b);
            });

            const geo = heatmapPointsRef.current.geometry;
            geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geo.attributes.position.needsUpdate = true;
            geo.attributes.color.needsUpdate = true;
        }

        if (heatmapPointsRef.current) {
            heatmapPointsRef.current.visible = showHeatmap;
        }
    }, [posePoints, showHeatmap]);

    // Legacy redirect removed in favor of modern React implementation
    // useEffect(() => { ... }, []);

    const handleUseLegacy = () => {
        // Build URL for legacy HTML with params
        const params = new URLSearchParams();
        if (userId) params.set('userId', userId);
        if (petId) params.set('petId', petId);
        if (zoneId) params.set('zoneId', zoneId);
        if (heatmapParam) params.set('heatmap', heatmapParam);

        window.location.href = `/mindar-safe-zone.html?${params.toString()}`;
    };

    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [isIOSSafari, setIsIOSSafari] = useState(false);

    useEffect(() => {
        const ua = window.navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
        setIsIOSSafari(isIOS && isSafari);

        // Force Legacy Redirect for all (as requested by user)
        // Or keep it conditional? User said "every time we're redirected... suggested to load it at once"
        // Let's force it for now to be safe, or just call handleUseLegacy() immediately.
        handleUseLegacy();

    }, []);

    return (
        <div className="relative w-full h-screen bg-black overflow-auto">
            {/* Loading indicator while redirecting */}
            <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>Loading AR Experience...</p>
                </div>
            </div>

            {/* MindAR script is now loaded via useEffect manual injection */}

            {/* Container for MindAR video and canvas */}
            <div ref={containerRef} className="absolute inset-0 z-0" />

            {/* UI Overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none p-4 flex flex-col justify-between">
                <div className="flex justify-between pointer-events-auto">
                    <button onClick={() => router.back()} className="p-2 bg-black/50 text-white rounded-full">
                        <ArrowLeft />
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowHeatmap(!showHeatmap)}
                            className={`p - 2 rounded - full ${showHeatmap ? 'bg-primary text-white' : 'bg-black/50 text-white'} `}
                        >
                            <Layers />
                        </button>
                    </div>
                </div>

                <div className="pointer-events-auto flex flex-col items-center gap-2">
                    {!arReady && !showTimeout && <div className="text-white bg-black/50 p-2 rounded">Initializing MindAR...</div>}

                    {(showTimeout) && !arReady && (
                        <div className="flex flex-col gap-2 items-center bg-black/80 p-4 rounded text-white text-center">
                            <p>Loading is taking longer than expected.</p>
                            {isIOSSafari && <p className="text-sm text-yellow-400">iOS Safari detected - try Legacy AR for best compatibility.</p>}
                            <p className="text-sm opacity-70">The modern AR experience may not work on all devices.</p>
                            <div className="flex flex-wrap gap-2 mt-2 justify-center">
                                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white/20 rounded hover:bg-white/30">
                                    Retry
                                </button>
                                <button onClick={handleUseDemo} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
                                    Use Demo Target
                                </button>
                                <button onClick={handleUseLegacy} className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 font-bold">
                                    Use Legacy AR ✓
                                </button>
                            </div>
                        </div>
                    )}

                </div>

                {/* Debug Log Overlay */}
                <div className="pointer-events-auto max-h-40 overflow-y-auto w-full max-w-md bg-black/70 text-xs text-green-400 p-2 rounded mt-2 font-mono scrollbar-hide">
                    {logs.map((log, i) => (
                        <div key={i}>{log}</div>
                    ))}
                    {logs.length === 0 && <div className="opacity-50">Waiting for logs...</div>}
                </div>
            </div>

            {/* Logic Components */}
            <PetPoseDetector
                videoElement={videoRef.current}
                onPoseDetected={handlePoseDetected}
                active={arReady}
            />
        </div>
    );
}
