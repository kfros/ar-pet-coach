import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { auth } from '../services/firebaseConfig';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import TermsScreen from '../screens/TermsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ARSafeZonesScreen from '../screens/ARSafeZonesScreen';
import ARFeedbackScreen from '../screens/ARFeedbackScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import PaywallScreen from '../screens/PaywallScreen';
import SplashAnimation from '../screens/SplashAnimation';
import OnboardingCarousel from '../screens/OnboardingCarousel';
import PetProfileStepper from '../screens/PetProfileStepper';
import AccountScreen from '../screens/AccountScreen';

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

// Auth Stack - shown when user is NOT logged in
function AuthNavigator({ isFirstLaunch }: { isFirstLaunch: boolean }) {
    return (
        <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName={isFirstLaunch ? "Onboarding" : "Login"}>
            <AuthStack.Screen name="Onboarding" component={OnboardingCarousel} />
            <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
    );
}

// App Stack - shown when user IS logged in
function AppNavigatorStack() {
    return (
        <AppStack.Navigator>
            <AppStack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
            <AppStack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
            <AppStack.Screen name="PetProfileStepper" component={PetProfileStepper} options={{ headerShown: false }} />
            <AppStack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
            <AppStack.Screen name="Account" component={AccountScreen} options={{ headerShown: false }} />
            <AppStack.Screen name="Analysis" component={AnalysisScreen} options={{ headerShown: false }} />
            <AppStack.Screen name="Privacy" component={PrivacyScreen} />
            <AppStack.Screen name="Terms" component={TermsScreen} />
            <AppStack.Screen name="ARSafeZones" component={ARSafeZonesScreen} options={{ title: 'Set calm spot' }} />
            <AppStack.Screen name="ARFeedback" component={ARFeedbackScreen} options={{ headerShown: false, animation: 'fade' }} />
            <AppStack.Screen name="Paywall" component={PaywallScreen} options={{ headerShown: false, presentation: 'modal' }} />
        </AppStack.Navigator>
    );
}

export default function AppNavigator() {
    const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
    const [initializing, setInitializing] = useState(true);
    const [showSplash, setShowSplash] = useState(true);
    const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

    useEffect(() => {
        const checkFirstLaunch = async () => {
            try {
                const hasLaunched = await AsyncStorage.getItem('hasLaunched');
                if (hasLaunched === null) {
                    await AsyncStorage.setItem('hasLaunched', 'true');
                    setIsFirstLaunch(true);
                } else {
                    setIsFirstLaunch(false);
                }
            } catch (error) {
                console.error('Error checking first launch:', error);
                setIsFirstLaunch(false);
            }
        };
        checkFirstLaunch();

        const unsubscribe = auth().onAuthStateChanged((currentUser: FirebaseAuthTypes.User | null) => {
            console.log('Auth state changed:', currentUser?.uid || 'null');
            setUser(currentUser as any);
            if (initializing) setInitializing(false);
        });

        return unsubscribe;
    }, []);

    if (showSplash) {
        return <SplashAnimation onComplete={() => setShowSplash(false)} />;
    }

    if (initializing || isFirstLaunch === null) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    // Conditionally render different navigators based on auth state
    // This forces a complete remount when auth state changes, ensuring proper navigation
    return (
        <NavigationContainer>
            {user ? <AppNavigatorStack /> : <AuthNavigator isFirstLaunch={isFirstLaunch} />}
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
});
