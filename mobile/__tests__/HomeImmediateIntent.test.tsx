import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SessionService from '../services/sessionService';
import PetProfileRepository from '../services/petProfileRepository';
import { SubscriptionProvider } from '../components/SubscriptionManager';

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
    // Helper to change mock profile in tests
    __setMockProfile: (profile: any) => {
      mockProfile = profile;
    }
  };
});

describe('SessionService - getHomeSnapshot', () => {
  beforeEach(async () => {
    // Reset async storage history by mocking local history
    jest.spyOn(SessionService, 'getLocalHistory').mockImplementation(() => Promise.resolve([]));
  });

  test('returns null latestPractice and latestCheckIn for empty history', async () => {
    const snapshot = await SessionService.getHomeSnapshot('test-pet-id');
    expect(snapshot.latestPractice).toBeNull();
    expect(snapshot.latestCheckIn).toBeNull();
  });

  test('filters history by exact petId', async () => {
    const mockHistory = [
      { id: '1', petId: 'other-pet-id', sessionId: 'daily_calm_reset', completedAt: '2026-07-15T10:00:00Z', completed: true, stoppedEarly: false, durationSeconds: 120 },
    ];
    jest.spyOn(SessionService, 'getLocalHistory').mockImplementation(() => Promise.resolve(mockHistory as any));

    const snapshot = await SessionService.getHomeSnapshot('test-pet-id');
    expect(snapshot.latestPractice).toBeNull();
  });

  test('sorts defensively by completedAt descending', async () => {
    const mockHistory = [
      { id: '1', petId: 'test-pet-id', sessionId: 'daily_calm_reset', completedAt: '2026-07-15T09:00:00Z', completed: true, stoppedEarly: false, durationSeconds: 120 },
      { id: '2', petId: 'test-pet-id', sessionId: 'outdoor_confidence_reset', completedAt: '2026-07-15T11:00:00Z', completed: true, stoppedEarly: false, durationSeconds: 120 },
      { id: '3', petId: 'test-pet-id', sessionId: 'daily_calm_reset', completedAt: '2026-07-15T10:00:00Z', completed: true, stoppedEarly: false, durationSeconds: 120 },
    ];
    jest.spyOn(SessionService, 'getLocalHistory').mockImplementation(() => Promise.resolve(mockHistory as any));

    const snapshot = await SessionService.getHomeSnapshot('test-pet-id');
    expect(snapshot.latestPractice?.sessionId).toBe('outdoor_confidence_reset');
  });

  test('returns latestPractice even when that entry has no check-in', async () => {
    const mockHistory = [
      { id: '1', petId: 'test-pet-id', sessionId: 'daily_calm_reset', completedAt: '2026-07-15T10:00:00Z', completed: true, stoppedEarly: false, durationSeconds: 120 },
    ];
    jest.spyOn(SessionService, 'getLocalHistory').mockImplementation(() => Promise.resolve(mockHistory as any));

    const snapshot = await SessionService.getHomeSnapshot('test-pet-id');
    expect(snapshot.latestPractice).not.toBeNull();
    expect(snapshot.latestCheckIn).toBeNull();
  });

  test('independently returns the latest entry containing a check-in', async () => {
    const mockHistory = [
      { id: '1', petId: 'test-pet-id', sessionId: 'daily_calm_reset', completedAt: '2026-07-15T11:00:00Z', completed: true, stoppedEarly: false, durationSeconds: 120 }, // Newer but no checkin
      { id: '2', petId: 'test-pet-id', sessionId: 'outdoor_confidence_reset', completedAt: '2026-07-15T10:00:00Z', completed: true, stoppedEarly: false, durationSeconds: 120, afterCheckin: { id: 'c1', petId: 'test-pet-id', sessionId: 'outdoor_confidence_reset', timestamp: '2026-07-15T10:00:00Z', phase: 'after' as const, overallLevel: 'mild' as const, selectedSigns: ['panting'] } },
    ];
    jest.spyOn(SessionService, 'getLocalHistory').mockImplementation(() => Promise.resolve(mockHistory as any));

    const snapshot = await SessionService.getHomeSnapshot('test-pet-id');
    expect(snapshot.latestPractice?.sessionId).toBe('daily_calm_reset');
    expect(snapshot.latestCheckIn?.sessionId).toBe('outdoor_confidence_reset');
  });

  test('prefers afterCheckin over beforeCheckin within the same entry', async () => {
    const mockHistory = [
      {
        id: '1',
        petId: 'test-pet-id',
        sessionId: 'daily_calm_reset',
        completedAt: '2026-07-15T10:00:00Z',
        completed: true,
        stoppedEarly: false,
        durationSeconds: 120,
        beforeCheckin: { id: 'b1', petId: 'test-pet-id', sessionId: 'daily_calm_reset', timestamp: '2026-07-15T09:55:00Z', phase: 'before' as const, overallLevel: 'moderate' as const, selectedSigns: ['panting', 'hiding'] },
        afterCheckin: { id: 'a1', petId: 'test-pet-id', sessionId: 'daily_calm_reset', timestamp: '2026-07-15T10:00:00Z', phase: 'after' as const, overallLevel: 'calm' as const, selectedSigns: [] }
      },
    ];
    jest.spyOn(SessionService, 'getLocalHistory').mockImplementation(() => Promise.resolve(mockHistory as any));

    const snapshot = await SessionService.getHomeSnapshot('test-pet-id');
    expect(snapshot.latestCheckIn?.phase).toBe('after');
    expect(snapshot.latestCheckIn?.score).toBe(0); // calm, no signs
  });

  test('preserves severe-sign information', async () => {
    const mockHistory = [
      {
        id: '1',
        petId: 'test-pet-id',
        sessionId: 'daily_calm_reset',
        completedAt: '2026-07-15T10:00:00Z',
        completed: true,
        stoppedEarly: false,
        durationSeconds: 120,
        afterCheckin: { id: 'a1', petId: 'test-pet-id', sessionId: 'daily_calm_reset', timestamp: '2026-07-15T10:00:00Z', phase: 'after' as const, overallLevel: 'high' as const, selectedSigns: ['aggression'] }
      },
    ];
    jest.spyOn(SessionService, 'getLocalHistory').mockImplementation(() => Promise.resolve(mockHistory as any));

    const snapshot = await SessionService.getHomeSnapshot('test-pet-id');
    expect(snapshot.latestCheckIn?.hasSevereSigns).toBe(true);
    expect(snapshot.latestCheckIn?.severeSignsNote).toContain('aggression');
  });

  test('handles missing routine definitions and invalid completedAt values without throwing', async () => {
    const mockHistory = [
      { id: '1', petId: 'test-pet-id', sessionId: 'invalid_session_id', completedAt: 'invalid-date-string', completed: true, stoppedEarly: false, durationSeconds: 120 },
    ];
    jest.spyOn(SessionService, 'getLocalHistory').mockImplementation(() => Promise.resolve(mockHistory as any));

    const snapshot = await SessionService.getHomeSnapshot('test-pet-id');
    expect(snapshot.latestPractice?.sessionTitle).toBe('Unknown Routine');
    expect(snapshot.latestPractice?.completedAt).toBe('invalid-date-string');
  });
});

