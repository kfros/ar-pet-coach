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
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AnimatedPawIcon from '../components/AnimatedPawIcon';
import {
    GoogleSignin,
    statusCodes,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { auth, db } from '../services/firebaseConfig';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import Purchases from 'react-native-purchases';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';

// Configure Google Sign-In
GoogleSignin.configure({
    webClientId: '293725153990-hm4jc29v4438lqq66b59gamqu6nmi1g3.apps.googleusercontent.com',
});



export default function LoginScreen({ navigation }: any) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);

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
            console.log('Google User Info:', userInfo);

            const idToken = userInfo.data?.idToken;
            if (!idToken) throw new Error('No ID token received from Google');

            const credential = auth.GoogleAuthProvider.credential(idToken);
            const userCredential = await auth().signInWithCredential(credential);

            if (userCredential.user) {
                console.log('RevenueCat: Logging in with Firebase UID:', userCredential.user.uid);
                try {
                    const loginResult = await Purchases.logIn(userCredential.user.uid);
                    console.log('RevenueCat: Login result - new user created?', loginResult.created, 'originalAppUserId:', loginResult.customerInfo.originalAppUserId);
                } catch (purchaseErr: any) {
                    console.error('RevenueCat Login Error:', purchaseErr);
                    // Don't block sign-in, but inform user if needed or just log
                    // Alert.alert('Subscription Sync', 'We couldn\'t sync your subscription status, but you are signed in.');
                }
            }
        } catch (err: any) {
            console.error('Google Sign-In Error:', err);
            console.log('Error code for GOOGLE: ', err.code);
            if (err.code === statusCodes.SIGN_IN_CANCELLED) {
                // Cancelled silently
            } else if (err.code === statusCodes.IN_PROGRESS) {
                Alert.alert('In Progress', 'Sign in is already in progress');
            } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert('Error', 'Play services not available');
            } else {
                Alert.alert('Error', err.message || 'Unknown error');
                setError(err.message || 'Google Sign-In failed');
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
                console.log('RevenueCat: Logging in with Firebase UID:', userCredential.user.uid);
                try {
                    const loginResult = await Purchases.logIn(userCredential.user.uid);
                    console.log('RevenueCat: Login result - new user created?', loginResult.created, 'originalAppUserId:', loginResult.customerInfo.originalAppUserId);
                } catch (purchaseErr: any) {
                    console.error('RevenueCat Login Error:', purchaseErr);
                }
            }

        } catch (e: any) {
            if (e.code === 'ERR_REQUEST_CANCELED') {
                console.log('Apple Sign-In canceled');
            } else {
                console.error('Apple Sign-In Error:', e);
                setError(e.message || 'Apple Sign-In failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async () => {
        setError('');

        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            setError('Please enter a valid email address.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        try {
            let userCredential;
            if (isLogin) {
                userCredential = await auth().signInWithEmailAndPassword(email, password);
            } else {
                userCredential = await auth().createUserWithEmailAndPassword(email, password);
            }

            if (userCredential.user) {
                console.log('RevenueCat: Logging in with Firebase UID:', userCredential.user.uid);
                try {
                    const loginResult = await Purchases.logIn(userCredential.user.uid);
                    console.log('RevenueCat: Login result - new user created?', loginResult.created, 'originalAppUserId:', loginResult.customerInfo.originalAppUserId);
                } catch (purchaseErr: any) {
                    console.error('RevenueCat Login Error:', purchaseErr);
                }
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential') {
                setError('Invalid email or password.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('Email is already in use.');
            } else {
                setError('Authentication failed. Please try again.');
            }
        } finally {
            setLoading(false);
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
                        <AnimatedPawIcon />

                        <View style={styles.header}>
                            <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
                            <Text style={styles.subtitle}>
                                {isLogin ? 'Sign in to continue your progress' : 'Start your journey to a calmer pet'}
                            </Text>
                        </View>

                        <View style={styles.socialContainer}>
                            <TouchableOpacity
                                style={[styles.socialButton, loading && styles.disabledButton]}
                                disabled={loading}
                                onPress={handleGoogleSignIn}
                            >
                                <Ionicons name="logo-google" size={20} color={COLORS.text} />
                                <Text style={styles.socialBtnText}>Continue with Google</Text>
                            </TouchableOpacity>

                            {Platform.OS === 'ios' && isAppleAuthAvailable && (
                                <View style={{ height: 50, width: '100%', marginTop: 8 }}>
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
                                    secureTextEntry
                                />
                            </View>
                        </View>

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        {isLogin && (
                            <Pressable
                                style={({ pressed }) => [
                                    styles.forgotPassword,
                                    pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
                                ]}
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
                                <Text style={styles.mainButtonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
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
                    </View>
                </ScrollView>
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
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    formContainer: {
        backgroundColor: COLORS.background,
        margin: SIZES.padding,
        padding: SIZES.padding,
        borderRadius: SIZES.radius * 1.5,
        ...SHADOWS.medium,
        marginTop: 60,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        ...FONTS.h1,
        color: COLORS.text,
        marginBottom: 8,
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
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: 'bold',
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
        marginTop: 8,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginVertical: 12,
        marginBottom: 24,
    },
    linkText: {
        ...FONTS.caption,
        color: 'rgba(15, 118, 110, 0.85)',
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
    },
    footerText: {
        ...FONTS.body,
        color: COLORS.textSecondary,
    },
    footerLinkText: {
        ...FONTS.body,
        color: 'rgba(15, 118, 110, 0.85)',
        fontWeight: 'bold',
    },
});
