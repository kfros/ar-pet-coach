import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    FlatList,
    Pressable,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import { useSubscription } from '../components/SubscriptionManager';
import PetProfileRepository from '../services/petProfileRepository';
import SessionService from '../services/sessionService';
import { ROUTINE_CATEGORIES } from '../appContent/routineCategories';
import { RoutineCategory } from '../types/Session';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RoutinesScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [petId, setPetId] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
        foundation: true,
    });

    const { isPremium, isLoading: subLoading } = useSubscription();
    const insets = useSafeAreaInsets();

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
                    >
                        <Text style={styles.primaryButtonText}>Add First Pet</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    const allSessions = SessionService.getSessions();
    const categories = Object.keys(ROUTINE_CATEGORIES) as RoutineCategory[];
    const sortedCategories = categories.sort((a, b) => ROUTINE_CATEGORIES[a].order - ROUTINE_CATEGORIES[b].order);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
            testID="routines-tab-screen"
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Browse Routines</Text>
            </View>

            {sortedCategories.map((catKey) => {
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
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F6FAF8' },
    content: { padding: 20, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { marginBottom: 16 },
    headerTitle: { ...FONTS.h1, color: COLORS.text },
    categorySection: { marginBottom: 16 },
    categorySubtitle: { ...FONTS.small, color: COLORS.textSecondary, marginTop: 2 },
    cardCategoryLabel: { ...FONTS.caption, color: COLORS.primary, fontWeight: '600', marginBottom: 4 },
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
    horizontalList: { marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 16 },
    sessionCardItem: { backgroundColor: '#fff', borderRadius: 20, padding: 16, ...SHADOWS.small, borderWidth: 1, borderColor: '#E3ECEF' },
    sessionCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    sessionIconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#DDF4EF', justifyContent: 'center', alignItems: 'center' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
    freeBadge: { backgroundColor: '#DDF4EF' },
    badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    sessionCardTitle: { ...FONTS.body, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
    sessionCardSubtitle: { ...FONTS.small, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 12 },
    sessionCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
    sessionDuration: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
    noPetAvatar: { width: 150, height: 150, backgroundColor: COLORS.lavender, borderRadius: 75, justifyContent: 'center', alignItems: 'center', marginBottom: 30, ...SHADOWS.small },
    noPetTitle: { ...FONTS.h1, color: COLORS.primary, textAlign: 'center', marginBottom: 16 },
    noPetDesc: { ...FONTS.body, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 40, lineHeight: 24 },
    primaryButton: { backgroundColor: COLORS.primary, padding: 18, borderRadius: SIZES.radius, width: '100%', alignItems: 'center', ...SHADOWS.small },
    primaryButtonPressed: { backgroundColor: COLORS.primaryDark, transform: [{ scale: 0.98 }] },
    primaryButtonText: { color: '#fff', ...FONTS.body, fontWeight: 'bold' },
});
