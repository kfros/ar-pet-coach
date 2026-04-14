import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAssets } from 'expo-asset';
import {
  auth,
  db,
  collection,
  doc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  serverTimestamp
} from '../../services/firebaseConfig';
import ARViewErrorBoundary from './ErrorBoundary';
import { useCalmAudio } from '../../hooks/useCalmAudio';
import CalmHUD from './CalmHUD';

interface MindARWebViewProps {
  userId: string;
  petId: string;
  mode: 'scan' | 'view';
  zoneId?: string;
  spotName?: string;
  onExit: () => void;
  statusMessage: string;
  onCrash?: () => void;
}

const MindARWebView = ({
  userId,
  petId,
  mode,
  zoneId,
  spotName,
  onExit,
  statusMessage,
  onCrash,
}: MindARWebViewProps) => {
  const [assets, error] = useAssets([require('../../assets/mindar-safe-zone.html')]);
  const webViewRef = useRef<WebView>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const heatmapUnsubscribe = useRef<(() => void) | null>(null);
  const [isPlaced, setIsPlaced] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [surfaceStatus, setSurfaceStatus] = useState<'detecting' | 'ready' | 'unstable'>('detecting');
  const [lowLight, setLowLight] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isExiting = useRef(false);

  // Persistence Refs (Mirror state for safe access during unmount cleanup)
  const finalSessionTime = useRef(0);
  const currentTrackIdRef = useRef<string | null>(null);
  const hasSaved = useRef(false);

  // Unified Audio
  const { currentTrackId, playRandomTrack, stopAudio } = useCalmAudio();

  // 1. Session Lifecycle
  useEffect(() => {
    console.log('[MindARWebView] useEffect SessionLifecycle MOUNT/UPDATE isPlaced:', isPlaced);
    if (isPlaced && !isExiting.current) {
      timerRef.current = setInterval(() => {
        if (!isExiting.current) setSessionTime(prev => prev + 1);
      }, 1000);
      playRandomTrack();
    }
    return () => {
      console.log('[MindARWebView] useEffect SessionLifecycle UNMOUNT/CLEANUP');
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaced]);

  // 2. Mirroring Side Effects (State to Ref Sync)
  useEffect(() => {
    finalSessionTime.current = sessionTime;
    currentTrackIdRef.current = currentTrackId;
  }, [sessionTime, currentTrackId]);

  // 3. Atomic Save-on-Exit
  useEffect(() => {
    return () => {
      // Threshold check: only save if session lasted at least 15 seconds
      if (!hasSaved.current && finalSessionTime.current >= 15) {
        hasSaved.current = true;
        
        console.log('[MindARWebView] Performing atomic save-on-exit:', finalSessionTime.current);
        
        addDoc(collection(db, 'users', userId, 'pets', petId, 'activityPoints'), {
          type: 'calm_session_complete',
          timestamp: serverTimestamp(),
          durationSeconds: finalSessionTime.current,
          mode: 'lite_ar',
          trackId: currentTrackIdRef.current
        }).catch((err) => {
          console.error('[MindARWebView] Exit save failed:', err);
        });
      }
    };
  }, []); // Empty dependencies ensure this only runs on unmount

  // Fetch ID Token
  useEffect(() => {
    console.log('[MindARWebView] useEffect FetchToken MOUNT');
    const fetchToken = async () => {
      const user = auth().currentUser;
      if (user) {
        try {
          const token = await user.getIdToken();
          setIdToken(token);
        } catch (e) { }
      }
    };
    fetchToken();
  }, []);

  // 4. Simulated Detection Phase & Low Light Heuristic
  useEffect(() => {
    if (!isPlaced && !isExiting.current) {
      // Logic for "Ready" state simulation (MindAR needs time to boot)
      const readyTimer = setTimeout(() => {
        setSurfaceStatus('ready');
      }, 2000);

      // Logic for Low Light Hint (if no success after 10s)
      const lowLightTimer = setTimeout(() => {
        if (!isPlaced) setLowLight(true);
      }, 10000);

      return () => {
        clearTimeout(readyTimer);
        clearTimeout(lowLightTimer);
      };
    }
  }, [isPlaced]);

  if (error) {
    onCrash?.();
    return null;
  }

  if (!assets || !assets[0]) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  const handleMessage = async (event: any) => {
    if (isExiting.current) return;
    try {
      const data = JSON.parse(event.nativeEvent.data);
      const { action } = data;

      switch (action) {
        case 'exit':
          handleExit();
          break;

        case 'savePoints':
          // Legacy check for HTML internal tracking
          break;

        case 'uploadSafeZone':
          setIsPlaced(true);
          try {
            const { name, anchorData } = data;
            await addDoc(collection(db, 'users', userId, 'pets', petId, 'safeZones'), {
              type: 'unified_placement',
              name: name || 'Modern Calm Space',
              anchorData: anchorData || {},
              createdAt: serverTimestamp()
            });
            webViewRef.current?.injectJavaScript(`window.onUploadSuccess();`);
          } catch (e) { }
          break;
      }
    } catch (e) { }
  };

  const handleExit = async () => {
    if (isExiting.current) return;
    isExiting.current = true;

    try {
      // Clear timer immediately
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Fade out audio (awaits completion)
      if (isPlaced) {
        console.log('[MindARWebView] handleExit calling stopAudio');
        await stopAudio();
        console.log('[MindARWebView] stopAudio completed');
      }
    } catch (e) {
      console.error('[MindARWebView] Error during handleExit cleanup:', e);
    } finally {
      // Let navigation.replace() handle the teardown
      console.log('[MindARWebView] handleExit calling onExit (navigation.replace)');
      onExit();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlaceTap = () => {
    // Trigger WebView placement logic
    webViewRef.current?.injectJavaScript(`
      const btn = document.getElementById('start-btn');
      if (btn) btn.click();
    `);
  };

  const getInjectedJS = () => `
    (function() {
      window.AR_MODE = '${mode}';
      window.AR_ZONE_ID = '${zoneId || ''}';
      window.STATUS_MESSAGE = '${statusMessage}';
      window.SPOT_NAME = '${spotName || ''}';
      window.HIDE_INTERNAL_UI = true;
      
      if (window.receiveNativeAuth) {
        window.receiveNativeAuth('${userId}', '${petId}', '${idToken || ''}');
      }
    })();
    true;
  `;

  return (
    <ARViewErrorBoundary fallback={() => { onCrash?.(); return null; }}>
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          style={styles.webview}
          source={{ uri: assets[0].localUri || assets[0].uri }}
          originWhitelist={['*']}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess={true}
          mediaCapturePermissionGrantType="grant"
          allowsProtectedMedia={true}
          injectedJavaScript={getInjectedJS()}
          onMessage={handleMessage}
        />

        {/* Shared Timer Layer */}
        <View style={styles.timerContainer} pointerEvents="none">
          <Text style={styles.timerText}>{formatTime(sessionTime)}</Text>
        </View>

        {/* Unified HUD */}
        <CalmHUD 
          isPlaced={isPlaced}
          onPlaceTap={handlePlaceTap}
          onExit={handleExit}
          showReticle={!isPlaced}
          surfaceStatus={surfaceStatus}
          lowLight={lowLight}
        />
      </View>
    </ARViewErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  timerContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  timerText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#38BDF8',
    opacity: 0.7,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  },
});

export default MindARWebView;

