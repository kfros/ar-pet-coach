import { RoutineCategory } from '../types/Session';

export interface CategoryMetadata {
    title: string;
    subtitle: string;
    order: number;
}

export const ROUTINE_CATEGORIES: Record<RoutineCategory, CategoryMetadata> = {
    foundation: {
        title: "Start Here",
        subtitle: "Short everyday calm practice.",
        order: 10
    },
    walk_fear: {
        title: "Walk Fear & Outdoor Confidence",
        subtitle: "Tiny steps for dogs who freeze at the door, exit, or familiar route.",
        order: 20
    },
    noise_support: {
        title: "Noise & Fireworks",
        subtitle: "Support for loud sounds and planned quiet practice.",
        order: 30
    },
    home_triggers: {
        title: "Home & Visitors",
        subtitle: "Practice around household and guest-related cues.",
        order: 40
    },
    alone_time: {
        title: "Being Alone",
        subtitle: "Tiny distance practice for mild alone-time worry.",
        order: 50
    },
    care_handling: {
        title: "Care & Handling",
        subtitle: "Low-pressure prep for routine handling and vet visits.",
        order: 60
    }
};
