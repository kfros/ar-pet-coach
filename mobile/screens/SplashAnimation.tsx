import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
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
            withTiming(1, { duration: 700, easing: Easing.out(Easing.back(1.5)) }),
            withRepeat(
                withSequence(
                    withTiming(1.02, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
                ),
                -1, true,
            ),
        );

        // Phase 2: Floor plane fades in
        floorOpacity.value = withDelay(800,
            withTiming(0.18, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        );

        // Phase 3: Calm tap down + bounce back
        pawTranslateY.value = withDelay(1800,
            withSequence(
                withTiming(10, { duration: 300, easing: Easing.in(Easing.ease) }),
                withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.2)) }),
            ),
        );

        // Wave at tap-bottom (1800+300=2100ms)
        waveOpacity.value = withDelay(2100,
            withSequence(
                withTiming(0.35, { duration: 80 }),
                withTiming(0, { duration: 1300, easing: Easing.out(Easing.ease) }),
            ),
        );
        waveScale.value = withDelay(2100,
            withTiming(4.5, { duration: 1300, easing: Easing.out(Easing.ease) }),
        );

        // Phase 4: Title reveal
        titleOpacity.value = withDelay(2800,
            withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }),
        );
        titleTranslateY.value = withDelay(2800,
            withTiming(0, { duration: 600, easing: Easing.out(Easing.back(1)) }),
        );

        // Completion
        const completionTimer = setTimeout(onComplete, 3600);
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
            <Animated.View style={[styles.floorPlane, floorStyle]} />
            <Animated.View style={[styles.wave, waveStyle]} />
            <Animated.View style={[styles.pawContainer, pawStyle]}>
                <FontAwesome5 name="paw" size={140} color="#FFFFFF" />
            </Animated.View>
            <Animated.View style={[styles.titleContainer, titleStyle]}>
                <Text style={styles.brandTitle}>ChillPup AR</Text>
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
        height: '45%',
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 180,
        borderTopRightRadius: 180,
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
