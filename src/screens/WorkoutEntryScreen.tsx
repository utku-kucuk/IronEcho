import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Icon,
  IconButton,
  useToast,
  Divider,
  FormControl,
  Select,
  CheckIcon,
  Modal
} from 'native-base';
import { FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { realmDB } from '../database/realm';
import { useAuth } from '../context/AuthContext';
import { getTodaysProgram, DEFAULT_WEEKLY_PROGRAM, ProgramExerciseTemplate } from '../services/weeklyProgram';
import { PresetExercise } from '../types';

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
  const route = useRoute<any>();
  const { user } = useAuth();
  const toast = useToast();

  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  // Date parts for selectable UI
  const [dateYear, setDateYear] = useState<string>(new Date().getFullYear().toString());
  const [dateMonth, setDateMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [dateDay, setDateDay] = useState<string>(String(new Date().getDate()).padStart(2, '0'));
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<ExerciseForm[]>([{
    name: '', muscleGroup: 'other', type: 'strength', weightBased: true, sets: [{ reps: '', weight: '' }]
  }]);
  const [targets, setTargets] = useState<Record<number, number | null>>({});
  const [weekday, setWeekday] = useState<string | null>(null);
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced' | null>(null);

  const scrollRef = useRef<any>(null);

  // Exercise options and modal state for adding custom exercise names
  const [exerciseOptions, setExerciseOptions] = useState<string[]>([
    'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row',
    'Pull Up', 'Push Up', 'Dumbbell Curl', 'Tricep Dip', 'Leg Press',
    'Lunge', 'Lat Pulldown', 'Chest Fly', 'Leg Extension', 'Leg Curl',
    'Plank', 'Running', 'Cycling', 'Rowing'
  ]);
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState<boolean>(false);
  const [newExerciseName, setNewExerciseName] = useState<string>('');
  const [targetExerciseIndex, setTargetExerciseIndex] = useState<number | null>(null);

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

  // Keep date string in sync with individual selectors
  const recomputeDate = (y: string, m: string, d: string) => {
    const next = `${y}-${m}-${d}`;
    setDate(next);
  };

  const handleAddCustomExercise = () => {
    const name = newExerciseName.trim();
    if (!name || targetExerciseIndex == null) return;
    // Add to local options if not present
    if (!exerciseOptions.some(e => e.toLowerCase() === name.toLowerCase())) {
      setExerciseOptions(prev => [...prev, name]);
    }
    // Set selected exercise name for targeted card
    setExercises(prev => prev.map((ex, i) => i === targetExerciseIndex ? { ...ex, name } : ex));
    setIsAddExerciseOpen(false);
    setNewExerciseName('');
    setTargetExerciseIndex(null);
  };

  // Helpers: numeric sanitization for inputs
  const sanitizeInt = (value: string): string => value.replace(/[^0-9]/g, '');
  const sanitizeDecimal = (value: string): string => {
    // allow digits and at most one dot
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
  };

  // Common dropdown values
  const repOptions = Array.from({ length: 30 }).map((_, i) => String(i + 1));
  const weightOptions = Array.from({ length: 81 }).map((_, i) => (i * 2.5).toFixed(1).replace(/\.0$/, ''));

  // Prefill from navigation if provided, else auto-load today's plan
  useEffect(() => {
    (async () => {
      try {
        if (!user) return;
        const editId: string | undefined = route.params?.editWorkoutId;
        if (editId) {
          const existing = realmDB.getWorkoutById(editId);
          if (existing) {
            setDate(existing.date.toISOString().slice(0, 10));
            setDateYear(String(new Date(existing.date).getFullYear()));
            setDateMonth(String(new Date(existing.date).getMonth() + 1).padStart(2, '0'));
            setDateDay(String(new Date(existing.date).getDate()).padStart(2, '0'));
            setNotes(existing.notes || '');
            setExercises(existing.exercises.map((e: any) => ({
              name: e.name,
              muscleGroup: e.muscleGroup || 'other',
              type: e.type || 'strength',
              weightBased: e.weightBased !== false,
              sets: e.sets.map((s: any) => ({ reps: String(s.reps), weight: String(s.weight || '') }))
            })));
          }
        } else {
          const preset: PresetExercise[] | undefined = route.params?.presetPlan;
          const sourceRaw: any = (preset && preset.length > 0)
            ? preset
            : (await getTodaysProgram(user._id)) || (DEFAULT_WEEKLY_PROGRAM[(new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')] || []);
          const source: any[] = Array.isArray(sourceRaw) ? sourceRaw : (sourceRaw?.exercises || []);
          if (source && source.length > 0) {
            const mapped: ExerciseForm[] = source.map((p: any) => ({
              name: p.name,
              muscleGroup: p.muscleGroup,
              type: p.type,
              weightBased: p.weightBased,
              sets: (p.setsCount && p.repsCount)
                ? Array.from({ length: p.setsCount }).map(() => ({ reps: String(p.repsCount), weight: '' }))
                : (p.defaultSets && p.defaultSets.length > 0)
                  ? p.defaultSets.map((s: any) => ({ reps: String(s.reps), weight: '' }))
                  : [{ reps: '', weight: '' }]
            }));
            setExercises(mapped);
          }
        }
        setWeekday(route.params?.weekday || null);
        setLevel(route.params?.level || null);
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute per-exercise target weight based on same weekday and exact scheme; apply level bump; show under inputs
  useEffect(() => {
    (async () => {
      if (!user) return;
      const all = realmDB.getWorkouts(user._id, 500, 0).sort((a: any, b: any) => +new Date(b.date) - +new Date(a.date));
      const weekdayIndex = weekday ? ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(weekday as any) : null;
      const nextTargets: Record<number, number | null> = {};
      exercises.forEach((ex: any, idx: number) => {
        if (!ex.name.trim()) { nextTargets[idx] = null; return; }
        const setsCount = ex.sets.length;
        const repsCount = ex.sets[0]?.reps ? parseInt(ex.sets[0].reps, 10) : 0;
        const filtered = weekdayIndex != null ? all.filter((w: any) => new Date(w.date).getDay() === weekdayIndex) : all;
        const sessions: number[] = [];
        for (const w of filtered) {
          const match = w.exercises.find((e: any) => e.name.toLowerCase() === ex.name.toLowerCase());
          if (match) {
            const schemeMatches = match.sets.length === setsCount && match.sets.every((s: any) => s.reps === repsCount);
            if (schemeMatches) {
              const weights = match.sets.map((s: any) => s.weight || 0).filter((v: number) => v > 0);
              if (weights.length > 0) {
                const avg = weights.reduce((a: number, b: number) => a + b, 0) / weights.length;
                sessions.push(avg);
              }
            }
          }
          if (sessions.length >= 2) break;
        }
        if (sessions.length === 0) { nextTargets[idx] = null; return; }
        const mean = sessions.reduce((a: number, b: number) => a + b, 0) / sessions.length;
        const lastMatch = filtered.find((w: any) => {
          const e = w.exercises.find((e2: any) => e2.name.toLowerCase() === ex.name.toLowerCase());
          return e && e.sets.length === setsCount && e.sets.every((s: any) => s.reps === repsCount);
        });
        const msDiff = lastMatch ? (Date.now() - new Date(lastMatch.date).getTime()) : 0;
        const weeksSince = lastMatch ? Math.max(0, msDiff / (1000 * 60 * 60 * 24 * 7)) : 0;
        let bumpPercent = 0;
        if (level === 'beginner' && weeksSince >= 1) bumpPercent = 0.075;
        if (level === 'intermediate' && weeksSince >= 2) bumpPercent = 0.04;
        if (level === 'advanced' && weeksSince >= 3) bumpPercent = 0.025;
        const bumped = mean * (1 + bumpPercent);
        const step = 2.5;
        const rounded = Math.round(bumped / step) * step;
        nextTargets[idx] = Number(rounded.toFixed(1));
      });
      setTargets(nextTargets);
    })();
  }, [exercises, user, weekday, level]);

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

      const editId = route.params?.editWorkoutId as string | undefined;
      if (editId) {
        realmDB.updateWorkout(editId, {
          date: new Date(date) as any,
          exercises: parsedExercises as any,
          notes,
          totalVolume
        } as any);
      } else {
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
      }

      toast.show({ title: 'Saved', description: 'Workout saved locally' });
      // @ts-ignore
      navigation.goBack();
    } catch (e: any) {
      toast.show({ title: 'Error', description: e.message || 'Failed to save workout' });
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

      <FlatList
        style={{ flex: 1 }}
        data={exercises}
        keyExtractor={(_, idx) => `exercise-${idx}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 160 }}
        ListHeaderComponent={(
          <VStack space={2} bg="white" p={4} borderRadius="lg" shadow={1}>
            <Text fontWeight="semibold">Date</Text>
            <HStack space={2}>
              <FormControl flex={1}>
                <FormControl.Label>Year</FormControl.Label>
                <Select
                  selectedValue={dateYear}
                  minWidth="100%"
                  accessibilityLabel="Select year"
                  placeholder="Year"
                  _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}
                  onValueChange={value => { setDateYear(value); recomputeDate(value, dateMonth, dateDay); }}
                >
                  {Array.from({ length: 6 }).map((_, i) => {
                    const y = (new Date().getFullYear() - i).toString();
                    return <Select.Item key={y} label={y} value={y} />;
                  })}
                </Select>
              </FormControl>
              <FormControl flex={1}>
                <FormControl.Label>Month</FormControl.Label>
                <Select
                  selectedValue={dateMonth}
                  minWidth="100%"
                  accessibilityLabel="Select month"
                  placeholder="Month"
                  _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}
                  onValueChange={value => { setDateMonth(value); recomputeDate(dateYear, value, dateDay); }}
                >
                  {Array.from({ length: 12 }).map((_, i) => {
                    const m = String(i + 1).padStart(2, '0');
                    return <Select.Item key={m} label={m} value={m} />;
                  })}
                </Select>
              </FormControl>
              <FormControl flex={1}>
                <FormControl.Label>Day</FormControl.Label>
                <Select
                  selectedValue={dateDay}
                  minWidth="100%"
                  accessibilityLabel="Select day"
                  placeholder="Day"
                  _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}
                  onValueChange={value => { setDateDay(value); recomputeDate(dateYear, dateMonth, value); }}
                >
                  {Array.from({ length: 31 }).map((_, i) => {
                    const d = String(i + 1).padStart(2, '0');
                    return <Select.Item key={d} label={d} value={d} />;
                  })}
                </Select>
              </FormControl>
            </HStack>
            <FormControl mt={2}>
              <FormControl.Label>Notes</FormControl.Label>
              <Input value={notes} onChangeText={setNotes} placeholder="Optional notes" />
            </FormControl>
          </VStack>
        )}
        renderItem={({ item: ex, index: idx }) => (
          <VStack key={idx} space={3} bg="white" p={4} borderRadius="lg" shadow={1} mt={4}>
            <HStack justifyContent="space-between" alignItems="center">
              <Text fontWeight="semibold">Exercise {idx + 1}</Text>
              <Button variant="outline" size="sm" colorScheme="red" onPress={() => removeExercise(idx)} leftIcon={<Icon as={Ionicons} name="trash" />}>Remove</Button>
            </HStack>
            <HStack space={2} alignItems="flex-end">
              <FormControl flex={1}>
                <FormControl.Label>Exercise</FormControl.Label>
                <Select
                  selectedValue={ex.name}
                  placeholder="Select exercise"
                  _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}
                  onValueChange={value => updateExercise(idx, 'name', value)}
                >
                  {exerciseOptions.map((opt) => (
                    <Select.Item key={`${opt}-${idx}`} label={opt} value={opt} />
                  ))}
                </Select>
              </FormControl>
              <IconButton
                variant="outline"
                onPress={() => { setTargetExerciseIndex(idx); setIsAddExerciseOpen(true); }}
                icon={<Icon as={Ionicons} name="add-circle-outline" />}
                accessibilityLabel="Add custom exercise"
              />
            </HStack>
            <HStack space={2}>
              <FormControl flex={1}>
                <FormControl.Label>Muscle Group</FormControl.Label>
                <Select
                  selectedValue={ex.muscleGroup}
                  placeholder="Select muscle group"
                  _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}
                  onValueChange={value => updateExercise(idx, 'muscleGroup', value)}
                >
                  {['chest','back','shoulders','arms','legs','core','cardio','other'].map(g => (
                    <Select.Item key={`${g}-${idx}`} label={g} value={g} />
                  ))}
                </Select>
              </FormControl>
              <FormControl flex={1}>
                <FormControl.Label>Type</FormControl.Label>
                <Select
                  selectedValue={ex.type}
                  placeholder="Select type"
                  _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}
                  onValueChange={value => updateExercise(idx, 'type', value)}
                >
                  {['strength','bodyweight','cardio'].map(t => (
                    <Select.Item key={`${t}-${idx}`} label={t} value={t} />
                  ))}
                </Select>
              </FormControl>
            </HStack>
            <HStack space={2} alignItems="flex-end">
              <FormControl flex={1}>
                <FormControl.Label>Weight-based</FormControl.Label>
                <Select
                  selectedValue={ex.weightBased ? 'yes' : 'no'}
                  placeholder="Weight based?"
                  _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}
                  onValueChange={value => updateExercise(idx, 'weightBased', value === 'yes')}
                >
                  <Select.Item label="Yes" value="yes" />
                  <Select.Item label="No" value="no" />
                </Select>
              </FormControl>
              <Button variant="outline" onPress={() => addSet(idx)} leftIcon={<Icon as={Ionicons} name="add" />}>Add Set</Button>
            </HStack>
            <Divider />
            <VStack space={2}>
              {ex.sets.map((s, si) => (
                <VStack key={si} space={2}>
                  <HStack space={2}>
                    <FormControl flex={1}>
                      <FormControl.Label>Reps</FormControl.Label>
                      <Select
                        selectedValue={s.reps}
                        placeholder="Reps"
                        _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}
                        onValueChange={value => updateSet(idx, si, 'reps', value)}
                      >
                        {repOptions.map(r => (
                          <Select.Item key={`rep-${idx}-${si}-${r}`} label={r} value={r} />
                        ))}
                      </Select>
                    </FormControl>
                    {ex.weightBased && (
                      <FormControl flex={1}>
                        <FormControl.Label>Weight</FormControl.Label>
                        <Input
                          keyboardType="decimal-pad"
                          placeholder="Weight"
                          value={s.weight}
                          onChangeText={t => updateSet(idx, si, 'weight', sanitizeDecimal(t))}
                        />
                        {si === 0 && (
                          <Text fontSize="xs" color="gray.500" mt={1}>Öneri: {targets[idx] != null ? `${targets[idx]} kg` : '-'}</Text>
                        )}
                      </FormControl>
                    )}
                  </HStack>
                </VStack>
              ))}
            </VStack>
          </VStack>
        )}
        ListFooterComponent={(
          <HStack space={2} mt={4}>
            <Button variant="outline" onPress={addExercise} leftIcon={<Icon as={Ionicons} name="add-circle-outline" />}>Add Exercise</Button>
          </HStack>
        )}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      />

      <Modal isOpen={isAddExerciseOpen} onClose={() => setIsAddExerciseOpen(false)}>
        <Modal.Content>
          <Modal.CloseButton />
          <Modal.Header>Add Exercise</Modal.Header>
          <Modal.Body>
            <FormControl>
              <FormControl.Label>Exercise Name</FormControl.Label>
              <Input value={newExerciseName} onChangeText={setNewExerciseName} placeholder="e.g., Bulgarian Split Squat" />
            </FormControl>
          </Modal.Body>
          <Modal.Footer>
            <Button onPress={handleAddCustomExercise} isDisabled={!newExerciseName.trim()}>Add</Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </Box>
  );
}


