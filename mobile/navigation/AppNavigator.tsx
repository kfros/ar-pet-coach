import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { auth } from '../services/firebaseConfig';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import TermsScreen from '../screens/TermsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import GuidedSessionScreen from '../screens/GuidedSessionScreen';
import PaywallScreen from '../screens/PaywallScreen';
import SplashAnimation from '../screens/SplashAnimation';
import OnboardingCarousel from '../screens/OnboardingCarousel';
import PetProfileStepper from '../screens/PetProfileStepper';
import AccountScreen from '../screens/AccountScreen';
import PremiumStatusScreen from '../screens/PremiumStatusScreen';
import SessionPreviewScreen from '../screens/SessionPreviewScreen';
import PetProfileRepository, { AuthMode } from '../services/petProfileRepository';
import MigrationService from '../services/migrationService';
import { COLORS } from '../constants/Theme';

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

// Auth Stack - shown when user is NOT logged in and NOT in guest mode
function AuthNavigator({ showOnboarding }: { showOnboarding: boolean }) {
    return (
        <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName={showOnboarding ? "Onboarding" : "Login"}>
            <AuthStack.Screen name="Onboarding" component={OnboardingCarousel} />
            <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
    );
}

// App Stack - shown when user IS logged in OR in guest mode
function AppNavigatorStack() {
    return (
        <AppStack.Navigator>
            <AppStack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
            <AppStack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
            <AppStack.Screen name="PetProfileStepper" component={PetProfileStepper} options={{ headerShown: false }} />
            <AppStack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
            <AppStack.Screen name="Account" component={AccountScreen} options={{ headerShown: false }} />
            <AppStack.Screen name="GuidedSession" component={GuidedSessionScreen} options={{ headerShown: false }} />
            <AppStack.Screen name="SessionPreview" component={SessionPreviewScreen} options={{ headerShown: false }} />
            <AppStack.Screen name="Privacy" component={PrivacyScreen} />
            <AppStack.Screen name="Terms" component={TermsScreen} />
            <AppStack.Screen name="Paywall" component={PaywallScreen} options={{ headerShown: false, presentation: 'modal' }} />
            <AppStack.Screen name="PremiumStatus" component={PremiumStatusScreen} options={{ headerShown: false, presentation: 'modal' }} />
            {/* ДОБАВЛЯЕМ ЭКРАН ЛОГИНА ДЛЯ ГОСТЕЙ */}
            <AppStack.Screen
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false, presentation: 'modal' }}
            />
        </AppStack.Navigator>
    );
}

export default function AppNavigator() {
    const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
    const [authMode, setAuthMode] = useState<AuthMode>('unauthenticated');
    const [initializing, setInitializing] = useState(true);
    const [showSplash, setShowSplash] = useState(true);
    const [splashAnimationFinished, setSplashAnimationFinished] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                // Check if onboarding was completed
                const onboardingCompleted = await PetProfileRepository.isOnboardingCompleted();
                setShowOnboarding(!onboardingCompleted);

                // Check persisted auth mode
                const persistedMode = await PetProfileRepository.getAuthMode();
                setAuthMode(persistedMode);

                // Listen for Firebase Auth changes
                const unsubscribe = auth().onAuthStateChanged(async (currentUser: FirebaseAuthTypes.User | null) => {
                    console.log('[AppNavigator] Auth state changed:', currentUser?.uid || 'null');
                    setUser(currentUser);

                    if (currentUser) {
                        await PetProfileRepository.setAuthMode('authenticated');
                        setAuthMode('authenticated');
                        // Handle user document, RC sync, and guest migration
                        MigrationService.handleAuthSuccess(currentUser);
                    } else {
                        // If no Firebase user, check if we should be in guest mode or unauthenticated
                        const currentMode = await PetProfileRepository.getAuthMode();
                        if (currentMode !== 'guest') {
                            await PetProfileRepository.setAuthMode('unauthenticated');
                            setAuthMode('unauthenticated');
                        } else {
                            setAuthMode('guest');
                        }
                    }

                    if (initializing) setInitializing(false);
                });

                return unsubscribe;
            } catch (error) {
                console.error('[AppNavigator] Initialization error:', error);
                setInitializing(false);
            }
        };

        initializeAuth();
    }, []);

    useEffect(() => {
        const unsubscribe = PetProfileRepository.addListener((mode) => {
            console.log('[AppNavigator] Manual AuthMode update:', mode);
            setAuthMode(mode);
        });
        return unsubscribe;
    }, []);

    const splashVisible = showSplash || initializing || showOnboarding === null;

    if (splashVisible) {
        return (
            <SplashAnimation
                onComplete={() => {
                    setShowSplash(false);
                    setSplashAnimationFinished(true);
                }}
            />
        );
    }

    // Determine if we should show the App Stack or Auth Stack
    const showAppStack = user !== null || authMode === 'guest';

    return (
        <NavigationContainer>
            {showAppStack ? <AppNavigatorStack /> : <AuthNavigator showOnboarding={showOnboarding} />}
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.primaryDark,
    },
});
