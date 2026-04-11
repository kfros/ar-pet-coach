import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, Dimensions, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  db, 
  collection, 
  addDoc, 
  serverTimestamp 
} from '../../services/firebaseConfig';
import { getBestARMode, ARMode, isLowPerformanceDevice } from '../../helpers/DeviceCheck';

const { width } = Dimensions.get('window');

/**
 * Audio tracks for the calming session
 */
const CALM_TRACKS = [
  { id: 'calm_01', source: require('../../assets/calm_01.mp3') },
  { id: 'calm_02', source: require('../../assets/calm_02.mp3') },
  { id: 'calm_03', source: require('../../assets/calm_03.mp3') },
  { id: 'calm_04', source: require('../../assets/calm_04.mp3') },
];

/**
 * Session States for the Calm Session
 */
enum SessionState {
  INIT = 'INIT',
  AR_AVAILABLE_NO_ZONE = 'AR_AVAILABLE_NO_ZONE',
  AR_AVAILABLE_WITH_ZONE = 'AR_AVAILABLE_WITH_ZONE',
  NON_AR_MODE = 'NON_AR_MODE',
  ACTIVE_SESSION = 'ACTIVE_SESSION'
}

interface CalmFallbackEngineProps {
  userId: string;
  petId: string;
  onExit: () => void;
}

