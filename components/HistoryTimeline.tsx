import React, { useState } from 'react';
import { PortfolioSnapshot, PortfolioChange } from '../types';
import { StockCard } from './StockCard';
import { analyzePortfolioChange } from '../services/geminiService';

interface HistoryTimelineProps {
  snapshots: PortfolioSnapshot[];
}

export const HistoryTimeline: React.FC<HistoryTimelineProps> = ({ snapshots }) => {
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [analyses, setAnalyses] = useState<Record<string, { text: string; sentiment: string }>>({});

  // Compute diffs
  const changes: PortfolioChange[] = [];
  
  // Snapshots are expected to be Newest First
  for (let i = 0; i < snapshots.length - 1; i++) {
    const current = snapshots[i];
    const previous = snapshots[i + 1]; // Older

    const currentSymbols = new Set(current.stocks.map(s => s.symbol));
    const previousSymbols = new Set(previous.stocks.map(s => s.symbol));

    const added = current.stocks.filter(s => !previousSymbols.has(s.symbol));
    const removed = previous.stocks.filter(s => !currentSymbols.has(s.symbol));
    const retained = current.stocks.filter(s => previousSymbols.has(s.symbol));

    changes.push({
      date: current.date,
      added,
      removed,
      retained
    });
  }

  const handleAnalyze = async (change: PortfolioChange, idx: number) => {
    const changeId = `${change.date}-${idx}`;
    if (analyzingIds.has(changeId)) return;

    setAnalyzingIds(prev => new Set(prev).add(changeId));
    
    const result = await analyzePortfolioChange(change);
    
    setAnalyses(prev => ({
      ...prev,
      [changeId]: { text: result.analysis, sentiment: result.sentiment }
    }));
    
    setAnalyzingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(changeId);
      return newSet;
    });
  };

  if (snapshots.length < 2) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
        <p className="text-gray-500">Need at least 2 snapshots to track changes.</p>
        <p className="text-sm text-gray-400 mt-2">Import more data or generate demo history.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {changes.map((change, idx) => {
        const changeId = `${change.date}-${idx}`;
        const hasAnalysis = !!analyses[changeId];
        const isAnalyzing = analyzingIds.has(changeId);
        const sentiment = analyses[changeId]?.sentiment;

        let sentimentColor = 'bg-gray-100 text-gray-600';
        if (sentiment === 'Bullish') sentimentColor = 'bg-red-100 text-red-700'; // Red is up in China
        if (sentiment === 'Bearish') sentimentColor = 'bg-green-100 text-green-700';
        if (sentiment === 'Defensive') sentimentColor = 'bg-blue-100 text-blue-700';

        return (
          <div key={changeId} className="relative pl-8 pb-8 border-l-2 border-gray-200 last:border-0 last:pb-0">
            {/* Timeline Dot */}
            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm" />
            
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {new Date(change.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
                <p className="text-sm text-gray-500">
                  {change.added.length} Added · {change.removed.length} Removed
                </p>
              </div>

              {!hasAnalysis && (change.added.length > 0 || change.removed.length > 0) && (
                 <button
                 onClick={() => handleAnalyze(change, idx)}
                 disabled={isAnalyzing}
                 className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
               >
                 {isAnalyzing ? (
                   <>
                     <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     <span>Analyst Thinking...</span>
                   </>
                 ) : (
                   <>
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                     <span>Ask AI Analyst</span>
                   </>
                 )}
               </button>
              )}
            </div>

            {/* AI Analysis Box */}
            {hasAnalysis && (
              <div className="mb-6 p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                    <span className="font-semibold text-indigo-900">AI Strategy Insight</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${sentimentColor}`}>
                    {analyses[changeId].sentiment}
                  </span>
                </div>
                <p className="text-sm text-indigo-800 leading-relaxed">
                  {analyses[changeId].text}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {change.added.length > 0 && (
                <div className="bg-green-50/30 rounded-lg p-4 border border-green-100">
                  <h4 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                    Opened Positions
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {change.added.map(stock => (
                      <StockCard key={stock.symbol} stock={stock} status="added" />
                    ))}
                  </div>
                </div>
              )}

              {change.removed.length > 0 && (
                <div className="bg-red-50/30 rounded-lg p-4 border border-red-100">
                  <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-3 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                    Closed Positions
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {change.removed.map(stock => (
                      <StockCard key={stock.symbol} stock={stock} status="removed" />
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {change.added.length === 0 && change.removed.length === 0 && (
               <div className="text-sm text-gray-400 italic">No changes made to the portfolio on this day.</div>
            )}
          </div>
        );
      })}
    </div>
  );
};