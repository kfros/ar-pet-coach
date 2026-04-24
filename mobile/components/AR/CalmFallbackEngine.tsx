import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, Dimensions, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  db, 
  collection, 
  addDoc, 
  serverTimestamp 
} from '../../services/firebaseConfig';
import { getBestARMode, ARMode, isLowPerformanceDevice } from '../../helpers/DeviceCheck';
import { useCalmAudio } from '../../hooks/useCalmAudio';
import CalmHUD from './CalmHUD';

const { width } = Dimensions.get('window');
const CALM_FIRST_TIME_KEY = 'chillpup_calm_has_seen_instructions';

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
 * Onboarding Overlay for first-time users.
 */
const CalmFallbackOverlay: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  
  const messages = [
    "Stay here with your pet.",
    "Your calm helps them calm down.",
    "Breathe with the circle.",
    "Give a treat when your pet relaxes."
  ];

  useEffect(() => {
    let isCancelled = false;
    const runSequence = async () => {
      const isLowPerf = await isLowPerformanceDevice();
      const hasSeen = await AsyncStorage.getItem(CALM_FIRST_TIME_KEY);
      
      let activeMessages = messages;
      if (hasSeen) {
        activeMessages = [messages[0]];
      } else if (isLowPerf) {
        activeMessages = [messages[0], messages[2]];
      }

      for (let i = 0; i < activeMessages.length; i++) {
        if (isCancelled) break;
        setMessageIndex(i);
        await new Promise(resolve => Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start(resolve));
        await new Promise(resolve => setTimeout(resolve, 1200));
        await new Promise(resolve => Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(resolve));
      }

      if (!isCancelled) {
        await AsyncStorage.setItem(CALM_FIRST_TIME_KEY, 'true');
        onComplete();
      }
    };
    runSequence();
    return () => { isCancelled = true; };
  }, []);

  return (
    <Pressable style={[styles.overlayContainer, { paddingTop: insets.top }]} onPress={onComplete}>
      <Animated.View style={[styles.messageBox, { opacity: fadeAnim }]}>
        <Text style={styles.overlayText}>{messages[messageIndex]}</Text>
      </Animated.View>
    </Pressable>
  );
};

/**
 * Main Calm Session Engine (Fallback Mode).
 */
const CalmFallbackEngine: React.FC<CalmFallbackEngineProps> = ({
  userId,
  petId,
  onExit,
}) => {
  const insets = useSafeAreaInsets();
  const [sessionState, setSessionState] = useState<SessionState>(SessionState.INIT);
  const [sessionTime, setSessionTime] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [surfaceStatus, setSurfaceStatus] = useState<'detecting' | 'ready' | 'unstable'>('detecting');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isExiting = useRef(false);
  const finalSessionTime = useRef(0);
  const currentTrackIdRef = useRef<string | null>(null);
  const hasSaved = useRef(false);

  // Audio Hook
  const { currentTrackId, playRandomTrack, stopAudio } = useCalmAudio();

  // Sync state to refs for safe access in cleanup
  useEffect(() => {
    finalSessionTime.current = sessionTime;
    currentTrackIdRef.current = currentTrackId;
  }, [sessionTime, currentTrackId]);

  // 1. Initial Capability Detection
  useEffect(() => {
    const detectCapabilities = async () => {
      try {
        const bestMode = await getBestARMode();
        if (bestMode === ARMode.LITE) {
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
    if (sessionState === SessionState.ACTIVE_SESSION && !isExiting.current) {
      // Start timer
      timerRef.current = setInterval(() => {
        if (!isExiting.current) setSessionTime(prev => prev + 1);
      }, 1000);

      // Start Audio
      playRandomTrack();
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionState]);

  // 3. Atomic Save-on-Exit
  useEffect(() => {
    return () => {
      // Threshold check: only save if session lasted at least 15 seconds
      if (!hasSaved.current && finalSessionTime.current >= 15) {
        hasSaved.current = true;
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
  }, []);

  // 4. Simulated UX Parity
  useEffect(() => {
    if (sessionState === SessionState.AR_AVAILABLE_NO_ZONE || sessionState === SessionState.NON_AR_MODE) {
      const timer = setTimeout(() => {
        setSurfaceStatus('ready');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [sessionState]);

  const handleExit = async () => {
    if (isExiting.current) return;
    isExiting.current = true;

    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      await stopAudio();
    } catch (e) {
      console.error('[CalmFallbackEngine] Exit cleanup error:', e);
    } finally {
      onExit();
    }
  };

  const handleStartSession = () => {
    setSessionState(SessionState.ACTIVE_SESSION);
    // Show overlay for first-time session start
    AsyncStorage.getItem(CALM_FIRST_TIME_KEY).then(val => {
      if (!val) setShowOverlay(true);
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Background Visuals */}
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

      {showOverlay && (
        <CalmFallbackOverlay onComplete={() => setShowOverlay(false)} />
      )}
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
    top: 80,
    zIndex: 5,
  },
  timerText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#38BDF8',
    opacity: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  },
  overlayContainer: { 
    ...StyleSheet.absoluteFillObject, 
    zIndex: 200, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)'
  },
  messageBox: { width: '80%', alignItems: 'center' },
  overlayText: { 
    fontSize: 22, 
    fontWeight: '600', 
    color: '#FFFFFF', 
    textAlign: 'center', 
    lineHeight: 30,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12 
  },
});

export default CalmFallbackEngine;
