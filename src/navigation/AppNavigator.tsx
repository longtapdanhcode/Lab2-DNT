import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Platform, ActivityIndicator, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useBookingStore } from '../store/useBookingStore';

import { LoginScreen } from '../screens/LoginScreen';
import { RoomDiscoveryScreen } from '../screens/RoomDiscoveryScreen';
import { RoomDetailScreen } from '../screens/RoomDetailScreen';
import { MyBookingsScreen } from '../screens/MyBookingsScreen';
import { BookingPassScreen } from '../screens/BookingPassScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  RoomDetail: { roomId: string };
  BookingPass: { bookingId: string };
};

export type AuthStackParamList = {
  Login: undefined;
};

export type BottomTabParamList = {
  DiscoveryTab: undefined;
  BookingsTab: undefined;
  ProfileTab: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0052CC',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="DiscoveryTab"
        component={RoomDiscoveryScreen}
        options={{
          tabBarLabel: 'Rooms & Labs',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BookingsTab"
        component={MyBookingsScreen}
        options={{
          tabBarLabel: 'My Bookings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  const { userProfile } = useAuth();
  const setAuthUser = useBookingStore((state) => state.setAuthUser);
  const loadRooms = useBookingStore((state) => state.loadRooms);
  const loadUserBookings = useBookingStore((state) => state.loadUserBookings);
  const loadAllBookings = useBookingStore((state) => state.loadAllBookings);

  // Sync auth user data into the booking store
  useEffect(() => {
    if (userProfile) {
      setAuthUser({
        userId: userProfile.id,
        name: userProfile.full_name || userProfile.email,
        email: userProfile.email,
        studentId: userProfile.student_id || '',
        avatarUrl: userProfile.avatar_url || '',
      });

      // Load data from Supabase
      loadRooms();
      loadUserBookings();
      loadAllBookings();
    }
  }, [userProfile]);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MainTabs" component={BottomTabs} />
      <Stack.Screen
        name="RoomDetail"
        component={RoomDetailScreen}
        options={{
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="BookingPass"
        component={BookingPassScreen}
        options={{
          animation: 'fade_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
      <ActivityIndicator size="large" color="#0052CC" />
    </View>
  );
}

export const AppNavigator: React.FC = () => {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={LoadingScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      {session ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};
