<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MomPoint extends Model
{
    protected $table = 'mom_points';

    protected $fillable = [
        'point_code', 'mom_id', 'point_number',
        'carried_from_point_id', 'original_mom_id',
        'carry_count', 'title', 'description', 'category',
        'raised_by', 'assigned_to', 'assigned_to_id',
        'status', 'priority', 'due_date',
        'completion_percentage', 'remarks',
        'source_slide_no', 'section_name',
        'resolved_at', 'resolved_by', 'resolution_summary',
        'source_document_reference', 'source_row_no',
        'is_recurring', 'created_by', 'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'due_date'    => 'date',
            'resolved_at' => 'datetime',
            'is_recurring' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (MomPoint $p) {
            if (empty($p->point_code)) {
                $mom = Mom::find($p->mom_id);
                $week = str_pad($mom?->week_number ?? 0, 2, '0', STR_PAD_LEFT);
                $year = $mom?->year ?? now()->year;
                $p->point_code = 'MOM-' . $year . '-W' . $week . '-P' . $p->point_number;
            }
        });

        static::saved(function (MomPoint $p) {
            Mom::find($p->mom_id)?->recalculatePointCounts();
        });

        static::deleted(function (MomPoint $p) {
            Mom::find($p->mom_id)?->recalculatePointCounts();
        });
    }

    // ── Relationships ────────────────────────────────

    public function mom()
    {
        return $this->belongsTo(Mom::class, 'mom_id');
    }

    public function updates()
    {
        return $this->hasMany(MomPointUpdate::class, 'mom_point_id')
            ->orderBy('created_at', 'desc');
    }

    public function carriedFrom()
    {
        return $this->belongsTo(MomPoint::class, 'carried_from_point_id');
    }

    public function carriedTo()
    {
        return $this->hasMany(MomPoint::class, 'carried_from_point_id');
    }

    public function originalMom()
    {
        return $this->belongsTo(Mom::class, 'original_mom_id');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to_id');
    }

    public function createdByUser()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function photos()
    {
        return $this->hasMany(MomPointPhoto::class, 'mom_point_id')
            ->orderBy('created_at', 'desc');
    }

    // ── Computed ─────────────────────────────────────

    public function getIsOverdueAttribute(): bool
    {
        return $this->due_date
            && now()->startOfDay()->gt($this->due_date)
            && !in_array($this->status, ['Resolved', 'Closed', 'Carried Forward']);
    }

    public function getDaysOverdueAttribute(): ?int
    {
        if (!$this->is_overdue) return null;
        return (int) $this->due_date->diffInDays(now());
    }

    // ── Scopes ───────────────────────────────────────

    public function scopeOpen($q)
    {
        return $q->whereIn('status', ['Open', 'Pending', 'Blocked']);
    }

    public function scopeUnresolved($q)
    {
        return $q->whereNotIn('status', ['Resolved', 'Closed', 'Carried Forward']);
    }

    public function scopeOverdue($q)
    {
        return $q->whereNotNull('due_date')
            ->where('due_date', '<', now()->startOfDay())
            ->whereNotIn('status', ['Resolved', 'Closed', 'Carried Forward']);
    }
}
