<?php

namespace App\Http\Controllers;

use App\Models\Permit;
use App\Models\PermitAmendment;
use App\Services\NotificationService;
use App\Models\PermitAmendmentChange;
use App\Models\PermitAmendmentAttachment;
use App\Models\PermitAmendmentLog;
use App\Http\Traits\ExportsData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Constants\StatusConstants;

class PermitAmendmentController extends Controller
{
    use ExportsData;

    // ── Amendment types ──────────────────────────────────
    private const AMENDMENT_TYPES = [
        'Date Extension', 'Time Extension', 'Scope Change',
        'Location Change', 'Area / Zone Change', 'Work Method Change',
        'Hazard Update', 'Control Measure Update', 'Manpower Change',
        'Equipment Change', 'Material Change', 'Supervisor Change',
        'Permit Holder Change', 'RAMS / Method Statement Update',
        'Drawing / Document Update', 'Shift Change',
        'Environmental Condition Update', 'Emergency Arrangement Update',
        'Other',
    ];

    private const CHANGE_CATEGORIES = [
        'Permit Basics', 'Location', 'People', 'Equipment',
        'Hazards', 'Control Measures', 'Documents', 'Other',
    ];

    private const ATTACHMENT_CATEGORIES = [
        'Revised RAMS', 'Revised Drawing', 'Revised Method Statement',
        'Photo Evidence', 'Inspection Certificate', 'Training Proof',
        'Approval Note', 'Checklist', 'Other',
    ];

    private const STATUSES = [
        'Draft', 'Submitted', 'Under Review', 'Approved',
        'Rejected', 'Approved with Comments', 'Cancelled', 'Superseded',
    ];

    private const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent', 'Critical'];

    private const MAJOR_TRIGGER_KEYWORDS = [
        'scope', 'type', 'area', 'site', 'hazard', 'contractor', 'method',
    ];

