import React, { useEffect, useState } from 'react';
import { ViewMode, PortfolioSnapshot, Stock } from './types';
import { getSnapshots, saveSnapshot, clearHistory, generateDemoData, restoreData } from './services/storageService';
import { HistoryTimeline } from './components/HistoryTimeline';
import { Importer } from './components/Importer';
import { StockCard } from './components/StockCard';

function App() {
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.DASHBOARD);

  useEffect(() => {
    // Load initial data
    const loaded = getSnapshots();
    setSnapshots(loaded);
  }, []);

  const handleImport = (newSnapshot: PortfolioSnapshot) => {
    const updated = saveSnapshot(newSnapshot);
    setSnapshots(updated);
    setViewMode(ViewMode.DASHBOARD);
  };

  const handleRestore = (data: PortfolioSnapshot[]) => {
    const updated = restoreData(data);
    setSnapshots(updated);
    alert("Data restored successfully!");
  };

  const handleGenerateDemo = () => {
    const demo = generateDemoData();
    setSnapshots(demo);
    setViewMode(ViewMode.DASHBOARD);
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to delete all history?")) {
      clearHistory();
      setSnapshots([]);
    }
  };

  // Derived state
  const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;
  const currentStocks = latestSnapshot ? latestSnapshot.stocks : [];

  // Helper to group stocks by market
  const groupStocksByMarket = (stocks: Stock[]) => {
    const groups: Record<string, Stock[]> = {
      'CN': [],
      'HK': [],
      'US': [],
      'COMBO': [],
      'OTHER': []
    };

    stocks.forEach(stock => {
      const upper = stock.symbol.toUpperCase();
      if (upper.startsWith('ZH')) {
        groups['COMBO'].push(stock);
      } else if (upper.startsWith('HK') || /^\d{5}$/.test(upper)) {
        groups['HK'].push(stock);
      } else if (upper.startsWith('SH') || upper.startsWith('SZ')) {
        groups['CN'].push(stock);
      } else if (/^[A-Z]+$/.test(upper)) {
        groups['US'].push(stock);
      } else {
        groups['OTHER'].push(stock);
      }
    });
    return groups;
  };

  const groupedStocks = groupStocksByMarket(currentStocks);
  const hasStocks = currentStocks.length > 0;

  return (
    <div className="min-h-screen font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                Xueqiu Tracker <span className="text-blue-600">AI</span>
              </h1>
            </div>
            
            <nav className="flex items-center space-x-1 sm:space-x-4">
              <button
                onClick={() => setViewMode(ViewMode.DASHBOARD)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === ViewMode.DASHBOARD 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setViewMode(ViewMode.HISTORY)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === ViewMode.HISTORY 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Change Log
              </button>
              <button
                onClick={() => setViewMode(ViewMode.IMPORT)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === ViewMode.IMPORT 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Update Data
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {viewMode === ViewMode.DASHBOARD && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-lg">
              <div>
                <h2 className="text-2xl font-bold">Portfolio Overview</h2>
                <p className="text-slate-400 mt-1">
                  Tracking User: <span className="text-white font-mono font-semibold">sth_</span>
                </p>
                <div className="mt-4 flex items-center space-x-6">
                  <div>
                    <span className="text-xs uppercase text-slate-500 font-bold tracking-wider">Total Positions</span>
                    <p className="text-3xl font-bold mt-1">{currentStocks.length}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase text-slate-500 font-bold tracking-wider">Last Update</span>
                    <p className="text-lg font-medium mt-1 text-slate-200">
                      {latestSnapshot 
                        ? new Date(latestSnapshot.date).toLocaleDateString() 
                        : 'No Data'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 max-w-xs w-full">
                <p className="text-sm text-slate-300 mb-2">Action Required</p>
                {snapshots.length === 0 ? (
                  <button 
                    onClick={() => setViewMode(ViewMode.IMPORT)}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
                  >
                    Load Data
                  </button>
                ) : (
                   <button 
                    onClick={() => setViewMode(ViewMode.HISTORY)}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
                  >
                    Analyze Changes
                  </button>
                )}
              </div>
            </div>

            {snapshots.length === 0 ? (
              <div className="text-center py-20">
                <h3 className="text-lg font-medium text-gray-900">No portfolio data yet</h3>
                <p className="mt-2 text-gray-500">Import snapshot or generate demo data to see the dashboard.</p>
                <button 
                   onClick={handleGenerateDemo}
                   className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  Generate Demo Data
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* A-Shares */}
                {groupedStocks['CN'].length > 0 && (
                  <section>
                    <h3 className="flex items-center text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                      <span className="w-2 h-6 bg-red-500 rounded-full mr-2"></span>
                      A-Shares / A股 
                      <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{groupedStocks['CN'].length}</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {groupedStocks['CN'].map((stock, idx) => (
                        <StockCard key={`${stock.symbol}-${idx}`} stock={stock} />
                      ))}
                    </div>
                  </section>
                )}

                {/* HK-Shares */}
                {groupedStocks['HK'].length > 0 && (
                  <section>
                    <h3 className="flex items-center text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                       <span className="w-2 h-6 bg-purple-500 rounded-full mr-2"></span>
                       HK Market / 港股
                       <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{groupedStocks['HK'].length}</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {groupedStocks['HK'].map((stock, idx) => (
                        <StockCard key={`${stock.symbol}-${idx}`} stock={stock} />
                      ))}
                    </div>
                  </section>
                )}

                {/* US-Shares */}
                {groupedStocks['US'].length > 0 && (
                  <section>
                    <h3 className="flex items-center text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                       <span className="w-2 h-6 bg-blue-500 rounded-full mr-2"></span>
                       US Market / 美股
                       <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{groupedStocks['US'].length}</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {groupedStocks['US'].map((stock, idx) => (
                        <StockCard key={`${stock.symbol}-${idx}`} stock={stock} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Combos */}
                {groupedStocks['COMBO'].length > 0 && (
                  <section>
                    <h3 className="flex items-center text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                       <span className="w-2 h-6 bg-orange-500 rounded-full mr-2"></span>
                       Portfolios / 组合
                       <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{groupedStocks['COMBO'].length}</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {groupedStocks['COMBO'].map((stock, idx) => (
                        <StockCard key={`${stock.symbol}-${idx}`} stock={stock} />
                      ))}
                    </div>
                  </section>
                )}
                 
                 {/* Others */}
                {groupedStocks['OTHER'].length > 0 && (
                  <section>
                    <h3 className="flex items-center text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                       <span className="w-2 h-6 bg-gray-500 rounded-full mr-2"></span>
                       Other / 其他
                       <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{groupedStocks['OTHER'].length}</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {groupedStocks['OTHER'].map((stock, idx) => (
                        <StockCard key={`${stock.symbol}-${idx}`} stock={stock} />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )}

        {viewMode === ViewMode.HISTORY && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Portfolio Timeline</h2>
              <button 
                onClick={handleClear}
                className="text-red-600 hover:text-red-800 text-sm font-medium hover:underline"
              >
                Reset History
              </button>
            </div>
            <HistoryTimeline snapshots={snapshots} />
          </div>
        )}

        {viewMode === ViewMode.IMPORT && (
          <div className="max-w-3xl mx-auto pt-8">
            <Importer 
              onImport={handleImport} 
              onGenerateDemo={handleGenerateDemo} 
              onRestore={handleRestore}
            />
          </div>
        )}

      </main>
    </div>
  );
}

export default App;