import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    auth,
    db,
    collection,
    doc,
    updateDoc,
    serverTimestamp,
    addDoc
} from '../services/firebaseConfig';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';

/**
 * Post-AR-session feedback screen.
 * Extracted from ARSafeZonesScreen to avoid unmounting ViroARSceneNavigator
 * via React state changes, which causes EXC_BAD_ACCESS on iOS.
 * 
 * This screen is PUSHED onto the stack (AR screen stays mounted behind it).
 * On exit, we use navigation.reset() to atomically wipe the entire stack
 * back to Dashboard — this avoids any animated transition that would trigger
 * the native AR view deallocation crash.
 */
const ARFeedbackScreen = ({ route, navigation }: any) => {
    const {
        petId,
        selectedSpotId,
        selectedSpotName,
        anxietyBefore = 5,
    } = route?.params || {};

    const [phase, setPhase] = useState<'feedback' | 'micro'>('feedback');
    const [feedbackMsg, setFeedbackMsg] = useState('');

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

        const weight = SCORING_WEIGHTS[choice] || 0;
        const anxietyAfter = Math.max(1, Math.min(10, Math.round(anxietyBefore + weight)));
        const delta = anxietyAfter - anxietyBefore;

        setFeedbackMsg("Got it. We'll adjust your plan.");
        setPhase('micro');

        try {
            await addDoc(collection(db, 'users', user.uid, 'pets', petId, 'calm_sessions'), {
                spot_id: selectedSpotId || 'new_spot',
                spot_name: selectedSpotName || 'Interactive Space',
                timestamp: serverTimestamp(),
                anxiety_before: anxietyBefore,
                anxiety_after: anxietyAfter,
                delta,
                choice
            });

            await updateDoc(doc(db, 'users', user.uid, 'pets', petId), {
                anxietyScore: anxietyAfter,
                lastSessionAt: serverTimestamp()
            });
        } catch (e) {
            console.error('Error saving session feedback:', e);
        }

        setTimeout(() => {
            // Reset entire stack to Dashboard.
            // This atomically wipes all screens (including the AR screen
            // that's still mounted behind us) without any transition animation,
            // avoiding the ViroARSceneNavigator native dealloc crash.
            console.log('Resetting navigation stack to Dashboard');
            navigation.reset({
                index: 0,
                routes: [{ name: 'Dashboard' }],
            });
        }, 1200);
    };

    const handleSkip = () => {
        console.log('Skipping feedback, resetting navigation stack to Dashboard');
        navigation.reset({
            index: 0,
            routes: [{ name: 'Dashboard' }],
        });
    };

    if (phase === 'micro') {
        console.log('Micro feedback phase');
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="checkmark-circle" size={80} color={COLORS.primary} />
                <Text style={styles.feedbackTitle}>{feedbackMsg}</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { justifyContent: 'center', padding: 30 }]}>
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
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundLight,
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

export default ARFeedbackScreen;
