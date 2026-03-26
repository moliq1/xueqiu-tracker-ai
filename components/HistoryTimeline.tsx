import React, { useState } from 'react';
import { PortfolioSnapshot, PortfolioChange, StockRankChange } from '../types';
import { StockCard } from './StockCard';
import { analyzePortfolioChange } from '../services/geminiService';

interface HistoryTimelineProps {
  snapshots: PortfolioSnapshot[];
}

const RANK_CHANGE_THRESHOLD = 10;

const RankChangeCard: React.FC<{ change: StockRankChange; direction: 'up' | 'down' }> = ({ change, direction }) => {
  const toneClasses = direction === 'up'
    ? 'border-emerald-200 bg-emerald-50/60 text-emerald-700'
    : 'border-amber-200 bg-amber-50/60 text-amber-700';
  const label = direction === 'up' ? 'UP' : 'DOWN';
  const delta = direction === 'up' ? `+${change.delta}` : `${change.delta}`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h5 className="font-semibold text-gray-900">{change.stock.name}</h5>
          <p className="text-xs font-mono text-gray-500">{change.stock.symbol}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${toneClasses}`}>
          {label} {delta}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 text-xs text-gray-600">
        <div>
          <p className="uppercase tracking-wide text-gray-400">Previous</p>
          <p className="mt-1 font-semibold text-gray-900">#{change.previousRank}</p>
        </div>
        <div>
          <p className="uppercase tracking-wide text-gray-400">Current</p>
          <p className="mt-1 font-semibold text-gray-900">#{change.currentRank}</p>
        </div>
      </div>
    </div>
  );
};

export const HistoryTimeline: React.FC<HistoryTimelineProps> = ({ snapshots }) => {
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [analyses, setAnalyses] = useState<Record<string, { text: string; sentiment: string }>>({});
  const [expandedRankSignals, setExpandedRankSignals] = useState<Set<string>>(new Set());

  // Compute diffs
  const changes: PortfolioChange[] = [];
  
  // Snapshots are expected to be Newest First
  for (let i = 0; i < snapshots.length - 1; i++) {
    const current = snapshots[i];
    const previous = snapshots[i + 1]; // Older

    const currentSymbols = new Set(current.stocks.map(s => s.symbol));
    const previousSymbols = new Set(previous.stocks.map(s => s.symbol));
    const previousRankMap = new Map(previous.stocks.map((stock, index) => [stock.symbol, index + 1]));

    const added = current.stocks.filter(s => !previousSymbols.has(s.symbol));
    const removed = previous.stocks.filter(s => !currentSymbols.has(s.symbol));
    const retained = current.stocks.filter(s => previousSymbols.has(s.symbol));
    const rankChanges = retained
      .map((stock, index) => {
        const previousRank = previousRankMap.get(stock.symbol);
        if (!previousRank) return null;

        return {
          stock,
          previousRank,
          currentRank: index + 1,
          delta: previousRank - (index + 1)
        };
      })
      .filter((change): change is StockRankChange => change !== null);
    const movedUp = rankChanges.filter(change => change.delta >= RANK_CHANGE_THRESHOLD);
    const movedDown = rankChanges.filter(change => change.delta <= -RANK_CHANGE_THRESHOLD);

    changes.push({
      date: current.date,
      added,
      removed,
      retained,
      movedUp,
      movedDown
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

  const toggleRankSignals = (changeId: string) => {
    setExpandedRankSignals(prev => {
      const next = new Set(prev);
      if (next.has(changeId)) {
        next.delete(changeId);
      } else {
        next.add(changeId);
      }
      return next;
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
        const rankSignalCount = change.movedUp.length + change.movedDown.length;
        const showRankSignals = expandedRankSignals.has(changeId);
        const hasMeaningfulChanges =
          change.added.length > 0 ||
          change.removed.length > 0 ||
          change.movedUp.length > 0 ||
          change.movedDown.length > 0;

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

              <div className="flex flex-wrap items-center gap-2">
                {rankSignalCount > 0 && (
                  <button
                    onClick={() => toggleRankSignals(changeId)}
                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    {showRankSignals ? 'Hide Rank Signals' : `View Rank Signals (${rankSignalCount})`}
                  </button>
                )}

                {!hasAnalysis && hasMeaningfulChanges && (
                  <button
                    onClick={() => handleAnalyze(change, idx)}
                    disabled={isAnalyzing}
                    className="flex items-center space-x-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
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
            </div>

            {showRankSignals && rankSignalCount > 0 && (
              <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                {change.movedUp.length > 0 && (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-4">
                    <h4 className="mb-3 flex items-center text-xs font-bold uppercase tracking-wider text-emerald-700">
                      <span className="mr-2 h-2 w-2 rounded-full bg-emerald-500"></span>
                      Ranking Up
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {change.movedUp.map(rankChange => (
                        <RankChangeCard key={`${rankChange.stock.symbol}-up`} change={rankChange} direction="up" />
                      ))}
                    </div>
                  </div>
                )}

                {change.movedDown.length > 0 && (
                  <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-4">
                    <h4 className="mb-3 flex items-center text-xs font-bold uppercase tracking-wider text-amber-700">
                      <span className="mr-2 h-2 w-2 rounded-full bg-amber-500"></span>
                      Ranking Down
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {change.movedDown.map(rankChange => (
                        <RankChangeCard key={`${rankChange.stock.symbol}-down`} change={rankChange} direction="down" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
            
            {!hasMeaningfulChanges && (
               <div className="text-sm text-gray-400 italic">No changes made to the portfolio on this day.</div>
            )}
          </div>
        );
      })}
    </div>
  );
};
