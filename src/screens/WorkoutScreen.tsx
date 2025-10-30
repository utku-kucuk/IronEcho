import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  FlatList,
  ScrollView,
  useToast,
  Center,
  Heading,
  Icon,
  Pressable,
  Badge,
  Spinner,
  Select,
  CheckIcon,
  useBreakpointValue
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
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
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const isNarrow = useBreakpointValue({ base: true, md: false });
  const [isOffDay, setIsOffDay] = useState<boolean>(false);
  const [loadFromDay, setLoadFromDay] = useState<Weekday | ''>('');
  const [loadedFromDayTemp, setLoadedFromDayTemp] = useState<Weekday | null>(null);
  
  const { user } = useAuth();
  const { isOnline, pendingCount } = useSync();
  const navigation = useNavigation();
  const toast = useToast();

  useEffect(() => {
    loadWorkouts();
  }, []);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const program = await getWeeklyProgram(user._id);
      const day: any = program ? (program[selectedDay] || { off: false, exercises: [] }) : { off: false, exercises: [] };
      setTodayPlan(day.exercises || []);
      setIsOffDay(!!day.off);
      setLoadFromDay('');
      setLoadedFromDayTemp(null);
      try {
        const saved = await AsyncStorage.getItem(`progression_level_${user._id}_${selectedDay}`);
        if (saved === 'beginner' || saved === 'intermediate' || saved === 'advanced') setLevel(saved);
      } catch {}
    })();
  }, [selectedDay, user]);

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
          <Select selectedValue={level} minW={36} _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} /> }} onValueChange={async (v) => {
            setLevel(v as any);
            try { if (user) await AsyncStorage.setItem(`progression_level_${user._id}_${selectedDay}`, v); } catch {}
          }}>
            <Select.Item label="Yeni başlayan" value="beginner" />
            <Select.Item label="Orta seviye" value="intermediate" />
            <Select.Item label="İleri seviye" value="advanced" />
          </Select>
        </HStack>
        {/* Removed duplicate Program button */}
      </HStack>

      {isOffDay && (
        <VStack space={2}>
          <Text color="gray.600">Off day. Başka günden yükle:</Text>
          <HStack space={2} alignItems="center">
            <Select flex={1} selectedValue={loadFromDay || ''} placeholder="Select day" _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} /> }} onValueChange={(v) => setLoadFromDay(v as Weekday)}>
              {(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as Weekday[]).map((d) => (
                <Select.Item key={d} label={d.charAt(0).toUpperCase() + d.slice(1)} value={d} />
              ))}
            </Select>
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
            <HStack key={`${ex.name}-${idx}`} justifyContent="space-between" alignItems="center">
              <VStack flex={1}>
                <Text fontWeight="semibold">{ex.name || 'Exercise'}</Text>
                <Text fontSize="xs" color="gray.500">{(ex.setsCount ?? (ex.defaultSets ? ex.defaultSets.length : 0))} x {(ex.repsCount ?? (ex.defaultSets && ex.defaultSets[0] ? ex.defaultSets[0].reps : 0))}</Text>
              </VStack>
              <Text fontSize="sm" color="primary.600">Target weight (Hedef kilo): {targets[idx] != null ? `${targets[idx]} kg` : '-'}</Text>
            </HStack>
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
          <HStack space={2} alignItems="center">
            {isNarrow ? (
              <Select selectedValue={selectedDay} minW={40} _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} /> }} onValueChange={(v) => setSelectedDay(v as Weekday)}>
                {(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as Weekday[]).map((d) => (
                  <Select.Item key={d} label={d.charAt(0).toUpperCase() + d.slice(1)} value={d} />
                ))}
              </Select>
            ) : (
              <HStack space={1}>
                {(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as Weekday[]).map((d) => (
                  <Button key={d} variant={selectedDay===d?'solid':'outline'} size="sm" onPress={() => setSelectedDay(d)}>{d.slice(0,3).toUpperCase()}</Button>
                ))}
              </HStack>
            )}
            <Button size="sm" variant="outline" onPress={() => (navigation as any).navigate('WeeklyProgram' as never)} leftIcon={<Icon as={Ionicons} name="create-outline" />}>Weekly Program</Button>
          </HStack>
        </HStack>
      </Box>

      <ScrollView p={4}>
        {renderTodayPlan()}
        {workouts.length === 0 ? (
          renderEmptyState()
        ) : (
          <VStack>
            {workouts.map((item) => (
              <Box key={item._id}>
                {renderWorkoutItem({ item })}
              </Box>
            ))}
          </VStack>
        )}
      </ScrollView>
    </Box>
  );
}
