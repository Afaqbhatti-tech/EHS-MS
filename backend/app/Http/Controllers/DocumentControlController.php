<?php

namespace App\Http\Controllers;

use App\Models\DcDocument;
use App\Models\DcRevision;
use App\Models\DcReview;
use App\Models\DcApproval;
use App\Models\DcLink;
use App\Models\DcLog;
use App\Models\Contractor;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Http\Traits\ExportsData;
use App\Constants\StatusConstants;
use App\Services\NotificationService;

class DocumentControlController extends Controller
{
    use ExportsData;

    // ─── LIST ────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = DcDocument::query();

        // Text search
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('document_code', 'like', "%{$search}%")
                  ->orWhere('document_number', 'like', "%{$search}%")
                  ->orWhere('document_title', 'like', "%{$search}%")
                  ->orWhere('short_title', 'like', "%{$search}%")
                  ->orWhere('owner', 'like', "%{$search}%")
                  ->orWhere('department', 'like', "%{$search}%")
                  ->orWhere('prepared_by', 'like', "%{$search}%");
            });
        }

        // Filters
        if ($type = $request->get('document_type')) {
            $query->where('document_type', $type);
        }
        if ($cat = $request->get('document_category')) {
            $query->where('document_category', $cat);
        }
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($dept = $request->get('department')) {
            $query->where('department', 'like', "%{$dept}%");
        }
        if ($conf = $request->get('confidentiality_level')) {
            $query->where('confidentiality_level', $conf);
        }
        if ($priority = $request->get('priority')) {
            $query->where('priority', $priority);
        }
        if ($lang = $request->get('language')) {
            $query->where('language', $lang);
        }
        if ($contractorId = $request->get('contractor_id')) {
            $query->where('contractor_id', $contractorId);
        }
        if ($site = $request->get('site')) {
            $query->where('site', 'like', "%{$site}%");
        }
        if ($area = $request->get('area')) {
            $query->where('area', 'like', "%{$area}%");
        }

        // Boolean flags
        if ($request->has('is_expired') && $request->get('is_expired') !== '') {
            $query->where('is_expired', (bool) $request->get('is_expired'));
        }
        if ($request->has('is_overdue_review') && $request->get('is_overdue_review') !== '') {
            $query->where('is_overdue_review', (bool) $request->get('is_overdue_review'));
        }
        if ($request->has('is_expiring_soon') && $request->get('is_expiring_soon') !== '') {
            $query->where('is_expiring_soon', (bool) $request->get('is_expiring_soon'));
        }
        if ($request->has('under_review') && $request->get('under_review')) {
            $query->where('status', 'Under Review');
        }
        if ($request->has('has_active_revision') && $request->get('has_active_revision') !== '') {
            if ((bool) $request->get('has_active_revision')) {
                $query->whereNotNull('active_revision_id');
            } else {
                $query->whereNull('active_revision_id');
            }
        }

        // Date ranges
        if ($from = $request->get('date_from')) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->get('date_to')) {
            $query->whereDate('created_at', '<=', $to);
        }
        if ($reviewFrom = $request->get('review_due_from')) {
            $query->whereDate('next_review_date', '>=', $reviewFrom);
        }
        if ($reviewTo = $request->get('review_due_to')) {
            $query->whereDate('next_review_date', '<=', $reviewTo);
        }
        if ($expFrom = $request->get('expiry_from')) {
            $query->whereDate('expiry_date', '>=', $expFrom);
        }
        if ($expTo = $request->get('expiry_to')) {
            $query->whereDate('expiry_date', '<=', $expTo);
        }
        if ($period = $request->get('period')) {
            $query->period($period);
        }

        // Eager load
        $query->with([
            'activeRevision:id,document_id,revision_number,status,next_review_date,expiry_date,file_path',
            'owner:id,full_name',
            'createdBy:id,full_name',
        ])->withCount(['revisions', 'links']);

        // Sorting
        $sortBy = $request->get('sort_by', 'document_title');
        $sortDir = $request->get('sort_dir', 'asc');
        $allowedSorts = [
            'document_title', 'document_code', 'status',
            'next_review_date', 'expiry_date', 'updated_at', 'created_at',
        ];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('document_title', 'asc');
        }

        // Paginate
        $perPage = min(100, max(1, (int) $request->get('per_page', 20)));
        $paginated = $query->paginate($perPage);

        return response()->json([
            'data' => $paginated->items(),
            'total' => $paginated->total(),
            'page' => $paginated->currentPage(),
            'per_page' => $paginated->perPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    // ─── CREATE ──────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'document_title' => 'required|string|max:1000',
            'document_number' => 'nullable|string|max:200',
            'short_title' => 'nullable|string|max:300',
            'document_type' => 'required|string|max:200',
            'document_category' => 'nullable|string|max:200',
            'description' => 'nullable|string',
            'department' => 'nullable|string|max:200',
            'owner' => 'nullable|string|max:255',
            'owner_id' => 'nullable|exists:users,id',
            'prepared_by' => 'nullable|string|max:255',
            'responsible_person' => 'nullable|string|max:255',
            'site' => 'nullable|string|max:255',
            'project' => 'nullable|string|max:255',
            'area' => 'nullable|string|max:200',
            'zone' => 'nullable|string|max:200',
            'contractor_id' => 'nullable|exists:contractors,id',
            'confidentiality_level' => 'nullable|in:Public,Internal,Restricted,Confidential,Top Secret',
            'priority' => 'nullable|in:Critical,High,Medium,Low',
            'language' => 'nullable|string|max:100',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:100',
            // First revision fields
            'revision_number' => 'nullable|string|max:20',
            'issue_date' => 'nullable|date',
            'effective_date' => 'nullable|date',
            'next_review_date' => 'nullable|date',
            'expiry_date' => 'nullable|date',
            'change_summary' => 'nullable|string',
            // File
            'document_file' => 'nullable|file|max:51200|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,ppt,pptx,zip,dwg',
        ]);

        $user = auth()->user();

        return DB::transaction(function () use ($request, $user) {
            // Resolve contractor name
            $contractorName = null;
            if ($request->contractor_id) {
                $contractorName = Contractor::where('id', $request->contractor_id)->value('contractor_name');
            }

            $document = DcDocument::create([
                'document_title' => $request->document_title,
                'document_number' => $request->document_number,
                'short_title' => $request->short_title,
                'document_type' => $request->document_type,
                'document_category' => $request->document_category,
                'description' => $request->description,
                'department' => $request->department,
                'owner' => $request->owner,
                'owner_id' => $request->owner_id,
                'prepared_by' => $request->prepared_by,
                'responsible_person' => $request->responsible_person,
                'site' => $request->site,
                'project' => $request->project,
                'area' => $request->area,
                'zone' => $request->zone,
                'contractor_id' => $request->contractor_id,
                'contractor_name' => $contractorName,
                'confidentiality_level' => $request->confidentiality_level ?? 'Internal',
                'priority' => $request->priority ?? 'Medium',
                'language' => $request->language ?? 'English',
                'tags' => $request->tags,
                'status' => StatusConstants::DC_DRAFT,
                'current_revision_number' => $request->revision_number ?? 'Rev 00',
                'created_by' => $user?->id,
                'updated_by' => $user?->id,
            ]);

            // Create first revision
            $revisionData = [
                'document_id' => $document->id,
                'revision_number' => $request->revision_number ?? 'Rev 00',
                'status' => StatusConstants::DC_DRAFT,
                'is_active' => false,
                'issue_date' => $request->issue_date,
                'effective_date' => $request->effective_date,
                'next_review_date' => $request->next_review_date,
                'expiry_date' => $request->expiry_date,
                'change_summary' => $request->change_summary,
                'created_by' => $user?->id,
                'updated_by' => $user?->id,
            ];

            if ($request->hasFile('document_file')) {
                $file = $request->file('document_file');
                $folder = 'documents/' . $document->id . '/revisions';
                $path = $file->store($folder, 'public');
                $revisionData['file_path'] = $path;
                $revisionData['original_name'] = $file->getClientOriginalName();
                $revisionData['file_type'] = $file->getClientOriginalExtension();
                $revisionData['file_size_kb'] = (int) ($file->getSize() / 1024);
            }

            $revision = DcRevision::create($revisionData);

            $document->logHistory('Document Created', null, StatusConstants::DC_DRAFT, null, null, $revision->id);

            $document->load('activeRevision', 'createdBy:id,full_name');

            NotificationService::notifyRoles(
                ['master', 'system_admin', 'ehs_manager', 'safety_officer'],
                NotificationService::TYPE_DOCUMENT,
                'New Document Created',
                "Document {$document->document_code} \"{$document->title}\" has been created.",
                'info',
                'file-text',
                '/document-control',
                'dc_documents',
                $document->document_code ?? (string) $document->id,
                auth()->id(),
            );

            return response()->json([
                'message' => 'Document created successfully.',
                'data' => $document,
            ], 201);
        });
    }

    // ─── SHOW ────────────────────────────────────────────

    public function show($id): JsonResponse
    {
        $document = DcDocument::with([
            'revisions' => function ($q) {
                $q->orderByDesc('created_at');
            },
            'revisions.reviews',
            'revisions.approvals',
            'revisions.createdBy:id,full_name',
            'activeRevision',
            'activeRevision.reviews',
            'activeRevision.approvals',
            'links' => function ($q) {
                $q->orderByDesc('created_at')->limit(20);
            },
            'logs' => function ($q) {
                $q->orderBy('created_at', 'asc');
            },
            'logs.performer:id,full_name',
            'owner:id,full_name',
            'contractor',
            'createdBy:id,full_name',
        ])->withCount(['revisions', 'links'])->findOrFail($id);

        $document->append(['has_active_revision']);

        return response()->json(['data' => $document]);
    }

    // ─── UPDATE ──────────────────────────────────────────

    public function update(Request $request, $id): JsonResponse
    {
        $document = DcDocument::findOrFail($id);

        if (in_array($document->status, ['Obsolete', 'Archived'])) {
            return response()->json([
                'message' => 'Obsolete or Archived documents cannot be edited.',
            ], 422);
        }

        $request->validate([
            'document_title' => 'sometimes|required|string|max:1000',
            'document_number' => 'nullable|string|max:200',
            'short_title' => 'nullable|string|max:300',
            'document_type' => 'sometimes|required|string|max:200',
            'document_category' => 'nullable|string|max:200',
            'description' => 'nullable|string',
            'department' => 'nullable|string|max:200',
            'owner' => 'nullable|string|max:255',
            'owner_id' => 'nullable|exists:users,id',
            'prepared_by' => 'nullable|string|max:255',
            'responsible_person' => 'nullable|string|max:255',
            'site' => 'nullable|string|max:255',
            'project' => 'nullable|string|max:255',
            'area' => 'nullable|string|max:200',
            'zone' => 'nullable|string|max:200',
            'contractor_id' => 'nullable|exists:contractors,id',
            'confidentiality_level' => 'nullable|in:Public,Internal,Restricted,Confidential,Top Secret',
            'priority' => 'nullable|in:Critical,High,Medium,Low',
            'language' => 'nullable|string|max:100',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:100',
        ]);

        $user = auth()->user();

        $fillable = [
            'document_title', 'document_number', 'short_title',
            'document_type', 'document_category', 'description',
            'department', 'owner', 'owner_id', 'prepared_by', 'responsible_person',
            'site', 'project', 'area', 'zone', 'contractor_id',
            'confidentiality_level', 'priority', 'language', 'tags',
        ];

        $fields = ['updated_by' => $user?->id];
        foreach ($fillable as $col) {
            if ($request->has($col)) {
                $fields[$col] = $request->input($col);
            }
        }

        // Sync contractor name
        if ($request->has('contractor_id')) {
            if ($request->contractor_id) {
                $fields['contractor_name'] = Contractor::where('id', $request->contractor_id)->value('contractor_name');
            } else {
                $fields['contractor_name'] = null;
            }
        }

        $document->update($fields);
        $document->logHistory('Document Updated');

        $document->load('activeRevision', 'owner:id,full_name', 'createdBy:id,full_name');

        return response()->json([
            'message' => 'Document updated successfully.',
            'data' => $document,
        ]);
    }

    // ─── DELETE ──────────────────────────────────────────

    public function destroy($id): JsonResponse
    {
        $document = DcDocument::findOrFail($id);
        $document->deleted_by = Auth::user()?->full_name ?? 'System';
        $document->save();
        $document->logHistory('Document Deleted', $document->status, 'Deleted');
        $document->delete();
        RecycleBinController::logDeleteAction('dc_document', $document);

        return response()->json(['message' => 'Document moved to recycle bin.']);
    }

    // ─── CREATE NEW REVISION ─────────────────────────────

    public function createRevision(Request $request, $id): JsonResponse
    {
        $document = DcDocument::findOrFail($id);

        if (in_array($document->status, ['Obsolete', 'Archived'])) {
            return response()->json([
                'message' => 'Cannot create revision for Obsolete or Archived documents.',
            ], 422);
        }

        $request->validate([
            'revision_number' => 'required|string|max:20',
            'reason_for_revision' => 'required|string',
            'change_summary' => 'nullable|string',
            'issue_date' => 'nullable|date',
            'effective_date' => 'nullable|date',
            'next_review_date' => 'nullable|date',
            'expiry_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'document_file' => 'nullable|file|max:51200|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,ppt,pptx',
        ]);

        // Guard: revision_number must not already exist for this document
        $exists = DcRevision::where('document_id', $document->id)
            ->where('revision_number', $request->revision_number)
            ->exists();
        if ($exists) {
            return response()->json([
                'message' => 'Revision number "' . $request->revision_number . '" already exists for this document.',
            ], 422);
        }

        $user = auth()->user();

        return DB::transaction(function () use ($request, $document, $user) {
            $revisionData = [
                'document_id' => $document->id,
                'revision_number' => $request->revision_number,
                'status' => StatusConstants::DC_DRAFT,
                'is_active' => false,
                'issue_date' => $request->issue_date,
                'effective_date' => $request->effective_date,
                'next_review_date' => $request->next_review_date,
                'expiry_date' => $request->expiry_date,
                'change_summary' => $request->change_summary,
                'reason_for_revision' => $request->reason_for_revision,
                'notes' => $request->notes,
                'created_by' => $user?->id,
                'updated_by' => $user?->id,
            ];

            if ($request->hasFile('document_file')) {
                $file = $request->file('document_file');
                $folder = 'documents/' . $document->id . '/revisions';
                $path = $file->store($folder, 'public');
                $revisionData['file_path'] = $path;
                $revisionData['original_name'] = $file->getClientOriginalName();
                $revisionData['file_type'] = $file->getClientOriginalExtension();
                $revisionData['file_size_kb'] = (int) ($file->getSize() / 1024);
            }

            $revision = DcRevision::create($revisionData);

            $document->update([
                'status' => StatusConstants::DC_DRAFT,
                'updated_by' => $user?->id,
            ]);

            $document->logHistory(
                'Revision Created', null, StatusConstants::DC_DRAFT,
                $request->reason_for_revision, null, $revision->id
            );

            return response()->json([
                'message' => 'Revision created successfully.',
                'data' => $revision,
            ], 201);
        });
    }

    // ─── SUBMIT FOR REVIEW ───────────────────────────────

    public function submitForReview(Request $request, $documentId, $revisionId): JsonResponse
    {
        $document = DcDocument::findOrFail($documentId);
        $revision = DcRevision::where('document_id', $document->id)->findOrFail($revisionId);

        if (!in_array($revision->status, ['Draft', 'Rejected'])) {
            return response()->json([
                'message' => 'Only Draft or Rejected revisions can be submitted for review.',
            ], 422);
        }

        if (!$revision->file_path) {
            return response()->json([
                'message' => 'Please upload the document file before submitting for review.',
            ], 422);
        }

        $request->validate([
            'reviewers' => 'required|array|min:1',
            'reviewers.*.name' => 'required|string|max:255',
            'reviewers.*.role' => 'nullable|string|max:200',
            'reviewers.*.review_party' => 'nullable|string|max:200',
            'reviewers.*.user_id' => 'nullable|exists:users,id',
            'reviewers.*.due_date' => 'nullable|date',
        ]);

        $user = auth()->user();

        return DB::transaction(function () use ($request, $document, $revision, $user) {
            // Remove existing pending reviews
            DcReview::where('document_revision_id', $revision->id)
                ->where('review_status', 'Pending')
                ->delete();

            // Create reviews
            foreach ($request->reviewers as $reviewer) {
                DcReview::create([
                    'document_revision_id' => $revision->id,
                    'document_id' => $document->id,
                    'reviewer_id' => $reviewer['user_id'] ?? null,
                    'reviewer_name' => $reviewer['name'],
                    'reviewer_role' => $reviewer['role'] ?? null,
                    'review_party' => $reviewer['review_party'] ?? null,
                    'review_status' => 'Pending',
                    'due_date' => $reviewer['due_date'] ?? null,
                ]);
            }

            $revision->update([
                'status' => StatusConstants::DC_UNDER_REVIEW,
                'submitted_for_review_at' => now(),
                'submitted_by' => $user?->id,
            ]);

            $document->update([
                'status' => StatusConstants::DC_UNDER_REVIEW,
                'updated_by' => $user?->id,
            ]);

            $document->logHistory('Submitted for Review', null, StatusConstants::DC_UNDER_REVIEW, null, null, $revision->id);

            $revision->load('reviews');

            NotificationService::documentSubmittedForReview($document, $user?->id ?? auth()->id());

            return response()->json([
                'message' => 'Submitted for review.',
                'data' => $revision,
            ]);
        });
    }

    // ─── SUBMIT REVIEW ──────────────────────────────────

    public function submitReview(Request $request, $documentId, $revisionId, $reviewId): JsonResponse
    {
        $document = DcDocument::findOrFail($documentId);
        $revision = DcRevision::where('document_id', $document->id)->findOrFail($revisionId);
        $review = DcReview::where('document_revision_id', $revision->id)->findOrFail($reviewId);

        if ($review->review_status !== 'Pending') {
            return response()->json([
                'message' => 'This review has already been submitted.',
            ], 422);
        }

        $request->validate([
            'review_status' => 'required|in:Approved,Approved with Comments,Rejected',
            'review_comments' => 'nullable|string|required_if:review_status,Rejected|required_if:review_status,Approved with Comments',
        ]);

        $review->update([
            'review_status' => $request->review_status,
            'review_comments' => $request->review_comments,
            'reviewed_at' => now(),
        ]);

        // Check if all reviews are complete
        $pendingCount = DcReview::where('document_revision_id', $revision->id)
            ->where('review_status', 'Pending')
            ->count();

        if ($pendingCount === 0) {
            $rejectedCount = DcReview::where('document_revision_id', $revision->id)
                ->where('review_status', 'Rejected')
                ->count();

            if ($rejectedCount > 0) {
                $revision->update(['status' => 'Rejected']);
                $document->update(['status' => 'Rejected', 'updated_by' => auth()->id()]);
            }
            // If all approved — revision stays Under Review, waiting for approval stage
        }

        $document->logHistory(
            'Review Submitted', null, $request->review_status,
            'By: ' . auth()->user()?->full_name, null, $revision->id
        );

        return response()->json([
            'message' => 'Review submitted.',
            'data' => $review,
        ]);
    }

    // ─── SUBMIT FOR APPROVAL ─────────────────────────────

    public function submitForApproval(Request $request, $documentId, $revisionId): JsonResponse
    {
        $document = DcDocument::findOrFail($documentId);
        $revision = DcRevision::where('document_id', $document->id)->findOrFail($revisionId);

        // Check all reviews are done
        $pendingReviews = DcReview::where('document_revision_id', $revision->id)
            ->where('review_status', 'Pending')
            ->count();

        if ($revision->status !== 'Under Review' || $pendingReviews > 0) {
            return response()->json([
                'message' => 'All reviews must be completed before submitting for approval.',
            ], 422);
        }

        $request->validate([
            'approvers' => 'required|array|min:1',
            'approvers.*.name' => 'required|string|max:255',
            'approvers.*.role' => 'nullable|string|max:200',
            'approvers.*.approval_party' => 'nullable|string|max:200',
            'approvers.*.user_id' => 'nullable|exists:users,id',
            'approvers.*.due_date' => 'nullable|date',
        ]);

        $user = auth()->user();

        return DB::transaction(function () use ($request, $document, $revision, $user) {
            // Remove existing pending approvals
            DcApproval::where('document_revision_id', $revision->id)
                ->where('approval_status', 'Pending')
                ->delete();

            foreach ($request->approvers as $approver) {
                DcApproval::create([
                    'document_revision_id' => $revision->id,
                    'document_id' => $document->id,
                    'approver_id' => $approver['user_id'] ?? null,
                    'approver_name' => $approver['name'],
                    'approver_role' => $approver['role'] ?? null,
                    'approval_party' => $approver['approval_party'] ?? null,
                    'approval_status' => 'Pending',
                    'due_date' => $approver['due_date'] ?? null,
                ]);
            }

            $document->logHistory('Submitted for Approval', null, null, null, null, $revision->id);

            $revision->load('approvals');

            return response()->json([
                'message' => 'Submitted for approval.',
                'data' => $revision,
            ]);
        });
    }

    // ─── SUBMIT APPROVAL ─────────────────────────────────

    public function submitApproval(Request $request, $documentId, $revisionId, $approvalId): JsonResponse
    {
        $document = DcDocument::findOrFail($documentId);
        $revision = DcRevision::where('document_id', $document->id)->findOrFail($revisionId);
        $approval = DcApproval::where('document_revision_id', $revision->id)->findOrFail($approvalId);

        if ($approval->approval_status !== 'Pending') {
            return response()->json([
                'message' => 'This approval has already been submitted.',
            ], 422);
        }

        $request->validate([
            'approval_status' => 'required|in:Approved,Approved with Comments,Rejected',
            'approval_comments' => 'nullable|string|required_if:approval_status,Rejected|required_if:approval_status,Approved with Comments',
        ]);

        $approval->update([
            'approval_status' => $request->approval_status,
            'approval_comments' => $request->approval_comments,
            'approved_at' => now(),
        ]);

        // Check all approvals
        $pendingCount = DcApproval::where('document_revision_id', $revision->id)
            ->where('approval_status', 'Pending')
            ->count();

        if ($pendingCount === 0) {
            $rejectedCount = DcApproval::where('document_revision_id', $revision->id)
                ->where('approval_status', 'Rejected')
                ->count();

            if ($rejectedCount > 0) {
                $revision->update(['status' => 'Rejected']);
                $document->update(['status' => 'Rejected', 'updated_by' => auth()->id()]);
            } else {
                $hasComments = DcApproval::where('document_revision_id', $revision->id)
                    ->where('approval_status', 'Approved with Comments')
                    ->exists();

                $newStatus = $hasComments ? 'Approved with Comments' : 'Approved';
                $revision->update([
                    'status' => $newStatus,
                    'approved_at' => now(),
                    'approved_by' => auth()->user()?->full_name,
                    'approved_by_id' => auth()->id(),
                ]);
                $document->update(['status' => $newStatus, 'updated_by' => auth()->id()]);
            }
        }

        $document->logHistory(
            'Approval Submitted', null, $request->approval_status,
            null, null, $revision->id
        );

        // Notify when all approvals are done (document status changed)
        $document->refresh();
        if (in_array($document->status, ['Approved', 'Rejected', 'Approved with Comments'])) {
            NotificationService::documentApprovalDecision($document, $document->status, auth()->id());
        }

        return response()->json([
            'message' => 'Approval submitted.',
            'data' => $approval,
        ]);
    }

    // ─── ACTIVATE REVISION ───────────────────────────────

    public function activateRevision($documentId, $revisionId): JsonResponse
    {
        $document = DcDocument::findOrFail($documentId);
        $revision = DcRevision::where('document_id', $document->id)->findOrFail($revisionId);

        if (!in_array($revision->status, ['Approved', 'Approved with Comments'])) {
            return response()->json([
                'message' => 'Only Approved revisions can be activated.',
            ], 422);
        }

        DB::transaction(function () use ($document, $revision) {
            $document->activateRevision($revision);

            $document->logHistory(
                'Revision Activated', null, 'Active',
                'Rev: ' . $revision->revision_number . ' is now Active. Previous revision Superseded.',
                null, $revision->id
            );
        });

        $document->load('activeRevision', 'revisions');

        NotificationService::documentActivated($document, auth()->id());

        return response()->json([
            'message' => 'Revision activated successfully.',
            'data' => $document,
        ]);
    }

    // ─── CHANGE STATUS ───────────────────────────────────

    public function changeStatus(Request $request, $id): JsonResponse
    {
        $document = DcDocument::findOrFail($id);

        $request->validate([
            'status' => 'required|in:Obsolete,Archived',
            'reason' => 'required|string',
        ]);

        if (in_array($document->status, ['Obsolete', 'Archived'])) {
            return response()->json([
                'message' => 'Document is already ' . $document->status . '.',
            ], 422);
        }

        $oldStatus = $document->status;
        $document->update([
            'status' => $request->status,
            'updated_by' => auth()->id(),
        ]);

        $document->logHistory('Status Changed', $oldStatus, $request->status, $request->reason);

        return response()->json([
            'message' => 'Document status changed to ' . $request->status . '.',
            'data' => $document,
        ]);
    }

    // ─── UPLOAD FILE TO REVISION ─────────────────────────

    public function uploadRevisionFile(Request $request, $documentId, $revisionId): JsonResponse
    {
        $document = DcDocument::findOrFail($documentId);
        $revision = DcRevision::where('document_id', $document->id)->findOrFail($revisionId);

        if (!in_array($revision->status, ['Draft', 'Rejected'])) {
            return response()->json([
                'message' => 'Files can only be uploaded to Draft or Rejected revisions.',
            ], 422);
        }

        $request->validate([
            'document_file' => 'required|file|max:51200|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png,ppt,pptx,zip,dwg',
        ]);

        // Delete old file
        if ($revision->file_path) {
            Storage::disk('public')->delete($revision->file_path);
        }

        $file = $request->file('document_file');
        $folder = 'documents/' . $document->id . '/revisions';
        $path = $file->store($folder, 'public');

        $revision->update([
            'file_path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'file_type' => $file->getClientOriginalExtension(),
            'file_size_kb' => (int) ($file->getSize() / 1024),
            'updated_by' => auth()->id(),
        ]);

        $document->logHistory(
            'File Uploaded', null, null,
            'File: ' . $file->getClientOriginalName(), null, $revision->id
        );

        return response()->json([
            'message' => 'File uploaded successfully.',
            'data' => $revision,
        ]);
    }

    // ─── DOCUMENT LINKS ─────────────────────────────────

    public function addLink(Request $request, $id): JsonResponse
    {
        $document = DcDocument::findOrFail($id);

        $request->validate([
            'linked_module' => 'required|string|max:100',
            'linked_id' => 'required',
            'linked_code' => 'nullable|string|max:100',
            'linked_title' => 'nullable|string|max:500',
            'document_revision_id' => 'nullable|exists:dc_revisions,id',
            'link_notes' => 'nullable|string',
        ]);

        $link = DcLink::create([
            'document_id' => $document->id,
            'document_revision_id' => $request->document_revision_id,
            'linked_module' => $request->linked_module,
            'linked_id' => $request->linked_id,
            'linked_code' => $request->linked_code,
            'linked_title' => $request->linked_title,
            'link_notes' => $request->link_notes,
            'created_by' => auth()->id(),
            'created_at' => now(),
        ]);

        $document->logHistory(
            'Link Added', null, null,
            $request->linked_module . ': ' . ($request->linked_code ?? $request->linked_id)
        );

        return response()->json([
            'message' => 'Link added.',
            'data' => $link,
        ], 201);
    }

    public function removeLink($documentId, $linkId): JsonResponse
    {
        $document = DcDocument::findOrFail($documentId);
        $link = DcLink::where('document_id', $document->id)->findOrFail($linkId);

        $document->logHistory(
            'Link Removed', null, null,
            $link->linked_module . ': ' . ($link->linked_code ?? $link->linked_id)
        );

        $link->delete();

        return response()->json(['message' => 'Link removed.']);
    }

    // ─── STATS ───────────────────────────────────────────

    public function stats(Request $request): JsonResponse
    {
        $year = $request->get('year', now()->year);
        $base = DcDocument::whereYear('created_at', $year);

        $kpis = [
            'total_documents' => (clone $base)->count(),
            'active' => (clone $base)->where('status', 'Active')->count(),
            'under_review' => (clone $base)->where('status', 'Under Review')->count(),
            'draft' => (clone $base)->where('status', 'Draft')->count(),
            'approved_pending_activation' => (clone $base)->whereIn('status', ['Approved', 'Approved with Comments'])->count(),
            'expired' => (clone $base)->where('is_expired', true)->count(),
            'overdue_review' => (clone $base)->where('is_overdue_review', true)->count(),
            'expiring_soon' => (clone $base)->where('is_expiring_soon', true)->count(),
            'pending_reviews' => DcReview::where('review_status', 'Pending')
                ->whereHas('document', fn ($q) => $q->whereYear('created_at', $year))
                ->count(),
            'pending_approvals' => DcApproval::where('approval_status', 'Pending')
                ->whereHas('document', fn ($q) => $q->whereYear('created_at', $year))
                ->count(),
            'obsolete_archived' => (clone $base)->whereIn('status', ['Obsolete', 'Archived'])->count(),
        ];

        $byType = (clone $base)
            ->select('document_type', DB::raw('COUNT(*) as count'))
            ->groupBy('document_type')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        $byCategory = (clone $base)
            ->select('document_category', DB::raw('COUNT(*) as count'))
            ->whereNotNull('document_category')
            ->groupBy('document_category')
            ->orderByDesc('count')
            ->get();

        $byStatus = (clone $base)
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->orderByDesc('count')
            ->get();

        $byDepartment = (clone $base)
            ->select('department', DB::raw('COUNT(*) as count'))
            ->whereNotNull('department')
            ->where('department', '!=', '')
            ->groupBy('department')
            ->orderByDesc('count')
            ->get();

        // Monthly trend (last 12 months)
        $monthlyTrend = DB::select("
            SELECT
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as documents_created,
                SUM(status = 'Active') as documents_activated
            FROM dc_documents
            WHERE deleted_at IS NULL
              AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month
        ");

        // Expiry alerts
        $expiryAlerts = DcDocument::whereNotNull('expiry_date')
            ->where(function ($q) {
                $q->where('is_expired', true)
                  ->orWhere('is_expiring_soon', true);
            })
            ->where('status', '!=', 'Obsolete')
            ->select('id', 'document_code', 'document_title', 'document_type', 'expiry_date', 'is_expired')
            ->orderBy('expiry_date')
            ->limit(15)
            ->get()
            ->map(function ($doc) {
                $doc->days_to_expiry = $doc->expiry_date
                    ? (int) now()->startOfDay()->diffInDays($doc->expiry_date, false)
                    : null;
                return $doc;
            });

        // Review alerts
        $reviewAlerts = DcDocument::whereNotNull('next_review_date')
            ->where('is_overdue_review', true)
            ->where('status', '!=', 'Obsolete')
            ->select('id', 'document_code', 'document_title', 'next_review_date')
            ->orderBy('next_review_date')
            ->limit(15)
            ->get()
            ->map(function ($doc) {
                $doc->days_overdue = $doc->next_review_date
                    ? (int) now()->startOfDay()->diffInDays($doc->next_review_date, false)
                    : null;
                return $doc;
            });

        // Pending workflow
        $pendingWorkflow = DcDocument::whereIn('status', ['Under Review', 'Approved', 'Approved with Comments'])
            ->withCount([
                'reviews as pending_reviews_count' => function ($q) {
                    $q->where('review_status', 'Pending');
                },
                'approvals as pending_approvals_count' => function ($q) {
                    $q->where('approval_status', 'Pending');
                },
            ])
            ->select('id', 'document_code', 'document_title', 'status')
            ->limit(10)
            ->get();

        return response()->json([
            'kpis' => $kpis,
            'by_type' => $byType,
            'by_category' => $byCategory,
            'by_status' => $byStatus,
            'by_department' => $byDepartment,
            'monthly_trend' => array_map(fn ($r) => [
                'month' => $r->month,
                'documents_created' => (int) $r->documents_created,
                'documents_activated' => (int) $r->documents_activated,
            ], $monthlyTrend),
            'expiry_alerts' => $expiryAlerts,
            'review_alerts' => $reviewAlerts,
            'pending_workflow' => $pendingWorkflow,
        ]);
    }

    // ─── EXPORT ──────────────────────────────────────────

    public function export(Request $request): mixed
    {
        $query = DcDocument::query();

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('document_code', 'like', "%{$search}%")
                  ->orWhere('document_title', 'like', "%{$search}%")
                  ->orWhere('document_number', 'like', "%{$search}%");
            });
        }
        if ($type = $request->get('document_type')) {
            $query->where('document_type', $type);
        }
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($dept = $request->get('department')) {
            $query->where('department', 'like', "%{$dept}%");
        }

        $records = $query->with('activeRevision')->withCount('links')->orderByDesc('created_at')->get();

        $headers = [
            'Document Code', 'Document Number', 'Title', 'Type', 'Category',
            'Status', 'Department', 'Owner', 'Site', 'Area', 'Contractor',
            'Confidentiality', 'Priority', 'Current Revision', 'Next Review Date',
            'Expiry Date', 'Is Expired', 'Is Overdue Review', 'Links Count',
            'Created Date', 'Notes',
        ];

        $rows = $records->map(fn ($d) => [
            $d->document_code,
            $d->document_number,
            $d->document_title,
            $d->document_type,
            $d->document_category,
            $d->status,
            $d->department,
            $d->owner,
            $d->site,
            $d->area,
            $d->contractor_name,
            $d->confidentiality_level,
            $d->priority,
            $d->current_revision_number,
            $d->next_review_date?->format('Y-m-d'),
            $d->expiry_date?->format('Y-m-d'),
            $d->is_expired ? 'Yes' : 'No',
            $d->is_overdue_review ? 'Yes' : 'No',
            $d->links_count ?? 0,
            $d->created_at?->format('Y-m-d'),
            $d->description,
        ])->toArray();

        $format = $request->get('format', 'csv');
        return $this->exportAs($headers, $rows, 'Document Control Register', $format);
    }

    // ─── LIST ACTIVE (for other modules) ─────────────────

    public function listActive(): JsonResponse
    {
        $docs = DcDocument::where('status', 'Active')
            ->select('id', 'document_code', 'document_number', 'document_title')
            ->orderBy('document_title')
            ->get();

        return response()->json(['data' => $docs]);
    }
}
