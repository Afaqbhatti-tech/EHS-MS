<?php

namespace App\Http\Controllers;

use App\Models\RamsDocument;
use App\Models\RamsDocumentVersion;
use App\Models\WorkLine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Constants\StatusConstants;
use App\Services\NotificationService;

class RamsDocumentController extends Controller
{
    /**
     * GET /api/rams/documents
     * List all documents with optional filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = RamsDocument::with(['workLine:id,name,slug,color', 'submitter:id,full_name', 'approver:id,full_name', 'latestVersion']);

        if ($request->filled('work_line_id')) {
            $query->where('work_line_id', $request->input('work_line_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('contractor')) {
            $query->where('contractor', $request->input('contractor'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('ref_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $documents = $query->orderByDesc('updated_at')->get()->map(fn ($doc) => $this->formatDocument($doc));

        return response()->json($documents);
    }

    /**
     * GET /api/rams/documents/{id}
     * Single document with all versions.
     */
    public function show(string $id): JsonResponse
    {
        $doc = RamsDocument::with([
            'workLine:id,name,slug,color',
            'submitter:id,full_name',
            'approver:id,full_name',
            'versions.uploader:id,full_name',
        ])->findOrFail($id);

        $result = $this->formatDocument($doc);
        $result['rejected_reason'] = $doc->rejected_reason;
        $result['versions'] = $doc->versions->map(fn ($v) => [
            'id' => $v->id,
            'version_number' => $v->version_number,
            'file_path' => $v->file_path,
            'file_name' => $v->file_name,
            'file_size' => $v->file_size,
            'mime_type' => $v->mime_type,
            'notes' => $v->notes,
            'uploaded_by' => $v->uploader ? [
                'id' => $v->uploader->id,
                'name' => $v->uploader->full_name,
            ] : null,
            'created_at' => $v->created_at->toISOString(),
        ]);

        return response()->json($result);
    }

    /**
     * POST /api/rams/documents
     * Create a new RAMS document (with optional file upload).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'work_line_id' => 'required|string|exists:work_lines,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'contractor' => 'nullable|string|max:100',
            'zone' => 'nullable|string|max:100',
            'due_date' => 'nullable|date',
            'tags' => 'nullable|array',
            'file' => 'nullable|file|max:51200', // 50MB
        ]);

        try {
            $user = $request->user();

            // Generate ref number: RAMS-{WORKLINE_SLUG}-{NNNN}
            $workLine = WorkLine::findOrFail($validated['work_line_id']);
            $prefix = 'RAMS-' . strtoupper(Str::substr(Str::slug($workLine->name, ''), 0, 4));
            $lastRef = RamsDocument::where('ref_number', 'like', $prefix . '-%')
                ->orderByDesc('ref_number')
                ->value('ref_number');
            $nextNum = $lastRef ? ((int) substr($lastRef, strrpos($lastRef, '-') + 1)) + 1 : 1;
            $refNumber = $prefix . '-' . str_pad($nextNum, 4, '0', STR_PAD_LEFT);

            return DB::transaction(function () use ($validated, $user, $refNumber, $request) {
                $doc = RamsDocument::create([
                    'id' => (string) Str::uuid(),
                    'work_line_id' => $validated['work_line_id'],
                    'ref_number' => $refNumber,
                    'title' => $validated['title'],
                    'description' => $validated['description'] ?? null,
                    'contractor' => $validated['contractor'] ?? null,
                    'zone' => $validated['zone'] ?? null,
                    'status' => StatusConstants::RAMS_DRAFT,
                    'current_version' => 0,
                    'submitted_by' => $user->id,
                    'due_date' => $validated['due_date'] ?? null,
                    'tags' => $validated['tags'] ?? null,
                ]);

                // If a file was uploaded, create version 1
                if ($request->hasFile('file')) {
                    $this->createVersion($doc, $request->file('file'), $user->id, 'Initial upload');
                }

                $doc->load(['workLine:id,name,slug,color', 'submitter:id,full_name', 'latestVersion']);

                NotificationService::ramsSubmitted($doc, $user->id);

                return response()->json($this->formatDocument($doc), 201);
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to create document: ' . $e->getMessage()], 500);
        }
    }

    /**
     * PUT /api/rams/documents/{id}
     * Update document metadata.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'contractor' => 'nullable|string|max:100',
            'zone' => 'nullable|string|max:100',
            'due_date' => 'nullable|date',
            'tags' => 'nullable|array',
            'work_line_id' => 'sometimes|string|exists:work_lines,id',
        ]);

        try {
            $doc = RamsDocument::findOrFail($id);

            $doc->update($validated);
            $doc->load(['workLine:id,name,slug,color', 'submitter:id,full_name', 'approver:id,full_name', 'latestVersion']);

            return response()->json($this->formatDocument($doc));
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to update document: ' . $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/rams/documents/{id}/versions
     * Upload a new version file.
     */
    public function uploadVersion(Request $request, string $id): JsonResponse
    {
        $doc = RamsDocument::findOrFail($id);

        $request->validate([
            'file' => 'required|file|max:51200',
            'notes' => 'nullable|string',
        ]);

        $user = $request->user();
        $version = $this->createVersion($doc, $request->file('file'), $user->id, $request->input('notes'));

        return response()->json([
            'id' => $version->id,
            'version_number' => $version->version_number,
            'file_name' => $version->file_name,
            'file_size' => $version->file_size,
            'notes' => $version->notes,
            'created_at' => $version->created_at->toISOString(),
        ], 201);
    }

