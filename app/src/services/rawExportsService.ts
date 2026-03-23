// app/src/services/rawExportsService.ts
// Service for raw CSV export chunks stored in Supabase.

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '../config/supabase';
import type {
  RawExportChunk,
  CsvImportType,
  IngestMethod,
  RawExportStatus,
  RawExportPayloadRow,
} from '../store/rawExportsSlice';

const MAX_IMPORT_BYTES = 1 * 1024 * 1024; // 1MB hard limit for F4a

interface RawExportRow {
  id: string;
  user_id: string;
  data_source_id: string;
  ingest_method: IngestMethod;
  import_type: CsvImportType;
  description: string | null;
  source_file_name: string | null;
  export_start_date: string | null;
  export_end_date: string | null;
  row_count: number | null;
  column_list: string[];
  payload_jsonb: RawExportPayloadRow[];
  status: RawExportStatus;
  created_at: string;
}

interface RawExportSummaryRow {
  id: string;
  user_id: string;
  data_source_id: string;
  ingest_method: IngestMethod;
  import_type: CsvImportType;
  description: string | null;
  source_file_name: string | null;
  export_start_date: string | null;
  export_end_date: string | null;
  row_count: number | null;
  column_list: string[];
  status: RawExportStatus;
  created_at: string;
}

function rowToChunk(row: RawExportRow): RawExportChunk {
  return {
    id: row.id,
    userId: row.user_id,
    dataSourceId: row.data_source_id,
    ingestMethod: row.ingest_method,
    importType: row.import_type,
    description: row.description ?? null,
    sourceFileName: row.source_file_name ?? null,
    exportStartDate: row.export_start_date ?? null,
    exportEndDate: row.export_end_date ?? null,
    rowCount: row.row_count ?? 0,
    columnList: row.column_list ?? [],
    payloadJson: row.payload_jsonb ?? [],
    status: row.status,
    createdAt: row.created_at,
  };
}

function summaryToChunk(row: RawExportSummaryRow): RawExportChunk {
  return {
    id: row.id,
    userId: row.user_id,
    dataSourceId: row.data_source_id,
    ingestMethod: row.ingest_method,
    importType: row.import_type,
    description: row.description ?? null,
    sourceFileName: row.source_file_name ?? null,
    exportStartDate: row.export_start_date ?? null,
    exportEndDate: row.export_end_date ?? null,
    rowCount: row.row_count ?? 0,
    columnList: row.column_list ?? [],
    payloadJson: null,
    status: row.status,
    createdAt: row.created_at,
  };
}

function parseCsvFile(file: File): Promise<{
  rows: RawExportPayloadRow[];
  columns: string[];
}> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        if (results.errors.length > 0) {
          reject(new Error(results.errors[0].message));
          return;
        }

        const rows = (results.data as Record<string, unknown>[]).map((row) => {
          const parsed: RawExportPayloadRow = {};
          Object.entries(row).forEach(([key, value]) => {
            parsed[key] = value == null ? '' : String(value);
          });
          return parsed;
        });

        const columns = (results.meta.fields ?? []).map((field) =>
          String(field),
        );
        resolve({ rows, columns });
      },
      error(error) {
        reject(new Error(error.message));
      },
    });
  });
}

async function parseXlsxFile(file: File): Promise<{
  rows: RawExportPayloadRow[];
  columns: string[];
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('XLSX file has no sheets');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
  });

  const parsedRows: RawExportPayloadRow[] = rows.map((row) => {
    const parsed: RawExportPayloadRow = {};
    Object.entries(row).forEach(([key, value]) => {
      parsed[key] = value == null ? '' : String(value);
    });
    return parsed;
  });

  const columns =
    parsedRows.length > 0
      ? Object.keys(parsedRows[0])
      : ((
          XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            blankrows: false,
            raw: false,
          })[0] as unknown[] | undefined
        )?.map((cell) => String(cell)) ?? []);

  return { rows: parsedRows, columns };
}

export async function listByDataSource(
  dataSourceId: string,
): Promise<RawExportChunk[]> {
  const { data, error } = await supabase
    .from('raw_exports')
    .select(
      'id,user_id,data_source_id,ingest_method,import_type,description,source_file_name,export_start_date,export_end_date,row_count,column_list,status,created_at',
    )
    .eq('data_source_id', dataSourceId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data as RawExportSummaryRow[]).map(summaryToChunk);
}

export async function getById(rawExportId: string): Promise<RawExportChunk> {
  const { data, error } = await supabase
    .from('raw_exports')
    .select('*')
    .eq('id', rawExportId)
    .single();

  if (error) throw new Error(error.message);

  return rowToChunk(data as RawExportRow);
}

export async function createCsvImport(input: {
  userId: string;
  dataSourceId: string;
  file: File;
  description: string;
  importType: CsvImportType;
  exportStartDate: string | null;
  exportEndDate: string | null;
}): Promise<RawExportChunk> {
  const lowerName = input.file.name.toLowerCase();
  const isCsv = lowerName.endsWith('.csv');
  const isXlsx = lowerName.endsWith('.xlsx');

  if (!isCsv && !isXlsx) {
    throw new Error('Only CSV and XLSX files are supported');
  }

  if (input.file.size > MAX_IMPORT_BYTES) {
    throw new Error(
      'Import file is too large. Split the export into files under 1MB.',
    );
  }

  const { rows, columns } = isCsv
    ? await parseCsvFile(input.file)
    : await parseXlsxFile(input.file);

  const { data, error } = await supabase
    .from('raw_exports')
    .insert({
      user_id: input.userId,
      data_source_id: input.dataSourceId,
      ingest_method: 'csv',
      import_type: input.importType,
      description: input.description || null,
      source_file_name: input.file.name,
      export_start_date: input.exportStartDate,
      export_end_date: input.exportEndDate,
      row_count: rows.length,
      column_list: columns,
      payload_jsonb: rows,
      status: 'uploaded',
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  return rowToChunk(data as RawExportRow);
}
