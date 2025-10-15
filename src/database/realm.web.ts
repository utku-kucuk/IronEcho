// Web stub for Realm to allow Expo web bundling.
// Uses in-memory arrays; no persistence on web.
import { Workout, Measurement, User, SyncStatus } from '../types';

class InMemoryDB {
  workouts: Record<string, Workout> = {};
  measurements: Record<string, Measurement> = {};
  users: Record<string, User> = {};
  syncStatus: SyncStatus | null = null;
}

class RealmWebDatabase {
  private store = new InMemoryDB();
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
    console.log('✅ Realm (web stub) initialized');
  }

  // Workout operations
  createWorkout(workout: Omit<Workout, '_id'>): Workout {
    const id = this.generateId();
    const newWorkout: Workout = {
      _id: id,
      ...workout
    } as Workout;
    this.store.workouts[id] = newWorkout;
    return newWorkout;
  }

  getWorkoutById(id: string): Workout | null {
    return this.store.workouts[id] ?? null;
  }

  getWorkouts(userId: string, limit = 50, offset = 0): Workout[] {
    const all = Object.values(this.store.workouts)
      .filter(w => w.userId === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    return all.slice(offset, offset + limit);
  }

  updateWorkout(id: string, updates: Partial<Workout>): Workout | null {
    const existing = this.store.workouts[id];
    if (!existing) return null;
    this.store.workouts[id] = { ...existing, ...updates } as Workout;
    return this.store.workouts[id];
  }

  deleteWorkout(id: string): boolean {
    const exists = !!this.store.workouts[id];
    if (exists) delete this.store.workouts[id];
    return exists;
  }

  // Measurement operations
  createMeasurement(measurement: Omit<Measurement, '_id'>): Measurement {
    const id = this.generateId();
    const newMeasurement: Measurement = {
      _id: id,
      ...measurement
    } as Measurement;
    this.store.measurements[id] = newMeasurement;
    return newMeasurement;
  }

  getMeasurementById(id: string): Measurement | null {
    return this.store.measurements[id] ?? null;
  }

  getMeasurements(userId: string, limit = 50, offset = 0): Measurement[] {
    const all = Object.values(this.store.measurements)
      .filter(m => m.userId === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    return all.slice(offset, offset + limit);
  }

  updateMeasurement(id: string, updates: Partial<Measurement>): Measurement | null {
    const existing = this.store.measurements[id];
    if (!existing) return null;
    this.store.measurements[id] = { ...existing, ...updates } as Measurement;
    return this.store.measurements[id];
  }

  deleteMeasurement(id: string): boolean {
    const exists = !!this.store.measurements[id];
    if (exists) delete this.store.measurements[id];
    return exists;
  }

  // User operations
  saveUser(user: User): void {
    this.store.users[user._id] = user;
  }

  getUser(userId: string): User | null {
    return this.store.users[userId] ?? null;
  }

  // Sync status operations
  updateSyncStatus(status: Partial<SyncStatus>): void {
    this.store.syncStatus = { _id: 'sync_status', isOnline: false, isSyncing: false, pendingCount: 0, ...status } as SyncStatus;
  }

  getSyncStatus(): SyncStatus | null {
    return this.store.syncStatus;
  }

  getUnsyncedWorkouts(): Workout[] {
    return Object.values(this.store.workouts).filter(w => (w as any).synced === false);
  }

  getUnsyncedMeasurements(): Measurement[] {
    return Object.values(this.store.measurements).filter(m => (m as any).synced === false);
  }

  markWorkoutAsSynced(id: string): void {
    const w = this.store.workouts[id];
    if (w) (w as any).synced = true;
  }

  markMeasurementAsSynced(id: string): void {
    const m = this.store.measurements[id];
    if (m) (m as any).synced = true;
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  close(): void {
    // no-op on web
  }
}

export const realmDB = new RealmWebDatabase();


