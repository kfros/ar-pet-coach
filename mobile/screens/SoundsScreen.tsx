import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useAudioPlayback } from '../audio/useAudioPlayback';
import { formatPlaybackTime } from '../audio/formatPlaybackTime';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';

export default function SoundsScreen() {
  const insets = useSafeAreaInsets();
  const {
    track,
    status,
    isPlaying,
    isLoaded,
    isBuffering,
    currentTimeSeconds,
    durationSeconds,
    errorMessage,
    play,
    pause,
    stop,
    seekTo,
    retry,
  } = useAudioPlayback();

  const [isCommandInFlight, setIsCommandInFlight] = useState(false);
  const [draftSeekValue, setDraftSeekValue] = useState<number | null>(null);
  const [wasExplicitlyStopped, setWasExplicitlyStopped] = useState(false);

  const effectiveDuration = durationSeconds > 0 ? durationSeconds : track.durationSeconds;
  const displayedTime = draftSeekValue !== null ? draftSeekValue : currentTimeSeconds;

  const handlePlayPause = useCallback(async () => {
    if (isCommandInFlight) return;
    setIsCommandInFlight(true);
    setWasExplicitlyStopped(false);
    try {
      if (isPlaying) {
        await pause();
      } else {
        await play();
      }
    } catch (e) {
      console.warn('[SoundsScreen] Play/Pause error:', e);
    } finally {
      setIsCommandInFlight(false);
    }
  }, [isPlaying, isCommandInFlight, pause, play]);

  const handleStop = useCallback(async () => {
    if (isCommandInFlight) return;
    setIsCommandInFlight(true);
    try {
      await stop();
      setWasExplicitlyStopped(true);
    } catch (e) {
      console.warn('[SoundsScreen] Stop error:', e);
    } finally {
      setIsCommandInFlight(false);
    }
  }, [isCommandInFlight, stop]);

  const handleSeekChange = useCallback((value: number) => {
    setDraftSeekValue(value);
  }, []);

  const handleSeekComplete = useCallback(
    async (value: number) => {
      setDraftSeekValue(null);
      setIsCommandInFlight(true);
      setWasExplicitlyStopped(false);
      try {
        await seekTo(value);
      } catch (e) {
        console.warn('[SoundsScreen] Seek error:', e);
      } finally {
        setIsCommandInFlight(false);
      }
    },
    [seekTo]
  );

  const handleRetry = useCallback(async () => {
    if (isCommandInFlight) return;
    setIsCommandInFlight(true);
    setWasExplicitlyStopped(false);
    try {
      await retry();
    } catch (e) {
      console.warn('[SoundsScreen] Retry error:', e);
    } finally {
      setIsCommandInFlight(false);
    }
  }, [isCommandInFlight, retry]);

  // Derived state presentation string
  const isErrorState = status === 'error' || Boolean(errorMessage);
  const isLoadingState = status === 'loading' || (!isLoaded && !isErrorState);

  const getStatusDisplay = (): string => {
    if (isErrorState) return 'Audio is unavailable right now';
    if (isLoadingState) return 'Preparing audio…';
    if (isPlaying && isBuffering) return 'Buffering…';
    if (isPlaying) return 'Playing';
    if (status === 'paused') return 'Paused';
    if (wasExplicitlyStopped && currentTimeSeconds === 0) return 'Stopped';
    return 'Ready to play';
  };

  const isStopDisabled =
    isLoadingState ||
    isErrorState ||
    isCommandInFlight ||
    (!isPlaying && currentTimeSeconds === 0);

  const isPlayPauseDisabled = isLoadingState || isErrorState || isCommandInFlight;
  const isSliderDisabled = isLoadingState || isErrorState || isCommandInFlight;

  const sliderAccessibilityValue = `${formatPlaybackTime(displayedTime)} of ${formatPlaybackTime(effectiveDuration)}`;

  return (
    <SafeAreaView style={styles.container} testID="sounds-tab-screen">
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sounds</Text>
          <Text style={styles.headerSubtitle}>
            Optional background audio for quiet moments.
          </Text>
        </View>

        {/* Player Card */}
        <View style={styles.playerCard}>
          <View style={styles.trackInfoSection}>
            <View style={styles.iconContainer} accessibilityElementsHidden={true} importantForAccessibility="no">
              <Ionicons name="musical-notes" size={28} color={COLORS.primary} />
            </View>
            <View style={styles.trackDetails}>
              <Text style={styles.trackTitle}>{track.displayTitle}</Text>
              <Text style={styles.trackArtist}>{track.artist}</Text>
            </View>
          </View>

          {/* Metadata Badges */}
          <View style={styles.badgesRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Available offline</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Repeats automatically</Text>
            </View>
          </View>

          {/* Status presentation (when not in error) */}
          {!isErrorState && (
            <View style={styles.statusRow}>
              {isLoadingState ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 6 }} />
              ) : null}
              <Text style={styles.statusText}>
                {getStatusDisplay()}
              </Text>
            </View>
          )}

          {/* Error View or Normal Player View */}
          {isErrorState ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Audio is unavailable right now</Text>
              <Text style={styles.errorBody}>Try preparing the track again.</Text>
              <Pressable
                style={styles.retryButton}
                onPress={handleRetry}
                disabled={isCommandInFlight}
                accessibilityRole="button"
                accessibilityLabel="Try again"
              >
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Progress Slider */}
              <View style={styles.progressSection}>
                <Slider
                  testID="sounds-progress-slider"
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={effectiveDuration}
                  value={displayedTime}
                  onValueChange={handleSeekChange}
                  onSlidingComplete={handleSeekComplete}
                  disabled={isSliderDisabled}
                  minimumTrackTintColor={COLORS.primary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.primary}
                  accessibilityLabel="Playback position"
                  accessibilityValue={{ text: sliderAccessibilityValue }}
                />
                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>{formatPlaybackTime(displayedTime)}</Text>
                  <Text style={styles.timeText}>{formatPlaybackTime(effectiveDuration)}</Text>
                </View>
              </View>

              {/* Controls */}
              <View style={styles.controlsRow}>
                {/* Stop Button */}
                <Pressable
                  testID="sounds-stop-button"
                  style={[
                    styles.stopButton,
                    isStopDisabled && styles.controlButtonDisabled,
                  ]}
                  onPress={handleStop}
                  disabled={isStopDisabled}
                  accessibilityRole="button"
                  accessibilityLabel="Stop"
                  accessibilityState={{ disabled: isStopDisabled }}
                >
                  <Ionicons
                    name="stop"
                    size={22}
                    color={isStopDisabled ? COLORS.textSecondary : COLORS.primary}
                  />
                  <Text
                    style={[
                      styles.stopButtonText,
                      isStopDisabled && { color: COLORS.textSecondary },
                    ]}
                  >
                    Stop
                  </Text>
                </Pressable>

                {/* Primary Play/Pause Button */}
                <Pressable
                  testID="sounds-play-pause-button"
                  style={[
                    styles.playPauseButton,
                    isPlayPauseDisabled && styles.controlButtonDisabled,
                  ]}
                  onPress={handlePlayPause}
                  disabled={isPlayPauseDisabled}
                  accessibilityRole="button"
                  accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                  accessibilityState={{ disabled: isPlayPauseDisabled, busy: isCommandInFlight }}
                >
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={24}
                    color="#FFFFFF"
                    style={!isPlaying ? { marginLeft: 2 } : undefined}
                  />
                  <Text style={styles.playPauseButtonText}>
                    {isPlaying ? 'Pause' : 'Play'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        {/* Safety Note */}
        <View style={styles.safetyCard}>
          <View style={styles.safetyHeader}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.safetyTitle}>Follow your dog's response</Text>
          </View>
          <Text style={styles.safetyBody}>
            Use this track only if your dog already tolerates it. Stop playback if signs of distress appear stronger.
          </Text>
        </View>

        {/* AI Disclosure */}
        <View style={styles.disclosureContainer}>
          <Text style={styles.disclosureText}>
            AI-generated music · Edited and mastered by KF Software
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  scrollContent: {
    padding: SIZES.padding,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    ...FONTS.h1,
    color: COLORS.text,
    marginBottom: 6,
  },
  headerSubtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  playerCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.small,
  },
  trackInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.calmBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  trackDetails: {
    flex: 1,
  },
  trackTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    marginBottom: 2,
  },
  trackArtist: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    ...FONTS.caption,
    fontWeight: '600',
    color: COLORS.primary,
  },
  statusTextError: {
    color: COLORS.error,
  },
  progressSection: {
    marginBottom: 20,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -4,
  },
  timeText: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  playPauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 24,
    minWidth: 130,
  },
  playPauseButtonText: {
    ...FONTS.body,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 24,
    minWidth: 100,
  },
  stopButtonText: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 6,
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  errorContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  errorTitle: {
    ...FONTS.h3,
    color: COLORS.error,
    marginBottom: 4,
    textAlign: 'center',
  },
  errorBody: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    ...FONTS.body,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  safetyCard: {
    backgroundColor: COLORS.calmBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    padding: 16,
    marginBottom: 20,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  safetyTitle: {
    ...FONTS.h3,
    fontSize: 16,
    color: COLORS.text,
  },
  safetyBody: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  disclosureContainer: {
    paddingHorizontal: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  disclosureText: {
    ...FONTS.caption,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
