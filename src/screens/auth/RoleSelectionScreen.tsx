import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

const BG = '#0B1E10';
const ACCENT = '#4ADE80';
const CARD_BG = '#112318';
const CARD_BORDER = '#1C3828';
const SUBTEXT = 'rgba(255,255,255,0.55)';

type Props = NativeStackScreenProps<AuthStackParamList, 'RoleSelection'>;

const ROLES = [
  {
    value: 'DRIVER' as const,
    label: 'Driver',
    icon: '🚛',
    description: 'Collect, deliver, and track organic waste',
    accentColor: '#4ADE80',
  },
  {
    value: 'SUPPLIER' as const,
    label: 'Bio Supplier',
    icon: '♻️',
    description: 'Supply organic waste or operate BSF farm & earn rewards',
    accentColor: '#4ADE80',
  },
  {
    value: 'BUYER' as const,
    label: 'Buyer',
    icon: '🛒',
    description: 'Buy BSF products and power circular value.',
    accentColor: '#FBBF24',
  },
];

export default function RoleSelectionScreen({ navigation }: Readonly<Props>) {
  const handleSelect = (role: 'DRIVER' | 'BUYER' | 'SUPPLIER') => {
    navigation.navigate('Register', { role });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose your role</Text>
          <Text style={styles.subtitle}>
            Choose how you'll contribute to the{'\n'}Biodigital ecosystem
          </Text>
        </View>

        {/* Role cards */}
        <View style={styles.cardsWrap}>
          {ROLES.map((role) => (
            <TouchableOpacity
              key={role.value}
              style={styles.card}
              onPress={() => handleSelect(role.value)}
              activeOpacity={0.8}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.iconWrap, { borderColor: role.accentColor + '30' }]}>
                  <Text style={styles.roleIcon}>{role.icon}</Text>
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardLabel}>{role.label}</Text>
                  <Text style={styles.cardDesc}>{role.description}</Text>
                </View>
              </View>
              <View style={styles.arrowWrap}>
                <Text style={styles.arrow}>›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer links */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
          <Text style={styles.footerDivider}> · </Text>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Learn more about roles</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },

  /* Header */
  header: {
    marginBottom: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: SUBTEXT,
  },

  /* Cards */
  cardsWrap: {
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 18,
    padding: 18,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(74,222,128,0.07)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    flexShrink: 0,
  },
  roleIcon: {
    fontSize: 26,
  },
  cardText: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: SUBTEXT,
  },
  arrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(74,222,128,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  arrow: {
    fontSize: 20,
    color: ACCENT,
    fontWeight: '700',
    lineHeight: 24,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 48,
  },
  footerLink: {
    fontSize: 14,
    color: SUBTEXT,
  },
  footerDivider: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.2)',
  },
});
