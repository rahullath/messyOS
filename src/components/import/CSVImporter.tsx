import React, { useState } from 'react';
import Papa from 'papaparse';

interface CSVImporterProps {
  onImport: (data: any[]) => void;
  onClose: () => void;
}

export const CSVImporter: React.FC<CSVImporterProps> = ({ onImport, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const file = e.target.files[0];
      setLoading(true);
      setError(null);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          onImport(results.data);
          onClose();
        },
        error: (err) => {
          setError(err.message);
          setLoading(false);
        },
      });
    }
  };

  return (
    <div className="csv-importer-modal">
      <div className="modal-content">
        <h2>Import from CSV</h2>
        {loading ? (
          <p>Importing...</p>
        ) : (
          <input type="file" accept=".csv" onChange={handleFileChange} />
        )}
        {error && <p className="error-message">{error}</p>}
        <div className="modal-actions">
          <button onClick={onClose} className="cancel-button">Cancel</button>
        </div>
      </div>
    </div>
  );
};
