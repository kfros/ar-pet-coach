import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../constants/Theme';
import PetProfileRepository from '../services/petProfileRepository';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: "Guided Calming\nSessions",
        description: "Start short activities designed to help your pet relax, focus, and feel safe.",
        image: 'paw'
    },
    {
        id: '2',
        title: "Gentle Routines,\nStep by Step",
        description: "Follow simple calming exercises, safety tips, and visual session guidance anywhere.",
        image: 'list'
    },
    {
        id: '3',
        title: "Track What Works\nOver Time",
        description: "Save sessions, follow progress, and learn which routines help your pet most.",
        image: 'stats-chart'
    }
];

export default function OnboardingCarousel({ navigation }: any) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const onScroll = (e: any) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / width);
        setCurrentIndex(index);
    };

    const completeOnboarding = async () => {
        await PetProfileRepository.setOnboardingCompleted(true);
        navigation.replace('Login');
    };

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
        } else {
            completeOnboarding();
        }
    };

    const handleSkip = () => {
        completeOnboarding();
    };

    const renderItem = ({ item }: { item: typeof SLIDES[0] }) => {
        return (
            <View style={styles.slide}>
                <View style={styles.imageContainer}>
                    <Ionicons name={item.image as any} size={120} color={COLORS.mint} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.description}>{item.description}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Pressable
                style={({ pressed }) => [
                    styles.skipButton,
                    pressed && { opacity: 0.7 }
                ]}
                onPress={handleSkip}
            >
                <Text style={styles.skipText}>Skip intro</Text>
            </Pressable>

            <FlatList
                ref={flatListRef}
                data={SLIDES}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                bounces={false}
                scrollEventThrottle={16}
            />

            <View style={styles.footer}>
                <View style={styles.indicatorContainer}>
                    {SLIDES.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.indicator,
                                currentIndex === index && styles.indicatorActive,
                            ]}
                        />
                    ))}
                </View>

                <Pressable
                    style={({ pressed }) => [
                        styles.nextButton,
                        pressed && { backgroundColor: COLORS.primaryDark, transform: [{ scale: 0.98 }] }
                    ]}
                    onPress={handleNext}
                >
                    <Text style={styles.nextButtonText}>
                        {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
                    </Text>
                    {currentIndex < SLIDES.length - 1 && (
                        <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
                    )}
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    skipButton: {
        position: 'absolute',
        top: 60,
        right: 24,
        zIndex: 10,
        padding: 8,
    },
    skipText: {
        ...FONTS.body,
        color: COLORS.textSecondary,
        fontWeight: 'bold',
    },
    slide: {
        width,
        alignItems: 'center',
        padding: SIZES.padding,
        paddingTop: height * 0.15,
    },
    imageContainer: {
        width: width * 0.7,
        height: width * 0.7,
        backgroundColor: COLORS.lavender,
        borderRadius: width * 0.35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    textContainer: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    title: {
        ...FONTS.h1,
        color: COLORS.primary,
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        ...FONTS.body,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        padding: SIZES.padding,
        paddingBottom: 50,
        justifyContent: 'space-between',
    },
    indicatorContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 32,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.border,
        marginHorizontal: 4,
    },
    indicatorActive: {
        backgroundColor: COLORS.primary,
        width: 24,
    },
    nextButton: {
        backgroundColor: COLORS.primary,
        borderRadius: SIZES.radius,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    nextButtonText: {
        ...FONTS.h3,
        color: '#FFF',
    },
});
