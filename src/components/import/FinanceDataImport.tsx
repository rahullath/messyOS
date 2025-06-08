// src/components/import/FinanceDataImport.tsx
import React, { useState } from 'react';

export default function FinanceDataImport() {
  const [files, setFiles] = useState<{
    expenses?: File;
    crypto?: File;
    bankStatement?: File;
  }>({});
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleFileChange = (type: 'expenses' | 'crypto' | 'bankStatement', file: File) => {
    setFiles(prev => ({ ...prev, [type]: file }));
  };

  const handleImport = async () => {
    if (!files.expenses && !files.crypto && !files.bankStatement) {
      alert('Please select at least one file to import');
      return;
    }

    setIsImporting(true);
    setResult('');

    try {
      const formData = new FormData();
      formData.append('userId', '368deac7-8526-45eb-927a-6a373c95d8c6'); // User ID
      
      if (files.expenses) formData.append('expenses', files.expenses);
      if (files.crypto) formData.append('crypto', files.crypto);
      if (files.bankStatement) formData.append('bankStatement', files.bankStatement);

      const response = await fetch('/api/import/finance', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(`✅ ${data.message}`);
        setTimeout(() => {
          window.location.href = '/finance';
        }, 2000);
      } else {
        setResult(`❌ ${data.error || 'Import failed'}`);
      }
    } catch (error: any) {
      setResult(`❌ Import failed: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-accent-warning/10 rounded-lg flex items-center justify-center">
          <span className="text-2xl">💰</span>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-text-primary">
            Import Financial Data
          </h3>
          <p className="text-text-secondary text-sm">
            Import expenses, crypto holdings, and bank statements for complete financial tracking
          </p>
        </div>
      </div>
      
      {/* Your Current Financial Situation */}
      <div className="bg-accent-warning/10 border border-accent-warning/20 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-accent-warning mb-2">💡 Your Financial Profile</h4>
        <div className="text-sm text-text-secondary space-y-1">
          <p><strong>Monthly Expenses:</strong> ~₹40,546 (Food: ₹12,807, Pet: ₹3,910, Rent: ₹10,872)</p>
          <p><strong>Crypto Portfolio:</strong> $130.72 across 11 tokens (USDC, TRX, SOL, ETH, WBTC)</p>
          <p><strong>Financial Runway:</strong> 2.4 months with current spending</p>
          <p><strong>Job Target:</strong> July 31st for September 1st comfort</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Expense Data Upload */}
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-text-secondary mb-2">
            <span className="text-lg">📱</span>
            <span>Expense Data (expenses.txt)</span>
            <span className="text-text-muted text-xs">(Zepto, Swiggy, Blinkit, Supertails)</span>
          </label>
          <input
            type="file"
            accept=".txt,.csv"
            onChange={(e) => e.target.files?.[0] && handleFileChange('expenses', e.target.files[0])}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-accent-warning file:text-white file:text-sm hover:file:bg-accent-warning/90"
          />
          {files.expenses && (
            <p className="text-xs text-accent-success mt-1">✓ {files.expenses.name} selected</p>
          )}
        </div>

        {/* Crypto Holdings Upload */}
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-text-secondary mb-2">
            <span className="text-lg">₿</span>
            <span>Crypto Holdings (crypto.txt)</span>
            <span className="text-text-muted text-xs">(Trust Wallet format)</span>
          </label>
          <input
            type="file"
            accept=".txt,.csv"
            onChange={(e) => e.target.files?.[0] && handleFileChange('crypto', e.target.files[0])}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-accent-warning file:text-white file:text-sm hover:file:bg-accent-warning/90"
          />
          {files.crypto && (
            <p className="text-xs text-accent-success mt-1">✓ {files.crypto.name} selected</p>
          )}
        </div>

        {/* Bank Statement Upload */}
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-text-secondary mb-2">
            <span className="text-lg">🏦</span>
            <span>Bank Statement (statement.csv)</span>
            <span className="text-text-muted text-xs">(Jupiter Bank format)</span>
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && handleFileChange('bankStatement', e.target.files[0])}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-accent-warning file:text-white file:text-sm hover:file:bg-accent-warning/90"
          />
          {files.bankStatement && (
            <p className="text-xs text-accent-success mt-1">✓ {files.bankStatement.name} selected</p>
          )}
        </div>

        {/* Import Button */}
        <button
          onClick={handleImport}
          disabled={isImporting || (!files.expenses && !files.crypto && !files.bankStatement)}
          className="w-full flex items-center justify-center px-4 py-3 bg-accent-warning text-white rounded-lg hover:bg-accent-warning/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isImporting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Importing Financial Data...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import Financial Data
            </>
          )}
        </button>

        {/* Progress Indicator */}
        {isImporting && (
          <div className="space-y-2">
            <div className="text-sm text-text-secondary">Import Progress:</div>
            <div className="space-y-1">
              {files.expenses && (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-accent-warning rounded-full animate-pulse"></div>
                  <span className="text-sm text-text-secondary">Processing expense data...</span>
                </div>
              )}
              {files.crypto && (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-accent-primary rounded-full animate-pulse"></div>
                  <span className="text-sm text-text-secondary">Analyzing crypto portfolio...</span>
                </div>
              )}
              {files.bankStatement && (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-accent-success rounded-full animate-pulse"></div>
                  <span className="text-sm text-text-secondary">Categorizing bank transactions...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`p-4 rounded-lg border ${
            result.startsWith('✅') 
              ? 'bg-accent-success/10 border-accent-success/20 text-accent-success'
              : 'bg-accent-error/10 border-accent-error/20 text-accent-error'
          }`}>
            <p className="text-sm font-medium">{result}</p>
            {result.startsWith('✅') && (
              <p className="text-xs mt-1 opacity-80">
                Redirecting to finance dashboard...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Expected Data Formats */}
      <details className="mt-4">
        <summary className="text-sm font-medium text-text-secondary cursor-pointer hover:text-text-primary">
          📋 View Your Expected File Formats
        </summary>
        <div className="mt-3 space-y-4 text-xs">
          <div>
            <div className="font-medium text-text-primary mb-1">expenses.txt (Your Manual Format):</div>
            <div className="bg-surface p-2 rounded font-mono text-text-muted">
              april - zepto -<br/>
              2/4 - oil+ocean peach drink - 221 total<br/>
              4/4 - 436 total<br/>
              <br/>
              Swiggy Food + Instamart<br/>
              ORDER #205950758291912 | Sun, May 11, 2025<br/>
              Total Paid: 222<br/>
              <br/>
              17/5 - Pet Poop Bags 299, Bread 53; Total 550
            </div>
          </div>
          
          <div>
            <div className="font-medium text-text-primary mb-1">crypto.txt (Trust Wallet Format):</div>
            <div className="bg-surface p-2 rounded font-mono text-text-muted">
              Trust Wallet<br/>
              Total Balance: $130.72<br/>
              1. USDC (Base)<br/>
              Price: $0.99 | Change: -0.0%<br/>
              Quantity: 62.192612 | Value: $62.18
            </div>
          </div>
          
          <div>
            <div className="font-medium text-text-primary mb-1">statement.csv (Jupiter Bank Format):</div>
            <div className="bg-surface p-2 rounded font-mono text-text-muted">
              Date,Value Date,Particulars,Tran Type,Withdrawals,Deposits,Balance<br/>
              21-03-2025,21-03-2025,UPIOUT/spotify.bdsi@icici,TFR,119,,7128.98<br/>
              22-03-2025,22-03-2025,UPI IN/shettyarjun29@okhdfcbank,TFR,,1571,7247.98
            </div>
          </div>
        </div>
      </details>

      {/* Financial Insights Preview */}
      <div className="mt-6 p-4 bg-gradient-to-r from-accent-warning/10 to-accent-error/10 border border-accent-warning/20 rounded-lg">
        <h4 className="font-medium text-accent-warning mb-2">🧠 What You'll Get After Import:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-text-secondary">
          <div>
            <div className="font-medium text-text-primary">Expense Analysis:</div>
            <ul className="text-xs space-y-1 mt-1">
              <li>• Monthly spending: ₹40,546</li>
              <li>• Top categories: Food (₹12,807), Pet (₹3,910)</li>
              <li>• Vendor breakdown across 8+ platforms</li>
              <li>• MK Retail optimization opportunities</li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-text-primary">Portfolio Tracking:</div>
            <ul className="text-xs space-y-1 mt-1">
              <li>• Crypto value: $130.72 (₹10,850)</li>
              <li>• 11 tokens across 4 chains</li>
              <li>• Real-time price updates</li>
              <li>• Portfolio diversification analysis</li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-text-primary">Cash Flow Management:</div>
            <ul className="text-xs space-y-1 mt-1">
              <li>• 2.4-month financial runway</li>
              <li>• Job search timeline tracking</li>
              <li>• Budget optimization recommendations</li>
              <li>• Emergency fund analysis</li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-text-primary">AI Recommendations:</div>
            <ul className="text-xs space-y-1 mt-1">
              <li>• Reduce MK Retail to ₹1,500/month</li>
              <li>• Cut convenience purchases by 50%</li>
              <li>• Target July 31 job deadline</li>
              <li>• Optimize to ₹36,546/month budget</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Job Search Financial Tracker */}
      <div className="mt-6 p-4 bg-accent-primary/10 border border-accent-primary/20 rounded-lg">
        <h4 className="font-medium text-accent-primary mb-2">🎯 Job Search Financial Strategy</h4>
        <div className="text-sm text-text-secondary space-y-2">
          <div className="flex justify-between">
            <span>Current Runway:</span>
            <span className="font-medium text-text-primary">2.4 months</span>
          </div>
          <div className="flex justify-between">
            <span>Optimized Runway:</span>
            <span className="font-medium text-accent-success">3.0 months</span>
          </div>
          <div className="flex justify-between">
            <span>Target Job Date:</span>
            <span className="font-medium text-accent-warning">July 31, 2025</span>
          </div>
          <div className="flex justify-between">
            <span>Comfort Zone:</span>
            <span className="font-medium text-accent-primary">September 1, 2025</span>
          </div>
        </div>
        <div className="mt-3 p-2 bg-accent-primary/10 rounded text-xs text-text-secondary">
          Your Y Combinator background + Web3 expertise + 205 GitHub contributions = strong position. 
          Financial optimization buys you time for the right opportunity.
        </div>
      </div>
    </div>
  );
}