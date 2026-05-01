import { Session } from '../types/Session';

export const SESSIONS: Session[] = [
    {
        id: 'daily_calm_reset',
        accessLevel: 'free',
        title: 'Daily Calm Reset',
        subtitle: 'A short everyday routine to practice calm attention.',
        durationMinutes: 3,
        difficulty: 'easy',
        trigger: 'general_calm',
        goal: 'Help the owner create a short, calm routine and reward relaxed behavior without pushing the dog past its comfort level.',
        beforeYouStart: [
            'Choose a quiet familiar place.',
            'Keep a few tiny treats nearby if your dog can eat calmly.',
            'Do not force your dog to sit, stay, or approach.',
            'Stop if your dog becomes worried, restless, or avoids the interaction.'
        ],
        steps: [
            {
                id: 'prepare_space',
                title: 'Prepare the space',
                instruction: 'Sit or stand calmly near your dog in a quiet familiar area.',
                durationSeconds: 30,
                visualCue: 'dim',
                canSkip: false
            },
            {
                id: 'invite_attention',
                title: 'Invite calm attention',
                instruction: "Say your dog's name softly. Reward calm attention or a relaxed posture.",
                durationSeconds: 45,
                visualCue: 'pulse',
                canSkip: false
            },
            {
                id: 'reward_relaxation',
                title: 'Reward small calm moments',
                instruction: 'Look for soft eyes, slower movement, relaxed body posture, or quiet attention. Reward only calm behavior.',
                durationSeconds: 60,
                visualCue: 'reward',
                canSkip: false
            },
            {
                id: 'quiet_pause',
                title: 'Take a quiet pause',
                instruction: 'Pause for a few seconds. Let your dog disengage if they want to.',
                durationSeconds: 30,
                visualCue: 'pause',
                canSkip: false
            },
            {
                id: 'finish_gently',
                title: 'Finish gently',
                instruction: 'End while things are still easy. Keep your voice soft and let your dog return to normal activity.',
                durationSeconds: 30,
                visualCue: 'observe',
                canSkip: false
            }
        ],
        whatToWatchFor: [
            'Soft body posture',
            'Calm attention',
            'Slower movement',
            'Taking treats gently',
            'Choosing to stay nearby without pressure'
        ],
        stopIf: [
            'Your dog hides, trembles, pants heavily, freezes, growls, or tries to leave.',
            'Your dog refuses treats they normally like.',
            'Your dog becomes more alert or restless during the routine.'
        ],
        afterSession: [
            'Log whether your dog looked calmer, unchanged, or more worried.',
            'Keep the next session short if your dog seemed uncertain.',
            'Repeat later only if your dog recovered comfortably.'
        ],
        tags: ['free', 'foundation', 'daily', 'calm'],
        recommendedForTriggers: ['not_sure', 'general_anxiety', 'visitors', 'loud_noises', 'being_alone', 'new_places']
    },
    {
        id: 'fireworks_loud_noises_basic',
        accessLevel: 'free',
        title: 'Fireworks & Loud Noises',
        subtitle: 'Immediate support for noisy moments.',
        durationMinutes: 5,
        difficulty: 'easy',
        trigger: 'loud_noises',
        goal: 'Help the owner reduce pressure during loud noises and guide the dog toward a safer, quieter setup without forced exposure.',
        beforeYouStart: [
            'Move to the quietest safe area available.',
            'Close windows and curtains if possible.',
            'Keep exits secure.',
            'Offer water and a safe resting place.',
            'Do not force your dog to face the noise.'
        ],
        steps: [
            {
                id: 'secure_environment',
                title: 'Secure the environment',
                instruction: 'Check doors, windows, balcony access, and any escape routes.',
                durationSeconds: 45,
                visualCue: 'observe',
                canSkip: false
            },
            {
                id: 'reduce_noise',
                title: 'Reduce the noise',
                instruction: 'Move to a quieter room and soften outside noise with curtains, closed windows, or gentle background sound.',
                durationSeconds: 45,
                visualCue: 'dim',
                canSkip: false
            },
            {
                id: 'offer_safe_choice',
                title: 'Offer a safe choice',
                instruction: 'Let your dog choose a bed, crate, corner, or nearby spot. Do not pull them out if they are safely hiding.',
                durationSeconds: 60,
                visualCue: 'pause',
                canSkip: false
            },
            {
                id: 'offer_positive_item',
                title: 'Offer something positive',
                instruction: 'If your dog can still eat or play, offer a high-value treat or favorite toy. If they refuse, do not push.',
                durationSeconds: 60,
                visualCue: 'reward',
                canSkip: false
            },
            {
                id: 'stay_predictable',
                title: 'Stay predictable',
                instruction: 'Keep your voice low and your movements slow. Your calm behavior is part of the setup.',
                durationSeconds: 60,
                visualCue: 'pulse',
                canSkip: false
            }
        ],
        whatToWatchFor: [
            'Hiding',
            'Trembling or shaking',
            'Panting',
            'Pacing',
            'Clinging to owner',
            'Scanning the room',
            'Refusing treats'
        ],
        stopIf: [
            'Your dog panics, tries to escape, injures themselves, or shows aggression.',
            'Your dog has vomiting, diarrhea, collapse, breathing trouble, or other medical symptoms.',
            'In severe cases, recommend contacting a veterinarian or qualified behavior professional.'
        ],
        afterSession: [
            'Log the strongest signs you noticed.',
            'Note whether your dog accepted food, play, or rest.',
            'Use the notes to prepare earlier next time.'
        ],
        tags: ['free', 'loud_noises', 'fireworks', 'immediate_support'],
        recommendedForTriggers: ['fireworks', 'loud_noises', 'traffic_or_car_horns']
    },
    {
        id: 'fireworks_prep_extended',
        accessLevel: 'premium',
        title: 'Fireworks Prep Routine',
        subtitle: 'A self-paced preparation routine for future noisy events.',
        durationMinutes: 5,
        difficulty: 'moderate',
        trigger: 'loud_noises',
        goal: 'Practice low-pressure routines before predictable noisy events.',
        beforeYouStart: [
            'Use this before expected fireworks, not during active noise.',
            'Start with very easy steps.',
            'Keep your dog below their worry threshold.',
            'Stop or make the session easier if worry signs appear.'
        ],
        steps: [
            {
                id: 'choose_safe_area',
                title: 'Choose a safe area',
                instruction: 'Pick a familiar area where your dog already tends to settle.',
                durationSeconds: 45,
                visualCue: 'observe',
                canSkip: false
            },
            {
                id: 'calm_association',
                title: 'Build a calm association',
                instruction: 'Spend a short quiet moment there and reward relaxed behavior.',
                durationSeconds: 60,
                visualCue: 'reward',
                canSkip: false
            },
            {
                id: 'add_soft_background',
                title: 'Add soft background sound',
                instruction: 'If available, play a gentle background sound at low volume.',
                durationSeconds: 60,
                visualCue: 'pulse',
                canSkip: true
            },
            {
                id: 'practice_settle',
                title: 'Practice settling',
                instruction: 'Let your dog settle naturally. Reward calm attention or relaxed posture.',
                durationSeconds: 90,
                visualCue: 'dim',
                canSkip: false
            },
            {
                id: 'finish_easy',
                title: 'Finish while it is easy',
                instruction: 'End before your dog becomes restless. Progress should be gradual.',
                durationSeconds: 45,
                visualCue: 'pause',
                canSkip: false
            }
        ],
        whatToWatchFor: [
            'Easier settling in the safe area',
            'Willingness to take treats calmly',
            'Less pacing or scanning over repeated sessions'
        ],
        stopIf: [
            'Your dog shows worry signs.',
            'Your dog cannot settle in the chosen area.',
            'Your dog refuses normal rewards.'
        ],
        afterSession: [
            'Log whether this setup felt easy, too hard, or about right.',
            'Repeat easy versions before increasing difficulty.'
        ],
        tags: ['premium', 'preparation', 'loud_noises', 'fireworks'],
        recommendedForTriggers: ['fireworks', 'loud_noises']
    },
    {
        id: 'visitors_at_home',
        accessLevel: 'premium',
        title: 'Visitors at Home',
        subtitle: 'Help your dog settle before and during guest visits.',
        durationMinutes: 4,
        difficulty: 'moderate',
        trigger: 'visitors',
        goal: 'Help your dog feel secure and settled when new people arrive.',
        beforeYouStart: [
            'Start practicing when it is quiet.',
            'Use a safe zone or gate if needed.',
            'Do not force interactions with guests.'
        ],
        steps: [
            {
                id: 'settle_in_spot',
                title: 'Settle in safe spot',
                instruction: 'Guide your dog to their bed or safe area away from the door.',
                durationSeconds: 60,
                visualCue: 'observe',
                canSkip: false
            },
            {
                id: 'reward_calm_waiting',
                title: 'Reward calm waiting',
                instruction: 'Reward your dog for staying in their spot while you move toward the door.',
                durationSeconds: 60,
                visualCue: 'reward',
                canSkip: false
            },
            {
                id: 'soft_greetings',
                title: 'Soft greetings',
                instruction: 'Keep arrivals low-key. Reward quiet attention rather than jumping.',
                durationSeconds: 60,
                visualCue: 'pulse',
                canSkip: false
            },
            {
                id: 'quiet_pause',
                title: 'Quiet pause',
                instruction: 'Let your dog disengage and rest in their safe area.',
                durationSeconds: 60,
                visualCue: 'pause',
                canSkip: false
            }
        ],
        whatToWatchFor: [
            'Choosing to stay on the bed',
            'Slower tail wags',
            'Lower intensity barking'
        ],
        stopIf: [
            'Your dog is highly distressed or lunging.',
            'Your dog shows signs of severe guarding.'
        ],
        afterSession: [
            'Log how long your dog was able to stay settled.'
        ],
        tags: ['premium', 'visitors'],
        recommendedForTriggers: ['visitors']
    },
    {
        id: 'being_alone',
        accessLevel: 'premium',
        title: 'Being Alone',
        subtitle: 'Practice short, low-pressure alone-time steps.',
        durationMinutes: 4,
        difficulty: 'moderate',
        trigger: 'being_alone',
        goal: 'Build confidence during short periods of separation.',
        beforeYouStart: [
            'Only practice for very short durations.',
            'Ensure all needs (walk, potty) are met first.',
            'Do not leave the house during the first few sessions.'
        ],
        steps: [
            {
                id: 'calm_departure_prep',
                title: 'Departure prep',
                instruction: 'Perform a small departure cue (like picking up keys) and reward calm behavior.',
                durationSeconds: 60,
                visualCue: 'pulse',
                canSkip: false
            },
            {
                id: 'short_absence',
                title: 'Short absence',
                instruction: 'Step into another room for a few seconds. Return before any worry signs.',
                durationSeconds: 60,
                visualCue: 'pause',
                canSkip: false
            },
            {
                id: 'quiet_return',
                title: 'Quiet return',
                instruction: 'Keep your return low-key. Reward calm greeting or disengagement.',
                durationSeconds: 60,
                visualCue: 'reward',
                canSkip: false
            },
            {
                id: 'rest_period',
                title: 'Rest period',
                instruction: 'Let your dog settle back into their normal routine.',
                durationSeconds: 60,
                visualCue: 'dim',
                canSkip: false
            }
        ],
        whatToWatchFor: [
            'Continuing to rest when you leave',
            'Lack of panting or pacing',
            'Gentle interest upon return'
        ],
        stopIf: [
            'Your dog begins to howl, scratch, or show intense distress.'
        ],
        afterSession: [
            'Log the duration your dog stayed calm.'
        ],
        tags: ['premium', 'alone_time'],
        recommendedForTriggers: ['being_alone']
    },
    {
        id: 'vet_visit_prep',
        accessLevel: 'premium',
        title: 'Vet Visit Prep',
        subtitle: 'Prepare for handling, travel, and clinic waiting.',
        durationMinutes: 5,
        difficulty: 'moderate',
        trigger: 'vet_visits',
        goal: 'Help your dog feel more comfortable with handling and travel.',
        beforeYouStart: [
            'Keep sessions very short.',
            'Use high-value rewards.',
            'Stop if your dog pulls away.'
        ],
        steps: [
            {
                id: 'calm_handling',
                title: 'Calm handling',
                instruction: 'Gently touch paws, ears, or tail. Reward calm acceptance.',
                durationSeconds: 90,
                visualCue: 'reward',
                canSkip: false
            },
            {
                id: 'carrier_car_prep',
                title: 'Travel prep',
                instruction: 'Practice getting in/out of a carrier or car without going anywhere.',
                durationSeconds: 90,
                visualCue: 'pulse',
                canSkip: false
            },
            {
                id: 'quiet_waiting',
                title: 'Quiet waiting',
                instruction: 'Practice sitting calmly in a new or busy-feeling area.',
                durationSeconds: 60,
                visualCue: 'dim',
                canSkip: false
            },
            {
                id: 'finish_on_high',
                title: 'Finish on a high note',
                instruction: 'End with a favorite game or treat.',
                durationSeconds: 60,
                visualCue: 'pause',
                canSkip: false
            }
        ],
        whatToWatchFor: [
            'Willingness to offer paws',
            'Relaxed facial expression',
            'Easy entry into car/carrier'
        ],
        stopIf: [
            'Your dog shows signs of handling sensitivity or fear.'
        ],
        afterSession: [
            'Log which handling areas need more practice.'
        ],
        tags: ['premium', 'vet'],
        recommendedForTriggers: ['vet_visits']
    }
];
