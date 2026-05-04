import { AnxietySign } from '../types/Session';

export const FORBIDDEN_TERMS = [
    "cure",
    "treat",
    "treatment",
    "therapy",
    "diagnose",
    "diagnosis",
    "clinical score",
    "validated anxiety score",
    "guaranteed",
    "stop fear",
    "fix anxiety",
    "anxiety detected",
    "AI detected",
    "bark detected",
    "medical result",
    "scientifically proven",
    "veterinary-approved",
    "expert-validated",
    "Karen Overall protocol",
    "VIN protocol",
    "Fear Free certified",
    "Low Stress Handling certified",
    "bark analysis",
    "AR guided",
    "AR",
    "Bark Analysis"
];

export const PREFERRED_TERMS = [
    "may help",
    "support",
    "practice",
    "routine",
    "gentle",
    "signs noted",
    "based on your check-in",
    "owner-reported signs",
    "calmer setup",
    "what seems to work for your dog",
    "try an easier step",
    "move at your dog’s pace",
    "stop if signs increase"
];

export const GLOBAL_SAFETY_NOTE = {
    short: "ChillPup is not a medical or behavioral diagnosis tool.",
    full: "ChillPup routines are gentle practice guides based on owner observations. They are not a diagnosis, treatment plan, or substitute for advice from a veterinarian or qualified behavior professional."
};

export const BEHAVIORAL_SEVERE_SIGNS: AnxietySign[] = [
    'aggression',
    'self_harm',
    'bolting_or_escape_attempts'
];

export const MEDICAL_SEVERE_SIGNS: AnxietySign[] = [
    'collapse_or_breathing_trouble',
    'repeated_vomiting_or_diarrhea'
];

export const SEVERE_SIGN_LOGIC = {
    medical: {
        title: "Medical signs noted",
        body: "For medical symptoms or severe distress, contact a veterinarian.",
        primaryCTA: "End Routine",
        blockStart: true
    },
    behavioral: {
        title: "Strong signs noted",
        body: "For panic, aggression, self-injury, or escape attempts, stop the routine and get professional support.",
        primaryCTA: "Use Easier Routine",
        secondaryCTA: "End Routine",
        blockStart: false
    }
};

export const IN_SESSION_SAFETY_PROMPT = {
    title: "Make it easier next time",
    body: "If signs increased, use a shorter step, add more distance, or stop for today.",
    primaryCTA: "Finish"
};
