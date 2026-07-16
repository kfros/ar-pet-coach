import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SubscriptionManager from '../components/SubscriptionManager';
import SessionService from '../services/sessionService';
import PetProfileRepository from '../services/petProfileRepository';
import RevenueCatService from '../services/revenueCatService';
import RoutinesScreen from '../screens/RoutinesScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SessionPreviewScreen from '../screens/SessionPreviewScreen';
import PaywallScreen from '../screens/PaywallScreen';

// Mock Services
jest.mock('../services/sessionService', () => {
    const original = jest.requireActual('../services/sessionService');
    return {
        ...original,
        getSessions: jest.fn(),
        getSessionById: jest.fn(),
        getRecentProgress: jest.fn(() => Promise.resolve(null)),
        getHomeSnapshot: jest.fn(),
    };
});

jest.mock('../services/petProfileRepository', () => ({
    getPetProfile: jest.fn(() => Promise.resolve({ id: 'pet_1', petName: 'Buddy', anxietyTriggers: ['thunder'] })),
    addListener: jest.fn(() => () => {}),
    getAuthMode: jest.fn(() => Promise.resolve('authenticated')),
    hasPetProfile: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../services/revenueCatService', () => ({
    configure: jest.fn(),
    getOfferings: jest.fn(() => Promise.resolve({ current: null, availablePackages: [] })),
    restorePurchases: jest.fn(),
    purchasePackage: jest.fn(),
    getCustomerInfo: jest.fn(),
}));

