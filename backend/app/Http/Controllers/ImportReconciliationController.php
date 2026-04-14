<?php

namespace App\Http\Controllers;

use App\Models\ImportBatch;
use App\Models\ImportRow;
use App\Services\ImportModuleConfig;
use App\Services\ImportReconciliationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ImportReconciliationController extends Controller
{
    public function __construct(
        private ImportReconciliationService $reconciliation
    ) {}

    /**
     * POST /api/reconcile-import/{module}
     * Upload and analyse a spreadsheet file.
     */
    public function upload(Request $request, string $module): JsonResponse
    {
        $supported = array_keys(ImportModuleConfig::supportedModules());
        if (!in_array($module, $supported)) {
            return response()->json([
                'message' => "Unsupported module: {$module}. Supported: " . implode(', ', $supported),
            ], 422);
        }

        $request->validate([
            'file' => 'required|file|max:20480|mimes:xlsx,xls,csv',
        ]);

        $file     = $request->file('file');
        $user     = $request->user();
        $year     = now()->year;
        $filePath = $file->store("imports/{$year}/{$module}", 'local');

        try {
            $batch = $this->reconciliation->processFile(
                $module,
                $filePath,
                $file->getClientOriginalName(),
                $user->id
            );

            return response()->json([
                'message'  => 'File analysed successfully',
                'batch_id' => $batch->id,
                'batch'    => $this->formatBatch($batch),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to process file: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/reconcile-import/{batch}/preview
     * Return full preview with all classified rows.
     */
    public function preview(int $batch): JsonResponse
    {
        $batch = ImportBatch::findOrFail($batch);

        if (!in_array($batch->status, ['preview_ready', 'completed'])) {
            return response()->json([
                'message' => "Batch is not ready for preview (status: {$batch->status})",
            ], 422);
        }

        $rows = ImportRow::where('batch_id', $batch->id)
            ->orderBy('row_number')
            ->get();

        return response()->json([
            'batch'   => $this->formatBatch($batch),
            'summary' => $batch->summary_text,
            'rows'    => $rows->map(fn ($r) => $this->formatRow($r)),
        ]);
    }

    /**
     * POST /api/reconcile-import/{batch}/confirm
     * Execute the sync for a previewed batch.
     */
    public function confirm(Request $request, int $batch): JsonResponse
    {
        $batch = ImportBatch::findOrFail($batch);
        $user  = $request->user();

        if ($batch->status !== 'preview_ready') {
            return response()->json([
                'message' => "Cannot confirm batch with status: {$batch->status}",
            ], 422);
        }

        // Only uploader or admin can confirm
        if ($batch->uploaded_by !== $user->id && !in_array($user->role, ['system_admin', 'master'])) {
            return response()->json([
                'message' => 'Only the uploader or an admin can confirm this import.',
            ], 403);
        }

        try {
            $results = $this->reconciliation->executeBatch($batch, $user->id);

            return response()->json([
                'message'        => 'Sync completed',
                'created'        => $results['created'],
                'updated'        => $results['updated'],
                'skipped'        => $results['skipped'],
                'conflicts_held' => $results['conflicts_held'],
                'errors'         => $results['errors'],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Sync failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/reconcile-import/{batch}/cancel
     * Cancel a pending import batch.
     */
    public function cancel(int $batch): JsonResponse
    {
        $batch = ImportBatch::findOrFail($batch);

        if (in_array($batch->status, ['completed', 'syncing'])) {
            return response()->json([
                'message' => "Cannot cancel a batch with status: {$batch->status}",
            ], 422);
        }

        $batch->update(['status' => 'cancelled']);

        // Clean up uploaded file
        if ($batch->file_path && Storage::disk('local')->exists($batch->file_path)) {
            Storage::disk('local')->delete($batch->file_path);
        }

        return response()->json(['message' => 'Import cancelled']);
    }

    /**
     * GET /api/reconcile-import/history?module={module}
     * Return recent import batches for a module.
     */
    public function history(Request $request): JsonResponse
    {
        $query = ImportBatch::query()->orderByDesc('created_at')->limit(20);

        if ($module = $request->query('module')) {
            $query->where('module', $module);
        }

        $batches = $query->get();

        return response()->json([
            'batches' => $batches->map(fn ($b) => $this->formatBatch($b)),
        ]);
    }

    /**
     * GET /api/reconcile-import/modules
     * Return list of supported modules.
     */
    public function modules(): JsonResponse
    {
        return response()->json([
            'modules' => ImportModuleConfig::supportedModules(),
        ]);
    }

    // ── Private helpers ────────────────────────────────────

    private function formatBatch(ImportBatch $batch): array
    {
        return [
            'id'                  => $batch->id,
            'batch_code'          => $batch->batch_code,
            'module'              => $batch->module,
            'original_filename'   => $batch->original_filename,
            'file_size_kb'        => $batch->file_size_kb,
            'status'              => $batch->status,
            'total_rows'          => $batch->total_rows,
            'parsed_rows'         => $batch->parsed_rows,
            'parse_errors'        => $batch->parse_errors,
            'new_count'           => $batch->new_count,
            'update_count'        => $batch->update_count,
            'duplicate_count'     => $batch->duplicate_count,
            'conflict_count'      => $batch->conflict_count,
            'error_count'         => $batch->error_count,
            'intra_file_dup_count'=> $batch->intra_file_dup_count,
            'created_count'       => $batch->created_count,
            'updated_count'       => $batch->updated_count,
            'skipped_count'       => $batch->skipped_count,
            'conflicts_held'      => $batch->conflicts_held,
            'parse_error_message' => $batch->parse_error_message,
            'uploaded_by'         => $batch->uploaded_by,
            'confirmed_by'        => $batch->confirmed_by,
            'parsed_at'           => $batch->parsed_at?->toISOString(),
            'confirmed_at'        => $batch->confirmed_at?->toISOString(),
            'completed_at'        => $batch->completed_at?->toISOString(),
            'created_at'          => $batch->created_at?->toISOString(),
        ];
    }

    private function formatRow(ImportRow $row): array
    {
        return [
            'id'                  => $row->id,
            'row_number'          => $row->row_number,
            'classification'      => $row->classification,
            'match_type'          => $row->match_type,
            'match_confidence'    => $row->match_confidence,
            'matched_record_id'   => $row->matched_record_id,
            'matched_record_uuid' => $row->matched_record_uuid,
            'matched_record_code' => $row->matched_record_code,
            'raw_data'            => $row->raw_data,
            'fields_to_fill'      => $row->fields_to_fill,
            'fields_conflicting'  => $row->fields_conflicting,
            'fields_identical'    => $row->fields_identical,
            'conflict_reason'     => $row->conflict_reason,
            'sync_action'         => $row->sync_action,
            'sync_error'          => $row->sync_error,
            'display_name'        => $row->display_name,
            'display_id'          => $row->display_id,
        ];
    }
}
