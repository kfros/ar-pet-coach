import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PaywallScreen from '../screens/PaywallScreen';
import PremiumStatusScreen from '../screens/PremiumStatusScreen';
import RevenueCatService from '../services/revenueCatService';
import Purchases from 'react-native-purchases';
import { NavigationContainer } from '@react-navigation/native';
import { SubscriptionProvider } from '../components/SubscriptionManager';
import { Linking } from 'react-native';

// Mock RevenueCatService to bypass internal configuration logic
jest.mock('../services/revenueCatService', () => ({
  configure: jest.fn(),
  getOfferings: jest.fn(() => Promise.resolve({ current: { availablePackages: [] } })),
  restorePurchases: jest.fn(() => Promise.resolve({ entitlements: { active: {} } })),
  isEntitlementActive: jest.fn(() => Promise.resolve(false)),
  getSubscriptionStatus: jest.fn(() => Promise.resolve({ isPremium: false, isTrial: false, expirationDate: null })),
  getCustomerInfo: jest.fn(() => Promise.resolve({ entitlements: { active: {} } })),
  isReady: jest.fn(() => true),
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};

describe('Suite 05: Monetization And Compliance', () => {
  
  test('paywall_renders_for_non_premium_users', async () => {
    const { findByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <PaywallScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );
    
    expect(await findByText(/Get Full Access/i)).toBeTruthy();
    expect(await findByText(/Restore Purchases/i)).toBeTruthy();
  });

  test('premium_status_screen_for_subscribed_users', async () => {
    const mockRoute = { params: { source: 'settings' } };
    const { findByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <PremiumStatusScreen navigation={mockNavigation} route={mockRoute} />
        </NavigationContainer>
      </SubscriptionProvider>
    );
    
    expect(await findByText(/Premium Active/i)).toBeTruthy();
  });

  test('restore_purchases_calls_revenuecat', async () => {
    const { findByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <PaywallScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );
    
    const restoreButton = await findByText(/Restore Purchases/i);
    fireEvent.press(restoreButton);
    
    await waitFor(() => {
      expect(RevenueCatService.restorePurchases).toHaveBeenCalled();
    });
  });

  test('privacy_policy_and_terms_links_exist', async () => {
    const { findByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <PaywallScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );
    
    const privacyLink = await findByText(/Privacy Policy/i);
    const termsLink = await findByText(/Terms of Use/i);
    
    expect(privacyLink).toBeTruthy();
    expect(termsLink).toBeTruthy();
    
    fireEvent.press(privacyLink);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('privacy-policy'));
    
    fireEvent.press(termsLink);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('terms-of-use'));
  });
});
