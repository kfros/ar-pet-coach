import 'react-native-gesture-handler/jestSetup';
import React from 'react';

// Mock Safe Area Context (Using built-in mock if available)
jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock').default;
  return {
    ...mock,
    SafeAreaProvider: ({ children }) => children,
  };
});

// Set dummy API keys for tests if not present (MUST BE AT TOP)
process.env.EXPO_PUBLIC_RC_IOS_API_KEY = 'test_ios_key';
process.env.EXPO_PUBLIC_RC_ANDROID_API_KEY = 'test_android_key';
process.env.EXPO_PUBLIC_RC_TEST_STORE_API_KEY = 'test_store_key';

// Mock Google Sign-In (native TurboModule)
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({ idToken: 'mock-token' })),
    signOut: jest.fn(() => Promise.resolve()),
    isSignedIn: jest.fn(() => Promise.resolve(false)),
    getCurrentUser: jest.fn(() => Promise.resolve(null)),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

// Mock Lottie
jest.mock('lottie-react-native', () => 'LottieView');

// Mock Expo Apple Authentication
jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

// Mock Expo Crypto
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(() => Promise.resolve('mock-hash')),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

// Mock useCalmAudio hook
jest.mock('./hooks/useCalmAudio', () => ({
  useCalmAudio: jest.fn(() => ({
    isPlaying: false,
    stopAudio: jest.fn(),
  })),
}));

// Mock AnimatedPawIcon (uses Reanimated internals that don't resolve in test env)
jest.mock('./components/AnimatedPawIcon', () => 'AnimatedPawIcon');


// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  Reanimated.useReducedMotion = jest.fn(() => false);
  return Reanimated;
});

// Mock Async Storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Firebase
jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: {
    initializeApp: jest.fn(),
  },
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  })),
}));

jest.mock('@react-native-firebase/auth', () => {
  const authInstance = {
    signInAnonymously: jest.fn(() => Promise.resolve({ user: { uid: 'test-uid' } })),
    createUserWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: 'test-uid' } })),
    signInWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: 'test-uid' } })),
    signInWithCredential: jest.fn(() => Promise.resolve({ user: { uid: 'test-uid' } })),
    signOut: jest.fn(() => Promise.resolve()),
    onAuthStateChanged: jest.fn((cb) => {
      cb({ uid: 'test-uid', email: 'test@example.com' });
      return jest.fn();
    }),
    currentUser: { uid: 'test-uid', email: 'test@example.com' },
  };
  const authFactory = jest.fn(() => authInstance);
  authFactory.GoogleAuthProvider = { credential: jest.fn() };
  authFactory.AppleAuthProvider = { credential: jest.fn() };
  return authFactory;
});

jest.mock('@react-native-firebase/firestore', () => {
  const mockFirestore = {
    collection: jest.fn(() => mockFirestore),
    doc: jest.fn(() => mockFirestore),
    set: jest.fn(() => Promise.resolve()),
    get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({}) })),
    add: jest.fn(() => Promise.resolve({ id: 'mock-id' })),
    update: jest.fn(() => Promise.resolve()),
    onSnapshot: jest.fn((cb) => {
      cb({ docs: [] });
      return jest.fn();
    }),
    query: jest.fn(() => mockFirestore),
    where: jest.fn(() => mockFirestore),
    orderBy: jest.fn(() => mockFirestore),
    limit: jest.fn(() => mockFirestore),
  };
  const firestoreMock = jest.fn(() => mockFirestore);
  firestoreMock.FieldValue = {
    serverTimestamp: jest.fn(),
  };
  return firestoreMock;
});

jest.mock('@react-native-firebase/storage', () => {
  return () => ({
    ref: jest.fn(() => ({
      putFile: jest.fn(() => Promise.resolve()),
      getDownloadURL: jest.fn(() => Promise.resolve('mock-url')),
    })),
  });
});

// Mock RevenueCat
const mockPurchases = {
  configure: jest.fn(),
  getOfferings: jest.fn(() => Promise.resolve({ current: { availablePackages: [] } })),
  purchasePackage: jest.fn(() => Promise.resolve({ customerInfo: { entitlements: { active: {} } } })),
  restorePurchases: jest.fn(() => Promise.resolve({ customerInfo: { entitlements: { active: {} } } })),
  getCustomerInfo: jest.fn(() => Promise.resolve({ entitlements: { active: {} } })),
  logIn: jest.fn(() => Promise.resolve({ customerInfo: {}, created: true })),
  logOut: jest.fn(() => Promise.resolve()),
  addCustomerInfoUpdateListener: jest.fn(),
  removeCustomerInfoUpdateListener: jest.fn(),
  setLogLevel: jest.fn(),
  syncPurchases: jest.fn(),
};

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: mockPurchases,
  ...mockPurchases,
  LOG_LEVEL: { DEBUG: 0 },
  PACKAGE_TYPE: { MONTHLY: 'MONTHLY' },
}));

// Mock Expo AV
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(() => Promise.resolve({ sound: { playAsync: jest.fn(), pauseAsync: jest.fn(), stopAsync: jest.fn(), setVolumeAsync: jest.fn(), unloadAsync: jest.fn() }, status: {} })),
    },
    setIsEnabledAsync: jest.fn(),
    setAudioModeAsync: jest.fn(),
  },
}));

// Mock Ionicons (to avoid render errors)
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      replace: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: (cb) => {
      const React = require('react');
      React.useEffect(() => {
        const cleanup = cb();
        return () => {
          if (typeof cleanup === 'function') cleanup();
        };
      }, [cb]);
    },
  };
});

// Mock Expo Constants
jest.mock('expo-constants', () => {
  return {
    __esModule: true,
    default: {
      executionEnvironment: 'storeClient',
      expoConfig: {
        extra: {
          revenueCatApiKeyIos: 'test_ios_key',
          revenueCatApiKeyAndroid: 'test_android_key',
        },
      },
    },
    ExecutionEnvironment: {
      StoreClient: 'storeClient',
      Standalone: 'standalone',
      Bare: 'bare',
    },
  };
});


// Mock PetProfileRepository
jest.mock('./services/petProfileRepository', () => ({
  getAuthMode: jest.fn(() => Promise.resolve('authenticated')),
  getPetProfile: jest.fn(() => Promise.resolve({
    id: 'test-pet-id',
    petName: 'Buddy',
    anxietyScore: 5,
    anxietyTriggers: ['loud_noises']
  })),
  hasPetProfile: jest.fn(() => Promise.resolve(false)),
  setAuthMode: jest.fn(() => Promise.resolve()),
  clearGuestData: jest.fn(() => Promise.resolve()),
  savePetProfile: jest.fn(() => Promise.resolve()),
}));

