import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    withDelay,
    Easing,
    runOnJS,
    cancelAnimation,
    useReducedMotion,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/Theme';

interface AnimatedPawIconProps {
    color?: string;
    size?: number;
}

export default function AnimatedPawIcon({ color = COLORS.primary, size = 40 }: AnimatedPawIconProps) {
    const reducedMotion = useReducedMotion();

    // Shared Values for transformations
    const scaleY = useSharedValue(1);
    const scaleX = useSharedValue(1);

    // Non-animated Refs for state tracking
    const currentState = useRef<'idle' | 'invitation' | 'interaction' | 'calm'>('idle');
    const invitationTimer = useRef<NodeJS.Timeout | null>(null);
    const calmTimer = useRef<NodeJS.Timeout | null>(null);

    const startIdle = () => {
        if (reducedMotion) return;
        currentState.current = 'idle';

        // Reset scales
        scaleX.value = withTiming(1, { duration: 300 });

        // Very subtle breathing: 1.0 -> 1.02 -> 1.0 over 4.5s
        scaleY.value = withRepeat(
            withSequence(
                withTiming(1.02, { duration: 2250, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 2250, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );

        // Schedule invitation after 5 seconds of idling
        invitationTimer.current = setTimeout(() => {
            if (currentState.current === 'idle') {
                playInvitation();
            }
        }, 5000);
    };

    const playInvitation = () => {
        if (reducedMotion) return;
        currentState.current = 'invitation';

        // Single soft bounce
        scaleY.value = withSequence(
            withTiming(0.95, { duration: 200, easing: Easing.out(Easing.ease) }),
            withTiming(1.05, { duration: 300, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 300, easing: Easing.bounce })
        );

        scaleX.value = withSequence(
            withDelay(200, withTiming(1.03, { duration: 300, easing: Easing.inOut(Easing.ease) })),
            withTiming(1, { duration: 300, easing: Easing.bounce })
        );

        // Return to idle breathing after bounce completes
        invitationTimer.current = setTimeout(() => {
            if (currentState.current === 'invitation') {
                startIdle();
            }
        }, 900);
    };

    const handleTap = () => {
        if (currentState.current === 'interaction') return;

        currentState.current = 'interaction';

        // Clear existing timers
        if (invitationTimer.current) clearTimeout(invitationTimer.current);
        if (calmTimer.current) clearTimeout(calmTimer.current);

        if (reducedMotion) return;

        // Cancel running breathing/invitation animations
        cancelAnimation(scaleX);
        cancelAnimation(scaleY);

        // Immediate squish down
        scaleY.value = withTiming(0.92, { duration: 150, easing: Easing.out(Easing.ease) });
        // Expand outward slightly
        scaleX.value = withTiming(1.08, { duration: 150, easing: Easing.out(Easing.ease) });

        // Smooth return to normal (duration 400ms) with slight overshoot
        setTimeout(() => {
            scaleY.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.5)) });
            scaleX.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.5)) });

            // Transition to Calm state after return
            calmTimer.current = setTimeout(() => {
                startCalm();
            }, 450);
        }, 150);
    };

    const startCalm = () => {
        currentState.current = 'calm';
        if (reducedMotion) return;

        // Very rare, minimal breathing (every ~15s)
        const triggerMicroBreath = () => {
            if (currentState.current !== 'calm') return;
            scaleY.value = withSequence(
                withTiming(1.005, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            );
        };

        calmTimer.current = setInterval(triggerMicroBreath, 15000);
    };

    useEffect(() => {
        // Start idle breathing loop on mount
        startIdle();

        // Cleanup function
        return () => {
            if (invitationTimer.current) clearTimeout(invitationTimer.current);
            if (calmTimer.current) clearInterval(calmTimer.current);
            cancelAnimation(scaleX);
            cancelAnimation(scaleY);
        };
    }, []);

    const tapGesture = Gesture.Tap().onStart(() => {
        runOnJS(handleTap)();
    });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scaleX: scaleX.value },
                { scaleY: scaleY.value }
            ]
        };
    });

    return (
        <GestureDetector gesture={tapGesture}>
            <Animated.View style={[styles.container, animatedStyle]}>
                <View style={styles.iconCircle}>
                    <FontAwesome5 name="paw" size={size} color={color} />
                </View>
            </Animated.View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.background, // Match container exactly or use pure white '#FFF'
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
    }
});
