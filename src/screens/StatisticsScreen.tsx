import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Center,
  Heading,
  Icon,
  FlatList,
  Select,
  CheckIcon,
  Divider,
  Button,
  useColorModeValue
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { realmDB } from '../database/realm';

type WeekBucket = { weekLabel: string; start: Date; end: Date; volume: number; sessions: number };

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday-based
  d.setDate(d.getDate() - diff);
  d.setHours(0,0,0,0);
  return d;
}

function formatWeekLabel(d: Date): string {
  return `${d.getMonth()+1}/${d.getDate()}`;
}

function epley1rm(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

function brzycki1rm(weight: number, reps: number): number {
  const denom = 37 - reps;
  if (denom <= 0) return weight;
  return (weight * 36) / denom;
}

export default function StatisticsScreen() {
  const isWeb = Platform.OS === 'web';
  // Lazy-load native-only charts to avoid breaking web
  let CombinedChart: any = null;
  let PieChart: any = null;
  let processColorFn: any = (x: any) => x;
  if (!isWeb) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const charts = require('react-native-charts-wrapper');
    CombinedChart = charts.CombinedChart;
    PieChart = charts.PieChart;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    processColorFn = require('react-native').processColor;
  }
  const { user } = useAuth();
  const [weeks, setWeeks] = useState<WeekBucket[]>([]);
  const [exerciseOptions, setExerciseOptions] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [exerciseTrend, setExerciseTrend] = useState<{ labels: string[]; bars: number[]; line: number[] }>({ labels: [], bars: [], line: [] });
  const [prs, setPrs] = useState<Array<{ name: string; weight: number; reps: number; oneRm: number; date: Date }>>([]);
  const [groupDist, setGroupDist] = useState<Array<{ group: string; volume: number }>>([]);
  const [hasAnyWorkouts, setHasAnyWorkouts] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;
    const workouts = realmDB.getWorkouts(user._id, 500, 0);
    setHasAnyWorkouts(workouts.length > 0);
    // last 8 weeks buckets
    const end = new Date();
    const startOfThisWeek = getWeekStart(end);
    const buckets: WeekBucket[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date(startOfThisWeek);
      start.setDate(start.getDate() - 7 * i);
      const endw = new Date(start);
      endw.setDate(endw.getDate() + 6);
      buckets.push({ weekLabel: formatWeekLabel(start), start, end: endw, volume: 0, sessions: 0 });
    }
    const groups: Record<string, number> = {};
    const exNames = new Set<string>();
    workouts.forEach(w => {
      const wDate = new Date(w.date);
      const idx = buckets.findIndex(b => wDate >= b.start && wDate <= b.end);
      if (idx >= 0) {
        const vol = w.exercises.reduce((t: number, e: any) => t + e.sets.reduce((et: number, s: any) => et + (s.weight || 0) * s.reps, 0), 0);
        buckets[idx].volume += vol;
        buckets[idx].sessions += 1;
      }
      w.exercises.forEach((e: any) => {
        exNames.add(e.name);
        const g = e.muscleGroup || 'other';
        const v = e.sets.reduce((t: number, s: any) => t + (s.weight || 0) * s.reps, 0);
        groups[g] = (groups[g] || 0) + v;
      });
    });
    setWeeks(buckets);
    setExerciseOptions(Array.from(exNames.values()).sort());
    setGroupDist(Object.entries(groups).map(([group, volume]) => ({ group, volume })));
  }, [user]);

  useEffect(() => {
    if (!user || !selectedExercise) { setExerciseTrend({ labels: [], bars: [], line: [] }); return; }
    const workouts = realmDB.getWorkouts(user._id, 500, 0).sort((a: any, b: any) => +new Date(a.date) - +new Date(b.date));
    const data: Array<{ date: Date; top: number; avg: number }> = [];
    workouts.forEach(w => {
      const ex = w.exercises.find((e: any) => e.name.toLowerCase() === selectedExercise.toLowerCase());
      if (ex) {
        const weights = ex.sets.map((s: any) => s.weight || 0).filter((x: number) => x > 0);
        if (weights.length > 0) {
          const top = Math.max(...weights);
          const avg = weights.reduce((a: number, b: number) => a + b, 0) / weights.length;
          data.push({ date: new Date(w.date), top, avg });
        }
      }
    });
    const last8 = data.slice(-8);
    setExerciseTrend({
      labels: last8.map(d => `${d.date.getMonth()+1}/${d.date.getDate()}`),
      bars: last8.map(d => d.top),
      line: last8.map(d => d.avg)
    });
  }, [user, selectedExercise]);

  useEffect(() => {
    if (!user) return;
    const workouts = realmDB.getWorkouts(user._id, 500, 0);
    const prMap: Record<string, { weight: number; reps: number; oneRm: number; date: Date }[]> = {};
    workouts.forEach(w => {
      w.exercises.forEach((e: any) => {
        e.sets.forEach((s: any) => {
          const oneRm = Math.max(epley1rm(s.weight || 0, s.reps || 0), brzycki1rm(s.weight || 0, s.reps || 0));
          const arr = prMap[e.name] || [];
          arr.push({ weight: s.weight || 0, reps: s.reps || 0, oneRm, date: new Date(w.date) });
          prMap[e.name] = arr;
        });
      });
    });
    const topPrs: Array<{ name: string; weight: number; reps: number; oneRm: number; date: Date }> = [];
    Object.entries(prMap).forEach(([name, arr]) => {
      arr.sort((a, b) => b.oneRm - a.oneRm);
      if (arr[0]) topPrs.push({ name, ...arr[0] });
    });
    topPrs.sort((a, b) => b.oneRm - a.oneRm);
    setPrs(topPrs.slice(0, 10));
  }, [user]);

  const volumeBars = useMemo(() => weeks.map(w => w.volume), [weeks]);
  const sessionLine = useMemo(() => weeks.map(w => w.sessions), [weeks]);
  const labels = useMemo(() => weeks.map(w => w.weekLabel), [weeks]);

  const seedDemoData = () => {
    if (!user) return;
    const startOfThisWeek = getWeekStart(new Date());
    const namePool = ['Bench Press','Squat','Deadlift','Overhead Press','Barbell Row','Lat Pulldown'];
    // create 10 sessions across last 6 weeks
    for (let i = 0; i < 10; i++) {
      const dayOffset = Math.floor(Math.random() * 42) - 41; // up to 6 weeks back
      const d = new Date(startOfThisWeek);
      d.setDate(d.getDate() + dayOffset);
      const exCount = 2 + Math.floor(Math.random() * 3);
      const exercises = Array.from({ length: exCount }).map((_, idx) => {
        const name = namePool[(i + idx) % namePool.length];
        const reps = 5 + (Math.floor(Math.random() * 4) * 2);
        const setsCt = 3 + Math.floor(Math.random() * 2);
        const base = 40 + Math.random() * 60;
        return {
          name,
          muscleGroup: 'other',
          equipment: undefined,
          type: 'strength',
          weightBased: true,
          sets: Array.from({ length: setsCt }).map(() => ({ reps, weight: Math.round((base + Math.random() * 20) * 10) / 10 }))
        } as any;
      });
      const totalVolume = exercises.reduce((t: number, e: any) => t + e.sets.reduce((et: number, s: any) => et + (s.weight || 0) * s.reps, 0), 0);
      realmDB.createWorkout({
        userId: user._id,
        date: d,
        warmup: undefined,
        exercises,
        notes: 'demo',
        totalVolume,
        isPR: false,
        lastModified: new Date(),
        clientTimestamp: new Date()
      } as any);
    }
    // refresh
    const workouts = realmDB.getWorkouts(user._id, 500, 0);
    setHasAnyWorkouts(workouts.length > 0);
    // trigger effects by toggling selectedExercise
    setSelectedExercise('');
    // recompute buckets
    const end = new Date();
    const startWeek = getWeekStart(end);
    const buckets: WeekBucket[] = [];
    for (let i = 7; i >= 0; i--) {
      const s = new Date(startWeek);
      s.setDate(s.getDate() - 7 * i);
      const e = new Date(s);
      e.setDate(e.getDate() + 6);
      buckets.push({ weekLabel: formatWeekLabel(s), start: s, end: e, volume: 0, sessions: 0 });
    }
    const groups: Record<string, number> = {};
    const exNames = new Set<string>();
    workouts.forEach((w: any) => {
      const wDate = new Date(w.date);
      const idx = buckets.findIndex(b => wDate >= b.start && wDate <= b.end);
      if (idx >= 0) {
        const vol = w.exercises.reduce((t: number, e: any) => t + e.sets.reduce((et: number, s: any) => et + (s.weight || 0) * s.reps, 0), 0);
        buckets[idx].volume += vol;
        buckets[idx].sessions += 1;
      }
      w.exercises.forEach((e: any) => {
        exNames.add(e.name);
        const g = e.muscleGroup || 'other';
        const v = e.sets.reduce((t: number, s: any) => t + (s.weight || 0) * s.reps, 0);
        groups[g] = (groups[g] || 0) + v;
      });
    });
    setWeeks(buckets);
    setExerciseOptions(Array.from(exNames.values()).sort());
    setGroupDist(Object.entries(groups).map(([group, volume]) => ({ group, volume })));
  };

  const pageBg = useColorModeValue('gray.50','gray.900');
  const headerBg = useColorModeValue('white','gray.900');
  const cardBg = useColorModeValue('white','gray.800');
  return (
    <Box flex={1} bg={pageBg} safeArea>
      {/* Header */}
      <Box bg={headerBg} px={6} py={4} borderBottomWidth={1} borderBottomColor={useColorModeValue('gray.200','gray.700')}>
        <Heading size="lg" color="gray.800">
          Statistics
        </Heading>
        <Text fontSize="sm" color="gray.600">
          8-week overview, PRs and distributions
        </Text>
      </Box>

      <FlatList
        data={[0]}
        keyExtractor={() => 'stats-header'}
        renderItem={null}
        ListHeaderComponent={
          <VStack space={0} px={3} py={3}>
            {!hasAnyWorkouts && (
              <VStack bg="white" p={4} borderRadius="lg" shadow={1} space={3} mb={4}>
                <Text color="gray.700">No workouts found. Add a workout or load demo data to preview charts.</Text>
                <HStack space={2}>
                  <Button onPress={seedDemoData} colorScheme="primary">Load Demo Data</Button>
                </HStack>
              </VStack>
            )}
            {/* Weekly Volume + Sessions (Combined) */}
            <VStack bg={cardBg} p={4} borderRadius="lg" shadow={1} space={2} mb={4}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontWeight="bold">Weekly Volume & Sessions (8 weeks)</Text>
              </HStack>
              {labels.length > 0 ? (
                <Box height={260}>
                  {isWeb ? (
                    <Center flex={1}>
                      <Text color="gray.500">Charts are not available on web in this build.</Text>
                    </Center>
                  ) : (
                    <CombinedChart
                      style={{ flex: 1 }}
                      data={{
                        barData: {
                          dataSets: [{ values: volumeBars, label: 'Volume (kg)', config: { color: processColorFn('#4C6FFF') } }]
                        },
                        lineData: {
                          dataSets: [{ values: sessionLine, label: 'Sessions', config: { color: processColorFn('#22C55E'), drawCircles: false } }]
                        }
                      }}
                      xAxis={{ valueFormatter: labels, position: 'BOTTOM' }}
                      yAxis={{ left: { axisMinimum: 0 }, right: { enabled: false } }}
                      legend={{ enabled: true }}
                    />
                  )}
                </Box>
              ) : (
                <Text color="gray.500">No data</Text>
              )}
            </VStack>

            {/* Exercise Trend */}
            <VStack bg={cardBg} p={4} borderRadius="lg" shadow={1} space={3} mb={4}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontWeight="bold">Exercise Trend</Text>
                <Select minW={40} selectedValue={selectedExercise} placeholder="Select exercise" _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }} onValueChange={setSelectedExercise}>
                  {exerciseOptions.map(n => (<Select.Item key={n} label={n} value={n} />))}
                </Select>
              </HStack>
              {exerciseTrend.labels.length > 0 ? (
                <Box height={260}>
                  {isWeb ? (
                    <Center flex={1}>
                      <Text color="gray.500">Charts are not available on web in this build.</Text>
                    </Center>
                  ) : (
                    <CombinedChart
                      style={{ flex: 1 }}
                      data={{
                        barData: {
                          dataSets: [{ values: exerciseTrend.bars, label: 'Top set (kg)', config: { color: processColorFn('#A855F7') } }]
                        },
                        lineData: {
                          dataSets: [{ values: exerciseTrend.line, label: 'Avg set (kg)', config: { color: processColorFn('#0EA5E9'), drawCircles: false } }]
                        }
                      }}
                      xAxis={{ valueFormatter: exerciseTrend.labels, position: 'BOTTOM' }}
                      yAxis={{ left: { axisMinimum: 0 }, right: { enabled: false } }}
                      legend={{ enabled: true }}
                    />
                  )}
                </Box>
              ) : (
                <Text color="gray.500">Select an exercise</Text>
              )}
            </VStack>

            {/* PR List */}
            <VStack bg={cardBg} p={4} borderRadius="lg" shadow={1} space={2} mb={4}>
              <Text fontWeight="bold" mb={2}>Top PRs (Epley/Brzycki 1RM)</Text>
              {prs.length > 0 ? prs.map((p, i) => (
                <HStack key={`${p.name}-${i}`} justifyContent="space-between" py={1}>
                  <Text flex={1}>{p.name}</Text>
                  <Text flex={1} textAlign="center">{p.weight?.toFixed(1)} kg x {p.reps}</Text>
                  <Text flex={1} textAlign="right">1RM {p.oneRm.toFixed(1)} kg</Text>
                </HStack>
              )) : <Text color="gray.500">No PRs</Text>}
            </VStack>

            {/* Muscle Group Distribution */}
            <VStack bg={cardBg} p={4} borderRadius="lg" shadow={1} space={2} mb={4}>
              <Text fontWeight="bold" mb={2}>Muscle Group Volume</Text>
              {groupDist.length > 0 ? (
                <Box height={260}>
                  {isWeb ? (
                    <Center flex={1}>
                      <Text color="gray.500">Charts are not available on web in this build.</Text>
                    </Center>
                  ) : (
                    <PieChart
                      style={{ flex: 1 }}
                      data={{ dataSets: [{ values: groupDist.map(g => ({ value: g.volume, label: g.group })) }] }}
                      legend={{ enabled: true }}
                    />
                  )}
                </Box>
              ) : (
                <Text color="gray.500">No data</Text>
              )}
            </VStack>
          </VStack>
        }
      />
    </Box>
  );
}
