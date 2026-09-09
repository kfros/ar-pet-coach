<p align="center">
  <img src="mobile/assets/icon.png" width="120" alt="ChillPup app icon">
</p>

<h1 align="center">ChillPup</h1>

<p align="center">
  Gentle, owner-guided routines and calming audio for dogs experiencing everyday stress.
</p>

> [!IMPORTANT]
> ChillPup is an educational support tool, not a medical device and not a substitute for veterinary care or qualified behavioral advice. Stop a routine if distress increases. Contact a veterinarian or veterinary behaviorist for severe fear, aggression, self-injury, escape attempts, breathing trouble, collapse, seizures, or other urgent symptoms.

## About

ChillPup is a cross-platform mobile app that helps dog owners create small, repeatable calming practices. It combines structured routines, owner-reported check-ins, safety boundaries, and optional background audio. Application originally developed under the working name AR Pet Coach.

The app is designed around a simple principle: observe the dog, keep the difficulty low, and never force participation.

## Current features

- Dog profile and trigger-based routine suggestions
- Guest mode plus Google and Apple authentication
- Guided, timed routines with pause and resume
- Before-and-after check-ins based on observable signs
- Safety guidance and escalation boundaries for severe distress
- Free and Premium routine access
- Offline calming music with play, pause, stop, seek, automatic repeat, background playback, and lock-screen controls
- Local guest data with authenticated Firebase persistence
- RevenueCat subscription and entitlement integration
- Accessibility labels and scalable mobile layouts

The first approved audio track, **The Reading Nook**, is bundled for offline use. It is AI-generated music, edited and mastered by Kyryl Frosyniak under KF Software brand.

## Project status

ChillPup is under active development.

The production mobile client currently includes the Home, Routines, and Sounds experiences. The Progress tab is still being prepared. Device-level validation of audio interruptions, route changes, lock-screen behavior, and loop boundaries remains part of the release process.

## Technology

- React Native 0.81
- Expo SDK 54
- TypeScript
- React Navigation
- Firebase Authentication and Firestore
- RevenueCat
- `expo-audio`
- Jest and React Native Testing Library
- Firebase Cloud Functions

## Repository structure

| Path | Purpose |
| --- | --- |
| `mobile/` | Primary iOS and Android application |
| `mobile/screens/` | User-facing screens |
| `mobile/navigation/` | Root stack and bottom-tab navigation |
| `mobile/appContent/` | Routines, check-in profiles, safety copy, and audio manifest |
| `mobile/audio/` | Application-level audio playback provider and utilities |
| `mobile/services/` | Authentication, persistence, sessions, recommendations, and purchases |
| `mobile/__tests__/` | Unit, component, navigation, and regression tests |
| `functions/` | Firebase Cloud Functions, including RevenueCat webhook handling |
| `firestore.rules` | Firestore security rules |
| `storage.rules` | Firebase Storage security rules |

The repository also contains root-level tooling from the earlier web/AR prototype. Current product development is centered on `mobile/`.

## Getting started

### Prerequisites

- Node.js 20 LTS
- npm
- Android Studio for Android development
- macOS and Xcode for iOS development
- A configured native Firebase project
- An Expo development build for native integrations

Expo Go is not sufficient for the full application because ChillPup uses native Firebase, authentication, purchases, and background-audio capabilities.

### Install

```bash
git clone https://github.com/kfros/ar-pet-coach.git
cd ar-pet-coach/mobile
npm install
```

### Optional RevenueCat configuration

Create `mobile/.env` when subscription testing is required:

```dotenv
EXPO_PUBLIC_RC_IOS_API_KEY=
EXPO_PUBLIC_RC_ANDROID_API_KEY=
EXPO_PUBLIC_RC_TEST_STORE_API_KEY=
```

Do not commit private credentials or service-account files. Public SDK keys should still be managed through the intended build environment rather than copied into documentation.

### Run the mobile app

Start Metro for an existing development build:

```bash
npm start
```

Build and run locally:

```bash
npm run android
npm run ios
```

The iOS command requires macOS and Xcode.

## Validation

Run the test suite:

```bash
npm test -- --runInBand
```

Run TypeScript and Expo configuration checks:

```bash
npx tsc --noEmit
npx expo config --type public
```

Audio changes must also be verified on physical Android and iOS devices. Emulator playback alone is not sufficient for release acceptance.

## Product boundaries

ChillPup does not diagnose anxiety, prescribe medication, replace professional treatment, or encourage forced exposure. Recommendations are based on saved profile information and owner-reported observations, not a live clinical assessment.

## Audio provenance

The bundled track **The Reading Nook** was generated using Google Flow Music, then selected, arranged, crossfaded, edited, and mastered by KF Software. Its approved metadata and integrity information are maintained in `mobile/appContent/audioAssets.ts`.
