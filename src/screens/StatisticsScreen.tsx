import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Center,
  Heading,
  Icon,
  ScrollView
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';

export default function StatisticsScreen() {
  return (
    <Box flex={1} bg="gray.50" safeArea>
      {/* Header */}
      <Box bg="white" px={6} py={4} borderBottomWidth={1} borderBottomColor="gray.200">
        <Heading size="lg" color="gray.800">
          Statistics
        </Heading>
        <Text fontSize="sm" color="gray.600">
          Track your progress and performance
        </Text>
      </Box>

      {/* Content */}
      <ScrollView flex={1} contentContainerStyle={{ flexGrow: 1 }}>
        <Center flex={1} px={6}>
          <VStack space={4} alignItems="center">
            <Icon as={Ionicons} name="stats-chart-outline" size="4xl" color="gray.400" />
            <VStack space={2} alignItems="center">
              <Heading size="lg" color="gray.600">
                Statistics Coming Soon
              </Heading>
              <Text fontSize="md" color="gray.500" textAlign="center">
                Track your workout progress, personal records, and fitness trends
              </Text>
            </VStack>
          </VStack>
        </Center>
      </ScrollView>
    </Box>
  );
}
