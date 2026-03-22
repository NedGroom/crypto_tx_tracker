// app/src/pages/RawExportDataPage.tsx
// Displays a full data grid for one raw export chunk.

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import type { AppDispatch } from '../store';
import {
  fetchRawExportById,
  clearSelectedRawExport,
  selectSelectedRawExport,
  selectSelectedRawExportLoading,
  selectSelectedRawExportError,
} from '../store/rawExportsSlice';

function RawExportDataPage() {
  const { rawExportId } = useParams<{ rawExportId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const chunk = useSelector(selectSelectedRawExport);
  const loading = useSelector(selectSelectedRawExportLoading);
  const error = useSelector(selectSelectedRawExportError);

  useEffect(() => {
    if (!rawExportId) return;
    dispatch(fetchRawExportById(rawExportId));

    return () => {
      dispatch(clearSelectedRawExport());
    };
  }, [dispatch, rawExportId]);

  const columns = chunk?.columnList ?? [];
  const rows = chunk?.payloadJson ?? [];

  return (
    <div className="raw-export-page">
      <div className="raw-export-header">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate('/data-sources')}
        >
          Back to Data Sources
        </button>
        <h2>Raw Export Data</h2>
      </div>

      {loading && <p className="loading-state">Loading raw export data…</p>}

      {!loading && error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && !chunk && (
        <p className="empty-state">Raw export chunk not found.</p>
      )}

      {!loading && !error && chunk && (
        <>
          <div className="raw-export-meta">
            <span>
              <strong>Import type:</strong> {chunk.importType}
            </span>
            <span>
              <strong>Rows:</strong> {chunk.rowCount}
            </span>
            <span>
              <strong>Status:</strong> {chunk.status}
            </span>
          </div>

          {columns.length === 0 ? (
            <p className="empty-state">No columns found in this export.</p>
          ) : (
            <div className="raw-grid-wrapper">
              <table className="raw-grid-table">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {columns.map((column) => (
                        <td key={`${rowIndex}-${column}`}>
                          {row?.[column] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default RawExportDataPage;
