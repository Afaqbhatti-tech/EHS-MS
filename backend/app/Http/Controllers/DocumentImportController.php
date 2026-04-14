<?php

namespace App\Http\Controllers;

use App\Models\DocumentImport;
use App\Services\Import\DocumentImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocumentImportController extends Controller
{
    public function __construct(
        protected DocumentImportService $importService,
    ) {}

    /**
     * Upload and analyze a document.
     * POST /api/imports/upload
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => [
                'required',
                'file',
                'max:20480', // 20MB
                'mimes:pdf,doc,docx,xls,xlsx,csv,ppt,pptx,txt',
            ],
        ]);

        try {
            $import = $this->importService->uploadAndAnalyze(
                $request->file('file'),
                $request->user()
            );

            $preview = $this->importService->getPreview($import);

            return response()->json([
                'success' => true,
                'message' => 'Document analyzed successfully',
                'data' => [
                    'import' => $this->formatImport($import),
                    'preview' => $preview,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to process document: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get preview for an analyzed import.
     * GET /api/imports/{id}/preview
     */
    public function preview(string $id): JsonResponse
    {
        $import = DocumentImport::findOrFail($id);

        if (!in_array($import->status, ['analyzed', 'partial'])) {
            return response()->json([
                'success' => false,
                'message' => 'Import is not ready for preview. Status: ' . $import->status,
            ], 400);
        }

        $preview = $this->importService->getPreview($import);

        return response()->json([
            'success' => true,
            'data' => [
                'import' => $this->formatImport($import),
                'preview' => $preview,
            ],
        ]);
    }

    /**
     * Confirm import and create records.
     * POST /api/imports/{id}/confirm
     */
    public function confirm(Request $request, string $id): JsonResponse
    {
        $import = DocumentImport::findOrFail($id);

        $request->validate([
            'skip_items' => 'array',
            'skip_items.*' => 'string',
            'overrides' => 'array',
        ]);

        try {
            $import = $this->importService->confirm($import, [
                'skip_items' => $request->input('skip_items', []),
                'overrides' => $request->input('overrides', []),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Import confirmed successfully',
                'data' => [
                    'import' => $this->formatImport($import),
                    'summary' => $import->import_summary,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to confirm import: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * List import history.
     * GET /api/imports
     */
    public function index(Request $request): JsonResponse
    {
        $imports = $this->importService->listImports([
            'status' => $request->query('status'),
            'document_type' => $request->query('document_type'),
        ]);

        return response()->json([
            'success' => true,
            'data' => $imports->map(fn($i) => $this->formatImport($i)),
        ]);
    }

    /**
     * Get single import details.
     * GET /api/imports/{id}
     */
    public function show(string $id): JsonResponse
    {
        $import = DocumentImport::with('items')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $this->formatImport($import),
        ]);
    }

    /**
     * Delete an import.
     * DELETE /api/imports/{id}
     */
    public function destroy(string $id): JsonResponse
    {
        $import = DocumentImport::findOrFail($id);

        $this->importService->deleteImport($import);

        return response()->json([
            'success' => true,
            'message' => 'Import deleted successfully',
        ]);
    }

    /**
     * Get supported file types info.
     * GET /api/imports/supported-types
     */
    public function supportedTypes(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'types' => [
                    ['extension' => 'pdf', 'label' => 'PDF Documents', 'mime' => 'application/pdf', 'icon' => 'file-text'],
                    ['extension' => 'docx', 'label' => 'Word Documents', 'mime' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'icon' => 'file-text'],
                    ['extension' => 'doc', 'label' => 'Word Documents (Legacy)', 'mime' => 'application/msword', 'icon' => 'file-text'],
                    ['extension' => 'xlsx', 'label' => 'Excel Spreadsheets', 'mime' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'icon' => 'table'],
                    ['extension' => 'xls', 'label' => 'Excel Spreadsheets (Legacy)', 'mime' => 'application/vnd.ms-excel', 'icon' => 'table'],
                    ['extension' => 'csv', 'label' => 'CSV Files', 'mime' => 'text/csv', 'icon' => 'table'],
                    ['extension' => 'pptx', 'label' => 'PowerPoint Presentations', 'mime' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'icon' => 'presentation'],
                    ['extension' => 'ppt', 'label' => 'PowerPoint (Legacy)', 'mime' => 'application/vnd.ms-powerpoint', 'icon' => 'presentation'],
                    ['extension' => 'txt', 'label' => 'Text Files', 'mime' => 'text/plain', 'icon' => 'file-text'],
                ],
                'max_size_mb' => 20,
                'modules' => [
                    'mom' => 'Weekly MOM',
                    'training' => 'Training Matrix',
                    'permits' => 'Permits',
                    'observations' => 'Observations',
                    'mockups' => 'Mock-Up Register',
                    'checklists' => 'Checklists',
                    'tracker' => 'Equipment Tracker',
                    'manpower' => 'Manpower',
                    'incidents' => 'Incidents',
                ],
            ],
        ]);
    }

    /**
     * Format import for API response.
     */
    protected function formatImport(DocumentImport $import): array
    {
        $data = [
            'id' => $import->id,
            'original_name' => $import->original_name,
            'file_type' => $import->file_type,
            'file_size' => $import->file_size,
            'status' => $import->status,
            'document_type' => $import->document_type,
            'classification' => $import->classification,
            'total_sections' => $import->total_sections,
            'total_records_created' => $import->total_records_created,
            'total_records_updated' => $import->total_records_updated,
            'total_warnings' => $import->total_warnings,
            'warnings' => $import->warnings,
            'errors' => $import->errors,
            'import_summary' => $import->import_summary,
            'imported_by' => $import->imported_by,
            'imported_by_name' => $import->imported_by_name,
            'confirmed_at' => $import->confirmed_at?->toISOString(),
            'processing_time_ms' => $import->processing_time_ms,
            'created_at' => $import->created_at?->toISOString(),
            'extracted_data' => $import->extracted_data,
        ];

        if ($import->relationLoaded('items')) {
            $data['items'] = $import->items->map(fn($item) => [
                'id' => $item->id,
                'target_module' => $item->target_module,
                'target_model' => $item->target_model,
                'target_record_id' => $item->target_record_id,
                'action' => $item->action,
                'section_heading' => $item->section_heading,
                'mapped_fields' => $item->mapped_fields,
                'confidence' => $item->confidence,
                'status' => $item->status,
                'duplicate_of' => $item->duplicate_of,
                'warnings' => $item->warnings,
                'error_message' => $item->error_message,
            ]);
        }

        return $data;
    }
}
