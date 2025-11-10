// src/components/import/EnhancedLoopHabitsImport.tsx
import React, { useState, useCallback } from 'react';
import type { ImportProgress, ImportSummary, ConflictResolution, ImportError } from '../../lib/import/enhanced-loop-habits';

interface ImportState {
  stage: 'idle' | 'uploading' | 'processing' | 'conflicts' | 'complete' | 'error';
  progress: ImportProgress | null;
  summary: ImportSummary | null;
  conflicts: ConflictResolution[];
  error: string | null;
}

export default function EnhancedLoopHabitsImport() {
  const [files, setFiles] = useState<{
    habits?: File;
    checkmarks?: File;
    scores?: File;
  }>({});
  
  const [importState, setImportState] = useState<ImportState>({
    stage: 'idle',
    progress: null,
    summary: null,
    conflicts: [],
    error: null
  });

  const [conflictResolutions, setConflictResolutions] = useState<ConflictResolution[]>([]);

  const handleFileChange = (type: 'habits' | 'checkmarks' | 'scores', file: File) => {
    setFiles(prev => ({ ...prev, [type]: file }));
    // Reset state when files change
    if (importState.stage !== 'idle') {
      setImportState({
        stage: 'idle',
        progress: null,
        summary: null,
        conflicts: [],
        error: null
      });
    }
  };

  const validateFiles = (): string | null => {
    if (!files.habits) return 'Please select the Habits.csv file';
    if (!files.checkmarks) return 'Please select the Checkmarks.csv file';
    if (!files.scores) return 'Please select the Scores.csv file';
    
    // Check file sizes (reasonable limits)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (files.habits.size > maxSize) return 'Habits.csv file is too large (max 10MB)';
    if (files.checkmarks.size > maxSize) return 'Checkmarks.csv file is too large (max 10MB)';
    if (files.scores.size > maxSize) return 'Scores.csv file is too large (max 10MB)';
    
    return null;
  };

  const handleImport = async () => {
    const validationError = validateFiles();
    if (validationError) {
      setImportState(prev => ({ ...prev, stage: 'error', error: validationError }));
      return;
    }

    setImportState(prev => ({ ...prev, stage: 'uploading', error: null }));

    try {
      const formData = new FormData();
      formData.append('habits', files.habits!);
      formData.append('checkmarks', files.checkmarks!);
      formData.append('scores', files.scores!);
      
      if (conflictResolutions.length > 0) {
        formData.append('conflictResolutions', JSON.stringify(conflictResolutions));
      }

      const response = await fetch('/api/import/enhanced-loop-habits', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle streaming progress updates
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      setImportState(prev => ({ ...prev, stage: 'processing' }));

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const data = JSON.parse(line);
            
            if (data.type === 'progress') {
              setImportState(prev => ({ ...prev, progress: data.progress }));
            } else if (data.type === 'conflicts') {
              setImportState(prev => ({ 
                ...prev, 
                stage: 'conflicts', 
                conflicts: data.conflicts 
              }));
              setConflictResolutions(data.conflicts.map((c: ConflictResolution) => ({
                ...c,
                resolution: 'merge' // Default resolution
              })));
              return; // Wait for user to resolve conflicts
            } else if (data.type === 'complete') {
              setImportState(prev => ({ 
                ...prev, 
                stage: 'complete', 
                summary: data.summary 
              }));
              return;
            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          } catch (parseError) {
            console.warn('Failed to parse progress update:', line);
          }
        }
      }

    } catch (error: any) {
      console.error('Import error:', error);
      setImportState(prev => ({ 
        ...prev, 
        stage: 'error', 
        error: error.message || 'Import failed' 
      }));
    }
  };

  const handleConflictResolution = (habitName: string, resolution: ConflictResolution['resolution'], newName?: string) => {
    setConflictResolutions(prev => 
      prev.map(c => 
        c.habitName === habitName 
          ? { ...c, resolution, newName }
          : c
      )
    );
  };

  const proceedWithConflictResolutions = async () => {
    // Continue import with resolved conflicts
    await handleImport();
  };

  const resetImport = () => {
    setImportState({
      stage: 'idle',
      progress: null,
      summary: null,
      conflicts: [],
      error: null
    });
    setConflictResolutions([]);
  };

  const renderFileUpload = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Habits.csv *
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => e.target.files?.[0] && handleFileChange('habits', e.target.files[0])}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent-primary file:text-white hover:file:bg-accent-primary/90"
        />
        {files.habits && (
          <p className="text-xs text-accent-success mt-1">
            ✅ {files.habits.name} ({(files.habits.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Checkmarks.csv *
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => e.target.files?.[0] && handleFileChange('checkmarks', e.target.files[0])}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent-primary file:text-white hover:file:bg-accent-primary/90"
        />
        {files.checkmarks && (
          <p className="text-xs text-accent-success mt-1">
            ✅ {files.checkmarks.name} ({(files.checkmarks.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Scores.csv *
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => e.target.files?.[0] && handleFileChange('scores', e.target.files[0])}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent-primary file:text-white hover:file:bg-accent-primary/90"
        />
        {files.scores && (
          <p className="text-xs text-accent-success mt-1">
            ✅ {files.scores.name} ({(files.scores.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      <button
        onClick={handleImport}
        disabled={!files.habits || !files.checkmarks || !files.scores}
        className="w-full px-4 py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        Start Enhanced Import
      </button>
    </div>
  );

  const renderProgress = () => {
    if (!importState.progress) return null;

    const stageLabels = {
      validation: 'Validating Files',
      parsing: 'Parsing Data',
      conflict_resolution: 'Checking Conflicts',
      importing: 'Importing Data',
      calculating_streaks: 'Calculating Streaks',
      complete: 'Complete'
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-text-primary">
            {stageLabels[importState.progress.stage]}
          </h4>
          <span className="text-sm text-text-secondary">
            {importState.progress.progress}%
          </span>
        </div>
        
        <div className="w-full bg-surface-hover rounded-full h-2">
          <div 
            className="bg-accent-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${importState.progress.progress}%` }}
          />
        </div>
        
        <p className="text-sm text-text-secondary">
          {importState.progress.message}
          {importState.progress.details && (
            <span className="text-text-muted"> • {importState.progress.details}</span>
          )}
        </p>
      </div>
    );
  };

  const renderConflictResolution = () => (
    <div className="space-y-6">
      <div className="bg-accent-warning/10 border border-accent-warning/20 rounded-lg p-4">
        <h4 className="font-medium text-accent-warning mb-2">
          ⚠️ Habit Name Conflicts Detected
        </h4>
        <p className="text-sm text-text-secondary">
          Some habits in your import have the same names as existing habits. 
          Please choose how to handle each conflict:
        </p>
      </div>

      <div className="space-y-4">
        {importState.conflicts.map((conflict, index) => (
          <div key={index} className="border border-border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h5 className="font-medium text-text-primary">{conflict.habitName}</h5>
                <p className="text-sm text-text-secondary">
                  Existing: {conflict.existingHabit.total_entries} entries • 
                  Importing: {conflict.importedHabit.entries_count} entries
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                onClick={() => handleConflictResolution(conflict.habitName, 'merge')}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  conflictResolutions.find(c => c.habitName === conflict.habitName)?.resolution === 'merge'
                    ? 'bg-accent-success/20 border-accent-success text-accent-success'
                    : 'border-border text-text-secondary hover:border-accent-success'
                }`}
              >
                🔄 Merge
              </button>
              
              <button
                onClick={() => handleConflictResolution(conflict.habitName, 'replace')}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  conflictResolutions.find(c => c.habitName === conflict.habitName)?.resolution === 'replace'
                    ? 'bg-accent-warning/20 border-accent-warning text-accent-warning'
                    : 'border-border text-text-secondary hover:border-accent-warning'
                }`}
              >
                🔄 Replace
              </button>
              
              <button
                onClick={() => handleConflictResolution(conflict.habitName, 'skip')}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  conflictResolutions.find(c => c.habitName === conflict.habitName)?.resolution === 'skip'
                    ? 'bg-accent-error/20 border-accent-error text-accent-error'
                    : 'border-border text-text-secondary hover:border-accent-error'
                }`}
              >
                ⏭️ Skip
              </button>
              
              <button
                onClick={() => {
                  const newName = prompt(`Enter new name for "${conflict.habitName}":`, `${conflict.habitName} (Imported)`);
                  if (newName) {
                    handleConflictResolution(conflict.habitName, 'rename', newName);
                  }
                }}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  conflictResolutions.find(c => c.habitName === conflict.habitName)?.resolution === 'rename'
                    ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                    : 'border-border text-text-secondary hover:border-accent-primary'
                }`}
              >
                ✏️ Rename
              </button>
            </div>

            {conflictResolutions.find(c => c.habitName === conflict.habitName)?.resolution === 'rename' && (
              <div className="mt-2">
                <p className="text-sm text-accent-primary">
                  New name: {conflictResolutions.find(c => c.habitName === conflict.habitName)?.newName}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex space-x-3">
        <button
          onClick={proceedWithConflictResolutions}
          className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"
        >
          Continue Import
        </button>
        <button
          onClick={resetImport}
          className="px-4 py-2 border border-border text-text-secondary rounded-lg hover:border-accent-error hover:text-accent-error transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const renderSummary = () => {
    if (!importState.summary) return null;

    const { summary } = importState;

    return (
      <div className="space-y-6">
        {/* Success Header */}
        <div className={`rounded-lg p-4 ${
          summary.success 
            ? 'bg-accent-success/10 border border-accent-success/20' 
            : 'bg-accent-error/10 border border-accent-error/20'
        }`}>
          <h4 className={`font-medium mb-2 ${
            summary.success ? 'text-accent-success' : 'text-accent-error'
          }`}>
            {summary.success ? '✅ Import Completed Successfully!' : '❌ Import Failed'}
          </h4>
          <p className="text-sm text-text-secondary">
            Processing time: {(summary.processingTime / 1000).toFixed(1)}s
          </p>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-surface rounded-lg">
            <div className="text-2xl font-bold text-accent-success">{summary.importedHabits}</div>
            <div className="text-sm text-text-muted">Habits Imported</div>
          </div>
          <div className="text-center p-3 bg-surface rounded-lg">
            <div className="text-2xl font-bold text-accent-primary">{summary.importedEntries}</div>
            <div className="text-sm text-text-muted">Entries Imported</div>
          </div>
          <div className="text-center p-3 bg-surface rounded-lg">
            <div className="text-2xl font-bold text-accent-warning">{summary.conflicts.length}</div>
            <div className="text-sm text-text-muted">Conflicts Resolved</div>
          </div>
          <div className="text-center p-3 bg-surface rounded-lg">
            <div className="text-2xl font-bold text-accent-error">{summary.errors.length}</div>
            <div className="text-sm text-text-muted">Errors</div>
          </div>
        </div>

        {/* Recommendations */}
        {summary.recommendations.length > 0 && (
          <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-lg p-4">
            <h5 className="font-medium text-accent-primary mb-3">💡 Recommendations</h5>
            <ul className="space-y-2">
              {summary.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-text-secondary flex items-start">
                  <span className="mr-2">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Errors and Warnings */}
        {(summary.errors.length > 0 || summary.warnings.length > 0) && (
          <div className="space-y-3">
            {summary.errors.length > 0 && (
              <details className="bg-accent-error/5 border border-accent-error/20 rounded-lg p-4">
                <summary className="cursor-pointer font-medium text-accent-error">
                  ❌ Errors ({summary.errors.length})
                </summary>
                <div className="mt-3 space-y-2">
                  {summary.errors.map((error, index) => (
                    <div key={index} className="text-sm">
                      <p className="text-accent-error font-medium">{error.message}</p>
                      {error.details && (
                        <p className="text-text-muted text-xs mt-1">{error.details}</p>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {summary.warnings.length > 0 && (
              <details className="bg-accent-warning/5 border border-accent-warning/20 rounded-lg p-4">
                <summary className="cursor-pointer font-medium text-accent-warning">
                  ⚠️ Warnings ({summary.warnings.length})
                </summary>
                <div className="mt-3 space-y-2">
                  {summary.warnings.map((warning, index) => (
                    <div key={index} className="text-sm">
                      <p className="text-accent-warning font-medium">{warning.message}</p>
                      {warning.details && (
                        <p className="text-text-muted text-xs mt-1">{warning.details}</p>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={() => window.location.href = '/habits'}
            className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"
          >
            View Imported Habits
          </button>
          <button
            onClick={() => window.location.href = '/habits/analytics'}
            className="flex-1 px-4 py-2 border border-accent-primary text-accent-primary rounded-lg hover:bg-accent-primary/10 transition-colors"
          >
            View Analytics
          </button>
          <button
            onClick={resetImport}
            className="px-4 py-2 border border-border text-text-secondary rounded-lg hover:border-accent-primary hover:text-accent-primary transition-colors"
          >
            Import More
          </button>
        </div>
      </div>
    );
  };

  const renderError = () => (
    <div className="bg-accent-error/10 border border-accent-error/20 rounded-lg p-4">
      <h4 className="font-medium text-accent-error mb-2">❌ Import Failed</h4>
      <p className="text-sm text-text-secondary mb-4">{importState.error}</p>
      <button
        onClick={resetImport}
        className="px-4 py-2 bg-accent-error text-white rounded-lg hover:bg-accent-error/90 transition-colors"
      >
        Try Again
      </button>
    </div>
  );

  return (
    <div className="card p-6">
      <h3 className="text-xl font-semibold text-text-primary mb-4">
        Enhanced Loop Habits Import
      </h3>
      
      {importState.stage === 'idle' && renderFileUpload()}
      {(importState.stage === 'uploading' || importState.stage === 'processing') && renderProgress()}
      {importState.stage === 'conflicts' && renderConflictResolution()}
      {importState.stage === 'complete' && renderSummary()}
      {importState.stage === 'error' && renderError()}
    </div>
  );
}