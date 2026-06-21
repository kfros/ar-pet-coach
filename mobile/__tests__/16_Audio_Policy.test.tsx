import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import GuidedSessionScreen from '../screens/GuidedSessionScreen';
import { SubscriptionProvider } from '../components/SubscriptionManager';
import { useCalmAudio } from '../hooks/useCalmAudio';

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

// Mock useCalmAudio hook
const mockAudioControls = {
  isPlaying: false,
  stopAudio: jest.fn(),
  handleNext: jest.fn(),
  pauseAudio: jest.fn(() => Promise.resolve()),
  resumeAudio: jest.fn(() => Promise.resolve()),
  currentTrackId: 'calm_01',
};

jest.mock('../hooks/useCalmAudio', () => ({
  useCalmAudio: jest.fn(() => mockAudioControls),
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

describe('Audio Policy and Controls Visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('daily_calm_reset: audio is enabled, controls are visible', async () => {
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

    // Verify Sound and Repeat controls are displayed
    expect(queryAllByText('Sound').length).toBeGreaterThan(0);
    expect(queryByText('Repeat')).toBeTruthy();

    // Verify useCalmAudio was called with true (autoplay enabled/allowed)
    expect(useCalmAudio).toHaveBeenCalledWith(true);
  });

  test('outdoor_confidence_reset: audio is disabled, controls are hidden', async () => {
    const { getByText, queryByText } = render(
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

    // Verify Sound and Repeat controls are hidden
    expect(queryByText('Sound')).toBeNull();
    expect(queryByText('Repeat')).toBeNull();

    // Verify Pause/Resume button exists
    expect(getByText('Pause')).toBeTruthy();

    // Verify useCalmAudio was called with false (since mode is 'none')
    expect(useCalmAudio).toHaveBeenCalledWith(false);
  });
});
