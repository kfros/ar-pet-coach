import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { Audio } from 'expo-av';
import { 
  db, 
  collection, 
  addDoc, 
  serverTimestamp 
} from '../../services/firebaseConfig';
import { getBestARMode, ARMode } from '../../helpers/DeviceCheck';


const { width } = Dimensions.get('window');

/**
 * Session States for the Calm Session
 */
enum SessionState {
  INIT = 'INIT',
  AR_AVAILABLE_NO_ZONE = 'AR_AVAILABLE_NO_ZONE',
  AR_AVAILABLE_WITH_ZONE = 'AR_AVAILABLE_WITH_ZONE', // For persistence if needed
  NON_AR_MODE = 'NON_AR_MODE',
  ACTIVE_SESSION = 'ACTIVE_SESSION'
}

interface CalmFallbackEngineProps {
  userId: string;
  petId: string;
  onExit: () => void;
}

/**
 * Premium Calm Session Engine.
 * Provides a structured, high-quality guided session with optional AR capabilities.
 * Fixed audio bug: Unloads sound on exit to prevent "phantom" background audio.
 */
const CalmFallbackEngine: React.FC<CalmFallbackEngineProps> = ({
  userId,
  petId,
  onExit,
}) => {
  const insets = useSafeAreaInsets();
  const [sessionState, setSessionState] = useState<SessionState>(SessionState.INIT);
  const [sessionTime, setSessionTime] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Animation value for breathing rhythm
  const [pulseAnim] = useState(new Animated.Value(1));

  // 1. Initial Capability Detection
  useEffect(() => {
    const detectCapabilities = async () => {
      try {
        const bestMode = await getBestARMode();
        // User requested: if AR is available, start in NO_ZONE state
        // if not, fallback to NON_AR_MODE
        if (bestMode === ARMode.NATIVE || bestMode === ARMode.LITE) {
          setSessionState(SessionState.AR_AVAILABLE_NO_ZONE);
        } else {
          setSessionState(SessionState.NON_AR_MODE);
        }
      } catch (err) {
        console.warn('[CalmFallback] Capability detection failed, defaulting to LITE:', err);
        setSessionState(SessionState.NON_AR_MODE);
      }
    };

    if (sessionState === SessionState.INIT) {
      detectCapabilities();
    }
  }, [sessionState]);

  // 2. Session Logic & Audio Management
  useEffect(() => {
    if (sessionState === SessionState.ACTIVE_SESSION) {
      // Start Timer
      timerRef.current = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);

      // Start Ambient Audio
      const startAudio = async () => {
        try {
          const { sound } = await Audio.Sound.createAsync(
            require('../../assets/calming-ambient.mp3'),
            { shouldPlay: true, isLooping: true, volume: 0.5 }
          );
          soundRef.current = sound;
        } catch (e) {
          console.warn('[CalmFallback] Audio playback error:', e);
        }
      };
      startAudio();

      // Start Breathing Pulse Animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Stop and Unload if moved out of ACTIVE_SESSION
      cleanupAudio();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      cleanupAudio();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionState]);

  const cleanupAudio = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      } catch (e) {
        // Already unloaded or stopping error
      }
    }
  };

  // 3. Progress Tracking (Firestore Persistence)
  useEffect(() => {
    const saveProgress = async () => {
      if (sessionState === SessionState.ACTIVE_SESSION && sessionTime > 0 && sessionTime % 15 === 0) {
        try {
          await addDoc(collection(db, 'users', userId, 'pets', petId, 'activityPoints'), {
            type: 'calm_session_pulse',
            timestamp: serverTimestamp(),
            durationSeconds: sessionTime,
            mode: 'premium_fallback'
          });
        } catch (e) {
          console.error('[CalmFallback] Progress save error:', e);
        }
      }
    };
    saveProgress();
  }, [sessionTime, sessionState]);


  // UI Helper: Format Time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // State-specific configuration
  const stateConfig = useMemo(() => {
    switch (sessionState) {
      case SessionState.AR_AVAILABLE_NO_ZONE:
        return {
          title: 'Create Calm Space',
          description: 'Point your camera at a stable surface',
          hint: 'Find a stable surface (like the floor)',
          buttonVisible: false,
        };
      case SessionState.NON_AR_MODE:
        return {
          title: 'Guided Calming Session',
          description: 'Follow the rhythm and stay close to your pet',
          buttonLabel: 'Start session',
          buttonVisible: true,
          variant: 'primary',
        };
      case SessionState.ACTIVE_SESSION:
        return {
          title: 'Calming in progress',
          description: 'Breathe slowly and reward calm behavior',
          buttonLabel: 'End session',
          buttonVisible: true,
          variant: 'secondary',
        };
      default:
        return { title: 'Preparing...', description: '', buttonVisible: false };
    }
  }, [sessionState]);

  const handleAction = () => {
    if (sessionState === SessionState.NON_AR_MODE) {
      setSessionState(SessionState.ACTIVE_SESSION);
    } else if (sessionState === SessionState.ACTIVE_SESSION) {
      onExit();
    }
  };

  // Helper for "onUnstableSurface" - simulated for fallback
  // In a real Viro implementation this would trigger from plane finding events
  const onZonePlacedMock = () => {
    if (sessionState === SessionState.AR_AVAILABLE_NO_ZONE) {
      setSessionState(SessionState.ACTIVE_SESSION);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom || 16 }]}>
      {/* 1. Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{stateConfig.title}</Text>
      </View>

      {/* 2. Main Visual */}
      <View style={styles.mainVisual}>
        {/* Timer Overlay (Top Center) */}
        <View style={styles.timerOverlay}>
          <Text style={styles.timerText}>{formatTime(sessionTime)}</Text>
        </View>

        <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%', alignItems: 'center' }}>
          <View style={styles.lottieContainer}>
            <LottieView
              source={require('../../assets/animations/calm-pulse.json')}
              autoPlay
              loop
              style={styles.animation}
            />
          </View>
        </Animated.View>

        {/* Interaction layer for AR mock: Tap to place */}
        {sessionState === SessionState.AR_AVAILABLE_NO_ZONE && (
          <TouchableOpacity 
            activeOpacity={1} 
            style={StyleSheet.absoluteFill} 
            onPress={onZonePlacedMock}
          />
        )}
      </View>

      {/* 3. Bottom Block */}
      <View style={styles.bottomBlock}>
        <Text numberOfLines={2} style={styles.description}>
          {stateConfig.description}
        </Text>

        {stateConfig.hint && sessionState === SessionState.AR_AVAILABLE_NO_ZONE && (
          <Text style={styles.hintText}>{stateConfig.hint}</Text>
        )}

        {stateConfig.buttonVisible && (
          <TouchableOpacity 
            style={[
              styles.button, 
              stateConfig.variant === 'secondary' ? styles.secondaryButton : styles.primaryButton
            ]} 
            onPress={handleAction}
          >
            <Text style={[
              styles.buttonText,
              stateConfig.variant === 'secondary' ? styles.secondaryButtonText : styles.primaryButtonText
            ]}>
              {stateConfig.buttonLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // dark background
    paddingHorizontal: 16,
  },
  header: {
    height: 'auto',
    alignItems: 'center',
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9',
    textAlign: 'center',
  },
  mainVisual: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  timerOverlay: {
    position: 'absolute',
    top: 0,
    marginTop: -24, // offsetY: -24
    alignItems: 'center',
    zIndex: 10,
  },
  timerText: {
    fontSize: 36,
    fontWeight: '300',
    color: '#38BDF8', // Cyan-500
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 2,
  },
  lottieContainer: {
    width: width * 0.8, // maxWidth: "80%"
    aspectRatio: 1, // aspectRatio: 1
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(56, 189, 248, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.1)',
  },
  animation: {
    width: '85%',
    height: '85%',
  },
  bottomBlock: {
    height: 'auto',
    flexDirection: 'column',
    alignItems: 'center',
    paddingBottom: 8,
    gap: 16, // min_spacing_between_elements: 12
  },
  description: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  hintText: {
    color: '#64748B',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  button: {
    width: '100%', // width: 100%
    minHeight: 48, // minHeight: 48
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#38BDF8',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  primaryButtonText: {
    color: '#0F172A',
  },
  secondaryButtonText: {
    color: '#38BDF8',
  },
});

export default CalmFallbackEngine;