describe('DashboardScreen - Rebuilt Home', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    require('../services/petProfileRepository').__setMockProfile({
      id: 'test-pet-id',
      petName: 'Buddy',
      anxietyScore: 5,
      anxietyTriggers: ['loud_noises']
    });
  });

  test('renders compact header, prompt, immediate actions, and suggestion in order', async () => {
    jest.spyOn(SessionService, 'getHomeSnapshot').mockImplementation(() => Promise.resolve({
      latestPractice: null,
      latestCheckIn: null
    }));

    const { getByText, getByTestId } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(getByText('ChillPup')).toBeTruthy();
      expect(getByText("Hi, Buddy's owner 👋")).toBeTruthy();
      expect(getByText('What would you like to do?')).toBeTruthy();
      expect(getByTestId('home-action-routines')).toBeTruthy();
      expect(getByTestId('home-action-sounds')).toBeTruthy();
      expect(getByText('Suggested from your profile')).toBeTruthy();
    });
  });

  test('pressing Browse routines navigates to Routines tab sibling', async () => {
    jest.spyOn(SessionService, 'getHomeSnapshot').mockImplementation(() => Promise.resolve({
      latestPractice: null,
      latestCheckIn: null
    }));

    const { getByTestId } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    await waitFor(() => {
      const browseBtn = getByTestId('home-action-routines');
      fireEvent.press(browseBtn);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Routines');
    });
  });

  test('pressing Calming sounds navigates to Sounds tab sibling and does not call audio APIs', async () => {
    jest.spyOn(SessionService, 'getHomeSnapshot').mockImplementation(() => Promise.resolve({
      latestPractice: null,
      latestCheckIn: null
    }));

    const { getByTestId } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    await waitFor(() => {
      const soundsBtn = getByTestId('home-action-sounds');
      fireEvent.press(soundsBtn);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Sounds');
    });
  });

  test('renders Suggested from your profile with correct CTA and copy', async () => {
    jest.spyOn(SessionService, 'getHomeSnapshot').mockImplementation(() => Promise.resolve({
      latestPractice: null,
      latestCheckIn: null
    }));

    const { getByText, getByTestId } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(getByText(/Based on the triggers saved in Buddy's profile — not a live assessment./)).toBeTruthy();
      const suggestionCard = getByTestId('suggested-routine-card');
      expect(suggestionCard).toBeTruthy();
      expect(getByText('View routine')).toBeTruthy();
    });
  });

  test('suggestion fallback is rendered when no recommendation can be resolved', async () => {
    // Set triggers to empty so no specific routine matches and we simulate null recommended
    require('../services/petProfileRepository').__setMockProfile({
      id: 'test-pet-id',
      petName: 'Buddy',
      anxietyScore: 5,
      anxietyTriggers: []
    });
    // Force sessions to be empty to ensure no recommended routine is resolved
    jest.spyOn(SessionService, 'getSessions').mockReturnValue([]);

    jest.spyOn(SessionService, 'getHomeSnapshot').mockImplementation(() => Promise.resolve({
      latestPractice: null,
      latestCheckIn: null
    }));

    const { getByTestId, queryByTestId } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(getByTestId('suggestion-fallback-card')).toBeTruthy();
      expect(queryByTestId('suggested-routine-card')).toBeNull();
    });
  });

  test('saved check-in renders Latest check-in with record-derived score and date', async () => {
    jest.spyOn(SessionService, 'getHomeSnapshot').mockImplementation(() => Promise.resolve({
      latestPractice: null,
      latestCheckIn: {
        sessionId: 'daily_calm_reset',
        sessionTitle: 'Daily Calm Reset',
        completedAt: '2026-07-15T10:00:00Z',
        phase: 'after',
        score: 3,
        levelLabel: 'Very Calm',
        hasSevereSigns: false,
        severeSignsNote: ''
      }
    }));

    const { getByText, getByTestId } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(getByTestId('latest-checkin-card')).toBeTruthy();
      expect(getByText('Very Calm')).toBeTruthy();
      expect(getByText('3/10')).toBeTruthy();
      expect(getByText(/Jul 15, 2026/)).toBeTruthy();
      expect(getByText('Owner-reported signs from your latest saved check-in.')).toBeTruthy();
    });
  });

  test('no check-in renders honest empty state without score fallback or fabricated date', async () => {
    jest.spyOn(SessionService, 'getHomeSnapshot').mockImplementation(() => Promise.resolve({
      latestPractice: null,
      latestCheckIn: null
    }));

    const { getByTestId, queryByText, queryByTestId } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(getByTestId('latest-checkin-empty')).toBeTruthy();
      expect(queryByTestId('latest-checkin-card')).toBeNull();
      // Should not fall back to Buddy's profile anxietyScore (5/10)
      expect(queryByText('5/10')).toBeNull();
    });
  });

  test('recent practice renders Completed status correctly', async () => {
    jest.spyOn(SessionService, 'getHomeSnapshot').mockImplementation(() => Promise.resolve({
      latestPractice: { sessionId: 'daily_calm_reset', sessionTitle: 'Daily Calm Reset', completedAt: '2026-07-15T10:00:00Z', completed: true, stoppedEarly: false },
      latestCheckIn: null
    }));

    const { getByText, getByTestId } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(getByTestId('recent-practice-card')).toBeTruthy();
      expect(getByText('Completed')).toBeTruthy();
    });
  });

  test('recent practice renders Stopped early status correctly', async () => {
    jest.spyOn(SessionService, 'getHomeSnapshot').mockImplementation(() => Promise.resolve({
      latestPractice: { sessionId: 'daily_calm_reset', sessionTitle: 'Daily Calm Reset', completedAt: '2026-07-15T10:00:00Z', completed: false, stoppedEarly: true },
      latestCheckIn: null
    }));

    const { getByText, getByTestId } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(getByTestId('recent-practice-card')).toBeTruthy();
      expect(getByText('Stopped early')).toBeTruthy();
    });
  });

  test('recent practice renders Saved status correctly', async () => {
    jest.spyOn(SessionService, 'getHomeSnapshot').mockImplementation(() => Promise.resolve({
      latestPractice: { sessionId: 'daily_calm_reset', sessionTitle: 'Daily Calm Reset', completedAt: '2026-07-15T10:00:00Z', completed: false, stoppedEarly: false },
      latestCheckIn: null
    }));

    const { getByText, getByTestId } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(getByTestId('recent-practice-card')).toBeTruthy();
      expect(getByText('Saved')).toBeTruthy();
    });
  });

  test('historical severe-sign check-in displays safety warning box', async () => {
    jest.spyOn(SessionService, 'getHomeSnapshot').mockImplementation(() => Promise.resolve({
      latestPractice: null,
      latestCheckIn: {
        sessionId: 'daily_calm_reset',
        sessionTitle: 'Daily Calm Reset',
        completedAt: '2026-07-15T10:00:00Z',
        phase: 'after',
        score: 8,
        levelLabel: 'Elevated Signs',
        hasSevereSigns: true,
        severeSignsNote: 'vomiting'
      }
    }));

    const { getByTestId, getByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(getByTestId('historical-severe-warning')).toBeTruthy();
      expect(getByText(/Strong signs were noted in your latest saved check-in. Stop the routine if strong signs appear./)).toBeTruthy();
    });
  });

  test('prohibited elements like Trend chart, Details toggle, and category headers are absent from Home', async () => {
    jest.spyOn(SessionService, 'getHomeSnapshot').mockImplementation(() => Promise.resolve({
      latestPractice: null,
      latestCheckIn: null
    }));

    const { queryByText, queryByTestId } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(queryByText('Stress Signs Trend')).toBeNull();
      expect(queryByTestId('trend-details-toggle')).toBeNull();
      expect(queryByText('Foundation')).toBeNull();
      expect(queryByText('Current Signs')).toBeNull();
    });
  });

  test('View progress button navigates to Progress tab sibling', async () => {
    jest.spyOn(SessionService, 'getHomeSnapshot').mockImplementation(() => Promise.resolve({
      latestPractice: null,
      latestCheckIn: null
    }));

    const { getByTestId } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    await waitFor(() => {
      const progressBtn = getByTestId('view-progress-button');
      fireEvent.press(progressBtn);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Progress');
    });
  });

  test('Settings button navigates to Settings screen in stack', async () => {
    jest.spyOn(SessionService, 'getHomeSnapshot').mockImplementation(() => Promise.resolve({
      latestPractice: null,
      latestCheckIn: null
    }));

    const { getByTestId } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    await waitFor(() => {
      const settingsBtn = getByTestId('settings-button');
      fireEvent.press(settingsBtn);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Settings');
    });
  });

  test('missing-profile flow displays add pet fallback and hides other sections', async () => {
    // Set mock profile to null to simulate no pet profile
    require('../services/petProfileRepository').__setMockProfile(null);

    const { getByText, queryByText, queryByTestId } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(getByText('Add First Pet')).toBeTruthy();
      expect(queryByText('Suggested from your profile')).toBeNull();
      expect(queryByText('Latest check-in')).toBeNull();
      expect(queryByText('Recent practice')).toBeNull();
    });
  });
});
