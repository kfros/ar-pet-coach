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
        title: 'Thunder & Fireworks Safe Space',
        subtitle: 'Safe-space support for noisy moments.',
        durationMinutes: 5,
        difficulty: 'easy',
        trigger: 'loud_noises',
        goal: 'Help the owner prepare and use a safe, predictable support setup before, during, and after thunder or fireworks.',
        category: 'noise_support',
        categoryLabel: 'Noise & Fireworks',
        categoryOrder: 30,
        checkInProfileId: 'noise_support',
        backgroundSoundPolicy: {
            mode: 'calm_music',
            defaultEnabled: false,
            showControls: true,
            helperText: 'Optional calm background music is available. Skip it if your dog dislikes it. For sound masking, use a familiar household sound such as a fan, TV, or radio outside the app.'
        },
        suitableFor: [
            'Dogs who hide, tremble, pant, pace, or seek the owner during thunder or fireworks.',
            'Owners who need a simple safe-space support plan.',
            'Dogs who can remain physically safe indoors with owner support.'
        ],
        notFor: [
            'Escape attempts through doors, windows, fences, or crates.',
            'Self-injury, severe panic, or destructive attempts to get out.',
            'Collapse, breathing trouble, seizures, repeated vomiting or diarrhea.',
            'Fear that remains severe for days after the event.',
            'Medication or dosage guidance.'
        ],
        sourcePrinciples: [
            'Safe spaces should be available, not forced.',
            'During real events, focus on management and comfort, not training.',
            'Dogs may choose to hide; hiding safely can be a coping strategy.',
            'Use background sound only if it does not worry the dog.',
            'Contact a veterinarian or veterinary behaviorist for severe, unsafe, or escalating fear.'
        ],
        safetyNotes: [
            'Do not drag or force your dog into a safe space.',
            'Do not train with thunder or firework sounds during a real event.',
            'Secure doors, windows, balcony access, and exits.',
            'If your dog tries to escape, injures themselves, or cannot recover, contact a veterinarian or veterinary behaviorist.'
        ],
        beforeYouStart: [
            'Move to the quietest safe area available.',
            'Close windows and curtains if possible.',
            'Keep exits secure.',
            'Offer water and a safe resting place.',
            'Do not force your dog to face the noise.'
        ],
        steps: [
            {
                id: 'noise_safe_space_choose',
                title: 'Choose the safest place',
                instruction: 'Pick a quiet interior room or familiar hiding place away from windows if possible. Keep the area cozy and hazard-free.',
                durationSeconds: 45,
                visualCue: 'observe',
                canSkip: false
            },
            {
                id: 'noise_safe_space_make_available',
                title: 'Make it available, not forced',
                instruction: 'Let your dog enter and leave if it is safe. Do not drag, push, or shut them into a place they do not already trust.',
                durationSeconds: 45,
                visualCue: 'pause',
                canSkip: false
            },
            {
                id: 'noise_safe_space_reduce',
                title: 'Soften the outside noise',
                instruction: 'Close windows and curtains. Add gentle background sound only if your dog is comfortable with it.',
                durationSeconds: 45,
                visualCue: 'dim',
                canSkip: false
            },
            {
                id: 'noise_safe_space_support',
                title: 'Stay calmly available',
                instruction: 'If your dog seeks contact, offer calm presence. If they choose to hide safely, let them hide.',
                durationSeconds: 60,
                visualCue: 'observe',
                canSkip: false
            },
            {
                id: 'noise_safe_space_food_choice',
                title: 'Offer, do not push',
                instruction: 'Offer a chew, food toy, or food reward if your dog can eat. If they refuse, remove pressure and stay with the safe setup.',
                durationSeconds: 60,
                visualCue: 'reward',
                canSkip: false
            },
            {
                id: 'noise_safe_space_recover',
                title: 'Let recovery take time',
                instruction: 'Keep the safe space available after the noise stops. Log what helped and what signs were strongest.',
                durationSeconds: 60,
                visualCue: 'pause',
                canSkip: false
            }
        ],
        whatToWatchFor: [
            'Hiding in a preferred spot',
            'Trembling or shaking',
            'Panting or pacing',
            'Seeking contact with owner',
            'Refusing food or chews'
        ],
        stopIf: [
            'Your dog panics, tries to escape, injures themselves, or shows aggression.',
            'Your dog has collapse, breathing trouble, seizures, repeated vomiting, or diarrhea.',
            'In severe cases, stop the session and contact a veterinarian or veterinary behaviorist.'
        ],
        afterSession: [
            'Log the strongest signs you noticed.',
            'Note whether your dog accepted food, play, or rest.',
            'Use the notes to prepare earlier next time.'
        ],
        tags: ['free', 'loud_noises', 'fireworks', 'safe_space'],
        recommendedForTriggers: ['fireworks', 'loud_noises', 'traffic_or_car_horns'],
        iconKey: 'sparkles'
    }
];
