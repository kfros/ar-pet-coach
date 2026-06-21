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
        category: 'foundation',
        categoryLabel: 'Start Here',
        categoryOrder: 10,
        recommendedForTriggers: ['not_sure', 'general_anxiety', 'visitors', 'loud_noises', 'being_alone', 'new_places'],
        iconKey: 'leaf'
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
        category: 'noise_support',
        categoryLabel: 'Noise & Fireworks',
        categoryOrder: 30,
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
                instruction: 'If your dog can still eat or play, offer a high-value reward or favorite toy. If they refuse, do not push.',
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
        recommendedForTriggers: ['fireworks', 'loud_noises', 'traffic_or_car_horns'],
        iconKey: 'sparkles'
    }
];
