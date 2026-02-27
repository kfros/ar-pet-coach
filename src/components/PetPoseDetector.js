import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import Script from 'next/script';

// Helper to filter keypoints
// 0: nose, 2: left eye, 5: right eye, 7: left ear, 8: right ear
// 11: left shoulder, 12: right shoulder, 23: left hip, 24: right hip
const RELEVANT_LANDMARKS = [0, 7, 8, 23, 24];

// Dynamic Script Loader Helper
const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        script.crossOrigin = "anonymous";
        document.body.appendChild(script);
    });
};

const PetPoseDetector = ({ videoElement, onPoseDetected, active = true }) => {
    const [poseLandmarker, setPoseLandmarker] = useState(null);
    const [objectDetector, setObjectDetector] = useState(null);
    const [isLooping, setIsLooping] = useState(false);
    const requestRef = useRef();
    const lastRunRef = useRef(0);

    useEffect(() => {
        const initModels = async () => {
            try {
                // 1. Load MediaPipe Pose
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );
                const landmarker = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numPoses: 1
                });
                console.log("MediaPipe Pose Landmarker loaded");
                setPoseLandmarker(landmarker);

                // 2. Load COCO-SSD (via CDN to avoid build issues)
                await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest");
                await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd");

                // Wait a tick for globals
                if (window.cocoSsd) {
                    const detector = await window.cocoSsd.load();
                    console.log("COCO-SSD loaded from CDN");
                    setObjectDetector(detector);
                } else {
                    console.error("window.cocoSsd not found after script load");
                }

            } catch (err) {
                console.error("Error loading models:", err);
            }
        };

        initModels();

        return () => {
            // Cleanup
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, []);



    useEffect(() => {
        if (active && poseLandmarker && objectDetector && videoElement && videoElement.readyState >= 2) {
            startLoop();
        } else {
            stopLoop();
        }
    }, [active, poseLandmarker, objectDetector, videoElement]);

    const startLoop = () => {
        if (isLooping) return;
        setIsLooping(true);
        loop();
    };

    const stopLoop = () => {
        setIsLooping(false);
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
        }
    };

    const loop = async () => {
        if (!active || !videoElement || !poseLandmarker || !objectDetector) {
            setIsLooping(false);
            return;
        }

        const now = performance.now();
        // Throttle to ~10-12 FPS (80ms)
        if (now - lastRunRef.current < 80) {
            requestRef.current = requestAnimationFrame(loop);
            return;
        }
        lastRunRef.current = now;

        // 1. Pre-Filter: Check for Pet
        let petFound = false;
        try {
            const predictions = await objectDetector.detect(videoElement);
            // Check for 'dog', 'cat' (or 'teddy bear' which often matches fluffy dogs)
            // Confidence > 0.6
            const pet = predictions.find(p =>
                (p.class === 'dog' || p.class === 'cat' || p.class === 'teddy bear') && p.score > 0.6
            );
            if (pet) petFound = true;
        } catch (err) {
            console.warn("COCO-SSD inference error:", err);
            // Fallback: Proceed to pose checking if Object Detection fails occasionally
            petFound = true;
        }

        // 2. Pose Detection (only if pet found)
        if (petFound) {
            const result = poseLandmarker.detectForVideo(videoElement, now);

            if (result.landmarks && result.landmarks.length > 0) {
                const rawLandmarks = result.landmarks[0];
                const rawWorldLandmarks = result.worldLandmarks[0];

                // Filter & Select Keypoints (Optional: Could pass limited set, but passing all is more flexible)
                // const keypoints = rawLandmarks.filter((lm, index) => RELEVANT_LANDMARKS.includes(index));

                // Pass both normalized (screen) and world (metric) landmarks
                if (onPoseDetected) {
                    onPoseDetected({
                        normalized: rawLandmarks[0], // Pass nose as primary anchor for now
                        allNormalized: rawLandmarks, // Pass full set for advanced filtering in parent
                        world: rawWorldLandmarks[0],
                        hasPet: true
                    });
                }
            } else {
                // Report pet seen but no pose found (e.g. obscured)
                if (onPoseDetected) onPoseDetected({ hasPet: true, normalized: null });
            }
        } else {
            // No pet seen
            if (onPoseDetected) onPoseDetected({ hasPet: false });
        }

        requestRef.current = requestAnimationFrame(loop);
    };

    return null;
};

export default PetPoseDetector;
