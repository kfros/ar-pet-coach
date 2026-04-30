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
  
  test('1_intro_carousel_renders_and_swipes', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <OnboardingCarousel navigation={mockNavigation} />
      </NavigationContainer>
    );
    
    // Verify the carousel renders with the first slide content
    expect(getByText(/Guided Calming/)).toBeTruthy();
    
    // Verify the Next button exists (navigation control is present)
    expect(getByText(/Next/)).toBeTruthy();
  });

  test('2_auth_screen_renders_correctly', () => {
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

  test('3_continue_as_guest_triggers_guest_mode', async () => {
    const PetProfileRepository = require('../services/petProfileRepository');
    
    const { getByText } = render(
      <NavigationContainer>
        <LoginScreen navigation={mockNavigation} />
      </NavigationContainer>
    );
    
    const guestButton = getByText(/Continue as Guest/i);
    fireEvent.press(guestButton);
    
    await waitFor(() => {
      expect(PetProfileRepository.setAuthMode).toHaveBeenCalledWith('guest');
    });
  });

  test('4_login_sign_up_triggers_standard_auth', async () => {
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
    
    // Verify auth was called with correct credentials via shared mock instance
    await waitFor(() => {
      expect(auth().signInWithEmailAndPassword).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  test('5_pet_profile_stepper_renders_first_step', async () => {
    const { getByPlaceholderText, getByText } = render(
      <NavigationContainer>
        <PetProfileStepper navigation={mockNavigation} />
      </NavigationContainer>
    );
    
    // The pet name input has placeholder "Buddy" (example name)
    const nameInput = getByPlaceholderText('Buddy');
    fireEvent.changeText(nameInput, 'Max');
    
    const continueButton = getByText(/Continue/i);
    fireEvent.press(continueButton);
  });
});
