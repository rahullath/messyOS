// src/components/import/LoopHabitsImport.tsx
import React, { useState } from 'react';

export default function LoopHabitsImport() {
  const [files, setFiles] = useState<{
    habits?: File;
    checkmarks?: File;
    scores?: File;
  }>({});
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleFileChange = (type: 'habits' | 'checkmarks' | 'scores', file: File) => {
    setFiles(prev => ({ ...prev, [type]: file }));
  };

  const handleImport = async () => {
    if (!files.habits || !files.checkmarks || !files.scores) {
      alert('Please select all three CSV files');
      return;
    }

    setIsImporting(true);
    setResult('');

    try {
      const formData = new FormData();
      formData.append('userId', '368deac7-8526-45eb-927a-6a373c95d8c6'); // We'll get this from auth
      formData.append('habits', files.habits);
      formData.append('checkmarks', files.checkmarks);
      formData.append('scores', files.scores);

      const response = await fetch('/api/import/loop-habits', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(`✅ ${data.message}`);
        // Refresh the page to show imported habits
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
        Import Loop Habits Data
      </h3>
      
      <div className="space-y-4">
        {/* File uploads */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Habits.csv
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && handleFileChange('habits', e.target.files[0])}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Checkmarks.csv
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && handleFileChange('checkmarks', e.target.files[0])}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Scores.csv
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && handleFileChange('scores', e.target.files[0])}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
          />
        </div>

        {/* Import button */}
        <button
          onClick={handleImport}
          disabled={isImporting || !files.habits || !files.checkmarks || !files.scores}
          className="w-full px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isImporting ? 'Importing...' : 'Import Habits'}
        </button>

        {/* Result */}
        {result && (
          <div className="p-3 bg-surface border border-border rounded-lg">
            <p className="text-sm text-text-primary">{result}</p>
          </div>
        )}
      </div>
    </div>
  );
}
