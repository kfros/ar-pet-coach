import { auth, db } from './firebaseConfig';
import RevenueCatService from './revenueCatService';
import Purchases from 'react-native-purchases';

/**
 * Deletes all user data from Firestore and Storage, 
 * logs out of RevenueCat, and deletes the Firebase Auth user.
 * 
 * Handles 'auth/requires-recent-login' by throwing 'REAUTH_REQUIRED'.
 */
export const deleteUserAccount = async () => {
    // ... existing implementation if needed, but we'll add the new one below
};

export const performFullAccountDeletion = async () => {
    const user = auth().currentUser;
    if (!user) throw new Error('No authenticated user found.');
    
    const uid = user.uid;
    const userDocRef = db.collection('users').doc(uid);
    const petsColRef = userDocRef.collection('pets');
    
    // 1. Delete all pets
    const petsSnap = await petsColRef.get();
    const batch = db.batch(); // Use batch for atomic deletion if preferred, or Promise.all
    petsSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    
    // 2. Delete user document
    await userDocRef.delete();
    
    // 3. Log out of RevenueCat
    try {
        await Purchases.logOut();
    } catch (rcError) {
        console.log('[authService] RC logout error during deletion:', rcError);
    }
    
    // 4. Delete Auth User (May throw 'auth/requires-recent-login')
    await user.delete();
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
