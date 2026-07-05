process.env.EXPO_PUBLIC_RC_IOS_API_KEY = 'mock-key';
process.env.EXPO_PUBLIC_RC_ANDROID_API_KEY = 'mock-key';
process.env.EXPO_PUBLIC_RC_TEST_STORE_API_KEY = 'mock-key';

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SettingsScreen from '../screens/SettingsScreen';
import SessionService from '../services/sessionService';
import PetProfileRepository from '../services/petProfileRepository';
import { auth } from '../services/firebaseConfig';
import { NavigationContainer } from '@react-navigation/native';
import { SubscriptionProvider } from '../components/SubscriptionManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RevenueCatService from '../services/revenueCatService';


// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};

// No local mock for PetProfileRepository to allow testing integration logic

describe('Suite 04: Profile And Progress', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('local_session_history_saves_and_loads', async () => {
    const mockEntry = {
      id: 'test-session',
      petId: 'pet-1',
      sessionId: 'daily_calm_reset',
      completedAt: new Date().toISOString(),
      durationSeconds: 180,
      completed: true,
      stoppedEarly: false,
    };
    await SessionService.saveSessionHistory(mockEntry);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('session_history'), 
        expect.stringContaining('test-session')
    );
    
    const history = await SessionService.getLocalHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].id).toBe('test-session');
  });

  test('auth_guest_002: Guest profile shows guest actions and hides Log Out', async () => {
    // Mock PetProfileRepository.getAuthMode to return 'guest'
    jest.spyOn(PetProfileRepository, 'getAuthMode').mockResolvedValue('guest');
    
    const { findByText, queryByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <SettingsScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );
    
    expect(await findByText(/Create Account/i)).toBeTruthy();
    expect(await findByText(/Sign In/i)).toBeTruthy();
    expect(await findByText(/Clear Guest Data/i)).toBeTruthy();
    
    // Guest must not show Log Out
    expect(queryByText(/Log Out/i)).toBeNull();
    expect(queryByText(/Sign Out/i)).toBeNull();
  });

  test('authenticated_profile_shows_log_out', async () => {
    jest.spyOn(PetProfileRepository, 'getAuthMode').mockResolvedValue('authenticated');
    
    const { findByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <SettingsScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );
    
    expect(await findByText(/Log Out|Sign Out/i)).toBeTruthy();
  });

  test('profile_001: Guest pet profile is saved locally', async () => {
    const ActualRepository = jest.requireActual('../services/petProfileRepository').default;
    jest.spyOn(ActualRepository, 'getAuthMode').mockResolvedValue('guest');
    
    const mockProfile = {
      petName: 'Buddy',
      hasPhoto: false,
      breed: 'Beagle',
      size: 'medium',
      notes: 'Friendly',
      anxietyScore: 5
    };
    
    await ActualRepository.savePetProfile(mockProfile);
    
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining('guest.petProfile'),
      expect.stringContaining('Buddy')
    );
    
    const Firestore = require('@react-native-firebase/firestore');
    expect(Firestore().collection).not.toHaveBeenCalled();
  });

  test('restore_purchases_from_settings_success', async () => {
    jest.spyOn(PetProfileRepository, 'getAuthMode').mockResolvedValue('guest');

    const RCService = require('../services/revenueCatService').default || require('../services/revenueCatService');
    const mockRestore = jest.spyOn(RCService, 'restorePurchases').mockResolvedValue({
      entitlements: {
        active: {
          'ar-pet-coach-premium': { isActive: true }
        }
      }
    } as any);

    const mockGetCustomerInfo = jest.spyOn(RCService, 'getCustomerInfo').mockResolvedValue({
      entitlements: {
        active: {}
      }
    } as any);

    const { findByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <SettingsScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    // Wait for async auth mode update to finish and UI to stabilize
    expect(await findByText('Guest User')).toBeTruthy();

    const restoreButton = await findByText('Restore Purchases');
    expect(restoreButton).toBeTruthy();

    fireEvent.press(restoreButton);

    await waitFor(() => {
      expect(mockRestore).toHaveBeenCalled();
      expect(mockNavigation.navigate).toHaveBeenCalledWith('PremiumStatus');
    });

    mockRestore.mockRestore();
    mockGetCustomerInfo.mockRestore();
  });

  test('restore_purchases_from_settings_no_active_subscription', async () => {
    jest.spyOn(PetProfileRepository, 'getAuthMode').mockResolvedValue('guest');

    const RCService = require('../services/revenueCatService').default || require('../services/revenueCatService');
    const mockRestore = jest.spyOn(RCService, 'restorePurchases').mockResolvedValue({
      entitlements: {
        active: {}
      }
    } as any);

    const mockGetCustomerInfo = jest.spyOn(RCService, 'getCustomerInfo').mockResolvedValue({
      entitlements: {
        active: {}
      }
    } as any);

    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { findByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <SettingsScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    // Wait for async auth mode update to finish and UI to stabilize
    expect(await findByText('Guest User')).toBeTruthy();

    const restoreButton = await findByText('Restore Purchases');
    fireEvent.press(restoreButton);

    await waitFor(() => {
      expect(mockRestore).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith("Info", "No active subscriptions found.");
    });

    mockRestore.mockRestore();
    mockGetCustomerInfo.mockRestore();

    alertSpy.mockRestore();
  });
});
