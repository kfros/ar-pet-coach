import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAssets } from 'expo-asset';
import { auth, db, firestore } from '../../services/firebaseConfig';
import ARViewErrorBoundary from './ErrorBoundary';

interface MindARWebViewProps {
  userId: string;
  petId: string;
  mode: 'scan' | 'view';
  zoneId?: string;
  onExit: () => void;
  statusMessage: string;
  onCrash?: () => void;
}

const MindARWebView: React.FC<MindARWebViewProps> = ({
  userId,
  petId,
  mode,
  zoneId,
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
          try {
            let zoneData = null;
            if (zoneId || data.zoneId) {
              const doc = await db.collection('users').doc(userId).collection('pets').doc(petId).collection('safeZones').doc(zoneId || data.zoneId).get();
              zoneData = doc.exists() ? doc.data() : null;
            } else {
              const snap = await db.collection('users').doc(userId).collection('pets').doc(petId).collection('safeZones')
                .where('type', '==', 'mindar')
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();
              zoneData = !snap.empty ? snap.docs[0].data() : null;
            }
            webViewRef.current?.injectJavaScript(`window.loadZoneData(${JSON.stringify(zoneData)});`);
          } catch (e) {
            console.error('Error fetching zone data:', e);
          }
          break;

        case 'subscribeHeatmap':
          if (heatmapUnsubscribe.current) heatmapUnsubscribe.current();
          
          let query: any = db.collection('users').doc(userId).collection('pets').doc(petId).collection('activityPoints');
          if (zoneId) query = query.where('zoneId', '==', zoneId);
          
          heatmapUnsubscribe.current = query
            .orderBy('timestamp', 'desc')
            .limit(1000)
            .onSnapshot((snap: any) => {
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
            const batch = db.batch();
            const colRef = db.collection('users').doc(userId).collection('pets').doc(petId).collection('activityPoints');
            
            data.points.forEach((pt: any) => {
              const docRef = colRef.doc();
              const finalPt = { ...pt };
              // Convert placeholder to Firestore timestamp
              if (finalPt.timestamp && finalPt.timestamp.__type === 'serverTimestamp') {
                finalPt.timestamp = firestore.FieldValue.serverTimestamp();
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
            const { mindDataUrl, thumbnails, name } = data;
            const timestamp = Date.now();
            const storage = require('@react-native-firebase/storage').default();

            // 1. Upload .mind file
            const mindPath = `mind-targets/${userId}/${petId}/${timestamp}.mind`;
            await storage.ref(mindPath).putString(mindDataUrl, 'data_url');
            const mindUrl = await storage.ref(mindPath).getDownloadURL();

            // 2. Upload Thumbnails
            const thumbnailUrls = [];
            for (let i = 0; i < thumbnails.length; i++) {
              const thumbPath = `mind-targets/${userId}/${petId}/${timestamp}_thumb_${i}.jpg`;
              await storage.ref(thumbPath).putString(thumbnails[i], 'data_url');
              const thumbUrl = await storage.ref(thumbPath).getDownloadURL();
              thumbnailUrls.push(thumbUrl);
            }

            // 3. Save to Firestore
            await db.collection('users').doc(userId).collection('pets').doc(petId).collection('safeZones').add({
              type: 'mindar',
              name: name,
              fileUrl: mindUrl,
              storagePath: mindPath,
              thumbnails: thumbnailUrls,
              targetCount: thumbnails.length,
              markerStatus: 'ready',
              createdAt: firestore.FieldValue.serverTimestamp()
            });

            webViewRef.current?.injectJavaScript(`window.onUploadSuccess();`);
          } catch (e: any) {
            console.error('Upload error:', e);
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
