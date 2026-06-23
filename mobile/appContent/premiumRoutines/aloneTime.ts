import type { Session } from '../../types/Session';

export const ALONE_TIME_PREMIUM_SESSIONS: Session[] = [
    {
        id: 'being_alone',
        title: "Being Alone",
        accessLevel: 'premium',
        category: "alone_time",
        categoryLabel: "Being Alone",
        categoryOrder: 50,
        estimatedDurationSeconds: 300,
        suggestedTimeCopy: "About 5 min",
        durationMinutes: 5,
        difficulty: 'moderate',
        trigger: 'being_alone',
        description: "A tiny-distance practice for mild alone-time worry, starting while your dog can still feel safe.",
        subtitle: "Tiny-distance practice for mild worry.",
        goal: "Practice tiny distance changes and calm returns.",
        suitableFor: [
            "Mild alone-time practice",
            "Dogs who can settle while the owner moves nearby",
            "Dogs who can eat and recover easily during tiny distance changes"
        ],
        notFor: [
            "Severe panic when left alone",
            "Escape attempts, self-injury, or barrier destruction",
            "Distress-related accidents or inability to settle"
        ],
        sourcePrinciples: [
            "Management comes first for severe distress",
            "Do not leave the dog to panic",
            "Practice tiny distance changes",
            "Return before distress appears",
            "Safe space should not be forced confinement",
            "Crates can worsen distress if the dog is not comfortable there",
            "No punishment for barking, chewing, or accidents caused by distress"
        ],
        safetyNotes: [
            "This routine is for mild alone-time practice.",
            "Return to an easier step if signs increase.",
            "For panic, injury, escape attempts, or severe distress, contact a veterinarian or qualified behavior professional."
        ],
        beforeYouStart: [
            "Only practice for very short durations.",
            "Do not leave your dog to panic."
        ],
        beforeCheckinEnabled: true,
        afterCheckinEnabled: true,
        severeNoticeEnabled: true,
        stopIf: [
            "hiding", "trembling_or_shaking", "panting", "pacing_or_restless", "owner_seeking", "scanning_or_alert",
            "freezing", "barking_whining_howling", "drooling", "bolting_or_escape_attempts", "not_accepting_treats",
            "self_harm", "collapse_or_breathing_trouble", "repeated_vomiting_or_diarrhea"
        ],
        whatToWatchFor: [
            "Settling while you move nearby",
            "Remaining calm during tiny distance changes",
            "Recovery after your return"
        ],
        afterSession: [
            "Log the calm duration.",
            "Stop before worry appears."
        ],
        tags: ['premium', 'alone'],
        recommendedForTriggers: ['being_alone'],
        iconKey: 'home',
        backgroundSoundPolicy: {
            mode: 'calm_music',
            defaultEnabled: true,
            showControls: true
        },
        fallbacks: [
            {
                type: 'routine',
                routineId: 'daily_calm_reset',
                title: "Daily Calm Reset",
                body: "Practice calm while staying nearby before trying distance work."
            },
            {
                type: 'info',
                title: "Get professional support",
                body: "For panic, injury, escape attempts, destruction, or inability to settle, contact a veterinarian or qualified behavior professional."
            }
        ],
        steps: [
            {
                id: 'alone_setup_safe_area',
                title: "Start with you nearby",
                instruction: "Begin in a calm spot your dog already likes. Do not close them in a crate or room if that makes them worried.",
                durationSeconds: 45,
                visualCue: 'observe',
                canSkip: false,
                backgroundSoundPolicy: { mode: 'calm_music', defaultEnabled: true, showControls: true }
            },
            {
                id: 'alone_baseline_calm',
                title: "Look for easy calm",
                instruction: "Wait for calm signs: softer body, normal breathing, or relaxed attention. Reward quietly if your dog can eat calmly.",
                durationSeconds: 45,
                visualCue: 'pulse',
                canSkip: false,
                backgroundSoundPolicy: { mode: 'calm_music', defaultEnabled: true, showControls: true }
            },
            {
                id: 'alone_one_step',
                title: "Take one tiny step away",
                instruction: "Move one step away, then return before your dog worries. This should feel almost too easy.",
                durationSeconds: 45,
                visualCue: 'pause',
                canSkip: false,
                backgroundSoundPolicy: { mode: 'calm_music', defaultEnabled: true, showControls: true }
            },
            {
                id: 'alone_turn_away',
                title: "Turn away briefly",
                instruction: "Turn your body away for a moment, then return to neutral. Reward calm staying, not chasing or worried following.",
                durationSeconds: 45,
                visualCue: 'pulse',
                canSkip: false,
                backgroundSoundPolicy: { mode: 'calm_music', defaultEnabled: true, showControls: true }
            },
            {
                id: 'alone_touch_door',
                title: "Touch the door only",
                instruction: "Touch the door handle or entry area, then come back. Do not leave yet. Stop if your dog becomes alert or tense.",
                durationSeconds: 60,
                visualCue: 'observe',
                canSkip: false,
                backgroundSoundPolicy: { mode: 'calm_music', defaultEnabled: true, showControls: true }
            },
            {
                id: 'alone_finish_easy',
                title: "End before worry",
                instruction: "Finish while your dog is still comfortable. Progress means staying relaxed, not being left for longer.",
                durationSeconds: 60,
                visualCue: 'reward',
                canSkip: false,
                backgroundSoundPolicy: { mode: 'calm_music', defaultEnabled: true, showControls: true }
            }
        ]
    }
];
