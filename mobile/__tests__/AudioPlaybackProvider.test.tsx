import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { Text, Pressable, View } from 'react-native';
import { AudioPlaybackProvider } from '../audio/AudioPlaybackProvider';
import { useAudioPlayback } from '../audio/useAudioPlayback';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

// Test consumer component
function TestAudioConsumer() {
  const {
    track,
    status,
    isPlaying,
    isLoaded,
    currentTimeSeconds,
    durationSeconds,
    errorMessage,
    play,
    pause,
    stop,
    seekTo,
    retry,
  } = useAudioPlayback();

  return (
    <View testID="audio-consumer">
      <Text testID="track-title">{track.displayTitle}</Text>
      <Text testID="status">{status}</Text>
      <Text testID="is-playing">{isPlaying ? 'true' : 'false'}</Text>
      <Text testID="is-loaded">{isLoaded ? 'true' : 'false'}</Text>
      <Text testID="current-time">{currentTimeSeconds}</Text>
      <Text testID="duration">{durationSeconds}</Text>
      <Text testID="error-message">{errorMessage || 'none'}</Text>
      <Pressable testID="btn-play" onPress={() => play()} />
      <Pressable testID="btn-pause" onPress={() => pause()} />
      <Pressable testID="btn-stop" onPress={() => stop()} />
      <Pressable testID="btn-seek-valid" onPress={() => seekTo(120)} />
      <Pressable testID="btn-seek-negative" onPress={() => seekTo(-50)} />
      <Pressable testID="btn-seek-overflow" onPress={() => seekTo(5000)} />
      <Pressable testID="btn-seek-nan" onPress={() => seekTo(NaN)} />
      <Pressable testID="btn-retry" onPress={() => retry()} />
    </View>
  );
}

describe('AudioPlaybackProvider & useAudioPlayback (CP-AUDIO-003)', () => {
  let mockPlayer: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPlayer = {
      id: 1,
      playing: false,
      loop: false,
      isLoaded: true,
      isBuffering: false,
      currentTime: 0,
      duration: 1296.953469,
      play: jest.fn(),
      pause: jest.fn(),
      seekTo: jest.fn(() => Promise.resolve()),
      setActiveForLockScreen: jest.fn(),
      clearLockScreenControls: jest.fn(),
      remove: jest.fn(),
    };

    (useAudioPlayer as jest.Mock).mockReturnValue(mockPlayer);
    (useAudioPlayerStatus as jest.Mock).mockImplementation((p) => ({
      isLoaded: mockPlayer.isLoaded,
      playing: mockPlayer.playing,
      isBuffering: mockPlayer.isBuffering,
      currentTime: mockPlayer.currentTime,
      duration: mockPlayer.duration,
    }));
  });

  test('initial mount configures global audio mode once and enables native loop without autoplay', async () => {
    const { getByTestId } = render(
      <AudioPlaybackProvider>
        <TestAudioConsumer />
      </AudioPlaybackProvider>
    );

    await act(async () => {});

    expect(setAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(setAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    });

    expect(mockPlayer.loop).toBe(true);
    expect(mockPlayer.play).not.toHaveBeenCalled();
    expect(getByTestId('is-playing').props.children).toBe('false');
    expect(getByTestId('status').props.children).toBe('ready');
  });

  test('play() activates lock-screen controls and starts playback', async () => {
    const { getByTestId } = render(
      <AudioPlaybackProvider>
        <TestAudioConsumer />
      </AudioPlaybackProvider>
    );

    await act(async () => {
      fireEvent.press(getByTestId('btn-play'));
    });

    expect(mockPlayer.setActiveForLockScreen).toHaveBeenCalledWith(
      true,
      expect.objectContaining({
        title: 'The Reading Nook',
        artist: 'ChillPup',
        albumTitle: 'ChillPup Sounds',
      }),
      expect.objectContaining({
        showSeekBackward: false,
        showSeekForward: false,
      })
    );
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  });

  test('pause() pauses player and preserves lock-screen registration for resuming', async () => {
    const { getByTestId } = render(
      <AudioPlaybackProvider>
        <TestAudioConsumer />
      </AudioPlaybackProvider>
    );

    await act(async () => {
      fireEvent.press(getByTestId('btn-pause'));
    });

    expect(mockPlayer.pause).toHaveBeenCalledTimes(1);
  });

  test('stop() pauses, seeks to zero, and clears lock-screen controls safely', async () => {
    const { getByTestId } = render(
      <AudioPlaybackProvider>
        <TestAudioConsumer />
      </AudioPlaybackProvider>
    );

    await act(async () => {
      fireEvent.press(getByTestId('btn-stop'));
    });

    expect(mockPlayer.pause).toHaveBeenCalledTimes(1);
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(0);
    expect(mockPlayer.clearLockScreenControls).toHaveBeenCalledTimes(1);
  });

  test('seekTo() clamps values between 0 and duration, and rejects NaN', async () => {
    const { getByTestId } = render(
      <AudioPlaybackProvider>
        <TestAudioConsumer />
      </AudioPlaybackProvider>
    );

    // Valid seek
    await act(async () => {
      fireEvent.press(getByTestId('btn-seek-valid'));
    });
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(120);

    // Negative clamp
    await act(async () => {
      fireEvent.press(getByTestId('btn-seek-negative'));
    });
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(0);

    // Overflow clamp
    await act(async () => {
      fireEvent.press(getByTestId('btn-seek-overflow'));
    });
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(1296.953469);

    // NaN ignored
    const callCountBefore = mockPlayer.seekTo.mock.calls.length;
    await act(async () => {
      fireEvent.press(getByTestId('btn-seek-nan'));
    });
    expect(mockPlayer.seekTo.mock.calls.length).toBe(callCountBefore);
  });

  test('provider unmount clears lock-screen controls', async () => {
    const { unmount } = render(
      <AudioPlaybackProvider>
        <TestAudioConsumer />
      </AudioPlaybackProvider>
    );

    await act(async () => {});
    unmount();

    expect(mockPlayer.clearLockScreenControls).toHaveBeenCalled();
  });

  test('error state and retry behavior without autoplay', async () => {
    (setAudioModeAsync as jest.Mock).mockRejectedValueOnce(new Error('Audio mode error'));

    const { getByTestId } = render(
      <AudioPlaybackProvider>
        <TestAudioConsumer />
      </AudioPlaybackProvider>
    );

    await act(async () => {});

    expect(getByTestId('status').props.children).toBe('error');
    expect(getByTestId('error-message').props.children).toContain('Failed to configure audio session');

    // Retry should clear error and not call play()
    (setAudioModeAsync as jest.Mock).mockResolvedValueOnce(undefined);
    await act(async () => {
      fireEvent.press(getByTestId('btn-retry'));
    });

    expect(getByTestId('error-message').props.children).toBe('none');
    expect(mockPlayer.play).not.toHaveBeenCalled();
  });

  test('useAudioPlayback throws when used outside provider', () => {
    // Suppress expected console.error from React
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestAudioConsumer />);
    }).toThrow('useAudioPlayback must be used within an AudioPlaybackProvider');

    consoleSpy.mockRestore();
  });
});
