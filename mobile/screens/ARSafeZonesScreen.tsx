import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSubscription } from '../components/SubscriptionManager';
import PaywallModal from '../components/PaywallModal';
import { 
    auth, 
    db, 
    collection, 
    doc, 
    getDocs, 
    getDoc,
    updateDoc,
    query, 
    limit,
    serverTimestamp,
    addDoc 
} from '../services/firebaseConfig';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import SmartARContainer from '../components/AR/SmartARContainer';
import { Pressable, TouchableOpacity, Modal } from 'react-native';
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
    
    // State Machine
    const [phase, setPhase] = useState<'selection' | 'session' | 'feedback' | 'micro'>('selection');
    const [safeSpots, setSafeSpots] = useState<any[]>([]);
    const [selectedSpot, setSelectedSpot] = useState<any>(null);
    const [anxietyBefore] = useState(route?.params?.anxietyBefore || 5);
    const [feedbackMsg, setFeedbackMsg] = useState('');

    const mode = route?.params?.mode || 'view';
    const zoneId = route?.params?.zoneId || null;

    useEffect(() => {
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

    const SCORING_WEIGHTS = {
        calm: -1.8,
        better: -0.7,
        worse: 1.0,
        same: 0,
        skip: 0
    };

    const handleFeedback = async (choice: keyof typeof SCORING_WEIGHTS) => {
        const user = auth().currentUser;
        if (!user || !petId) return;

        // Internal weighted adjustment
        const weight = SCORING_WEIGHTS[choice] || 0;

        // Calculate and round for display consistency on dashboard
        const anxietyAfter = Math.max(1, Math.min(10, Math.round(anxietyBefore + weight)));
        const delta = anxietyAfter - anxietyBefore;

        setFeedbackMsg("Got it. We'll adjust your plan.");
        setPhase('micro');

        try {
            // 1. Save Session Summary (includes silent delta for future analysis)
            await addDoc(collection(db, 'users', user.uid, 'pets', petId, 'calm_sessions'), {
                spot_id: selectedSpot?.id || 'new_spot',
                spot_name: selectedSpot?.name || 'Interactive Space',
                timestamp: serverTimestamp(),
                anxiety_before: anxietyBefore,
                anxiety_after: anxietyAfter,
                delta,
                choice
            });

            // 2. Update Pet Anxiety Score (silently reflected on Dashboard)
            await updateDoc(doc(db, 'users', user.uid, 'pets', petId), {
                anxietyScore: anxietyAfter,
                lastSessionAt: serverTimestamp()
            });

        } catch (e) {
            console.error('Error saving session feedback:', e);
        }

        // Wait 1.2s and return
        setTimeout(() => {
            navigation.goBack();
        }, 1200);
    };

    const handleSkip = () => {
        // Skip goes back immediately — no confirmation screen
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

    // Post-Session Feedback View
    if (phase === 'feedback') {
        return (
            <View style={[styles.container, { backgroundColor: COLORS.backgroundLight, justifyContent: 'center', padding: 30 }]}>
                <Text style={styles.feedbackTitle}>How is your pet now?</Text>
                
                <View style={styles.feedbackGrid}>
                    {[
                        { id: 'calm', label: 'Calm', icon: 'leaf' },
                        { id: 'better', label: 'Better', icon: 'sunny' },
                        { id: 'same', label: 'Same', icon: 'remove' },
                        { id: 'worse', label: 'Worse', icon: 'cloud' }
                    ].map((f) => (
                        <TouchableOpacity 
                            key={f.id} 
                            style={styles.feedbackBtn}
                            onPress={() => handleFeedback(f.id as any)}
                        >
                            <Text style={styles.feedbackBtnText}>{f.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                
                <TouchableOpacity onPress={handleSkip} style={{ marginTop: 30 }}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Micro-Feedback Message
    if (phase === 'micro') {
        return (
            <View style={[styles.container, { backgroundColor: COLORS.backgroundLight, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="checkmark-circle" size={80} color={COLORS.primary} />
                <Text style={styles.feedbackTitle}>{feedbackMsg}</Text>
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
                onExit={async () => {
                    await trackARSession();
                    setPhase('feedback');
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
    feedbackTitle: {
        ...FONTS.h2,
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 40
    },
    feedbackGrid: {
        gap: 15
    },
    feedbackBtn: {
        backgroundColor: '#fff',
        borderRadius: SIZES.radius,
        padding: 24,
        alignItems: 'center',
        ...SHADOWS.small
    },
    feedbackBtnText: {
        ...FONTS.h3,
        color: COLORS.text,
        fontWeight: 'bold'
    },
    skipText: {
        ...FONTS.body,
        color: COLORS.textSecondary,
        textAlign: 'center',
        textDecorationLine: 'underline'
    }
});


export default ARSafeZonesScreen;
