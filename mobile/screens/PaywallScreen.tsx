import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import RevenueCatService from '../services/revenueCatService';
import { PurchasesPackage } from 'react-native-purchases';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';

export default function PaywallScreen({ route, navigation }: any) {
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);

    // Optional warning message passed via navigation params
    const warningMessage = route?.params?.warning;

    useEffect(() => {
        loadOfferings();
    }, []);

    const loadOfferings = async () => {
        try {
            const offerings = await RevenueCatService.getOfferings();
            if (offerings && offerings.availablePackages.length > 0) {
                setPackages(offerings.availablePackages);
            } else {
                Alert.alert('Error', 'No subscriptions found. Please try again later.');
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to load offerings.');
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (pack: PurchasesPackage) => {
        setPurchasing(true);
        try {
            const customerInfo = await RevenueCatService.purchasePackage(pack);
            if (customerInfo && customerInfo.entitlements.active['pro_access']) {
                Alert.alert('Success', 'You are now a Pro member!');
                navigation.goBack(); // Or navigate to Home
            }
        } catch (e) {
            console.log("Purchase cancelled or failed");
        } finally {
            setPurchasing(false);
        }
    };

    const handleRestore = async () => {
        setPurchasing(true);
        try {
            const customerInfo = await RevenueCatService.restorePurchases();
            if (customerInfo && customerInfo.entitlements.active['pro_access']) {
                Alert.alert('Success', 'Purchases restored!');
                navigation.goBack();
            } else {
                Alert.alert('Info', 'No active subscription found to restore.');
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to restore purchases.');
        } finally {
            setPurchasing(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {warningMessage && (
                <View style={styles.warningContainer}>
                    <Ionicons name="warning" size={20} color="#b45309" />
                    <Text style={styles.warningText}>{warningMessage}</Text>
                </View>
            )}

            <View style={styles.header}>
                <Text style={styles.title}>Unlock Full Access</Text>
                <Text style={styles.subtitle}>
                    Get unlimited AR sessions, advanced anxiety tracking, and more.
                </Text>
            </View>

            <View style={styles.features}>
                <FeatureItem text="Unlimited AR Sessions" />
                <FeatureItem text="Advanced Anxiety Analytics" />
                <FeatureItem text="Community Access" />
            </View>

            <View style={styles.packagesContainer}>
                {packages.map((pack) => (
                    <Pressable
                        key={pack.identifier}
                        style={({ pressed }) => [
                            styles.packageCard,
                            pressed && { backgroundColor: COLORS.backgroundLight, borderColor: COLORS.primary, transform: [{ scale: 0.98 }] }
                        ]}
                        onPress={() => handlePurchase(pack)}
                        disabled={purchasing}
                    >
                        <Text style={styles.packageTitle}>{pack.product.title}</Text>
                        <Text style={styles.packagePrice}>{pack.product.priceString}</Text>
                        <Text style={styles.packageDescription}>{pack.product.description}</Text>
                    </Pressable>
                ))}
            </View>

            <Pressable
                onPress={handleRestore}
                disabled={purchasing}
                style={({ pressed }) => [
                    styles.restoreButton,
                    pressed && { opacity: 0.7 }
                ]}
            >
                <Text style={styles.restoreText}>Restore Purchases</Text>
            </Pressable>

            {purchasing && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            )}
        </ScrollView>
    );
}

function FeatureItem({ text }: { text: string }) {
    return (
        <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 24,
        backgroundColor: '#fff',
    },
    warningContainer: {
        flexDirection: 'row',
        backgroundColor: '#fef3c7',
        padding: 12,
        borderRadius: 8,
        marginTop: 40,
        marginBottom: -16,
        alignItems: 'center',
        gap: 8,
    },
    warningText: {
        color: '#b45309',
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 40,
    },
    title: {
        ...FONTS.h1,
        color: COLORS.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    features: {
        marginBottom: 32,
        gap: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    featureText: {
        fontSize: 16,
        color: '#333',
    },
    packagesContainer: {
        gap: 16,
        marginBottom: 24,
    },
    packageCard: {
        borderWidth: 1,
        borderColor: '#e5e5e5',
        borderRadius: 12,
        padding: 20,
        backgroundColor: '#f9f9f9',
    },
    packageTitle: {
        ...FONTS.h3,
        color: COLORS.text,
        marginBottom: 4,
    },
    packagePrice: {
        ...FONTS.h2,
        color: COLORS.primary,
        marginBottom: 4,
    },
    packageDescription: {
        fontSize: 14,
        color: '#666',
    },
    restoreButton: {
        alignItems: 'center',
        padding: 12,
    },
    restoreText: {
        color: '#666',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
