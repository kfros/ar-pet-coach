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
    Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc, collection, query, limit, getDocs, where, orderBy } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../components/SubscriptionManager';
import PaywallModal from '../components/PaywallModal';
import RoomSelectorModal from '../components/RoomSelectorModal';

const { width } = Dimensions.get('window');

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
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#A5D4FF' }]}>
                <View style={{ width: 150, height: 150, backgroundColor: '#E0BBE4', borderRadius: 75, justifyContent: 'center', alignItems: 'center', marginBottom: 30, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
                    <Text style={{ fontSize: 80 }}>🐕</Text>
                </View>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#0D99FF', textAlign: 'center', marginBottom: 16 }}>
                    Welcome to ChillPup!
                </Text>
                <Text style={{ fontSize: 16, color: '#007ACC', textAlign: 'center', marginBottom: 40, lineHeight: 24 }}>
                    Add your furry friend to start tracking their anxiety and building a calmer environment together.
                </Text>
                <TouchableOpacity
                    style={{ backgroundColor: '#0D99FF', padding: 18, borderRadius: 16, width: '100%', alignItems: 'center', elevation: 3, shadowColor: '#0D99FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
                    onPress={() => navigation.navigate('PetProfileStepper')}
                >
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Add First Pet</Text>
                </TouchableOpacity>
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
                        <Ionicons name="pulse" size={20} color="#ef4444" />
                        <Text style={[styles.cardTitle, { marginLeft: 8 }]}>Anxiety Alert Level</Text>
                    </View>
                    <Text style={[styles.score, { color: '#ef4444' }]}>{petData?.anxietyScore ?? 0}/10</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <View
                        style={[
                            styles.progressBarFill,
                            { width: `${((petData?.anxietyScore ?? 0) / 10) * 100}%`, backgroundColor: '#ef4444' }
                        ]}
                    />
                </View>
                <Text style={styles.helperText}>Auto-updating based on analysis</Text>
            </View>

            {/* Quick Actions */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionsScroll} contentContainerStyle={{ paddingRight: 20 }}>
                {/* AR Heatmap */}
                <TouchableOpacity
                    style={[styles.actionCard, safeZones.length === 0 && styles.disabledAction]}
                    onPress={handleARAction}
                    disabled={safeZones.length === 0}
                >
                    <View style={[styles.iconCircle, { backgroundColor: '#dbeafe' }]}>
                        <Ionicons name="map-outline" size={28} color="#2563eb" />
                    </View>
                    <Text style={styles.actionText}>Activity Heatmap</Text>
                    {safeZones.length === 0 && <Text style={styles.subText}>(Scan Room First)</Text>}
                </TouchableOpacity>

                {/* Add Room */}
                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => navigation.navigate('ARSafeZones', { mode: 'scan', userId: auth.currentUser?.uid, petId })}
                >
                    <View style={[styles.iconCircle, { backgroundColor: '#f3e8ff' }]}>
                        <Ionicons name="camera-outline" size={28} color="#9333ea" />
                    </View>
                    <Text style={styles.actionText}>Add New Room</Text>
                </TouchableOpacity>

                {/* Schedule Plan */}
                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => navigation.navigate('Paywall')}
                >
                    <View style={[styles.iconCircle, { backgroundColor: '#ffedd5' }]}>
                        <Ionicons name="calendar-outline" size={28} color="#ea580c" />
                    </View>
                    <Text style={styles.actionText}>Schedule Plan</Text>
                </TouchableOpacity>

                {/* Bark Analysis */}
                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => navigation.navigate('Analysis', { petId })}
                >
                    <View style={[styles.iconCircle, { backgroundColor: '#fee2e2' }]}>
                        <Ionicons name="mic-outline" size={28} color="#ef4444" />
                    </View>
                    <Text style={styles.actionText}>Bark Analysis</Text>
                </TouchableOpacity>
            </ScrollView>

            {todaysContent && (
                <View style={[styles.card, styles.dailyCard]}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.dailyTitle}>Day {todaysContent.day}: {todaysContent.title}</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>Today</Text>
                        </View>
                    </View>
                    <Text style={styles.dailyDesc} numberOfLines={2}>{todaysContent.description}</Text>
                    <TouchableOpacity style={styles.startButton} onPress={() => Alert.alert('Coming Soon', 'Exercises coming soon')}>
                        <Ionicons name="play-circle-outline" size={20} color="#fff" />
                        <Text style={styles.startBtnText}>Start Daily Routine</Text>
                    </TouchableOpacity>
                </View>
            )}

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
    progressBarBg: {
        height: 8,
        backgroundColor: '#f3f4f6',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
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
    dailyCard: {
        borderColor: '#93c5fd',
        borderWidth: 1,
        backgroundColor: '#eff6ff',
    },
    dailyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e3a8a',
    },
    badge: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    dailyDesc: {
        color: '#1e40af',
        marginBottom: 16,
    },
    startButton: {
        backgroundColor: '#2563eb',
        padding: 12,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    startBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
});
