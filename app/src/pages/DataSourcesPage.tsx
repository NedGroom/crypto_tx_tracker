// app/src/pages/DataSourcesPage.tsx
// Lists all configured data sources and lets the user add/edit/delete them.

import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  selectAllSources,
  selectDataSourcesLoading,
  selectDataSourcesError,
  fetchDataSources,
} from '../store/dataSourcesSlice';
import { selectIsAuthenticated } from '../store/authSlice';
import type { DataSource } from '../store/dataSourcesSlice';
import {
  createCsvRawExport,
  fetchRawExportsByDataSource,
  type CsvImportType,
  type RawExportChunk,
} from '../store/rawExportsSlice';
import type { AppDispatch, RootState } from '../store/index';
import { getPlatformById } from '../data/platforms';
import DataSourceModal from '../components/DataSourceModal';

function DataSourcesPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const sources = useSelector(selectAllSources);
  const loading = useSelector(selectDataSourcesLoading);
  const error = useSelector(selectDataSourcesError);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const rawExportsByDataSource = useSelector(
    (state: RootState) => state.rawExports.byDataSource,
  );
  const rawExportsLoadingByDataSource = useSelector(
    (state: RootState) => state.rawExports.loadingByDataSource,
  );
  const rawExportsErrorByDataSource = useSelector(
    (state: RootState) => state.rawExports.errorByDataSource,
  );
  const rawExportsCreatingByDataSource = useSelector(
    (state: RootState) => state.rawExports.creatingByDataSource,
  );

  // Fetch data sources from Supabase when the user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchDataSources());
    }
  }, [dispatch, isAuthenticated]);

  // Modal state — null means closed; a DataSource means editing; 'new' means adding
  const [modalState, setModalState] = useState<DataSource | 'new' | null>(null);
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [showCsvFormForSourceId, setShowCsvFormForSourceId] = useState<
    string | null
  >(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvDescription, setCsvDescription] = useState('');
  const [csvImportType, setCsvImportType] = useState<CsvImportType>('trades');
  const [csvExportStartDate, setCsvExportStartDate] = useState('');
  const [csvExportEndDate, setCsvExportEndDate] = useState('');
  const [csvFormError, setCsvFormError] = useState<string | null>(null);
  const [detailsChunk, setDetailsChunk] = useState<RawExportChunk | null>(null);

  const importTypeOptions: Array<{ value: CsvImportType; label: string }> = [
    { value: 'trades', label: 'Trades' },
    { value: 'deposits', label: 'Deposits' },
    { value: 'withdrawals', label: 'Withdrawals' },
    { value: 'transfers', label: 'Transfers' },
    { value: 'rewards', label: 'Rewards' },
    { value: 'other', label: 'Other' },
  ];

  const openAdd = () => setModalState('new');
  const openEdit = (source: DataSource) => setModalState(source);
  const closeModal = () => setModalState(null);

  const toggleExpand = (sourceId: string) => {
    const next = expandedSourceId === sourceId ? null : sourceId;
    setExpandedSourceId(next);
    if (next) {
      dispatch(fetchRawExportsByDataSource(next));
    }
  };

  const toggleCsvForm = (sourceId: string) => {
    if (showCsvFormForSourceId === sourceId) {
      setShowCsvFormForSourceId(null);
      setCsvFormError(null);
      return;
    }

    setShowCsvFormForSourceId(sourceId);
    setCsvFile(null);
    setCsvDescription('');
    setCsvImportType('trades');
    setCsvExportStartDate('');
    setCsvExportEndDate('');
    setCsvFormError(null);
  };

  const submitCsvImport = async (sourceId: string) => {
    if (!csvFile) {
      setCsvFormError('Please choose a CSV file.');
      return;
    }

    if (!csvImportType) {
      setCsvFormError('Please choose an import type.');
      return;
    }

    if (
      csvExportStartDate &&
      csvExportEndDate &&
      csvExportStartDate > csvExportEndDate
    ) {
      setCsvFormError(
        'Export start date must be on or before export end date.',
      );
      return;
    }

    setCsvFormError(null);

    try {
      await dispatch(
        createCsvRawExport({
          dataSourceId: sourceId,
          file: csvFile,
          description: csvDescription.trim(),
          importType: csvImportType,
          exportStartDate: csvExportStartDate || null,
          exportEndDate: csvExportEndDate || null,
        }),
      ).unwrap();

      setShowCsvFormForSourceId(null);
      setCsvFile(null);
      setCsvDescription('');
      setCsvImportType('trades');
      setCsvExportStartDate('');
      setCsvExportEndDate('');
      setCsvFormError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to import CSV file';
      setCsvFormError(message);
    }
  };

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

      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}

      {loading && sources.length === 0 ? (
        <p className="loading-state">Loading data sources…</p>
      ) : sources.length === 0 ? (
        <p className="empty-state">
          No data sources yet. Add one to get started.
        </p>
      ) : (
        <ul className="source-list">
          {sources.map((source) => {
            const { primary, secondary } = resolveLabel(source);
            const isExpanded = expandedSourceId === source.id;
            const chunks = rawExportsByDataSource[source.id] ?? [];
            const chunksLoading =
              rawExportsLoadingByDataSource[source.id] ?? false;
            const chunksError = rawExportsErrorByDataSource[source.id] ?? null;
            const creatingCsv =
              rawExportsCreatingByDataSource[source.id] ?? false;
            const showCsvForm = showCsvFormForSourceId === source.id;
            return (
              <li key={source.id} className="source-card">
                <div className="source-card-main">
                  <div className="source-card-info">
                    <span className="source-card-primary">{primary}</span>
                    {secondary && (
                      <span className="source-card-secondary">{secondary}</span>
                    )}
                  </div>
                  <div className="source-card-actions">
                    <span
                      className={`credential-badge ${source.credentials ? 'configured' : 'none'}`}
                    >
                      {source.credentials ? 'API configured' : 'No API key'}
                    </span>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => openEdit(source)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => toggleExpand(source.id)}
                    >
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="source-exports-panel">
                    <div className="source-exports-actions">
                      <button type="button" className="btn-secondary" disabled>
                        Import with API (Coming in F4b)
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => toggleCsvForm(source.id)}
                      >
                        {showCsvForm ? 'Cancel CSV Import' : 'Import CSV'}
                      </button>
                    </div>

                    {showCsvForm && (
                      <div className="csv-import-form">
                        <h4>Import CSV</h4>
                        {csvFormError && (
                          <p className="modal-error" role="alert">
                            {csvFormError}
                          </p>
                        )}
                        <label>
                          CSV File
                          <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => {
                              setCsvFile(e.target.files?.[0] ?? null);
                            }}
                          />
                        </label>
                        <label>
                          Description (optional)
                          <input
                            type="text"
                            value={csvDescription}
                            onChange={(e) => setCsvDescription(e.target.value)}
                            placeholder="e.g. Binance trade history export"
                          />
                        </label>
                        <label>
                          Import Type
                          <select
                            value={csvImportType}
                            onChange={(e) =>
                              setCsvImportType(e.target.value as CsvImportType)
                            }
                          >
                            {importTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Export start date (optional)
                          <input
                            type="date"
                            value={csvExportStartDate}
                            onChange={(e) =>
                              setCsvExportStartDate(e.target.value)
                            }
                          />
                        </label>
                        <label>
                          Export end date (optional)
                          <input
                            type="date"
                            value={csvExportEndDate}
                            onChange={(e) =>
                              setCsvExportEndDate(e.target.value)
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={creatingCsv}
                          onClick={() => submitCsvImport(source.id)}
                        >
                          {creatingCsv ? 'Importing…' : 'Save Import'}
                        </button>
                      </div>
                    )}

                    {chunksLoading ? (
                      <p className="loading-state">Loading import chunks…</p>
                    ) : chunksError ? (
                      <p className="modal-error" role="alert">
                        {chunksError}
                      </p>
                    ) : chunks.length === 0 ? (
                      <p className="empty-state">
                        No raw export chunks yet. Import a CSV to get started.
                      </p>
                    ) : (
                      <div className="source-exports-table-wrap">
                        <table className="source-exports-table">
                          <thead>
                            <tr>
                              <th>Created</th>
                              <th>Type</th>
                              <th>Rows</th>
                              <th>Status</th>
                              <th>Date range</th>
                              <th>Description</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {chunks.map((chunk) => (
                              <tr key={chunk.id}>
                                <td>
                                  {new Date(chunk.createdAt).toLocaleString()}
                                </td>
                                <td>{chunk.importType}</td>
                                <td>{chunk.rowCount}</td>
                                <td>{chunk.status}</td>
                                <td>
                                  {chunk.exportStartDate || chunk.exportEndDate
                                    ? `${chunk.exportStartDate || '—'} to ${chunk.exportEndDate || '—'}`
                                    : '—'}
                                </td>
                                <td>{chunk.description || '—'}</td>
                                <td className="chunk-actions-cell">
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setDetailsChunk(chunk)}
                                  >
                                    View details
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() =>
                                      navigate(
                                        `/data-sources/raw-exports/${chunk.id}`,
                                      )
                                    }
                                  >
                                    View data
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {detailsChunk && (
        <dialog open className="data-source-modal">
          <div className="modal-form">
            <h3>Raw Export Details</h3>
            <div className="raw-export-details-grid">
              <p>
                <strong>ID:</strong> {detailsChunk.id}
              </p>
              <p>
                <strong>Ingest method:</strong> {detailsChunk.ingestMethod}
              </p>
              <p>
                <strong>Import type:</strong> {detailsChunk.importType}
              </p>
              <p>
                <strong>Description:</strong> {detailsChunk.description || '—'}
              </p>
              <p>
                <strong>Source file:</strong>{' '}
                {detailsChunk.sourceFileName || '—'}
              </p>
              <p>
                <strong>Export start date:</strong>{' '}
                {detailsChunk.exportStartDate || '—'}
              </p>
              <p>
                <strong>Export end date:</strong>{' '}
                {detailsChunk.exportEndDate || '—'}
              </p>
              <p>
                <strong>Rows:</strong> {detailsChunk.rowCount}
              </p>
              <p>
                <strong>Columns:</strong>{' '}
                {detailsChunk.columnList.join(', ') || '—'}
              </p>
              <p>
                <strong>Status:</strong> {detailsChunk.status}
              </p>
              <p>
                <strong>Created:</strong>{' '}
                {new Date(detailsChunk.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setDetailsChunk(null)}
              >
                Close
              </button>
            </div>
          </div>
        </dialog>
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
