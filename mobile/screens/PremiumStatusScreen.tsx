import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import RevenueCatService from '../services/revenueCatService';
import { CustomerInfo, PurchasesOffering } from 'react-native-purchases';

const ENTITLEMENT_ID = 'ar-pet-coach-premium';

export default function PremiumStatusScreen({ navigation, route }: any) {
    const [loading, setLoading] = useState(true);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [offering, setOffering] = useState<PurchasesOffering | null>(null);
    const source = route.params?.source || 'settings';

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = async () => {
        setLoading(true);
        try {
            const info = await RevenueCatService.getCustomerInfo();
            const offerings = await RevenueCatService.getOfferings();
            setCustomerInfo(info);
            // offerings is a PurchasesOffering | null, but RC SDK returns a PurchasesOfferings object
            // Our service returns current offering.
            setOffering(offerings as any);
        } catch (e) {
            console.error("Error refreshing premium status:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleManageSubscription = async () => {
        if (customerInfo?.managementURL) {
            await Linking.openURL(customerInfo.managementURL);
        } else {
            const message = "Subscription management is available through your App Store or Google Play account settings.";
            if (Platform.OS === 'ios') {
                Alert.alert("Manage Subscription", message, [
                    { text: "Open Settings", onPress: () => Linking.openURL('https://apps.apple.com/account/subscriptions') },
                    { text: "Cancel", style: "cancel" }
                ]);
            } else {
                Alert.alert("Manage Subscription", message, [
                    { text: "Open Play Store", onPress: () => Linking.openURL('https://play.google.com/store/account/subscriptions') },
                    { text: "Cancel", style: "cancel" }
                ]);
            }
        }
    };

    const handleRestore = async () => {
        setLoading(true);
        try {
            const info = await RevenueCatService.restorePurchases();
            setCustomerInfo(info);
            if (info?.entitlements.active[ENTITLEMENT_ID]) {
                Alert.alert("Success", "Purchases restored!");
            } else {
                Alert.alert("Info", "No active subscription found.");
            }
        } catch (e) {
            Alert.alert("Error", "Failed to restore purchases.");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !customerInfo) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const activeEntitlement = customerInfo?.entitlements.active[ENTITLEMENT_ID];
    const isPremium = !!activeEntitlement;

    // Plan matching logic
    const activeProductId = activeEntitlement?.productIdentifier;
    const allPackages = offering?.availablePackages || [];
    const matchedPackage = allPackages.find(pkg => pkg.product.identifier === activeProductId);

    const planLabel = matchedPackage 
        ? (matchedPackage.packageType === 'ANNUAL' ? 'Annual' : 'Monthly')
        : 'Premium';
    
    const priceString = matchedPackage?.product.priceString;
    
    let renewalInfo = "Active";
    if (activeEntitlement?.expirationDate) {
        const date = new Date(activeEntitlement.expirationDate).toLocaleDateString();
        if (activeEntitlement.periodType === 'TRIAL') {
            renewalInfo = `Trial ends on ${date}`;
        } else if (activeEntitlement.willRenew) {
            renewalInfo = `Renews on ${date}`;
        } else {
            renewalInfo = `Active until ${date}`;
        }
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Header Row */}
                <View style={styles.headerRow}>
                    <Pressable 
                        onPress={() => navigation.goBack()}
                        style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7 }]}
                        hitSlop={12}
                    >
                        <Ionicons name="close" size={28} color={COLORS.textSecondary} />
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Premium Active Banner */}
                    <View style={styles.banner}>
                        <Ionicons name="star" size={20} color="#fff" />
                        <Text style={styles.bannerText}>Premium Active</Text>
                    </View>

                    <Text style={styles.headline}>Your Premium is active</Text>
                    <Text style={styles.bodyText}>You already have access to all premium features.</Text>

                    {/* Current Plan Card */}
                    <View style={styles.planCard}>
                        <View style={styles.planHeader}>
                            <Text style={styles.planLabel}>{planLabel}</Text>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>Current Plan</Text>
                            </View>
                        </View>
                        {priceString && <Text style={styles.planPrice}>{priceString}</Text>}
                        <Text style={styles.renewalText}>{renewalInfo}</Text>
                    </View>

                    {/* Benefits Summary */}
                    <View style={styles.benefitsSection}>
                        <Text style={styles.benefitsTitle}>Included with Premium</Text>
                        <BenefitItem text="Extended calming routines" />
                        <BenefitItem text="Profile-based suggestions" />
                        <BenefitItem text="Progress patterns" />
                    </View>

                    {/* Primary CTA */}
                    <Pressable 
                        style={({ pressed }) => [
                            styles.primaryButton,
                            pressed && styles.primaryButtonPressed
                        ]}
                        onPress={source === 'post_purchase' ? () => navigation.goBack() : handleManageSubscription}
                    >
                        <Text style={styles.primaryButtonText}>
                            {source === 'post_purchase' ? 'Continue' : 'Manage Subscription'}
                        </Text>
                    </Pressable>

                    {/* Secondary Actions */}
                    <View style={styles.footerActions}>
                        <Pressable onPress={handleRestore} style={styles.footerLink}>
                            <Text style={styles.footerLinkText}>Restore Purchases</Text>
                        </Pressable>
                        <View style={styles.legalLinks}>
                            <Pressable onPress={() => Linking.openURL('https://www.kf-software.com/privacy-policy')}>
                                <Text style={styles.footerLinkText}>Privacy Policy</Text>
                            </Pressable>
                            <View style={styles.dot} />
                            <Pressable onPress={() => Linking.openURL('https://www.kf-software.com/terms-of-use')}>
                                <Text style={styles.footerLinkText}>Terms of Use</Text>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

function BenefitItem({ text }: { text: string }) {
    return (
        <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            <Text style={styles.benefitText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.backgroundLight,
    },
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundLight,
    },
    headerRow: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
    },
    closeButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        alignItems: 'center',
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0D9488', // Teal
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginBottom: 24,
        gap: 8,
    },
    bannerText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    headline: {
        ...FONTS.h1,
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 12,
    },
    bodyText: {
        ...FONTS.body,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
    },
    planCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 32,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    planLabel: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    badge: {
        backgroundColor: COLORS.mint,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    planPrice: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '600',
        marginBottom: 4,
    },
    renewalText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    benefitsSection: {
        width: '100%',
        marginBottom: 40,
    },
    benefitsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 16,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    benefitText: {
        fontSize: 15,
        color: COLORS.textSecondary,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        width: '100%',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        ...SHADOWS.medium,
    },
    primaryButtonPressed: {
        backgroundColor: COLORS.primaryDark,
        transform: [{ scale: 0.98 }],
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    footerActions: {
        alignItems: 'center',
        gap: 16,
    },
    footerLink: {
        padding: 8,
    },
    footerLinkText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textDecorationLine: 'underline',
    },
    legalLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: COLORS.border,
    }
});
