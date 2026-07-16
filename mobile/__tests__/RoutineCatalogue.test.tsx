import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RoutinesScreen from '../screens/RoutinesScreen';
import SessionPreviewScreen from '../screens/SessionPreviewScreen';
import MainTabNavigator from '../navigation/MainTabNavigator';
import PaywallScreen from '../screens/PaywallScreen';
import * as SubscriptionManager from '../components/SubscriptionManager';
import SessionService from '../services/sessionService';
import PetProfileRepository from '../services/petProfileRepository';
import { getRoutineCataloguePresentation } from '../appContent/routineCataloguePresentation';
import { Session } from '../types/Session';

// Mock PetProfileRepository
jest.mock('../services/petProfileRepository', () => ({
    getPetProfile: jest.fn(),
    addListener: jest.fn(() => () => {}),
    getAuthMode: jest.fn(() => Promise.resolve('authenticated')),
    hasPetProfile: jest.fn(() => Promise.resolve(true)),
}));

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

const mockSessionsList: Session[] = [
    {
        id: 'daily_calm_reset',
        accessLevel: 'free',
        title: 'Daily Calm Reset',
        subtitle: 'A short everyday routine.',
        durationMinutes: 3,
        difficulty: 'easy',
        trigger: 'general_calm',
        category: 'foundation',
        steps: [],
        goal: '',
        beforeYouStart: [],
        whatToWatchFor: [],
        stopIf: [],
        afterSession: [],
        tags: [],
        recommendedForTriggers: [],
    },
    {
        id: 'outdoor_confidence_reset',
        accessLevel: 'premium',
        title: 'Outdoor Confidence Reset',
        subtitle: 'Practice at the doorway.',
        durationMinutes: 5,
        difficulty: 'moderate',
        trigger: 'new_places',
        category: 'walk_fear',
        steps: [],
        goal: '',
        beforeYouStart: [],
        whatToWatchFor: [],
        stopIf: [],
        afterSession: [],
        tags: [],
        recommendedForTriggers: [],
    },
    {
        id: 'fireworks_loud_noises_basic',
        accessLevel: 'free',
        title: 'Thunder & Fireworks Safe Space',
        subtitle: 'Safe-space support.',
        durationMinutes: 5,
        difficulty: 'easy',
        trigger: 'loud_noises',
        category: 'noise_support',
        steps: [],
        goal: '',
        beforeYouStart: [],
        whatToWatchFor: [],
        stopIf: [],
        afterSession: [],
        tags: [],
        recommendedForTriggers: [],
    },
    // Category walk_fear has a second routine to verify counts/rendering
    {
        id: 'night_walk_confidence',
        accessLevel: 'premium',
        title: 'Night Walk Confidence',
        subtitle: 'Night walks.',
        durationMinutes: 6,
        difficulty: 'moderate',
        trigger: 'darkness',
        category: 'walk_fear',
        steps: [],
        goal: '',
        beforeYouStart: [],
        whatToWatchFor: [],
        stopIf: [],
        afterSession: [],
        tags: [],
        recommendedForTriggers: [],
    },
    {
        id: 'fireworks_prep_routine',
        accessLevel: 'premium',
        title: 'Fireworks Prep: Calm-Day Practice',
        subtitle: 'Calm-day preparation.',
        durationMinutes: 10,
        difficulty: 'moderate',
        trigger: 'fireworks',
        category: 'noise_support',
        steps: [],
        goal: '',
        beforeYouStart: [],
        whatToWatchFor: [],
        stopIf: [],
        afterSession: [],
        tags: [],
        recommendedForTriggers: [],
    },
    {
        id: 'post_fireworks_recovery_home',
        accessLevel: 'premium',
        title: 'Post-Fireworks Recovery at Home',
        subtitle: 'Post-noise recovery.',
        durationMinutes: 15,
        difficulty: 'moderate',
        trigger: 'fireworks',
        category: 'noise_support',
        steps: [],
        goal: '',
        beforeYouStart: [],
        whatToWatchFor: [],
        stopIf: [],
        afterSession: [],
        tags: [],
        recommendedForTriggers: [],
    }
];

