import type { Session } from '../../types/Session';

export const WALK_FEAR_PREMIUM_SESSIONS: Session[] = [
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
    },
    {
        id: "post_fireworks_walk_rebuild",
        title: "Post-Fireworks Walk Rebuild",
        subtitle: "Tiny steps back toward outside after a loud scare.",
        accessLevel: "premium",
        category: "walk_fear",
        categoryLabel: "Walk Fear & Outdoor Confidence",
        categoryOrder: 20,
        estimatedDurationSeconds: 300,
        suggestedTimeCopy: "About 5 min",
        durationMinutes: 5,
        difficulty: "moderate",
        trigger: "loud_noises",
        description: "A short routine for restarting outdoor confidence after fireworks, thunder, or another loud outdoor scare. Begin near the safest edge, invite one voluntary step, and return before worry builds.",
        goal: "Helps owners restart tiny, voluntary outdoor steps after fireworks, thunder, or another loud outdoor scare.",
        suitableFor: [
            "Dogs that were previously able to go outside but now hesitate after fireworks, thunder, or another loud outdoor noise.",
            "Dogs that show mild to moderate hesitation near a doorway, lobby, porch, yard, or quiet street edge.",
            "Dogs that can still recover when the step is made smaller.",
            "Dogs that may still accept food, sniff, look back at the owner, or move voluntarily at a low-intensity distance."
        ],
        notFor: [
            "Dogs showing panic, bolting, escape attempts, or self-injury.",
            "Dogs that try to slip equipment or flee near roads.",
            "Dogs with continuous shaking, vocalizing, or inability to recover in a quiet place.",
            "Dogs whose severe fear persists for days after the event.",
            "Dogs with sudden refusal to go outside plus limping, pain signs, collapse, breathing trouble, vomiting, diarrhea, confusion, or other medical symptoms.",
            "Dogs with unsafe leash behavior, aggression, or severe distress outdoors.",
            "Dogs with generalized noise fear across many contexts that needs veterinary or veterinary behaviorist support."
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
            "Do not practice during active fireworks, thunder, storms, or other loud events.",
            "Do not pull, drag, force, corner, punish, or block retreat.",
            "Use the smallest safe version of outside today.",
            "Stop or step back if stress signs increase.",
            "Returning inside calmly is progress, not failure.",
            "Contact a veterinarian or veterinary behaviorist for severe, unsafe, persistent, or escalating fear."
        ],
        beforeYouStart: [
            "Make sure this is a calm, quiet day without active fireworks or thunder.",
            "Choose the easiest starting point (like the lobby, porch, or just inside the doorway).",
            "Prepare high-value treats and keep the leash loose.",
            "Do not force your dog past their comfort edge today."
        ],
        beforeCheckinEnabled: true,
        afterCheckinEnabled: true,
        severeNoticeEnabled: true,
        checkInProfileId: "outdoor_confidence",
        iconKey: "walk",
        backgroundSoundPolicy: {
            mode: "none",
            defaultEnabled: false,
            showControls: false,
            helperText: "This routine is based on outdoor micro-steps, not audio exposure or masking."
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
            "Willingness to stand or sniff near the chosen starting point.",
            "Looked back at you or checked in without tension.",
            "Taking high-value treats calmly if offered.",
            "Choosing to step forward or retreat without leash pressure.",
            "Recovering quickly when returning inside."
        ],
        afterSession: [
            "Log where your dog first stayed comfortable.",
            "Progress means a calmer edge, not a longer walk.",
            "Repeat the same easy step before making it harder."
        ],
        tags: [
            "premium",
            "walk_fear",
            "outdoor",
            "noise",
            "threshold"
        ],
        recommendedForTriggers: [
            "loud_noises",
            "fireworks"
        ],
        fallbacks: [
            {
                type: "routine",
                routineId: "fireworks_loud_noises_basic",
                title: "Thunder & Fireworks Safe Space",
                body: "Use this if noise is still happening or your dog needs safe-space support."
            },
            {
                type: "routine",
                routineId: "daily_calm_reset",
                title: "Daily Calm Reset",
                body: "Use this if your dog is too tense indoors to approach the outdoor edge."
            },
            {
                type: "info",
                title: "Contact a professional",
                body: "Contact a veterinarian or veterinary behaviorist for severe, unsafe, persistent, or escalating fear."
            }
        ],
        steps: [
            {
                id: "rebuild_restart_point",
                title: "Pick the quietest restart point",
                instruction: "Choose the easiest edge of outside today: inside by the door, the hallway, the lobby, a porch, a quiet yard, or another calm exit point. This is not a full walk.",
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
                id: "rebuild_check_recovery",
                title: "Check for recovery first",
                instruction: "Before moving closer to outside, notice whether your dog can still look at you, move freely, and settle after a moment. If they are already tense indoors, make today easier and stay inside.",
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
                id: "rebuild_open_outside",
                title: "Open only a tiny version of outside",
                instruction: "Let your dog notice the doorway, open air, or quiet exit without asking for a walk. Reward calm looking, sniffing, or choosing to stay near you.",
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
                id: "rebuild_voluntary_move",
                title: "Invite one voluntary move",
                instruction: "Invite one small voluntary movement toward the threshold or just outside. Keep the leash soft. If your dog chooses not to move, make the step smaller instead of using pressure.",
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
                id: "rebuild_return_calmly",
                title: "Return before worry builds",
                instruction: "Step back inside or away from the edge while your dog can still recover. A calm retreat helps rebuild trust and keeps the next attempt easier.",
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
                id: "rebuild_choose_repeat",
                title: "Choose the easiest repeat",
                instruction: "Pick what to repeat next time: the same doorway, a quieter time, a shorter step, or simply looking toward the exit. Progress means easier recovery, not distance.",
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
    },
    {
        id: "night_walk_confidence",
        title: "Night Walk Confidence",
        subtitle: "Small, familiar steps for calmer evening walks.",
        accessLevel: "premium",
        category: "walk_fear",
        categoryLabel: "Walk Fear & Outdoor Confidence",
        categoryOrder: 20,
        estimatedDurationSeconds: 300,
        suggestedTimeCopy: "About 5 min",
        durationMinutes: 5,
        difficulty: "moderate",
        trigger: "nighttime",
        checkInProfileId: "outdoor_confidence",
        iconKey: "walk",
        tags: [
            "premium",
            "walk_fear",
            "outdoor",
            "nighttime",
            "confidence"
        ],
        recommendedForTriggers: [
            "nighttime",
            "new_places",
            "not_sure"
        ],
        backgroundSoundPolicy: {
            mode: "none",
            defaultEnabled: false,
            showControls: false,
            helperText: "No background sound is needed for night-walk confidence practice."
        },
        description: "A short routine for dogs that walk normally during the day but become hesitant, watchful, or easily startled during evening or night walks.",
        goal: "Help the owner choose a safer familiar route, reduce night-walk pressure, invite tiny voluntary movement, and stop before worry builds.",
        suitableFor: [
            "Dogs that usually walk during the day but hesitate, scan, freeze briefly, or startle more during evening or night walks.",
            "Dogs that can still respond to the owner, recover after a pause, and move voluntarily when the route is familiar and easy.",
            "Mild to moderate low-light worry on familiar routes.",
            "Short night-walk practice close to home before attempting a normal night walk."
        ],
        notFor: [
            "Sudden new night fear in an older dog.",
            "Bumping into objects, missing doorways, disorientation, visible eye changes, or suspected vision problems.",
            "Limping, yelping, stiffness, pain signs, collapse, breathing trouble, vomiting, diarrhea, or other medical symptoms.",
            "Night-time agitation, pacing, vocalizing, or confusion that also happens indoors.",
            "Panic with escape attempts near roads.",
            "Aggression, self-injury, unsafe pulling, or severe distress outdoors.",
            "Unsafe routes, poor visibility for the owner, traffic hazards, or areas where the owner cannot keep the dog secure."
        ],
        sourcePrinciples: [
            "Use familiar routes and predictable landmarks.",
            "Start with the easiest, best-lit version of the night walk.",
            "Keep the first attempts short and close to home.",
            "Let the dog pause, look, sniff, or turn back without pressure.",
            "Progress means calmer recovery, not longer distance.",
            "Do not force movement through dark or high-startle areas.",
            "Vet-first for sudden night fear, older dogs, disorientation, vision changes, suspected pain, or escalating behavior."
        ],
        safetyNotes: [
            "Practice only in safe, familiar, well-lit areas where you can avoid traffic and escape risk.",
            "Do not drag, pull, scold, or force your dog through dark sections.",
            "Stop or turn back if your dog freezes hard, panics, tries to bolt, or cannot recover.",
            "For sudden new night fear, vision concerns, pain signs, confusion, collapse, breathing trouble, or unsafe behavior, contact a veterinarian.",
            "For severe, persistent, or escalating fear, contact a veterinarian or veterinary behaviorist."
        ],
        beforeYouStart: [
            "Choose a familiar, well-lit starting point close to home.",
            "Use secure, properly fitted gear and keep the leash soft.",
            "Avoid traffic, isolated unsafe areas, and places with sudden loud night activity.",
            "If this fear is sudden, severe, or paired with confusion, pain, or vision concerns, contact your veterinarian before practicing."
        ],
        beforeCheckinEnabled: true,
        afterCheckinEnabled: true,
        severeNoticeEnabled: true,
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
            "Willingness to stand near the familiar night starting point.",
            "Looking around without panic.",
            "Sniffing or exploring a familiar spot.",
            "Checking in with the owner after a startle.",
            "Taking food calmly if offered.",
            "Turning back calmly when the session ends.",
            "Recovering faster after small night sounds or shadows."
        ],
        afterSession: [
            "Log where your dog first stayed comfortable.",
            "Progress means a calmer edge, not a longer walk.",
            "Repeat the same easy step before making it harder."
        ],
        fallbacks: [
            {
                type: "routine",
                routineId: "outdoor_confidence_reset",
                title: "Outdoor Confidence Reset",
                body: "Use this if your dog is also hesitant outdoors during the day or needs easier threshold practice."
            },
            {
                type: "routine",
                routineId: "daily_calm_reset",
                title: "Daily Calm Reset",
                body: "Use this indoors first if your dog is too tense to start outside."
            },
            {
                type: "info",
                title: "Check health and safety first",
                body: "For sudden night fear, confusion, vision concerns, pain signs, collapse, breathing trouble, unsafe behavior, or severe distress, stop and contact a veterinarian."
            }
        ],
        steps: [
            {
                id: "night_choose_safe_route",
                title: "Choose the safest familiar route",
                instruction: "Pick the easiest night version of a familiar route: close to home, better lit, quiet, and away from traffic or sudden activity. This is not a full walk.",
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
                id: "night_check_body_and_context",
                title: "Check body and context",
                instruction: "Before moving forward, notice whether your dog can breathe easily, look at you, and move freely. If this night fear is sudden, severe, or paired with confusion, pain, or vision concerns, stop and contact your veterinarian.",
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
                id: "night_start_at_bright_edge",
                title: "Start at the bright edge",
                instruction: "Stand at the easiest bright edge: doorway, building exit, porch, driveway, or first familiar lit spot. Let your dog look, sniff, or pause without pressure.",
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
                id: "night_invite_one_segment",
                title: "Invite one tiny segment",
                instruction: "Invite a few calm steps along the familiar route only if your dog is still able to recover. Keep the leash soft. If they hesitate, shorten the segment instead of adding pressure.",
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
                id: "night_pause_after_startle",
                title: "Pause after a startle",
                instruction: "If your dog hears a night sound or notices a shadow, pause. Let them look, sniff, or check in with you. Continue only if their body softens again.",
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
                id: "night_end_before_scanning_builds",
                title: "End before scanning builds",
                instruction: "Turn back while the walk is still easy. Next time, repeat the same familiar night segment before making it darker, longer, or busier.",
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

