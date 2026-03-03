import { PortfolioSnapshot, Stock } from '../types';

const STORAGE_KEY = 'xueqiu_tracker_snapshots';

export const getSnapshots = (): PortfolioSnapshot[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load snapshots", error);
    return [];
  }
};

export const saveSnapshot = (snapshot: PortfolioSnapshot): PortfolioSnapshot[] => {
  const current = getSnapshots();
  // Avoid duplicates for same day if needed, or just append
  const updated = [...current, snapshot].sort((a, b) => b.timestamp - a.timestamp);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const clearHistory = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const restoreData = (snapshots: PortfolioSnapshot[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
  return snapshots;
};

// Helper to generate a unique ID
export const generateId = () => Math.random().toString(36).substr(2, 9);

// Demo Data Generator
export const generateDemoData = (): PortfolioSnapshot[] => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const baseStocks: Stock[] = [
    { symbol: 'SH600519', name: '贵州茅台', price: 1700.50, changePercent: 1.2 },
    { symbol: 'SZ000858', name: '五粮液', price: 150.20, changePercent: -0.5 },
    { symbol: 'SH601318', name: '中国平安', price: 45.30, changePercent: 0.1 },
    { symbol: 'SZ300750', name: '宁德时代', price: 210.00, changePercent: 2.5 },
  ];

  const snapshots: PortfolioSnapshot[] = [
    {
      id: 'snap-1',
      date: lastWeek.toISOString(),
      timestamp: lastWeek.getTime(),
      stocks: baseStocks,
      notes: 'Initial tracking start'
    },
    {
      id: 'snap-2',
      date: yesterday.toISOString(),
      timestamp: yesterday.getTime(),
      stocks: [
        ...baseStocks.filter(s => s.symbol !== 'SH601318'), // Removed Ping An
        { symbol: 'SH600036', name: '招商银行', price: 32.10, changePercent: 0.8 }, // Added CMB
        { symbol: 'SZ002594', name: '比亚迪', price: 250.50, changePercent: 1.5 } // Added BYD
      ],
      notes: 'Shift towards EV sector'
    },
    {
      id: 'snap-3',
      date: today.toISOString(),
      timestamp: today.getTime(),
      stocks: [
        ...baseStocks.filter(s => s.symbol !== 'SH601318'),
        { symbol: 'SH600036', name: '招商银行', price: 32.50, changePercent: 1.2 },
        { symbol: 'SZ002594', name: '比亚迪', price: 255.00, changePercent: 1.8 },
        { symbol: 'SH688981', name: '中芯国际', price: 55.00, changePercent: 5.2 } // Added SMIC
      ],
      notes: 'Adding Tech exposure'
    }
  ];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots.reverse()));
  return snapshots.reverse(); // Newest first
};