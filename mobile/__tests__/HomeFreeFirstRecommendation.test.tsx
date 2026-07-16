import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '../types/Session';
import { getHomeRecommendation } from '../services/profileRecommendationService';
import DashboardScreen from '../screens/DashboardScreen';
import { SubscriptionProvider } from '../components/SubscriptionManager';
import * as SubscriptionManager from '../components/SubscriptionManager';
import SessionService from '../services/sessionService';
import PetProfileRepository from '../services/petProfileRepository';

jest.mock('../services/sessionService');
jest.mock('../services/petProfileRepository');

describe('Home Free-First Recommendation (CP-RECO-000)', () => {
    const testSessions: Session[] = [
        {
            id: 'daily_calm_reset',
            title: 'Daily Calm Reset',
            subtitle: 'Start here: short and easy',
            category: 'foundation',
            accessLevel: 'free',
            durationMinutes: 5,
            difficulty: 'easy',
            steps: []
        } as any,
        {
            id: 'fireworks_loud_noises_basic',
            title: 'Thunder & Fireworks Safe Space',
            subtitle: 'Calm during loud noises',
            category: 'noise_support',
            accessLevel: 'free',
            durationMinutes: 10,
            difficulty: 'easy',
            steps: []
        } as any,
        {
            id: 'outdoor_confidence_reset',
            title: 'Outdoor Confidence',
            subtitle: 'Practice outdoor confidence',
            category: 'walk_fear',
            accessLevel: 'premium',
            durationMinutes: 15,
            difficulty: 'moderate',
            steps: []
        } as any,
        {
            id: 'visitors_at_home',
            title: 'Visitors Distance practice',
            subtitle: 'Practice calm around strangers',
            category: 'visitor_fear',
            accessLevel: 'premium',
            durationMinutes: 12,
            difficulty: 'moderate',
            steps: []
        } as any
    ];

    const mockNavigation = {
        navigate: jest.fn(),
        goBack: jest.fn(),
    };

    let mockUseSubscription: jest.SpyInstance;

    beforeEach(async () => {
        jest.clearAllMocks();
        await AsyncStorage.clear();

        (SessionService.getSessions as jest.Mock).mockReturnValue(testSessions);
        (SessionService.getSessionById as jest.Mock).mockImplementation((id) => {
            return testSessions.find(s => s.id === id) || null;
        });

        // Default mock profile: non-premium, resolved triggers
        (PetProfileRepository.getPetProfile as jest.Mock).mockResolvedValue({
            id: 'test-pet-123',
            petName: 'Buddy',
            anxietyScore: 4,
            anxietyTriggers: ['new_places']
        });

        (SessionService.getHomeSnapshot as jest.Mock).mockResolvedValue({
            latestPractice: null,
            latestCheckIn: null
        });

        mockUseSubscription = jest.spyOn(SubscriptionManager, 'useSubscription').mockReturnValue({
            isPremium: false,
            isLoading: false,
            customerInfo: null,
            purchasePackage: jest.fn(),
            restorePurchases: jest.fn(),
            refreshEntitlement: jest.fn(),
        } as any);
    });

    const renderTestDashboard = () => {
        return render(
            <SubscriptionProvider>
                <NavigationContainer>
                    <DashboardScreen navigation={mockNavigation} />
                </NavigationContainer>
            </SubscriptionProvider>
        );
    };

    describe('Selector Logic - getHomeRecommendation', () => {
        test('Non-Premium non-noise triggers resolve to Daily Calm Reset baseline', () => {
            const result = getHomeRecommendation(testSessions, ['new_places'], false, false);
            expect(result.session?.id).toBe('daily_calm_reset');
            expect(result.source).toBe('free_baseline');
            expect(result.reason).toBe('A simple place to start');
        });

        test('Non-Premium noise triggers resolve to fireworks_loud_noises_basic (profile match)', () => {
            const result = getHomeRecommendation(testSessions, ['loud_noises', 'new_places'], false, false);
            expect(result.session?.id).toBe('fireworks_loud_noises_basic');
            expect(result.source).toBe('profile');
            expect(result.reason).toBe('Profile match: loud noises or fireworks');
        });

        test('Premium non-noise triggers resolve to specific trigger-matched routines', () => {
            const result = getHomeRecommendation(testSessions, ['visitors'], false, true);
            expect(result.session?.id).toBe('visitors_at_home');
            expect(result.source).toBe('profile');
            expect(result.reason).toBe('Practice calm distance for visitors');
        });

        test('Severe distress returns none immediately, taking absolute precedence', () => {
            const result = getHomeRecommendation(testSessions, ['loud_noises'], true, false);
            expect(result.session).toBeNull();
            expect(result.source).toBe('none');
        });

        test('Missing baseline daily_calm_reset returns none', () => {
            const sessionsWithoutBaseline = testSessions.filter(s => s.id !== 'daily_calm_reset');
            const result = getHomeRecommendation(sessionsWithoutBaseline, ['new_places'], false, false);
            expect(result.session).toBeNull();
            expect(result.source).toBe('none');
        });

        test('Unexpected baseline daily_calm_reset with premium accessLevel returns none', () => {
            const alteredSessions = testSessions.map(s => 
                s.id === 'daily_calm_reset' ? { ...s, accessLevel: 'premium' as const } : s
            );
            const result = getHomeRecommendation(alteredSessions, ['new_places'], false, false);
            expect(result.session).toBeNull();
            expect(result.source).toBe('none');
        });

        test('Missing Safe Space routine returns none for noise profile', () => {
            const sessionsWithoutSafeSpace = testSessions.filter(s => s.id !== 'fireworks_loud_noises_basic');
            const result = getHomeRecommendation(sessionsWithoutSafeSpace, ['loud_noises'], false, false);
            expect(result.session).toBeNull();
            expect(result.source).toBe('none');
        });

        test('The selector does not mutate inputs', () => {
            const sessionsClone = JSON.parse(JSON.stringify(testSessions));
            const triggersClone = ['new_places'];
            getHomeRecommendation(sessionsClone, triggersClone, false, false);
            expect(sessionsClone).toEqual(testSessions);
            expect(triggersClone).toEqual(['new_places']);
        });
    });

    describe('Dashboard Screen Presentation and Precedence', () => {
        test('Non-Premium baseline renders "Start with a free routine" title, correct reason, and View routine CTA', async () => {
            const { getByText, queryByText } = renderTestDashboard();

            await waitFor(() => {
                expect(getByText('Start with a free routine')).toBeTruthy();
                expect(getByText('Try a short owner-guided routine before exploring the full catalogue.')).toBeTruthy();
                expect(getByText('A simple place to start')).toBeTruthy();
                expect(getByText('Daily Calm Reset')).toBeTruthy();
                expect(getByText('View routine')).toBeTruthy();
                expect(queryByText('lock-closed')).toBeNull();
            });
        });

        test('Non-Premium noise trigger renders "Suggested from your profile" title and stays free', async () => {
            (PetProfileRepository.getPetProfile as jest.Mock).mockResolvedValue({
                id: 'test-pet-123',
                petName: 'Buddy',
                anxietyScore: 4,
                anxietyTriggers: ['fireworks']
            });

            const { getByText } = renderTestDashboard();

            await waitFor(() => {
                expect(getByText('Suggested from your profile')).toBeTruthy();
                expect(getByText("Based on the triggers saved in Buddy's profile — not a live assessment.")).toBeTruthy();
                expect(getByText('Profile match: loud noises or fireworks')).toBeTruthy();
                expect(getByText('Thunder & Fireworks Safe Space')).toBeTruthy();
                expect(getByText('View routine')).toBeTruthy();
            });
        });

        test('Resolved "none" source renders "Choose a routine" title and neutral fallback card', async () => {
            const sessionsWithoutBaseline = testSessions.filter(s => s.id !== 'daily_calm_reset');
            (SessionService.getSessions as jest.Mock).mockReturnValue(sessionsWithoutBaseline);

            const { getByText, getByTestId, queryByText } = renderTestDashboard();

            await waitFor(() => {
                expect(getByText('Choose a routine')).toBeTruthy();
                expect(getByText('Browse the catalogue to see available routines.')).toBeTruthy();
                expect(getByTestId('suggestion-fallback-card')).toBeTruthy();
                expect(queryByText('Suggested from your profile')).toBeNull();
            });
        });

        test('Severe latest check-in renders severe distress boundary immediately, even if subLoading=true', async () => {
            (SessionService.getHomeSnapshot as jest.Mock).mockResolvedValue({
                latestPractice: null,
                latestCheckIn: {
                    score: 8,
                    levelLabel: 'Severe Distress',
                    hasSevereSigns: true,
                    severeCategory: 'behavioral',
                    completedAt: '2026-07-16T10:00:00Z'
                }
            });

            mockUseSubscription.mockReturnValue({
                isPremium: false,
                isLoading: true,
                customerInfo: null,
                purchasePackage: jest.fn(),
                restorePurchases: jest.fn(),
                refreshEntitlement: jest.fn(),
            } as any);

            const { getByText, getByTestId, queryByTestId } = renderTestDashboard();

            await waitFor(() => {
                expect(getByText('Before another routine')).toBeTruthy();
                expect(getByText('Strong signs were noted in the latest saved check-in. This is a saved check-in, not a live assessment.')).toBeTruthy();
                expect(getByTestId('historical-severe-boundary-card')).toBeTruthy();
                expect(queryByTestId('home-recommendation-loading')).toBeNull();
            });
        });

        test('Non-severe and subLoading=true renders compact home-recommendation-loading', async () => {
            mockUseSubscription.mockReturnValue({
                isPremium: false,
                isLoading: true,
                customerInfo: null,
                purchasePackage: jest.fn(),
                restorePurchases: jest.fn(),
                refreshEntitlement: jest.fn(),
            } as any);

            const { getByText, getByTestId, queryByTestId } = renderTestDashboard();

            await waitFor(() => {
                expect(getByText('Finding a routine')).toBeTruthy();
                expect(getByText('Checking which routines are available.')).toBeTruthy();
                expect(getByTestId('home-recommendation-loading')).toBeTruthy();
                expect(queryByTestId('suggested-routine-card')).toBeNull();
                expect(queryByTestId('suggestion-fallback-card')).toBeNull();
            });
        });

        test('Live transitions (loading -> non-Premium, non-Premium -> Premium, Premium -> non-Premium) recompute atomically', async () => {
            mockUseSubscription.mockReturnValue({
                isPremium: false,
                isLoading: true,
                customerInfo: null,
                purchasePackage: jest.fn(),
                restorePurchases: jest.fn(),
                refreshEntitlement: jest.fn(),
            } as any);

            const { getByText, getByTestId, queryByTestId, rerender } = renderTestDashboard();

            await waitFor(() => {
                expect(getByTestId('home-recommendation-loading')).toBeTruthy();
            });

            mockUseSubscription.mockReturnValue({
                isPremium: false,
                isLoading: false,
                customerInfo: null,
                purchasePackage: jest.fn(),
                restorePurchases: jest.fn(),
                refreshEntitlement: jest.fn(),
            } as any);

            rerender(
                <SubscriptionProvider>
                    <NavigationContainer>
                        <DashboardScreen navigation={mockNavigation} />
                    </NavigationContainer>
                </SubscriptionProvider>
            );

            await waitFor(() => {
                expect(queryByTestId('home-recommendation-loading')).toBeNull();
                expect(getByText('Start with a free routine')).toBeTruthy();
                expect(getByText('Daily Calm Reset')).toBeTruthy();
            });

            mockUseSubscription.mockReturnValue({
                isPremium: true,
                isLoading: false,
                customerInfo: null,
                purchasePackage: jest.fn(),
                restorePurchases: jest.fn(),
                refreshEntitlement: jest.fn(),
            } as any);

            rerender(
                <SubscriptionProvider>
                    <NavigationContainer>
                        <DashboardScreen navigation={mockNavigation} />
                    </NavigationContainer>
                </SubscriptionProvider>
            );

            await waitFor(() => {
                expect(getByText('Suggested from your profile')).toBeTruthy();
                expect(getByText('Outdoor Confidence')).toBeTruthy();
            });

            mockUseSubscription.mockReturnValue({
                isPremium: false,
                isLoading: false,
                customerInfo: null,
                purchasePackage: jest.fn(),
                restorePurchases: jest.fn(),
                refreshEntitlement: jest.fn(),
            } as any);

            rerender(
                <SubscriptionProvider>
                    <NavigationContainer>
                        <DashboardScreen navigation={mockNavigation} />
                    </NavigationContainer>
                </SubscriptionProvider>
            );

            await waitFor(() => {
                expect(getByText('Start with a free routine')).toBeTruthy();
                expect(getByText('Daily Calm Reset')).toBeTruthy();
            });
        });

        test('Tapping free baseline suggestion card navigates directly to SessionPreview without Paywall', async () => {
            mockNavigation.navigate.mockClear();
            const { getByTestId } = renderTestDashboard();

            const card = await waitFor(() => getByTestId('suggested-routine-card'));
            fireEvent.press(card);

            await waitFor(() => {
                expect(mockNavigation.navigate).toHaveBeenCalledWith('SessionPreview', {
                    sessionId: 'daily_calm_reset',
                    petId: 'test-pet-123'
                });
            });
        });

        test('Tapping fallback Browse routines card navigates to Routines screen', async () => {
            mockNavigation.navigate.mockClear();
            const sessionsWithoutBaseline = testSessions.filter(s => s.id !== 'daily_calm_reset');
            (SessionService.getSessions as jest.Mock).mockReturnValue(sessionsWithoutBaseline);

            const { getByTestId } = renderTestDashboard();

            const card = await waitFor(() => getByTestId('suggestion-fallback-card'));
            fireEvent.press(card);

            await waitFor(() => {
                expect(mockNavigation.navigate).toHaveBeenCalledWith('Routines');
            });
        });
    });
});
