import { useState, useCallback } from 'react';
import { api } from '../../services/api';

export type Classification = 'new' | 'update' | 'duplicate' | 'conflict' | 'error' | 'intra_file_dup';
export type Confidence = 'strong' | 'moderate' | 'weak' | 'none';
export type Stage = 'upload' | 'preview' | 'result';

export interface ImportBatch {
  id: number;
  batch_code: string;
  module: string;
  original_filename: string;
  file_size_kb: number;
  status: string;
  total_rows: number;
  parsed_rows: number;
  parse_errors: number;
  new_count: number;
  update_count: number;
  duplicate_count: number;
  conflict_count: number;
  error_count: number;
  intra_file_dup_count: number;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  conflicts_held: number;
  parse_error_message: string | null;
  created_at: string;
}

export interface ImportRow {
  id: number;
  row_number: number;
  classification: Classification;
  match_type: string | null;
  match_confidence: Confidence;
  matched_record_id: number | null;
  matched_record_uuid: string | null;
  matched_record_code: string | null;
  raw_data: Record<string, unknown>;
  fields_to_fill: Record<string, unknown> | null;
  fields_conflicting: Record<string, { existing: unknown; incoming: unknown; reason?: string }> | null;
  fields_identical: string[] | null;
  conflict_reason: string | null;
  sync_action: string;
  sync_error: string | null;
  display_name: string;
  display_id: string | null;
}

export interface SyncResult {
  message: string;
  created: number;
  updated: number;
  skipped: number;
  conflicts_held: number;
  errors: number;
}

export function useImport(module: string) {
  const [stage, setStage] = useState<Stage>('upload');
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStage('upload');
    setBatch(null);
    setRows([]);
    setSyncResult(null);
    setUploading(false);
    setConfirming(false);
    setError(null);
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.uploadForm<{ batch_id: number; batch: ImportBatch }>(
        `/reconcile-import/${module}`,
        formData
      );

      setBatch(response.batch);

      // Fetch preview
      const preview = await api.get<{ batch: ImportBatch; rows: ImportRow[] }>(
        `/reconcile-import/${response.batch_id}/preview`
      );

      setBatch(preview.batch);
      setRows(preview.rows);
      setStage('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [module]);

  const confirmSync = useCallback(async () => {
    if (!batch) return;
    setConfirming(true);
    setError(null);
    try {
      const result = await api.post<SyncResult>(
        `/reconcile-import/${batch.id}/confirm`,
        {}
      );
      setSyncResult(result);
      setStage('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setConfirming(false);
    }
  }, [batch]);

  const cancelImport = useCallback(async () => {
    if (!batch) return;
    try {
      await api.post(`/reconcile-import/${batch.id}/cancel`, {});
    } catch {
      // silently ignore cancel errors
    }
    reset();
  }, [batch, reset]);

  return {
    stage, batch, rows, syncResult,
    uploading, confirming, error,
    uploadFile, confirmSync, cancelImport, reset,
  };
}
