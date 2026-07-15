import { Session } from '../types/Session';

export interface RoutineCatalogueItem {
    problemTitle: string;
    problemSummary: string;
}

export interface CategoryCatalogueItem {
    title: string;
    helper: string;
    icon: string;
}

export const CATEGORY_CATALOGUE_PRESENTATION: Record<string, CategoryCatalogueItem> = {
    foundation: {
        title: "Not sure where to start?",
        helper: "Begin with a short everyday routine.",
        icon: "leaf-outline"
    },
    walk_fear: {
        title: "Going outside feels difficult",
        helper: "Doorways, walks, nighttime, or bad weather.",
        icon: "walk-outline"
    },
    noise_support: {
        title: "Loud noises or fireworks",
        helper: "Support before, during, or after noisy moments.",
        icon: "sparkles-outline"
    },
    home_triggers: {
        title: "Visitors or home triggers",
        helper: "Practice around door and guest-related cues.",
        icon: "home-outline"
    },
    alone_time: {
        title: "Being alone feels difficult",
        helper: "Practice very small, low-pressure separations.",
        icon: "person-outline"
    },
    care_handling: {
        title: "Vet visits or handling",
        helper: "Prepare for routine care without forcing contact.",
        icon: "medkit-outline"
    }
};

export const ROUTINE_CATALOGUE_PRESENTATION: Record<string, RoutineCatalogueItem> = {
    daily_calm_reset: {
        problemTitle: "Need a simple place to start",
        problemSummary: "Try a short everyday calm practice."
    },
    outdoor_confidence_reset: {
        problemTitle: "Scared to go outside",
        problemSummary: "Practice at the easiest doorway or outdoor edge."
    },
    post_fireworks_walk_rebuild: {
        problemTitle: "Going outside feels hard after fireworks",
        problemSummary: "Take tiny outdoor steps after the noise has stopped."
    },
    night_walk_confidence: {
        problemTitle: "Night walks feel difficult",
        problemSummary: "Use a short, familiar, well-lit route."
    },
    rain_weather_potty_confidence: {
        problemTitle: "Won't potty in bad weather",
        problemSummary: "Try one short, sheltered potty trip."
    },
    fireworks_loud_noises_basic: {
        problemTitle: "Thunder or fireworks are happening",
        problemSummary: "Set up a safer, quieter place during noisy moments."
    },
    fireworks_prep_routine: {
        problemTitle: "Prepare before fireworks",
        problemSummary: "Make a support plan on a calm, quiet day."
    },
    post_fireworks_recovery_home: {
        problemTitle: "Recovering after fireworks",
        problemSummary: "Lower pressure at home after the noise has stopped."
    },
    visitors_at_home: {
        problemTitle: "Visitors feel difficult",
        problemSummary: "Practice calm distance from door and guest cues."
    },
    being_alone: {
        problemTitle: "Being left alone feels difficult",
        problemSummary: "Practice very small, low-pressure separations."
    },
    vet_visit_prep: {
        problemTitle: "Vet visits or handling feel difficult",
        problemSummary: "Practice routine handling without forcing contact."
    }
};

export function getRoutineCataloguePresentation(session: Session): RoutineCatalogueItem {
    const matched = ROUTINE_CATALOGUE_PRESENTATION[session.id];
    if (matched) {
        return matched;
    }
    return {
        problemTitle: session.title,
        problemSummary: session.subtitle
    };
}
