import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import RevenueCatService from '../services/revenueCatService';
import { PurchasesPackage } from 'react-native-purchases';
import { useSubscription } from './SubscriptionManager';

interface PaywallModalProps {
    visible: boolean;
    onClose: () => void;
}

const PaywallModal: React.FC<PaywallModalProps> = ({ visible, onClose }) => {
    const { purchasePackage, restorePurchases, isPremium } = useSubscription();
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadOfferings = async () => {
            if (visible) {
                setLoading(true);
                const offerings = await RevenueCatService.getOfferings();
                if (offerings && offerings.availablePackages.length > 0) {
                    setPackages(offerings.availablePackages);
                } else {
                    setPackages([]);
                    // Optional: You might want to log this or handle it silently
                    console.log("PaywallModal: No offerings found or offerings empty.");
                }
                setLoading(false);
            }
        };
        loadOfferings();
    }, [visible]);

    useEffect(() => {
        if (isPremium) {
            Alert.alert("Success", "You have unlocked premium features!");
            onClose();
        }
    }, [isPremium, onClose]);

    const handlePurchase = async (pack: PurchasesPackage) => {
        try {
            await purchasePackage(pack);
        } catch (error: any) {
            if (!error.userCancelled) {
                Alert.alert("Purchase Failed", error.message);
            }
        }
    };

    const handleRestore = async () => {
        try {
            await restorePurchases();
            // The useEffect on isPremium will handle success
        } catch (error: any) {
            Alert.alert("Restore Failed", error.message);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.title}>Unlock Premium Features</Text>
                    <Text style={styles.subtitle}>Get unlimited bark analysis and advanced insights.</Text>

                    {loading ? (
                        <ActivityIndicator size="large" color="#0000ff" />
                    ) : (
                        <View style={{ width: '100%' }}>
                            {packages.length === 0 ? (
                                <Text style={styles.noOffersText}>
                                    No subscription options available at this time. Please try again later.
                                    {'\n'}(Check if RevenueCat is configured correctly)
                                </Text>
                            ) : (
                                packages.map((pack) => (
                                    <TouchableOpacity
                                        key={pack.identifier}
                                        style={styles.packageButton}
                                        onPress={() => handlePurchase(pack)}
                                    >
                                        <View>
                                            <Text style={styles.packageTitle}>{pack.product.title}</Text>
                                            <Text style={styles.packageDesc}>{pack.product.description}</Text>
                                        </View>
                                        <Text style={styles.packagePrice}>{pack.product.priceString}</Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    )}

                    <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
                        <Text style={styles.restoreButtonText}>Restore Purchases</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>Not Now</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 16,
        width: '90%',
        alignItems: 'center',
        maxHeight: '80%',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    noOffersText: {
        textAlign: 'center',
        color: '#666',
        marginVertical: 20,
    },
    packageButton: {
        padding: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        marginBottom: 12,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    packageTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 4,
    },
    packageDesc: {
        fontSize: 12,
        color: '#666',
        maxWidth: 200,
    },
    packagePrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2563eb',
    },
    restoreButton: {
        marginTop: 10,
        padding: 10,
    },
    restoreButtonText: {
        color: '#2563eb',
        fontSize: 14,
        fontWeight: '600',
    },
    closeButton: {
        marginTop: 10,
        padding: 10,
    },
    closeButtonText: {
        color: '#999',
        fontSize: 14,
    },
});

export default PaywallModal;
