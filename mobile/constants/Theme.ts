export const COLORS = {
    primary: '#0D99FF', // Primary Blue for buttons/CTAs
    accent: '#007ACC', // Dark Accent
    backgroundLight: '#eaf5ffff', // Light Blue BG
    mint: '#A8DADC', // Mint for calm elements
    lavender: '#E0BBE4', // Lavender for onboarding
    background: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#666666',
    error: '#EF4444',
    success: '#10B981',
    border: '#E5E5E5',
};

export const SIZES = {
    radius: 16,
    padding: 24,
    margin: 16,
    icon: 24,
};

export const FONTS = {
    h1: { fontSize: 28, fontWeight: 'bold' as const },
    h2: { fontSize: 24, fontWeight: 'bold' as const },
    h3: { fontSize: 18, fontWeight: 'bold' as const },
    body: { fontSize: 16, fontWeight: 'normal' as const },
    caption: { fontSize: 14, fontWeight: 'normal' as const },
    small: { fontSize: 12, fontWeight: 'normal' as const },
};

export const SHADOWS = {
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
};
