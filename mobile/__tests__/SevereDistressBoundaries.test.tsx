import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import GuidedSessionScreen from '../screens/GuidedSessionScreen';
import SessionService from '../services/sessionService';
import PetProfileRepository from '../services/petProfileRepository';
import { SubscriptionProvider } from '../components/SubscriptionManager';
import { getSelectedSevereCategory } from '../appContent/routineSafety';
import { getCheckInProfile } from '../appContent/checkInProfiles';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock PetProfileRepository
jest.mock('../services/petProfileRepository', () => {
  let mockProfile: any = {
    id: 'test-pet-id',
    petName: 'Buddy',
    anxietyScore: 5,
    anxietyTriggers: ['loud_noises']
  };
  return {
    getAuthMode: jest.fn(() => Promise.resolve('authenticated')),
    getPetProfile: jest.fn(() => Promise.resolve(mockProfile)),
    hasPetProfile: jest.fn(() => Promise.resolve(!!mockProfile)),
    setAuthMode: jest.fn(() => Promise.resolve()),
    clearGuestData: jest.fn(() => Promise.resolve()),
    addListener: jest.fn(() => jest.fn()),
    __setMockProfile: (profile: any) => {
      mockProfile = profile;
    }
  };
});

describe('CP-SAFE-002: Severe Distress Safety Boundaries', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('getSelectedSevereCategory pure helper', () => {
    const generalProfile = getCheckInProfile('general_calm');
    const pottyProfile = getCheckInProfile('weather_potty_confidence');

    test('resolves behavioral_stop', () => {
      expect(getSelectedSevereCategory(['aggression'], generalProfile)).toBe('behavioral');
      expect(getSelectedSevereCategory(['self_harm'], generalProfile)).toBe('behavioral');
    });

    test('resolves medical_stop', () => {
      expect(getSelectedSevereCategory(['collapse_or_breathing_trouble'], generalProfile)).toBe('medical');
    });

    test('medical stop sign takes precedence over behavioral', () => {
      expect(getSelectedSevereCategory(['aggression', 'collapse_or_breathing_trouble'], generalProfile)).toBe('medical');
    });

    test('returns null when no severe signs are selected', () => {
      expect(getSelectedSevereCategory(['hiding', 'panting'], generalProfile)).toBeNull();
    });

    test('ignores unknown or malformed IDs without throwing', () => {
      expect(getSelectedSevereCategory(['unknown_id', null as any, 123 as any], generalProfile)).toBeNull();
    });

    test('works with profile-specific severe signs', () => {
      // cannot_urinate is specific to weather potty profile
      expect(getSelectedSevereCategory(['cannot_urinate'], pottyProfile)).toBe('medical');
      expect(getSelectedSevereCategory(['cannot_urinate'], generalProfile)).toBeNull();
    });

    test('returns null when selectedIds or profile is missing', () => {
      expect(getSelectedSevereCategory(null, generalProfile)).toBeNull();
      expect(getSelectedSevereCategory(['aggression'], null)).toBeNull();
    });
  });

  describe('Before-Session safety gates', () => {
    test('Daily Calm Reset (core free routine) gates Start Session and Skip Check-in', async () => {
      const mockRoute = {
        params: {
          sessionId: 'daily_calm_reset',
          petId: 'test-pet-id'
        }
      };

      const { getByText, getByTestId, queryByText } = render(
        <SubscriptionProvider>
          <NavigationContainer>
            <GuidedSessionScreen navigation={mockNavigation} route={mockRoute} />
          </NavigationContainer>
        </SubscriptionProvider>
      );

      // Verify check-in is rendered
      await waitFor(() => {
        expect(getByText('Calm Check-In')).toBeTruthy();
      });

      // Expand safety section to reveal stop signs
      const safetyHeader = getByTestId('section-header-safety_stop_signs');
      fireEvent.press(safetyHeader);

      // Select a behavioral sign (Aggression)
      const aggressionChip = getByText('Aggression');
      fireEvent.press(aggressionChip);

      // Verify the warning modal appears immediately
      await waitFor(() => {
        expect(getByText('Strong signs noted')).toBeTruthy();
        expect(getByText(/For panic, aggression, self-injury, or escape attempts, stop the routine and get professional support./)).toBeTruthy();
      });

      // Click "Review check-in" to dismiss notice
      const reviewBtn = getByText('Review check-in');
      fireEvent.press(reviewBtn);

      // Try pressing "Start Session" anyway
      const startBtn = getByText('Start Session');
      fireEvent.press(startBtn);

      // Warning modal must block it and show up again
      await waitFor(() => {
        expect(getByText('Strong signs noted')).toBeTruthy();
      });

      // Dismiss warning
      fireEvent.press(getByText('Review check-in'));

      // Try pressing "Skip Check-in" to bypass
      const skipBtn = getByText('Skip Check-in');
      fireEvent.press(skipBtn);

      // Warning modal must block it too
      await waitFor(() => {
        expect(getByText('Strong signs noted')).toBeTruthy();
      });

      // Click "End routine"
      const endBtn = getByText('End routine');
      fireEvent.press(endBtn);

      // Must navigate to root Dashboard
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Dashboard');
    });

    test('deselecting stop sign allows starting session normally', async () => {
      const mockRoute = {
        params: {
          sessionId: 'daily_calm_reset',
          petId: 'test-pet-id'
        }
      };

      const { getByText, getByTestId } = render(
        <SubscriptionProvider>
          <NavigationContainer>
            <GuidedSessionScreen navigation={mockNavigation} route={mockRoute} />
          </NavigationContainer>
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(getByText('Calm Check-In')).toBeTruthy();
      });

      const safetyHeader = getByTestId('section-header-safety_stop_signs');
      fireEvent.press(safetyHeader);

      const aggressionChip = getByText('Aggression');
      fireEvent.press(aggressionChip); // Select (shows modal)

      await waitFor(() => {
        expect(getByText('Strong signs noted')).toBeTruthy();
      });
      fireEvent.press(getByText('Review check-in'));

      // Deselect aggression
      fireEvent.press(aggressionChip); // Deselect

      // Press Start Session
      const startBtn = getByText('Start Session');
      fireEvent.press(startBtn);

      // Should bypass block and start session (showing Step 1 of active session)
      await waitFor(() => {
        expect(getByText('Step 1 of 5')).toBeTruthy();
      });
    });

    test('medical stop sign shows medical warning copy and has no Use Easier Routine link', async () => {
      const mockRoute = {
        params: {
          sessionId: 'fireworks_loud_noises_basic',
          petId: 'test-pet-id'
        }
      };

      const { getByText, getByTestId, queryByText } = render(
        <SubscriptionProvider>
          <NavigationContainer>
            <GuidedSessionScreen navigation={mockNavigation} route={mockRoute} />
          </NavigationContainer>
        </SubscriptionProvider>
      );

      await waitFor(() => {
        expect(getByText('Calm Check-In')).toBeTruthy();
      });

      const safetyHeader = getByTestId('section-header-safety_stop_signs');
      fireEvent.press(safetyHeader);

      // Select medical sign (Vomiting / Diarrhea)
      const vomitingChip = getByText('Vomiting / Diarrhea');
      fireEvent.press(vomitingChip);

      await waitFor(() => {
        expect(getByText('Medical signs noted')).toBeTruthy();
        expect(getByText(/For medical symptoms or severe distress, contact a veterinarian./)).toBeTruthy();
        expect(queryByText('Use Easier Routine')).toBeNull();
      });
    });
  });

  describe('After-Session safety gates and progression suppression', () => {
    test('submitting severe sign saves record and shows category final boundary', async () => {
      const saveSpy = jest.spyOn(SessionService, 'saveSessionHistory').mockResolvedValue(undefined);

      const mockRoute = {
        params: {
          sessionId: 'outdoor_confidence_reset',
          petId: 'test-pet-id'
        }
      };

      const { getByText, getByTestId, queryByText, queryByTestId } = render(
        <SubscriptionProvider>
          <NavigationContainer>
            <GuidedSessionScreen navigation={mockNavigation} route={mockRoute} />
          </NavigationContainer>
        </SubscriptionProvider>
      );

      // Skip before check-in (starts session)
      await waitFor(() => {
        expect(getByText('Calm Check-In')).toBeTruthy();
      });
      fireEvent.press(getByText('Skip Check-in'));

      // Complete session steps
      await waitFor(() => {
        expect(getByText('Routine step 1 of 6')).toBeTruthy();
      });

      for (let i = 0; i < 6; i++) {
        fireEvent.press(getByText(i < 5 ? 'Next Step' : 'Finish Session'));
      }

      // We are in after check-in
      await waitFor(() => {
        expect(getByText('After-Session Check-In')).toBeTruthy();
      });

      // Expand safety signs
      const safetyHeader = getByTestId('section-header-safety_stop_signs');
      fireEvent.press(safetyHeader);

      // Select severe behavioral sign (Aggression)
      const aggressionChip = getByText('Aggression');
      fireEvent.press(aggressionChip);

      // Press Finish & Save
      const saveBtn = getByText('Finish & Save');
      fireEvent.press(saveBtn);

      // Should save history first
      await waitFor(() => {
        expect(saveSpy).toHaveBeenCalled();
      });

      // Final boundary notice must be shown immediately
      await waitFor(() => {
        expect(getByText('Strong signs noted')).toBeTruthy();
        expect(getByText(/For panic, aggression, self-injury, or escape attempts, stop routines and get professional support./)).toBeTruthy();
      });

      // Milestone prompt and other progression popups must NOT render
      expect(queryByText('What did your dog manage today?')).toBeNull();
      expect(queryByTestId('milestone-prompt')).toBeNull();

      // Press "Done" on final notice
      const doneBtn = getByText('Done');
      fireEvent.press(doneBtn);

      // Must exit to Dashboard
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Dashboard');
    });

    test('non-severe worsened check-in preserves existing generic easier-next-time feedback prompt', async () => {
      const mockRoute = {
        params: {
          sessionId: 'daily_calm_reset',
          petId: 'test-pet-id'
        }
      };

      const { getByText, getByTestId, queryByText } = render(
        <SubscriptionProvider>
          <NavigationContainer>
            <GuidedSessionScreen navigation={mockNavigation} route={mockRoute} />
          </NavigationContainer>
        </SubscriptionProvider>
      );

      // Before: select Moderate level (score 6)
      await waitFor(() => {
        expect(getByText('Calm Check-In')).toBeTruthy();
      });
      fireEvent.press(getByText('Moderate'));
      fireEvent.press(getByText('Start Session'));

      // Active
      await waitFor(() => {
        expect(getByText('Step 1 of 5')).toBeTruthy();
      });
      fireEvent.press(getByText('Next Step'));
      fireEvent.press(getByText('Next Step'));
      fireEvent.press(getByText('Next Step'));
      fireEvent.press(getByText('Next Step'));
      fireEvent.press(getByText('Finish Session'));

      // After: select High level + 3 stress signs (score 9 + 3 = 12, clamped to 10)
      await waitFor(() => {
        expect(getByText('After-Session Check-In')).toBeTruthy();
      });
      fireEvent.press(getByText('High'));
      
      fireEvent.press(getByText('Hiding'));
      fireEvent.press(getByText('Panting'));

      // Save
      fireEvent.press(getByText('Finish & Save'));

      // Should show generic worsened signs prompt (Make it easier next time)
      await waitFor(() => {
        expect(getByText('Make it easier next time')).toBeTruthy();
        expect(queryByText('Strong signs noted')).toBeNull();
      });
    });
  });
});
