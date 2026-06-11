import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

import DriverDashboardScreen from '../screens/driver/DriverDashboardScreen';
import DeliveryDetailScreen from '../screens/driver/DeliveryDetailScreen';
import DeliveriesScreen from '../screens/driver/DeliveriesScreen';
import WastePickupsScreen from '../screens/driver/WastePickupsScreen';
import WastePickupMapScreen from '../screens/driver/WastePickupMapScreen';
import WasteDetailScreen from '../screens/driver/WasteDetailScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ReportIssueScreen from '../screens/shared/ReportIssueScreen';
import type { WasteRecord } from '../types';
import { NotificationCountProvider } from '../store/notificationStore';

export type DriverStackParamList = {
  Deliveries: undefined;
  DeliveryDetail: { orderId: string };
  WastePickups: undefined;
  WastePickupMap: { item: WasteRecord };
  WasteDetail: { item: WasteRecord };
  Profile: undefined;
  Notifications: undefined;
  ReportIssue: undefined;
};

type TabParamList = {
  HubTab: undefined;
  PickupsTab: undefined;
  AccountTab: undefined;
};

const Stack = createNativeStackNavigator<DriverStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const GREEN = '#1B5E20';
const GREY = '#9E9E9E';

function TabBarIcon({
  emoji,
  label,
  focused,
}: Readonly<{ emoji: string; label: string; focused: boolean }>) {
  if (focused) {
    return (
      <View style={tabStyles.activePill}>
        <Text style={tabStyles.activeEmoji}>{emoji}</Text>
        <Text style={tabStyles.activeLabel}>{label}</Text>
      </View>
    );
  }
  return <Text style={tabStyles.inactiveEmoji}>{emoji}</Text>;
}

const tabStyles = StyleSheet.create({
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GREEN,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 5,
  },
  activeEmoji: { fontSize: 16, color: '#FFF' },
  activeLabel: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  inactiveEmoji: { fontSize: 22, color: GREY, opacity: 0.7 },
});

const HubIcon = ({ focused }: { focused: boolean }) => (
  <TabBarIcon emoji="🏠" label="Hub" focused={focused} />
);
const PickupsIcon = ({ focused }: { focused: boolean }) => (
  <TabBarIcon emoji="📦" label="Pickups" focused={focused} />
);
const AccountIcon = ({ focused }: { focused: boolean }) => (
  <TabBarIcon emoji="👤" label="Account" focused={focused} />
);

function DriverTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 68,
          paddingBottom: 12,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: '#E8EBE4',
          backgroundColor: '#FFF',
        },
        headerShown: false,
      }}>
      <Tab.Screen
        name="HubTab"
        component={DriverDashboardScreen}
        options={{ tabBarIcon: HubIcon }}
      />
      <Tab.Screen
        name="PickupsTab"
        component={DeliveriesScreen}
        options={{ tabBarIcon: PickupsIcon }}
      />
      <Tab.Screen
        name="AccountTab"
        component={ProfileScreen}
        options={{ tabBarIcon: AccountIcon }}
      />
    </Tab.Navigator>
  );
}

export default function DriverNavigator() {
  return (
    <NotificationCountProvider>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Deliveries" component={DriverTabs} />
      <Stack.Screen name="WastePickupMap" component={WastePickupMapScreen} />
      <Stack.Screen
        name="WasteDetail"
        component={WasteDetailScreen}
        options={{ headerShown: true, headerTitle: 'Waste Details', headerTintColor: GREEN }}
      />
      <Stack.Screen
        name="DeliveryDetail"
        component={DeliveryDetailScreen}
        options={{ headerShown: true, headerTitle: 'Delivery Details', headerTintColor: GREEN }}
      />
      <Stack.Screen
        name="WastePickups"
        component={WastePickupsScreen}
        options={{ headerShown: true, headerTitle: 'Pickups', headerTintColor: GREEN }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: true, headerTitle: 'My Profile', headerTintColor: GREEN }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: true, headerTitle: 'Notifications', headerTintColor: GREEN }}
      />
      <Stack.Screen
        name="ReportIssue"
        component={ReportIssueScreen}
        options={{ headerShown: true, headerTitle: 'Report an Issue', headerTintColor: GREEN }}
      />
    </Stack.Navigator>
    </NotificationCountProvider>
  );
}
