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
import {
    getNoiseRoutinePhasePresentation,
    getRoutineCataloguePresentation
} from '../appContent/routineCataloguePresentation';
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

const mockSessionsWithUnmappedList: Session[] = [
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
        id: 'post_fireworks_walk_rebuild',
        accessLevel: 'premium',
        title: 'Post-Fireworks Walk Rebuild',
        subtitle: 'Rebuilding doorway confidence.',
        durationMinutes: 10,
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
    // The three mapped Noise & Fireworks routines (deliberately out of order to test sorting)
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
    // Two unmapped Noise & Fireworks routines to verify stable ordering at the end
    {
        id: 'unmapped_noise_routine_one',
        accessLevel: 'free',
        title: 'Unmapped Noise One',
        subtitle: 'Unmapped one.',
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
    {
        id: 'unmapped_noise_routine_two',
        accessLevel: 'premium',
        title: 'Unmapped Noise Two',
        subtitle: 'Unmapped two.',
        durationMinutes: 7,
        difficulty: 'moderate',
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
    }
];

describe('NoiseRoutinePhases - Presentation Gating & Ordering', () => {
    const mockNavigation = {
        navigate: jest.fn(),
        goBack: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        require('../services/sessionService').__setMockSessions(mockSessionsWithUnmappedList);
        (PetProfileRepository.getPetProfile as jest.Mock).mockResolvedValue({
            id: 'test-pet-456',
            petName: 'Rocky'
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

    test('Resolver returns exact DURING, BEFORE, and AFTER metadata and handles unmapped and malformed values safely', () => {
        // 1. DURING metadata resolver check
        const duringSession = mockSessionsWithUnmappedList.find(s => s.id === 'fireworks_loud_noises_basic')!;
        const duringPhase = getNoiseRoutinePhasePresentation(duringSession);
        expect(duringPhase).toBeDefined();
        expect(duringPhase!.phase).toBe('during');
        expect(duringPhase!.label).toBe('DURING');
        expect(duringPhase!.timingInstruction).toBe('Use while thunder or fireworks are happening or may start again soon.');
        expect(duringPhase!.phaseOrder).toBe(10);

        // 2. BEFORE metadata resolver check
        const beforeSession = mockSessionsWithUnmappedList.find(s => s.id === 'fireworks_prep_routine')!;
        const beforePhase = getNoiseRoutinePhasePresentation(beforeSession);
        expect(beforePhase).toBeDefined();
        expect(beforePhase!.phase).toBe('before');
        expect(beforePhase!.label).toBe('BEFORE');
        expect(beforePhase!.timingInstruction).toBe('Use only on a calm, quiet day before a noisy event.');
        expect(beforePhase!.phaseOrder).toBe(20);

        // 3. AFTER metadata resolver check
        const afterSession = mockSessionsWithUnmappedList.find(s => s.id === 'post_fireworks_recovery_home')!;
        const afterPhase = getNoiseRoutinePhasePresentation(afterSession);
        expect(afterPhase).toBeDefined();
        expect(afterPhase!.phase).toBe('after');
        expect(afterPhase!.label).toBe('AFTER');
        expect(afterPhase!.timingInstruction).toBe('Use after the noise has stopped or returned to its usual level.');
        expect(afterPhase!.phaseOrder).toBe(30);

        // 4. Null checks for unmapped routines
        const foundationSession = mockSessionsWithUnmappedList.find(s => s.id === 'daily_calm_reset')!;
        expect(getNoiseRoutinePhasePresentation(foundationSession)).toBeNull();

        const walkFearSession = mockSessionsWithUnmappedList.find(s => s.id === 'post_fireworks_walk_rebuild')!;
        expect(getNoiseRoutinePhasePresentation(walkFearSession)).toBeNull();

        const unmappedNoiseSession = mockSessionsWithUnmappedList.find(s => s.id === 'unmapped_noise_routine_one')!;
        expect(getNoiseRoutinePhasePresentation(unmappedNoiseSession)).toBeNull();

        // 5. Non-mutation check
        const beforeSessionClone = { ...beforeSession };
        getNoiseRoutinePhasePresentation(beforeSessionClone);
        expect(beforeSessionClone.title).toBe('Fireworks Prep: Calm-Day Practice');
        expect(beforeSessionClone.category).toBe('noise_support');
        expect(beforeSessionClone.accessLevel).toBe('premium');
    });

    test('renders exact helper copy and DURING → BEFORE → AFTER ordering in noise_support category', async () => {
        const { getByTestId, getByText, getAllByTestId } = render(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        await waitFor(() => {
            expect(getByTestId('routine-category-noise_support')).toBeTruthy();
        });

        // Tap noise_support category card
        fireEvent.press(getByTestId('routine-category-noise_support'));

        await waitFor(() => {
            // Timing helper is visible
            expect(getByText('Choose the timing that matches your situation.')).toBeTruthy();

            // Verify order of cards rendered in the DOM: DURING first, then BEFORE, then AFTER
            const cards = getAllByTestId(/^routine-card-/);
            const cardIds = cards.map(c => c.props.testID);

            // Expect mapped noise routines in DURING (10) -> BEFORE (20) -> AFTER (30) order
            const duringIdx = cardIds.indexOf('routine-card-fireworks_loud_noises_basic');
            const beforeIdx = cardIds.indexOf('routine-card-fireworks_prep_routine');
            const afterIdx = cardIds.indexOf('routine-card-post_fireworks_recovery_home');

            expect(duringIdx).toBeLessThan(beforeIdx);
            expect(beforeIdx).toBeLessThan(afterIdx);

            // Two unmapped noise routines must follow at the end in their original relative order
            const unmappedOneIdx = cardIds.indexOf('routine-card-unmapped_noise_routine_one');
            const unmappedTwoIdx = cardIds.indexOf('routine-card-unmapped_noise_routine_two');

            expect(afterIdx).toBeLessThan(unmappedOneIdx);
            expect(unmappedOneIdx).toBeLessThan(unmappedTwoIdx);

            // Verify unmapped noise routines do not have phase elements
            const cardUnmappedOne = getByTestId('routine-card-unmapped_noise_routine_one');
            const cardUnmappedTwo = getByTestId('routine-card-unmapped_noise_routine_two');
            expect(within(cardUnmappedOne).queryByTestId(/^routine-phase-/)).toBeNull();
            expect(within(cardUnmappedTwo).queryByTestId(/^routine-phase-/)).toBeNull();
        });
    });

    test('Show all view renders timing helper and same phase ordering', async () => {
        const { getByTestId, getByText, getAllByTestId } = render(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        await waitFor(() => {
            expect(getByTestId('routine-category-all')).toBeTruthy();
        });

        // Tap Show all routines
        fireEvent.press(getByTestId('routine-category-all'));

        await waitFor(() => {
            expect(getByText('All routines')).toBeTruthy();
            expect(getByTestId('routine-section-noise_support')).toBeTruthy();

            // Timing helper is visible inside Noise & Fireworks section
            const noiseSection = getByTestId('routine-section-noise_support');
            expect(within(noiseSection).getByText('Choose the timing that matches your situation.')).toBeTruthy();

            // DURING → BEFORE → AFTER ordering inside noise section
            const cardsInSection = within(noiseSection).getAllByTestId(/^routine-card-/);
            const cardIds = cardsInSection.map(c => c.props.testID);

            const duringIdx = cardIds.indexOf('routine-card-fireworks_loud_noises_basic');
            const beforeIdx = cardIds.indexOf('routine-card-fireworks_prep_routine');
            const afterIdx = cardIds.indexOf('routine-card-post_fireworks_recovery_home');

            expect(duringIdx).toBeLessThan(beforeIdx);
            expect(beforeIdx).toBeLessThan(afterIdx);
        });
    });

    test('no other category has a timing helper or phase elements', async () => {
        const { getByTestId, queryByText, queryAllByTestId } = render(
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
            // No timing helper
            expect(queryByText('Choose the timing that matches your situation.')).toBeNull();

            // Mapped cards in other categories have no phase badges/blocks
            const cards = queryAllByTestId(/^routine-card-/);
            cards.forEach(card => {
                expect(within(card).queryByTestId(/^routine-phase-/)).toBeNull();
            });
        });
    });

    test('timing helper is removed when switching away from noise_support', async () => {
        const { getByTestId, queryByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        await waitFor(() => {
            expect(getByTestId('routine-category-noise_support')).toBeTruthy();
        });

        // 1. Select noise_support
        fireEvent.press(getByTestId('routine-category-noise_support'));
        await waitFor(() => {
            expect(queryByText('Choose the timing that matches your situation.')).toBeTruthy();
        });

        // 2. Select walk_fear
        fireEvent.press(getByTestId('routine-category-walk_fear'));
        await waitFor(() => {
            expect(queryByText('Choose the timing that matches your situation.')).toBeNull();
        });
    });

    test('renders exact accessibility labels for all phase-entitlement states', async () => {
        // 1. Non-Premium: DURING free card, BEFORE/AFTER locked cards
        const { getByTestId, rerender } = render(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        await waitFor(() => {
            expect(getByTestId('routine-category-noise_support')).toBeTruthy();
        });
        fireEvent.press(getByTestId('routine-category-noise_support'));

        await waitFor(() => {
            const duringCard = getByTestId('routine-card-fireworks_loud_noises_basic');
            expect(duringCard.props.accessibilityLabel).toBe('During. Thunder or fireworks are happening. View routine.');

            const beforeCard = getByTestId('routine-card-fireworks_prep_routine');
            expect(beforeCard.props.accessibilityLabel).toBe('Before. Prepare before fireworks. View routine preview. Premium required to start.');
        });

        // 2. Premium-Entitled: BEFORE/AFTER included cards
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

        await waitFor(() => {
            const beforeCard = getByTestId('routine-card-fireworks_prep_routine');
            expect(beforeCard.props.accessibilityLabel).toBe('Before. Prepare before fireworks. View routine.');

            const afterCard = getByTestId('routine-card-post_fireworks_recovery_home');
            expect(afterCard.props.accessibilityLabel).toBe('After. Recovering after fireworks. View routine.');
        });

        // 3. Subscription Loading: CHECKING ACCESS
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

        rerender(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        await waitFor(() => {
            const beforeCard = getByTestId('routine-card-fireworks_prep_routine');
            expect(beforeCard.props.accessibilityLabel).toBe('Before. Prepare before fireworks. Checking access.');

            const afterCard = getByTestId('routine-card-post_fireworks_recovery_home');
            expect(afterCard.props.accessibilityLabel).toBe('After. Recovering after fireworks. Checking access.');
        });
    });

    test('phase block is informational only and has no button role or separate press handler', async () => {
        const { getByTestId } = render(
            <SubscriptionManager.SubscriptionProvider>
                <RoutinesScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        await waitFor(() => {
            expect(getByTestId('routine-category-noise_support')).toBeTruthy();
        });
        fireEvent.press(getByTestId('routine-category-noise_support'));

        await waitFor(() => {
            const duringPhaseBlock = getByTestId('routine-phase-fireworks_loud_noises_basic');
            expect(duringPhaseBlock.props.accessibilityRole).toBeUndefined();
            expect(duringPhaseBlock.props.onPress).toBeUndefined();
        });
    });
});

describe('Root-Stack Integration - Phase Navigation and Preserved Selection', () => {
    test('Open DURING, BEFORE (unlocked), AFTER (unlocked) to Preview and verify category preservation', async () => {
        // Mock premium user so all routines open SessionPreview
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

        // 1. Navigate to Routines tab
        await waitFor(() => {
            expect(getByTestId('main-tab-routines')).toBeTruthy();
        });
        fireEvent.press(getByTestId('main-tab-routines'));

        // 2. Select noise_support
        const noiseBtn = await waitFor(() => getByTestId('routine-category-noise_support'));
        fireEvent.press(noiseBtn);
        
        await waitFor(() => {
            expect(noiseBtn.props.accessibilityState.selected).toBe(true);
        });

        // 3. Open BEFORE routine -> SessionPreview (verifies canonical title "Fireworks Prep: Calm-Day Practice" resolves correctly)
        const beforeCard = await waitFor(() => getByTestId('routine-card-fireworks_prep_routine'));
        fireEvent.press(beforeCard);

        await waitFor(() => {
            expect(getByText('Fireworks Prep: Calm-Day Practice')).toBeTruthy();
        });
        expect(queryByTestId('main-tab-routines')).toBeNull();

        // 4. Back -> confirm selected category noise_support is preserved
        const backBtn = getByTestId('preview-back-button');
        fireEvent.press(backBtn);

        await waitFor(() => {
            expect(getByTestId('main-tab-routines')).toBeTruthy();
        });
        const noiseBtnAfter = getByTestId('routine-category-noise_support');
        expect(noiseBtnAfter.props.accessibilityState.selected).toBe(true);
    });
});
