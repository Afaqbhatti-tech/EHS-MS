<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class DcDocument extends Model
{
    use SoftDeletes;

    protected $table = 'dc_documents';

    protected $fillable = [
        'document_code', 'document_number', 'document_title', 'short_title',
        'document_type', 'document_category', 'description',
        'department', 'owner', 'owner_id', 'prepared_by', 'responsible_person',
        'site', 'project', 'area', 'zone', 'contractor_id', 'contractor_name',
        'confidentiality_level', 'priority', 'language', 'tags',
        'status', 'active_revision_id', 'current_revision_number',
        'next_review_date', 'expiry_date',
        'is_overdue_review', 'is_expired', 'is_expiring_soon',
        'created_by', 'updated_by', 'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'next_review_date' => 'date',
            'expiry_date' => 'date',
            'tags' => 'array',
            'is_overdue_review' => 'boolean',
            'is_expired' => 'boolean',
            'is_expiring_soon' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $doc) {
            if (empty($doc->document_code)) {
                $year = now()->year;
                $lastCode = static::withTrashed()
                    ->where('document_code', 'like', "DOC-{$year}-%")
                    ->orderByRaw('CAST(SUBSTRING(document_code, -4) AS UNSIGNED) DESC')
                    ->value('document_code');

                $next = 1;
                if ($lastCode) {
                    $next = (int) substr($lastCode, -4) + 1;
                }
                $doc->document_code = 'DOC-' . $year . '-' . str_pad($next, 4, '0', STR_PAD_LEFT);
            }
        });
    }

    // ── Relationships ────────────────────────────────

    public function revisions()
    {
        return $this->hasMany(DcRevision::class, 'document_id')->orderByDesc('created_at');
    }

    public function activeRevision()
    {
        return $this->hasOne(DcRevision::class, 'document_id')->where('is_active', true);
    }

    public function reviews()
    {
        return $this->hasManyThrough(DcReview::class, DcRevision::class, 'document_id', 'document_revision_id');
    }

    public function approvals()
    {
        return $this->hasManyThrough(DcApproval::class, DcRevision::class, 'document_id', 'document_revision_id');
    }

    public function links()
    {
        return $this->hasMany(DcLink::class, 'document_id');
    }

    public function logs()
    {
        return $this->hasMany(DcLog::class, 'document_id');
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function contractor()
    {
        return $this->belongsTo(Contractor::class, 'contractor_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ── Helpers ──────────────────────────────────────

    public function logHistory(
        string $action,
        ?string $fromStatus = null,
        ?string $toStatus = null,
        ?string $description = null,
        ?array $metadata = null,
        ?int $revisionId = null
    ): void {
        $user = auth()->user();
        DcLog::create([
            'document_id' => $this->id,
            'document_revision_id' => $revisionId,
            'action' => $action,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'description' => $description,
            'performed_by' => $user?->id,
            'performed_by_name' => $user?->full_name ?? $user?->email ?? 'System',
            'performed_by_role' => $user?->role ?? 'unknown',
            'metadata' => $metadata,
        ]);
    }

    public function syncFromActiveRevision(): void
    {
        $rev = $this->activeRevision()->first();
        if (!$rev) {
            return;
        }

        $today = now()->startOfDay();

        $this->timestamps = false;
        $this->update([
            'current_revision_number' => $rev->revision_number,
            'next_review_date' => $rev->next_review_date,
            'expiry_date' => $rev->expiry_date,
            'status' => $rev->status === 'Active' ? 'Active' : $this->status,
            'is_expired' => $rev->expiry_date && $rev->expiry_date->lt($today),
            'is_overdue_review' => $rev->next_review_date && $rev->next_review_date->lt($today),
            'is_expiring_soon' => $rev->expiry_date
                && $rev->expiry_date->gte($today)
                && $rev->expiry_date->lte($today->copy()->addDays(config('document_control_config.expiry_warning_days', 30)))
                && !($rev->expiry_date->lt($today)),
        ]);
        $this->timestamps = true;
    }

    public function activateRevision(DcRevision $revision): void
    {
        DB::transaction(function () use ($revision) {
            // Lock all revisions of this document to prevent race conditions
            $this->revisions()->lockForUpdate()->get();

            // Supersede all other active revisions
            DcRevision::where('document_id', $this->id)
                ->where('id', '!=', $revision->id)
                ->where('is_active', true)
                ->update(['is_active' => false, 'status' => 'Superseded']);

            $revision->update([
                'is_active' => true,
                'status' => 'Active',
                'activated_at' => now(),
            ]);

            $this->active_revision_id = $revision->id;
            $this->save();
            $this->syncFromActiveRevision();
        });
    }

    // ── Computed ─────────────────────────────────────

    public function getHasActiveRevisionAttribute(): bool
    {
        return $this->active_revision_id !== null;
    }

    public function getIsObsoleteAttribute(): bool
    {
        return $this->status === 'Obsolete';
    }

    public function getCanBeUsedAttribute(): bool
    {
        return $this->status === 'Active';
    }

    // ── Scopes ───────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', 'Active');
    }

    public function scopeUnderReview($query)
    {
        return $query->where('status', 'Under Review');
    }

    public function scopeExpired($query)
    {
        return $query->where('is_expired', true);
    }

    public function scopeOverdueReview($query)
    {
        return $query->where('is_overdue_review', true);
    }

    public function scopeExpiringSoon($query)
    {
        return $query->where('is_expiring_soon', true);
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('document_type', $type);
    }

    public function scopeByCategory($query, string $cat)
    {
        return $query->where('document_category', $cat);
    }

    public function scopeByDepartment($query, string $dept)
    {
        return $query->where('department', $dept);
    }

    public function scopePeriod($query, string $period)
    {
        return match ($period) {
            'week' => $query->where('created_at', '>=', now()->subWeek()),
            'month' => $query->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year),
            'year' => $query->whereYear('created_at', now()->year),
            default => $query,
        };
    }
}
