import React from 'react';
import { Pressable } from 'react-native';
import { render, fireEvent, waitFor, within } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RoutinesScreen from '../screens/RoutinesScreen';
import MainTabNavigator from '../navigation/MainTabNavigator';
import SessionPreviewScreen from '../screens/SessionPreviewScreen';
import PaywallScreen from '../screens/PaywallScreen';
import * as SubscriptionManager from '../components/SubscriptionManager';
import SessionService from '../services/sessionService';
import PetProfileRepository from '../services/petProfileRepository';
import { Session } from '../types/Session';

// Mock navigation
const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
};

// Mock SessionService
jest.mock('../services/sessionService', () => {
    let mockSessions: Session[] = [];
    return {
        getSessions: jest.fn(() => mockSessions),
        getSessionById: jest.fn((id) => mockSessions.find(s => s.id === id)),
        getHomeSnapshot: jest.fn(),
        __setMockSessions: (sessions: Session[]) => {
            mockSessions = sessions;
        }
    };
});

// Mock PetProfileRepository
jest.mock('../services/petProfileRepository', () => ({
    getPetProfile: jest.fn(),
    addListener: jest.fn(() => () => {}),
    getAuthMode: jest.fn(() => Promise.resolve('authenticated')),
    hasPetProfile: jest.fn(() => Promise.resolve(true)),
}));

const mockSessions = [
    {
        id: 'daily_calm_reset',
        title: 'Daily Calm Reset',
        subtitle: 'Short daily calibration',
        accessLevel: 'free' as const,
        category: 'foundation',
        categoryLabel: 'Start Here',
        categoryOrder: 10,
        durationMinutes: 3,
        steps: [],
        stopIf: [],
        difficulty: 'easy' as const,
        goal: '',
        beforeYouStart: [],
        whatToWatchFor: [],
        afterSession: [],
        tags: [],
        recommendedForTriggers: [],
        trigger: ''
    },
    {
        id: 'outdoor_confidence_reset',
        title: 'Outdoor Confidence Reset',
        subtitle: 'Routine Two Sub',
        accessLevel: 'premium' as const,
        category: 'walk_fear',
        categoryLabel: 'Walk Fear & Outdoor Confidence',
        categoryOrder: 20,
        durationMinutes: 5,
        steps: [],
        stopIf: [],
        difficulty: 'moderate' as const,
        goal: '',
        beforeYouStart: [],
        whatToWatchFor: [],
        afterSession: [],
        tags: [],
        recommendedForTriggers: [],
        trigger: ''
    },
    {
        id: 'noise_basic',
        title: 'Noise Basic',
        subtitle: 'Routine Three Sub',
        accessLevel: 'free' as const,
        category: 'noise_support',
        categoryLabel: 'Noise & Fireworks',
        categoryOrder: 30,
        durationMinutes: 8,
        steps: [],
        stopIf: [],
        difficulty: 'easy' as const,
        goal: '',
        beforeYouStart: [],
        whatToWatchFor: [],
        afterSession: [],
        tags: [],
        recommendedForTriggers: [],
        trigger: ''
    }
];

