# System Context & Project Overview

**Date:** 2026-02-17
**Project:** AR Pet Anxiety Coach (Mobile)
**Framework:** React Native (Expo Managed Workflow)

## 1. Project Goal
Develop a mobile application for pet anxiety relief using AR visualization (safe zones) and analysis (audio/video). The current phase focuses on **Monetization and Authentication**.

## 2. Current Status
- **Authentication:**
    - **Apple Sign In:** Implemented using `expo-apple-authentication` (Native flow). working and linked to Firebase Auth.
    - **Google Sign In:** Implemented via `@react-native-google-signin/google-signin`.
- **Payments:**
    - **RevenueCat:** Integrated for Subscription management (Entitlement: `pro_access`).
    - **Stripe:** Configured for payment processing (Live mode keys active).
    - **Paywall:** Custom [PaywallScreen.tsx](file:///c:/Users/acer/.gemini/antigravity/scratch/ar-pet-coach/mobile/screens/PaywallScreen.tsx) triggers after 5 days or 3 sessions.
- **Deployment:**
    - **iOS:** Successfully deployed to **TestFlight**.
    - **Android:** Configuration for Google Play Billing (`com.android.vending.BILLING`) added. **Production Build pending**.

## 3. Key Technical Decisions
- **Apple Auth Library:** Switched from `@invertase` to `expo-apple-authentication` to resolve native linking issues in Expo managed workflow.
- **Environment Variables:** Currently hardcoded in [eas.json](file:///c:/Users/acer/.gemini/antigravity/scratch/ar-pet-coach/eas.json) (Production profile) for simplicity during complying. **MUST BE MIGRATED TO EAS SECRETS**.
- **Dev Client:** Using `expo-dev-client` for testing native features (Purchases, File System, Auth) which are not supported in Expo Go.

## 4. Configuration & Secrets
**File:** [mobile/eas.json](file:///c:/Users/acer/.gemini/antigravity/scratch/ar-pet-coach/mobile/eas.json)
- **Profiles:** `development` (RevenueCat Test keys), `production` (RevenueCat/Stripe Live keys).
- **Critical Note:** The `production` profile currently contains REAL Live keys. These should be moved to EAS Secrets before final public release to avoid security risks.
- **Submit Profile:** Added for `production` to enable auto-submission.

**File:** [mobile/app.json](file:///c:/Users/acer/.gemini/antigravity/scratch/ar-pet-coach/mobile/app.json)
- **Plugins:** `expo-apple-authentication`, `expo-web-browser`, `@react-native-google-signin/google-signin`.
- **Permissions:** Added `com.android.vending.BILLING` for Google Play.

## 5. Outstanding Tasks (Immediate)
1.  **Android Build:** Run `eas build --platform android --profile production --auto-submit` to upload the first AAB to Google Play Console.
2.  **Google Play Setup:**
    - Configure **RevenueCat Service Account** JSON.
    - Setup **Monetization** in Google Play Console (Merchant Account).
    - Create **Subscriptions** in Google Play Console matching RevenueCat product IDs.
3.  **Security Cleanup:** Remove hardcoded keys from [eas.json](file:///c:/Users/acer/.gemini/antigravity/scratch/ar-pet-coach/eas.json) and use `eas secret:create`.

## 6. Known Issues / "Gotchas"
- **TestFlight Payments:** Apple TestFlight *always* uses Sandbox payments. You cannot test "Real" credit card charges until the app is Live on the App Store.
- **RevenueCat Caching Error:** You may see `Failed to save codable to cache` logs. This is benign and does not affect functionality.
- **Apple Auth Available:** If `AppleAuthentication.isAvailableAsync()` returns false on a real device, it means the app binary is outdated. Reinstall via EAS build.

## 7. User Preferences
- **Paywall Trigger:** Logic is "After 5 days installed OR 3 active sessions".
- **Testing:** User prefers to test "Real" payments where possible (hence the focus on Live keys), but understands Sandbox limitations.
