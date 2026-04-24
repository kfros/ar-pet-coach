import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

export enum ARMode {
  LITE = 'LITE',     // MindAR WebView (Fallback)
  CALM = 'CALM'      // Non-AR Fallback (Stability focus)
}

/**
 * Silent Guard logic to determine the best AR engine for the current device.
 * Resolves to the most capable stable mode in < 500ms.
 */
export const getBestARMode = async (): Promise<ARMode> => {
  try {
    // 1. WebView Resilience Check (Avoid PacProcessor crashes on older Android)
    const apiLevel = await DeviceInfo.getApiLevel();
    const brand = (await DeviceInfo.getBrand()).toLowerCase();

    // Older Android (API < 29 / Android 10) on specific brands often have WebView bugs
    const isVulnerableWebView = Platform.OS === 'android' && apiLevel < 29 &&
      (brand === 'xiaomi' || brand === 'redmi' || brand === 'oppo');

    if (isVulnerableWebView) {
      console.log('[DeviceCheck] Vulnerable WebView detected. Switching to CALM mode.');
      return ARMode.CALM;
    }

    // 2. Default to MindAR (LITE) for stable environments
    return ARMode.LITE;

  } catch (globalError) {
    console.error('[DeviceCheck] Global detection error, defaulting to CALM:', globalError);
    return ARMode.CALM;
  }
};

/**
 * Identifies budget or legacy hardware that should receive truncated animations/messages
 * to preserve session stability.
 */
export const isLowPerformanceDevice = async (): Promise<boolean> => {
  try {
    const apiLevel = await DeviceInfo.getApiLevel();
    const ram = await DeviceInfo.getTotalMemory(); // in bytes

    // Thresholds for "budget" devices: 
    // Android < 10 (API 29) OR < 3GB RAM
    const isOldAndroid = Platform.OS === 'android' && apiLevel < 29;
    const isLowRam = ram < 3 * 1024 * 1024 * 1024;

    return isOldAndroid || isLowRam;
  } catch (e) {
    return true; // Default to safe (low) if check fails
  }
};
