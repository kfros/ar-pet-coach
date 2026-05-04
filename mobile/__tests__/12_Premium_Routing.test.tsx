import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DashboardScreen from '../screens/DashboardScreen';
import * as SubscriptionManager from '../components/SubscriptionManager';
import SessionService from '../services/sessionService';
import PetProfileRepository from '../services/petProfileRepository';

// Mock navigation
const mockNavigation = {
    navigate: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => () => {}),
};

// Mock SessionService
jest.mock('../services/sessionService', () => ({
    getSessions: jest.fn(),
    getSessionById: jest.fn(),
    getRecentProgress: jest.fn(() => Promise.resolve(null)),
}));

// Mock PetProfileRepository
jest.mock('../services/petProfileRepository', () => ({
    getPetProfile: jest.fn(() => Promise.resolve({ id: 'pet_1', petName: 'Buddy' })),
    addListener: jest.fn(() => () => {}),
    getAuthMode: jest.fn(() => Promise.resolve('authenticated')),
}));

// Mock safe area insets
jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('Premium Routing Logic', () => {
    const premiumSession = {
        id: 'premium_1',
        title: 'Premium Routine',
        accessLevel: 'premium',
        steps: [],
        beforeYouStart: [],
        whatToWatchFor: [],
        stopIf: [],
        durationMinutes: 5,
        subtitle: 'Premium subtitle',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (SessionService.getSessions as jest.Mock).mockReturnValue([premiumSession]);
        (SessionService.getSessionById as jest.Mock).mockReturnValue(premiumSession);
    });

    test('non-premium user tapping premium routine in Dashboard navigates to Paywall', async () => {
        jest.spyOn(SubscriptionManager, 'useSubscription').mockReturnValue({
            isPremium: false,
            isLoading: false,
        } as any);

        const { findByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <DashboardScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        const card = await findByText('Premium Routine');
        fireEvent.press(card);

        expect(mockNavigation.navigate).toHaveBeenCalledWith('Paywall', expect.objectContaining({
            sessionId: 'premium_1',
            petId: 'pet_1'
        }));
    });

    test('premium user tapping premium routine in Dashboard navigates to SessionPreview', async () => {
        jest.spyOn(SubscriptionManager, 'useSubscription').mockReturnValue({
            isPremium: true,
            isLoading: false,
        } as any);

        const { findByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <DashboardScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        const card = await findByText('Premium Routine');
        fireEvent.press(card);

        expect(mockNavigation.navigate).toHaveBeenCalledWith('SessionPreview', expect.objectContaining({
            sessionId: 'premium_1',
            petId: 'pet_1'
        }));
    });
});
