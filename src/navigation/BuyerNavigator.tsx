import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import ProductsScreen from '../screens/buyer/ProductsScreen';
import ProductDetailScreen from '../screens/buyer/ProductDetailScreen';
import CartScreen from '../screens/buyer/CartScreen';
import CheckoutScreen from '../screens/buyer/CheckoutScreen';
import OrdersScreen from '../screens/buyer/OrdersScreen';
import OrderDetailScreen from '../screens/buyer/OrderDetailScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ReviewScreen from '../screens/buyer/ReviewScreen';
import ReportIssueScreen from '../screens/shared/ReportIssueScreen';
import { CartCountProvider, useCartCount } from '../store/cartStore';
import { NotificationCountProvider, useNotificationCount } from '../store/notificationStore';

import { Colors } from '../utils/theme';

export type SubmittedReview = {
  driverRating?: number;
  driverComment?: string;
  productReviews: Array<{ productId: string; productName: string; rating: number; comment?: string }>;
};

export type BuyerStackParamList = {
  Products: undefined;
  ProductDetail: { productIds: string[] };
  Cart: undefined;
  Checkout: undefined;
  Orders: undefined;
  OrderDetail: { orderId: string; submittedReview?: SubmittedReview };
  Review: { orderId: string };
  Profile: undefined;
  Notifications: undefined;
  ReportIssue: undefined;
};

type TabParamList = {
  ProductsTab: undefined;
  CartTab: undefined;
  OrdersTab: undefined;
  ProfileTab: undefined;
  NotificationsTab: undefined;
};

const Stack = createNativeStackNavigator<BuyerStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ emoji, focused }: { emoji: string; label: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

function BuyerTabs() {
  const { cartCount } = useCartCount();
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
      }}>
      <Tab.Screen
        name="ProductsTab"
        component={ProductsScreen as React.ComponentType<any>}
        options={{ title: 'Shop', tabBarLabel: 'Shop', tabBarIcon: ({ focused }) => <TabIcon emoji="🛍️" label="Shop" focused={focused} /> }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartScreen as React.ComponentType<any>}
        options={{
          title: 'Cart',
          tabBarLabel: 'Cart',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🛒" label="Cart" focused={focused} />,
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersScreen as React.ComponentType<any>}
        options={{ title: 'Orders', tabBarLabel: 'Orders', tabBarIcon: ({ focused }) => <TabIcon emoji="📦" label="Orders" focused={focused} /> }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen as React.ComponentType<any>}
        options={{ title: 'Notifications', tabBarLabel: 'Alerts', tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" label="Alerts" focused={focused} />, tabBarBadge: unreadCount > 0 ? unreadCount : undefined }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen as React.ComponentType<any>}
        options={{ title: 'Profile', tabBarLabel: 'Profile', tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function BuyerNavigator() {
  return (
    <NotificationCountProvider>
      <CartCountProvider>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }}>
        <Stack.Screen name="Products" component={BuyerTabs} options={{ headerShown: false }} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product Details' }} />
        <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'My Cart' }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
        <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'My Orders' }} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Details' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
        <Stack.Screen name="Review" component={ReviewScreen} options={{ title: 'Confirm & Review' }} />
        <Stack.Screen name="ReportIssue" component={ReportIssueScreen} options={{ title: 'Report an Issue' }} />
      </Stack.Navigator>
    </CartCountProvider>
    </NotificationCountProvider>
  );
}
