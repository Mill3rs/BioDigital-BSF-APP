import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../store/authStore';
import AuthNavigator from './AuthNavigator';
import BuyerNavigator from './BuyerNavigator';
import DriverNavigator from './DriverNavigator';
import SupplierNavigator from './SupplierNavigator';
import CompanyCodeScreen from '../screens/auth/CompanyCodeScreen';
import LocationSetupScreen from '../screens/auth/LocationSetupScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../utils/theme';
import type { AuthStackParamList } from './AuthNavigator';

// Thin onboarding-only stack so back navigation is locked
const OnboardStack = createNativeStackNavigator<AuthStackParamList>();

function OnboardingNavigator({ initialScreen }: { readonly initialScreen: 'CompanyCode' | 'LocationSetup' }) {
  return (
    <OnboardStack.Navigator
      initialRouteName={initialScreen}
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerBackVisible: false,
      }}>
      <OnboardStack.Screen name="CompanyCode" component={CompanyCodeScreen} options={{ title: 'Company Code' }} />
      <OnboardStack.Screen name="LocationSetup" component={LocationSetupScreen} options={{ title: 'Set Location' }} />
    </OnboardStack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, isLoading } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('onboardingComplete').then((val) => {
      setShowOnboarding(val !== 'true');
      setOnboardingChecked(true);
      if (val !== 'true') {
        // Mark complete so it only shows once
        AsyncStorage.setItem('onboardingComplete', 'true');
      }
    });
  }, []);

  if (isLoading || !onboardingChecked) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const getNavigator = () => {
    if (!user) return <AuthNavigator showOnboarding={showOnboarding} />;

    // Handle incomplete onboarding for SUPPLIER and DRIVER
    if (user.onboardingStep === 'PENDING_CODE') {
      return <OnboardingNavigator initialScreen="CompanyCode" />;
    }
    if (user.onboardingStep === 'PENDING_LOCATION') {
      return <OnboardingNavigator initialScreen="LocationSetup" />;
    }

    switch (user.role) {
      case 'BUYER': return <BuyerNavigator />;
      case 'DRIVER': return <DriverNavigator />;
      case 'SUPPLIER': return <SupplierNavigator />;
      default: return <AuthNavigator />;
    }
  };

  return (
    <NavigationContainer>
      {getNavigator()}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
