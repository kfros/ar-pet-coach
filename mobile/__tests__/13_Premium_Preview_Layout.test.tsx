import React from 'react';
import { render } from '@testing-library/react-native';
import SessionPreviewScreen from '../screens/SessionPreviewScreen';
import DashboardScreen from '../screens/DashboardScreen';
import * as SubscriptionManager from '../components/SubscriptionManager';
import SessionService from '../services/sessionService';
import { COLORS } from '../constants/Theme';

// Mock navigation and route
const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
};

const mockRoute = {
    params: {
        sessionId: 'premium_1',
        petId: 'pet_1'
    }
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
    useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
    SafeAreaView: ({ children }: any) => <>{children}</>,
}));

describe('Premium Preview Layout and Badge State', () => {
    const premiumSession = {
        id: 'premium_1',
        title: 'Premium Routine with a Very Long Title that Should Wrap Correctly',
        accessLevel: 'premium',
        durationMinutes: 5,
        subtitle: 'Premium subtitle',
        difficulty: 'moderate',
        safetyNotes: ['Note 1'],
        steps: [],
        stopIf: [],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (SessionService.getSessionById as jest.Mock).mockReturnValue(premiumSession);
        (SessionService.getSessions as jest.Mock).mockReturnValue([premiumSession]);
    });

    test('premium_badge_state_test: locked users see PREMIUM with lock', async () => {
        jest.spyOn(SubscriptionManager, 'useSubscription').mockReturnValue({
            isPremium: false,
            isLoading: false,
        } as any);

        const { findByText, queryByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <DashboardScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // find the premium routine title (it should be loaded)
        // Note: Dashboard renders sessions from getSessions()
        
        expect(await findByText('PREMIUM')).toBeTruthy();
        expect(queryByText('INCLUDED')).toBeNull();
    });

    test('premium_badge_state_test: premium users see INCLUDED with check', async () => {
        jest.spyOn(SubscriptionManager, 'useSubscription').mockReturnValue({
            isPremium: true,
            isLoading: false,
        } as any);

        const { findByText, queryByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <DashboardScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        expect(await findByText('INCLUDED')).toBeTruthy();
        expect(queryByText('PREMIUM')).toBeNull();
    });

    test('routine_preview_footer_padding_test: ScrollView has correct bottom padding', () => {
        jest.spyOn(SubscriptionManager, 'useSubscription').mockReturnValue({
            isPremium: true,
            isLoading: false,
        } as any);

        const { getByRole, UNSAFE_getByType } = render(
            <SubscriptionManager.SubscriptionProvider>
                <SessionPreviewScreen navigation={mockNavigation} route={mockRoute} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // Check ScrollView contentContainerStyle
        // In RNTL, we can check props of components
        const scrollView = UNSAFE_getByType(require('react-native').ScrollView);
        const flattenedStyle = require('react-native').StyleSheet.flatten(scrollView.props.contentContainerStyle);
        
        // insets.bottom is mocked as 20. paddingBottom = 20 + 120 = 140
        expect(flattenedStyle.paddingBottom).toBeGreaterThanOrEqual(140);
    });

    test('safety_notes_style_test: uses soft caution style', () => {
        jest.spyOn(SubscriptionManager, 'useSubscription').mockReturnValue({
            isPremium: true,
            isLoading: false,
        } as any);

        const { getByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <SessionPreviewScreen navigation={mockNavigation} route={mockRoute} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // Title should be "Before you start"
        const safetyTitle = getByText('Before you start');
        expect(safetyTitle).toBeTruthy();
        
        const titleStyle = require('react-native').StyleSheet.flatten(safetyTitle.props.style);
        expect(titleStyle.color).toBe('#9A5B00');
    });

    test('fallbacks_render_test: renders Try instead section when fallbacks exist', () => {
        const sessionWithFallbacks = {
            ...premiumSession,
            fallbacks: [
                {
                    type: 'routine',
                    routineId: 'fallback_1',
                    title: 'Fallback Routine',
                    body: 'Use this instead'
                }
            ]
        };
        (SessionService.getSessionById as jest.Mock).mockReturnValue(sessionWithFallbacks);

        const { getByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <SessionPreviewScreen navigation={mockNavigation} route={mockRoute} />
            </SubscriptionManager.SubscriptionProvider>
        );

        expect(getByText('Try instead')).toBeTruthy();
        expect(getByText('Fallback Routine')).toBeTruthy();
        expect(getByText('Use this instead')).toBeTruthy();
    });
});