const CALM_FIRST_TIME_KEY = 'chillpup_calm_has_seen_instructions';
const LAST_TRACK_KEY = 'chillpup_last_played_audio_track';

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
      <View style={styles.overlayDimmer} />
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
const CalmFallbackEngine: React.FC<CalmFallbackEngineProps> = ({
  userId,
  petId,
  onExit,
}) => {
  const insets = useSafeAreaInsets();
  const [sessionState, setSessionState] = useState<SessionState>(SessionState.INIT);
  const [sessionTime, setSessionTime] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  
  // Track management
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const activeSound = useRef<Audio.Sound | null>(null);
  const fadingSound = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));

  // 1. Initial Capability Detection
  useEffect(() => {
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

  // 2. Audio Selection & Controlled Random
  const selectNextTrackId = async () => {
    try {
      const lastTrackId = await AsyncStorage.getItem(LAST_TRACK_KEY);
      const availableTracks = CALM_TRACKS.filter(t => t.id !== lastTrackId);
      const selected = availableTracks[Math.floor(Math.random() * availableTracks.length)];
      await AsyncStorage.setItem(LAST_TRACK_KEY, selected.id);
      return selected;
    } catch (e) {
      return CALM_TRACKS[0];
    }
  };

  /**
   * Linear Volume Fade
   */
  const fadeVolume = async (sound: Audio.Sound, from: number, to: number, duration: number) => {
    const steps = 10;
    const interval = duration / steps;
    const stepValue = (to - from) / steps;
    
    for (let i = 1; i <= steps; i++) {
      const vol = from + (stepValue * i);
      await sound.setStatusAsync({ volume: Math.max(0, Math.min(0.4, vol)) });
      await new Promise(r => setTimeout(r, interval));
    }
  };

  /**
   * Main audio playback logic with crossfade support
   */
  const playTrack = async (track: typeof CALM_TRACKS[0], isCrossfade = false) => {
    try {
      const isLowPerf = await isLowPerformanceDevice();
      
      const { sound } = await Audio.Sound.createAsync(
        track.source,
        { 
          shouldPlay: true, 
          volume: isCrossfade ? 0 : 0, 
          isLooping: false, // We handle manual transition for random shift
        },
        null, // onPlaybackStatusUpdate will be set after
        !isLowPerf // preload if not low performance
      );

      const previousSound = activeSound.current;
      activeSound.current = sound;
      setCurrentTrackId(track.id);

      // Handle monitor current track end
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          handleTrackEnd();
        }
      });

      if (isCrossfade && previousSound) {
        fadingSound.current = previousSound;
        // Parallel crossfade
        Promise.all([
          fadeVolume(sound, 0, 0.25, 800),
          fadeVolume(previousSound, 0.25, 0, 800).then(() => {
            previousSound.unloadAsync();
            fadingSound.current = null;
          })
        ]);
      } else {
        await fadeVolume(sound, 0, 0.25, 1200);
      }
    } catch (e) {
      console.warn('[CalmFallback] Audio play error:', e);
    }
  };

  const handleTrackEnd = async () => {
    const nextTrack = await selectNextTrackId();
    await playTrack(nextTrack, true);
  };

  const stopAudio = async () => {
    if (activeSound.current) {
      const s = activeSound.current;
      activeSound.current = null;
      await fadeVolume(s, 0.25, 0, 800);
      await s.unloadAsync();
    }
    if (fadingSound.current) {
      await fadingSound.current.unloadAsync();
      fadingSound.current = null;
    }
  };

  // 3. Lifecycle Management
  useEffect(() => {
    if (sessionState === SessionState.ACTIVE_SESSION) {
      timerRef.current = setInterval(() => setSessionTime(prev => prev + 1), 1000);
      
      const initAudio = async () => {
        const track = await selectNextTrackId();
        await playTrack(track, false);
      };
      initAudio();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 4000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      stopAudio();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      stopAudio();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionState]);

  // 4. Persistence
  useEffect(() => {
    const saveProgress = async () => {
      if (sessionTime > 0 && sessionTime % 15 === 0 && sessionState === SessionState.ACTIVE_SESSION) {
        try {
          await addDoc(collection(db, 'users', userId, 'pets', petId, 'activityPoints'), {
            type: 'calm_session_pulse',
            timestamp: serverTimestamp(),
            durationSeconds: sessionTime,
            mode: 'premium_fallback',
            trackId: currentTrackId
          });
        } catch (e) {}
      }
    };
    saveProgress();
  }, [sessionTime, sessionState]);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom || 16 }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{stateConfig.headerTitle}</Text>
      </View>
      <View style={styles.mainVisual}>
        <View style={styles.timerContainer}><Text style={styles.timerText}>{formatTime(sessionTime)}</Text></View>
        <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center' }}>
          <View style={styles.lottieContainer}>
            <LottieView source={require('../../assets/animations/calm-pulse.json')} autoPlay loop style={styles.animation} />
          </View>
        </Animated.View>
        {sessionState === SessionState.AR_AVAILABLE_NO_ZONE && <Pressable style={StyleSheet.absoluteFill} onPress={() => setSessionState(SessionState.ACTIVE_SESSION)} />}
      </View>
      <View style={styles.bottomBlock}>
        <Text numberOfLines={2} style={styles.description}>{stateConfig.description}</Text>
        {stateConfig.buttonVisible && (
          <TouchableOpacity style={[styles.button, stateConfig.variant === 'secondary' ? styles.secondary : styles.primary]} onPress={() => sessionState === SessionState.NON_AR_MODE ? (setSessionState(SessionState.ACTIVE_SESSION), setShowOverlay(true)) : onExit()}>
            <Text style={stateConfig.variant === 'secondary' ? styles.secondaryText : styles.primaryText}>{stateConfig.buttonLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
      {showOverlay && <CalmFallbackOverlay onComplete={() => setShowOverlay(false)} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', paddingHorizontal: 16 },
  header: { height: 'auto', alignItems: 'center', paddingVertical: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  mainVisual: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  timerContainer: { height: 'auto', marginBottom: 24 },
  timerText: { fontSize: 32, fontWeight: '300', color: '#38BDF8', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  lottieContainer: { width: width * 0.8, aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  animation: { width: '100%', height: '100%' },
  bottomBlock: { height: 'auto', alignItems: 'center', gap: 16 },
  description: { textAlign: 'center', color: '#94A3B8', fontSize: 16, lineHeight: 22, marginBottom: 12 },
  button: { width: '100%', minHeight: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  primary: { backgroundColor: '#38BDF8' },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#38BDF8' },
  primaryText: { color: '#0F172A', fontWeight: 'bold', fontSize: 16 },
  secondaryText: { color: '#38BDF8', fontWeight: 'bold', fontSize: 16 },
  overlayContainer: { ...StyleSheet.absoluteFillObject, zIndex: 200, justifyContent: 'center', alignItems: 'center' },
  overlayDimmer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000', opacity: 0.2 },
  messageBox: { width: '80%', alignItems: 'center' },
  overlayText: { fontSize: 20, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', lineHeight: 26, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12 },
});

export default CalmFallbackEngine;
