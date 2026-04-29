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
    ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Purchases from 'react-native-purchases';
import {
    auth,
    db,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    limit
} from '../services/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import { useSubscription } from '../components/SubscriptionManager';
import PaywallModal from '../components/PaywallModal';
import RoomSelectorModal from '../components/RoomSelectorModal';
import {
    getAnxietyColor,
    getAnxietyLabel,
    getAnxietyDescription,
} from '../helpers/anxietyGradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ZONE_CARD_WIDTH = SCREEN_WIDTH * 0.7;
const ZONE_CARD_MARGIN = 12;

import PetProfileRepository from '../services/petProfileRepository';
import { signOut } from '../services/authService';

export default function DashboardScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [petId, setPetId] = useState<string | null>(null);
    const [petData, setPetData] = useState<any>(null);
    const [safeZones, setSafeZones] = useState<any[]>([]);
    const [paywallVisible, setPaywallVisible] = useState(false);
    const [roomSelectorVisible, setRoomSelectorVisible] = useState(false);
    const [authMode, setAuthMode] = useState<string>('unauthenticated');

    const { isPremium, checkPaywallTrigger, trackARSession } = useSubscription();
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

                // Fetch safe zones only if authenticated (for now)
                if (mode === 'authenticated') {
                    const user = auth().currentUser;
                    if (user && pet.id) {
                        const zonesCol = collection(db, 'users', user.uid, 'pets', pet.id, 'safeZones');
                        const zSnap = await getDocs(zonesCol);
                        const zones = zSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
                        zones.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                        setSafeZones(zones);
                    }
                } else {
                    // For guest, safe zones are empty for now or we could load from local
                    setSafeZones([]);
                }
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

    const handleARAction = async () => {
        if (!petId) {
            navigation.navigate('Paywall', { warning: 'Add pet for precise analysis.' });
            return;
        }
        //         const shouldTrigger = await checkPaywallTrigger();
        //         if (shouldTrigger) { navigation.navigate('Paywall'); return; }

        const navParams = {
            userId: auth().currentUser?.uid,
            petId,
            anxietyBefore: anxietyScore
        };

        if (safeZones.length === 0) {
            navigation.navigate('ARSafeZones', { ...navParams, mode: 'scan' });
        } else if (safeZones.length === 1) {
            navigation.navigate('ARSafeZones', { ...navParams, mode: 'view', zoneId: safeZones[0].id });
        } else {
            setRoomSelectorVisible(true);
        }
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

    const renderZoneCard = ({ item }: { item: any }) => {
        const isActive = item.status === 'active';
        const zoneScore = item.anxietyLevel ?? anxietyScore;
        const zoneColor = getAnxietyColor(zoneScore);
        return (
            <Pressable
                style={({ pressed }) => [styles.zoneCard, pressed && { transform: [{ scale: 0.97 }] }]}
                onPress={() => navigation.navigate('ARSafeZones', {
                    mode: 'view', userId: auth().currentUser?.uid, petId, zoneId: item.id,
                })}
            >
                <View style={styles.zonePreview}>
                    <Ionicons name="map-outline" size={32} color={COLORS.textSecondary} />
                </View>
                <View style={styles.zoneInfo}>
                    <Text style={styles.zoneName} numberOfLines={1}>{item.name || 'Unnamed Zone'}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: isActive ? '#D1FAE5' : '#F3F4F6' }]}>
                        <View style={[styles.statusDot, { backgroundColor: isActive ? '#10B981' : '#9CA3AF' }]} />
                        <Text style={[styles.statusText, { color: isActive ? '#059669' : '#6B7280' }]}>
                            {isActive ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                </View>
                <View style={styles.heatBarBg}>
                    <View style={[styles.heatBarFill, {
                        width: `${Math.max(10, (zoneScore / 10) * 100)}%`,
                        backgroundColor: zoneColor,
                    }]} />
                </View>
            </Pressable>
        );
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <Text style={styles.headerTitle}>Pet Anxiety Coach</Text>
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
                            {petData?.breed || profile?.breed || 'Unknown'} • {petData?.age || profile?.age || '?'}y • {petData?.weight || profile?.weight || '?'}kg
                        </Text>
                    </View>
                </View>
            </View>

            {/* Anxiety Alert — Calm Gradient Bar */}
            <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: anxietyColor }]}>
                <View style={styles.rowBetween}>
                    <View style={styles.row}>
                        <Ionicons name="pulse" size={18} color={anxietyColor} />
                        <Text style={[styles.cardTitle, { marginLeft: 8 }]}>Anxiety Level</Text>
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

            {/* Central Session CTA */}
            <View style={styles.sessionCard}>
                <Text style={styles.sessionTitle}>Get ready for a calming session</Text>
                <Text style={styles.sessionSubtitle}>
                    {safeZones.length === 0
                        ? 'Set up your first calm spot.'
                        : `${safeZones.length} calm spot${safeZones.length > 1 ? 's' : ''} configured. Ready for a calming session.`}
                </Text>
                <Pressable
                    style={({ pressed }) => [styles.sessionButton, pressed && styles.primaryButtonPressed]}
                    onPress={handleARAction}
                >
                    <Ionicons name={safeZones.length === 0 ? 'scan-outline' : 'play-circle-outline'} size={22} color="#fff" />
                    <Text style={styles.sessionButtonText}>
                        {safeZones.length === 0 ? 'Set calm spot' : 'Start Calming Session'}
                    </Text>
                </Pressable>
            </View>

            {/* AR Safe Zones — Horizontal Scroll */}
            {safeZones.length > 0 && (
                <View style={styles.zonesSection}>
                    <Text style={styles.sectionTitle}>Your AR Safe Zones</Text>
                    <FlatList
                        data={safeZones}
                        renderItem={renderZoneCard}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={ZONE_CARD_WIDTH + ZONE_CARD_MARGIN}
                        decelerationRate="fast"
                        contentContainerStyle={{ paddingRight: 20 }}
                    />
                </View>
            )}

            {/* Quick Actions */}
            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Quick Actions</Text>
            <View style={styles.quickActionsRow}>
                <Pressable
                    style={({ pressed }) => [styles.quickAction, pressed && { transform: [{ scale: 0.96 }], backgroundColor: COLORS.backgroundLight }]}
                    onPress={() => navigation.navigate('ARSafeZones', { mode: 'scan', userId: auth().currentUser?.uid, petId })}
                >
                    <View style={[styles.quickIconCircle, { backgroundColor: '#E0F2FE' }]}>
                        <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
                    </View>
                    <Text style={styles.quickActionText}>Add Room</Text>
                </Pressable>
                <Pressable
                    style={({ pressed }) => [styles.quickAction, pressed && { transform: [{ scale: 0.96 }], backgroundColor: COLORS.backgroundLight }]}
                    onPress={() => navigation.navigate('Analysis', { petId })}
                >
                    <View style={[styles.quickIconCircle, { backgroundColor: '#E0F2FE' }]}>
                        <Ionicons name="mic-outline" size={24} color={COLORS.primary} />
                    </View>
                    <Text style={styles.quickActionText}>Bark Analysis</Text>
                </Pressable>
                <Pressable
                    style={({ pressed }) => [styles.quickAction, pressed && { transform: [{ scale: 0.96 }], backgroundColor: COLORS.backgroundLight }]}
                    onPress={() => navigation.navigate('Paywall')}
                >
                    <View style={[styles.quickIconCircle, { backgroundColor: '#E0F2FE' }]}>
                        <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
                    </View>
                    <Text style={styles.quickActionText}>Schedule</Text>
                </Pressable>
            </View>

            <PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} />
            <RoomSelectorModal
                visible={roomSelectorVisible}
                onClose={() => setRoomSelectorVisible(false)}
                safeZones={safeZones}
                petId={petId || ''}
                onSelectZone={(zoneId) => {
                    setRoomSelectorVisible(false);
                    navigation.navigate('ARSafeZones', { mode: 'view', userId: auth().currentUser?.uid, petId, zoneId });
                }}
                onZoneDeleted={(zoneId) => {
                    setSafeZones(prev => {
                        const updatedZones = prev.filter(z => z.id !== zoneId);

                        if (updatedZones.length <= 1) {
                            setRoomSelectorVisible(false);
                        }

                        return updatedZones;
                    });
                }}
            />
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
    sessionCard: { backgroundColor: '#fff', borderRadius: SIZES.radius, padding: 24, marginBottom: 20, alignItems: 'center', ...SHADOWS.small },
    sessionTitle: { ...FONTS.h3, color: COLORS.text, marginBottom: 8 },
    sessionSubtitle: { ...FONTS.caption, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
    sessionButton: { backgroundColor: COLORS.primary, paddingVertical: 16, paddingHorizontal: 32, borderRadius: SIZES.radius, flexDirection: 'row', alignItems: 'center', gap: 10 },
    sessionButtonText: { color: '#fff', ...FONTS.body, fontWeight: 'bold' },
    zonesSection: { marginBottom: 20 },
    sectionTitle: { ...FONTS.h3, color: COLORS.text, marginBottom: 12 },
    zoneCard: { width: ZONE_CARD_WIDTH, backgroundColor: '#fff', borderRadius: SIZES.radius, marginRight: ZONE_CARD_MARGIN, overflow: 'hidden', ...SHADOWS.small },
    zonePreview: { height: 90, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    zoneInfo: { padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    zoneName: { ...FONTS.body, fontWeight: '600', color: COLORS.text, flex: 1, marginRight: 8 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 4 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { ...FONTS.small, fontWeight: '600' },
    heatBarBg: { height: 4, backgroundColor: '#F3F4F6' },
    heatBarFill: { height: '100%', borderRadius: 2 },
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
