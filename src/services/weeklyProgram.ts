import AsyncStorage from '@react-native-async-storage/async-storage';

export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type ProgramExerciseTemplate = {
  name: string;
  muscleGroup: 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'cardio' | 'other';
  type: 'strength' | 'bodyweight' | 'cardio';
  weightBased: boolean;
  setsCount: number;
  repsCount: number;
};

export type WeeklyProgramDay = {
  off: boolean;
  exercises: ProgramExerciseTemplate[];
};

export type WeeklyProgram = Record<Weekday, WeeklyProgramDay>;

const STORAGE_KEY = (userId: string) => `weekly_program_${userId}`;

export async function getWeeklyProgram(userId: string): Promise<WeeklyProgram | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY(userId));
    return raw ? (JSON.parse(raw) as WeeklyProgram) : null;
  } catch (e) {
    console.error('Failed to load weekly program', e);
    return null;
  }
}

export async function saveWeeklyProgram(userId: string, program: WeeklyProgram): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY(userId), JSON.stringify(program));
  } catch (e) {
    console.error('Failed to save weekly program', e);
  }
}

export function getTodayKey(date = new Date()): Weekday {
  const day = date.getDay(); // 0 Sun - 6 Sat
  return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][day] as Weekday;
}

export async function getTodaysProgram(userId: string, date = new Date()): Promise<ProgramExerciseTemplate[] | null> {
  const program = await getWeeklyProgram(userId);
  if (!program) return null;
  const key = getTodayKey(date);
  if (program[key]?.off) return [];
  return program[key]?.exercises || [];
}

// One-off per-date override for a day's plan
const OVERRIDE_KEY = (userId: string, dateISO: string) => `daily_override_${userId}_${dateISO}`;

export async function saveDailyOverride(userId: string, dateISO: string, exercises: ProgramExerciseTemplate[]): Promise<void> {
  try {
    await AsyncStorage.setItem(OVERRIDE_KEY(userId, dateISO), JSON.stringify(exercises));
  } catch (e) {
    console.error('Failed to save daily override', e);
  }
}

export async function getDailyOverride(userId: string, dateISO: string): Promise<ProgramExerciseTemplate[] | null> {
  try {
    const raw = await AsyncStorage.getItem(OVERRIDE_KEY(userId, dateISO));
    return raw ? (JSON.parse(raw) as ProgramExerciseTemplate[]) : null;
  } catch (e) {
    console.error('Failed to get daily override', e);
    return null;
  }
}

// Optional: a minimal default to help first-run UX
export const DEFAULT_WEEKLY_PROGRAM: WeeklyProgram = {
  monday: { off: false, exercises: [
    { name: 'Bench Press', muscleGroup: 'chest', type: 'strength', weightBased: true, setsCount: 3, repsCount: 8 },
    { name: 'Incline Dumbbell Press', muscleGroup: 'chest', type: 'strength', weightBased: true, setsCount: 2, repsCount: 10 },
  ]},
  tuesday: { off: false, exercises: [
    { name: 'Squat', muscleGroup: 'legs', type: 'strength', weightBased: true, setsCount: 3, repsCount: 6 },
  ]},
  wednesday: { off: false, exercises: [
    { name: 'Pull Up', muscleGroup: 'back', type: 'bodyweight', weightBased: false, setsCount: 3, repsCount: 8 },
  ]},
  thursday: { off: true, exercises: []},
  friday: { off: false, exercises: [
    { name: 'Deadlift', muscleGroup: 'back', type: 'strength', weightBased: true, setsCount: 2, repsCount: 5 },
  ]},
  saturday: { off: true, exercises: []},
  sunday: { off: true, exercises: []}
};


