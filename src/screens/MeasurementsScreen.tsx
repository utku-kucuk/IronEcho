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
  FlatList,
  Pressable,
  Badge,
  Divider,
  Image,
  useColorModeValue
} from 'native-base';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { realmDB } from '../database/realm';
import { useAuth } from '../context/AuthContext';
import { Measurement } from '../types';

export default function MeasurementsScreen() {
  const isWeb = Platform.OS === 'web';
  // Lazy-load native-only charts to avoid breaking web
  let CombinedChart: any = null;
  let processColorFn: any = (x: any) => x;
  if (!isWeb) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    CombinedChart = require('react-native-charts-wrapper').CombinedChart;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    processColorFn = require('react-native').processColor;
  }
  const navigation = useNavigation();
  const { user } = useAuth();
  const [items, setItems] = useState<Measurement[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      const data = realmDB.getMeasurements(user._id, 200, 0);
      setItems(data);
    }
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        const data = realmDB.getMeasurements(user._id, 200, 0);
        setItems(data);
      }
    }, [user])
  );

  const onRefresh = () => {
    if (!user) return;
    setRefreshing(true);
    const data = realmDB.getMeasurements(user._id, 200, 0);
    setItems(data);
    setRefreshing(false);
  };
  const pageBg = useColorModeValue('gray.50','gray.900');
  const headerBg = useColorModeValue('white','gray.900');
  const cardBg = useColorModeValue('white','gray.800');
  return (
    <Box flex={1} bg={pageBg} safeArea>
      {/* Header */}
      <Box bg={headerBg} pl={6} pr={8} py={4} borderBottomWidth={1} borderBottomColor={useColorModeValue('gray.200','gray.700')}>
        <HStack justifyContent="flex-start" alignItems="center">
          <VStack flex={1}>
            <Heading size="lg" color="gray.800">
              Measurements
            </Heading>
            <Text fontSize="sm" color="gray.600">
              Track your body measurements and progress photos
            </Text>
          </VStack>
          <HStack flexShrink={0} justifyContent="flex-end">
          <Button size="sm" colorScheme="primary" leftIcon={<Icon as={Ionicons} name="add" size="sm" />} onPress={() => (navigation as any).navigate('MeasurementEntry' as never)}>
            New
          </Button>
          </HStack>
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
        <FlatList
          data={items}
          keyExtractor={(item: any) => String(item._id)}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={{ padding: 16 }}
          ListHeaderComponent={items.length > 1 ? (
            <VStack bg={cardBg} p={4} borderRadius="lg" shadow={1} mb={3}>
              <Text fontWeight="bold" mb={2}>Weight & Body Fat Trend</Text>
              <Box height={220}>
                {isWeb ? (
                  <Center flex={1}>
                    <Text color="gray.500">Charts are not available on web in this build.</Text>
                  </Center>
                ) : (
                  <CombinedChart
                    style={{ flex: 1 }}
                    data={{
                      barData: {
                        dataSets: [{ values: items.slice(-8).map(i => i.weight || 0), label: 'Weight (kg)', config: { color: processColorFn('#4C6FFF') } }]
                      },
                      lineData: {
                        dataSets: [{ values: items.slice(-8).map(i => i.bodyFat || 0), label: 'Body Fat %', config: { color: processColorFn('#22C55E'), drawCircles: false } }]
                      }
                    }}
                    xAxis={{ valueFormatter: items.slice(-8).map(i => new Date(i.date).toLocaleDateString()), position: 'BOTTOM' }}
                    yAxis={{ left: { axisMinimum: 0 }, right: { enabled: false } }}
                    legend={{ enabled: true }}
                  />
                )}
              </Box>
            </VStack>
          ) : null}
          renderItem={({ item }) => (
            <Pressable onPress={() => (navigation as any).navigate('MeasurementEntry' as never, { editMeasurementId: item._id } as never)}>
              <Box bg={cardBg} p={4} borderRadius="lg" shadow={1} mb={3}>
                <HStack justifyContent="space-between" alignItems="center">
                  <VStack>
                    <Text fontWeight="bold">{new Date(item.date).toDateString()}</Text>
                    <HStack space={2} alignItems="center">
                      <Badge colorScheme="primary" variant="subtle">{item.weight != null ? `${item.weight} kg` : '— kg'}</Badge>
                      <Badge colorScheme="secondary" variant="subtle">{item.bodyFat != null ? `${item.bodyFat}%` : '— % bf'}</Badge>
                    </HStack>
                  </VStack>
                  <HStack space={2} alignItems="center">
                    <Button size="sm" variant="outline" onPress={() => (navigation as any).navigate('MeasurementEntry' as never, { editMeasurementId: item._id } as never)} leftIcon={<Icon as={Ionicons} name="create-outline" />}>Edit</Button>
                    <Button size="sm" variant="outline" colorScheme="red" onPress={() => {
                      try { realmDB.deleteMeasurement(String(item._id)); onRefresh(); } catch {}
                    }} leftIcon={<Icon as={Ionicons} name="trash" />}>Delete</Button>
                  </HStack>
                </HStack>
                {(item.measurements && (item.measurements.waist || item.measurements.chest || item.measurements.hips)) && (
                  <>
                    <Divider my={3} />
                    <HStack justifyContent="space-between">
                      <Text color="gray.700">Waist: {item.measurements.waist ?? '-'}</Text>
                      <Text color="gray.700">Chest: {item.measurements.chest ?? '-'}</Text>
                      <Text color="gray.700">Hips: {item.measurements.hips ?? '-'}</Text>
                    </HStack>
                  </>
                )}
                {item.photos && item.photos.length > 0 && (
                  <>
                    <Divider my={3} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <HStack space={2}>
                        {item.photos.map((p: any, i: number) => (
                          <Image key={`${item._id}-photo-${i}`} source={{ uri: p.uri }} alt="measurement-photo" width="80px" height="80px" borderRadius="md" />
                        ))}
                      </HStack>
                    </ScrollView>
                  </>
                )}
              </Box>
            </Pressable>
          )}
        />
      )}
    </Box>
  );
}
