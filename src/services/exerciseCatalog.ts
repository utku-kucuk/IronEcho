import AsyncStorage from '@react-native-async-storage/async-storage';

export type ExerciseTypeDef = { name: string; weightBased: boolean };
export type ExerciseProfile = {
  group?: string;       // muscle group
  type?: string;        // e.g., 'strength' | 'bodyweight' | 'cardio'
  restMin?: number;     // rest between sets in minutes
  weightBased?: boolean; // explicit weight-based toggle
};

export type ExerciseCatalog = {
  exercises: string[];
  muscleGroups: string[];
  types: ExerciseTypeDef[];
  // Legacy mapping kept for backwards compatibility
  exerciseGroups?: Record<string, string>;
  // New structured profiles per exercise
  exerciseProfiles?: Record<string, ExerciseProfile>;
};

const KEY = (userId: string) => `exercise_catalog_${userId}`;

const DEFAULT_CATALOG: ExerciseCatalog = {
  exercises: [
    'Bench Press','Squat','Deadlift','Overhead Press','Barbell Row',
    'Pull Up','Push Up','Dumbbell Curl','Tricep Dip','Leg Press',
    'Lunge','Lat Pulldown','Chest Fly','Leg Extension','Leg Curl',
    'Plank','Running','Cycling','Rowing'
  ],
  muscleGroups: ['chest','back','shoulders','arms','legs','core','cardio','other'],
  types: [
    { name: 'strength', weightBased: true },
    { name: 'bodyweight', weightBased: false },
    { name: 'cardio', weightBased: false }
  ],
  exerciseGroups: {},
  exerciseProfiles: {}
};

export async function getCatalog(userId: string): Promise<ExerciseCatalog> {
  try {
    const raw = await AsyncStorage.getItem(KEY(userId));
    if (!raw) return DEFAULT_CATALOG;
    const parsed = JSON.parse(raw) as ExerciseCatalog;
    
    // Start with current exerciseProfiles (these are the source of truth)
    const currentProfiles = { ...(parsed.exerciseProfiles || {}) };
    
    // Backfill from legacy exerciseGroups only if profile doesn't exist
    // This ensures new profiles are not overridden by legacy data
    if ((parsed as any).exerciseGroups) {
      Object.entries((parsed as any).exerciseGroups as Record<string, string>).forEach(([k, v]) => {
        // Only add legacy group if profile doesn't exist or doesn't have a group
        if (!currentProfiles[k] || !currentProfiles[k].group) {
          if (!currentProfiles[k]) {
            currentProfiles[k] = {};
          }
          currentProfiles[k].group = v;
        }
      });
    }
    
    console.log('getCatalog - Loaded profiles:', Object.keys(currentProfiles));
    
    return {
      exercises: parsed.exercises || DEFAULT_CATALOG.exercises,
      muscleGroups: parsed.muscleGroups || DEFAULT_CATALOG.muscleGroups,
      types: parsed.types || DEFAULT_CATALOG.types,
      exerciseGroups: parsed.exerciseGroups || {},
      exerciseProfiles: currentProfiles
    };
  } catch (error) {
    console.error('Error loading catalog:', error);
    return DEFAULT_CATALOG;
  }
}

async function saveCatalog(userId: string, next: ExerciseCatalog) {
  const serialized = JSON.stringify(next);
  await AsyncStorage.setItem(KEY(userId), serialized);
  console.log('💾 saveCatalog - Saved to AsyncStorage:', KEY(userId));
  console.log('💾 saveCatalog - exerciseProfiles keys:', Object.keys(next.exerciseProfiles || {}));
}

export async function addExerciseName(userId: string, name: string) {
  const cat = await getCatalog(userId);
  if (!cat.exercises.some(e => e.toLowerCase() === name.toLowerCase())) {
    cat.exercises = [name, ...cat.exercises];
    await saveCatalog(userId, cat);
  }
}

export async function removeExerciseName(userId: string, name: string) {
  const cat = await getCatalog(userId);
  cat.exercises = cat.exercises.filter(e => e.toLowerCase() !== name.toLowerCase());
  await saveCatalog(userId, cat);
}

export async function addMuscleGroup(userId: string, name: string) {
  const cat = await getCatalog(userId);
  if (!cat.muscleGroups.some(e => e.toLowerCase() === name.toLowerCase())) {
    cat.muscleGroups = [name, ...cat.muscleGroups];
    await saveCatalog(userId, cat);
  }
}

