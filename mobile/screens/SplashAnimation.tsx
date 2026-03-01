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

    // 0.0s - 0.8s: Paw Appearance
    const pawScale = useSharedValue(0);
    const pawTranslateY = useSharedValue(0);

    // 0.8s - 1.8s: Floor Plane Fade
    const floorOpacity = useSharedValue(0);

    // 1.8s - 2.8s: Tap + Wave
    const waveScale = useSharedValue(0);
    const waveOpacity = useSharedValue(0);

    // 2.8s - 3.2s: Title Reveal
    const titleOpacity = useSharedValue(0);
    const titleTranslateY = useSharedValue(30);

    useEffect(() => {
        if (reducedMotion) {
            // Bypass sequence for accessibility: instant show
            pawScale.value = 1;
            floorOpacity.value = 0.15;
            titleOpacity.value = 1;
            titleTranslateY.value = 0;

            const timer = setTimeout(() => runOnJS(onComplete)(), 1000);
            return () => clearTimeout(timer);
        }

        // --- SEQUENCE TIMELINE ---

        // 0.0s: Paw scale in + start breathing
        pawScale.value = withSequence(
            withTiming(1, { duration: 700, easing: Easing.out(Easing.back(1.5)) }),
            withRepeat(
                withSequence(
                    withTiming(1.02, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) })
                ),
                -1, // Infinite breathing while sequence runs
                true
            )
        );

        // 0.8s: Floor fades in
        floorOpacity.value = withDelay(
            800,
            withTiming(0.18, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        );

        // 1.8s: Calm Tap Action
        pawTranslateY.value = withDelay(
            1800,
            withSequence(
                withTiming(10, { duration: 300, easing: Easing.in(Easing.ease) }),
                withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.2)) })
            )
        );

        // 1.8s + 300ms (at tap bottom): Radial Wave expands outward
        waveOpacity.value = withDelay(
            2100,
            withSequence(
                withTiming(0.35, { duration: 100 }), // Instantly visible at tap
                withTiming(0, { duration: 1300, easing: Easing.out(Easing.ease) }) // Fades out widely
            )
        );
        waveScale.value = withDelay(
            2100,
            withTiming(4.5, { duration: 1300, easing: Easing.out(Easing.ease) }) // Expands massively
        );

        // 2.8s: Title reveals gracefully
        titleOpacity.value = withDelay(
            2800,
            withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) })
        );
        titleTranslateY.value = withDelay(
            2800,
            withTiming(0, { duration: 600, easing: Easing.out(Easing.back(1)) })
        );

        // 3.6s: Trigger completion
        const completionTimer = setTimeout(() => {
            runOnJS(onComplete)();
        }, 3600);

        return () => {
            clearTimeout(completionTimer);
        };
    }, []);

    // Reanimated Styles mapping
    const pawStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: pawScale.value },
            { translateY: pawTranslateY.value }
        ]
    }));

    const floorStyle = useAnimatedStyle(() => ({
        opacity: floorOpacity.value
    }));

    const waveStyle = useAnimatedStyle(() => ({
        opacity: waveOpacity.value,
        transform: [{ scale: waveScale.value }]
    }));

    const titleStyle = useAnimatedStyle(() => ({
        opacity: titleOpacity.value,
        transform: [{ translateY: titleTranslateY.value }]
    }));

    return (
        <View style={styles.container}>
            {/* Background elements container */}
            <View style={StyleSheet.absoluteFillObject} />

            {/* Floor Plane (hints at AR environment space) */}
            <Animated.View style={[styles.floorPlane, floorStyle]} />

            {/* Tap Wave Ring */}
            <Animated.View style={[styles.radialWave, waveStyle]} />

            {/* Main Character / Icon */}
            <View style={styles.centerStage}>
                <Animated.View style={pawStyle}>
                    <FontAwesome5 name="paw" size={140} color="#FFFFFF" />
                </Animated.View>
            </View>

            {/* Text Reveal Area (positioned below center stage) */}
            <Animated.View style={[styles.textRevealBox, titleStyle]}>
                <Text style={styles.brandTitle}>ChillPup AR</Text>
            </Animated.View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.primaryDark, // #0B5E57
        alignItems: 'center',
        justifyContent: 'center',
    },
    // The subtle floor hinting at the grounded AR space that fades in
    floorPlane: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: '45%',
        backgroundColor: 'rgba(255,255,255,1)', // Actual opacity handled by reanimated
        borderTopLeftRadius: 180,
        borderTopRightRadius: 180,
        zIndex: 1,
    },
    centerStage: {
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    radialWave: {
        position: 'absolute',
        width: 140, // Base size matching the icon bounding box roughly
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,1)', // Opacity controlled by Reanimated
        zIndex: 5,
    },
    textRevealBox: {
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
    }
});
