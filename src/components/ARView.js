'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Camera, AlertTriangle, Play } from 'lucide-react';
import Script from 'next/script';

export default function ARView({ onClose, onScanComplete }) {
    const [scriptsLoaded, setScriptsLoaded] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [arReady, setArReady] = useState(false);
    const [arTimeout, setArTimeout] = useState(false);
    const [markerFound, setMarkerFound] = useState(false);
    const sceneRef = useRef(null);
    const lastBridgeMessage = useRef(0);

    // **ROUND 18: Cleanup function for beforeunload**
    const cleanupCamera = () => {
        const video = document.querySelector('.arjs-video');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => {
                track.stop();
                console.log("Debug: Track stopped on cleanup");
            });
            video.srcObject = null;
        }
    };

    // Initialize Native Bridge & beforeunload cleanup
    useEffect(() => {
        const handleNativeMessage = (event) => {
            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                console.log("Received native message:", data);
            } catch (e) {
                console.error("Error parsing native message", e);
            }
        };

        // **ROUND 18: Force cleanup on page unload/refresh**
        const handleBeforeUnload = () => {
            cleanupCamera();
        };

        window.addEventListener('message', handleNativeMessage);
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pagehide', handleBeforeUnload); // iOS Safari uses pagehide

        if (window.webkit?.messageHandlers?.native) {
            window.webkit.messageHandlers.native.postMessage({ type: 'WEBVIEW_READY' });
        }

        return () => {
            window.removeEventListener('message', handleNativeMessage);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('pagehide', handleBeforeUnload);
            cleanupCamera();
        };
    }, []);

    // Timeout watchdog - 30s
    useEffect(() => {
        let timer;
        if (permissionGranted && !arReady) {
            timer = setTimeout(() => {
                setArTimeout(true);
            }, 30000);
        }
        return () => clearTimeout(timer);
    }, [permissionGranted, arReady]);

    // **ROUND 18: Marker Event Listeners using DOM query instead of ref**
    useEffect(() => {
        if (arReady) {
            // Use DOM query as refs on custom elements can be unreliable
            const marker = document.querySelector('a-marker[preset="hiro"]');

            if (marker) {
                console.log("Debug: Marker element found via DOM query");

                const handleMarkerFound = () => {
                    console.log("Hiro Marker found!");
                    alert("Debug: Marker Found!");
                    setMarkerFound(true);

                    const now = Date.now();
                    if (now - lastBridgeMessage.current > 1000) {
                        if (window.webkit?.messageHandlers?.native) {
                            window.webkit.messageHandlers.native.postMessage({ type: 'TRACKING_FOUND' });
                        }
                        lastBridgeMessage.current = now;
                    }
                };

                const handleMarkerLost = () => {
                    console.log("Hiro Marker lost");
                    setMarkerFound(false);
                };

                marker.addEventListener('markerFound', handleMarkerFound);
                marker.addEventListener('markerLost', handleMarkerLost);

                return () => {
                    marker.removeEventListener('markerFound', handleMarkerFound);
                    marker.removeEventListener('markerLost', handleMarkerLost);
                };
            } else {
                console.log("Debug: Marker element NOT found via DOM query");
            }
        }
    }, [arReady]);

    // Scene Load Detection
    useEffect(() => {
        const scene = sceneRef.current;
        if (scene) {
            const handleLoaded = () => {
                console.log("AR Scene 'loaded' event fired");
                alert("Debug: AR Scene Loaded Successfully!");
                setArReady(true);
                setArTimeout(false);

                // Wait for AR.js to create its video
                let attempts = 0;
                const pollVideo = setInterval(() => {
                    attempts++;
                    const video = document.querySelector('.arjs-video');
                    if (video) {
                        clearInterval(pollVideo);
                        alert(`Debug: AR.js Video Found (Attempt ${attempts})`);
                        video.setAttribute('playsinline', '');
                        video.setAttribute('webkit-playsinline', '');
                        video.muted = true;
                    } else if (attempts >= 20) {
                        clearInterval(pollVideo);
                        alert("Warning: AR.js Video NOT Found after 10s.");
                    }
                }, 500);
            };

            const handleCameraError = (e) => {
                console.error("Camera Error:", e);
                alert("Error: AR Camera failed. " + (e.detail?.error?.message || ""));
            };

            if (scene.hasLoaded) {
                handleLoaded();
            } else {
                scene.addEventListener('loaded', handleLoaded);
                scene.addEventListener('camera-error', handleCameraError);
            }

            return () => {
                scene.removeEventListener('loaded', handleLoaded);
                scene.removeEventListener('camera-error', handleCameraError);
                cleanupCamera();
            };
        }
    }, [scriptsLoaded, permissionGranted]);

    const requestPermissions = async () => {
        try {
            // STEP 1: Motion Permission (iOS Requirement)
            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                const permissionState = await DeviceOrientationEvent.requestPermission();
                if (permissionState !== 'granted') {
                    alert("Error: Motion permission denied.");
                    return;
                }
            }

            // Only test camera permission, then STOP the stream immediately
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            stream.getTracks().forEach(track => track.stop());

            alert("Debug: Camera permission granted. Starting AR.js...");

            setTimeout(() => {
                setPermissionGranted(true);
            }, 500);

        } catch (error) {
            console.error("Permission request failed:", error);
            alert(`Error: Permission failed. ${error.message}`);
        }
    };

    const handleReload = () => {
        cleanupCamera();
        window.location.reload();
    };

    const forceStart = () => {
        setArReady(true);
        setArTimeout(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black">
            {/* A-Frame 1.6.0 */}
            <Script
                src="https://aframe.io/releases/1.6.0/aframe.min.js"
                strategy="afterInteractive"
            />
            {/* Standard AR.js for Hiro markers */}
            <Script
                src="https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js"
                strategy="afterInteractive"
                onLoad={() => {
                    setScriptsLoaded(true);
                }}
            />

            {/* Stage 1: Permission Grant UI */}
            {!permissionGranted && (
                <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black text-white p-6">
                    <div className="max-w-sm text-center space-y-6">
                        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                            <Camera size={40} className="text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold">Start AR Scanner</h2>
                        <p className="text-sm text-gray-400">Point your camera at a Hiro marker to begin.</p>
                        <button
                            onClick={requestPermissions}
                            className="btn btn-primary w-full py-4 text-lg font-semibold rounded-xl"
                        >
                            Start Camera
                        </button>
                        <button onClick={onClose} className="text-sm text-gray-400 hover:text-white underline">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Stage 2: Loading / Timeout UI */}
            {permissionGranted && !arReady && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-transparent pointer-events-none">
                    <div className="bg-black/80 text-white p-6 rounded-xl pointer-events-auto text-center m-6 backdrop-blur-md">
                        {!arTimeout ? (
                            <>
                                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                                <h3 className="text-xl font-semibold mb-2">Initializing AR...</h3>
                                <p className="text-sm text-gray-400 mb-4">Please wait...</p>
                                <button
                                    onClick={forceStart}
                                    className="btn btn-sm btn-outline border-white/20 text-white hover:bg-white/10 flex items-center gap-2 mx-auto"
                                >
                                    <Play size={14} /> Force Start
                                </button>
                            </>
                        ) : (
                            <div className="max-w-xs mx-auto">
                                <div className="w-12 h-12 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangle size={24} />
                                </div>
                                <h3 className="text-lg font-bold mb-2">Still Loading...</h3>
                                <p className="text-sm text-gray-400 mb-4">
                                    If you see the camera feed, click "Force Start".
                                </p>
                                <button onClick={forceStart} className="btn btn-primary btn-sm w-full mb-2">
                                    Force Start
                                </button>
                                <button onClick={handleReload} className="btn btn-outline btn-sm w-full mb-2">
                                    Reload Page
                                </button>
                                <button onClick={onClose} className="text-sm text-gray-500 hover:text-white underline">
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {permissionGranted && scriptsLoaded && (
                <a-scene
                    vr-mode-ui="enabled: false;"
                    renderer="logarithmicDepthBuffer: false; precision: medium; alpha: true; antialias: false;"
                    embedded
                    arjs="sourceType: webcam; debugUIEnabled: false; detectionMode: mono_and_matrix; matrixCodeType: 3x3;"
                    ref={sceneRef}
                >
                    <a-marker preset="hiro" emitevents="true">
                        <a-entity
                            geometry="primitive: box"
                            material="color: #6d28d9; transparent: true; opacity: 0.8"
                            scale="0.5 0.5 0.5"
                            position="0 0.25 0"
                            animation="property: rotation; to: 0 360 0; loop: true; dur: 4000"
                        ></a-entity>
                    </a-marker>

                    <a-entity camera></a-entity>
                </a-scene>
            )}

            {arReady && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-40">
                    <div className="flex justify-between items-start">
                        <div className={`px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md transition-colors ${markerFound ? 'bg-green-500/80 text-white' : 'bg-black/50 text-white'
                            }`}>
                            {markerFound ? 'Tracking Active' : 'Point at Hiro marker'}
                        </div>
                        <button
                            onClick={() => { cleanupCamera(); onClose(); }}
                            className="p-2 bg-black/50 backdrop-blur-md rounded-full text-white pointer-events-auto hover:bg-black/70 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {!markerFound && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/60 text-white p-6 rounded-xl text-center max-w-xs backdrop-blur-sm">
                                <p className="font-bold mb-2">Scan Hiro Marker</p>
                                <p className="text-sm text-gray-200">
                                    Print or display a Hiro marker and point your camera at it.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style jsx global>{`
                .arjs-video {
                    z-index: -1 !important;
                    position: absolute !important;
                    width: 100% !important;
                    height: 100% !important;
                    top: 0;
                    left: 0;
                    object-fit: cover !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                }
                a-scene {
                    height: 100vh;
                    width: 100vw;
                    position: absolute;
                    top: 0;
                    left: 0;
                    z-index: 10;
                }
            `}</style>
        </div>
    );
}
