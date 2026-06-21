import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
    Session, 
    SessionHistoryEntry, 
    StressSignsTrendStatus, 
    StressSignsTrendPoint, 
    StressSignsTrendSummary 
} from '../types/Session';
import { SESSIONS } from '../appContent/sessions';
import { PREMIUM_SESSIONS } from '../appContent/premiumRoutines';
import { 
    calculateCheckinScore, 
    getLevelLabelFromScore, 
    getProgressOutcome, 
    getTrendLabel, 
    getOutcomeCopy,
    OutcomeType
} from './progressScoring';
import { getCheckInProfile } from '../appContent/checkInProfiles';

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
            // Prepare local entry to be sync-friendly
            const syncFriendlyEntry: SessionHistoryEntry = {
                ...entry,
                schemaVersion: entry.schemaVersion ?? 1,
                createdAt: entry.createdAt ?? new Date().toISOString(),
                updatedAt: entry.updatedAt ?? new Date().toISOString(),
                syncStatus: 'pending' // Design-only local sync status
            };

            // 1. Save to Local Storage (Always, for backup/guest)
            const existingHistory = await this.getLocalHistory();
            const index = existingHistory.findIndex(h => h.id === entry.id);
            let updatedHistory;
            if (index !== -1) {
                updatedHistory = [...existingHistory];
                updatedHistory[index] = syncFriendlyEntry;
            } else {
                updatedHistory = [syncFriendlyEntry, ...existingHistory];
            }
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));

            // 2. Save to Firestore if Authenticated (Legacy code kept intact but we don't add new repos/services)
            const user = auth().currentUser;
            if (user && entry.petId && entry.petId !== 'guest_pet') {
                const sanitizedEntry = Object.fromEntries(
                    Object.entries(syncFriendlyEntry).filter(([_, v]) => v !== undefined)
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
        const profile = sessionDef ? getCheckInProfile(sessionDef.checkInProfileId) : undefined;
        const title = 'Recent Progress';
        const body = `Last: ${sessionDef?.title || 'Unknown session'}`;
        const details: string[] = [];

        const beforeResult = last.beforeCheckin ? calculateCheckinScore(last.beforeCheckin, profile) : null;
        const afterResult = last.afterCheckin ? calculateCheckinScore(last.afterCheckin, profile) : null;
        
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

    async getStressSignsTrend(
        petId: string,
        options?: {
            limit?: number;
            minRequiredCheckins?: number;
            sessionIdFilter?: string;
            categoryFilter?: string;
        }
    ): Promise<StressSignsTrendSummary> {
        const limit = options?.limit ?? 7;
        const minRequiredCheckins = options?.minRequiredCheckins ?? 2;
        const sessionIdFilter = options?.sessionIdFilter;
        const categoryFilter = options?.categoryFilter;

        const history = await this.getLocalHistory();
        
        let filtered = history.filter(h => h.petId === petId);
        
        if (sessionIdFilter) {
            filtered = filtered.filter(h => h.sessionId === sessionIdFilter);
        }
        if (categoryFilter) {
            filtered = filtered.filter(h => {
                const sDef = this.getSessionById(h.sessionId);
                return sDef?.category === categoryFilter;
            });
        }

        filtered = filtered.filter(h => h.afterCheckin || h.beforeCheckin);

        const latestEntries = filtered.slice(0, limit);
        const chronologicalEntries = [...latestEntries].reverse();

        const points: StressSignsTrendPoint[] = chronologicalEntries.map((entry, index) => {
            const checkin = entry.afterCheckin || entry.beforeCheckin;
            const sDef = this.getSessionById(entry.sessionId);
            const profile = sDef ? getCheckInProfile(sDef.checkInProfileId) : undefined;
            const scoreResult = calculateCheckinScore(checkin, profile);
            
            return {
                id: entry.id,
                sessionId: entry.sessionId,
                sessionTitle: sDef?.title,
                completedAt: entry.completedAt,
                sequenceNumber: index + 1,
                stressSignsScore: scoreResult.score,
                levelLabel: getLevelLabelFromScore(scoreResult.score),
                stoppedEarly: !!entry.stoppedEarly,
                hasSevereSigns: scoreResult.hasSevereSigns,
                source: entry.afterCheckin ? 'after_checkin' : 'before_checkin'
            };
        });

        const statusLabels = {
            not_enough_data: {
                title: "Not enough data yet",
                body: "Complete at least 2 check-ins to see a trend.",
                helper: "After a few sessions, ChillPup can show how owner-reported signs are changing."
            },
            easing: {
                title: "Signs look easier",
                body: "Recent check-ins show fewer owner-reported stress signs.",
                helper: "Keep the next step small and repeatable."
            },
            same: {
                title: "About the same",
                body: "Recent check-ins look fairly steady.",
                helper: "Stay with the easy version before making the routine harder."
            },
            increased: {
                title: "Signs look stronger",
                body: "Recent check-ins show stronger stress signs.",
                helper: "Use an easier step, shorten the session, or stop for today."
            },
            mixed: {
                title: "Mixed pattern",
                body: "Recent check-ins do not show a clear direction yet.",
                helper: "Keep tracking and avoid making the next step harder too quickly."
            },
            severe: {
                title: "Strong signs noted",
                body: "Stop the routine if strong signs appear.",
                helper: "For medical red flags, pain, collapse, breathing trouble, or severe distress, contact appropriate professional support."
            }
        };

        const totalPoints = points.length;
        const legend = "Lower = fewer signs";

        if (totalPoints < minRequiredCheckins) {
            return {
                status: 'not_enough_data',
                componentTitle: 'Stress Signs Trend',
                statusTitle: statusLabels.not_enough_data.title,
                body: statusLabels.not_enough_data.body,
                helper: statusLabels.not_enough_data.helper,
                points,
                latestScore: totalPoints > 0 ? points[totalPoints - 1].stressSignsScore : null,
                previousScore: null,
                averageDelta: null,
                latestCompletedAt: totalPoints > 0 ? points[totalPoints - 1].completedAt : null,
                minRequiredCheckins,
                hasEnoughData: false,
                legend
            };
        }

        const latestPoint = points[totalPoints - 1];
        
        if (latestPoint.hasSevereSigns) {
            return {
                status: 'severe',
                componentTitle: 'Stress Signs Trend',
                statusTitle: statusLabels.severe.title,
                body: statusLabels.severe.body,
                helper: statusLabels.severe.helper,
                points,
                latestScore: latestPoint.stressSignsScore,
                previousScore: totalPoints > 1 ? points[totalPoints - 2].stressSignsScore : null,
                averageDelta: null,
                latestCompletedAt: latestPoint.completedAt,
                minRequiredCheckins,
                hasEnoughData: true,
                legend
            };
        }

        let latestCount = 3;
        if (totalPoints === 2) {
            latestCount = 1;
        } else if (totalPoints === 3 || totalPoints === 4) {
            latestCount = 2;
        }
        const earlierCount = totalPoints - latestCount;

        const latestPoints = points.slice(totalPoints - latestCount);
        const earlierPoints = points.slice(0, earlierCount);

        const latestAverage = latestPoints.reduce((sum, p) => sum + p.stressSignsScore, 0) / latestPoints.length;
        const earlierAverage = earlierPoints.reduce((sum, p) => sum + p.stressSignsScore, 0) / earlierPoints.length;
        const averageDelta = latestAverage - earlierAverage;

        let status: StressSignsTrendStatus = 'same';
        if (averageDelta <= -1) {
            status = 'easing';
        } else if (averageDelta >= 1) {
            status = 'increased';
        } else {
            let hasUp = false;
            let hasDown = false;
            for (let i = 1; i < points.length; i++) {
                const diff = points[i].stressSignsScore - points[i - 1].stressSignsScore;
                if (diff > 0) hasUp = true;
                if (diff < 0) hasDown = true;
            }
            if (hasUp && hasDown) {
                status = 'mixed';
            } else {
                status = 'same';
            }
        }

        return {
            status,
            componentTitle: 'Stress Signs Trend',
            statusTitle: statusLabels[status].title,
            body: statusLabels[status].body,
            helper: statusLabels[status].helper,
            points,
            latestScore: latestPoint.stressSignsScore,
            previousScore: points[totalPoints - 2].stressSignsScore,
            averageDelta,
            latestCompletedAt: latestPoint.completedAt,
            minRequiredCheckins,
            hasEnoughData: true,
            legend
        };
    }
}

export default new SessionService();
