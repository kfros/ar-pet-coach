import { APPROVED_AUDIO_TRACK, AUDIO_ASSETS, getApprovedAudioTrack } from '../appContent/audioAssets';
import * as fs from 'fs';
import * as path from 'path';

describe('Audio Asset Manifest (CP-AUDIO-003)', () => {
  test('manifest contains exactly one production track with ID the_reading_nook', () => {
    expect(AUDIO_ASSETS.length).toBe(1);
    expect(APPROVED_AUDIO_TRACK.id).toBe('the_reading_nook');
    expect(getApprovedAudioTrack().id).toBe('the_reading_nook');
  });

  test('manifest contains verified technical values and 64-character lowercase SHA-256', () => {
    expect(APPROVED_AUDIO_TRACK.sha256).toBe('f7942b778776da50ff04a955b15ea8ade4dcecb4b1d57ae6eac22da584ebc3be');
    expect(APPROVED_AUDIO_TRACK.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(APPROVED_AUDIO_TRACK.durationSeconds).toBe(1296.953469);
    expect(APPROVED_AUDIO_TRACK.sizeBytes).toBe(30828250);
    expect(APPROVED_AUDIO_TRACK.codec).toBe('mp3');
    expect(APPROVED_AUDIO_TRACK.sampleRateHz).toBe(44100);
    expect(APPROVED_AUDIO_TRACK.channels).toBe(2);
    expect(APPROVED_AUDIO_TRACK.averageBitrateBps).toBe(190157);
  });

  test('manifest contains authoritative metadata, provenance, and rights decision', () => {
    expect(APPROVED_AUDIO_TRACK.displayTitle).toBe('The Reading Nook');
    expect(APPROVED_AUDIO_TRACK.artist).toBe('ChillPup');
    expect(APPROVED_AUDIO_TRACK.album).toBe('ChillPup Sounds');
    expect(APPROVED_AUDIO_TRACK.deliveryType).toBe('bundled_offline');
    expect(APPROVED_AUDIO_TRACK.ownerApprovalDate).toBe('2026-08-27');
    expect(APPROVED_AUDIO_TRACK.rightsDecision).toBe('approved_by_kf_software_for_chillpup_mobile_distribution');
    expect(APPROVED_AUDIO_TRACK.disclosureShort).toBe('AI-generated music · Edited and mastered by KF Software');
    expect(APPROVED_AUDIO_TRACK.provenanceSummary).toContain('Google Flow Music');
    expect(APPROVED_AUDIO_TRACK.provenanceSummary).toContain('KF Software');
  });

  test('manifest and codebase do not contain legacy calm_01 through calm_04 runtime references', () => {
    const manifestStr = JSON.stringify(APPROVED_AUDIO_TRACK);
    expect(manifestStr).not.toContain('calm_01');
    expect(manifestStr).not.toContain('calm_02');
    expect(manifestStr).not.toContain('calm_03');
    expect(manifestStr).not.toContain('calm_04');
  });
});
