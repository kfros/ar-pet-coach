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
 */
export const useCalmAudio = (): UseCalmAudio => {
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const activeSound = useRef<Audio.Sound | null>(null);
  const fadingSound = useRef<Audio.Sound | null>(null);
  const isMounted = useRef(true);

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

  const fadeVolume = async (sound: Audio.Sound, from: number, to: number, duration: number) => {
    const steps = 10;
    const interval = duration / steps;
    const stepValue = (to - from) / steps;

    for (let i = 1; i <= steps; i++) {
      if (!isMounted.current) break;
      const vol = from + (stepValue * i);
      try {
        await sound.setStatusAsync({ volume: Math.max(0, Math.min(0.25, vol)) });
      } catch (e) {
        break;
      }
      await new Promise(r => setTimeout(r, interval));
    }
  };

  const playTrack = useCallback(async (track: typeof CALM_TRACKS[0], isCrossfade = false) => {
    try {
      if (!isMounted.current) return;

      const { sound } = await Audio.Sound.createAsync(
        track.source,
        {
          shouldPlay: true,
          volume: 0,
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

  const stopAudio = async () => {
    setIsPlaying(false);
    if (activeSound.current) {
      const s = activeSound.current;
      activeSound.current = null;
      s.setOnPlaybackStatusUpdate(null);
      try {
        if (isMounted.current) {
          await fadeVolume(s, 0.25, 0, 800);
        }
        await s.unloadAsync();
      } catch (e) {}
    }

    if (fadingSound.current) {
      const f = fadingSound.current;
      fadingSound.current = null;
      try {
        await f.unloadAsync();
      } catch (e) {}
    }
  };

  const hardCleanup = () => {
    if (activeSound.current) {
      const s = activeSound.current;
      activeSound.current = null;
      s.setOnPlaybackStatusUpdate(null);
      s.unloadAsync().catch(() => {});
    }
    if (fadingSound.current) {
      const f = fadingSound.current;
      fadingSound.current = null;
      f.unloadAsync().catch(() => {});
    }
  };

  useEffect(() => {
    isMounted.current = true;
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
    return () => {
      isMounted.current = false;
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
