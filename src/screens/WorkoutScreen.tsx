import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  FlatList,
  useToast,
  Center,
  Heading,
  Icon,
  Pressable,
  Badge,
  Spinner
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { realmDB } from '../database/realm';
import { Workout } from '../types';

export default function WorkoutScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { user } = useAuth();
  const { isOnline, pendingCount } = useSync();
  const navigation = useNavigation();
  const toast = useToast();

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      setIsLoading(true);
      if (user) {
        const userWorkouts = realmDB.getWorkouts(user._id, 20, 0);
        setWorkouts(userWorkouts);
      }
    } catch (error) {
      console.error('Failed to load workouts:', error);
      toast.show({
        title: 'Error',
        description: 'Failed to load workouts',
        status: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const getTotalVolume = (workout: Workout) => {
    return workout.exercises.reduce((total, exercise) => {
      return total + exercise.sets.reduce((exerciseTotal, set) => {
        return exerciseTotal + (set.weight || 0) * set.reps;
      }, 0);
    }, 0);
  };

  const renderWorkoutItem = ({ item }: { item: Workout }) => (
    <Pressable onPress={() => {/* Navigate to workout detail */}}>
      <Box
        bg="white"
        p={4}
        borderRadius="lg"
        mb={3}
        shadow={1}
        borderLeftWidth={4}
        borderLeftColor={item.isPR ? 'yellow.400' : 'primary.500'}
      >
        <HStack justifyContent="space-between" alignItems="center" mb={2}>
          <VStack flex={1}>
            <Text fontSize="lg" fontWeight="bold" color="gray.800">
              {formatDate(item.date)}
            </Text>
            <Text fontSize="sm" color="gray.600">
              {item.exercises.length} exercise{item.exercises.length !== 1 ? 's' : ''}
            </Text>
          </VStack>
          <VStack alignItems="flex-end">
            <Text fontSize="md" fontWeight="semibold" color="primary.600">
              {getTotalVolume(item).toFixed(0)} kg
            </Text>
            {item.isPR && (
              <Badge colorScheme="yellow" variant="solid" size="sm">
                PR
              </Badge>
            )}
          </VStack>
        </HStack>
        
        <VStack space={1}>
          {item.exercises.slice(0, 2).map((exercise, index) => (
            <HStack key={index} justifyContent="space-between">
              <Text fontSize="sm" color="gray.700" flex={1}>
                {exercise.name}
              </Text>
              <Text fontSize="sm" color="gray.600">
                {exercise.sets.length} set{exercise.sets.length !== 1 ? 's' : ''}
              </Text>
            </HStack>
          ))}
          {item.exercises.length > 2 && (
            <Text fontSize="sm" color="gray.500">
              +{item.exercises.length - 2} more exercise{item.exercises.length - 2 !== 1 ? 's' : ''}
            </Text>
          )}
        </VStack>
      </Box>
    </Pressable>
  );

  const renderEmptyState = () => (
    <Center flex={1} px={6}>
      <VStack space={4} alignItems="center">
        <Icon as={Ionicons} name="fitness-outline" size="4xl" color="gray.400" />
        <VStack space={2} alignItems="center">
          <Heading size="lg" color="gray.600">
            No Workouts Yet
          </Heading>
          <Text fontSize="md" color="gray.500" textAlign="center">
            Start your fitness journey by logging your first workout
          </Text>
        </VStack>
        <Button
          size="lg"
          colorScheme="primary"
          onPress={() => {/* Navigate to workout entry */}}
        >
          Log Workout
        </Button>
      </VStack>
    </Center>
  );

  if (isLoading) {
    return (
      <Box flex={1} bg="gray.50" safeArea>
        <Center flex={1}>
          <Spinner size="lg" color="primary.500" />
          <Text mt={4} color="gray.600">Loading workouts...</Text>
        </Center>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="gray.50" safeArea>
      {/* Header */}
      <Box bg="white" px={6} py={4} borderBottomWidth={1} borderBottomColor="gray.200">
        <HStack justifyContent="space-between" alignItems="center">
          <VStack>
            <Heading size="lg" color="gray.800">
              Workouts
            </Heading>
            <HStack space={2} alignItems="center">
              <Text fontSize="sm" color="gray.600">
                {workouts.length} workout{workouts.length !== 1 ? 's' : ''}
              </Text>
              {!isOnline && (
                <Badge colorScheme="orange" variant="subtle" size="sm">
                  Offline
                </Badge>
              )}
              {pendingCount > 0 && (
                <Badge colorScheme="blue" variant="subtle" size="sm">
                  {pendingCount} pending
                </Badge>
              )}
            </HStack>
          </VStack>
          <Button
            size="sm"
            colorScheme="primary"
            onPress={() => (navigation as any).navigate('WorkoutEntry' as never)}
            leftIcon={<Icon as={Ionicons} name="add" size="sm" />}
          >
            New
          </Button>
        </HStack>
      </Box>

      {/* Workouts List */}
      {workouts.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={workouts}
          renderItem={renderWorkoutItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          refreshing={isLoading}
          onRefresh={loadWorkouts}
        />
      )}
    </Box>
  );
}
