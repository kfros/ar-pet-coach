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

  // 1. Loading Strategy: Optimized Preload
  useEffect(() => {
    let isMounted = true;

    const preload = async () => {
      try {
        console.log('[useCalmAudio] Starting audio configuration...');
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          playThroughEarpieceAndroid: false,
        });

        // 1. First, load a single track to be ready ASAP
        // We prioritize the smaller tracks if possible, but for now we follow CALM_TRACKS order
        // but we don't block the whole session on ALL tracks.
        for (const track of CALM_TRACKS) {
          if (!isMounted) break;
          
          try {
            console.log(`[useCalmAudio] Preloading ${track.id}...`);
            const { sound } = await Audio.Sound.createAsync(
              track.source,
              { shouldPlay: false, volume: 0 },
              undefined,
              false // downloadFirst: false to avoid blocking for huge files
            );
            
            if (isMounted) {
              soundsMap.current.set(track.id, sound);
              console.log(`[useCalmAudio] ${track.id} loaded successfully.`);
            } else {
              sound.unloadAsync();
            }
          } catch (trackError) {
            console.warn(`[useCalmAudio] Failed to load ${track.id}:`, trackError);
          }
        }
      } catch (e) {
        console.warn('[useCalmAudio] Global audio init error:', e);
      }
    };

    preload();

    return () => {
      isMounted = false;
      const unloadAll = async () => {
        console.log('[useCalmAudio] Unloading all sounds...');
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
    const steps = 30; // Slightly reduced steps for better performance on slow devices
    const interval = duration / steps;
    const stepValue = (to - from) / steps;

    for (let i = 1; i <= steps; i++) {
      try {
        const vol = Math.max(0, Math.min(1, from + (stepValue * i)));
        await sound.setStatusAsync({ volume: vol });
      } catch (e) { break; }
      await new Promise(r => setTimeout(r, interval));
    }
  }, []);

  /**
   * Core randomized selection with memory (no immediate repeat)
   */
  const selectNextTrackId = useCallback(async (lastPlayedId: string | null) => {
    // Only pick from ALREADY LOADED tracks
    const loadedTrackIds = Array.from(soundsMap.current.keys());
    
    if (loadedTrackIds.length === 0) return null;

    const available = loadedTrackIds.filter(id => id !== lastPlayedId);
    if (available.length === 0) return loadedTrackIds[0];
    
    const selectedId = available[Math.floor(Math.random() * available.length)];
    return selectedId;
  }, []);

  /**
   * Main Play Engine
   */
  const playTrack = useCallback(async (trackId: string, isCrossfade = false) => {
    if (isTransitioning.current) return;

    const sound = soundsMap.current.get(trackId);
    if (!sound) {
      console.warn(`[useCalmAudio] Cannot play ${trackId}: sound not in map.`);
      return;
    }

    try {
      isTransitioning.current = true;
      const previousSound = activeSound.current;

      console.log(`[useCalmAudio] Preparing to play ${trackId}...`);
      
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
          console.log(`[useCalmAudio] Track ${trackId} finished. Picking next...`);
          handleNext();
        }
      });

      await sound.playAsync();
      console.log(`[useCalmAudio] ${trackId} playback started.`);

      if (isCrossfade && previousSound) {
        fadingSound.current = previousSound;
        await Promise.all([
          fadeVolume(sound, 0, DEFAULT_VOLUME, CROSSFADE_DURATION),
          fadeVolume(previousSound, DEFAULT_VOLUME, 0, CROSSFADE_DURATION).then(async () => {
            try {
              await previousSound.stopAsync();
            } catch (e) {}
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
    if (nextId) {
      await playTrack(nextId, true);
    }
  }, [selectNextTrackId, playTrack]);

  /**
   * Session Lifecycle Control
   */
  const stopAudio = useCallback(async () => {
    if (activeSound.current) {
      const s = activeSound.current;
      activeSound.current = null;
      console.log('[useCalmAudio] Stopping audio session...');
      try {
        await fadeVolume(s, DEFAULT_VOLUME, 0, FADE_OUT_DURATION);
        await s.stopAsync();
      } catch (e) {}
      setIsPlaying(false);
      setCurrentTrackId(null);
    }
  }, [fadeVolume]);

  useEffect(() => {
    let active = true;

    if (isActive) {
      const start = async () => {
        console.log('[useCalmAudio] Session active. Waiting for at least one track to load...');
        
        // Wait for AT LEAST ONE track to load
        let attempts = 0;
        while (soundsMap.current.size === 0 && attempts < 20 && active) {
          await new Promise(r => setTimeout(r, 250));
          attempts++;
        }

        if (!active) return;

        if (soundsMap.current.size === 0) {
          console.warn('[useCalmAudio] No tracks loaded after 5 seconds. Audio will not play.');
          return;
        }

        const lastId = await AsyncStorage.getItem(LAST_TRACK_KEY);
        const nextId = await selectNextTrackId(lastId);
        
        if (nextId && active) {
          await playTrack(nextId, false);
        }
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
