import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useCameraPermissions } from 'expo-camera';
import { useSubscription } from '../components/SubscriptionManager';
import PaywallModal from '../components/PaywallModal';
import { auth, db } from '../services/firebaseConfig';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const AR_HTML = require('../assets/mindar-safe-zone.html');

const ARSafeZonesScreen = ({ route, navigation }: any) => {
    const { isPremium, trackARSession, checkPaywallTrigger } = useSubscription();
    const [paywallVisible, setPaywallVisible] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [petId, setPetId] = useState<string | null>(route?.params?.petId || null);
    const [loading, setLoading] = useState(true);
    const mode = route?.params?.mode || 'view'; // 'scan' or 'view'
    const zoneId = route?.params?.zoneId || null;

    // Fetch user's first pet on mount if not passed via route
    useEffect(() => {
        const fetchPet = async () => {
            // Skip if we already have petId from route
            if (petId) {
                console.log('Using petId from route:', petId);
                setLoading(false);
                return;
            }

            const user = auth.currentUser;
            if (!user) {
                console.log('No user logged in');
                setLoading(false);
                return;
            }

            try {
                const petsRef = collection(db, 'users', user.uid, 'pets');
                // Remove orderBy to prevent errors when createdAt is missing
                const q = query(petsRef, limit(1));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    setPetId(snapshot.docs[0].id);
                    console.log('Found pet:', snapshot.docs[0].id);
                } else {
                    console.log('No pets found for user');
                }
            } catch (error) {
                console.error('Error fetching pets:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPet();
    }, []);

    // Store ID token for WebView injection
    const [idToken, setIdToken] = useState<string | null>(null);

    // Fetch ID token when user is available
    useEffect(() => {
        const fetchIdToken = async () => {
            const user = auth.currentUser;
            if (user) {
                try {
                    const token = await user.getIdToken();
                    setIdToken(token);
                    console.log('ID Token fetched for WebView');
                } catch (e) {
                    console.error('Error fetching ID token:', e);
                }
            }
        };
        fetchIdToken();
    }, []);

    // Generate JavaScript to inject auth data into WebView
    const getInjectedJavaScript = () => {
        const user = auth.currentUser;
        if (!user || !petId) return '';

        // Pass the actual ID token for WebView to authenticate
        const tokenToPass = idToken || '';

        return `
            (function() {
                console.log('Injecting native auth...');
                // Set mode and zoneId globals
                window.AR_MODE = '${mode}';
                window.AR_ZONE_ID = '${zoneId || ''}';
                
                if (window.receiveNativeAuth) {
                    window.receiveNativeAuth('${user.uid}', '${petId}', '${tokenToPass}');
                } else {
                    // Wait for script to load
                    setTimeout(function() {
                        if (window.receiveNativeAuth) {
                            window.receiveNativeAuth('${user.uid}', '${petId}', '${tokenToPass}');
                        }
                    }, 1000);
                }
            })();
            true;
        `;
    };

    // Request permission only once on mount if not granted
    // Use a ref to track if we've already requested
    const hasRequestedPermission = React.useRef(false);

    useEffect(() => {
        // Only request if:
        // 1. Permission object is loaded
        // 2. Not already granted
        // 3. We haven't already requested in this session
        // 4. System allows asking again
        if (permission && !permission.granted && !hasRequestedPermission.current && permission.canAskAgain) {
            hasRequestedPermission.current = true;
            requestPermission();
        }
    }, [permission]);

    if (!permission) {
        return <View style={styles.container}><ActivityIndicator size="large" color="#fff" /></View>;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>Camera permission is required for AR features.</Text>
                <Button onPress={requestPermission} title="Grant Permission" />
            </View>
        );
    }

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
            <WebView
                style={styles.webview}
                source={AR_HTML}
                originWhitelist={['*']}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                // iOS 14.5+: Auto-grant camera/microphone access within WebView
                mediaCapturePermissionGrantType="grant"
                allowsProtectedMedia={true}
                injectedJavaScript={getInjectedJavaScript()}
                onMessage={async (event) => {
                    console.log('WebView Message:', event.nativeEvent.data);
                    try {
                        const message = JSON.parse(event.nativeEvent.data);
                        if (message.action === 'exit') {
                            // Track that they completed an AR session
                            await trackARSession();

                            // Let's check if they've hit the limit
                            const shouldPaywall = await checkPaywallTrigger();
                            if (shouldPaywall) {
                                setPaywallVisible(true);
                            } else {
                                navigation.goBack();
                            }
                        }
                    } catch (e) {
                        // Non-JSON message, ignore
                    }
                }}
            />

            {/* {!isPremium && (
                <View style={styles.overlay}>
                    <TouchableOpacity style={styles.premiumButton} onPress={() => setPaywallVisible(true)}>
                        <Text style={styles.premiumText}>Upgrade to Premium</Text>
                    </TouchableOpacity>
                </View>
            )} */}

            <PaywallModal
                visible={paywallVisible}
                onClose={() => {
                    setPaywallVisible(false);
                    navigation.goBack(); // Go back to dashboard after closing paywall
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
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
        color: 'white',
    },
    overlay: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
    },
    premiumButton: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FFD700',
    },
    premiumText: {
        color: '#FFD700',
        fontWeight: 'bold',
    },
});

export default ARSafeZonesScreen;
