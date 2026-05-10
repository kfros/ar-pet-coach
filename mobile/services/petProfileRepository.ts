import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db, firestore } from './firebaseConfig';

export type PetProfile = {
    id?: string;
    petName: string;
    hasPhoto: boolean;
    photoUri?: string | null;
    anxietyTriggers?: string[];
    anxietyTriggerOther?: string | null;
    breed: string;
    size: string; // 'small' | 'medium' | 'large'
    ageGroup?: string | null; // 'puppy' | 'young' | 'adult' | 'senior' | 'not_sure'
    notes: string;
    createdAt?: any;
    updatedAt?: string;
    anxietyScore: number;
    // Keeping legacy fields as optional for backward compatibility if needed
    weight?: string;
    birthDate?: string;
};

export type AuthMode = 'guest' | 'authenticated' | 'unauthenticated';

const STORAGE_KEYS = {
    AUTH_MODE: 'chillpup.auth.mode',
    GUEST_PET_PROFILE: 'chillpup.guest.petProfile',
    ONBOARDING_COMPLETED: 'chillpup.onboarding.completed',
};

type AuthModeListener = (mode: AuthMode) => void;

class PetProfileRepository {
    private listeners: AuthModeListener[] = [];

    addListener(cb: AuthModeListener) {
        this.listeners.push(cb);
        return () => {
            this.listeners = this.listeners.filter(l => l !== cb);
        };
    }

    private notifyListeners(mode: AuthMode) {
        this.listeners.forEach(l => l(mode));
    }

    async getAuthMode(): Promise<AuthMode> {
        const mode = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_MODE);
        return (mode as AuthMode) || 'unauthenticated';
    }

    async setAuthMode(mode: AuthMode): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_MODE, mode);
        this.notifyListeners(mode);
    }

    async getGuestProfile(): Promise<PetProfile | null> {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.GUEST_PET_PROFILE);
        return raw ? JSON.parse(raw) : null;
    }

    async getPetProfile(): Promise<PetProfile | null> {
        const mode = await this.getAuthMode();

        if (mode === 'guest') {
            return this.getGuestProfile();
        }

        if (mode === 'authenticated') {
            const user = auth().currentUser;
            if (!user) return null;

            try {
                const petsCol = db.collection('users').doc(user.uid).collection('pets');
                const petsSnap = await petsCol.limit(1).get();

                if (!petsSnap.empty) {
                    const petDoc = petsSnap.docs[0];
                    return { id: petDoc.id, ...petDoc.data() } as PetProfile;
                }
            } catch (error) {
                console.error('[PetProfileRepository] Error fetching profile from Firestore:', error);
            }
        }

        return null;
    }

    async savePetProfile(profile: PetProfile): Promise<void> {
        const mode = await this.getAuthMode();

        if (mode === 'guest') {
            await AsyncStorage.setItem(
                STORAGE_KEYS.GUEST_PET_PROFILE,
                JSON.stringify({ ...profile, createdAt: new Date().toISOString() })
            );
            return;
        }

        if (mode === 'authenticated') {
            const user = auth().currentUser;
            if (!user) throw new Error('Not logged in');

            const petData = {
                ...profile,
                createdAt: profile.createdAt || firestore.FieldValue.serverTimestamp(),
            };

            if (profile.id) {
                await db.collection('users').doc(user.uid).collection('pets').doc(profile.id).set(petData, { merge: true });
            } else {
                await db.collection('users').doc(user.uid).collection('pets').add(petData);
            }
            return;
        }

        throw new Error('Cannot save pet profile without auth mode');
    }

    async hasPetProfile(): Promise<boolean> {
        const profile = await this.getPetProfile();
        return Boolean(profile);
    }

    async clearGuestData(): Promise<void> {
        const keysToRemove = [
            STORAGE_KEYS.GUEST_PET_PROFILE,
            'ar_session_count',
            'last_played_track',
            'chillpup_calm_first_time'
        ];
        await AsyncStorage.multiRemove(keysToRemove);
    }

    async setOnboardingCompleted(completed: boolean): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, completed ? 'true' : 'false');
    }

    async isOnboardingCompleted(): Promise<boolean> {
        const val = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
        return val === 'true';
    }
}

export default new PetProfileRepository();
