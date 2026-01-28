import React, { useState } from 'react';
import { Box, VStack, HStack, Text, Input, Button, Icon, useToast, FormControl, Select, CheckIcon, Image, Pressable, FlatList, useColorModeValue } from 'native-base';
import { TextInput, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { realmDB } from '../database/realm';
import { StableTextInput } from '../components/StableTextInput';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';

export default function MeasurementEntryScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { user } = useAuth();
  const toast = useToast();

  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dateYear, setDateYear] = useState<string>(new Date().getFullYear().toString());
  const [dateMonth, setDateMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [dateDay, setDateDay] = useState<string>(String(new Date().getDate()).padStart(2, '0'));
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
  const [photos, setPhotos] = useState<Array<{ uri: string; date: Date; type: string }>>([]);
  const editId: string | undefined = route.params?.editMeasurementId;

  const recomputeDate = (y: string, m: string, d: string) => {
    setDate(`${y}-${m}-${d}`);
  };

  const pickPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
      if (!res.canceled && res.assets && res.assets[0]) {
        setPhotos(prev => [...prev, { uri: res.assets[0].uri, date: new Date(), type: 'progress' }]);
      }
    } catch {}
  };

  const save = () => {
    try {
      if (!user) throw new Error('Not authenticated');

      const payload: any = {
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
        photos,
        lastModified: new Date(),
        clientTimestamp: new Date()
      };

      if (editId) {
        realmDB.updateMeasurement(editId, payload);
      } else {
        realmDB.createMeasurement(payload);
      }

      toast.show({ title: 'Saved', description: 'Measurements saved locally' });
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        (navigation as any).navigate('Main');
      }
    } catch (e: any) {
      toast.show({ title: 'Error', description: e.message || 'Failed to save measurements' });
    }
  };

  React.useEffect(() => {
    if (!user || !editId) return;
    const existing = realmDB.getMeasurementById(editId);
    if (existing) {
      const d = new Date(existing.date);
      setDate(d.toISOString().slice(0,10));
      setDateYear(String(d.getFullYear()));
      setDateMonth(String(d.getMonth()+1).padStart(2,'0'));
      setDateDay(String(d.getDate()).padStart(2,'0'));
      setWeight(existing.weight != null ? String(existing.weight) : '');
      setBodyFat(existing.bodyFat != null ? String(existing.bodyFat) : '');
      setNeck(existing.measurements?.neck != null ? String(existing.measurements.neck) : '');
      setWaist(existing.measurements?.waist != null ? String(existing.measurements.waist) : '');
      setChest(existing.measurements?.chest != null ? String(existing.measurements.chest) : '');
      setHips(existing.measurements?.hips != null ? String(existing.measurements.hips) : '');
      setThighLeft(existing.measurements?.thighLeft != null ? String(existing.measurements.thighLeft) : '');
      setThighRight(existing.measurements?.thighRight != null ? String(existing.measurements.thighRight) : '');
      setArmLeftRelaxed(existing.measurements?.armLeftRelaxed != null ? String(existing.measurements.armLeftRelaxed) : '');
      setArmRightRelaxed(existing.measurements?.armRightRelaxed != null ? String(existing.measurements.armRightRelaxed) : '');
      setArmLeftContracted(existing.measurements?.armLeftContracted != null ? String(existing.measurements.armLeftContracted) : '');
      setArmRightContracted(existing.measurements?.armRightContracted != null ? String(existing.measurements.armRightContracted) : '');
      setPhotos(existing.photos || []);
    }
  }, [editId, user]);

  const handleDelete = () => {
    try {
      if (editId) {
        realmDB.deleteMeasurement(editId);
        if (navigation.canGoBack()) navigation.goBack(); else (navigation as any).navigate('Main');
      }
    } catch {}
  };

  const pageBg = useColorModeValue('gray.50','gray.900');
  const headerBg = useColorModeValue('white','gray.900');
  const cardBg = useColorModeValue('white','gray.800');
  const inputBg = useColorModeValue('white','gray.800');
  const inputPlaceholder = useColorModeValue('gray.500','gray.400');
  const borderColor = useColorModeValue('gray.200','gray.700');
  
  // TextInput styles
  const textInputStyle = {
    backgroundColor: useColorModeValue('#FFFFFF','#1F2937'),
    color: useColorModeValue('#1F2937','#F3F4F6'),
    borderWidth: 1,
    borderColor: useColorModeValue('#E5E7EB','#374151'),
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    minHeight: 40,
  };
  return (
    <Box flex={1} bg={pageBg} safeArea>
      <HStack alignItems="center" justifyContent="space-between" pl={6} pr={8} py={3} bg={headerBg} borderBottomWidth={1} borderBottomColor={useColorModeValue('gray.200','gray.700')}>
        {/* Left: Back */}
        <Button variant="ghost" onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            (navigation as any).navigate('Main');
          }
        }} leftIcon={<Icon as={Ionicons} name="chevron-back" />}>Back</Button>
        {/* Center: Title */}
        <Box flex={1} minW="0" mx={2} alignItems="center">
          <Text fontSize="lg" fontWeight="bold" numberOfLines={1} ellipsizeMode="tail">
            {editId ? 'Edit Measurement' : 'New Measurement'}
          </Text>
        </Box>
        {/* Right: Actions */}
        <HStack space={2} flexShrink={0} justifyContent="flex-end">
          {editId ? (
            <Button variant="outline" colorScheme="red" onPress={handleDelete} leftIcon={<Icon as={Ionicons} name="trash" />}>Delete</Button>
          ) : null}
          <Button colorScheme="primary" onPress={save} leftIcon={<Icon as={Ionicons} name="save" />}>Save</Button>
        </HStack>
      </HStack>

      <FlatList
        data={[0]}
        keyExtractor={() => 'measurement-form'}
        renderItem={null}
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        removeClippedSubviews={false}
        ListHeaderComponent={() => (
        <VStack space={4}>
          <VStack space={3} bg={cardBg} p={4} borderRadius="lg" shadow={1}>
          <FormControl>
            <FormControl.Label>Date</FormControl.Label>
            <HStack space={2}>
              <Select
                flex={1}
                selectedValue={dateYear}
                minWidth="100%"
                accessibilityLabel="Year"
                placeholder="Year"
                _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}
                onValueChange={value => { setDateYear(value); recomputeDate(value, dateMonth, dateDay); }}
              >
                {Array.from({ length: 6 }).map((_, i) => {
                  const y = (new Date().getFullYear() - i).toString();
                  return <Select.Item key={`year-${y}`} label={y} value={y} />;
                })}
              </Select>
              <Select
                flex={1}
                selectedValue={dateMonth}
                accessibilityLabel="Month"
                placeholder="Month"
                _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}
                onValueChange={value => { setDateMonth(value); recomputeDate(dateYear, value, dateDay); }}
              >
                {Array.from({ length: 12 }).map((_, i) => {
                  const m = String(i + 1).padStart(2, '0');
                  return <Select.Item key={`month-${m}`} label={m} value={m} />;
                })}
              </Select>
              <Select
                flex={1}
                selectedValue={dateDay}
                accessibilityLabel="Day"
                placeholder="Day"
                _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}
                onValueChange={value => { setDateDay(value); recomputeDate(dateYear, dateMonth, value); }}
              >
                {Array.from({ length: 31 }).map((_, i) => {
                  const d = String(i + 1).padStart(2, '0');
                  return <Select.Item key={`day-${d}`} label={d} value={d} />;
                })}
              </Select>
            </HStack>
          </FormControl>

          <Text fontWeight="semibold" mt={2}>Body Metrics</Text>
          <HStack space={2}>
            <FormControl flex={1}>
              <FormControl.Label>Weight (kg)</FormControl.Label>
              <Box borderWidth={1} borderRadius={6} borderColor={borderColor} bg={inputBg}>
                <StableTextInput
                  style={[textInputStyle, { borderWidth: 0 }]}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 80.5"
                  placeholderTextColor={inputPlaceholder}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                  }}
                  onFocus={() => {}}
                  onBlur={() => {}}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                  }}
                />
              </Box>
            </FormControl>
            <FormControl flex={1}>
              <FormControl.Label>Body Fat (%)</FormControl.Label>
              <Box borderWidth={1} borderRadius={6} borderColor={borderColor} bg={inputBg}>
                <StableTextInput
                  style={[textInputStyle, { borderWidth: 0 }]}
                  value={bodyFat}
                  onChangeText={setBodyFat}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 15.2"
                  placeholderTextColor={inputPlaceholder}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                  }}
                  onFocus={() => {}}
                  onBlur={() => {}}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                  }}
                />
              </Box>
            </FormControl>
          </HStack>

          <Text fontWeight="semibold" mt={2}>Circumferences (cm)</Text>
          <HStack space={2}>
            <FormControl flex={1}>
              <FormControl.Label>Neck</FormControl.Label>
              <Box borderWidth={1} borderRadius={6} borderColor={borderColor} bg={inputBg}>
                <StableTextInput
                  style={[textInputStyle, { borderWidth: 0 }]}
                  value={neck}
                  onChangeText={setNeck}
                  keyboardType="decimal-pad"
                  placeholderTextColor={inputPlaceholder}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                  }}
                  onFocus={() => {}}
                  onBlur={() => {}}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                  }}
                />
              </Box>
            </FormControl>
            <FormControl flex={1}>
              <FormControl.Label>Waist</FormControl.Label>
              <Box borderWidth={1} borderRadius={6} borderColor={borderColor} bg={inputBg}>
                <StableTextInput
                  style={[textInputStyle, { borderWidth: 0 }]}
                  value={waist}
                  onChangeText={setWaist}
                  keyboardType="decimal-pad"
                  placeholderTextColor={inputPlaceholder}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                  }}
                  onFocus={() => {}}
                  onBlur={() => {}}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                  }}
                />
              </Box>
            </FormControl>
          </HStack>
          <HStack space={2}>
            <FormControl flex={1}>
              <FormControl.Label>Chest</FormControl.Label>
              <Box borderWidth={1} borderRadius={6} borderColor={borderColor} bg={inputBg}>
                <StableTextInput
                  style={[textInputStyle, { borderWidth: 0 }]}
                  value={chest}
                  onChangeText={setChest}
                  keyboardType="decimal-pad"
                  placeholderTextColor={inputPlaceholder}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                  }}
                  onFocus={() => {}}
                  onBlur={() => {}}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                  }}
                />
              </Box>
            </FormControl>
            <FormControl flex={1}>
              <FormControl.Label>Hips</FormControl.Label>
              <Box borderWidth={1} borderRadius={6} borderColor={borderColor} bg={inputBg}>
                <StableTextInput
                  style={[textInputStyle, { borderWidth: 0 }]}
                  value={hips}
                  onChangeText={setHips}
                  keyboardType="decimal-pad"
                  placeholderTextColor={inputPlaceholder}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                  }}
                  onFocus={() => {}}
                  onBlur={() => {}}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                  }}
                />
              </Box>
            </FormControl>
          </HStack>
          <HStack space={2}>
            <FormControl flex={1}>
              <FormControl.Label>Thigh Left</FormControl.Label>
              <Box borderWidth={1} borderRadius={6} borderColor={borderColor} bg={inputBg}>
                <StableTextInput
                  style={[textInputStyle, { borderWidth: 0 }]}
                  value={thighLeft}
                  onChangeText={setThighLeft}
                  keyboardType="decimal-pad"
                  placeholderTextColor={inputPlaceholder}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                  }}
                  onFocus={() => {}}
                  onBlur={() => {}}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                  }}
                />
              </Box>
            </FormControl>
            <FormControl flex={1}>
              <FormControl.Label>Thigh Right</FormControl.Label>
              <Box borderWidth={1} borderRadius={6} borderColor={borderColor} bg={inputBg}>
                <StableTextInput
                  style={[textInputStyle, { borderWidth: 0 }]}
                  value={thighRight}
                  onChangeText={setThighRight}
                  keyboardType="decimal-pad"
                  placeholderTextColor={inputPlaceholder}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                  }}
                  onFocus={() => {}}
                  onBlur={() => {}}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                  }}
                />
              </Box>
            </FormControl>
          </HStack>
          <HStack space={2}>
            <FormControl flex={1}>
              <FormControl.Label>Arm Left (relaxed)</FormControl.Label>
              <Box borderWidth={1} borderRadius={6} borderColor={borderColor} bg={inputBg}>
                <StableTextInput
                  style={[textInputStyle, { borderWidth: 0 }]}
                  value={armLeftRelaxed}
                  onChangeText={setArmLeftRelaxed}
                  keyboardType="decimal-pad"
                  placeholderTextColor={inputPlaceholder}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                  }}
                  onFocus={() => {}}
                  onBlur={() => {}}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                  }}
                />
              </Box>
            </FormControl>
            <FormControl flex={1}>
              <FormControl.Label>Arm Right (relaxed)</FormControl.Label>
              <Box borderWidth={1} borderRadius={6} borderColor={borderColor} bg={inputBg}>
                <StableTextInput
                  style={[textInputStyle, { borderWidth: 0 }]}
                  value={armRightRelaxed}
                  onChangeText={setArmRightRelaxed}
                  keyboardType="decimal-pad"
                  placeholderTextColor={inputPlaceholder}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                  }}
                  onFocus={() => {}}
                  onBlur={() => {}}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                  }}
                />
              </Box>
            </FormControl>
          </HStack>
          <HStack space={2}>
            <FormControl flex={1}>
              <FormControl.Label>Arm Left (contracted)</FormControl.Label>
              <Box borderWidth={1} borderRadius={6} borderColor={borderColor} bg={inputBg}>
                <StableTextInput
                  style={[textInputStyle, { borderWidth: 0 }]}
                  value={armLeftContracted}
                  onChangeText={setArmLeftContracted}
                  keyboardType="decimal-pad"
                  placeholderTextColor={inputPlaceholder}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                  }}
                  onFocus={() => {}}
                  onBlur={() => {}}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                  }}
                />
              </Box>
            </FormControl>
            <FormControl flex={1}>
              <FormControl.Label>Arm Right (contracted)</FormControl.Label>
              <Box borderWidth={1} borderRadius={6} borderColor={borderColor} bg={inputBg}>
                <StableTextInput
                  style={[textInputStyle, { borderWidth: 0 }]}
                  value={armRightContracted}
                  onChangeText={setArmRightContracted}
                  keyboardType="decimal-pad"
                  placeholderTextColor={inputPlaceholder}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                  }}
                  onFocus={() => {}}
                  onBlur={() => {}}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                  }}
                />
              </Box>
            </FormControl>
          </HStack>
          </VStack>

          <VStack space={3} bg={cardBg} p={4} borderRadius="lg" shadow={1} mt={4}>
          <HStack justifyContent="space-between" alignItems="center">
            <Text fontWeight="semibold">Photos (optional)</Text>
            <Button variant="outline" size="sm" leftIcon={<Icon as={Ionicons} name="add" />} onPress={pickPhoto}>Add Photo</Button>
          </HStack>
          {photos.length > 0 && (
            <Box>
              <FlatList
                horizontal
                data={photos}
                keyExtractor={(p, i) => `${p.uri}-${i}`}
                renderItem={({ item, index }) => (
                  <Pressable key={`photo-${index}`}>
                    <Image source={{ uri: item.uri }} alt="photo" width="100px" height="100px" borderRadius="md" mr={2} />
                  </Pressable>
                )}
                showsHorizontalScrollIndicator={false}
              />
            </Box>
          )}
          </VStack>
        </VStack>
        )}
      />
    </Box>
  );
}


