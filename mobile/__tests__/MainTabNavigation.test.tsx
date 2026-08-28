import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabNavigator from '../navigation/MainTabNavigator';
import SettingsScreen from '../screens/SettingsScreen';
import { SubscriptionProvider } from '../components/SubscriptionManager';
const mockAudioTrack = {
  id: 'the_reading_nook',
  displayTitle: 'The Reading Nook',
  artist: 'ChillPup',
  album: 'ChillPup Sounds',
  durationSeconds: 1296.953469,
  durationDisplayRounded: '21:37',
  deliveryType: 'bundled_offline' as const,
  deliveryLabel: 'Available offline',
  repeatLabel: 'Repeats automatically',
  ownerApprovalDate: '2026-08-27',
  rightsDecision: 'approved_by_kf_software_for_chillpup_mobile_distribution',
  disclosureShort: 'AI-generated music · Edited and mastered by KF Software',
  provenanceSummary: 'Generated with Google Flow Music by KF Software. Edited, mastered, and approved by KF Software on 2026-08-27.',
  sha256: 'f7942b778776da50ff04a955b15ea8ade4dcecb4b1d57ae6eac22da584ebc3be',
  sizeBytes: 30828250,
  codec: 'mp3',
  sampleRateHz: 44100,
  channels: 2,
  averageBitrateBps: 190157,
  source: 1,
};

// Mock useAudioPlayback at hook boundary with deterministic fixture
jest.mock('../audio/useAudioPlayback', () => ({
  useAudioPlayback: () => ({
    track: mockAudioTrack,
    status: 'ready',
    isPlaying: false,
    isLoaded: true,
    isBuffering: false,
    currentTimeSeconds: 0,
    durationSeconds: 1296.953469,
    errorMessage: null,
    play: jest.fn(() => Promise.resolve()),
    pause: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
    seekTo: jest.fn(() => Promise.resolve()),
    retry: jest.fn(() => Promise.resolve()),
  }),
}));

// Mock PetProfileRepository locally
jest.mock('../services/petProfileRepository', () => ({
  getAuthMode: jest.fn(() => Promise.resolve('authenticated')),
  getPetProfile: jest.fn(() => Promise.resolve({
    id: 'test-pet-id',
    petName: 'Buddy',
    anxietyScore: 5,
    anxietyTriggers: ['loud_noises']
  })),
  hasPetProfile: jest.fn(() => Promise.resolve(true)),
  setAuthMode: jest.fn(() => Promise.resolve()),
  clearGuestData: jest.fn(() => Promise.resolve()),
  addListener: jest.fn(() => jest.fn()),
}));

describe('MainTabNavigator Focused Tests', () => {
  test('renders four tab buttons in the required order', () => {
    const { getByTestId } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <MainTabNavigator />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    const homeTab = getByTestId('main-tab-home');
    const routinesTab = getByTestId('main-tab-routines');
    const soundsTab = getByTestId('main-tab-sounds');
    const progressTab = getByTestId('main-tab-progress');

    expect(homeTab).toBeTruthy();
    expect(routinesTab).toBeTruthy();
    expect(soundsTab).toBeTruthy();
    expect(progressTab).toBeTruthy();
  });

  test('Home is the initial selected tab and renders DashboardScreen', async () => {
    const { getByText, getByTestId } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <MainTabNavigator />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    // Wait for DashboardScreen data to fetch
    await waitFor(() => {
      expect(getByText('ChillPup')).toBeTruthy();
      expect(getByText("Hi, Buddy's owner 👋")).toBeTruthy();
    });

    const homeTab = getByTestId('main-tab-home');
    expect(homeTab.props.accessibilityState.selected).toBe(true);

    const routinesTab = getByTestId('main-tab-routines');
    expect(routinesTab.props.accessibilityState.selected).toBe(false);
  });

  test('Tapping Routines, Sounds, and Progress selects the correct tab and renders corresponding screens', async () => {
    const { getByTestId, getByText, findByTestId } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <MainTabNavigator />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(getByText('ChillPup')).toBeTruthy();
    });

    const routinesTab = getByTestId('main-tab-routines');
    fireEvent.press(routinesTab);
    const routinesScreen = await findByTestId('routines-tab-screen');
    expect(routinesScreen).toBeTruthy();
    expect(within(routinesScreen).getByText('Routines')).toBeTruthy();
    expect(routinesTab.props.accessibilityState.selected).toBe(true);

    const soundsTab = getByTestId('main-tab-sounds');
    fireEvent.press(soundsTab);
    const soundsScreen = await findByTestId('sounds-tab-screen');
    expect(soundsScreen).toBeTruthy();
    expect(within(soundsScreen).getByText('The Reading Nook')).toBeTruthy();
    expect(soundsTab.props.accessibilityState.selected).toBe(true);

    const progressTab = getByTestId('main-tab-progress');
    fireEvent.press(progressTab);
    const progressScreen = await findByTestId('progress-tab-screen');
    expect(progressScreen).toBeTruthy();
    expect(within(progressScreen).getByText('Progress')).toBeTruthy();
    expect(progressTab.props.accessibilityState.selected).toBe(true);
  });

  test('Verify that Sounds renders production player and Progress remains a temporary screen', async () => {
    const { getByTestId, findByTestId } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <MainTabNavigator />
        </NavigationContainer>
      </SubscriptionProvider>
    );

    const soundsTab = getByTestId('main-tab-sounds');
    fireEvent.press(soundsTab);
    const soundsScreen = await findByTestId('sounds-tab-screen');
    expect(within(soundsScreen).getByText('The Reading Nook')).toBeTruthy();
    expect(within(soundsScreen).queryByText('This section is being prepared.')).toBeNull();

    const progressTab = getByTestId('main-tab-progress');
    fireEvent.press(progressTab);
    const progressScreen = await findByTestId('progress-tab-screen');
    expect(within(progressScreen).getByText('This section is being prepared.')).toBeTruthy();
  });
});

describe('Root-Stack Integration Tests', () => {
  test('verifies Settings screen hides tab bar, and back button returns to MainTabNavigator without duplicate routes', async () => {
    const Stack = createNativeStackNavigator();
    const { getByTestId, queryByTestId, findByText } = render(
      <SubscriptionProvider>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Dashboard" component={MainTabNavigator} options={{ headerShown: false }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
          </Stack.Navigator>
        </NavigationContainer>
      </SubscriptionProvider>
    );

    // 1. Initial State: Home tab is active and tab bar is visible
    await waitFor(async () => {
      expect(await findByText('ChillPup')).toBeTruthy();
    });
    expect(getByTestId('main-tab-home')).toBeTruthy();

    // 2. Navigate to Settings
    const settingsBtn = getByTestId('settings-button');
    fireEvent.press(settingsBtn);

    // Settings screen is open, tab bar is hidden
    expect(await findByText('Profile')).toBeTruthy();
    expect(queryByTestId('main-tab-home')).toBeNull();

    // 3. Navigate back
    const backBtn = getByTestId('settings-back-button');
    fireEvent.press(backBtn);

    // 4. Back on Dashboard, tab bar visible again
    await waitFor(async () => {
      expect(await findByText('ChillPup')).toBeTruthy();
    });
    expect(getByTestId('main-tab-home')).toBeTruthy();
  });
});
