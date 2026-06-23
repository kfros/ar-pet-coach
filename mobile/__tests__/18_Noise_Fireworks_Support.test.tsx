import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import GuidedSessionScreen from '../screens/GuidedSessionScreen';
import { SubscriptionProvider } from '../components/SubscriptionManager';
import { NavigationContainer } from '@react-navigation/native';
import SessionService from '../services/sessionService';
import { CHECKIN_PROFILES } from '../appContent/checkInProfiles';
import { STRESS_SIGN_WEIGHTS, POSITIVE_SIGN_WEIGHTS } from '../services/progressScoring';

// Mock SubscriptionManager
jest.mock('../components/SubscriptionManager', () => ({
  SubscriptionProvider: ({ children }: any) => children,
  useSubscription: () => ({
    isPremium: true,
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

// Mock PetProfileRepository
jest.mock('../services/petProfileRepository', () => ({
  getPetProfile: jest.fn(() => Promise.resolve({ id: 'test-pet', petName: 'Buddy' })),
}));

// Mock SessionService with real sessions
jest.mock('../services/sessionService', () => {
  const actualService = jest.requireActual('../services/sessionService').default;
  const mockSave = jest.fn(() => Promise.resolve());
  return {
    getSessionById: (id: string) => actualService.getSessionById(id),
    getSessions: () => actualService.getSessions(),
    saveSessionHistory: mockSave,
    getLocalHistory: jest.fn(() => Promise.resolve([])),
    getRecentProgress: jest.fn(),
    getStressSignsTrend: jest.fn(() => Promise.resolve({ status: 'same', points: [], hasEnoughData: false })),
  };
});

const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};

describe('Noise & Fireworks Support Routines & Signs Integrity', () => {
    const sessions = SessionService.getSessions();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('noise_support_signs_profile: noise_support check-in profile contains specialized signs', () => {
        const profile = CHECKIN_PROFILES.noise_support;
        expect(profile).toBeDefined();
        expect(profile.beforePrompt).toBe("What signs do you notice before the noise support routine?");
        expect(profile.afterPrompt).toBe("What signs did you notice after the noise support routine?");

        const stressIds = profile.stressSigns.map(s => s.id);
        expect(stressIds).toContain('unable_to_settle');
        expect(stressIds).toContain('clawing_or_scratching_exits');

        const positiveIds = profile.positiveSigns?.map(s => s.id) || [];
        expect(positiveIds).toContain('accepted_food_or_chew');
        expect(positiveIds).toContain('rested_between_noises');
        expect(positiveIds).toContain('settled_near_owner');
        expect(positiveIds).toContain('returned_to_room');
        expect(positiveIds).toContain('explored_again');
        expect(positiveIds).toContain('recovered_after_hiding');
        expect(positiveIds).toContain('slept_after_event');
    });

    test('noise_support_scoring_weights: scoring weights are defined for new signs', () => {
        expect(STRESS_SIGN_WEIGHTS.unable_to_settle).toBe(1);
        expect(STRESS_SIGN_WEIGHTS.clawing_or_scratching_exits).toBe(2);

        expect(POSITIVE_SIGN_WEIGHTS.accepted_food_or_chew).toBe(1);
        expect(POSITIVE_SIGN_WEIGHTS.rested_between_noises).toBe(1);
        expect(POSITIVE_SIGN_WEIGHTS.settled_near_owner).toBe(1);
        expect(POSITIVE_SIGN_WEIGHTS.returned_to_room).toBe(1);
        expect(POSITIVE_SIGN_WEIGHTS.explored_again).toBe(1);
        expect(POSITIVE_SIGN_WEIGHTS.recovered_after_hiding).toBe(1);
        expect(POSITIVE_SIGN_WEIGHTS.slept_after_event).toBe(2);
    });

    test('free_routine_fireworks_loud_noises_basic: free routine constraints', () => {
        const freeRoutine = sessions.find(s => s.id === 'fireworks_loud_noises_basic');
        expect(freeRoutine).toBeDefined();
        expect(freeRoutine?.title).toBe("Thunder & Fireworks Safe Space");
        expect(freeRoutine?.subtitle).toBe("Safe-space support for noisy moments.");
        expect(freeRoutine?.category).toBe("noise_support");
        expect(freeRoutine?.checkInProfileId).toBe("noise_support");

        // Audio policy checks
        expect(freeRoutine?.backgroundSoundPolicy?.mode).toBe("calm_music");
        expect(freeRoutine?.backgroundSoundPolicy?.mode).not.toBe("owner_choice");
        expect(freeRoutine?.backgroundSoundPolicy?.defaultEnabled).toBe(false);
        expect(freeRoutine?.backgroundSoundPolicy?.showControls).toBe(true);
        expect(freeRoutine?.backgroundSoundPolicy?.helperText).toBe(
            "Optional calm background music is available. Skip it if your dog dislikes it. For sound masking, use a familiar household sound such as a fan, TV, or radio outside the app."
        );

        // Content checks
        const routineString = JSON.stringify(freeRoutine).toLowerCase();
        expect(routineString).not.toContain('phobia');
        expect(routineString).not.toContain('desensitization');
        expect(routineString).not.toContain('volume ladder');
        expect(routineString).not.toContain('sound exposure');
        expect(routineString).not.toContain('thunder recordings');
        expect(routineString).not.toContain('firework recordings');
        expect(routineString).not.toContain('fireworks recordings');
        expect(routineString).not.toContain('thunder audio');
        expect(routineString).not.toContain('fireworks audio');
        expect(routineString).not.toContain('firework audio');
        expect(routineString).not.toContain('recordings');
        
        // Assert free routine does not claim to provide built-in masking sounds
        expect(routineString).not.toContain('provides masking');
        expect(routineString).not.toContain('built-in masking');
        expect(routineString).not.toContain('in-app white noise');
        expect(routineString).not.toContain('in-app brown noise');
        expect(routineString).not.toContain('in-app fan');
    });

    test('premium_routine_fireworks_prep_routine: premium routine constraints', () => {
        const premiumRoutine = sessions.find(s => s.id === 'fireworks_prep_routine');
        expect(premiumRoutine).toBeDefined();
        expect(premiumRoutine?.title).toBe("Fireworks Prep: Calm-Day Practice");
        expect(premiumRoutine?.subtitle).toBe("Prepare a calm support plan before noisy days.");
        expect(premiumRoutine?.category).toBe("noise_support");
        expect(premiumRoutine?.checkInProfileId).toBe("noise_support");

        // Audio policy mode none
        expect(premiumRoutine?.backgroundSoundPolicy?.mode).toBe("none");
        expect(premiumRoutine?.backgroundSoundPolicy?.defaultEnabled).toBe(false);
        expect(premiumRoutine?.backgroundSoundPolicy?.showControls).toBe(false);

        // Content checks (No clinical language, phobias, or desensitization)
        const routineString = JSON.stringify(premiumRoutine).toLowerCase();
        expect(routineString).not.toContain('phobia');
        expect(routineString).not.toContain('desensitization');
        expect(routineString).not.toContain('volume ladder');
        expect(routineString).not.toContain('sound exposure');
        expect(routineString).not.toContain('thunder recordings');
        expect(routineString).not.toContain('firework recordings');
        expect(routineString).not.toContain('fireworks recordings');
        expect(routineString).not.toContain('thunder audio');
        expect(routineString).not.toContain('fireworks audio');
        expect(routineString).not.toContain('firework audio');
        expect(routineString).not.toContain('recordings');
        expect(routineString).not.toContain('expose');
        expect(routineString).not.toContain('audio tracks');

        // Verify the step wording update specifically (household background sounds)
        const maskingStep = premiumRoutine?.steps.find(step => step.id === 'prep_masking_plan');
        expect(maskingStep).toBeDefined();
        expect(maskingStep?.title).toBe("Test familiar household masking options");
        expect(maskingStep?.instruction).toBe(
            "On a calm day, try familiar household background sounds, such as a fan, TV, or radio, outside the app. Make sure your dog remains comfortable."
        );

        // Verify Step 6 content
        const lastStep = premiumRoutine?.steps.find(step => step.id === 'prep_recovery_plan');
        expect(lastStep).toBeDefined();
        expect(lastStep?.title).toBe("Plan what to watch");
        expect(lastStep?.instruction).toBe(
            "Choose what you want to notice after the noisy day: strongest signs, what helped, and how long recovery took. You can mark signs in the check-in after this session."
        );
        expect(lastStep?.instruction).not.toContain("recovery log");
        expect(lastStep?.instruction).not.toContain("episode log");
        expect(lastStep?.instruction).not.toContain("firebase");
        expect(lastStep?.instruction).not.toContain("database");

        // Safety notes mention veterinarian or behaviorist
        const safetyNotesText = JSON.stringify(premiumRoutine?.safetyNotes).toLowerCase();
        expect(safetyNotesText).toContain('veterinarian');
        expect(safetyNotesText).toContain('veterinary behaviorist');

        // No medication/dosage advice
        expect(routineString).not.toContain('mg/');
        expect(routineString).not.toContain('dosage');
        expect(routineString).not.toContain('medication');
        expect(routineString).not.toContain('gabapentin');
        expect(routineString).not.toContain('sileo');
        expect(routineString).not.toContain('trazodone');
        
        // Assert premium routine does not claim that ChillPup provides masking sounds
        expect(routineString).not.toContain('provides masking');
        expect(routineString).not.toContain('built-in masking');
    });

    test('premium_routine_checkin_integration: Finish Session and skip check-in behavior', async () => {
        const { getByText, queryByText } = render(
            <SubscriptionProvider>
                <NavigationContainer>
                    <GuidedSessionScreen 
                        navigation={mockNavigation} 
                        route={{ params: { sessionId: 'fireworks_prep_routine', petId: 'test-pet' } }} 
                    />
                </NavigationContainer>
            </SubscriptionProvider>
        );
        await act(async () => {});

        // 1. Initial State: Calm Check-In before session
        expect(getByText('Calm Check-In')).toBeTruthy();
        expect(getByText('What signs do you notice before the noise support routine?')).toBeTruthy();

        // 2. Skip check-in before session
        fireEvent.press(getByText('Skip Check-in'));
        await act(async () => {});

        // 3. guided session steps active
        expect(getByText('Plan the safe space')).toBeTruthy();

        // 4. Advance through all steps (6 steps)
        for (let i = 0; i < 5; i++) {
            fireEvent.press(getByText('Next Step'));
            await act(async () => {});
        }

        // 5. Final step: Finish Session
        const finishBtn = getByText('Finish Session');
        expect(finishBtn).toBeTruthy();
        fireEvent.press(finishBtn);
        await act(async () => {});

        // 6. After-Session Check-In
        expect(getByText('After-Session Check-In')).toBeTruthy();
        expect(getByText('What signs did you notice after the noise support routine?')).toBeTruthy();

        // Verify noise_support signs are rendered/available in after-session check-in
        expect(getByText('Unable to settle')).toBeTruthy();
        expect(getByText('Clawing/scratching at exits')).toBeTruthy();
        expect(getByText('Recovery signs')).toBeTruthy();

        // 7. Skip post-session check-in
        const skipPostCheckin = getByText('Skip Check-in');
        expect(skipPostCheckin).toBeTruthy();
        fireEvent.press(skipPostCheckin);
        await act(async () => {});

        // 8. Assert saveSessionHistory is called and redirects to dashboard
        expect(SessionService.saveSessionHistory).toHaveBeenCalledWith(expect.objectContaining({
            sessionId: 'fireworks_prep_routine',
            completed: true,
            stoppedEarly: false
        }));
        expect(mockNavigation.navigate).toHaveBeenCalledWith('Dashboard');
    });
});
