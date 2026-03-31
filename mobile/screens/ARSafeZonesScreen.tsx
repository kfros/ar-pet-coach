import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSubscription } from '../components/SubscriptionManager';
import PaywallModal from '../components/PaywallModal';
import { auth, db } from '../services/firebaseConfig';
import SmartARContainer from '../components/AR/SmartARContainer';

/**
 * Main entry point for AR Safe Zones.
 * Uses SmartARContainer to dynamically select the best engine.
 */
const ARSafeZonesScreen = ({ route, navigation }: any) => {
    const { trackARSession, checkPaywallTrigger } = useSubscription();
    const [paywallVisible, setPaywallVisible] = useState(false);
    const [petId, setPetId] = useState<string | null>(route?.params?.petId || null);
    const [loading, setLoading] = useState(true);

    const mode = route?.params?.mode || 'view';
    const zoneId = route?.params?.zoneId || null;

    useEffect(() => {
        const fetchPet = async () => {
            if (petId) {
                setLoading(false);
                return;
            }

            const user = auth().currentUser;
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const snapshot = await db.collection('users').doc(user.uid).collection('pets').limit(1).get();

                if (!snapshot.empty) {
                    setPetId(snapshot.docs[0].id);
                }
            } catch (error) {
                console.error('Error fetching pets:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPet();
    }, [petId]);

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.message}>Loading pet data...</Text>
            </View>
        );
    }

    if (!petId) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>No pets found. Please complete onboarding first.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SmartARContainer
                userId={auth().currentUser?.uid || ''}
                petId={petId}
                mode={mode}
                zoneId={zoneId}
                nativeMsg="Calibrating Interactive Space"
                liteMsg="Starting a simplified calming session"
                onExit={async () => {
                    await trackARSession();
                    const shouldPaywall = await checkPaywallTrigger();
                    if (shouldPaywall) {
                        setPaywallVisible(true);
                    } else {
                        navigation.goBack();
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
        paddingBottom: 10,
        color: 'white',
    }
});

export default ARSafeZonesScreen;
