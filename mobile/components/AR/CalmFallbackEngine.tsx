import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, Dimensions, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
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

const CALM_FIRST_TIME_KEY = 'chillpup_calm_has_seen_instructions';

/**
 * Instruction Overlay Component
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
 * Premium Calm Session Engine.
 * Features a controlled random audio playback with seamless crossfades.
 */
const CalmFallbackEngine = ({
  userId,
  petId,
  onExit,
}: CalmFallbackEngineProps) => {
  const insets = useSafeAreaInsets();
  const [sessionState, setSessionState] = useState<SessionState>(SessionState.INIT);
  const [sessionTime, setSessionTime] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [surfaceStatus, setSurfaceStatus] = useState<'detecting' | 'ready' | 'unstable'>('detecting');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));

  // Audio Hook Integration
  const { currentTrackId, stopAudio } = useCalmAudio(sessionState === SessionState.ACTIVE_SESSION);

  // Refs for Save-on-Exit pattern preventing stale closures
  const finalSessionTime = useRef(0);
  const finalTrackId = useRef<string | null>(null);
  const isExiting = useRef(false);

  useEffect(() => {
    finalSessionTime.current = sessionTime;
  }, [sessionTime]);

  useEffect(() => {
    finalTrackId.current = currentTrackId;
  }, [currentTrackId]);

  // 1. Initial Capability Detection
  useEffect(() => {
    console.log('[CalmFallbackEngine] useEffect CapabilityDetection MOUNT/UPDATE sessionState:', sessionState);
    const detectCapabilities = async () => {
      try {
        const bestMode = await getBestARMode();
        if (bestMode === ARMode.LITE) {
          setSessionState(SessionState.AR_AVAILABLE_NO_ZONE);
          // Simulate surface detection for HUD feedback
          setTimeout(() => setSurfaceStatus('ready'), 2000);
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
    if (sessionState === SessionState.ACTIVE_SESSION) {
      timerRef.current = setInterval(() => setSessionTime(prev => prev + 1), 1000);

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 4000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
        ])
      ).start();
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

  // 4. Persistence (Atomic Save-on-Exit)
  useEffect(() => {
    return () => {
      if (isExiting.current) return;
      isExiting.current = true;

      const latestTime = finalSessionTime.current;
      if (latestTime >= 10) {
        addDoc(collection(db, 'users', userId, 'pets', petId, 'activityPoints'), {
          type: 'calm_session_complete',
          timestamp: serverTimestamp(),
          durationSeconds: latestTime,
          mode: 'fallback',
          trackId: finalTrackId.current
        }).catch(err => console.warn('[CalmFallback] Atomic save error:', err));
      }
    };
  }, []);

  const stateConfig = useMemo(() => {
    switch (sessionState) {
      case SessionState.AR_AVAILABLE_NO_ZONE:
        return { headerTitle: 'Create Calm Space', description: 'Point your camera at a stable surface', buttonVisible: false };
      case SessionState.NON_AR_MODE:
        return { headerTitle: 'Guided Calming Session', description: 'Follow the rhythm and stay close to your pet', buttonLabel: 'Start session', buttonVisible: true, variant: 'primary' };
      case SessionState.ACTIVE_SESSION:
        return { headerTitle: 'Calming in progress', description: 'Breathe slowly and reward calm behavior', buttonLabel: 'End session', buttonVisible: true, variant: 'secondary' };
      default:
        return { headerTitle: 'Preparing...', description: '', buttonVisible: false };
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
  container: { flex: 1, backgroundColor: '#0F172A', paddingHorizontal: 16 },
  header: { height: 'auto', alignItems: 'center', paddingVertical: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
  mainVisual: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  timerContainer: { height: 'auto', marginBottom: 24 },
  timerText: { fontSize: 32, fontWeight: '300', color: '#38BDF8' },
  lottieContainer: { width: width * 0.8, aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  animation: { width: '100%', height: '100%' },
  bottomBlock: { height: 'auto', alignItems: 'center', gap: 16 },
  description: { textAlign: 'center', color: '#94A3B8', fontSize: 16, lineHeight: 22, marginBottom: 12, fontWeight: '400' },
  button: { width: '100%', minHeight: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  primary: { backgroundColor: '#38BDF8' },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#38BDF8' },
  primaryText: { color: '#0F172A', fontWeight: '700', fontSize: 16 },
  secondaryText: { color: '#38BDF8', fontWeight: '700', fontSize: 16 },
  overlayContainer: { ...StyleSheet.absoluteFillObject, zIndex: 200, justifyContent: 'center', alignItems: 'center' },
  messageBox: { width: '80%', alignItems: 'center' },
  overlayText: { fontSize: 20, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', lineHeight: 26, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12 },
});

export default CalmFallbackEngine;
