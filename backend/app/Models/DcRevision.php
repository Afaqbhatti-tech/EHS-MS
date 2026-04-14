<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class DcRevision extends Model
{
    protected $table = 'dc_revisions';

    protected $fillable = [
        'document_id', 'revision_number', 'version_label', 'status',
        'issue_date', 'effective_date', 'next_review_date', 'expiry_date',
        'change_summary', 'reason_for_revision',
        'file_path', 'original_name', 'file_type', 'file_size_kb',
        'submitted_for_review_at', 'submitted_by',
        'approved_at', 'approved_by', 'approved_by_id', 'activated_at',
        'notes', 'created_by', 'updated_by', 'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'issue_date' => 'date',
            'effective_date' => 'date',
            'next_review_date' => 'date',
            'expiry_date' => 'date',
            'submitted_for_review_at' => 'datetime',
            'approved_at' => 'datetime',
            'activated_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    // ── Relationships ────────────────────────────────

    public function document()
    {
        return $this->belongsTo(DcDocument::class, 'document_id');
    }

    public function reviews()
    {
        return $this->hasMany(DcReview::class, 'document_revision_id');
    }

    public function approvals()
    {
        return $this->hasMany(DcApproval::class, 'document_revision_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function submittedBy()
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function approvedByUser()
    {
        return $this->belongsTo(User::class, 'approved_by_id');
    }

    // ── Computed ─────────────────────────────────────

    public function getUrlAttribute(): ?string
    {
        if (!$this->file_path) {
            return null;
        }
        return Storage::disk('public')->url($this->file_path);
    }

    public function getIsExpiredAttribute(): bool
    {
        return $this->expiry_date && $this->expiry_date->lt(now()->startOfDay());
    }

    public function getDaysToExpiryAttribute(): ?int
    {
        if (!$this->expiry_date) {
            return null;
        }
        return (int) now()->startOfDay()->diffInDays($this->expiry_date, false);
    }

    public function getIsExpiringSoonAttribute(): bool
    {
        if (!$this->expiry_date) {
            return false;
        }
        $today = now()->startOfDay();
        return $this->expiry_date->gte($today)
            && $this->expiry_date->lte($today->copy()->addDays(30));
    }

    public function getIsOverdueReviewAttribute(): bool
    {
        return $this->next_review_date && $this->next_review_date->lt(now()->startOfDay());
    }
}
