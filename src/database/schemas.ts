import Realm from 'realm';
import { Workout, Measurement, User } from '../types';

// Realm Schema for Workout
export class WorkoutSchema extends Realm.Object<Workout> {
  _id!: string;
  userId!: string;
  date!: Date;
  warmup?: {
    type?: string;
    duration?: number;
    speed?: number;
  };
  exercises!: Array<{
    name: string;
    muscleGroup: string;
    equipment?: string;
    type: string;
    weightBased: boolean;
    sets: Array<{
      reps: number;
      weight?: number;
      notes?: string;
    }>;
  }>;
  notes?: string;
  totalVolume!: number;
  isPR!: boolean;
  lastModified!: Date;
  clientTimestamp!: Date;
  createdAt?: string;
  updatedAt?: string;
  synced!: boolean;

  static schema: Realm.ObjectSchema = {
    name: 'Workout',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      userId: 'string',
      date: 'date',
      warmup: 'WorkoutWarmup?',
      exercises: 'WorkoutExercise[]',
      notes: 'string?',
      totalVolume: 'double',
      isPR: 'bool',
      lastModified: 'date',
      clientTimestamp: 'date',
      createdAt: 'string?',
      updatedAt: 'string?',
      synced: { type: 'bool', default: false }
    }
  };
}

// Realm Schema for WorkoutWarmup
export class WorkoutWarmupSchema extends Realm.Object {
  type?: string;
  duration?: number;
  speed?: number;

  static schema: Realm.ObjectSchema = {
    name: 'WorkoutWarmup',
    properties: {
      type: 'string?',
      duration: 'double?',
      speed: 'double?'
    }
  };
}

// Realm Schema for WorkoutExercise
export class WorkoutExerciseSchema extends Realm.Object {
  name!: string;
  muscleGroup!: string;
  equipment?: string;
  type!: string;
  weightBased!: boolean;
  sets!: Array<{
    reps: number;
    weight?: number;
    notes?: string;
  }>;

  static schema: Realm.ObjectSchema = {
    name: 'WorkoutExercise',
    properties: {
      name: 'string',
      muscleGroup: 'string',
      equipment: 'string?',
      type: 'string',
      weightBased: 'bool',
      sets: 'WorkoutSet[]'
    }
  };
}

// Realm Schema for WorkoutSet
export class WorkoutSetSchema extends Realm.Object {
  reps!: number;
  weight?: number;
  notes?: string;

  static schema: Realm.ObjectSchema = {
    name: 'WorkoutSet',
    properties: {
      reps: 'int',
      weight: 'double?',
      notes: 'string?'
    }
  };
}

// Realm Schema for Measurement
export class MeasurementSchema extends Realm.Object<Measurement> {
  _id!: string;
  userId!: string;
  date!: Date;
  measurements!: {
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
  };
  weight?: number;
  bodyFat?: number;
  notes?: string;
  photos!: Array<{
    uri: string;
    date: Date;
    type: string;
  }>;
  lastModified!: Date;
  clientTimestamp!: Date;
  createdAt?: string;
  updatedAt?: string;
  synced!: boolean;

  static schema: Realm.ObjectSchema = {
    name: 'Measurement',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      userId: 'string',
      date: 'date',
      measurements: 'BodyMeasurements',
      weight: 'double?',
      bodyFat: 'double?',
      notes: 'string?',
      photos: 'MeasurementPhoto[]',
      lastModified: 'date',
      clientTimestamp: 'date',
      createdAt: 'string?',
      updatedAt: 'string?',
      synced: { type: 'bool', default: false }
    }
  };
}

// Realm Schema for BodyMeasurements
export class BodyMeasurementsSchema extends Realm.Object {
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

  static schema: Realm.ObjectSchema = {
    name: 'BodyMeasurements',
    properties: {
      neck: 'double?',
      waist: 'double?',
      chest: 'double?',
      hips: 'double?',
      thighLeft: 'double?',
      thighRight: 'double?',
      armLeftRelaxed: 'double?',
      armRightRelaxed: 'double?',
      armLeftContracted: 'double?',
      armRightContracted: 'double?'
    }
  };
}

// Realm Schema for MeasurementPhoto
export class MeasurementPhotoSchema extends Realm.Object {
  uri!: string;
  date!: Date;
  type!: string;

  static schema: Realm.ObjectSchema = {
    name: 'MeasurementPhoto',
    properties: {
      uri: 'string',
      date: 'date',
      type: 'string'
    }
  };
}

// Realm Schema for User (local settings)
export class UserSchema extends Realm.Object<User> {
  _id!: string;
  email!: string;
  profile!: {
    gender: string;
    units: string;
    language: string;
  };
  lastSync!: Date;
  createdAt?: string;
  updatedAt?: string;

  static schema: Realm.ObjectSchema = {
    name: 'User',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      email: 'string',
      profile: 'UserProfile',
      lastSync: 'date',
      createdAt: 'string?',
      updatedAt: 'string?'
    }
  };
}

// Realm Schema for UserProfile
export class UserProfileSchema extends Realm.Object {
  gender!: string;
  units!: string;
  language!: string;

  static schema: Realm.ObjectSchema = {
    name: 'UserProfile',
    properties: {
      gender: 'string',
      units: 'string',
      language: 'string'
    }
  };
}

// Realm Schema for SyncStatus
export class SyncStatusSchema extends Realm.Object {
  _id!: string;
  isOnline!: boolean;
  isSyncing!: boolean;
  lastSync?: Date;
  pendingCount!: number;
  error?: string;

  static schema: Realm.ObjectSchema = {
    name: 'SyncStatus',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      isOnline: 'bool',
      isSyncing: 'bool',
      lastSync: 'date?',
      pendingCount: 'int',
      error: 'string?'
    }
  };
}

// All schemas array
export const schemas = [
  WorkoutSchema,
  WorkoutWarmupSchema,
  WorkoutExerciseSchema,
  WorkoutSetSchema,
  MeasurementSchema,
  BodyMeasurementsSchema,
  MeasurementPhotoSchema,
  UserSchema,
  UserProfileSchema,
  SyncStatusSchema
];

// Schema versions for migrations
export const SCHEMA_VERSION = 2;
