import AsyncStorage from '@react-native-async-storage/async-storage';

export type ExerciseTypeDef = { name: string; weightBased: boolean };
export type ExerciseCatalog = {
  exercises: string[];
  muscleGroups: string[];
  types: ExerciseTypeDef[];
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
  ]
};

export async function getCatalog(userId: string): Promise<ExerciseCatalog> {
  try {
    const raw = await AsyncStorage.getItem(KEY(userId));
    if (!raw) return DEFAULT_CATALOG;
    const parsed = JSON.parse(raw) as ExerciseCatalog;
    // Backfill defaults if missing
    return {
      exercises: parsed.exercises || DEFAULT_CATALOG.exercises,
      muscleGroups: parsed.muscleGroups || DEFAULT_CATALOG.muscleGroups,
      types: parsed.types || DEFAULT_CATALOG.types
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


