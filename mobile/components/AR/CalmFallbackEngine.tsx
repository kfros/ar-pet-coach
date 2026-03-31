import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { Audio } from 'expo-av';
import { db, firestore } from '../../services/firebaseConfig';

interface CalmFallbackEngineProps {
  userId: string;
  petId: string;
  onExit: () => void;
}

/**
 * Premium Non-AR Calming Fallback.
 * Provides a stable, high-quality guided session for devices with AR/WebView limitations.
 */
const CalmFallbackEngine: React.FC<CalmFallbackEngineProps> = ({
  userId,
  petId,
  onExit,
}) => {
  const [sessionTime, setSessionTime] = useState(0);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // Initial setup: Load audio and start timer
  useEffect(() => {
    let timer = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);

    // Subtle pulsing animation for the "Mindfulness" element
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const loadAudio = async () => {
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          require('../../assets/calming-ambient.mp3'),
          { shouldPlay: true, isLooping: true, volume: 0.5 }
        );
        setSound(newSound);
      } catch (e) {
        console.warn('[CalmFallback] Audio load error - sound might be missing:', e);
      }
    };
    loadAudio();

    return () => {
      clearInterval(timer);
      if (sound) sound.unloadAsync();
    };
  }, []);

  // Save regular "Activity Points" to Firestore to maintain data continuity
  // even in non-AR mode. Indicates active participation in a session.
  useEffect(() => {
    const saveProgress = async () => {
      if (sessionTime > 0 && sessionTime % 10 === 0) { // Every 10 seconds
        try {
          await db.collection('users').doc(userId).collection('pets').doc(petId).collection('activityPoints').add({
            type: 'calm_session_pulse',
            timestamp: firestore.FieldValue.serverTimestamp(),
            durationSeconds: sessionTime,
            mode: 'lite_non_ar'
          });
        } catch (e) {
          console.error('[CalmFallback] Save error:', e);
        }
      }
    };
    saveProgress();
  }, [sessionTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Guided Calming Session</Text>
        <Text style={styles.timer}>{formatTime(sessionTime)}</Text>
      </View>

      <View style={styles.centerContent}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center' }}>
          <View style={styles.orb}>
            <LottieView
              source={require('../../assets/animations/calm-pulse.json')}
              autoPlay
              loop
              style={styles.animation}
            />
          </View>
        </Animated.View>
        
        <View style={styles.infoBox}>
          <Text style={styles.hint}>Starting a simplified calming session...</Text>
          <Text style={styles.subHint}>Focus on your pet's breathing while the ambient sound plays.</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.exitButton} onPress={onExit}>
        <Text style={styles.exitText}>Complete Session</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Deep navy
    justifyContent: 'space-between',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  timer: {
    fontSize: 32,
    fontWeight: '300',
    color: '#38BDF8',
    marginTop: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orb: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  animation: {
    width: 240,
    height: 240,
  },
  infoBox: {
    marginTop: 40,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  hint: {
    color: '#F1F5F9',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  subHint: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  exitButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 18,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#38BDF8',
    alignItems: 'center',
    marginBottom: 20,
  },
  exitText: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default CalmFallbackEngine;
