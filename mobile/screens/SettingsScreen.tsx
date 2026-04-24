import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Linking, Platform, ScrollView } from 'react-native';
import { auth, db } from '../services/firebaseConfig';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Purchases from 'react-native-purchases';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../components/SubscriptionManager';

export default function SettingsScreen({ navigation }: any) {
    const user = auth().currentUser;
    const { isPremium, customerInfo } = useSubscription();
    const [pets, setPets] = useState<any[]>([]);

    useEffect(() => {
        const fetchPets = async () => {
            if (!user) return;
            try {
                const snap = await db.collection('users').doc(user.uid).collection('pets').get();
                const fetched = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
                setPets(fetched);
            } catch (err) {
                console.error(err);
            }
        };
        fetchPets();
    }, [user]);

    const handleManageSubscription = async () => {
        try {
            if (customerInfo?.managementURL) {
                await Linking.openURL(customerInfo.managementURL);
                return;
            }
            if (Platform.OS === 'ios') {
                await Linking.openURL('https://apps.apple.com/account/subscriptions');
            } else {
                await Linking.openURL('https://play.google.com/store/account/subscriptions');
            }
        } catch (err) {
            console.error("Error opening subscription management:", err);
            Alert.alert("Error", "Could not open subscription settings.");
        }
    };

    const handleSignOut = async () => {
        try {
            const isAnonymous = await Purchases.isAnonymous();
            if (!isAnonymous) await Purchases.logOut();
            try { await GoogleSignin.signOut(); } catch (e) { }
            await auth().signOut();
        } catch (error: any) {
            console.error("Sign out error:", error);
            Alert.alert("Error", "Failed to sign out. Please try again.");
        }
    };

    const MENU_ITEMS = [
        { icon: 'card-outline', label: 'Payments', onPress: handleManageSubscription },
        { icon: 'heart-outline', label: 'Favorite', onPress: () => Alert.alert('Favorites', 'Coming Soon!') },
        { icon: 'gift-outline', label: 'Refer', onPress: () => Alert.alert('Refer', 'Coming Soon!') },
        { icon: 'location-outline', label: 'Addresses', onPress: () => Alert.alert('Addresses', 'Coming Soon!') },
        { icon: 'cube-outline', label: 'Orders', onPress: () => Alert.alert('Orders', 'Coming Soon!') },
        { icon: 'person-outline', label: 'Account', onPress: () => navigation.navigate('Account') },
        { icon: 'settings-outline', label: 'Settings', onPress: () => Alert.alert('Settings', 'Coming Soon!') },
        { icon: 'information-circle-outline', label: 'About Us', onPress: () => Alert.alert('About Us', 'Coming Soon!') },
    ];

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
                {/* Profile Info */}
                <View style={styles.profileSection}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{user?.email?.charAt(0).toUpperCase() || 'U'}</Text>
                        <View style={styles.editBadge}>
                            <Ionicons name="pencil" size={12} color="#fff" />
                        </View>
                    </View>
                    <Text style={styles.emailText}>{user?.email || 'Guest User'}</Text>
                </View>

                {/* My Pets Carousel */}
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

                {/* Menu List */}
                <View style={styles.menuSection}>
                    {MENU_ITEMS.map((item, index) => (
                        <Pressable
                            key={index}
                            style={({ pressed }) => [
                                styles.menuItem,
                                pressed && { backgroundColor: COLORS.backgroundLight }
                            ]}
                            onPress={item.onPress}
                        >
                            <Ionicons name={item.icon as any} size={24} color={COLORS.primary} />
                            <Text style={styles.menuItemText}>{item.label}</Text>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.border} />
                        </Pressable>
                    ))}
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
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.primary,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.backgroundLight,
    },
    emailText: {
        ...FONTS.h3,
        color: COLORS.text,
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
