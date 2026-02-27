---
description: Deploy React Native app to TestFlight
---

1. **Prerequisites**
   - Apple Developer Program membership.
   - App Store Connect app record created with a unique Bundle Identifier.
   - Xcode installed (latest stable version).
   - Ensure the `mobile` folder is a valid iOS project (e.g., generated via `expo prebuild` or native iOS project).

2. **Configure iOS Signing**
   - Open the iOS project in Xcode (`mobile/ios/YourApp.xcworkspace`).
   - In the project navigator, select the project root → *Signing & Capabilities*.
   - Choose your Apple Development Team.
   - Ensure the *Bundle Identifier* matches the one in App Store Connect.
   - Xcode will automatically manage provisioning profiles.

3. **Update Version & Build Numbers**
   - In Xcode, select the target → *General* tab.
   - Increment the **Version** (e.g., `1.0.1`).
   - Increment the **Build** number (e.g., `2`).
   - Commit these changes to source control.

4. **Create an Archive**
   - In Xcode, select *Product → Scheme → YourApp* and ensure the device is set to a *Generic iOS Device*.
   - Choose *Product → Archive*.
   - Wait for the archive to be built; the *Organizer* window will appear.

5. **Upload to App Store Connect**
   - In the *Organizer*, select the newly created archive.
   - Click *Distribute App* → *App Store Connect* → *Upload*.
   - Follow the prompts (choose *Automatic* for signing, include bitcode if required, etc.).
   - Xcode will validate and upload the build.

6. **Verify Upload**
   - Log in to https://appstoreconnect.apple.com.
   - Navigate to *My Apps → YourApp → TestFlight*.
   - The uploaded build should appear under *Builds* after processing (a few minutes).

7. **Internal Testing**
   - Add internal testers (your Apple IDs) under the *TestFlight* tab.
   - Enable the build for testing and send invitations.

8. **External Testing (Optional)**
   - Submit the build for Beta App Review if you plan to invite external testers.
   - Once approved, add external testers and distribute.

9. **Automate with Fastlane (Optional)**
   - Install Fastlane (`gem install fastlane`).
   - Create a `Fastfile` in the `mobile/ios` directory with a `beta` lane that runs `gym` to build and `pilot` to upload.
   - Run `fastlane beta` to automate steps 4‑6.

**Notes**
- Ensure all native dependencies are correctly linked (e.g., `pod install` if using CocoaPods).
- If using Expo Managed workflow, run `eas build --platform ios` and then `eas submit --platform ios` to upload.
- Keep your Apple credentials secure; consider using App Store Connect API keys for CI/CD.
