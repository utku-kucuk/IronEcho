import React, { useEffect, useState } from 'react';
import { Box, VStack, HStack, Text, Button, Icon, FormControl, Input, Select, CheckIcon, Divider, Image, ScrollView, Pressable, Modal, IconButton, useToast, AlertDialog, useColorModeValue } from 'native-base';
import { FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_WEEKLY_PROGRAM, Weekday, getWeeklyProgram, saveWeeklyProgram, ProgramExerciseTemplate } from '../services/weeklyProgram';
import { getCatalog, addExerciseName, removeExerciseName } from '../services/exerciseCatalog';
import { ExerciseImageService } from '../services/exerciseImageService';
import { ExerciseImage } from '../types';

const WEEKDAYS: Weekday[] = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

export default function WeeklyProgramScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const toast = useToast();

  const [selectedDay, setSelectedDay] = useState<Weekday>('monday');
  const [program, setProgram] = useState<any>(DEFAULT_WEEKLY_PROGRAM);
  const [exerciseOptions, setExerciseOptions] = useState<string[]>([]);
  const [exerciseImagesByExercise, setExerciseImagesByExercise] = useState<Record<string, ExerciseImage[]>>({});
  const [selectedImageModal, setSelectedImageModal] = useState<{ exerciseName: string; images: ExerciseImage[] } | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [targetExerciseIndex, setTargetExerciseIndex] = useState<number | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const cancelRef = React.useRef(null);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const existing = await getWeeklyProgram(user._id);
      if (existing) setProgram(existing);
      const catalog = await getCatalog(user._id);
      setExerciseOptions(catalog.exercises);
      loadExerciseImages();
    })();
  }, [user]);

  useEffect(() => {
    loadExerciseImages();
  }, [program, selectedDay]);

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
    setExerciseImagesByExercise(imagesByExercise);
  };

  const handleAddCustomExercise = async () => {
    const name = newExerciseName.trim();
    if (!name || targetExerciseIndex == null || !user) return;
    if (!exerciseOptions.some(e => e.toLowerCase() === name.toLowerCase())) {
      await addExerciseName(user._id, name);
      const catalog = await getCatalog(user._id);
      setExerciseOptions(catalog.exercises);
    }
    updateExercise(targetExerciseIndex, 'name', name);
    setIsAddExerciseOpen(false);
    setNewExerciseName('');
    setTargetExerciseIndex(null);
  };

  const handlePickImage = async (exerciseName: string, exerciseIndex: number) => {
    if (!user || !exerciseName) return;
    try {
      const result = await ExerciseImageService.pickImage();
      if (result) {
        await ExerciseImageService.saveExerciseImage(exerciseName, result.uri, user._id);
        loadExerciseImages();
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleViewImages = (exerciseName: string) => {
    const images = exerciseImagesByExercise[exerciseName] || [];
    if (images.length > 0) {
      setSelectedImageModal({ exerciseName, images });
      setIsImageModalOpen(true);
    }
  };

  const handleDeleteExercise = async (exerciseName: string) => {
    if (!user || !exerciseName) return;
    try {
      await removeExerciseName(user._id, exerciseName);
      const catalog = await getCatalog(user._id);
      setExerciseOptions(catalog.exercises);
      toast.show({
        title: 'Başarılı',
        description: `${exerciseName} katalogdan silindi`,
      });
    } catch (error) {
      toast.show({
        title: 'Hata',
        description: 'Egzersiz silinirken bir hata oluştu',
      });
    }
  };

  const save = async () => {
    if (!user) return;
    await saveWeeklyProgram(user._id, program as any);
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('Main');
    }
  };

  const pageBg = useColorModeValue('gray.50','gray.900');
  const headerBg = useColorModeValue('white','gray.900');
  const cardBg = useColorModeValue('white','gray.800');
  return (
    <Box flex={1} bg={pageBg} safeArea>
      <HStack alignItems="center" justifyContent="space-between" px={4} py={3} bg={headerBg} borderBottomWidth={1} borderBottomColor={useColorModeValue('gray.200','gray.700')}>
        <HStack alignItems="center" space={2}>
          <Button variant="ghost" onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              (navigation as any).navigate('Main');
            }
          }} leftIcon={<Icon as={Ionicons} name="chevron-back" />}>Back</Button>
          <Text fontSize="lg" fontWeight="bold">Weekly Program</Text>
        </HStack>
        <Button colorScheme="primary" onPress={save} leftIcon={<Icon as={Ionicons} name="save" />}>Save</Button>
      </HStack>

      <FlatList
        style={{ flex: 1 }}
        data={dayPlan.off ? [] : (dayPlan.exercises || [])}
        keyExtractor={(_, idx) => `${selectedDay}-exercise-${idx}`}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={() => (
          <VStack space={4}>
            <FormControl>
              <FormControl.Label>Day</FormControl.Label>
              <Select selectedValue={selectedDay} onValueChange={(v) => setSelectedDay(v as Weekday)} _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}>
                {WEEKDAYS.map(d => (
                  <Select.Item key={d} label={d.charAt(0).toUpperCase() + d.slice(1)} value={d} />
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormControl.Label>Off Day</FormControl.Label>
              <Select selectedValue={dayPlan.off ? 'yes' : 'no'} onValueChange={(v) => toggleOff(v === 'yes')} _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}>
                <Select.Item label="Yes" value="yes" />
                <Select.Item label="No" value="no" />
              </Select>
            </FormControl>
          </VStack>
        )}
        renderItem={({ item: ex, index: idx }) => (
          <VStack key={idx} space={3} bg={cardBg} p={4} borderRadius="lg" shadow={1} mt={4}>
            <HStack justifyContent="space-between" alignItems="center">
              <Text fontWeight="semibold">Exercise {idx + 1}</Text>
              <Button variant="outline" size="sm" colorScheme="red" onPress={() => removeExercise(idx)} leftIcon={<Icon as={Ionicons} name="trash" />}>Remove</Button>
            </HStack>
            <FormControl>
              <FormControl.Label>Name</FormControl.Label>
              <HStack space={2} alignItems="flex-end">
                <Select
                  flex={1}
                  selectedValue={ex.name}
                  placeholder="Select exercise"
                  _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}
                  onValueChange={value => updateExercise(idx, 'name', value)}
                >
                  {exerciseOptions.map((opt) => (
                    <Select.Item key={`${opt}-${idx}`} label={opt} value={opt} />
                  ))}
                </Select>
                <IconButton
                  variant="outline"
                  onPress={() => { setTargetExerciseIndex(idx); setIsAddExerciseOpen(true); }}
                  icon={<Icon as={Ionicons} name="add-circle-outline" />}
                  accessibilityLabel="Add custom exercise"
                />
              </HStack>
              {ex.name && (
                <Button
                  mt={2}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  onPress={() => {
                    setExerciseToDelete(ex.name);
                    setIsDeleteDialogOpen(true);
                  }}
                  leftIcon={<Icon as={Ionicons} name="trash-outline" />}
                >
                  Katalogdan Sil
                </Button>
              )}
            </FormControl>
            {ex.name && (
              <VStack space={2}>
                <HStack space={2} alignItems="center">
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => handlePickImage(ex.name, idx)}
                    leftIcon={<Icon as={Ionicons} name="add-circle-outline" />}
                  >
                    Add Image
                  </Button>
                </HStack>
                {exerciseImagesByExercise[ex.name] && exerciseImagesByExercise[ex.name].length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    <HStack space={2}>
                      {exerciseImagesByExercise[ex.name].map((img) => (
                        <Pressable
                          key={img._id}
                          onPress={() => handleViewImages(ex.name)}
                        >
                          <Image
                            source={{ uri: img.uri }}
                            alt={ex.name}
                            width="80px"
                            height="80px"
                            borderRadius="md"
                            resizeMode="cover"
                          />
                        </Pressable>
                      ))}
                    </HStack>
                  </ScrollView>
                )}
              </VStack>
            )}
            <HStack space={2}>
              <FormControl flex={1}>
                <FormControl.Label>Muscle Group</FormControl.Label>
                <Select selectedValue={ex.muscleGroup} onValueChange={v => updateExercise(idx, 'muscleGroup', v)} _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}>
                  {['chest','back','shoulders','arms','legs','core','cardio','other'].map(g => (
                    <Select.Item key={`${g}-${idx}`} label={g} value={g} />
                  ))}
                </Select>
              </FormControl>
              <FormControl flex={1}>
                <FormControl.Label>Type</FormControl.Label>
                <Select selectedValue={ex.type} onValueChange={v => updateExercise(idx, 'type', v)} _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}>
                  {['strength','bodyweight','cardio'].map(t => (
                    <Select.Item key={`${t}-${idx}`} label={t} value={t} />
                  ))}
                </Select>
              </FormControl>
            </HStack>
            <FormControl>
              <FormControl.Label>Weight-based</FormControl.Label>
              <Select selectedValue={ex.weightBased ? 'yes' : 'no'} onValueChange={v => updateExercise(idx, 'weightBased', v === 'yes')} _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}>
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
        )}
        ListFooterComponent={() => (!dayPlan.off ? (
          <Button mt={4} variant="outline" onPress={addExercise} leftIcon={<Icon as={Ionicons} name="add-circle-outline" />}>Add Exercise</Button>
        ) : null)}
      />

      {/* Add Custom Exercise Modal */}
      <Modal isOpen={isAddExerciseOpen} onClose={() => setIsAddExerciseOpen(false)}>
        <Modal.Content>
          <Modal.CloseButton />
          <Modal.Header>Add Custom Exercise</Modal.Header>
          <Modal.Body>
            <FormControl>
              <FormControl.Label>Exercise Name</FormControl.Label>
              <Input value={newExerciseName} onChangeText={setNewExerciseName} placeholder="e.g., Bulgarian Split Squat" />
            </FormControl>
          </Modal.Body>
          <Modal.Footer>
            <Button onPress={handleAddCustomExercise} isDisabled={!newExerciseName.trim()}>Add</Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>

      {/* Image Gallery Modal */}
      <Modal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        size="full"
      >
        <Modal.Content>
          <Modal.CloseButton />
          {selectedImageModal && (
            <Modal.Header>{selectedImageModal.exerciseName} - Images</Modal.Header>
          )}
          {selectedImageModal && (
            <Modal.Body>
              <ScrollView>
                <HStack flexWrap="wrap" justifyContent="flex-start">
                  {selectedImageModal.images.map((img) => (
                    <Pressable
                      key={img._id}
                      onPress={() => {
                        // Full screen view could be added here
                      }}
                    >
                      <Box
                        bg={cardBg}
                        borderRadius="lg"
                        overflow="hidden"
                        shadow={1}
                        m={2}
                        width="150px"
                      >
                        <Image
                          source={{ uri: img.uri }}
                          alt={selectedImageModal.exerciseName}
                          width="150px"
                          height="150px"
                          resizeMode="cover"
                        />
                      </Box>
                    </Pressable>
                  ))}
                </HStack>
              </ScrollView>
            </Modal.Body>
          )}
        </Modal.Content>
      </Modal>

      {/* Delete Exercise Confirmation Dialog */}
      <AlertDialog
        leastDestructiveRef={cancelRef}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
      >
        <AlertDialog.Content>
          <AlertDialog.CloseButton />
          <AlertDialog.Header>Egzersizi Sil</AlertDialog.Header>
          <AlertDialog.Body>
            {exerciseToDelete && (
              <>
                <Text>{exerciseToDelete} egzersizini katalogdan silmek istediğinizden emin misiniz?</Text>
                <Text mt={2} fontSize="xs" color="gray.500">
                  Bu egzersiz mevcut programlardan kaldırılmayacak, sadece dropdown listesinden silinecek.
                </Text>
              </>
            )}
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button
              variant="ghost"
              ref={cancelRef}
              onPress={() => {
                setIsDeleteDialogOpen(false);
                setExerciseToDelete(null);
              }}
            >
              İptal
            </Button>
            <Button
              colorScheme="red"
              onPress={async () => {
                if (exerciseToDelete) {
                  await handleDeleteExercise(exerciseToDelete);
                  setIsDeleteDialogOpen(false);
                  setExerciseToDelete(null);
                }
              }}
              ml={3}
            >
              Sil
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </Box>
  );
}


