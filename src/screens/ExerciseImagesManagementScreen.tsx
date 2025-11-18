import React, { useState, useEffect } from 'react';
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
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { ExerciseImageService } from '../services/exerciseImageService';
import { ExerciseImage } from '../types';
import { getCatalog } from '../services/exerciseCatalog';
import { useFocusEffect } from '@react-navigation/native';

export default function ExerciseImagesManagementScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [exerciseOptions, setExerciseOptions] = useState<string[]>([]);
  const [exerciseImages, setExerciseImages] = useState<ExerciseImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ExerciseImage | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  useEffect(() => {
    loadExercises();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (selectedExercise && user) {
        loadImages();
      }
    }, [selectedExercise, user])
  );

  const loadExercises = async () => {
    if (!user) return;
    try {
      const catalog = await getCatalog(user._id);
      setExerciseOptions(catalog.exercises);
    } catch (error) {
      console.error('Error loading exercises:', error);
    }
  };

  const loadImages = () => {
    if (!user || !selectedExercise) return;
    try {
      const images = ExerciseImageService.getExerciseImages(selectedExercise, user._id);
      setExerciseImages(images);
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
    <Box flex={1} bg="gray.50" safeArea>
      {/* Header */}
      <Box bg="white" px={4} py={3} borderBottomWidth={1} borderBottomColor="gray.200">
        <Text fontSize="lg" fontWeight="bold" color="gray.800">
          Exercise Images
        </Text>
        <Text fontSize="sm" color="gray.600">
          Manage images for your exercises
        </Text>
      </Box>

      {/* Exercise Selector */}
      <Box bg="white" p={4} mt={2}>
        <FormControl>
          <FormControl.Label>Select Exercise</FormControl.Label>
          <Select
            selectedValue={selectedExercise}
            placeholder="Choose an exercise"
            _selectedItem={{ bg: 'primary.100', endIcon: <CheckIcon size={4} color="primary.600" /> }}
            onValueChange={(value) => setSelectedExercise(value)}
          >
            {exerciseOptions.map((exercise) => (
              <Select.Item key={exercise} label={exercise} value={exercise} />
            ))}
          </Select>
        </FormControl>
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
        <ScrollView flex={1} px={2}>
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
                  bg="white"
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
        </ScrollView>
      )}

      {selectedExercise && exerciseImages.length === 0 && (
        <Box flex={1} justifyContent="center" alignItems="center">
          <VStack space={3} alignItems="center">
            <Icon as={Ionicons} name="images-outline" size="4xl" color="gray.400" />
            <Text color="gray.600">No images yet</Text>
            <Text fontSize="sm" color="gray.500" textAlign="center">
              Tap "Add Image" to get started
            </Text>
          </VStack>
        </Box>
      )}

      {!selectedExercise && (
        <Box flex={1} justifyContent="center" alignItems="center">
          <VStack space={3} alignItems="center">
            <Icon as={Ionicons} name="fitness-outline" size="4xl" color="gray.400" />
            <Text color="gray.600">Select an exercise to begin</Text>
          </VStack>
        </Box>
      )}

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

