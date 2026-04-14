<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PermitAmendment extends Model
{
    use SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'ref_number', 'amendment_code', 'permit_id', 'revision_number',
        'amendment_title', 'amendment_type', 'amendment_category',
        'amendment_reason', 'changes_description', 'reason', 'priority',
        'status', 'requested_by', 'requested_by_id', 'request_date',
        'effective_from', 'effective_to',
        'reviewed_by', 'reviewed_by_id', 'reviewed_at',
        'approval_comments', 'conditions',
        'approved_by', 'approved_at',
        'rejected_by', 'rejected_by_id', 'rejected_at', 'rejection_reason',
        'is_active_revision', 'superseded_by_id',
        'is_major_change_flagged', 'major_change_note',
        'permit_number_snapshot', 'permit_type_snapshot', 'permit_area_snapshot',
        'notes', 'created_by', 'updated_by', 'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'request_date'             => 'date',
            'effective_from'           => 'date',
            'effective_to'             => 'date',
            'reviewed_at'              => 'datetime',
            'approved_at'              => 'datetime',
            'rejected_at'              => 'datetime',
            'is_active_revision'       => 'boolean',
            'is_major_change_flagged'  => 'boolean',
        ];
    }

    // ── Auto-generation ──────────────────────────────────

    protected static function booted(): void
    {
        static::creating(function (PermitAmendment $a) {
            if (empty($a->id)) {
                $a->id = (string) Str::uuid();
            }

            // amendment_code is now generated in PermitAmendmentController::store() with lockForUpdate

            // Auto-generate ref_number if empty (will use amendment_code set by controller)
            if (empty($a->ref_number) && !empty($a->amendment_code)) {
                $a->ref_number = $a->amendment_code;
            }

            // Auto-assign revision_number for this permit
            if (empty($a->revision_number) || $a->revision_number < 1) {
                $maxRev = static::where('permit_id', $a->permit_id)
                    ->withTrashed()->max('revision_number') ?? 0;
                $a->revision_number = $maxRev + 1;
            }

            // Snapshot permit context
            $permit = Permit::find($a->permit_id);
            if ($permit) {
                $a->permit_number_snapshot = $permit->ref_number ?? null;
                $a->permit_type_snapshot   = $permit->permit_type ?? null;
                $a->permit_area_snapshot   = $permit->zone ?? null;
            }
        });

        // When amendment approved: activate this revision
        static::saved(function (PermitAmendment $a) {
            if (in_array($a->status, ['Approved', 'Approved with Comments'])
                && $a->wasChanged('status')) {
                // Deactivate all other amendments for this permit
                static::where('permit_id', $a->permit_id)
                    ->where('id', '!=', $a->id)
                    ->where('is_active_revision', true)
                    ->update(['is_active_revision' => false]);

                // Activate this one
                static::withoutEvents(function () use ($a) {
                    static::where('id', $a->id)
                        ->update(['is_active_revision' => true]);
                });

                // Update permit revision number
                Permit::where('id', $a->permit_id)->update([
                    'current_revision_number' => $a->revision_number,
                    'has_active_amendment'    => true,
                ]);
            }
        });

        // Update permit amendment_count on create/delete only
        static::created(function ($a) {
            Permit::where('id', $a->permit_id)->update([
                'amendment_count' => static::where('permit_id', $a->permit_id)->count(),
            ]);
        });

        static::deleted(function ($a) {
            Permit::where('id', $a->permit_id)->update([
                'amendment_count' => static::where('permit_id', $a->permit_id)->count(),
            ]);
        });
    }

    // ── Relationships ────────────────────────────────────

    public function permit()
    {
        return $this->belongsTo(Permit::class, 'permit_id');
    }

    public function changes()
    {
        return $this->hasMany(PermitAmendmentChange::class, 'amendment_id')
            ->orderBy('change_order');
    }

    public function attachments()
    {
        return $this->hasMany(PermitAmendmentAttachment::class, 'amendment_id');
    }

    public function logs()
    {
        return $this->hasMany(PermitAmendmentLog::class, 'amendment_id')
            ->orderBy('created_at', 'desc');
    }

    public function requestedByUser()
    {
        return $this->belongsTo(User::class, 'requested_by_id');
    }

    public function reviewedByUser()
    {
        return $this->belongsTo(User::class, 'reviewed_by_id');
    }

    public function supersededBy()
    {
        return $this->belongsTo(PermitAmendment::class, 'superseded_by_id');
    }

    // ── Helper: log history ──────────────────────────────

    public function logHistory(
        string  $action,
        ?string $fromStatus = null,
        ?string $toStatus = null,
        ?string $description = null,
        ?array  $metadata = null
    ): void {
        PermitAmendmentLog::create([
            'amendment_id'      => $this->id,
            'permit_id'         => $this->permit_id,
            'action'            => $action,
            'from_status'       => $fromStatus,
            'to_status'         => $toStatus,
            'performed_by'      => auth()->id(),
            'performed_by_name' => auth()->user()?->name,
            'performed_by_role' => auth()->user()?->role ?? 'unknown',
            'description'       => $description,
            'metadata'          => $metadata,
        ]);
    }

    // ── Computed ─────────────────────────────────────────

    public function getIsMajorAttribute(): bool
    {
        return $this->amendment_category === 'Major';
    }

    public function getChangeCountAttribute(): int
    {
        return $this->changes()->count();
    }

    // ── Scopes ───────────────────────────────────────────

    public function scopeByPermit($q, $permitId)
    {
        return $q->where('permit_id', $permitId);
    }

    public function scopePending($q)
    {
        return $q->whereIn('status', ['Submitted', 'Under Review']);
    }

    public function scopeApproved($q)
    {
        return $q->whereIn('status', ['Approved', 'Approved with Comments']);
    }

    public function scopeActive($q)
    {
        return $q->where('is_active_revision', true);
    }

    public function scopePeriod($q, $period)
    {
        return match ($period) {
            'week'  => $q->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]),
            'month' => $q->whereMonth('created_at', now()->month)
                         ->whereYear('created_at', now()->year),
            'year'  => $q->whereYear('created_at', now()->year),
            default => $q,
        };
    }
}
