import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SyncStatus } from '../types';
import { syncService } from '../services/syncService';

interface SyncContextType {
  syncStatus: SyncStatus | null;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSync: Date | undefined;
  error: string | undefined;
  startSync: () => Promise<void>;
  stopSync: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

interface SyncProviderProps {
  children: ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    // Wait for Realm to be initialized before accessing sync status
    const initializeSyncStatus = async () => {
      try {
        // Import realmDB to check initialization
        const { realmDB } = await import('../database/realm');
        
        // Wait for Realm to be initialized
        if (!realmDB.isRealmInitialized()) {
          await realmDB.initialize();
        }
        
        // Get initial sync status after Realm is ready
        const initialStatus = syncService.getSyncStatus();
        setSyncStatus(initialStatus);
      } catch (error) {
        console.warn('Failed to initialize sync status:', error);
        // Set default status if Realm is not available
        setSyncStatus({
          isOnline: false,
          isSyncing: false,
          pendingCount: 0,
          lastSync: undefined,
          error: undefined
        });
      }
    };

    initializeSyncStatus();

    // Listen for sync status changes
    const handleStatusChange = (status: SyncStatus) => {
      setSyncStatus(status);
    };

    syncService.addStatusListener(handleStatusChange);

    return () => {
      syncService.removeStatusListener(handleStatusChange);
    };
  }, []);

  const startSync = async (): Promise<void> => {
    await syncService.startSync();
  };

  const stopSync = (): void => {
    syncService.stopSync();
  };

  const value: SyncContextType = {
    syncStatus,
    isOnline: syncStatus?.isOnline ?? false,
    isSyncing: syncStatus?.isSyncing ?? false,
    pendingCount: syncStatus?.pendingCount ?? 0,
    lastSync: syncStatus?.lastSync,
    error: syncStatus?.error,
    startSync,
    stopSync
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextType {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
