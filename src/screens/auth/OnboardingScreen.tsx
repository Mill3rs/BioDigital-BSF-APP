import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Animated,
  ViewToken,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

const { width: W, height: H } = Dimensions.get('window');

const BG = '#0B1E10';
const ACCENT = '#4ADE80';
const SUBTEXT = 'rgba(255,255,255,0.55)';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

interface Slide {
  key: string;
  illustration: string;
  illustrationBg: string;
  title: string;
  titleAccent: string;
  titleRest: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    key: '1',
    illustration: '🧑‍🌾',
    illustrationBg: 'rgba(74,222,128,0.08)',
    title: 'Join the Green\nRevolution',
    titleAccent: 'Join',
    titleRest: ' the Green\nRevolution',
    subtitle:
      'Work with farms, drivers, and buyers creating value from organic waste.',
  },
  {
    key: '2',
    illustration: '🚛',
    illustrationBg: 'rgba(74,222,128,0.08)',
    title: 'Track every Pickup\nand Process in\nReal Time',
    titleAccent: 'Track',
    titleRest: ' every Pickup\nand Process in\nReal Time',
    subtitle:
      'Follow how organic waste moves through the BSF lifecycle toward cleaner communities.',
  },
  {
    key: '3',
    illustration: '🌍',
    illustrationBg: 'rgba(74,222,128,0.08)',
    title: 'Together, Powering\na Cleaner Planet',
    titleAccent: 'Together',
    titleRest: ', Powering\na Cleaner Planet',
    subtitle:
      'Your role, whether farmer, driver, or buyer drives impact that lasts.',
  },
];

export default function OnboardingScreen({ navigation }: Readonly<Props>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onViewRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  });

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      navigation.replace('RoleSelection');
    }
  };

  const handleSkip = () => {
    navigation.replace('RoleSelection');
  };

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={styles.slide}>
      {/* Illustration */}
      <View style={[styles.illustrationWrap, { backgroundColor: item.illustrationBg }]}>
        <View style={styles.illustrationInner}>
          {/* Decorative rings */}
          <View style={styles.ring3} />
          <View style={styles.ring2} />
          <View style={styles.ring1} />
          <Text style={styles.illustrationEmoji}>{item.illustration}</Text>
        </View>
      </View>

      {/* Text content */}
      <View style={styles.textContent}>
        <Text style={styles.slideTitle}>
          <Text style={styles.titleAccent}>{item.titleAccent}</Text>
          <Text style={styles.titleRest}>{item.titleRest}</Text>
        </Text>
        <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Skip */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={item => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        style={styles.flatList}
      />

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {/* Dots */}
        <View style={styles.dots}>
            {SLIDES.map((slide, i) => {
            const inputRange = [(i - 1) * W, i * W, (i + 1) * W];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 20, 8],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={slide.key}
                style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]}
              />
            );
          })}
        </View>

        {/* Next button */}
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.nextArrow}>
            {activeIndex === SLIDES.length - 1 ? '✓' : '→'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  flatList: {
    flex: 1,
  },
  slide: {
    width: W,
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
  },

  /* Illustration */
  illustrationWrap: {
    width: W * 0.75,
    height: H * 0.38,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.12)',
  },
  illustrationInner: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 200,
    height: 200,
  },
  ring1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.15)',
  },
  ring2: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.08)',
  },
  ring3: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.05)',
  },
  illustrationEmoji: {
    fontSize: 100,
    zIndex: 1,
  },

  /* Text */
  textContent: {
    paddingHorizontal: 32,
    paddingTop: 36,
    width: '100%',
  },
  slideTitle: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  titleAccent: {
    fontStyle: 'italic',
    color: '#FFFFFF',
  },
  titleRest: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  slideSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: SUBTEXT,
  },

  /* Skip */
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 28,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  skipText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },

  /* Bottom bar */
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 44,
    paddingTop: 16,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  nextBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  nextArrow: {
    fontSize: 22,
    color: '#0B1E10',
    fontWeight: '800',
  },
});
