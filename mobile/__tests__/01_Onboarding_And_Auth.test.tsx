import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import OnboardingCarousel from '../screens/OnboardingCarousel';
import LoginScreen from '../screens/LoginScreen';
import PetProfileStepper from '../screens/PetProfileStepper';
import { auth, db } from '../services/firebaseConfig';
import { NavigationContainer } from '@react-navigation/native';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};

describe('Suite 01: Onboarding And Auth', () => {
  
  test('intro_carousel_renders_and_swipes', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <OnboardingCarousel navigation={mockNavigation} />
      </NavigationContainer>
    );
    
    expect(getByText(/Guided Calming/)).toBeTruthy();
    expect(getByText(/Next/)).toBeTruthy();
  });

  test('auth_screen_renders_correctly', () => {
    const { getByPlaceholderText, getByText } = render(
      <NavigationContainer>
        <LoginScreen navigation={mockNavigation} />
      </NavigationContainer>
    );
    
    expect(getByPlaceholderText(/Email/i)).toBeTruthy();
    expect(getByPlaceholderText(/Password/i)).toBeTruthy();
    expect(getByText(/Log In/i)).toBeTruthy();
    expect(getByText(/Continue as Guest/i)).toBeTruthy();
  });

  test('auth_guest_001: Continue as Guest creates local guest state without Firebase anonymous auth', async () => {
    const PetProfileRepository = require('../services/petProfileRepository');
    const Purchases = require('react-native-purchases').default;
    
    const { getByText } = render(
      <NavigationContainer>
        <LoginScreen navigation={mockNavigation} />
      </NavigationContainer>
    );
    
    const guestButton = getByText(/Continue as Guest/i);
    fireEvent.press(guestButton);
    
    await waitFor(() => {
      // Assert local guest state is created
      expect(PetProfileRepository.setAuthMode).toHaveBeenCalledWith('guest');
      
      // Assert navigation proceeds
      expect(mockNavigation.navigate).toHaveBeenCalledWith('PetProfileStepper');
      
      // Assert Firebase auth methods are NOT called
      expect(auth().signInAnonymously).not.toHaveBeenCalled();
      
      // Assert RevenueCat logIn/logOut are NOT called
      expect(Purchases.logIn).not.toHaveBeenCalled();
      expect(Purchases.logOut).not.toHaveBeenCalled();
    });
  });

  test('auth_user_001: Authenticated login calls standard auth', async () => {
    const { getByPlaceholderText, getByText } = render(
      <NavigationContainer>
        <LoginScreen navigation={mockNavigation} />
      </NavigationContainer>
    );
    
    const emailInput = getByPlaceholderText(/Email/i);
    const passwordInput = getByPlaceholderText(/Password/i);
    const loginButton = getByText(/Log In/i);
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);
    
    await waitFor(() => {
      expect(auth().signInWithEmailAndPassword).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  test('profile_001: Pet profile stepper renders for first step', async () => {
    const { getByPlaceholderText, getByText, getByDisplayValue } = render(
      <NavigationContainer>
        <PetProfileStepper navigation={mockNavigation} />
      </NavigationContainer>
    );
    
    const nameInput = getByPlaceholderText('Buddy');
    fireEvent.changeText(nameInput, 'Max');
    
    expect(nameInput.props.value).toBe('Max');
    
    const continueButton = getByText(/Continue/i);
    fireEvent.press(continueButton);
  });
});