export async function addExerciseType(userId: string, typeDef: ExerciseTypeDef) {
  const cat = await getCatalog(userId);
  if (!cat.types.some(t => t.name.toLowerCase() === typeDef.name.toLowerCase())) {
    cat.types = [typeDef, ...cat.types];
    await saveCatalog(userId, cat);
  }
}

export async function setExerciseGroup(userId: string, exerciseName: string, group: string) {
  const cat = await getCatalog(userId);
  const profiles = { ...(cat.exerciseProfiles || {}) };
  const current: ExerciseProfile = { ...(profiles[exerciseName] || {}) };
  current.group = group;
  profiles[exerciseName] = current;
  await saveCatalog(userId, { ...cat, exerciseProfiles: profiles, exerciseGroups: { ...(cat.exerciseGroups || {}), [exerciseName]: group } });
}

export async function renameExercise(userId: string, oldName: string, newName: string) {
  if (!newName || !oldName || oldName.toLowerCase() === newName.toLowerCase()) return;
  const cat = await getCatalog(userId);
  const nextExercises = cat.exercises.filter(e => e.toLowerCase() !== oldName.toLowerCase());
  if (!nextExercises.some(e => e.toLowerCase() === newName.toLowerCase())) {
    nextExercises.unshift(newName);
  }
  const map = { ...(cat.exerciseGroups || {}) };
  if (map[oldName]) { map[newName] = map[oldName]; delete map[oldName]; }
  const profiles = { ...(cat.exerciseProfiles || {}) };
  if (profiles[oldName]) { profiles[newName] = profiles[oldName]; delete profiles[oldName]; }
  await saveCatalog(userId, { ...cat, exercises: nextExercises, exerciseGroups: map, exerciseProfiles: profiles });
}

export async function setExerciseProfile(userId: string, exerciseName: string, profile: Partial<ExerciseProfile>) {
  try {
    const cat = await getCatalog(userId);
    const profiles = { ...(cat.exerciseProfiles || {}) };
    
    // Create a clean profile object with only defined values
    // This replaces the entire profile, not merging with existing
    const newProfile: ExerciseProfile = {};
    
    if (profile.group !== undefined) {
      newProfile.group = profile.group;
    }
    if (profile.type !== undefined) {
      newProfile.type = profile.type;
    }
    if (profile.weightBased !== undefined) {
      newProfile.weightBased = profile.weightBased;
    }
    if (profile.restMin !== undefined) {
      newProfile.restMin = profile.restMin;
    }
    
    // Save the new profile (this replaces any existing profile for this exercise)
    profiles[exerciseName] = newProfile;
    
    console.log('Setting profile for:', exerciseName, 'New profile:', newProfile);
    
    // keep legacy group map in sync for old code paths
    const groups = { ...(cat.exerciseGroups || {}) };
    if (newProfile.group) { 
      groups[exerciseName] = newProfile.group; 
    } else {
      // Remove from legacy group map if group is not set
      delete groups[exerciseName];
    }
    
    const updatedCatalog = { ...cat, exerciseProfiles: profiles, exerciseGroups: groups };
    
    console.log('💾 About to save catalog with profiles:', Object.keys(profiles));
    console.log('💾 Profile to save for', exerciseName, ':', JSON.stringify(newProfile, null, 2));
    
    await saveCatalog(userId, updatedCatalog);
    
    // Small delay to ensure AsyncStorage write completes
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify the save was successful by checking if the profile exists in storage
    const verify = await getCatalog(userId);
    if (!verify.exerciseProfiles) {
      console.error('❌ Profile save verification failed: exerciseProfiles is missing');
      throw new Error('Failed to verify profile save - exerciseProfiles missing');
    }
    
    // Check if profile exists (even if empty object, it should exist after save)
    const savedProfile = verify.exerciseProfiles[exerciseName];
    if (savedProfile === undefined) {
      console.error('❌ Profile save verification failed for:', exerciseName);
      console.error('❌ Available profiles:', Object.keys(verify.exerciseProfiles || {}));
      throw new Error(`Failed to verify profile save - profile for ${exerciseName} not found`);
    }
    
    console.log('✅ Profile saved successfully for:', exerciseName);
    console.log('✅ Saved profile content:', JSON.stringify(savedProfile, null, 2));
    console.log('✅ Verification passed - profile exists in storage');
  } catch (error) {
    console.error('Error saving exercise profile:', error);
    throw error;
  }
}

