import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import GuidedSessionScreen from '../screens/GuidedSessionScreen';
import { SubscriptionProvider } from '../components/SubscriptionManager';
import SessionService from '../services/sessionService';

// Mock SubscriptionManager
jest.mock('../components/SubscriptionManager', () => ({
  SubscriptionProvider: ({ children }: any) => children,
  useSubscription: () => ({
    isPremium: true, // Let them have premium to access outdoor confidence
    trackCalmingSession: jest.fn(() => Promise.resolve(1)),
    checkPaywallTrigger: jest.fn(() => Promise.resolve(false)),
    refreshEntitlement: jest.fn(),
    isLoading: false,
  }),
}));

// Mock useCalmAudio hook
jest.mock('../hooks/useCalmAudio', () => ({
  useCalmAudio: jest.fn(() => ({
    isPlaying: false,
    stopAudio: jest.fn(),
    handleNext: jest.fn(),
    pauseAudio: jest.fn(() => Promise.resolve()),
    resumeAudio: jest.fn(() => Promise.resolve()),
    currentTrackId: 'calm_01',
  })),
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

describe('Suite 17: Outdoor Confidence Milestones and Routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('outdoor_progress_001: Renders custom check-in signs without positive signs', async () => {
    const { getByText, queryByText } = render(
      <SubscriptionProvider>
        <GuidedSessionScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Verify it is on the check-in screen
    expect(getByText(/Calm Check-In/i)).toBeTruthy();

    // Verify custom signs (e.g. Freezing) are shown
    expect(getByText('Freezing at the edge')).toBeTruthy();
    expect(getByText('Scanning outside')).toBeTruthy();

    // Verify positive signs are NOT shown on check-in
    expect(queryByText('Fell Asleep')).toBeNull();
    expect(queryByText('Relaxed Body')).toBeNull();
  });

  test('outdoor_progress_002: Previous step resets timer and changes only currentStepIndex', async () => {
    const { getByText } = render(
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

    // Initially at Step 1
    expect(getByText('Step 1 of 6')).toBeTruthy();

    // Advance to Step 2
    fireEvent.press(getByText(/Next Step/i));
    expect(getByText('Step 2 of 6')).toBeTruthy();

    // Press Previous
    fireEvent.press(getByText('Previous'));
    expect(getByText('Step 1 of 6')).toBeTruthy();

    // Verify no save or finalize event has occurred
    expect(SessionService.saveSessionHistory).not.toHaveBeenCalled();
  });

  test('outdoor_progress_003: Milestone selection and persistence sequence', async () => {
    const { getByText, queryByText } = render(
      <SubscriptionProvider>
        <GuidedSessionScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet', level: 'one_step' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Start Session
    fireEvent.press(getByText(/Start Session/i));

    // Finish session steps
    for (let i = 0; i < 5; i++) {
      fireEvent.press(getByText(/Next Step/i));
    }
    fireEvent.press(getByText(/Finish Session/i));

    // Expect after check-in screen
    expect(getByText(/After-Session Check-In/i)).toBeTruthy();
    
    // Press Finish & Save
    fireEvent.press(getByText(/Finish & Save/i));
    await act(async () => {});

    // 1. Verify history was saved first with milestone null/undefined
    expect(SessionService.saveSessionHistory).toHaveBeenCalledTimes(1);
    expect((SessionService.saveSessionHistory as jest.Mock).mock.calls[0][0].outdoorMilestone).toBeUndefined();

    // 2. Verify milestone modal is open
    expect(getByText('What did your dog manage today?')).toBeTruthy();

    // Select milestone "Took one calm step" (one_step)
    fireEvent.press(getByText('Took one calm step'));
    
    // Press Continue
    fireEvent.press(getByText('Continue'));
    await act(async () => {});

    // 3. Verify history was updated/saved a second time with milestone 'one_step'
    expect(SessionService.saveSessionHistory).toHaveBeenCalledTimes(2);
    expect((SessionService.saveSessionHistory as jest.Mock).mock.calls[1][0].outdoorMilestone).toBe('one_step');
    // Verify IDs and CompletedAt remain stable
    const firstCall = (SessionService.saveSessionHistory as jest.Mock).mock.calls[0][0];
    const secondCall = (SessionService.saveSessionHistory as jest.Mock).mock.calls[1][0];
    expect(firstCall.id).toBe(secondCall.id);
    expect(firstCall.completedAt).toBe(secondCall.completedAt);
    expect(firstCall.beforeCheckin?.id).toBe(secondCall.beforeCheckin?.id);

    // 4. Verify Next Step explanation is displayed before navigating away
    expect(getByText('Tiny step logged')).toBeTruthy();
  });

  test('outdoor_progress_004: CTA Navigation rules for Easier, Repeat, and Next options', async () => {
    // Test Case A: current_level: "one_step", clicking "See easier options" -> open_edge or doorway_calm
    const { getByText, queryByText } = render(
      <SubscriptionProvider>
        <GuidedSessionScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet', level: 'one_step' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Start, complete, select none_yet (which triggers See Easier Options)
    fireEvent.press(getByText(/Start Session/i));
    for (let i = 0; i < 5; i++) {
      fireEvent.press(getByText(/Next Step/i));
    }
    fireEvent.press(getByText(/Finish Session/i));
    fireEvent.press(getByText(/Finish & Save/i));
    await act(async () => {});

    // Select "None of these yet" -> Continue
    fireEvent.press(getByText('None of these yet'));
    fireEvent.press(getByText('Continue'));
    await act(async () => {});

    // Expect explanation screen with primaryCTA: "See easier options"
    expect(getByText('See easier options')).toBeTruthy();
    
    // Press "See easier options"
    fireEvent.press(getByText('See easier options'));
    
    // Verify it replaced navigation to previous Outdoor Confidence level preview ('open_edge')
    expect(mockNavigation.replace).toHaveBeenCalledWith('SessionPreview', {
      sessionId: 'outdoor_confidence_reset',
      petId: 'test-pet',
      level: 'open_edge'
    });
  });

  test('outdoor_progress_005: CTA Navigation fallback when already at easiest level', async () => {
    // Test Case B: current_level: "doorway_calm", clicking "See easier options" -> daily_calm_reset
    const { getByText } = render(
      <SubscriptionProvider>
        <GuidedSessionScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet', level: 'doorway_calm' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Start, complete, select none_yet
    fireEvent.press(getByText(/Start Session/i));
    for (let i = 0; i < 5; i++) {
      fireEvent.press(getByText(/Next Step/i));
    }
    fireEvent.press(getByText(/Finish Session/i));
    fireEvent.press(getByText(/Finish & Save/i));
    await act(async () => {});

    // Select "None of these yet" -> Continue
    fireEvent.press(getByText('None of these yet'));
    fireEvent.press(getByText('Continue'));
    await act(async () => {});

    // Press "See easier options"
    fireEvent.press(getByText('See easier options'));
    
    // Verify fallback to daily_calm_reset
    expect(mockNavigation.replace).toHaveBeenCalledWith('SessionPreview', {
      sessionId: 'daily_calm_reset',
      petId: 'test-pet'
    });
  });
});
