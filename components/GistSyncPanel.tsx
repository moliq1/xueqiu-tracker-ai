import React, { useState, useEffect } from 'react';
import { useGistSync } from '../hooks/useGistSync';

interface GistSyncPanelProps {
  onDataRestored: () => void;
}

export const GistSyncPanel: React.FC<GistSyncPanelProps> = ({ onDataRestored }) => {
  const {
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
  } = useGistSync();

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newToken, setNewToken] = useState('');
  const [addError, setAddError] = useState('');

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleAddAccount = async () => {
    if (!newToken.trim()) {
      setAddError('Please enter a GitHub PAT.');
      return;
    }

    const result = await addNewAccount(newAccountName.trim(), newToken.trim());
    if (result.success) {
      setShowAddAccount(false);
      setNewAccountName('');
      setNewToken('');
      setAddError('');
    } else {
      setAddError(result.error || 'Failed to add account.');
    }
  };

  const handlePush = async () => {
    const result = await push();
    if (result.success) {
      onDataRestored();
    }
  };

  const handlePull = async () => {
    const result = await pull();
    if (result.success && result.content) {
      onDataRestored();
    }
  };

  const handleSmartSync = async () => {
    const result = await smartSync();
    if (result.success) {
      onDataRestored();
    }
  };

  const handleResolveConflict = async (resolution: 'local' | 'remote' | 'merge') => {
    const result = await resolveConflict(resolution);
    if (result.success) {
      onDataRestored();
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Conflict Resolution Dialog */}
      {conflict && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h4 className="font-semibold text-orange-900 mb-2">Sync Conflict Detected</h4>
          <p className="text-sm text-orange-800 mb-3">
            Local data was modified more recently than cloud data.
          </p>
          <div className="text-sm text-orange-700 mb-4">
            <div className="flex justify-between mb-1">
              <span>Local:</span>
              <span>{conflict.localCount} snapshots (modified {formatDate(conflict.localTime)})</span>
            </div>
            <div className="flex justify-between">
              <span>Cloud:</span>
              <span>{conflict.remoteCount} snapshots (modified {formatDate(conflict.remoteTime)})</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleResolveConflict('local')}
              className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-1.5 px-3 rounded"
            >
              Keep Local
            </button>
            <button
              onClick={() => handleResolveConflict('remote')}
              className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-1.5 px-3 rounded"
            >
              Use Cloud
            </button>
            <button
              onClick={() => handleResolveConflict('merge')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-3 rounded"
            >
              Merge Both
            </button>
            <button
              onClick={clearConflict}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium py-1.5 px-3 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sync Result Message */}
      {lastSyncResult && (
        <div className={`rounded-lg p-3 ${lastSyncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex justify-between items-start">
            <p className={`text-sm ${lastSyncResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {lastSyncResult.message}
            </p>
            <button
              onClick={clearSyncResult}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Account Management */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">GitHub Accounts</h3>

        {accounts.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm mb-3">No accounts configured.</p>
            <button
              onClick={() => setShowAddAccount(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm"
            >
              Add GitHub Account
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map(account => (
              <div
                key={account.id}
                className={`p-3 border rounded-lg flex items-center justify-between ${
                  account.isActive ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    checked={account.isActive}
                    onChange={() => switchAccount(account.id)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{account.name}</p>
                    {account.lastSync && (
                      <p className="text-xs text-gray-500">
                        Last sync: {formatDate(account.lastSync)}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeAccountById(account.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              onClick={() => setShowAddAccount(true)}
              className="w-full border border-dashed border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-700 font-medium py-2 px-4 rounded-lg text-sm"
            >
              + Add Another Account
            </button>
          </div>
        )}
      </div>

      {/* Add Account Form */}
      {showAddAccount && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Add GitHub Account</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Account Name (optional)</label>
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="My GitHub"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Personal Access Token (PAT)</label>
              <input
                type="password"
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Create a PAT with <code>gist</code> scope at{' '}
                <a
                  href="https://github.com/settings/tokens/new?scopes=gist"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  GitHub Settings
                </a>
              </p>
            </div>
            {addError && <p className="text-sm text-red-600">{addError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleAddAccount}
                disabled={!newToken.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-sm disabled:opacity-50"
              >
                Add Account
              </button>
              <button
                onClick={() => {
                  setShowAddAccount(false);
                  setNewAccountName('');
                  setNewToken('');
                  setAddError('');
                }}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-md text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Actions */}
      {activeAccount && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Sync Actions</h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handlePush}
              disabled={syncStatus !== 'idle'}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-3 rounded-lg text-sm disabled:opacity-50 flex flex-col items-center"
            >
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Push
              {syncStatus === 'pushing' && <span className="text-xs text-blue-600">...</span>}
            </button>
            <button
              onClick={handlePull}
              disabled={syncStatus !== 'idle'}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-3 rounded-lg text-sm disabled:opacity-50 flex flex-col items-center"
            >
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Pull
              {syncStatus === 'pulling' && <span className="text-xs text-blue-600">...</span>}
            </button>
            <button
              onClick={handleSmartSync}
              disabled={syncStatus !== 'idle'}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-lg text-sm disabled:opacity-50 flex flex-col items-center"
            >
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Smart Sync
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Smart Sync automatically detects conflicts and merges data.
          </p>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">How Cloud Sync Works</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Push:</strong> Upload your local data to GitHub Gist</li>
          <li>• <strong>Pull:</strong> Download data from Gist (overwrites local)</li>
          <li>• <strong>Smart Sync:</strong> Merge local and cloud data intelligently</li>
        </ul>
        <p className="text-xs text-blue-600 mt-2">
          Your data is stored in a private Gist that only you can access.
        </p>
      </div>
    </div>
  );
};