export interface Stock {
  symbol: string;
  name: string;
  price?: number;
  changePercent?: number;
  sector?: string; // Optional, for AI to infer
}

export interface PortfolioSnapshot {
  id: string;
  date: string; // ISO Date string
  timestamp: number;
  stocks: Stock[];
  notes?: string;
}

export interface PortfolioChange {
  date: string;
  added: Stock[];
  removed: Stock[];
  retained: Stock[];
  aiAnalysis?: string;
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  HISTORY = 'HISTORY',
  IMPORT = 'IMPORT'
}

export interface AIAnalysisResult {
  analysis: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral' | 'Defensive';
}

// Gist Cloud Sync Types

export interface GistAccount {
  id: string;           // Local unique identifier
  name: string;         // Display name
  token: string;        // GitHub PAT
  gistId?: string;      // Created Gist ID
  lastSync?: number;    // Last sync timestamp
  isActive: boolean;    // Currently active
}

export interface GistContent {
  version: number;
  lastModified: number;
  deviceId: string;
  snapshots: PortfolioSnapshot[];
}

export type SyncStatus = 'idle' | 'pushing' | 'pulling' | 'error';

export interface SyncResult {
  success: boolean;
  message: string;
  snapshotsCount?: number;
  lastModified?: number;
}

export interface SyncConflict {
  localTime: number;
  remoteTime: number;
  localCount: number;
  remoteCount: number;
  resolution: 'local' | 'remote' | 'merge' | null;
}