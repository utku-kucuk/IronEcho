import * as ImagePicker from 'expo-image-picker';
import { realmDB } from '../database/realm';
import { ExerciseImage } from '../types';

export interface ImagePickResult {
  uri: string;
  width?: number;
  height?: number;
}

export class ExerciseImageService {
  /**
   * Request camera/photo library permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      if (ImagePicker.requestMediaLibraryPermissionsAsync) {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  }

  /**
   * Pick an image from the photo library
   */
  static async pickImage(): Promise<ImagePickResult | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      };
    } catch (error) {
      console.error('Error picking image:', error);
      return null;
    }
  }

  /**
   * Save an image to persistent storage and create database record
   */
  static async saveExerciseImage(
    exerciseName: string,
    imageUri: string,
    userId: string
  ): Promise<ExerciseImage | null> {
    try {
      // For now, just save the URI as-is
      // In production, you'd want to copy to document directory
      const image = realmDB.createExerciseImage({
        exerciseName,
        uri: imageUri,
        thumbnailUri: imageUri,
        userId,
      });

      return image;
    } catch (error) {
      console.error('Error saving exercise image:', error);
      return null;
    }
  }

  /**
   * Get all images for a specific exercise
   */
  static getExerciseImages(exerciseName: string, userId: string): ExerciseImage[] {
    try {
      return realmDB.getExerciseImages(exerciseName, userId);
    } catch (error) {
      console.error('Error getting exercise images:', error);
      return [];
    }
  }

  /**
   * Get all exercise images for a user
   */
  static getAllExerciseImages(userId: string): ExerciseImage[] {
    try {
      return realmDB.getAllExerciseImages(userId);
    } catch (error) {
      console.error('Error getting all exercise images:', error);
      return [];
    }
  }

  /**
   * Delete an exercise image
   */
  static async deleteExerciseImage(imageId: string): Promise<boolean> {
    try {
      return realmDB.deleteExerciseImage(imageId);
    } catch (error) {
      console.error('Error deleting exercise image:', error);
      return false;
    }
  }

  /**
   * Delete all images for a specific exercise
   */
  static async deleteExerciseImages(exerciseName: string, userId: string): Promise<number> {
    try {
      return realmDB.deleteExerciseImages(exerciseName, userId);
    } catch (error) {
      console.error('Error deleting exercise images:', error);
      return 0;
    }
  }
}

