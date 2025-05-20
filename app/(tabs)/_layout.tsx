import React, { lazy, Suspense } from 'react';
import { Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Chrome as Home, Users, Package, Settings } from 'lucide-react-native';

// Lazy icon loading fallback
const IconFallback = () => (
  <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="small" color="#999" />
  </View>
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0066CC',
        // Improve tab bar performance on web
        tabBarStyle: { 
          borderTopWidth: 1, 
          borderTopColor: '#f0f0f0',
          height: 60
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => (
            <Suspense fallback={<IconFallback />}>
              <Home size={size} color={color} />
            </Suspense>
          ),
        }}
      />
      <Tabs.Screen
        name="clients/index"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ size, color }) => (
            <Suspense fallback={<IconFallback />}>
              <Users size={size} color={color} />
            </Suspense>
          ),
        }}
      />
      <Tabs.Screen
        name="products/index"
        options={{
          title: 'Productos',
          tabBarIcon: ({ size, color }) => (
            <Suspense fallback={<IconFallback />}>
              <Package size={size} color={color} />
            </Suspense>
          ),
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ size, color }) => (
            <Suspense fallback={<IconFallback />}>
              <Settings size={size} color={color} />
            </Suspense>
          ),
        }}
      />
    </Tabs>
  );
}