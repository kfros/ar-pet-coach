import { useContext } from 'react';
import { AudioPlaybackContext, AudioPlaybackContextValue } from './AudioPlaybackProvider';

/**
 * Hook to access the ChillPup audio playback controller.
 * Must be used within an AudioPlaybackProvider.
 */
export function useAudioPlayback(): AudioPlaybackContextValue {
  const context = useContext(AudioPlaybackContext);
  if (!context) {
    throw new Error('useAudioPlayback must be used within an AudioPlaybackProvider');
  }
  return context;
}
