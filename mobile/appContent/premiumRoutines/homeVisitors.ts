import type { Session } from '../../types/Session';

export const HOME_VISITORS_PREMIUM_SESSIONS: Session[] = [
    {
        id: 'visitors_at_home',
        title: "Visitors at Home",
        accessLevel: 'premium',
        category: "home_triggers",
        categoryLabel: "Home & Visitors",
        categoryOrder: 40,
        estimatedDurationSeconds: 300,
        suggestedTimeCopy: "About 5 min",
        durationMinutes: 5,
        difficulty: 'moderate',
        trigger: 'visitors',
        description: "A gentle routine for practicing calm noticing around guest-related sounds and distance.",
        subtitle: "Practice calm around guest cues.",
        goal: "Practice distance and calm noticing around guest cues.",
        suitableFor: [
            "Dogs who become alert around guests or door sounds",
            "Practice before real visitors arrive",
            "Dogs who can still eat and respond during mild guest cues"
        ],
        notFor: [
            "Bite history or serious aggression around visitors",
            "Panic, freezing, or hiding around guest cues",
            "Your dog cannot safely keep distance"
        ],
        sourcePrinciples: [
            "Use distance",
            "Avoid direct pressure from guests",
            "No direct staring, reaching, leaning, or forced greeting",
            "Practice door sounds separately from the person",
            "Reward calm noticing",
            "Backtrack when stress signs appear"
        ],
        safetyNotes: [
            "Do not force greetings.",
            "Ask visitors not to stare, reach, lean, or approach.",
            "For aggression, snapping, or serious fear, work with a qualified professional."
        ],
        beforeYouStart: [
            "Do not ask guests to touch or approach your dog.",
            "Ensure your dog has a way to move away."
        ],
        beforeCheckinEnabled: true,
        afterCheckinEnabled: true,
        severeNoticeEnabled: true,
        stopIf: [
            "hiding", "trembling_or_shaking", "panting", "pacing_or_restless", "scanning_or_alert", "freezing",
            "barking_whining_howling", "bolting_or_escape_attempts", "not_accepting_treats", "aggression", "self_harm"
        ],
        whatToWatchFor: [
            "Staying at a distance comfortably",
            "Soft attention on door cues",
            "Relaxed ears and tail"
        ],
        afterSession: [
            "Log how your dog responded to cues.",
            "Keep practice short and positive."
        ],
        tags: ['premium', 'visitors'],
        recommendedForTriggers: ['visitors'],
        iconKey: 'notifications',
        backgroundSoundPolicy: {
            mode: 'none',
            defaultEnabled: false,
            showControls: false
        },
        fallbacks: [
            {
                type: 'routine',
                routineId: 'daily_calm_reset',
                title: "Daily Calm Reset",
                body: "Use a simpler calm routine away from guest cues."
            },
            {
                type: 'info',
                title: "Get qualified support",
                body: "For snapping, biting, or serious fear around visitors, work with a qualified behavior professional."
            }
        ],
        steps: [
            {
                id: 'visitors_setup_distance',
                title: "Create distance first",
                instruction: "Start far from the door or guest area. Your dog should have space to move away and should not be asked to greet anyone.",
                durationSeconds: 45,
                visualCue: 'observe',
                canSkip: false,
                backgroundSoundPolicy: { mode: 'none', defaultEnabled: false, showControls: false }
            },
            {
                id: 'visitors_calm_baseline',
                title: "Find calm before cues",
                instruction: "Wait for easy breathing, softer body, or calm attention. Reward calm presence before adding any guest-like cue.",
                durationSeconds: 45,
                visualCue: 'pulse',
                canSkip: false,
                backgroundSoundPolicy: { mode: 'none', defaultEnabled: false, showControls: false }
            },
            {
                id: 'visitors_soft_door_cue',
                title: "Try a tiny door cue",
                instruction: "Make one very soft knock or door sound. Reward calm noticing. If your dog startles or barks hard, make it easier next time.",
                durationSeconds: 45,
                visualCue: 'reward',
                canSkip: false,
                backgroundSoundPolicy: { mode: 'none', defaultEnabled: false, showControls: false }
            },
            {
                id: 'visitors_no_pressure_rule',
                title: "Practice no pressure",
                instruction: "Imagine a visitor ignoring your dog: no staring, no reaching, no leaning. Reward your dog for staying calm at a distance.",
                durationSeconds: 45,
                visualCue: 'pause',
                canSkip: false,
                backgroundSoundPolicy: { mode: 'none', defaultEnabled: false, showControls: false }
            },
            {
                id: 'visitors_brief_movement',
                title: "Add one small movement",
                instruction: "Take one calm step near the guest area, then return. Keep it boring and easy. Stop if your dog becomes tense or cannot eat.",
                durationSeconds: 60,
                visualCue: 'pulse',
                canSkip: false,
                backgroundSoundPolicy: { mode: 'none', defaultEnabled: false, showControls: false }
            },
            {
                id: 'visitors_finish',
                title: "Finish before it gets hard",
                instruction: "End while your dog is still comfortable. A short calm practice is better than pushing into barking, hiding, or freezing.",
                durationSeconds: 60,
                visualCue: 'reward',
                canSkip: false,
                backgroundSoundPolicy: { mode: 'none', defaultEnabled: false, showControls: false }
            }
        ]
    }
];
