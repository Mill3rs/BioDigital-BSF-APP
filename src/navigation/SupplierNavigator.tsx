import React, { useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Animated, Text, TouchableOpacity } from 'react-native';

import SubmitWasteScreen from '../screens/supplier/SubmitWasteScreen';
import WasteListScreen from '../screens/supplier/WasteListScreen';
import DriverTrackingScreen from '../screens/supplier/DriverTrackingScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ReportIssueScreen from '../screens/shared/ReportIssueScreen';
import PayoutScreen from '../screens/supplier/PayoutScreen';

import { Colors } from '../utils/theme';
import { NotificationCountProvider, useNotificationCount } from '../store/notificationStore';
import { useSyncStore } from '../store/syncStore';

// ─── Sync header button ────────────────────────────────────────────────────────

function SyncHeaderButton() {
  const { phase, triggerSync } = useSyncStore();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const isSyncing = phase === 'syncing';

  useEffect(() => {
    if (isSyncing) {
      loopRef.current = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      spinAnim.setValue(0);
    }
  }, [isSyncing, spinAnim]);

  const rotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const color = phase === 'error' ? '#ff6b6b' : '#fff';

  return (
    <TouchableOpacity
      onPress={triggerSync}
      disabled={isSyncing}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ marginRight: 14 }}>
      <Animated.Text style={{ fontSize: 22, color, transform: [{ rotate }] }}>↻</Animated.Text>
    </TouchableOpacity>
  );
}

export type SupplierStackParamList = {
  SubmitWaste: undefined;
  WasteList: undefined;
  Profile: undefined;
  Notifications: undefined;
  ReportIssue: undefined;
  Payout: undefined;
  DriverTracking: {
    wasteId: string;
    supplierCoords?: { latitude: number; longitude: number };
    supplierAddress?: string;
    driverName?: string;
  };
};

type TabParamList = {
  SubmitWasteTab: undefined;
  WasteListTab: undefined;
  NotificationsTab: undefined;
  PayoutTab: undefined;
  ProfileTab: undefined;
};

const Stack = createNativeStackNavigator<SupplierStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

const renderSyncButton = () => <SyncHeaderButton />;

function SupplierTabs() {
  const { unreadCount } = useNotificationCount();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: { borderTopColor: Colors.border },
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerRight: renderSyncButton,
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
        options={{ title: 'Notifications', tabBarLabel: 'Alerts', tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" focused={focused} />, tabBarBadge: unreadCount > 0 ? unreadCount : undefined }}
      />
      <Tab.Screen
        name="PayoutTab"
        component={PayoutScreen}
        options={{ title: 'Payout', tabBarLabel: 'Payout', tabBarIcon: ({ focused }) => <TabIcon emoji="💰" focused={focused} />, headerShown: false }}
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
    <NotificationCountProvider>
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
      <Stack.Screen name="ReportIssue" component={ReportIssueScreen} options={{ title: 'Report an Issue' }} />
      <Stack.Screen name="Payout" component={PayoutScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DriverTracking" component={DriverTrackingScreen} options={{ title: 'Track Driver', headerTransparent: true, headerTintColor: '#1a1a1a' }} />
    </Stack.Navigator>
    </NotificationCountProvider>
  );
}
