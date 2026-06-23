import { Session } from '../types/Session';

export const PREMIUM_SESSIONS: Session[] = [
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
    },
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
    },
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
    },
    {
        id: "outdoor_confidence_reset",
        title: "Outdoor Confidence Reset",
        subtitle: "Tiny steps from the safest outdoor edge.",
        description: "A short routine for practicing near the first place your dog can still feel safe, without forcing a full walk.",
        goal: "Help the owner practice tiny, low-pressure outdoor confidence steps while stopping before panic.",
        durationMinutes: 5,
        estimatedDurationSeconds: 300,
        suggestedTimeCopy: "About 5 min",
        difficulty: "moderate",
        trigger: "new_places",
        category: "walk_fear",
        categoryLabel: "Walk Fear & Outdoor Confidence",
        categoryOrder: 20,
        accessLevel: "premium",
        checkInProfileId: "outdoor_confidence",
        tags: [
            "premium",
            "walk_fear",
            "outdoor",
            "threshold"
        ],
        recommendedForTriggers: [
            "new_places",
            "traffic_car_horns",
            "nighttime",
            "not_sure"
        ],
        suitableFor: [
            "Dogs who hesitate at the door, hallway, yard, porch, or building exit.",
            "Mild outdoor worry where your dog can still recover.",
            "Short practice before trying a normal walk again."
        ],
        notFor: [
            "Limping, yelping, collapse, breathing trouble, vomiting, diarrhea, or other medical symptoms.",
            "Sudden confusion or major behavior change in a senior dog.",
            "Panic with escape attempts near roads.",
            "Aggression, self-injury, or unsafe pulling.",
            "Straining, urinary pain, or inability to urinate."
        ],
        sourcePrinciples: [
            "Start below the fear threshold.",
            "Use the smallest safe version of outside.",
            "Let retreat be part of the routine.",
            "Do not drag, force, flood, scold, or rush.",
            "Progress means comfort, not distance.",
            "Stop or backtrack when stress signs appear."
        ],
        safetyNotes: [
            "Practice only where you can stay safely away from traffic.",
            "Do not drag or pull your dog across the threshold.",
            "Stop if your dog freezes hard, panics, tries to bolt, or cannot recover.",
            "For medical symptoms, pain, collapse, repeated vomiting or diarrhea, or breathing trouble, contact a veterinarian."
        ],
        beforeYouStart: [
            "Choose the easiest safe edge: inside the doorway, hallway, porch, yard, or a quiet exit.",
            "Use secure, properly fitted gear if you are near any outdoor escape risk.",
            "Keep the session tiny. This is not a full walk.",
            "Do not practice near traffic or intense triggers."
        ],
        beforeCheckinEnabled: true,
        afterCheckinEnabled: true,
        severeNoticeEnabled: true,
        iconKey: "walk",
        backgroundSoundPolicy: {
            mode: "none",
            defaultEnabled: false,
            showControls: false
        },
        stopIf: [
            "freezing",
            "trembling_or_shaking",
            "panting",
            "pacing_or_restless",
            "scanning_or_alert",
            "bolting_or_escape_attempts",
            "not_accepting_treats",
            "aggression",
            "self_harm",
            "collapse_or_breathing_trouble",
            "repeated_vomiting_or_diarrhea"
        ],
        whatToWatchFor: [
            "Soft body at the chosen starting point.",
            "Ability to look around without panic.",
            "Taking treats calmly if food is offered.",
            "Choosing to step forward or retreat without pressure.",
            "Recovering quickly after the tiny step."
        ],
        afterSession: [
            "Log where your dog first stayed comfortable.",
            "Progress means a calmer edge, not a longer walk.",
            "Repeat the same easy step before making it harder."
        ],
        fallbacks: [
            {
                type: "routine",
                routineId: "daily_calm_reset",
                title: "Daily Calm Reset",
                body: "Use a familiar indoor calm routine before trying the outdoor edge."
            },
            {
                type: "info",
                title: "Check safety first",
                body: "For pain, collapse, breathing trouble, escape attempts, self-injury, or severe distress, stop the routine and contact appropriate professional support."
            }
        ],
        steps: [
            {
                id: "outdoor_setup_safe_edge",
                title: "Choose the safe edge",
                instruction: "Pick the easiest place where your dog can still feel safe: inside the doorway, hallway, porch, yard, or quiet exit. Stay away from traffic.",
                durationSeconds: 45,
                visualCue: "observe",
                canSkip: false,
                backgroundSoundPolicy: {
                    mode: "none",
                    defaultEnabled: false,
                    showControls: false,
                    helperText: "No background sound is needed for this outdoor threshold step."
                }
            },
            {
                id: "outdoor_check_body",
                title: "Check before moving",
                instruction: "Look for easy breathing, softer body, and the ability to notice you. If your dog is already tense, make the setup easier.",
                durationSeconds: 45,
                visualCue: "pulse",
                canSkip: false,
                backgroundSoundPolicy: {
                    mode: "none",
                    defaultEnabled: false,
                    showControls: false
                }
            },
            {
                id: "outdoor_open_or_look",
                title: "Open the edge",
                instruction: "Open the door, look toward the exit, or stand near the edge for a moment. Reward calm noticing if your dog can eat calmly.",
                durationSeconds: 45,
                visualCue: "reward",
                canSkip: false,
                backgroundSoundPolicy: {
                    mode: "none",
                    defaultEnabled: false,
                    showControls: false
                }
            },
            {
                id: "outdoor_tiny_step",
                title: "Try one tiny step",
                instruction: "Invite one tiny step toward the edge only if your dog is still comfortable. Do not pull. One calm step is enough.",
                durationSeconds: 45,
                visualCue: "observe",
                canSkip: false,
                backgroundSoundPolicy: {
                    mode: "none",
                    defaultEnabled: false,
                    showControls: false
                }
            },
            {
                id: "outdoor_retreat_is_ok",
                title: "Return calmly",
                instruction: "Let your dog turn back or return inside. Retreating calmly is part of the practice, not a failure.",
                durationSeconds: 60,
                visualCue: "pause",
                canSkip: false,
                backgroundSoundPolicy: {
                    mode: "none",
                    defaultEnabled: false,
                    showControls: false
                }
            },
            {
                id: "outdoor_finish_easy",
                title: "End while it is easy",
                instruction: "Finish before things get hard. Next time, repeat the same easy edge before asking for anything more.",
                durationSeconds: 60,
                visualCue: "reward",
                canSkip: false,
                backgroundSoundPolicy: {
                    mode: "none",
                    defaultEnabled: false,
                    showControls: false
                }
            }
        ]
    }
];
