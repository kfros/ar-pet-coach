import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import SessionService from '../services/sessionService';
import { useSubscription } from '../components/SubscriptionManager';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTINE_CATEGORIES } from '../appContent/routineCategories';
import { RoutineCategory } from '../types/Session';

const LEVEL_LABELS: Record<string, string> = {
    doorway_calm: "Stayed calm near the door",
    open_edge: "Handled the door opening",
    one_step: "Took one calm step",
    short_pause: "Paused briefly outside",
    few_steps: "Walked a few calm steps away",
    hundred_steps: "Managed around 100 steps",
    ten_min_walk: "Managed an easy 10-minute walk"
};

export default function SessionPreviewScreen({ navigation, route }: any) {
    const insets = useSafeAreaInsets();
    const { sessionId, petId } = route.params;
    const session = SessionService.getSessionById(sessionId);
    const { isPremium } = useSubscription();

    const isLocked = session?.accessLevel === 'premium' && !isPremium;

    const isNavigatingRef = React.useRef(false);
    const [isNavigating, setIsNavigating] = React.useState(false);
    const navigationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        return () => {
            if (navigationTimeoutRef.current) {
                clearTimeout(navigationTimeoutRef.current);
            }
        };
    }, []);

    const handlePrimaryAction = () => {
        if (!session || isNavigatingRef.current) return;

        isNavigatingRef.current = true;
        setIsNavigating(true);

        if (isLocked) {
            navigation.navigate('Paywall', { source: 'premium_session', sessionId, petId });
        } else {
            navigation.navigate('GuidedSession', { sessionId, petId, level: route.params?.level });
        }

        navigationTimeoutRef.current = setTimeout(() => {
            isNavigatingRef.current = false;
            setIsNavigating(false);
        }, 500);
    };

    if (!session) {
        return (
            <View style={styles.center}>
                <Text>Session not found</Text>
                <Pressable onPress={() => navigation.goBack()}><Text>Go Back</Text></Pressable>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={COLORS.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Session Preview</Text>
            </View>

            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 120 } // Ensure content is not hidden by sticky footer
                ]}
            >
                {route.params?.unlockedAfterPurchase && (
                    <View style={styles.celebrationBanner}>
                        <Ionicons name="sparkles" size={20} color="#11866F" />
                        <Text style={styles.celebrationText}>Premium Unlocked! Enjoy the routine.</Text>
                    </View>
                )}
                <View style={styles.heroCard}>
                    <View style={styles.heroHeader}>
                        <View style={styles.titleContainer}>
                            {session.category && (
                                <Text style={styles.categoryLabel}>
                                    {ROUTINE_CATEGORIES[session.category as RoutineCategory]?.title || session.category}
                                </Text>
                            )}
                            <Text style={styles.title} numberOfLines={2}>{session.title}</Text>
                        </View>
                        {session.accessLevel === 'premium' && (
                            <View style={[
                                styles.previewBadge,
                                isLocked ? styles.previewBadgeLocked : styles.previewBadgeUnlocked
                            ]}>
                                <Ionicons
                                    name={isLocked ? "lock-closed" : "checkmark-circle"}
                                    size={12}
                                    color={isLocked ? "#fff" : "#0F766E"}
                                />
                                <Text style={[
                                    styles.previewBadgeText,
                                    { color: isLocked ? "#fff" : "#0F766E" }
                                ]}>
                                    {isLocked ? 'PREMIUM' : 'INCLUDED'}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.subtitle}>{session.subtitle}</Text>

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                            <Text style={styles.metaText}>{session.durationMinutes} min</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="stats-chart-outline" size={16} color={COLORS.primary} />
                            <Text style={styles.metaText}>{session.difficulty}</Text>
                        </View>
                    </View>
                    {session.backgroundSoundPolicy?.mode === 'none' && (
                        <View style={styles.silentBadge}>
                            <Ionicons name="volume-mute" size={16} color="#6B7280" />
                            <Text style={styles.silentText}>No background sound needed for this routine.</Text>
                        </View>
                    )}
                </View>

                {sessionId === 'outdoor_confidence_reset' && (
                    <View style={styles.outdoorWarningBanner}>
                        <Ionicons name="alert-circle" size={20} color="#9A5B00" />
                        <Text style={styles.outdoorWarningText}>
                            This routine is for threshold practice at the safest edge, not a full walk.
                        </Text>
                    </View>
                )}

                {route.params?.level && LEVEL_LABELS[route.params.level] && (
                    <View style={styles.levelTargetBanner}>
                        <Ionicons name="flag-outline" size={20} color="#0F766E" />
                        <Text style={styles.levelTargetText}>
                            Target step today: {LEVEL_LABELS[route.params.level]}
                        </Text>
                    </View>
                )}

                {session.suitableFor && session.suitableFor.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Best for</Text>
                        {session.suitableFor.map((item, index) => (
                            <View key={index} style={styles.listItem}>
                                <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.success} />
                                <Text style={styles.listText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {session.notFor && session.notFor.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Use another option if</Text>
                        {session.notFor.map((item, index) => (
                            <View key={index} style={styles.listItem}>
                                <Ionicons name="close-circle-outline" size={18} color="#B7791F" />
                                <Text style={styles.listText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {session.fallbacks && session.fallbacks.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Try instead</Text>
                        {session.fallbacks.map((fallback: any, index: number) => (
                            <Pressable
                                key={index}
                                style={[
                                    styles.fallbackCard,
                                    fallback.type === 'info' && { opacity: 0.9 }
                                ]}
                                onPress={() => {
                                    if (fallback.type === 'routine' && fallback.routineId) {
                                        navigation.navigate('SessionPreview', { sessionId: fallback.routineId, petId });
                                    }
                                }}
                            >
                                <View style={styles.fallbackHeader}>
                                    <Text style={styles.fallbackTitle}>{fallback.title}</Text>
                                    {fallback.type === 'routine' && (
                                        <Ionicons name="chevron-forward" size={16} color="#0F8A7A" />
                                    )}
                                </View>
                                <Text style={styles.fallbackBody}>{fallback.body}</Text>
                            </Pressable>
                        ))}
                    </View>
                )}


                {session.safetyNotes && session.safetyNotes.length > 0 && (
                    <View style={styles.safetySection}>
                        <Text style={styles.safetyTitle}>Before you start</Text>
                        {session.safetyNotes.map((item, index) => (
                            <View key={index} style={styles.listItem}>
                                <Ionicons name="alert-circle" size={18} color="#9A5B00" />
                                <Text style={styles.safetyText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {!session.safetyNotes && session.stopIf && (
                    <View style={styles.safetySection}>
                        <Text style={styles.safetyTitle}>Stop the session if:</Text>
                        {session.stopIf.map((item, index) => (
                            <View key={index} style={styles.listItem}>
                                <Ionicons name="alert-circle" size={18} color="#9A5B00" />
                                <Text style={styles.safetyText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerText}>
                        ChillPup routines are gentle practice guides based on owner observations. They are not a diagnosis, treatment plan, or substitute for advice from a veterinarian or qualified behavior professional.
                    </Text>
                </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <Pressable
                    style={({ pressed }) => [
                        styles.startButton,
                        isLocked && { backgroundColor: '#D97706' },
                        (pressed || isNavigating) && { opacity: 0.8 }
                    ]}
                    onPress={handlePrimaryAction}
                    disabled={isNavigating}
                >
                    <Text style={styles.startButtonText}>
                        {isLocked ? 'Unlock with Premium' : 'Start Session'}
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundLight },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    backButton: { padding: 5 },
    headerTitle: { ...FONTS.h3, marginLeft: 10 },
    scrollContent: { padding: 20, paddingBottom: 100 },
    heroCard: { backgroundColor: '#fff', borderRadius: SIZES.radius, padding: 24, marginBottom: 24, ...SHADOWS.small },
    title: { ...FONTS.h1, color: COLORS.text, marginBottom: 8 },
    subtitle: { ...FONTS.body, color: COLORS.textSecondary, marginBottom: 20 },
    metaRow: { flexDirection: 'row', gap: 20 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { ...FONTS.caption, color: COLORS.textSecondary, textTransform: 'capitalize' },
    section: { marginBottom: 24 },
    sectionTitle: { ...FONTS.h3, color: COLORS.text, marginBottom: 12 },
    sectionText: { ...FONTS.body, color: COLORS.text, lineHeight: 24 },
    listItem: { flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'flex-start' },
    listText: { ...FONTS.body, color: COLORS.text, flex: 1, lineHeight: 22 },
    warningSection: { backgroundColor: '#FEF2F2', borderRadius: SIZES.radius, padding: 16, marginBottom: 24 },
    warningTitle: { ...FONTS.h3, color: COLORS.error, marginBottom: 12 },
    disclaimer: { marginBottom: 20 },
    disclaimerText: { ...FONTS.small, color: COLORS.textSecondary, textAlign: 'center', fontStyle: 'italic' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.border },
    startButton: { backgroundColor: COLORS.primary, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
    startButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    titleContainer: { flex: 1, marginRight: 12 },
    previewBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
    },
    previewBadgeLocked: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    previewBadgeUnlocked: {
        backgroundColor: '#E6F7F2',
        borderColor: '#B8E7DC',
    },
    previewBadgeText: { fontSize: 10, fontWeight: '800' },
    safetySection: { backgroundColor: '#FFF8E8', borderRadius: SIZES.radius, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#F4D08A' },
    safetyTitle: { ...FONTS.h3, color: '#9A5B00', marginBottom: 12 },
    safetyText: { ...FONTS.body, color: '#6B4A1D', flex: 1, lineHeight: 22 },
    fallbackCard: {
        backgroundColor: '#EEF8F6',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#CDECE5'
    },
    fallbackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    fallbackTitle: { ...FONTS.body, fontWeight: '700', color: '#12312E' },
    fallbackBody: { ...FONTS.small, color: '#4A5F5B', lineHeight: 18 },
    celebrationBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    celebrationText: {
        color: '#065F46',
        fontWeight: '600',
        fontSize: 14,
    },
    categoryLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    outdoorWarningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF8E8',
        padding: 14,
        borderRadius: SIZES.radius,
        marginBottom: 24,
        gap: 10,
        borderWidth: 1,
        borderColor: '#F4D08A',
    },
    outdoorWarningText: {
        color: '#9A5B00',
        fontWeight: '600',
        fontSize: 14,
        flex: 1,
        lineHeight: 20,
    },
    levelTargetBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF8F6',
        padding: 14,
        borderRadius: SIZES.radius,
        marginBottom: 24,
        gap: 10,
        borderWidth: 1,
        borderColor: '#CDECE5',
    },
    levelTargetText: {
        color: '#0F766E',
        fontWeight: '600',
        fontSize: 14,
        flex: 1,
        lineHeight: 20,
    },
    silentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
        padding: 10,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
    },
    silentText: {
        fontSize: 13,
        color: '#4B5563',
        fontWeight: '500',
    },
});
