import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const HeatmapOverlay = ({ points = [] }) => {
    const pointsRef = useRef();

    // Convert incoming points to Float32Array for BufferGeometry
    // Expected points format: [{x, y, z, intensity}, ...]
    const count = points.length;

    const { positions, colors } = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);
        const color = new THREE.Color();

        // 1. Calculate Density/Intensity if missing
        // Naive O(N^2) is okay for N < 1000. 
        // For larger N, we might want to pre-process or just assume server sends intensity.
        // Let's do a simple max-count normalization for client-side fallback.
        let calculatedIntensities = [];

        if (count > 0 && points[0].intensity === undefined) {
            const radius = 0.5; // meters
            const maxDensity = 20; // heuristic max neighbors

            calculatedIntensities = points.map((p, i) => {
                let neighbors = 0;
                for (let j = 0; j < count; j += 5) { // sub-sample for speed
                    if (i === j) continue;
                    const dx = p.x - points[j].x;
                    const dy = p.y - points[j].y;
                    const dz = p.z - points[j].z;
                    if ((dx * dx + dy * dy + dz * dz) < radius * radius) neighbors++;
                }
                return Math.min(neighbors / maxDensity, 1.0);
            });
        }

        for (let i = 0; i < count; i++) {
            const p = points[i];
            pos[i * 3] = p.x;
            pos[i * 3 + 1] = p.y;
            pos[i * 3 + 2] = p.z;

            // Color gradient based on intensity/activity (0.0 to 1.0)
            // Blue (0.6) (calm) -> Red (0.0) (active)
            const val = p.intensity !== undefined ? p.intensity : (calculatedIntensities[i] || 0.1);

            // Logarithmic or visual tweak:
            // High activity = Red (0). Low = Blue (0.6).
            // Formula: hue = 0.6 * (1 - val)
            color.setHSL(0.6 * (1.0 - val), 1.0, 0.5);

            col[i * 3] = color.r;
            col[i * 3 + 1] = color.g;
            col[i * 3 + 2] = color.b;
        }

        return { positions: pos, colors: col };
    }, [points, count]);

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-color"
                    count={count}
                    array={colors}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.15}
                vertexColors
                transparent
                opacity={0.6}
                sizeAttenuation={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};
export default HeatmapOverlay;
