import React, { useEffect, useState } from 'react';
import { Box, VStack, HStack, Text, Button, Icon, ScrollView, FormControl, Input, Select, CheckIcon, Divider } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_WEEKLY_PROGRAM, Weekday, getWeeklyProgram, saveWeeklyProgram, ProgramExerciseTemplate } from '../services/weeklyProgram';

const WEEKDAYS: Weekday[] = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

export default function WeeklyProgramScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [selectedDay, setSelectedDay] = useState<Weekday>('monday');
  const [program, setProgram] = useState<any>(DEFAULT_WEEKLY_PROGRAM);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const existing = await getWeeklyProgram(user._id);
      if (existing) setProgram(existing);
    })();
  }, [user]);

  const dayPlan = program[selectedDay] || { off: false, exercises: [] };

  const setDayPlan = (next: any) => {
    setProgram((prev: any) => ({ ...prev, [selectedDay]: next }));
  };

  const addExercise = () => {
    setDayPlan({ ...dayPlan, exercises: [...(dayPlan.exercises || []), { name: '', muscleGroup: 'other', type: 'strength', weightBased: true, setsCount: 3, repsCount: 8 }] });
  };

  const removeExercise = (idx: number) => {
    setDayPlan({ ...dayPlan, exercises: dayPlan.exercises.filter((_: any, i: number) => i !== idx) });
  };

  const updateExercise = (idx: number, field: keyof ProgramExerciseTemplate, value: any) => {
    setDayPlan({ ...dayPlan, exercises: dayPlan.exercises.map((ex: any, i: number) => (i === idx ? { ...ex, [field]: value } : ex)) });
  };

  const toggleOff = (off: boolean) => {
    setDayPlan({ ...dayPlan, off });
  };

  const save = async () => {
    if (!user) return;
    await saveWeeklyProgram(user._id, program as any);
    // @ts-ignore
    (navigation as any).goBack();
  };

  return (
    <Box flex={1} bg="gray.50" safeArea>
      <HStack alignItems="center" justifyContent="space-between" px={4} py={3} bg="white" borderBottomWidth={1} borderBottomColor="gray.200">
        <HStack alignItems="center" space={2}>
          <Button variant="ghost" onPress={() => (navigation as any).goBack()} leftIcon={<Icon as={Ionicons} name="chevron-back" />}>Back</Button>
          <Text fontSize="lg" fontWeight="bold">Weekly Program</Text>
        </HStack>
        <Button colorScheme="primary" onPress={save} leftIcon={<Icon as={Ionicons} name="save" />}>Save</Button>
      </HStack>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <VStack space={4}>
          <FormControl>
            <FormControl.Label>Day</FormControl.Label>
            <Select selectedValue={selectedDay} onValueChange={(v) => setSelectedDay(v as Weekday)} _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} /> }}>
              {WEEKDAYS.map(d => (
                <Select.Item key={d} label={d.charAt(0).toUpperCase() + d.slice(1)} value={d} />
              ))}
            </Select>
          </FormControl>

          <FormControl>
            <FormControl.Label>Off Day</FormControl.Label>
            <Select selectedValue={dayPlan.off ? 'yes' : 'no'} onValueChange={(v) => toggleOff(v === 'yes')} _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} /> }}>
              <Select.Item label="Yes" value="yes" />
              <Select.Item label="No" value="no" />
            </Select>
          </FormControl>

          {(dayPlan.exercises || []).map((ex: any, idx: number) => (
            <VStack key={idx} space={3} bg="white" p={4} borderRadius="lg" shadow={1}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontWeight="semibold">Exercise {idx + 1}</Text>
                <Button variant="outline" size="sm" colorScheme="red" onPress={() => removeExercise(idx)} leftIcon={<Icon as={Ionicons} name="trash" />}>Remove</Button>
              </HStack>
              <FormControl>
                <FormControl.Label>Name</FormControl.Label>
                <Input value={ex.name} onChangeText={t => updateExercise(idx, 'name', t)} placeholder="e.g., Bench Press" />
              </FormControl>
              <HStack space={2}>
                <FormControl flex={1}>
                  <FormControl.Label>Muscle Group</FormControl.Label>
                  <Select selectedValue={ex.muscleGroup} onValueChange={v => updateExercise(idx, 'muscleGroup', v)} _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} /> }}>
                    {['chest','back','shoulders','arms','legs','core','cardio','other'].map(g => (
                      <Select.Item key={`${g}-${idx}`} label={g} value={g} />
                    ))}
                  </Select>
                </FormControl>
                <FormControl flex={1}>
                  <FormControl.Label>Type</FormControl.Label>
                  <Select selectedValue={ex.type} onValueChange={v => updateExercise(idx, 'type', v)} _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} /> }}>
                    {['strength','bodyweight','cardio'].map(t => (
                      <Select.Item key={`${t}-${idx}`} label={t} value={t} />
                    ))}
                  </Select>
                </FormControl>
              </HStack>
              <FormControl>
                <FormControl.Label>Weight-based</FormControl.Label>
                <Select selectedValue={ex.weightBased ? 'yes' : 'no'} onValueChange={v => updateExercise(idx, 'weightBased', v === 'yes')} _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} /> }}>
                  <Select.Item label="Yes" value="yes" />
                  <Select.Item label="No" value="no" />
                </Select>
              </FormControl>
              <Divider />
              <HStack space={2}>
                <FormControl flex={1}>
                  <FormControl.Label>Sets</FormControl.Label>
                  <Input keyboardType="number-pad" value={String(ex.setsCount)} onChangeText={t => updateExercise(idx, 'setsCount', parseInt(t.replace(/[^0-9]/g, ''), 10) || 0)} />
                </FormControl>
                <FormControl flex={1}>
                  <FormControl.Label>Reps</FormControl.Label>
                  <Input keyboardType="number-pad" value={String(ex.repsCount)} onChangeText={t => updateExercise(idx, 'repsCount', parseInt(t.replace(/[^0-9]/g, ''), 10) || 0)} />
                </FormControl>
              </HStack>
            </VStack>
          ))}

          {!dayPlan.off && (
            <Button variant="outline" onPress={addExercise} leftIcon={<Icon as={Ionicons} name="add-circle-outline" />}>Add Exercise</Button>
          )}
        </VStack>
      </ScrollView>
    </Box>
  );
}


