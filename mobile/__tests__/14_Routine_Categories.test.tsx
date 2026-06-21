import React from 'react';
import { render } from '@testing-library/react-native';
import DashboardScreen from '../screens/DashboardScreen';
import * as SubscriptionManager from '../components/SubscriptionManager';
import SessionService from '../services/sessionService';
import { ROUTINE_CATEGORIES } from '../appContent/routineCategories';

// Mock navigation
const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
};

// Mock SessionService
jest.mock('../services/sessionService', () => ({
    getSessions: jest.fn(),
    getStressSignsTrend: jest.fn(() => Promise.resolve(null)),
    getRecentProgress: jest.fn(() => Promise.resolve(null)),
}));

// Mock PetProfileRepository
jest.mock('../services/petProfileRepository', () => ({
    getPetProfile: jest.fn(() => Promise.resolve({
        id: 'pet_123',
        petName: 'Buddy',
        anxietyTriggers: ['new_places']
    })),
    addListener: jest.fn(() => () => {}),
    getAuthMode: jest.fn(() => Promise.resolve('authenticated')),
}));

// Mock safe area insets
jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
    SafeAreaView: ({ children }: any) => <>{children}</>,
}));

describe('Routine Categories Dashboard Integration', () => {
    const mockSessions = [
        {
            id: 'routine_1',
            title: 'Routine One',
            subtitle: 'Routine One Sub',
            accessLevel: 'free',
            category: 'foundation',
            categoryLabel: 'Start Here',
            categoryOrder: 10,
            durationMinutes: 3,
            steps: [],
            stopIf: [],
        },
        {
            id: 'routine_2',
            title: 'Routine Two',
            subtitle: 'Routine Two Sub',
            accessLevel: 'premium',
            category: 'walk_fear',
            categoryLabel: 'Walk Fear & Outdoor Confidence',
            categoryOrder: 20,
            durationMinutes: 5,
            steps: [],
            stopIf: [],
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (SessionService.getSessions as jest.Mock).mockReturnValue(mockSessions);
    });

    test('renders category headers and subtitles on Dashboard', async () => {
        jest.spyOn(SubscriptionManager, 'useSubscription').mockReturnValue({
            isPremium: true,
            isLoading: false,
        } as any);

        const { findByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <DashboardScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // Verify "Start Here" and "Walk Fear & Outdoor Confidence" category titles
        expect(await findByText(ROUTINE_CATEGORIES.foundation.title)).toBeTruthy();
        expect(await findByText(ROUTINE_CATEGORIES.walk_fear.title)).toBeTruthy();

        // Verify subtitles
        expect(await findByText(ROUTINE_CATEGORIES.foundation.subtitle)).toBeTruthy();
        expect(await findByText(ROUTINE_CATEGORIES.walk_fear.subtitle)).toBeTruthy();
    });

    test('renders routine cards under respective categories', async () => {
        jest.spyOn(SubscriptionManager, 'useSubscription').mockReturnValue({
            isPremium: true,
            isLoading: false,
        } as any);

        const { findByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <DashboardScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        expect(await findByText('Routine One')).toBeTruthy();
        expect(await findByText('Routine Two')).toBeTruthy();
    });
});
