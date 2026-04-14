import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import {
  ViroARScene,
  ViroARSceneNavigator,
  ViroSphere,
  ViroMaterials,
  ViroAnimations,
  ViroNode,
  ViroAmbientLight,
  ViroSpotLight,
} from '@viro-community/react-viro';
import {
  db,
  collection,
  addDoc,
  serverTimestamp
} from '../../services/firebaseConfig';
import { useCalmAudio } from '../../hooks/useCalmAudio';
import CalmHUD from './CalmHUD';

// Define Materials & Animations
ViroMaterials.createMaterials({
  calmSphere: {
    diffuseColor: '#38BDF8AA',
    lightingModel: 'PBR',
    shininess: 0.8,
  }
});

ViroAnimations.registerAnimations({
  pulse: {
    properties: { scaleX: 1.15, scaleY: 1.15, scaleZ: 1.15 },
    duration: 2500, // Matches 5s cycle (2.5s in, 2.5s out)
    easing: 'EaseInEaseOut',
  }
});

interface ViroNativeEngineProps {
  userId: string;
  petId: string;
  mode?: 'scan' | 'view';
  zoneId?: string;
  onExit: () => void;
  statusMessage: string;
}

/**
 * AR Scene Component — defined OUTSIDE the engine to prevent
 * ViroARSceneNavigator from losing its scene reference on re-render.
 * Receives state via viroAppProps (injected by Viro at runtime).
 */
const CalmScene = (props: any) => {
  const isPlaced = props?.sceneNavigator?.viroAppProps?.isPlaced ?? false;
  const onTrackingUpdate = props?.sceneNavigator?.viroAppProps?.onTrackingUpdate;

  return (
    <ViroARScene onTrackingUpdated={onTrackingUpdate}>
      <ViroAmbientLight color="#ffffff" intensity={200} />
      <ViroSpotLight
        innerAngle={5}
        outerAngle={45}
        direction={[0, -1, -0.2]}
        position={[0, 3, 0]}
        color="#ffffff"
        castsShadow={true}
      />

      {isPlaced && (
        <ViroNode position={[0, -0.5, -1.2]}>
          <ViroSphere
            heightSegmentCount={20}
            widthSegmentCount={20}
            radius={0.15}
            materials={['calmSphere']}
            animation={{ name: 'pulse', run: true, loop: true }}
          />
        </ViroNode>
      )}
    </ViroARScene>
  );
};

/**
 * Premium Native AR Engine.
 * Unified with Fallback/Lite modes via shared logic and HUD.
 */
const ViroNativeEngine = ({
  userId,
  petId,
  mode,
  zoneId,
  onExit,
  statusMessage,
}: ViroNativeEngineProps) => {
  const [isPlaced, setIsPlaced] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [surfaceStatus, setSurfaceStatus] = useState<'detecting' | 'ready' | 'unstable'>('detecting');
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
    console.log('[ViroNativeEngine] useEffect SessionLifecycle MOUNT/UPDATE isPlaced:', isPlaced);
    if (isPlaced && !isExiting.current) {
      timerRef.current = setInterval(() => {
        if (!isExiting.current) setSessionTime(prev => prev + 1);
      }, 1000);
      playRandomTrack();
    }
    return () => {
      console.log('[ViroNativeEngine] useEffect SessionLifecycle UNMOUNT/CLEANUP');
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
        
        console.log('[ViroNativeEngine] Performing atomic save-on-exit:', finalSessionTime.current);
        
        addDoc(collection(db, 'users', userId, 'pets', petId, 'activityPoints'), {
          type: 'calm_session_complete',
          timestamp: serverTimestamp(),
          durationSeconds: finalSessionTime.current,
          mode: 'native_ar',
          trackId: currentTrackIdRef.current
        }).catch((err) => {
          console.error('[ViroNativeEngine] Exit save failed:', err);
        });
      }
    };
  }, []); // Empty dependencies ensure this only runs on unmount

  const handleTrackingUpdate = (state: any, reason: any) => {
    // Viro tracking states: 1: Unavailable, 2: Limited, 3: Normal
    if (state === 3) {
      setSurfaceStatus('ready');
    } else if (state === 2) {
      setSurfaceStatus('unstable');
    } else {
      setSurfaceStatus('detecting');
    }
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
      console.log('[ViroNativeEngine] handleExit calling stopAudio');
      await stopAudio();
      console.log('[ViroNativeEngine] handleExit stopAudio completed');
    } catch (e) {
      console.error('[ViroNativeEngine] Error during handleExit cleanup:', e);
    }

    console.log('[ViroNativeEngine] handleExit calling onExit');
    onExit();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <ViroARSceneNavigator
        autofocus={true}
        initialScene={{ scene: CalmScene as any }}
        viroAppProps={{ isPlaced, onTrackingUpdate: handleTrackingUpdate }}
        style={styles.viroContainer}
      />

      {/* Shared Timer Overlay */}
      <View style={styles.timerContainer} pointerEvents="none">
        <Text style={styles.timerText}>{formatTime(sessionTime)}</Text>
      </View>

      {/* Unified HUD */}
      <CalmHUD
        isPlaced={isPlaced}
        onPlaceTap={() => setIsPlaced(true)}
        onExit={handleExit}
        showReticle={!isPlaced}
        surfaceStatus={surfaceStatus}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  viroContainer: {
    flex: 1,
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

export default ViroNativeEngine;
