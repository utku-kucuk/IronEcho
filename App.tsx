import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NativeBaseProvider } from 'native-base';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Services and database
import { realmDB } from './src/database/realm';
import { syncService } from './src/services/syncService';
import { apiClient } from './src/services/api';

// Types
import { 
  RootStackParamList, 
  MainTabParamList, 
  User, 
  SyncStatus 
} from './src/types';

// Screens (we'll create these next)
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import WorkoutScreen from './src/screens/WorkoutScreen';
import StatisticsScreen from './src/screens/StatisticsScreen';
import MeasurementsScreen from './src/screens/MeasurementsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import WorkoutEntryScreen from './src/screens/WorkoutEntryScreen';
import MeasurementEntryScreen from './src/screens/MeasurementEntryScreen';
import WeeklyProgramScreen from './src/screens/WeeklyProgramScreen';

// Context
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SyncProvider, useSync } from './src/context/SyncContext';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Main Tab Navigator
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Workout') {
            iconName = focused ? 'fitness' : 'fitness-outline';
          } else if (route.name === 'Statistics') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Measurements') {
            iconName = focused ? 'body' : 'body-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Workout" 
        component={WorkoutScreen}
        options={{ title: 'Workout' }}
      />
      <Tab.Screen 
        name="Statistics" 
        component={StatisticsScreen}
        options={{ title: 'Statistics' }}
      />
      <Tab.Screen 
        name="Measurements" 
        component={MeasurementsScreen}
        options={{ title: 'Measurements' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

// Root Stack Navigator
function RootNavigator() {
  const { user, isLoading } = useAuth();
  const { syncStatus } = useSync();

  if (isLoading) {
    // Show loading screen
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        // User is not authenticated
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : !user.profile ? (
        // User is authenticated but hasn't completed onboarding
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        // User is authenticated and onboarded
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="WorkoutEntry" component={WorkoutEntryScreen} />
          <Stack.Screen name="MeasurementEntry" component={MeasurementEntryScreen} />
          <Stack.Screen name="WeeklyProgram" component={WeeklyProgramScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

// Main App Component
export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize Realm database
      await realmDB.initialize();
      
      // Start sync service
      syncService.startAutoSync(5); // Sync every 5 minutes
      
      setIsInitialized(true);
      console.log('✅ App initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      setIsInitialized(true); // Still show app even if initialization fails
    }
  };

  if (!isInitialized) {
    // Show splash screen
    return null;
  }

  return (
    <SafeAreaProvider>
      <NativeBaseProvider>
        <AuthProvider>
          <SyncProvider>
            <NavigationContainer>
              <RootNavigator />
              <StatusBar style="auto" />
            </NavigationContainer>
          </SyncProvider>
        </AuthProvider>
      </NativeBaseProvider>
    </SafeAreaProvider>
  );
}