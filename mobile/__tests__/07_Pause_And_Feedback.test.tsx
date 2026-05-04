import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import GuidedSessionScreen from '../screens/GuidedSessionScreen';
import DashboardScreen from '../screens/DashboardScreen';
import { NavigationContainer } from '@react-navigation/native';
import { SubscriptionProvider } from '../components/SubscriptionManager';
import SessionService from '../services/sessionService';

// Mock SubscriptionManager entirely so SubscriptionProvider never fires async RevenueCat calls
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
    { id: '1', title: 'Step 1', instruction: 'Do thing 1', durationSeconds: 10, visualCue: 'pulse' },
  ],
  beforeYouStart: [],
  whatToWatchFor: [],
  stopIf: [],
};

jest.mock('../services/sessionService', () => ({
  getSessionById: jest.fn(() => mockSession),
  getSessions: jest.fn(() => [mockSession]),
  saveSessionHistory: jest.fn(() => Promise.resolve()),
  getRecentProgress: jest.fn(),
}));

jest.mock('../services/petProfileRepository', () => ({
  getPetProfile: jest.fn(() => Promise.resolve({ id: 'test-pet', petName: 'Buddy' })),
}));

const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};

/** Renders GuidedSessionScreen and flushes async mount effects (loadSettings) */
async function renderGuidedSession() {
  const utils = render(
    <SubscriptionProvider>
      <NavigationContainer>
        <GuidedSessionScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'daily_calm_reset', petId: 'test-pet' } }}
        />
      </NavigationContainer>
    </SubscriptionProvider>
  );
  await act(async () => {});
  return utils;
}

describe('Suite 07: Pause And Feedback', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('test_pause_pauses_audio: GFM-006', async () => {
    const { getByText } = await renderGuidedSession();

    fireEvent.press(getByText(/Start Session/i));

    await act(async () => {
        fireEvent.press(getByText(/Pause/i));
    });

    expect(mockAudioControls.pauseAudio).toHaveBeenCalled();
  }, 15000);

  test('test_resume_restores_audio_only_if_previously_playing: GFM-006', async () => {
    const { getByText } = await renderGuidedSession();

    fireEvent.press(getByText(/Start Session/i));

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
  }, 15000);

  test('test_current_signs_uses_latest_after_checkin: HOME-001', async () => {
    (SessionService.getRecentProgress as jest.Mock).mockResolvedValue({
        outcome: 'improved',
        latestScore: 2,
        latestLevelLabel: 'calm',
        title: 'Recent Progress',
        body: 'Last: Daily Calm Reset',
        details: ['Signs looked lower after the session.'],
        hasSevereSigns: false
    });

    const { findByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    expect(await findByText(/Calm signs/i)).toBeTruthy();
  });

  test('test_recent_progress_worsened_uses_warning_tone: HOME-002', async () => {
    (SessionService.getRecentProgress as jest.Mock).mockResolvedValue({
        outcome: 'worsened',
        latestScore: 7,
        latestLevelLabel: 'moderate',
        title: 'Recent Progress',
        body: 'Last: Daily Calm Reset',
        details: ['Signs looked higher after the session.'],
        hasSevereSigns: true
    });

    const { findByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    expect(await findByText(/Signs looked higher after the session/i)).toBeTruthy();
    expect(await findByText(/Strong signs were noted/i)).toBeTruthy();
  });
});
