import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DashboardScreen from '../screens/DashboardScreen';
import SessionPreviewScreen from '../screens/SessionPreviewScreen';
import PetProfileRepository from '../services/petProfileRepository';
import { NavigationContainer } from '@react-navigation/native';
import { SubscriptionProvider } from '../components/SubscriptionManager';

// Mock PetProfileRepository locally to be sure
jest.mock('../services/petProfileRepository', () => ({
  getAuthMode: jest.fn(() => Promise.resolve('authenticated')),
  getPetProfile: jest.fn(() => Promise.resolve({
    id: 'test-pet-id',
    petName: 'Buddy',
    anxietyScore: 5,
    anxietyTriggers: ['loud_noises']
  })),
  setAuthMode: jest.fn(() => Promise.resolve()),
  clearGuestData: jest.fn(() => Promise.resolve()),
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};


describe('Suite 02: Main Navigation And Content', () => {
  
  test('6_home_screen_renders_user_and_pet_data', async () => {
    const { findByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );
    
    expect(await findByText(/Buddy/)).toBeTruthy();
    expect(await findByText(/ChillPup/)).toBeTruthy();
  });

  test('7_recommended_calming_session_card_is_visible', async () => {
    const { findByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <DashboardScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );
    
    expect(await findByText(/Recommended/)).toBeTruthy();
    expect(await findByText(/Fireworks/i)).toBeTruthy();
  });

  test('8_premium_session_triggers_paywall_if_not_premium', async () => {
    // We'll test SessionPreviewScreen directly since that's where the logic is
    const { getByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <SessionPreviewScreen 
            navigation={mockNavigation} 
            route={{ params: { sessionId: 'fireworks_prep_extended', petId: 'test-pet' } }} 
          />
        </NavigationContainer>
      </SubscriptionProvider>
    );
    
    const unlockButton = getByText(/Unlock with Premium/i);
    fireEvent.press(unlockButton);
    
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Paywall', expect.anything());
  });

  test('9_fireworks_loud_noises_allows_free_access', async () => {
    const { getByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <SessionPreviewScreen 
            navigation={mockNavigation} 
            route={{ params: { sessionId: 'fireworks_loud_noises_basic', petId: 'test-pet' } }} 
          />
        </NavigationContainer>
      </SubscriptionProvider>
    );
    
    const startButton = getByText(/Start Session/i);
    fireEvent.press(startButton);
    
    expect(mockNavigation.navigate).toHaveBeenCalledWith('GuidedSession', expect.anything());
  });
});

// Note: I added a simple mock for SubscriptionProvider in SubscriptionManager.tsx or I'll need to mock the hook.
// Since I can't easily modify SubscriptionManager.tsx right now, I'll mock useSubscription instead.
jest.mock('../components/SubscriptionManager', () => {
    const actual = jest.requireActual('../components/SubscriptionManager');
    return {
        ...actual,
        useSubscription: jest.fn(() => ({
            isPremium: false,
            checkPaywallTrigger: jest.fn(),
            trackCalmingSession: jest.fn(),
        })),
        SubscriptionProvider: ({ children }: any) => children,
    };
});
