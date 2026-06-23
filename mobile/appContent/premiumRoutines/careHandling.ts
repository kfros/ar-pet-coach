import type { Session } from '../../types/Session';

export const CARE_HANDLING_PREMIUM_SESSIONS: Session[] = [
    {
        id: 'vet_visit_prep',
        title: "Vet Visit Prep",
        accessLevel: 'premium',
        category: "care_handling",
        categoryLabel: "Care & Handling",
        categoryOrder: 60,
        estimatedDurationSeconds: 360,
        suggestedTimeCopy: "About 6 min",
        durationMinutes: 6,
        difficulty: 'moderate',
        trigger: 'vet_visits',
        description: "A gentle prep routine for calm stationing and tiny handling previews before vet visits.",
        subtitle: "Prep for stationing and handling.",
        goal: "Gentle prep for stationing and handling previews.",
        suitableFor: [
            "Dogs who can relax on a mat or familiar blanket",
            "Low-pressure home practice before routine vet visits",
            "Dogs who accept tiny touch previews"
        ],
        notFor: [
            "Pain during touch",
            "Growling, snapping, or biting during handling",
            "Urgent medical concerns"
        ],
        sourcePrinciples: [
            "Use low-stress handling principles",
            "Let the dog participate rather than forcing compliance",
            "Use mat/station as a predictable place",
            "Use tiny handling approximations",
            "Allow pauses and breaks",
            "Stop when body language shows discomfort",
            "Happy visits and clinic communication may help when available"
        ],
        safetyNotes: [
            "Do not force touch or restraint.",
            "Avoid painful areas.",
            "For fear, aggression, pain, or urgent medical needs, contact your veterinarian."
        ],
        beforeYouStart: [
            "Do not force touch or restraint.",
            "Avoid painful areas."
        ],
        beforeCheckinEnabled: true,
        afterCheckinEnabled: true,
        severeNoticeEnabled: true,
        stopIf: [
            "trembling_or_shaking", "panting", "pacing_or_restless", "scanning_or_alert", "freezing",
            "barking_whining_howling", "drooling", "not_accepting_treats", "aggression", "self_harm",
            "collapse_or_breathing_trouble", "repeated_vomiting_or_diarrhea"
        ],
        whatToWatchFor: [
            "Willingness to stay on the mat",
            "Relaxed body during hand movement",
            "Soft expression during tiny touch previews"
        ],
        afterSession: [
            "Log which areas need more practice.",
            "Always end with something easy."
        ],
        tags: ['premium', 'vet'],
        recommendedForTriggers: ['vet_visits'],
        iconKey: 'medkit',
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
                body: "Use a simpler calm routine before handling practice."
            },
            {
                type: 'info',
                title: "Contact your veterinarian",
                body: "For pain, urgent medical concerns, or unsafe handling, contact your veterinarian instead of practicing."
            }
        ],
        steps: [
            {
                id: 'vet_setup_mat',
                title: "Use a familiar mat",
                instruction: "Place a mat or blanket your dog already likes. Let your dog choose to step onto it. Do not pull or place them there.",
                durationSeconds: 45,
                visualCue: 'observe',
                canSkip: false,
                backgroundSoundPolicy: { mode: 'none', defaultEnabled: false, showControls: false }
            },
            {
                id: 'vet_reward_station',
                title: "Reward calm stationing",
                instruction: "Reward your dog for staying comfortably on the mat. Calm sitting, standing, or lying down are all okay.",
                durationSeconds: 45,
                visualCue: 'reward',
                canSkip: false,
                backgroundSoundPolicy: { mode: 'none', defaultEnabled: false, showControls: false }
            },
            {
                id: 'vet_hand_near_body',
                title: "Move your hand nearby",
                instruction: "Move your hand toward your dog’s shoulder, then reward. You do not need to touch yet. Keep the movement slow and small.",
                durationSeconds: 45,
                visualCue: 'pulse',
                canSkip: false,
                backgroundSoundPolicy: { mode: 'none', defaultEnabled: false, showControls: false }
            },
            {
                id: 'vet_tiny_touch',
                title: "Try a tiny touch",
                instruction: "Touch a comfortable area for one second, then reward. Avoid paws, ears, mouth, or painful areas unless your dog is fully relaxed.",
                durationSeconds: 60,
                visualCue: 'reward',
                canSkip: false,
                backgroundSoundPolicy: { mode: 'none', defaultEnabled: false, showControls: false }
            },
            {
                id: 'vet_pause_choice',
                title: "Give a clear pause",
                instruction: "Pause and let your dog reset. If they move away, turn away, freeze, or refuse food, respect the break and end easier.",
                durationSeconds: 60,
                visualCue: 'pause',
                canSkip: false,
                backgroundSoundPolicy: { mode: 'none', defaultEnabled: false, showControls: false }
            },
            {
                id: 'vet_finish_plan',
                title: "Finish with a plan",
                instruction: "End with something easy. For real visits, bring treats, a familiar blanket, and tell the clinic if your dog needs extra space.",
                durationSeconds: 105,
                visualCue: 'reward',
                canSkip: false,
                backgroundSoundPolicy: { mode: 'none', defaultEnabled: false, showControls: false }
            }
        ]
    }
];
