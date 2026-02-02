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