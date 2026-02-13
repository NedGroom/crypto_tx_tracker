// app/src/store/index.ts
// Central Redux store configuration. All feature slices are registered here.
// Exports typed hooks and store types used throughout the app.

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Future slices (e.g. transactions, settings) will be added here
  },
});

// Infer TypeScript types from the store itself — used throughout the app
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
