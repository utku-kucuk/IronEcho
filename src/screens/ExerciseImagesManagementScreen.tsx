import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  useToast,
  Icon,
  Pressable,
  Modal,
  Image,
  ScrollView,
  FormControl,
  Select,
  CheckIcon,
  Input,
  useColorMode,
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, TextInput, Keyboard } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { ExerciseImageService } from '../services/exerciseImageService';
import { ExerciseImage } from '../types';
import { getCatalog, addExerciseName, removeExerciseName, setExerciseProfile, renameExercise, ExerciseProfile } from '../services/exerciseCatalog';
import { useFocusEffect } from '@react-navigation/native';
import { StableTextInput } from '../components/StableTextInput';

export default function ExerciseImagesManagementScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const toast = useToast();
  const { colorMode } = useColorMode();
  const pageBg = colorMode === 'dark' ? 'gray.900' : 'gray.50';
  const headerBg = colorMode === 'dark' ? 'gray.900' : 'white';
  const cardBg = colorMode === 'dark' ? 'gray.800' : 'white';
  const textPrimary = colorMode === 'dark' ? 'gray.100' : 'gray.800';
  const textSecondary = colorMode === 'dark' ? 'gray.300' : 'gray.600';
  const borderColor = colorMode === 'dark' ? 'gray.700' : 'gray.200';
  const inputBg = colorMode === 'dark' ? 'gray.800' : 'white';
  const inputText = colorMode === 'dark' ? 'gray.100' : 'gray.800';
  const inputPlaceholder = colorMode === 'dark' ? 'gray.400' : 'gray.500';
  
  // TextInput styles
  const textInputStyle = {
    backgroundColor: colorMode === 'dark' ? '#1F2937' : '#FFFFFF',
    color: colorMode === 'dark' ? '#F3F4F6' : '#1F2937',
    borderWidth: 1,
    borderColor: borderColor,
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    minHeight: 40,
  };
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [exerciseOptions, setExerciseOptions] = useState<string[]>([]);
  const [exerciseImages, setExerciseImages] = useState<ExerciseImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ExerciseImage | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [exerciseProfiles, setExerciseProfiles] = useState<Record<string, { group?: string; type?: string; restMin?: number; weightBased?: boolean }>>({});
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [restMin, setRestMin] = useState<string>('');
  const [weightBasedChoice, setWeightBasedChoice] = useState<'yes' | 'no'>('yes');
  const [newExerciseName, setNewExerciseName] = useState<string>('');
  const [renameTo, setRenameTo] = useState<string>('');

  useEffect(() => {
    loadExercises();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Reload exercises and profiles when screen comes into focus
      // This ensures we have the latest profile data
      loadExercises();
    }, [user])
  );

  // When a new exercise is selected or profiles change, hydrate fields immediately
  useEffect(() => {
    if (!selectedExercise) return;
    
    console.log('useEffect triggered - selectedExercise:', selectedExercise, 'exerciseProfiles keys:', Object.keys(exerciseProfiles || {}));
    
    // Try exact match first, then case-insensitive match
    let prof = (exerciseProfiles || {})[selectedExercise] || {};
    
    // If not found, try case-insensitive search
    if (!prof || Object.keys(prof).length === 0) {
      const lowerName = selectedExercise.toLowerCase();
      const matchingKey = Object.keys(exerciseProfiles || {}).find(
        key => key.toLowerCase() === lowerName
      );
      if (matchingKey) {
        console.log('Found profile with case-insensitive match:', matchingKey);
        prof = exerciseProfiles[matchingKey];
      } else {
        console.log('No profile found for:', selectedExercise);
      }
    } else {
      console.log('Found profile with exact match:', prof);
    }
    
    // Update form fields with profile values
    const newGroup = prof.group || 'other';
    const newType = prof.type || (types[0] || 'strength');
    const newRestMin = prof.restMin != null ? String(prof.restMin) : '';
    const newWeightBased = prof.weightBased != null ? (prof.weightBased ? 'yes' : 'no') : (prof.type === 'strength' ? 'yes' : 'no');
    
    console.log('Updating form fields:', { newGroup, newType, newRestMin, newWeightBased });
    
    setSelectedGroup(newGroup);
    setSelectedType(newType);
    setRestMin(newRestMin);
    setWeightBasedChoice(newWeightBased);
    
    // refresh images for this exercise
    if (user) {
      const images = ExerciseImageService.getExerciseImages(selectedExercise, user._id);
      setExerciseImages(images);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExercise, exerciseProfiles]);
  const loadExercises = async () => {
    if (!user) return;
    try {
      const catalog = await getCatalog(user._id);
      setExerciseOptions(catalog.exercises);
      setMuscleGroups(catalog.muscleGroups || []);
      setTypes((catalog.types || []).map(t => t.name));
      const profiles = catalog.exerciseProfiles || {};
      
      console.log('loadExercises - Loading profiles:', Object.keys(profiles));
      console.log('loadExercises - Selected exercise:', selectedExercise);
      
      // Update exerciseProfiles state - this will trigger useEffect to update form fields
      setExerciseProfiles(profiles);
      
      // Don't update form fields here - let useEffect handle it
      // This ensures consistent behavior and avoids race conditions
    } catch (error) {
      console.error('Error loading exercises:', error);
    }
  };

  const loadImages = () => {
    if (!user || !selectedExercise) return;
    try {
      const images = ExerciseImageService.getExerciseImages(selectedExercise, user._id);
      setExerciseImages(images);
      const prof = (exerciseProfiles || {})[selectedExercise] || {};
      setSelectedGroup(prof.group || 'other');
      setSelectedType(prof.type || selectedType || 'strength');
      setRestMin(prof.restMin != null ? String(prof.restMin) : '');
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  const handlePickImage = async () => {
    if (!selectedExercise || !user) {
      toast.show({
        title: 'Error',
        description: 'Please select an exercise first',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await ExerciseImageService.pickImage();
      if (result) {
        const saved = await ExerciseImageService.saveExerciseImage(
          selectedExercise,
          result.uri,
          user._id
        );
        if (saved) {
          toast.show({
            title: 'Success',
            description: 'Image added successfully',
          });
          loadImages();
        } else {
          toast.show({
            title: 'Error',
            description: 'Failed to save image',
          });
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      toast.show({
        title: 'Error',
        description: 'Failed to pick image',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      const success = await ExerciseImageService.deleteExerciseImage(imageId);
      if (success) {
        toast.show({
          title: 'Success',
          description: 'Image deleted successfully',
        });
        loadImages();
      } else {
        toast.show({
          title: 'Error',
          description: 'Failed to delete image',
        });
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.show({
        title: 'Error',
        description: 'Failed to delete image',
      });
    }
  };

  return (
    <Box flex={1} bg={pageBg} safeArea>
      {/* Header */}
      <HStack alignItems="center" justifyContent="flex-start" px={4} py={3} bg={headerBg} borderBottomWidth={1} borderBottomColor={borderColor}>
        <HStack alignItems="center" space={2} flexShrink={1}>
          <Button variant="ghost" onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              (navigation as any).navigate('Main');
            }
          }} leftIcon={<Icon as={Ionicons} name="chevron-back" />}>Back</Button>
          <Text fontSize="lg" fontWeight="bold" color={textPrimary}>
            Edit Exercises
          </Text>
        </HStack>
      </HStack>

      {/* Content (virtualized to avoid nested ScrollView warnings) */}
      <FlatList
        data={[0]}
        keyExtractor={() => 'edit-exercises'}
        renderItem={null}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
        removeClippedSubviews={false}
        ListHeaderComponent={useMemo(() => (
          <>
        {/* Manage Exercises */}
        <Box bg={cardBg} p={4} mt={2} borderBottomWidth={1} borderColor={borderColor}>
          <VStack space={3}>
          <Text fontWeight="bold" color={textPrimary}>Manage Exercises</Text>
          <HStack space={2} alignItems="center">
            <Box flex={1} borderWidth={1} borderRadius={6} borderColor={borderColor} bg={inputBg}>
              <TextInput
                style={[textInputStyle, { borderWidth: 0, flex: 1 }]}
                placeholder="New exercise name"
                placeholderTextColor={inputPlaceholder}
                value={newExerciseName}
                onChangeText={setNewExerciseName}
                editable={true}
                selectTextOnFocus={false}
                autoFocus={false}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={() => Keyboard.dismiss()}
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
            </Box>
            <Button
              leftIcon={<Icon as={Ionicons} name="add-circle-outline" />}
              onPress={async () => {
                if (!user || !newExerciseName.trim()) return;
                await addExerciseName(user._id, newExerciseName.trim());
                setNewExerciseName('');
                await loadExercises();
                toast.show({ title: 'Added', description: 'Exercise added' });
              }}
              isDisabled={!newExerciseName.trim()}
            >
              Add
            </Button>
          </HStack>
          <FormControl>
            <FormControl.Label>Select Exercise</FormControl.Label>
            <HStack space={2} alignItems="center">
              <Select
                flex={1}
                selectedValue={selectedExercise}
                placeholder="Choose an exercise"
                _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}
                onValueChange={(value) => setSelectedExercise(value)}
                borderColor={borderColor}
              >
                {exerciseOptions.map((exercise) => (
                  <Select.Item key={exercise} label={exercise} value={exercise} />
                ))}
              </Select>
              {selectedExercise ? (
                <Button
                  variant="outline"
                  colorScheme="red"
                  leftIcon={<Icon as={Ionicons} name="trash" />}
                  onPress={async () => {
                    if (!user) return;
                    await removeExerciseName(user._id, selectedExercise);
                    await ExerciseImageService.deleteExerciseImages(selectedExercise, user._id);
                    setSelectedExercise('');
                    await loadExercises();
                    toast.show({ title: 'Deleted', description: 'Exercise removed' });
                  }}
                >
                  Remove
                </Button>
              ) : null}
            </HStack>
          </FormControl>
          {selectedExercise ? (
            <VStack space={3}>
              <FormControl>
                <FormControl.Label>Muscle Group</FormControl.Label>
                <Select
                  selectedValue={selectedGroup}
                  placeholder="Select group"
                  _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}
                  onValueChange={(val) => setSelectedGroup(val)}
                  borderColor={borderColor}
                >
                  {muscleGroups.map((g) => (
                    <Select.Item key={g} value={g} label={g} />
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormControl.Label>Type</FormControl.Label>
                <Select
                  selectedValue={selectedType}
                  placeholder="Select type"
                  _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}
                  onValueChange={(val) => setSelectedType(val)}
                  borderColor={borderColor}
                >
                  {types.map(t => (
                    <Select.Item key={t} value={t} label={t} />
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormControl.Label>Weight-based</FormControl.Label>
                <Select
                  selectedValue={weightBasedChoice}
                  onValueChange={(val) => setWeightBasedChoice(val as any)}
                  borderColor={borderColor}
                  _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}
                >
                  <Select.Item label="Yes" value="yes" />
                  <Select.Item label="No" value="no" />
                </Select>
              </FormControl>
              <FormControl>
                <FormControl.Label>Set rest (min)</FormControl.Label>
                <Select
                  selectedValue={restMin || '0'}
                  onValueChange={(val) => setRestMin(val)}
                  _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}
                  placeholder="Select rest"
                >
                  {Array.from({ length: 21 }, (_, i) => {
                    const value = i * 0.5;
                    const label = value % 1 === 0 ? String(value) : `${Math.floor(value)}.30`;
                    return (
                      <Select.Item key={`rest-${value}`} label={label} value={String(value)} />
                    );
                  })}
                </Select>
              </FormControl>
              <Button
                onPress={async () => {
                  if (!user || !selectedExercise) return;
                  
                  try {
                    // Use the exact exercise name from catalog to ensure consistency
                    // Find the exact match in catalog (case-insensitive)
                    const catalog = await getCatalog(user._id);
                    const exactExerciseName = catalog.exercises.find(
                      ex => ex.toLowerCase() === selectedExercise.toLowerCase()
                    ) || selectedExercise;
                    
                    // Build the complete profile object with all current form values
                    // Only include values that are explicitly set (not 'other' for group)
                    const profileToSave: Partial<ExerciseProfile> = {};
                    
                    // Group: only save if not 'other'
                    if (selectedGroup && selectedGroup !== 'other') {
                      profileToSave.group = selectedGroup;
                    }
                    
                    // Type: always save if selected
                    if (selectedType) {
                      profileToSave.type = selectedType;
                    }
                    
                    // WeightBased: always save
                    profileToSave.weightBased = weightBasedChoice === 'yes';
                    
                    // RestMin: parse if not empty
                    if (restMin && restMin.trim() !== '') {
                      const parsed = parseFloat(restMin);
                      if (!isNaN(parsed) && parsed > 0) {
                        profileToSave.restMin = parsed;
                      }
                    }
                    
                    console.log('Saving profile for:', exactExerciseName, 'Profile object:', profileToSave);
                    console.log('Form values:', { selectedGroup, selectedType, weightBasedChoice, restMin });
                    
                    // Save the profile
                    await setExerciseProfile(user._id, exactExerciseName, profileToSave);
                    
                    // Small delay to ensure AsyncStorage write completes
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // Reload exercises FIRST to get fresh data from AsyncStorage
                    await loadExercises();
                    
                    // Verify the save by reading back from storage
                    const verifyCatalog = await getCatalog(user._id);
                    const savedProfile = (verifyCatalog.exerciseProfiles || {})[exactExerciseName] || {};
                    
                    console.log('✅ Verified saved profile:', exactExerciseName, savedProfile);
                    console.log('✅ Profile keys in storage:', Object.keys(verifyCatalog.exerciseProfiles || {}));
                    
                    // Update selectedExercise to exact name if different (this will trigger useEffect)
                    if (exactExerciseName !== selectedExercise) {
                      console.log('Updating selectedExercise from', selectedExercise, 'to', exactExerciseName);
                      setSelectedExercise(exactExerciseName);
                    }
                    
                    // Force update exerciseProfiles state with the verified saved profile
                    // This ensures the state matches what's in AsyncStorage
                    setExerciseProfiles((prev) => {
                      const updated = {
                        ...prev,
                        [exactExerciseName]: savedProfile
                      };
                      console.log('✅ Updated exerciseProfiles state with verified profile');
                      console.log('✅ State now has:', Object.keys(updated));
                      return updated;
                    });
                    
                    // Also update exercise options in case new exercise was added
                    setExerciseOptions(verifyCatalog.exercises);
                    
                    toast.show({ title: 'Saved', description: 'Defaults updated' });
                  } catch (error) {
                    console.error('Failed to save profile:', error);
                    toast.show({ title: 'Error', description: 'Failed to save profile', colorScheme: 'red' });
                  }
                }}
              >
                Save
              </Button>
            </VStack>
          ) : null}
          {selectedExercise ? (
            <FormControl>
              <FormControl.Label>Rename Exercise</FormControl.Label>
              <HStack space={2} alignItems="center">
                <Box flex={1} borderWidth={1} borderRadius={6} borderColor={borderColor} bg={inputBg}>
                  <TextInput
                    style={[textInputStyle, { borderWidth: 0, flex: 1 }]}
                    placeholder="New name"
                    placeholderTextColor={inputPlaceholder}
                    value={renameTo}
                    onChangeText={setRenameTo}
                    editable={true}
                    selectTextOnFocus={false}
                    autoFocus={false}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={() => Keyboard.dismiss()}
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
                </Box>
                <Button
                  variant="outline"
                  onPress={async () => {
                    const newName = renameTo.trim();
                    if (!user || !selectedExercise || !newName) return;
                    await renameExercise(user._id, selectedExercise, newName);
                    await ExerciseImageService.renameExercise(selectedExercise, newName, user._id);
                    setSelectedExercise(newName);
                    setRenameTo('');
                    await loadExercises();
                    await loadImages();
                    toast.show({ title: 'Renamed', description: 'Exercise renamed' });
                  }}
                  isDisabled={!renameTo.trim()}
                  leftIcon={<Icon as={Ionicons} name="create-outline" />}
                >
                  Rename
                </Button>
              </HStack>
            </FormControl>
          ) : null}
          </VStack>
        </Box>

        {/* Add Image Button */}
        {selectedExercise && (
          <Box px={4} py={4}>
            <Button
              colorScheme="primary"
              onPress={handlePickImage}
              isLoading={isLoading}
              leftIcon={<Icon as={Ionicons} name="add-circle-outline" />}
            >
              Add Image
            </Button>
          </Box>
        )}

        {/* Images Grid */}
        {selectedExercise && exerciseImages.length > 0 && (
          <Box px={2} pb={6}>
            <HStack flexWrap="wrap" justifyContent="flex-start">
              {exerciseImages.map((item) => (
                <Pressable
                  key={item._id}
                  onPress={() => {
                    setSelectedImage(item);
                    setIsImageModalOpen(true);
                  }}
                  onLongPress={() => handleDeleteImage(item._id)}
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
                      source={{ uri: item.uri }}
                      alt={item.exerciseName}
                      width="150px"
                      height="150px"
                      resizeMode="cover"
                    />
                  </Box>
                </Pressable>
              ))}
            </HStack>
          </Box>
        )}

        {selectedExercise && exerciseImages.length === 0 && (
          <Box flex={1} justifyContent="center" alignItems="center" py={10}>
            <VStack space={3} alignItems="center">
              <Icon as={Ionicons} name="images-outline" size="4xl" color={textSecondary} />
              <Text color={textSecondary}>No images yet</Text>
              <Text fontSize="sm" color={textSecondary} textAlign="center">
                Tap "Add Image" to get started
              </Text>
            </VStack>
          </Box>
        )}

        {!selectedExercise && (
          <Box flex={1} justifyContent="center" alignItems="center" py={10}>
            <VStack space={3} alignItems="center">
              <Icon as={Ionicons} name="fitness-outline" size="4xl" color={textSecondary} />
              <Text color={textSecondary}>Select an exercise to begin</Text>
            </VStack>
          </Box>
        )}
          </>
        ), [newExerciseName, renameTo, selectedExercise, selectedGroup, selectedType, weightBasedChoice, restMin, exerciseOptions, muscleGroups, types, exerciseImages, cardBg, textPrimary, textSecondary, borderColor, inputBg, inputPlaceholder, textInputStyle, user])}
      />

      {/* Full Screen Image Modal */}
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
              <Button
                mt={4}
                colorScheme="red"
                variant="outline"
                onPress={() => {
                  handleDeleteImage(selectedImage._id);
                  setIsImageModalOpen(false);
                }}
                leftIcon={<Icon as={Ionicons} name="trash" />}
              >
                Delete Image
              </Button>
            </Modal.Body>
          )}
        </Modal.Content>
      </Modal>
    </Box>
  );
}

