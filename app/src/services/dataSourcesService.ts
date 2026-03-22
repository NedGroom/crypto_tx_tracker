// app/src/services/dataSourcesService.ts
// Thin service layer: Supabase CRUD + credential encryption + snake_case mapping.
// Keeps the Redux slice free of Supabase and crypto details.

import { supabase } from '../config/supabase';
import { encryptCredentials, decryptCredentials } from '../utils/crypto';
import type { DataSource, ApiCredentials } from '../store/dataSourcesSlice';

// ── Snake-case DB row shape ──────────────────────────────────

interface DataSourceRow {
  id: string;
  user_id: string;
  platform_id: string;
  custom_platform_name: string | null;
  display_name: string;
  credentials_encrypted: string | null;
  created_at: string;
}

// ── Mapping helpers ──────────────────────────────────────────

async function rowToDataSource(row: DataSourceRow): Promise<DataSource> {
  let credentials: ApiCredentials | null = null;
  if (row.credentials_encrypted) {
    credentials = await decryptCredentials(row.credentials_encrypted);
  }

  return {
    id: row.id,
    platformId: row.platform_id,
    ...(row.custom_platform_name && {
      customPlatformName: row.custom_platform_name,
    }),
    displayName: row.display_name,
    credentials,
    createdAt: row.created_at,
  };
}

// ── Service functions ────────────────────────────────────────

export async function fetchAll(): Promise<DataSource[]> {
  const { data, error } = await supabase
    .from('data_sources')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  return Promise.all((data as DataSourceRow[]).map(rowToDataSource));
}

export async function create(
  input: Omit<DataSource, 'id' | 'createdAt'>,
  userId: string,
): Promise<DataSource> {
  let credentialsEncrypted: string | null = null;
  if (input.credentials) {
    credentialsEncrypted = await encryptCredentials(input.credentials);
  }

  const { data, error } = await supabase
    .from('data_sources')
    .insert({
      user_id: userId,
      platform_id: input.platformId,
      custom_platform_name: input.customPlatformName ?? null,
      display_name: input.displayName,
      credentials_encrypted: credentialsEncrypted,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return rowToDataSource(data as DataSourceRow);
}

export async function update(
  id: string,
  changes: Partial<Omit<DataSource, 'id' | 'createdAt'>>,
): Promise<DataSource> {
  // Build the update payload — only include fields that were actually changed
  const payload: Record<string, unknown> = {};

  if (changes.displayName !== undefined) {
    payload.display_name = changes.displayName;
  }
  if (changes.platformId !== undefined) {
    payload.platform_id = changes.platformId;
  }
  if (changes.customPlatformName !== undefined) {
    payload.custom_platform_name = changes.customPlatformName;
  }
  if (changes.credentials !== undefined) {
    payload.credentials_encrypted = changes.credentials
      ? await encryptCredentials(changes.credentials)
      : null;
  }

  const { data, error } = await supabase
    .from('data_sources')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return rowToDataSource(data as DataSourceRow);
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase.from('data_sources').delete().eq('id', id);

  if (error) throw new Error(error.message);
}
