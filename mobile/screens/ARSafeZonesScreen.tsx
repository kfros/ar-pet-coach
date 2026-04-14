import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSubscription } from '../components/SubscriptionManager';
import PaywallModal from '../components/PaywallModal';
import {
    auth,
    db,
    collection,
    getDocs,
    query,
    limit,
} from '../services/firebaseConfig';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import SmartARContainer from '../components/AR/SmartARContainer';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';


/**
 * Main entry point for AR Safe Zones.
 * Uses SmartARContainer to dynamically select the best engine.
 */
const ARSafeZonesScreen = ({ route, navigation }: any) => {
    const { trackARSession, checkPaywallTrigger } = useSubscription();
    const [paywallVisible, setPaywallVisible] = useState(false);
    const [petId, setPetId] = useState<string | null>(route?.params?.petId || null);
    const [loading, setLoading] = useState(true);

    // State Machine (feedback/micro phases now live in ARFeedbackScreen)
    const [phase, setPhase] = useState<'selection' | 'session'>('selection');
    const [safeSpots, setSafeSpots] = useState<any[]>([]);
    const [selectedSpot, setSelectedSpot] = useState<any>(null);
    const [anxietyBefore] = useState(route?.params?.anxietyBefore || 5);

    const mode = route?.params?.mode || 'view';
    const zoneId = route?.params?.zoneId || null;

    useEffect(() => {
        console.log('[ARSafeZonesScreen] useEffect init MOUNT/UPDATE petId:', petId);
        const init = async () => {
            const user = auth().currentUser;
            if (!user) { setLoading(false); return; }

            try {
                // Fetch Pet if missing
                let currentPetId = petId;
                if (!currentPetId) {
                    const petsCol = collection(db, 'users', user.uid, 'pets');
                    const snapshot = await getDocs(query(petsCol, limit(1)));
                    if (!snapshot.empty) {
                        currentPetId = snapshot.docs[0].id;
                        setPetId(currentPetId);
                    }
                }

                if (currentPetId) {
                    // Fetch existing Safe Spots
                    const spotsCol = collection(db, 'users', user.uid, 'pets', currentPetId, 'safeZones');
                    const spotSnap = await getDocs(spotsCol);
                    const spots = spotSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
                    setSafeSpots(spots);


                    // If only one spot exists and we are in 'view' mode, auto-select it
                    if (spots.length === 1 && mode === 'view') {
                        setSelectedSpot(spots[0]);
                        setPhase('session');
                    } else if (spots.length === 0) {
                        // If no spots, we'll force 'Add New' 
                        setPhase('session');
                    }
                }
            } catch (error) {
                console.error('Error initializing AR Screen:', error);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [petId]);

    const handleSpotSelection = (spot: any) => {
        setSelectedSpot(spot);
        setPhase('session');
    };

    const handleSkip = () => {
        navigation.goBack();
    };




    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.message}>Preparing Session...</Text>
            </View>
        );
    }

    if (!petId) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>No pet profile found.</Text>
            </View>
        );
    }

    // Spot Selection View
    if (phase === 'selection') {
        return (
            <View style={[styles.container, { backgroundColor: COLORS.backgroundLight }]}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Where are you now?</Text>
                </View>
                <View style={styles.spotGrid}>
                    {safeSpots.map((spot) => (
                        <TouchableOpacity
                            key={spot.id}
                            style={styles.spotItem}
                            onPress={() => handleSpotSelection(spot)}
                        >
                            <View style={styles.spotIconCircle}>
                                <Ionicons name="location" size={24} color={COLORS.primary} />
                            </View>
                            <Text style={styles.spotName}>{spot.name}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={styles.spotItem}
                        onPress={() => setPhase('session')}
                    >
                        <View style={[styles.spotIconCircle, { backgroundColor: '#E0F2FE' }]}>
                            <Ionicons name="add" size={24} color={COLORS.primary} />
                        </View>
                        <Text style={styles.spotName}>Add new spot</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SmartARContainer
                userId={auth().currentUser?.uid || ''}
                petId={petId}
                mode={mode}
                zoneId={selectedSpot?.id || zoneId}
                nativeMsg="Point camera at floor"
                liteMsg="Point camera at floor"
                onExit={() => {
                    try {
                        trackARSession();
                        // CRITICAL: Use push() not replace().
                        // push() keeps this screen MOUNTED in the background stack,
                        // so ViroARSceneNavigator is never deallocated during transition.
                        // replace() destroys the current screen during transition → EXC_BAD_ACCESS.
                        // The AR screen is cleaned up later via navigation.reset() from
                        // ARFeedbackScreen, which is a non-animated stack wipe.
                        console.log('[ARSafeZonesScreen] Navigating to ARFeedback');
                        navigation.push('ARFeedback', {
                            petId,
                            selectedSpotId: selectedSpot?.id,
                            selectedSpotName: selectedSpot?.name,
                            anxietyBefore,
                        });
                    }
                    catch (error) {
                        console.error('Error navigating to ARFeedback:', error);
                        // Fallback: navigate to home or previous screen
                        // navigation.goBack();
                    }
                }}
            />

            <PaywallModal
                visible={paywallVisible}
                onClose={() => {
                    setPaywallVisible(false);
                    navigation.goBack();
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    message: {
        textAlign: 'center',
        paddingTop: 20,
        color: '#94A3B8',
        ...FONTS.body
    },
    modalHeader: {
        padding: 40,
        alignItems: 'center'
    },
    modalTitle: {
        ...FONTS.h2,
        color: COLORS.text,
        textAlign: 'center'
    },
    spotGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 20,
        justifyContent: 'space-between'
    },
    spotItem: {
        width: '45%',
        backgroundColor: '#fff',
        borderRadius: SIZES.radius,
        padding: 20,
        marginBottom: 20,
        alignItems: 'center',
        ...SHADOWS.small
    },
    spotIconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10
    },
    spotName: {
        ...FONTS.body,
        fontWeight: '600',
        color: COLORS.text
    },
});


export default ARSafeZonesScreen;
