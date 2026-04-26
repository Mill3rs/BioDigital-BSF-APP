import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import SubmitWasteScreen from '../screens/supplier/SubmitWasteScreen';
import WasteListScreen from '../screens/supplier/WasteListScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';

import { Colors } from '../utils/theme';

export type SupplierStackParamList = {
  SubmitWaste: undefined;
  WasteList: undefined;
  Profile: undefined;
  Notifications: undefined;
};

type TabParamList = {
  SubmitWasteTab: undefined;
  WasteListTab: undefined;
  NotificationsTab: undefined;
  ProfileTab: undefined;
};

const Stack = createNativeStackNavigator<SupplierStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

function SupplierTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: { borderTopColor: Colors.border },
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}>
      <Tab.Screen
        name="SubmitWasteTab"
        component={SubmitWasteScreen as React.ComponentType<any>}
        options={{ title: 'Submit Waste', tabBarLabel: 'Submit', tabBarIcon: ({ focused }) => <TabIcon emoji="📤" focused={focused} /> }}
      />
      <Tab.Screen
        name="WasteListTab"
        component={WasteListScreen as React.ComponentType<any>}
        options={{ title: 'My Records', tabBarLabel: 'Records', tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{ title: 'Notifications', tabBarLabel: 'Alerts', tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" focused={focused} /> }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Profile', tabBarLabel: 'Profile', tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function SupplierNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}>
      <Stack.Screen name="SubmitWaste" component={SupplierTabs} options={{ headerShown: false }} />
      <Stack.Screen name="WasteList" component={WasteListScreen} options={{ title: 'My Records' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
    </Stack.Navigator>
  );
}
