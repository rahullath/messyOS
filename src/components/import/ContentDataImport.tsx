import React, { useState } from 'react';

interface ContentDataImportProps {
  onImportComplete?: (result: any) => void;
}

export default function ContentDataImport({ onImportComplete }: ContentDataImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['text/csv', 'application/json', '.csv', '.json'];
      const isValid = validTypes.some(type => 
        selectedFile.type === type || selectedFile.name.toLowerCase().endsWith(type.replace('.', ''))
      );
      
      if (!isValid) {
        setError('Please select a CSV or JSON file');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('content', file);

      const response = await fetch('/api/import/content', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        onImportComplete?.(data);
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4zM9 6h6V4H9v2zm0 3a1 1 0 112 0v6a1 1 0 11-2 0V9zm4 0a1 1 0 112 0v6a1 1 0 11-2 0V9z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Content Import</h3>
          <p className="text-sm text-gray-600">Import your content data from CSV or JSON files</p>
        </div>
      </div>

      {!result && (
        <div className="space-y-4">
          <div>
            <label htmlFor="content-file-input" className="block text-sm font-medium text-gray-700 mb-2">
              Select Content File
            </label>
            <input
              id="content-file-input"
              type="file"
              accept=".csv,.json,text/csv,application/json"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Supported formats: CSV, JSON. Expected columns: Title, Status, Rating, Seasons, Page
            </p>
          </div>

          {file && (
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Selected file:</span> {file.name}
              </p>
              <p className="text-xs text-gray-500">
                Size: {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Expected Format:</h4>
            <div className="text-xs text-blue-800 space-y-1">
              <p><strong>CSV:</strong> Title,Status,Rating,Seasons,Page</p>
              <p><strong>JSON:</strong> Array of objects with Title, Status, Rating, Seasons, Page fields</p>
              <p className="mt-2 text-blue-700">
                • Status: "Watched", "Watching", "Planned", etc.<br/>
                • Rating: Number or "N/A"<br/>
                • Seasons: Number or "N/A"<br/>
                • Page: Number for pagination
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
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
                Importing...
              </span>
            ) : (
              'Import Content Data'
            )}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h4 className="text-sm font-medium text-green-900">Import Successful!</h4>
            </div>
            <div className="text-sm text-green-800 space-y-1">
              <p>✅ Imported: {result.importedRecords} content entries</p>
              {result.skippedRecords > 0 && (
                <p>⏭️ Skipped: {result.skippedRecords} duplicates</p>
              )}
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Warnings:</p>
                  <ul className="list-disc list-inside text-xs">
                    {result.errors.map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={resetImport}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}
