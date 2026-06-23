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
import { ROUTINE_CATEGORIES } from '../appContent/routineCategories';
import { RoutineCategory, StressSignsTrendSummary } from '../types/Session';

export default function DashboardScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [petId, setPetId] = useState<string | null>(null);
    const [petData, setPetData] = useState<any>(null);
    const [progressData, setProgressData] = useState<any>(null);
    const [trendSummary, setTrendSummary] = useState<StressSignsTrendSummary | null>(null);
    const [recommendedSession, setRecommendedSession] = useState<any>(null);
    const [recommendationReason, setRecommendationReason] = useState<string>('');
    const [showTrendDetails, setShowTrendDetails] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const [hasInitializedCategories, setHasInitializedCategories] = useState(false);
    const lastPetIdRef = React.useRef<string | null>(null);

    const { isPremium, isLoading: subLoading } = useSubscription();
    const insets = useSafeAreaInsets();

    const signsScore = trendSummary && trendSummary.latestScore !== null 
        ? trendSummary.latestScore 
        : (progressData ? progressData.latestScore : (petData?.anxietyScore ?? 0));

    const signsLabel = trendSummary && trendSummary.latestScore !== null
        ? trendSummary.points[trendSummary.points.length - 1].levelLabel
        : (progressData ? progressData.latestLevelLabel + ' signs' : (petData ? getAnxietyLabel(signsScore) : 'No check-in yet'));

    // HOME-001: Visual tone logic for Current Signs
    let signsColor = getAnxietyColor(signsScore);
    let signsDesc = 'Based on your last check-in';

    if ((!trendSummary || trendSummary.latestScore === null) && !progressData) {
        signsColor = '#5F7680'; // Neutral blue-gray
        signsDesc = 'Complete a Calm Check-In to track signs over time.';
    } else if (signsScore < 4) {
        signsColor = '#11866F'; // Positive soft
        signsDesc = 'Based on your last check-in.';
    } else if (signsScore >= 7) {
        signsColor = '#B7791F'; // Warning soft
        if (signsScore >= 9) {
            signsDesc = 'Keep the session easy and stop if signs increase.';
        } else {
            signsDesc = 'Based on your last check-in — consider a calming routine.';
        }
    } else { // mild
        signsColor = '#B7791F'; // Warning soft
        signsDesc = 'Based on your last check-in — consider a calming routine.';
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

                const trend = typeof SessionService.getStressSignsTrend === 'function'
                    ? await SessionService.getStressSignsTrend(pet.id || 'guest_pet')
                    : null;
                setTrendSummary(trend);

                // Better recommendation logic
                const allSessions = SessionService.getSessions();
                let recommended = allSessions.find(s => s.id === 'daily_calm_reset');
                let reason = 'Start here: short and easy';

                const triggers = pet.anxietyTriggers || [];
                const isSevere = trend?.status === 'severe';

                if (!isSevere && (triggers.includes('new_places') || triggers.includes('traffic_car_horns') || triggers.includes('nighttime') || triggers.includes('not_sure'))) {
                    recommended = allSessions.find(s => s.id === 'outdoor_confidence_reset');
                    reason = 'Outdoor threshold practice for new places/worry';
                } else if (triggers.includes('loud_noises') || triggers.includes('fireworks')) {
                    recommended = isPremium 
                        ? allSessions.find(s => s.id === 'fireworks_prep_routine') 
                        : allSessions.find(s => s.id === 'fireworks_loud_noises_basic');
                    reason = 'Because noise/fireworks trigger is selected';
                } else if (triggers.includes('visitors')) {
                    recommended = allSessions.find(s => s.id === 'visitors_at_home');
                    reason = 'Practice calm distance for visitors';
                } else if (triggers.includes('being_alone')) {
                    recommended = allSessions.find(s => s.id === 'being_alone');
                    reason = 'Practice tiny distance for being alone';
                } else if (triggers.includes('vet_visits')) {
                    recommended = allSessions.find(s => s.id === 'vet_visit_prep');
                    reason = 'Low-pressure prep for handling & vet visits';
                }

                setRecommendedSession(recommended);
                setRecommendationReason(reason);

                const currentPetId = pet.id || 'guest_pet';
                const isNewPet = lastPetIdRef.current !== currentPetId;
                lastPetIdRef.current = currentPetId;

                // Initialize expandedCategories once if not yet initialized or if pet changed
                if (!hasInitializedCategories || isNewPet) {
                    const initialExpanded: Record<string, boolean> = {
                        foundation: true,
                    };
                    if (recommended && recommended.category) {
                        initialExpanded[recommended.category] = true;
                    }
                    setExpandedCategories(initialExpanded);
                    setHasInitializedCategories(true);
                }
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

        const displayTime = item.suggestedTimeCopy || `${item.durationMinutes} min`;

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
                <Text style={styles.cardCategoryLabel}>
                    {(item.categoryLabel || 'Foundation').toUpperCase()} • {displayTime}
                </Text>
                <Text style={styles.sessionCardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.sessionCardSubtitle} numberOfLines={2}>{item.subtitle}</Text>
                <View style={styles.sessionCardFooter}>
                    <Text style={styles.sessionDuration}>{displayTime}</Text>
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

            {/* Current Signs Alert */}
            <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: signsColor }]}>
                <View style={styles.rowBetween}>
                    <View style={styles.row}>
                        <Ionicons name="pulse" size={18} color={signsColor} />
                        <Text style={[styles.cardTitle, { marginLeft: 8 }]}>Current Signs</Text>
                    </View>
                    <Text style={[styles.score, { color: signsColor }]}>{signsScore}/10</Text>
                </View>
                <View style={styles.gradientBarBg}>
                    <View style={styles.gradientBar}>
                        <View style={[styles.gradientSegment, { flex: 3, backgroundColor: '#10B981', borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }]} />
                        <View style={[styles.gradientSegment, { flex: 3, backgroundColor: '#F59E0B' }]} />
                        <View style={[styles.gradientSegment, { flex: 2, backgroundColor: '#F97316' }]} />
                        <View style={[styles.gradientSegment, { flex: 2, backgroundColor: '#EF4444', borderTopRightRadius: 4, borderBottomRightRadius: 4 }]} />
                    </View>
                    <View style={[styles.gradientIndicator, { left: `${Math.min(95, (signsScore / 10) * 100)}%` }]}>
                        <View style={[styles.indicatorDot, { backgroundColor: signsColor }]} />
                    </View>
                </View>
                <View style={styles.anxietyLabelRow}>
                    <Text style={[styles.anxietyLabelText, { color: signsColor }]}>{signsLabel}</Text>
                    <Text style={styles.anxietyDesc}>{signsDesc}</Text>
                </View>
            </View>

            {/* Stress Signs Trend Card */}
            {(() => {
                const trendThemeMap: Record<string, { bg: string, text: string, border: string, icon: string }> = {
                    not_enough_data: { bg: '#F8FAFC', text: '#475569', border: '#64748B', icon: 'remove-circle-outline' },
                    easing: { bg: '#F0FDFA', text: '#0F766E', border: '#0D9488', icon: 'trending-up' },
                    same: { bg: '#F8FAFC', text: '#475569', border: '#64748B', icon: 'remove-circle-outline' },
                    mixed: { bg: '#FEF3C7', text: '#B45309', border: '#D97706', icon: 'shuffle-outline' },
                    increased: { bg: '#FFEDD5', text: '#C2410C', border: '#F97316', icon: 'trending-down' },
                    severe: { bg: '#FEF2F2', text: '#B91C1C', border: '#EF4444', icon: 'warning-outline' }
                };

                const currentTrendStatus = trendSummary?.status || 'not_enough_data';
                const theme = trendThemeMap[currentTrendStatus] || trendThemeMap.not_enough_data;

                const chartHeight = 80;
                const chartPadding = 12;
                const chartWidth = SCREEN_WIDTH - 72;

                const shortHelper = trendSummary 
                    ? (trendSummary.helper || (trendSummary.status === 'severe' ? 'Stop the routine if strong signs appear.' : 'Recent check-ins look fairly steady.')) 
                    : 'No sessions yet. Complete at least 2 check-ins to see a trend.';

                const renderTrendChart = () => {
                    if (!trendSummary || !trendSummary.hasEnoughData || trendSummary.points.length === 0) return null;
                    const points = trendSummary.points;
                    const totalPoints = points.length;
                    const segmentWidth = totalPoints > 1 ? chartWidth / (totalPoints - 1) : chartWidth;
                    
                    const coords = points.map((p, index) => {
                        const x = index * segmentWidth;
                        const y = chartPadding + (1 - p.stressSignsScore / 10) * (chartHeight - chartPadding * 2);
                        return { x, y };
                    });

                    return (
                        <View style={{ marginTop: 16 }}>
                            <View style={{ height: chartHeight, width: chartWidth, position: 'relative', justifyContent: 'center' }}>
                                {/* Horizontal grid line helpers */}
                                <View style={{ position: 'absolute', left: 0, top: chartPadding, right: 0, height: 1, backgroundColor: '#E2E8F0', borderStyle: 'dashed' }} />
                                <View style={{ position: 'absolute', left: 0, bottom: chartPadding, right: 0, height: 1, backgroundColor: '#E2E8F0', borderStyle: 'dashed' }} />

                                {/* Render lines */}
                                {coords.slice(0, -1).map((c1, index) => {
                                    const c2 = coords[index + 1];
                                    const angle = Math.atan2(c2.y - c1.y, c2.x - c1.x);
                                    const distance = Math.sqrt((c2.x - c1.x)**2 + (c2.y - c1.y)**2);
                                    const midX = (c1.x + c2.x) / 2;
                                    const midY = (c1.y + c2.y) / 2;

                                    return (
                                        <View
                                            key={`line-${index}`}
                                            style={{
                                                position: 'absolute',
                                                left: midX - distance / 2,
                                                top: midY - 1,
                                                width: distance,
                                                height: 2,
                                                backgroundColor: theme.border,
                                                transform: [{ rotate: `${angle}rad` }],
                                            }}
                                        />
                                    );
                                })}

                                {/* Render dots */}
                                {coords.map((c, index) => {
                                    const p = points[index];
                                    const dotColor = p.hasSevereSigns ? '#EF4444' : theme.border;
                                    return (
                                        <View
                                            key={`dot-${index}`}
                                            style={{
                                                position: 'absolute',
                                                left: c.x - 5,
                                                top: c.y - 5,
                                                width: 10,
                                                height: 10,
                                                borderRadius: 5,
                                                backgroundColor: dotColor,
                                                borderWidth: 2,
                                                borderColor: '#fff',
                                            }}
                                        />
                                    );
                                })}
                            </View>
                            {/* X-axis labels */}
                            <View style={{ flexDirection: 'row', width: chartWidth, justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 4 }}>
                                {points.map((p, index) => (
                                    <Text key={`label-${index}`} style={{ fontSize: 9, color: COLORS.textSecondary, fontWeight: '600' }}>
                                        S{p.sequenceNumber}
                                    </Text>
                                ))}
                            </View>
                            {showTrendDetails && <Text style={styles.trendLegendText}>{trendSummary.legend}</Text>}
                        </View>
                    );
                };

                return (
                    <View style={[styles.progressSummaryCard, { backgroundColor: theme.bg, borderLeftColor: theme.border }]}>
                        <View style={styles.trendHeaderRow}>
                            <View style={styles.row}>
                                <Ionicons name={theme.icon as any} size={20} color={theme.text} />
                                <Text style={[styles.progressSummaryTitle, { color: theme.text }]}>
                                    Stress Signs Trend
                                </Text>
                            </View>
                            <Pressable 
                                style={styles.detailsToggleBtn} 
                                onPress={() => setShowTrendDetails(!showTrendDetails)}
                                testID="trend-details-toggle"
                            >
                                <Text style={styles.detailsToggleText}>
                                    {showTrendDetails ? 'Hide details' : 'Details'}
                                </Text>
                                <Ionicons 
                                    name={showTrendDetails ? 'chevron-up' : 'chevron-down'} 
                                    size={14} 
                                    color={theme.text} 
                                />
                            </Pressable>
                        </View>
                        
                        <View style={{ marginTop: 8 }}>
                            <Text style={[styles.trendStatusTitle, { color: theme.text }]}>
                                {trendSummary ? trendSummary.statusTitle : 'Not enough data yet'}
                            </Text>
                            <Text style={styles.trendHelperText}>
                                {shortHelper}
                            </Text>
                        </View>

                        {(showTrendDetails || (progressData && progressData.details && progressData.details.length > 0)) && (
                            <View 
                                style={[
                                    styles.expandedTrendDetails, 
                                    !showTrendDetails && { height: 0, opacity: 0, overflow: 'hidden', marginTop: 0, padding: 0 }
                                ]}
                                testID="expanded-trend-details"
                            >
                                {showTrendDetails && trendSummary?.body && (
                                    <Text style={styles.progressSummaryBodyText}>
                                        {trendSummary.body}
                                    </Text>
                                )}
                                {progressData && progressData.details && progressData.details.length > 0 && (
                                    <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 8 }}>
                                        {progressData.details.map((detail: string, index: number) => (
                                            <Text key={index} style={styles.progressDetailText}>{detail}</Text>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}

                        {trendSummary?.hasEnoughData && renderTrendChart()}

                        {progressData && progressData.hasSevereSigns && (
                            <View style={styles.severeSignsBox}>
                                <Ionicons name="alert-circle-outline" size={16} color="#B85C38" />
                                <Text style={styles.severeSignsText}>
                                    Strong signs were noted: {progressData.severeSignsNote || 'Stop the session if these signs appear.'}
                                </Text>
                            </View>
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
                        <Text style={styles.heroDuration}>{recommendedSession?.suggestedTimeCopy || `${recommendedSession?.durationMinutes} min`}</Text>
                    </View>
                </View>
            </Pressable>

            {/* Grouped routines by category */}
            {(() => {
                const categories = Object.keys(ROUTINE_CATEGORIES) as RoutineCategory[];
                const sortedCategories = categories.sort((a, b) => ROUTINE_CATEGORIES[a].order - ROUTINE_CATEGORIES[b].order);

                return sortedCategories.map((catKey) => {
                    const catMeta = ROUTINE_CATEGORIES[catKey];
                    const routines = allSessions.filter(s => (s.category || 'foundation') === catKey);

                    if (routines.length === 0) return null;

                    const isExpanded = !!expandedCategories[catKey];
                    const toggleCategory = () => {
                        setExpandedCategories(prev => ({
                            ...prev,
                            [catKey]: !prev[catKey]
                        }));
                    };

                    const routineCountText = routines.length === 1 
                        ? '1 routine' 
                        : `${routines.length} routines`;

                    return (
                        <View key={catKey} style={styles.categorySection}>
                            <Pressable 
                                style={styles.collapsibleCategoryHeader} 
                                onPress={toggleCategory}
                                testID={`category-header-${catKey}`}
                            >
                                <View style={styles.categoryTitleContainer}>
                                    <Text 
                                        style={styles.categoryTitleText}
                                        numberOfLines={2}
                                        ellipsizeMode="tail"
                                    >
                                        {`${catMeta.title} · ${routineCountText}`}
                                    </Text>
                                </View>
                                <View style={styles.categoryHeaderRight}>
                                    <Text style={styles.categoryToggleActionText}>
                                        {isExpanded ? 'Hide' : 'Show'}
                                    </Text>
                                    <Ionicons 
                                        name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                                        size={16} 
                                        color={COLORS.primary} 
                                    />
                                </View>
                            </Pressable>

                            {isExpanded && (
                                <View style={{ marginTop: 8 }}>
                                    <Text style={styles.categorySubtitle}>{catMeta.subtitle}</Text>
                                    {routines.length > 1 ? (
                                        <FlatList
                                            data={routines}
                                            renderItem={({ item }) => renderSessionCard(item, true)}
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            keyExtractor={item => item.id}
                                            style={styles.horizontalList}
                                        />
                                    ) : (
                                        renderSessionCard(routines[0], false)
                                    )}
                                </View>
                            )}
                        </View>
                    );
                });
            })()}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F6FAF8' },
    content: { padding: 20, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    greeting: { ...FONTS.small, color: COLORS.textSecondary, fontWeight: '600' },
    headerTitle: { ...FONTS.h1, color: COLORS.text },
    settingsButton: { padding: 4, justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: '#fff', borderRadius: SIZES.radius, padding: 16, marginBottom: 16, ...SHADOWS.small },
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

    heroCard: { backgroundColor: COLORS.primary, borderRadius: 24, padding: 24, marginBottom: 16, ...SHADOWS.medium },
    heroContent: { gap: 8 },
    recommendationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
    recommendationBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
    heroTitle: { ...FONTS.h2, color: '#fff' },
    heroSubtitle: { ...FONTS.body, color: 'rgba(255,255,255,0.8)', lineHeight: 22 },
    heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    heroAction: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    heroActionText: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
    heroDuration: { fontSize: 12, color: '#fff', fontWeight: '600' },

    horizontalList: { marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 16 },
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

    progressSummaryCard: { borderRadius: SIZES.radius, padding: 16, marginBottom: 16, borderLeftWidth: 4 },
    progressSummaryTitle: { ...FONTS.body, fontWeight: '700', marginLeft: 8 },
    progressSummaryBody: { ...FONTS.body, fontWeight: '600', color: COLORS.text, marginTop: 4 },
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

    // Grouped category sections
    categorySection: { marginBottom: 16 },
    categoryHeader: { marginBottom: 12, marginTop: 8 },
    categoryTitle: { ...FONTS.h3, color: COLORS.text, fontWeight: '700' },
    categorySubtitle: { ...FONTS.small, color: COLORS.textSecondary, marginTop: 2 },
    cardCategoryLabel: { ...FONTS.caption, color: COLORS.primary, fontWeight: '600', marginBottom: 4 },
    trendStatusTitle: { ...FONTS.body, fontWeight: '700', marginTop: 4 },
    trendHelperText: { ...FONTS.small, color: COLORS.textSecondary, marginTop: 4 },
    trendLegendText: { fontSize: 10, color: COLORS.textSecondary, fontStyle: 'italic', alignSelf: 'flex-end', marginTop: 8 },

    // Collapsible Category Header & Spacing additions
    collapsibleCategoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E3ECEF',
        gap: 8,
        ...SHADOWS.small
    },
    categoryTitleContainer: {
        flex: 1,
        flexShrink: 1,
        minWidth: 0
    },
    categoryTitleText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
        flexShrink: 1
    },
    categoryHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0
    },
    categoryToggleActionText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary
    },
    trendHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 8
    },
    detailsToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.05)'
    },
    detailsToggleText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary
    },
    expandedTrendDetails: {
        marginTop: 8,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderRadius: 10
    },
    progressSummaryBodyText: {
        ...FONTS.small,
        color: COLORS.textSecondary,
        lineHeight: 18
    }
});
