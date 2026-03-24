import { useState, useCallback } from 'react';
import { GistAccount, GistContent, SyncStatus, SyncResult, SyncConflict, PortfolioSnapshot } from '../types';
import {
  getAccounts,
  addAccount,
  removeAccount,
  setActiveAccount,
  getActiveAccount,
  validateToken,
  pushToGist,
  pullFromGist,
  detectConflict,
  mergeSnapshots
} from '../services/gistService';
import { getSnapshots, restoreData } from '../services/storageService';

interface UseGistSyncReturn {
  accounts: GistAccount[];
  activeAccount: GistAccount | undefined;
  syncStatus: SyncStatus;
  lastSyncResult: SyncResult | null;
  conflict: SyncConflict | null;

  // Account management
  loadAccounts: () => void;
  addNewAccount: (name: string, token: string) => Promise<{ success: boolean; error?: string }>;
  removeAccountById: (id: string) => void;
  switchAccount: (id: string) => void;

  // Sync operations
  push: () => Promise<SyncResult>;
  pull: () => Promise<SyncResult & { content?: GistContent }>;
  smartSync: () => Promise<SyncResult>;

  // Conflict resolution
  resolveConflict: (resolution: 'local' | 'remote' | 'merge') => Promise<SyncResult>;
  clearConflict: () => void;

  // Utility
  clearSyncResult: () => void;
}

export const useGistSync = (): UseGistSyncReturn => {
  const [accounts, setAccounts] = useState<GistAccount[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [conflict, setConflict] = useState<SyncConflict | null>(null);
  const [pendingRemoteContent, setPendingRemoteContent] = useState<GistContent | null>(null);

  const activeAccount = accounts.find(a => a.isActive);

  const loadAccounts = useCallback(() => {
    setAccounts(getAccounts());
  }, []);

  const addNewAccount = useCallback(async (name: string, token: string): Promise<{ success: boolean; error?: string }> => {
    // Validate token first
    const validation = await validateToken(token);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const accountName = name || validation.username || 'GitHub Account';
    addAccount(accountName, token);
    loadAccounts();
    return { success: true };
  }, [loadAccounts]);

  const removeAccountById = useCallback((id: string) => {
    removeAccount(id);
    loadAccounts();
  }, [loadAccounts]);

  const switchAccount = useCallback((id: string) => {
    setActiveAccount(id);
    loadAccounts();
  }, [loadAccounts]);

  const push = useCallback(async (): Promise<SyncResult> => {
    if (!activeAccount) {
      return { success: false, message: 'No active account.' };
    }

    setSyncStatus('pushing');
    try {
      const snapshots = getSnapshots();
      const result = await pushToGist(activeAccount, snapshots);
      setLastSyncResult(result);
      setSyncStatus(result.success ? 'idle' : 'error');
      loadAccounts(); // Refresh to get updated lastSync
      return result;
    } catch (error) {
      const result: SyncResult = { success: false, message: 'Unexpected error during push.' };
      setLastSyncResult(result);
      setSyncStatus('error');
      return result;
    }
  }, [activeAccount, loadAccounts]);

  const pull = useCallback(async (): Promise<SyncResult & { content?: GistContent }> => {
    if (!activeAccount) {
      return { success: false, message: 'No active account.' };
    }

    setSyncStatus('pulling');
    try {
      const result = await pullFromGist(activeAccount);

      if (result.success && result.content) {
        // Restore data locally
        restoreData(result.content.snapshots);
      }

      setLastSyncResult(result);
      setSyncStatus(result.success ? 'idle' : 'error');
      loadAccounts();
      return result;
    } catch (error) {
      const result: SyncResult & { content?: GistContent } = { success: false, message: 'Unexpected error during pull.' };
      setLastSyncResult(result);
      setSyncStatus('error');
      return result;
    }
  }, [activeAccount, loadAccounts]);

  const smartSync = useCallback(async (): Promise<SyncResult> => {
    if (!activeAccount) {
      return { success: false, message: 'No active account.' };
    }

    setSyncStatus('pulling');
    try {
      // First, fetch remote content
      const pullResult = await pullFromGist(activeAccount);

      if (!pullResult.success) {
        setLastSyncResult(pullResult);
        setSyncStatus('error');
        return pullResult;
      }

      const remoteContent = pullResult.content!;
      const localSnapshots = getSnapshots();

      // Check for conflict
      const conflictCheck = detectConflict(localSnapshots, remoteContent);

      if (conflictCheck.hasConflict) {
        // Set conflict and let user decide
        setConflict({
          localTime: conflictCheck.localTime,
          remoteTime: conflictCheck.remoteTime,
          localCount: localSnapshots.length,
          remoteCount: remoteContent.snapshots.length,
          resolution: null
        });
        setPendingRemoteContent(remoteContent);
        setSyncStatus('idle');
        return { success: false, message: 'Conflict detected. Please choose how to resolve.' };
      }

      // No conflict - apply remote data
      restoreData(remoteContent.snapshots);
      setLastSyncResult({
        success: true,
        message: `Synced ${remoteContent.snapshots.length} snapshots from cloud.`,
        snapshotsCount: remoteContent.snapshots.length
      });
      setSyncStatus('idle');
      return { success: true, message: `Synced ${remoteContent.snapshots.length} snapshots.` };
    } catch (error) {
      const result: SyncResult = { success: false, message: 'Unexpected error during sync.' };
      setLastSyncResult(result);
      setSyncStatus('error');
      return result;
    }
  }, [activeAccount]);

  const resolveConflict = useCallback(async (resolution: 'local' | 'remote' | 'merge'): Promise<SyncResult> => {
    if (!activeAccount || !pendingRemoteContent) {
      return { success: false, message: 'No conflict to resolve.' };
    }

    const localSnapshots = getSnapshots();
    let finalSnapshots: PortfolioSnapshot[];
    let message: string;

    switch (resolution) {
      case 'local':
        // Keep local, push to remote
        finalSnapshots = localSnapshots;
        message = 'Kept local data and pushed to cloud.';
        break;
      case 'remote':
        // Use remote data
        finalSnapshots = pendingRemoteContent.snapshots;
        message = 'Used cloud data.';
        break;
      case 'merge':
        // Merge both
        finalSnapshots = mergeSnapshots(localSnapshots, pendingRemoteContent.snapshots);
        message = `Merged ${finalSnapshots.length} snapshots from both sources.`;
        break;
    }

    // Save locally
    restoreData(finalSnapshots);

    // Push merged result
    setSyncStatus('pushing');
    const pushResult = await pushToGist(activeAccount, finalSnapshots);

    setConflict(null);
    setPendingRemoteContent(null);
    setLastSyncResult({
      success: pushResult.success,
      message: pushResult.success ? message : `Data saved locally but push failed: ${pushResult.message}`,
      snapshotsCount: finalSnapshots.length
    });
    setSyncStatus(pushResult.success ? 'idle' : 'error');
    loadAccounts();

    return pushResult;
  }, [activeAccount, pendingRemoteContent, loadAccounts]);

  const clearConflict = useCallback(() => {
    setConflict(null);
    setPendingRemoteContent(null);
  }, []);

  const clearSyncResult = useCallback(() => {
    setLastSyncResult(null);
  }, []);

  return {
    accounts,
    activeAccount,
    syncStatus,
    lastSyncResult,
    conflict,
    loadAccounts,
    addNewAccount,
    removeAccountById,
    switchAccount,
    push,
    pull,
    smartSync,
    resolveConflict,
    clearConflict,
    clearSyncResult
  };
};