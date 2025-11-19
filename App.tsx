import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NativeBaseProvider, extendTheme, useColorMode } from 'native-base';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, DarkTheme as RNDarkTheme, DefaultTheme as RNLightTheme } from '@react-navigation/native';
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
import WorkoutDetailScreen from './src/screens/WorkoutDetailScreen';
import ExerciseImagesManagementScreen from './src/screens/ExerciseImagesManagementScreen';
import WorkoutHistoryScreen from './src/screens/WorkoutHistoryScreen';

// Context
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SyncProvider, useSync } from './src/context/SyncContext';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Main Tab Navigator
function MainTabNavigator() {
  const { colorMode } = useColorMode();
  const tabActive = colorMode === 'dark' ? '#8EA6FF' : '#007AFF';
  const tabInactive = colorMode === 'dark' ? '#94A3B8' : 'gray';
  const tabBg = colorMode === 'dark' ? '#0E1730' : '#FFFFFF';
  const tabBorder = colorMode === 'dark' ? '#1E2A4A' : '#E5E7EB';
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
        tabBarActiveTintColor: tabActive,
        tabBarInactiveTintColor: tabInactive,
        tabBarStyle: { backgroundColor: tabBg, borderTopColor: tabBorder },
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
          <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
          <Stack.Screen name="ExerciseImagesManagement" component={ExerciseImagesManagementScreen} />
          <Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

// Inner App with Auth and Sync
function InnerApp() {
  const { colorMode } = useColorMode();
  const navTheme = colorMode === 'dark'
    ? { ...RNDarkTheme, colors: { ...RNDarkTheme.colors, primary: '#8EA6FF', background: '#0B1220', card: '#0E1730', text: '#E6EAF5', border: '#1E2A4A' } }
    : { ...RNLightTheme, colors: { ...RNLightTheme.colors, primary: '#0D6EFD', background: '#F7F7FB', card: '#FFFFFF', text: '#1F2937', border: '#E5E7EB' } };
  return (
    <AuthProvider>
      <SyncProvider>
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
          <StatusBar style={colorMode === 'dark' ? 'light' : 'dark'} />
        </NavigationContainer>
      </SyncProvider>
    </AuthProvider>
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
      <NativeBaseProvider theme={extendTheme({ config: { initialColorMode: 'light', useSystemColorMode: false } })} colorModeManager={{
        get: async () => {
          try {
            const val = await AsyncStorage.getItem('@ie_color_mode');
            return val === 'dark' ? 'dark' : 'light';
          } catch { return 'light'; }
        },
        set: async (value: any) => {
          try { await AsyncStorage.setItem('@ie_color_mode', value === 'dark' ? 'dark' : 'light'); } catch {}
        }
      }}>
        <InnerApp />
      </NativeBaseProvider>
    </SafeAreaProvider>
  );
}