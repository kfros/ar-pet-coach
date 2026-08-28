import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { APPROVED_AUDIO_TRACK, AudioAsset } from '../appContent/audioAssets';

export type PlaybackStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error';

export interface AudioPlaybackState {
  track: AudioAsset;
  status: PlaybackStatus;
  isLoaded: boolean;
  isBuffering: boolean;
  isPlaying: boolean;
  currentTimeSeconds: number;
  durationSeconds: number;
  errorMessage: string | null;
}

export interface AudioPlaybackContextValue extends AudioPlaybackState {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  retry: () => Promise<void>;
}

export const AudioPlaybackContext = createContext<AudioPlaybackContextValue | null>(null);

interface AudioPlaybackProviderProps {
  children: ReactNode;
}

export function AudioPlaybackProvider({ children }: AudioPlaybackProviderProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isConfiguringAudioMode = useRef(false);
  const commandInFlight = useRef(false);

  // Single player instance owned by the provider using useAudioPlayer for automatic lifecycle management
  const player = useAudioPlayer(APPROVED_AUDIO_TRACK.source, {
    updateInterval: 500,
  });

  const playerStatus = useAudioPlayerStatus(player);

  // Configure global audio mode once
  const initAudioMode = useCallback(async () => {
    if (isConfiguringAudioMode.current) return;
    isConfiguringAudioMode.current = true;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
      });
    } catch (e: any) {
      console.warn('[AudioPlaybackProvider] Failed to configure audio mode:', e);
      setErrorMessage('Failed to configure audio session.');
    } finally {
      isConfiguringAudioMode.current = false;
    }
  }, []);

  useEffect(() => {
    initAudioMode();
  }, [initAudioMode]);

  // Configure loop for the approved offline source
  useEffect(() => {
    try {
      if (player) {
        player.loop = true;
      }
    } catch (e) {
      console.warn('[AudioPlaybackProvider] Error setting player loop:', e);
    }
  }, [player]);

  // Teardown cleanup: Clear lock-screen controls (relying on useAudioPlayer for player disposal)
  useEffect(() => {
    return () => {
      try {
        if (player && typeof player.clearLockScreenControls === 'function') {
          player.clearLockScreenControls();
        } else if (player && typeof player.setActiveForLockScreen === 'function') {
          player.setActiveForLockScreen(false);
        }
      } catch (e) {
        // Silently catch teardown errors to prevent unhandled rejections
      }
    };
  }, [player]);

  const isLoaded = playerStatus?.isLoaded ?? player?.isLoaded ?? false;
  const isBuffering = playerStatus?.isBuffering ?? player?.isBuffering ?? false;
  const isPlaying = playerStatus?.playing ?? player?.playing ?? false;
  const currentTimeSeconds = playerStatus?.currentTime ?? player?.currentTime ?? 0;
  const durationSeconds = playerStatus?.duration && playerStatus.duration > 0
    ? playerStatus.duration
    : APPROVED_AUDIO_TRACK.durationSeconds;

  let computedStatus: PlaybackStatus = 'ready';
  if (errorMessage) {
    computedStatus = 'error';
  } else if (!isLoaded) {
    computedStatus = 'loading';
  } else if (isPlaying) {
    computedStatus = 'playing';
  } else if (currentTimeSeconds > 0) {
    computedStatus = 'paused';
  } else {
    computedStatus = 'ready';
  }

  const play = useCallback(async () => {
    if (commandInFlight.current) return;
    if (errorMessage) return;
    if (!player) return;

    commandInFlight.current = true;
    try {
      // Activate lock-screen controls immediately before/as playback begins
      if (typeof player.setActiveForLockScreen === 'function') {
        player.setActiveForLockScreen(
          true,
          {
            title: APPROVED_AUDIO_TRACK.displayTitle,
            artist: APPROVED_AUDIO_TRACK.artist,
            albumTitle: APPROVED_AUDIO_TRACK.album,
          },
          {
            showSeekBackward: false,
            showSeekForward: false,
          }
        );
      }
      player.play();
    } catch (e: any) {
      console.warn('[AudioPlaybackProvider] Play error:', e);
      setErrorMessage('Audio playback failed.');
    } finally {
      commandInFlight.current = false;
    }
  }, [player, errorMessage]);

  const pause = useCallback(async () => {
    if (commandInFlight.current) return;
    if (!player) return;

    commandInFlight.current = true;
    try {
      player.pause();
    } catch (e: any) {
      console.warn('[AudioPlaybackProvider] Pause error:', e);
    } finally {
      commandInFlight.current = false;
    }
  }, [player]);

  const stop = useCallback(async () => {
    if (commandInFlight.current) return;
    if (!player) return;

    commandInFlight.current = true;
    try {
      player.pause();
      if (typeof player.seekTo === 'function') {
        await player.seekTo(0);
      }
      if (typeof player.clearLockScreenControls === 'function') {
        player.clearLockScreenControls();
      } else if (typeof player.setActiveForLockScreen === 'function') {
        player.setActiveForLockScreen(false);
      }
    } catch (e: any) {
      console.warn('[AudioPlaybackProvider] Stop error:', e);
    } finally {
      commandInFlight.current = false;
    }
  }, [player]);

  const seekTo = useCallback(async (seconds: number) => {
    if (!Number.isFinite(seconds) || Number.isNaN(seconds)) {
      return;
    }
    if (!player || typeof player.seekTo !== 'function') return;

    const clamped = Math.max(0, Math.min(seconds, durationSeconds));
    try {
      await player.seekTo(clamped);
    } catch (e: any) {
      console.warn('[AudioPlaybackProvider] Seek error:', e);
    }
  }, [player, durationSeconds]);

  const retry = useCallback(async () => {
    setErrorMessage(null);
    try {
      await initAudioMode();
    } catch (e: any) {
      console.warn('[AudioPlaybackProvider] Retry error:', e);
      setErrorMessage('Failed to configure audio session.');
    }
  }, [initAudioMode]);

  const contextValue: AudioPlaybackContextValue = {
    track: APPROVED_AUDIO_TRACK,
    status: computedStatus,
    isLoaded,
    isBuffering,
    isPlaying,
    currentTimeSeconds,
    durationSeconds,
    errorMessage,
    play,
    pause,
    stop,
    seekTo,
    retry,
  };

  return (
    <AudioPlaybackContext.Provider value={contextValue}>
      {children}
    </AudioPlaybackContext.Provider>
  );
}
