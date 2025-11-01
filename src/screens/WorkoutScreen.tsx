import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  useToast,
  Center,
  Heading,
  Icon,
  Pressable,
  Badge,
  Spinner,
  Radio,
  Actionsheet,
  useDisclose,
  useBreakpointValue,
  Input
} from 'native-base';
import { FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { realmDB } from '../database/realm';
import { Workout } from '../types';
import { getTodayKey, getWeeklyProgram, Weekday } from '../services/weeklyProgram';

export default function WorkoutScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Weekday>(() => getTodayKey());
  const [todayPlan, setTodayPlan] = useState<any[]>([]);
  const [targets, setTargets] = useState<Record<number, number | null>>({});
  const [sessionWeights, setSessionWeights] = useState<Record<number, string>>({});
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [isOffDay, setIsOffDay] = useState<boolean>(false);
  const [loadFromDay, setLoadFromDay] = useState<Weekday | ''>('');
  const [loadedFromDayTemp, setLoadedFromDayTemp] = useState<Weekday | null>(null);
  const dayPicker = useDisclose();
  const loadDayPicker = useDisclose();
  const isNarrow = useBreakpointValue({ base: true, md: false });
  
  const { user } = useAuth();
  const { isOnline, pendingCount } = useSync();
  const navigation = useNavigation();
  const toast = useToast();

  useEffect(() => {
    loadWorkouts();
  }, []);

  const refreshProgramForDay = React.useCallback(async () => {
    if (!user) return;
    const program = await getWeeklyProgram(user._id);
    const day: any = program ? (program[selectedDay] || { off: false, exercises: [] }) : { off: false, exercises: [] };
    // If off day, don't show exercises in Today's Plan by default
    setTodayPlan(day.off ? [] : (day.exercises || []));
    setIsOffDay(!!day.off);
    setLoadFromDay('');
    setLoadedFromDayTemp(null);
    try {
      const saved = await AsyncStorage.getItem(`progression_level_${user._id}_${selectedDay}`);
      if (saved === 'beginner' || saved === 'intermediate' || saved === 'advanced') setLevel(saved);
    } catch {}
  }, [selectedDay, user]);

  useEffect(() => {
    refreshProgramForDay();
  }, [refreshProgramForDay]);

  useFocusEffect(
    React.useCallback(() => {
      refreshProgramForDay();
      loadWorkouts();
    }, [refreshProgramForDay])
  );

  useEffect(() => {
    if (!user) return;
    const all = realmDB.getWorkouts(user._id, 500, 0).sort((a: any, b: any) => +new Date(b.date) - +new Date(a.date));
    const weekdayIndex = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(selectedDay);
    const filtered = all.filter((w: any) => new Date(w.date).getDay() === weekdayIndex);
    const nextTargets: Record<number, number | null> = {};
    todayPlan.forEach((ex: any, idx: number) => {
      const setsCount = ex.setsCount ?? (ex.defaultSets ? ex.defaultSets.length : 0);
      const repsCount = ex.repsCount ?? (ex.defaultSets && ex.defaultSets[0] ? ex.defaultSets[0].reps : 0);
      const sessions: number[] = [];
      for (const w of filtered) {
        const match = w.exercises.find((e: any) => e.name.toLowerCase() === (ex.name || '').toLowerCase());
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
        const e = w.exercises.find((e2: any) => e2.name.toLowerCase() === (ex.name || '').toLowerCase());
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
  }, [todayPlan, selectedDay, user, level]);

  const saveTodayAsWorkout = () => {
    try {
      if (!user) throw new Error('Not authenticated');
      const exercises = todayPlan
        .filter((ex: any) => ex.name)
        .map((ex: any, idx: number) => {
          const setsCount = ex.setsCount ?? (ex.defaultSets ? ex.defaultSets.length : 0);
          const repsCount = ex.repsCount ?? (ex.defaultSets && ex.defaultSets[0] ? ex.defaultSets[0].reps : 0);
          const weightVal = parseFloat(sessionWeights[idx] || '0') || 0;
          return {
            name: ex.name,
            muscleGroup: ex.muscleGroup || 'other',
            type: ex.type || 'strength',
            weightBased: ex.weightBased !== false,
            sets: Array.from({ length: Math.max(setsCount, 0) }).map(() => ({ reps: repsCount, weight: weightVal }))
          };
        });
      const totalVolume = exercises.reduce((t: number, e: any) => t + e.sets.reduce((et: number, s: any) => et + (s.weight || 0) * s.reps, 0), 0);
      realmDB.createWorkout({
        userId: user._id,
        date: new Date(),
        exercises,
        totalVolume,
        isPR: false,
        lastModified: new Date(),
        clientTimestamp: new Date()
      } as any);
      toast.show({ title: 'Saved', description: 'Workout saved locally' });
      // refresh recent list
      loadWorkouts();
    } catch (e: any) {
      toast.show({ title: 'Error', description: e?.message || 'Failed to save workout' });
    }
  };

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
    <Pressable onPress={() => {(navigation as any).navigate('WorkoutDetail' as never, { id: item._id } as never)}}>
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

  const renderTodayPlan = () => (
    <VStack space={3} bg="white" p={4} borderRadius="lg" shadow={1} mb={4}>
      <HStack justifyContent="space-between" alignItems="center">
        <HStack space={2} alignItems="center">
          <Icon as={Ionicons} name="calendar" />
          <Text fontWeight="bold">Today's Plan</Text>
        </HStack>
        <Button size="sm" colorScheme="primary" variant="subtle" onPress={() => (navigation as any).navigate('WorkoutEntry' as never, { presetPlan: todayPlan, weekday: selectedDay, level } as never)} leftIcon={<Icon as={Ionicons} name="create-outline" />}>Edit</Button>
      </HStack>
      <HStack space={2} alignItems="center" justifyContent="space-between">
        <HStack space={2} alignItems="center">
          <Text>Form:</Text>
          <Radio.Group
            name="progressionLevel"
            accessibilityLabel="Progression level"
            value={level}
            onChange={async (v) => {
              setLevel(v as any);
              try { if (user) await AsyncStorage.setItem(`progression_level_${user._id}_${selectedDay}`, v as string); } catch {}
            }}
          >
            <HStack space={4}>
              <Radio value="beginner">Yeni başlayan</Radio>
              <Radio value="intermediate">Orta seviye</Radio>
              <Radio value="advanced">İleri seviye</Radio>
            </HStack>
          </Radio.Group>
        </HStack>
        {/* Removed duplicate Program button */}
      </HStack>

      {isOffDay && (
        <VStack space={2}>
          <Text color="gray.600">Off day. Başka günden yükle:</Text>
          <HStack space={2} alignItems="center">
            <Button size="sm" variant="outline" onPress={loadDayPicker.onOpen}>
              {loadFromDay ? `From: ${loadFromDay}` : 'Select day'}
            </Button>
            <Actionsheet isOpen={loadDayPicker.isOpen} onClose={loadDayPicker.onClose}>
              <Actionsheet.Content>
                {(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as Weekday[]).map((d) => (
                  <Button key={d} variant={loadFromDay===d?'solid':'ghost'} w="100%" onPress={() => { setLoadFromDay(d); loadDayPicker.onClose(); }}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </Button>
                ))}
              </Actionsheet.Content>
            </Actionsheet>
            <Button isDisabled={!loadFromDay} onPress={async () => {
              if (!user || !loadFromDay) return;
              const program = await getWeeklyProgram(user._id);
              const day = program ? (program[loadFromDay] as any) : null;
              setTodayPlan(day?.exercises || []);
              setLoadedFromDayTemp(loadFromDay);
            }}>Load</Button>
          </HStack>
          {loadedFromDayTemp && (
            <Text fontSize="xs" color="gray.500">Loaded from: {loadedFromDayTemp}</Text>
          )}
        </VStack>
      )}
      {todayPlan && todayPlan.length > 0 ? (
        <VStack space={2}>
          {todayPlan.map((ex: any, idx: number) => (
            <VStack key={`${ex.name}-${idx}`} space={1}>
              <HStack justifyContent="space-between" alignItems="center">
                <VStack flex={1}>
                  <Text fontWeight="semibold">{ex.name || 'Exercise'}</Text>
                  <Text fontSize="xs" color="gray.500">{(ex.setsCount ?? (ex.defaultSets ? ex.defaultSets.length : 0))} x {(ex.repsCount ?? (ex.defaultSets && ex.defaultSets[0] ? ex.defaultSets[0].reps : 0))}</Text>
                </VStack>
                <Text fontSize="sm" color="primary.600">Öneri: {targets[idx] != null ? `${targets[idx]} kg` : '-'}</Text>
              </HStack>
              {ex.weightBased !== false && (
                <HStack alignItems="center" space={2}>
                  <Text fontSize="xs" color="gray.600">Kilo:</Text>
                  <Input
                    flex={1}
                    keyboardType="decimal-pad"
                    placeholder={targets[idx] != null ? String(targets[idx]) : '0'}
                    value={sessionWeights[idx] ?? ''}
                    onChangeText={(t) => setSessionWeights((prev) => ({ ...prev, [idx]: t }))}
                  />
                </HStack>
              )}
            </VStack>
          ))}
        </VStack>
      ) : (
        <Text color="gray.500">No plan for this day.</Text>
      )}
    </VStack>
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
      <Box bg="white" px={4} py={3} borderBottomWidth={1} borderBottomColor="gray.200">
        <HStack justifyContent="space-between" alignItems="center">
          <VStack>
            <Heading size={isNarrow ? 'md' : 'lg'} color="gray.800">
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
                  {pendingCount} unsynced
                </Badge>
              )}
            </HStack>
          </VStack>
          <HStack space={2} alignItems="center">
            {isNarrow ? (
              <>
                <Button size="sm" onPress={dayPicker.onOpen} variant="outline">
                  Day: {selectedDay.slice(0,3).toUpperCase()}
                </Button>
                <Actionsheet isOpen={dayPicker.isOpen} onClose={dayPicker.onClose}>
                  <Actionsheet.Content>
                    {(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as Weekday[]).map((d) => (
                      <Button key={d} variant={selectedDay===d?'solid':'ghost'} w="100%" onPress={() => { setSelectedDay(d); dayPicker.onClose(); }}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </Button>
                    ))}
                  </Actionsheet.Content>
                </Actionsheet>
              </>
            ) : (
              <HStack space={1}>
                {(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as Weekday[]).map((d) => (
                  <Button key={d} variant={selectedDay===d?'solid':'outline'} size="sm" onPress={() => setSelectedDay(d)}>{d.slice(0,3).toUpperCase()}</Button>
                ))}
              </HStack>
            )}
            {isNarrow ? (
              <Button size="sm" variant="ghost" onPress={() => (navigation as any).navigate('WeeklyProgram' as never)} leftIcon={<Icon as={Ionicons} name="create-outline" />}>Program</Button>
            ) : (
              <Button size="sm" variant="outline" onPress={() => (navigation as any).navigate('WeeklyProgram' as never)} leftIcon={<Icon as={Ionicons} name="create-outline" />}>Weekly Program</Button>
            )}
          </HStack>
        </HStack>
      </Box>

      <FlatList
        style={{ flex: 1 }}
        data={workouts}
        keyExtractor={(item: any) => String(item._id)}
        renderItem={renderWorkoutItem}
        ListHeaderComponent={() => (
          <VStack>
            {renderTodayPlan()}
            {/* Save button for today's session */}
            {todayPlan && todayPlan.length > 0 && (
              <Button mt={2} colorScheme="primary" onPress={saveTodayAsWorkout} leftIcon={<Icon as={Ionicons} name="save" />}>Save Day</Button>
            )}
          </VStack>
        )}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={{ padding: 16, paddingTop: 16 }}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="always"
        showsVerticalScrollIndicator
      />
    </Box>
  );
}
