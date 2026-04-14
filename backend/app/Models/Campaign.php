<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Campaign extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'campaign_code', 'title', 'campaign_type', 'topic',
        'description', 'objective',
        'start_date', 'end_date', 'duration_days', 'frequency',
        'owner_name', 'owner_id', 'conducted_by', 'approved_by', 'approved_by_id',
        'site', 'project', 'area', 'zone', 'department', 'contractor_name',
        'target_audience', 'expected_participants',
        'status',
        'activity_count', 'participant_count', 'evidence_count',
        'action_count', 'open_action_count', 'completion_percentage',
        'notes', 'created_by', 'updated_by', 'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date'   => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Campaign $campaign) {
            // campaign_code is now generated in CampaignController::store() with lockForUpdate
            if ($campaign->start_date && $campaign->end_date) {
                $campaign->duration_days = $campaign->start_date->diffInDays($campaign->end_date);
            }
        });

        static::saving(function (Campaign $campaign) {
            if ($campaign->start_date && $campaign->end_date) {
                $campaign->duration_days = $campaign->start_date->diffInDays($campaign->end_date);
            }
        });
    }

    // ─── Relationships ─────────────────────────────

    public function activities(): HasMany
    {
        return $this->hasMany(CampaignActivity::class);
    }

    public function participants(): HasMany
    {
        return $this->hasMany(CampaignParticipant::class);
    }

    public function evidence(): HasMany
    {
        return $this->hasMany(CampaignEvidence::class);
    }

    public function actions(): HasMany
    {
        return $this->hasMany(CampaignAction::class);
    }

    public function result(): HasOne
    {
        return $this->hasOne(CampaignResult::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(CampaignLog::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ─── Helpers ───────────────────────────────────

    public function logHistory(string $action, ?string $fromStatus = null, ?string $toStatus = null, ?string $description = null, ?array $metadata = null): void
    {
        $user = auth()->user();
        CampaignLog::create([
            'campaign_id'       => $this->id,
            'action'            => $action,
            'from_status'       => $fromStatus,
            'to_status'         => $toStatus,
            'description'       => $description,
            'performed_by'      => $user?->id,
            'performed_by_name' => $user?->full_name ?? $user?->email ?? 'System',
            'performed_by_role' => $user?->role ?? 'unknown',
            'metadata'          => $metadata,
        ]);
    }

    public function recalculateCounts(): void
    {
        $this->timestamps = false;

        $actionCount = $this->actions()->count();
        $closedActions = $this->actions()->where('status', 'Completed')->count();

        $this->update([
            'activity_count'        => $this->activities()->count(),
            'participant_count'     => $this->participants()->count(),
            'evidence_count'        => $this->evidence()->count(),
            'action_count'          => $actionCount,
            'open_action_count'     => $this->actions()->whereIn('status', ['Open', 'In Progress', 'Overdue'])->count(),
            'completion_percentage' => $actionCount > 0 ? (int) round(($closedActions / $actionCount) * 100) : 0,
        ]);

        $this->timestamps = true;
    }

    // ─── Computed ──────────────────────────────────

    public function getIsActiveAttribute(): bool
    {
        return $this->start_date && $this->end_date
            && today()->gte($this->start_date)
            && today()->lte($this->end_date);
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->end_date
            && $this->end_date->lt(today())
            && !in_array($this->status, ['Completed', 'Closed', 'Cancelled']);
    }

    public function getDurationFormattedAttribute(): ?string
    {
        if (!$this->duration_days) return null;
        return $this->duration_days . ' day' . ($this->duration_days !== 1 ? 's' : '');
    }

    // ─── Scopes ────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', 'Active');
    }

    public function scopePlanned($query)
    {
        return $query->where('status', 'Planned');
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('campaign_type', $type);
    }

    public function scopeByTopic($query, string $topic)
    {
        return $query->where('topic', $topic);
    }

    public function scopeUpcoming($query)
    {
        return $query->where('start_date', '>', today());
    }

    public function scopeRunning($query)
    {
        return $query->where('start_date', '<=', today())
            ->where('end_date', '>=', today());
    }

    public function scopePeriod($query, string $period)
    {
        return match ($period) {
            'week'  => $query->whereBetween('start_date', [now()->startOfWeek(), now()->endOfWeek()]),
            'month' => $query->whereMonth('start_date', now()->month)->whereYear('start_date', now()->year),
            'year'  => $query->whereYear('start_date', now()->year),
            default => $query,
        };
    }
}
