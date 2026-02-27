import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import TermsScreen from '../screens/TermsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ARSafeZonesScreen from '../screens/ARSafeZonesScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import PaywallScreen from '../screens/PaywallScreen';
import SplashAnimation from '../screens/SplashAnimation';
import OnboardingCarousel from '../screens/OnboardingCarousel';
import PetProfileStepper from '../screens/PetProfileStepper';

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

// Auth Stack - shown when user is NOT logged in
function AuthNavigator() {
    return (
        <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Onboarding">
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
            <AppStack.Screen name="Analysis" component={AnalysisScreen} options={{ headerShown: false }} />
            <AppStack.Screen name="Privacy" component={PrivacyScreen} />
            <AppStack.Screen name="Terms" component={TermsScreen} />
            <AppStack.Screen name="ARSafeZones" component={ARSafeZonesScreen} options={{ title: 'Scan Room' }} />
            <AppStack.Screen name="Paywall" component={PaywallScreen} options={{ headerShown: false, presentation: 'modal' }} />
        </AppStack.Navigator>
    );
}

export default function AppNavigator() {
    const [user, setUser] = useState<User | null>(null);
    const [initializing, setInitializing] = useState(true);
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            console.log('Auth state changed:', currentUser?.uid || 'null');
            setUser(currentUser);
            if (initializing) setInitializing(false);
        });

        return unsubscribe;
    }, []);

    if (showSplash) {
        return <SplashAnimation onComplete={() => setShowSplash(false)} />;
    }

    if (initializing) {
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
            {user ? <AppNavigatorStack /> : <AuthNavigator />}
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
