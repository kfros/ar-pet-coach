import AsyncStorage from '@react-native-async-storage/async-storage';
import SessionService from '../services/sessionService';

export type OutdoorConfidenceLevelId =
  | 'doorway_calm'
  | 'open_edge'
  | 'one_step'
  | 'short_pause'
  | 'few_steps'
  | 'hundred_steps'
  | 'ten_min_walk';

export interface OutdoorConfidenceLevel {
  id: OutdoorConfidenceLevelId;
  label: string;
  description: string;
  levelIndex: number;
}

export const OUTDOOR_CONFIDENCE_LEVELS: OutdoorConfidenceLevel[] = [
  {
    id: 'doorway_calm',
    levelIndex: 1,
    label: "Doorway Calm",
    description: "Start inside, near the door or exit. Do not begin the walk yet."
  },
  {
    id: 'open_edge',
    levelIndex: 2,
    label: "Open Edge",
    description: "Open the door or edge briefly. Let your dog notice it without pressure."
  },
  {
    id: 'one_step',
    levelIndex: 3,
    label: "One Calm Step",
    description: "Invite one tiny voluntary step. Do not pull, block retreat, or push for more."
  },
  {
    id: 'short_pause',
    levelIndex: 4,
    label: "Short Outside Pause",
    description: "Pause briefly near the outdoor edge, then return while your dog can still recover."
  },
  {
    id: 'few_steps',
    levelIndex: 5,
    label: "A Few Calm Steps",
    description: "Try a few calm steps away from the exit on an easy route."
  },
  {
    id: 'hundred_steps',
    levelIndex: 6,
    label: "100-Step Confidence",
    description: "Try around 100 calm steps only if signs stay low and recovery is easy."
  },
  {
    id: 'ten_min_walk',
    levelIndex: 7,
    label: "Easy 10-Minute Walk",
    description: "Try an easy short walk of about 10 minutes."
  }
];

export function getOutdoorConfidenceLevel(id: string): OutdoorConfidenceLevel | undefined {
  return OUTDOOR_CONFIDENCE_LEVELS.find(lvl => lvl.id === id);
}

export function getNextOutdoorConfidenceLevel(id: string): OutdoorConfidenceLevel | undefined {
  const index = OUTDOOR_CONFIDENCE_LEVELS.findIndex(lvl => lvl.id === id);
  if (index >= 0 && index < OUTDOOR_CONFIDENCE_LEVELS.length - 1) {
    return OUTDOOR_CONFIDENCE_LEVELS[index + 1];
  }
  return undefined;
}

export function getPreviousOutdoorConfidenceLevel(id: string): OutdoorConfidenceLevel | undefined {
  const index = OUTDOOR_CONFIDENCE_LEVELS.findIndex(lvl => lvl.id === id);
  if (index > 0) {
    return OUTDOOR_CONFIDENCE_LEVELS[index - 1];
  }
  return undefined;
}

export async function getOutdoorConfidenceProgressionState(petId: string) {
  try {
    const unlockedData = await AsyncStorage.getItem(`chillpup_outdoor_confidence_levels_${petId}`);
    let unlockedLevels: string[] = ['doorway_calm'];
    if (unlockedData) {
      unlockedLevels = JSON.parse(unlockedData);
    }

    const newlyUnlockedLevel = await AsyncStorage.getItem(`chillpup_newly_unlocked_outdoor_confidence_level_${petId}`);
    const acknowledgedLevel = await AsyncStorage.getItem(`chillpup_acknowledged_outdoor_confidence_level_${petId}`);
    const selectedLevel = await AsyncStorage.getItem(`chillpup_selected_outdoor_confidence_level_${petId}`);

    const trend = typeof SessionService.getStressSignsTrend === 'function'
        ? await SessionService.getStressSignsTrend(petId)
        : null;
    const isSignsIncreased = trend && (trend.status === 'increased' || trend.status === 'severe');

    return {
      unlockedLevels,
      newlyUnlockedLevel,
      acknowledgedLevel,
      selectedLevel: selectedLevel || 'doorway_calm',
      isSignsIncreased: !!isSignsIncreased
    };
  } catch (e) {
    console.error(e);
    return {
      unlockedLevels: ['doorway_calm'],
      newlyUnlockedLevel: null,
      acknowledgedLevel: null,
      selectedLevel: 'doorway_calm',
      isSignsIncreased: false
    };
  }
}