describe('RoutineCatalogue - Dedicated Redesign', () => {
    const mockNavigation = {
        navigate: jest.fn(),
        goBack: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        require('../services/sessionService').__setMockSessions(mockSessionsList);
        (PetProfileRepository.getPetProfile as jest.Mock).mockResolvedValue({
            id: 'test-pet-123',
            petName: 'Buddy'
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

    test('getRoutineCataloguePresentation does not mutate Session, resolves exact copy, fallbacks safely', () => {
        const session = { ...mockSessionsList[0] };
        const copy = getRoutineCataloguePresentation(session);

        expect(copy.problemTitle).toBe("Need a simple place to start");
        expect(copy.problemSummary).toBe("Try a short everyday calm practice.");

        // Non-mutation check
        expect(session.title).toBe('Daily Calm Reset');

        // Missing metadata fallback
        const unknownSession: Session = {
            id: 'unknown_id',
            title: 'Custom Title',
            subtitle: 'Custom Subtitle',
            accessLevel: 'free',
            steps: [],
            goal: '',
            beforeYouStart: [],
            whatToWatchFor: [],
            stopIf: [],
            afterSession: [],
            tags: [],
            recommendedForTriggers: [],
            trigger: '',
            durationMinutes: 0,
            difficulty: 'easy'
        };
        const fallbackCopy = getRoutineCataloguePresentation(unknownSession);
        expect(fallbackCopy.problemTitle).toBe('Custom Title');
        expect(fallbackCopy.problemSummary).toBe('Custom Subtitle');
    });

    test('renders category metadata in ROUTINE_CATEGORIES order with routine counts and pluralization', async () => {
        const { getByTestId, getByText, getAllByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        await waitFor(() => {
            expect(getByTestId('routine-category-foundation')).toBeTruthy();
            expect(getByTestId('routine-category-walk_fear')).toBeTruthy();
            expect(getByTestId('routine-category-noise_support')).toBeTruthy();
        });

        // Pluralization check (foundation: 1, walk_fear: 2, noise_support: 3)
        expect(getAllByText('1 routine').length).toBe(1); // foundation
        expect(getByText('2 routines')).toBeTruthy(); // walk_fear
        expect(getByText('3 routines')).toBeTruthy(); // noise_support
    });

    test('foundation category is selected initially', async () => {
        const { getByTestId, getAllByText, getByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        await waitFor(() => {
            const foundationCard = getByTestId('routine-category-foundation');
            expect(foundationCard.props.accessibilityState.selected).toBe(true);

            // Active category problemTitle is used as list heading (Grid card + List heading)
            expect(getAllByText('Not sure where to start?').length).toBe(2);

            // Daily Calm Reset is rendered
            expect(getByText('Need a simple place to start')).toBeTruthy();
        });
    });

    test('selecting a category filters list and renders problem titles/summaries', async () => {
        const { getByTestId, getAllByText, getByText, queryByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        await waitFor(() => {
            expect(getByTestId('routine-category-walk_fear')).toBeTruthy();
        });

        // Tap "Going outside feels difficult" (walk_fear)
        fireEvent.press(getByTestId('routine-category-walk_fear'));

        // Heading updates and display filters walk_fear routine asynchronously
        await waitFor(() => {
            expect(getAllByText('Going outside feels difficult').length).toBe(2);
            expect(getByText('Scared to go outside')).toBeTruthy();
            expect(queryByText('Need a simple place to start')).toBeNull();
        });
    });

    test('Show all routines toggle behaves as a reversible toggle and preserves selections', async () => {
        const { getByTestId, getByText, queryByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        await waitFor(() => {
            expect(getByTestId('routine-category-all')).toBeTruthy();
        });

        // 1. Initial State: "Show all routines" toggle reads Show all routines, selectedCategory is foundation
        const toggleBtn = getByTestId('routine-category-all');
        const foundationCard = getByTestId('routine-category-foundation');
        
        expect(within(toggleBtn).getByText('Show all routines')).toBeTruthy();
        expect(toggleBtn.props.accessibilityState.selected).toBe(false);
        expect(foundationCard.props.accessibilityState.selected).toBe(true);

        // 2. Select walk_fear first
        fireEvent.press(getByTestId('routine-category-walk_fear'));
        const walkFearCard = getByTestId('routine-category-walk_fear');
        await waitFor(() => {
            expect(walkFearCard.props.accessibilityState.selected).toBe(true);
        });

        // 3. Press Show all routines -> toggles all routines grouped vertically
        fireEvent.press(toggleBtn);

        await waitFor(() => {
            expect(within(toggleBtn).getByText('Back to selected category')).toBeTruthy();
            expect(toggleBtn.props.accessibilityState.selected).toBe(true);
            expect(toggleBtn.props.accessibilityLabel).toBe('Back to Going outside feels difficult');
            
            // Category grid cards expose selected = false when showAllRoutines is true
            expect(walkFearCard.props.accessibilityState.selected).toBe(false);

            expect(getByText('All routines')).toBeTruthy();

            // Check that all routines are visible
            expect(getByText('Need a simple place to start')).toBeTruthy();
            expect(getByText('Scared to go outside')).toBeTruthy();
            expect(getByText('Night walks feel difficult')).toBeTruthy();
        });

        // 4. Press toggle again -> exits all-routines view, restores the walk_fear category selection
        fireEvent.press(toggleBtn);

        await waitFor(() => {
            expect(within(toggleBtn).getByText('Show all routines')).toBeTruthy();
            expect(toggleBtn.props.accessibilityState.selected).toBe(false);

            // Remembered category is selected again
            expect(walkFearCard.props.accessibilityState.selected).toBe(true);
            expect(getByText('Scared to go outside')).toBeTruthy();
            expect(queryByText('Need a simple place to start')).toBeNull();
        });

        // 5. Toggle Show all again, then click a category card -> exits all-routines immediately
        fireEvent.press(toggleBtn);
        await waitFor(() => {
            expect(toggleBtn.props.accessibilityState.selected).toBe(true);
        });

        const foundationCardBtn = getByTestId('routine-category-foundation');
        fireEvent.press(foundationCardBtn);

        await waitFor(() => {
            expect(toggleBtn.props.accessibilityState.selected).toBe(false);
            expect(within(toggleBtn).getByText('Show all routines')).toBeTruthy();
            expect(foundationCardBtn.props.accessibilityState.selected).toBe(true);
            expect(getByText('Need a simple place to start')).toBeTruthy();
            expect(queryByText('Scared to go outside')).toBeNull();
        });
    });

    test('renders FREE, locked PREMIUM, and included PREMIUM badges with correct icon semantics', async () => {
        // 1. Non-premium user
        const { getByTestId, rerender } = render(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        await waitFor(() => {
            expect(getByTestId('routine-card-daily_calm_reset')).toBeTruthy();
        });

        const freeCard = getByTestId('routine-card-daily_calm_reset');
        expect(within(freeCard).getByText('FREE')).toBeTruthy();

        // Select walk_fear to check locked Premium routine
        fireEvent.press(getByTestId('routine-category-walk_fear'));
        
        await waitFor(() => {
            const lockedCard = getByTestId('routine-card-outdoor_confidence_reset');
            expect(within(lockedCard).getByText('PREMIUM')).toBeTruthy();
        });

        // 2. Premium user
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

        rerender(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // Select walk_fear again to check included Premium routine
        await waitFor(() => {
            expect(getByTestId('routine-category-walk_fear')).toBeTruthy();
        });
        fireEvent.press(getByTestId('routine-category-walk_fear'));
        
        await waitFor(() => {
            const includedCard = getByTestId('routine-card-outdoor_confidence_reset');
            expect(within(includedCard).getByText('INCLUDED')).toBeTruthy();
        });
    });

    test('locked Premium cards and free/included cards route to SessionPreview', async () => {
        // 1. Non-premium user
        const { getByTestId, rerender } = render(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        await waitFor(() => {
            expect(getByTestId('routine-card-daily_calm_reset')).toBeTruthy();
        });

        // Tap free routine -> SessionPreview
        fireEvent.press(getByTestId('routine-card-daily_calm_reset'));
        expect(mockNavigation.navigate).toHaveBeenCalledWith('SessionPreview', { sessionId: 'daily_calm_reset', petId: 'test-pet-123' });

        // Tap locked Premium -> SessionPreview
        fireEvent.press(getByTestId('routine-category-walk_fear'));
        await waitFor(() => {
            expect(getByTestId('routine-card-outdoor_confidence_reset')).toBeTruthy();
        });
        fireEvent.press(getByTestId('routine-card-outdoor_confidence_reset'));
        expect(mockNavigation.navigate).toHaveBeenCalledWith('SessionPreview', { sessionId: 'outdoor_confidence_reset', petId: 'test-pet-123' });

        // 2. Premium user
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

        rerender(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // Tap included Premium -> SessionPreview
        await waitFor(() => {
            expect(getByTestId('routine-category-walk_fear')).toBeTruthy();
        });
        fireEvent.press(getByTestId('routine-category-walk_fear'));
        await waitFor(() => {
            expect(getByTestId('routine-card-outdoor_confidence_reset')).toBeTruthy();
        });
        fireEvent.press(getByTestId('routine-card-outdoor_confidence_reset'));
        expect(mockNavigation.navigate).toHaveBeenCalledWith('SessionPreview', { sessionId: 'outdoor_confidence_reset', petId: 'test-pet-123' });
    });

    test('subscription-loading state safeguards Premium routine routing and renders CHECKING ACCESS badge', async () => {
        jest.spyOn(SubscriptionManager, 'useSubscription').mockReturnValue({
            isPremium: false,
            isLoading: true, // loading
            customerInfo: null,
            purchasePackage: jest.fn(),
            restorePurchases: jest.fn(),
            trackCalmingSession: jest.fn(),
            checkPaywallTrigger: jest.fn(),
            refreshEntitlement: jest.fn(),
        });

        const { getByTestId, queryByTestId } = render(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        await waitFor(() => {
            expect(getByTestId('routine-category-walk_fear')).toBeTruthy();
        });

        fireEvent.press(getByTestId('routine-category-walk_fear'));
        
        await waitFor(() => {
            expect(getByTestId('routine-card-outdoor_confidence_reset')).toBeTruthy();
        });
        const premiumCard = getByTestId('routine-card-outdoor_confidence_reset');

        // Check loading accessibility and copy properties
        expect(premiumCard.props.accessibilityState.disabled).toBe(true);
        
        expect(within(premiumCard).getByText('CHECKING ACCESS')).toBeTruthy();
        expect(within(premiumCard).queryByText('INCLUDED')).toBeNull();
        expect(within(premiumCard).queryByText('PREMIUM')).toBeNull();

        // Pressing card should do nothing
        fireEvent.press(premiumCard);
        expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    test('missing profile displays Add First Pet and navigates to PetProfileStepper', async () => {
        (PetProfileRepository.getPetProfile as jest.Mock).mockResolvedValue(null);

        const { getByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        await waitFor(() => {
            expect(getByText('Add First Pet')).toBeTruthy();
        });

        fireEvent.press(getByText('Add First Pet'));
        expect(mockNavigation.navigate).toHaveBeenCalledWith('PetProfileStepper');
    });

    test('unknown session category defaults to foundation for catalog presentation and resolves fallback copy', async () => {
        const unknownCatSession: Session = {
            id: 'unknown_cat_routine',
            accessLevel: 'free',
            title: 'Unknown Title',
            subtitle: 'Unknown Subtitle',
            durationMinutes: 4,
            difficulty: 'easy',
            trigger: 'unknown_trigger',
            category: 'nonexistent_category_here', // Unknown category
            steps: [],
            goal: '',
            beforeYouStart: [],
            whatToWatchFor: [],
            stopIf: [],
            afterSession: [],
            tags: [],
            recommendedForTriggers: []
        };
        
        require('../services/sessionService').__setMockSessions([
            mockSessionsList[0], // daily_calm_reset
            unknownCatSession
        ]);

        const { getByTestId, getByText, getAllByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        await waitFor(() => {
            // Count of routines in foundation is now 2 (daily_calm_reset + unknownCatSession)
            expect(getByText('2 routines')).toBeTruthy();
            
            // Check fallback copy resolution for the unknown presentation metadata
            expect(getByText('Unknown Title')).toBeTruthy();
            expect(getByText('Unknown Subtitle')).toBeTruthy();
        });
    });

    test('selection fallback picks foundation if selectedCategory becomes invalid', async () => {
        // Render screen with initial categories
        const { getByTestId, getByText, rerender } = render(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        await waitFor(() => {
            expect(getByTestId('routine-category-walk_fear')).toBeTruthy();
        });

        // Select walk_fear
        fireEvent.press(getByTestId('routine-category-walk_fear'));

        await waitFor(() => {
            expect(getByTestId('routine-category-walk_fear').props.accessibilityState.selected).toBe(true);
        });

        // Now, update sessions list such that walk_fear becomes empty
        require('../services/sessionService').__setMockSessions([
            mockSessionsList[0] // Only daily_calm_reset (foundation)
        ]);

        // Rerender the screen
        rerender(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // It should fallback to foundation
        await waitFor(() => {
            expect(getByTestId('routine-category-foundation').props.accessibilityState.selected).toBe(true);
            expect(getByText('Need a simple place to start')).toBeTruthy();
        });
    });

    // Root-stack Integration Test inside the main describe block to share mock configurations safely
    test('Select walk_fear, open routine, tab bar hides, back preserves category', async () => {
        // Mock premium user so walk_fear routine opens SessionPreview
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

        const Stack = createNativeStackNavigator();

        const { getByTestId, queryByTestId, findByText, getByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <NavigationContainer>
                    <Stack.Navigator>
                        <Stack.Screen name="Dashboard" component={MainTabNavigator} options={{ headerShown: false }} />
                        <Stack.Screen name="SessionPreview" component={SessionPreviewScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="Paywall" component={PaywallScreen} options={{ headerShown: false }} />
                    </Stack.Navigator>
                </NavigationContainer>
            </SubscriptionManager.SubscriptionProvider>
        );

        // 1. Initial State: navigate to Routines tab
        await waitFor(() => {
            expect(getByTestId('main-tab-routines')).toBeTruthy();
        });
        fireEvent.press(getByTestId('main-tab-routines'));

        // 2. Select walk_fear category
        const walkFearGridBtn = await waitFor(() => getByTestId('routine-category-walk_fear'));
        fireEvent.press(walkFearGridBtn);
        
        await waitFor(() => {
            expect(walkFearGridBtn.props.accessibilityState.selected).toBe(true);
        });

        // 3. Open routine in SessionPreview
        const routineCard = await waitFor(() => getByTestId('routine-card-outdoor_confidence_reset'));
        fireEvent.press(routineCard);

        // 4. Confirm SessionPreview is open, and tab bar is hidden
        await waitFor(() => {
            expect(getByText('Outdoor Confidence Reset')).toBeTruthy();
        });
        expect(queryByTestId('main-tab-routines')).toBeNull();

        // 5. Click Back
        const backBtn = getByTestId('preview-back-button');
        fireEvent.press(backBtn);

        // 6. Confirm existing Routines tab screen returns
        const routinesTab = await waitFor(() => getByTestId('main-tab-routines'));
        expect(routinesTab).toBeTruthy();

        // 7. Confirm selected category is preserved (still walk_fear)
        const walkFearGridBtnAfter = getByTestId('routine-category-walk_fear');
        expect(walkFearGridBtnAfter.props.accessibilityState.selected).toBe(true);
    });
});
