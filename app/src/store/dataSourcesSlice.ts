// app/src/store/dataSourcesSlice.ts
// Redux slice managing data source state (platforms + optional API credentials).
// F3 scope: in-memory only — data is lost on page refresh.
// F3.5 will add backend persistence.

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './index';

// ── Types ────────────────────────────────────────────────────

export interface ApiCredentials {
  apiKey: string;
  apiSecret: string;
}

export interface DataSource {
  id: string; // UUID, generated on creation
  platformId: string; // Matches PlatformDef.id, or 'custom'
  customPlatformName?: string; // Only set when platformId === 'custom'
  displayName: string; // User-facing name, defaults to platform name
  credentials: ApiCredentials | null;
  createdAt: string; // ISO timestamp
}

interface DataSourcesState {
  sources: DataSource[];
}

// ── Initial state ────────────────────────────────────────────

const initialState: DataSourcesState = {
  sources: [],
};

// ── Payload types for actions ────────────────────────────────

type AddSourcePayload = Omit<DataSource, 'id' | 'createdAt'>;

type UpdateSourcePayload = { id: string } & Partial<
  Omit<DataSource, 'id' | 'createdAt'>
>;

type SetCredentialsPayload = {
  id: string;
  credentials: ApiCredentials | null;
};

// ── Slice definition ─────────────────────────────────────────

const dataSourcesSlice = createSlice({
  name: 'dataSources',
  initialState,
  reducers: {
    addSource: {
      reducer(state, action: PayloadAction<DataSource>) {
        state.sources.push(action.payload);
      },
      // prepare callback generates id + createdAt so components don't need to
      prepare(payload: AddSourcePayload) {
        return {
          payload: {
            ...payload,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
          },
        };
      },
    },

    updateSource(state, action: PayloadAction<UpdateSourcePayload>) {
      const { id, ...changes } = action.payload;
      const source = state.sources.find((s) => s.id === id);
      if (source) {
        Object.assign(source, changes);
      }
    },

    removeSource(state, action: PayloadAction<string>) {
      state.sources = state.sources.filter((s) => s.id !== action.payload);
    },

    setCredentials(state, action: PayloadAction<SetCredentialsPayload>) {
      const source = state.sources.find((s) => s.id === action.payload.id);
      if (source) {
        source.credentials = action.payload.credentials;
      }
    },
  },
});

// ── Action creators ──────────────────────────────────────────

export const { addSource, updateSource, removeSource, setCredentials } =
  dataSourcesSlice.actions;

// ── Selectors ────────────────────────────────────────────────

export const selectAllSources = (state: RootState) => state.dataSources.sources;

export const selectSourceById = (state: RootState, id: string) =>
  state.dataSources.sources.find((s) => s.id === id);

export const selectSourceCount = (state: RootState) =>
  state.dataSources.sources.length;

export default dataSourcesSlice.reducer;
