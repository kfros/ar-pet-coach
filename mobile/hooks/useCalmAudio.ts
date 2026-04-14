import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_TRACK_KEY = 'chillpup_last_played_audio_track';

export const CALM_TRACKS = [
  { id: 'calm_01', source: require('../assets/calm_01.mp3') },
  { id: 'calm_02', source: require('../assets/calm_02.mp3') },
  { id: 'calm_03', source: require('../assets/calm_03.mp3') },
  { id: 'calm_04', source: require('../assets/calm_04.mp3') },
];

export interface UseCalmAudio {
  currentTrackId: string | null;
  playRandomTrack: () => Promise<void>;
  stopAudio: () => Promise<void>;
  isPlaying: boolean;
}

/**
 * Standardized hook for calming audio playback across all engines.
 * Implements controlled random selection, crossfades, and volume ramping.
 *
 * IMPORTANT: Two cleanup paths exist:
 * - stopAudio(): Graceful fade-out (800ms). Call this BEFORE triggering navigation.
 * - hardCleanup(): Immediate synchronous kill. Used only in useEffect teardown
 *   to avoid accessing deallocated native views.
 */
export const useCalmAudio = (): UseCalmAudio => {
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const activeSound = useRef<Audio.Sound | null>(null);
  const fadingSound = useRef<Audio.Sound | null>(null);
  const isMounted = useRef(true);

  /**
   * Selection logic: avoid back-to-back repeats.
   */
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
   * Linear Volume Fade helper
   */
  const fadeVolume = async (sound: Audio.Sound, from: number, to: number, duration: number) => {
    const steps = 10;
    const interval = duration / steps;
    const stepValue = (to - from) / steps;

    for (let i = 1; i <= steps; i++) {
      console.log('[useCalmAudio] fadeVolume step', i, 'of', steps);
      if (!isMounted.current) break;
      const vol = from + (stepValue * i);
      try {
        console.log('[useCalmAudio] setting volume to', Math.max(0, Math.min(0.25, vol)));
        await sound.setStatusAsync({ volume: Math.max(0, Math.min(0.25, vol)) });
        console.log('[useCalmAudio] volume set to', Math.max(0, Math.min(0.25, vol)));
      } catch (e) {
        // Sound might be unloaded during fade
        console.error('[useCalmAudio] error during fadeVolume:', e);
        break;
      }
      console.log('[useCalmAudio] waiting', interval, 'ms before next fade step');
      await new Promise(r => setTimeout(r, interval));
      console.log('[useCalmAudio] fadeVolume step', i, 'completed');
    }
    console.log('[useCalmAudio] fadeVolume completed');
  };

  /**
   * Standardized play logic
   */
  const playTrack = useCallback(async (track: typeof CALM_TRACKS[0], isCrossfade = false) => {
    try {
      if (!isMounted.current) return;

      const { sound } = await Audio.Sound.createAsync(
        track.source,
        {
          shouldPlay: true,
          volume: 0, // Always start at 0 for fade-in
          isLooping: false,
        }
      );

      if (!isMounted.current) {
        sound.unloadAsync();
        return;
      }

      const previousSound = activeSound.current;
      activeSound.current = sound;
      setCurrentTrackId(track.id);
      setIsPlaying(true);

      // Recursive random selection on finish
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish && isMounted.current) {
          handleTrackEnd();
        }
      });

      if (isCrossfade && previousSound) {
        fadingSound.current = previousSound;
        Promise.all([
          fadeVolume(sound, 0, 0.25, 800),
          fadeVolume(previousSound, 0.25, 0, 800).then(() => {
            previousSound.unloadAsync();
            if (fadingSound.current === previousSound) fadingSound.current = null;
          })
        ]);
      } else {
        await fadeVolume(sound, 0, 0.25, 1200);
      }
    } catch (e) {
      console.warn('[useCalmAudio] Audio play error:', e);
    }
  }, []);

  const handleTrackEnd = async () => {
    if (!isMounted.current) return;
    const nextTrack = await selectNextTrackId();
    await playTrack(nextTrack, true);
  };

  const playRandomTrack = async () => {
    const track = await selectNextTrackId();
    await playTrack(track, false);
  };

  /**
   * Graceful stop with fade-out (800ms).
   * Called explicitly by engine handleExit() BEFORE triggering onExit/navigation.
   * MUST complete before the component tree unmounts.
   */
  const stopAudio = async () => {
    console.log('[useCalmAudio] entering stopAudio');
    setIsPlaying(false);

    if (activeSound.current) {
      const s = activeSound.current;
      activeSound.current = null;
      // Detach the playback listener to prevent recursive track starts
      s.setOnPlaybackStatusUpdate(null);
      console.log('[useCalmAudio] playback listener detachtd');
      try {
        // Only fade if still mounted (graceful exit path)
        if (isMounted.current) {
          console.log('[useCalmAudio] fading out');
          await fadeVolume(s, 0.25, 0, 800);
          console.log('[useCalmAudio] fade complete');
        }
        await s.unloadAsync();
      } catch (e) {
        console.error('[useCalmAudio] error unloading:', e);
      }
    }

    if (fadingSound.current) {
      const f = fadingSound.current;
      fadingSound.current = null;
      try {
        console.log('[useCalmAudio] unloading fadingSound');
        await f.unloadAsync();
        console.log('[useCalmAudio] fadingSound unloaded');
      } catch (e) {
        console.error('[useCalmAudio] error fading:', e)
      }
    }
  };

  /**
   * Emergency synchronous cleanup. Called ONLY during useEffect teardown.
   * Does NOT fade — immediately kills all audio to avoid EXC_BAD_ACCESS
   * from accessing deallocated native views.
   */
  const hardCleanup = () => {
    if (activeSound.current) {
      const s = activeSound.current;
      activeSound.current = null;
      s.setOnPlaybackStatusUpdate(null);
      s.unloadAsync().catch(() => {
        console.error('[useCalmAudio] error unloading activeSound in hardCleanup()');
      });
    }
    if (fadingSound.current) {
      const f = fadingSound.current;
      fadingSound.current = null;
      f.unloadAsync().catch(() => {
        console.error('[useCalmAudio] error unloading fadingSound in hardCleanup()');
      });
    }
  };

  useEffect(() => {
    console.log('[useCalmAudio] useEffect MOUNT/UPDATE');
    isMounted.current = true;

    // Standard audio mode configuration for Expo
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });

    return () => {
      console.log('[useCalmAudio] useEffect UNMOUNT/CLEANUP');
      isMounted.current = false;
      // Synchronous hard cleanup — no async fades during teardown
      hardCleanup();
    };
  }, []);

  return {
    currentTrackId,
    playRandomTrack,
    stopAudio,
    isPlaying,
  };
};
