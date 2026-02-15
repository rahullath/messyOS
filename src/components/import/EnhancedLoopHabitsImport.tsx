// src/components/import/EnhancedLoopHabitsImport.tsx
import React, { useState } from 'react';
import type { ImportProgress, ImportSummary, ConflictResolution, ImportError } from '../../lib/import/enhanced-loop-habits';
import { detectImportFormat, fuzzyMatchHabit, type ImportFormat, type FuzzyMatchResult } from '../../lib/import/enhanced-loop-habits-v2';

interface ImportState {
  stage: 'idle' | 'format-detection' | 'preview' | 'uploading' | 'processing' | 'conflicts' | 'complete' | 'error';
  progress: ImportProgress | null;
  summary: ImportSummary | null;
  conflicts: ConflictResolution[];
  error: string | null;
  importFormat?: ImportFormat;
  fuzzyMatches?: Array<{
    fileName: string;
    habitName: string;
    match: FuzzyMatchResult | null;
    status: 'new' | 'matched' | 'conflict';
  }>;
}

export default function EnhancedLoopHabitsImport() {
  const [files, setFiles] = useState<{
    habits?: File;
    checkmarks?: File;
    scores?: File;
    perHabitFiles?: File[];
  }>({});
  
  const [importState, setImportState] = useState<ImportState>({
    stage: 'idle',
    progress: null,
    summary: null,
    conflicts: [],
    error: null,
    importFormat: undefined,
    fuzzyMatches: undefined,
  });

  const [conflictResolutions, setConflictResolutions] = useState<ConflictResolution[]>([]);
  const [existingHabits, setExistingHabits] = useState<Array<{ id: string; name: string }>>([]);

  const handleFileChange = (type: 'habits' | 'checkmarks' | 'scores', file: File) => {
    setFiles(prev => ({ ...prev, [type]: file }));
    // Reset state when files change
    if (importState.stage !== 'idle') {
      setImportState({
        stage: 'idle',
        progress: null,
        summary: null,
        conflicts: [],
        error: null,
        importFormat: undefined,
        fuzzyMatches: undefined,
      });
    }
  };

  const handlePerHabitFilesChange = async (fileList: FileList) => {
    // Per-habit flow only supports checkmarks CSVs; ignore scores and other CSVs.
    const filesArray = Array.from(fileList).filter((file) => {
      if (file.name.toLowerCase() !== 'checkmarks.csv') {
        return false;
      }

      // Ignore root-level Checkmarks.csv when selecting the entire export directory.
      // Valid per-habit files are expected in nested folders:
      //   ExportRoot/<Habit Folder>/Checkmarks.csv
      const relativePath = (file as any).webkitRelativePath as string | undefined;
      if (relativePath) {
        const parts = relativePath.split('/').filter(Boolean);
        if (parts.length < 3) {
          return false;
        }
      }

      return true;
    });
    setFiles(prev => ({ ...prev, perHabitFiles: filesArray }));

    if (filesArray.length === 0) {
      setImportState(prev => ({
        ...prev,
        stage: 'idle',
        error: 'No per-habit Checkmarks.csv files found in selected folder.',
      }));
      return;
    }
    
    // Detect format and show preview
    const format = detectImportFormat(filesArray);
    
    if (format === 'per-habit') {
      setImportState(prev => ({
        ...prev,
        stage: 'format-detection',
        importFormat: format,
      }));
      
      // Fetch existing habits for fuzzy matching
      const habits = await fetchExistingHabits();
      
      // Generate fuzzy match preview
      await generateFuzzyMatchPreview(filesArray, habits);
    } else {
      setImportState(prev => ({
        ...prev,
        stage: 'idle',
        error: 'Please select per-habit CSV files or use the root import format above.',
      }));
    }
  };

  const fetchExistingHabits = async (): Promise<Array<{ id: string; name: string }>> => {
    try {
      const response = await fetch('/api/habits');
      if (response.ok) {
        const data = await response.json();
        const habits = Array.isArray(data)
          ? data
          : Array.isArray(data?.habits)
            ? data.habits
            : [];
        setExistingHabits(habits);
        return habits;
      }
    } catch (error) {
      console.error('Failed to fetch existing habits:', error);
    }
    setExistingHabits([]);
    return [];
  };

  const generateFuzzyMatchPreview = async (
    filesArray: File[],
    habitsToMatch: Array<{ id: string; name: string }>
  ) => {
    const matches: Array<{
      fileName: string;
      habitName: string;
      match: FuzzyMatchResult | null;
      status: 'new' | 'matched' | 'conflict';
    }> = [];
    
    for (const file of filesArray) {
      // Extract habit name from file path
      const habitName = extractHabitNameFromFile(file);
      
      if (!habitName) {
        continue;
      }
      
      // Fuzzy match to existing habits
      const match = fuzzyMatchHabit(habitName, habitsToMatch);
      
      matches.push({
        fileName: file.name,
        habitName,
        match,
        status: match ? (match.confidence >= 90 ? 'matched' : 'conflict') : 'new',
      });
    }
    
    setImportState(prev => ({
      ...prev,
      stage: 'preview',
      fuzzyMatches: matches,
    }));
  };

  const extractHabitNameFromFile = (file: File): string | null => {
    // Try to extract from webkitRelativePath (folder structure)
    if ((file as any).webkitRelativePath) {
      const path = (file as any).webkitRelativePath as string;
      const parts = path.split('/');
      
      // Format: "001 Habit Name/Checkmarks.csv"
      // When selecting the whole export folder, root-level Checkmarks.csv should be ignored.
      if (parts.length >= 3) {
        const folderName = parts[parts.length - 2];
        // Remove leading numbers and trim
        const habitName = folderName.replace(/^\d+\s*/, '').trim();
        return habitName;
      }
    }
    
    // Fallback: try to extract from file name
    if (file.name !== 'Checkmarks.csv') {
      return file.name.replace(/\.csv$/i, '').trim();
    }
    
    return null;
  };

  const validateFiles = (): string | null => {
    // Check for per-habit import
    if (files.perHabitFiles && files.perHabitFiles.length > 0) {
      // Validate per-habit files
      const maxSize = 10 * 1024 * 1024; // 10MB per file
      for (const file of files.perHabitFiles) {
        if (file.size > maxSize) {
          return `File ${file.name} is too large (max 10MB per file)`;
        }
      }
      return null;
    }
    
    // Check for root import
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
      
      // Determine import type
      if (files.perHabitFiles && files.perHabitFiles.length > 0) {
        // Per-habit import
        files.perHabitFiles.forEach((file, index) => {
          formData.append(`perHabitFile_${index}`, file);
        });
        formData.append('importFormat', 'per-habit');
      } else {
        // Root import
        formData.append('habits', files.habits!);
        formData.append('checkmarks', files.checkmarks!);
        formData.append('scores', files.scores!);
        formData.append('importFormat', 'root');
      }
      
      if (conflictResolutions.length > 0) {
        formData.append('conflictResolutions', JSON.stringify(conflictResolutions));
      }

      const response = await fetch('/api/import/enhanced-loop-habits-v2', {
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
              setImportState(prev => ({
                ...prev,
                stage: 'error',
                error: data.message || 'Import failed',
              }));
              return;
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
      error: null,
      importFormat: undefined,
      fuzzyMatches: undefined,
    });
    setConflictResolutions([]);
    setFiles({});
  };

  const renderFileUpload = () => (
    <div className="space-y-6">
      {/* Root Import Section */}
      <div className="space-y-4">
        <h4 className="font-medium text-text-primary">Root Export Import</h4>
        <p className="text-sm text-text-secondary">
          Import from Loop Habits root export (Habits.csv, Checkmarks.csv, Scores.csv)
        </p>
        
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
          Start Root Import
        </button>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-background text-text-muted">OR</span>
        </div>
      </div>

      {/* Per-Habit Import Section */}
      <div className="space-y-4">
        <h4 className="font-medium text-text-primary">Per-Habit Export Import</h4>
        <p className="text-sm text-text-secondary">
          Import from Loop Habits per-habit export (individual Checkmarks.csv files with notes)
        </p>
        
        <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-lg p-4">
          <p className="text-sm text-text-secondary mb-2">
            💡 <strong>Tip:</strong> Select the entire export folder to import all habits at once.
            The system will automatically detect habit names and match them to your existing habits.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Per-Habit CSV Files *
          </label>
          <input
            type="file"
            accept=".csv"
            multiple
            webkitdirectory=""
            directory=""
            onChange={(e) => e.target.files && handlePerHabitFilesChange(e.target.files)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent-primary file:text-white hover:file:bg-accent-primary/90"
          />
          {files.perHabitFiles && files.perHabitFiles.length > 0 && (
            <p className="text-xs text-accent-success mt-1">
              ✅ {files.perHabitFiles.length} Checkmarks.csv files selected
            </p>
          )}
        </div>
      </div>
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

  const renderFuzzyMatchPreview = () => {
    if (!importState.fuzzyMatches || importState.fuzzyMatches.length === 0) {
      return null;
    }

    const newHabits = importState.fuzzyMatches.filter(m => m.status === 'new');
    const matchedHabits = importState.fuzzyMatches.filter(m => m.status === 'matched');
    const conflictHabits = importState.fuzzyMatches.filter(m => m.status === 'conflict');

    return (
      <div className="space-y-6">
        <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-lg p-4">
          <h4 className="font-medium text-accent-primary mb-2">
            📋 Import Preview - Per-Habit Format Detected
          </h4>
          <p className="text-sm text-text-secondary">
            Review how your habits will be imported. The system has automatically matched habit names to your existing habits.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-accent-success/10 border border-accent-success/20 rounded-lg">
            <div className="text-2xl font-bold text-accent-success">{matchedHabits.length}</div>
            <div className="text-sm text-text-muted">Matched</div>
          </div>
          <div className="text-center p-3 bg-accent-warning/10 border border-accent-warning/20 rounded-lg">
            <div className="text-2xl font-bold text-accent-warning">{conflictHabits.length}</div>
            <div className="text-sm text-text-muted">Low Confidence</div>
          </div>
          <div className="text-center p-3 bg-accent-primary/10 border border-accent-primary/20 rounded-lg">
            <div className="text-2xl font-bold text-accent-primary">{newHabits.length}</div>
            <div className="text-sm text-text-muted">New Habits</div>
          </div>
        </div>

        {/* Habit Mapping List */}
        <div className="space-y-3">
          <h5 className="font-medium text-text-primary">Habit Mapping</h5>
          
          <div className="max-h-96 overflow-y-auto space-y-2">
            {importState.fuzzyMatches.map((match, index) => (
              <div 
                key={index} 
                className={`border rounded-lg p-3 ${
                  match.status === 'matched' 
                    ? 'border-accent-success/30 bg-accent-success/5' 
                    : match.status === 'conflict'
                    ? 'border-accent-warning/30 bg-accent-warning/5'
                    : 'border-accent-primary/30 bg-accent-primary/5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-text-primary">
                        {match.habitName}
                      </span>
                      {match.status === 'matched' && (
                        <span className="text-xs px-2 py-0.5 bg-accent-success/20 text-accent-success rounded">
                          ✓ Matched
                        </span>
                      )}
                      {match.status === 'conflict' && (
                        <span className="text-xs px-2 py-0.5 bg-accent-warning/20 text-accent-warning rounded">
                          ⚠ Low Confidence
                        </span>
                      )}
                      {match.status === 'new' && (
                        <span className="text-xs px-2 py-0.5 bg-accent-primary/20 text-accent-primary rounded">
                          ✨ New
                        </span>
                      )}
                    </div>
                    
                    {match.match && (
                      <div className="mt-1 text-xs text-text-secondary">
                        → Will merge with: <span className="font-medium">{match.match.habitName}</span>
                        <span className="ml-2 text-text-muted">
                          ({match.match.confidence}% confidence)
                        </span>
                      </div>
                    )}
                    
                    {!match.match && (
                      <div className="mt-1 text-xs text-text-secondary">
                        → Will create new habit
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleImport}
            className="flex-1 px-4 py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors font-medium"
          >
            Proceed with Import
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
      {importState.stage === 'format-detection' && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Detecting import format...</p>
        </div>
      )}
      {importState.stage === 'preview' && renderFuzzyMatchPreview()}
      {(importState.stage === 'uploading' || importState.stage === 'processing') && renderProgress()}
      {importState.stage === 'conflicts' && renderConflictResolution()}
      {importState.stage === 'complete' && renderSummary()}
      {importState.stage === 'error' && renderError()}
    </div>
  );
}
