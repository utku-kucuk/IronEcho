import React, { useEffect, useState } from 'react';
import { Box, VStack, HStack, Text, Button, Icon, Heading, Divider, useToast, AlertDialog } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { realmDB } from '../database/realm';
import { Workout } from '../types';

export default function WorkoutDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const toast = useToast();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const cancelRef = React.useRef(null);

  useEffect(() => {
    const id = route.params?.id as string | undefined;
    if (!id) return;
    const w = realmDB.getWorkoutById(id);
    if (w) setWorkout(w);
  }, [route.params]);

  const formatDate = (date: Date) => new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(date);

  const onEdit = () => {
    if (!workout) return;
    // Navigate to entry screen in edit mode
    // @ts-ignore
    (navigation as any).navigate('WorkoutEntry', { editWorkoutId: workout._id });
  };

  const onDelete = () => {
    if (!workout) return;
    const ok = realmDB.deleteWorkout(workout._id);
    if (ok) {
      toast.show({ title: 'Deleted', description: 'Workout removed' });
      // @ts-ignore
      (navigation as any).goBack();
    } else {
      toast.show({ title: 'Error', description: 'Could not delete workout' });
    }
  };

  if (!workout) {
    return (
      <Box flex={1} bg="gray.50" safeArea alignItems="center" justifyContent="center">
        <Text color="gray.500">Workout not found</Text>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="gray.50" safeArea>
      <HStack alignItems="center" justifyContent="space-between" px={4} py={3} bg="white" borderBottomWidth={1} borderBottomColor="gray.200">
        <HStack alignItems="center" space={2}>
          <Button variant="ghost" onPress={() => (navigation as any).goBack()} leftIcon={<Icon as={Ionicons} name="chevron-back" />}>Back</Button>
          <Text fontSize="lg" fontWeight="bold">{formatDate(new Date(workout.date))}</Text>
        </HStack>
        <HStack space={2}>
          <Button variant="outline" onPress={onEdit} leftIcon={<Icon as={Ionicons} name="create-outline" />}>Edit</Button>
          <Button colorScheme="red" variant="outline" onPress={() => setIsDeleteOpen(true)} leftIcon={<Icon as={Ionicons} name="trash" />}>Delete</Button>
        </HStack>
      </HStack>

      <VStack space={3} p={4}>
        <Heading size="md">Exercises</Heading>
        {workout.exercises.map((ex: any, idx: number) => (
          <VStack key={idx} bg="white" p={4} borderRadius="lg" shadow={1} space={2}>
            <HStack justifyContent="space-between" alignItems="center">
              <Text fontWeight="semibold">{ex.name}</Text>
              <Text color="gray.600">{ex.sets.length} sets</Text>
            </HStack>
            <Divider />
            <VStack space={1}>
              {ex.sets.map((s: any, si: number) => (
                <HStack key={si} justifyContent="space-between">
                  <Text color="gray.700">Set {si + 1}</Text>
                  <Text color="gray.700">{s.reps} reps @ {s.weight ?? 0} kg</Text>
                </HStack>
              ))}
            </VStack>
          </VStack>
        ))}
      </VStack>

      <AlertDialog leastDestructiveRef={cancelRef} isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)}>
        <AlertDialog.Content>
          <AlertDialog.Header>Delete Workout</AlertDialog.Header>
          <AlertDialog.Body>
            This will remove this workout permanently. This action cannot be undone.
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button variant="ghost" ref={cancelRef} onPress={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button colorScheme="red" onPress={onDelete} ml={2}>Delete</Button>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </Box>
  );
}


