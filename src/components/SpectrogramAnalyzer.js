'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import Meyda from 'meyda';

const SpectrogramAnalyzer = forwardRef(({ audioContext, sourceNode, recording }, ref) => {
    const canvasRef = useRef(null);
    const analyzerRef = useRef(null);
    const historyRef = useRef([]);
    const containerRef = useRef(null);

    useImperativeHandle(ref, () => ({
        getBlob: async () => {
            if (!canvasRef.current) return null;
            return new Promise(resolve => canvasRef.current.toBlob(resolve, 'image/png'));
        },
        reset: () => {
            historyRef.current = [];
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                // Reset width to container width
                if (containerRef.current) {
                    canvas.width = containerRef.current.clientWidth;
                }
            }
        }
    }));

    useEffect(() => {
        if (!audioContext || !sourceNode || !recording) {
            if (analyzerRef.current) analyzerRef.current.stop();
            return;
        }

        // Initialize Meyda
        if (typeof window !== 'undefined') {
            try {
                analyzerRef.current = Meyda.createMeydaAnalyzer({
                    "audioContext": audioContext,
                    "source": sourceNode,
                    "bufferSize": 2048, // Reduced frequency (~21Hz)
                    "featureExtractors": ["mfcc", "loudness"],
                    "callback": (features) => {
                        if (features && features.mfcc) {
                            historyRef.current.push(features.mfcc);
                            // Limit history (1500 * 2px = 3000px max view)
                            // Actually, let's keep 1500.
                            if (historyRef.current.length > 1500) historyRef.current.shift();
                            drawSpectrogram();
                        }
                    }
                });
                analyzerRef.current.start();
            } catch (e) {
                console.error("Meyda init error", e);
            }
        }

        return () => {
            if (analyzerRef.current) analyzerRef.current.stop();
        };
    }, [audioContext, sourceNode, recording]);

    useEffect(() => {
        // Auto-scroll logic
        if (recording && containerRef.current && historyRef.current.length > 0) {
            const cellWidth = 2;
            const currentHeadX = historyRef.current.length * cellWidth;
            const containerWidth = containerRef.current.clientWidth;

            if (currentHeadX > containerWidth) {
                containerRef.current.scrollLeft = currentHeadX - containerWidth + 20;
            } else {
                containerRef.current.scrollLeft = 0;
            }
        }
    });

    const drawSpectrogram = () => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const cellWidth = 2; // 2px per frame
        const dataLen = historyRef.current.length;

        // Dynamic Width Logic:
        // Canvas is exactly as wide as the data, or as wide as the container (if data is small).
        // This ensures the scrollbar only appears when data exceeds container.
        const requiredWidth = Math.max(container.clientWidth, dataLen * cellWidth);
        const height = canvas.height;

        // Resize if needed (clears canvas)
        if (canvas.width !== requiredWidth) {
            canvas.width = requiredWidth;
        }

        const ctx = canvas.getContext('2d');

        // Fill Background (Black)
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, height);

        const mfccData = historyRef.current;
        if (mfccData.length === 0) return;

        const cellHeight = height / 13;

        mfccData.forEach((mfcc, timeIndex) => {
            mfcc.forEach((val, freqIndex) => {
                const intensity = Math.min(255, Math.max(0, (val + 10) * 10));
                ctx.fillStyle = `rgb(${intensity},0,${255 - intensity})`;
                ctx.fillRect(timeIndex * cellWidth, height - (freqIndex * cellHeight), cellWidth, cellHeight);
            });
        });
    };

    return (
        <div ref={containerRef} className="w-full h-32 bg-black rounded-lg overflow-x-auto border border-white/20 shadow-inner scrollbar-thin scrollbar-thumb-white/20">
            <canvas
                ref={canvasRef}
                height={150}
                className="h-full"
            />
        </div>
    );
});

SpectrogramAnalyzer.displayName = 'SpectrogramAnalyzer';
export default SpectrogramAnalyzer;
