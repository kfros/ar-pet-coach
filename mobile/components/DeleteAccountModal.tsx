import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import { auth } from '../services/firebaseConfig';

interface DeleteAccountModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    navigation: any;
}

export default function DeleteAccountModal({ visible, onClose, onConfirm, navigation }: DeleteAccountModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setLoading(true);
        setError(null);
        try {
            await onConfirm();

            // Success Path
            Alert.alert(
                "Account Deleted",
                "Your account and all associated data have been permanently removed.",
                [{
                    text: "OK",
                    onPress: async () => {
                        await auth().signOut();
                        // AppNavigator will handle redirect to Auth stack, 
                        // but we can explicitly navigate to Onboarding (Welcome)
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Onboarding' }],
                        });
                    }
                }]
            );
        } catch (err: any) {
            console.error('[DeleteAccountModal] Deletion failed:', err);

            if (err.code === 'auth/requires-recent-login') {
                // Alert.alert(
                //     "Re-authentication Required",
                //     "For security, please log in again to delete your account.",
                //     [{ 
                //         text: "Log In", 
                //         onPress: async () => {
                //             await auth().signOut();
                //             navigation.reset({
                //                 index: 0,
                //                 routes: [{ name: 'Login' }],
                //             });
                //         } 
                //     }]
                // );
            } else {
                setError('Failed to delete account. Please try again later.');
                setLoading(false);
            }
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="warning" size={32} color={COLORS.error} />
                        </View>
                        <Text style={styles.title}>Are you absolutely sure?</Text>
                    </View>

                    <View style={styles.body}>
                        <Text style={styles.warningText}>
                            This action is permanent and cannot be undone.
                        </Text>

                        <View style={styles.bulletPoint}>
                            <Ionicons name="close-circle-outline" size={20} color={COLORS.error} />
                            <Text style={styles.bulletText}>All your data (pets, sessions, analysis) will be permanently deleted.</Text>
                        </View>

                        <View style={styles.bulletPoint}>
                            <Ionicons name="card-outline" size={20} color={COLORS.textSecondary} />
                            <Text style={styles.bulletText}>
                                Active subscriptions are managed by {Platform.OS === 'ios' ? 'Apple' : 'Google'}.
                                They will <Text style={styles.bold}>not</Text> be cancelled automatically.
                            </Text>
                        </View>

                        <Text style={styles.subInfo}>
                            To cancel, go to: {Platform.OS === 'ios'
                                ? 'Settings → Apple ID → Subscriptions'
                                : 'Google Play Store → Subscriptions'}
                        </Text>
                    </View>

                    {error && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={onClose}
                            disabled={loading}
                        >
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.deleteBtn, loading && styles.disabledBtn]}
                            onPress={handleConfirm}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.deleteBtnText}>Delete Account</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        backgroundColor: '#fff',
        borderRadius: SIZES.radius,
        width: '100%',
        maxWidth: 400,
        padding: 24,
        ...SHADOWS.medium,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        ...FONTS.h2,
        color: COLORS.text,
        textAlign: 'center',
    },
    body: {
        marginBottom: 24,
    },
    warningText: {
        ...FONTS.body,
        color: COLORS.text,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    bulletPoint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        gap: 12,
    },
    bulletText: {
        flex: 1,
        ...FONTS.small,
        color: COLORS.textSecondary,
        lineHeight: 18,
    },
    bold: {
        fontWeight: 'bold',
        color: COLORS.text,
    },
    subInfo: {
        ...FONTS.caption,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        marginTop: 8,
        textAlign: 'center',
    },
    errorBox: {
        backgroundColor: '#FEF2F2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
    errorText: {
        color: COLORS.error,
        ...FONTS.small,
        textAlign: 'center',
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: COLORS.backgroundLight,
        alignItems: 'center',
    },
    cancelBtnText: {
        ...FONTS.body,
        color: COLORS.text,
        fontWeight: '600',
    },
    deleteBtn: {
        flex: 2,
        padding: 16,
        borderRadius: 12,
        backgroundColor: COLORS.error,
        alignItems: 'center',
    },
    deleteBtnText: {
        ...FONTS.body,
        color: '#fff',
        fontWeight: 'bold',
    },
    disabledBtn: {
        opacity: 0.6,
    },
});
