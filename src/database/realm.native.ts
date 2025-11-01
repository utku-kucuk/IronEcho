import Realm from 'realm';
import { schemas, SCHEMA_VERSION } from './schemas';
import { Workout, Measurement, User, SyncStatus } from '../types';

class RealmDatabase {
  private realm: Realm | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.realm = await Realm.open({
        schema: schemas,
        schemaVersion: SCHEMA_VERSION,
        onMigration: (oldRealm: any, newRealm: any) => {
          // Handle migrations here if needed
          console.log('Realm migration running...');
          try {
            if (oldRealm.schemaVersion < 2) {
              const oldStatuses = oldRealm.objects('SyncStatus');
              const source = oldStatuses && oldStatuses.length > 0 ? oldStatuses[0] : undefined;
              const payload = {
                _id: 'sync_status',
                isOnline: source?.isOnline ?? false,
                isSyncing: source?.isSyncing ?? false,
                lastSync: source?.lastSync ?? undefined,
                pendingCount: source?.pendingCount ?? 0,
                error: source?.error ?? undefined
              };
              newRealm.create('SyncStatus', payload, Realm.UpdateMode.Modified);
            }
          } catch (e) {
            console.log('Migration error while seeding SyncStatus:', e);
          }
        }
      });

      this.isInitialized = true;
      console.log('✅ Realm database initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Realm:', error);
      throw error;
    }
  }

  getRealm(): Realm {
    if (!this.realm) {
      throw new Error('Realm not initialized. Call initialize() first.');
    }
    return this.realm;
  }

  // Workout operations
  createWorkout(workout: Omit<Workout, '_id'>): Workout {
    const realm = this.getRealm();
    const id = this.generateId();
    
    realm.write(() => {
      const newWorkout = realm.create('Workout', {
        _id: id,
        ...workout,
        synced: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return newWorkout;
    });

    return this.getWorkoutById(id)!;
  }

  getWorkoutById(id: string): Workout | null {
    const realm = this.getRealm();
    const workout = realm.objectForPrimaryKey('Workout', id);
    return workout ? this.realmToWorkout(workout) : null;
  }

  getWorkouts(userId: string, limit = 50, offset = 0): Workout[] {
    const realm = this.getRealm();
    const workouts = realm.objects('Workout')
      .filtered('userId == $0', userId)
      .sorted('date', true)
      .slice(offset, offset + limit);

    return Array.from(workouts).map(workout => this.realmToWorkout(workout));
  }

  updateWorkout(id: string, updates: Partial<Workout>): Workout | null {
    const realm = this.getRealm();
    const workout = realm.objectForPrimaryKey('Workout', id);
    
    if (!workout) return null;

    realm.write(() => {
      Object.assign(workout, {
        ...updates,
        synced: false,
        updatedAt: new Date().toISOString()
      });
    });

    return this.getWorkoutById(id);
  }

  deleteWorkout(id: string): boolean {
    const realm = this.getRealm();
    const workout = realm.objectForPrimaryKey('Workout', id);
    
    if (!workout) return false;

    realm.write(() => {
      realm.delete(workout);
    });

    return true;
  }

  // Measurement operations
  createMeasurement(measurement: Omit<Measurement, '_id'>): Measurement {
    const realm = this.getRealm();
    const id = this.generateId();
    
    realm.write(() => {
      const newMeasurement = realm.create('Measurement', {
        _id: id,
        ...measurement,
        synced: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return newMeasurement;
    });

    return this.getMeasurementById(id)!;
  }

  getMeasurementById(id: string): Measurement | null {
    const realm = this.getRealm();
    const measurement = realm.objectForPrimaryKey('Measurement', id);
    return measurement ? this.realmToMeasurement(measurement) : null;
  }

  getMeasurements(userId: string, limit = 50, offset = 0): Measurement[] {
    const realm = this.getRealm();
    const measurements = realm.objects('Measurement')
      .filtered('userId == $0', userId)
      .sorted('date', true)
      .slice(offset, offset + limit);

    return Array.from(measurements).map(measurement => this.realmToMeasurement(measurement));
  }

  updateMeasurement(id: string, updates: Partial<Measurement>): Measurement | null {
    const realm = this.getRealm();
    const measurement = realm.objectForPrimaryKey('Measurement', id);
    
    if (!measurement) return null;

    realm.write(() => {
      Object.assign(measurement, {
        ...updates,
        synced: false,
        updatedAt: new Date().toISOString()
      });
    });

    return this.getMeasurementById(id);
  }

  deleteMeasurement(id: string): boolean {
    const realm = this.getRealm();
    const measurement = realm.objectForPrimaryKey('Measurement', id);
    
    if (!measurement) return false;

    realm.write(() => {
      realm.delete(measurement);
    });

    return true;
  }

  // User operations
  saveUser(user: User): void {
    const realm = this.getRealm();
    
    realm.write(() => {
      realm.create('User', user, Realm.UpdateMode.Modified);
    });
  }

  getUser(userId: string): User | null {
    const realm = this.getRealm();
    const user = realm.objectForPrimaryKey('User', userId);
    return user ? this.realmToUser(user) : null;
  }

  // Sync status operations
  updateSyncStatus(status: Partial<SyncStatus>): void {
    const realm = this.getRealm();
    
    realm.write(() => {
      realm.create('SyncStatus', {
        _id: 'sync_status',
        ...status
      }, Realm.UpdateMode.Modified);
    });
  }

  getSyncStatus(): SyncStatus | null {
    const realm = this.getRealm();
    const status = realm.objectForPrimaryKey('SyncStatus', 'sync_status');
    return status ? this.realmToSyncStatus(status) : null;
  }

  // Get unsynced items
  getUnsyncedWorkouts(): Workout[] {
    const realm = this.getRealm();
    const workouts = realm.objects('Workout')
      .filtered('synced == false')
      .sorted('lastModified', true);

    return Array.from(workouts).map(workout => this.realmToWorkout(workout));
  }

  getUnsyncedMeasurements(): Measurement[] {
    const realm = this.getRealm();
    const measurements = realm.objects('Measurement')
      .filtered('synced == false')
      .sorted('lastModified', true);

    return Array.from(measurements).map(measurement => this.realmToMeasurement(measurement));
  }

  // Mark items as synced
  markWorkoutAsSynced(id: string): void {
    const realm = this.getRealm();
    const workout = realm.objectForPrimaryKey('Workout', id);
    
    if (workout) {
      realm.write(() => {
        workout.synced = true;
      });
    }
  }

  markMeasurementAsSynced(id: string): void {
    const realm = this.getRealm();
    const measurement = realm.objectForPrimaryKey('Measurement', id);
    
    if (measurement) {
      realm.write(() => {
        measurement.synced = true;
      });
    }
  }

  // Utility methods
  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  private realmToWorkout(realmWorkout: any): Workout {
    const clonedExercises = Array.from(realmWorkout.exercises || []).map((ex: any) => ({
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      equipment: ex.equipment,
      type: ex.type,
      weightBased: ex.weightBased,
      sets: Array.from(ex.sets || []).map((s: any) => ({ reps: s.reps, weight: s.weight }))
    }));
    return {
      _id: realmWorkout._id,
      userId: realmWorkout.userId,
      date: realmWorkout.date,
      warmup: realmWorkout.warmup,
      exercises: clonedExercises,
      notes: realmWorkout.notes,
      totalVolume: realmWorkout.totalVolume,
      isPR: realmWorkout.isPR,
      lastModified: realmWorkout.lastModified,
      clientTimestamp: realmWorkout.clientTimestamp,
      createdAt: realmWorkout.createdAt,
      updatedAt: realmWorkout.updatedAt
    };
  }

  private realmToMeasurement(realmMeasurement: any): Measurement {
    return {
      _id: realmMeasurement._id,
      userId: realmMeasurement.userId,
      date: realmMeasurement.date,
      measurements: realmMeasurement.measurements,
      weight: realmMeasurement.weight,
      bodyFat: realmMeasurement.bodyFat,
      notes: realmMeasurement.notes,
      photos: realmMeasurement.photos,
      lastModified: realmMeasurement.lastModified,
      clientTimestamp: realmMeasurement.clientTimestamp,
      createdAt: realmMeasurement.createdAt,
      updatedAt: realmMeasurement.updatedAt
    };
  }

  private realmToUser(realmUser: any): User {
    return {
      _id: realmUser._id,
      email: realmUser.email,
      profile: realmUser.profile,
      lastSync: realmUser.lastSync,
      createdAt: realmUser.createdAt,
      updatedAt: realmUser.updatedAt
    };
  }

  private realmToSyncStatus(realmStatus: any): SyncStatus {
    return {
      isOnline: realmStatus.isOnline,
      isSyncing: realmStatus.isSyncing,
      lastSync: realmStatus.lastSync,
      pendingCount: realmStatus.pendingCount,
      error: realmStatus.error
    };
  }

  // Close database
  close(): void {
    if (this.realm) {
      this.realm.close();
      this.realm = null;
      this.isInitialized = false;
    }
  }
}

// Export singleton instance
export const realmDB = new RealmDatabase();


