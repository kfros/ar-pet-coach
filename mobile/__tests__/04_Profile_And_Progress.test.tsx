import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SettingsScreen from '../screens/SettingsScreen';
import SessionService from '../services/sessionService';
import PetProfileRepository from '../services/petProfileRepository';
import { auth } from '../services/firebaseConfig';
import { NavigationContainer } from '@react-navigation/native';
import { SubscriptionProvider } from '../components/SubscriptionManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};

describe('Suite 04: Profile And Progress', () => {
  
  test('16_local_session_history_saves_and_loads', async () => {
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

  test('21_settings_profile_screen_renders_options', async () => {
    const { findByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <SettingsScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );
    
    expect(await findByText(/Account/i)).toBeTruthy();
    expect(await findByText(/Restore Purchases/i)).toBeTruthy();
    expect(await findByText(/Log Out|Sign Out/i)).toBeTruthy();
  });

  test('22_guest_profile_state_shows_signup_prompt', async () => {
    // Mock PetProfileRepository.getAuthMode to return 'guest'
    jest.spyOn(PetProfileRepository, 'getAuthMode').mockResolvedValue('guest');
    
    const { findByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <SettingsScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );
    
    expect(await findByText(/Create Account/i)).toBeTruthy();
  });

  test('23_authenticated_profile_state_shows_account_details', async () => {
    jest.spyOn(PetProfileRepository, 'getAuthMode').mockResolvedValue('authenticated');
    
    const { findByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <SettingsScreen navigation={mockNavigation} />
        </NavigationContainer>
      </SubscriptionProvider>
    );
    
    expect(await findByText('test@example.com')).toBeTruthy();
  });
});
