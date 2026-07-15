import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    ActivityIndicator,
    useWindowDimensions,
    DimensionValue,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import { useSubscription } from '../components/SubscriptionManager';
import PetProfileRepository from '../services/petProfileRepository';
import SessionService from '../services/sessionService';
import { ROUTINE_CATEGORIES } from '../appContent/routineCategories';
import { RoutineCategory, Session } from '../types/Session';
import {
    getRoutineCataloguePresentation,
    CATEGORY_CATALOGUE_PRESENTATION,
    getNoiseRoutinePhasePresentation
} from '../appContent/routineCataloguePresentation';

export default function RoutinesScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [petId, setPetId] = useState<string | null>(null);

    const allSessions = SessionService.getSessions();
    const sortedCategories = (Object.keys(ROUTINE_CATEGORIES) as RoutineCategory[]).sort(
        (a, b) => ROUTINE_CATEGORIES[a].order - ROUTINE_CATEGORIES[b].order
    );

    // CP-ROUTINES-001-UNKNOWN-CATEGORY:
    // Normalize missing or unrecognized categories to foundation for catalogue presentation.
    const getNormalizedCategory = (session: Session): RoutineCategory => {
        const hasCategory = session.category && (session.category in ROUTINE_CATEGORIES);
        return hasCategory ? (session.category as RoutineCategory) : 'foundation';
    };

    // Filter to categories that actually have routines to display
    const activeCategories = sortedCategories.filter(cat =>
        allSessions.some(s => getNormalizedCategory(s) === cat)
    );

    // CP-ROUTINES-001-SELECTION-CONTRACT:
    // Initialize to foundation if it exists and has routines; otherwise the first non-empty category.
    const [selectedCategory, setSelectedCategory] = useState<RoutineCategory>(() => {
        const hasFoundation = allSessions.some(s => getNormalizedCategory(s) === 'foundation');
        if (hasFoundation && activeCategories.includes('foundation')) {
            return 'foundation';
        }
        return activeCategories[0] || 'foundation';
    });

    // CP-ROUTINES-001-SHOW-ALL-TOGGLE: separate state for showAllRoutines
    const [showAllRoutines, setShowAllRoutines] = useState(false);

    // CP-ROUTINES-001-SELECTION-FALLBACK:
    // Sync invalid selected category with non-empty categories if data changes
    useEffect(() => {
        if (!activeCategories.includes(selectedCategory) && activeCategories.length > 0) {
            const fallback = activeCategories.includes('foundation') ? 'foundation' : activeCategories[0];
            setSelectedCategory(fallback);
        }
    }, [activeCategories, selectedCategory]);

    // Resolved active category to render (applying fallback if selectedCategory is invalid)
    const activeCategory = activeCategories.includes(selectedCategory)
        ? selectedCategory
        : (activeCategories.includes('foundation') ? 'foundation' : activeCategories[0]);

    const { isPremium, isLoading: subLoading } = useSubscription();
    const insets = useSafeAreaInsets();
    const { fontScale, width: screenWidth } = useWindowDimensions();

    const fetchPetData = async () => {
        try {
            const pet = await PetProfileRepository.getPetProfile();
            if (pet) {
                setPetId(pet.id || 'guest_pet');
            } else {
                setPetId(null);
            }
        } catch (error) {
            console.error("Error fetching pet profile in RoutinesScreen:", error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchPetData();
        }, [])
    );

    // CP-ROUTINES-002-STABLE-SORT:
    // Sort routines in noise_support category by phaseOrder stably, preserving original relative order for unmapped ones.
    const getSortedRoutinesForCategory = (catKey: string, routines: Session[]): Session[] => {
        if (catKey !== 'noise_support') {
            return routines;
        }

        const copied = [...routines];
        copied.sort((a, b) => {
            const phaseA = getNoiseRoutinePhasePresentation(a);
            const phaseB = getNoiseRoutinePhasePresentation(b);

            if (phaseA && phaseB) {
                return phaseA.phaseOrder - phaseB.phaseOrder;
            }
            if (phaseA) {
                return -1;
            }
            if (phaseB) {
                return 1;
            }

            const idxA = routines.indexOf(a);
            const idxB = routines.indexOf(b);
            return idxA - idxB;
        });

        return copied;
    };

    const handleStartSession = (session: Session) => {
        if (!petId) {
            navigation.navigate('PetProfileStepper');
            return;
        }

        // CP-ROUTINES-001-LOADING-COPY:
        // Ignore presses and do not navigate while checking access
        if (session.accessLevel === 'premium' && subLoading) {
            return;
        }

        if (session.accessLevel === 'premium' && !isPremium) {
            navigation.navigate('Paywall', { sessionId: session.id, petId });
            return;
        }

        navigation.navigate('SessionPreview', { sessionId: session.id, petId });
    };

    const renderSessionCard = (item: Session) => {
        const presentation = getRoutineCataloguePresentation(item);
        const problemTitle = presentation.problemTitle;
        const problemSummary = presentation.problemSummary;

        const isPremiumRoutine = item.accessLevel === 'premium';
        const isChecking = isPremiumRoutine && subLoading;
        const isLocked = isPremiumRoutine && !isPremium && !subLoading;

        const displayTime = item.suggestedTimeCopy || `${item.durationMinutes} min`;

        // CP-ROUTINES-002-ACCESSIBILITY-EXACTNESS:
        // Formulating exact accessibility labels incorporating phase labels.
        const phaseMeta = getNoiseRoutinePhasePresentation(item);
        let cardAccessibilityLabel = '';

        if (phaseMeta) {
            const phaseWord = phaseMeta.label.charAt(0).toUpperCase() + phaseMeta.label.slice(1).toLowerCase();
            let actionWord = isLocked ? 'Unlock routine' : 'View routine';
            if (isChecking) {
                actionWord = 'Checking access';
            }
            cardAccessibilityLabel = `${phaseWord}. ${problemTitle}. ${actionWord}.`;
        } else {
            let actionWord = isLocked ? 'Unlock routine' : 'View routine';
            if (isChecking) {
                actionWord = 'Checking access';
            }
            cardAccessibilityLabel = `${problemTitle}. ${actionWord}`;
        }

        return (
            <Pressable
                key={item.id}
                testID={`routine-card-${item.id}`}
                style={styles.sessionCardItem}
                onPress={() => handleStartSession(item)}
                accessibilityRole="button"
                accessibilityLabel={cardAccessibilityLabel}
                accessibilityState={{ disabled: isChecking }}
            >
                {/* CP-ROUTINES-002-EXACT-MAPPING: Render informational phase block */}
                {phaseMeta && (
                    <View style={styles.phaseBlock} testID={`routine-phase-${item.id}`}>
                        <View style={styles.phaseLabelContainer}>
                            <Text style={styles.phaseLabelText}>{phaseMeta.label}</Text>
                        </View>
                        <Text style={styles.phaseTimingText}>{phaseMeta.timingInstruction}</Text>
                    </View>
                )}

                <View style={styles.cardHeader}>
                    <Text style={styles.sessionCardTitle}>{problemTitle}</Text>
                    {isChecking ? null : (
                        <Ionicons 
                            name={isLocked ? "lock-closed" : "chevron-forward"} 
                            size={20} 
                            color={isLocked ? COLORS.primary : COLORS.textSecondary} 
                            style={styles.cardArrow}
                        />
                    )}
                </View>

                <Text style={styles.sessionCardSubtitle}>{problemSummary}</Text>

                <View style={styles.cardFooter}>
                    <Text style={styles.sessionDuration}>{displayTime}</Text>
                    
                    {isPremiumRoutine ? (
                        isChecking ? (
                            <View style={[
                                styles.badge,
                                { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB' }
                            ]}>
                                <Text style={[styles.badgeText, { color: '#4B5563' }]}>
                                    CHECKING ACCESS
                                </Text>
                            </View>
                        ) : (
                            <View style={[
                                styles.badge,
                                { backgroundColor: isLocked ? COLORS.primary : '#E6F7F2', borderWidth: 1, borderColor: isLocked ? COLORS.primary : '#B8E7DC' }
                            ]}>
                                <Ionicons
                                    name={isLocked ? "lock-closed" : "checkmark-circle"}
                                    size={12}
                                    color={isLocked ? '#FFFFFF' : '#0F766E'}
                                    style={{ marginRight: 4 }}
                                />
                                <Text style={[styles.badgeText, { color: isLocked ? '#FFFFFF' : '#0F766E' }]}>
                                    {isLocked ? 'PREMIUM' : 'INCLUDED'}
                                </Text>
                            </View>
                        )
                    ) : (
                        <View style={[styles.badge, styles.freeBadge]}>
                            <Text style={[styles.badgeText, { color: COLORS.primary }]}>
                                FREE
                            </Text>
                        </View>
                    )}
                </View>
            </Pressable>
        );
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
                    <Text style={styles.headerTitle}>Routines</Text>
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
                        accessibilityRole="button"
                        accessibilityLabel="Add First Pet"
                    >
                        <Text style={styles.primaryButtonText}>Add First Pet</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    // CP-ROUTINES-001-EMPTY-AND-MISSING-DATA:
    // Render neutral empty state if no routines are available
    if (allSessions.length === 0) {
        return (
            <View style={styles.center} testID="routines-empty-state">
                <Text style={styles.emptyText}>No routines available right now.</Text>
            </View>
        );
    }

    const isLargeText = fontScale > 1.2;
    const isNarrow = screenWidth < 350;
    const cardWidthStyle: { width: DimensionValue } = isLargeText || isNarrow ? { width: '100%' } : { width: '48%' };

    // Get selected category metadata for accessibility and headings
    const selectedCatMeta = CATEGORY_CATALOGUE_PRESENTATION[activeCategory];
    const selectedCatTitle = selectedCatMeta?.title || 'Routines';

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
            testID="routines-tab-screen"
        >
            {/* Header: Compact and safe-area aware */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Routines</Text>
                <Text style={styles.headerHelper}>Choose what your dog needs help with.</Text>
            </View>

            {/* Category Grid Chooser */}
            <View style={styles.categoryGrid}>
                {activeCategories.map((catKey) => {
                    const catMeta = CATEGORY_CATALOGUE_PRESENTATION[catKey];
                    if (!catMeta) return null;

                    const routines = allSessions.filter(s => getNormalizedCategory(s) === catKey);
                    const routineCount = routines.length;
                    const routineCountText = routineCount === 1 ? '1 routine' : `${routineCount} routines`;

                    // CP-ROUTINES-001-SHOW-ALL-TOGGLE:
                    // Category card shows selected = false while showAllRoutines is true
                    const isSelected = !showAllRoutines && activeCategory === catKey;

                    const catAccessibilityLabel = `${catMeta.title}, ${routineCountText}`;

                    return (
                        <Pressable
                            key={catKey}
                            testID={`routine-category-${catKey}`}
                            style={[
                                styles.categoryCard,
                                cardWidthStyle,
                                isSelected && styles.categoryCardSelected
                            ]}
                            onPress={() => {
                                // Selecting a category immediately resets showAllRoutines to false
                                setSelectedCategory(catKey);
                                setShowAllRoutines(false);
                            }}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            accessibilityLabel={catAccessibilityLabel}
                        >
                            <View style={styles.categoryCardHeader}>
                                <Ionicons 
                                    name={catMeta.icon as any} 
                                    size={24} 
                                    color={isSelected ? COLORS.primary : COLORS.textSecondary} 
                                />
                                {isSelected && (
                                    <Ionicons 
                                        name="checkmark-circle" 
                                        size={18} 
                                        color={COLORS.primary} 
                                        style={styles.checkmarkIcon}
                                    />
                                )}
                            </View>
                            <Text style={styles.categoryCardTitle}>{catMeta.title}</Text>
                            <Text style={styles.categoryCardHelper}>{catMeta.helper}</Text>
                            <Text style={styles.categoryCardCount}>{routineCountText}</Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* CP-ROUTINES-001-SHOW-ALL-TOGGLE: Reversible toggle button */}
            <Pressable
                testID="routine-category-all"
                style={[
                    styles.showAllButton,
                    showAllRoutines && styles.showAllButtonSelected
                ]}
                onPress={() => setShowAllRoutines(prev => !prev)}
                accessibilityRole="button"
                accessibilityState={{ selected: showAllRoutines }}
                accessibilityLabel={showAllRoutines ? `Back to ${selectedCatTitle}` : "Show all routines"}
            >
                <Text style={[
                    styles.showAllButtonText,
                    showAllRoutines && styles.showAllButtonTextSelected
                ]}>
                    {showAllRoutines ? "Back to selected category" : "Show all routines"}
                </Text>
            </Pressable>

            {/* Routine List Section */}
            <View style={styles.listSection}>
                <Text style={styles.listHeading}>
                    {showAllRoutines ? 'All routines' : selectedCatTitle}
                </Text>

                {/* CP-ROUTINES-002-PHASE-ORDER-COPY: Selected Category Timing Helper */}
                {!showAllRoutines && activeCategory === 'noise_support' && (
                    <Text style={styles.timingHelperText}>
                        Choose the timing that matches your situation.
                    </Text>
                )}

                {showAllRoutines ? (
                    activeCategories.map((catKey) => {
                        const routines = allSessions.filter(s => getNormalizedCategory(s) === catKey);
                        if (routines.length === 0) return null;

                        const sortedRoutines = getSortedRoutinesForCategory(catKey, routines);

                        return (
                            <View key={catKey} testID={`routine-section-${catKey}`} style={styles.sectionGroup}>
                                <Text style={styles.sectionHeaderTitle}>
                                    {ROUTINE_CATEGORIES[catKey as RoutineCategory].title}
                                </Text>
                                {/* CP-ROUTINES-002-PHASE-ORDER-COPY: Show All Noise Category Timing Helper */}
                                {catKey === 'noise_support' && (
                                    <Text style={styles.timingHelperTextSection}>
                                        Choose the timing that matches your situation.
                                    </Text>
                                )}
                                <View style={styles.sectionRoutinesList}>
                                    {sortedRoutines.map(s => renderSessionCard(s))}
                                </View>
                            </View>
                        );
                    })
                ) : (
                    <View style={styles.sectionRoutinesList}>
                        {getSortedRoutinesForCategory(
                            activeCategory,
                            allSessions.filter(s => getNormalizedCategory(s) === activeCategory)
                        ).map(s => renderSessionCard(s))}
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F6FAF8' },
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { marginBottom: 20 },
    headerTitle: { ...FONTS.h1, color: COLORS.text, marginBottom: 4 },
    headerHelper: { ...FONTS.body, color: COLORS.textSecondary },
    emptyText: { ...FONTS.body, color: COLORS.textSecondary },

    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        width: '100%',
        gap: 12,
        marginBottom: 16,
    },
    categoryCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E3ECEF',
        ...SHADOWS.small,
        justifyContent: 'flex-start',
        minHeight: 140,
    },
    categoryCardSelected: {
        borderColor: COLORS.primary,
        borderWidth: 2,
    },
    categoryCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    checkmarkIcon: {
        marginLeft: 'auto',
    },
    categoryCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    categoryCardHelper: {
        fontSize: 11,
        color: COLORS.textSecondary,
        lineHeight: 16,
        marginBottom: 8,
        flexGrow: 1,
    },
    categoryCardCount: {
        fontSize: 11,
        color: COLORS.primary,
        fontWeight: '600',
    },

    showAllButton: {
        width: '100%',
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 28,
        backgroundColor: 'transparent',
    },
    showAllButtonSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    showAllButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
    },
    showAllButtonTextSelected: {
        color: '#fff',
    },

    listSection: {
        marginTop: 8,
    },
    listHeading: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 16,
    },
    timingHelperText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: -10,
        marginBottom: 16,
        fontStyle: 'italic',
    },
    timingHelperTextSection: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: -6,
        marginBottom: 16,
        fontStyle: 'italic',
    },
    sectionGroup: {
        marginBottom: 24,
    },
    sectionHeaderTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    sectionRoutinesList: {
        gap: 12,
    },

    sessionCardItem: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E3ECEF',
        ...SHADOWS.small,
        width: '100%',
    },
    phaseBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F9F6', // Neutral light teal
        borderWidth: 1,
        borderColor: '#CCEDE5',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginBottom: 10,
        flexWrap: 'wrap',
        gap: 6,
    },
    phaseLabelContainer: {
        backgroundColor: '#E6F4F1',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    phaseLabelText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#0F766E', // Solid teal
        letterSpacing: 0.5,
    },
    phaseTimingText: {
        fontSize: 11,
        color: COLORS.textSecondary,
        flex: 1,
        minWidth: 140,
        lineHeight: 15,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    sessionCardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.text,
        flex: 1,
        marginRight: 12,
        lineHeight: 20,
    },
    cardArrow: {
        marginTop: 2,
    },
    sessionCardSubtitle: {
        fontSize: 12,
        color: COLORS.textSecondary,
        lineHeight: 18,
        marginBottom: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 10,
    },
    sessionDuration: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    freeBadge: {
        backgroundColor: '#DDF4EF',
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '800',
        textTransform: 'uppercase',
    },

    noPetAvatar: { width: 150, height: 150, backgroundColor: COLORS.lavender, borderRadius: 75, justifyContent: 'center', alignItems: 'center', marginBottom: 30, ...SHADOWS.small },
    noPetTitle: { ...FONTS.h1, color: COLORS.primary, textAlign: 'center', marginBottom: 16 },
    noPetDesc: { ...FONTS.body, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 40, lineHeight: 24 },
    primaryButton: { backgroundColor: COLORS.primary, padding: 18, borderRadius: SIZES.radius, width: '100%', alignItems: 'center', ...SHADOWS.small },
    primaryButtonPressed: { backgroundColor: COLORS.primaryDark, transform: [{ scale: 0.98 }] },
    primaryButtonText: { color: '#fff', ...FONTS.body, fontWeight: 'bold' },
});
