import PetProfileRepository, { PetProfile } from './petProfileRepository';
import { auth, db, firestore } from './firebaseConfig';
import RevenueCatService from './revenueCatService';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

class MigrationService {
    /**
     * Handles all necessary side effects when a user successfully authenticates.
     * 1. Syncs RevenueCat with the new UID
     * 2. Ensures the Firestore /users/{userId} document exists
     * 3. Migrates any guest data if this is a first-time sign-up
     */
    async handleAuthSuccess(user: FirebaseAuthTypes.User): Promise<void> {
        if (!user) return;

        console.log('[MigrationService] Processing auth success for:', user.uid);

        // 1. Sync RevenueCat (asynchronous, non-blocking)
        await RevenueCatService.logIn(user.uid);

        try {
            // 2. Ensure User Document exists in Firestore
            const userDocRef = db.collection('users').doc(user.uid);
            const userSnap = await userDocRef.get();

            if (!userSnap.exists) {
                console.log('[MigrationService] Creating new user document for:', user.uid);
                await userDocRef.set({
                    email: user.email,
                    uid: user.uid,
                    isPremium: false,
                    createdAt: firestore.FieldValue.serverTimestamp(),
                    lastLoginAt: firestore.FieldValue.serverTimestamp(),
                    onboardingCompleted: await PetProfileRepository.isOnboardingCompleted()
                });
            } else {
                // If user exists, sync onboarding status if missing or outdated
                console.log('[MigrationService] user with ' + user.uid + ' already exists.', user.uid);

                const data = userSnap.data() || {};
                const safeUpdates: Record<string, any> = {
                    lastLoginAt: firestore.FieldValue.serverTimestamp() // Обновляем время входа всегда
                };

                console.log('[MigrationService] user data:', data);

                if (!data.email) {
                    safeUpdates.email = user.email;
                }

                if (data.onboardingCompleted === undefined) {
                    safeUpdates.onboardingCompleted = await PetProfileRepository.isOnboardingCompleted();
                }

                // ДОБАВЛЯЕМ ЛЕЧЕНИЕ ДЛЯ ПУСТЫХ ДОКУМЕНТОВ:
                if (data.isPremium === undefined) {
                    safeUpdates.isPremium = false; // Страховка для пустых/старых документов
                }

                if (!data.createdAt) {
                    safeUpdates.createdAt = firestore.FieldValue.serverTimestamp();
                }

                // Наконец, отправляем все собранные данные в базу
                await userDocRef.set(safeUpdates, { merge: true });
            }


            // 3. Migrate guest data if applicable
            try {
                console.log('[MigrationService] Starting guest migration...');
                await this.migrateGuestToAccount(user);
                console.log('[MigrationService] Guest migration finished.');
            } catch (migError) {
                console.error('[MigrationService] FAILED inside migrateGuestToAccount:', migError);
            }

        } catch (error) {
            console.error('[MigrationService] Error during handleAuthSuccess:', error);
            // Potential retry logic could be added here for transient network issues
        }
    }

    /**
     * Migrates guest pet profile to Firestore if the user is now authenticated.
     */
    private async migrateGuestToAccount(user: FirebaseAuthTypes.User): Promise<boolean> {
        try {
            // Check if guest profile exists locally
            const guestProfile = await PetProfileRepository.getPetProfile();
            if (!guestProfile) {
                // No guest profile
                return false;
            }

            const mode = await PetProfileRepository.getAuthMode();
            if (mode !== 'authenticated') return false;

            console.log('[MigrationService] Migrating guest profile for UID:', user.uid);

            // Check if user already has a pet profile in Firestore (to avoid duplicates)
            const petsCol = db.collection('users').doc(user.uid).collection('pets');
            const petsSnap = await petsCol.limit(1).get();

            if (petsSnap.empty) {
                // Upload guest profile data to Firestore
                const petData = {
                    ...guestProfile,
                    createdAt: firestore.FieldValue.serverTimestamp(),
                    updatedAt: firestore.FieldValue.serverTimestamp()
                };

                await petsCol.add(petData);
                console.log('[MigrationService] Guest profile uploaded successfully.');

                // Clear local guest data since it's now persisted in the cloud
                await PetProfileRepository.clearGuestData();
                return true;
            } else {
                console.log('[MigrationService] User already has a profile in Firestore. Skipping migration.');
                // We clear guest data anyway if the cloud already has a profile, 
                // as the user is now successfully logged in and will use cloud data.
                await PetProfileRepository.clearGuestData();
                return false;
            }
        } catch (error) {
            console.error('[MigrationService] Error during migration:', error);
            return false;
        }
    }
}

export default new MigrationService();
