import NetInfo from '@react-native-community/netinfo';
import { io, Socket } from 'socket.io-client';
import { realmDB } from '../database/realm';
import { apiClient } from './api';
import { Workout, Measurement, SyncStatus } from '../types';

export interface SyncEvent {
  type: 'workout_created' | 'workout_updated' | 'workout_deleted' | 
        'measurement_created' | 'measurement_updated' | 'measurement_deleted';
  data: any;
}

class SyncService {
  private socket: Socket | null = null;
  private isOnline = false;
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private eventListeners: ((event: SyncEvent) => void)[] = [];
  private statusListeners: ((status: SyncStatus) => void)[] = [];

  constructor() {
    this.initializeNetworkListener();
    this.initializeSocket();
  }

  private initializeNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (!wasOnline && this.isOnline) {
        // Just came online, start syncing
        this.startSync();
      } else if (wasOnline && !this.isOnline) {
        // Just went offline, stop syncing
        this.stopSync();
      }

      this.updateSyncStatus();
    });
  }

  private initializeSocket(): void {
    if (!apiClient.isAuthenticated()) return;

    const tokens = apiClient.getTokens();
    if (!tokens) return;

    this.socket = io(apiClient['baseURL'].replace('/api', ''), {
      auth: {
        token: tokens.accessToken
      },
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    this.socket.on('workout_created', (data) => {
      this.handleRemoteWorkoutCreated(data);
    });

    this.socket.on('workout_updated', (data) => {
      this.handleRemoteWorkoutUpdated(data);
    });

    this.socket.on('workout_deleted', (data) => {
      this.handleRemoteWorkoutDeleted(data);
    });

    this.socket.on('measurement_created', (data) => {
      this.handleRemoteMeasurementCreated(data);
    });

    this.socket.on('measurement_updated', (data) => {
      this.handleRemoteMeasurementUpdated(data);
    });

    this.socket.on('measurement_deleted', (data) => {
      this.handleRemoteMeasurementDeleted(data);
    });
  }

  // Start automatic sync
  startAutoSync(intervalMinutes = 5): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.startSync();
      }
    }, intervalMinutes * 60 * 1000);
  }

  // Stop automatic sync
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Manual sync trigger
  async startSync(): Promise<void> {
    if (!this.isOnline || this.isSyncing) return;

    this.isSyncing = true;
    this.updateSyncStatus();

    try {
      // Sync workouts
      await this.syncWorkouts();
      
      // Sync measurements
      await this.syncMeasurements();
      
      // Update last sync time
      const syncStatus = realmDB.getSyncStatus();
      if (syncStatus) {
        realmDB.updateSyncStatus({
          ...syncStatus,
          lastSync: new Date(),
          error: undefined
        });
      }

      console.log('✅ Sync completed successfully');
    } catch (error) {
      console.error('❌ Sync failed:', error);
      
      const syncStatus = realmDB.getSyncStatus();
      if (syncStatus) {
        realmDB.updateSyncStatus({
          ...syncStatus,
          error: error instanceof Error ? error.message : 'Sync failed'
        });
      }
    } finally {
      this.isSyncing = false;
      this.updateSyncStatus();
    }
  }

  // Stop sync
  stopSync(): void {
    this.isSyncing = false;
    this.updateSyncStatus();
  }

  // Sync workouts
  private async syncWorkouts(): Promise<void> {
    const unsyncedWorkouts = realmDB.getUnsyncedWorkouts();
    
    for (const workout of unsyncedWorkouts) {
      try {
        if (workout._id.startsWith('temp_')) {
          // New workout, create on server
          const serverWorkout = await apiClient.createWorkout({
            date: workout.date,
            warmup: workout.warmup,
            exercises: workout.exercises,
            notes: workout.notes,
            totalVolume: workout.totalVolume,
            isPR: workout.isPR,
            lastModified: workout.lastModified,
            clientTimestamp: workout.clientTimestamp
          });
          
          // Update local workout with server ID
          realmDB.updateWorkout(workout._id, {
            _id: serverWorkout._id,
            synced: true
          });
        } else {
          // Existing workout, update on server
          await apiClient.updateWorkout(workout._id, {
            date: workout.date,
            warmup: workout.warmup,
            exercises: workout.exercises,
            notes: workout.notes,
            totalVolume: workout.totalVolume,
            isPR: workout.isPR,
            lastModified: workout.lastModified,
            clientTimestamp: workout.clientTimestamp
          });
          
          realmDB.markWorkoutAsSynced(workout._id);
        }
      } catch (error) {
        console.error(`Failed to sync workout ${workout._id}:`, error);
        throw error;
      }
    }
  }

  // Sync measurements
  private async syncMeasurements(): Promise<void> {
    const unsyncedMeasurements = realmDB.getUnsyncedMeasurements();
    
    for (const measurement of unsyncedMeasurements) {
      try {
        if (measurement._id.startsWith('temp_')) {
          // New measurement, create on server
          const serverMeasurement = await apiClient.createMeasurement({
            date: measurement.date,
            measurements: measurement.measurements,
            weight: measurement.weight,
            bodyFat: measurement.bodyFat,
            notes: measurement.notes,
            photos: measurement.photos,
            lastModified: measurement.lastModified,
            clientTimestamp: measurement.clientTimestamp
          });
          
          // Update local measurement with server ID
          realmDB.updateMeasurement(measurement._id, {
            _id: serverMeasurement._id,
            synced: true
          });
        } else {
          // Existing measurement, update on server
          await apiClient.updateMeasurement(measurement._id, {
            date: measurement.date,
            measurements: measurement.measurements,
            weight: measurement.weight,
            bodyFat: measurement.bodyFat,
            notes: measurement.notes,
            photos: measurement.photos,
            lastModified: measurement.lastModified,
            clientTimestamp: measurement.clientTimestamp
          });
          
          realmDB.markMeasurementAsSynced(measurement._id);
        }
      } catch (error) {
        console.error(`Failed to sync measurement ${measurement._id}:`, error);
        throw error;
      }
    }
  }

  // Handle remote workout events
  private handleRemoteWorkoutCreated(serverWorkout: Workout): void {
    // Check if we already have this workout locally
    const existingWorkout = realmDB.getWorkoutById(serverWorkout._id);
    
    if (!existingWorkout) {
      // Create new workout locally
      realmDB.createWorkout({
        ...serverWorkout,
        synced: true
      });
      
      this.emitEvent({
        type: 'workout_created',
        data: serverWorkout
      });
    }
  }

  private handleRemoteWorkoutUpdated(serverWorkout: Workout): void {
    const localWorkout = realmDB.getWorkoutById(serverWorkout._id);
    
    if (localWorkout) {
      // Check for conflicts
      if (localWorkout.lastModified > serverWorkout.lastModified) {
        // Local is newer, keep local version
        console.log('Conflict detected: keeping local version');
        return;
      }
      
      // Update local workout
      realmDB.updateWorkout(serverWorkout._id, {
        ...serverWorkout,
        synced: true
      });
      
      this.emitEvent({
        type: 'workout_updated',
        data: serverWorkout
      });
    }
  }

  private handleRemoteWorkoutDeleted(data: { id: string }): void {
    const localWorkout = realmDB.getWorkoutById(data.id);
    
    if (localWorkout) {
      realmDB.deleteWorkout(data.id);
      
      this.emitEvent({
        type: 'workout_deleted',
        data: { id: data.id }
      });
    }
  }

  // Handle remote measurement events
  private handleRemoteMeasurementCreated(serverMeasurement: Measurement): void {
    const existingMeasurement = realmDB.getMeasurementById(serverMeasurement._id);
    
    if (!existingMeasurement) {
      realmDB.createMeasurement({
        ...serverMeasurement,
        synced: true
      });
      
      this.emitEvent({
        type: 'measurement_created',
        data: serverMeasurement
      });
    }
  }

  private handleRemoteMeasurementUpdated(serverMeasurement: Measurement): void {
    const localMeasurement = realmDB.getMeasurementById(serverMeasurement._id);
    
    if (localMeasurement) {
      if (localMeasurement.lastModified > serverMeasurement.lastModified) {
        console.log('Conflict detected: keeping local version');
        return;
      }
      
      realmDB.updateMeasurement(serverMeasurement._id, {
        ...serverMeasurement,
        synced: true
      });
      
      this.emitEvent({
        type: 'measurement_updated',
        data: serverMeasurement
      });
    }
  }

  private handleRemoteMeasurementDeleted(data: { id: string }): void {
    const localMeasurement = realmDB.getMeasurementById(data.id);
    
    if (localMeasurement) {
      realmDB.deleteMeasurement(data.id);
      
      this.emitEvent({
        type: 'measurement_deleted',
        data: { id: data.id }
      });
    }
  }

  // Event listeners
  addEventListener(listener: (event: SyncEvent) => void): void {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: (event: SyncEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  addStatusListener(listener: (status: SyncStatus) => void): void {
    this.statusListeners.push(listener);
  }

  removeStatusListener(listener: (status: SyncStatus) => void): void {
    const index = this.statusListeners.indexOf(listener);
    if (index > -1) {
      this.statusListeners.splice(index, 1);
    }
  }

  private emitEvent(event: SyncEvent): void {
    this.eventListeners.forEach(listener => listener(event));
  }

  private updateSyncStatus(): void {
    const unsyncedWorkouts = realmDB.getUnsyncedWorkouts();
    const unsyncedMeasurements = realmDB.getUnsyncedMeasurements();
    const pendingCount = unsyncedWorkouts.length + unsyncedMeasurements.length;
    
    const syncStatus: SyncStatus = {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSync: realmDB.getSyncStatus()?.lastSync,
      pendingCount,
      error: realmDB.getSyncStatus()?.error
    };

    realmDB.updateSyncStatus(syncStatus);
    this.statusListeners.forEach(listener => listener(syncStatus));
  }

  // Get current sync status
  getSyncStatus(): SyncStatus | null {
    return realmDB.getSyncStatus();
  }

  // Check if online
  isConnected(): boolean {
    return this.isOnline;
  }

  // Disconnect
  disconnect(): void {
    this.stopAutoSync();
    this.stopSync();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Export singleton instance
export const syncService = new SyncService();
