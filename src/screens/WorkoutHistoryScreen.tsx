import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  Pressable,
  Select,
  CheckIcon,
  useColorMode,
} from 'native-base';
import { FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { realmDB } from '../database/realm';
import { Workout } from '../types';
import { useNavigation } from '@react-navigation/native';

export default function WorkoutHistoryScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colorMode } = useColorMode();
  const pageBg = colorMode === 'dark' ? 'gray.900' : 'gray.50';
  const headerBg = colorMode === 'dark' ? 'gray.900' : 'white';
  const cardBg = colorMode === 'dark' ? 'gray.800' : 'white';
  const textPrimary = colorMode === 'dark' ? 'gray.100' : 'gray.800';
  const textSecondary = colorMode === 'dark' ? 'gray.300' : 'gray.600';
  const borderColor = colorMode === 'dark' ? 'gray.700' : 'gray.200';

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [year, setYear] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [day, setDay] = useState<string>('');
  const [weekday, setWeekday] = useState<null | number>(null); // 0 Sun .. 6 Sat
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    if (!user) return;
    const data = realmDB.getWorkouts(user._id, 1000, 0);
    setWorkouts(data);
  }, [user]);

  const filtered = useMemo(() => {
    let data = [...workouts];
    // Date filter (only if Y/M/D all selected)
    if (year && month && day) {
      const target = new Date(`${year}-${month}-${day}`);
      data = data.filter(w => {
        const d = new Date(w.date);
        return d.getFullYear() === target.getFullYear() &&
               d.getMonth() === target.getMonth() &&
               d.getDate() === target.getDate();
      });
    }
    // Weekday filter
    if (weekday != null) {
      data = data.filter(w => new Date(w.date).getDay() === weekday);
    }
    // Sort
    data.sort((a, b) => sortOrder === 'desc'
      ? +new Date(b.date) - +new Date(a.date)
      : +new Date(a.date) - +new Date(b.date));
    return data;
  }, [workouts, year, month, day, weekday, sortOrder]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
  };

  const getTotalVolume = (w: Workout) =>
    w.exercises.reduce((t, e) => t + e.sets.reduce((et, s) => et + (s.weight || 0) * s.reps, 0), 0);

  const years = Array.from({ length: 10 }).map((_, i) => String(new Date().getFullYear() - i));
  const months = Array.from({ length: 12 }).map((_, i) => String(i + 1).padStart(2, '0'));
  const days = Array.from({ length: 31 }).map((_, i) => String(i + 1).padStart(2, '0'));

  return (
    <Box flex={1} bg={pageBg} safeArea>
      <HStack alignItems="center" justifyContent="space-between" px={4} py={3} bg={headerBg} borderBottomWidth={1} borderBottomColor={borderColor}>
        <HStack alignItems="center" space={2}>
          <Button variant="ghost" onPress={() => navigation.goBack()} leftIcon={<Icon as={Ionicons} name="chevron-back" />}>Back</Button>
          <Text fontSize="lg" fontWeight="bold" color={textPrimary}>Workout History</Text>
        </HStack>
      </HStack>

      {/* Filters */}
      <VStack space={3} px={4} py={3}>
        <HStack space={2}>
          <Select flex={1} selectedValue={year} placeholder="Year" _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }} onValueChange={setYear}>
            {years.map(y => <Select.Item key={y} label={y} value={y} />)}
          </Select>
          <Select flex={1} selectedValue={month} placeholder="Month" _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }} onValueChange={setMonth}>
            {months.map(m => <Select.Item key={m} label={m} value={m} />)}
          </Select>
          <Select flex={1} selectedValue={day} placeholder="Day" _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }} onValueChange={setDay}>
            {days.map(d => <Select.Item key={d} label={d} value={d} />)}
          </Select>
        </HStack>
        <HStack space={2} alignItems="center" flexWrap="wrap">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((lbl, idx) => {
            // map back to JS weekday idx (0=Sun..6=Sat)
            const jsIdx = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(lbl);
            return (
              <Button
                key={lbl}
                size="xs"
                variant={weekday===jsIdx?'solid':'outline'}
                onPress={() => setWeekday(weekday===jsIdx?null:jsIdx)}
                mr={1}
                mb={1}
              >
                {lbl}
              </Button>
            );
          })}
          <Button size="sm" variant="outline" onPress={() => { setYear(''); setMonth(''); setDay(''); setWeekday(null); }}>Clear</Button>
        </HStack>
        <HStack space={2}>
          <Select flex={1} selectedValue={sortOrder} onValueChange={v => setSortOrder(v as any)} _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}>
            <Select.Item label="Newest first" value="desc" />
            <Select.Item label="Oldest first" value="asc" />
          </Select>
        </HStack>
      </VStack>

      {/* List */}
      <FlatList
        style={{ flex: 1 }}
        data={filtered}
        keyExtractor={(item: any) => String(item._id)}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => (navigation as any).navigate('WorkoutDetail' as never, { id: item._id } as never)}>
          <Box bg={cardBg} p={4} borderRadius="lg" shadow={1} mb={3}>
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
              </VStack>
            </HStack>
            <VStack space={1}>
              {item.exercises.slice(0, 2).map((e: any, i: number) => (
                <HStack key={i} justifyContent="space-between">
                  <Text fontSize="sm" color={textPrimary} flex={1}>
                    {e.name}
                  </Text>
                  <Text fontSize="sm" color={textSecondary}>
                    {e.sets.length} sets
                  </Text>
                </HStack>
              ))}
            </VStack>
          </Box>
          </Pressable>
        )}
      />
    </Box>
  );
}


