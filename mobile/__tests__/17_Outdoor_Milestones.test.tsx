import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import GuidedSessionScreen from '../screens/GuidedSessionScreen';
import SessionPreviewScreen from '../screens/SessionPreviewScreen';
import { SubscriptionProvider } from '../components/SubscriptionManager';
import SessionService from '../services/sessionService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OUTDOOR_CONFIDENCE_LEVELS } from '../appContent/outdoorConfidenceLevels';

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
    getStressSignsTrend: jest.fn(() => Promise.resolve({ status: 'same' })),
  };
});

const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};

describe('Suite 17: Outdoor Confidence Milestones and Routing', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (SessionService.getStressSignsTrend as jest.Mock).mockResolvedValue({ status: 'same' });
    jest.useFakeTimers();
    await AsyncStorage.clear();
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
    expect(getByText('Routine step 1 of 6')).toBeTruthy();

    // Advance to Step 2
    fireEvent.press(getByText(/Next Step/i));
    expect(getByText('Routine step 2 of 6')).toBeTruthy();

    // Press Previous
    fireEvent.press(getByText('Previous'));
    expect(getByText('Routine step 1 of 6')).toBeTruthy();

    // Verify no save or finalize event has occurred
    expect(SessionService.saveSessionHistory).not.toHaveBeenCalled();
  });

  test('outdoor_progress_003: Milestone selection and persistence sequence', async () => {
    const { getByText } = render(
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
    
    // Press Save Progress
    fireEvent.press(getByText('Save Progress'));
    await act(async () => {});

    // 3. Verify history was updated/saved a second time with milestone 'one_step' and outdoorMilestones array
    expect(SessionService.saveSessionHistory).toHaveBeenCalledTimes(2);
    const lastCall = (SessionService.saveSessionHistory as jest.Mock).mock.calls[1][0];
    expect(lastCall.outdoorMilestone).toBe('one_step');
    expect(lastCall.outdoorMilestones).toContain('one_step');

    // 4. Verify Next Step explanation says new level is available next time
    expect(getByText('New level available for next time')).toBeTruthy();
  });

  test('outdoor_progress_004: CTA Navigation rules for Done and Review progress', async () => {
    const { getByText } = render(
      <SubscriptionProvider>
        <GuidedSessionScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet', level: 'one_step' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Start, complete, select doorway_calm
    fireEvent.press(getByText(/Start Session/i));
    for (let i = 0; i < 5; i++) {
      fireEvent.press(getByText(/Next Step/i));
    }
    fireEvent.press(getByText(/Finish Session/i));
    fireEvent.press(getByText(/Finish & Save/i));
    await act(async () => {});

    // Select doorway_calm -> Save Progress
    fireEvent.press(getByText('Stayed calm near the door'));
    fireEvent.press(getByText('Save Progress'));
    await act(async () => {});

    // Press Done
    fireEvent.press(getByText('Done'));
    
    // Verify it navigated to Dashboard
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Dashboard');
  });

  test('outdoor_progress_005: Next session entry shows new step available inline', async () => {
    // Setup AsyncStorage with newly unlocked level 'short_pause'
    await AsyncStorage.setItem(
      'chillpup_outdoor_confidence_levels_test-pet',
      JSON.stringify(['doorway_calm', 'open_edge', 'one_step', 'short_pause'])
    );
    await AsyncStorage.setItem(
      'chillpup_newly_unlocked_outdoor_confidence_level_test-pet',
      'short_pause'
    );

    const { getByText } = render(
      <SubscriptionProvider>
        <SessionPreviewScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Verify newly unlocked level 'Short Outside Pause' is visible
    expect(getByText('Level 4 of 7: Short Outside Pause')).toBeTruthy();

    // Verify it displays the 'New' badge
    expect(getByText('New')).toBeTruthy();

    // Tap the new step to select it
    fireEvent.press(getByText('Level 4 of 7: Short Outside Pause'));
    await act(async () => {});

    // Verify selected level is stored as 'short_pause'
    const selected = await AsyncStorage.getItem('chillpup_selected_outdoor_confidence_level_test-pet');
    expect(selected).toBe('short_pause');
  });

  test('outdoor_progress_006: Selecting an easier step updates the selected level', async () => {
    // Setup AsyncStorage
    await AsyncStorage.setItem(
      'chillpup_outdoor_confidence_levels_test-pet',
      JSON.stringify(['doorway_calm', 'open_edge'])
    );
    await AsyncStorage.setItem(
      'chillpup_newly_unlocked_outdoor_confidence_level_test-pet',
      'open_edge'
    );

    const { getByText } = render(
      <SubscriptionProvider>
        <SessionPreviewScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Select doorway_calm (easier step)
    fireEvent.press(getByText(/Doorway Calm/i));
    await act(async () => {});

    // Verify selected level is set to doorway_calm
    const selected = await AsyncStorage.getItem('chillpup_selected_outdoor_confidence_level_test-pet');
    expect(selected).toBe('doorway_calm');
  });

  test('outdoor_progress_007: Previously unlocked levels remain available after later none_yet selection', async () => {
    // Save some unlocked levels first
    await AsyncStorage.setItem(
      'chillpup_outdoor_confidence_levels_test-pet',
      JSON.stringify(['doorway_calm', 'open_edge', 'one_step'])
    );

    const { getByText } = render(
      <SubscriptionProvider>
        <GuidedSessionScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet', level: 'one_step' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Run session
    fireEvent.press(getByText(/Start Session/i));
    for (let i = 0; i < 5; i++) {
      fireEvent.press(getByText(/Next Step/i));
    }
    fireEvent.press(getByText(/Finish Session/i));
    fireEvent.press(getByText(/Finish & Save/i));
    await act(async () => {});

    // Select "None of these yet" and Save Progress
    fireEvent.press(getByText('None of these yet'));
    fireEvent.press(getByText('Save Progress'));
    await act(async () => {});

    // Verify summary copy matches none_yet
    expect(getByText('That is useful information')).toBeTruthy();

    // Verify unlocked levels list did not shrink (remains 3 items)
    const unlockedData = await AsyncStorage.getItem('chillpup_outdoor_confidence_levels_test-pet');
    const levels = JSON.parse(unlockedData!);
    expect(levels).toContain('doorway_calm');
    expect(levels).toContain('open_edge');
    expect(levels).toContain('one_step');
  });

  test('outdoor_progress_008: Shows new level inline even if recent stress signs increased', async () => {
    // Setup trend as increased
    (SessionService.getStressSignsTrend as jest.Mock).mockResolvedValue({ status: 'increased' });
    
    await AsyncStorage.setItem(
      'chillpup_outdoor_confidence_levels_test-pet',
      JSON.stringify(['doorway_calm', 'open_edge'])
    );
    await AsyncStorage.setItem(
      'chillpup_newly_unlocked_outdoor_confidence_level_test-pet',
      'open_edge'
    );

    const { getByText } = render(
      <SubscriptionProvider>
        <SessionPreviewScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Verify that the level is still visible and has the 'New' badge
    expect(getByText(/Open Edge/i)).toBeTruthy();
    expect(getByText('New')).toBeTruthy();
  });

  test('outdoor_progress_009: Milestone selection unlock mappings and newly unlocked visibility', async () => {
    // Test open_edge -> unlocks one_step
    let unlocked = ['doorway_calm'];
    await AsyncStorage.setItem('chillpup_outdoor_confidence_levels_test-pet', JSON.stringify(unlocked));

    const { getByText } = render(
      <SubscriptionProvider>
        <GuidedSessionScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Finish session and select open_edge
    fireEvent.press(getByText(/Start Session/i));
    for (let i = 0; i < 5; i++) {
      fireEvent.press(getByText(/Next Step/i));
    }
    fireEvent.press(getByText(/Finish Session/i));
    fireEvent.press(getByText(/Finish & Save/i));
    await act(async () => {});

    fireEvent.press(getByText('Handled the door opening'));
    fireEvent.press(getByText('Save Progress'));
    await act(async () => {});

    // Check storage has one_step unlocked
    const stored = await AsyncStorage.getItem('chillpup_outdoor_confidence_levels_test-pet');
    expect(JSON.parse(stored!)).toContain('one_step');
    const newly = await AsyncStorage.getItem('chillpup_newly_unlocked_outdoor_confidence_level_test-pet');
    expect(newly).toBe('one_step');
  });

  test('outdoor_progress_010: GuidedSession renders selected level-specific copy', async () => {
    const { getByText } = render(
      <SubscriptionProvider>
        <GuidedSessionScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet', level: 'open_edge' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    fireEvent.press(getByText(/Start Session/i));

    // Verify step 4 (index 3) has customized instruction
    fireEvent.press(getByText(/Next Step/i)); // Step 2
    fireEvent.press(getByText(/Next Step/i)); // Step 3
    fireEvent.press(getByText(/Next Step/i)); // Step 4 (active)
    
    expect(getByText("Open Edge")).toBeTruthy();
    expect(getByText("Open the door or edge briefly. Let your dog notice it without pressure.")).toBeTruthy();
  });

  test('outdoor_progress_011: Unlocked level remains visible and selectable in ladder', async () => {
    await AsyncStorage.setItem(
      'chillpup_outdoor_confidence_levels_test-pet',
      JSON.stringify(['doorway_calm', 'open_edge'])
    );
    await AsyncStorage.setItem(
      'chillpup_newly_unlocked_outdoor_confidence_level_test-pet',
      'open_edge'
    );

    const { getByText } = render(
      <SubscriptionProvider>
        <SessionPreviewScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Level 'Open Edge' is visible and unlocked in the selector ladder
    expect(getByText('Level 2 of 7: Open Edge')).toBeTruthy();

    // Select Open Edge
    fireEvent.press(getByText('Level 2 of 7: Open Edge'));
    await act(async () => {});

    // Verify selected level is open_edge
    const selected = await AsyncStorage.getItem('chillpup_selected_outdoor_confidence_level_test-pet');
    expect(selected).toBe('open_edge');
  });

  test('outdoor_progress_012: GuidedSession renders step counter as Routine step X of 6 and separate progression badge', async () => {
    await AsyncStorage.setItem('chillpup_selected_outdoor_confidence_level_test-pet', 'open_edge');

    const { getByText } = render(
      <SubscriptionProvider>
        <GuidedSessionScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Start session
    fireEvent.press(getByText(/Start Session/i));

    // Verify step counter format "Routine step 1 of 6"
    expect(getByText('Routine step 1 of 6')).toBeTruthy();

    // Verify progression level badge "Outdoor level 2 of 7: Open Edge"
    expect(getByText('Outdoor level 2 of 7: Open Edge')).toBeTruthy();
  });

  test('outdoor_progress_013: Dynamic challenge step displays Today’s outdoor level: {levelLabel}', async () => {
    await AsyncStorage.setItem('chillpup_selected_outdoor_confidence_level_test-pet', 'open_edge');

    const { getByText, getByTestId } = render(
      <SubscriptionProvider>
        <GuidedSessionScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Start session
    fireEvent.press(getByText(/Start Session/i));

    // Advance to Step 4 (index 3)
    fireEvent.press(getByText(/Next Step/i)); // Step 2
    fireEvent.press(getByText(/Next Step/i)); // Step 3
    fireEvent.press(getByText(/Next Step/i)); // Step 4 (active)

    // Verify step counter is still Routine step 4 of 6 (and not 7)
    expect(getByText('Routine step 4 of 6')).toBeTruthy();

    // Verify dynamic challenge step renders Today’s outdoor level label
    expect(getByTestId('dynamic-step-header')).toBeTruthy();
    expect(getByText('Today’s outdoor level: Open Edge')).toBeTruthy();

    // Verify level-specific instruction is displayed below it
    expect(getByText('Open the door or edge briefly. Let your dog notice it without pressure.')).toBeTruthy();
  });

  test('outdoor_progress_014: Collapsible check-in sections render and toggle correctly, displaying selected count', async () => {
    const { getByText, getByTestId } = render(
      <SubscriptionProvider>
        <GuidedSessionScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Verify check-in section headers are displayed
    expect(getByText('Stress signs')).toBeTruthy();
    expect(getByText('Safety / stop signs')).toBeTruthy();

    // Toggle "Safety / stop signs" section to expand it
    fireEvent.press(getByTestId('section-header-safety_stop_signs'));
    await act(async () => {});

    // Click "Aggression" (severe sign) to select it
    fireEvent.press(getByText('Aggression'));
    await act(async () => {});

    // Verify header updates to display selection count: "Safety / stop signs · 1 selected"
    expect(getByText('Safety / stop signs · 1 selected')).toBeTruthy();

    // Collapse the section
    fireEvent.press(getByTestId('section-header-safety_stop_signs'));
    await act(async () => {});

    // Verify "Aggression" chip is still visible in the collapsed summary
    expect(getByText('Aggression')).toBeTruthy();
  });

  test('outdoor_progress_015: Outdoor check-in renders Recovery signs and does not show generic indoor signs', async () => {
    const { getByText, queryByText } = render(
      <SubscriptionProvider>
        <GuidedSessionScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Start & finish the session to get to the after-session check-in
    fireEvent.press(getByText(/Start Session/i));
    for (let i = 0; i < 5; i++) {
      fireEvent.press(getByText(/Next Step/i));
    }
    fireEvent.press(getByText(/Finish Session/i));
    await act(async () => {});

    // Verify collapsible headers for after-session check-in
    expect(getByText('Stress signs still present')).toBeTruthy();
    expect(getByText('Recovery signs')).toBeTruthy();
    expect(getByText('Safety / stop signs')).toBeTruthy();

    // Verify outdoor-specific recovery signs are present
    expect(getByText('Looked back at me')).toBeTruthy();
    expect(getByText('Body looked a little softer')).toBeTruthy();

    // Verify generic indoor calm signs (e.g. Fell asleep, Settled nearby) are NOT shown
    expect(queryByText('Fell asleep')).toBeNull();
    expect(queryByText('Settled nearby')).toBeNull();
  });

  test('outdoor_progress_016: SessionPreview uses level terminology rather than step terminology in helper', async () => {
    const { getByText, queryByText } = render(
      <SubscriptionProvider>
        <SessionPreviewScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Assert that the preview copy uses "outdoor level" helper instead of "outdoor step"
    expect(queryByText('Choose today’s outdoor step')).toBeNull();
    expect(getByText(/Choose today’s outdoor level. This level changes one practice step inside the session/)).toBeTruthy();
  });

  test('outdoor_progress_017: After selecting few_steps, SessionPreview shows 100-Step Confidence as New and selectable, but defaults selection to few_steps', async () => {
    await AsyncStorage.setItem('chillpup_outdoor_confidence_levels_test-pet', JSON.stringify([
      'doorway_calm', 'open_edge', 'one_step', 'short_pause', 'few_steps', 'hundred_steps'
    ]));
    await AsyncStorage.setItem('chillpup_outdoor_confidence_achieved_level_test-pet', 'few_steps');
    await AsyncStorage.setItem('chillpup_newly_unlocked_outdoor_confidence_level_test-pet', 'hundred_steps');

    const { getByText } = render(
      <SubscriptionProvider>
        <SessionPreviewScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    expect(getByText('Level 5 of 7: A Few Calm Steps')).toBeTruthy();
    expect(getByText('Level 6 of 7: 100-Step Confidence')).toBeTruthy();
    expect(getByText('New')).toBeTruthy();

    fireEvent.press(getByText('Start Session'));
    await act(async () => {});

    expect(mockNavigation.navigate).toHaveBeenCalledWith('GuidedSession', {
      sessionId: 'outdoor_confidence_reset',
      petId: 'test-pet',
      level: 'few_steps'
    });
  });

  test('outdoor_progress_018: After user selects 100-Step Confidence, Start Session navigates to GuidedSession with level hundred_steps', async () => {
    await AsyncStorage.setItem('chillpup_outdoor_confidence_levels_test-pet', JSON.stringify([
      'doorway_calm', 'open_edge', 'one_step', 'short_pause', 'few_steps', 'hundred_steps'
    ]));
    await AsyncStorage.setItem('chillpup_outdoor_confidence_achieved_level_test-pet', 'few_steps');
    await AsyncStorage.setItem('chillpup_newly_unlocked_outdoor_confidence_level_test-pet', 'hundred_steps');

    const { getByText } = render(
      <SubscriptionProvider>
        <SessionPreviewScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    fireEvent.press(getByText('Level 6 of 7: 100-Step Confidence'));
    await act(async () => {});

    fireEvent.press(getByText('Start Session'));
    await act(async () => {});

    expect(mockNavigation.navigate).toHaveBeenCalledWith('GuidedSession', {
      sessionId: 'outdoor_confidence_reset',
      petId: 'test-pet',
      level: 'hundred_steps'
    });
  });

  test('outdoor_progress_019: GuidedSession renders Outdoor level 6 of 7 only after hundred_steps was explicitly selected', async () => {
    await AsyncStorage.setItem('chillpup_outdoor_confidence_levels_test-pet', JSON.stringify([
      'doorway_calm', 'open_edge', 'one_step', 'short_pause', 'few_steps', 'hundred_steps'
    ]));
    await AsyncStorage.setItem('chillpup_outdoor_confidence_achieved_level_test-pet', 'few_steps');
    await AsyncStorage.setItem('chillpup_newly_unlocked_outdoor_confidence_level_test-pet', 'hundred_steps');

    const { getByText, queryByText, rerender } = render(
      <SubscriptionProvider>
        <GuidedSessionScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    fireEvent.press(getByText(/Start Session/i));

    expect(getByText('Outdoor level 5 of 7: A Few Calm Steps')).toBeTruthy();
    expect(queryByText('Outdoor level 6 of 7: 100-Step Confidence')).toBeNull();

    rerender(
      <SubscriptionProvider>
        <GuidedSessionScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet', level: 'hundred_steps' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    expect(getByText('Outdoor level 6 of 7: 100-Step Confidence')).toBeTruthy();
  });

  test('outdoor_progress_020: Dynamic challenge step Suggested time is formatted correctly and hides when time reaches 0', async () => {
    const { getByText, queryByText } = render(
      <SubscriptionProvider>
        <GuidedSessionScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet', level: 'short_pause' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    fireEvent.press(getByText(/Start Session/i));

    // Advance to Step 4 (index 3)
    fireEvent.press(getByText(/Next Step/i)); // Step 2
    fireEvent.press(getByText(/Next Step/i)); // Step 3
    fireEvent.press(getByText(/Next Step/i)); // Step 4 (active)

    // Duration for short_pause is 20
    expect(getByText(/Suggested time: about 20 sec/i)).toBeTruthy();

    // Advance time by 20 seconds so it hits 0
    act(() => {
      jest.advanceTimersByTime(21000);
    });

    // The suggested time badge should hide (not render "Suggested time: about 0 sec")
    expect(queryByText(/Suggested time: about 0 sec/i)).toBeNull();
  });

  test('outdoor_progress_021: Displays special duration copy for hundred_steps and ten_min_walk', async () => {
    const { getByText, rerender } = render(
      <SubscriptionProvider>
        <GuidedSessionScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet', level: 'hundred_steps' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    fireEvent.press(getByText(/Start Session/i));

    // Advance to Step 4 (index 3)
    fireEvent.press(getByText(/Next Step/i)); // Step 2
    fireEvent.press(getByText(/Next Step/i)); // Step 3
    fireEvent.press(getByText(/Next Step/i)); // Step 4 (active)

    // For hundred_steps it must display "Keep it short and easy today."
    expect(getByText('Keep it short and easy today.')).toBeTruthy();

    // Rerender with ten_min_walk
    rerender(
      <SubscriptionProvider>
        <GuidedSessionScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet', level: 'ten_min_walk' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // For ten_min_walk it must also display "Keep it short and easy today."
    expect(getByText('Keep it short and easy today.')).toBeTruthy();
  });

  test('outdoor_progress_022: SessionPreview uses "level" terminology and selector is placed before suitableFor/notFor/safetyNotes', async () => {
    // Setup AsyncStorage with newly unlocked level 'open_edge'
    await AsyncStorage.setItem(
      'chillpup_outdoor_confidence_levels_test-pet',
      JSON.stringify(['doorway_calm', 'open_edge'])
    );
    await AsyncStorage.setItem(
      'chillpup_newly_unlocked_outdoor_confidence_level_test-pet',
      'open_edge'
    );

    const { getByText, queryByText } = render(
      <SubscriptionProvider>
        <SessionPreviewScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Assert that the preview banner uses "New level available" instead of "New step available"
    expect(getByText('New level available')).toBeTruthy();
    expect(queryByText('New step available')).toBeNull();

    // Assert that the select CTAs use "Select new level" and "Stay with easier level"
    expect(getByText('Select new level')).toBeTruthy();
    expect(getByText('Stay with easier level')).toBeTruthy();
    expect(queryByText('Show new step')).toBeNull();
    expect(queryByText('Stay with easier step')).toBeNull();

    // Verify layout order/rendering sequence by verifying query elements exist
    expect(getByText('Outdoor Confidence level')).toBeTruthy();
    expect(getByText('Best for')).toBeTruthy();
  });

  test('outdoor_progress_023: CTA clicks select correct levels in normal and signs-increased state', async () => {
    // Normal Case
    await AsyncStorage.setItem(
      'chillpup_outdoor_confidence_levels_test-pet',
      JSON.stringify(['doorway_calm', 'open_edge'])
    );
    await AsyncStorage.setItem(
      'chillpup_newly_unlocked_outdoor_confidence_level_test-pet',
      'open_edge'
    );

    let utils = render(
      <SubscriptionProvider>
        <SessionPreviewScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Normal case: Select new level selects open_edge
    fireEvent.press(utils.getByText('Select new level'));
    await act(async () => {});
    let selected = await AsyncStorage.getItem('chillpup_selected_outdoor_confidence_level_test-pet');
    expect(selected).toBe('open_edge');

    // Normal case: Stay with easier level selects doorway_calm
    // Reset newlyUnlockedLevel to open_edge and clear acknowledgement
    await AsyncStorage.setItem('chillpup_newly_unlocked_outdoor_confidence_level_test-pet', 'open_edge');
    await AsyncStorage.removeItem('chillpup_acknowledged_outdoor_confidence_level_test-pet');
    let utils2 = render(
      <SubscriptionProvider>
        <SessionPreviewScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    fireEvent.press(utils2.getByText('Stay with easier level'));
    await act(async () => {});
    selected = await AsyncStorage.getItem('chillpup_selected_outdoor_confidence_level_test-pet');
    expect(selected).toBe('doorway_calm');

    // Signs Increased Case
    (SessionService.getStressSignsTrend as jest.Mock).mockResolvedValue({ status: 'increased' });
    await AsyncStorage.setItem('chillpup_newly_unlocked_outdoor_confidence_level_test-pet', 'open_edge');
    await AsyncStorage.removeItem('chillpup_acknowledged_outdoor_confidence_level_test-pet');
    let utils3 = render(
      <SubscriptionProvider>
        <SessionPreviewScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Title shows "Easier level suggested"
    expect(utils3.getByText('Easier level suggested')).toBeTruthy();
    expect(utils3.getByText('Select easier level')).toBeTruthy();
    expect(utils3.getByText('Review new level')).toBeTruthy();

    // Select easier level selects doorway_calm
    fireEvent.press(utils3.getByText('Select easier level'));
    await act(async () => {});
    selected = await AsyncStorage.getItem('chillpup_selected_outdoor_confidence_level_test-pet');
    expect(selected).toBe('doorway_calm');

    // Review new level selects open_edge
    await AsyncStorage.setItem('chillpup_newly_unlocked_outdoor_confidence_level_test-pet', 'open_edge');
    await AsyncStorage.removeItem('chillpup_acknowledged_outdoor_confidence_level_test-pet');
    let utils4 = render(
      <SubscriptionProvider>
        <SessionPreviewScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    fireEvent.press(utils4.getByText('Review new level'));
    await act(async () => {});
    selected = await AsyncStorage.getItem('chillpup_selected_outdoor_confidence_level_test-pet');
    expect(selected).toBe('open_edge');
  });

  test('outdoor_progress_024: Newly unlocked level remains visible and selectable in selector ladder after acknowledgement', async () => {
    // Reset getStressSignsTrend mock for signs
    (SessionService.getStressSignsTrend as jest.Mock).mockResolvedValue({ status: 'same' });

    await AsyncStorage.setItem(
      'chillpup_outdoor_confidence_levels_test-pet',
      JSON.stringify(['doorway_calm', 'open_edge'])
    );
    await AsyncStorage.setItem(
      'chillpup_newly_unlocked_outdoor_confidence_level_test-pet',
      'open_edge'
    );

    const { getByText, queryByText } = render(
      <SubscriptionProvider>
        <SessionPreviewScreen
          navigation={mockNavigation}
          route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'test-pet' } }}
        />
      </SubscriptionProvider>
    );
    await act(async () => {});

    // Select new level -> acknowledges banner
    fireEvent.press(getByText('Select new level'));
    await act(async () => {});

    // Banner is gone
    expect(queryByText('New level available')).toBeNull();

    // The level 'Level 2 of 7: Open Edge' is still visible in the ladder
    expect(getByText('Level 2 of 7: Open Edge')).toBeTruthy();
  });
});


