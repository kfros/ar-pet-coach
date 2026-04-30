import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    FlatList,
    Pressable,
    RefreshControl,
    Dimensions,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Purchases from 'react-native-purchases';
import {
    auth,
    db,
} from '../services/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import { useSubscription } from '../components/SubscriptionManager';
import {
    getAnxietyColor,
    getAnxietyLabel,
    getAnxietyDescription,
} from '../helpers/anxietyGradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import PetProfileRepository from '../services/petProfileRepository';
import SessionService from '../services/sessionService';
import { signOut } from '../services/authService';

export default function DashboardScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [petId, setPetId] = useState<string | null>(null);
    const [petData, setPetData] = useState<any>(null);
    const [authMode, setAuthMode] = useState<string>('unauthenticated');
    const [progressSummary, setProgressSummary] = useState<string | null>(null);
    const [recommendedSession, setRecommendedSession] = useState<any>(null);
    const [recommendationReason, setRecommendationReason] = useState<string>('');

    const { isPremium, checkPaywallTrigger, trackCalmingSession } = useSubscription();
    const insets = useSafeAreaInsets();

    const anxietyScore = petData?.anxietyScore ?? 0;
    const anxietyColor = getAnxietyColor(anxietyScore);
    const anxietyLabel = getAnxietyLabel(anxietyScore);
    const anxietyDesc = getAnxietyDescription(anxietyScore);

    const fetchData = async () => {
        try {
            const mode = await PetProfileRepository.getAuthMode();
            setAuthMode(mode);

            const pet = await PetProfileRepository.getPetProfile();

            if (pet) {
                setPetData(pet);
                setPetId(pet.id || 'guest_pet');
                setProfile({ petName: pet.petName }); // Fallback for header

                // Fetch recommendations and progress
                const summary = await SessionService.getRecentProgressSummary(pet.id || 'guest_pet');
                setProgressSummary(summary);

                // Simple recommendation logic
                const allSessions = SessionService.getSessions();
                let recommended = allSessions.find(s => s.id === 'daily_calm_reset');
                let reason = 'Start with a calm foundation routine';

                if (pet.anxietyTriggers?.includes('loud_noises') || pet.anxietyTriggers?.includes('fireworks')) {
                    recommended = allSessions.find(s => s.id === 'fireworks_loud_noises_basic');
                    reason = 'Recommended because loud noises are selected';
                }

                setRecommendedSession(recommended);
                setRecommendationReason(reason);
            } else {
                // If no pet profile, we'll show the "Add First Pet" state which is already in the render
                setPetData(null);
                setPetId(null);
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };


    useFocusEffect(useCallback(() => { fetchData(); }, []));
    const onRefresh = () => { setRefreshing(true); fetchData(); };

    const handleStartSession = (sessionId?: string) => {
        if (!petId) {
            navigation.navigate('Paywall', { warning: 'Add pet to start calming sessions.' });
            return;
        }

        const id = sessionId || recommendedSession?.id || 'daily_calm_reset';
        navigation.navigate('SessionPreview', { sessionId: id, petId });
    };


    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
    }

    if (!petId) {
        return (
            <View style={[styles.container, { padding: 20 }]}>
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <Text style={styles.headerTitle}>Welcome</Text>
                    <Pressable
                        onPress={() => navigation.navigate('Settings')}
                        style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.6 }]}
                    >
                        <Ionicons
                            name="person-outline"
                            size={24}
                            color={COLORS.primary}
                        />
                    </Pressable>
                </View>

                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={styles.noPetAvatar}><Text style={{ fontSize: 80 }}>🐕</Text></View>
                    <Text style={styles.noPetTitle}>Welcome to ChillPup!</Text>
                    <Text style={styles.noPetDesc}>
                        Add your furry friend to start tracking their anxiety and building a calmer environment together.
                    </Text>
                    <Pressable
                        style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
                        onPress={() => navigation.navigate('PetProfileStepper')}
                    >
                        <Text style={styles.primaryButtonText}>Add First Pet</Text>
                    </Pressable>
                </View>
            </View>
        );
    }


    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <Text style={styles.headerTitle}>ChillPup</Text>
                <Pressable
                    onPress={() => navigation.navigate('Settings')}
                    style={({ pressed }) => [
                        styles.settingsButton,
                        pressed && { opacity: 0.6 }
                    ]}
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    accessibilityLabel="Open Settings"
                    accessibilityRole="button"
                >
                    <Ionicons name="settings-outline" size={26} color={COLORS.text} />
                </Pressable>
            </View>

            {/* Pet Card */}
            <View style={styles.card}>
                <View style={styles.petHeader}>
                    <View style={[styles.avatar, { borderColor: COLORS.primary }]}>
                        <Text style={{ fontSize: 30 }}>🐶</Text>
                    </View>
                    <View>
                        <Text style={styles.petName}>{petData?.petName || profile?.petName || 'Unknown Pet'}</Text>
                        <Text style={styles.petDetails}>
                            {petData?.ageGroup ? (petData.ageGroup.charAt(0).toUpperCase() + petData.ageGroup.slice(1)) : 'Age not set'} · {petData?.size ? (petData.size.charAt(0).toUpperCase() + petData.size.slice(1)) : 'Size not set'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Anxiety Alert — Calm Gradient Bar */}
            <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: anxietyColor }]}>
                <View style={styles.rowBetween}>
                    <View style={styles.row}>
                        <Ionicons name="pulse" size={18} color={anxietyColor} />
                        <Text style={[styles.cardTitle, { marginLeft: 8 }]}>Calm Check-In</Text>
                    </View>
                    <Text style={[styles.score, { color: anxietyColor }]}>{anxietyScore}/10</Text>
                </View>
                <View style={styles.gradientBarBg}>
                    <View style={styles.gradientBar}>
                        <View style={[styles.gradientSegment, { flex: 3, backgroundColor: '#10B981', borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }]} />
                        <View style={[styles.gradientSegment, { flex: 3, backgroundColor: '#F59E0B' }]} />
                        <View style={[styles.gradientSegment, { flex: 2, backgroundColor: '#F97316' }]} />
                        <View style={[styles.gradientSegment, { flex: 2, backgroundColor: '#EF4444', borderTopRightRadius: 4, borderBottomRightRadius: 4 }]} />
                    </View>
                    <View style={[styles.gradientIndicator, { left: `${Math.min(95, (anxietyScore / 10) * 100)}%` }]}>
                        <View style={[styles.indicatorDot, { backgroundColor: anxietyColor }]} />
                    </View>
                </View>
                <View style={styles.anxietyLabelRow}>
                    <Text style={[styles.anxietyLabelText, { color: anxietyColor }]}>{anxietyLabel}</Text>
                    <Text style={styles.anxietyDesc}>{anxietyDesc}</Text>
                </View>
            </View>

            {/* Recommended Session CTA */}
            <View style={styles.sessionCard}>
                <View style={styles.recommendationBadge}>
                    <Ionicons name="sparkles" size={14} color={COLORS.primary} />
                    <Text style={styles.recommendationBadgeText}>Recommended: {recommendationReason.includes('loud noises') ? 'Loud noises selected' : 'Daily routine'}</Text>
                </View>
                <Text style={styles.sessionTitle}>{recommendedSession?.title || 'Guided Calming Session'}</Text>
                <Text style={styles.sessionSubtitle}>
                    {recommendedSession?.subtitle || 'A gentle visual guide to help your pet relax and build confidence.'}
                </Text>
                <Pressable
                    style={({ pressed }) => [styles.sessionButton, pressed && styles.primaryButtonPressed]}
                    onPress={() => handleStartSession(recommendedSession?.id)}
                >
                    <Ionicons name="play-circle-outline" size={22} color="#fff" />
                    <Text style={styles.sessionButtonText}>Start Session</Text>
                </Pressable>
            </View>

            {/* Progress Summary */}
            {progressSummary && (
                <View style={styles.progressSummaryCard}>
                    <View style={styles.row}>
                        <Ionicons name="trending-up" size={20} color={COLORS.success} />
                        <Text style={styles.progressSummaryTitle}>Recent Progress</Text>
                    </View>
                    <Text style={styles.progressSummaryText}>{progressSummary}</Text>
                </View>
            )}



        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundLight },
    content: { padding: 20, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        // paddingTop is handled dynamically via insets
    },
    headerTitle: { ...FONTS.h2, color: COLORS.text },
    settingsButton: {
        padding: 4, // Slight internal padding to reach 44x44 easier
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: { backgroundColor: '#fff', borderRadius: SIZES.radius, padding: 16, marginBottom: 16, ...SHADOWS.small },
    petHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
    petName: { ...FONTS.h3, color: COLORS.text },
    petDetails: { ...FONTS.caption, color: COLORS.textSecondary },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center' },
    cardTitle: { ...FONTS.body, fontWeight: '600', color: COLORS.text },
    score: { ...FONTS.h3 },
    gradientBarBg: { height: 14, marginBottom: 12, position: 'relative', justifyContent: 'center' },
    gradientBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
    gradientSegment: { height: '100%' },
    gradientIndicator: { position: 'absolute', top: -1, marginLeft: -6 },
    indicatorDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff', ...SHADOWS.small },
    anxietyLabelRow: { gap: 2 },
    anxietyLabelText: { ...FONTS.caption, fontWeight: '700' },
    anxietyDesc: { ...FONTS.small, color: COLORS.textSecondary },
    sessionCard: { backgroundColor: '#fff', borderRadius: SIZES.radius, padding: 24, marginBottom: 20, alignItems: 'center', ...SHADOWS.small, paddingTop: 32 },
    recommendationBadge: { position: 'absolute', top: 5, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
    recommendationBadgeText: { ...FONTS.tiny, color: COLORS.primary, fontWeight: '600' },
    sessionTitle: { ...FONTS.h3, color: COLORS.text, marginBottom: 8 },
    sessionSubtitle: { ...FONTS.caption, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
    sessionButton: { backgroundColor: COLORS.primary, paddingVertical: 16, paddingHorizontal: 32, borderRadius: SIZES.radius, flexDirection: 'row', alignItems: 'center', gap: 10 },
    sessionButtonText: { color: '#fff', ...FONTS.body, fontWeight: 'bold' },
    progressSummaryCard: { backgroundColor: '#F0FDF4', borderRadius: SIZES.radius, padding: 16, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: COLORS.success },
    progressSummaryTitle: { ...FONTS.body, fontWeight: '700', color: COLORS.text, marginLeft: 8 },
    progressSummaryText: { ...FONTS.body, color: COLORS.textSecondary, marginTop: 4 },
    sectionTitle: { ...FONTS.h3, color: COLORS.text, marginBottom: 12 },
    quickActionsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    quickAction: { flex: 1, backgroundColor: '#fff', borderRadius: SIZES.radius, padding: 16, alignItems: 'center', gap: 8, ...SHADOWS.small },
    quickIconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    quickActionText: { ...FONTS.small, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
    primaryButton: { backgroundColor: COLORS.primary, padding: 18, borderRadius: SIZES.radius, width: '100%', alignItems: 'center', ...SHADOWS.small },
    primaryButtonPressed: { backgroundColor: COLORS.primaryDark, transform: [{ scale: 0.98 }] },
    primaryButtonText: { color: '#fff', ...FONTS.body, fontWeight: 'bold' },
    noPetAvatar: { width: 150, height: 150, backgroundColor: COLORS.lavender, borderRadius: 75, justifyContent: 'center', alignItems: 'center', marginBottom: 30, ...SHADOWS.small },
    noPetTitle: { ...FONTS.h1, color: COLORS.primary, textAlign: 'center', marginBottom: 16 },
    noPetDesc: { ...FONTS.body, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 40, lineHeight: 24 },
    logoutButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
