<?php

namespace App\Http\Controllers;

use App\Models\Mockup;
use App\Models\MockupApprover;
use App\Models\MockupAttachment;
use App\Models\MockupComment;
use App\Models\MockupHistory;
use App\Models\MockupImportBatch;
use App\Models\MockupPersonnel;
use App\Models\RamsDocument;
use App\Models\RamsDocumentVersion;
use App\Models\WorkLine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Http\Traits\ExportsData;
use App\Services\NotificationService;
use App\Constants\StatusConstants;

class MockupController extends Controller
{
    use ExportsData;

    // ── LIST ──────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = Mockup::with([
            'ramsDocument:id,ref_number,title,work_line_id',
            'ramsDocument.workLine:id,name,slug',
            'ramsVersion:id,version_number,file_name',
            'createdByUser:id,full_name',
        ]);

        // Exclude superseded by default (unless explicitly requested)
        if (!$request->has('include_superseded')) {
            $query->where('approval_status', '!=', Mockup::STATUS_SUPERSEDED);
        }

        // Search
        if ($s = $request->get('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                  ->orWhere('ref_number', 'like', "%{$s}%")
                  ->orWhere('contractor', 'like', "%{$s}%")
                  ->orWhere('description', 'like', "%{$s}%")
                  ->orWhereHas('ramsDocument', fn ($rq) =>
                      $rq->where('title', 'like', "%{$s}%")
                         ->orWhere('ref_number', 'like', "%{$s}%")
                  );
            });
        }

        // Filters
        if ($v = $request->get('approval_status')) {
            $query->where('approval_status', $v);
        }
        if ($v = $request->get('contractor')) {
            $query->where('contractor', 'like', "%{$v}%");
        }
        if ($v = $request->get('zone')) {
            $query->where('zone', $v);
        }
        if ($v = $request->get('area')) {
            $query->where('area', $v);
        }
        if ($v = $request->get('phase')) {
            $query->where('phase', $v);
        }
        if ($v = $request->get('trim_line')) {
            $query->where('trim_line', $v);
        }
        if ($v = $request->get('mockup_type')) {
            $query->where('mockup_type', $v);
        }
        if ($v = $request->get('priority')) {
            $query->where('priority', $v);
        }
        if ($v = $request->get('rams_document_id')) {
            $query->where('rams_document_id', $v);
        }
        if ($v = $request->get('supervisor_name')) {
            $query->where('supervisor_name', 'like', "%{$v}%");
        }
        if ($from = $request->get('date_from')) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->get('date_to')) {
            $query->whereDate('created_at', '<=', $to);
        }
        if ($request->get('can_proceed') === '1') {
            $query->where('can_proceed', true);
        }
        if ($request->get('blocked') === '1') {
            $query->where('has_unresolved_comments', true);
        }
        if ($request->get('pending_compliance') === '1') {
            $query->where('compliance_status', 'Pending');
        }
        if ($period = $request->get('period')) {
            $query->period($period);
        }

        // Sort
        $sortBy  = $request->get('sort_by', 'created_at');
        $sortDir = $request->get('sort_dir', 'desc');
        $allowed = ['title', 'approval_status', 'created_at', 'submitted_at', 'priority', 'contractor', 'revision_number', 'mockup_type'];
        if (in_array($sortBy, $allowed)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        }

        $perPage = min(100, max(1, (int) $request->get('per_page', 20)));
        $paginated = $query->paginate($perPage);

        $data = collect($paginated->items())->map(fn ($m) => $this->formatMockup($m));

        return response()->json([
            'data'      => $data,
            'total'     => $paginated->total(),
            'page'      => $paginated->currentPage(),
            'per_page'  => $paginated->perPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    // ── CREATE ────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'               => 'required|string|max:500',
            'description'         => 'nullable|string',
            'procedure_type'      => 'nullable|string|max:100',
            'mockup_type'         => 'nullable|string|max:50',
            'area'                => 'nullable|string|max:200',
            'zone'                => 'nullable|string|max:200',
            'phase'               => 'nullable|string|max:50',
            'trim_line'           => 'nullable|string|max:200',
            'site'                => 'nullable|string|max:200',
            'project'             => 'nullable|string|max:200',
            'contractor'          => 'nullable|string|max:200',
            'supervisor_name'     => 'nullable|string|max:200',
            'supervisor_id'       => 'nullable|string',
            'rams_document_id'    => 'required|string|exists:rams_documents,id',
            'rams_version_id'     => 'nullable|string|exists:rams_document_versions,id',
            'tags'                => 'nullable|array',
            'tags.*'              => 'string|max:100',
            'planned_start_date'  => 'nullable|date',
            'planned_end_date'    => 'nullable|date|after_or_equal:planned_start_date',
            'mockup_date'         => 'nullable|date',
            'mockup_time'         => 'nullable|string|max:10',
            'priority'            => 'nullable|in:Low,Medium,High,Critical',
            'notes'               => 'nullable|string',
            'general_remarks'     => 'nullable|string',
            'involved_candidates' => 'nullable|string|max:2000',
            'manual_approved_by'  => 'nullable|string|max:2000',
            'photos'              => 'nullable|array',
            'photos.*'            => 'string',
            // Personnel & Approvers submitted inline
            'personnel'           => 'nullable|array',
            'personnel.*.person_name'  => 'required|string|max:255',
            'personnel.*.designation'  => 'nullable|string|max:200',
            'personnel.*.company'      => 'nullable|string|max:200',
            'personnel.*.user_id'      => 'nullable|string',
            'personnel.*.source_type'  => 'nullable|in:linked,manual',
            'approvers_list'      => 'nullable|array',
            'approvers_list.*.name'            => 'required|string|max:255',
            'approvers_list.*.designation'     => 'nullable|string|max:200',
            'approvers_list.*.approver_type'   => 'nullable|string|max:50',
            'approvers_list.*.approval_status' => 'nullable|string|max:50',
            'approvers_list.*.approval_date'   => 'nullable|date',
        ]);

        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        $validated['created_by'] = $user->id;
        $validated['updated_by'] = $user->id;
        $validated['approval_status'] = Mockup::STATUS_DRAFT;
        $validated['status'] = 'Open';

        if (!empty($validated['rams_version_id'])) {
            $version = RamsDocumentVersion::find($validated['rams_version_id']);
            $validated['rams_revision_number'] = $version ? "Rev.{$version->version_number}" : null;
        }

        // Remove nested data before creating mockup
        $personnelData = $validated['personnel'] ?? [];
        $approversData = $validated['approvers_list'] ?? [];
        unset($validated['personnel'], $validated['approvers_list']);

        try {
            return DB::transaction(function () use ($validated, $user, $personnelData, $approversData) {
                $mockup = Mockup::create($validated);

                // Create personnel records
                foreach ($personnelData as $p) {
                    MockupPersonnel::create([
                        'mockup_id'   => $mockup->id,
                        'person_name' => $p['person_name'],
                        'designation' => $p['designation'] ?? null,
                        'company'     => $p['company'] ?? null,
                        'user_id'     => $p['user_id'] ?? null,
                        'source_type' => $p['source_type'] ?? 'manual',
                    ]);
                }

                // Create approver records
                foreach ($approversData as $a) {
                    MockupApprover::create([
                        'mockup_id'       => $mockup->id,
                        'name'            => $a['name'],
                        'designation'     => $a['designation'] ?? null,
                        'approver_type'   => $a['approver_type'] ?? null,
                        'approval_status' => $a['approval_status'] ?? 'Pending',
                        'approval_date'   => $a['approval_date'] ?? null,
                    ]);
                }

                $mockup->logHistory(
                    'Created', null, $mockup->approval_status,
                    'Mock-Up created by ' . ($user->full_name ?? $user->email)
                );

                $mockup->load([
                    'ramsDocument:id,ref_number,title,work_line_id',
                    'ramsDocument.workLine:id,name,slug',
                    'ramsVersion:id,version_number,file_name',
                    'createdByUser:id,full_name',
                    'personnel', 'approvers',
                ]);

                return response()->json([
                    'message' => 'Mock-Up created successfully',
                    'mockup'  => $this->formatMockup($mockup),
                ], 201);
            });
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    // ── SHOW ──────────────────────────────────────────────

    public function show(string $id): JsonResponse
    {
        $mockup = Mockup::with([
            'ramsDocument.versions',
            'ramsDocument.workLine:id,name,slug',
            'ramsVersion',
            'comments.author:id,full_name,role',
            'comments.replies.author:id,full_name,role',
            'history',
            'createdByUser:id,full_name',
            'approvedByUser:id,full_name',
            'submittedByUser:id,full_name',
            'personnel',
            'approvers',
            'mockupAttachments',
        ])->findOrFail($id);

        $result = $this->formatMockupDetail($mockup);

        return response()->json($result);
    }

    // ── UPDATE ────────────────────────────────────────────

    public function update(Request $request, string $id): JsonResponse
    {
        $mockup = Mockup::findOrFail($id);
        $user = $request->user();

        $validated = $request->validate([
            'title'              => 'sometimes|string|max:500',
            'description'        => 'nullable|string',
            'procedure_type'     => 'nullable|string|max:100',
            'mockup_type'        => 'nullable|string|max:50',
            'area'               => 'nullable|string|max:200',
            'zone'               => 'nullable|string|max:200',
            'phase'              => 'nullable|string|max:50',
            'trim_line'          => 'nullable|string|max:200',
            'site'               => 'nullable|string|max:200',
            'project'            => 'nullable|string|max:200',
            'contractor'         => 'nullable|string|max:200',
            'supervisor_name'    => 'nullable|string|max:200',
            'rams_document_id'   => 'required|string|exists:rams_documents,id',
            'rams_version_id'    => 'nullable|string|exists:rams_document_versions,id',
            'tags'               => 'nullable|array',
            'planned_start_date' => 'nullable|date',
            'planned_end_date'   => 'nullable|date',
            'mockup_date'        => 'nullable|date',
            'mockup_time'        => 'nullable|string|max:10',
            'priority'           => 'nullable|in:Low,Medium,High,Critical',
            'notes'              => 'nullable|string',
            'general_remarks'    => 'nullable|string',
            'involved_candidates' => 'nullable|string|max:2000',
            'manual_approved_by'  => 'nullable|string|max:2000',
            'photos'             => 'nullable|array',
            'photos.*'           => 'string',
            'personnel'          => 'nullable|array',
            'personnel.*.person_name'  => 'required|string|max:255',
            'personnel.*.designation'  => 'nullable|string|max:200',
            'personnel.*.company'      => 'nullable|string|max:200',
            'personnel.*.user_id'      => 'nullable|string',
            'personnel.*.source_type'  => 'nullable|in:linked,manual',
            'approvers_list'     => 'nullable|array',
            'approvers_list.*.name'            => 'required|string|max:255',
            'approvers_list.*.designation'     => 'nullable|string|max:200',
            'approvers_list.*.approver_type'   => 'nullable|string|max:50',
            'approvers_list.*.approval_status' => 'nullable|string|max:50',
            'approvers_list.*.approval_date'   => 'nullable|date',
        ]);

        // Prevent direct approval_status changes via update
        unset($validated['approval_status']);
        $validated['updated_by'] = $user->id;

        if (!empty($validated['rams_version_id'])) {
            $version = RamsDocumentVersion::find($validated['rams_version_id']);
            $validated['rams_revision_number'] = $version ? "Rev.{$version->version_number}" : null;
        }

        $personnelData = $validated['personnel'] ?? null;
        $approversData = $validated['approvers_list'] ?? null;
        unset($validated['personnel'], $validated['approvers_list']);

        try {
            return DB::transaction(function () use ($mockup, $validated, $user, $personnelData, $approversData) {
                $oldStatus = $mockup->approval_status;
                $mockup->update($validated);

                // Replace personnel if provided
                if ($personnelData !== null) {
                    $mockup->personnel()->delete();
                    foreach ($personnelData as $p) {
                        MockupPersonnel::create([
                            'mockup_id'   => $mockup->id,
                            'person_name' => $p['person_name'],
                            'designation' => $p['designation'] ?? null,
                            'company'     => $p['company'] ?? null,
                            'user_id'     => $p['user_id'] ?? null,
                            'source_type' => $p['source_type'] ?? 'manual',
                        ]);
                    }
                }

                // Replace approvers if provided
                if ($approversData !== null) {
                    $mockup->approvers()->delete();
                    foreach ($approversData as $a) {
                        MockupApprover::create([
                            'mockup_id'       => $mockup->id,
                            'name'            => $a['name'],
                            'designation'     => $a['designation'] ?? null,
                            'approver_type'   => $a['approver_type'] ?? null,
                            'approval_status' => $a['approval_status'] ?? 'Pending',
                            'approval_date'   => $a['approval_date'] ?? null,
                        ]);
                    }
                }

                $mockup->logHistory(
                    'Updated', $oldStatus, $mockup->approval_status,
                    'Mock-Up details updated'
                );

                $mockup->load([
                    'ramsDocument:id,ref_number,title,work_line_id',
                    'ramsDocument.workLine:id,name,slug',
                    'ramsVersion:id,version_number,file_name',
                    'personnel', 'approvers',
                ]);

                return response()->json([
                    'message' => 'Mock-Up updated',
                    'mockup'  => $this->formatMockup($mockup->fresh()),
                ]);
            });
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    // ── DELETE ─────────────────────────────────────────────

    public function destroy(string $id): JsonResponse
    {
        try {
            $mockup = Mockup::findOrFail($id);
            $mockup->deleted_by = Auth::user()?->full_name ?? Auth::user()?->email ?? 'System';
            $mockup->save();
            $mockup->delete();
            RecycleBinController::logDeleteAction('mockup', $mockup);
            return response()->json(['message' => 'Mock-Up deleted successfully']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    // ── CREATE REVISION ───────────────────────────────────

    public function createRevision(Request $request, string $id): JsonResponse
    {
        $original = Mockup::with(['personnel', 'approvers'])->findOrFail($id);
        $user = $request->user();

        if (!$original->requiresNewRevision()) {
            return response()->json([
                'message' => 'This mock-up does not require a new revision. Only Rejected or Approved with Comments mock-ups can be revised.',
            ], 422);
        }

        $request->validate([
            'resubmission_note' => 'required|string|min:5',
        ]);

        return DB::transaction(function () use ($original, $user, $request) {
            $rootId = $original->parent_mockup_id ?? $original->id;

            // Calculate next revision number from the chain
            $maxRev = Mockup::where(function ($q) use ($rootId) {
                $q->where('id', $rootId)->orWhere('parent_mockup_id', $rootId);
            })->max('revision_number');

            $newRevNumber = ($maxRev ?? 1) + 1;

            // Mark original as superseded
            $oldStatus = $original->approval_status;
            $original->update(['approval_status' => Mockup::STATUS_SUPERSEDED]);
            $original->logHistory(
                'Superseded', $oldStatus, Mockup::STATUS_SUPERSEDED,
                "Superseded by revision {$newRevNumber}"
            );

            // Create new revision copying forward base data
            $newMockup = Mockup::create([
                'title'              => $original->title,
                'description'        => $original->description,
                'procedure_type'     => $original->procedure_type,
                'mockup_type'        => $original->mockup_type,
                'area'               => $original->area,
                'zone'               => $original->zone,
                'phase'              => $original->phase,
                'trim_line'          => $original->trim_line,
                'site'               => $original->site,
                'project'            => $original->project,
                'contractor'         => $original->contractor,
                'supervisor_name'    => $original->supervisor_name,
                'supervisor_id'      => $original->supervisor_id,
                'rams_document_id'   => $original->rams_document_id,
                'rams_version_id'    => $original->rams_version_id,
                'rams_revision_number' => $original->rams_revision_number,
                'tags'               => $original->tags,
                'priority'           => $original->priority,
                'mockup_date'        => $original->mockup_date,
                'mockup_time'        => $original->mockup_time,
                'planned_start_date' => $original->planned_start_date,
                'planned_end_date'   => $original->planned_end_date,
                'notes'              => $original->notes,
                'approval_status'    => Mockup::STATUS_DRAFT,
                'revision_number'    => $newRevNumber,
                'parent_mockup_id'   => $rootId,
                'ref_number'         => $original->ref_number, // Keep same ref
                'created_by'         => $user->id,
                'updated_by'         => $user->id,
                'status'             => 'Open',
            ]);

            // Copy personnel
            foreach ($original->personnel as $p) {
                MockupPersonnel::create([
                    'mockup_id'   => $newMockup->id,
                    'person_name' => $p->person_name,
                    'designation' => $p->designation,
                    'company'     => $p->company,
                    'user_id'     => $p->user_id,
                    'source_type' => $p->source_type,
                ]);
            }

            // Copy approvers (reset status)
            foreach ($original->approvers as $a) {
                MockupApprover::create([
                    'mockup_id'       => $newMockup->id,
                    'name'            => $a->name,
                    'designation'     => $a->designation,
                    'approver_type'   => $a->approver_type,
                    'approval_status' => 'Pending',
                    'approval_date'   => null,
                ]);
            }

            // Add resubmission note as comment
            MockupComment::create([
                'mockup_id'             => $newMockup->id,
                'user_id'               => $user->id,
                'user_name'             => $user->full_name ?? $user->email,
                'user_role'             => $this->getUserRole($user),
                'comment_type'          => 'Re-submission Note',
                'comment_text'          => $request->resubmission_note,
                'is_resolved'           => true,
                'mockup_status_at_time' => Mockup::STATUS_DRAFT,
            ]);

            $newMockup->logHistory(
                'Revision Created', null, Mockup::STATUS_DRAFT,
                "Revision {$newRevNumber} created from {$original->ref_number} Rev {$original->revision_number}. " .
                'Reason: ' . $request->resubmission_note,
                ['previous_id' => $original->id, 'previous_revision' => $original->revision_number]
            );

            $newMockup->load([
                'ramsDocument:id,ref_number,title,work_line_id',
                'ramsDocument.workLine:id,name,slug',
                'ramsVersion:id,version_number,file_name',
                'createdByUser:id,full_name',
                'personnel', 'approvers',
            ]);

            return response()->json([
                'message' => "Revision {$newRevNumber} created successfully",
                'mockup'  => $this->formatMockup($newMockup),
            ], 201);
        });
    }

    // ── SUBMIT FOR REVIEW ─────────────────────────────────

    public function submitForReview(Request $request, string $id): JsonResponse
    {
        $mockup = Mockup::findOrFail($id);

        if (!$mockup->rams_document_id) {
            return response()->json([
                'message' => 'Cannot submit for review without a linked RAMS document.',
            ], 422);
        }

        if (!in_array($mockup->approval_status, [Mockup::STATUS_DRAFT, Mockup::STATUS_REJECTED, Mockup::STATUS_RESUBMITTED])) {
            return response()->json([
                'message' => 'Mock-Up is not in a submittable status',
            ], 422);
        }

        $user = $request->user();
        $oldStatus = $mockup->approval_status;

        $mockup->update([
            'approval_status' => Mockup::STATUS_SUBMITTED,
            'submitted_at'    => now(),
            'submitted_by'    => $user->id,
        ]);

        $mockup->logHistory(
            'Submitted for Review', $oldStatus, Mockup::STATUS_SUBMITTED,
            'Submitted for client/consultant review by ' . ($user->full_name ?? $user->email)
        );

        NotificationService::mockupSubmitted($mockup, $user->id);

        return response()->json([
            'message' => 'Mock-Up submitted for review',
            'mockup'  => $this->formatMockup($mockup->fresh()),
        ]);
    }

    // ── APPROVE ───────────────────────────────────────────

    public function approve(Request $request, string $id): JsonResponse
    {
        $mockup = Mockup::findOrFail($id);
        $user = $request->user();

        $this->authorizeReviewAction($user);

        if (!in_array($mockup->approval_status, [Mockup::STATUS_SUBMITTED, Mockup::STATUS_RESUBMITTED])) {
            return response()->json(['message' => 'Mock-Up is not pending review'], 422);
        }

        if ($mockup->has_unresolved_comments) {
            return response()->json([
                'message' => "Cannot approve — there are {$mockup->unresolved_comment_count} unresolved comment(s). All comments must be resolved before approval.",
            ], 422);
        }

        $request->validate([
            'approval_note'   => 'nullable|string',
            'general_remarks' => 'nullable|string',
        ]);

        $oldStatus = $mockup->approval_status;
        $mockup->update([
            'approval_status'  => Mockup::STATUS_APPROVED,
            'approved_by'      => $user->id,
            'approved_at'      => now(),
            'reviewed_by'      => $user->id,
            'reviewed_at'      => now(),
            'general_remarks'  => $request->general_remarks ?? $mockup->general_remarks,
        ]);

        if ($request->filled('approval_note')) {
            MockupComment::create([
                'mockup_id'             => $mockup->id,
                'user_id'               => $user->id,
                'user_name'             => $user->full_name ?? $user->email,
                'user_role'             => $this->getUserRole($user),
                'comment_type'          => 'Approval Note',
                'comment_text'          => $request->approval_note,
                'is_resolved'           => true,
                'mockup_status_at_time' => Mockup::STATUS_APPROVED,
            ]);
        }

        $mockup->logHistory(
            'Approved', $oldStatus, Mockup::STATUS_APPROVED,
            'Approved by ' . ($user->full_name ?? $user->email) . '. Work may now proceed.',
            ['approval_note' => $request->approval_note]
        );

        NotificationService::mockupDecision($mockup, 'Approved', $user->id);

        return response()->json([
            'message' => 'Mock-Up approved. Work may proceed.',
            'mockup'  => $this->formatMockup($mockup->fresh()),
        ]);
    }

    // ── REJECT ────────────────────────────────────────────

    public function reject(Request $request, string $id): JsonResponse
    {
        $mockup = Mockup::findOrFail($id);
        $user = $request->user();

        $this->authorizeReviewAction($user);

        if (!in_array($mockup->approval_status, [Mockup::STATUS_SUBMITTED, Mockup::STATUS_RESUBMITTED])) {
            return response()->json(['message' => 'Mock-Up is not pending review'], 422);
        }

        $request->validate([
            'rejection_reason' => 'required|string|min:10',
        ]);

        $oldStatus = $mockup->approval_status;
        $mockup->update([
            'approval_status'  => Mockup::STATUS_REJECTED,
            'rejected_by'      => $user->id,
            'rejected_at'      => now(),
            'rejection_reason' => $request->rejection_reason,
            'reviewed_by'      => $user->id,
            'reviewed_at'      => now(),
        ]);

        MockupComment::create([
            'mockup_id'             => $mockup->id,
            'user_id'               => $user->id,
            'user_name'             => $user->full_name ?? $user->email,
            'user_role'             => $this->getUserRole($user),
            'comment_type'          => 'Rejection Reason',
            'comment_text'          => $request->rejection_reason,
            'is_resolved'           => false,
            'mockup_status_at_time' => Mockup::STATUS_REJECTED,
        ]);

        $mockup->recalculateCommentCounts();

        $mockup->logHistory(
            'Rejected', $oldStatus, Mockup::STATUS_REJECTED,
            'Rejected by ' . ($user->full_name ?? $user->email) . '. Work cannot proceed. New revision required.',
            ['reason' => $request->rejection_reason]
        );

        NotificationService::mockupDecision($mockup, 'Rejected', $user->id);

        return response()->json([
            'message' => 'Mock-Up rejected. A new revision is required before work can proceed.',
            'mockup'  => $this->formatMockup($mockup->fresh()),
        ]);
    }

    // ── APPROVE WITH COMMENTS ─────────────────────────────

    public function approveWithComments(Request $request, string $id): JsonResponse
    {
        $mockup = Mockup::findOrFail($id);
        $user = $request->user();

        $this->authorizeReviewAction($user);

        if (!in_array($mockup->approval_status, [Mockup::STATUS_SUBMITTED, Mockup::STATUS_RESUBMITTED])) {
            return response()->json(['message' => 'Mock-Up is not pending review'], 422);
        }

        $request->validate([
            'consultant_comments' => 'required|string|min:10',
        ]);

        $oldStatus = $mockup->approval_status;
        $mockup->update([
            'approval_status'     => Mockup::STATUS_APPROVED_COMMENTS,
            'reviewed_by'         => $user->id,
            'reviewed_at'         => now(),
            'consultant_comments' => $request->consultant_comments,
            'compliance_status'   => 'Pending',
        ]);

        MockupComment::create([
            'mockup_id'             => $mockup->id,
            'user_id'               => $user->id,
            'user_name'             => $user->full_name ?? $user->email,
            'user_role'             => $this->getUserRole($user),
            'comment_type'          => 'Review Comment',
            'comment_text'          => $request->consultant_comments,
            'is_resolved'           => false,
            'mockup_status_at_time' => Mockup::STATUS_APPROVED_COMMENTS,
        ]);

        $mockup->recalculateCommentCounts();

        $mockup->logHistory(
            'Approved with Comments', $oldStatus, Mockup::STATUS_APPROVED_COMMENTS,
            'Approved with comments by ' . ($user->full_name ?? $user->email) . '. Work is in Pending Compliance until comments are resolved.',
            ['consultant_comments' => $request->consultant_comments]
        );

        NotificationService::mockupDecision($mockup, 'Approved with Comments', $user->id);

        return response()->json([
            'message' => 'Approved with comments. Work is in Pending Compliance until all comments are resolved or a new revision is submitted.',
            'mockup'  => $this->formatMockup($mockup->fresh()),
        ]);
    }

    // ── ADD COMMENT ───────────────────────────────────────

    public function addComment(Request $request, string $id): JsonResponse
    {
        $mockup = Mockup::findOrFail($id);
        $user = $request->user();

        $request->validate([
            'comment_text'      => 'required|string|min:2',
            'comment_type'      => 'nullable|in:Review Comment,Internal Note,Resolution Note,Re-submission Note',
            'parent_comment_id' => 'nullable|string|exists:mockup_comments,id',
        ]);

        $comment = MockupComment::create([
            'mockup_id'             => $mockup->id,
            'parent_comment_id'     => $request->parent_comment_id,
            'user_id'               => $user->id,
            'user_name'             => $user->full_name ?? $user->email,
            'user_role'             => $this->getUserRole($user),
            'comment_type'          => $request->comment_type ?? 'Internal Note',
            'comment_text'          => $request->comment_text,
            'is_resolved'           => false,
            'mockup_status_at_time' => $mockup->approval_status,
        ]);

        if ($comment->comment_type === 'Review Comment' && !$comment->parent_comment_id) {
            $mockup->recalculateCommentCounts();
        }

        $mockup->logHistory(
            'Comment Added', $mockup->approval_status, $mockup->approval_status,
            'Comment added by ' . ($user->full_name ?? $user->email),
            ['comment_preview' => substr($request->comment_text, 0, 100)]
        );

        $comment->load('author:id,full_name,role', 'replies.author:id,full_name,role');

        return response()->json([
            'message' => 'Comment added',
            'comment' => $this->formatComment($comment),
        ], 201);
    }

    // ── RESOLVE COMMENT ───────────────────────────────────

    public function resolveComment(Request $request, string $id, string $commentId): JsonResponse
    {
        $mockup = Mockup::findOrFail($id);
        $comment = MockupComment::findOrFail($commentId);

        if ($comment->mockup_id !== $mockup->id) {
            return response()->json(['message' => 'Comment does not belong to this mock-up'], 403);
        }

        if ($comment->is_resolved) {
            return response()->json(['message' => 'Comment is already resolved'], 422);
        }

        $request->validate(['resolution_note' => 'nullable|string']);

        $user = $request->user();
        $comment->update([
            'is_resolved'      => true,
            'resolved_by'      => $user->id,
            'resolved_by_name' => $user->full_name ?? $user->email,
            'resolved_at'      => now(),
            'resolution_note'  => $request->resolution_note,
        ]);

        $mockup->recalculateCommentCounts();

        $mockup->logHistory(
            'Comment Resolved', $mockup->approval_status, $mockup->approval_status,
            'Comment resolved by ' . ($user->full_name ?? $user->email),
            ['resolution_note' => $request->resolution_note, 'comment_id' => $comment->id]
        );

        // If ALL review comments now resolved and status is 'Approved with Comments'
        $freshMockup = $mockup->fresh();
        if (!$freshMockup->has_unresolved_comments && $freshMockup->approval_status === Mockup::STATUS_APPROVED_COMMENTS) {
            $freshMockup->update([
                'approval_status'   => Mockup::STATUS_COMMENTS_RESOLVED,
                'compliance_status' => 'Resolved',
            ]);
            $freshMockup->logHistory(
                'All Comments Resolved', Mockup::STATUS_APPROVED_COMMENTS, Mockup::STATUS_COMMENTS_RESOLVED,
                'All comments resolved. Compliance cleared. Work may now proceed.'
            );
        }

        return response()->json([
            'message'            => 'Comment resolved',
            'comment'            => $this->formatComment($comment->fresh()),
            'mockup_can_proceed' => $freshMockup->fresh()->can_proceed,
            'unresolved_count'   => $freshMockup->fresh()->unresolved_comment_count,
        ]);
    }

    // ── RE-SUBMIT (legacy, kept for backward compat) ──────

    public function reSubmit(Request $request, string $id): JsonResponse
    {
        // Redirect to createRevision for proper revision tracking
        return $this->createRevision($request, $id);
    }

    // ── UPLOAD TYPED ATTACHMENTS ──────────────────────────

    public function uploadAttachments(Request $request, string $id): JsonResponse
    {
        $mockup = Mockup::findOrFail($id);
        $user = $request->user();

        $request->validate([
            'attachment_type' => 'required|in:approved,rejected,comments,general',
            'files'           => 'required',
            'files.*'         => 'file|max:10240',
        ]);

        $files = $request->file('files');
        if (!is_array($files)) {
            $files = [$files];
        }

        $attachmentType = $request->attachment_type;
        $uploadDir = storage_path('app/public/mockups/attachments');
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $created = [];
        foreach ($files as $file) {
            if (!$file || !$file->isValid()) continue;

            $originalName = $file->getClientOriginalName();
            $size = $file->getSize();
            $mime = $file->getClientMimeType();
            $name = $attachmentType . '-' . time() . '-' . Str::random(8) . '.' . $file->getClientOriginalExtension();
            $file->move($uploadDir, $name);

            $attachment = MockupAttachment::create([
                'mockup_id'        => $mockup->id,
                'attachment_type'  => $attachmentType,
                'file_path'        => 'mockups/attachments/' . $name,
                'original_name'    => $originalName,
                'file_type'        => $mime,
                'file_size'        => $size,
                'uploaded_by'      => $user->id,
                'uploaded_by_name' => $user->full_name ?? $user->email,
            ]);

            $created[] = [
                'id'            => $attachment->id,
                'attachment_type' => $attachment->attachment_type,
                'file_path'     => $attachment->file_path,
                'original_name' => $attachment->original_name,
                'file_type'     => $attachment->file_type,
                'file_size'     => $attachment->file_size,
            ];
        }

        $mockup->logHistory(
            'Attachments Uploaded', $mockup->approval_status, $mockup->approval_status,
            count($created) . " {$attachmentType} attachment(s) uploaded"
        );

        return response()->json([
            'message'     => count($created) . ' attachment(s) uploaded',
            'attachments' => $created,
        ]);
    }

    // ── DELETE ATTACHMENT ─────────────────────────────────

    public function deleteAttachment(string $id, string $attachmentId): JsonResponse
    {
        $mockup = Mockup::findOrFail($id);
        $attachment = MockupAttachment::where('id', $attachmentId)
            ->where('mockup_id', $mockup->id)
            ->firstOrFail();

        $fullPath = storage_path('app/public/' . $attachment->file_path);
        if (file_exists($fullPath)) {
            unlink($fullPath);
        }

        $attachment->delete();

        return response()->json(['message' => 'Attachment removed']);
    }

    // ── STATS ─────────────────────────────────────────────

    public function stats(): JsonResponse
    {
        $kpis = DB::selectOne("
            SELECT
                COUNT(*) as total,
                SUM(approval_status = 'Draft') as draft,
                SUM(approval_status = 'Submitted for Review') as submitted,
                SUM(approval_status = 'Approved') as approved,
                SUM(approval_status = 'Rejected') as rejected,
                SUM(approval_status = 'Approved with Comments') as approved_with_comments,
                SUM(approval_status = 'Comments Resolved') as comments_resolved,
                SUM(approval_status = 'Re-submitted') as resubmitted,
                SUM(approval_status = 'Pending Compliance') as pending_compliance,
                SUM(approval_status = 'Superseded') as superseded,
                SUM(can_proceed = 1) as can_proceed,
                SUM(has_unresolved_comments = 1) as blocked,
                SUM(compliance_status = 'Pending') as compliance_pending
            FROM mockups WHERE deleted_at IS NULL AND approval_status != 'Superseded'
        ");

        $byContractor = DB::select("
            SELECT contractor, COUNT(*) as total
            FROM mockups
            WHERE deleted_at IS NULL AND contractor IS NOT NULL AND contractor != '' AND approval_status != 'Superseded'
            GROUP BY contractor ORDER BY total DESC
        ");

        $byPhase = DB::select("
            SELECT phase, COUNT(*) as total
            FROM mockups
            WHERE deleted_at IS NULL AND phase IS NOT NULL AND phase != '' AND approval_status != 'Superseded'
            GROUP BY phase ORDER BY total DESC
        ");

        $byPriority = DB::select("
            SELECT priority, COUNT(*) as total
            FROM mockups
            WHERE deleted_at IS NULL AND approval_status != 'Superseded'
            GROUP BY priority ORDER BY FIELD(priority, 'Critical', 'High', 'Medium', 'Low')
        ");

        $byMockupType = DB::select("
            SELECT mockup_type, COUNT(*) as total
            FROM mockups
            WHERE deleted_at IS NULL AND mockup_type IS NOT NULL AND mockup_type != '' AND approval_status != 'Superseded'
            GROUP BY mockup_type ORDER BY total DESC
        ");

        $monthly = DB::select("
            SELECT
                MONTH(created_at) as month,
                COUNT(*) as total,
                SUM(approval_status = 'Approved' OR approval_status = 'Comments Resolved') as approved,
                SUM(approval_status = 'Rejected') as rejected,
                SUM(approval_status = 'Submitted for Review' OR approval_status = 'Re-submitted') as pending
            FROM mockups
            WHERE deleted_at IS NULL AND YEAR(created_at) = ? AND approval_status != 'Superseded'
            GROUP BY MONTH(created_at) ORDER BY month
        ", [now()->year]);

        return response()->json([
            'kpis' => [
                'total'                  => (int) ($kpis->total ?? 0),
                'draft'                  => (int) ($kpis->draft ?? 0),
                'submitted'              => (int) ($kpis->submitted ?? 0),
                'approved'               => (int) ($kpis->approved ?? 0),
                'rejected'               => (int) ($kpis->rejected ?? 0),
                'approved_with_comments' => (int) ($kpis->approved_with_comments ?? 0),
                'comments_resolved'      => (int) ($kpis->comments_resolved ?? 0),
                'resubmitted'            => (int) ($kpis->resubmitted ?? 0),
                'pending_compliance'     => (int) ($kpis->pending_compliance ?? 0),
                'can_proceed'            => (int) ($kpis->can_proceed ?? 0),
                'blocked'                => (int) ($kpis->blocked ?? 0),
                'compliance_pending'     => (int) ($kpis->compliance_pending ?? 0),
            ],
            'byContractor'  => array_map(fn ($r) => ['contractor' => $r->contractor, 'total' => (int) $r->total], $byContractor),
            'byPhase'       => array_map(fn ($r) => ['phase' => $r->phase, 'total' => (int) $r->total], $byPhase),
            'byPriority'    => array_map(fn ($r) => ['priority' => $r->priority, 'total' => (int) $r->total], $byPriority),
            'byMockupType'  => array_map(fn ($r) => ['mockup_type' => $r->mockup_type, 'total' => (int) $r->total], $byMockupType),
            'monthly'       => array_map(fn ($r) => [
                'month'    => (int) $r->month,
                'total'    => (int) $r->total,
                'approved' => (int) ($r->approved ?? 0),
                'rejected' => (int) ($r->rejected ?? 0),
                'pending'  => (int) ($r->pending ?? 0),
            ], $monthly),
        ]);
    }

    // ── FILTER OPTIONS ────────────────────────────────────

    public function filterOptions(): JsonResponse
    {
        return response()->json([
            'contractors'   => Mockup::distinct()->whereNotNull('contractor')->where('contractor', '!=', '')->pluck('contractor'),
            'zones'         => Mockup::distinct()->whereNotNull('zone')->where('zone', '!=', '')->pluck('zone'),
            'areas'         => Mockup::distinct()->whereNotNull('area')->where('area', '!=', '')->pluck('area'),
            'phases'        => WorkLine::where('is_active', true)->orderBy('sort_order')->pluck('name'),
            'trim_lines'    => Mockup::distinct()->whereNotNull('trim_line')->where('trim_line', '!=', '')->pluck('trim_line'),
            'supervisors'   => Mockup::distinct()->whereNotNull('supervisor_name')->where('supervisor_name', '!=', '')->pluck('supervisor_name'),
            'mockup_types'  => Mockup::MOCKUP_TYPES,
            'rams_documents' => RamsDocument::with(['versions:id,rams_document_id,version_number,file_name'])
                ->select('id', 'ref_number', 'title')
                ->orderByDesc('created_at')
                ->get(),
        ]);
    }

    // ── REVISION HISTORY ──────────────────────────────────

    public function revisionHistory(string $id): JsonResponse
    {
        $mockup = Mockup::findOrFail($id);
        $rootId = $mockup->parent_mockup_id ?? $mockup->id;

        $revisions = Mockup::with(['createdByUser:id,full_name', 'approvedByUser:id,full_name'])
            ->where(function ($q) use ($rootId) {
                $q->where('id', $rootId)->orWhere('parent_mockup_id', $rootId);
            })
            ->orderBy('revision_number', 'asc')
            ->get()
            ->map(fn ($r) => [
                'id'              => $r->id,
                'ref_number'      => $r->ref_number,
                'revision_number' => $r->revision_number,
                'approval_status' => $r->approval_status,
                'compliance_status' => $r->compliance_status,
                'created_by'      => $r->createdByUser?->full_name,
                'approved_by'     => $r->approvedByUser?->full_name,
                'created_at'      => $r->created_at?->toISOString(),
                'approved_at'     => $r->approved_at?->toISOString(),
                'is_current'      => $r->approval_status !== Mockup::STATUS_SUPERSEDED,
            ]);

        return response()->json(['revisions' => $revisions]);
    }

    // ── EXPORT ────────────────────────────────────────────

    public function export(Request $request)
    {
        $query = Mockup::with(['ramsDocument:id,ref_number,title']);

        if (!$request->has('include_superseded')) {
            $query->where('approval_status', '!=', Mockup::STATUS_SUPERSEDED);
        }

        // Search
        if ($s = $request->get('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                  ->orWhere('ref_number', 'like', "%{$s}%")
                  ->orWhere('contractor', 'like', "%{$s}%")
                  ->orWhere('description', 'like', "%{$s}%")
                  ->orWhereHas('ramsDocument', fn ($rq) =>
                      $rq->where('title', 'like', "%{$s}%")
                         ->orWhere('ref_number', 'like', "%{$s}%")
                  );
            });
        }

        if ($status = $request->get('approval_status')) { $query->where('approval_status', $status); }
        if ($v = $request->get('contractor')) { $query->where('contractor', 'like', "%{$v}%"); }
        if ($v = $request->get('zone')) { $query->where('zone', $v); }
        if ($v = $request->get('area')) { $query->where('area', $v); }
        if ($v = $request->get('phase')) { $query->where('phase', $v); }
        if ($v = $request->get('trim_line')) { $query->where('trim_line', $v); }
        if ($v = $request->get('mockup_type')) { $query->where('mockup_type', $v); }
        if ($v = $request->get('priority')) { $query->where('priority', $v); }
        if ($v = $request->get('rams_document_id')) { $query->where('rams_document_id', $v); }
        if ($from = $request->get('date_from')) { $query->whereDate('created_at', '>=', $from); }
        if ($to = $request->get('date_to')) { $query->whereDate('created_at', '<=', $to); }
        if ($request->get('can_proceed') === '1') { $query->where('can_proceed', true); }
        if ($request->get('blocked') === '1') { $query->where('has_unresolved_comments', true); }
        if ($period = $request->get('period')) { $query->period($period); }

        $records = $query->orderByDesc('created_at')->get();

        $headers = [
            'Mock-Up ID', 'Title', 'Mock-Up Type', 'Area', 'Zone', 'Phase', 'Trim Line',
            'Contractor', 'Supervisor', 'RAMS Ref', 'RAMS Revision',
            'Approval Status', 'Compliance Status', 'Revision', 'Priority', 'Can Proceed',
            'Unresolved Comments', 'Mock-Up Date', 'Planned Start', 'Planned End',
            'Submitted At', 'Created At',
        ];

        $rows = $records->map(fn ($m) => [
            $m->ref_number,
            $m->title,
            $m->mockup_type,
            $m->area,
            $m->zone,
            $m->phase,
            $m->trim_line,
            $m->contractor,
            $m->supervisor_name,
            $m->ramsDocument?->ref_number,
            $m->rams_revision_number,
            $m->approval_status,
            $m->compliance_status,
            'Rev ' . $m->revision_number,
            $m->priority,
            $m->can_proceed ? 'Yes' : 'No',
            $m->unresolved_comment_count,
            $m->mockup_date?->format('Y-m-d'),
            $m->planned_start_date?->format('Y-m-d'),
            $m->planned_end_date?->format('Y-m-d'),
            $m->submitted_at?->format('Y-m-d H:i'),
            $m->created_at?->format('Y-m-d H:i'),
        ])->toArray();

        return $this->exportAs($headers, $rows, 'MockUp_Register', $request->get('format', 'csv'));
    }

    // ── UPLOAD ────────────────────────────────────────────

    public function upload(Request $request): JsonResponse
    {
        $files = $request->file('files');
        if (!$files) {
            return response()->json(['message' => 'No files provided'], 422);
        }
        if (!is_array($files)) {
            $files = [$files];
        }

        $uploaded = [];
        foreach ($files as $file) {
            if (!$file || !$file->isValid()) continue;

            $originalName = $file->getClientOriginalName();
            $size         = $file->getSize();
            $mimetype     = $file->getClientMimeType();

            $name = 'mkp-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
            $file->move(storage_path('app/public/mockups'), $name);

            $uploaded[] = [
                'filename'     => 'mockups/' . $name,
                'originalName' => $originalName,
                'size'         => $size,
                'mimetype'     => $mimetype,
            ];
        }

        return response()->json(['message' => 'Files uploaded successfully', 'files' => $uploaded]);
    }

    // ── UPLOAD PHOTOS (legacy, kept for backward compat) ──

    public function uploadPhotos(Request $request, string $id): JsonResponse
    {
        $mockup = Mockup::findOrFail($id);

        $photos = $request->file('photos');
        if (!$photos) {
            return response()->json(['message' => 'No photos provided'], 422);
        }
        if (!is_array($photos)) {
            $photos = [$photos];
        }

        $allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
        ];
        $maxSize = 10 * 1024 * 1024;

        $uploadedPaths = $mockup->photos ?? [];
        $newFiles = [];

        $photoDir = storage_path('app/public/mockups/photos');
        if (!is_dir($photoDir)) {
            mkdir($photoDir, 0755, true);
        }

        foreach ($photos as $photo) {
            if (!$photo || !$photo->isValid()) continue;

            if (!in_array($photo->getClientMimeType(), $allowedTypes)) {
                return response()->json([
                    'message' => 'Invalid file type: ' . $photo->getClientOriginalName(),
                ], 422);
            }

            if ($photo->getSize() > $maxSize) {
                return response()->json([
                    'message' => 'File too large: ' . $photo->getClientOriginalName() . '. Max size: 10MB.',
                ], 422);
            }

            $originalName = $photo->getClientOriginalName();
            $name = 'photo-' . time() . '-' . Str::random(8) . '.' . $photo->getClientOriginalExtension();
            $photo->move($photoDir, $name);
            $path = 'mockups/photos/' . $name;
            $uploadedPaths[] = $path;
            $newFiles[] = [
                'path'         => $path,
                'originalName' => $originalName,
            ];
        }

        $mockup->update(['photos' => $uploadedPaths]);

        $mockup->logHistory(
            'Photos Uploaded', $mockup->approval_status, $mockup->approval_status,
            count($newFiles) . ' photo(s) uploaded'
        );

        return response()->json([
            'message' => count($newFiles) . ' photo(s) uploaded successfully',
            'photos'  => $uploadedPaths,
            'new'     => $newFiles,
        ]);
    }

    // ── DELETE PHOTO ─────────────────────────────────────

    public function deletePhoto(Request $request, string $id): JsonResponse
    {
        $mockup = Mockup::findOrFail($id);

        $request->validate(['photo_path' => 'required|string']);
        $photoPath = $request->photo_path;

        $currentPhotos = $mockup->photos ?? [];
        $updatedPhotos = array_values(array_filter($currentPhotos, fn ($p) => $p !== $photoPath));

        $mockup->update(['photos' => $updatedPhotos]);

        $fullPath = storage_path('app/public/' . $photoPath);
        if (file_exists($fullPath)) {
            unlink($fullPath);
        }

        return response()->json([
            'message' => 'Photo removed',
            'photos'  => $updatedPhotos,
        ]);
    }

    // ── IMPORT ─────────────────────────────────────────────

    private const FIELD_ALIASES = [
        'title'              => ['title', 'activity', 'activity name', 'task', 'task name', 'name', 'item', 'mockup', 'subject', 'work item', 'activity title', 'mock-up', 'mock up'],
        'description'        => ['description', 'details', 'detail', 'scope', 'scope of work', 'work description'],
        'approval_status'    => ['status', 'approval status', 'approval_status', 'state', 'progress', 'workflow status', 'task status'],
        'area'               => ['area', 'location', 'building', 'section', 'work area'],
        'zone'               => ['zone', 'zone name', 'work zone'],
        'phase'              => ['phase', 'stage', 'construction phase', 'project phase'],
        'trim_line'          => ['trim line', 'trim_line', 'trimline'],
        'mockup_type'        => ['mockup type', 'mock-up type', 'type of mockup', 'mockup_type'],
        'contractor'         => ['contractor', 'company', 'subcontractor', 'vendor', 'assigned company', 'sub-contractor'],
        'supervisor_name'    => ['supervisor', 'supervisor name', 'responsible', 'assigned to', 'owner', 'person', 'assigned person', 'responsible person', 'point person'],
        'priority'           => ['priority', 'urgency', 'importance', 'severity'],
        'procedure_type'     => ['procedure', 'procedure type', 'type', 'category', 'work type'],
        'planned_start_date' => ['start date', 'planned start', 'start', 'begin date', 'from date', 'commencement'],
        'planned_end_date'   => ['end date', 'planned end', 'end', 'finish date', 'due date', 'deadline', 'completion date', 'target date', 'to date'],
        'notes'              => ['notes', 'remarks', 'comment', 'comments', 'remark', 'additional notes', 'observation', 'observations'],
    ];

    private const STATUS_MAP = [
        'open' => 'Draft', 'new' => 'Draft', 'draft' => 'Draft', 'pending' => 'Draft',
        'not started' => 'Draft', 'todo' => 'Draft', 'to do' => 'Draft', 'backlog' => 'Draft',
        'in progress' => 'Submitted for Review', 'in-progress' => 'Submitted for Review',
        'ongoing' => 'Submitted for Review', 'active' => 'Submitted for Review',
        'wip' => 'Submitted for Review', 'work in progress' => 'Submitted for Review',
        'under review' => 'Submitted for Review', 'submitted' => 'Submitted for Review',
        'submitted for review' => 'Submitted for Review', 'review' => 'Submitted for Review',
        'in review' => 'Submitted for Review',
        'closed' => 'Approved', 'completed' => 'Approved', 'done' => 'Approved',
        'resolved' => 'Approved', 'finished' => 'Approved', 'approved' => 'Approved', 'accepted' => 'Approved',
        'rejected' => 'Rejected', 'declined' => 'Rejected', 'denied' => 'Rejected',
        'failed' => 'Rejected', 'cancelled' => 'Rejected', 'canceled' => 'Rejected',
        'approved with comments' => 'Approved with Comments', 'conditional' => 'Approved with Comments',
        'conditionally approved' => 'Approved with Comments',
        're-submitted' => 'Re-submitted', 'resubmitted' => 'Re-submitted',
        'comments resolved' => 'Comments Resolved',
    ];

    private const PRIORITY_MAP = [
        'low' => 'Low', 'l' => 'Low', 'minor' => 'Low',
        'medium' => 'Medium', 'med' => 'Medium', 'm' => 'Medium', 'normal' => 'Medium', 'moderate' => 'Medium',
        'high' => 'High', 'h' => 'High', 'major' => 'High', 'important' => 'High',
        'critical' => 'Critical', 'urgent' => 'Critical', 'emergency' => 'Critical', 'severe' => 'Critical',
    ];

    public function importMockups(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file|max:20480']);

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());

        $supportedFormats = ['xlsx', 'xls', 'csv', 'docx', 'pdf', 'txt'];
        if (!in_array($extension, $supportedFormats)) {
            return response()->json([
                'message' => 'Unsupported file format. Supported: ' . implode(', ', array_map(fn ($f) => '.' . $f, $supportedFormats)),
            ], 422);
        }

        $storedName = 'import-' . time() . '-' . Str::random(6) . '.' . $extension;
        $importDir = storage_path('app/public/mockups/imports');
        if (!is_dir($importDir)) { mkdir($importDir, 0755, true); }
        $file->move($importDir, $storedName);
        $filePath = $importDir . DIRECTORY_SEPARATOR . $storedName;

        $user = $request->user();

        try {
            $parsed = match ($extension) {
                'xlsx', 'xls' => $this->parseExcelFile($filePath),
                'csv'         => $this->parseCsvFile($filePath),
                'docx'        => $this->parseDocxFile($filePath),
                'pdf'         => $this->parsePdfFile($filePath),
                'txt'         => $this->parseTxtFile($filePath),
                default       => throw new \Exception('Unsupported format'),
            };
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to parse file: ' . $e->getMessage()], 422);
        }

        if (empty($parsed['rows'])) {
            return response()->json(['message' => 'No data could be extracted from the uploaded file.'], 422);
        }

        $batch = MockupImportBatch::create([
            'file_name' => $storedName, 'original_name' => $request->file('file')->getClientOriginalName(),
            'file_type' => $extension, 'file_path' => 'mockups/imports/' . $storedName,
            'status' => StatusConstants::MOCKUP_BATCH_PROCESSING, 'imported_by' => $user->id,
            'imported_by_name' => $user->full_name ?? $user->email,
        ]);

        $result = DB::transaction(function () use ($parsed, $batch, $user) {
            return $this->processImportedRows($parsed, $batch, $user);
        });

        $batch->update([
            'total_parsed' => $result['total'], 'success_count' => $result['success'],
            'failed_count' => $result['failed'], 'skipped_count' => $result['skipped'],
            'errors' => $result['errors'] ?: null, 'field_mapping' => $result['field_mapping'] ?: null,
            'status' => StatusConstants::MOCKUP_BATCH_COMPLETED,
        ]);

        return response()->json([
            'message'  => "Import completed: {$result['success']} records created"
                . ($result['failed'] > 0 ? ", {$result['failed']} failed" : '')
                . ($result['skipped'] > 0 ? ", {$result['skipped']} skipped" : '') . '.',
            'batch_id' => $batch->id,
            'summary'  => [
                'total_parsed' => $result['total'], 'success_count' => $result['success'],
                'failed_count' => $result['failed'], 'skipped_count' => $result['skipped'],
                'errors' => array_slice($result['errors'], 0, 50), 'field_mapping' => $result['field_mapping'],
            ],
        ]);
    }

    public function importTemplate(Request $request)
    {
        $headers = [
            'Activity Name', 'Description', 'Status', 'Mock-Up Type', 'Area', 'Zone',
            'Phase', 'Trim Line', 'Contractor', 'Supervisor', 'Priority', 'Start Date', 'End Date', 'Notes',
        ];
        $sampleRows = [
            ['Foundation Inspection', 'Inspect foundation mockup', 'Draft', 'Physical Mock-Up', 'Building A', 'Zone A', 'Phase 1', 'TL-4', 'CCCC', 'John Doe', 'High', '2024-01-15', '2024-02-15', ''],
            ['Steel Frame Review', 'Review steel framework', 'Draft', 'Quality Mock-Up', 'Building B', 'Zone B', 'Phase 2', 'TL-2', 'CCC Rail', 'Jane Smith', 'Medium', '2024-01-20', '2024-03-01', ''],
        ];
        return $this->exportAs($headers, $sampleRows, 'MockUp_Import_Template', $request->get('format', 'xlsx'));
    }

    public function importHistory(Request $request): JsonResponse
    {
        $batches = MockupImportBatch::orderByDesc('created_at')
            ->take(50)->get()
            ->map(fn ($b) => [
                'id' => $b->id, 'original_name' => $b->original_name, 'file_type' => $b->file_type,
                'total_parsed' => $b->total_parsed, 'success_count' => $b->success_count,
                'failed_count' => $b->failed_count, 'skipped_count' => $b->skipped_count,
                'imported_by_name' => $b->imported_by_name, 'created_at' => $b->created_at?->toISOString(),
            ]);
        return response()->json(['data' => $batches]);
    }

    // ── Import Parsers ────────────────────────────────────

    private function parseExcelFile(string $filePath): array
    {
        $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReaderForFile($filePath);
        $reader->setReadDataOnly(true);
        $spreadsheet = $reader->load($filePath);
        $sheet = $spreadsheet->getActiveSheet();
        $headers = []; $rows = [];
        $highestRow = min($sheet->getHighestRow(), 5000);
        $highestCol = $sheet->getHighestColumn();
        $highestColIndex = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($highestCol);
        for ($row = 1; $row <= $highestRow; $row++) {
            $rowData = [];
            for ($col = 1; $col <= $highestColIndex; $col++) {
                $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col);
                $cell = $sheet->getCell($colLetter . $row);
                $value = $cell->getFormattedValue();
                $rowData[] = trim((string) ($value ?? ''));
            }
            if (implode('', $rowData) === '') continue;
            if (empty($headers)) { $headers = $rowData; }
            else {
                $mapped = [];
                foreach ($headers as $i => $header) {
                    if ($header !== '') { $mapped[$header] = $rowData[$i] ?? ''; }
                }
                $rows[] = $mapped;
            }
        }
        $spreadsheet->disconnectWorksheets();
        return ['headers' => $headers, 'rows' => $rows];
    }

    private function parseCsvFile(string $filePath): array
    {
        $headers = []; $rows = [];
        if (($handle = fopen($filePath, 'r')) !== false) {
            $lineCount = 0;
            while (($data = fgetcsv($handle, 0, ',')) !== false && $lineCount < 5000) {
                $lineCount++;
                $rowData = array_map(fn ($v) => trim((string) ($v ?? '')), $data);
                if (implode('', $rowData) === '') continue;
                if (empty($headers)) { $headers = $rowData; }
                else {
                    $mapped = [];
                    foreach ($headers as $i => $header) {
                        if ($header !== '') { $mapped[$header] = $rowData[$i] ?? ''; }
                    }
                    $rows[] = $mapped;
                }
            }
            fclose($handle);
        }
        return ['headers' => $headers, 'rows' => $rows];
    }

    private function parseDocxFile(string $filePath): array
    {
        $phpWord = \PhpOffice\PhpWord\IOFactory::load($filePath);
        foreach ($phpWord->getSections() as $section) {
            foreach ($section->getElements() as $element) {
                if ($element instanceof \PhpOffice\PhpWord\Element\Table) {
                    $tableData = $this->extractDocxTable($element);
                    if (!empty($tableData['rows'])) return $tableData;
                }
            }
        }
        $text = $this->extractDocxText($phpWord);
        return $this->parseTextContent($text);
    }

    private function extractDocxTable(\PhpOffice\PhpWord\Element\Table $table): array
    {
        $headers = []; $rows = [];
        foreach ($table->getRows() as $rowIndex => $row) {
            $rowData = [];
            foreach ($row->getCells() as $cell) {
                $cellText = '';
                foreach ($cell->getElements() as $element) {
                    if ($element instanceof \PhpOffice\PhpWord\Element\TextRun) {
                        foreach ($element->getElements() as $textEl) {
                            if (method_exists($textEl, 'getText')) $cellText .= $textEl->getText();
                        }
                    } elseif (method_exists($element, 'getText')) {
                        $cellText .= $element->getText();
                    }
                }
                $rowData[] = trim($cellText);
            }
            if (implode('', $rowData) === '') continue;
            if (empty($headers)) { $headers = $rowData; }
            else {
                $mapped = [];
                foreach ($headers as $i => $header) {
                    if ($header !== '') { $mapped[$header] = $rowData[$i] ?? ''; }
                }
                $rows[] = $mapped;
            }
        }
        return ['headers' => $headers, 'rows' => $rows];
    }

    private function extractDocxText($phpWord): string
    {
        $text = '';
        foreach ($phpWord->getSections() as $section) {
            foreach ($section->getElements() as $element) {
                if ($element instanceof \PhpOffice\PhpWord\Element\TextRun) {
                    foreach ($element->getElements() as $textEl) {
                        if (method_exists($textEl, 'getText')) $text .= $textEl->getText();
                    }
                    $text .= "\n";
                } elseif (method_exists($element, 'getText')) {
                    $text .= $element->getText() . "\n";
                }
            }
        }
        return $text;
    }

    private function parsePdfFile(string $filePath): array
    {
        $parser = new \Smalot\PdfParser\Parser();
        $pdf = $parser->parseFile($filePath);
        $text = $pdf->getText();
        return $this->parseTextContent($text);
    }

    private function parseTxtFile(string $filePath): array
    {
        $text = file_get_contents($filePath);
        return $this->parseTextContent($text);
    }

    private function parseTextContent(string $text): array
    {
        $lines = preg_split('/\r?\n/', trim($text));
        $lines = array_filter($lines, fn ($l) => trim($l) !== '');
        $lines = array_values($lines);
        if (count($lines) < 2) return ['headers' => [], 'rows' => []];

        $headers = []; $rows = [];
        $delimiter = str_contains($lines[0], "\t") ? "\t" : (str_contains($lines[0], '|') ? '|' : ',');
        $headerLine = $lines[0];
        $headers = array_map('trim', explode($delimiter, $headerLine));

        for ($i = 1; $i < count($lines); $i++) {
            $values = array_map('trim', explode($delimiter, $lines[$i]));
            $mapped = [];
            foreach ($headers as $j => $header) {
                if ($header !== '') { $mapped[$header] = $values[$j] ?? ''; }
            }
            $rows[] = $mapped;
        }
        return ['headers' => $headers, 'rows' => $rows];
    }

    private function processImportedRows(array $parsed, MockupImportBatch $batch, $user): array
    {
        $fieldMapping = $this->buildFieldMapping($parsed['headers']);
        $success = 0; $failed = 0; $skipped = 0; $errors = [];

        foreach ($parsed['rows'] as $rowIndex => $row) {
            $rowNum = $rowIndex + 2;
            try {
                $mapped = $this->mapRowToFields($row, $fieldMapping);
                if (empty($mapped['title'])) {
                    $errors[] = ['row' => $rowNum, 'error' => 'Missing required field: title/activity name'];
                    $failed++;
                    continue;
                }
                $exists = Mockup::where('title', $mapped['title'])
                    ->where('contractor', $mapped['contractor'] ?? null)->exists();
                if ($exists) { $skipped++; continue; }

                $mapped['created_by'] = $user->id;
                $mapped['updated_by'] = $user->id;
                $mapped['import_batch_id'] = $batch->id;
                $mapped['status'] = 'Open';
                Mockup::create($mapped);
                $success++;
            } catch (\Exception $e) {
                $errors[] = ['row' => $rowNum, 'error' => $e->getMessage()];
                $failed++;
            }
        }
        return [
            'total' => count($parsed['rows']), 'success' => $success,
            'failed' => $failed, 'skipped' => $skipped,
            'errors' => $errors, 'field_mapping' => $fieldMapping,
        ];
    }

    private function buildFieldMapping(array $headers): array
    {
        $mapping = [];
        foreach ($headers as $header) {
            $normalizedHeader = strtolower(trim($header));
            $matched = null;
            foreach (self::FIELD_ALIASES as $field => $aliases) {
                if (in_array($normalizedHeader, $aliases, true)) {
                    $matched = $field;
                    break;
                }
            }
            if ($matched) { $mapping[$header] = $matched; }
        }
        return $mapping;
    }

    private function mapRowToFields(array $row, array $fieldMapping): array
    {
        $mapped = [];
        foreach ($fieldMapping as $originalHeader => $field) {
            $value = trim($row[$originalHeader] ?? '');
            if ($value === '') continue;
            if ($field === 'approval_status') {
                $mapped[$field] = self::STATUS_MAP[strtolower($value)] ?? 'Draft';
            } elseif ($field === 'priority') {
                $mapped[$field] = self::PRIORITY_MAP[strtolower($value)] ?? 'Medium';
            } elseif (in_array($field, ['planned_start_date', 'planned_end_date'])) {
                $mapped[$field] = $this->parseDate($value);
            } else {
                $mapped[$field] = $value;
            }
        }
        return $mapped;
    }

    private function parseDate(string $value): ?string
    {
        $formats = ['Y-m-d', 'd/m/Y', 'm/d/Y', 'd-m-Y', 'm-d-Y', 'Y/m/d', 'd M Y', 'M d, Y', 'd.m.Y'];
        foreach ($formats as $format) {
            $date = \DateTime::createFromFormat($format, $value);
            if ($date && $date->format($format) === $value) {
                return $date->format('Y-m-d');
            }
        }
        try { return (new \DateTime($value))->format('Y-m-d'); } catch (\Exception $e) {}
        return null;
    }

    // ── Private Helpers ───────────────────────────────────

    private function authorizeReviewAction($user): void
    {
        if ($user->isMaster()) return;
        if ($user->hasPermission('can_approve_rams')) return;
        if (in_array($user->role, ['ehs_manager', 'safety_officer', 'client_consultant', 'client'])) return;

        abort(403, 'You do not have permission to review mock-ups.');
    }

    private function getUserRole($user): string
    {
        return $user->role ?? 'unknown';
    }

    private function formatMockup($m): array
    {
        return [
            'id'                       => $m->id,
            'ref_number'               => $m->ref_number,
            'title'                    => $m->title,
            'description'              => $m->description,
            'procedure_type'           => $m->procedure_type,
            'mockup_type'              => $m->mockup_type,
            'area'                     => $m->area,
            'zone'                     => $m->zone,
            'phase'                    => $m->phase,
            'trim_line'                => $m->trim_line,
            'site'                     => $m->site,
            'project'                  => $m->project,
            'contractor'               => $m->contractor,
            'supervisor_name'          => $m->supervisor_name,
            'approval_status'          => $m->approval_status,
            'revision_number'          => (int) $m->revision_number,
            'parent_mockup_id'         => $m->parent_mockup_id,
            'compliance_status'        => $m->compliance_status,
            'priority'                 => $m->priority,
            'can_proceed'              => (bool) $m->can_proceed,
            'has_unresolved_comments'  => (bool) $m->has_unresolved_comments,
            'unresolved_comment_count' => (int) $m->unresolved_comment_count,
            'fft_decision'             => $m->fft_decision,
            'consultant_decision'      => $m->consultant_decision,
            'client_decision'          => $m->client_decision,
            'rams_document'            => $m->ramsDocument ? [
                'id'         => $m->ramsDocument->id,
                'ref_number' => $m->ramsDocument->ref_number,
                'title'      => $m->ramsDocument->title,
            ] : null,
            'rams_version'             => $m->ramsVersion ? [
                'id'             => $m->ramsVersion->id,
                'version_number' => $m->ramsVersion->version_number,
                'file_name'      => $m->ramsVersion->file_name,
            ] : null,
            'rams_revision_number'     => $m->rams_revision_number,
            'rams_work_line'           => $m->ramsDocument && $m->ramsDocument->relationLoaded('workLine') && $m->ramsDocument->workLine ? [
                'id'   => $m->ramsDocument->workLine->id,
                'name' => $m->ramsDocument->workLine->name,
                'slug' => $m->ramsDocument->workLine->slug,
            ] : null,
            'involved_candidates'      => $m->involved_candidates,
            'manual_approved_by'       => $m->manual_approved_by,
            'tags'                     => $m->tags,
            'photos'                   => $m->photos ?? [],
            'mockup_date'              => $m->mockup_date?->format('Y-m-d'),
            'planned_start_date'       => $m->planned_start_date?->format('Y-m-d'),
            'planned_end_date'         => $m->planned_end_date?->format('Y-m-d'),
            'submitted_at'             => $m->submitted_at?->toISOString(),
            'approved_at'              => $m->approved_at?->toISOString(),
            'created_by'               => $m->createdByUser ? [
                'id'   => $m->createdByUser->id,
                'name' => $m->createdByUser->full_name,
            ] : null,
            'created_at'               => $m->created_at?->toISOString(),
            'updated_at'               => $m->updated_at?->toISOString(),
            'personnel'                => $m->relationLoaded('personnel') ? $m->personnel->map(fn ($p) => [
                'id'          => $p->id,
                'person_name' => $p->person_name,
                'designation' => $p->designation,
                'company'     => $p->company,
                'user_id'     => $p->user_id,
                'source_type' => $p->source_type,
            ]) : [],
            'approvers'                => $m->relationLoaded('approvers') ? $m->approvers->map(fn ($a) => [
                'id'              => $a->id,
                'name'            => $a->name,
                'designation'     => $a->designation,
                'approver_type'   => $a->approver_type,
                'approval_status' => $a->approval_status,
                'approval_date'   => $a->approval_date?->format('Y-m-d'),
            ]) : [],
        ];
    }

    private function formatMockupDetail($m): array
    {
        $base = $this->formatMockup($m);
        $base['notes']               = $m->notes;
        $base['rejection_reason']    = $m->rejection_reason;
        $base['general_remarks']     = $m->general_remarks;
        $base['consultant_comments'] = $m->consultant_comments;
        $base['attachments']         = $m->attachments;
        $base['involved_candidates'] = $m->involved_candidates;
        $base['manual_approved_by']  = $m->manual_approved_by;
        $base['mockup_time']         = $m->mockup_time;

        $base['submitted_by'] = $m->submittedByUser ? [
            'id' => $m->submittedByUser->id, 'name' => $m->submittedByUser->full_name,
        ] : null;
        $base['approved_by'] = $m->approvedByUser ? [
            'id' => $m->approvedByUser->id, 'name' => $m->approvedByUser->full_name,
        ] : null;

        // RAMS document with versions
        if ($m->ramsDocument) {
            $base['rams_document']['versions'] = $m->ramsDocument->versions->map(fn ($v) => [
                'id'             => $v->id,
                'version_number' => $v->version_number,
                'file_name'      => $v->file_name,
                'file_size'      => $v->file_size,
                'notes'          => $v->notes,
                'created_at'     => $v->created_at->toISOString(),
            ]);
        }

        // Typed attachments
        $base['typed_attachments'] = $m->mockupAttachments->map(fn ($a) => [
            'id'              => $a->id,
            'attachment_type' => $a->attachment_type,
            'file_path'       => $a->file_path,
            'original_name'   => $a->original_name,
            'file_type'       => $a->file_type,
            'file_size'       => $a->file_size,
            'uploaded_by'     => $a->uploaded_by_name,
            'created_at'      => $a->created_at?->toISOString(),
        ]);

        // Personnel
        $base['personnel'] = $m->personnel->map(fn ($p) => [
            'id'          => $p->id,
            'person_name' => $p->person_name,
            'designation' => $p->designation,
            'company'     => $p->company,
            'user_id'     => $p->user_id,
            'source_type' => $p->source_type,
        ]);

        // Approvers
        $base['approvers'] = $m->approvers->map(fn ($a) => [
            'id'              => $a->id,
            'name'            => $a->name,
            'designation'     => $a->designation,
            'approver_type'   => $a->approver_type,
            'approval_status' => $a->approval_status,
            'approval_date'   => $a->approval_date?->format('Y-m-d'),
        ]);

        // Revision history
        $rootId = $m->parent_mockup_id ?? $m->id;
        $base['revision_history'] = Mockup::where(function ($q) use ($rootId) {
            $q->where('id', $rootId)->orWhere('parent_mockup_id', $rootId);
        })->orderBy('revision_number', 'asc')
        ->get()
        ->map(fn ($r) => [
            'id'              => $r->id,
            'ref_number'      => $r->ref_number,
            'revision_number' => $r->revision_number,
            'approval_status' => $r->approval_status,
            'compliance_status' => $r->compliance_status,
            'created_at'      => $r->created_at?->toISOString(),
            'is_current'      => $r->id === $m->id,
        ]);

        // Comments
        $base['comments'] = $m->comments->map(fn ($c) => $this->formatComment($c));

        // History
        $base['history'] = $m->history->map(fn ($h) => [
            'id'                => $h->id,
            'action'            => $h->action,
            'from_status'       => $h->from_status,
            'to_status'         => $h->to_status,
            'performed_by_name' => $h->performed_by_name,
            'performed_by_role' => $h->performed_by_role,
            'description'       => $h->description,
            'metadata'          => $h->metadata,
            'created_at'        => $h->created_at?->toISOString(),
        ]);

        return $base;
    }

    private function formatComment($c): array
    {
        return [
            'id'                    => $c->id,
            'parent_comment_id'     => $c->parent_comment_id,
            'user_id'               => $c->user_id,
            'user_name'             => $c->user_name ?? $c->author?->full_name,
            'user_role'             => $c->user_role ?? $c->author?->role,
            'comment_type'          => $c->comment_type,
            'comment_text'          => $c->comment_text,
            'is_resolved'           => (bool) $c->is_resolved,
            'resolved_by_name'      => $c->resolved_by_name,
            'resolved_at'           => $c->resolved_at?->toISOString(),
            'resolution_note'       => $c->resolution_note,
            'mockup_status_at_time' => $c->mockup_status_at_time,
            'replies'               => ($c->relationLoaded('replies') ? $c->replies : collect())->map(fn ($r) => $this->formatComment($r)),
            'created_at'            => $c->created_at?->toISOString(),
        ];
    }
}
