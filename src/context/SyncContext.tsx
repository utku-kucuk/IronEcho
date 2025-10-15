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
    // Get initial sync status
    const initialStatus = syncService.getSyncStatus();
    setSyncStatus(initialStatus);

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
