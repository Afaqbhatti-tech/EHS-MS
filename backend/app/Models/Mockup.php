<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Mockup extends Model
{
    use SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'ref_number', 'title', 'procedure_type', 'mockup_type',
        'area', 'zone', 'phase', 'trim_line', 'site', 'project',
        'contractor', 'supervisor_name', 'supervisor_id',
        'status', 'description',
        'fft_decision', 'consultant_decision', 'client_decision',
        'rams_document_id', 'rams_version_id', 'rams_revision_number',
        'approval_status', 'revision_number', 'parent_mockup_id',
        'submitted_at', 'submitted_by',
        'reviewed_by', 'reviewed_at',
        'approved_by', 'approved_at',
        'rejected_by', 'rejected_at', 'rejection_reason',
        'general_remarks', 'consultant_comments', 'compliance_status',
        'has_unresolved_comments', 'unresolved_comment_count', 'can_proceed',
        'tags', 'planned_start_date', 'planned_end_date',
        'mockup_date', 'mockup_time',
        'attachments', 'photos', 'priority', 'notes',
        'involved_candidates', 'manual_approved_by',
        'created_by', 'updated_by', 'import_batch_id',
        'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'attachments'              => 'array',
            'photos'                   => 'array',
            'tags'                     => 'array',
            'submitted_at'             => 'datetime',
            'reviewed_at'              => 'datetime',
            'approved_at'              => 'datetime',
            'rejected_at'              => 'datetime',
            'planned_start_date'       => 'date',
            'planned_end_date'         => 'date',
            'mockup_date'              => 'date',
            'has_unresolved_comments'  => 'boolean',
            'can_proceed'              => 'boolean',
            'involved_candidates'      => 'array',
            'manual_approved_by'       => 'array',
        ];
    }

    // ── Status Constants ─────────────────────────────
    const STATUS_DRAFT              = 'Draft';
    const STATUS_SUBMITTED          = 'Submitted for Review';
    const STATUS_APPROVED           = 'Approved';
    const STATUS_REJECTED           = 'Rejected';
    const STATUS_APPROVED_COMMENTS  = 'Approved with Comments';
    const STATUS_PENDING_COMPLIANCE = 'Pending Compliance';
    const STATUS_COMMENTS_RESOLVED  = 'Comments Resolved';
    const STATUS_RESUBMITTED        = 'Re-submitted';
    const STATUS_SUPERSEDED         = 'Superseded';

    const MOCKUP_TYPES = [
        'Physical Mock-Up',
        'Procedural Mock-Up',
        'Quality Mock-Up',
        'Safety Mock-Up',
        'Combined',
    ];

    protected static function booted(): void
    {
        static::creating(function (Mockup $m) {
            if (empty($m->id)) {
                $m->id = (string) Str::uuid();
            }
            if (empty($m->ref_number)) {
                $year  = now()->year;
                $count = static::whereYear('created_at', $year)->withTrashed()->count() + 1;
                $m->ref_number = 'MKP-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
            }
            if (empty($m->approval_status)) {
                $m->approval_status = self::STATUS_DRAFT;
            }
            if (empty($m->revision_number)) {
                $m->revision_number = 1;
            }
        });

        static::saving(function (Mockup $m) {
            $m->can_proceed = (int) $m->canProceed();

            // Auto-set compliance_status based on approval_status
            if ($m->approval_status === self::STATUS_APPROVED_COMMENTS) {
                $m->compliance_status = 'Pending';
            } elseif ($m->approval_status === self::STATUS_COMMENTS_RESOLVED) {
                $m->compliance_status = 'Resolved';
            } elseif ($m->approval_status === self::STATUS_APPROVED) {
                $m->compliance_status = null;
            }
        });
    }

    // ── Business Logic ─────────────────────────────

    public function canProceed(): bool
    {
        return in_array($this->approval_status, [self::STATUS_APPROVED, self::STATUS_COMMENTS_RESOLVED])
            && !$this->has_unresolved_comments;
    }

    public function isBlocked(): bool
    {
        return $this->has_unresolved_comments
            || in_array($this->approval_status, [
                self::STATUS_DRAFT,
                self::STATUS_SUBMITTED,
                self::STATUS_REJECTED,
                self::STATUS_APPROVED_COMMENTS,
                self::STATUS_PENDING_COMPLIANCE,
            ]);
    }

    public function isPendingCompliance(): bool
    {
        return $this->approval_status === self::STATUS_APPROVED_COMMENTS
            || $this->compliance_status === 'Pending';
    }

    public function requiresNewRevision(): bool
    {
        return in_array($this->approval_status, [
            self::STATUS_REJECTED,
            self::STATUS_APPROVED_COMMENTS,
            self::STATUS_PENDING_COMPLIANCE,
        ]);
    }

    // ── Relationships ──────────────────────────────

    public function ramsDocument()
    {
        return $this->belongsTo(RamsDocument::class, 'rams_document_id');
    }

    public function ramsVersion()
    {
        return $this->belongsTo(RamsDocumentVersion::class, 'rams_version_id');
    }

    public function parentMockup()
    {
        return $this->belongsTo(self::class, 'parent_mockup_id');
    }

    public function revisions()
    {
        return $this->hasMany(self::class, 'parent_mockup_id')
            ->orderBy('revision_number', 'asc');
    }

    public function allRevisions()
    {
        // Get the root mockup id (either this is root or find root via parent)
        $rootId = $this->parent_mockup_id ?? $this->id;
        return self::where('id', $rootId)
            ->orWhere('parent_mockup_id', $rootId)
            ->orderBy('revision_number', 'asc')
            ->get();
    }

    public function personnel()
    {
        return $this->hasMany(MockupPersonnel::class);
    }

    public function approvers()
    {
        return $this->hasMany(MockupApprover::class);
    }

    public function mockupAttachments()
    {
        return $this->hasMany(MockupAttachment::class);
    }

    public function comments()
    {
        return $this->hasMany(MockupComment::class)
            ->whereNull('parent_comment_id')
            ->with('replies')
            ->orderByDesc('created_at');
    }

    public function allComments()
    {
        return $this->hasMany(MockupComment::class)
            ->orderBy('created_at', 'asc');
    }

    public function unresolvedComments()
    {
        return $this->hasMany(MockupComment::class)
            ->where('is_resolved', false)
            ->where('comment_type', 'Review Comment')
            ->whereNull('parent_comment_id');
    }

    public function history()
    {
        return $this->hasMany(MockupHistory::class)
            ->orderByDesc('created_at');
    }

    public function createdByUser()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvedByUser()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function submittedByUser()
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    // ── Helpers ────────────────────────────────────

    public function logHistory(
        string $action,
        ?string $fromStatus,
        ?string $toStatus,
        ?string $description = null,
        ?array $metadata = null
    ): void {
        $user = auth()->user();
        MockupHistory::create([
            'id'                => (string) Str::uuid(),
            'mockup_id'         => $this->id,
            'action'            => $action,
            'from_status'       => $fromStatus,
            'to_status'         => $toStatus,
            'performed_by'      => $user?->id,
            'performed_by_name' => $user?->full_name ?? $user?->email,
            'performed_by_role' => $user?->role ?? 'unknown',
            'description'       => $description,
            'metadata'          => $metadata,
        ]);
    }

    public function recalculateCommentCounts(): void
    {
        $unresolvedCount = $this->unresolvedComments()->count();
        $this->update([
            'has_unresolved_comments'  => $unresolvedCount > 0,
            'unresolved_comment_count' => $unresolvedCount,
        ]);
    }

    // ── Scopes ─────────────────────────────────────

    public function scopeByApprovalStatus($q, $status)
    {
        return $q->where('approval_status', $status);
    }

    public function scopeCanProceed($q)
    {
        return $q->where('can_proceed', true);
    }

    public function scopeBlocked($q)
    {
        return $q->where('can_proceed', false);
    }

    public function scopeLatestRevisions($q)
    {
        return $q->where(function ($query) {
            $query->whereNull('parent_mockup_id')
                ->whereDoesntHave('revisions');
        })->orWhere(function ($query) {
            // Include child revisions that have no further children
            $query->whereNotNull('parent_mockup_id')
                ->whereDoesntHave('revisions');
        });
    }

    public function scopePeriod($q, $period)
    {
        return match ($period) {
            'week'  => $q->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]),
            'month' => $q->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year),
            'year'  => $q->whereYear('created_at', now()->year),
            default => $q,
        };
    }
}
