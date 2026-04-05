import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAssets } from 'expo-asset';
import { 
  auth, 
  db, 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  writeBatch, 
  serverTimestamp,
  firestore 
} from '../../services/firebaseConfig';
import ARViewErrorBoundary from './ErrorBoundary';

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

const MindARWebView: React.FC<MindARWebViewProps> = ({
  userId,
  petId,
  mode,
  zoneId,
  spotName,
  onExit,
  statusMessage,
  onCrash,
}) => {
  const [assets, error] = useAssets([require('../../assets/mindar-safe-zone.html')]);
  const webViewRef = useRef<WebView>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const heatmapUnsubscribe = useRef<(() => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heatmapUnsubscribe.current) heatmapUnsubscribe.current();
    };
  }, []);

  // Fetch ID Token for WebView authentication
  useEffect(() => {
    const fetchToken = async () => {
      const user = auth().currentUser;
      if (user) {
        try {
          const token = await user.getIdToken();
          setIdToken(token);
        } catch (e) {
          console.error('[MindARWebView] Token error:', e);
        }
      }
    };
    fetchToken();
  }, []);

  if (error) {
    console.error('[MindARWebView] Asset Load Error:', error);
    onCrash?.();
    return null;
  }

  if (!assets || !assets[0]) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CC3D9" />
      </View>
    );
  }

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      const { action } = data;

      switch (action) {
        case 'log':
          console.log('[MindAR Log]', data.message);
          break;

        case 'exit':
          onExit();
          break;

        case 'getZoneData':
          webViewRef.current?.injectJavaScript(`window.loadZoneData(null);`);
          break;

        case 'subscribeHeatmap':
          if (heatmapUnsubscribe.current) heatmapUnsubscribe.current();
          
          const pointsCol = collection(db, 'users', userId, 'pets', petId, 'activityPoints');
          let q = query(pointsCol, orderBy('timestamp', 'desc'), limit(1000));
          if (zoneId) q = query(pointsCol, where('zoneId', '==', zoneId), orderBy('timestamp', 'desc'), limit(1000));
          
          heatmapUnsubscribe.current = onSnapshot(q, (snap: any) => {
            const points = snap.docChanges()
              .filter((change: any) => change.type === 'added')
              .map((change: any) => change.doc.data());
            
            if (points.length > 0) {
              webViewRef.current?.injectJavaScript(`window.addHistoricalPoints(${JSON.stringify(points)});`);
            }
          }, (err: any) => console.error('Heatmap sub error:', err));
          break;

        case 'savePoints':
          try {
            const batch = writeBatch(db);
            const colRef = collection(db, 'users', userId, 'pets', petId, 'activityPoints');
            
            data.points.forEach((pt: any) => {
              const docRef = doc(colRef);
              const finalPt = { ...pt };
              if (finalPt.timestamp && finalPt.timestamp.__type === 'serverTimestamp') {
                finalPt.timestamp = serverTimestamp();
              }
              if (zoneId) finalPt.zoneId = zoneId;
              batch.set(docRef, finalPt);
            });
            await batch.commit();
          } catch (e) {
            console.error('Error saving batched points:', e);
          }
          break;

        case 'uploadSafeZone':
          try {
            const { name, anchorData } = data;
            // Frictionless mode: User selected or entered spot name. 
            // We only save safeZones as a master list for selection.
            await addDoc(collection(db, 'users', userId, 'pets', petId, 'safeZones'), {
              type: 'unified_placement',
              name: name || 'Modern Calm Space',
              anchorData: anchorData || {},
              createdAt: serverTimestamp()
            });

            webViewRef.current?.injectJavaScript(`window.onUploadSuccess();`);
          } catch (e: any) {
            console.error('Upload error (Lite):', e);
            webViewRef.current?.injectJavaScript(`window.onUploadError("${e.message}");`);
          }
          break;
      }
    } catch (e) {
      console.error('[MindARWebView] onMessage parsing error:', e);
    }
  };

  const getInjectedJS = () => `
    (function() {
      window.AR_MODE = '${mode}';
      window.AR_ZONE_ID = '${zoneId || ''}';
      window.STATUS_MESSAGE = '${statusMessage}';
      window.SPOT_NAME = '${spotName || ''}';
      
      if (window.receiveNativeAuth) {
        window.receiveNativeAuth('${userId}', '${petId}', '${idToken || ''}');
      } else {
        setTimeout(function() {
          if (window.receiveNativeAuth) {
            window.receiveNativeAuth('${userId}', '${petId}', '${idToken || ''}');
          }
        }, 1000);
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
});

export default MindARWebView;

