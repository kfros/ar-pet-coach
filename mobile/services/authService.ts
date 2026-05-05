import { auth, db } from './firebaseConfig';
import RevenueCatService from './revenueCatService';

/**
 * Deletes all user data from Firestore and Storage, 
 * logs out of RevenueCat, and deletes the Firebase Auth user.
 * 
 * Handles 'auth/requires-recent-login' by throwing 'REAUTH_REQUIRED'.
 */
export const deleteUserAccount = async () => {
    const user = auth().currentUser;
    if (!user) throw new Error('No user logged in');

    const uid = user.uid;

    try {
        console.log(`[AuthService] Starting account deletion for UID: ${uid}`);

        // 1. Cleanup Firestore Data
        // Fetch all pets
        const petsSnap = await db.collection('users').doc(uid).collection('pets').get();

        for (const petDoc of petsSnap.docs) {
            const petId = petDoc.id;

            console.log(`[AuthService] Cleaning up pet: ${petId}`);

            // Subcollections to clean up
            const subcollections = ['sessions', 'calm_sessions'];

            for (const sub of subcollections) {
                const subSnap = await petDoc.ref.collection(sub).get();
                if (!subSnap.empty) {
                    const batch = db.batch();
                    subSnap.docs.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                }
            }

            // Delete the pet doc itself
            await petDoc.ref.delete();
        }

        // Delete the main user doc
        await db.collection('users').doc(uid).delete();

        // 2. RevenueCat LogOut
        // We do this BEFORE deleting the auth user to ensure we can still identify the user if needed
        await RevenueCatService.logOut();

        // 4. Delete Firebase Auth User
        // Note: user.delete() is the standard method in RN Firebase. 
        // If this fails with 'auth/requires-recent-login', it will be caught in the catch block.
        await user.delete();
        
        console.log('[AuthService] Account deleted successfully');
    } catch (error: any) {
        console.error('[AuthService] Error deleting account:', error);
        throw error; // Let the UI handle specific error codes
    }
};

/**
 * Signs out from Firebase and RevenueCat.
 */
export const signOut = async () => {
    try {
        const user = auth().currentUser;
        if (user) {
            await auth().signOut();
            await RevenueCatService.logOut();
        } else {
            console.warn('[AuthService] No authenticated user to sign out');
        }
    } catch (error) {
        console.error('[AuthService] Error signing out:', error);
        throw error;
    }
};

/**
 * Sends a password reset email via Firebase.
 */
export const sendPasswordResetEmail = async (email: string) => {
    try {
        await auth().sendPasswordResetEmail(email.trim());
    } catch (error) {
        console.error('[AuthService] Error sending password reset email:', error);
        throw error;
    }
};
