// src/components/import/FinanceDataImport.tsx - UPDATED
import React, { useState } from 'react';

export default function FinanceDataImport() {
  const [files, setFiles] = useState<{
    bank?: File;
    crypto?: File;
    expenses?: File;
  }>({});
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleFileChange = (type: 'bank' | 'crypto' | 'expenses', file: File) => {
    setFiles(prev => ({ ...prev, [type]: file }));
  };

  const handleImport = async () => {
    if (!files.bank && !files.crypto && !files.expenses) {
      alert('Please select at least one file to import');
      return;
    }

    setIsImporting(true);
    setResult('');

    try {
      const formData = new FormData();
      formData.append('userId', '368deac7-8526-45eb-927a-6a373c95d8c6');
      
      if (files.bank) formData.append('bank', files.bank);
      if (files.crypto) formData.append('crypto', files.crypto);
      if (files.expenses) formData.append('expenses', files.expenses);

      const response = await fetch('/api/import/finance', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(`✅ ${data.message}`);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setResult(`❌ ${data.message}`);
      }
    } catch (error: any) {
      setResult(`❌ Import failed: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="card p-6">
      <h3 className="text-xl font-semibold text-text-primary mb-4">
        Import Finance Data
      </h3>
      
      <div className="space-y-4">
        {/* Bank Statement Upload */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Bank Statement CSV (Optional)
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && handleFileChange('bank', e.target.files[0])}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
          />
        </div>

        {/* Crypto Holdings Upload */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Crypto Holdings (cryptoholdings.txt)
          </label>
          <input
            type="file"
            accept=".txt"
            onChange={(e) => e.target.files?.[0] && handleFileChange('crypto', e.target.files[0])}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
          />
        </div>

        {/* Manual Expenses Upload */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Manual Expenses (expenses.txt)
          </label>
          <input
            type="file"
            accept=".txt"
            onChange={(e) => e.target.files?.[0] && handleFileChange('expenses', e.target.files[0])}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
          />
        </div>

        {/* File Status */}
        <div className="space-y-2">
          <div className="text-sm">
            <span className="text-text-muted">Files selected:</span>
            <div className="mt-1 space-y-1">
              {files.bank && <div className="text-accent-success">✓ Bank Statement: {files.bank.name}</div>}
              {files.crypto && <div className="text-accent-success">✓ Crypto Holdings: {files.crypto.name}</div>}
              {files.expenses && <div className="text-accent-success">✓ Manual Expenses: {files.expenses.name}</div>}
              {!files.bank && !files.crypto && !files.expenses && (
                <div className="text-text-muted">No files selected</div>
              )}
            </div>
          </div>
        </div>

        {/* Import button */}
        <button
          onClick={handleImport}
          disabled={isImporting || (!files.bank && !files.crypto && !files.expenses)}
          className="w-full px-4 py-2 bg-accent-warning text-white rounded-lg hover:bg-accent-warning/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isImporting ? 'Importing...' : 'Import Finance Data'}
        </button>

        {/* Result */}
        {result && (
          <div className="p-3 bg-surface border border-border rounded-lg">
            <p className="text-sm text-text-primary">{result}</p>
          </div>
        )}
      </div>

      {/* Expected Data Preview */}
      <div className="mt-6 p-4 bg-accent-warning/5 border border-accent-warning/20 rounded-lg">
        <h4 className="font-medium text-accent-warning mb-2">📊 Expected Data from Your Files</h4>
        <div className="text-sm text-text-secondary space-y-1">
          <div><strong>Crypto:</strong> 11 holdings worth $130.72 (USDC, TRX, SOL, ETH, etc.)</div>
          <div><strong>Expenses:</strong> ~50+ transactions from Zepto, Swiggy, Blinkit, Supertails</div>
          <div><strong>Categories:</strong> Food, Pet Care, Groceries, Fitness, Personal Care</div>
          <div><strong>Total Value:</strong> ~₹25,000+ in expenses tracked</div>
        </div>
      </div>
    </div>
  );
}