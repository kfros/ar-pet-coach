import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Easing } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/Theme';

interface SplashAnimationProps {
    onComplete: () => void;
}

export default function SplashAnimation({ onComplete }: SplashAnimationProps) {
    const tailRotation = useRef(new Animated.Value(0)).current;
    const tailOpacity = useRef(new Animated.Value(1)).current;
    const heartScale = useRef(new Animated.Value(0)).current;
    const heartOpacity = useRef(new Animated.Value(0)).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const textTranslateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        // 1. Shaking tail (wagging erratically)
        const tailWag = Animated.loop(
            Animated.sequence([
                Animated.timing(tailRotation, { toValue: 1, duration: 80, easing: Easing.linear, useNativeDriver: true }),
                Animated.timing(tailRotation, { toValue: -1, duration: 80, easing: Easing.linear, useNativeDriver: true }),
            ]),
            { iterations: 8 }
        );

        tailWag.start(() => {
            // After wagging, reset tail rotation
            Animated.timing(tailRotation, { toValue: 0, duration: 200, useNativeDriver: true }).start();

            // 2. Fade out tail, show heart
            Animated.parallel([
                Animated.timing(tailOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.spring(heartScale, { toValue: 1, damping: 10, stiffness: 80, useNativeDriver: true }),
                Animated.timing(heartOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start(() => {
                // 3. AR overlay fades in
                Animated.timing(overlayOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }).start();

                // 4. App name fades in
                setTimeout(() => {
                    Animated.parallel([
                        Animated.timing(textOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
                        Animated.timing(textTranslateY, { toValue: 0, duration: 800, useNativeDriver: true }),
                    ]).start();
                }, 400);
            });
        });

        // Navigate away after animation completes
        const timeout = setTimeout(() => {
            onComplete();
        }, 4500);

        return () => clearTimeout(timeout);
    }, []);

    const tailRotateInterpolation = tailRotation.interpolate({
        inputRange: [-1, 1],
        outputRange: ['-20deg', '20deg'],
    });

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                {/* Dog Tail / Anxiety Phase */}
                <Animated.View style={[styles.iconWrapper, { opacity: tailOpacity, transform: [{ rotate: tailRotateInterpolation }] }]}>
                    <FontAwesome5 name="dog" size={80} color="#EF4444" />
                </Animated.View>

                {/* Heart / Calm Phase */}
                <Animated.View style={[styles.iconWrapper, { position: 'absolute', opacity: heartOpacity, transform: [{ scale: heartScale }] }]}>
                    <Ionicons name="heart" size={100} color={COLORS.mint} />
                </Animated.View>

                {/* AR Overlay */}
                <Animated.View style={[styles.arOverlay, { opacity: overlayOpacity }]}>
                    <Ionicons name="scan" size={160} color={COLORS.primary} style={{ opacity: 0.3 }} />
                    <Ionicons name="glasses" size={60} color={COLORS.primary} style={styles.absoluteCenter} />
                </Animated.View>
            </View>

            <Animated.View style={[styles.textContainer, { opacity: textOpacity, transform: [{ translateY: textTranslateY }] }]}>
                <Text style={styles.title}>ChillPup AR</Text>
                <Text style={styles.subtitle}>Calm Your Furry Friend</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    iconWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    arOverlay: {
        position: 'absolute',
        zIndex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    absoluteCenter: {
        position: 'absolute',
    },
    textContainer: {
        marginTop: 40,
        alignItems: 'center',
    },
    title: {
        ...FONTS.h1,
        color: COLORS.primary,
        marginBottom: 8,
    },
    subtitle: {
        ...FONTS.body,
        color: COLORS.accent,
    },
});
