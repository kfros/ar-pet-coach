import React, { useEffect, useRef, useCallback } from 'react';
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

type PawState = 'idle' | 'invitation' | 'interaction' | 'calm';

export default function AnimatedPawIcon({
    color = COLORS.primary,
    size = 40,
}: AnimatedPawIconProps) {
    const reducedMotion = useReducedMotion();

    const scaleX = useSharedValue(1);
    const scaleY = useSharedValue(1);

    const stateRef = useRef<PawState>('idle');
    const invitationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const calmInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearTimers = useCallback(() => {
        if (invitationTimer.current) {
            clearTimeout(invitationTimer.current);
            invitationTimer.current = null;
        }
        if (calmInterval.current) {
            clearInterval(calmInterval.current);
            calmInterval.current = null;
        }
    }, []);

    // State 1: Idle — subtle breathing
    const startIdle = useCallback(() => {
        if (reducedMotion) return;
        stateRef.current = 'idle';
        cancelAnimation(scaleX);
        cancelAnimation(scaleY);
        scaleX.value = withTiming(1, { duration: 200 });
        scaleY.value = withRepeat(
            withSequence(
                withTiming(1.02, { duration: 2250, easing: Easing.inOut(Easing.ease) }),
                withTiming(1.0, { duration: 2250, easing: Easing.inOut(Easing.ease) }),
            ),
            -1, true,
        );
        invitationTimer.current = setTimeout(() => {
            if (stateRef.current === 'idle') playInvitation();
        }, 5000);
    }, [reducedMotion]);

    // State 2: Invitation — single soft bounce
    const playInvitation = useCallback(() => {
        if (reducedMotion) return;
        stateRef.current = 'invitation';
        cancelAnimation(scaleX);
        cancelAnimation(scaleY);
        scaleY.value = withSequence(
            withTiming(0.95, { duration: 200, easing: Easing.out(Easing.ease) }),
            withTiming(1.05, { duration: 300, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.0, { duration: 300, easing: Easing.out(Easing.ease) }),
        );
        scaleX.value = withSequence(
            withDelay(200, withTiming(1.03, { duration: 300, easing: Easing.inOut(Easing.ease) })),
            withTiming(1.0, { duration: 300, easing: Easing.out(Easing.ease) }),
        );
        invitationTimer.current = setTimeout(() => {
            if (stateRef.current === 'invitation') startIdle();
        }, 850);
    }, [reducedMotion, startIdle]);

    // State 3: Interaction — squish on tap
    const handleTap = useCallback(() => {
        clearTimers();
        stateRef.current = 'interaction';
        if (reducedMotion) return;
        cancelAnimation(scaleX);
        cancelAnimation(scaleY);
        scaleY.value = withTiming(0.92, { duration: 150, easing: Easing.out(Easing.ease) });
        scaleX.value = withTiming(1.08, { duration: 150, easing: Easing.out(Easing.ease) });
        setTimeout(() => {
            scaleY.value = withTiming(1.0, { duration: 400, easing: Easing.out(Easing.back(1.5)) });
            scaleX.value = withTiming(1.0, { duration: 400, easing: Easing.out(Easing.back(1.5)) });
            setTimeout(() => startCalm(), 420);
        }, 160);
    }, [reducedMotion, clearTimers]);

    // State 4: Calm — rare micro-breath
    const startCalm = useCallback(() => {
        stateRef.current = 'calm';
        if (reducedMotion) return;
        calmInterval.current = setInterval(() => {
            if (stateRef.current !== 'calm') return;
            scaleY.value = withSequence(
                withTiming(1.005, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1.0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
            );
        }, 15000);
    }, [reducedMotion]);

    useEffect(() => {
        startIdle();
        return () => {
            clearTimers();
            cancelAnimation(scaleX);
            cancelAnimation(scaleY);
        };
    }, []);

    const tapGesture = Gesture.Tap().onStart(() => {
        runOnJS(handleTap)();
    });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scaleX: scaleX.value }, { scaleY: scaleY.value }],
    }));

    return (
        <GestureDetector gesture={tapGesture}>
            <Animated.View style={[styles.wrapper, animatedStyle]}>
                <View style={styles.circle}>
                    <FontAwesome5 name="paw" size={size} color={color} />
                </View>
            </Animated.View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    wrapper: { alignItems: 'center', marginBottom: 20 },
    circle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: COLORS.background,
        justifyContent: 'center', alignItems: 'center',
        ...SHADOWS.small,
    },
});
