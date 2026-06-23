import { CheckInProfile, CheckInProfileId, CheckInSignOption } from '../types/Session';

export const GLOBAL_SEVERE_SIGNS: CheckInSignOption[] = [
    {
        id: "aggression",
        label: "Aggression",
        kind: "severe",
        scoreWeight: 3,
        safetyLevel: "behavioral_stop"
    },
    {
        id: "self_harm",
        label: "Self-Harm",
        kind: "severe",
        scoreWeight: 4,
        safetyLevel: "behavioral_stop"
    },
    {
        id: "bolting_or_escape_attempts",
        label: "Escape Attempts",
        kind: "severe",
        scoreWeight: 3,
        safetyLevel: "behavioral_stop"
    },
    {
        id: "collapse_or_breathing_trouble",
        label: "Collapse / Breathing Trouble",
        kind: "severe",
        scoreWeight: 5,
        safetyLevel: "medical_stop"
    },
    {
        id: "repeated_vomiting_or_diarrhea",
        label: "Vomiting / Diarrhea",
        kind: "severe",
        scoreWeight: 4,
        safetyLevel: "medical_stop"
    }
];

export const CHECKIN_PROFILES: Record<CheckInProfileId, CheckInProfile> = {
    general_calm: {
        id: "general_calm",
        title: "Calm signs",
        beforePrompt: "How is your dog right now?",
        afterPrompt: "How is your dog after the routine?",
        showPositiveSignsAfter: true,
        milestonePromptEnabled: false,
        stressSigns: [
            { id: "hiding", label: "Hiding", kind: "stress", scoreWeight: 1 },
            { id: "trembling_or_shaking", label: "Trembling / Shaking", kind: "stress", scoreWeight: 1 },
            { id: "panting", label: "Panting", kind: "stress", scoreWeight: 1 },
            { id: "pacing_or_restless", label: "Pacing / Restless", kind: "stress", scoreWeight: 1 },
            { id: "owner_seeking", label: "Seeking Owner", kind: "stress", scoreWeight: 1 },
            { id: "scanning_or_alert", label: "Scanning / Alert", kind: "stress", scoreWeight: 1 },
            { id: "freezing", label: "Freezing", kind: "stress", scoreWeight: 2 },
            { id: "barking_whining_howling", label: "Vocalizing", kind: "stress", scoreWeight: 1 },
            { id: "drooling", label: "Drooling", kind: "stress", scoreWeight: 1 },
            { id: "not_accepting_treats", label: "Refusing Treats", kind: "stress", scoreWeight: 2 },
            { id: "other", label: "Other", kind: "stress", scoreWeight: 1 }
        ],
        positiveSigns: [
            { id: "relaxed_body", label: "Relaxed Body", kind: "positive", scoreWeight: 1 },
            { id: "soft_eyes", label: "Soft Eyes", kind: "positive", scoreWeight: 1 },
            { id: "slower_breathing", label: "Slower Breathing", kind: "positive", scoreWeight: 1 },
            { id: "settled_nearby", label: "Settled Nearby", kind: "positive", scoreWeight: 1 },
            { id: "took_treats_calmly", label: "Took Treats Calmly", kind: "positive", scoreWeight: 1 },
            { id: "resting_or_lying_down", label: "Resting / Lying Down", kind: "positive", scoreWeight: 1 },
            { id: "less_pacing", label: "Less Pacing", kind: "positive", scoreWeight: 1 },
            { id: "more_responsive", label: "More Responsive", kind: "positive", scoreWeight: 1 },
            { id: "chose_safe_spot", label: "Chose Safe Spot", kind: "positive", scoreWeight: 1 },
            { id: "fell_asleep", label: "Fell Asleep", kind: "positive", scoreWeight: 2 }
        ],
        severeSigns: GLOBAL_SEVERE_SIGNS
    },
    outdoor_confidence: {
        id: "outdoor_confidence",
        title: "Outdoor signs",
        beforePrompt: "What signs do you notice before this outdoor step?",
        afterPrompt: "What signs did you still notice after the step?",
        showPositiveSignsAfter: true,
        milestonePromptEnabled: true,
        stressSigns: [
            { id: "freezing_at_threshold", label: "Freezing at the edge", kind: "stress", scoreWeight: 2 },
            { id: "pulling_back_home", label: "Pulling back / turning home", kind: "stress", scoreWeight: 2 },
            { id: "scanning_outside", label: "Scanning outside", kind: "stress", scoreWeight: 1 },
            { id: "trembling_or_shaking", label: "Trembling / Shaking", kind: "stress", scoreWeight: 2 },
            { id: "panting", label: "Panting", kind: "stress", scoreWeight: 1 },
            { id: "not_accepting_treats", label: "Refusing treats", kind: "stress", scoreWeight: 2, helperText: "If your dog refuses food they usually like, make the step easier." },
            { id: "trying_to_hide", label: "Trying to hide", kind: "stress", scoreWeight: 2 },
            { id: "vocalizing", label: "Whining / Barking", kind: "stress", scoreWeight: 1 },
            { id: "tucked_tail_or_low_body", label: "Tucked tail / low body", kind: "stress", scoreWeight: 1 },
            { id: "unable_to_recover", label: "Could not settle after returning", kind: "stress", scoreWeight: 2 },
            { id: "other", label: "Other", kind: "stress", scoreWeight: 1 }
        ],
        positiveSigns: [
            { id: "looked_back_at_owner", label: "Looked back at me", kind: "positive", scoreWeight: 1 },
            { id: "took_treats_calmly", label: "Took treats calmly", kind: "positive", scoreWeight: 1 },
            { id: "looser_body", label: "Body looked a little softer", kind: "positive", scoreWeight: 1 },
            { id: "sniffed_or_explored", label: "Sniffed or explored briefly", kind: "positive", scoreWeight: 1 },
            { id: "voluntary_step", label: "Moved voluntarily", kind: "positive", scoreWeight: 1 },
            { id: "paused_without_panic", label: "Paused without panic", kind: "positive", scoreWeight: 1 },
            { id: "returned_calmly", label: "Returned calmly", kind: "positive", scoreWeight: 1 },
            { id: "recovered_after_retreat", label: "Recovered after retreat", kind: "positive", scoreWeight: 1 },
            { id: "noticed_trigger_and_recovered", label: "Noticed something and recovered", kind: "positive", scoreWeight: 1 },
            { id: "checked_in_after_step", label: "Checked in after the step", kind: "positive", scoreWeight: 1 }
        ],
        severeSigns: GLOBAL_SEVERE_SIGNS
    },
    // Placeholders mapping to general_calm for safety and completeness
    noise_support: {
        id: "noise_support",
        title: "Noise support signs",
        beforePrompt: "What signs do you notice before the noise support routine?",
        afterPrompt: "What signs did you notice after the noise support routine?",
        showPositiveSignsAfter: true,
        milestonePromptEnabled: false,
        stressSigns: [
            { id: "hiding", label: "Hiding", kind: "stress", scoreWeight: 1 },
            { id: "trembling_or_shaking", label: "Trembling / Shaking", kind: "stress", scoreWeight: 1 },
            { id: "panting", label: "Panting", kind: "stress", scoreWeight: 1 },
            { id: "pacing_or_restless", label: "Pacing / Restless", kind: "stress", scoreWeight: 1 },
            { id: "owner_seeking", label: "Seeking Owner", kind: "stress", scoreWeight: 1 },
            { id: "scanning_or_alert", label: "Scanning / Alert", kind: "stress", scoreWeight: 1 },
            { id: "barking_whining_howling", label: "Vocalizing", kind: "stress", scoreWeight: 1 },
            { id: "drooling", label: "Drooling", kind: "stress", scoreWeight: 1 },
            { id: "not_accepting_treats", label: "Refusing Treats", kind: "stress", scoreWeight: 2 },
            { id: "unable_to_settle", label: "Unable to settle", kind: "stress", scoreWeight: 1 },
            { id: "clawing_or_scratching_exits", label: "Clawing/scratching at exits", kind: "stress", scoreWeight: 2 },
            { id: "other", label: "Other", kind: "stress", scoreWeight: 1 }
        ],
        positiveSigns: [
            { id: "chose_safe_spot", label: "Chose safe spot", kind: "positive", scoreWeight: 1 },
            { id: "accepted_food_or_chew", label: "Accepted food or chew", kind: "positive", scoreWeight: 1 },
            { id: "rested_between_noises", label: "Rested between noises", kind: "positive", scoreWeight: 1 },
            { id: "settled_near_owner", label: "Settled near owner", kind: "positive", scoreWeight: 1 },
            { id: "returned_to_room", label: "Returned to room", kind: "positive", scoreWeight: 1 },
            { id: "explored_again", label: "Explored again", kind: "positive", scoreWeight: 1 },
            { id: "recovered_after_hiding", label: "Recovered after hiding", kind: "positive", scoreWeight: 1 },
            { id: "slept_after_event", label: "Slept after event", kind: "positive", scoreWeight: 2 }
        ],
        severeSigns: GLOBAL_SEVERE_SIGNS
    },
    visitors: {
        id: "visitors",
        title: "Visitor interaction signs",
        beforePrompt: "How is your dog right now?",
        afterPrompt: "How is your dog after the routine?",
        showPositiveSignsAfter: true,
        milestonePromptEnabled: false,
        stressSigns: [
            { id: "hiding", label: "Hiding", kind: "stress", scoreWeight: 1 },
            { id: "trembling_or_shaking", label: "Trembling / Shaking", kind: "stress", scoreWeight: 1 },
            { id: "panting", label: "Panting", kind: "stress", scoreWeight: 1 },
            { id: "pacing_or_restless", label: "Pacing / Restless", kind: "stress", scoreWeight: 1 },
            { id: "owner_seeking", label: "Seeking Owner", kind: "stress", scoreWeight: 1 },
            { id: "scanning_or_alert", label: "Scanning / Alert", kind: "stress", scoreWeight: 1 },
            { id: "freezing", label: "Freezing", kind: "stress", scoreWeight: 2 },
            { id: "barking_whining_howling", label: "Vocalizing", kind: "stress", scoreWeight: 1 },
            { id: "drooling", label: "Drooling", kind: "stress", scoreWeight: 1 },
            { id: "not_accepting_treats", label: "Refusing Treats", kind: "stress", scoreWeight: 2 },
            { id: "other", label: "Other", kind: "stress", scoreWeight: 1 }
        ],
        positiveSigns: [
            { id: "relaxed_body", label: "Relaxed Body", kind: "positive", scoreWeight: 1 },
            { id: "soft_eyes", label: "Soft Eyes", kind: "positive", scoreWeight: 1 },
            { id: "slower_breathing", label: "Slower Breathing", kind: "positive", scoreWeight: 1 },
            { id: "settled_nearby", label: "Settled Nearby", kind: "positive", scoreWeight: 1 },
            { id: "took_treats_calmly", label: "Took Treats Calmly", kind: "positive", scoreWeight: 1 },
            { id: "resting_or_lying_down", label: "Resting / Lying Down", kind: "positive", scoreWeight: 1 },
            { id: "less_pacing", label: "Less Pacing", kind: "positive", scoreWeight: 1 },
            { id: "more_responsive", label: "More Responsive", kind: "positive", scoreWeight: 1 },
            { id: "chose_safe_spot", label: "Chose Safe Spot", kind: "positive", scoreWeight: 1 },
            { id: "fell_asleep", label: "Fell Asleep", kind: "positive", scoreWeight: 2 }
        ],
        severeSigns: GLOBAL_SEVERE_SIGNS
    },
    being_alone: {
        id: "being_alone",
        title: "Separation signs",
        beforePrompt: "How is your dog right now?",
        afterPrompt: "How is your dog after the routine?",
        showPositiveSignsAfter: true,
        milestonePromptEnabled: false,
        stressSigns: [
            { id: "hiding", label: "Hiding", kind: "stress", scoreWeight: 1 },
            { id: "trembling_or_shaking", label: "Trembling / Shaking", kind: "stress", scoreWeight: 1 },
            { id: "panting", label: "Panting", kind: "stress", scoreWeight: 1 },
            { id: "pacing_or_restless", label: "Pacing / Restless", kind: "stress", scoreWeight: 1 },
            { id: "owner_seeking", label: "Seeking Owner", kind: "stress", scoreWeight: 1 },
            { id: "scanning_or_alert", label: "Scanning / Alert", kind: "stress", scoreWeight: 1 },
            { id: "freezing", label: "Freezing", kind: "stress", scoreWeight: 2 },
            { id: "barking_whining_howling", label: "Vocalizing", kind: "stress", scoreWeight: 1 },
            { id: "drooling", label: "Drooling", kind: "stress", scoreWeight: 1 },
            { id: "not_accepting_treats", label: "Refusing Treats", kind: "stress", scoreWeight: 2 },
            { id: "other", label: "Other", kind: "stress", scoreWeight: 1 }
        ],
        positiveSigns: [
            { id: "relaxed_body", label: "Relaxed Body", kind: "positive", scoreWeight: 1 },
            { id: "soft_eyes", label: "Soft Eyes", kind: "positive", scoreWeight: 1 },
            { id: "slower_breathing", label: "Slower Breathing", kind: "positive", scoreWeight: 1 },
            { id: "settled_nearby", label: "Settled Nearby", kind: "positive", scoreWeight: 1 },
            { id: "took_treats_calmly", label: "Took Treats Calmly", kind: "positive", scoreWeight: 1 },
            { id: "resting_or_lying_down", label: "Resting / Lying Down", kind: "positive", scoreWeight: 1 },
            { id: "less_pacing", label: "Less Pacing", kind: "positive", scoreWeight: 1 },
            { id: "more_responsive", label: "More Responsive", kind: "positive", scoreWeight: 1 },
            { id: "chose_safe_spot", label: "Chose Safe Spot", kind: "positive", scoreWeight: 1 },
            { id: "fell_asleep", label: "Fell Asleep", kind: "positive", scoreWeight: 2 }
        ],
        severeSigns: GLOBAL_SEVERE_SIGNS
    },
    care_handling: {
        id: "care_handling",
        title: "Care and handling signs",
        beforePrompt: "How is your dog right now?",
        afterPrompt: "How is your dog after the routine?",
        showPositiveSignsAfter: true,
        milestonePromptEnabled: false,
        stressSigns: [
            { id: "hiding", label: "Hiding", kind: "stress", scoreWeight: 1 },
            { id: "trembling_or_shaking", label: "Trembling / Shaking", kind: "stress", scoreWeight: 1 },
            { id: "panting", label: "Panting", kind: "stress", scoreWeight: 1 },
            { id: "pacing_or_restless", label: "Pacing / Restless", kind: "stress", scoreWeight: 1 },
            { id: "owner_seeking", label: "Seeking Owner", kind: "stress", scoreWeight: 1 },
            { id: "scanning_or_alert", label: "Scanning / Alert", kind: "stress", scoreWeight: 1 },
            { id: "freezing", label: "Freezing", kind: "stress", scoreWeight: 2 },
            { id: "barking_whining_howling", label: "Vocalizing", kind: "stress", scoreWeight: 1 },
            { id: "drooling", label: "Drooling", kind: "stress", scoreWeight: 1 },
            { id: "not_accepting_treats", label: "Refusing Treats", kind: "stress", scoreWeight: 2 },
            { id: "other", label: "Other", kind: "stress", scoreWeight: 1 }
        ],
        positiveSigns: [
            { id: "relaxed_body", label: "Relaxed Body", kind: "positive", scoreWeight: 1 },
            { id: "soft_eyes", label: "Soft Eyes", kind: "positive", scoreWeight: 1 },
            { id: "slower_breathing", label: "Slower Breathing", kind: "positive", scoreWeight: 1 },
            { id: "settled_nearby", label: "Settled Nearby", kind: "positive", scoreWeight: 1 },
            { id: "took_treats_calmly", label: "Took Treats Calmly", kind: "positive", scoreWeight: 1 },
            { id: "resting_or_lying_down", label: "Resting / Lying Down", kind: "positive", scoreWeight: 1 },
            { id: "less_pacing", label: "Less Pacing", kind: "positive", scoreWeight: 1 },
            { id: "more_responsive", label: "More Responsive", kind: "positive", scoreWeight: 1 },
            { id: "chose_safe_spot", label: "Chose Safe Spot", kind: "positive", scoreWeight: 1 },
            { id: "fell_asleep", label: "Fell Asleep", kind: "positive", scoreWeight: 2 }
        ],
        severeSigns: GLOBAL_SEVERE_SIGNS
    }
};

export const getCheckInProfile = (id?: CheckInProfileId | string): CheckInProfile => {
    if (!id) return CHECKIN_PROFILES.general_calm;
    return CHECKIN_PROFILES[id as CheckInProfileId] || CHECKIN_PROFILES.general_calm;
};
