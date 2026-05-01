import React from 'react';
import { render } from '@testing-library/react-native';
import DashboardScreen from '../screens/DashboardScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SessionPreviewScreen from '../screens/SessionPreviewScreen';
import PaywallScreen from '../screens/PaywallScreen';
import { NavigationContainer } from '@react-navigation/native';
import { SubscriptionProvider } from '../components/SubscriptionManager';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};

describe('Suite 06: Regression And MVP Compliance', () => {

  const wrap = (children: React.ReactNode) => (
    <SubscriptionProvider>
      <NavigationContainer>
        {children}
      </NavigationContainer>
    </SubscriptionProvider>
  );

  test('removed_001: Bark Analysis is not visible anywhere', () => {
    const { queryByText } = render(wrap(<DashboardScreen navigation={mockNavigation} />));
    expect(queryByText(/Bark Analysis/i)).toBeNull();
    expect(queryByText(/Bark Analyzer/i)).toBeNull();
  });

  test('removed_002: Schedule placeholder is not visible', () => {
    const { queryByText } = render(wrap(<DashboardScreen navigation={mockNavigation} />));
    expect(queryByText(/Schedule/i)).toBeNull();
    expect(queryByText(/Upcoming/i)).toBeNull();
  });

  test('removed_003: AR calming mode and calm spots are not visible', () => {
    const { queryByText } = render(wrap(<DashboardScreen navigation={mockNavigation} />));
    expect(queryByText(/AR Session/i)).toBeNull();
    expect(queryByText(/Calm Spot/i)).toBeNull();
    expect(queryByText(/Camera/i)).toBeNull();
  });

  test('compliance_copy_001: MVP screens avoid medical and unsupported AI claims', () => {
    const forbiddenTerms = [
      /anxiety detected/i,
      /AI detected/i,
      /diagnosed/i,
      /cure/i,
      /treatment/i,
      /guaranteed calm/i,
      /stop fear/i
    ];

    // Check Dashboard
    const dashboard = render(wrap(<DashboardScreen navigation={mockNavigation} />));
    forbiddenTerms.forEach(term => expect(dashboard.queryByText(term)).toBeNull());

    // Check Settings
    const settings = render(wrap(<SettingsScreen navigation={mockNavigation} />));
    forbiddenTerms.forEach(term => expect(settings.queryByText(term)).toBeNull());

    // Check Paywall
    const paywall = render(wrap(<PaywallScreen navigation={mockNavigation} />));
    forbiddenTerms.forEach(term => expect(paywall.queryByText(term)).toBeNull());
  });

  test('storage_001: Old Bark Analysis local storage keys do not crash the app', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem('bark_analysis_history', JSON.stringify([{ id: 1 }]));
    
    // Render Dashboard - should not crash
    const { findByText } = render(wrap(<DashboardScreen navigation={mockNavigation} />));
    expect(await findByText(/ChillPup/)).toBeTruthy();
  });

  test('premium_copy_001: PremiumStatusScreen does not mention AR', async () => {
    const PremiumStatusScreen = require('../screens/PremiumStatusScreen').default;
    const mockRoute = { params: { source: 'settings' } };
    const { queryByText } = render(wrap(
      <PremiumStatusScreen navigation={mockNavigation} route={mockRoute} />
    ));
    
    expect(queryByText(/AR guided/i)).toBeNull();
    expect(queryByText(/Bark Analysis/i)).toBeNull();
    expect(queryByText(/AI anxiety/i)).toBeNull();
  });

  test('progress_001: Recent Progress card renders on Dashboard', async () => {
    const { findByText } = render(wrap(<DashboardScreen navigation={mockNavigation} />));
    // The progress card should always render (with empty state or data)
    const progressTitle = await findByText(/No sessions yet|Recent Progress/i);
    expect(progressTitle).toBeTruthy();
  });
});
