export const COLORS = {
    primary: '#0F766E', // Teal Accent
    primaryDark: '#0B5E57', // Pressed state
    primaryLight: 'rgba(45, 212, 191, 0.6)', // Focus ring / light tint
    accent: '#007ACC', // Dark Accent (keep if used elsewhere, else replace later)
    backgroundLight: '#F9FAFB', // Light Gray-White BG
    mint: '#F0FDF4', // Light Mint for calming backgrounds
    lavender: '#E9D5FF', // Lavender for onboarding
    background: '#FFFFFF',
    text: '#1F2937', // Dark Gray
    textSecondary: '#4B5563', // Lighter Gray
    error: '#EF4444',
    success: '#10B981',
    border: '#E5E7EB',
    calmBg: '#F6FAF8',
};

export const SIZES = {
    radius: 16,
    padding: 24,
    margin: 16,
    icon: 24,
};

export const FONTS = {
    h1: { fontSize: 28, fontWeight: '700' as const },
    h2: { fontSize: 24, fontWeight: '700' as const },
    h3: { fontSize: 18, fontWeight: '700' as const },
    body: { fontSize: 16, fontWeight: '400' as const },
    caption: { fontSize: 14, fontWeight: '400' as const },
    small: { fontSize: 12, fontWeight: '300' as const },
    tiny: { fontSize: 10, fontWeight: '400' as const },
};

export const SHADOWS = {
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 3,
    },
    large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 5,
    },
};