describe('Premium Preview Before Paywall (CP-PAYWALL-001)', () => {
    const testPremiumSession = {
        id: 'premium_session_1',
        title: 'Premium Sound Therapy',
        subtitle: 'Calming sounds for fireworks',
        category: 'foundation',
        accessLevel: 'premium',
        durationMinutes: 10,
        difficulty: 'moderate',
        suitableFor: ['Dogs afraid of loud noises'],
        notFor: ['Deaf dogs'],
        safetyNotes: ['Keep volume low'],
        steps: [
            { id: 'step_1', title: 'Prepare room', instruction: 'Close windows', durationSeconds: 60, visualCue: 'pulse', canSkip: false },
            { id: 'step_2', title: 'Play sound', instruction: 'Start white noise', durationSeconds: 120, visualCue: 'observe', canSkip: false }
        ],
        stopIf: ['Dog shows severe distress'],
    };

    const testFreeSession = {
        id: 'free_session_1',
        title: 'Free Routine',
        subtitle: 'A basic free routine',
        category: 'foundation',
        accessLevel: 'free',
        durationMinutes: 5,
        difficulty: 'easy',
        steps: [
            { id: 'step_f1', title: 'Sit calmly', instruction: 'Sit', durationSeconds: 30, visualCue: 'pulse', canSkip: false }
        ]
    };

    let navigationRef: any;
    const Stack = createNativeStackNavigator();

    let mockUseSubscription: jest.SpyInstance;

    beforeEach(async () => {
        jest.clearAllMocks();
        await AsyncStorage.clear();
        navigationRef = createNavigationContainerRef<any>();

        (SessionService.getSessionById as jest.Mock).mockImplementation((id) => {
            if (id === 'premium_session_1') return testPremiumSession;
            if (id === 'free_session_1') return testFreeSession;
            return null;
        });

        (SessionService.getSessions as jest.Mock).mockReturnValue([testPremiumSession, testFreeSession]);

        (RevenueCatService.getOfferings as jest.Mock).mockResolvedValue({
            current: null,
            availablePackages: []
        });

        mockUseSubscription = jest.spyOn(SubscriptionManager, 'useSubscription').mockReturnValue({
            isPremium: false,
            isLoading: false,
            customerInfo: null,
            purchasePackage: jest.fn(),
            restorePurchases: jest.fn(),
            refreshEntitlement: jest.fn(),
            checkPaywallTrigger: jest.fn(),
            trackCalmingSession: jest.fn(),
        } as any);
    });

    const renderTestStack = (initialRoute: string, initialParams?: any) => {
        return render(
            <SubscriptionManager.SubscriptionProvider>
                <NavigationContainer ref={navigationRef}>
                    <Stack.Navigator initialRouteName={initialRoute}>
                        <Stack.Screen name="Routines" component={RoutinesScreen} />
                        <Stack.Screen name="Dashboard" component={DashboardScreen} />
                        <Stack.Screen name="SessionPreview" component={SessionPreviewScreen} initialParams={initialParams} />
                        <Stack.Screen name="Paywall" component={PaywallScreen} initialParams={initialParams} />
                    </Stack.Navigator>
                </NavigationContainer>
            </SubscriptionManager.SubscriptionProvider>
        );
    };

    test('Locked catalogue routine opens SessionPreview first (not Paywall) with correct route params', async () => {
        const { getByTestId } = renderTestStack('Routines');

        // Tap the locked premium routine card
        const card = await waitFor(() => getByTestId('routine-card-premium_session_1'));
        fireEvent.press(card);

        await waitFor(() => {
            expect(navigationRef.getCurrentRoute()?.name).toBe('SessionPreview');
            expect(navigationRef.getCurrentRoute()?.params).toEqual(expect.objectContaining({
                sessionId: 'premium_session_1',
                petId: 'pet_1'
            }));
        });
    });

    test('Locked Home suggestion opens SessionPreview first and uses View routine CTA & lock icon', async () => {
        (SessionService.getHomeSnapshot as jest.Mock).mockResolvedValue({
            latestPractice: null,
            latestCheckIn: null
        });

        // Set suggestion mock returning our premium routine
        const profileRecService = require('../services/profileRecommendationService');
        jest.spyOn(profileRecService, 'getHomeRecommendation').mockReturnValue({
            session: testPremiumSession,
            reason: 'Trigger match: thunder',
            source: 'profile'
        });

        const { getByTestId, getByText } = renderTestStack('Dashboard');

        const suggestCard = await waitFor(() => getByTestId('suggested-routine-card'));
        expect(getByText('View routine')).toBeTruthy();

        // Check accessibility label contains preview navigation
        expect(suggestCard.props.accessibilityLabel).toContain('View routine: Premium Sound Therapy. Premium required to start.');

        fireEvent.press(suggestCard);

        await waitFor(() => {
            expect(navigationRef.getCurrentRoute()?.name).toBe('SessionPreview');
        });
    });

    test('Locked Preview shows PREMIUM, approved context copy, steps overview, and Unlock routine button (Start Session is absent)', async () => {
        const { getByText, queryByText, getByTestId } = renderTestStack('SessionPreview', { sessionId: 'premium_session_1', petId: 'pet_1' });

        await waitFor(() => {
            expect(getByText('PREMIUM')).toBeTruthy();
            expect(getByText('Premium routine')).toBeTruthy();
            expect(getByText(/This routine is included with ChillPup Premium. You can review it before deciding whether to unlock it./)).toBeTruthy();
            expect(getByText('What you\'ll do')).toBeTruthy();
            expect(getByText('Prepare room')).toBeTruthy();
            expect(getByText('Play sound')).toBeTruthy();
            expect(getByText('Unlock routine')).toBeTruthy();
            expect(queryByText('Start Session')).toBeNull();
        });
    });

    test('Checking-access Preview is disabled and performs no navigation or writes', async () => {
        mockUseSubscription.mockReturnValue({
            isPremium: false,
            isLoading: true, // subscription loading
            customerInfo: null,
            purchasePackage: jest.fn(),
            restorePurchases: jest.fn(),
            refreshEntitlement: jest.fn(),
            checkPaywallTrigger: jest.fn(),
            trackCalmingSession: jest.fn(),
        } as any);

        const { getByText } = renderTestStack('SessionPreview', { sessionId: 'premium_session_1', petId: 'pet_1' });

        const btn = await waitFor(() => getByText('Checking access'));
        expect(btn).toBeTruthy();

        fireEvent.press(btn);

        // Ensure no navigation occurred (still on SessionPreview)
        expect(navigationRef.getCurrentRoute()?.name).toBe('SessionPreview');

        // Verify AsyncStorage remains empty
        const keys = await AsyncStorage.getAllKeys();
        expect(keys.length).toBe(0);
    });

    test('Unlock routine CTA opens exactly one Paywall with source premium_session and matching params', async () => {
        const { getByText } = renderTestStack('SessionPreview', { sessionId: 'premium_session_1', petId: 'pet_1' });

        const unlockBtn = await waitFor(() => getByText('Unlock routine'));
        fireEvent.press(unlockBtn);

        await waitFor(() => {
            expect(navigationRef.getCurrentRoute()?.name).toBe('Paywall');
            expect(navigationRef.getCurrentRoute()?.params).toEqual(expect.objectContaining({
                source: 'premium_session',
                sessionId: 'premium_session_1',
                petId: 'pet_1'
            }));
        });
    });

    test('Closing Paywall returns to the same locked Preview and preserves the key', async () => {
        const { getByText, findByText } = renderTestStack('SessionPreview', { sessionId: 'premium_session_1', petId: 'pet_1' });

        await findByText('Premium routine');
        await waitFor(() => expect(navigationRef.isReady()).toBe(true));
        const routesForOrig = navigationRef.getRootState()?.routes || [];
        const originalKey = routesForOrig[routesForOrig.length - 1].key;

        // Open Paywall
        const unlockBtn = getByText('Unlock routine');
        fireEvent.press(unlockBtn);

        await waitFor(() => {
            expect(navigationRef.getCurrentRoute()?.name).toBe('Paywall');
        });

        // Close Paywall directly simulates navigationRef.goBack() which closeBtn does
        navigationRef.goBack();

        await waitFor(() => {
            expect(navigationRef.getCurrentRoute()?.name).toBe('SessionPreview');
            const routes = navigationRef.getRootState()?.routes || [];
            const currentPreviewRoute = routes[routes.length - 1];
            expect(currentPreviewRoute.key).toBe(originalKey);
        });
    });

    test('Purchase success refreshes entitlement and returns to the same Preview as INCLUDED without auto-start', async () => {
        const purchaseMock = jest.fn(() => Promise.resolve({
            entitlements: { active: { 'ar-pet-coach-premium': {} } }
        }));
        const refreshMock = jest.fn();

        const mockMonthlyPackage = {
            identifier: 'monthly_pkg',
            packageType: 'MONTHLY',
            product: {
                title: 'Premium Monthly',
                priceString: '$5.99',
                price: 5.99,
                currencyCode: 'USD',
            }
        };

        mockUseSubscription.mockReturnValue({
            isPremium: false,
            isLoading: false,
            customerInfo: null,
            purchasePackage: purchaseMock,
            restorePurchases: jest.fn(),
            refreshEntitlement: refreshMock,
            packages: [mockMonthlyPackage],
        } as any);

        (RevenueCatService.purchasePackage as jest.Mock).mockResolvedValue({
            entitlements: { active: { 'ar-pet-coach-premium': {} } }
        });

        (RevenueCatService.getOfferings as jest.Mock).mockResolvedValue({
            availablePackages: [mockMonthlyPackage]
        });

        const { getByText, findByText } = renderTestStack('SessionPreview', { sessionId: 'premium_session_1', petId: 'pet_1' });

        await findByText('Premium routine');
        await waitFor(() => expect(navigationRef.isReady()).toBe(true));
        const routesForOrig2 = navigationRef.getRootState()?.routes || [];
        const originalKey = routesForOrig2[routesForOrig2.length - 1].key;

        // Go to Paywall
        fireEvent.press(getByText('Unlock routine'));

        await waitFor(() => {
            expect(navigationRef.getCurrentRoute()?.name).toBe('Paywall');
        });

        // Mock subscription state updates to active premium on refresh/update
        mockUseSubscription.mockReturnValue({
            isPremium: true,
            isLoading: false,
            customerInfo: null,
            purchasePackage: purchaseMock,
            restorePurchases: jest.fn(),
            refreshEntitlement: refreshMock,
            packages: [mockMonthlyPackage],
        } as any);

        // Tap Purchase button
        const purchaseBtn = getByText('Continue');
        fireEvent.press(purchaseBtn);

        await waitFor(() => {
            expect(navigationRef.getCurrentRoute()?.name).toBe('SessionPreview');
            const routes = navigationRef.getRootState()?.routes || [];
            expect(routes.length).toBe(1);
            expect(routes[0].key).toBe(originalKey);
            expect((routes[0].params as any)?.unlockedAfterPurchase).toBe(true);
            expect(getByText('INCLUDED')).toBeTruthy();
            expect(getByText('Start Session')).toBeTruthy();
        });
    });

    test('Restore success follows the same route contract', async () => {
        const restoreMock = jest.fn(() => Promise.resolve({
            entitlements: { active: { 'ar-pet-coach-premium': {} } }
        }));
        const refreshMock = jest.fn();

        mockUseSubscription.mockReturnValue({
            isPremium: false,
            isLoading: false,
            customerInfo: null,
            purchasePackage: jest.fn(),
            restorePurchases: restoreMock,
            refreshEntitlement: refreshMock,
        } as any);

        (RevenueCatService.restorePurchases as jest.Mock).mockResolvedValue({
            entitlements: { active: { 'ar-pet-coach-premium': {} } }
        });

        const { getByText, findByText } = renderTestStack('SessionPreview', { sessionId: 'premium_session_1', petId: 'pet_1' });

        await findByText('Premium routine');
        await waitFor(() => expect(navigationRef.isReady()).toBe(true));
        const routesForOrig3 = navigationRef.getRootState()?.routes || [];
        const originalKey = routesForOrig3[routesForOrig3.length - 1].key;

        // Go to Paywall
        fireEvent.press(getByText('Unlock routine'));

        await waitFor(() => {
            expect(navigationRef.getCurrentRoute()?.name).toBe('Paywall');
        });

        // Mock subscription state updates to active premium on refresh/update
        mockUseSubscription.mockReturnValue({
            isPremium: true,
            isLoading: false,
            customerInfo: null,
            purchasePackage: jest.fn(),
            restorePurchases: restoreMock,
            refreshEntitlement: refreshMock,
        } as any);

        // Tap Restore button
        const restoreBtn = getByText('Restore Purchases');
        fireEvent.press(restoreBtn);

        await waitFor(() => {
            expect(navigationRef.getCurrentRoute()?.name).toBe('SessionPreview');
            const routes = navigationRef.getRootState()?.routes || [];
            expect(routes.length).toBe(1);
            expect(routes[0].key).toBe(originalKey);
            expect((routes[0].params as any)?.unlockedAfterPurchase).toBe(true);
        });
    });

    test('Already-active entitlement dismisses to the existing Preview rather than replacing it, without celebration feedback', async () => {
        // Mock premium to true before Paywall mounts
        mockUseSubscription.mockReturnValue({
            isPremium: true,
            isLoading: false,
            customerInfo: null,
            purchasePackage: jest.fn(),
            restorePurchases: jest.fn(),
            refreshEntitlement: jest.fn(),
        } as any);

        const { queryByText } = renderTestStack('Paywall', { sessionId: 'premium_session_1', petId: 'pet_1', source: 'premium_session' });

        await waitFor(() => {
            // Should immediately navigate back to existing SessionPreview since it's already active
            expect(navigationRef.getCurrentRoute()?.name).toBe('SessionPreview');
            expect((navigationRef.getCurrentRoute()?.params as any)?.unlockedAfterPurchase).toBeUndefined();
        });
    });

    test('Legacy/direct Paywall fallback creates exactly one SessionPreview', async () => {
        mockUseSubscription.mockReturnValue({
            isPremium: true,
            isLoading: false,
            customerInfo: null,
            purchasePackage: jest.fn(),
            restorePurchases: jest.fn(),
            refreshEntitlement: jest.fn(),
        } as any);

        // Opened without source: premium_session (i.e. direct Paywall entry)
        renderTestStack('Paywall', { sessionId: 'premium_session_1', petId: 'pet_1' });

        await waitFor(() => {
            expect(navigationRef.getCurrentRoute()?.name).toBe('SessionPreview');
            const routes = navigationRef.getRootState()?.routes || [];
            expect(routes.length).toBe(1);
            expect(routes[0].name).toBe('SessionPreview');
        });
    });

    test('Locked Preview action performs no history, check-in, outdoor progression, or AsyncStorage acknowledgement write', async () => {
        const { getByText } = renderTestStack('SessionPreview', { sessionId: 'premium_session_1', petId: 'pet_1' });

        const btn = await waitFor(() => getByText('Unlock routine'));
        fireEvent.press(btn);

        // Ensure navigation went to Paywall
        await waitFor(() => {
            expect(navigationRef.getCurrentRoute()?.name).toBe('Paywall');
        });

        // Ensure absolutely no AsyncStorage writes took place
        const keys = await AsyncStorage.getAllKeys();
        expect(keys.length).toBe(0);
    });
});
