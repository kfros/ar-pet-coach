import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
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
import { getAnxietyColor } from '../helpers/anxietyGradient';

import PetProfileRepository from '../services/petProfileRepository';
import SessionService from '../services/sessionService';
import { HomeSnapshot } from '../types/Session';
import { getProfileRecommendation } from '../services/profileRecommendationService';

export default function DashboardScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [petId, setPetId] = useState<string | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [homeSnapshot, setHomeSnapshot] = useState<HomeSnapshot | null>(null);
    const [recommendedSession, setRecommendedSession] = useState<any>(null);
    const [recommendationReason, setRecommendationReason] = useState<string>('');

    const { isPremium, isLoading: subLoading } = useSubscription();
    const insets = useSafeAreaInsets();

    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return 'Saved recently';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return 'Saved recently';
            return d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }) + ' at ' + d.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Saved recently';
        }
    };

    const fetchData = async () => {
        try {
            const pet = await PetProfileRepository.getPetProfile();
            if (pet) {
                setPetId(pet.id || 'guest_pet');
                setProfile({ petName: pet.petName });

                const snapshot = await SessionService.getHomeSnapshot(pet.id || 'guest_pet');
                setHomeSnapshot(snapshot || null);

                const allSessions = SessionService.getSessions();
                const triggers = pet.anxietyTriggers;
                const isSevere = !!snapshot?.latestCheckIn?.hasSevereSigns;

                const { session: recommended, reason } = getProfileRecommendation(
                    allSessions,
                    triggers,
                    isSevere
                );

                setRecommendedSession(recommended);
                setRecommendationReason(reason);
            } else {
                setPetId(null);
                setProfile(null);
                setHomeSnapshot(null);
                setRecommendedSession(null);
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleStartSession = (session: any) => {
        if (!petId) {
            navigation.navigate('PetProfileStepper');
            return;
        }

        if (session.accessLevel === 'premium' && subLoading) {
            return;
        }

        navigation.navigate('SessionPreview', { sessionId: session.id, petId });
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!petId) {
        return (
            <View style={[styles.container, { padding: 20 }]}>
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <Text style={styles.headerTitle}>Welcome</Text>
                    <Pressable
                        onPress={() => navigation.navigate('Settings')}
                        style={({ pressed }) => [styles.settingsButton, pressed && { opacity: 0.6 }]}
                        testID="settings-button"
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

    const renderSuggestionCard = () => {
        if (!recommendedSession) {
            return (
                <Pressable
                    style={styles.suggestionFallbackCard}
                    onPress={() => navigation.navigate('Routines')}
                    testID="suggestion-fallback-card"
                    accessibilityLabel="Browse routines"
                >
                    <View style={styles.suggestionFallbackRow}>
                        <Ionicons name="list-outline" size={24} color={COLORS.primary} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.suggestionFallbackTitle}>Browse routines</Text>
                            <Text style={styles.suggestionFallbackDesc}>Find a calming routine for your pup.</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                    </View>
                </Pressable>
            );
        }

        const isPremiumRoutine = recommendedSession.accessLevel === 'premium';
        const isChecking = isPremiumRoutine && subLoading;
        const isLocked = isPremiumRoutine && !isPremium && !subLoading;
        
        let ctaLabel = "View routine";
        if (isChecking) {
            ctaLabel = "Checking access";
        }

        let cardAccessibilityLabel = "";
        if (isChecking) {
            cardAccessibilityLabel = `Checking access: ${recommendedSession.title}. ${recommendationReason}`;
        } else if (isLocked) {
            cardAccessibilityLabel = `View routine: ${recommendedSession.title}. Premium required to start. ${recommendationReason}`;
        } else {
            cardAccessibilityLabel = `View routine: ${recommendedSession.title}. ${recommendationReason}`;
        }

        return (
            <Pressable
                style={styles.suggestionCard}
                onPress={() => handleStartSession(recommendedSession)}
                accessibilityLabel={cardAccessibilityLabel}
                accessibilityState={{ disabled: isChecking }}
                testID="suggested-routine-card"
            >
                <View style={styles.suggestionHeader}>
                    <Ionicons name="sparkles-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.suggestionReason} numberOfLines={1}>{recommendationReason}</Text>
                </View>
                
                <Text style={styles.suggestionRoutineTitle}>{recommendedSession.title}</Text>
                <Text style={styles.suggestionRoutineSubtitle}>{recommendedSession.subtitle}</Text>
                
                <View style={styles.suggestionFooter}>
                    <View style={styles.suggestionMeta}>
                        <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.suggestionDuration}>
                            {recommendedSession.suggestedTimeCopy || `${recommendedSession.durationMinutes} min`}
                        </Text>
                    </View>
                    <View style={styles.suggestionCta}>
                        <Text style={styles.suggestionCtaText}>{ctaLabel}</Text>
                        {isChecking ? (
                            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 4 }} />
                        ) : (
                            <Ionicons 
                                name={isLocked ? "lock-closed" : "chevron-forward"} 
                                size={16} 
                                color={COLORS.primary} 
                            />
                        )}
                    </View>
                </View>
            </Pressable>
        );
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.content, { paddingBottom: 60 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View>
                    <Text style={styles.brandTitle}>ChillPup</Text>
                    <Text style={styles.greeting}>Hi, {profile?.petName ? `${profile.petName}'s owner` : 'there'} 👋</Text>
                </View>
                <Pressable
                    onPress={() => navigation.navigate('Settings')}
                    style={({ pressed }) => [styles.settingsButton, pressed && { opacity: 0.6 }]}
                    testID="settings-button"
                >
                    <Ionicons name="settings-outline" size={26} color={COLORS.text} />
                </Pressable>
            </View>

            {/* Prompt */}
            <Text style={styles.promptText}>What would you like to do?</Text>

            {/* Immediate Actions */}
            <View style={styles.actionsRow}>
                <Pressable
                    style={styles.actionCard}
                    onPress={() => navigation.navigate('Routines')}
                    testID="home-action-routines"
                    accessibilityLabel="Browse routines"
                >
                    <Ionicons name="list-outline" size={24} color={COLORS.primary} style={styles.actionIcon} />
                    <Text style={styles.actionTitle}>Browse routines</Text>
                    <Text style={styles.actionHelper}>Choose a short, owner-guided routine.</Text>
                </Pressable>
                <Pressable
                    style={styles.actionCard}
                    onPress={() => navigation.navigate('Sounds')}
                    testID="home-action-sounds"
                    accessibilityLabel="Calming sounds"
                >
                    <Ionicons name="musical-notes-outline" size={24} color={COLORS.primary} style={styles.actionIcon} />
                    <Text style={styles.actionTitle}>Calming sounds</Text>
                    <Text style={styles.actionHelper}>Open the Sounds section.</Text>
                </Pressable>
            </View>

            {/* Suggestion Card */}
            <Text style={styles.sectionTitle}>
                {homeSnapshot?.latestCheckIn?.hasSevereSigns ? "Before another routine" : "Suggested from your profile"}
            </Text>
            <Text style={styles.suggestionExplanation}>
                {homeSnapshot?.latestCheckIn?.hasSevereSigns
                    ? (homeSnapshot.latestCheckIn.severeCategory === 'medical'
                        ? "Medical signs were noted in the latest saved check-in. This is a saved check-in, not a live assessment."
                        : "Strong signs were noted in the latest saved check-in. This is a saved check-in, not a live assessment.")
                    : `Based on the triggers saved in ${profile?.petName || 'your dog'}'s profile — not a live assessment.`
                }
            </Text>
            {(() => {
                if (homeSnapshot?.latestCheckIn?.hasSevereSigns) {
                    const isMedical = homeSnapshot.latestCheckIn.severeCategory === 'medical';
                    return (
                        <View style={styles.suggestionCard} testID="historical-severe-boundary-card">
                            <View style={styles.suggestionHeader}>
                                <Ionicons name="alert-circle-outline" size={16} color="#B85C38" style={{ marginRight: 6 }} />
                                <Text style={styles.suggestionReason} numberOfLines={2}>
                                    {isMedical
                                        ? "For medical symptoms or severe distress, contact a veterinarian."
                                        : "For panic, aggression, self-injury, or escape attempts, stop routines and get professional support."
                                    }
                                </Text>
                            </View>
                        </View>
                    );
                }
                return renderSuggestionCard();
            })()}

            {/* Latest check-in */}
            <Text style={styles.sectionTitle}>Latest check-in</Text>
            {homeSnapshot?.latestCheckIn ? (
                <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: getAnxietyColor(homeSnapshot.latestCheckIn.score) }]} testID="latest-checkin-card">
                    <View style={styles.rowBetween}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={[styles.checkInLevel, { color: getAnxietyColor(homeSnapshot.latestCheckIn.score) }]}>
                                {homeSnapshot.latestCheckIn.levelLabel}
                            </Text>
                            <Text style={styles.checkInDate}>
                                {formatDateTime(homeSnapshot.latestCheckIn.completedAt)}
                            </Text>
                        </View>
                        <Text style={[styles.checkInScore, { color: getAnxietyColor(homeSnapshot.latestCheckIn.score) }]}>
                            {homeSnapshot.latestCheckIn.score}/10
                        </Text>
                    </View>
                    
                    <Text style={styles.checkInNote}>
                        Owner-reported signs from your latest saved check-in.
                    </Text>

                    {homeSnapshot.latestCheckIn.hasSevereSigns && (
                        <View style={styles.severeSignsBox} testID="historical-severe-warning">
                            <Ionicons name="alert-circle-outline" size={16} color="#B85C38" />
                            <Text style={styles.severeSignsText}>
                                {homeSnapshot.latestCheckIn.severeCategory === 'medical'
                                    ? "Medical signs were noted in the latest saved check-in. This is a saved check-in, not a live assessment. For medical symptoms or severe distress, contact a veterinarian."
                                    : "Strong signs were noted in the latest saved check-in. This is a saved check-in, not a live assessment. For panic, aggression, self-injury, or escape attempts, stop routines and get professional support."
                                }
                            </Text>
                        </View>
                    )}
                </View>
            ) : (
                <View style={styles.emptyCard} testID="latest-checkin-empty">
                    <Ionicons name="pulse-outline" size={24} color={COLORS.textSecondary} style={{ marginBottom: 8 }} />
                    <Text style={styles.emptyCardTitle}>No check-ins yet</Text>
                    <Text style={styles.emptyCardBody}>Saved check-ins will appear here after a routine.</Text>
                </View>
            )}

            {/* Recent practice */}
            <Text style={styles.sectionTitle}>Recent practice</Text>
            {homeSnapshot?.latestPractice ? (
                <View style={styles.card} testID="recent-practice-card">
                    <Text style={styles.practiceTitle}>
                        {homeSnapshot.latestPractice.sessionTitle}
                    </Text>
                    <Text style={styles.practiceMeta}>
                        {formatDateTime(homeSnapshot.latestPractice.completedAt)}
                    </Text>
                    
                    <View style={styles.practiceStatusRow}>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>
                                {homeSnapshot.latestPractice.stoppedEarly 
                                    ? "Stopped early" 
                                    : (homeSnapshot.latestPractice.completed ? "Completed" : "Saved")}
                            </Text>
                        </View>
                    </View>
                </View>
            ) : (
                <View style={styles.emptyCard} testID="recent-practice-empty">
                    <Ionicons name="calendar-outline" size={24} color={COLORS.textSecondary} style={{ marginBottom: 8 }} />
                    <Text style={styles.emptyCardTitle}>No practice saved yet</Text>
                    <Text style={styles.emptyCardBody}>Completed routines will appear here.</Text>
                </View>
            )}

            {/* View progress action */}
            <Pressable
                style={styles.viewProgressButton}
                onPress={() => navigation.navigate('Progress')}
                testID="view-progress-button"
                accessibilityLabel="View progress"
            >
                <Text style={styles.viewProgressButtonText}>View progress</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F6FAF8' },
    content: { padding: 20 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    brandTitle: { ...FONTS.body, fontWeight: '700', color: COLORS.text, opacity: 0.8 },
    greeting: { ...FONTS.h2, color: COLORS.text, fontWeight: '700', marginTop: 2 },
    settingsButton: { padding: 8, justifyContent: 'center', alignItems: 'center', minWidth: 44, minHeight: 44, marginRight: -8 },
    promptText: { ...FONTS.body, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 16 },
    
    actionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
    },
    actionCard: {
        flex: 1,
        minWidth: 140,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: '#E3ECEF',
        minHeight: 120,
        justifyContent: 'center',
    },
    actionIcon: {
        marginBottom: 8,
    },
    actionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    actionHelper: {
        fontSize: 12,
        color: COLORS.textSecondary,
        lineHeight: 16,
    },

    sectionTitle: { ...FONTS.h3, color: COLORS.text, marginTop: 20, marginBottom: 8 },
    
    suggestionExplanation: { ...FONTS.caption, color: COLORS.textSecondary, marginBottom: 10, lineHeight: 18 },
    
    suggestionCard: {
        backgroundColor: COLORS.primary,
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        ...SHADOWS.medium,
    },
    suggestionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    suggestionReason: {
        fontSize: 11,
        color: '#fff',
        fontWeight: '700',
    },
    suggestionRoutineTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 6,
    },
    suggestionRoutineSubtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.85)',
        lineHeight: 18,
        marginBottom: 16,
    },
    suggestionFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.15)',
        paddingTop: 12,
    },
    suggestionMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    suggestionDuration: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '600',
    },
    suggestionCta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    suggestionCtaText: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '700',
    },

    suggestionFallbackCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: '#E3ECEF',
    },
    suggestionFallbackRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    suggestionFallbackTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 2,
    },
    suggestionFallbackDesc: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },

    card: {
        backgroundColor: '#fff',
        borderRadius: SIZES.radius,
        padding: 16,
        marginBottom: 16,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: '#E3ECEF',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    checkInLevel: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    checkInDate: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    checkInScore: {
        fontSize: 20,
        fontWeight: '800',
    },
    checkInNote: {
        fontSize: 12,
        color: COLORS.textSecondary,
        lineHeight: 16,
    },

    severeSignsBox: {
        flexDirection: 'row',
        gap: 8,
        backgroundColor: '#FFEDE6',
        padding: 12,
        borderRadius: 12,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#FFDDD0',
    },
    severeSignsText: {
        flex: 1,
        fontSize: 11,
        color: '#B85C38',
        lineHeight: 16,
        fontWeight: '500',
    },

    emptyCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: SIZES.radius,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        marginBottom: 16,
    },
    emptyCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    emptyCardBody: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },

    practiceTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    practiceMeta: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginBottom: 12,
    },
    practiceStatusRow: {
        flexDirection: 'row',
    },
    statusBadge: {
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.textSecondary,
    },

    viewProgressButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: SIZES.radius,
        borderWidth: 1,
        borderColor: COLORS.primary,
        marginTop: 8,
        minHeight: 44,
    },
    viewProgressButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.primary,
    },

    noPetAvatar: { width: 150, height: 150, backgroundColor: COLORS.lavender, borderRadius: 75, justifyContent: 'center', alignItems: 'center', marginBottom: 30, ...SHADOWS.small },
    noPetTitle: { ...FONTS.h1, color: COLORS.primary, textAlign: 'center', marginBottom: 16 },
    noPetDesc: { ...FONTS.body, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 40, lineHeight: 24 },
    primaryButton: { backgroundColor: COLORS.primary, padding: 18, borderRadius: SIZES.radius, width: '100%', alignItems: 'center', ...SHADOWS.small },
    primaryButtonPressed: { backgroundColor: COLORS.primaryDark, transform: [{ scale: 0.98 }] },
    primaryButtonText: { color: '#fff', ...FONTS.body, fontWeight: 'bold' },
    headerTitle: { ...FONTS.h2, color: COLORS.text, fontWeight: '700' },
});
