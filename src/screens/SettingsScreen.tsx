import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Center,
  Heading,
  Icon,
  ScrollView,
  Button,
  useToast,
  Switch,
  useColorMode
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { isOnline, isSyncing, pendingCount, lastSync, startSync } = useSync();
  const toast = useToast();
  const navigation = useNavigation();
  const { colorMode, toggleColorMode } = useColorMode();

  const handleLogout = async () => {
    try {
      await logout();
      toast.show({
        title: 'Logged out',
        description: 'You have been logged out successfully',
      });
    } catch (error) {
      toast.show({
        title: 'Error',
        description: 'Failed to log out',
      });
    }
  };

  const handleSync = async () => {
    try {
      await startSync();
      toast.show({
        title: 'Sync started',
        description: 'Syncing your data...'
      });
    } catch (error) {
      toast.show({
        title: 'Sync failed',
        description: 'Failed to sync data',
      });
    }
  };

  const formatLastSync = (date: Date | undefined) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const pageBg = colorMode === 'dark' ? 'gray.900' : 'gray.50';
  const headerBg = colorMode === 'dark' ? 'gray.900' : 'white';
  const cardBg = colorMode === 'dark' ? 'gray.800' : 'white';
  const textPrimary = colorMode === 'dark' ? 'gray.100' : 'gray.800';
  const textSecondary = colorMode === 'dark' ? 'gray.300' : 'gray.600';
  const borderColor = colorMode === 'dark' ? 'gray.700' : 'gray.200';
  const syncingColor = colorMode === 'dark' ? 'blue.300' : 'blue.600';
  return (
    <Box flex={1} bg={pageBg} safeArea>
      {/* Header */}
      <Box bg={headerBg} px={6} py={4} borderBottomWidth={1} borderBottomColor={borderColor}>
        <Heading size="lg" color={textPrimary}>
          Settings
        </Heading>
        <Text fontSize="sm" color={textSecondary}>
          Manage your account and preferences
        </Text>
      </Box>

      {/* Content */}
      <ScrollView flex={1}>
        <VStack space={4} p={6}>
          {/* Appearance */}
          <Box bg={cardBg} p={4} borderRadius="lg" shadow={1}>
            <HStack alignItems="center" justifyContent="space-between">
              <HStack space={3} alignItems="center">
                <Icon as={Ionicons} name="moon" size="lg" color="purple.500" />
                <VStack>
                  <Text fontSize="lg" fontWeight="bold" color={textPrimary}>Appearance</Text>
                  <Text fontSize="sm" color={textSecondary}>Dark Mode</Text>
                </VStack>
              </HStack>
              <Switch isChecked={colorMode === 'dark'} onToggle={toggleColorMode} />
            </HStack>
          </Box>
          {/* User Info */}
          <Box bg={cardBg} p={4} borderRadius="lg" shadow={1}>
            <VStack space={3}>
              <HStack alignItems="center" space={3}>
                <Icon as={Ionicons} name="person" size="lg" color="primary.500" />
                <VStack flex={1}>
                  <Text fontSize="lg" fontWeight="bold" color={textPrimary}>
                    Profile
                  </Text>
                  <Text fontSize="sm" color={textSecondary}>
                    {user?.email}
                  </Text>
                </VStack>
              </HStack>
              
              {user?.profile && (
                <VStack space={2} pl={12}>
                  <HStack justifyContent="space-between">
                    <Text fontSize="sm" color={textSecondary}>Gender:</Text>
                    <Text fontSize="sm" color={textPrimary} textTransform="capitalize">
                      {user.profile.gender}
                    </Text>
                  </HStack>
                  <HStack justifyContent="space-between">
                    <Text fontSize="sm" color={textSecondary}>Units:</Text>
                    <Text fontSize="sm" color={textPrimary} textTransform="capitalize">
                      {user.profile.units}
                    </Text>
                  </HStack>
                  <HStack justifyContent="space-between">
                    <Text fontSize="sm" color={textSecondary}>Language:</Text>
                    <Text fontSize="sm" color={textPrimary} textTransform="uppercase">
                      {user.profile.language}
                    </Text>
                  </HStack>
                </VStack>
              )}
            </VStack>
          </Box>

          {/* Sync Status */}
          <Box bg={cardBg} p={4} borderRadius="lg" shadow={1}>
            <VStack space={3}>
              <HStack alignItems="center" space={3}>
                <Icon 
                  as={Ionicons} 
                  name={isOnline ? "cloud-done" : "cloud-offline"} 
                  size="lg" 
                  color={isOnline ? "green.500" : "orange.500"} 
                />
                <VStack flex={1}>
                  <Text fontSize="lg" fontWeight="bold" color={textPrimary}>
                    Sync Status
                  </Text>
                  <Text fontSize="sm" color={textSecondary}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Text>
                </VStack>
              </HStack>
              
              <VStack space={2} pl={12}>
                <HStack justifyContent="space-between">
                  <Text fontSize="sm" color={textSecondary}>Last Sync:</Text>
                  <Text fontSize="sm" color={textPrimary}>
                    {formatLastSync(lastSync)}
                  </Text>
                </HStack>
                <HStack justifyContent="space-between">
                  <Text fontSize="sm" color={textSecondary}>Pending:</Text>
                  <Text fontSize="sm" color={textPrimary}>
                    {pendingCount} items
                  </Text>
                </HStack>
                <HStack justifyContent="space-between">
                  <Text fontSize="sm" color={textSecondary}>Status:</Text>
                  <Text fontSize="sm" color={isSyncing ? syncingColor : textPrimary}>
                    {isSyncing ? 'Syncing...' : 'Idle'}
                  </Text>
                </HStack>
              </VStack>

              {isOnline && (
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="primary"
                  onPress={handleSync}
                  isLoading={isSyncing}
                  isLoadingText="Syncing..."
                >
                  Sync Now
                </Button>
              )}
            </VStack>
          </Box>

          {/* App Info */}
          <Box bg={cardBg} p={4} borderRadius="lg" shadow={1}>
            <VStack space={3}>
              <HStack alignItems="center" space={3}>
                <Icon as={Ionicons} name="information-circle" size="lg" color="blue.500" />
                <VStack flex={1}>
                  <Text fontSize="lg" fontWeight="bold" color={textPrimary}>
                    App Information
                  </Text>
                  <Text fontSize="sm" color={textSecondary}>
                    IronEcho v1.0.0
                  </Text>
                </VStack>
              </HStack>
              
              <VStack space={2} pl={12}>
                <Text fontSize="sm" color={textSecondary}>
                  • 100% Offline-first design
                </Text>
                <Text fontSize="sm" color={textSecondary}>
                  • Automatic sync when online
                </Text>
                <Text fontSize="sm" color={textSecondary}>
                  • Self-hosted backend support
                </Text>
                <Text fontSize="sm" color={textSecondary}>
                  • Progressive overload tracking
                </Text>
              </VStack>
            </VStack>
          </Box>

          {/* Exercise Images */}
          <Button
            size="lg"
            variant="outline"
            onPress={() => (navigation as any).navigate('ExerciseImagesManagement')}
            leftIcon={<Icon as={Ionicons} name="images" size="sm" />}
          >
            Exercise Images
          </Button>

          {/* Logout */}
          <Button
            size="lg"
            colorScheme="red"
            variant="outline"
            onPress={handleLogout}
            leftIcon={<Icon as={Ionicons} name="log-out" size="sm" />}
          >
            Log Out
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
