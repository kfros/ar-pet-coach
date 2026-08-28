import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import SoundsScreen from '../screens/SoundsScreen';
import { useAudioPlayback } from '../audio/useAudioPlayback';
import { APPROVED_AUDIO_TRACK } from '../appContent/audioAssets';

// Mock useAudioPlayback at the hook boundary
jest.mock('../audio/useAudioPlayback');

const mockUseAudioPlayback = useAudioPlayback as jest.Mock;

describe('SoundsScreen Component (CP-AUDIO-004)', () => {
  let mockPlayback: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPlayback = {
      track: APPROVED_AUDIO_TRACK,
      status: 'ready',
      isPlaying: false,
      isLoaded: true,
      isBuffering: false,
      currentTimeSeconds: 0,
      durationSeconds: 1296.953469,
      errorMessage: null,
      play: jest.fn(() => Promise.resolve()),
      pause: jest.fn(() => Promise.resolve()),
      stop: jest.fn(() => Promise.resolve()),
      seekTo: jest.fn(() => Promise.resolve()),
      retry: jest.fn(() => Promise.resolve()),
    };
    mockUseAudioPlayback.mockReturnValue(mockPlayback);
  });

  test('renders header, track metadata, badges, exact safety copy, and AI disclosure', () => {
    const { getByText, queryByText } = render(<SoundsScreen />);

    // Header
    expect(getByText('Sounds')).toBeTruthy();
    expect(getByText('Optional background audio for quiet moments.')).toBeTruthy();

    // Track Card
    expect(getByText('The Reading Nook')).toBeTruthy();
    expect(getByText('ChillPup')).toBeTruthy();
    expect(getByText('Available offline')).toBeTruthy();
    expect(getByText('Repeats automatically')).toBeTruthy();
    expect(getByText('Ready to play')).toBeTruthy();

    // Safety Copy
    expect(getByText("Follow your dog's response")).toBeTruthy();
    expect(
      getByText(
        'Use this track only if your dog already tolerates it. Stop playback if signs of distress appear stronger.'
      )
    ).toBeTruthy();

    // AI Disclosure
    expect(getByText('AI-generated music · Edited and mastered by KF Software')).toBeTruthy();

    // Verify placeholder & internal filename are NOT rendered
    expect(queryByText('This section is being prepared.')).toBeNull();
    expect(queryByText(/The Reading Nook Extended/i)).toBeNull();
  });

  test('does not trigger play, pause, stop, seekTo, or retry on mount', () => {
    render(<SoundsScreen />);
    expect(mockPlayback.play).not.toHaveBeenCalled();
    expect(mockPlayback.pause).not.toHaveBeenCalled();
    expect(mockPlayback.stop).not.toHaveBeenCalled();
    expect(mockPlayback.seekTo).not.toHaveBeenCalled();
    expect(mockPlayback.retry).not.toHaveBeenCalled();
  });

  test('ready state shows Play and calls play exactly once on press', async () => {
    const { getByTestId, getByText } = render(<SoundsScreen />);

    expect(getByText('Play')).toBeTruthy();
    const playBtn = getByTestId('sounds-play-pause-button');
    expect(playBtn.props.accessibilityLabel).toBe('Play');

    await act(async () => {
      fireEvent.press(playBtn);
    });

    expect(mockPlayback.play).toHaveBeenCalledTimes(1);
    expect(mockPlayback.pause).not.toHaveBeenCalled();
  });

  test('playing state shows Pause, Playing status, and calls pause exactly once on press', async () => {
    mockPlayback.isPlaying = true;
    mockPlayback.status = 'playing';
    mockPlayback.currentTimeSeconds = 45;

    const { getByTestId, getByText } = render(<SoundsScreen />);

    expect(getByText('Playing')).toBeTruthy();
    expect(getByText('Pause')).toBeTruthy();

    const pauseBtn = getByTestId('sounds-play-pause-button');
    expect(pauseBtn.props.accessibilityLabel).toBe('Pause');

    await act(async () => {
      fireEvent.press(pauseBtn);
    });

    expect(mockPlayback.pause).toHaveBeenCalledTimes(1);
    expect(mockPlayback.play).not.toHaveBeenCalled();
  });

  test('stop button calls stop() and is disabled when at ready 0:00 position', async () => {
    // When at 0:00 and not playing -> stop is disabled
    const { getByTestId, rerender } = render(<SoundsScreen />);
    const stopBtn = getByTestId('sounds-stop-button');
    expect(stopBtn.props.accessibilityState.disabled).toBe(true);

    // When playing at 120s -> stop is enabled
    mockPlayback.isPlaying = true;
    mockPlayback.status = 'playing';
    mockPlayback.currentTimeSeconds = 120;
    rerender(<SoundsScreen />);

    expect(stopBtn.props.accessibilityState.disabled).toBe(false);

    await act(async () => {
      fireEvent.press(stopBtn);
    });

    expect(mockPlayback.stop).toHaveBeenCalledTimes(1);
  });

  test('slider displays progress, handles dragging draft, and calls seekTo on complete', async () => {
    mockPlayback.currentTimeSeconds = 65.9; // 1:05
    const { getByTestId, getByText } = render(<SoundsScreen />);

    expect(getByText('1:05')).toBeTruthy();
    expect(getByText('21:36')).toBeTruthy();

    const slider = getByTestId('sounds-progress-slider');
    expect(slider.props.accessibilityValue.text).toBe('1:05 of 21:36');

    // Drag to 125s (2:05)
    act(() => {
      slider.props.onValueChange(125);
    });

    expect(getByText('2:05')).toBeTruthy();
    expect(mockPlayback.seekTo).not.toHaveBeenCalled();

    // Complete sliding
    await act(async () => {
      slider.props.onSlidingComplete(125);
    });

    expect(mockPlayback.seekTo).toHaveBeenCalledWith(125);
    expect(mockPlayback.play).not.toHaveBeenCalled();
  });

  test('loading state shows Preparing audio… and disables controls', () => {
    mockPlayback.status = 'loading';
    mockPlayback.isLoaded = false;

    const { getByText, getByTestId } = render(<SoundsScreen />);

    expect(getByText('Preparing audio…')).toBeTruthy();

    const playBtn = getByTestId('sounds-play-pause-button');
    expect(playBtn.props.accessibilityState.disabled).toBe(true);

    const stopBtn = getByTestId('sounds-stop-button');
    expect(stopBtn.props.accessibilityState.disabled).toBe(true);

    const slider = getByTestId('sounds-progress-slider');
    expect(slider.props.disabled).toBe(true);
  });

  test('buffering while playing shows Buffering… without disabling Pause', () => {
    mockPlayback.isPlaying = true;
    mockPlayback.status = 'playing';
    mockPlayback.isBuffering = true;
    mockPlayback.currentTimeSeconds = 30;

    const { getByText, getByTestId } = render(<SoundsScreen />);

    expect(getByText('Buffering…')).toBeTruthy();
    expect(getByText('Pause')).toBeTruthy();

    const playPauseBtn = getByTestId('sounds-play-pause-button');
    expect(playPauseBtn.props.accessibilityState.disabled).toBe(false);
  });

  test('error state renders error copy and Try again button calls retry() without autoplay', async () => {
    mockPlayback.status = 'error';
    mockPlayback.errorMessage = 'Failed to configure audio session.';

    const { getByText, queryByTestId } = render(<SoundsScreen />);

    expect(getByText('Audio is unavailable right now')).toBeTruthy();
    expect(getByText('Try preparing the track again.')).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();

    // Normal controls should be hidden in error view
    expect(queryByTestId('sounds-progress-slider')).toBeNull();
    expect(queryByTestId('sounds-play-pause-button')).toBeNull();
    expect(queryByTestId('sounds-stop-button')).toBeNull();

    const retryBtn = getByText('Try again');
    await act(async () => {
      fireEvent.press(retryBtn);
    });

    expect(mockPlayback.retry).toHaveBeenCalledTimes(1);
    expect(mockPlayback.play).not.toHaveBeenCalled();
  });
});
