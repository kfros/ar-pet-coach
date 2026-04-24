import { useEffect, useRef, useState, useCallback } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CALM_TRACKS = [
  { id: 'calm_01', source: require('../assets/calm_01.mp3') },
  { id: 'calm_02', source: require('../assets/calm_02.mp3') },
  { id: 'calm_03', source: require('../assets/calm_03.mp3') },
  { id: 'calm_04', source: require('../assets/calm_04.mp3') },
];

const LAST_TRACK_KEY = 'chillpup_last_played_audio_track';
const DEFAULT_VOLUME = 0.25;
const FADE_IN_DURATION = 1200;
const FADE_OUT_DURATION = 800;
const CROSSFADE_DURATION = 1500;

/**
 * Premium Audio Hook for the Calm AR session.
 * Handles preloading, sequential randomization with cross-session memory,
 * and smooth transitions using expo-av.
 */
export const useCalmAudio = (isActive: boolean) => {
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const activeSound = useRef<Audio.Sound | null>(null);
  const fadingSound = useRef<Audio.Sound | null>(null);
  const soundsMap = useRef<Map<string, Audio.Sound>>(new Map());
  const isTransitioning = useRef(false);

  // 1. Loading Strategy: Preload all tracks on session start
  useEffect(() => {
    let isMounted = true;

    const preload = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          playThroughEarpieceAndroid: false,
        });

        for (const track of CALM_TRACKS) {
          const { sound } = await Audio.Sound.createAsync(
            track.source,
            { shouldPlay: false, volume: 0 },
            undefined,
            true
          );
          if (isMounted) {
            soundsMap.current.set(track.id, sound);
          } else {
            sound.unloadAsync();
          }
        }
      } catch (e) {
        console.warn('[useCalmAudio] Preload error:', e);
      }
    };

    preload();

    return () => {
      isMounted = false;
      // Fade out and stop on exit
      const unloadAll = async () => {
        const cleanupPromises = Array.from(soundsMap.current.values()).map(async (sound) => {
          try {
            await sound.stopAsync();
            await sound.unloadAsync();
          } catch (e) { }
        });
        await Promise.all(cleanupPromises);
        soundsMap.current.clear();
      };
      unloadAll();
    };
  }, []);

  /**
   * Linear Volume Fade helper
   */
  const fadeVolume = useCallback(async (sound: Audio.Sound, from: number, to: number, duration: number) => {
    const steps = 15;
    const interval = duration / steps;
    const stepValue = (to - from) / steps;

    for (let i = 1; i <= steps; i++) {
      const vol = Math.max(0, Math.min(1, from + (stepValue * i)));
      await sound.setStatusAsync({ volume: vol });
      await new Promise(r => setTimeout(r, interval));
    }
  }, []);

  /**
   * Core randomized selection with memory (no immediate repeat)
   */
  const selectNextTrackId = useCallback(async (lastPlayedId: string | null) => {
    const available = CALM_TRACKS.filter(t => t.id !== lastPlayedId);
    if (available.length === 0) return CALM_TRACKS[0].id;
    const selected = available[Math.floor(Math.random() * available.length)];
    return selected.id;
  }, []);

  /**
   * Main Play Engine
   */
  const playTrack = useCallback(async (trackId: string, isCrossfade = false) => {
    if (isTransitioning.current) return;

    const sound = soundsMap.current.get(trackId);
    if (!sound) return;

    try {
      isTransitioning.current = true;
      const previousSound = activeSound.current;

      // Setup next track
      await sound.setPositionAsync(0);
      await sound.setStatusAsync({ volume: 0, isLooping: false });

      // Update state
      activeSound.current = sound;
      setCurrentTrackId(trackId);
      setIsPlaying(true);
      await AsyncStorage.setItem(LAST_TRACK_KEY, trackId);

      // Handle track end loop
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          handleNext();
        }
      });

      await sound.playAsync();

      if (isCrossfade && previousSound) {
        fadingSound.current = previousSound;
        await Promise.all([
          fadeVolume(sound, 0, DEFAULT_VOLUME, CROSSFADE_DURATION),
          fadeVolume(previousSound, DEFAULT_VOLUME, 0, CROSSFADE_DURATION).then(async () => {
            await previousSound.stopAsync();
            fadingSound.current = null;
          })
        ]);
      } else {
        await fadeVolume(sound, 0, DEFAULT_VOLUME, FADE_IN_DURATION);
      }

      isTransitioning.current = false;
    } catch (e) {
      console.warn('[useCalmAudio] Play error:', e);
      isTransitioning.current = false;
    }
  }, [fadeVolume]);

  const handleNext = useCallback(async () => {
    const lastId = await AsyncStorage.getItem(LAST_TRACK_KEY);
    const nextId = await selectNextTrackId(lastId);
    await playTrack(nextId, true);
  }, [selectNextTrackId, playTrack]);

  /**
   * Session Lifecycle Control
   */
  const stopAudio = useCallback(async () => {
    if (activeSound.current) {
      const s = activeSound.current;
      activeSound.current = null;
      await fadeVolume(s, DEFAULT_VOLUME, 0, FADE_OUT_DURATION);
      await s.stopAsync();
      setIsPlaying(false);
      setCurrentTrackId(null);
    }
  }, [fadeVolume]);

  useEffect(() => {
    let active = true;

    if (isActive) {
      const start = async () => {
        // Wait a bit for preloading to finish if necessary
        let attempts = 0;
        while (soundsMap.current.size < 4 && attempts < 10 && active) {
          await new Promise(r => setTimeout(r, 200));
          attempts++;
        }

        if (!active) return;

        const lastId = await AsyncStorage.getItem(LAST_TRACK_KEY);
        const nextId = await selectNextTrackId(lastId);
        await playTrack(nextId, false);
      };
      start();
    } else {
      stopAudio();
    }

    return () => { active = false; };
  }, [isActive, fadeVolume, playTrack, selectNextTrackId, stopAudio]);

  return {
    currentTrackId,
    isPlaying,
    handleNext,
    stopAudio
  };
};
