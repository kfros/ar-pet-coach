import { Session } from '../types/Session';

export const PREMIUM_SESSIONS: Session[] = [
    {
        id: 'fireworks_prep_routine',
        title: "Fireworks Prep Routine",
        accessLevel: 'premium',
        category: "noise_support",
        estimatedDurationSeconds: 300,
        suggestedTimeCopy: "About 5 min",
        durationMinutes: 5,
        difficulty: 'moderate',
        trigger: 'loud_noises',
        description: "A gentle prep routine for practicing calm exposure to quiet firework-like sounds before noisy days.",
        subtitle: "Practice quiet sounds before noisy days.",
        goal: "Gentle prep for quiet firework-like sounds.",
        suitableFor: [
            "Dogs who can relax with very quiet sounds",
            "Owners preparing before fireworks season",
            "Short, below-threshold practice"
        ],
        notFor: [
            "Your dog is already panicking during fireworks",
            "Severe noise fear or escape attempts",
            "Medical symptoms or trouble breathing"
        ],
        sourcePrinciples: [
            "Start with a very weak version of the trigger",
            "Keep the dog below threshold",
            "Increase sound only if the dog stays relaxed",
            "Use valuable food or calm activity if the dog accepts it",
            "Stop or backtrack if stress signs appear",
            "During real fireworks, use management and safe space rather than training"
        ],
        safetyNotes: [
            "Use only very quiet sounds.",
            "Do not practice during active fireworks if your dog is already scared.",
            "For panic, injury, escape attempts, or medical symptoms, contact a veterinarian or qualified behavior professional."
        ],
        beforeYouStart: [
            "Do not play loud firework sounds.",
            "Do not practice during an active fireworks event if your dog is already scared."
        ],
        beforeCheckinEnabled: true,
        afterCheckinEnabled: true,
        severeNoticeEnabled: true,
        stopIf: [
            "hiding", "trembling_or_shaking", "panting", "pacing_or_restless", "scanning_or_alert", "freezing",
            "barking_whining_howling", "drooling", "bolting_or_escape_attempts", "not_accepting_treats",
            "aggression", "self_harm", "collapse_or_breathing_trouble", "repeated_vomiting_or_diarrhea"
        ],
        whatToWatchFor: [
            "Relaxed body language",
            "Ability to eat rewards calmly",
            "Interest in the sound without worry"
        ],
        afterSession: [
            "Log if your dog stayed relaxed.",
            "Progress means comfort, not volume."
        ],
        tags: ['premium', 'noise', 'fireworks'],
        recommendedForTriggers: ['loud_noises', 'fireworks'],
        iconKey: 'sparkles',
        fallbacks: [
            {
                type: 'routine',
                routineId: 'fireworks_loud_noises_basic',
                title: "Fireworks & Loud Noises",
                body: "Use immediate support for noisy moments instead of prep practice."
            },
            {
                type: 'info',
                title: "Get professional support",
                body: "For panic, injury, escape attempts, or medical symptoms, contact a veterinarian or qualified behavior professional."
            }
        ],
        steps: [
            {
                id: 'fireworks_prep_setup',
                title: "Set up a quiet start",
                instruction: "Choose a calm room. Keep the sound off for now. Have tiny high-value treats ready if your dog can eat calmly.",
                durationSeconds: 45,
                visualCue: 'observe',
                canSkip: false
            },
            {
                id: 'fireworks_prep_baseline',
                title: "Watch before adding sound",
                instruction: "Let your dog settle near you. Look for soft body, normal breathing, and easy attention before you continue.",
                durationSeconds: 45,
                visualCue: 'pulse',
                canSkip: false
            },
            {
                id: 'fireworks_prep_tiny_sound',
                title: "Add the quietest sound",
                instruction: "Play a very quiet firework-like sound for a moment. It should be barely noticeble. Reward calm noticing.",
                durationSeconds: 45,
                visualCue: 'reward',
                canSkip: false
            },
            {
                id: 'fireworks_prep_pause',
                title: "Pause and reset",
                instruction: "Stop the sound. Let your dog return to neutral. If signs increased, end here and use an easier setup next time.",
                durationSeconds: 45,
                visualCue: 'pause',
                canSkip: false
            },
            {
                id: 'fireworks_prep_repeat_easy',
                title: "Repeat only if calm",
                instruction: "Repeat the same quiet sound only if your dog stayed relaxed. Do not raise volume today unless this felt easy.",
                durationSeconds: 60,
                visualCue: 'pulse',
                canSkip: false
            },
            {
                id: 'fireworks_prep_finish',
                title: "End on easy",
                instruction: "Finish with calm praise, a reward, or quiet time. Progress means your dog stayed comfortable, not that the sound got louder.",
                durationSeconds: 60,
                visualCue: 'reward',
                canSkip: false
            }
        ]
    },
    {
        id: 'visitors_at_home',
        title: "Visitors at Home",
        accessLevel: 'premium',
        category: "home_triggers",
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
                canSkip: false
            },
            {
                id: 'visitors_calm_baseline',
                title: "Find calm before cues",
                instruction: "Wait for easy breathing, softer body, or calm attention. Reward calm presence before adding any guest-like cue.",
                durationSeconds: 45,
                visualCue: 'pulse',
                canSkip: false
            },
            {
                id: 'visitors_soft_door_cue',
                title: "Try a tiny door cue",
                instruction: "Make one very soft knock or door sound. Reward calm noticing. If your dog startles or barks hard, make it easier next time.",
                durationSeconds: 45,
                visualCue: 'reward',
                canSkip: false
            },
            {
                id: 'visitors_no_pressure_rule',
                title: "Practice no pressure",
                instruction: "Imagine a visitor ignoring your dog: no staring, no reaching, no leaning. Reward your dog for staying calm at a distance.",
                durationSeconds: 45,
                visualCue: 'pause',
                canSkip: false
            },
            {
                id: 'visitors_brief_movement',
                title: "Add one small movement",
                instruction: "Take one calm step near the guest area, then return. Keep it boring and easy. Stop if your dog becomes tense or cannot eat.",
                durationSeconds: 60,
                visualCue: 'pulse',
                canSkip: false
            },
            {
                id: 'visitors_finish',
                title: "Finish before it gets hard",
                instruction: "End while your dog is still comfortable. A short calm practice is better than pushing into barking, hiding, or freezing.",
                durationSeconds: 60,
                visualCue: 'reward',
                canSkip: false
            }
        ]
    },
    {
        id: 'being_alone',
        title: "Being Alone",
        accessLevel: 'premium',
        category: "alone_time",
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
                canSkip: false
            },
            {
                id: 'alone_baseline_calm',
                title: "Look for easy calm",
                instruction: "Wait for calm signs: softer body, normal breathing, or relaxed attention. Reward quietly if your dog can eat calmly.",
                durationSeconds: 45,
                visualCue: 'pulse',
                canSkip: false
            },
            {
                id: 'alone_one_step',
                title: "Take one tiny step away",
                instruction: "Move one step away, then return before your dog worries. This should feel almost too easy.",
                durationSeconds: 45,
                visualCue: 'pause',
                canSkip: false
            },
            {
                id: 'alone_turn_away',
                title: "Turn away briefly",
                instruction: "Turn your body away for a moment, then return to neutral. Reward calm staying, not chasing or worried following.",
                durationSeconds: 45,
                visualCue: 'pulse',
                canSkip: false
            },
            {
                id: 'alone_touch_door',
                title: "Touch the door only",
                instruction: "Touch the door handle or entry area, then come back. Do not leave yet. Stop if your dog becomes alert or tense.",
                durationSeconds: 60,
                visualCue: 'observe',
                canSkip: false
            },
            {
                id: 'alone_finish_easy',
                title: "End before worry",
                instruction: "Finish while your dog is still comfortable. Progress means staying relaxed, not being left for longer.",
                durationSeconds: 60,
                visualCue: 'reward',
                canSkip: false
            }
        ]
    },
    {
        id: 'vet_visit_prep',
        title: "Vet Visit Prep",
        accessLevel: 'premium',
        category: "care_handling",
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
                canSkip: false
            },
            {
                id: 'vet_reward_station',
                title: "Reward calm stationing",
                instruction: "Reward your dog for staying comfortably on the mat. Calm sitting, standing, or lying down are all okay.",
                durationSeconds: 45,
                visualCue: 'reward',
                canSkip: false
            },
            {
                id: 'vet_hand_near_body',
                title: "Move your hand nearby",
                instruction: "Move your hand toward your dog’s shoulder, then reward. You do not need to touch yet. Keep the movement slow and small.",
                durationSeconds: 45,
                visualCue: 'pulse',
                canSkip: false
            },
            {
                id: 'vet_tiny_touch',
                title: "Try a tiny touch",
                instruction: "Touch a comfortable area for one second, then reward. Avoid paws, ears, mouth, or painful areas unless your dog is fully relaxed.",
                durationSeconds: 60,
                visualCue: 'reward',
                canSkip: false
            },
            {
                id: 'vet_pause_choice',
                title: "Give a clear pause",
                instruction: "Pause and let your dog reset. If they move away, turn away, freeze, or refuse food, respect the break and end easier.",
                durationSeconds: 60,
                visualCue: 'pause',
                canSkip: false
            },
            {
                id: 'vet_finish_plan',
                title: "Finish with a plan",
                instruction: "End with something easy. For real visits, bring treats, a familiar blanket, and tell the clinic if your dog needs extra space.",
                durationSeconds: 105,
                visualCue: 'reward',
                canSkip: false
            }
        ]
    }
];
