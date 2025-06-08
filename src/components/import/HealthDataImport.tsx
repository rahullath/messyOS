// src/components/import/HealthDataImport.tsx - UPDATED FOR REAL FORMAT
import React, { useState } from 'react';

export default function HealthDataImport() {
  const [files, setFiles] = useState<{
    sleep?: File;
    heartRate?: File;
    stress?: File;
    steps?: File;
  }>({});
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleFileChange = (type: 'sleep' | 'heartRate' | 'stress' | 'steps', file: File) => {
    setFiles(prev => ({ ...prev, [type]: file }));
  };

  const handleImport = async () => {
    if (!files.sleep || !files.heartRate || !files.stress) {
      alert('Please select at least sleep, heart rate, and stress files (steps is optional)');
      return;
    }

    setIsImporting(true);
    setResult('');

    try {
      const formData = new FormData();
      formData.append('userId', '368deac7-8526-45eb-927a-6a373c95d8c6'); // User ID
      formData.append('sleep', files.sleep);
      formData.append('heartRate', files.heartRate);
      formData.append('stress', files.stress);
      if (files.steps) {
        formData.append('steps', files.steps);
      }

      const response = await fetch('/api/import/health', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(`✅ ${data.message}`);
        setTimeout(() => {
          window.location.href = '/health';
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
        <div className="w-12 h-12 bg-accent-primary/10 rounded-lg flex items-center justify-center">
          <span className="text-2xl">🏥</span>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-text-primary">
            Import Huawei Health Data
          </h3>
          <p className="text-text-secondary text-sm">
            Import sleep, heart rate, stress, and step data from your Huawei Band 9
          </p>
        </div>
      </div>
      
      {/* Real Format Instructions */}
      <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-accent-primary mb-2">📱 Your Actual Data Format</h4>
        <div className="text-sm text-text-secondary space-y-1">
          <p><strong>sleep.txt:</strong> "6 h 30 min (08/06)" format with month headers</p>
          <p><strong>heartrate.txt:</strong> "June 8: 55-130 bpm" format</p>
          <p><strong>stress.txt:</strong> "AVG 27 Low - 08/06" format</p>
          <p><strong>steps.txt:</strong> "June 8: 3,337 steps" format (optional)</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Sleep Data Upload */}
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-text-secondary mb-2">
            <span className="text-lg">😴</span>
            <span>Sleep Data (sleep.txt)</span>
            <span className="text-accent-error">*</span>
          </label>
          <input
            type="file"
            accept=".txt,.csv"
            onChange={(e) => e.target.files?.[0] && handleFileChange('sleep', e.target.files[0])}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-accent-primary file:text-white file:text-sm hover:file:bg-accent-primary/90"
          />
          {files.sleep && (
            <p className="text-xs text-accent-success mt-1">✓ {files.sleep.name} selected</p>
          )}
        </div>

        {/* Heart Rate Data Upload */}
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-text-secondary mb-2">
            <span className="text-lg">❤️</span>
            <span>Heart Rate Data (heartrate.txt)</span>
            <span className="text-accent-error">*</span>
          </label>
          <input
            type="file"
            accept=".txt,.csv"
            onChange={(e) => e.target.files?.[0] && handleFileChange('heartRate', e.target.files[0])}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-accent-primary file:text-white file:text-sm hover:file:bg-accent-primary/90"
          />
          {files.heartRate && (
            <p className="text-xs text-accent-success mt-1">✓ {files.heartRate.name} selected</p>
          )}
        </div>

        {/* Stress Data Upload */}
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-text-secondary mb-2">
            <span className="text-lg">😰</span>
            <span>Stress Data (stress.txt)</span>
            <span className="text-accent-error">*</span>
          </label>
          <input
            type="file"
            accept=".txt,.csv"
            onChange={(e) => e.target.files?.[0] && handleFileChange('stress', e.target.files[0])}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-accent-primary file:text-white file:text-sm hover:file:bg-accent-primary/90"
          />
          {files.stress && (
            <p className="text-xs text-accent-success mt-1">✓ {files.stress.name} selected</p>
          )}
        </div>

        {/* Steps Data Upload (Optional) */}
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-text-secondary mb-2">
            <span className="text-lg">🚶</span>
            <span>Steps Data (steps.txt)</span>
            <span className="text-text-muted text-xs">(optional)</span>
          </label>
          <input
            type="file"
            accept=".txt,.csv"
            onChange={(e) => e.target.files?.[0] && handleFileChange('steps', e.target.files[0])}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-accent-primary file:text-white file:text-sm hover:file:bg-accent-primary/90"
          />
          {files.steps && (
            <p className="text-xs text-accent-success mt-1">✓ {files.steps.name} selected</p>
          )}
        </div>

        {/* Import Button */}
        <button
          onClick={handleImport}
          disabled={isImporting || !files.sleep || !files.heartRate || !files.stress}
          className="w-full flex items-center justify-center px-4 py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isImporting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Importing Health Data...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import Health Data
            </>
          )}
        </button>

        {/* Progress Indicator */}
        {isImporting && (
          <div className="space-y-2">
            <div className="text-sm text-text-secondary">Import Progress:</div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-accent-primary rounded-full animate-pulse"></div>
                <span className="text-sm text-text-secondary">Parsing sleep patterns...</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-accent-error rounded-full animate-pulse"></div>
                <span className="text-sm text-text-secondary">Processing heart rate data...</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-accent-warning rounded-full animate-pulse"></div>
                <span className="text-sm text-text-secondary">Analyzing stress levels...</span>
              </div>
              {files.steps && (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-accent-success rounded-full animate-pulse"></div>
                  <span className="text-sm text-text-secondary">Counting daily steps...</span>
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
                Redirecting to health dashboard...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Data Privacy Note */}
      <div className="mt-6 p-3 bg-surface-hover rounded-lg">
        <div className="flex items-start space-x-2">
          <span className="text-accent-primary mt-1">🔒</span>
          <div className="text-xs text-text-muted">
            <strong className="text-text-secondary">Privacy:</strong> Your health data is stored securely in your personal Supabase database. Only you have access to this information. Data is used solely for personal analytics and insights.
          </div>
        </div>
      </div>

      {/* Expected Data Sample - Real Format */}
      <details className="mt-4">
        <summary className="text-sm font-medium text-text-secondary cursor-pointer hover:text-text-primary">
          📋 View Your Actual File Formats
        </summary>
        <div className="mt-3 space-y-4 text-xs">
          <div>
            <div className="font-medium text-text-primary mb-1">sleep.txt (Your Format):</div>
            <div className="bg-surface p-2 rounded font-mono text-text-muted">
              June 2025<br/>
              6 h 30 min (08/06)<br/>
              20 min (07/06)<br/>
              1 h 46 min (06/06)<br/>
              14 h 7 min (05/06)
            </div>
          </div>
          
          <div>
            <div className="font-medium text-text-primary mb-1">heartrate.txt (Your Format):</div>
            <div className="bg-surface p-2 rounded font-mono text-text-muted">
              June 2025<br/>
              June 8: 55-130 bpm<br/>
              June 7: 47-155 bpm<br/>
              June 6: 53-105 bpm<br/>
              June 5: 48-131 bpm
            </div>
          </div>
          
          <div>
            <div className="font-medium text-text-primary mb-1">stress.txt (Your Format):</div>
            <div className="bg-surface p-2 rounded font-mono text-text-muted">
              June 2025<br/>
              AVG 27 Low - 08/06<br/>
              AVG 32 Normal - 07/06<br/>
              AVG 29 Low - 06/06<br/>
              AVG 21 Low - 05/06
            </div>
          </div>

          <div>
            <div className="font-medium text-text-primary mb-1">steps.txt (Your Format - Optional):</div>
            <div className="bg-surface p-2 rounded font-mono text-text-muted">
              June 2025<br/>
              June 8: 3,337 steps<br/>
              June 7: 7,748 steps<br/>
              June 6: 166 steps<br/>
              June 5: 2,904 steps
            </div>
          </div>
        </div>
      </details>

      {/* Data Insights Preview */}
      <div className="mt-6 p-4 bg-gradient-to-r from-accent-primary/10 to-accent-purple/10 border border-accent-primary/20 rounded-lg">
        <h4 className="font-medium text-accent-primary mb-2">🧠 What You'll Get After Import:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-text-secondary">
          <div>
            <div className="font-medium text-text-primary">Sleep Analysis:</div>
            <ul className="text-xs space-y-1 mt-1">
              <li>• Average sleep: ~8.5 hours</li>
              <li>• Sleep quality trends</li>
              <li>• Best/worst sleep days</li>
              <li>• Correlation with habits</li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-text-primary">Heart Rate Insights:</div>
            <ul className="text-xs space-y-1 mt-1">
              <li>• Resting HR: ~50-55 bpm (excellent!)</li>
              <li>• Max HR: ~130-170 bpm</li>
              <li>• Heart rate variability</li>
              <li>• Exercise impact analysis</li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-text-primary">Stress Monitoring:</div>
            <ul className="text-xs space-y-1 mt-1">
              <li>• Mostly "Low" stress levels</li>
              <li>• Stress pattern identification</li>
              <li>• Correlation with habits</li>
              <li>• Daily stress trends</li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-text-primary">Activity Tracking:</div>
            <ul className="text-xs space-y-1 mt-1">
              <li>• Daily step counts</li>
              <li>• Activity vs rest days</li>
              <li>• Goal achievement rates</li>
              <li>• Movement patterns</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}