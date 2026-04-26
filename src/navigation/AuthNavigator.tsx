import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/auth/SplashScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import CompanyCodeScreen from '../screens/auth/CompanyCodeScreen';
import LocationSetupScreen from '../screens/auth/LocationSetupScreen';

export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  RoleSelection: undefined;
  Login: undefined;
  Register: { role?: 'DRIVER' | 'BUYER' | 'SUPPLIER' };
  ForgotPassword: undefined;
  CompanyCode: undefined;
  LocationSetup: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface Props {
  readonly showOnboarding?: boolean;
}

function SplashWrapper({ navigation }: { readonly navigation: any }) {
  return <SplashScreen onReady={() => navigation.replace('Onboarding')} />;
}

export default function AuthNavigator({ showOnboarding = false }: Props) {
  return (
    <Stack.Navigator
      initialRouteName={showOnboarding ? 'Splash' : 'Login'}
      screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashWrapper} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen
        name="CompanyCode"
        component={CompanyCodeScreen}
        options={{ headerShown: true, title: 'Company Code', headerBackVisible: false }}
      />
      <Stack.Screen
        name="LocationSetup"
        component={LocationSetupScreen}
        options={{ headerShown: true, title: 'Set Location', headerBackVisible: false }}
      />
    </Stack.Navigator>
  );
}
