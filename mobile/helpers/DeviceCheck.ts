import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

export enum ARMode {
  NATIVE = 'NATIVE', // Viro (ARKit/ARCore)
  LITE = 'LITE',     // MindAR WebView (Fallback)
  CALM = 'CALM'      // Non-AR Fallback (Stability focus)
}

/**
 * Silent Guard logic to determine the best AR engine for the current device.
 * Resolves to the most capable stable mode in < 500ms.
 */
export const getBestARMode = async (): Promise<ARMode> => {
  try {
    // 1. Hardware Capability Detection (Native AR)
    // We try/catch this as the native module might not be initialized in some edge cases
    try {
      const { ViroARSceneNavigator } = require('@viro-community/react-viro');
      // This is a fast native call
      const supportStatus = await ViroARSceneNavigator.isARSupportedOnDevice();
      
      if (supportStatus === 'SUPPORTED') {
        return ARMode.NATIVE;
      }
    } catch (viroError) {
      console.warn('[DeviceCheck] Viro support check error:', viroError);
    }

    // 2. WebView Resilience Check (Avoid PacProcessor crashes on older Android)
    const apiLevel = await DeviceInfo.getApiLevel();
    const brand = (await DeviceInfo.getBrand()).toLowerCase();
    
    // Older Android (API < 29 / Android 10) on specific brands often have WebView bugs
    const isVulnerableWebView = Platform.OS === 'android' && apiLevel < 29 && 
      (brand === 'xiaomi' || brand === 'redmi' || brand === 'oppo');

    if (isVulnerableWebView) {
      console.log('[DeviceCheck] Vulnerable WebView detected. Switching to CALM mode.');
      return ARMode.CALM;
    }

    // 3. Fallback to MindAR (LITE) for mid-range devices without native ARCore/ARKit
    // but with functional WebViews
    return ARMode.LITE;

  } catch (globalError) {
    console.error('[DeviceCheck] Global detection error, defaulting to CALM:', globalError);
    return ARMode.CALM;
  }
};
