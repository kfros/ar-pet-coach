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
    },
    {
        id: "post_fireworks_recovery_home",
        title: "Post-Fireworks Recovery at Home",
        subtitle: "Calm support after the noise has stopped.",
        accessLevel: "premium",
        category: "noise_support",
        categoryLabel: "Noise & Fireworks",
        categoryOrder: 30,
        estimatedDurationSeconds: 300,
        suggestedTimeCopy: "About 5 min",
        durationMinutes: 5,
        difficulty: "easy",
        trigger: "loud_noises",
        checkInProfileId: "noise_support",
        iconKey: "home",
        tags: [
            "premium",
            "noise",
            "recovery",
            "fireworks"
        ],
        recommendedForTriggers: [
            "loud_noises",
            "fireworks"
        ],
        backgroundSoundPolicy: {
            mode: "none",
            defaultEnabled: false,
            showControls: false,
            helperText: "No in-app sound is needed for this recovery routine."
        },
        description: "A gentle indoor recovery routine for dogs that remain unsettled after fireworks, thunder, or another loud noise has ended.",
        goal: "Help the owner lower pressure at home, keep safe places available, offer calm presence without forcing contact, and watch for signs of recovery or need for professional support.",
        suitableFor: [
            "Dogs that are still unsettled indoors after fireworks, thunder, or another loud noise event.",
            "Dogs that are hiding, trembling, panting, pacing, scanning, clingy, or unable to rest after the noise has stopped.",
            "Dogs whose stress signs are gradually softening and who are not showing medical emergency signs."
        ],
        notFor: [
            "Active fireworks, thunder, storms, or loud noise that is still happening.",
            "Escape attempts, self-injury, collapse, breathing difficulty, seizure-like signs, visible injuries, or unsafe behavior.",
            "Continuous extreme distress that does not start to soften.",
            "Repeated inability to recover after noise events.",
            "Older dogs with sudden new confusion, fear, disorientation, or suspected sensory decline."
        ],
        sourcePrinciples: [
            "Use after the noise has stopped or dropped to baseline.",
            "Allow the dog to stay in a chosen safe place.",
            "Do not pull the dog out of hiding.",
            "Reduce stimulation and keep the home predictable.",
            "Offer calm presence without forced contact.",
            "Keep water and normal resources available without forcing food or interaction.",
            "Watch for softening recovery signs.",
            "Contact a veterinarian or veterinary behaviorist for severe, unsafe, persistent, escalating, or recurrent distress."
        ],
        safetyNotes: [
            "Use this only after the loud event has stopped or dropped to baseline.",
            "Do not force your dog out of hiding, into contact, into food, into play, or outside.",
            "Do not punish, scold, or block access to a safe hiding place.",
            "For severe panic, escape attempts, self-injury, injury, breathing trouble, collapse, seizure-like signs, unsafe behavior, or distress that does not soften, contact a veterinarian or emergency clinic.",
            "For repeated or escalating noise fear, contact a veterinarian or veterinary behaviorist."
        ],
        beforeYouStart: [
            "Make sure the loud event has stopped or dropped to baseline.",
            "If noise is still happening, use Thunder & Fireworks Safe Space instead.",
            "If your dog is injured, struggling to breathe, collapsing, trying to escape, or unable to settle at all, contact a veterinarian or emergency clinic."
        ],
        beforeCheckinEnabled: true,
        afterCheckinEnabled: true,
        severeNoticeEnabled: true,
        stopIf: [
            "hiding",
            "trembling_or_shaking",
            "panting",
            "pacing_or_restless",
            "scanning_or_alert",
            "freezing",
            "barking_whining_howling",
            "drooling",
            "bolting_or_escape_attempts",
            "not_accepting_treats",
            "aggression",
            "self_harm",
            "collapse_or_breathing_trouble",
            "repeated_vomiting_or_diarrhea"
        ],
        whatToWatchFor: [
            "Coming out of hiding voluntarily",
            "Breathing returning closer to normal",
            "Less scanning or startle",
            "Changing resting position",
            "Accepting water or food without pressure",
            "Resting or sleeping",
            "Choosing calm contact or a relaxed spot"
        ],
        afterSession: [
            "Allow your dog quiet time before normal activity.",
            "Offer resources calmly and let them choose when to eat.",
            "If distress stays severe or unsafe, contact appropriate support."
        ],
        fallbacks: [
            {
                type: "routine",
                routineId: "fireworks_loud_noises_basic",
                title: "Thunder & Fireworks Safe Space",
                body: "Use this if the noise is still happening or may start again soon."
            },
            {
                type: "routine",
                routineId: "daily_calm_reset",
                title: "Daily Calm Reset",
                body: "Use this for a simpler calm reset when your dog is only mildly unsettled."
            },
            {
                type: "routine",
                routineId: "post_fireworks_walk_rebuild",
                title: "Post-Fireworks Walk Rebuild",
                body: "Use this later, only after your dog is reasonably settled indoors but still hesitant to go outside."
            },
            {
                type: "info",
                title: "Get professional support",
                body: "For severe, unsafe, persistent, escalating, or repeated noise fear, contact a veterinarian or veterinary behaviorist."
            }
        ],
        steps: [
            {
                id: "recovery_noise_over_check",
                title: "Check that the noise is over",
                instruction: "Start only after the loud event has stopped or dropped to baseline. If the noise is still happening or may start again soon, use the safe-space routine instead.",
                durationSeconds: 45,
                visualCue: "observe",
                canSkip: false
            },
            {
                id: "recovery_keep_safe_place",
                title: "Keep the safe place open",
                instruction: "Let your dog stay where they feel safest, such as a den, crate, bathroom, under furniture, or near you. Do not pull them out or block the place they chose.",
                durationSeconds: 45,
                visualCue: "pause",
                canSkip: false
            },
            {
                id: "recovery_lower_room_pressure",
                title: "Lower the room pressure",
                instruction: "Make the room boring and predictable. Keep voices low, avoid sudden cleaning noises or visitors, and give your dog time before asking for normal activity.",
                durationSeconds: 45,
                visualCue: "observe",
                canSkip: false
            },
            {
                id: "recovery_presence_no_demands",
                title: "Offer presence without demands",
                instruction: "Stay nearby if your dog seeks you, or give distance if they choose it. Keep contact optional and calm. Avoid calling, touching, or hovering again and again.",
                durationSeconds: 45,
                visualCue: "pulse",
                canSkip: false
            },
            {
                id: "recovery_resources_no_force",
                title: "Place resources, don’t force them",
                instruction: "Make water available near the safe area. You can offer food calmly, but do not use it as a test or push your dog to eat. Let them choose when they are ready.",
                durationSeconds: 45,
                visualCue: "reward",
                canSkip: false
            },
            {
                id: "recovery_watch_softening",
                title: "Watch for softening",
                instruction: "Look for small recovery signs: easier breathing, less scanning, changing position, resting, drinking, coming out voluntarily, or choosing calm contact. If distress stays severe or unsafe, pause self-help and contact a veterinarian.",
                durationSeconds: 75,
                visualCue: "observe",
                canSkip: false
            }
        ]
    }
];
