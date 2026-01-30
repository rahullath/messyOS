/**
 * Calendar Source Manager Component
 * Manages calendar sources with CRUD operations
 */

import React, { useState, useEffect } from 'react';
import type { CalendarSource, CreateCalendarSourceRequest, UpdateCalendarSourceRequest } from '../../types/calendar';
import { CSVImporter } from '../import/CSVImporter';
import { parseCsvData } from '../../lib/import/csv-parser';
import { addCsvEvents } from '../../lib/calendar/importer-service';
import { authService } from '../../lib/auth/service';
import '../../styles/calendar-source-manager.css';

interface CalendarSourceManagerProps {
  sources: CalendarSource[];
  onAddSource: (source: CreateCalendarSourceRequest) => Promise<void>;
  onUpdateSource: (id: string, updates: UpdateCalendarSourceRequest) => Promise<void>;
  onDeleteSource: (id: string) => Promise<void>;
  onSyncSource: (id: string) => Promise<void>;
}

export const CalendarSourceManager: React.FC<CalendarSourceManagerProps> = ({
  sources,
  onAddSource,
  onUpdateSource,
  onDeleteSource,
  onSyncSource
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvImporter, setShowCsvImporter] = useState(false);
  const [editingSource, setEditingSource] = useState<CalendarSource | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleAddSource = async (formData: FormData) => {
    const sourceData: CreateCalendarSourceRequest = {
      name: formData.get('name') as string,
      type: formData.get('type') as CreateCalendarSourceRequest['type'],
      url: formData.get('url') as string || undefined,
      color: formData.get('color') as string,
      sync_frequency: parseInt(formData.get('sync_frequency') as string)
    };

    await onAddSource(sourceData);
    setShowAddModal(false);
  };

  const handleCsvImport = async (data: any[]) => {
    const user = await authService.getCurrentUser();
    if (!user) {
      // Handle user not logged in
      return;
    }

    const events = parseCsvData(data);
    const sourceData: CreateCalendarSourceRequest = {
      name: 'CSV Import',
      type: 'manual',
      color: '#8b5cf6',
      sync_frequency: 1440,
    };
    await addCsvEvents(sourceData, events, user.id);
  };

  const handleSync = async (sourceId: string) => {
    setLoading(prev => ({ ...prev, [sourceId]: true }));
    try {
      await onSyncSource(sourceId);
    } finally {
      setLoading(prev => ({ ...prev, [sourceId]: false }));
    }
  };

  const handleToggleActive = async (source: CalendarSource) => {
    await onUpdateSource(source.id, { is_active: !source.is_active });
  };

  const getSourceTypeLabel = (type: CalendarSource['type']) => {
    const labels = {
      google: 'Google Calendar',
      ical: 'iCal Feed',
      outlook: 'Outlook',
      manual: 'Manual'
    };
    return labels[type] || type;
  };

  const formatLastSync = (lastSync?: Date) => {
    if (!lastSync) return 'Never';
    return new Date(lastSync).toLocaleString();
  };

  console.log('CalendarSourceManager render - sources.length:', sources.length, 'showAddModal:', showAddModal);

  if (sources.length === 0) {
    return (
      <>
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>No Calendar Sources</h3>
          <p>Add your first calendar source to get started with unified calendar management.</p>
          <button 
            onClick={() => {
              console.log('Add Calendar Source button clicked (empty state)');
              setShowAddModal(true);
              console.log('showAddModal set to true');
            }}
            className="btn btn-primary"
          >
            Add Calendar Source
          </button>
        </div>

        {/* Add Source Modal - must be here too for empty state */}
        {showAddModal ? (
          <AddSourceModal 
            key="add-source-modal"
            onSubmit={handleAddSource}
            onClose={() => {
              console.log('Closing modal');
              setShowAddModal(false);
            }}
            setShowCsvImporter={setShowCsvImporter}
          />
        ) : null}

        {/* CSV Importer Modal */}
        {showCsvImporter && (
          <CSVImporter
            onImport={handleCsvImport}
            onClose={() => setShowCsvImporter(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="calendar-source-manager">
      <div className="manager-header">
        <h2>Calendar Sources</h2>
        <button 
          onClick={() => {
            console.log('Add Source button clicked (header)');
            setShowAddModal(true);
            console.log('showAddModal set to true');
          }}
          className="btn btn-primary"
        >
          <span className="icon">➕</span>
          Add Source
        </button>
      </div>

      <div className="sources-grid">
        {sources.map(source => (
          <div key={source.id} className="source-card">
            <div className="source-header">
              <div className="source-info">
                <div 
                  className="source-color" 
                  style={{ backgroundColor: source.color }}
                />
                <div>
                  <h3>{source.name}</h3>
                  <span className="source-type">
                    {getSourceTypeLabel(source.type)}
                  </span>
                </div>
              </div>
              <div className={`source-status ${source.is_active ? 'active' : 'inactive'}`}>
                {source.is_active ? '🟢 Active' : '🔴 Inactive'}
              </div>
            </div>

            <div className="source-details">
              <div className="detail-row">
                <strong>Sync Frequency:</strong> Every {source.sync_frequency} minutes
              </div>
              <div className="detail-row">
                <strong>Last Sync:</strong> {formatLastSync(source.last_sync)}
              </div>
              {source.type === 'ical' && source.url && (
                <div className="detail-row">
                  <strong>URL:</strong> {source.url.length > 50 ? source.url.substring(0, 50) + '...' : source.url}
                </div>
              )}
            </div>

            <div className="source-actions">
              <button 
                onClick={() => handleSync(source.id)}
                disabled={loading[source.id]}
                className="btn btn-sm btn-secondary"
              >
                {loading[source.id] ? '⏳ Syncing...' : '🔄 Sync'}
              </button>
              
              <button 
                onClick={() => handleToggleActive(source)}
                className={`btn btn-sm ${source.is_active ? 'btn-warning' : 'btn-success'}`}
              >
                {source.is_active ? 'Disable' : 'Enable'}
              </button>
              
              <button 
                onClick={() => setEditingSource(source)}
                className="btn btn-sm btn-secondary"
              >
                Edit
              </button>
              
              <button 
                onClick={() => {
                  if (confirm(`Delete "${source.name}"? This will also delete all associated events.`)) {
                    onDeleteSource(source.id);
                  }
                }}
                className="btn btn-sm btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Source Modal */}
      {showAddModal ? (
        <AddSourceModal 
          key="add-source-modal"
          onSubmit={handleAddSource}
          onClose={() => {
            console.log('Closing modal');
            setShowAddModal(false);
          }}
          setShowCsvImporter={setShowCsvImporter}
        />
      ) : null}

      {/* Edit Source Modal */}
      {editingSource && (
        <EditSourceModal 
          source={editingSource}
          onSubmit={async (updates) => {
            await onUpdateSource(editingSource.id, updates);
            setEditingSource(null);
          }}
          onClose={() => setEditingSource(null)}
        />
      )}

      {/* CSV Importer Modal */}
      {showCsvImporter && (
        <CSVImporter
          onImport={handleCsvImport}
          onClose={() => setShowCsvImporter(false)}
        />
      )}
    </div>
  );
};

// Add Source Modal Component
interface AddSourceModalProps {
  onSubmit: (formData: FormData) => Promise<void>;
  onClose: () => void;
  setShowCsvImporter: (show: boolean) => void;
}

const AddSourceModal: React.FC<AddSourceModalProps> = ({ onSubmit, onClose, setShowCsvImporter }) => {
  console.log('AddSourceModal component rendering');
  const [sourceType, setSourceType] = useState<'google' | 'ical' | 'outlook' | 'manual'>('ical');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Calendar Source</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Calendar Type</label>
            <select 
              name="type" 
              value={sourceType} 
              onChange={(e) => setSourceType(e.target.value as any)}
              required
            >
              <option value="ical">iCal Feed (University Schedule)</option>
              <option value="google">Google Calendar</option>
              <option value="outlook">Outlook Calendar</option>
              <option value="manual">Manual Events</option>
            </select>
          </div>

          <div className="form-group">
            <button type="button" onClick={() => {
              setShowCsvImporter(true);
              onClose();
            }} className="btn btn-secondary">
              Import from CSV
            </button>
          </div>

          <div className="form-group">
            <label>Calendar Name</label>
            <input 
              type="text" 
              name="name" 
              required 
              placeholder="e.g., University Schedule, Personal Calendar"
            />
          </div>

          {sourceType === 'ical' && (
            <div className="form-group">
              <label>iCal Feed URL</label>
              <input 
                type="url" 
                name="url" 
                required
                placeholder="https://example.com/calendar.ics"
              />
              <small>Paste your university's iCal feed URL here</small>
            </div>
          )}

          <div className="form-group">
            <label>Color</label>
            <input type="color" name="color" defaultValue="#3B82F6" />
          </div>

          <div className="form-group">
            <label>Sync Frequency</label>
            <select name="sync_frequency" defaultValue="60">
              <option value="30">Every 30 minutes</option>
              <option value="60">Every hour</option>
              <option value="120">Every 2 hours</option>
              <option value="360">Every 6 hours</option>
              <option value="1440">Daily</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Adding...' : 'Add Calendar'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};

// Edit Source Modal Component
interface EditSourceModalProps {
  source: CalendarSource;
  onSubmit: (updates: UpdateCalendarSourceRequest) => Promise<void>;
  onClose: () => void;
}

const EditSourceModal: React.FC<EditSourceModalProps> = ({ source, onSubmit, onClose }) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const updates: UpdateCalendarSourceRequest = {
        name: formData.get('name') as string,
        url: formData.get('url') as string || undefined,
        color: formData.get('color') as string,
        sync_frequency: parseInt(formData.get('sync_frequency') as string),
        is_active: formData.get('is_active') === 'on'
      };
      await onSubmit(updates);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Calendar Source</h3>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Calendar Name</label>
            <input 
              type="text" 
              name="name" 
              defaultValue={source.name}
              required 
            />
          </div>

          {source.type === 'ical' && (
            <div className="form-group">
              <label>iCal Feed URL</label>
              <input 
                type="url" 
                name="url" 
                defaultValue={source.url}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Color</label>
            <input type="color" name="color" defaultValue={source.color} />
          </div>

          <div className="form-group">
            <label>Sync Frequency</label>
            <select name="sync_frequency" defaultValue={source.sync_frequency.toString()}>
              <option value="30">Every 30 minutes</option>
              <option value="60">Every hour</option>
              <option value="120">Every 2 hours</option>
              <option value="360">Every 6 hours</option>
              <option value="1440">Daily</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              <input 
                type="checkbox" 
                name="is_active"
                defaultChecked={source.is_active}
              />
              {' '}Active
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};

export default CalendarSourceManager;
