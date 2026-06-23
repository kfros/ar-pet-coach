import SessionService from '../services/sessionService';

describe('Post-Fireworks Walk Rebuild Routine and Safety Boundaries', () => {
    const sessions = SessionService.getSessions();
    const premiumSessions = sessions.filter(s => s.accessLevel === 'premium');
    const targetRoutine = premiumSessions.find(s => s.id === 'post_fireworks_walk_rebuild');

    test('routine_presence: routine exists and has correct metadata', () => {
        expect(targetRoutine).toBeDefined();
        expect(targetRoutine?.id).toBe('post_fireworks_walk_rebuild');
        expect(targetRoutine?.title).toBe('Post-Fireworks Walk Rebuild');
        expect(targetRoutine?.accessLevel).toBe('premium');
        expect(targetRoutine?.category).toBe('walk_fear');
        expect(targetRoutine?.checkInProfileId).toBe('outdoor_confidence');
        expect(targetRoutine?.backgroundSoundPolicy?.mode).toBe('none');
    });

    test('safety_copy: copy enforces safety and excludes forbidden medical/behavioral treatment claims', () => {
        const routineString = JSON.stringify(targetRoutine).toLowerCase();

        // Safety notes / info
        expect(routineString).toContain('active fireworks');
        expect(routineString).toContain('thunder');
        expect(routineString).toContain('veterinarian');
        expect(routineString).toContain('veterinary behaviorist');

        // Safety boundaries
        expect(routineString).not.toContain('cure');
        expect(routineString).not.toContain('fix');
        expect(routineString).not.toContain('treatment');
        expect(routineString).not.toContain('therapy');
        expect(routineString).not.toContain('phobia');
        expect(routineString).not.toContain('desensitization');
        expect(routineString).not.toContain('trauma treatment');
        expect(routineString).not.toContain('ptsd');

        // Exclude the verb "treat" or "treating" but allow food "treats"
        expect(routineString).not.toMatch(/\btreat\b/);
        expect(routineString).not.toMatch(/\btreating\b/);

        // Do not suggest pushing through fear, dragging, pulling, forcing, punishment, blocking retreat
        expect(routineString).not.toContain('push through');
        expect(routineString).not.toContain('ignore fear');
        expect(routineString).not.toContain('walk until they relax');
        expect(routineString).not.toContain('pulling');
        expect(routineString).not.toContain('dragging');
        expect(routineString).not.toContain('forcing');
        expect(routineString).not.toContain('punishment');
        expect(routineString).not.toContain('blocking retreat');
    });

    test('audio_policy: routine does not mention sound masking, exposure or sound recording libraries', () => {
        const routineString = JSON.stringify(targetRoutine).toLowerCase();

        expect(routineString).not.toContain('recorded fireworks');
        expect(routineString).not.toContain('recorded thunder');
        expect(routineString).not.toContain('sound exposure');
        expect(routineString).not.toContain('volume ladder');
        expect(routineString).not.toContain('white noise');
        expect(routineString).not.toContain('brown noise');
        expect(routineString).not.toContain('masking library');
        expect(routineString).not.toContain('owner_choice');
    });

    test('structure: steps focus on voluntary steps and retreat at threshold', () => {
        expect(targetRoutine?.steps).toBeDefined();
        const steps = targetRoutine?.steps || [];
        expect(steps.length).toBe(6);

        // Steps focus on micro-steps near the safest outdoor edge
        const stepTitles = steps.map(s => s.title.toLowerCase());
        const stepInstructions = steps.map(s => s.instruction.toLowerCase());

        expect(stepTitles[0]).toContain('restart point');
        expect(stepTitles[1]).toContain('check for recovery');
        expect(stepTitles[2]).toContain('tiny version of outside');
        expect(stepTitles[3]).toContain('voluntary move');
        expect(stepTitles[4]).toContain('return before worry');
        expect(stepTitles[5]).toContain('easiest repeat');

        // Check voluntary movement is explicitly present in instructions
        expect(stepInstructions[3]).toContain('voluntary');
        expect(stepInstructions[3]).toContain('movement');

        // Check retreat is explicitly present in instructions
        expect(stepInstructions[4]).toContain('retreat');
    });

    test('fallbacks: contains expected routine links', () => {
        expect(targetRoutine?.fallbacks).toBeDefined();
        const fallbacks = targetRoutine?.fallbacks || [];
        
        const routineFallbacks = fallbacks.filter(f => f.type === 'routine');
        expect(routineFallbacks.some(f => f.routineId === 'fireworks_loud_noises_basic')).toBe(true);
        expect(routineFallbacks.some(f => f.routineId === 'daily_calm_reset')).toBe(true);
    });

    test('regression: existing sessions are unmodified', () => {
        const fireworksBasic = sessions.find(s => s.id === 'fireworks_loud_noises_basic');
        expect(fireworksBasic).toBeDefined();
        expect(fireworksBasic?.title).toBe('Thunder & Fireworks Safe Space');
        expect(fireworksBasic?.category).toBe('noise_support');

        const fireworksPrep = sessions.find(s => s.id === 'fireworks_prep_routine');
        expect(fireworksPrep).toBeDefined();
        expect(fireworksPrep?.title).toBe('Fireworks Prep: Calm-Day Practice');

        const outdoorReset = sessions.find(s => s.id === 'outdoor_confidence_reset');
        expect(outdoorReset).toBeDefined();
        expect(outdoorReset?.title).toBe('Outdoor Confidence Reset');
        expect(outdoorReset?.category).toBe('walk_fear');
    });
});
