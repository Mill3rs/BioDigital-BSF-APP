import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Image,
} from 'react-native';

const BG = '#0B1E10';
const ACCENT = '#4ADE80';

interface Props {
  onReady: () => void;
}

export default function SplashScreen({ onReady }: Readonly<Props>) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    // Ellipsis animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(dotAnim, { toValue: 2, duration: 500, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(dotAnim, { toValue: 3, duration: 500, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(dotAnim, { toValue: 0, duration: 100, useNativeDriver: true, easing: Easing.linear }),
      ]),
    ).start();

    const timer = setTimeout(onReady, 2000);
    return () => clearTimeout(timer);
  }, [fade, scale, dotAnim, onReady]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.center, { opacity: fade, transform: [{ scale }] }]}>
        {/* Logo */}
        <Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require('../../assets/BioDigitalBSFWhiteMono.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>Sustainable Waste Solutions</Text>
      </Animated.View>

      {/* Loading */}
      <Animated.View style={[styles.loadingRow, { opacity: fade }]}>
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotMid]} />
        <View style={styles.dot} />
        <Text style={styles.loadingText}>  Please wait</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
  },
  logo: {
    width: 220,
    height: 80,
    marginBottom: 20,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
    letterSpacing: 0.3,
  },
  loadingRow: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(74,222,128,0.6)',
    marginHorizontal: 2,
  },
  dotMid: {
    backgroundColor: ACCENT,
    width: 6,
    height: 6,
  },
  loadingText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
  },
});
