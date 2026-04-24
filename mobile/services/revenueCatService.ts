import { Platform } from 'react-native';
import Purchases, { PurchasesOffering, PurchasesPackage, CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Check if running in Expo Go (StoreClient = Expo Go app)
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// API Keys from environment
const API_KEYS = {
    ios: process.env.EXPO_PUBLIC_RC_IOS_API_KEY || '',
    android: process.env.EXPO_PUBLIC_RC_ANDROID_API_KEY || '',
    testStore: process.env.EXPO_PUBLIC_RC_TEST_STORE_API_KEY || '',
};

// Track if SDK was successfully configured
let isConfigured = false;

// Pre-flight key validation log (first 4 and last 4 chars)
const maskKey = (key: string | undefined) => {
    if (!key) return "MISSING";
    if (key.length <= 8) return "****";
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
};

class RevenueCatService {
    static async configure() {
        if (isConfigured) return;
        try {
            // In Expo Go, use the Test Store API Key
            if (isExpoGo) {
                if (!API_KEYS.testStore) {
                    console.warn('RevenueCat: No Test Store API Key found. Skipping configuration in Expo Go.');
                    return;
                }
                console.log('RevenueCat: Configuring with Test Store API Key (Expo Go mode)');
                Purchases.configure({ apiKey: API_KEYS.testStore });
                isConfigured = true;
            } else {
                // In native builds, use platform-specific keys
                const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android;

                console.log(`[Pre-flight] RevenueCat ${Platform.OS} Key:`, maskKey(apiKey));

                if (!apiKey) {
                    console.warn(`RevenueCat: No API Key found for ${Platform.OS}. Skipping configuration.`);
                    console.warn('RevenueCat: The app will run without subscription features.');
                    return;
                }

                console.log(`RevenueCat: Configuring for ${Platform.OS}`);
                Purchases.configure({ apiKey });
                isConfigured = true;
            }

            // Enable debug logs for development
            await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        } catch (e) {
            console.error('Error configuring Purchases:', e);
        }
    }

    static async getOfferings(): Promise<PurchasesOffering | null> {
        if (!isConfigured) {
            console.log('RevenueCat: SDK not configured, skipping getOfferings');
            return null;
        }
        try {
            const offerings = await Purchases.getOfferings();
            if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
                return offerings.current;
            }
            return null;
        } catch (e) {
            console.error('Error fetching offerings', e);
            return null;
        }
    }

    static async purchasePackage(pack: PurchasesPackage): Promise<CustomerInfo | null> {
        if (!isConfigured) {
            console.log('RevenueCat: SDK not configured, skipping purchasePackage');
            return null;
        }
        try {
            const { customerInfo } = await Purchases.purchasePackage(pack);
            return customerInfo;
        } catch (e: any) {
            if (!e.userCancelled) {
                console.error('Error purchasing package', e);
            }
            return null;
        }
    }

    static async getCustomerInfo(): Promise<CustomerInfo | null> {
        if (!isConfigured) {
            console.log('RevenueCat: SDK not configured, skipping getCustomerInfo');
            return null;
        }
        try {
            return await Purchases.getCustomerInfo();
        } catch (e) {
            console.error('Error getting customer info', e);
            return null;
        }
    }

    static async restorePurchases(): Promise<CustomerInfo | null> {
        if (!isConfigured) {
            console.log('RevenueCat: SDK not configured, skipping restorePurchases');
            return null;
        }
        try {
            return await Purchases.restorePurchases();
        } catch (e) {
            console.error("Error restoring purchases", e);
            return null;
        }
    }

    static async syncPurchases(): Promise<void> {
        if (!isConfigured) {
            console.log('RevenueCat: SDK not configured, skipping syncPurchases');
            return;
        }
        try {
            if (Platform.OS === 'ios' || Platform.OS === 'android') {
                await Purchases.syncPurchases();
                console.log('Purchases synced successfully');
            }
        } catch (e) {
            console.error("Error syncing purchases", e);
        }
    }

    static async getSubscriptionStatus(): Promise<{
        isPremium: boolean;
        isTrial: boolean;
        expirationDate: string | null;
    }> {
        const info = await this.getCustomerInfo();
        if (!info) return { isPremium: false, isTrial: false, expirationDate: null };

        const entitlement = info.entitlements.active['ar-pet-coach-premium'];
        if (!entitlement) return { isPremium: false, isTrial: false, expirationDate: null };

        return {
            isPremium: true,
            isTrial: entitlement.periodType === 'TRIAL',
            expirationDate: entitlement.expirationDate,
        };
    }

    static async logOut(): Promise<void> {
        if (!isConfigured) return;
        try {
            await Purchases.logOut();
            console.log('RevenueCat: Logged out successfully');
        } catch (e: any) {
            // Ignore errors related to logging out anonymous users
            if (e.message?.includes('anonymous') || e.code === '7') {
                console.log('RevenueCat: Ignoring logout error for anonymous user');
            } else {
                console.error('RevenueCat: Error logging out', e);
            }
        }
    }

    static isReady(): boolean {
        return isConfigured;
    }
}

export default RevenueCatService;
