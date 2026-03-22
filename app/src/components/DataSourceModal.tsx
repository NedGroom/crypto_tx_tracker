// app/src/components/DataSourceModal.tsx
// Modal dialog for adding and editing data sources.
// Uses the native <dialog> element — no library needed.

import { useRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { platforms, getPlatformById } from '../data/platforms';
import {
  createDataSource,
  updateDataSource,
  deleteDataSource,
  selectDataSourcesLoading,
} from '../store/dataSourcesSlice';
import type { DataSource } from '../store/dataSourcesSlice';
import type { AppDispatch } from '../store/index';

interface DataSourceModalProps {
  open: boolean;
  onClose: () => void;
  existingSource?: DataSource; // If provided, modal is in "edit" mode
}

function DataSourceModal({
  open,
  onClose,
  existingSource,
}: DataSourceModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const saving = useSelector(selectDataSourcesLoading);

  const isEdit = Boolean(existingSource);

  // ── Form state ───────────────────────────────────────────
  const [platformId, setPlatformId] = useState('');
  const [customName, setCustomName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [editingCredentials, setEditingCredentials] = useState(false);
  const [error, setError] = useState('');

  // ── Sync dialog open/close state with the `open` prop ────
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // ── Populate form when opening ───────────────────────────
  useEffect(() => {
    if (!open) return;

    if (existingSource) {
      setPlatformId(existingSource.platformId);
      setCustomName(existingSource.customPlatformName ?? '');
      setDisplayName(existingSource.displayName);
      setShowCredentials(Boolean(existingSource.credentials));
      setEditingCredentials(false);
      // Don't pre-fill credential values for security
      setApiKey('');
      setApiSecret('');
    } else {
      // Reset for "add" mode
      setPlatformId('');
      setCustomName('');
      setDisplayName('');
      setShowCredentials(false);
      setEditingCredentials(false);
      setApiKey('');
      setApiSecret('');
    }
    setError('');
  }, [open, existingSource]);

  // ── Helpers ──────────────────────────────────────────────

  /** Resolve the default display name from the selected platform */
  const defaultDisplayName = () => {
    if (platformId === 'custom') return customName;
    return getPlatformById(platformId)?.name ?? '';
  };

  /** Mask a credential string: show last 4 chars */
  const mask = (value: string) =>
    value.length > 4 ? '••••••••' + value.slice(-4) : '••••';

  // ── Validation & submit ──────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!platformId) {
      setError('Please select a platform.');
      return;
    }
    if (platformId === 'custom' && !customName.trim()) {
      setError('Please enter a platform name.');
      return;
    }

    // If credentials section is open (or being edited), validate both or neither
    const hasKey = apiKey.trim().length > 0;
    const hasSecret = apiSecret.trim().length > 0;
    if (hasKey !== hasSecret) {
      setError(
        'Please provide both API key and API secret, or leave both empty.',
      );
      return;
    }

    const resolvedDisplayName = displayName.trim() || defaultDisplayName();
    const credentials =
      hasKey && hasSecret
        ? { apiKey: apiKey.trim(), apiSecret: apiSecret.trim() }
        : null;

    if (isEdit && existingSource) {
      // Update existing source
      dispatch(
        updateDataSource({
          id: existingSource.id,
          changes: {
            displayName: resolvedDisplayName,
            // Only update credentials if the user was actively editing them
            ...(editingCredentials && { credentials }),
          },
        }),
      );
    } else {
      // Add new source
      dispatch(
        createDataSource({
          platformId,
          ...(platformId === 'custom' && {
            customPlatformName: customName.trim(),
          }),
          displayName: resolvedDisplayName,
          credentials,
        }),
      );
    }

    onClose();
  };

  // ── Delete ───────────────────────────────────────────────

  const handleDelete = () => {
    if (!existingSource) return;
    const name = existingSource.displayName || defaultDisplayName();
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      dispatch(deleteDataSource(existingSource.id));
      onClose();
    }
  };

  // ── Remove credentials only ──────────────────────────────

  const handleRemoveCredentials = () => {
    if (!existingSource) return;
    if (window.confirm('Remove API credentials from this data source?')) {
      dispatch(
        updateDataSource({
          id: existingSource.id,
          changes: { credentials: null },
        }),
      );
      onClose();
    }
  };

  // ── Close on backdrop click (native <dialog> behaviour) ──

  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    // Clicks on the backdrop (outside the dialog box) should close
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="data-source-modal"
      onClick={handleDialogClick}
      onCancel={onClose}
    >
      <form onSubmit={handleSubmit} className="modal-form">
        <h3>{isEdit ? 'Edit Data Source' : 'Add Data Source'}</h3>

        {error && <p className="modal-error">{error}</p>}

        {/* Platform selector */}
        <label>
          Platform
          <select
            value={platformId}
            onChange={(e) => setPlatformId(e.target.value)}
            disabled={isEdit}
          >
            <option value="">— Select —</option>
            {platforms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="custom">Custom…</option>
          </select>
        </label>

        {/* Custom platform name — only when "Custom" selected */}
        {platformId === 'custom' && (
          <label>
            Platform Name
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. OKX, Gate.io"
              disabled={isEdit}
            />
          </label>
        )}

        {/* Display name */}
        <label>
          Display Name (optional)
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={defaultDisplayName() || 'My Binance account'}
          />
        </label>

        {/* API Credentials section */}
        {isEdit && existingSource?.credentials && !editingCredentials ? (
          // Edit mode with existing credentials — show masked values
          <div className="credentials-display">
            <p className="credentials-label">API Credentials</p>
            <p className="credentials-masked">
              Key: {mask(existingSource.credentials.apiKey)}
            </p>
            <p className="credentials-masked">
              Secret: {mask(existingSource.credentials.apiSecret)}
            </p>
            <div className="credentials-actions">
              <button type="button" onClick={() => setEditingCredentials(true)}>
                Update credentials
              </button>
              <button
                type="button"
                className="btn-destructive"
                onClick={handleRemoveCredentials}
              >
                Remove credentials
              </button>
            </div>
          </div>
        ) : (
          // Add mode, or edit mode with no credentials / actively editing
          <>
            {!showCredentials && !editingCredentials ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowCredentials(true);
                  setEditingCredentials(true);
                }}
              >
                + Add API credentials
              </button>
            ) : (
              <fieldset className="credentials-fields">
                <legend>API Credentials</legend>
                <label>
                  API Key
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter API key"
                    autoComplete="off"
                  />
                </label>
                <label>
                  API Secret
                  <input
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter API secret"
                    autoComplete="off"
                  />
                </label>
              </fieldset>
            )}
          </>
        )}

        {/* Action buttons */}
        <div className="modal-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          {isEdit && (
            <button
              type="button"
              className="btn-destructive"
              onClick={handleDelete}
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}

export default DataSourceModal;
