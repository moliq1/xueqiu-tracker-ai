import React, { useState } from 'react';
import { Stock, PortfolioSnapshot } from '../types';
import { generateId } from '../services/storageService';

interface ImporterProps {
  onImport: (snapshot: PortfolioSnapshot) => void;
  onGenerateDemo: () => void;
}

export const Importer: React.FC<ImporterProps> = ({ onImport, onGenerateDemo }) => {
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'manual' | 'script'>('script');

  const handleParse = () => {
    try {
      setError('');
      let stocks: Stock[] = [];
      const trimmed = textInput.trim();

      if (trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          stocks = parsed.map((item: any) => ({
            symbol: item.symbol || item.code || 'UNKNOWN',
            name: item.name || item.stockName || 'Unknown Stock',
            price: Number(item.price || item.current || 0),
            changePercent: Number(item.percent || item.change || item.changePercent || 0)
          }));
        }
      } else {
        const lines = trimmed.split('\n');
        stocks = lines.map(line => {
           const parts = line.split(/[\s\t,]+/);
           return {
             name: parts[0] || 'Unknown',
             symbol: parts[1] || `SYM-${Math.floor(Math.random()*1000)}`,
             price: 0,
             changePercent: 0
           };
        }).filter(s => s.name.length > 0);
      }

      if (stocks.length === 0) {
        throw new Error("No valid stocks found in input");
      }

      const snapshot: PortfolioSnapshot = {
        id: generateId(),
        date: new Date().toISOString(),
        timestamp: Date.now(),
        stocks
      };

      onImport(snapshot);
      setTextInput('');
    } catch (e) {
      setError("Failed to parse input. Please ensure it's a JSON array of stocks or line-separated list.");
    }
  };

  const extractionScript = `// 1. Open the Xueqiu stock list page (e.g. https://xueqiu.com/u/9430706524#/stock)
// 2. Press F12 -> Console.
// 3. Paste and Enter.

(function() {
  const stocks = [];
  const rows = document.querySelectorAll('tr');

  rows.forEach(row => {
    // Strategy: Find the link that points to a stock detail page (/S/SYMBOL)
    // This is much more accurate than regexing raw text for US/HK stocks.
    const link = row.querySelector('a[href^="/S/"]');
    
    if (link) {
      // Get symbol from href (e.g., /S/AAPL -> AAPL, /S/00700 -> 00700)
      const href = link.getAttribute('href');
      const symbol = href.replace('/S/', '');
      
      // The name usually sits inside this link or in the text content of the link
      // Fix: name might contain "Name\\nMarket\\nSymbol", we only want "Name"
      let name = link.innerText.trim();
      if (name.includes('\\n')) {
        name = name.split('\\n')[0].trim();
      }
      
      // Try to find price/percent cells (usually subsequent tds)
      const cells = row.querySelectorAll('td');
      let price = 0;
      let percent = 0;
      
      // Heuristic: Iterate cells to find numbers
      // Usually Price is around index 1 or 2
      if (cells.length >= 3) {
        cells.forEach(cell => {
             const txt = cell.innerText.trim().replace(/,/g, '').replace('%', '');
             // Check if it looks like a price or percent
             if (!isNaN(parseFloat(txt))) {
                 // Simple heuristic assignment can be refined if column structure is known fixed
             }
        });
        
        // Specific to standard Xueqiu Layout:
        // Name(Symbol) | Current Price | Change%
        if(cells[1]) price = parseFloat(cells[1].innerText.replace(/,/g, '')) || 0;
        if(cells[2]) percent = parseFloat(cells[2].innerText.replace('%', '')) || 0;
      }

      if (symbol && name) {
        stocks.push({
          name: name,
          symbol: symbol,
          price: price,
          changePercent: percent
        });
      }
    }
  });

  if (stocks.length > 0) {
    copy(JSON.stringify(stocks)); 
    console.log("✅ Success! " + stocks.length + " stocks copied.");
    alert("✅ Copied " + stocks.length + " stocks! Paste them in the app now.");
  } else {
    alert("❌ No stocks found. Please make sure the table is loaded.");
  }
})();`;

  const copyScriptToClipboard = () => {
    navigator.clipboard.writeText(extractionScript);
    alert("Script copied! Now go to the Xueqiu tab, open Console (F12), and paste it.");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Import Portfolio Data</h2>
        <p className="text-gray-500 text-sm mt-1">
          Due to browser security (CORS), we cannot auto-fetch data directly.
        </p>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`pb-2 px-4 text-sm font-medium transition-colors ${activeTab === 'script' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('script')}
        >
          Auto-Extract Script
        </button>
        <button
          className={`pb-2 px-4 text-sm font-medium transition-colors ${activeTab === 'manual' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('manual')}
        >
          Manual Entry
        </button>
      </div>

      {activeTab === 'script' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h3 className="text-sm font-bold text-blue-900 mb-2">How to grab data automatically:</h3>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
              <li>Open the <a href="https://xueqiu.com/u/9430706524#/stock" target="_blank" rel="noreferrer" className="underline font-bold">Target Portfolio Page</a> in a new tab.</li>
              <li>Press <kbd className="bg-white px-1 rounded border border-blue-200">F12</kbd> (or Right Click → Inspect).</li>
              <li>Click the <strong>Console</strong> tab.</li>
              <li>Copy the code below, paste it into the Console, and hit Enter.</li>
              <li>The data will be copied to your clipboard automatically.</li>
              <li>Come back here and paste into the box below.</li>
            </ol>
          </div>
          
          <div className="relative">
            <textarea 
              readOnly 
              className="w-full h-32 p-3 bg-slate-900 text-slate-300 font-mono text-xs rounded-lg"
              value={extractionScript}
            />
            <button 
              onClick={copyScriptToClipboard}
              className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white text-xs px-2 py-1 rounded transition-colors backdrop-blur-sm"
            >
              Copy Code
            </button>
          </div>
        </div>
      )}

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Paste Data Here (JSON)
        </label>
        <textarea
          className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          placeholder="Paste the JSON copied from the script here..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
        />
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleParse}
          disabled={!textInput}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Snapshot
        </button>
        <button
          onClick={onGenerateDemo}
          className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Generate Demo Data
        </button>
      </div>
    </div>
  );
};