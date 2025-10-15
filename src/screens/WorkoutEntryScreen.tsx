import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Icon,
  ScrollView,
  useToast,
  Divider
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { realmDB } from '../database/realm';
import { useAuth } from '../context/AuthContext';

type ExerciseSetForm = { reps: string; weight: string };
type ExerciseForm = {
  name: string;
  muscleGroup: string;
  type: 'strength' | 'bodyweight' | 'cardio';
  weightBased: boolean;
  sets: ExerciseSetForm[];
};

export default function WorkoutEntryScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const toast = useToast();

  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<ExerciseForm[]>([{
    name: '', muscleGroup: 'other', type: 'strength', weightBased: true, sets: [{ reps: '', weight: '' }]
  }]);

  const addExercise = () => {
    setExercises(prev => [...prev, { name: '', muscleGroup: 'other', type: 'strength', weightBased: true, sets: [{ reps: '', weight: '' }] }]);
  };

  const removeExercise = (idx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  };

  const addSet = (exIdx: number) => {
    setExercises(prev => prev.map((ex, i) => i === exIdx ? { ...ex, sets: [...ex.sets, { reps: '', weight: '' }] } : ex));
  };

  const updateExercise = (idx: number, field: keyof ExerciseForm, value: any) => {
    setExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex));
  };

  const updateSet = (exIdx: number, setIdx: number, field: keyof ExerciseSetForm, value: string) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      const sets = ex.sets.map((s, si) => si === setIdx ? { ...s, [field]: value } : s);
      return { ...ex, sets };
    }));
  };

  const saveWorkout = () => {
    try {
      if (!user) throw new Error('Not authenticated');

      const parsedExercises = exercises
        .filter(e => e.name.trim() && e.sets.some(s => !!s.reps))
        .map(e => ({
          name: e.name.trim(),
          muscleGroup: e.muscleGroup as any,
          equipment: undefined,
          type: e.type,
          weightBased: e.weightBased,
          sets: e.sets
            .filter(s => s.reps)
            .map(s => ({ reps: parseInt(s.reps, 10) || 0, weight: e.weightBased ? (parseFloat(s.weight) || 0) : undefined }))
        }));

      const totalVolume = parsedExercises.reduce((t, ex) => t + ex.sets.reduce((et, s) => et + (s.weight || 0) * s.reps, 0), 0);

      realmDB.createWorkout({
        userId: user._id,
        date: new Date(date),
        warmup: undefined,
        exercises: parsedExercises,
        notes,
        totalVolume,
        isPR: false,
        lastModified: new Date(),
        clientTimestamp: new Date()
      } as any);

      toast.show({ title: 'Saved', description: 'Workout saved locally', status: 'success' });
      // @ts-ignore
      navigation.goBack();
    } catch (e: any) {
      toast.show({ title: 'Error', description: e.message || 'Failed to save workout', status: 'error' });
    }
  };

  return (
    <Box flex={1} bg="gray.50" safeArea>
      <HStack alignItems="center" justifyContent="space-between" px={4} py={3} bg="white" borderBottomWidth={1} borderBottomColor="gray.200">
        <HStack alignItems="center" space={2}>
          <Button variant="ghost" onPress={() => (navigation as any).goBack()} leftIcon={<Icon as={Ionicons} name="chevron-back" />}>Back</Button>
          <Text fontSize="lg" fontWeight="bold">New Workout</Text>
        </HStack>
        <Button colorScheme="primary" onPress={saveWorkout} leftIcon={<Icon as={Ionicons} name="save" />}>Save</Button>
      </HStack>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <VStack space={4}>
          <VStack space={2} bg="white" p={4} borderRadius="lg" shadow={1}>
            <Text fontWeight="semibold">Date</Text>
            <Input value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
            <Text fontWeight="semibold" mt={2}>Notes</Text>
            <Input value={notes} onChangeText={setNotes} placeholder="Optional notes" />
          </VStack>

          {exercises.map((ex, idx) => (
            <VStack key={idx} space={3} bg="white" p={4} borderRadius="lg" shadow={1}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontWeight="semibold">Exercise {idx + 1}</Text>
                <Button variant="outline" size="sm" colorScheme="red" onPress={() => removeExercise(idx)} leftIcon={<Icon as={Ionicons} name="trash" />}>Remove</Button>
              </HStack>
              <Input placeholder="Name (e.g., Bench Press)" value={ex.name} onChangeText={t => updateExercise(idx, 'name', t)} />
              <HStack space={2}>
                <Input flex={1} placeholder="Muscle Group (e.g., chest)" value={ex.muscleGroup} onChangeText={t => updateExercise(idx, 'muscleGroup', t)} />
                <Input flex={1} placeholder="Type (strength/bodyweight/cardio)" value={ex.type} onChangeText={t => updateExercise(idx, 'type', t)} />
              </HStack>
              <HStack space={2}>
                <Input flex={1} placeholder="Weight-based? true/false" value={ex.weightBased ? 'true' : 'false'} onChangeText={t => updateExercise(idx, 'weightBased', t === 'true')} />
                <Button variant="outline" onPress={() => addSet(idx)} leftIcon={<Icon as={Ionicons} name="add" />}>Add Set</Button>
              </HStack>
              <Divider />
              <VStack space={2}>
                {ex.sets.map((s, si) => (
                  <HStack key={si} space={2}>
                    <Input flex={1} keyboardType="number-pad" placeholder="Reps" value={s.reps} onChangeText={t => updateSet(idx, si, 'reps', t)} />
                    {ex.weightBased && (
                      <Input flex={1} keyboardType="decimal-pad" placeholder="Weight" value={s.weight} onChangeText={t => updateSet(idx, si, 'weight', t)} />
                    )}
                  </HStack>
                ))}
              </VStack>
            </VStack>
          ))}

          <Button variant="outline" onPress={addExercise} leftIcon={<Icon as={Ionicons} name="add-circle-outline" />}>Add Exercise</Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}


