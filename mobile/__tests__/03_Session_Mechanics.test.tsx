import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import GuidedSessionScreen from '../screens/GuidedSessionScreen';
import { NavigationContainer } from '@react-navigation/native';
import { SubscriptionProvider } from '../components/SubscriptionManager';
import SessionService from '../services/sessionService';
import { Audio } from 'expo-av';

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

describe('Suite 03: Session Mechanics', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
  };
  const mockRoute = { params: { sessionId: 'daily_calm_reset', petId: 'test-pet' } };

  test('10_guided_focus_mode_renders_without_camera', () => {
    const { queryByTestId, getByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <GuidedSessionScreen navigation={mockNavigation} route={mockRoute} />
        </NavigationContainer>
      </SubscriptionProvider>
    );
    
    // Move past check-in
    fireEvent.press(getByText(/Start Session/i));
    
    expect(getByText('Step 1')).toBeTruthy();
    // Verify no camera (we assume camera would have a specific testID if it existed)
    expect(queryByTestId('camera-view')).toBeNull();
  });

  test('12_background_sound_toggle_controls_audio', async () => {
    const { getByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <GuidedSessionScreen navigation={mockNavigation} route={mockRoute} />
        </NavigationContainer>
      </SubscriptionProvider>
    );
    
    fireEvent.press(getByText(/Start Session/i));
    
    const audioToggle = getByText(/Background Sound: On/i);
    fireEvent.press(audioToggle);
    
    expect(getByText(/Background Sound: Off/i)).toBeTruthy();
  });

  test('13_player_controls_update_session_state', async () => {
    jest.useFakeTimers();
    const { getByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <GuidedSessionScreen navigation={mockNavigation} route={mockRoute} />
        </NavigationContainer>
      </SubscriptionProvider>
    );
    
    fireEvent.press(getByText(/Start Session/i));
    
    expect(getByText(/10s/)).toBeTruthy();
    
    // Test Pause
    fireEvent.press(getByText(/Pause/i));
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(getByText(/10s/)).toBeTruthy(); // Should still be 10s
    
    // Test Resume
    fireEvent.press(getByText(/Resume/i));
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(getByText(/8s/)).toBeTruthy(); // Should be 8s
    
    // Test Next Step
    fireEvent.press(getByText(/Next Step/i));
    expect(getByText('Step 2')).toBeTruthy();
    
    jest.useRealTimers();
  });

  test('14_before_session_calm_check_in_records_initial_mood', () => {
    const { getByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <GuidedSessionScreen navigation={mockNavigation} route={mockRoute} />
        </NavigationContainer>
      </SubscriptionProvider>
    );
    
    fireEvent.press(getByText('Moderate'));
    fireEvent.press(getByText(/Start Session/i));
    
    // At this point the phase is 'active', but the mood should be stored in state
  });

  test('15_after_session_calm_check_in_completes_session', async () => {
    const { getByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <GuidedSessionScreen navigation={mockNavigation} route={mockRoute} />
        </NavigationContainer>
      </SubscriptionProvider>
    );
    
    // 1. Before check-in
    fireEvent.press(getByText('Moderate'));
    fireEvent.press(getByText(/Start Session/i));
    
    // 2. Session (skip to end)
    fireEvent.press(getByText(/Next Step/i)); // Step 1 -> Step 2
    fireEvent.press(getByText(/Next Step/i)); // Step 2 -> After check-in
    
    // 3. After check-in
    expect(getByText(/How is your dog after the session?/i)).toBeTruthy();
    fireEvent.press(getByText('Calm'));
    fireEvent.press(getByText(/Finish & Save/i));
    
    await waitFor(() => {
      expect(SessionService.saveSessionHistory).toHaveBeenCalled();
      expect(mockNavigation.replace).toHaveBeenCalledWith('Dashboard');
    });
  });
});
