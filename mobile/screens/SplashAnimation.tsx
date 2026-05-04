import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withSequence,
    withRepeat,
    Easing,
    runOnJS,
    useReducedMotion,
} from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/Theme';

interface SplashAnimationProps {
    onComplete: () => void;
}

export default function SplashAnimation({ onComplete }: SplashAnimationProps) {
    const reducedMotion = useReducedMotion();

    // Phase 1 (0.0-0.8s): Paw appearance + breathing
    const pawScale = useSharedValue(0);
    const pawTranslateY = useSharedValue(0);

    // Phase 2 (0.8-1.8s): Floor plane fade
    const floorOpacity = useSharedValue(0);

    // Phase 3 (1.8-2.8s): Tap + wave
    const waveScale = useSharedValue(0);
    const waveOpacity = useSharedValue(0);

    // Phase 4 (2.8-3.2s): Title reveal
    const titleOpacity = useSharedValue(0);
    const titleTranslateY = useSharedValue(30);

    useEffect(() => {
        if (reducedMotion) {
            pawScale.value = 1;
            floorOpacity.value = 0.15;
            titleOpacity.value = 1;
            titleTranslateY.value = 0;
            const t = setTimeout(onComplete, 1000);
            return () => clearTimeout(t);
        }

        // Phase 1: Paw pops in + breathing
        pawScale.value = withSequence(
            withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.2)) }),
            withRepeat(
                withSequence(
                    withTiming(1.02, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                ),
                -1, true,
            ),
        );

        // Phase 2: Floor plane fades in (earlier)
        floorOpacity.value = withDelay(400,
            withTiming(0.12, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        );

        // Phase 3: Calm tap down + bounce back
        pawTranslateY.value = withDelay(800,
            withSequence(
                withTiming(8, { duration: 250, easing: Easing.in(Easing.ease) }),
                withTiming(0, { duration: 350, easing: Easing.out(Easing.back(1.1)) }),
            ),
        );

        // Wave at tap-bottom (800+250=1050ms)
        waveOpacity.value = withDelay(1050,
            withSequence(
                withTiming(0.3, { duration: 60 }),
                withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) }),
            ),
        );
        waveScale.value = withDelay(1050,
            withTiming(4, { duration: 800, easing: Easing.out(Easing.ease) }),
        );

        // Phase 4: Title reveal (much earlier, around brand establish target)
        titleOpacity.value = withDelay(800,
            withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }),
        );
        titleTranslateY.value = withDelay(800,
            withTiming(0, { duration: 500, easing: Easing.out(Easing.back(0.8)) }),
        );

        // Completion - Targeted at ~1.8s
        const completionTimer = setTimeout(onComplete, 1800);
        return () => clearTimeout(completionTimer);
    }, []);

    const pawStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pawScale.value }, { translateY: pawTranslateY.value }],
    }));

    const floorStyle = useAnimatedStyle(() => ({
        opacity: floorOpacity.value,
    }));

    const waveStyle = useAnimatedStyle(() => ({
        opacity: waveOpacity.value,
        transform: [{ scale: waveScale.value }],
    }));

    const titleStyle = useAnimatedStyle(() => ({
        opacity: titleOpacity.value,
        transform: [{ translateY: titleTranslateY.value }],
    }));

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Animated.View style={[styles.floorPlane, floorStyle]} />
            <Animated.View style={[styles.wave, waveStyle]} />
            <Animated.View style={[styles.pawContainer, pawStyle]}>
                <FontAwesome5 name="paw" size={140} color="#FFFFFF" />
            </Animated.View>
            <Animated.View style={[styles.titleContainer, titleStyle]}>
                <Text style={styles.brandTitle}>ChillPup</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.primaryDark,
        alignItems: 'center',
        justifyContent: 'center',
    },
    floorPlane: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: '35%', // Reduced from 45%
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 240, // More subtle curve
        borderTopRightRadius: 240,
        zIndex: 1,
    },
    wave: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.30)',
        zIndex: 5,
    },
    pawContainer: {
        zIndex: 10,
    },
    titleContainer: {
        position: 'absolute',
        bottom: '22%',
        zIndex: 10,
    },
    brandTitle: {
        ...FONTS.h1,
        fontSize: 54,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 2,
        textShadowColor: 'rgba(0,0,0,0.15)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
});
