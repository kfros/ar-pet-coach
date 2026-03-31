import React, { createContext, useContext, useEffect, useState } from 'react';
import RevenueCatService from '../services/revenueCatService';
import { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SubscriptionContextType {
    isPremium: boolean;
    customerInfo: CustomerInfo | null;
    purchasePackage: (pack: PurchasesPackage) => Promise<void>;
    restorePurchases: () => Promise<void>;
    isLoading: boolean;
    checkPaywallTrigger: () => Promise<boolean>;
    trackARSession: () => Promise<number>;
    refreshEntitlement: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
    isPremium: false,
    customerInfo: null,
    purchasePackage: async () => { },
    restorePurchases: async () => { },
    isLoading: true,
    checkPaywallTrigger: async () => false,
    trackARSession: async () => 0,
    refreshEntitlement: async () => { },
});

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isPremium, setIsPremium] = useState(false);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            // NOTE: configure() is now handled globally in index.ts
            // NOTE: syncPurchases() removed from startup — it triggers
            // the native iOS Apple ID login prompt via StoreKit.
            // It's called automatically by RevenueCat when needed, and
            // can be triggered manually via restorePurchases().
            const info = await RevenueCatService.getCustomerInfo();
            updateCustomerState(info);
            setIsLoading(false);
        };

        init();
    }, []);

    const updateCustomerState = (info: CustomerInfo | null) => {
        setCustomerInfo(info);
        setCustomerInfo(info);
        if (info?.entitlements.active['pro_access']) {
            console.log("SubscriptionManager: User has active premium entitlement");
            setIsPremium(true);
        } else {
            console.log("SubscriptionManager: User does NOT have active premium entitlement");
            setIsPremium(false);
        }
    };

    const purchasePackage = async (pack: PurchasesPackage) => {
        setIsLoading(true);
        const info = await RevenueCatService.purchasePackage(pack);
        updateCustomerState(info);
        setIsLoading(false);
    };

    const restorePurchases = async () => {
        setIsLoading(true);
        const info = await RevenueCatService.restorePurchases();
        updateCustomerState(info);
        setIsLoading(false);
    };

    const refreshEntitlement = async () => {
        const info = await RevenueCatService.getCustomerInfo();
        updateCustomerState(info);
    };

    const trackARSession = async () => {
        try {
            const sessions = await AsyncStorage.getItem('ar_session_count');
            const count = sessions ? parseInt(sessions, 10) + 1 : 1;
            await AsyncStorage.setItem('ar_session_count', count.toString());
            console.log('AR Session count:', count);
            return count;
        } catch (e) {
            console.error('Error tracking AR session', e);
            return 0;
        }
    };

    const checkPaywallTrigger = async () => {
        if (isPremium) return false;

        try {
            // Re-fetch customer info to ensure accuracy
            const info = await RevenueCatService.getCustomerInfo();
            updateCustomerState(info);

            if (info?.entitlements.active['pro_access']) {
                return false;
            }

            // Check if entitlement expired (had it in the past but not active)
            const hadPro = info?.entitlements.all['pro_access'];
            if (hadPro && !hadPro.isActive) {
                console.log('Entitlement expired, triggering paywall.');
                return true;
            }

            // Check Days Installed
            let installDate = await AsyncStorage.getItem('install_date');
            if (!installDate) {
                installDate = new Date().toISOString();
                await AsyncStorage.setItem('install_date', installDate);
            }
            const daysInstalled = (new Date().getTime() - new Date(installDate).getTime()) / (1000 * 3600 * 24);

            // Check Session Count
            const sessions = await AsyncStorage.getItem('ar_session_count');
            const sessionCount = sessions ? parseInt(sessions, 10) : 0;

            console.log(`Paywall Check: Days=${daysInstalled.toFixed(1)}, AR Sessions=${sessionCount}`);

            // Ensure the user experience is smooth:
            // Don't trigger if they haven't completed their first AR session yet
            if (sessionCount === 0) {
                return false;
            }

            // Trigger if trial > 5 days or if they've consumed > 2 free sessions
            if (daysInstalled > 5 || sessionCount > 2) {
                return true;
            }
            return false;
        } catch (e) {
            console.error('Error checking paywall trigger', e);
            return false;
        }
    };

    return (
        <SubscriptionContext.Provider value={{ isPremium, customerInfo, purchasePackage, restorePurchases, isLoading, checkPaywallTrigger, trackARSession, refreshEntitlement }}>
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => useContext(SubscriptionContext);
