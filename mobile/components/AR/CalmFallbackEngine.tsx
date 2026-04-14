import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  db,
  collection,
  addDoc,
  serverTimestamp
} from '../../services/firebaseConfig';
import { getBestARMode, ARMode } from '../../helpers/DeviceCheck';
import { useCalmAudio } from '../../hooks/useCalmAudio';
import CalmHUD from './CalmHUD';

const { width } = Dimensions.get('window');

/**
 * Session States for the Calm Session
 */
enum SessionState {
  INIT = 'INIT',
  AR_AVAILABLE_NO_ZONE = 'AR_AVAILABLE_NO_ZONE',
  NON_AR_MODE = 'NON_AR_MODE',
  ACTIVE_SESSION = 'ACTIVE_SESSION'
}

interface CalmFallbackEngineProps {
  userId: string;
  petId: string;
  onExit: () => void;
}

/**
 * Premium Calm Session Engine (Fallback Mode).
 * Now unified with AR modes through useCalmAudio and CalmHUD.
 */
const CalmFallbackEngine = ({
  userId,
  petId,
  onExit,
}: CalmFallbackEngineProps) => {
  const insets = useSafeAreaInsets();
  const [sessionState, setSessionState] = useState<SessionState>(SessionState.INIT);
  const [sessionTime, setSessionTime] = useState(0);
  const [surfaceStatus, setSurfaceStatus] = useState<'detecting' | 'ready' | 'unstable'>('detecting');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isExiting = useRef(false);

  // Persistence Refs (Mirror state for safe access during unmount cleanup)
  const finalSessionTime = useRef(0);
  const currentTrackIdRef = useRef<string | null>(null);
  const hasSaved = useRef(false);

  // Unified Audio Hook
  const { currentTrackId, playRandomTrack, stopAudio, isPlaying } = useCalmAudio();

  // 1. Capability Detection
  useEffect(() => {
    console.log('[CalmFallbackEngine] useEffect CapabilityDetection MOUNT/UPDATE sessionState:', sessionState);
    const detectCapabilities = async () => {
      try {
        const bestMode = await getBestARMode();
        if (bestMode === ARMode.NATIVE || bestMode === ARMode.LITE) {
          setSessionState(SessionState.AR_AVAILABLE_NO_ZONE);
        } else {
          setSessionState(SessionState.NON_AR_MODE);
        }
      } catch (err) {
        setSessionState(SessionState.NON_AR_MODE);
      }
    };
    if (sessionState === SessionState.INIT) detectCapabilities();
  }, [sessionState]);

  // 2. Lifecycle Management
  useEffect(() => {
    console.log('[CalmFallbackEngine] useEffect LifecycleManagement MOUNT/UPDATE sessionState:', sessionState);
    if (sessionState === SessionState.ACTIVE_SESSION && !isExiting.current) {
      // Start timer
      timerRef.current = setInterval(() => {
        if (!isExiting.current) setSessionTime(prev => prev + 1);
      }, 1000);

      // Start Unified Audio
      playRandomTrack();

    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      console.log('[CalmFallbackEngine] useEffect LifecycleManagement UNMOUNT/CLEANUP');
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionState]);

  // 3. Mirroring Side Effects (State to Ref Sync)
  useEffect(() => {
    finalSessionTime.current = sessionTime;
    currentTrackIdRef.current = currentTrackId;
  }, [sessionTime, currentTrackId]);

  // 4. Atomic Save-on-Exit
  useEffect(() => {
    return () => {
      // Threshold check: only save if session lasted at least 15 seconds
      if (!hasSaved.current && finalSessionTime.current >= 15) {
        hasSaved.current = true;
        
        console.log('[CalmFallbackEngine] Performing atomic save-on-exit:', finalSessionTime.current);
        
        addDoc(collection(db, 'users', userId, 'pets', petId, 'activityPoints'), {
          type: 'calm_session_complete',
          timestamp: serverTimestamp(),
          durationSeconds: finalSessionTime.current,
          mode: 'fallback',
          trackId: currentTrackIdRef.current
        }).catch((err) => {
          console.error('[CalmFallbackEngine] Exit save failed:', err);
        });
      }
    };
  }, []); // Empty dependencies ensure this only runs on unmount

  // 5. Simulated UX Parity (Detection Phase)
  useEffect(() => {
    if (sessionState === SessionState.AR_AVAILABLE_NO_ZONE || sessionState === SessionState.NON_AR_MODE) {
      const timer = setTimeout(() => {
        setSurfaceStatus('ready');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [sessionState]);

  const handleExit = async () => {
    console.log('[CalmFallbackEngine] handleExit started');
    if (isExiting.current) {
      console.log('[CalmFallbackEngine] handleExit isExiting: already true');
      return;
    }
    isExiting.current = true;

    try {
      // Clear timer immediately
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        console.log('[CalmFallbackEngine] timer cleared');
      }

      // Fade out audio (awaits completion)
      console.log('[CalmFallbackEngine] stopping audio');
      await stopAudio();
      console.log('[CalmFallbackEngine] audio stopped');
    } catch (e) {
      console.error('[CalmFallbackEngine] Error during handleExit cleanup:', e);
    } finally {
      // Let navigation.replace() handle the teardown
      onExit();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartSession = () => {
    setSessionState(SessionState.ACTIVE_SESSION);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom || 16 }]}>
      {/* Background Visuals (Minimalist for Fallback) */}
      <View style={styles.mainVisual}>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(sessionTime)}</Text>
        </View>
      </View>

      {/* Unified HUD */}
      <CalmHUD
        isPlaced={sessionState === SessionState.ACTIVE_SESSION}
        onPlaceTap={handleStartSession}
        onExit={handleExit}
        showReticle={sessionState === SessionState.AR_AVAILABLE_NO_ZONE}
        surfaceStatus={surfaceStatus}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A'
  },
  mainVisual: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  timerContainer: {
    position: 'absolute',
    top: 60,
    zIndex: 5,
  },
  timerText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#38BDF8',
    opacity: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  },
});

export default CalmFallbackEngine;
