import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ViroARScene,
  ViroARSceneNavigator,
  ViroARPlaneSelector,
  ViroSphere,
  ViroText,
  ViroMaterials,
  ViroAnimations,
  ViroNode,
  ViroAmbientLight,
  ViroSpotLight,
} from '@viro-community/react-viro';
import { db, firestore } from '../../services/firebaseConfig';

// Define Materials & Animations for Viro
ViroMaterials.createMaterials({
  calmSphere: {
    diffuseColor: '#38BDF8AA',
    lightingModel: 'PBR',
    shininess: 0.8,
  },
  grid: {
    diffuseColor: 'rgba(255,255,255,0.2)',
  }
});

ViroAnimations.registerAnimations({
  pulse: {
    properties: { scaleX: 1.1, scaleY: 1.1, scaleZ: 1.1 },
    duration: 2000,
    easing: 'EaseInEaseOut',
  }
});

interface ViroNativeEngineProps {
  userId: string;
  petId: string;
  mode: 'scan' | 'view';
  zoneId?: string;
  onExit: () => void;
  statusMessage: string;
}

/**
 * Premium Native AR Engine using ViroReact.
 * Focused on stability, environment placement, and high-performance rendering.
 */
const ViroNativeEngine: React.FC<ViroNativeEngineProps> = ({
  userId,
  petId,
  mode,
  zoneId,
  onExit,
  statusMessage,
}) => {
  const [anchors, setAnchors] = useState<any[]>([]);

  // The AR Scene Component
  const CalmScene = () => {
    
    // Logic for placing an anchor via raycasting (Center-Screen)
    const onSceneClick = useCallback(async () => {
      // In a real Viro environment, we'd use the navigator's performARHitTest
      // but here we simplify for the proof of concept as requested.
      console.log('[Viro] Scene clicked - attempting to place calming anchor');
    }, []);

    return (
      <ViroARScene onClick={onSceneClick}>
        <ViroAmbientLight color="#ffffff" intensity={200} />
        <ViroSpotLight
          innerAngle={5}
          outerAngle={45}
          direction={[0, -1, -0.2]}
          position={[0, 3, 0]}
          color="#ffffff"
          castsShadow={true}
          influenceBitMask={2}
          shadowMapSize={2048}
          shadowNearZ={2}
          shadowFarZ={5}
          shadowOpacity={0.7}
        />

        <ViroARPlaneSelector minHeight={0.1} minWidth={0.1} alignment="Horizontal">
          <ViroNode position={[0, 0, 0]}>
             <ViroSphere
              heightSegmentCount={20}
              widthSegmentCount={20}
              radius={0.1}
              position={[0, 0.1, 0]}
              materials={['calmSphere']}
              animation={{ name: 'pulse', run: true, loop: true }}
            />
            <ViroText
              text="Calming Zone"
              scale={[0.2, 0.2, 0.2]}
              position={[0, 0.25, 0]}
              style={styles.viroText}
              extrusionDepth={1}
            />
          </ViroNode>
        </ViroARPlaneSelector>

        {/* Render existing anchors from Firestore if in 'view' mode */}
        {anchors.map((anchor, i) => (
          <ViroNode key={anchor.id || i} position={[anchor.x, anchor.y, anchor.z]}>
             <ViroSphere
              radius={0.05}
              materials={['calmSphere']}
              opacity={0.6}
            />
          </ViroNode>
        ))}
      </ViroARScene>
    );
  };

  return (
    <View style={styles.container}>
      <ViroARSceneNavigator
        autofocus={true}
        initialScene={{ scene: CalmScene }}
        style={styles.viroContainer}
      />
      
      {/* HUD Layer */}
      <SafeAreaView style={styles.hudOverlay} pointerEvents="none">
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
        
        {/* Reticle / Crosshair for interaction */}
        <View style={styles.reticleContainer}>
          <View style={styles.reticle} />
        </View>
      </SafeAreaView>

      <TouchableOpacity style={styles.exitButton} onPress={onExit}>
        <Text style={styles.exitText}>✕ Exit</Text>
      </TouchableOpacity>
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
  hudOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  statusBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    marginTop: 20,
  },
  statusText: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  reticleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  exitButton: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  exitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  viroText: {
    fontFamily: 'Arial',
    fontSize: 30,
    color: '#ffffff',
    textAlignVertical: 'center',
    textAlign: 'center',
  },
});

export default ViroNativeEngine;
