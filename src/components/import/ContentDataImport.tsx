// src/components/import/ContentDataImport.tsx
import React, { useState } from 'react';

interface ImportResult {
  success: boolean;
  message: string;
  stats: {
    total: number;
    imported: number;
    duplicates: number;
    errors: number;
    movies: number;
    tv_shows: number;
    rated_entries: number;
    avg_rating: number;
    top_genres: { genre: string; count: number }[];
    date_range: string;
  };
  errors?: string[];
}

export default function ContentDataImport() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('serializd_data', file);

      const response = await fetch('/api/content/import/serializd', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Import failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setResult(null);
    setError(null);
    // Reset file input
    const fileInput = document.getElementById('content-file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Serializd Content Import</h3>
          <p className="text-sm text-gray-600">Import your enriched Serializd export data</p>
        </div>
      </div>

      {!result && (
        <div className="space-y-4">
          <div>
            <label htmlFor="content-file-input" className="block text-sm font-medium text-gray-700 mb-2">
              Select Serializd Export File
            </label>
            <input
              id="content-file-input"
              type="file"
              accept=".csv,.json,text/csv,application/json"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Supports enriched CSV and JSON exports from Serializd with TMDB data
            </p>
          </div>

          {file && (
            <div className="bg-gray-50 rounded-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB • {file.type || 'Unknown type'}
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  {file.name.endsWith('.json') ? '📊 JSON' : '📋 CSV'}
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Enhanced Serializd Format Expected:</h4>
            <div className="text-xs text-blue-800 space-y-2">
              <p><strong>Required fields:</strong> Title, Rating, Watch_Date, TMDB_ID</p>
              <p><strong>Enhanced fields:</strong> Genres, Cast, Overview, Season_Episode, Review_Text</p>
              <div className="mt-2 p-2 bg-blue-100 rounded text-blue-700">
                <p><strong>✨ This importer handles:</strong></p>
                <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                  <li>Rich TMDB metadata (cast, genres, ratings)</li>
                  <li>TV shows with season/episode tracking</li>
                  <li>Personal reviews and ratings</li>
                  <li>Duplicate detection and prevention</li>
                  <li>Batch processing for large imports</li>
                </ul>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-sm font-medium text-red-900">Import Error</p>
              </div>
              <p className="text-sm text-red-800 mt-1">{error}</p>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {importing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing Serializd Data...
              </span>
            ) : (
              'Import Serializd Content'
            )}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h4 className="text-sm font-medium text-green-900">Import Successful!</h4>
            </div>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-green-700">{result.stats.imported}</div>
                <div className="text-xs text-green-600">Imported</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-700">{result.stats.duplicates}</div>
                <div className="text-xs text-gray-600">Duplicates</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-700">{result.stats.movies}</div>
                <div className="text-xs text-blue-600">Movies</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-700">{result.stats.tv_shows}</div>
                <div className="text-xs text-purple-600">TV Shows</div>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="text-sm text-green-800 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><strong>📊 Content Stats:</strong></p>
                  <ul className="text-xs space-y-1 ml-4">
                    <li>• Total processed: {result.stats.total}</li>
                    <li>• Rated entries: {result.stats.rated_entries}</li>
                    <li>• Average rating: {result.stats.avg_rating.toFixed(1)}/10</li>
                    <li>• Date range: {result.stats.date_range}</li>
                  </ul>
                </div>
                
                {result.stats.top_genres.length > 0 && (
                  <div>
                    <p><strong>🎭 Top Genres:</strong></p>
                    <ul className="text-xs space-y-1 ml-4">
                      {result.stats.top_genres.slice(0, 3).map((genre, index) => (
                        <li key={index}>• {genre.genre} ({genre.count})</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="font-medium text-yellow-900">⚠️ Warnings:</p>
                  <ul className="list-disc list-inside text-xs text-yellow-800 mt-1">
                    {result.errors.map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={resetImport}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
            >
              Import Another File
            </button>
            <button
              onClick={() => window.location.href = '/content'}
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
            >
              View Content Library →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}