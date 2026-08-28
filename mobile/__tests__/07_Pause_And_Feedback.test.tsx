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
  getHomeSnapshot: jest.fn(),
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

  test('test_pause_pauses_session: GFM-006', async () => {
    const { getByText, queryAllByText } = await renderGuidedSession();

    fireEvent.press(getByText(/Start Session/i));

    await act(async () => {
        fireEvent.press(getByText(/Pause/i));
    });

    expect(queryAllByText(/Resume/i).length).toBeGreaterThan(0);
    expect(queryAllByText(/Paused/i).length).toBeGreaterThan(0);
  }, 15000);

  test('test_resume_restores_active_session: GFM-006', async () => {
    const { getByText, queryAllByText } = await renderGuidedSession();

    fireEvent.press(getByText(/Start Session/i));

    // Pause
    await act(async () => {
        fireEvent.press(getByText(/Pause/i));
    });
    expect(queryAllByText(/Resume/i).length).toBeGreaterThan(0);

    // Resume
    await act(async () => {
        fireEvent.press(getByText(/Resume/i));
    });

    expect(queryAllByText(/Pause/i).length).toBeGreaterThan(0);
  }, 15000);

  test('test_current_signs_uses_latest_after_checkin: HOME-001', async () => {
    (SessionService.getHomeSnapshot as jest.Mock).mockResolvedValue({
      latestPractice: { sessionId: 'daily_calm_reset', sessionTitle: 'Daily Calm Reset', completedAt: '2026-07-15T10:00:00Z', completed: true, stoppedEarly: false },
      latestCheckIn: {
        sessionId: 'daily_calm_reset',
        sessionTitle: 'Daily Calm Reset',
        completedAt: '2026-07-15T10:00:00Z',
        phase: 'after',
        score: 2,
        levelLabel: 'Very Calm',
        hasSevereSigns: false,
        severeSignsNote: ''
      }
    });

    const { findByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    expect(await findByText(/Very Calm/i)).toBeTruthy();
  });

  test('test_recent_progress_worsened_uses_warning_tone: HOME-002', async () => {
    (SessionService.getHomeSnapshot as jest.Mock).mockResolvedValue({
      latestPractice: { sessionId: 'daily_calm_reset', sessionTitle: 'Daily Calm Reset', completedAt: '2026-07-15T10:00:00Z', completed: true, stoppedEarly: false },
      latestCheckIn: {
        sessionId: 'daily_calm_reset',
        sessionTitle: 'Daily Calm Reset',
        completedAt: '2026-07-15T10:00:00Z',
        phase: 'after',
        score: 7,
        levelLabel: 'Moderate Signs',
        hasSevereSigns: true,
        severeSignsNote: 'vomiting'
      }
    });

    const { getByTestId } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(getByTestId('historical-severe-warning')).toBeTruthy();
    });
  });
});
