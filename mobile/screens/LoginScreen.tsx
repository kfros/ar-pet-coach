import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ScrollView,
    Modal,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AnimatedPawIcon from '../components/AnimatedPawIcon';
import {
    GoogleSignin,
    statusCodes,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { auth } from '../services/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import RevenueCatService from '../services/revenueCatService';
import PetProfileRepository from '../services/petProfileRepository';
import { sendPasswordResetEmail as firebaseResetPassword } from '../services/authService';

import MigrationService from '../services/migrationService';

// Configure Google Sign-In
GoogleSignin.configure({
    webClientId: '293725153990-hm4jc29v4438lqq66b59gamqu6nmi1g3.apps.googleusercontent.com',
});

export default function LoginScreen({ navigation, route }: any) {
    const initialMode = route?.params?.mode || 'login';
    const [isLogin, setIsLogin] = useState(initialMode === 'login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Forgot Password State
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetMessage, setResetMessage] = useState({ text: '', type: '' }); // type: 'success' | 'error'

    useEffect(() => {
        const checkAvailable = async () => {
            const available = await AppleAuthentication.isAvailableAsync();
            setIsAppleAuthAvailable(available);
        };
        checkAvailable();
    }, []);

    const handleGoogleSignIn = async () => {
        try {
            setLoading(true);
            setError('');

            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();

            const idToken = userInfo.data?.idToken;
            if (!idToken) throw new Error('No ID token received from Google');

            const credential = auth.GoogleAuthProvider.credential(idToken);
            const userCredential = await auth().signInWithCredential(credential);

            // Note: RevenueCat login, PetProfile authMode, and guest migration 
            // are now handled automatically in AppNavigator.tsx via MigrationService
            if (userCredential.user) {
                if (navigation.canGoBack()) {
                    navigation.goBack();
                } else {
                    navigation.replace('Dashboard');
                }
            }
        } catch (err: any) {
            console.error('Google Sign-In Error:', err);
            if (err.code === statusCodes.SIGN_IN_CANCELLED) {
                // Cancelled silently
            } else {
                setError(mapFirebaseError(err.code || err.message));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAppleSignIn = async () => {
        try {
            setLoading(true);
            setError('');

            const nonce = Math.random().toString(36).substring(2, 10);
            const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);

            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
                nonce: hashedNonce,
            });

            const { identityToken } = credential;

            if (!identityToken) {
                throw new Error('Apple Sign-In failed - no identity token returned');
            }

            const oauthCredential = auth.AppleAuthProvider.credential(identityToken, nonce);
            const userCredential = await auth().signInWithCredential(oauthCredential);

            if (userCredential.user) {
                if (navigation.canGoBack()) {
                    navigation.goBack();
                } else {
                    navigation.replace('Dashboard');
                }
            }

        } catch (e: any) {
            if (e.code === 'ERR_REQUEST_CANCELED') {
                console.log('Apple Sign-In canceled');
            } else {
                console.error('Apple Sign-In Error:', e);
                setError(mapFirebaseError(e.code || e.message));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async () => {
        setError('');
        const trimmedEmail = email.trim();

        if (!trimmedEmail || !/\S+@\S+\.\S+/.test(trimmedEmail)) {
            setError('Please enter a valid email address.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setLoading(true);
        try {
            let userCredential;
            if (isLogin) {
                userCredential = await auth().signInWithEmailAndPassword(trimmedEmail, password);
            } else {
                userCredential = await auth().createUserWithEmailAndPassword(trimmedEmail, password);
            }

            if (userCredential.user) {
                if (navigation.canGoBack()) {
                    navigation.goBack();
                } else {
                    navigation.replace('Dashboard');
                }
            }
        } catch (err: any) {
            console.error(err);
            setError(mapFirebaseError(err.code));
        } finally {
            setLoading(false);
        }
    };

    const handleGuestMode = async () => {
        try {
            setLoading(true);
            await PetProfileRepository.setAuthMode('guest');
            // Navigation will be triggered by AppNavigator if it's listening to AuthMode changes
            // or we can manually navigate if we want immediate feedback
            const hasProfile = await PetProfileRepository.hasPetProfile();
            if (hasProfile) {
                navigation.replace('Dashboard');
            } else {
                navigation.navigate('PetProfileStepper');
            }
        } catch (err) {
            console.error('Guest mode error:', err);
            setError('Could not continue as guest. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!resetEmail || !/\S+@\S+\.\S+/.test(resetEmail.trim())) {
            setResetMessage({ text: 'Please enter a valid email address.', type: 'error' });
            return;
        }

        setResetLoading(true);
        setResetMessage({ text: '', type: '' });

        try {
            await firebaseResetPassword(resetEmail);
            setResetMessage({
                text: 'If an account exists for this email, a reset link has been sent.',
                type: 'success'
            });
        } catch (err: any) {
            setResetMessage({
                text: mapFirebaseError(err.code),
                type: 'error'
            });
        } finally {
            setResetLoading(false);
        }
    };

    const mapFirebaseError = (code: string) => {
        switch (code) {
            case 'auth/invalid-email':
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Invalid email or password.';
            case 'auth/email-already-in-use':
                return 'An account with this email already exists.';
            case 'auth/weak-password':
                return 'Password should be at least 8 characters.';
            case 'auth/network-request-failed':
                return 'Network error. Please check your connection.';
            case 'auth/too-many-requests':
                return 'Too many attempts. Please wait a bit.';
            default:
                return 'Something went wrong. Please try again.';
        }
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.container}
            >
                <ScrollView contentContainerStyle={styles.scrollContainer} bounces={false}>
                    <View style={styles.formContainer}>
                        <AnimatedPawIcon size={50} />

                        <View style={styles.header}>
                            <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
                            <Text style={styles.subtitle}>
                                {isLogin
                                    ? 'Sign in to continue your pet’s progress'
                                    : 'Save your pet’s profile and track calming progress over time'}
                            </Text>
                        </View>

                        <View style={styles.socialContainer}>
                            <TouchableOpacity
                                style={[styles.socialButton, (loading || resetLoading) && styles.disabledButton]}
                                disabled={loading || resetLoading}
                                onPress={handleGoogleSignIn}
                            >
                                <Ionicons name="logo-google" size={20} color={COLORS.text} />
                                <Text style={styles.socialBtnText}>Continue with Google</Text>
                            </TouchableOpacity>

                            {Platform.OS === 'ios' && isAppleAuthAvailable && (
                                <View style={{ height: 50, width: '100%', marginTop: 12 }}>
                                    <AppleAuthentication.AppleAuthenticationButton
                                        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                                        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                                        cornerRadius={SIZES.radius}
                                        style={{ width: '100%', height: 50 }}
                                        onPress={handleAppleSignIn}
                                    />
                                </View>
                            )}
                        </View>

                        <View style={styles.dividerContainer}>
                            <View style={styles.divider} />
                            <Text style={styles.dividerText}>OR CONTINUE WITH EMAIL</Text>
                            <View style={styles.divider} />
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email address"
                                    placeholderTextColor={COLORS.textSecondary}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    placeholderTextColor={COLORS.textSecondary}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color={COLORS.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        {isLogin && (
                            <Pressable
                                style={({ pressed }) => [
                                    styles.forgotPassword,
                                    pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
                                ]}
                                onPress={() => {
                                    setResetEmail(email);
                                    setShowResetModal(true);
                                }}
                            >
                                <Text style={styles.linkText}>Forgot your password?</Text>
                            </Pressable>
                        )}

                        <Pressable
                            style={({ pressed }) => [
                                styles.mainButton,
                                pressed && { backgroundColor: COLORS.primaryDark, transform: [{ scale: 0.98 }] },
                                loading && styles.disabledButton
                            ]}
                            onPress={handleEmailAuth}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.mainButtonText}>{isLogin ? 'Log In' : 'Create Account'}</Text>
                            )}
                        </Pressable>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>
                                {isLogin ? "Don't have an account? " : "Already have an account? "}
                            </Text>
                            <Pressable
                                onPress={() => {
                                    setIsLogin(!isLogin);
                                    setError('');
                                }}
                                style={({ pressed }) => [
                                    pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
                                ]}
                            >
                                <Text style={styles.footerLinkText}>{isLogin ? 'Sign up' : 'Sign in'}</Text>
                            </Pressable>
                        </View>

                        {!loading && (
                            <View style={styles.guestContainer}>
                                <Pressable
                                    onPress={handleGuestMode}
                                    style={({ pressed }) => [
                                        styles.guestButton,
                                        pressed && { opacity: 0.7 }
                                    ]}
                                >
                                    <Text style={styles.guestButtonText}>Continue as Guest</Text>
                                </Pressable>
                                <Text style={styles.guestHelperText}>Your pet profile and progress will be saved on this device only.</Text>
                            </View>
                        )}

                        {!isLogin && (
                            <Text style={styles.legalText}>
                                By creating an account, you agree to our{' '}
                                <Text style={styles.legalLink} onPress={() => navigation.navigate('Terms')}>Terms of Use</Text> and{' '}
                                <Text style={styles.legalLink} onPress={() => navigation.navigate('Privacy')}>Privacy Policy</Text>.
                            </Text>
                        )}
                    </View>
                </ScrollView>

                {/* Reset Password Modal */}
                <Modal
                    visible={showResetModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowResetModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Reset Password</Text>
                            <Text style={styles.modalSubtitle}>
                                Enter your email address and we’ll send you a link to reset your password.
                            </Text>

                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email address"
                                    placeholderTextColor={COLORS.textSecondary}
                                    value={resetEmail}
                                    onChangeText={setResetEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>

                            {resetMessage.text ? (
                                <Text style={[
                                    styles.resetMessage,
                                    { color: resetMessage.type === 'success' ? COLORS.success : COLORS.error }
                                ]}>
                                    {resetMessage.text}
                                </Text>
                            ) : null}

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => {
                                        setShowResetModal(false);
                                        setResetMessage({ text: '', type: '' });
                                    }}
                                >
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalSubmitBtn, resetLoading && styles.disabledButton]}
                                    onPress={handleResetPassword}
                                    disabled={resetLoading}
                                >
                                    {resetLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.modalSubmitText}>Send Reset Link</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </KeyboardAvoidingView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundLight,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    formContainer: {
        backgroundColor: COLORS.background,
        margin: SIZES.padding,
        padding: SIZES.padding,
        borderRadius: SIZES.radius * 1.5,
        ...SHADOWS.medium,
        marginTop: Platform.OS === 'ios' ? 60 : 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        ...FONTS.h1,
        color: COLORS.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        ...FONTS.body,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    socialContainer: {
        marginBottom: 24,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        height: 50,
        borderRadius: SIZES.radius,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 10,
    },
    socialBtnText: {
        ...FONTS.body,
        fontWeight: '600',
        color: COLORS.text,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.border,
    },
    dividerText: {
        marginHorizontal: 12,
        fontSize: 10,
        color: COLORS.textSecondary,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    inputContainer: {
        gap: 16,
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: SIZES.radius,
        paddingHorizontal: 16,
        height: 54,
        backgroundColor: COLORS.background,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: '100%',
        ...FONTS.body,
        color: COLORS.text,
    },
    errorText: {
        color: COLORS.error,
        textAlign: 'center',
        marginTop: 12,
        ...FONTS.caption,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginVertical: 12,
        marginBottom: 24,
    },
    linkText: {
        ...FONTS.caption,
        color: COLORS.primary,
        fontWeight: '600',
    },
    mainButton: {
        backgroundColor: COLORS.primary,
        height: 54,
        borderRadius: SIZES.radius,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        ...SHADOWS.small,
    },
    disabledButton: {
        opacity: 0.7,
    },
    mainButtonText: {
        ...FONTS.h3,
        color: '#fff',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    footerText: {
        ...FONTS.body,
        color: COLORS.textSecondary,
    },
    footerLinkText: {
        ...FONTS.body,
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    guestContainer: {
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 20,
    },
    guestButton: {
        marginBottom: 8,
    },
    guestButtonText: {
        ...FONTS.body,
        color: COLORS.textSecondary,
        fontWeight: '700',
    },
    guestHelperText: {
        ...FONTS.caption,
        color: COLORS.textSecondary,
        textAlign: 'center',
        opacity: 0.8,
    },
    legalText: {
        ...FONTS.caption,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 20,
        lineHeight: 18,
    },
    legalLink: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: SIZES.radius * 1.5,
        padding: 24,
        ...SHADOWS.medium,
    },
    modalTitle: {
        ...FONTS.h2,
        color: COLORS.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    modalSubtitle: {
        ...FONTS.body,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    resetMessage: {
        marginTop: 12,
        textAlign: 'center',
        ...FONTS.caption,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    modalCancelBtn: {
        flex: 1,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: SIZES.radius,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    modalCancelText: {
        ...FONTS.body,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    modalSubmitBtn: {
        flex: 2,
        height: 50,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: SIZES.radius,
    },
    modalSubmitText: {
        ...FONTS.body,
        color: '#fff',
        fontWeight: 'bold',
    },
});