    /**
     * PATCH /api/rams/documents/{id}/status
     * Transition document status (submit, approve, reject, revert to draft).
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $doc = RamsDocument::findOrFail($id);
        $user = $request->user();

        $validated = $request->validate([
            'status' => 'required|string|in:Submitted,Under Review,Approved,Rejected,Draft,Superseded',
            'rejected_reason' => 'nullable|string|required_if:status,Rejected',
        ]);

        $newStatus = $validated['status'];

        // Enforce valid transitions
        $allowed = $this->getAllowedTransitions($doc->status);
        if (!in_array($newStatus, $allowed)) {
            return response()->json([
                'message' => "Cannot transition from '{$doc->status}' to '{$newStatus}'.",
            ], 422);
        }

        // Must have at least one version to submit
        if ($newStatus === 'Submitted' && $doc->current_version < 1) {
            return response()->json(['message' => 'Cannot submit a document without an uploaded file.'], 422);
        }

        // Permission checks for approval/rejection
        if (in_array($newStatus, ['Approved', 'Rejected'])) {
            if (!$user->isMaster() && !$user->hasPermission('can_approve_rams')) {
                return response()->json(['message' => 'You do not have permission to approve or reject RAMS documents.'], 403);
            }
        }

        $doc->status = $newStatus;

        if ($newStatus === 'Approved') {
            $doc->approved_by = $user->id;
            $doc->approved_at = now();
            $doc->rejected_reason = null;
        } elseif ($newStatus === 'Rejected') {
            $doc->rejected_reason = $validated['rejected_reason'] ?? null;
            $doc->approved_by = null;
            $doc->approved_at = null;
        } elseif ($newStatus === 'Draft') {
            $doc->approved_by = null;
            $doc->approved_at = null;
            $doc->rejected_reason = null;
        }

        $doc->save();
        $doc->load(['workLine:id,name,slug,color', 'submitter:id,full_name', 'approver:id,full_name', 'latestVersion']);

        NotificationService::ramsStatusChanged($doc, $newStatus, $user->id);

        return response()->json($this->formatDocument($doc));
    }

    /**
     * DELETE /api/rams/documents/{id}
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $doc = RamsDocument::findOrFail($id);

            // Delete associated files
            foreach ($doc->versions as $version) {
                if ($version->file_path && Storage::disk('local')->exists($version->file_path)) {
                    Storage::disk('local')->delete($version->file_path);
                }
            }

            $doc->delete();

            return response()->json(['message' => 'Document deleted.']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to delete document: ' . $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/rams/documents/{versionId}/download
     * Download a specific version file.
     */
    public function download(string $versionId): \Symfony\Component\HttpFoundation\StreamedResponse|JsonResponse
    {
        $version = RamsDocumentVersion::findOrFail($versionId);

        if (!Storage::disk('local')->exists($version->file_path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        return Storage::disk('local')->download($version->file_path, $version->file_name);
    }

    /**
     * GET /api/rams/stats
     * Dashboard-level stats.
     */
    public function stats(): JsonResponse
    {
        $statusCounts = RamsDocument::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $total = array_sum($statusCounts);
        $byContractor = RamsDocument::selectRaw('contractor, count(*) as count')
            ->whereNotNull('contractor')
            ->groupBy('contractor')
            ->pluck('count', 'contractor')
            ->toArray();

        return response()->json([
            'total' => $total,
            'by_status' => $statusCounts,
            'by_contractor' => $byContractor,
        ]);
    }

    // ── Helpers ──────────────────────────────────────

    private function createVersion(RamsDocument $doc, $file, string $userId, ?string $notes = null): RamsDocumentVersion
    {
        if (!$file || !$file->isValid()) {
            throw new \RuntimeException('File upload failed or file is invalid.');
        }

        $nextVersion = $doc->current_version + 1;
        $fileName = $file->getClientOriginalName();
        $storagePath = $file->storeAs(
            'rams/' . $doc->id,
            "v{$nextVersion}_" . Str::slug(pathinfo($fileName, PATHINFO_FILENAME)) . '.' . $file->getClientOriginalExtension(),
            'local'
        );

        if (!$storagePath) {
            throw new \RuntimeException('Failed to store uploaded file.');
        }

        $version = RamsDocumentVersion::create([
            'id' => (string) Str::uuid(),
            'rams_document_id' => $doc->id,
            'version_number' => $nextVersion,
            'file_path' => $storagePath,
            'file_name' => $fileName,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
            'uploaded_by' => $userId,
            'notes' => $notes,
        ]);

        $doc->update(['current_version' => $nextVersion]);

        return $version;
    }

    private function getAllowedTransitions(string $currentStatus): array
    {
        return match ($currentStatus) {
            'Draft' => ['Submitted'],
            'Submitted' => ['Under Review', 'Approved', 'Rejected', 'Draft'],
            'Under Review' => ['Approved', 'Rejected', 'Draft'],
            'Approved' => ['Superseded', 'Draft'],
            'Rejected' => ['Draft'],
            'Superseded' => ['Draft'],
            default => [],
        };
    }

    private function formatDocument($doc): array
    {
        return [
            'id' => $doc->id,
            'ref_number' => $doc->ref_number,
            'title' => $doc->title,
            'description' => $doc->description,
            'contractor' => $doc->contractor,
            'zone' => $doc->zone,
            'status' => $doc->status,
            'current_version' => $doc->current_version,
            'due_date' => $doc->due_date?->format('Y-m-d'),
            'tags' => $doc->tags,
            'work_line' => $doc->workLine ? [
                'id' => $doc->workLine->id,
                'name' => $doc->workLine->name,
                'slug' => $doc->workLine->slug,
                'color' => $doc->workLine->color,
            ] : null,
            'submitted_by' => $doc->submitter ? [
                'id' => $doc->submitter->id,
                'name' => $doc->submitter->full_name,
            ] : null,
            'approved_by' => $doc->approver ? [
                'id' => $doc->approver->id,
                'name' => $doc->approver->full_name,
            ] : null,
            'approved_at' => $doc->approved_at?->toISOString(),
            'latest_version' => $doc->latestVersion ? [
                'id' => $doc->latestVersion->id,
                'version_number' => $doc->latestVersion->version_number,
                'file_name' => $doc->latestVersion->file_name,
                'file_size' => $doc->latestVersion->file_size,
                'uploaded_at' => $doc->latestVersion->created_at?->toISOString(),
            ] : null,
            'created_at' => $doc->created_at?->toISOString(),
            'updated_at' => $doc->updated_at?->toISOString(),
        ];
    }
}
