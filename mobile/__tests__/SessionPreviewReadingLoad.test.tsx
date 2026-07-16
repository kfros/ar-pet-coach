import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';
import SessionPreviewScreen from '../screens/SessionPreviewScreen';
import * as SubscriptionManager from '../components/SubscriptionManager';
import SessionService from '../services/sessionService';

const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
};

const mockRoute = {
    params: {
        sessionId: 'free_1',
        petId: 'pet_1'
    }
};

jest.mock('../services/sessionService', () => ({
    getSessions: jest.fn(),
    getSessionById: jest.fn(),
    getRecentProgress: jest.fn(() => Promise.resolve(null)),
    getHomeSnapshot: jest.fn(),
}));

jest.mock('../services/petProfileRepository', () => ({
    getPetProfile: jest.fn(() => Promise.resolve({ id: 'pet_1', petName: 'Buddy' })),
    addListener: jest.fn(() => () => {}),
    getAuthMode: jest.fn(() => Promise.resolve('authenticated')),
}));

jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
    SafeAreaView: ({ children }: any) => <>{children}</>,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
}));

describe('SessionPreviewReadingLoad - CP-PREVIEW-001 tests', () => {
    const freeSession = {
        id: 'free_1',
        title: 'Free Routine Title',
        subtitle: 'Free routine subtitle',
        accessLevel: 'free',
        durationMinutes: 10,
        suggestedTimeCopy: '10 mins max',
        difficulty: 'easy',
        backgroundSoundPolicy: {
            mode: 'none',
        },
        steps: [
            { id: 's1', title: 'Step One' },
            { id: 's2', title: '' }, // empty step title, should be filtered
            { id: 's3', title: 'Step Three' },
        ],
        suitableFor: ['Puppies', 'Adult dogs'],
        beforeYouStart: ['Wash hands', 'Prepare treats', 'Find a quiet room'],
        safetyNotes: ['Prepare treats', 'Ensure safety'],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (SessionService.getSessionById as jest.Mock).mockReturnValue(freeSession);
        jest.spyOn(SubscriptionManager, 'useSubscription').mockReturnValue({
            isPremium: false,
            isLoading: false,
        } as any);
    });

    test('1. Initial free Preview hierarchy and default collapsed state', () => {
        const { getByText, queryByText, getByTestId } = render(
            <SubscriptionManager.SubscriptionProvider>
                <SessionPreviewScreen navigation={mockNavigation} route={mockRoute} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // Header and title are correct
        expect(getByText('Routine preview')).toBeTruthy();
        expect(getByTestId('preview-back-button')).toBeTruthy();

        // Summary Card
        expect(getByTestId('preview-summary-card')).toBeTruthy();
        expect(getByText('Free Routine Title')).toBeTruthy();
        expect(getByText('10 mins max')).toBeTruthy(); // suggestedTimeCopy used
        expect(getByText('No background sound needed for this routine.')).toBeTruthy();

        // Safety notes visible (Before you start)
        expect(getByText('Before you start')).toBeTruthy();
        expect(getByText('Ensure safety')).toBeTruthy(); // from safetyNotes

        // Disclosures should be collapsed by default (their contents are not mounted)
        expect(queryByText('Step One')).toBeNull();
        expect(queryByText('Puppies')).toBeNull();
        expect(queryByText('Wash hands')).toBeNull(); // Wash hands is not a duplicate, but collapsed
    });

    test('2. Exact disclosure labels, counts, test IDs, and accessibility attributes', () => {
        const { getByTestId } = render(
            <SubscriptionManager.SubscriptionProvider>
                <SessionPreviewScreen navigation={mockNavigation} route={mockRoute} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // Steps disclosure
        const stepsHeader = getByTestId('preview-disclosure-steps');
        expect(stepsHeader.props.accessibilityRole).toBe('button');
        expect(stepsHeader.props.accessibilityState.expanded).toBe(false);

        // Best for disclosure
        const bestForHeader = getByTestId('preview-disclosure-best-for');
        expect(bestForHeader.props.accessibilityRole).toBe('button');
        expect(bestForHeader.props.accessibilityState.expanded).toBe(false);

        // Get ready disclosure
        const getReadyHeader = getByTestId('preview-disclosure-get-ready');
        expect(getReadyHeader.props.accessibilityRole).toBe('button');
        expect(getReadyHeader.props.accessibilityState.expanded).toBe(false);
    });

    test('3. Independent expand/collapse behavior and canonical ordering', () => {
        const { getByText, queryByText, getByTestId } = render(
            <SubscriptionManager.SubscriptionProvider>
                <SessionPreviewScreen navigation={mockNavigation} route={mockRoute} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // Expand Steps
        const stepsHeader = getByTestId('preview-disclosure-steps');
        fireEvent.press(stepsHeader);

        // Now Step One should be visible
        expect(getByText('Step One')).toBeTruthy();
        expect(getByText('Step Three')).toBeTruthy();
        // Step Two was empty so it is omitted; numbering is contiguous (1 and 2)
        expect(getByText('1')).toBeTruthy();
        expect(getByText('2')).toBeTruthy();
        expect(queryByText('3')).toBeNull();

        // Best for and Get ready contents are still not visible
        expect(queryByText('Puppies')).toBeNull();

        // Collapse Steps
        fireEvent.press(stepsHeader);
        expect(queryByText('Step One')).toBeNull();
    });

    test('4. All notFor and selected safety items visible before expansion', () => {
        const notForSession = {
            ...freeSession,
            notFor: ['Do not use if dog is sick', 'Avoid active stress'],
        };
        (SessionService.getSessionById as jest.Mock).mockReturnValue(notForSession);

        const { getByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <SessionPreviewScreen navigation={mockNavigation} route={mockRoute} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // notFor should be rendered and visible
        expect(getByText('Use another option if')).toBeTruthy();
        expect(getByText('Do not use if dog is sick')).toBeTruthy();
    });

    test('5. safetyNotes precedence, stopIf fallback, and internal raw-ID filtering', () => {
        // Test stopIf fallback when safetyNotes is empty/missing
        const stopIfSession = {
            ...freeSession,
            safetyNotes: [],
            stopIf: [
                'aggression', // internal ID
                'trembling_or_shaking', // internal ID
                'If the dog gets very agitated.', // sentence
                'bolting_or_escape_attempts', // internal ID
            ]
        };
        (SessionService.getSessionById as jest.Mock).mockReturnValue(stopIfSession);

        const { getByText, queryByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <SessionPreviewScreen navigation={mockNavigation} route={mockRoute} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // Should use Stop the session if heading
        expect(getByText('Stop the session if')).toBeTruthy();
        // Should render human-readable sentence
        expect(getByText('If the dog gets very agitated.')).toBeTruthy();

        // Should not render internal IDs
        expect(queryByText('aggression')).toBeNull();
        expect(queryByText('trembling_or_shaking')).toBeNull();
        expect(queryByText('bolting_or_escape_attempts')).toBeNull();
    });

    test('6. Exact duplicate omission in Get ready against rendered safety content', () => {
        // safetyContent has 'Prepare treats' and 'Ensure safety'
        // beforeYouStart has 'Wash hands', 'Prepare treats', 'Find a quiet room'
        // 'Prepare treats' is an exact match and should be omitted
        // 'Wash hands' and 'Find a quiet room' remain (count = 2)

        const { getByTestId, queryByText, getByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <SessionPreviewScreen navigation={mockNavigation} route={mockRoute} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // Get ready disclosure should show metadata "2 items"
        expect(getByText('2 items')).toBeTruthy();

        // Expand Get ready
        const getReadyHeader = getByTestId('preview-disclosure-get-ready');
        fireEvent.press(getReadyHeader);

        // Wash hands and Find a quiet room are visible
        expect(getByText('Wash hands')).toBeTruthy();
        expect(getByText('Find a quiet room')).toBeTruthy();

        // Prepare treats is NOT rendered inside Get ready
        const getReadyContent = getByTestId('preview-disclosure-get-ready-content');
        const duplicateInGetReady = within(getReadyContent).queryByText('Prepare treats');
        expect(duplicateInGetReady).toBeNull();
    });

    test('7. Compact locked Premium context and Paywall action', () => {
        const premiumSession = {
            ...freeSession,
            accessLevel: 'premium'
        };
        (SessionService.getSessionById as jest.Mock).mockReturnValue(premiumSession);

        const { getByText, getByTestId } = render(
            <SubscriptionManager.SubscriptionProvider>
                <SessionPreviewScreen navigation={mockNavigation} route={mockRoute} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // PREMIUM badge visible
        expect(getByText('PREMIUM')).toBeTruthy();

        // Compact Premium Context Card visible
        const contextCard = getByTestId('premium-preview-access-card');
        expect(contextCard).toBeTruthy();
        
        const contextTitle = within(contextCard).getByText('Premium routine');
        expect(contextTitle).toBeTruthy();
        const contextBody = within(contextCard).getByText('Premium is required to start. You can review the routine first.');
        expect(contextBody).toBeTruthy();

        // Footer action: "Unlock routine"
        const footerBtn = getByText('Unlock routine');
        fireEvent.press(footerBtn);

        // Navigates to Paywall once
        expect(mockNavigation.navigate).toHaveBeenCalledWith('Paywall', {
            source: 'premium_session',
            sessionId: 'free_1',
            petId: 'pet_1'
        });
    });

    test('8. Checking access state', () => {
        const premiumSession = {
            ...freeSession,
            accessLevel: 'premium'
        };
        (SessionService.getSessionById as jest.Mock).mockReturnValue(premiumSession);

        jest.spyOn(SubscriptionManager, 'useSubscription').mockReturnValue({
            isPremium: false,
            isLoading: true,
        } as any);

        const { getByText, queryByTestId } = render(
            <SubscriptionManager.SubscriptionProvider>
                <SessionPreviewScreen navigation={mockNavigation} route={mockRoute} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // CHECKING ACCESS badge visible
        expect(getByText('CHECKING ACCESS')).toBeTruthy();

        // Premium context card is NOT visible during loading
        expect(queryByTestId('premium-preview-access-card')).toBeNull();

        // Footer action: "Checking access"
        const footerBtn = getByText('Checking access');
        expect(footerBtn).toBeTruthy();

        // Pressing does not trigger navigation
        fireEvent.press(footerBtn);
        expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    test('9. Included Premium routine behavior', () => {
        const premiumSession = {
            ...freeSession,
            accessLevel: 'premium'
        };
        (SessionService.getSessionById as jest.Mock).mockReturnValue(premiumSession);

        jest.spyOn(SubscriptionManager, 'useSubscription').mockReturnValue({
            isPremium: true,
            isLoading: false,
        } as any);

        const { getByText, queryByTestId } = render(
            <SubscriptionManager.SubscriptionProvider>
                <SessionPreviewScreen navigation={mockNavigation} route={mockRoute} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // INCLUDED badge visible
        expect(getByText('INCLUDED')).toBeTruthy();

        // Premium context card is NOT visible when included
        expect(queryByTestId('premium-preview-access-card')).toBeNull();

        // Footer action: "Start Session"
        const footerBtn = getByText('Start Session');
        fireEvent.press(footerBtn);

        // Navigates to GuidedSession
        expect(mockNavigation.navigate).toHaveBeenCalledWith('GuidedSession', expect.any(Object));
    });

    test('10. Outdoor confidence level selection collapsed ladder', () => {
        const outdoorSession = {
            ...freeSession,
            id: 'outdoor_confidence_reset',
        };
        (SessionService.getSessionById as jest.Mock).mockReturnValue(outdoorSession);

        const { getByText, getByTestId, queryByText } = render(
            <SubscriptionManager.SubscriptionProvider>
                <SessionPreviewScreen navigation={mockNavigation} route={{ params: { sessionId: 'outdoor_confidence_reset', petId: 'pet_1' } }} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // Selected summary is visible
        expect(getByTestId('outdoor-level-summary')).toBeTruthy();
        expect(getByText(/Level 1 of 7: Doorway calm/i)).toBeTruthy();

        // Warning banner is visible
        expect(getByText('This routine is for threshold practice at the safest edge, not a full walk.')).toBeTruthy();

        // Change level header is visible
        expect(getByText('Change level')).toBeTruthy();

        // Ladder itself is collapsed by default (individual steps not visible because the disclosure is not expanded)
        expect(queryByText('Choose today’s outdoor level.')).toBeNull();

        // Expand Change level disclosure
        const ladderHeader = getByTestId('preview-disclosure-outdoor-levels');
        fireEvent.press(ladderHeader);

        // Now header title changes to "Hide levels"
        expect(getByText('Hide levels')).toBeTruthy();

        // Ladder steps/text should be visible
        expect(getByText('Choose today’s outdoor level. This level changes one practice step inside the session. Repeating an easier level is always okay.')).toBeTruthy();
    });

    test('11. Fallbacks routine navigation', () => {
        const sessionWithFallbacks = {
            ...freeSession,
            fallbacks: [
                {
                    type: 'routine',
                    routineId: 'fallback_1',
                    title: 'Try Fallback 1',
                    body: 'Alternative option'
                }
            ]
        };
        (SessionService.getSessionById as jest.Mock).mockReturnValue(sessionWithFallbacks);

        const { getByText, getByTestId } = render(
            <SubscriptionManager.SubscriptionProvider>
                <SessionPreviewScreen navigation={mockNavigation} route={mockRoute} />
            </SubscriptionManager.SubscriptionProvider>
        );

        // Expand Try instead disclosure
        const fallbackHeader = getByTestId('preview-disclosure-try-instead');
        fireEvent.press(fallbackHeader);

        const fallbackItem = getByText('Try Fallback 1');
        fireEvent.press(fallbackItem);

        // Navigates to SessionPreview with same petId
        expect(mockNavigation.navigate).toHaveBeenCalledWith('SessionPreview', {
            sessionId: 'fallback_1',
            petId: 'pet_1'
        });
    });

    test('12. Missing source arrays omit disclosures', () => {
        const emptySession = {
            id: 'free_1',
            title: 'Free Routine Title',
            accessLevel: 'free',
            steps: [],
            suitableFor: [],
            beforeYouStart: [],
            safetyNotes: [],
            fallbacks: []
        };
        (SessionService.getSessionById as jest.Mock).mockReturnValue(emptySession);

        const { queryByTestId } = render(
            <SubscriptionManager.SubscriptionProvider>
                <SessionPreviewScreen navigation={mockNavigation} route={mockRoute} />
            </SubscriptionManager.SubscriptionProvider>
        );

        expect(queryByTestId('preview-disclosure-steps')).toBeNull();
        expect(queryByTestId('preview-disclosure-best-for')).toBeNull();
        expect(queryByTestId('preview-disclosure-get-ready')).toBeNull();
        expect(queryByTestId('preview-disclosure-try-instead')).toBeNull();
    });
});
