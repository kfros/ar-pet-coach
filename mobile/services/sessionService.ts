import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, SessionHistoryEntry } from '../types/Session';
import { SESSIONS } from '../appContent/sessions';
import { PREMIUM_SESSIONS } from '../appContent/premiumRoutines';
import { auth, db, firestore } from './firebaseConfig';
import { 
    calculateCheckinScore, 
    getLevelLabelFromScore, 
    getProgressOutcome, 
    getTrendLabel, 
    getOutcomeCopy,
    OutcomeType
} from './progressScoring';

const HISTORY_KEY = 'chillpup_session_history';

class SessionService {
    getSessions(): Session[] {
        return [...SESSIONS, ...PREMIUM_SESSIONS];
    }

    getSessionById(id: string): Session | undefined {
        return [...SESSIONS, ...PREMIUM_SESSIONS].find(s => s.id === id);
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

    getPreviousScoreForPet(petHistory: SessionHistoryEntry[], currentEntry: SessionHistoryEntry): number | null {
        // Skip current entry (history is usually sorted desc by time, so we look for things after it in the array or just skip index 0)
        const previousEntries = petHistory.filter(h => h.id !== currentEntry.id);
        if (previousEntries.length === 0) return null;

        // Try same sessionId first
        const sameSession = previousEntries.find(h => h.sessionId === currentEntry.sessionId);
        if (sameSession) {
            const checkin = sameSession.afterCheckin || sameSession.beforeCheckin;
            return calculateCheckinScore(checkin).score;
        }

        // Fallback to latest previous session
        const anySession = previousEntries[0];
        const checkin = anySession.afterCheckin || anySession.beforeCheckin;
        return calculateCheckinScore(checkin).score;
    }

    async getRecentProgress(petId: string): Promise<{
        title: string;
        body: string;
        details: string[];
        outcome: OutcomeType;
        latestScore: number;
        latestLevelLabel: string;
        hasSevereSigns: boolean;
        severeSignsNote: string;
        positiveSigns: string[];
        previousScore: number | null;
        scoreDeltaFromPrevious: number | null;
        trendLabel: string | null;
        beforeScore: number | null;
        afterScore: number | null;
        beforeAfterDelta: number | null;
    } | null> {
        const history = await this.getLocalHistory();
        const petHistory = history.filter(h => h.petId === petId);

        if (petHistory.length === 0) return null;

        const last = petHistory[0];
        const sessionDef = this.getSessionById(last.sessionId);
        const title = 'Recent Progress';
        const body = `Last: ${sessionDef?.title || 'Unknown session'}`;
        const details: string[] = [];

        const beforeResult = last.beforeCheckin ? calculateCheckinScore(last.beforeCheckin) : null;
        const afterResult = last.afterCheckin ? calculateCheckinScore(last.afterCheckin) : null;
        
        // Severe override is based primarily on latest/after check-in
        const latestResult = afterResult || beforeResult;
        const latestScore = latestResult ? latestResult.score : 0;
        const latestLevelLabel = getLevelLabelFromScore(latestScore);
        const hasSevereSigns = latestResult ? latestResult.hasSevereSigns : false;
        const severeSignsNote = latestResult?.severeSignsNote || '';
        const positiveSigns = latestResult?.positiveSigns || [];

        const outcome = getProgressOutcome(
            beforeResult?.score ?? 0,
            afterResult?.score ?? 0,
            {
                stoppedEarly: !!last.stoppedEarly,
                hasSevereSigns,
                hasBefore: !!last.beforeCheckin,
                hasAfter: !!last.afterCheckin,
                hasPositiveSigns: positiveSigns.length > 0
            }
        );

        // Previous comparison
        const previousScore = this.getPreviousScoreForPet(petHistory, last);
        const trendLabel = getTrendLabel(latestScore, previousScore);
        const scoreDeltaFromPrevious = previousScore !== null ? latestScore - previousScore : null;

        // details population
        if (last.beforeCheckin) {
            const signs = last.beforeCheckin.selectedSigns?.length
                ? ` · ${last.beforeCheckin.selectedSigns.map(s => s.replace(/_/g, ' ')).slice(0, 3).join(', ')}`
                : '';
            details.push(`Before: ${getLevelLabelFromScore(beforeResult?.score ?? 0)}${signs}`);
        }
        if (last.afterCheckin) {
            const signs = last.afterCheckin.selectedSigns?.length
                ? ` · ${last.afterCheckin.selectedSigns.map(s => s.replace(/_/g, ' ')).slice(0, 3).join(', ')}`
                : '';
            details.push(`After: ${getLevelLabelFromScore(afterResult?.score ?? 0)}${signs}`);
        }

        if (positiveSigns.length > 0) {
            details.push(`Positive signs: ${positiveSigns.slice(0, 3).join(', ')}`);
        }

        // Add outcome-based feedback
        const outcomeCopy = getOutcomeCopy(outcome, positiveSigns.length > 0);
        if (outcomeCopy.length > 0) {
            // Add the first line of relevant template
            details.push(outcomeCopy[0]);
        }

        if (trendLabel) {
            details.push(trendLabel);
        }

        return { 
            title, 
            body, 
            details, 
            outcome, 
            latestScore, 
            latestLevelLabel, 
            hasSevereSigns, 
            severeSignsNote, 
            positiveSigns,
            previousScore,
            scoreDeltaFromPrevious,
            trendLabel,
            beforeScore: beforeResult?.score ?? null,
            afterScore: afterResult?.score ?? null,
            beforeAfterDelta: (beforeResult && afterResult) ? afterResult.score - beforeResult.score : null
        };
    }

    async getRecentProgressSummary(petId: string): Promise<string | null> {
        const progress = await this.getRecentProgress(petId);
        if (!progress) return null;
        return `${progress.body}. ${progress.details[0] || ''}`;
    }
}

export default new SessionService();
