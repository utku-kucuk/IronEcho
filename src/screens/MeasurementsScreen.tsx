import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Center,
  Heading,
  Icon,
  ScrollView,
  Button,
  FlatList
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { realmDB } from '../database/realm';
import { useAuth } from '../context/AuthContext';
import { Measurement } from '../types';

export default function MeasurementsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [items, setItems] = useState<Measurement[]>([]);

  useEffect(() => {
    if (user) {
      const data = realmDB.getMeasurements(user._id, 50, 0);
      setItems(data);
    }
  }, [user]);
  return (
    <Box flex={1} bg="gray.50" safeArea>
      {/* Header */}
      <Box bg="white" px={6} py={4} borderBottomWidth={1} borderBottomColor="gray.200">
        <HStack justifyContent="space-between" alignItems="center">
          <VStack>
            <Heading size="lg" color="gray.800">
              Measurements
            </Heading>
            <Text fontSize="sm" color="gray.600">
              Track your body measurements and progress photos
            </Text>
          </VStack>
          <Button size="sm" colorScheme="primary" leftIcon={<Icon as={Ionicons} name="add" size="sm" />} onPress={() => (navigation as any).navigate('MeasurementEntry' as never)}>
            New
          </Button>
        </HStack>
      </Box>

      {/* Content */}
      {items.length === 0 ? (
        <ScrollView flex={1} contentContainerStyle={{ flexGrow: 1 }}>
          <Center flex={1} px={6}>
            <VStack space={4} alignItems="center">
              <Icon as={Ionicons} name="body-outline" size="4xl" color="gray.400" />
              <VStack space={2} alignItems="center">
                <Heading size="lg" color="gray.600">
                  No Measurements Yet
                </Heading>
                <Text fontSize="md" color="gray.500" textAlign="center">
                  Add your first entry to track progress
                </Text>
              </VStack>
            </VStack>
          </Center>
        </ScrollView>
      ) : (
        <ScrollView p={4}>
          {items.map((item) => (
            <Box key={item._id!} bg="white" p={4} borderRadius="lg" shadow={1} mb={3}>
              <HStack justifyContent="space-between">
                <VStack>
                  <Text fontWeight="bold">{new Date(item.date).toDateString()}</Text>
                  <Text color="gray.600">Weight: {item.weight ?? '-'} | Body fat: {item.bodyFat ?? '-'}</Text>
                </VStack>
              </HStack>
            </Box>
          ))}
        </ScrollView>
      )}
    </Box>
  );
}
