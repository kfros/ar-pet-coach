import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Linking, Platform, ScrollView } from 'react-native';
import { auth, db } from '../services/firebaseConfig';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Purchases from 'react-native-purchases';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../components/SubscriptionManager';
import { signOut } from '../services/authService';
import PetProfileRepository from '../services/petProfileRepository';

export default function SettingsScreen({ navigation }: any) {
    const user = auth().currentUser;
    const { isPremium, customerInfo } = useSubscription();
    const [pets, setPets] = useState<any[]>([]);
    const [authMode, setAuthMode] = useState<string>('unauthenticated');

    useEffect(() => {
        const fetchInitialData = async () => {
            const mode = await PetProfileRepository.getAuthMode();
            setAuthMode(mode);

            const profile = await PetProfileRepository.getPetProfile();
            if (profile) {
                setPets([profile]);
            }
        };
        fetchInitialData();
    }, []);

    const handleRestorePurchases = async () => {
        try {
            const info = await Purchases.restorePurchases();
            if (info.entitlements.active['ar-pet-coach-premium']) {
                Alert.alert("Success", "Your purchases have been restored!");
                navigation.navigate('PremiumStatus');
            } else {
                Alert.alert("Info", "No active subscriptions found.");
            }
        } catch (e) {
            Alert.alert("Error", "Failed to restore purchases.");
        }
    };

    const handleSignIn = () => {
        navigation.navigate('Login', { mode: 'login' });
    };

    const handleCreateAccount = () => {
        navigation.navigate('Login', { mode: 'signup' });
    };

    const handleClearGuestData = () => {
        Alert.alert(
            "Clear guest data?",
            "This will delete your pet profile and progress from this device. This can’t be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Clear Data", 
                    style: "destructive",
                    onPress: async () => {
                        await PetProfileRepository.clearGuestData();
                        await PetProfileRepository.setAuthMode('unauthenticated');
                        // AppNavigator will handle navigation back to Auth stack
                    }
                }
            ]
        );
    };

    const handleSignOut = async () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Log Out", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (auth().currentUser) {
                                await signOut();
                            }
                            // Only call logOut for RevenueCat if the user was identified
                            // (RevenueCat handles this internally but good to be explicit)
                            await Purchases.logOut();
                            
                            await PetProfileRepository.setAuthMode('unauthenticated');
                        } catch (error: any) {
                            console.error("Sign out error:", error);
                            Alert.alert("Error", "Failed to sign out. Please try again.");
                        }
                    }
                }
            ]
        );
    };

    const getMenuItems = () => {
        const commonItems = [
            { icon: 'refresh-outline', label: 'Restore Purchases', onPress: handleRestorePurchases },
            { icon: 'shield-checkmark-outline', label: 'Privacy Policy', onPress: () => navigation.navigate('Privacy') },
            { icon: 'document-text-outline', label: 'Terms of Use', onPress: () => navigation.navigate('Terms') },
        ];

        if (authMode === 'guest') {
            return [
                { icon: 'person-add-outline', label: 'Create Account', onPress: handleCreateAccount },
                { icon: 'log-in-outline', label: 'Sign In', onPress: handleSignIn },
                { icon: 'trash-outline', label: 'Clear Guest Data', onPress: handleClearGuestData, color: COLORS.error },
                ...commonItems
            ];
        }

        return [
            { 
                icon: isPremium ? 'star-outline' : 'card-outline', 
                label: isPremium ? 'Premium' : 'Subscription', 
                onPress: () => navigation.navigate(isPremium ? 'PremiumStatus' : 'Paywall') 
            },
            { icon: 'refresh-outline', label: 'Restore Purchases', onPress: handleRestorePurchases },
            { icon: 'person-outline', label: 'Account', onPress: () => navigation.navigate('Account') },
            { icon: 'shield-checkmark-outline', label: 'Privacy Policy', onPress: () => navigation.navigate('Privacy') },
            { icon: 'document-text-outline', label: 'Terms of Use', onPress: () => navigation.navigate('Terms') },
        ];
    };

    const MENU_ITEMS = getMenuItems();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable
                    onPress={() => navigation.goBack()}
                    style={({ pressed }) => [
                        styles.backButton,
                        pressed && { opacity: 0.7 }
                    ]}
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    {authMode === 'guest' ? (
                        <View style={{ alignItems: 'center' }}>
                            <View style={[styles.avatar, { backgroundColor: COLORS.border }]}>
                                <Ionicons name="person" size={50} color={COLORS.textSecondary} />
                            </View>
                            <Text style={styles.emailText}>Guest User</Text>
                            <Text style={styles.guestSubtitle}>
                                Your pet profile and progress are saved on this device only.
                            </Text>
                        </View>
                    ) : (
                        <View style={{ alignItems: 'center' }}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{user?.email?.charAt(0).toUpperCase() || 'U'}</Text>
                            </View>
                            <Text style={styles.emailText}>{user?.email}</Text>
                        </View>
                    )}
                </View>

                {/* My Pets Carousel - Only show if profile exists */}
                {pets.length > 0 && (
                    <View style={styles.petsSection}>
                        <Text style={styles.sectionTitle}>My Pets</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.petsScroll}>
                            {pets.map(pet => (
                                <View key={pet.id} style={styles.petCard}>
                                    <View style={styles.petAvatarBg}>
                                        <Text style={{ fontSize: 30 }}>🐕</Text>
                                    </View>
                                    <Text style={styles.petName} numberOfLines={1}>{pet.petName}</Text>
                                </View>
                            ))}
                            <Pressable
                                style={({ pressed }) => [
                                    styles.addPetCard,
                                    pressed && { backgroundColor: COLORS.border, transform: [{ scale: 0.98 }] }
                                ]}
                                onPress={() => navigation.navigate('PetProfileStepper')}
                            >
                                <Ionicons name="add" size={32} color={COLORS.primary} />
                                <Text style={styles.addPetText}>Add New</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                )}

                {/* Menu List */}
                <View style={styles.menuSection}>
                    {MENU_ITEMS.map((item: any, index) => (
                        <Pressable
                            key={index}
                            style={({ pressed }) => [
                                styles.menuItem,
                                pressed && { backgroundColor: COLORS.backgroundLight }
                            ]}
                            onPress={item.onPress}
                        >
                            <Ionicons name={item.icon as any} size={24} color={item.color || COLORS.primary} />
                            <Text style={[styles.menuItemText, item.color && { color: item.color }]}>{item.label}</Text>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.border} />
                        </Pressable>
                    ))}
                    
                    {authMode !== 'guest' && (
                        <Pressable
                            style={({ pressed }) => [
                                styles.menuItemLogOut,
                                pressed && { backgroundColor: COLORS.backgroundLight }
                            ]}
                            onPress={handleSignOut}
                        >
                            <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
                            <Text style={styles.menuItemTextLogOut}>Log Out</Text>
                        </Pressable>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundLight,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SIZES.padding,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
        backgroundColor: COLORS.backgroundLight,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        marginRight: 8,
    },
    headerTitle: {
        ...FONTS.h2,
        color: COLORS.text,
    },
    content: {
        padding: SIZES.padding,
        paddingTop: 10,
        paddingBottom: 40,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.lavender,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        ...SHADOWS.small,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    emailText: {
        ...FONTS.h3,
        color: COLORS.text,
        textAlign: 'center',
    },
    guestSubtitle: {
        ...FONTS.body,
        color: COLORS.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 20,
        marginTop: 8,
        lineHeight: 22,
    },
    petsSection: {
        marginBottom: 30,
    },
    sectionTitle: {
        ...FONTS.h3,
        color: COLORS.text,
        marginBottom: 16,
    },
    petsScroll: {
        overflow: 'visible',
    },
    petCard: {
        backgroundColor: COLORS.background,
        padding: SIZES.padding,
        borderRadius: SIZES.radius,
        alignItems: 'center',
        marginRight: 16,
        width: 110,
        ...SHADOWS.small,
    },
    petAvatarBg: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.mint,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    petName: {
        ...FONTS.body,
        fontWeight: '600',
        color: COLORS.text,
    },
    addPetCard: {
        backgroundColor: COLORS.backgroundLight,
        padding: SIZES.padding,
        borderRadius: SIZES.radius,
        alignItems: 'center',
        justifyContent: 'center',
        width: 110,
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderStyle: 'dashed',
    },
    addPetText: {
        ...FONTS.caption,
        color: COLORS.primary,
        fontWeight: 'bold',
        marginTop: 8,
    },
    menuSection: {
        backgroundColor: COLORS.background,
        borderRadius: SIZES.radius,
        paddingHorizontal: SIZES.padding,
        paddingVertical: 10,
        ...SHADOWS.small,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    menuItemText: {
        flex: 1,
        ...FONTS.body,
        color: COLORS.text,
        marginLeft: 16,
    },
    menuItemLogOut: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingTop: 32,
        paddingBottom: 24,
    },
    menuItemTextLogOut: {
        flex: 1,
        ...FONTS.body,
        fontWeight: 'bold',
        color: COLORS.error,
        marginLeft: 16,
    },
});
