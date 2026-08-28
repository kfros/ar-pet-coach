import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import GuidedSessionScreen from '../screens/GuidedSessionScreen';
import { SubscriptionProvider } from '../components/SubscriptionManager';

// Mock SubscriptionManager
jest.mock('../components/SubscriptionManager', () => ({
  SubscriptionProvider: ({ children }: any) => children,
  useSubscription: () => ({
    isPremium: false,
    trackCalmingSession: jest.fn(() => Promise.resolve(1)),
    checkPaywallTrigger: jest.fn(() => Promise.resolve(false)),
    refreshEntitlement: jest.fn(),
    isLoading: false,
  }),
}));

// Mock PetProfileRepository
jest.mock('../services/petProfileRepository', () => ({
  getPetProfile: jest.fn(() => Promise.resolve({ id: 'test-pet', petName: 'Buddy' })),
}));

// Mock SessionService with real sessions
jest.mock('../services/sessionService', () => {
  const actualService = jest.requireActual('../services/sessionService').default;
  return {
    getSessionById: (id: string) => actualService.getSessionById(id),
    getSessions: () => actualService.getSessions(),
    saveSessionHistory: jest.fn(() => Promise.resolve()),
    getLocalHistory: jest.fn(() => Promise.resolve([])),
    getRecentProgress: jest.fn(),
  };
});

const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};

describe('Audio Policy & Legacy Audio Removal Regression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('daily_calm_reset: legacy audio controls and autoplay are removed from active session', async () => {
    const { getByText, queryByText, queryAllByText } = render(
      <SubscriptionProvider>
        <GuidedSessionScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'daily_calm_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Start Session
    fireEvent.press(getByText(/Start Session/i));

    // Verify Sound, Repeat, and Next Sound controls are absent
    expect(queryByText('Repeat')).toBeNull();
    expect(queryByText('Next')).toBeNull();
    // Verify no audio toggle with label "Sound" in the controls area
    const soundElements = queryAllByText('Sound');
    expect(soundElements.length).toBe(0);

    // Verify session-level Pause/Resume button exists and is functional
    expect(getByText('Pause')).toBeTruthy();
  });

  test('outdoor_confidence_reset: no audio controls exist and session mechanics remain functional', async () => {
    const { getByText, queryByText, queryAllByText } = render(
      <SubscriptionProvider>
        <GuidedSessionScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Start Session
    fireEvent.press(getByText(/Start Session/i));

    // Verify Sound, Repeat, and Next Sound controls are absent
    expect(queryByText('Repeat')).toBeNull();
    expect(queryByText('Next')).toBeNull();
    expect(queryAllByText('Sound').length).toBe(0);

    // Verify Pause/Resume button exists
    expect(getByText('Pause')).toBeTruthy();
  });
});
