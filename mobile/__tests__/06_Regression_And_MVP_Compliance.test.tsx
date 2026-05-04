import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import DashboardScreen from '../screens/DashboardScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SessionPreviewScreen from '../screens/SessionPreviewScreen';
import PaywallScreen from '../screens/PaywallScreen';
import { SubscriptionProvider } from '../components/SubscriptionManager';

// R10: Mock React Navigation globally to prevent context errors
jest.mock('@react-navigation/native', () => {
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      replace: jest.fn(),
      dispatch: jest.fn(),
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      params: {}, // Provide default mock params if needed
    }),
    useFocusEffect: (cb: any) => cb(), // Execute focus effects immediately
  };
});

jest.mock('../services/petProfileRepository', () => ({
  getPetProfile: jest.fn(() => Promise.resolve({ id: 'pet_1', petName: 'Buddy' })),
  getAuthMode: jest.fn(() => Promise.resolve('guest')),
}));

jest.mock('../services/sessionService', () => ({
  getSessions: jest.fn(() => []),
  getRecentProgress: jest.fn(() => Promise.resolve(null)),
}));

// Mock SubscriptionManager entirely so SubscriptionProvider never fires async RevenueCat calls
jest.mock('../components/SubscriptionManager', () => ({
  SubscriptionProvider: ({ children }: any) => children,
  useSubscription: () => ({
    isPremium: false,
    trackCalmingSession: jest.fn(() => Promise.resolve(1)),
    checkPaywallTrigger: jest.fn(() => Promise.resolve(false)),
    refreshEntitlement: jest.fn(),
    isLoading: false,
  }),
}));

// Mock navigation for components that expect it via props
const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};

const wrap = (children: React.ReactNode) => (
  <SubscriptionProvider>
    {children}
  </SubscriptionProvider>
);

/** Helper: render Dashboard and wait for it to fully settle */
async function renderDashboard() {
  const utils = render(wrap(<DashboardScreen navigation={mockNavigation} />));
  await waitFor(() => {
      expect(utils.getByText(/ChillPup/i)).toBeTruthy();
  });
  return utils;
}

describe('Suite 06: Regression And MVP Compliance', () => {

  beforeEach(() => {
    jest.useRealTimers();
  });

  test('removed_001: Bark Analysis is not visible anywhere', async () => {
    const { queryByText } = await renderDashboard();
    expect(queryByText(/Bark Analysis/i)).toBeNull();
    expect(queryByText(/Bark Analyzer/i)).toBeNull();
  });

  test('removed_002: Schedule placeholder is not visible', async () => {
    const { queryByText } = await renderDashboard();
    expect(queryByText(/Schedule/i)).toBeNull();
    expect(queryByText(/Upcoming/i)).toBeNull();
  });

  test('removed_003: AR calming mode and calm spots are not visible', async () => {
    const { queryByText } = await renderDashboard();
    expect(queryByText(/AR Session/i)).toBeNull();
    expect(queryByText(/Calm Spot/i)).toBeNull();
  });

  const forbiddenTerms = [
    /anxiety detected/i,
    /AI detected/i,
    /diagnosed/i,
    /\bcure\b/i,
    /\btreatment\b/i,
    /guaranteed calm/i,
    /stop fear/i
  ];

  test('compliance_copy_001a: Dashboard avoids medical claims', async () => {
    const dashboard = render(wrap(<DashboardScreen navigation={mockNavigation} />));
    await dashboard.findByText(/ChillPup/i);
    forbiddenTerms.forEach(term => expect(dashboard.queryByText(term)).toBeNull());
  });

  test('compliance_copy_001b: Settings avoids medical claims', async () => {
    const settings = render(wrap(<SettingsScreen navigation={mockNavigation} />));
    await settings.findByText(/Settings|Account/i);
    forbiddenTerms.forEach(term => expect(settings.queryByText(term)).toBeNull());
  });

  test('compliance_copy_001c: Paywall avoids medical claims', async () => {
    const paywall = render(wrap(<PaywallScreen navigation={mockNavigation} route={{ params: {} }} />));
    await paywall.findByText(/Get Full Access/i);
    forbiddenTerms.forEach(term => expect(paywall.queryByText(term)).toBeNull());
  });

  test('storage_001: Old Bark Analysis local storage keys do not crash the app', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem('bark_analysis_history', JSON.stringify([{ id: 1 }]));

    const dashboard = render(wrap(<DashboardScreen navigation={mockNavigation} />));
    expect(await dashboard.findByText(/ChillPup/i)).toBeTruthy();
  });

  test('premium_copy_001: PremiumStatusScreen does not mention AR', async () => {
    const PremiumStatusScreen = require('../screens/PremiumStatusScreen').default;
    const mockRoute = { params: { source: 'settings' } };
    
    const utils = render(wrap(
      <PremiumStatusScreen navigation={mockNavigation} route={mockRoute} />
    ));
    await utils.findByText(/Premium Active|Your Subscription/i);

    expect(utils.queryByText(/AR guided/i)).toBeNull();
    expect(utils.queryByText(/Bark Analysis/i)).toBeNull();
    expect(utils.queryByText(/AI anxiety/i)).toBeNull();
  });

  test('progress_001: Recent Progress card renders on Dashboard', async () => {
    const utils = render(wrap(<DashboardScreen navigation={mockNavigation} />));
    expect(await utils.findByText(/No sessions yet|Recent Progress/i)).toBeTruthy();
  });
});
