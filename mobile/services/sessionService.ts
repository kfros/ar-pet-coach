import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, SessionHistoryEntry } from '../types/Session';
import { SESSIONS } from '../content/sessions';
import { auth, db, firestore } from './firebaseConfig';

const HISTORY_KEY = 'chillpup_session_history';

class SessionService {
    getSessions(): Session[] {
        return SESSIONS;
    }

    getSessionById(id: string): Session | undefined {
        return SESSIONS.find(s => s.id === id);
    }

    async saveSessionHistory(entry: SessionHistoryEntry): Promise<void> {
        try {
            // 1. Save to Local Storage (Always, for backup/guest)
            const existingHistory = await this.getLocalHistory();
            const updatedHistory = [entry, ...existingHistory];
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));

            // 2. Save to Firestore if Authenticated
            const user = auth().currentUser;
            if (user && entry.petId && entry.petId !== 'guest_pet') {
                await db.collection('users')
                    .doc(user.uid)
                    .collection('pets')
                    .doc(entry.petId)
                    .collection('sessions')
                    .add({
                        ...entry,
                        timestamp: firestore.FieldValue.serverTimestamp()
                    });
            }
        } catch (error) {
            console.error('[SessionService] Error saving history:', error);
        }
    }

    async getLocalHistory(): Promise<SessionHistoryEntry[]> {
        try {
            const data = await AsyncStorage.getItem(HISTORY_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('[SessionService] Error fetching local history:', error);
            return [];
        }
    }

    async getRecentProgressSummary(petId: string): Promise<string | null> {
        const history = await this.getLocalHistory();
        const petHistory = history.filter(h => h.petId === petId && h.completed);
        
        if (petHistory.length === 0) return null;

        const total = petHistory.length;
        const lastSession = petHistory[0];
        const sessionDef = this.getSessionById(lastSession.sessionId);

        return `Completed ${total} session${total > 1 ? 's' : ''}. Last: ${sessionDef?.title || 'Unknown'}`;
    }
}

export default new SessionService();
