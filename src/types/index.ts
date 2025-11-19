// User and Authentication Types
export interface User {
  _id: string;
  email: string;
  profile: {
    gender: 'male' | 'female';
    units: 'metric' | 'imperial';
    language: 'en' | 'tr';
  };
  lastSync: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  profile: {
    gender: 'male' | 'female';
    units: 'metric' | 'imperial';
    language: 'en' | 'tr';
  };
}

// Workout Types
export interface WorkoutSet {
  reps: number;
  weight?: number;
  notes?: string;
}

export interface WorkoutExercise {
  name: string;
  muscleGroup: 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'cardio' | 'other';
  equipment?: string;
  type: 'strength' | 'bodyweight' | 'cardio';
  weightBased: boolean;
  sets: WorkoutSet[];
}

export interface WorkoutWarmup {
  type?: string;
  duration?: number; // in minutes
  speed?: number; // km/h or mph
}

export interface Workout {
  _id?: string;
  userId: string;
  date: Date;
  warmup?: WorkoutWarmup;
  exercises: WorkoutExercise[];
  notes?: string;
  totalVolume: number;
  isPR: boolean;
  lastModified: Date;
  clientTimestamp: Date;
  createdAt?: string;
  updatedAt?: string;
}

// Measurement Types
export interface BodyMeasurements {
  neck?: number;
  waist?: number;
  chest?: number;
  hips?: number;
  thighLeft?: number;
  thighRight?: number;
  armLeftRelaxed?: number;
  armRightRelaxed?: number;
  armLeftContracted?: number;
  armRightContracted?: number;
}

export interface MeasurementPhoto {
  uri: string;
  date: Date;
  type: 'before' | 'after' | 'progress';
}

export interface Measurement {
  _id?: string;
  userId: string;
  date: Date;
  measurements: BodyMeasurements;
  weight?: number;
  bodyFat?: number;
  notes?: string;
  photos: MeasurementPhoto[];
  lastModified: Date;
  clientTimestamp: Date;
  createdAt?: string;
  updatedAt?: string;
}

// Progressive Overload Types
export interface ProgressiveOverloadSuggestion {
  exerciseName: string;
  currentMax: {
    weight?: number;
    reps?: number;
    volume?: number;
  };
  suggested: {
    weight?: number;
    reps?: number;
    sets?: number;
    duration?: number;
  };
  reason: string;
  type: 'weight' | 'reps' | 'sets' | 'duration';
}

// Statistics Types
export interface ExerciseStats {
  exerciseName: string;
  data: {
    date: Date;
    reps: number;
    weight: number;
    volume: number;
  }[];
  totalWorkouts: number;
}

export interface WeeklySummary {
  week: string;
  workoutCount: number;
  totalVolume: number;
  prCount: number;
}

export interface StatsSummary {
  period: number;
  workoutStats: {
    totalWorkouts: number;
    totalVolume: number;
    avgVolumePerWorkout: number;
    prCount: number;
  };
  exerciseFrequency: {
    _id: string;
    count: number;
    totalVolume: number;
  }[];
  weeklyStats: WeeklySummary[];
  latestMeasurement?: Measurement;
}

// Sync Types
export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync?: Date;
  pendingCount: number;
  error?: string;
}

export interface SyncConflict {
  localItem: Workout | Measurement;
  serverItem: Workout | Measurement;
  resolution: 'local' | 'server' | 'merge';
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Onboarding: undefined;
  WorkoutEntry: { workoutId?: string; presetPlan?: PresetExercise[]; date?: string; weekday?: string };
  MeasurementEntry: { measurementId?: string };
  WeeklyProgram?: undefined;
  WorkoutDetail: { id: string };
  ExerciseImagesManagement: undefined;
  WorkoutHistory: undefined;
};

export type MainTabParamList = {
  Workout: undefined;
  Statistics: undefined;
  Measurements: undefined;
  Settings: undefined;
};

export type WorkoutStackParamList = {
  WorkoutList: undefined;
  WorkoutEntry: { workoutId?: string };
  ExerciseSelector: undefined;
  ProgressiveOverload: { exerciseName: string };
};

export type StatisticsStackParamList = {
  StatsOverview: undefined;
  ExerciseHistory: { exerciseName?: string };
  WeeklySummary: undefined;
  ProgressCharts: { exerciseName: string };
};

export type MeasurementsStackParamList = {
  MeasurementsList: undefined;
  MeasurementEntry: { measurementId?: string };
  PhotoGallery: undefined;
  Tutorial: undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  Profile: undefined;
  SyncSettings: undefined;
  LanguageSettings: undefined;
  DataExport: undefined;
};

// Weekly Program Types (for navigation payloads)
export interface PresetProgramSet {
  reps: number;
  weight?: number;
}

export interface PresetExercise {
  name: string;
  muscleGroup: WorkoutExercise['muscleGroup'];
  type: WorkoutExercise['type'];
  weightBased: boolean;
  defaultSets: PresetProgramSet[];
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Local Storage Types
export interface LocalSettings {
  language: 'en' | 'tr';
  units: 'metric' | 'imperial';
  gender: 'male' | 'female';
  theme: 'light' | 'dark' | 'system';
  autoSync: boolean;
  syncInterval: number; // minutes
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// Chart Data Types
export interface ChartDataPoint {
  x: number | string;
  y: number;
  label?: string;
}

export interface LineChartData {
  datasets: {
    data: ChartDataPoint[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }[];
  legend?: string[];
}

// Exercise Image Types
export interface ExerciseImage {
  _id: string;
  exerciseName: string;
  uri: string;
  thumbnailUri?: string;
  uploadedAt: Date;
  userId: string;
}
