import React from 'react';
import { Stock } from '../types';

interface StockCardProps {
  stock: Stock;
  status?: 'added' | 'removed' | 'neutral';
}

const getMarketType = (symbol: string) => {
  const upper = symbol.toUpperCase();
  if (upper.startsWith('ZH')) return 'COMBO';
  if (upper.startsWith('HK') || /^\d{5}$/.test(upper)) return 'HK';
  if (upper.startsWith('SH') || upper.startsWith('SZ')) return 'CN';
  if (/^[A-Z]+$/.test(upper)) return 'US';
  return 'OTHER';
};

const getMarketBadge = (type: string) => {
  switch (type) {
    case 'CN': return <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">A股</span>;
    case 'HK': return <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">港股</span>;
    case 'US': return <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">美股</span>;
    case 'COMBO': return <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">组合</span>;
    default: return <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">其他</span>;
  }
};

export const StockCard: React.FC<StockCardProps> = ({ stock, status = 'neutral' }) => {
  const marketType = getMarketType(stock.symbol);
  
  let borderColor = "border-gray-200";
  let badgeColor = "bg-gray-100 text-gray-600";
  let badgeText = "";
  let bgColor = "bg-white";

  // Override styles based on status
  if (status === 'added') {
    borderColor = "border-green-300";
    bgColor = "bg-green-50/30";
    badgeColor = "bg-green-100 text-green-700";
    badgeText = "NEW";
  } else if (status === 'removed') {
    borderColor = "border-red-300";
    bgColor = "bg-red-50/30";
    badgeColor = "bg-red-100 text-red-700";
    badgeText = "SOLD";
  }

  return (
    <div className={`relative p-4 rounded-xl border ${borderColor} shadow-sm transition-all hover:shadow-md ${bgColor} flex flex-col justify-between h-full`}>
      <div>
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center space-x-2">
             {getMarketBadge(marketType)}
             {status !== 'neutral' && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                  {badgeText}
                </span>
             )}
          </div>
        </div>

        <div className="mb-3">
          <h3 className="font-bold text-gray-900 leading-tight mb-0.5 truncate" title={stock.name}>{stock.name}</h3>
          <p className="text-xs text-gray-500 font-mono">{stock.symbol}</p>
        </div>
      </div>
      
      <div className="flex justify-end items-center border-t border-gray-100 pt-3">
        {/* Link to Xueqiu Quote */}
        <a 
          href={`https://xueqiu.com/S/${stock.symbol}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center"
        >
          行情
          <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </a>
      </div>
    </div>
  );
};