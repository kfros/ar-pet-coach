import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import GuidedSessionScreen from '../screens/GuidedSessionScreen';
import { NavigationContainer } from '@react-navigation/native';
import SessionService from '../services/sessionService';

// Mock useCalmAudio hook
const mockAudioControls = {
  isPlaying: true,
  stopAudio: jest.fn(),
  handleNext: jest.fn(),
  pauseAudio: jest.fn(() => Promise.resolve()),
  resumeAudio: jest.fn(() => Promise.resolve()),
  currentTrackId: 'calm_01',
};

jest.mock('../hooks/useCalmAudio', () => ({
  useCalmAudio: jest.fn(() => mockAudioControls),
}));

// Mock SessionService
const mockSession = {
  id: 'daily_calm_reset',
  title: 'Daily Calm Reset',
  steps: [
    { id: '1', title: 'Step 1', instruction: 'Do thing 1', durationSeconds: 1, visualCue: 'pulse', canSkip: false },
  ],
  beforeYouStart: [],
  whatToWatchFor: [],
  stopIf: [],
  afterSession: [],
  tags: [],
  recommendedForTriggers: [],
  accessLevel: 'free',
};

jest.mock('../services/sessionService', () => ({
  getSessionById: jest.fn(() => mockSession),
  saveSessionHistory: jest.fn(() => Promise.resolve()),
}));

// Fully mock SubscriptionManager so there are no async effects from it
jest.mock('../components/SubscriptionManager', () => ({
  SubscriptionProvider: ({ children }: any) => children,
  useSubscription: () => ({
    isPremium: true,
    trackCalmingSession: jest.fn(),
  }),
}));

const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};

const mockRoute = { params: { sessionId: 'daily_calm_reset', petId: 'test-pet' } };

/** Renders GuidedSessionScreen and flushes async mount effects (loadSettings) */
async function renderGuidedSession(mockRoute = { params: { sessionId: 'daily_calm_reset', petId: 'test-pet' } }) {
  const utils = render(
    <NavigationContainer>
      <GuidedSessionScreen navigation={mockNavigation} route={mockRoute} />
    </NavigationContainer>
  );
  await act(async () => {});
  return utils;
}

describe('Suite 08: Fade And Positive Signs', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // Do NOT call jest.useFakeTimers() here — it would break findByText polling in renderGuidedSession
  });

  afterEach(() => {
    // Restore real timers in case a test switched to fake timers
    jest.useRealTimers();
  });

  test('test_after_checkin_positive_signs_render: CHECKIN-001', async () => {
    // Render and await settling with real timers
    const { getByText, queryByText } = await renderGuidedSession();

    // Switch to fake timers for step timer if needed
    jest.useFakeTimers();

    // Move to active phase
    await act(async () => {
        fireEvent.press(getByText(/Start Session/i));
    });

    // Bypass the timer and modal entirely by pressing "Finish Session" directly
    await act(async () => {
        fireEvent.press(getByText(/Finish Session/i));
    });

    // Flush microtasks for state update
    await act(async () => {});

    jest.useRealTimers();

    expect(getByText(/Finish & Save/i)).toBeTruthy();
    expect(getByText(/Positive Signs \(optional\)/i)).toBeTruthy();
  });

  test('test_after_checkin_positive_signs_save: CHECKIN-001', async () => {
    const { getByText } = await renderGuidedSession();

    jest.useFakeTimers();

    await act(async () => {
        fireEvent.press(getByText(/Start Session/i));
    });

    await act(async () => {
        fireEvent.press(getByText(/Finish Session/i));
    });

    await act(async () => {});

    jest.useRealTimers();

    // Select level and positive signs
    fireEvent.press(getByText('Calm'));
    fireEvent.press(getByText(/Relaxed Body/i));
    fireEvent.press(getByText(/Fell Asleep/i));

    await act(async () => {
        fireEvent.press(getByText(/Finish & Save/i));
    });

    expect(SessionService.saveSessionHistory).toHaveBeenCalledWith(expect.objectContaining({
        afterCheckin: expect.objectContaining({
            positiveSigns: expect.arrayContaining(['relaxed_body', 'fell_asleep'])
        })
    }));
  });

  test('test_pause_resume_calls_audio_controls: GFM-007', async () => {
    const { getByText } = await renderGuidedSession();

    jest.useFakeTimers();

    await act(async () => {
        fireEvent.press(getByText(/Start Session/i));
    });

    // Pause
    await act(async () => {
        fireEvent.press(getByText(/Pause/i));
    });
    expect(mockAudioControls.pauseAudio).toHaveBeenCalled();

    // Resume
    await act(async () => {
        fireEvent.press(getByText(/Resume/i));
    });
    expect(mockAudioControls.resumeAudio).toHaveBeenCalled();
  });
});
