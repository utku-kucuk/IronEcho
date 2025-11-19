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
    // Backfill defaults if missing
    const profilesFromLegacy: Record<string, ExerciseProfile> = {};
    if ((parsed as any).exerciseGroups) {
      Object.entries((parsed as any).exerciseGroups as Record<string, string>).forEach(([k, v]) => {
        profilesFromLegacy[k] = { ...(profilesFromLegacy[k] || {}), group: v };
      });
    }
    const mergedProfiles = { ...(parsed.exerciseProfiles || {}), ...profilesFromLegacy };
    return {
      exercises: parsed.exercises || DEFAULT_CATALOG.exercises,
      muscleGroups: parsed.muscleGroups || DEFAULT_CATALOG.muscleGroups,
      types: parsed.types || DEFAULT_CATALOG.types,
      exerciseGroups: parsed.exerciseGroups || {},
      exerciseProfiles: mergedProfiles
    };
  } catch {
    return DEFAULT_CATALOG;
  }
}

async function saveCatalog(userId: string, next: ExerciseCatalog) {
  await AsyncStorage.setItem(KEY(userId), JSON.stringify(next));
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
  const cat = await getCatalog(userId);
  const profiles = { ...(cat.exerciseProfiles || {}) };
  profiles[exerciseName] = { ...(profiles[exerciseName] || {}), ...profile };
  // keep legacy group map in sync for old code paths
  const groups = { ...(cat.exerciseGroups || {}) };
  if (profile.group) { groups[exerciseName] = profile.group; }
  await saveCatalog(userId, { ...cat, exerciseProfiles: profiles, exerciseGroups: groups });
}

