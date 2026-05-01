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
                const sanitizedEntry = Object.fromEntries(
                    Object.entries(entry).filter(([_, v]) => v !== undefined)
                );
                await db.collection('users')
                    .doc(user.uid)
                    .collection('pets')
                    .doc(entry.petId)
                    .collection('sessions')
                    .add({
                        ...sanitizedEntry,
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

    async getRecentProgress(petId: string): Promise<{
        title: string;
        body: string;
        details: string[];
    } | null> {
        const history = await this.getLocalHistory();
        const petHistory = history.filter(h => h.petId === petId);

        if (petHistory.length === 0) return null;

        const last = petHistory[0];
        const sessionDef = this.getSessionById(last.sessionId);
        const title = 'Recent Progress';
        const body = `Last: ${sessionDef?.title || 'Unknown session'}`;
        const details: string[] = [];

        if (last.beforeCheckin) {
            const signs = last.beforeCheckin.selectedSigns?.length
                ? ` · ${last.beforeCheckin.selectedSigns.map(s => s.replace(/_/g, ' ')).slice(0, 3).join(', ')}`
                : '';
            details.push(`Before: ${last.beforeCheckin.overallLevel.charAt(0).toUpperCase() + last.beforeCheckin.overallLevel.slice(1)} signs${signs}`);
        }
        if (last.afterCheckin) {
            const signs = last.afterCheckin.selectedSigns?.length
                ? ` · ${last.afterCheckin.selectedSigns.map(s => s.replace(/_/g, ' ')).slice(0, 3).join(', ')}`
                : '';
            details.push(`After: ${last.afterCheckin.overallLevel.charAt(0).toUpperCase() + last.afterCheckin.overallLevel.slice(1)} signs${signs}`);
        }

        if (last.stoppedEarly) {
            details.push('Stopped early');
            details.push('Try a shorter or easier routine next time.');
        } else if (last.completed) {
            details.push('Completed');
            if (!last.beforeCheckin && !last.afterCheckin) {
                details.push('Add check-ins before and after sessions to spot patterns.');
            } else if (last.beforeCheckin && last.afterCheckin) {
                const levels = ['calm', 'mild', 'moderate', 'high'];
                const bIdx = levels.indexOf(last.beforeCheckin.overallLevel);
                const aIdx = levels.indexOf(last.afterCheckin.overallLevel);
                if (aIdx < bIdx) details.push('Signs looked lower after the session.');
                else if (aIdx > bIdx) details.push('Signs looked higher after the session.');
                else details.push('Signs looked about the same after the session.');
            }
        }

        return { title, body, details };
    }

    async getRecentProgressSummary(petId: string): Promise<string | null> {
        const progress = await this.getRecentProgress(petId);
        if (!progress) return null;
        return `${progress.body}. ${progress.details[0] || ''}`;
    }
}

export default new SessionService();
