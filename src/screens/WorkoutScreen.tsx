import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
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
  Actionsheet,
  useDisclose,
  useBreakpointValue,
  Input,
  Select,
  CheckIcon,
  Image,
  Modal,
  useColorModeValue
} from 'native-base';
import { FlatList, Platform, ScrollView, TextInput, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { realmDB } from '../database/realm';
import { Workout, ExerciseImage } from '../types';
import { getTodayKey, getWeeklyProgram, Weekday, getDailyOverride } from '../services/weeklyProgram';
import { ExerciseImageService } from '../services/exerciseImageService';
import { StableTextInput } from '../components/StableTextInput';

// Memoized WeightInput component to prevent re-renders
const WeightInput = memo(({ 
  value, 
  placeholder, 
  onChangeText, 
  style, 
  placeholderTextColor 
}: { 
  value: string; 
  placeholder: string; 
  onChangeText: (text: string) => void; 
  style: any; 
  placeholderTextColor: string;
}) => {
  return (
    <TextInput
      style={style}
      keyboardType="decimal-pad"
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      value={value}
      onChangeText={onChangeText}
      editable={true}
      selectTextOnFocus={false}
      autoFocus={false}
      returnKeyType="done"
      blurOnSubmit={false}
      onSubmitEditing={() => {
        // Don't dismiss keyboard on decimal-pad
      }}
      onFocus={() => {
        // Keep focus
      }}
      onBlur={() => {
        // Allow blur naturally
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
      }}
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render if value or placeholder actually changed
  return prevProps.value === nextProps.value &&
         prevProps.placeholder === nextProps.placeholder;
});

WeightInput.displayName = 'WeightInput';

export default function WorkoutScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | '30d' | '90d' | 'ytd'>('all');
  const [selectedDay, setSelectedDay] = useState<Weekday>(() => getTodayKey());
  const [todayPlan, setTodayPlan] = useState<any[]>([]);
  const [targets, setTargets] = useState<Record<number, number | null>>({});
  const [sessionWeights, setSessionWeights] = useState<Record<number, string>>({});
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [isOffDay, setIsOffDay] = useState<boolean>(false);
  const [loadFromDay, setLoadFromDay] = useState<Weekday | ''>('');
  const [loadedFromDayTemp, setLoadedFromDayTemp] = useState<Weekday | null>(null);
  const [exerciseImages, setExerciseImages] = useState<Record<string, ExerciseImage[]>>({});
  const [selectedImage, setSelectedImage] = useState<ExerciseImage | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const dayPicker = useDisclose();
  const loadDayPicker = useDisclose();
  const isNarrow = useBreakpointValue({ base: true, md: false });
  
  const { user } = useAuth();
  const { isOnline, pendingCount } = useSync();
  const navigation = useNavigation();
  const toast = useToast();
  const isWeb = Platform.OS === 'web';
  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const headerBg = useColorModeValue('white', 'gray.900');
  const textPrimary = useColorModeValue('gray.800', 'gray.100');
  const textSecondary = useColorModeValue('gray.600', 'gray.300');
  const headerBorder = useColorModeValue('gray.200', 'gray.700');
  const dashedBorderColor = useColorModeValue('gray.300', 'gray.600');
  const inputBg = useColorModeValue('white', 'gray.800');
  const inputPlaceholder = useColorModeValue('gray.500', 'gray.400');
  
  // TextInput styles
  const textInputStyle = {
    backgroundColor: useColorModeValue('#FFFFFF', '#1F2937'),
    color: useColorModeValue('#1F2937', '#F3F4F6'),
    borderWidth: 1,
    borderColor: useColorModeValue('#D1D5DB', '#4B5563'),
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    minHeight: 40,
  };

  useEffect(() => {
    loadWorkouts();
  }, []);

  // Clean up weight change handlers when todayPlan changes


  const refreshProgramForDay = React.useCallback(async () => {
    if (!user) return;
    const program = await getWeeklyProgram(user._id);
    const day: any = program ? (program[selectedDay] || { off: false, exercises: [] }) : { off: false, exercises: [] };
    // Check one-off override for the specific calendar day
    const dateISO = (() => {
      const map = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      const todayIdx = new Date().getDay();
      const targetIdx = map.indexOf(selectedDay);
      const diff = targetIdx - todayIdx;
      const d = new Date();
      d.setDate(d.getDate() + diff);
      return d.toISOString().slice(0,10);
    })();
    const override = await getDailyOverride(user._id, dateISO);
    if (override && override.length > 0) {
      setTodayPlan(override);
      setIsOffDay(false);
    } else {
      // If off day, don't show exercises in Today's Plan by default
      setTodayPlan(day.off ? [] : (day.exercises || []));
      setIsOffDay(!!day.off);
    }
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
      // Always refresh when screen comes into focus (e.g., returning from WeeklyProgramScreen)
      refreshProgramForDay();
      loadWorkouts();
      loadExerciseImages();
    }, [user, selectedDay]) // Use user and selectedDay directly instead of refreshProgramForDay callback
  );

  const loadExerciseImages = () => {
    if (!user) return;
    const allImages = ExerciseImageService.getAllExerciseImages(user._id);
    const imagesByExercise: Record<string, ExerciseImage[]> = {};
    allImages.forEach(img => {
      if (!imagesByExercise[img.exerciseName]) {
        imagesByExercise[img.exerciseName] = [];
      }
      imagesByExercise[img.exerciseName].push(img);
    });
    setExerciseImages(imagesByExercise);
  };

  // Calculate target weights function - takes level as parameter to ensure immediate update
  // Uses historical data from workouts with matching exercise name AND set x rep scheme
  const calculateTargetsWithLevel = useCallback((currentLevel: 'beginner' | 'intermediate' | 'advanced') => {
    if (!user || !todayPlan || todayPlan.length === 0) return;
    // Use all sessions (not only same weekday) to better reflect real progression
    const all = realmDB.getWorkouts(user._id, 500, 0).sort((a: any, b: any) => +new Date(b.date) - +new Date(a.date));
    const nextTargets: Record<number, number | null> = {};

    todayPlan.forEach((ex: any, idx: number) => {
      const setsCount = ex.setsCount ?? (ex.defaultSets ? ex.defaultSets.length : 0);
      const repsCount = ex.repsCount ?? (ex.defaultSets && ex.defaultSets[0] ? ex.defaultSets[0].reps : 0);

      // Fixed mid-range multipliers per level (beginner 7.5%, intermediate 4%, advanced 2.5%)
      const percent = currentLevel === 'beginner' ? 0.075
        : currentLevel === 'intermediate' ? 0.04
        : 0.025;

      // Build history from recent workouts for the same exercise name AND exact set x rep scheme
      // Only include workouts where the exercise has the exact same number of sets and reps
      const history: Array<{ date: Date; avg: number }> = [];
      for (const w of all) {
        const match = w.exercises.find((e: any) => e.name?.toLowerCase() === (ex.name || '').toLowerCase());
        if (!match) continue;
        // Check that set count matches AND all sets have the same rep count as the program
        const schemeMatches = match.sets.length === setsCount && match.sets.every((s: any) => s.reps === repsCount);
        if (!schemeMatches) continue;
        const weights = match.sets.map((s: any) => s.weight || 0).filter((v: number) => v > 0);
        if (weights.length === 0) continue;
        const avg = weights.reduce((a: number, b: number) => a + b, 0) / weights.length;
        history.push({ date: new Date(w.date), avg });
      }

      // Sort newest first
      history.sort((a, b) => b.date.getTime() - a.date.getTime());
      if (history.length === 0) { nextTargets[idx] = null; return; }

      // Determine minimum required data count and averaging window by level
      // Beginner: requires 1 workout
      // Intermediate: requires 2 workouts
      // Advanced: requires 4 workouts
      let requiredCount = 1;
      let windowSize = 1;
      if (currentLevel === 'intermediate') {
        requiredCount = 2;
        windowSize = 2;
      } else if (currentLevel === 'advanced') {
        requiredCount = 4;
        windowSize = 4;
      }

      // If we don't have enough historical data, return null (will show as '-')
      if (history.length < requiredCount) {
        nextTargets[idx] = null;
        return;
      }

      const recent = history.slice(0, windowSize);
      const baseAvg = recent.reduce((s, h) => s + h.avg, 0) / recent.length;
      if (!baseAvg || baseAvg <= 0 || isNaN(baseAvg)) { nextTargets[idx] = null; return; }

      let bumped = baseAvg * (1 + percent);
      if (bumped - baseAvg < 0.5) bumped = baseAvg + 0.5; // ensure visible progress

      const suggested = Math.max(bumped, baseAvg);
      nextTargets[idx] = Number((Math.round(suggested * 10) / 10).toFixed(1));
    });

    setTargets(nextTargets);
  }, [todayPlan, user]);

  // Calculate targets when dependencies change (level, plan, or day changes)
  // Note: sessionWeights is NOT a dependency - user input should not change suggestions
  useEffect(() => {
    if (user && todayPlan && todayPlan.length > 0) {
      calculateTargetsWithLevel(level);
    }
  }, [todayPlan, selectedDay, user, level, calculateTargetsWithLevel]);

  const saveTodayAsWorkout = () => {
    try {
      if (!user) throw new Error('Not authenticated');
      
      // Validate all exercises have names
      const exercisesWithoutNames = todayPlan.filter((ex: any) => !ex.name || ex.name.trim() === '');
      if (exercisesWithoutNames.length > 0) {
        toast.show({
          title: 'Validation Error',
          description: 'Please select an exercise for all exercises. Exercise not selected.',
          duration: 5000
        });
        return;
      }

      // Debug: Log sessionWeights to verify values are being captured
      console.log('saveTodayAsWorkout - sessionWeights:', sessionWeights);
      console.log('saveTodayAsWorkout - todayPlan length:', todayPlan.length);

      // Map todayPlan to exercises, preserving original index for sessionWeights lookup
      const exercises = todayPlan
        .map((ex: any, originalIdx: number) => {
          // Skip exercises without names
          if (!ex.name || ex.name.trim() === '') {
            return null;
          }
          
          const setsCount = ex.setsCount ?? (ex.defaultSets ? ex.defaultSets.length : 0);
          const repsCount = ex.repsCount ?? (ex.defaultSets && ex.defaultSets[0] ? ex.defaultSets[0].reps : 0);
          // Get weight value from sessionWeights using ORIGINAL index, default to 0 if empty or invalid
          const weightStr = sessionWeights[originalIdx];
          let weightVal = 0;
          if (weightStr !== undefined && weightStr !== null && String(weightStr).trim() !== '') {
            const parsed = parseFloat(String(weightStr).trim());
            weightVal = isNaN(parsed) ? 0 : parsed;
          }
          console.log(`Exercise ${originalIdx} (${ex.name}): weightStr="${weightStr}", weightVal=${weightVal}, setsCount=${setsCount}, repsCount=${repsCount}`);
          console.log(`Exercise data for ${ex.name}: sets=${JSON.stringify(Array.from({ length: Math.max(setsCount, 0) }).map(() => ({ reps: repsCount, weight: weightVal })))}`);
          return {
            name: ex.name,
            muscleGroup: ex.muscleGroup || 'other',
            type: ex.type || 'strength',
            weightBased: ex.weightBased !== false,
            sets: Array.from({ length: Math.max(setsCount, 0) }).map(() => ({ reps: repsCount, weight: weightVal }))
          };
        })
        .filter((ex: any) => ex !== null); // Remove null entries
      
      // Calculate total volume more carefully
      const totalVolume = exercises.reduce((t: number, e: any) => {
        if (!e || !e.sets) return t;
        return t + e.sets.reduce((et: number, s: any) => {
          if (!s) return et;
          const weight = typeof s.weight === 'number' ? s.weight : (typeof s.weight === 'string' ? parseFloat(s.weight) || 0 : 0);
          const reps = typeof s.reps === 'number' ? s.reps : (typeof s.reps === 'string' ? parseInt(s.reps, 10) || 0 : 0);
          return et + (weight * reps);
        }, 0);
      }, 0);
      
      console.log('Calculated totalVolume:', totalVolume);
      console.log('Exercises for saving:', JSON.stringify(exercises, null, 2));
      
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
      // Clear session weights after saving
      setSessionWeights({});
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
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const getTotalVolume = (workout: Workout) => {
    if (!workout || !workout.exercises) return 0;
    return workout.exercises.reduce((total, exercise) => {
      if (!exercise || !exercise.sets) return total;
      return total + exercise.sets.reduce((exerciseTotal, set) => {
        if (!set) return exerciseTotal;
        // Ensure weight is a number, handle both number and string types
        const weight = typeof set.weight === 'number' ? set.weight : (typeof set.weight === 'string' ? parseFloat(set.weight) || 0 : 0);
        const reps = typeof set.reps === 'number' ? set.reps : (typeof set.reps === 'string' ? parseInt(set.reps, 10) || 0 : 0);
        return exerciseTotal + (weight * reps);
      }, 0);
    }, 0);
  };

  const renderWorkoutItem = ({ item }: { item: any }) => (
    item && item._id === 'show_more'
    ? (
      <Pressable onPress={() => (navigation as any).navigate('WorkoutHistory' as never)}>
        <Box
          bg={cardBg}
          p={4}
          borderRadius="lg"
          mb={3}
          borderWidth={2}
          borderStyle="dashed"
          borderColor={dashedBorderColor}
          alignItems="center"
          justifyContent="center"
        >
          <Icon as={Ionicons} name="add" size="xl" color="primary.500" />
          <Text mt={2} color={textSecondary}>Show all workouts</Text>
        </Box>
      </Pressable>
    )
    : (
    <Pressable onPress={() => {(navigation as any).navigate('WorkoutDetail' as never, { id: item._id } as never)}}>
      <Box
        bg={cardBg}
        p={4}
        borderRadius="lg"
        mb={3}
        shadow={1}
        borderLeftWidth={4}
        borderLeftColor={item.isPR ? 'yellow.400' : 'primary.500'}
      >
        <HStack justifyContent="space-between" alignItems="center" mb={2}>
          <VStack flex={1}>
            <Text fontSize="lg" fontWeight="bold" color={textPrimary}>
              {formatDate(item.date)}
            </Text>
            <Text fontSize="sm" color={textSecondary}>
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
          {item.exercises.slice(0, 2).map((exercise: any, index: number) => {
            // Calculate average weight for display
            const weights = exercise.sets.map((s: any) => s.weight || 0).filter((w: number) => w > 0);
            const avgWeight = weights.length > 0 
              ? (weights.reduce((a: number, b: number) => a + b, 0) / weights.length).toFixed(1)
              : '0';
            return (
              <HStack key={index} justifyContent="space-between">
                <Text fontSize="sm" color={textPrimary} flex={1}>
                  {exercise.name}
                </Text>
                <HStack space={2}>
                  {exercise.weightBased !== false && (
                    <Text fontSize="sm" color={textSecondary}>
                      {avgWeight} kg
                    </Text>
                  )}
                  <Text fontSize="sm" color={textSecondary}>
                    {exercise.sets.length} set{exercise.sets.length !== 1 ? 's' : ''}
                  </Text>
                </HStack>
              </HStack>
            );
          })}
          {item.exercises.length > 2 && (
            <Text fontSize="sm" color={textSecondary}>
              +{item.exercises.length - 2} more exercise{item.exercises.length - 2 !== 1 ? 's' : ''}
            </Text>
          )}
        </VStack>
      </Box>
    </Pressable>
  ));

  const renderTodayPlan = () => (
    <VStack space={3} bg={cardBg} p={4} borderRadius="lg" shadow={1} mb={4}>
      <HStack justifyContent="space-between" alignItems="center">
        <HStack space={2} alignItems="center">
          <Icon as={Ionicons} name="calendar" />
          <Text fontWeight="bold" color={textPrimary}>Today's Plan</Text>
        </HStack>
        <Button size="sm" colorScheme="primary" variant="subtle" onPress={() => {
          const map = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
          const todayIdx = new Date().getDay();
          const targetIdx = map.indexOf(selectedDay);
          const diff = targetIdx - todayIdx;
          const d = new Date();
          d.setDate(d.getDate() + diff);
          const dateISO = d.toISOString().slice(0,10);
          (navigation as any).navigate('WorkoutEntry' as never, { presetPlan: todayPlan, weekday: selectedDay, level, dateISO } as never);
        }} leftIcon={<Icon as={Ionicons} name="create-outline" />}>Edit</Button>
      </HStack>
      <VStack space={2}>
        <Text>Level:</Text>
        <HStack space={2} alignItems="center">
          <Select selectedValue={level} minW={36} flex={1} _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }} onValueChange={async (v) => {
            const newLevel = v as 'beginner' | 'intermediate' | 'advanced';
            try { if (user) await AsyncStorage.setItem(`progression_level_${user._id}_${selectedDay}`, v); } catch {}
            setLevel(newLevel);
            if (user && todayPlan && todayPlan.length > 0) {
              calculateTargetsWithLevel(newLevel);
            }
          }}>
            <Select.Item label="Beginner" value="beginner" />
            <Select.Item label="Intermediate" value="intermediate" />
            <Select.Item label="Advanced" value="advanced" />
          </Select>
          <Button variant="outline" size="sm" onPress={() => calculateTargetsWithLevel(level)} leftIcon={<Icon as={Ionicons} name="refresh" />}>Recalculate</Button>
        </HStack>
      </VStack>

      {isOffDay && (
        <VStack space={2}>
          <Text color={textSecondary}>Rest day. Load from another day:</Text>
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
          {todayPlan.map((ex: any, idx: number) => {
            const images = exerciseImages[ex.name] || [];
            // Use stable key based on exercise name and index, not on value
            const exerciseKey = `exercise-${idx}-${ex.name || 'unknown'}`;
            return (
              <VStack key={exerciseKey} space={1}>
                <HStack justifyContent="space-between" alignItems="center">
                  <VStack flex={1}>
                    <Text fontWeight="semibold" color={textPrimary}>{ex.name || 'Exercise'}</Text>
                    <HStack space={2} alignItems="center">
                      <Text fontSize="xs" color={textSecondary}>{(ex.setsCount ?? (ex.defaultSets ? ex.defaultSets.length : 0))} x {(ex.repsCount ?? (ex.defaultSets && ex.defaultSets[0] ? ex.defaultSets[0].reps : 0))}</Text>
                      {ex.restMin != null && ex.restMin > 0 && (
                        <Text fontSize="xs" color={textSecondary}>• Rest: {ex.restMin} min</Text>
                      )}
                    </HStack>
                  </VStack>
                  <Text fontSize="sm" color="primary.600">Suggested: {targets[idx] != null ? `${targets[idx]} kg` : '-'}</Text>
                </HStack>
                {(() => {
                  // Show weight input if weightBased is true, or if it's undefined/null and type is strength
                  const shouldShowWeight = ex.weightBased === true || 
                    (ex.weightBased !== false && (ex.type === 'strength' || ex.type === undefined || ex.type === null));
                  return shouldShowWeight ? (
                    <HStack alignItems="center" space={2}>
                      <Text fontSize="xs" color={textSecondary}>Weight (kg):</Text>
                      <Box flex={1} borderWidth={1} borderRadius={6} borderColor={dashedBorderColor} bg={cardBg}>
                        <WeightInput
                          value={sessionWeights[idx] ?? ''}
                        placeholder={targets[idx] != null ? String(targets[idx]) : '0'}
                        onChangeText={(t) => {
                            setSessionWeights((prev) => {
                              if (prev[idx] === t) return prev;
                              return { ...prev, [idx]: t };
                            });
                          }}
                          style={[textInputStyle, { borderWidth: 0, flex: 1 }]}
                          placeholderTextColor={inputPlaceholder}
                        />
                      </Box>
                    </HStack>
                  ) : null;
                })()}
                {images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    <HStack space={2}>
                      {images.map((img) => (
                        <Pressable
                          key={img._id}
                          onPress={() => {
                            setSelectedImage(img);
                            setIsImageModalOpen(true);
                          }}
                        >
                          <Image
                            source={{ uri: img.uri }}
                            alt={ex.name}
                            width="100px"
                            height="100px"
                            borderRadius="md"
                            resizeMode="cover"
                          />
                        </Pressable>
                      ))}
                    </HStack>
                  </ScrollView>
                )}
              </VStack>
            );
          })}
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
          <Heading size="lg" color={textSecondary}>
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

  // Apply date filter when showing all
  const getFilteredWorkouts = (): Workout[] => {
    if (!showAll) return workouts.slice(0, 6);
    if (dateFilter === 'all') return workouts;
    const now = new Date();
    let from = new Date(0);
    if (dateFilter === '30d') {
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (dateFilter === '90d') {
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (dateFilter === 'ytd') {
      from = new Date(now.getFullYear(), 0, 1);
    }
    return workouts.filter(w => new Date(w.date) >= from);
  };

  const listData: any[] = (() => {
    if (!showAll) {
      const preview = workouts.slice(0, 6);
      if (workouts.length > 6) {
        return [...preview, { _id: 'show_more' }];
      }
      return preview;
    }
    return getFilteredWorkouts();
  })();

  // Memoize ListHeaderComponent to prevent re-renders
  // IMPORTANT: This must be called before any conditional returns to follow Rules of Hooks
  const memoizedListHeader = useMemo(() => (
    <VStack>
      {renderTodayPlan()}
      {/* Save button for today's session */}
      {todayPlan && todayPlan.length > 0 && (
        <Button mt={2} colorScheme="primary" onPress={saveTodayAsWorkout} leftIcon={<Icon as={Ionicons} name="save" />}>Save Day</Button>
      )}
    </VStack>
  ), [todayPlan, sessionWeights, targets, exerciseImages, level, selectedDay, isOffDay, loadFromDay, loadedFromDayTemp, cardBg, textPrimary, textSecondary, dashedBorderColor, inputPlaceholder, textInputStyle, saveTodayAsWorkout, calculateTargetsWithLevel, user, navigation, loadDayPicker, setLoadFromDay, setTodayPlan, setLoadedFromDayTemp, setSelectedImage, setIsImageModalOpen]);

  if (isLoading) {
    return (
      <Box flex={1} bg={pageBg} safeArea>
        <Center flex={1}>
          <Spinner size="lg" color="primary.500" />
          <Text mt={4} color={textSecondary}>Loading workouts...</Text>
        </Center>
      </Box>
    );
  }

  return (
    <Box flex={1} bg={pageBg} safeArea>
      {/* Header */}
      <Box bg={headerBg} px={4} py={3} borderBottomWidth={1} borderBottomColor={headerBorder}>
        <HStack justifyContent="space-between" alignItems="center">
          <VStack>
            <Heading size={isNarrow ? 'md' : 'lg'} color={textPrimary}>
              Workouts
            </Heading>
            <HStack space={2} alignItems="center">
              <Text fontSize="sm" color={textSecondary}>
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
        {showAll && (
          <HStack mt={2} space={2}>
            <Button size="xs" variant={dateFilter==='all'?'solid':'outline'} onPress={() => setDateFilter('all')}>All</Button>
            <Button size="xs" variant={dateFilter==='30d'?'solid':'outline'} onPress={() => setDateFilter('30d')}>30d</Button>
            <Button size="xs" variant={dateFilter==='90d'?'solid':'outline'} onPress={() => setDateFilter('90d')}>90d</Button>
            <Button size="xs" variant={dateFilter==='ytd'?'solid':'outline'} onPress={() => setDateFilter('ytd')}>YTD</Button>
            <Button size="xs" variant="ghost" onPress={() => setShowAll(false)} leftIcon={<Icon as={Ionicons} name="close" />}>Close</Button>
          </HStack>
        )}
      </Box>

      <FlatList
        style={{ flex: 1 }}
        data={listData}
        keyExtractor={(item: any, index: number) => String(item?._id ?? `i-${index}`)}
        renderItem={renderWorkoutItem}
        ListHeaderComponent={memoizedListHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={{ padding: 16, paddingTop: 16, flexGrow: 1 }}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="always"
        showsVerticalScrollIndicator
        removeClippedSubviews={false}
        nestedScrollEnabled={false}
      />

      {/* Full Screen Single Image Modal */}
      <Modal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        size="full"
      >
        <Modal.Content>
          <Modal.CloseButton />
          {selectedImage && (
            <Modal.Body>
              <Image
                source={{ uri: selectedImage.uri }}
                alt={selectedImage.exerciseName}
                width="100%"
                height="400px"
                resizeMode="contain"
              />
            </Modal.Body>
          )}
        </Modal.Content>
      </Modal>
    </Box>
  );
}
