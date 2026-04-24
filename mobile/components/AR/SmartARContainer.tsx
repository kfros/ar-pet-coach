import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { getBestARMode, ARMode } from '../../helpers/DeviceCheck';
import { MindARWebView, CalmFallbackEngine } from './index';

interface SmartARContainerProps {
  petId: string;
  userId: string;
  mode: 'scan' | 'view';
  zoneId?: string;
  spotName?: string;
  onExit: () => void;

  // Adaptive strings from Screen level
  nativeMsg: string;
  liteMsg: string;
}

/**
 * High-level controller for the Hybrid AR system.
 * Dynamically mounts the appropriate engine based on hardware/environment.
 */
const SmartARContainer: React.FC<SmartARContainerProps> = ({
  petId,
  userId,
  mode,
  zoneId,
  spotName,
  onExit,
  nativeMsg,
  liteMsg,
}) => {

  const [arMode, setArMode] = useState<ARMode | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isInitializing, setIsInitializing] = useState(true);
  const initialCheckDone = useRef(false);

  // Silent Guard Capability Detection
  useEffect(() => {
    if (initialCheckDone.current) return;

    const init = async () => {
      try {
        // 1. Hardware/Environment Check (< 500ms)
        const bestMode = await getBestARMode();

        // 2. Permission Management (Centralized)
        // Only request if not in CALM mode (which doesn't need camera)
        if (bestMode !== ARMode.CALM) {
          // Wait for permission check to load
          if (permission && !permission.granted) {
            if (permission.canAskAgain) {
              const result = await requestPermission();
              if (!result.granted) {
                console.log('[SmartAR] Camera denied, defaulting to CALM mode');
                setArMode(ARMode.CALM);
                setIsInitializing(false);
                initialCheckDone.current = true;
                return;
              }
            } else {
              // Cannot ask again, must fallback to CALM
              setArMode(ARMode.CALM);
              setIsInitializing(false);
              initialCheckDone.current = true;
              return;
            }
          } else if (!permission) {
            // Still loading permission status, wait for next effect run
            return;
          }
        }

        setArMode(bestMode);
        setIsInitializing(false);
        initialCheckDone.current = true;
      } catch (err) {
        console.error('[SmartAR] Initialization error:', err);
        setArMode(ARMode.CALM);
        setIsInitializing(false);
        initialCheckDone.current = true;
      }
    };

    init();
  }, [permission, requestPermission]);

  if (isInitializing || !arMode) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Initializing Experience...</Text>
      </View>
    );
  }

  // Render Engine based on Silent Guard Resolution
  switch (arMode) {
    case ARMode.LITE:
      return (
        <MindARWebView
          userId={userId}
          petId={petId}
          mode={mode}
          zoneId={zoneId}
          spotName={spotName}
          onExit={onExit}
          statusMessage={liteMsg}
        />
      );

    case ARMode.CALM:
    default:
      return (
        <CalmFallbackEngine
          userId={userId}
          petId={petId}
          onExit={onExit}
        />
      );
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default SmartARContainer;
