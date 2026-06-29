import SessionService from '../services/sessionService';
import { WALK_FEAR_PREMIUM_SESSIONS } from '../appContent/premiumRoutines/walkFear';
import { PREMIUM_SESSIONS } from '../appContent/premiumRoutines/index';

describe('Rain / Weather Potty Confidence Routine and Safety Boundaries', () => {
    const sessions = SessionService.getSessions();
    const targetRoutine = sessions.find(s => s.id === 'rain_weather_potty_confidence');

    test('routine_presence: routine exists in PREMIUM_SESSIONS and has correct metadata', () => {
        expect(targetRoutine).toBeDefined();
        expect(targetRoutine?.id).toBe('rain_weather_potty_confidence');
        expect(targetRoutine?.title).toBe('Rain / Weather Potty Confidence');
        expect(targetRoutine?.accessLevel).toBe('premium');
        expect(targetRoutine?.category).toBe('walk_fear');
        expect(targetRoutine?.categoryLabel).toBe('Walk Fear & Outdoor Confidence');
        expect(targetRoutine?.checkInProfileId).toBe('weather_potty_confidence');
        expect(targetRoutine?.difficulty).toBe('easy');
        expect(targetRoutine?.backgroundSoundPolicy?.mode).toBe('none');
    });

    test('category_and_aggregation: routine lives in walkFear module and aggregates correctly', () => {
        // Exists in walkFear.ts export
        const inWalkFear = WALK_FEAR_PREMIUM_SESSIONS.find(s => s.id === 'rain_weather_potty_confidence');
        expect(inWalkFear).toBeDefined();

        // Included in PREMIUM_SESSIONS aggregation
        const inPremiumAgg = PREMIUM_SESSIONS.find(s => s.id === 'rain_weather_potty_confidence');
        expect(inPremiumAgg).toBeDefined();

        // Category checks
        expect(targetRoutine?.category).not.toBe('noise_support');
        expect(targetRoutine?.category).toBe('walk_fear');
    });

    test('levels_and_scope: single short routine with correct scope', () => {
        const routineString = JSON.stringify(targetRoutine).toLowerCase();

        // No level/stage system or route planning/GPS/weather detection features
        expect(targetRoutine?.steps.some((s: any) => s.level !== undefined)).toBe(false);
        expect(routineString).not.toContain('gps');
        expect(routineString).not.toContain('route planner');
        expect(routineString).not.toContain('weather detector');
        expect(routineString).not.toContain('reminders');

        // Copy is about short sheltered potty attempts, not full walks
        expect(routineString).toContain('sheltered potty spot');
        expect(routineString).toContain('attempt');
        expect(routineString).not.toContain('full walk requirement');

        // Distinct from other premium routines
        expect(targetRoutine?.id).not.toBe('outdoor_confidence_reset');
        expect(targetRoutine?.id).not.toBe('post_fireworks_walk_rebuild');
        expect(targetRoutine?.id).not.toBe('night_walk_confidence');
    });

    test('step_structure: exactly 6 steps with short explanations, non-forced and vet safety first', () => {
        expect(targetRoutine?.steps).toBeDefined();
        const steps = targetRoutine?.steps || [];
        expect(steps.length).toBe(6);

        steps.forEach((step: any, index: number) => {
            expect(step.explanation).toBeDefined();
            expect(typeof step.explanation).toBe('string');
            expect(step.explanation.length).toBeGreaterThan(0);
        });

        // Step 1: Medical red flag check
        expect(steps[0].id).toBe('weather_potty_red_flag_check');
        expect(steps[0].title.toLowerCase()).toContain('check red flags');
        expect(steps[0].instruction.toLowerCase()).toContain('veterinarian');

        // Steps include sheltered spot, go together, keep it short, reward/reset, plan next
        expect(steps[1].id).toBe('weather_potty_choose_shelter');
        expect(steps[2].id).toBe('weather_potty_go_together');
        expect(steps[3].id).toBe('weather_potty_keep_it_short');
        expect(steps[4].id).toBe('weather_potty_reward_or_reset');
        expect(steps[5].id).toBe('weather_potty_plan_next_easy_chance');
    });

    test('medical_safety_gate: screens for red flags and directs to veterinarian', () => {
        const routineString = JSON.stringify(targetRoutine).toLowerCase();

        // Cannot urinate / no urine
        expect(routineString).toContain('no urine');
        expect(routineString).toContain('cannot urinate');

        // Straining / little or no output
        expect(routineString).toContain('straining');
        expect(routineString).toContain('little or no output');

        // Blood in urine or stool
        expect(routineString).toContain('blood');

        // Pain or vocalizing
        expect(routineString).toContain('pain');
        expect(routineString).toContain('crying');

        // Vomiting, diarrhea, lethargy, collapse, weakness, or breathing difficulty
        expect(routineString).toContain('vomiting');
        expect(routineString).toContain('diarrhea');
        expect(routineString).toContain('lethargy');
        expect(routineString).toContain('collapse');
        expect(routineString).toContain('weakness');

        // Sudden potty changes or repeated accidents
        expect(routineString).toContain('sudden');
        expect(routineString).toContain('accidents');

        // Directs to contact a veterinarian / emergency
        expect(routineString).toContain('veterinarian');
        
        // No diagnosis or medical treatment is provided
        expect(routineString).not.toContain('diagnose');
        expect(routineString).not.toContain('treatment plan');
    });

    test('forced_exposure_policy: warns against forced exposure and punishment', () => {
        const routineString = JSON.stringify(targetRoutine).toLowerCase();

        // Warns against dragging or pulling
        expect(routineString).toContain('drag');
        expect(routineString).toContain('pull');

        // Warns against leaving dog outside
        expect(routineString).toContain('leave your dog outside');

        // Warns against punishment, scolding
        expect(routineString).toContain('punish');
        expect(routineString).toContain('scold');

        // Warns against withholding water or food
        expect(routineString).toContain('withhold');
        expect(routineString).toContain('water');

        // Avoids crate confinement as punishment
        expect(routineString).toContain('crate');
    });

    test('medical_policy: conforms to strict medical exclusions', () => {
        const routineString = JSON.stringify(targetRoutine).toLowerCase();

        expect(routineString).not.toContain('cbd');
        expect(routineString).not.toContain('supplement');
        expect(routineString).not.toContain('medication');
        expect(routineString).not.toContain('dosage');
        expect(routineString).not.toContain('laxative');
        expect(routineString).not.toContain('oils for constipation');
    });

    test('audio_policy: conforms to strict audio exclusions', () => {
        const routineString = JSON.stringify(targetRoutine).toLowerCase();

        expect(routineString).not.toContain('in-app audio');
        expect(routineString).not.toContain('sound exposure');
        expect(routineString).not.toContain('recordings');
        expect(routineString).not.toContain('volume ladder');
        expect(targetRoutine?.backgroundSoundPolicy?.mode).toBe('none');
    });

    test('forbidden_wording: contains absolutely no forbidden words/phrases', () => {
        const routineString = JSON.stringify(targetRoutine).toLowerCase();

        const forbidden = [
            'cure', 'fix', 'treat urinary', 'treat constipation', 'treatment plan', 'therapy',
            'diagnose', 'diagnosis', 'guaranteed', 'proven protocol', 'stubborn', 'spite', 'spiteful',
            'dominance', 'get over it', 'push through', 'wait them out', 'stay outside until',
            'walk it off', 'make them potty', 'crate until'
        ];

        forbidden.forEach(word => {
            const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            const hasWord = regex.test(routineString);
            if (hasWord) {
                console.log('Offending forbidden word found:', word);
            }
            expect(hasWord).toBe(false);
        });

        // Ensure "treat" only appears inside stable properties (like stopIf IDs "not_accepting_treats")
        // and is not used as a verb or for medical treatment in the copy.
        const matches = routineString.match(/\btreat\b/g);
        expect(matches).toBeNull();
    });

    test('check_in_profile: weather_potty_confidence profile is correctly configured with red flags', () => {
        const { CHECKIN_PROFILES } = require('../appContent/checkInProfiles');
        const profile = CHECKIN_PROFILES.weather_potty_confidence;
        
        expect(profile).toBeDefined();
        expect(profile.id).toBe('weather_potty_confidence');

        // Check behavior signs are reused from outdoor
        const stressIds = profile.stressSigns.map((s: any) => s.id);
        expect(stressIds).toContain('freezing_at_threshold');
        expect(stressIds).toContain('pulling_back_home');
        expect(stressIds).toContain('scanning_outside');

        // Check severe medical red flags are correctly configured
        const severeSigns = profile.severeSigns;
        const severeIds = severeSigns.map((s: any) => s.id);

        const requiredMedicalFlags = [
            'cannot_urinate',
            'straining_or_only_drops',
            'blood_in_urine_or_stool',
            'pain_while_pottying',
            'repeated_unsuccessful_potty_attempts',
            'repeated_vomiting_or_diarrhea',
            'lethargy_or_weakness',
            'collapse_or_breathing_trouble',
            'sudden_major_potty_change'
        ];

        requiredMedicalFlags.forEach(flagId => {
            expect(severeIds).toContain(flagId);
            const signOpt = severeSigns.find((s: any) => s.id === flagId);
            expect(signOpt?.safetyLevel).toBe('medical_stop');
            expect(signOpt?.kind).toBe('severe');
        });

        // Check behavioral severe signs are also kept
        expect(severeIds).toContain('aggression');
        expect(severeIds).toContain('self_harm');
        expect(severeIds).toContain('bolting_or_escape_attempts');
    });

    test('regression: existing sessions remain unchanged', () => {
        const outdoorReset = sessions.find(s => s.id === 'outdoor_confidence_reset');
        expect(outdoorReset).toBeDefined();
        expect(outdoorReset?.title).toBe('Outdoor Confidence Reset');

        const postFireworks = sessions.find(s => s.id === 'post_fireworks_walk_rebuild');
        expect(postFireworks).toBeDefined();
        expect(postFireworks?.title).toBe('Post-Fireworks Walk Rebuild');

        const nightWalk = sessions.find(s => s.id === 'night_walk_confidence');
        expect(nightWalk).toBeDefined();
        expect(nightWalk?.title).toBe('Night Walk Confidence');
    });
});