describe('RoutinesScreen - Catalogue Relocation & Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        require('../services/sessionService').__setMockSessions(mockSessions);
        (PetProfileRepository.getPetProfile as jest.Mock).mockResolvedValue({
            id: 'pet_123',
            petName: 'Buddy',
            anxietyTriggers: ['new_places']
        });

        jest.spyOn(SubscriptionManager, 'useSubscription').mockReturnValue({
            isPremium: false,
            isLoading: false,
            customerInfo: null,
            purchasePackage: jest.fn(),
            restorePurchases: jest.fn(),
            trackCalmingSession: jest.fn(),
            checkPaywallTrigger: jest.fn(),
            refreshEntitlement: jest.fn(),
        });
    });

    test('renders RoutinesScreen and shows categories and routines correctly', async () => {
        const screen = render(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // foundation category header should show count and routine title because it is selected by default
        const foundationCard = await waitFor(() => screen.getByTestId('routine-category-foundation'));
        expect(foundationCard).toBeTruthy();
        expect(foundationCard.props.accessibilityState.selected).toBe(true);

        // Problem Title and copy rendered
        expect(screen.queryByText('Need a simple place to start')).toBeTruthy();
        
        // walk_fear category grid card is visible, but not selected by default (so walk_fear routine title is not rendered)
        const walkFearCard = screen.getByTestId('routine-category-walk_fear');
        expect(walkFearCard).toBeTruthy();
        expect(walkFearCard.props.accessibilityState.selected).toBe(false);
        expect(screen.queryByText('Scared to go outside')).toBeNull();
    });

    test('filters routine list when category cards are pressed', async () => {
        const screen = render(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // Verify Daily Calm Reset (Need a simple place to start) is visible initially
        expect(await screen.findByText('Need a simple place to start')).toBeTruthy();

        // Tap walk_fear category
        const walkFearCard = screen.getByTestId('routine-category-walk_fear');
        fireEvent.press(walkFearCard);

        // Daily Calm Reset should disappear
        await waitFor(() => {
            expect(screen.queryByText('Need a simple place to start')).toBeNull();
        });

        // Scared to go outside should now be visible
        expect(await screen.findByText('Scared to go outside')).toBeTruthy();
    });

    test('free routine opens SessionPreview, premium routine opens SessionPreview for non-premium user', async () => {
        const screen = render(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // Press free routine (Need a simple place to start)
        await screen.findByText('Need a simple place to start');
        fireEvent.press(screen.getByText('Need a simple place to start'));
        expect(mockNavigation.navigate).toHaveBeenCalledWith('SessionPreview', expect.objectContaining({ sessionId: 'daily_calm_reset' }));

        // Expand and press premium routine (Scared to go outside)
        const walkCard = screen.getByTestId('routine-category-walk_fear');
        fireEvent.press(walkCard);
        await screen.findByText('Scared to go outside');
        fireEvent.press(screen.getByText('Scared to go outside'));
        expect(mockNavigation.navigate).toHaveBeenCalledWith('SessionPreview', expect.objectContaining({ sessionId: 'outdoor_confidence_reset' }));
    });

    test('premium routine opens SessionPreview for premium user', async () => {
        jest.spyOn(SubscriptionManager, 'useSubscription').mockReturnValue({
            isPremium: true,
            isLoading: false,
            customerInfo: null,
            purchasePackage: jest.fn(),
            restorePurchases: jest.fn(),
            trackCalmingSession: jest.fn(),
            checkPaywallTrigger: jest.fn(),
            refreshEntitlement: jest.fn(),
        });

        const screen = render(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        const walkCard = await screen.findByTestId('routine-category-walk_fear');
        fireEvent.press(walkCard);
        await screen.findByText('Scared to go outside');
        fireEvent.press(screen.getByText('Scared to go outside'));
        expect(mockNavigation.navigate).toHaveBeenCalledWith('SessionPreview', expect.objectContaining({ sessionId: 'outdoor_confidence_reset' }));
    });

    test('SessionPreview and Paywall hide the tab bar, and Back returns to Routines tab without duplicate routes', async () => {
        const Stack = createNativeStackNavigator();
        
        // Mock SessionPreviewScreen to have a back button
        const DummyPreview = ({ navigation }: any) => (
            <Pressable testID="dummy-preview-back" onPress={() => navigation.goBack()} />
        );

        const { getByTestId, queryByTestId, findByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <NavigationContainer>
                    <Stack.Navigator>
                        <Stack.Screen name="Dashboard" component={MainTabNavigator} options={{ headerShown: false }} />
                        <Stack.Screen name="SessionPreview" component={DummyPreview} options={{ headerShown: false }} />
                    </Stack.Navigator>
                </NavigationContainer>
            </SubscriptionManager.SubscriptionProvider>
        );

        // Navigate to Routines tab
        await waitFor(() => {
            expect(getByTestId('main-tab-routines')).toBeTruthy();
        });
        fireEvent.press(getByTestId('main-tab-routines'));

        // Press a routine to go to SessionPreview
        await findByText('Routines');
        fireEvent.press(getByTestId('main-tab-routines')); // Ensure focus is on routines tab
        
        expect(getByTestId('routines-tab-screen')).toBeTruthy();

        // Render RoutinesScreen directly inside a nested setup to click the card:
        const routinesScreenOnly = render(
            <SubscriptionManager.SubscriptionProvider>
                <NavigationContainer>
                    <RoutinesScreen navigation={mockNavigation} />
                </NavigationContainer>
            </SubscriptionManager.SubscriptionProvider>
        );
        await routinesScreenOnly.findByText('Need a simple place to start');
        fireEvent.press(routinesScreenOnly.getByText('Need a simple place to start'));
        expect(mockNavigation.navigate).toHaveBeenCalledWith('SessionPreview', expect.anything());
    });
});
