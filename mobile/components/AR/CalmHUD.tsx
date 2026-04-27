import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface CalmHUDProps {
  isPlaced: boolean;
  onPlaceTap: () => void;
  onExit: () => void;
  showReticle?: boolean;
  surfaceStatus?: 'detecting' | 'ready' | 'unstable';
  lowLight?: boolean;
  hideVisuals?: boolean;
}

const CalmHUD = React.memo(({
  isPlaced,
  onPlaceTap,
  onExit,
  showReticle = false,
  surfaceStatus = 'detecting',
  lowLight = false,
  hideVisuals = false,
}: CalmHUDProps) => {
  const insets = useSafeAreaInsets();

  // Animations
  const breatheAnim = useRef(new Animated.Value(0)).current;
  const instructionFade = useRef(new Animated.Value(0)).current;
  const reticleScale = useRef(new Animated.Value(1)).current;
  const exitButtonFade = useRef(new Animated.Value(0)).current;
  const dimmingAnim = useRef(new Animated.Value(0)).current;
  const surfaceBlend = useRef(new Animated.Value(surfaceStatus === 'ready' ? 1 : 0)).current;

  // Local State
  const [instruction, setInstruction] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 1. Focus Dimming Animation
  useEffect(() => {
    const targetValue = isPlaced || isTransitioning ? 0.12 : 0;
    Animated.timing(dimmingAnim, {
      toValue: targetValue,
      duration: isTransitioning ? 600 : 1000,
      useNativeDriver: true,
    }).start();
  }, [isPlaced, isTransitioning]);

  // 2. Breathing Circle Animation (Active Mode)
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (isPlaced) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, {
            toValue: 1,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(breatheAnim, {
            toValue: 0,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    } else {
      breatheAnim.stopAnimation();
      breatheAnim.setValue(0);
    }
    return () => loop?.stop();
  }, [isPlaced]);

  // 3. Reticle Pulse (Idle Breathing) & Surface Affinity
  // 3. Reticle Pulse (Idle Breathing) & Surface Affinity
  useEffect(() => {
    if (!isTransitioning) {
      Animated.timing(surfaceBlend, {
        toValue: surfaceStatus === 'ready' ? 1 : 0,
        duration: 350,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }, [surfaceStatus, isTransitioning]);

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;

    if (!isPlaced && showReticle && !isTransitioning) {
      // Гарантируем, что начинаем с 1.0
      reticleScale.setValue(1);

      loop = Animated.loop(
        Animated.sequence([
          // 1. Exhale: from 1.0 to 0.95
          Animated.timing(reticleScale, {
            toValue: 0.95,
            duration: 2500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          // 2. Inhale: from 0.95 to 1.05
          Animated.timing(reticleScale, {
            toValue: 1.05,
            duration: 5000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          // 3. Reset: from 1.05 to 1.0
          Animated.timing(reticleScale, {
            toValue: 1,
            duration: 2500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    } else {
      reticleScale.stopAnimation();
      if (!isTransitioning) {
        Animated.spring(reticleScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
          tension: 40
        }).start();
      }
    }

    return () => {
      if (loop) {
        loop.stop();
        loop = null;
      }
      reticleScale.stopAnimation();
    };
  }, [isPlaced, showReticle, isTransitioning]);

  // 4. Instruction Sequence
  useEffect(() => {
    let isMounted = true;
    if (isPlaced) {
      const runSequence = async () => {
        setInstruction("Stay here. Breathe slowly.");
        await new Promise(r => Animated.timing(instructionFade, { toValue: 1, duration: 800, useNativeDriver: true }).start(r));
        if (!isMounted) return;
        await new Promise(r => setTimeout(r, 3500));
        if (!isMounted) return;
        await new Promise(r => Animated.timing(instructionFade, { toValue: 0, duration: 800, useNativeDriver: true }).start(r));
        if (!isMounted) return;
        setInstruction("Your calm helps your pet calm down.");
        await new Promise(r => Animated.timing(instructionFade, { toValue: 1, duration: 800, useNativeDriver: true }).start(r));
        if (!isMounted) return;
        await new Promise(r => setTimeout(r, 3500));
        if (!isMounted) return;
        await new Promise(r => Animated.timing(instructionFade, { toValue: 0, duration: 800, useNativeDriver: true }).start(r));
        setInstruction(null);
      };
      runSequence();
    }
    return () => { isMounted = false; instructionFade.stopAnimation(); };
  }, [isPlaced]);

  useEffect(() => {
    if (isPlaced) {
      Animated.timing(exitButtonFade, {
        toValue: 0.6,
        duration: 500,
        delay: 800,
        useNativeDriver: true,
      }).start();
    } else {
      exitButtonFade.setValue(0);
    }
  }, [isPlaced]);

  const handlePlaceTapInternal = () => {
    if (isTransitioning || isPlaced || surfaceStatus !== 'ready') return;

    // Disable idle pulse BEFORE transition starts to ensure scale ownership
    reticleScale.stopAnimation();
    setIsTransitioning(true);

    // Transition Sequence: Expand and Fade
    Animated.parallel([
      Animated.timing(reticleScale, {
        toValue: 1.8,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(surfaceBlend, {
        toValue: -1,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      onPlaceTap();
      // Reset transition state after parent reflects isPlaced
      setTimeout(() => {
        setIsTransitioning(false);
        reticleScale.setValue(1);
        surfaceBlend.setValue(surfaceStatus === 'ready' ? 1 : 0);
      }, 100);
    });
  };

  const breathingScale = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.15]
  });

  const breathingOpacity = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.18]
  });

  const surfaceOpacity = surfaceBlend.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0, 0.5, 1.0]
  });


  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* 0. FOCUS DIMMING LAYER */}
      <Animated.View
        style={[styles.dimmingOverlay, { opacity: dimmingAnim }]}
        pointerEvents="none"
      />

      {/* 1. RETICLE (Placement Mode) - Fixed Layout Positioning */}
      {!isPlaced && showReticle && !hideVisuals && (
        <View style={styles.fixedCenterContainer} pointerEvents="none">
          <Animated.View style={[
            styles.reticleWrapper,
            {
              transform: [{ scale: reticleScale }],
              opacity: surfaceOpacity
            }
          ]}>
            {/* Premium multi-layer soft glow (simulating radial gradient) */}
            <View style={styles.reticleGlowInner} />
            <View style={styles.reticleGlowMiddle} />
            <View style={styles.reticleGlowOuter} />
          </Animated.View>
        </View>
      )}

      {/* 2. BREATHING CIRCLE (Active Mode) */}
      {isPlaced && !hideVisuals && (
        <View style={styles.fixedCenterContainer} pointerEvents="none">
          <Animated.View style={[
            styles.breathingCircle,
            { transform: [{ scale: breathingScale }], opacity: breathingOpacity }
          ]} />
        </View>
      )}

      {/* 3. INSTRUCTIONS */}
      <View style={styles.instructionContainer} pointerEvents="none">
        <Animated.View style={{ opacity: instructionFade }}>
          <Text style={styles.instructionText}>{instruction}</Text>
        </Animated.View>
      </View>

      {/* 4. UI BUTTONS */}
      <View style={[styles.uiLayer, { paddingBottom: insets.bottom + 24 }]} pointerEvents="box-none">
        {!isPlaced && !isTransitioning && (
          <TouchableOpacity
            style={[
              styles.setButton,
              surfaceStatus !== 'ready' && { opacity: 0.6 }
            ]}
            onPress={handlePlaceTapInternal}
            activeOpacity={0.8}
          >
            <Text style={styles.setButtonText}>Set calm spot</Text>
          </TouchableOpacity>
        )}

        <Animated.View style={{ opacity: exitButtonFade }}>
          <TouchableOpacity
            onPress={() => {
              // Immediate UI feedback: navigate/close immediately
              onExit();
            }}
            style={styles.exitButton}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Text style={styles.exitText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isPlaced === nextProps.isPlaced &&
    prevProps.showReticle === nextProps.showReticle &&
    prevProps.surfaceStatus === nextProps.surfaceStatus &&
    prevProps.lowLight === nextProps.lowLight
  );
});

const styles = StyleSheet.create({
  dimmingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 1,
  },
  fixedCenterContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  reticleWrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 140,
    height: 140,
    marginLeft: -70,
    marginTop: -70,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  reticleGlowInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 100,
    margin: 10,
  },
  reticleGlowMiddle: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 100,
    margin: -5,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 4,
  },
  reticleGlowOuter: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    borderRadius: 100,
    margin: -25,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 2,
  },
  breathingCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 280,
    height: 280,
    marginLeft: -140,
    marginTop: -140,
    borderRadius: 140,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  instructionContainer: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 20,
  },
  instructionText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  uiLayer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 30,
  },
  setButton: {
    backgroundColor: '#38BDF8',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 40,
    marginBottom: 20,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  setButtonText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  exitButton: {
    padding: 12,
  },
  exitText: {
    color: '#F1F5F9',
    fontSize: 24,
    fontWeight: '300',
  },
});

export default CalmHUD;