    // ── LIST ──────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = PermitAmendment::with([
            'permit:id,ref_number,permit_type,zone,status,current_revision_number',
            'requestedByUser:id,full_name',
            'reviewedByUser:id,full_name',
        ])->withCount(['changes', 'attachments']);

        // Search
        if ($s = $request->get('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('amendment_title', 'like', "%{$s}%")
                  ->orWhere('amendment_code', 'like', "%{$s}%")
                  ->orWhere('ref_number', 'like', "%{$s}%")
                  ->orWhere('permit_number_snapshot', 'like', "%{$s}%")
                  ->orWhere('requested_by', 'like', "%{$s}%")
                  ->orWhereHas('permit', fn($pq) =>
                      $pq->where('ref_number', 'like', "%{$s}%")
                  );
            });
        }

        // Filters
        if ($v = $request->get('amendment_type'))     $query->where('amendment_type', $v);
        if ($v = $request->get('amendment_category'))  $query->where('amendment_category', $v);
        if ($v = $request->get('status'))              $query->where('status', $v);
        if ($v = $request->get('priority'))            $query->where('priority', $v);
        if ($v = $request->get('permit_id'))           $query->where('permit_id', $v);
        if ($v = $request->get('area'))                $query->where('permit_area_snapshot', 'like', "%{$v}%");
        if ($v = $request->get('permit_type')) {
            $query->where('permit_type_snapshot', $v);
        }

        // Date filters
        if ($v = $request->get('date_from'))      $query->whereDate('request_date', '>=', $v);
        if ($v = $request->get('date_to'))        $query->whereDate('request_date', '<=', $v);
        if ($v = $request->get('effective_from')) $query->whereDate('effective_from', '>=', $v);
        if ($v = $request->get('effective_to'))   $query->whereDate('effective_to', '<=', $v);

        // Boolean filters
        if ($request->has('is_major_change_flagged') && $request->get('is_major_change_flagged') !== '') {
            $query->where('is_major_change_flagged', (bool) $request->get('is_major_change_flagged'));
        }

        // Period filter
        if ($v = $request->get('period')) {
            $query->period($v);
        }

        // Sorting
        $sortBy  = $request->get('sort_by', 'created_at');
        $sortDir = $request->get('sort_dir', 'desc');
        $allowed = ['created_at', 'request_date', 'effective_from', 'revision_number', 'status', 'amendment_code'];
        if (in_array($sortBy, $allowed)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min((int) $request->get('per_page', 20), 100);
        $data = $query->paginate($perPage);

        return response()->json($data);
    }

    // ── CREATE ────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'permit_id'          => 'required|string|exists:permits,id',
            'amendment_title'    => 'required|string|max:500',
            'amendment_type'     => 'required|in:' . implode(',', self::AMENDMENT_TYPES),
            'amendment_category' => 'required|in:Minor,Major',
            'reason'             => 'required|string|min:10',
            'priority'           => 'nullable|in:' . implode(',', self::PRIORITIES),
            'requested_by'       => 'nullable|string|max:255',
            'requested_by_id'    => 'nullable|string|exists:users,id',
            'request_date'       => 'nullable|date',
            'effective_from'     => 'nullable|date',
            'effective_to'       => 'nullable|date|after:effective_from',
            'notes'              => 'nullable|string',
            'changes'            => 'nullable|array',
            'changes.*.field_name'       => 'required_with:changes|string|max:255',
            'changes.*.old_value'        => 'nullable|string',
            'changes.*.new_value'        => 'nullable|string',
            'changes.*.change_reason'    => 'nullable|string',
            'changes.*.change_category'  => 'nullable|in:' . implode(',', self::CHANGE_CATEGORIES),
            'attachments'        => 'nullable|array',
            'attachments.*'      => 'file|max:20480|mimes:pdf,doc,docx,xlsx,xls,jpg,jpeg,png,webp',
            'attachment_categories'   => 'nullable|array',
            'attachment_categories.*' => 'nullable|string',
        ]);

        $user = $request->user();

        return DB::transaction(function () use ($request, $user) {
            // Generate amendment_code with lock to prevent race conditions
            $year = date('Y');
            $lastCode = PermitAmendment::withTrashed()
                ->whereYear('created_at', $year)
                ->lockForUpdate()
                ->orderByDesc('id')
                ->value('amendment_code');
            $seq = $lastCode ? (int) substr($lastCode, -4) + 1 : 1;
            $amendmentCode = 'AMD-' . $year . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);

            // Major change check
            $isMajor = $request->amendment_category === 'Major';
            $majorNote = null;
            if ($isMajor) {
                $majorNote = 'This amendment contains major changes. Consider whether a new permit is required.';
            }

            $amendment = PermitAmendment::create([
                'amendment_code'       => $amendmentCode,
                'ref_number'           => $amendmentCode,
                'permit_id'            => $request->permit_id,
                'amendment_title'      => $request->amendment_title,
                'amendment_type'       => $request->amendment_type,
                'amendment_category'   => $request->amendment_category,
                'reason'               => $request->reason,
                'amendment_reason'     => $request->reason,
                'priority'             => $request->priority ?? 'Medium',
                'status'               => StatusConstants::AMENDMENT_DRAFT,
                'requested_by'         => $request->requested_by ?? $user?->full_name,
                'requested_by_id'      => $request->requested_by_id ?? $user?->id,
                'request_date'         => $request->request_date,
                'effective_from'       => $request->effective_from,
                'effective_to'         => $request->effective_to,
                'notes'                => $request->notes,
                'is_major_change_flagged' => $isMajor,
                'major_change_note'       => $majorNote,
                'created_by'           => $user?->id,
                'updated_by'           => $user?->id,
            ]);

            // Create change rows
            if ($request->has('changes') && is_array($request->changes)) {
                foreach ($request->changes as $i => $change) {
                    $isTrigger = $this->checkMajorTrigger($change['field_name'] ?? '');
                    PermitAmendmentChange::create([
                        'amendment_id'    => $amendment->id,
                        'change_order'    => $i + 1,
                        'change_category' => $change['change_category'] ?? 'Permit Basics',
                        'field_name'      => $change['field_name'],
                        'old_value'       => $change['old_value'] ?? null,
                        'new_value'       => $change['new_value'] ?? null,
                        'change_reason'   => $change['change_reason'] ?? null,
                        'is_major_trigger' => $isTrigger,
                    ]);

                    if ($isTrigger && !$isMajor) {
                        $amendment->update([
                            'is_major_change_flagged' => true,
                            'major_change_note'       => 'One or more changes may require a major amendment review.',
                        ]);
                    }
                }
            }

            // Handle file uploads
            if ($request->hasFile('attachments')) {
                $folder = 'permit-amendments/' . $amendment->permit_id . '/' . $amendment->id;
                foreach ($request->file('attachments') as $i => $file) {
                    $path = $file->store($folder, 'public');
                    PermitAmendmentAttachment::create([
                        'amendment_id'        => $amendment->id,
                        'file_path'           => $path,
                        'original_name'       => $file->getClientOriginalName(),
                        'file_type'           => $file->getClientOriginalExtension(),
                        'file_size_kb'        => (int) ($file->getSize() / 1024),
                        'attachment_category' => $request->attachment_categories[$i] ?? 'Other',
                        'uploaded_by'         => $user?->id,
                        'uploaded_by_name'    => $user?->full_name,
                    ]);
                }
            }

            $amendment->logHistory('Amendment Created', null, StatusConstants::AMENDMENT_DRAFT, 'Created by ' . ($user?->full_name ?? 'System'));

            // Fire notifications
            $permitRef = $amendment->permit?->ref_number;
            NotificationService::amendmentCreated($amendment, $user?->id, $permitRef);

            return response()->json([
                'message'   => 'Amendment created successfully',
                'amendment' => $amendment->fresh()->load('permit', 'changes', 'attachments'),
            ], 201);
        });
    }

    // ── SHOW ──────────────────────────────────────────────

    public function show(string $id): JsonResponse
    {
        $amendment = PermitAmendment::with([
            'permit',
            'changes',
            'attachments',
            'logs.performer',
            'requestedByUser:id,full_name',
            'reviewedByUser:id,full_name',
        ])->findOrFail($id);

        // Append extra data
        $data = $amendment->toArray();
        $data['change_count'] = $amendment->changes()->count();
        $data['is_major'] = $amendment->is_major;

        // All amendments for the same permit (revision history context)
        $data['permit_amendments_summary'] = PermitAmendment::where('permit_id', $amendment->permit_id)
            ->select('id', 'amendment_code', 'revision_number', 'amendment_type', 'amendment_category',
                     'status', 'is_active_revision', 'requested_by', 'request_date',
                     'reviewed_by', 'reviewed_at', 'effective_from')
            ->withCount('changes')
            ->orderBy('revision_number', 'asc')
            ->get();

        return response()->json($data);
    }

    // ── UPDATE ────────────────────────────────────────────

    public function update(Request $request, string $id): JsonResponse
    {
        $amendment = PermitAmendment::findOrFail($id);

        if (!in_array($amendment->status, ['Draft', 'Rejected'])) {
            return response()->json([
                'message' => "Amendment cannot be edited in {$amendment->status} status. Only Draft or Rejected amendments can be edited.",
            ], 422);
        }

        $request->validate([
            'amendment_title'    => 'sometimes|required|string|max:500',
            'amendment_type'     => 'sometimes|required|in:' . implode(',', self::AMENDMENT_TYPES),
            'amendment_category' => 'sometimes|required|in:Minor,Major',
            'reason'             => 'sometimes|required|string|min:10',
            'priority'           => 'nullable|in:' . implode(',', self::PRIORITIES),
            'requested_by'       => 'nullable|string|max:255',
            'requested_by_id'    => 'nullable|string|exists:users,id',
            'request_date'       => 'nullable|date',
            'effective_from'     => 'nullable|date',
            'effective_to'       => 'nullable|date|after:effective_from',
            'notes'              => 'nullable|string',
            'changes'            => 'nullable|array',
            'changes.*.field_name'       => 'required_with:changes|string|max:255',
            'changes.*.old_value'        => 'nullable|string',
            'changes.*.new_value'        => 'nullable|string',
            'changes.*.change_reason'    => 'nullable|string',
            'changes.*.change_category'  => 'nullable|in:' . implode(',', self::CHANGE_CATEGORIES),
            'attachments'        => 'nullable|array',
            'attachments.*'      => 'file|max:20480|mimes:pdf,doc,docx,xlsx,xls,jpg,jpeg,png,webp',
            'attachment_categories'   => 'nullable|array',
            'remove_attachments'     => 'nullable|array',
            'remove_attachments.*'   => 'string',
        ]);

        $user = $request->user();

        return DB::transaction(function () use ($request, $amendment, $user) {
            $fields = $request->only([
                'amendment_title', 'amendment_type', 'amendment_category',
                'reason', 'priority', 'requested_by', 'requested_by_id',
                'request_date', 'effective_from', 'effective_to', 'notes',
            ]);
            if (isset($fields['reason'])) {
                $fields['amendment_reason'] = $fields['reason'];
            }
            $fields['updated_by'] = $user?->id;
            $amendment->update($fields);

            // Re-run major change check
            $cat = $request->amendment_category ?? $amendment->amendment_category;
            $isMajor = $cat === 'Major';
            if ($isMajor) {
                $amendment->update([
                    'is_major_change_flagged' => true,
                    'major_change_note' => 'This amendment contains major changes. Consider whether a new permit is required.',
                ]);
            }

            // Replace change rows if provided
            if ($request->has('changes') && is_array($request->changes)) {
                $amendment->changes()->delete();
                $anyTrigger = false;
                foreach ($request->changes as $i => $change) {
                    $isTrigger = $this->checkMajorTrigger($change['field_name'] ?? '');
                    if ($isTrigger) $anyTrigger = true;
                    PermitAmendmentChange::create([
                        'amendment_id'    => $amendment->id,
                        'change_order'    => $i + 1,
                        'change_category' => $change['change_category'] ?? 'Permit Basics',
                        'field_name'      => $change['field_name'],
                        'old_value'       => $change['old_value'] ?? null,
                        'new_value'       => $change['new_value'] ?? null,
                        'change_reason'   => $change['change_reason'] ?? null,
                        'is_major_trigger' => $isTrigger,
                    ]);
                }
                if ($anyTrigger && !$isMajor) {
                    $amendment->update([
                        'is_major_change_flagged' => true,
                        'major_change_note' => 'One or more changes may require a major amendment review.',
                    ]);
                }
            }

            // Remove attachments
            if ($request->has('remove_attachments')) {
                foreach ($request->remove_attachments as $attachId) {
                    $att = PermitAmendmentAttachment::where('id', $attachId)
                        ->where('amendment_id', $amendment->id)->first();
                    if ($att) {
                        Storage::disk('public')->delete($att->file_path);
                        $att->delete();
                    }
                }
            }

            // Add new file uploads
            if ($request->hasFile('attachments')) {
                $folder = 'permit-amendments/' . $amendment->permit_id . '/' . $amendment->id;
                foreach ($request->file('attachments') as $i => $file) {
                    $path = $file->store($folder, 'public');
                    PermitAmendmentAttachment::create([
                        'amendment_id'        => $amendment->id,
                        'file_path'           => $path,
                        'original_name'       => $file->getClientOriginalName(),
                        'file_type'           => $file->getClientOriginalExtension(),
                        'file_size_kb'        => (int) ($file->getSize() / 1024),
                        'attachment_category' => $request->attachment_categories[$i] ?? 'Other',
                        'uploaded_by'         => $user?->id,
                        'uploaded_by_name'    => $user?->full_name,
                    ]);
                }
            }

            $amendment->logHistory('Amendment Updated', $amendment->status, $amendment->status);

            return response()->json([
                'message'   => 'Amendment updated',
                'amendment' => $amendment->fresh()->load('permit', 'changes', 'attachments'),
            ]);
        });
    }

    // ── DELETE ────────────────────────────────────────────

    public function destroy(string $id): JsonResponse
    {
        $amendment = PermitAmendment::findOrFail($id);

        if (!in_array($amendment->status, ['Draft', 'Cancelled'])) {
            return response()->json([
                'message' => 'Only Draft or Cancelled amendments can be deleted.',
            ], 422);
        }

        $amendment->deleted_by = Auth::user()?->full_name ?? 'System';
        $amendment->save();
        $amendment->logHistory('Amendment Deleted', $amendment->status, null);
        $amendment->delete();
        RecycleBinController::logDeleteAction('permit_amendment', $amendment);

        return response()->json(['message' => 'Amendment deleted']);
    }

    // ── SUBMIT FOR REVIEW ─────────────────────────────────

    public function submitForReview(Request $request, string $id): JsonResponse
    {
        $amendment = PermitAmendment::findOrFail($id);

        if (!in_array($amendment->status, ['Draft', 'Rejected'])) {
            return response()->json([
                'message' => "Cannot submit. Amendment is in {$amendment->status} status.",
            ], 422);
        }

        if ($amendment->changes()->count() === 0 && empty($amendment->reason)) {
            return response()->json([
                'message' => 'Please add at least one change row before submitting.',
            ], 422);
        }

        $oldStatus = $amendment->status;
        $amendment->update([
            'status'       => StatusConstants::AMENDMENT_SUBMITTED,
            'request_date' => $amendment->request_date ?? now()->toDateString(),
        ]);

        $user = $request->user();
        $amendment->logHistory(
            'Submitted for Review', $oldStatus, StatusConstants::AMENDMENT_SUBMITTED,
            'Submitted by ' . ($user?->full_name ?? 'System')
        );

        // Fire notification
        $permitRef = $amendment->permit?->ref_number;
        NotificationService::amendmentStatusChanged($amendment, StatusConstants::AMENDMENT_SUBMITTED, $user?->id, $permitRef);

        return response()->json([
            'message'   => 'Amendment submitted for review',
            'amendment' => $amendment->fresh()->load('permit', 'changes', 'attachments'),
        ]);
    }

    // ── APPROVE ───────────────────────────────────────────

    public function approve(Request $request, string $id): JsonResponse
    {
        $amendment = PermitAmendment::findOrFail($id);
        $user = $request->user();
        $this->authorizeApprovalAction($user);

        if (!in_array($amendment->status, ['Submitted', 'Under Review'])) {
            return response()->json(['message' => 'Amendment is not pending review'], 422);
        }

        $request->validate([
            'approval_comments' => 'nullable|string',
            'conditions'        => 'nullable|string',
        ]);

        $oldStatus = $amendment->status;
        $amendment->update([
            'status'            => StatusConstants::AMENDMENT_APPROVED,
            'reviewed_by'       => $user?->full_name,
            'reviewed_by_id'    => $user?->id,
            'reviewed_at'       => now(),
            'approved_by'       => $user?->id,
            'approved_at'       => now(),
            'approval_comments' => $request->approval_comments,
            'conditions'        => $request->conditions,
        ]);

        $amendment->logHistory(
            'Approved', $oldStatus, StatusConstants::AMENDMENT_APPROVED,
            'Approved by ' . ($user?->full_name ?? 'System') . '. Amendment is now the active revision.',
            ['revision_number' => $amendment->revision_number, 'conditions' => $request->conditions]
        );

        // Fire notification
        $permitRef = $amendment->permit?->ref_number;
        NotificationService::amendmentStatusChanged($amendment, StatusConstants::AMENDMENT_APPROVED, $user?->id, $permitRef);

        return response()->json([
            'message'   => 'Amendment approved. Revision ' . $amendment->revision_number . ' is now the active revision.',
            'amendment' => $amendment->fresh()->load('permit', 'changes', 'attachments'),
        ]);
    }

    // ── REJECT ────────────────────────────────────────────

    public function reject(Request $request, string $id): JsonResponse
    {
        $amendment = PermitAmendment::findOrFail($id);
        $user = $request->user();
        $this->authorizeApprovalAction($user);

        if (!in_array($amendment->status, ['Submitted', 'Under Review'])) {
            return response()->json(['message' => 'Amendment is not pending review'], 422);
        }

        $request->validate([
            'rejection_reason' => 'required|string|min:10',
        ]);

        $oldStatus = $amendment->status;
        $amendment->update([
            'status'           => StatusConstants::AMENDMENT_REJECTED,
            'rejected_by'      => $user?->full_name,
            'rejected_by_id'   => $user?->id,
            'rejected_at'      => now(),
            'rejection_reason' => $request->rejection_reason,
            'reviewed_by'      => $user?->full_name,
            'reviewed_by_id'   => $user?->id,
            'reviewed_at'      => now(),
        ]);

        $amendment->logHistory(
            'Rejected', $oldStatus, StatusConstants::AMENDMENT_REJECTED,
            'Rejected by ' . ($user?->full_name ?? 'System'),
            ['reason' => $request->rejection_reason]
        );

        // Fire notification
        $permitRef = $amendment->permit?->ref_number;
        NotificationService::amendmentStatusChanged($amendment, StatusConstants::AMENDMENT_REJECTED, $user?->id, $permitRef);

        return response()->json([
            'message'   => 'Amendment rejected',
            'amendment' => $amendment->fresh()->load('permit', 'changes', 'attachments'),
        ]);
    }

    // ── APPROVE WITH COMMENTS ─────────────────────────────

    public function approveWithComments(Request $request, string $id): JsonResponse
    {
        $amendment = PermitAmendment::findOrFail($id);
        $user = $request->user();
        $this->authorizeApprovalAction($user);

        if (!in_array($amendment->status, ['Submitted', 'Under Review'])) {
            return response()->json(['message' => 'Amendment is not pending review'], 422);
        }

        $request->validate([
            'approval_comments' => 'required|string|min:10',
            'conditions'        => 'nullable|string',
        ]);

        $oldStatus = $amendment->status;
        $amendment->update([
            'status'            => StatusConstants::AMENDMENT_APPROVED_WITH_COMMENTS,
            'reviewed_by'       => $user?->full_name,
            'reviewed_by_id'    => $user?->id,
            'reviewed_at'       => now(),
            'approved_by'       => $user?->id,
            'approved_at'       => now(),
            'approval_comments' => $request->approval_comments,
            'conditions'        => $request->conditions,
        ]);

        $amendment->logHistory(
            'Approved with Comments', $oldStatus, StatusConstants::AMENDMENT_APPROVED_WITH_COMMENTS,
            'Approved with conditions by ' . ($user?->full_name ?? 'System'),
            ['comments' => $request->approval_comments, 'conditions' => $request->conditions]
        );

        return response()->json([
            'message'   => 'Amendment approved with comments. Revision ' . $amendment->revision_number . ' is now active.',
            'amendment' => $amendment->fresh()->load('permit', 'changes', 'attachments'),
        ]);
    }

    // ── MARK UNDER REVIEW ─────────────────────────────────

    public function markUnderReview(string $id): JsonResponse
    {
        $amendment = PermitAmendment::findOrFail($id);

        if ($amendment->status !== 'Submitted') {
            return response()->json(['message' => 'Only Submitted amendments can be marked under review'], 422);
        }

        $oldStatus = $amendment->status;
        $amendment->update(['status' => StatusConstants::AMENDMENT_UNDER_REVIEW]);
        $amendment->logHistory('Marked Under Review', $oldStatus, StatusConstants::AMENDMENT_UNDER_REVIEW);

        return response()->json([
            'message'   => 'Amendment marked as under review',
            'amendment' => $amendment->fresh(),
        ]);
    }

    // ── CANCEL ────────────────────────────────────────────

    public function cancel(Request $request, string $id): JsonResponse
    {
        $amendment = PermitAmendment::findOrFail($id);

        if (in_array($amendment->status, ['Approved', 'Approved with Comments'])) {
            return response()->json(['message' => 'Approved amendments cannot be cancelled'], 422);
        }

        $request->validate([
            'cancellation_reason' => 'required|string|min:5',
        ]);

        $oldStatus = $amendment->status;
        $amendment->update(['status' => StatusConstants::AMENDMENT_CANCELLED]);
        $amendment->logHistory('Cancelled', $oldStatus, StatusConstants::AMENDMENT_CANCELLED, $request->cancellation_reason);

        return response()->json([
            'message'   => 'Amendment cancelled',
            'amendment' => $amendment->fresh(),
        ]);
    }

    // ── ADD CHANGE ROW ────────────────────────────────────

    public function addChange(Request $request, string $id): JsonResponse
    {
        $amendment = PermitAmendment::findOrFail($id);

        if (!in_array($amendment->status, ['Draft', 'Rejected'])) {
            return response()->json([
                'message' => 'Changes can only be added to Draft or Rejected amendments',
            ], 422);
        }

        $request->validate([
            'field_name'      => 'required|string|max:255',
            'old_value'       => 'nullable|string',
            'new_value'       => 'nullable|string',
            'change_reason'   => 'nullable|string',
            'change_category' => 'nullable|in:' . implode(',', self::CHANGE_CATEGORIES),
        ]);

        $order = ($amendment->changes()->max('change_order') ?? 0) + 1;
        $isTrigger = $this->checkMajorTrigger($request->field_name);

        $change = PermitAmendmentChange::create([
            'amendment_id'    => $amendment->id,
            'change_order'    => $order,
            'change_category' => $request->change_category ?? 'Permit Basics',
            'field_name'      => $request->field_name,
            'old_value'       => $request->old_value,
            'new_value'       => $request->new_value,
            'change_reason'   => $request->change_reason,
            'is_major_trigger' => $isTrigger,
        ]);

        $amendment->logHistory('Change Row Added', null, null, 'Field: ' . $request->field_name);

        if ($isTrigger && !$amendment->is_major_change_flagged) {
            $amendment->update([
                'is_major_change_flagged' => true,
                'major_change_note' => 'One or more changes may require a major amendment review.',
            ]);
        }

        return response()->json(['change' => $change], 201);
    }

    // ── UPDATE CHANGE ROW ─────────────────────────────────

    public function updateChange(Request $request, string $id, string $changeId): JsonResponse
    {
        $amendment = PermitAmendment::findOrFail($id);

        if (!in_array($amendment->status, ['Draft', 'Rejected'])) {
            return response()->json(['message' => 'Cannot modify changes in current status'], 422);
        }

        $change = PermitAmendmentChange::where('amendment_id', $amendment->id)
            ->where('id', $changeId)->firstOrFail();

        $request->validate([
            'field_name'      => 'sometimes|required|string|max:255',
            'old_value'       => 'nullable|string',
            'new_value'       => 'nullable|string',
            'change_reason'   => 'nullable|string',
            'change_category' => 'nullable|in:' . implode(',', self::CHANGE_CATEGORIES),
        ]);

        $change->update($request->only([
            'field_name', 'old_value', 'new_value', 'change_reason', 'change_category',
        ]));

        return response()->json(['change' => $change->fresh()]);
    }

    // ── DELETE CHANGE ROW ─────────────────────────────────

    public function deleteChange(string $id, string $changeId): JsonResponse
    {
        $amendment = PermitAmendment::findOrFail($id);

        if (!in_array($amendment->status, ['Draft', 'Rejected'])) {
            return response()->json(['message' => 'Cannot modify changes in current status'], 422);
        }

        $change = PermitAmendmentChange::where('amendment_id', $amendment->id)
            ->where('id', $changeId)->firstOrFail();
        $change->delete();

        return response()->json(['message' => 'Change removed']);
    }

    // ── UPLOAD ATTACHMENT ─────────────────────────────────

    public function uploadAttachment(Request $request, string $id): JsonResponse
    {
        $amendment = PermitAmendment::findOrFail($id);

        $request->validate([
            'attachments'              => 'required|array|min:1',
            'attachments.*'            => 'file|max:20480|mimes:pdf,doc,docx,xlsx,xls,jpg,jpeg,png,webp',
            'attachment_category'      => 'nullable|in:' . implode(',', self::ATTACHMENT_CATEGORIES),
            'attachment_categories'    => 'nullable|array',
            'attachment_categories.*'  => 'nullable|string',
            'caption'                  => 'nullable|string|max:500',
        ]);

        $user = $request->user();
        $folder = 'permit-amendments/' . $amendment->permit_id . '/' . $amendment->id;
        $created = [];

        foreach ($request->file('attachments') as $i => $file) {
            $path = $file->store($folder, 'public');
            $created[] = PermitAmendmentAttachment::create([
                'amendment_id'        => $amendment->id,
                'file_path'           => $path,
                'original_name'       => $file->getClientOriginalName(),
                'file_type'           => $file->getClientOriginalExtension(),
                'file_size_kb'        => (int) ($file->getSize() / 1024),
                'attachment_category' => $request->attachment_categories[$i]
                    ?? $request->attachment_category ?? 'Other',
                'caption'             => $request->caption,
                'uploaded_by'         => $user?->id,
                'uploaded_by_name'    => $user?->full_name,
            ]);
        }

        $amendment->logHistory('Attachment Uploaded', null, null, count($created) . ' file(s) uploaded');

        return response()->json(['attachments' => $created]);
    }

    // ── REMOVE ATTACHMENT ─────────────────────────────────

    public function removeAttachment(string $id, string $attachmentId): JsonResponse
    {
        $amendment = PermitAmendment::findOrFail($id);
        $attachment = PermitAmendmentAttachment::where('amendment_id', $amendment->id)
            ->where('id', $attachmentId)->firstOrFail();

        Storage::disk('public')->delete($attachment->file_path);
        $attachment->delete();

        return response()->json(['message' => 'Attachment removed']);
    }

    // ── STATS ─────────────────────────────────────────────

    public function stats(Request $request): JsonResponse
    {
        $year = (int) $request->get('year', now()->year);

        $base = PermitAmendment::whereYear('created_at', $year);

        // KPIs — single query
        $raw = DB::selectOne("
            SELECT
                COUNT(*) as total_amendments,
                SUM(status IN ('Submitted','Under Review')) as pending_review,
                SUM(status = 'Approved') as approved,
                SUM(status = 'Rejected') as rejected,
                SUM(status = 'Approved with Comments') as approved_with_comments,
                SUM(amendment_category = 'Major') as major_amendments,
                SUM(amendment_category = 'Minor') as minor_amendments,
                COUNT(DISTINCT CASE WHEN status IN ('Submitted','Under Review') THEN permit_id END) as open_for_permits
            FROM permit_amendments
            WHERE YEAR(created_at) = ? AND deleted_at IS NULL
        ", [$year]);

        $thisMonth = PermitAmendment::whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)->count();

        $kpis = [
            'total_amendments'        => (int) ($raw->total_amendments ?? 0),
            'pending_review'          => (int) ($raw->pending_review ?? 0),
            'approved'                => (int) ($raw->approved ?? 0),
            'rejected'                => (int) ($raw->rejected ?? 0),
            'approved_with_comments'  => (int) ($raw->approved_with_comments ?? 0),
            'major_amendments'        => (int) ($raw->major_amendments ?? 0),
            'minor_amendments'        => (int) ($raw->minor_amendments ?? 0),
            'this_month'              => $thisMonth,
            'open_for_permits'        => (int) ($raw->open_for_permits ?? 0),
        ];

        // By type (top 10)
        $byType = (clone $base)->select('amendment_type', DB::raw('COUNT(*) as count'))
            ->whereNotNull('amendment_type')
            ->groupBy('amendment_type')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        // By category
        $byCategory = (clone $base)->select('amendment_category', DB::raw('COUNT(*) as count'))
            ->whereNotNull('amendment_category')
            ->groupBy('amendment_category')
            ->get();

        // By status
        $byStatus = (clone $base)->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->get();

        // Monthly trend (last 12 months) — single grouped query
        $rangeStart = now()->subMonths(11)->startOfMonth();
        $trendRows = DB::select("
            SELECT
                DATE_FORMAT(created_at, '%Y-%m') as ym,
                COUNT(*) as total,
                SUM(status IN ('Approved','Approved with Comments')) as approved,
                SUM(status = 'Rejected') as rejected
            FROM permit_amendments
            WHERE created_at >= ? AND deleted_at IS NULL
            GROUP BY ym ORDER BY ym
        ", [$rangeStart]);
        $trendMap = collect($trendRows)->keyBy('ym');

        $monthlyTrend = [];
        for ($m = 11; $m >= 0; $m--) {
            $date = now()->subMonths($m);
            $ym = $date->format('Y-m');
            $row = $trendMap->get($ym);
            $monthlyTrend[] = [
                'month'    => $date->format('M Y'),
                'total'    => (int) ($row->total ?? 0),
                'approved' => (int) ($row->approved ?? 0),
                'rejected' => (int) ($row->rejected ?? 0),
            ];
        }

        // Most amended permits (top 10)
        $mostAmended = PermitAmendment::select('permit_id', 'permit_number_snapshot', 'permit_type_snapshot',
                DB::raw('COUNT(*) as amendment_count'))
            ->groupBy('permit_id', 'permit_number_snapshot', 'permit_type_snapshot')
            ->orderByDesc('amendment_count')
            ->limit(10)
            ->get();

        // Average approval days
        $avgDays = PermitAmendment::whereIn('status', ['Approved', 'Approved with Comments'])
            ->whereNotNull('reviewed_at')
            ->selectRaw('AVG(DATEDIFF(reviewed_at, created_at)) as avg_days')
            ->value('avg_days');

        // By area
        $byArea = (clone $base)->select('permit_area_snapshot', DB::raw('COUNT(*) as count'))
            ->whereNotNull('permit_area_snapshot')
            ->where('permit_area_snapshot', '!=', '')
            ->groupBy('permit_area_snapshot')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        return response()->json([
            'kpis'               => $kpis,
            'by_type'            => $byType,
            'by_category'        => $byCategory,
            'by_status'          => $byStatus,
            'monthly_trend'      => $monthlyTrend,
            'most_amended'       => $mostAmended,
            'avg_approval_days'  => round($avgDays ?? 0, 1),
            'by_area'            => $byArea,
        ]);
    }

    // ── PERMIT REVISION HISTORY ───────────────────────────

    public function permitHistory(string $permitId): JsonResponse
    {
        $permit = Permit::findOrFail($permitId);

        $amendments = PermitAmendment::where('permit_id', $permit->id)
            ->select('id', 'amendment_code', 'revision_number', 'amendment_type',
                     'amendment_category', 'status', 'is_active_revision',
                     'requested_by', 'request_date', 'reviewed_by', 'reviewed_at',
                     'effective_from')
            ->withCount('changes')
            ->orderBy('revision_number', 'asc')
            ->get();

        return response()->json([
            'permit' => [
                'id'                      => $permit->id,
                'ref_number'              => $permit->ref_number,
                'permit_type'             => $permit->permit_type,
                'current_revision_number' => $permit->current_revision_number ?? 0,
                'has_active_amendment'    => $permit->has_active_amendment ?? false,
                'amendment_count'         => $permit->amendment_count ?? 0,
            ],
            'amendments' => $amendments,
        ]);
    }

    // ── EXPORT ────────────────────────────────────────────

    public function export(Request $request)
    {
        $query = PermitAmendment::with('permit:id,ref_number,permit_type')
            ->withCount('changes');

        // Apply same filters as index
        if ($s = $request->get('search'))             $query->where('amendment_title', 'like', "%{$s}%");
        if ($v = $request->get('amendment_type'))      $query->where('amendment_type', $v);
        if ($v = $request->get('amendment_category'))   $query->where('amendment_category', $v);
        if ($v = $request->get('status'))               $query->where('status', $v);
        if ($v = $request->get('priority'))             $query->where('priority', $v);
        if ($v = $request->get('permit_id'))            $query->where('permit_id', $v);
        if ($v = $request->get('period'))               $query->period($v);

        $amendments = $query->orderBy('created_at', 'desc')->get();

        $headers = [
            'Amendment Code', 'Permit Code', 'Permit Type', 'Rev No.',
            'Amendment Title', 'Amendment Type', 'Category', 'Status',
            'Priority', 'Requested By', 'Request Date', 'Effective From',
            'Changes Count', 'Reviewed By', 'Reviewed At',
            'Approval Comments', 'Major Change Flag',
        ];

        $rows = $amendments->map(fn($a) => [
            $a->amendment_code,
            $a->permit_number_snapshot ?? $a->permit?->ref_number,
            $a->permit_type_snapshot ?? $a->permit?->permit_type,
            $a->revision_number,
            $a->amendment_title,
            $a->amendment_type,
            $a->amendment_category,
            $a->status,
            $a->priority,
            $a->requested_by,
            $a->request_date?->format('Y-m-d'),
            $a->effective_from?->format('Y-m-d'),
            $a->changes_count,
            $a->reviewed_by,
            $a->reviewed_at?->format('Y-m-d H:i'),
            $a->approval_comments,
            $a->is_major_change_flagged ? 'Yes' : 'No',
        ])->toArray();

        $format = $request->get('format', 'xlsx');
        return $this->exportAs($headers, $rows, 'Permit Amendments', $format);
    }

    // ── HELPERS ───────────────────────────────────────────

    private function authorizeApprovalAction($user): void
    {
        if (!$user) abort(401);
        if ($user->role === 'master') return;
        if (method_exists($user, 'isMaster') && $user->isMaster()) return;
        if (method_exists($user, 'hasPermission') && $user->hasPermission('can_approve_permit')) return;
        if (in_array($user->role, ['ehs_manager', 'system_admin', 'safety_officer', 'client_consultant', 'client'])) return;

        abort(403, 'You do not have permission to review permit amendments.');
    }

    private function checkMajorTrigger(string $fieldName): bool
    {
        $lower = strtolower($fieldName);
        foreach (self::MAJOR_TRIGGER_KEYWORDS as $kw) {
            if (str_contains($lower, $kw)) return true;
        }
        return false;
    }
}
