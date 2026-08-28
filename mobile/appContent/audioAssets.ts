/**
 * Audio Asset Manifest for ChillPup.
 * Authoritative single source of truth mapping product audio IDs to bundled offline assets and metadata.
 */

export interface AudioAsset {
  id: string;
  source: any;
  displayTitle: string;
  artist: string;
  album: string;
  deliveryType: 'bundled_offline';
  sha256: string;
  durationSeconds: number;
  sizeBytes: number;
  codec: string;
  sampleRateHz: number;
  channels: number;
  averageBitrateBps: number;
  provenanceSummary: string;
  disclosureShort: string;
  ownerApprovalDate: string;
  rightsDecision: string;
}

export const APPROVED_AUDIO_TRACK: AudioAsset = {
  id: 'the_reading_nook',
  source: require('../assets/The Reading Nook Extended (Extended).mp3'),
  displayTitle: 'The Reading Nook',
  artist: 'ChillPup',
  album: 'ChillPup Sounds',
  deliveryType: 'bundled_offline',
  sha256: 'f7942b778776da50ff04a955b15ea8ade4dcecb4b1d57ae6eac22da584ebc3be',
  durationSeconds: 1296.953469,
  sizeBytes: 30828250,
  codec: 'mp3',
  sampleRateHz: 44100,
  channels: 2,
  averageBitrateBps: 190157,
  provenanceSummary: 'Generated using Google Flow Music; selected, arranged, crossfaded, edited, and mastered by KF Software.',
  disclosureShort: 'AI-generated music · Edited and mastered by KF Software',
  ownerApprovalDate: '2026-08-27',
  rightsDecision: 'approved_by_kf_software_for_chillpup_mobile_distribution',
};

export const AUDIO_ASSETS: readonly AudioAsset[] = [APPROVED_AUDIO_TRACK];

export function getApprovedAudioTrack(): AudioAsset {
  return APPROVED_AUDIO_TRACK;
}
