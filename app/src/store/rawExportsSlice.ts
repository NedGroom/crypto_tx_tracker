// app/src/store/rawExportsSlice.ts
// Redux slice for raw export chunks (CSV/API import history per data source).

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { RootState } from './index';
import * as rawExportsService from '../services/rawExportsService';

export type IngestMethod = 'csv' | 'api';
export type RawExportStatus = 'uploaded' | 'failed';

export type CsvImportType =
  | 'trades'
  | 'deposits'
  | 'withdrawals'
  | 'transfers'
  | 'rewards'
  | 'other';

export type RawExportPayloadRow = Record<string, string>;

export interface RawExportChunk {
  id: string;
  userId: string;
  dataSourceId: string;
  ingestMethod: IngestMethod;
  importType: CsvImportType;
  description: string | null;
  sourceFileName: string | null;
  exportStartDate: string | null;
  exportEndDate: string | null;
  rowCount: number;
  columnList: string[];
  payloadJson: RawExportPayloadRow[] | null;
  status: RawExportStatus;
  createdAt: string;
}

interface RawExportsState {
  byDataSource: Record<string, RawExportChunk[]>;
  loadingByDataSource: Record<string, boolean>;
  errorByDataSource: Record<string, string | null>;
  creatingByDataSource: Record<string, boolean>;
  selected: RawExportChunk | null;
  selectedLoading: boolean;
  selectedError: string | null;
}

const initialState: RawExportsState = {
  byDataSource: {},
  loadingByDataSource: {},
  errorByDataSource: {},
  creatingByDataSource: {},
  selected: null,
  selectedLoading: false,
  selectedError: null,
};

export const fetchRawExportsByDataSource = createAsyncThunk(
  'rawExports/fetchByDataSource',
  async (dataSourceId: string) => {
    const exports = await rawExportsService.listByDataSource(dataSourceId);
    return { dataSourceId, exports };
  },
);

export const createCsvRawExport = createAsyncThunk(
  'rawExports/createCsv',
  async (
    input: {
      dataSourceId: string;
      file: File;
      description: string;
      importType: CsvImportType;
      exportStartDate: string | null;
      exportEndDate: string | null;
    },
    { getState },
  ) => {
    const state = getState() as RootState;
    const userId = state.auth.user?.sub;
    if (!userId) throw new Error('User not authenticated');

    const chunk = await rawExportsService.createCsvImport({
      userId,
      dataSourceId: input.dataSourceId,
      file: input.file,
      description: input.description,
      importType: input.importType,
      exportStartDate: input.exportStartDate,
      exportEndDate: input.exportEndDate,
    });

    return chunk;
  },
);

export const fetchRawExportById = createAsyncThunk(
  'rawExports/fetchById',
  async (rawExportId: string) => {
    return rawExportsService.getById(rawExportId);
  },
);

const rawExportsSlice = createSlice({
  name: 'rawExports',
  initialState,
  reducers: {
    clearSelectedRawExport(state) {
      state.selected = null;
      state.selectedError = null;
      state.selectedLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRawExportsByDataSource.pending, (state, action) => {
        const id = action.meta.arg;
        state.loadingByDataSource[id] = true;
        state.errorByDataSource[id] = null;
      })
      .addCase(fetchRawExportsByDataSource.fulfilled, (state, action) => {
        state.loadingByDataSource[action.payload.dataSourceId] = false;
        state.byDataSource[action.payload.dataSourceId] =
          action.payload.exports;
      })
      .addCase(fetchRawExportsByDataSource.rejected, (state, action) => {
        const id = action.meta.arg;
        state.loadingByDataSource[id] = false;
        state.errorByDataSource[id] =
          action.error.message ?? 'Failed to load raw exports';
      });

    builder
      .addCase(createCsvRawExport.pending, (state, action) => {
        const id = action.meta.arg.dataSourceId;
        state.creatingByDataSource[id] = true;
        state.errorByDataSource[id] = null;
      })
      .addCase(createCsvRawExport.fulfilled, (state, action) => {
        const chunk = action.payload;
        state.creatingByDataSource[chunk.dataSourceId] = false;
        if (!state.byDataSource[chunk.dataSourceId]) {
          state.byDataSource[chunk.dataSourceId] = [];
        }
        state.byDataSource[chunk.dataSourceId].unshift(chunk);
      })
      .addCase(createCsvRawExport.rejected, (state, action) => {
        const id = action.meta.arg.dataSourceId;
        state.creatingByDataSource[id] = false;
        state.errorByDataSource[id] =
          action.error.message ?? 'Failed to create CSV raw export';
      });

    builder
      .addCase(fetchRawExportById.pending, (state) => {
        state.selectedLoading = true;
        state.selectedError = null;
      })
      .addCase(fetchRawExportById.fulfilled, (state, action) => {
        state.selectedLoading = false;
        state.selected = action.payload;
      })
      .addCase(fetchRawExportById.rejected, (state, action) => {
        state.selectedLoading = false;
        state.selected = null;
        state.selectedError =
          action.error.message ?? 'Failed to load raw export';
      });
  },
});

export const { clearSelectedRawExport } = rawExportsSlice.actions;

export const selectRawExportsByDataSource = (
  state: RootState,
  dataSourceId: string,
) => state.rawExports.byDataSource[dataSourceId] ?? [];

export const selectRawExportsLoadingByDataSource = (
  state: RootState,
  dataSourceId: string,
) => state.rawExports.loadingByDataSource[dataSourceId] ?? false;

export const selectRawExportsErrorByDataSource = (
  state: RootState,
  dataSourceId: string,
) => state.rawExports.errorByDataSource[dataSourceId] ?? null;

export const selectRawExportsCreatingByDataSource = (
  state: RootState,
  dataSourceId: string,
) => state.rawExports.creatingByDataSource[dataSourceId] ?? false;

export const selectSelectedRawExport = (state: RootState) =>
  state.rawExports.selected;

export const selectSelectedRawExportLoading = (state: RootState) =>
  state.rawExports.selectedLoading;

export const selectSelectedRawExportError = (state: RootState) =>
  state.rawExports.selectedError;

export default rawExportsSlice.reducer;
