import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import { auth } from '../services/firebaseConfig';
import { 
    GoogleSignin, 
    statusCodes 
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { performFullAccountDeletion } from '../services/authService';

interface DeleteAccountModalProps {
    visible: boolean;
    onClose: () => void;
    navigation: any;
}

export default function DeleteAccountModal({ visible, onClose, navigation }: DeleteAccountModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [requiresReauth, setRequiresReauth] = useState(false);
    const [password, setPassword] = useState('');

    const providerId = auth().currentUser?.providerData[0]?.providerId || 'password';

    const handleConfirm = async () => {
        setLoading(true);
        setError(null);
        try {
            // First attempt at deletion
            await performFullAccountDeletion();

            // Success Path
            Alert.alert(
                "Account Deleted",
                "Your account and all associated data have been permanently removed.",
                [{
                    text: "OK",
                    onPress: async () => {
                        // Success handling - redirect is automatic via onAuthStateChanged
                    }
                }]
            );
        } catch (err: any) {
            console.error('[DeleteAccountModal] Deletion failed:', err);

            if (err.code === 'auth/requires-recent-login') {
                setRequiresReauth(true);
                setLoading(false);
            } else {
                setError(err.message || 'Failed to delete account. Please try again later.');
                setLoading(false);
            }
        }
    };

    const handleReauthAndRetry = async () => {
        setLoading(true);
        setError(null);
        try {
            const user = auth().currentUser;
            if (!user) throw new Error('No user found');

            if (providerId === 'password') {
                if (!password) {
                    setError('Please enter your password.');
                    setLoading(false);
                    return;
                }
                const credential = auth.EmailAuthProvider.credential(user.email!, password);
                await user.reauthenticateWithCredential(credential);
            } else if (providerId === 'google.com') {
                await GoogleSignin.hasPlayServices();
                const userInfo = await GoogleSignin.signIn();
                const idToken = userInfo.data?.idToken;
                if (!idToken) throw new Error('No ID token');
                const credential = auth.GoogleAuthProvider.credential(idToken);
                await user.reauthenticateWithCredential(credential);
            } else if (providerId === 'apple.com') {
                const nonce = Math.random().toString(36).substring(2, 10);
                const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
                const appleCredential = await AppleAuthentication.signInAsync({
                    requestedScopes: [
                        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                        AppleAuthentication.AppleAuthenticationScope.EMAIL,
                    ],
                    nonce: hashedNonce,
                });
                const { identityToken } = appleCredential;
                if (!identityToken) throw new Error('No identity token');
                const credential = auth.AppleAuthProvider.credential(identityToken, nonce);
                await user.reauthenticateWithCredential(credential);
            }

            // Retry deletion after successful re-auth
            await performFullAccountDeletion();
            
            Alert.alert("Account Deleted", "Your account has been permanently removed.");
        } catch (err: any) {
            console.error('[DeleteAccountModal] Re-auth failed:', err);
            setError(err.message || 'Authentication failed. Please try again.');
        } finally {
            setLoading(false);
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
                        {!requiresReauth ? (
                            <>
                                <Text style={styles.warningText}>
                                    This action is permanent and cannot be undone.
                                </Text>

                                <View style={styles.bulletPoint}>
                                    <Ionicons name="close-circle-outline" size={20} color={COLORS.error} />
                                    <Text style={styles.bulletText}>All your data (pets, sessions, check-ins) will be permanently deleted.</Text>
                                </View>

                                <View style={styles.bulletPoint}>
                                    <Ionicons name="card-outline" size={20} color={COLORS.textSecondary} />
                                    <Text style={styles.bulletText}>
                                        Active subscriptions are managed by {Platform.OS === 'ios' ? 'Apple' : 'Google'}.
                                        They will <Text style={styles.bold}>not</Text> be cancelled automatically.
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <View style={styles.reauthContainer}>
                                <Text style={styles.reauthTitle}>Security Check</Text>
                                <Text style={styles.reauthSubtitle}>
                                    Please confirm your identity to delete your account.
                                </Text>

                                {providerId === 'password' && (
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter your password"
                                            secureTextEntry
                                            value={password}
                                            onChangeText={setPassword}
                                            placeholderTextColor={COLORS.textSecondary}
                                        />
                                    </View>
                                )}

                                {providerId === 'google.com' && (
                                    <Text style={styles.providerInfo}>
                                        You are signed in with Google. Please click below to verify.
                                    </Text>
                                )}

                                {providerId === 'apple.com' && (
                                    <Text style={styles.providerInfo}>
                                        You are signed in with Apple. Please click below to verify.
                                    </Text>
                                )}
                            </View>
                        )}

                        {!requiresReauth && (
                            <Text style={styles.subInfo}>
                                To cancel, go to: {Platform.OS === 'ios'
                                    ? 'Settings → Apple ID → Subscriptions'
                                    : 'Google Play Store → Subscriptions'}
                            </Text>
                        )}
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
                            onPress={requiresReauth ? handleReauthAndRetry : handleConfirm}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.deleteBtnText}>
                                    {requiresReauth ? 'Confirm Deletion' : 'Delete Account'}
                                </Text>
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
    reauthContainer: {
        alignItems: 'center',
    },
    reauthTitle: {
        ...FONTS.h3,
        color: COLORS.text,
        marginBottom: 8,
    },
    reauthSubtitle: {
        ...FONTS.small,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundLight,
        borderRadius: 8,
        paddingHorizontal: 12,
        width: '100%',
        height: 50,
        gap: 10,
    },
    input: {
        flex: 1,
        ...FONTS.body,
        color: COLORS.text,
    },
    providerInfo: {
        ...FONTS.small,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
    },
});
