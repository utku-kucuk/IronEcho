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
  useToast
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { isOnline, isSyncing, pendingCount, lastSync, startSync } = useSync();
  const toast = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast.show({
        title: 'Logged out',
        description: 'You have been logged out successfully',
        status: 'success'
      });
    } catch (error) {
      toast.show({
        title: 'Error',
        description: 'Failed to log out',
        status: 'error'
      });
    }
  };

  const handleSync = async () => {
    try {
      await startSync();
      toast.show({
        title: 'Sync started',
        description: 'Syncing your data...',
        status: 'info'
      });
    } catch (error) {
      toast.show({
        title: 'Sync failed',
        description: 'Failed to sync data',
        status: 'error'
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

  return (
    <Box flex={1} bg="gray.50" safeArea>
      {/* Header */}
      <Box bg="white" px={6} py={4} borderBottomWidth={1} borderBottomColor="gray.200">
        <Heading size="lg" color="gray.800">
          Settings
        </Heading>
        <Text fontSize="sm" color="gray.600">
          Manage your account and preferences
        </Text>
      </Box>

      {/* Content */}
      <ScrollView flex={1}>
        <VStack space={4} p={6}>
          {/* User Info */}
          <Box bg="white" p={4} borderRadius="lg" shadow={1}>
            <VStack space={3}>
              <HStack alignItems="center" space={3}>
                <Icon as={Ionicons} name="person" size="lg" color="primary.500" />
                <VStack flex={1}>
                  <Text fontSize="lg" fontWeight="bold" color="gray.800">
                    Profile
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {user?.email}
                  </Text>
                </VStack>
              </HStack>
              
              {user?.profile && (
                <VStack space={2} pl={12}>
                  <HStack justifyContent="space-between">
                    <Text fontSize="sm" color="gray.600">Gender:</Text>
                    <Text fontSize="sm" color="gray.800" textTransform="capitalize">
                      {user.profile.gender}
                    </Text>
                  </HStack>
                  <HStack justifyContent="space-between">
                    <Text fontSize="sm" color="gray.600">Units:</Text>
                    <Text fontSize="sm" color="gray.800" textTransform="capitalize">
                      {user.profile.units}
                    </Text>
                  </HStack>
                  <HStack justifyContent="space-between">
                    <Text fontSize="sm" color="gray.600">Language:</Text>
                    <Text fontSize="sm" color="gray.800" textTransform="uppercase">
                      {user.profile.language}
                    </Text>
                  </HStack>
                </VStack>
              )}
            </VStack>
          </Box>

          {/* Sync Status */}
          <Box bg="white" p={4} borderRadius="lg" shadow={1}>
            <VStack space={3}>
              <HStack alignItems="center" space={3}>
                <Icon 
                  as={Ionicons} 
                  name={isOnline ? "cloud-done" : "cloud-offline"} 
                  size="lg" 
                  color={isOnline ? "green.500" : "orange.500"} 
                />
                <VStack flex={1}>
                  <Text fontSize="lg" fontWeight="bold" color="gray.800">
                    Sync Status
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {isOnline ? 'Online' : 'Offline'}
                  </Text>
                </VStack>
              </HStack>
              
              <VStack space={2} pl={12}>
                <HStack justifyContent="space-between">
                  <Text fontSize="sm" color="gray.600">Last Sync:</Text>
                  <Text fontSize="sm" color="gray.800">
                    {formatLastSync(lastSync)}
                  </Text>
                </HStack>
                <HStack justifyContent="space-between">
                  <Text fontSize="sm" color="gray.600">Pending:</Text>
                  <Text fontSize="sm" color="gray.800">
                    {pendingCount} items
                  </Text>
                </HStack>
                <HStack justifyContent="space-between">
                  <Text fontSize="sm" color="gray.600">Status:</Text>
                  <Text fontSize="sm" color={isSyncing ? "blue.600" : "gray.800"}>
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
                  loadingText="Syncing..."
                >
                  Sync Now
                </Button>
              )}
            </VStack>
          </Box>

          {/* App Info */}
          <Box bg="white" p={4} borderRadius="lg" shadow={1}>
            <VStack space={3}>
              <HStack alignItems="center" space={3}>
                <Icon as={Ionicons} name="information-circle" size="lg" color="blue.500" />
                <VStack flex={1}>
                  <Text fontSize="lg" fontWeight="bold" color="gray.800">
                    App Information
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    IronEcho v1.0.0
                  </Text>
                </VStack>
              </HStack>
              
              <VStack space={2} pl={12}>
                <Text fontSize="sm" color="gray.600">
                  • 100% Offline-first design
                </Text>
                <Text fontSize="sm" color="gray.600">
                  • Automatic sync when online
                </Text>
                <Text fontSize="sm" color="gray.600">
                  • Self-hosted backend support
                </Text>
                <Text fontSize="sm" color="gray.600">
                  • Progressive overload tracking
                </Text>
              </VStack>
            </VStack>
          </Box>

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
