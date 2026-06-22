import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DashboardScreen from '../screens/DashboardScreen';
import * as SubscriptionManager from '../components/SubscriptionManager';
import SessionService from '../services/sessionService';
import PetProfileRepository from '../services/petProfileRepository';
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
    getStressSignsTrend: jest.fn(),
    getRecentProgress: jest.fn(),
}));

// Mock PetProfileRepository
jest.mock('../services/petProfileRepository', () => ({
    getPetProfile: jest.fn(),
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
            id: 'daily_calm_reset',
            title: 'Daily Calm Reset',
            subtitle: 'Short daily calibration',
            accessLevel: 'free',
            category: 'foundation',
            categoryLabel: 'Start Here',
            categoryOrder: 10,
            durationMinutes: 3,
            steps: [],
            stopIf: [],
        },
        {
            id: 'outdoor_confidence_reset',
            title: 'Outdoor Confidence Reset',
            subtitle: 'Routine Two Sub',
            accessLevel: 'premium',
            category: 'walk_fear',
            categoryLabel: 'Walk Fear & Outdoor Confidence',
            categoryOrder: 20,
            durationMinutes: 5,
            steps: [],
            stopIf: [],
        },
        {
            id: 'noise_basic',
            title: 'Noise Basic',
            subtitle: 'Routine Three Sub',
            accessLevel: 'free',
            category: 'noise_support',
            categoryLabel: 'Noise & Fireworks',
            categoryOrder: 30,
            durationMinutes: 8,
            steps: [],
            stopIf: [],
        }
    ];

    const mockTrendSummary = {
        status: 'easing',
        componentTitle: 'Stress Signs Trend',
        statusTitle: 'Signs are easing',
        body: 'Overall trend is positive. Keep going with daily practice!',
        helper: 'Buddy shows fewer signs during recent sessions.',
        points: [
            { id: '1', sessionId: 's1', completedAt: '2026-06-20', sequenceNumber: 1, stressSignsScore: 4, levelLabel: 'Mild', stoppedEarly: false, hasSevereSigns: false, source: 'after_checkin' },
            { id: '2', sessionId: 's2', completedAt: '2026-06-21', sequenceNumber: 2, stressSignsScore: 2, levelLabel: 'Very Calm', stoppedEarly: false, hasSevereSigns: false, source: 'after_checkin' }
        ],
        latestScore: 2,
        previousScore: 4,
        averageDelta: -2,
        latestCompletedAt: '2026-06-21',
        minRequiredCheckins: 2,
        hasEnoughData: true,
        legend: 'S1, S2 represent session order.'
    };

    const mockRecentProgress = {
        latestScore: 8,
        latestLevelLabel: 'High',
        hasSevereSigns: true,
        severeSignsNote: 'Heavy panting and trembling.',
        details: ['Check-in 1: High signs', 'Check-in 2: Mild signs']
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (SessionService.getSessions as jest.Mock).mockReturnValue(mockSessions);
        (SessionService.getStressSignsTrend as jest.Mock).mockResolvedValue(mockTrendSummary);
        (SessionService.getRecentProgress as jest.Mock).mockResolvedValue(mockRecentProgress);
        (PetProfileRepository.getPetProfile as jest.Mock).mockResolvedValue({
            id: 'pet_123',
            petName: 'Buddy',
            anxietyTriggers: ['new_places']
        });

        jest.spyOn(SubscriptionManager, 'useSubscription').mockReturnValue({
            isPremium: true,
            isLoading: false,
        } as any);
    });

    test('initializes expanded categories correctly (Start Here & recommended expanded, others collapsed)', async () => {
        const screen = render(
            <SubscriptionManager.SubscriptionProvider>
                <DashboardScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // foundation and walk_fear categories should show "Hide" because they are expanded
        const foundationHeader = await waitFor(() => screen.getByTestId('category-header-foundation'));
        expect(foundationHeader).toBeTruthy();
        expect(screen.queryByText('Start Here · 1 routine')).toBeTruthy();
        expect(screen.queryByText('Walk Fear & Outdoor Confidence · 1 routine')).toBeTruthy();
        expect(screen.queryByText('Noise & Fireworks · 1 routine')).toBeTruthy();

        // Also verify routine card visibility:
        // Expanded ones: Daily Calm Reset and Outdoor Confidence Reset must be visible
        expect(await screen.findByText('Daily Calm Reset')).toBeTruthy();
        expect((await screen.findAllByText('Outdoor Confidence Reset')).length).toBeGreaterThan(0);

        // Collapsed ones: Noise Basic must NOT be visible
        expect(screen.queryByText('Noise Basic')).toBeNull();
    });

    test('collapses and expands categories when headers are pressed', async () => {
        const screen = render(
            <SubscriptionManager.SubscriptionProvider>
                <DashboardScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // Verify Daily Calm Reset is visible (foundation expanded by default)
        expect(await screen.findByText('Daily Calm Reset')).toBeTruthy();

        // Collapse foundation category
        const foundationHeader = screen.getByTestId('category-header-foundation');
        fireEvent.press(foundationHeader);

        // Daily Calm Reset should disappear
        await waitFor(() => {
            expect(screen.queryByText('Daily Calm Reset')).toBeNull();
        });

        // Noise Basic is hidden by default. Let's expand Noise & Fireworks
        expect(screen.queryByText('Noise Basic')).toBeNull();
        const noiseHeader = screen.getByTestId('category-header-noise_support');
        fireEvent.press(noiseHeader);

        // Noise Basic should now be visible
        expect(await screen.findByText('Noise Basic')).toBeTruthy();
    });

    test('Stress Signs Trend compact mode defaults and details toggle', async () => {
        const screen = render(
            <SubscriptionManager.SubscriptionProvider>
                <DashboardScreen navigation={mockNavigation} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // Verify title, status title, helper sentence, and details button are visible
        expect(await screen.findByText('Stress Signs Trend')).toBeTruthy();
        expect(await screen.findByText('Signs are easing')).toBeTruthy();
        expect(await screen.findByText('Buddy shows fewer signs during recent sessions.')).toBeTruthy();

        // Severe warning remains visible
        expect(await screen.findByText(/Heavy panting and trembling/)).toBeTruthy();

        // Body text and legend should not be visible in compact mode
        expect(screen.queryByText('Overall trend is positive. Keep going with daily practice!')).toBeNull();
        expect(screen.queryByText(/represent session order/)).toBeNull();
        
        // Details container should have height: 0
        const detailsContainer = await waitFor(() => screen.getByTestId('expanded-trend-details'));
        expect(detailsContainer.props.style).toContainEqual({ height: 0, opacity: 0, overflow: 'hidden', marginTop: 0, padding: 0 });

        // Press details button
        const detailsButton = screen.getByTestId('trend-details-toggle');
        fireEvent.press(detailsButton);

        // Body, legend and progress details should now be visible
        expect(await screen.findByText('Overall trend is positive. Keep going with daily practice!')).toBeTruthy();
        expect(await screen.findByText('Check-in 1: High signs')).toBeTruthy();
        expect(await screen.findByText('Check-in 2: Mild signs')).toBeTruthy();

        // Severe warning is still visible in expanded mode
        expect(screen.queryByText(/Heavy panting and trembling/)).toBeTruthy();
        expect(detailsContainer.props.style).not.toContainEqual({ height: 0, opacity: 0, overflow: 'hidden', marginTop: 0, padding: 0 });

        // Press details button again to collapse
        fireEvent.press(detailsButton);

        // Should be hidden again
        await waitFor(() => {
            expect(detailsContainer.props.style).toContainEqual({ height: 0, opacity: 0, overflow: 'hidden', marginTop: 0, padding: 0 });
        });
        // Severe warning remains visible
        expect(screen.queryByText(/Heavy panting and trembling/)).toBeTruthy();
    });
});
