// app/src/pages/DataSourcesPage.tsx
// Lists all configured data sources and lets the user add/edit/delete them.

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectAllSources } from '../store/dataSourcesSlice';
import type { DataSource } from '../store/dataSourcesSlice';
import { getPlatformById } from '../data/platforms';
import DataSourceModal from '../components/DataSourceModal';

function DataSourcesPage() {
  const sources = useSelector(selectAllSources);

  // Modal state — null means closed; a DataSource means editing; 'new' means adding
  const [modalState, setModalState] = useState<DataSource | 'new' | null>(null);

  const openAdd = () => setModalState('new');
  const openEdit = (source: DataSource) => setModalState(source);
  const closeModal = () => setModalState(null);

  /** Resolve display name: custom name, display name, or platform name */
  const resolveLabel = (source: DataSource) => {
    const platform = getPlatformById(source.platformId);
    const platformName =
      platform?.name ?? source.customPlatformName ?? 'Unknown';
    // Show display name if it differs from the platform name
    if (source.displayName && source.displayName !== platformName) {
      return { primary: source.displayName, secondary: platformName };
    }
    return { primary: platformName, secondary: null };
  };

  return (
    <div className="data-sources-page">
      <div className="data-sources-header">
        <h2>Data Sources</h2>
        <button className="add-source-btn" onClick={openAdd}>
          + Add Data Source
        </button>
      </div>

      {sources.length === 0 ? (
        <p className="empty-state">
          No data sources yet. Add one to get started.
        </p>
      ) : (
        <ul className="source-list">
          {sources.map((source) => {
            const { primary, secondary } = resolveLabel(source);
            return (
              <li
                key={source.id}
                className="source-card"
                onClick={() => openEdit(source)}
              >
                <div className="source-card-info">
                  <span className="source-card-primary">{primary}</span>
                  {secondary && (
                    <span className="source-card-secondary">{secondary}</span>
                  )}
                </div>
                <span
                  className={`credential-badge ${source.credentials ? 'configured' : 'none'}`}
                >
                  {source.credentials ? 'API configured' : 'No API key'}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <DataSourceModal
        open={modalState !== null}
        onClose={closeModal}
        existingSource={
          modalState !== null && modalState !== 'new' ? modalState : undefined
        }
      />
    </div>
  );
}

export default DataSourcesPage;
