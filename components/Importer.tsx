import React, { useState, useRef } from 'react';
import { Stock, PortfolioSnapshot } from '../types';
import { generateId, getSnapshots } from '../services/storageService';
import { GistSyncPanel } from './GistSyncPanel';

interface ImporterProps {
  onImport: (snapshot: PortfolioSnapshot) => void;
  onGenerateDemo: () => void;
  onRestore: (data: PortfolioSnapshot[]) => void;
}

export const Importer: React.FC<ImporterProps> = ({ onImport, onGenerateDemo, onRestore }) => {
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'manual' | 'script' | 'backup' | 'cloud'>('script');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            // Price and changePercent are optional/ignored
          }));
        }
      } else {
        const lines = trimmed.split('\n');
        stocks = lines.map(line => {
           const parts = line.split(/[\s\t,]+/);
           return {
             name: parts[0] || 'Unknown',
             symbol: parts[1] || `SYM-${Math.floor(Math.random()*1000)}`,
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

  const handleExport = () => {
    const data = getSnapshots();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xueqiu-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          // Basic validation
          if (parsed.length > 0 && (!parsed[0].id || !parsed[0].stocks)) {
             throw new Error("Invalid format: Missing id or stocks in snapshot");
          }
          // Directly restore without confirmation as it's a deliberate action
          onRestore(parsed);
        } else {
          setError("Invalid file format: Expected an array of snapshots.");
        }
      } catch (err) {
        setError("Failed to parse file: " + err);
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const extractionScript = `// 1. Open the Xueqiu stock list page (e.g. https://xueqiu.com/u/9430706524#/stock)
// 2. Press F12 -> Console.
// 3. Paste and Enter.

(function() {
  const stocks = [];
  const rows = document.querySelectorAll('tr');

  rows.forEach(row => {
    // Strategy: Find the link that points to a stock detail page (/S/SYMBOL)
    const link = row.querySelector('a[href^="/S/"]');
    
    if (link) {
      // Get symbol from href (e.g., /S/AAPL -> AAPL, /S/00700 -> 00700)
      const href = link.getAttribute('href');
      const symbol = href.replace('/S/', '');
      
      // The name usually sits inside this link or in the text content of the link
      let name = link.innerText.trim();
      if (name.includes('\\n')) {
        name = name.split('\\n')[0].trim();
      }
      
      // We no longer scrape price or change percent as requested.

      if (symbol && name) {
        stocks.push({
          name: name,
          symbol: symbol
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
        <h2 className="text-xl font-bold text-gray-900">Data Management</h2>
        <p className="text-gray-500 text-sm mt-1">
          Import new data or manage your backup.
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
        <button
          className={`pb-2 px-4 text-sm font-medium transition-colors ${activeTab === 'backup' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('backup')}
        >
          Backup & Restore
        </button>
        <button
          className={`pb-2 px-4 text-sm font-medium transition-colors ${activeTab === 'cloud' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('cloud')}
        >
          Cloud Sync
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

          <div className="mt-4">
             <button
              onClick={handleParse}
              disabled={!textInput}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Snapshot
            </button>
          </div>
        </div>
      )}

      {activeTab === 'manual' && (
        <div className="space-y-4">
           <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
             Enter stocks line by line. Format: <code>Name Symbol</code>
           </div>
           <textarea
              className="w-full h-48 p-4 bg-white border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Tencent 00700&#10;Alibaba BABA"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
            <button
              onClick={handleParse}
              disabled={!textInput}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Snapshot
            </button>
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
            <h3 className="text-sm font-bold text-yellow-900 mb-2">Backup & Restore</h3>
            <p className="text-sm text-yellow-800">
              Download your entire portfolio history as a JSON file, or restore from a previous backup.
              <br/>
              <strong>Warning:</strong> Restoring will overwrite all current data.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
              <h4 className="font-semibold text-gray-900 mb-2">Export Data</h4>
              <p className="text-xs text-gray-500 mb-4">Save your current history to a local file.</p>
              <button
                onClick={handleExport}
                className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download JSON
              </button>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
              <h4 className="font-semibold text-gray-900 mb-2">Import Data</h4>
              <p className="text-xs text-gray-500 mb-4">Restore history from a backup file.</p>
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleImportFile}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Upload JSON
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
             <h4 className="font-semibold text-gray-900 mb-2">Demo Data</h4>
             <button
              onClick={onGenerateDemo}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Generate Demo Data
            </button>
          </div>
        </div>
      )}

      {activeTab === 'cloud' && (
        <GistSyncPanel onDataRestored={() => onRestore(getSnapshots())} />
      )}
    </div>
  );
};