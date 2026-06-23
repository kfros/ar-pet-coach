import type { Session } from '../../types/Session';

export const NOISE_SUPPORT_PREMIUM_SESSIONS: Session[] = [
    {
        id: 'fireworks_prep_routine',
        title: "Fireworks Prep: Calm-Day Practice",
        accessLevel: 'premium',
        category: "noise_support",
        categoryLabel: "Noise & Fireworks",
        categoryOrder: 30,
        estimatedDurationSeconds: 315,
        suggestedTimeCopy: "About 5 min",
        durationMinutes: 5,
        difficulty: 'moderate',
        trigger: 'loud_noises',
        description: "A calm-day prep routine for environment setup, calm owner presence, exit security, and planning before noisy events.",
        subtitle: "Prepare a calm support plan before noisy days.",
        goal: "Help the owner plan, test setup options, and secure exits on quiet days before real thunder or fireworks events.",
        suitableFor: [
            "Calm-day preparation before future noisy events.",
            "Owners setting up a safe space plan.",
            "Dogs who benefit from calm-day routine practice."
        ],
        notFor: [
            "Active thunder or fireworks.",
            "Dogs who are already panicking.",
            "Escape attempts or self-injury during active events."
        ],
        sourcePrinciples: [
            "This is not the safe-space routine.",
            "Practice only on calm, quiet days.",
            "Do not play recorded sounds or loud noises.",
            "For severe cases, contact a veterinarian or veterinary behaviorist."
        ],
        safetyNotes: [
            "This is not the safe-space routine.",
            "Only practice on calm days.",
            "Do not practice during active fireworks or if your dog is already panicking.",
            "For severe, unsafe, or escalating fear, contact a veterinarian or veterinary behaviorist."
        ],
        beforeYouStart: [
            "Make sure this is a calm, quiet day.",
            "Do not practice during active thunder/fireworks or if your dog is already panicking."
        ],
        beforeCheckinEnabled: true,
        afterCheckinEnabled: true,
        severeNoticeEnabled: true,
        checkInProfileId: 'noise_support',
        stopIf: [
            "hiding", "trembling_or_shaking", "panting", "pacing_or_restless", "scanning_or_alert", "freezing",
            "barking_whining_howling", "drooling", "bolting_or_escape_attempts", "not_accepting_treats",
            "aggression", "self_harm", "collapse_or_breathing_trouble", "repeated_vomiting_or_diarrhea"
        ],
        whatToWatchFor: [
            "Relaxed body language in the chosen space",
            "Eating treats calmly on quiet days",
            "Choosing to rest or settle near the space"
        ],
        afterSession: [
            "Log if your dog stayed relaxed.",
            "A calm prep plan helps prepare for real events."
        ],
        tags: ['premium', 'noise', 'prep'],
        recommendedForTriggers: ['loud_noises', 'fireworks'],
        iconKey: 'sparkles',
        backgroundSoundPolicy: {
            mode: 'none',
            defaultEnabled: false,
            showControls: false,
            helperText: 'No in-app sound is needed for this preparation routine.'
        },
        fallbacks: [
            {
                type: 'routine',
                routineId: 'fireworks_loud_noises_basic',
                title: "Thunder & Fireworks Safe Space",
                body: "Use safe-space support for noisy moments instead of prep practice."
            },
            {
                type: 'info',
                title: "Get professional support",
                body: "For severe, unsafe, or escalating fear, contact a veterinarian or veterinary behaviorist."
            }
        ],
        steps: [
            {
                id: 'prep_plan_location',
                title: "Plan the safe space",
                instruction: "Choose a calm interior area on a quiet day. Keep it available but not forced, so your dog knows they can rest there voluntarily.",
                durationSeconds: 45,
                visualCue: 'observe',
                canSkip: false
            },
            {
                id: 'prep_calm_presence',
                title: "Practice quiet presence",
                instruction: "Sit near the safe space. Praise and reward your dog quietly for resting or settling nearby. Keep your movements slow.",
                durationSeconds: 45,
                visualCue: 'observe',
                canSkip: false
            },
            {
                id: 'prep_exit_check',
                title: "Plan exit security",
                instruction: "Identify all windows, doors, and fences that need securing during real events. Do not practice exit checks when your dog is anxious.",
                durationSeconds: 45,
                visualCue: 'observe',
                canSkip: false
            },
            {
                id: 'prep_masking_plan',
                title: "Test familiar household masking options",
                instruction: "On a calm day, try familiar household background sounds, such as a fan, TV, or radio, outside the app. Make sure your dog remains comfortable.",
                durationSeconds: 60,
                visualCue: 'observe',
                canSkip: false
            },
            {
                id: 'prep_event_day_setup',
                title: "Prepare event-day snacks",
                instruction: "Identify high-value chews or food toys. Practice offering them in the space when it is quiet so the spot represents good things.",
                durationSeconds: 60,
                visualCue: 'reward',
                canSkip: false
            },
            {
                id: 'prep_recovery_plan',
                title: "Plan what to watch",
                instruction: "Choose what you want to notice after the noisy day: strongest signs, what helped, and how long recovery took. You can mark signs in the check-in after this session.",
                durationSeconds: 60,
                visualCue: 'pause',
                canSkip: false
            }
        ]
    }
];
