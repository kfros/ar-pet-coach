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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import { useSubscription } from '../components/SubscriptionManager';
import {
    getAnxietyColor,
    getAnxietyLabel,
} from '../helpers/anxietyGradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import PetProfileRepository from '../services/petProfileRepository';
import SessionService from '../services/sessionService';

export default function DashboardScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [petId, setPetId] = useState<string | null>(null);
    const [petData, setPetData] = useState<any>(null);
    const [progressData, setProgressData] = useState<{
        title: string;
        body: string;
        details: string[];
        outcome: 'improved' | 'worsened' | 'unchanged' | 'mixed' | 'stopped_early' | 'severe_signs' | 'no_checkins';
        latestScore: number;
        latestLevelLabel: string;
        hasSevereSigns: boolean;
        severeSignsNote: string;
        positiveSigns: string[];
        previousScore?: number | null;
        scoreDeltaFromPrevious?: number | null;
        trendLabel?: string | null;
        beforeScore?: number | null;
        afterScore?: number | null;
        beforeAfterDelta?: number | null;
    } | null>(null);
    const [recommendedSession, setRecommendedSession] = useState<any>(null);
    const [recommendationReason, setRecommendationReason] = useState<string>('');

    const { isPremium, isLoading: subLoading } = useSubscription();
    const insets = useSafeAreaInsets();

    const anxietyScore = progressData ? progressData.latestScore : (petData?.anxietyScore ?? 0);
    const anxietyLabel = progressData && progressData.latestLevelLabel !== 'No check-in'
        ? `${progressData.latestLevelLabel.charAt(0).toUpperCase() + progressData.latestLevelLabel.slice(1)} signs`
        : (petData ? getAnxietyLabel(anxietyScore) : 'No check-in yet');

    // HOME-001: Visual tone logic for Current Signs
    let anxietyColor = getAnxietyColor(anxietyScore);
    let anxietyDesc = 'Based on your last check-in';

    if (!progressData || progressData.latestLevelLabel === 'No check-in') {
        anxietyColor = '#5F7680'; // Neutral blue-gray
        anxietyDesc = 'Complete a Calm Check-In to track signs over time.';
    } else if (anxietyScore < 4) {
        anxietyColor = '#11866F'; // Positive soft
        anxietyDesc = 'Based on your last check-in.';
    } else if (anxietyScore >= 7) {
        anxietyColor = '#B7791F'; // Warning soft
        if (anxietyScore >= 9) {
            anxietyDesc = 'Keep the session easy and stop if signs increase.';
        } else {
            anxietyDesc = 'Based on your last check-in — consider a calming routine.';
        }
    } else { // mild
        anxietyColor = '#B7791F'; // Warning soft
        anxietyDesc = 'Based on your last check-in — consider a calming routine.';
    }

    const fetchData = async () => {
        try {
            const pet = await PetProfileRepository.getPetProfile();

            if (pet) {
                setPetData(pet);
                setPetId(pet.id || 'guest_pet');
                setProfile({ petName: pet.petName });

                const progress = await SessionService.getRecentProgress(pet.id || 'guest_pet');
                setProgressData(progress);

                // Better recommendation logic
                const allSessions = SessionService.getSessions();
                let recommended = allSessions.find(s => s.id === 'daily_calm_reset');
                let reason = 'Start here: short and easy';

                if (pet.anxietyTriggers?.includes('loud_noises') || pet.anxietyTriggers?.includes('fireworks')) {
                    recommended = allSessions.find(s => s.id === 'fireworks_loud_noises_basic');
                    reason = 'Because loud noises are selected';
                }

                setRecommendedSession(recommended);
                setRecommendationReason(reason);
            } else {
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

    const handleStartSession = (session: any) => {
        if (!petId) {
            navigation.navigate('PetProfileStepper');
            return;
        }

        if (session.accessLevel === 'premium' && !isPremium && !subLoading) {
            navigation.navigate('Paywall', { sessionId: session.id, petId });
            return;
        }

        navigation.navigate('SessionPreview', { sessionId: session.id, petId });
    };

    const renderSessionCard = (item: any, isHorizontal = false) => {
        const isLocked = item.accessLevel === 'premium' && !isPremium && !subLoading;
        const iconName = (item.iconKey || (item.id.includes('fireworks') ? 'sparkles' : 'sunny')) + "-outline";

        // PREMIUM_BADGE_STATE_FIX
        const badgeBg = isLocked ? COLORS.primary : '#E6F7F2';
        const badgeText = isLocked ? '#FFFFFF' : '#0F766E';
        const badgeBorder = isLocked ? COLORS.primary : '#B8E7DC';
        const badgeLabel = isLocked ? 'PREMIUM' : 'INCLUDED';
        const badgeIcon = isLocked ? 'lock-closed' : 'checkmark-circle';

        return (
            <Pressable
                key={item.id}
                style={[
                    styles.sessionCardItem,
                    isHorizontal ? { width: SCREEN_WIDTH * 0.7, marginRight: 16 } : { width: '100%', marginBottom: 12 }
                ]}
                onPress={() => handleStartSession(item)}
            >
                <View style={styles.sessionCardTop}>
                    <View style={styles.sessionIconBg}>
                        <Ionicons
                            name={iconName as any}
                            size={24}
                            color={COLORS.primary}
                        />
                    </View>
                    <View style={[
                        styles.badge,
                        item.accessLevel === 'premium'
                            ? { backgroundColor: badgeBg, borderWidth: 1, borderColor: badgeBorder }
                            : styles.freeBadge
                    ]}>
                        {item.accessLevel === 'premium' ? (
                            <>
                                <Ionicons
                                    name={badgeIcon as any}
                                    size={12}
                                    color={badgeText}
                                    style={{ marginRight: 4 }}
                                />
                                <Text style={[styles.badgeText, { color: badgeText }]}>
                                    {badgeLabel}
                                </Text>
                            </>
                        ) : (
                            <Text style={[styles.badgeText, { color: COLORS.primary }]}>
                                FREE
                            </Text>
                        )}
                    </View>
                </View>
                <Text style={styles.sessionCardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.sessionCardSubtitle} numberOfLines={2}>{item.subtitle}</Text>
                <View style={styles.sessionCardFooter}>
                    <Text style={styles.sessionDuration}>{item.durationMinutes} min</Text>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                </View>
            </Pressable>
        );
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
                        <Ionicons name="person-outline" size={24} color={COLORS.primary} />
                    </Pressable>
                </View>

                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={styles.noPetAvatar}><Text style={{ fontSize: 80 }}>🐕</Text></View>
                    <Text style={styles.noPetTitle}>Welcome to ChillPup!</Text>
                    <Text style={styles.noPetDesc}>
                        Add your furry friend to start building a calmer environment together.
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

    const allSessions = SessionService.getSessions();
    const freeSessions = allSessions.filter(s => s.accessLevel === 'free');
    const premiumSessions = allSessions.filter(s => s.accessLevel === 'premium');

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View>
                    <Text style={styles.greeting}>Hi {profile?.petName ? `${profile.petName}'s owner` : 'there'} 👋</Text>
                    <Text style={styles.headerTitle}>ChillPup</Text>
                </View>
                <Pressable
                    onPress={() => navigation.navigate('Settings')}
                    style={({ pressed }) => [styles.settingsButton, pressed && { opacity: 0.6 }]}
                >
                    <Ionicons name="settings-outline" size={26} color={COLORS.text} />
                </Pressable>
            </View>

            {/* Anxiety Alert */}
            <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: anxietyColor }]}>
                <View style={styles.rowBetween}>
                    <View style={styles.row}>
                        <Ionicons name="pulse" size={18} color={anxietyColor} />
                        <Text style={[styles.cardTitle, { marginLeft: 8 }]}>Current Signs</Text>
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

            {/* Recent Progress — HOME-002: Visual tone matches outcome */}
            {(() => {
                const outcome = progressData?.outcome || 'no_checkins';
                let currentOutcome: string = outcome;
                if (progressData?.hasSevereSigns) {
                    currentOutcome = 'severe_signs';
                }

                const stylesMap: Record<string, { bg: string, accent: string, icon: string }> = {
                    improved: { bg: '#EAF8F1', accent: '#11866F', icon: 'trending-up' },
                    mixed: { bg: '#F2F9F7', accent: '#4DB6AC', icon: 'sparkles-outline' },
                    unchanged: { bg: '#EEF4F6', accent: '#5F7680', icon: 'remove-circle-outline' },
                    worsened: { bg: '#FFF4D8', accent: '#B7791F', icon: 'alert-circle-outline' },
                    stopped_early: { bg: '#FFF8E8', accent: '#C0841A', icon: 'stop-circle-outline' },
                    severe_signs: { bg: '#FFF1D6', accent: '#A85F00', icon: 'warning-outline' },
                    no_checkins: { bg: '#EEF4F6', accent: '#5F7680', icon: 'checkmark-circle-outline' },
                };
                const theme = stylesMap[currentOutcome] || stylesMap['no_checkins'];

                return (
                    <View style={[styles.progressSummaryCard, { backgroundColor: theme.bg, borderLeftColor: theme.accent }]}>
                        <View style={styles.row}>
                            <Ionicons name={theme.icon as any} size={20} color={theme.accent} />
                            <Text style={[styles.progressSummaryTitle, { color: COLORS.text }]}>
                                {progressData ? progressData.title : 'No sessions yet'}
                            </Text>
                        </View>
                        {progressData ? (
                            <>
                                <Text style={styles.progressSummaryBody}>
                                    {progressData.hasSevereSigns ? 'Strong signs were noted.' : (currentOutcome === 'stopped_early' ? 'Session stopped early.' : progressData.body)}
                                </Text>
                                {progressData.details.map((d, i) => (
                                    <Text key={i} style={styles.progressDetailText}>• {d}</Text>
                                ))}
                                {progressData.hasSevereSigns && progressData.severeSignsNote && (
                                    <View style={styles.severeSignsBox}>
                                        <Ionicons name="information-circle" size={16} color="#B85C38" />
                                        <Text style={styles.severeSignsText}>
                                            {progressData.severeSignsNote}
                                        </Text>
                                    </View>
                                )}
                            </>
                        ) : (
                            <Text style={styles.progressSummaryText}>Start a calming routine to track what seems to help.</Text>
                        )}
                    </View>
                );
            })()}

            {/* Recommended Session */}
            <Text style={styles.sectionTitle}>Recommended for your dog</Text>
            <Pressable
                style={styles.heroCard}
                onPress={() => handleStartSession(recommendedSession)}
            >
                <View style={styles.heroContent}>
                    <View style={styles.recommendationBadge}>
                        <Ionicons name="sparkles" size={14} color={COLORS.primary} />
                        <Text style={styles.recommendationBadgeText}>{recommendationReason}</Text>
                    </View>
                    <Text style={styles.heroTitle}>{recommendedSession?.title}</Text>
                    <Text style={styles.heroSubtitle} numberOfLines={2}>{recommendedSession?.subtitle}</Text>
                    <View style={styles.heroFooter}>
                        <View style={styles.heroAction}>
                            <Ionicons name="play" size={16} color="#fff" />
                            <Text style={styles.heroActionText}>Start Now</Text>
                        </View>
                        <Text style={styles.heroDuration}>{recommendedSession?.durationMinutes} min</Text>
                    </View>
                </View>
            </Pressable>

            {/* Free Routines */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Free routines</Text>
            </View>
            <FlatList
                data={freeSessions}
                renderItem={({ item }) => renderSessionCard(item, true)}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item.id}
                style={styles.horizontalList}
            />

            {/* Premium Routines */}
            <View style={styles.sectionHeader}>
                <View>
                    <Text style={styles.sectionTitle}>More support with Premium</Text>
                    <Text style={styles.sectionSubtitleText}>Unlock extended routines for common stress triggers.</Text>
                </View>
            </View>
            {premiumSessions.map(session => renderSessionCard(session))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F6FAF8' },
    content: { padding: 20, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    greeting: { ...FONTS.small, color: COLORS.textSecondary, fontWeight: '600' },
    headerTitle: { ...FONTS.h1, color: COLORS.text },
    settingsButton: { padding: 4, justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: '#fff', borderRadius: SIZES.radius, padding: 16, marginBottom: 24, ...SHADOWS.small },
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

    sectionTitle: { ...FONTS.h3, color: COLORS.text, marginBottom: 12 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12, marginTop: 8 },
    sectionSubtitleText: { ...FONTS.small, color: COLORS.textSecondary, marginBottom: 4 },

    heroCard: { backgroundColor: COLORS.primary, borderRadius: 24, padding: 24, marginBottom: 24, ...SHADOWS.medium },
    heroContent: { gap: 8 },
    recommendationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
    recommendationBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
    heroTitle: { ...FONTS.h2, color: '#fff' },
    heroSubtitle: { ...FONTS.body, color: 'rgba(255,255,255,0.8)', lineHeight: 22 },
    heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    heroAction: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    heroActionText: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
    heroDuration: { fontSize: 12, color: '#fff', fontWeight: '600' },

    horizontalList: { marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 24 },
    sessionCardItem: { backgroundColor: '#fff', borderRadius: 20, padding: 16, ...SHADOWS.small, borderWidth: 1, borderColor: '#E3ECEF' },
    sessionCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    sessionIconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#DDF4EF', justifyContent: 'center', alignItems: 'center' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
    freeBadge: { backgroundColor: '#DDF4EF' },
    premiumBadge: { backgroundColor: COLORS.primary },
    badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    sessionCardTitle: { ...FONTS.body, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
    sessionCardSubtitle: { ...FONTS.small, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 12 },
    sessionCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
    sessionDuration: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },

    progressSummaryCard: { backgroundColor: '#F0FDF4', borderRadius: SIZES.radius, padding: 16, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: COLORS.success },
    progressSummaryTitle: { ...FONTS.body, fontWeight: '700', color: COLORS.text, marginLeft: 8 },
    progressSummaryBody: { ...FONTS.body, fontWeight: '600', color: COLORS.text, marginTop: 8 },
    progressDetailText: { ...FONTS.small, color: COLORS.textSecondary, marginTop: 4, paddingLeft: 4 },
    progressSummaryText: { ...FONTS.small, color: COLORS.textSecondary, marginTop: 4 },
    severeSignsBox: { flexDirection: 'row', gap: 8, backgroundColor: '#FFEDE6', padding: 12, borderRadius: 12, marginTop: 16 },
    severeSignsText: { flex: 1, fontSize: 11, color: '#B85C38', lineHeight: 16, fontWeight: '500' },

    primaryButton: { backgroundColor: COLORS.primary, padding: 18, borderRadius: SIZES.radius, width: '100%', alignItems: 'center', ...SHADOWS.small },
    primaryButtonPressed: { backgroundColor: COLORS.primaryDark, transform: [{ scale: 0.98 }] },
    primaryButtonText: { color: '#fff', ...FONTS.body, fontWeight: 'bold' },
    noPetAvatar: { width: 150, height: 150, backgroundColor: COLORS.lavender, borderRadius: 75, justifyContent: 'center', alignItems: 'center', marginBottom: 30, ...SHADOWS.small },
    noPetTitle: { ...FONTS.h1, color: COLORS.primary, textAlign: 'center', marginBottom: 16 },
    noPetDesc: { ...FONTS.body, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 40, lineHeight: 24 },
    logoutButton: { padding: 8, justifyContent: 'center', alignItems: 'center' },
});
