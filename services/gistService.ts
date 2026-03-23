import { GistAccount, GistContent, SyncResult, PortfolioSnapshot } from '../types';
import { getDeviceId } from '../utils/deviceId';

const ACCOUNTS_KEY = 'xueqiu_tracker_gist_accounts';
const GIST_API_BASE = 'https://api.github.com/gists';
const GIST_FILE_NAME = 'xueqiu-portfolio-data.json';
const GIST_VERSION = 1;

// Account Management

export const getAccounts = (): GistAccount[] => {
  try {
    const data = localStorage.getItem(ACCOUNTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveAccounts = (accounts: GistAccount[]): void => {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
};

export const addAccount = (name: string, token: string): GistAccount => {
  const accounts = getAccounts();

  // Deactivate all other accounts
  accounts.forEach(a => a.isActive = false);

  const newAccount: GistAccount = {
    id: `account_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    token,
    isActive: true
  };

  accounts.push(newAccount);
  saveAccounts(accounts);
  return newAccount;
};

export const removeAccount = (id: string): void => {
  const accounts = getAccounts();
  const index = accounts.findIndex(a => a.id === id);
  if (index !== -1) {
    const wasActive = accounts[index].isActive;
    accounts.splice(index, 1);
    // Activate another account if the removed one was active
    if (wasActive && accounts.length > 0) {
      accounts[0].isActive = true;
    }
    saveAccounts(accounts);
  }
};

export const setActiveAccount = (id: string): GistAccount | undefined => {
  const accounts = getAccounts();
  accounts.forEach(a => a.isActive = a.id === id);
  saveAccounts(accounts);
  return accounts.find(a => a.id === id);
};

export const getActiveAccount = (): GistAccount | undefined => {
  const accounts = getAccounts();
  return accounts.find(a => a.isActive);
};

export const updateAccountGist = (id: string, gistId: string): void => {
  const accounts = getAccounts();
  const account = accounts.find(a => a.id === id);
  if (account) {
    account.gistId = gistId;
    account.lastSync = Date.now();
    saveAccounts(accounts);
  }
};

// GitHub API Operations

const getHeaders = (token: string): HeadersInit => ({
  'Authorization': `Bearer ${token}`,
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28'
});

export const validateToken = async (token: string): Promise<{ valid: boolean; username?: string; error?: string }> => {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: getHeaders(token)
    });

    if (response.ok) {
      const data = await response.json();
      return { valid: true, username: data.login };
    } else if (response.status === 401) {
      return { valid: false, error: 'Invalid token. Please check your PAT.' };
    } else if (response.status === 403) {
      return { valid: false, error: 'Rate limit exceeded. Please try again later.' };
    } else {
      return { valid: false, error: `Error: ${response.status} ${response.statusText}` };
    }
  } catch (error) {
    return { valid: false, error: 'Network error. Please check your connection.' };
  }
};

export const createGist = async (account: GistAccount, snapshots: PortfolioSnapshot[]): Promise<{ success: boolean; gistId?: string; error?: string }> => {
  try {
    const content: GistContent = {
      version: GIST_VERSION,
      lastModified: Date.now(),
      deviceId: getDeviceId(),
      snapshots
    };

    const response = await fetch(GIST_API_BASE, {
      method: 'POST',
      headers: getHeaders(account.token),
      body: JSON.stringify({
        description: 'Xueqiu Portfolio Tracker - Sync Data',
        public: false,
        files: {
          [GIST_FILE_NAME]: {
            content: JSON.stringify(content, null, 2)
          }
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      updateAccountGist(account.id, data.id);
      return { success: true, gistId: data.id };
    } else if (response.status === 401) {
      return { success: false, error: 'Invalid token. Please re-add your account.' };
    } else if (response.status === 403) {
      return { success: false, error: 'Rate limit exceeded. Please try again later.' };
    } else {
      return { success: false, error: `Error: ${response.status} ${response.statusText}` };
    }
  } catch (error) {
    return { success: false, error: 'Network error. Please check your connection.' };
  }
};

export const getGistContent = async (account: GistAccount): Promise<{ success: boolean; content?: GistContent; error?: string }> => {
  if (!account.gistId) {
    return { success: false, error: 'No Gist ID configured. Push first to create.' };
  }

  try {
    const response = await fetch(`${GIST_API_BASE}/${account.gistId}`, {
      headers: getHeaders(account.token)
    });

    if (response.ok) {
      const data = await response.json();
      const file = data.files?.[GIST_FILE_NAME];
      if (file?.content) {
        const content = JSON.parse(file.content) as GistContent;
        return { success: true, content };
      } else {
        return { success: false, error: 'Gist file not found or empty.' };
      }
    } else if (response.status === 404) {
      return { success: false, error: 'Gist not found. It may have been deleted.' };
    } else if (response.status === 401) {
      return { success: false, error: 'Invalid token. Please re-add your account.' };
    } else if (response.status === 403) {
      return { success: false, error: 'Rate limit exceeded. Please try again later.' };
    } else {
      return { success: false, error: `Error: ${response.status} ${response.statusText}` };
    }
  } catch (error) {
    return { success: false, error: 'Network error. Please check your connection.' };
  }
};

export const updateGist = async (account: GistAccount, snapshots: PortfolioSnapshot[]): Promise<{ success: boolean; error?: string }> => {
  if (!account.gistId) {
    return { success: false, error: 'No Gist ID configured.' };
  }

  try {
    const content: GistContent = {
      version: GIST_VERSION,
      lastModified: Date.now(),
      deviceId: getDeviceId(),
      snapshots
    };

    const response = await fetch(`${GIST_API_BASE}/${account.gistId}`, {
      method: 'PATCH',
      headers: getHeaders(account.token),
      body: JSON.stringify({
        files: {
          [GIST_FILE_NAME]: {
            content: JSON.stringify(content, null, 2)
          }
        }
      })
    });

    if (response.ok) {
      const accounts = getAccounts();
      const acc = accounts.find(a => a.id === account.id);
      if (acc) {
        acc.lastSync = Date.now();
        saveAccounts(accounts);
      }
      return { success: true };
    } else if (response.status === 401) {
      return { success: false, error: 'Invalid token. Please re-add your account.' };
    } else if (response.status === 403) {
      return { success: false, error: 'Rate limit exceeded. Please try again later.' };
    } else {
      return { success: false, error: `Error: ${response.status} ${response.statusText}` };
    }
  } catch (error) {
    return { success: false, error: 'Network error. Please check your connection.' };
  }
};

// Sync Operations

export const pushToGist = async (account: GistAccount, snapshots: PortfolioSnapshot[]): Promise<SyncResult> => {
  if (!account.gistId) {
    const result = await createGist(account, snapshots);
    if (result.success) {
      return {
        success: true,
        message: `Created new Gist and pushed ${snapshots.length} snapshots.`,
        snapshotsCount: snapshots.length
      };
    } else {
      return { success: false, message: result.error || 'Failed to create Gist.' };
    }
  } else {
    const result = await updateGist(account, snapshots);
    if (result.success) {
      return {
        success: true,
        message: `Pushed ${snapshots.length} snapshots to Gist.`,
        snapshotsCount: snapshots.length
      };
    } else {
      return { success: false, message: result.error || 'Failed to update Gist.' };
    }
  }
};

export const pullFromGist = async (account: GistAccount): Promise<SyncResult & { content?: GistContent }> => {
  const result = await getGistContent(account);
  if (result.success && result.content) {
    return {
      success: true,
      message: `Pulled ${result.content.snapshots.length} snapshots from Gist.`,
      snapshotsCount: result.content.snapshots.length,
      lastModified: result.content.lastModified,
      content: result.content
    };
  } else {
    return { success: false, message: result.error || 'Failed to fetch Gist.' };
  }
};

// Conflict Detection and Resolution

export const detectConflict = (
  localSnapshots: PortfolioSnapshot[],
  remoteContent: GistContent
): { hasConflict: boolean; localTime: number; remoteTime: number } => {
  const localTime = localSnapshots.length > 0
    ? Math.max(...localSnapshots.map(s => s.timestamp))
    : 0;

  return {
    hasConflict: localTime > remoteContent.lastModified && remoteContent.deviceId !== getDeviceId(),
    localTime,
    remoteTime: remoteContent.lastModified
  };
};

export const mergeSnapshots = (
  local: PortfolioSnapshot[],
  remote: PortfolioSnapshot[]
): PortfolioSnapshot[] => {
  // Merge by id, keeping the one with higher timestamp
  const snapshotMap = new Map<string, PortfolioSnapshot>();

  // Add remote snapshots first
  remote.forEach(s => snapshotMap.set(s.id, s));

  // Add/update with local snapshots
  local.forEach(s => {
    const existing = snapshotMap.get(s.id);
    if (!existing || s.timestamp > existing.timestamp) {
      snapshotMap.set(s.id, s);
    }
  });

  // Return sorted by timestamp descending
  return Array.from(snapshotMap.values()).sort((a, b) => b.timestamp - a.timestamp);
};