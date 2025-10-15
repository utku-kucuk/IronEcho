import React, { useState } from 'react';
import { Box, VStack, HStack, Text, Input, Button, Icon, ScrollView, useToast } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { realmDB } from '../database/realm';
import { useAuth } from '../context/AuthContext';

export default function MeasurementEntryScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const toast = useToast();

  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [neck, setNeck] = useState('');
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [hips, setHips] = useState('');
  const [thighLeft, setThighLeft] = useState('');
  const [thighRight, setThighRight] = useState('');
  const [armLeftRelaxed, setArmLeftRelaxed] = useState('');
  const [armRightRelaxed, setArmRightRelaxed] = useState('');
  const [armLeftContracted, setArmLeftContracted] = useState('');
  const [armRightContracted, setArmRightContracted] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');

  const save = () => {
    try {
      if (!user) throw new Error('Not authenticated');

      realmDB.createMeasurement({
        userId: user._id,
        date: new Date(date),
        measurements: {
          neck: neck ? parseFloat(neck) : undefined,
          waist: waist ? parseFloat(waist) : undefined,
          chest: chest ? parseFloat(chest) : undefined,
          hips: hips ? parseFloat(hips) : undefined,
          thighLeft: thighLeft ? parseFloat(thighLeft) : undefined,
          thighRight: thighRight ? parseFloat(thighRight) : undefined,
          armLeftRelaxed: armLeftRelaxed ? parseFloat(armLeftRelaxed) : undefined,
          armRightRelaxed: armRightRelaxed ? parseFloat(armRightRelaxed) : undefined,
          armLeftContracted: armLeftContracted ? parseFloat(armLeftContracted) : undefined,
          armRightContracted: armRightContracted ? parseFloat(armRightContracted) : undefined,
        },
        weight: weight ? parseFloat(weight) : undefined,
        bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
        notes: undefined,
        photos: [],
        lastModified: new Date(),
        clientTimestamp: new Date()
      } as any);

      toast.show({ title: 'Saved', description: 'Measurements saved locally', status: 'success' });
      // @ts-ignore
      navigation.goBack();
    } catch (e: any) {
      toast.show({ title: 'Error', description: e.message || 'Failed to save measurements', status: 'error' });
    }
  };

  return (
    <Box flex={1} bg="gray.50" safeArea>
      <HStack alignItems="center" justifyContent="space-between" px={4} py={3} bg="white" borderBottomWidth={1} borderBottomColor="gray.200">
        <HStack alignItems="center" space={2}>
          <Button variant="ghost" onPress={() => (navigation as any).goBack()} leftIcon={<Icon as={Ionicons} name="chevron-back" />}>Back</Button>
          <Text fontSize="lg" fontWeight="bold">New Measurement</Text>
        </HStack>
        <Button colorScheme="primary" onPress={save} leftIcon={<Icon as={Ionicons} name="save" />}>Save</Button>
      </HStack>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <VStack space={3} bg="white" p={4} borderRadius="lg" shadow={1}>
          <Text fontWeight="semibold">Date</Text>
          <Input value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          <HStack space={2}>
            <Input flex={1} placeholder="Neck" value={neck} onChangeText={setNeck} keyboardType="decimal-pad" />
            <Input flex={1} placeholder="Waist" value={waist} onChangeText={setWaist} keyboardType="decimal-pad" />
          </HStack>
          <HStack space={2}>
            <Input flex={1} placeholder="Chest" value={chest} onChangeText={setChest} keyboardType="decimal-pad" />
            <Input flex={1} placeholder="Hips" value={hips} onChangeText={setHips} keyboardType="decimal-pad" />
          </HStack>
          <HStack space={2}>
            <Input flex={1} placeholder="Thigh L" value={thighLeft} onChangeText={setThighLeft} keyboardType="decimal-pad" />
            <Input flex={1} placeholder="Thigh R" value={thighRight} onChangeText={setThighRight} keyboardType="decimal-pad" />
          </HStack>
          <HStack space={2}>
            <Input flex={1} placeholder="Arm L relaxed" value={armLeftRelaxed} onChangeText={setArmLeftRelaxed} keyboardType="decimal-pad" />
            <Input flex={1} placeholder="Arm R relaxed" value={armRightRelaxed} onChangeText={setArmRightRelaxed} keyboardType="decimal-pad" />
          </HStack>
          <HStack space={2}>
            <Input flex={1} placeholder="Arm L contracted" value={armLeftContracted} onChangeText={setArmLeftContracted} keyboardType="decimal-pad" />
            <Input flex={1} placeholder="Arm R contracted" value={armRightContracted} onChangeText={setArmRightContracted} keyboardType="decimal-pad" />
          </HStack>
          <HStack space={2}>
            <Input flex={1} placeholder="Weight" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
            <Input flex={1} placeholder="Body fat %" value={bodyFat} onChangeText={setBodyFat} keyboardType="decimal-pad" />
          </HStack>
        </VStack>
      </ScrollView>
    </Box>
  );
}


