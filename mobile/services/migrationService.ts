import PetProfileRepository, { PetProfile } from './petProfileRepository';
import { auth, db, firestore } from './firebaseConfig';

class MigrationService {
    /**
     * Migrates guest pet profile to Firestore if the user is now authenticated.
     */
    async migrateGuestToAccount(): Promise<boolean> {
        try {
            const user = auth().currentUser;
            if (!user) return false;

            const mode = await PetProfileRepository.getAuthMode();
            if (mode !== 'authenticated') return false;

            // Check if guest profile exists
            const guestProfile = await PetProfileRepository.getPetProfile();
            if (!guestProfile || guestProfile.id) {
                // No guest profile or already has an ID (likely already synced)
                return false;
            }

            console.log('[MigrationService] Migrating guest profile for UID:', user.uid);

            // Check if user already has a profile in Firestore
            const petsCol = db.collection('users').doc(user.uid).collection('pets');
            const petsSnap = await petsCol.limit(1).get();

            if (petsSnap.empty) {
                // Upload guest profile
                const petData = {
                    ...guestProfile,
                    createdAt: firestore.FieldValue.serverTimestamp(),
                };
                
                await petsCol.add(petData);
                console.log('[MigrationService] Guest profile uploaded successfully.');
                
                // Clear guest data
                await PetProfileRepository.clearGuestData();
                return true;
            } else {
                console.log('[MigrationService] User already has a profile in Firestore. Skipping migration.');
                // We keep guest data just in case, or we could clear it. 
                // For MVP, we don't overwrite backend data.
                return false;
            }
        } catch (error) {
            console.error('[MigrationService] Error during migration:', error);
            return false;
        }
    }
}

export default new MigrationService();
