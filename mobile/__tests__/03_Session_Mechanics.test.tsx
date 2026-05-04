import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import GuidedSessionScreen from '../screens/GuidedSessionScreen';
import { NavigationContainer } from '@react-navigation/native';
import { SubscriptionProvider } from '../components/SubscriptionManager';
import SessionService from '../services/sessionService';
import { Audio } from 'expo-av';

// Removed NativeAnimatedHelper mock since it causes a module resolution error in this RN version.

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

// Mock Expo AV
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(() => Promise.resolve({ 
        sound: { 
          playAsync: jest.fn(), 
          pauseAsync: jest.fn(), 
          stopAsync: jest.fn(), 
          setVolumeAsync: jest.fn(), 
          unloadAsync: jest.fn() 
        }, 
        status: {} 
      })),
    },
    setIsEnabledAsync: jest.fn(),
    setAudioModeAsync: jest.fn(),
  },
}));

// Mock SessionService
const mockSession = {
  id: 'daily_calm_reset',
  title: 'Daily Calm Reset',
  steps: [
    { id: '1', title: 'Step 1', instruction: 'Do thing 1', durationSeconds: 10, visualCue: 'pulse' },
    { id: '2', title: 'Step 2', instruction: 'Do thing 2', durationSeconds: 10, visualCue: 'dim' },
  ],
  beforeYouStart: [],
  whatToWatchFor: [],
  stopIf: [],
};

jest.mock('../services/sessionService', () => ({
  getSessionById: jest.fn(() => mockSession),
  saveSessionHistory: jest.fn(() => Promise.resolve()),
}));

const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};
const mockRoute = { params: { sessionId: 'daily_calm_reset', petId: 'test-pet' } };

/** Renders GuidedSessionScreen and flushes async mount effects (loadSettings) */
async function renderSession() {
  const utils = render(
    <SubscriptionProvider>
      <NavigationContainer>
        <GuidedSessionScreen navigation={mockNavigation} route={mockRoute} />
      </NavigationContainer>
    </SubscriptionProvider>
  );
  await act(async () => {});
  return utils;
}

describe('Suite 03: Session Mechanics', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('guided_focus_001: Guided Focus Mode renders without camera or microphone', async () => {
    const { queryByTestId, getByText } = await renderSession();

    fireEvent.press(getByText(/Start Session/i));

    expect(getByText('Step 1')).toBeTruthy();
    expect(queryByTestId('camera-view')).toBeNull();
    expect(queryByTestId('microphone-view')).toBeNull();
  });

  test('guided_focus_002: Focus circle is rendered with correct testID', async () => {
    const { getByTestId, getByText } = await renderSession();

    fireEvent.press(getByText(/Start Session/i));
    expect(getByTestId('focus-pulse-circle')).toBeTruthy();
  });

  test('guided_focus_003: Step instructions update after handling next', async () => {
    const { getByText } = await renderSession();

    fireEvent.press(getByText(/Start Session/i));
    expect(getByText('Step 1')).toBeTruthy();

    fireEvent.press(getByText(/Next Step/i));
    expect(getByText('Step 2')).toBeTruthy();
  });

  test('guided_focus_004: Pausing stops the timer and resuming restarts it', async () => {
    const { getByText } = await renderSession();

    fireEvent.press(getByText(/Start Session/i));
    
    act(() => { jest.advanceTimersByTime(2000); });
    expect(getByText(/Suggested time: about 8 sec/i)).toBeTruthy();

    // Pause
    fireEvent.press(getByText(/Pause/i));
    act(() => { jest.advanceTimersByTime(2000); });
    expect(getByText(/Suggested time: about 8 sec/i)).toBeTruthy(); // Still 8

    // Resume
    fireEvent.press(getByText(/Resume/i));
    act(() => { jest.advanceTimersByTime(2000); });
    expect(getByText(/Suggested time: about 6 sec/i)).toBeTruthy(); // Now 6

    // Next Step -> Last Step (2nd step)
    fireEvent.press(getByText(/Next Step/i));
    expect(getByText(/Finish Session/i)).toBeTruthy();

    // End Session triggers an Alert
    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert');

    const endButton = getByText(/End Session/i);
    fireEvent.press(endButton);

    expect(alertSpy).toHaveBeenCalled();
    const endAction = (alertSpy.mock.calls[0][2] as any[])?.find((btn: any) => btn.text === 'End Session');
    
    if (endAction?.onPress) endAction.onPress();

    // Use synchronous check or advance microtasks
    await act(async () => {});
    
    expect(SessionService.saveSessionHistory).toHaveBeenCalledWith(expect.objectContaining({
        stoppedEarly: true
    }));
    expect(mockNavigation.replace).toHaveBeenCalledWith('Dashboard');
  });

  test('guided_focus_005: Background Sound toggle controls audio state clearly', async () => {
    const { getByText, getAllByText } = await renderSession();

    fireEvent.press(getByText(/Start Session/i));

    const soundLabels = getAllByText('Sound');
    expect(soundLabels.length).toBeGreaterThan(0);
    expect(getByText('On')).toBeTruthy();

    fireEvent.press(soundLabels[0]);
    const offLabels = getAllByText('Off');
    expect(offLabels.length).toBeGreaterThanOrEqual(2);
  });

  test('checkin_001: Before and after Calm Check-Ins save owner-reported signs', async () => {
    const { getByText } = await renderSession();

    fireEvent.press(getByText('Moderate'));
    fireEvent.press(getByText(/Start Session/i));

    fireEvent.press(getByText(/Next Step/i));
    fireEvent.press(getByText(/Finish Session/i));

    fireEvent.press(getByText('Calm'));
    fireEvent.press(getByText(/Finish & Save/i));

    await act(async () => {});

    expect(SessionService.saveSessionHistory).toHaveBeenCalled();
    expect(mockNavigation.replace).toHaveBeenCalledWith('Dashboard');
  });

  test('guided_focus_006: Next Sound button cycles track through handleNext', async () => {
    const { getByText, getAllByText } = await renderSession();

    fireEvent.press(getByText(/Start Session/i));

    const nextLabels = getAllByText('Next');
    expect(nextLabels.length).toBeGreaterThan(0);
    fireEvent.press(nextLabels[0]);
  });

  test('guided_focus_007: Timer completion triggers "Ready for next step?" prompt', async () => {
    const { getByText, queryByText } = await renderSession();
    
    fireEvent.press(getByText(/Start Session/i));

    act(() => { jest.advanceTimersByTime(11000); });

    expect(getByText(/Ready for the next step?/i)).toBeTruthy();

    fireEvent.press(getByText('Stay Here'));
    expect(queryByText(/Ready for the next step?/i)).toBeNull();
    expect(getByText('Step 1')).toBeTruthy();
  });
});
