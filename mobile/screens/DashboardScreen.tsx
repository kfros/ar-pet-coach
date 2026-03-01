import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    RefreshControl,
    Alert,
    Dimensions,
    Pressable
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc, collection, query, limit, getDocs, where, orderBy } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import PaywallModal from '../components/PaywallModal';
import RoomSelectorModal from '../components/RoomSelectorModal';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing, useReducedMotion } from 'react-native-reanimated';
import { useSubscription } from '../components/SubscriptionManager';

const { width } = Dimensions.get('window');

const ActivePulseBadge = () => {
    const reducedMotion = useReducedMotion();
    const opacity = useSharedValue(0.4);
    useEffect(() => {
        if (!reducedMotion) {
            opacity.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
        } else {
            opacity.value = 1;
        }
    }, [reducedMotion]);
    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        backgroundColor: '#10B981',
        width: 8, height: 8, borderRadius: 4, marginRight: 6
    }));
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
            <Animated.View style={animatedStyle} />
            <Text style={{ fontSize: 10, color: '#047857', fontWeight: 'bold' }}>Active</Text>
        </View>
    );
};

export default function DashboardScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [petId, setPetId] = useState<string | null>(null);
    const [petData, setPetData] = useState<any>(null);
    const [safeZones, setSafeZones] = useState<any[]>([]);
    const [todaysContent, setTodaysContent] = useState<any>(null);
    const [paywallVisible, setPaywallVisible] = useState(false);
    const [roomSelectorVisible, setRoomSelectorVisible] = useState(false);

    // Subscription
    const { isPremium, checkPaywallTrigger, trackARSession } = useSubscription();

    const fetchData = async () => {
        const user = auth.currentUser;
        if (!user) {
            navigation.replace('Login');
            return;
        }

        try {
            // 1. Get User Profile
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                setProfile(userDoc.data());

                // 2. Get Pet
                const petsRef = collection(db, 'users', user.uid, 'pets');
                const q = query(petsRef, limit(1));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const petDoc = querySnapshot.docs[0];
                    setPetId(petDoc.id);
                    setPetData(petDoc.data());

                    // 3. Get Safe Zones
                    const zonesRef = collection(db, 'users', user.uid, 'pets', petDoc.id, 'safeZones');
                    console.log("Fetching zones for pet:", petDoc.id);

                    // Debug: Fetch ALL zones first to check data
                    const allZonesSnap = await getDocs(zonesRef);
                    console.log("Total zones found:", allZonesSnap.size);
                    allZonesSnap.docs.forEach(d => console.log("Zone:", d.id, d.data()));

                    // Proper query - fetch all zones without orderBy to avoid issues with pending timestamps
                    const zSnap = await getDocs(zonesRef);
                    const zones = zSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    // Sort client-side by createdAt (handles missing timestamps)
                    zones.sort((a: any, b: any) => {
                        const aTime = a.createdAt?.seconds || 0;
                        const bTime = b.createdAt?.seconds || 0;
                        return bTime - aTime; // desc order
                    });
                    console.log("Zones after sort:", zones.map((z: any) => z.name));
                    setSafeZones(zones);

                    // 4. Get Daily Content (Mocking logic for now based on pet day)
                    const currentDay = petDoc.data().currentDay || 1;
                    // Mock content if not found
                    setTodaysContent({
                        day: currentDay,
                        title: `Day ${currentDay}`,
                        description: "Start your daily routine to help your pet."
                    });
                }
            } else {
                // No profile -> Onboarding
                navigation.replace('Onboarding');
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

    const getAnxietyDetails = (score: number) => {
        if (score < 4) return { label: 'Low', color: '#10B981' };
        if (score < 7) return { label: 'Moderate', color: '#D97706' };
        if (score < 9) return { label: 'Elevated', color: '#F97316' };
        return { label: 'High', color: '#EF4444' };
    };

    const handleARAction = async () => {
        if (!petId) {
            navigation.navigate('Paywall', { warning: 'Add pet for precise analysis.' });
            return;
        }

        const shouldTrigger = await checkPaywallTrigger();
        if (shouldTrigger) {
            navigation.navigate('Paywall');
            return;
        }

        if (safeZones.length === 0) {
            // New Scan
            navigation.navigate('ARSafeZones', {
                mode: 'scan',
                userId: auth.currentUser?.uid,
                petId
            });
        } else if (safeZones.length === 1) {
            // Open Zone
            navigation.navigate('ARSafeZones', {
                mode: 'view',
                userId: auth.currentUser?.uid,
                petId,
                zoneId: safeZones[0].id
            });
        } else {
            // Multiple zones - show selector
            setRoomSelectorVisible(true);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <Text>Loading...</Text>
            </View>
        );
    }

    if (!profile) return null;

    if (!petId) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: COLORS.backgroundLight }]}>
                <View style={{ width: 150, height: 150, backgroundColor: COLORS.lavender, borderRadius: 75, justifyContent: 'center', alignItems: 'center', marginBottom: 30, ...SHADOWS.small }}>
                    <Text style={{ fontSize: 80 }}>🐕</Text>
                </View>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: COLORS.primary, textAlign: 'center', marginBottom: 16 }}>
                    Welcome to ChillPup!
                </Text>
                <Text style={{ fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 40, lineHeight: 24 }}>
                    Add your furry friend to start tracking their anxiety and building a calmer environment together.
                </Text>
                <Pressable
                    style={({ pressed }: { pressed: boolean }) => [
                        { backgroundColor: COLORS.primary, padding: 18, borderRadius: 16, width: '100%', alignItems: 'center', ...SHADOWS.medium },
                        pressed && { backgroundColor: COLORS.primaryDark, transform: [{ scale: 0.98 }] as const }
                    ]}
                    onPress={() => navigation.navigate('PetProfileStepper')}
                >
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Add First Pet</Text>
                </Pressable>
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
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Pet Anxiety Coach</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                    <Ionicons name="settings-outline" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            {/* Pet Card */}
            <View style={styles.card}>
                <View style={styles.petHeader}>
                    <View style={styles.avatar}>
                        <Text style={{ fontSize: 30 }}>🐶</Text>
                    </View>
                    <View>
                        <Text style={styles.petName}>{profile.petName}</Text>
                        <Text style={styles.petDetails}>{profile.breed} • {profile.age}y • {profile.weight}kg</Text>
                    </View>
                </View>
            </View>

            {/* Anxiety Level */}
            <View style={styles.card}>
                <View style={styles.rowBetween}>
                    <View style={styles.row}>
                        <Ionicons name="pulse" size={20} color={getAnxietyDetails(petData?.anxietyScore ?? 0).color} />
                        <Text style={[styles.cardTitle, { marginLeft: 8 }]}>Anxiety Alert Level</Text>
                    </View>
                    <Text style={[styles.score, { color: getAnxietyDetails(petData?.anxietyScore ?? 0).color }]}>{petData?.anxietyScore ?? 0}/10</Text>
                </View>
                <View style={styles.gradientBarBg}>
                    <LinearGradient
                        colors={['#10B981', '#F59E0B', '#F97316', '#EF4444']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                            styles.gradientBarFill,
                            { width: `${Math.max(3, ((petData?.anxietyScore ?? 0) / 10) * 100)}%` }
                        ]}
                    />
                </View>
                <Text style={styles.helperText}>{getAnxietyDetails(petData?.anxietyScore ?? 0).label} anxiety detected</Text>
            </View>

            {/* Central Session Status */}
            <View style={[styles.card, { paddingVertical: 24, paddingHorizontal: 20, alignItems: 'center' }]}>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 }}>Current Session Status</Text>
                <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 20, textAlign: 'center' }}>
                    {safeZones.length === 0 ? 'Map a safe room to begin coaching.' : 'Your AR environment is ready.'}
                </Text>
                <Pressable
                    style={({ pressed }) => [
                        { backgroundColor: COLORS.primary, paddingVertical: 18, paddingHorizontal: 32, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', justifyContent: 'center', ...SHADOWS.medium },
                        pressed && { backgroundColor: COLORS.primaryDark, transform: [{ scale: 0.98 }] as const }
                    ]}
                    onPress={handleARAction}
                >
                    <Ionicons name={safeZones.length === 0 ? "scan-outline" : "play-circle-outline"} size={26} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                        {safeZones.length === 0 ? "Scan AR Zone" : "Start Calming Session"}
                    </Text>
                </Pressable>
            </View>

            {/* Your AR Safe Zones */}
            <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 16, paddingHorizontal: 20 }}>Your AR Safe Zones</Text>
                {safeZones.length === 0 ? (
                    <View style={{ paddingHorizontal: 20 }}>
                        <View style={[styles.card, { alignItems: 'center', padding: 30, backgroundColor: '#f9fafb' }]}>
                            <Ionicons name="scan-outline" size={40} color="#9ca3af" />
                            <Text style={{ color: '#6b7280', marginTop: 10 }}>No zones mapped yet.</Text>
                        </View>
                    </View>
                ) : (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={width * 0.75}
                        decelerationRate="fast"
                        contentContainerStyle={{ paddingHorizontal: 20 }}
                    >
                        {safeZones.map((zone, index) => (
                            <Pressable
                                key={zone.id || index}
                                style={({ pressed }) => [
                                    styles.zoneCard,
                                    pressed && { backgroundColor: COLORS.backgroundLight, transform: [{ scale: 0.98 }] as const }
                                ]}
                                onPress={() => navigation.navigate('ARSafeZones', { mode: 'view', userId: auth.currentUser?.uid, petId, zoneId: zone.id })}
                            >
                                <View style={styles.zonePreviewBg}>
                                    <Ionicons name="cube-outline" size={32} color={COLORS.primaryLight} />
                                </View>
                                <View style={{ padding: 12 }}>
                                    <View style={styles.rowBetween}>
                                        <Text style={styles.zoneName} numberOfLines={1}>{zone.name || `Zone ${index + 1}`}</Text>
                                        {index === 0 ? <ActivePulseBadge /> : (
                                            <View style={styles.inactiveBadge}>
                                                <Text style={{ fontSize: 10, color: '#6b7280' }}>Last 2h ago</Text>
                                            </View>
                                        )}
                                    </View>

                                    <View style={{ marginTop: 12 }}>
                                        <View style={styles.zoneHeatBarBg}>
                                            <View style={[styles.zoneHeatBarFill, { width: `${Math.max(10, ((zone.anxietyHeat ?? 3) / 10) * 100)}%`, backgroundColor: getAnxietyDetails(zone.anxietyHeat ?? 3).color }]} />
                                        </View>
                                    </View>
                                </View>
                            </Pressable>
                        ))}
                        {/* Add new zone card */}
                        <Pressable
                            style={styles.addZoneCard}
                            onPress={() => navigation.navigate('ARSafeZones', { mode: 'scan', userId: auth.currentUser?.uid, petId })}
                        >
                            <View style={styles.addZoneIconBg}>
                                <Ionicons name="add" size={32} color={COLORS.primary} />
                            </View>
                            <Text style={{ color: COLORS.primary, fontWeight: 'bold', marginTop: 8 }}>Add Zone</Text>
                        </Pressable>
                    </ScrollView>
                )}
            </View>

            {/* Quick Actions */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionsScroll} contentContainerStyle={{ paddingRight: 20 }}>
                {/* AR Heatmap */}
                <Pressable
                    style={({ pressed }: { pressed: boolean }) => [
                        styles.actionCard,
                        safeZones.length === 0 && styles.disabledAction,
                        pressed && safeZones.length > 0 && { backgroundColor: COLORS.backgroundLight, transform: [{ scale: 0.97 }] as const }
                    ]}
                    onPress={handleARAction}
                    disabled={safeZones.length === 0}
                >
                    <View style={[styles.iconCircle, { backgroundColor: '#dbeafe' }]}>
                        <Ionicons name="map-outline" size={28} color="#2563eb" />
                    </View>
                    <Text style={styles.actionText}>Activity Heatmap</Text>
                    {safeZones.length === 0 && <Text style={styles.subText}>(Scan Room First)</Text>}
                </Pressable>

                {/* Add Room */}
                <Pressable
                    style={({ pressed }: { pressed: boolean }) => [
                        styles.actionCard,
                        pressed && { backgroundColor: COLORS.backgroundLight, transform: [{ scale: 0.97 }] as const }
                    ]}
                    onPress={() => navigation.navigate('ARSafeZones', { mode: 'scan', userId: auth.currentUser?.uid, petId })}
                >
                    <View style={[styles.iconCircle, { backgroundColor: '#f3e8ff' }]}>
                        <Ionicons name="camera-outline" size={28} color="#9333ea" />
                    </View>
                    <Text style={styles.actionText}>Add New Room</Text>
                </Pressable>

                {/* Schedule Plan */}
                <Pressable
                    style={({ pressed }: { pressed: boolean }) => [
                        styles.actionCard,
                        pressed && { backgroundColor: COLORS.backgroundLight, transform: [{ scale: 0.97 }] as const }
                    ]}
                    onPress={() => navigation.navigate('Paywall')}
                >
                    <View style={[styles.iconCircle, { backgroundColor: '#ffedd5' }]}>
                        <Ionicons name="calendar-outline" size={28} color="#ea580c" />
                    </View>
                    <Text style={styles.actionText}>Schedule Plan</Text>
                </Pressable>

                {/* Bark Analysis */}
                <Pressable
                    style={({ pressed }: { pressed: boolean }) => [
                        styles.actionCard,
                        pressed && { backgroundColor: COLORS.backgroundLight, transform: [{ scale: 0.97 }] as const }
                    ]}
                    onPress={() => navigation.navigate('Analysis', { petId })}
                >
                    <View style={[styles.iconCircle, { backgroundColor: '#fee2e2' }]}>
                        <Ionicons name="mic-outline" size={28} color="#ef4444" />
                    </View>
                    <Text style={styles.actionText}>Bark Analysis</Text>
                </Pressable>
            </ScrollView>



            <PaywallModal
                visible={paywallVisible}
                onClose={() => setPaywallVisible(false)}
            />

            <RoomSelectorModal
                visible={roomSelectorVisible}
                onClose={() => setRoomSelectorVisible(false)}
                safeZones={safeZones}
                petId={petId || ''}
                onSelectZone={(zoneId) => {
                    setRoomSelectorVisible(false);
                    navigation.navigate('ARSafeZones', {
                        mode: 'view',
                        userId: auth.currentUser?.uid,
                        petId,
                        zoneId
                    });
                }}
                onZoneDeleted={(zoneId) => {
                    setSafeZones(prev => prev.filter(z => z.id !== zoneId));
                    if (safeZones.length <= 2) setRoomSelectorVisible(false); // If 1 or 0 left, close (length is old value here so <=2 checks if it becomes <=1)
                }}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    petHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#2563eb',
    },
    petName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111',
    },
    petDetails: {
        color: '#666',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111',
    },
    score: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    gradientBarBg: {
        height: 10,
        backgroundColor: '#f3f4f6',
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 8,
    },
    gradientBarFill: {
        height: '100%',
        borderRadius: 5,
    },
    helperText: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
    },
    actionsScroll: {
        marginBottom: 20,
        overflow: 'visible',
    },
    actionCard: {
        backgroundColor: '#fff',
        width: 140,
        height: 160,
        borderRadius: 16,
        padding: 16,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        gap: 12,
    },
    disabledAction: {
        opacity: 0.5,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        fontWeight: '600',
        textAlign: 'center',
        color: '#111',
    },
    subText: {
        fontSize: 10,
        color: '#666',
        marginTop: -8,
    },
    zoneCard: {
        width: width * 0.75 - 12,
        marginRight: 12,
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    zonePreviewBg: {
        height: 100,
        backgroundColor: '#e0f2fe',
        justifyContent: 'center',
        alignItems: 'center',
    },
    zoneName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        flex: 1,
        marginRight: 8,
    },
    inactiveBadge: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    zoneHeatBarBg: {
        height: 4,
        backgroundColor: '#f3f4f6',
        borderRadius: 2,
        overflow: 'hidden',
    },
    zoneHeatBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    addZoneCard: {
        width: 120,
        backgroundColor: '#fff',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e5e7eb',
        borderStyle: 'dashed',
    },
    addZoneIconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.backgroundLight,
        justifyContent: 'center',
        alignItems: 'center',
    },

});
