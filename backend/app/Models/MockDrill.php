<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class MockDrill extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'drill_code', 'title', 'erp_id', 'drill_type',
        'planned_date', 'planned_time', 'location', 'area', 'department',
        'responsible_person', 'responsible_person_id', 'conducted_by', 'observed_by', 'approved_by',
        'scenario_description', 'trigger_method', 'expected_response', 'actual_response',
        'actual_start_time', 'actual_end_time', 'total_duration_minutes',
        'alarm_trigger_time', 'first_response_time', 'first_response_seconds',
        'evacuation_start_time', 'evacuation_complete_time', 'evacuation_duration_seconds',
        'muster_complete_time', 'muster_duration_seconds',
        'response_complete_time', 'total_response_seconds',
        'status', 'participant_count', 'observation_count', 'action_count', 'open_action_count',
        'frequency', 'next_drill_due',
        'closed_at', 'closed_by', 'closure_notes', 'notes',
        'created_by', 'updated_by', 'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'planned_date'             => 'date',
            'next_drill_due'           => 'date',
            'actual_start_time'        => 'datetime',
            'actual_end_time'          => 'datetime',
            'alarm_trigger_time'       => 'datetime',
            'first_response_time'      => 'datetime',
            'evacuation_start_time'    => 'datetime',
            'evacuation_complete_time' => 'datetime',
            'muster_complete_time'     => 'datetime',
            'response_complete_time'   => 'datetime',
            'closed_at'                => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        // drill_code is now generated in MockDrillController::store() with lockForUpdate

        static::saving(function (MockDrill $drill) {
            // Auto-calculate total_duration_minutes
            if ($drill->actual_start_time && $drill->actual_end_time) {
                $drill->total_duration_minutes = (int) $drill->actual_start_time->diffInMinutes($drill->actual_end_time);
            }
            // Auto-calculate timing seconds
            if ($drill->alarm_trigger_time && $drill->first_response_time) {
                $drill->first_response_seconds = (int) $drill->alarm_trigger_time->diffInSeconds($drill->first_response_time);
            }
            if ($drill->evacuation_start_time && $drill->evacuation_complete_time) {
                $drill->evacuation_duration_seconds = (int) $drill->evacuation_start_time->diffInSeconds($drill->evacuation_complete_time);
            }
            if ($drill->evacuation_complete_time && $drill->muster_complete_time) {
                $drill->muster_duration_seconds = (int) $drill->evacuation_complete_time->diffInSeconds($drill->muster_complete_time);
            }
            if ($drill->alarm_trigger_time && $drill->response_complete_time) {
                $drill->total_response_seconds = (int) $drill->alarm_trigger_time->diffInSeconds($drill->response_complete_time);
            }
        });
    }

    // Relationships
    public function erp(): BelongsTo
    {
        return $this->belongsTo(Erp::class, 'erp_id');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(MockDrillParticipant::class, 'mock_drill_id');
    }

    public function resources(): HasMany
    {
        return $this->hasMany(MockDrillResource::class, 'mock_drill_id');
    }

    public function observations(): HasMany
    {
        return $this->hasMany(MockDrillObservation::class, 'mock_drill_id');
    }

    public function actions(): HasMany
    {
        return $this->hasMany(MockDrillAction::class, 'mock_drill_id');
    }

    public function evaluation(): HasOne
    {
        return $this->hasOne(MockDrillEvaluation::class, 'mock_drill_id');
    }

    public function evidence(): HasMany
    {
        return $this->hasMany(MockDrillEvidence::class, 'mock_drill_id');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(MockDrillLog::class, 'mock_drill_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function responsiblePerson(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_person_id');
    }

    // Helpers
    public function logHistory(string $action, ?string $fromStatus = null, ?string $toStatus = null, ?string $description = null, ?array $metadata = null): void
    {
        $user = auth()->user();
        MockDrillLog::create([
            'mock_drill_id'     => $this->id,
            'log_type'          => 'Drill',
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
        $this->update([
            'participant_count'  => $this->participants()->count(),
            'observation_count'  => $this->observations()->count(),
            'action_count'       => $this->actions()->count(),
            'open_action_count'  => $this->actions()->whereIn('status', ['Open', 'In Progress', 'Overdue'])->count(),
        ]);
        $this->timestamps = true;
    }

    // Computed
    public function getIsOverdueAttribute(): bool
    {
        return $this->planned_date
            && $this->planned_date->lt(today())
            && in_array($this->status, ['Planned', 'Scheduled']);
    }

    public function getDurationFormattedAttribute(): ?string
    {
        if (!$this->total_duration_minutes) return null;
        $h = intdiv($this->total_duration_minutes, 60);
        $m = $this->total_duration_minutes % 60;
        return $h > 0 ? "{$h}h {$m}m" : "{$m}m";
    }

    public function getResponseTimeFormattedAttribute(): ?string
    {
        if (!$this->first_response_seconds) return null;
        $m = intdiv($this->first_response_seconds, 60);
        $s = $this->first_response_seconds % 60;
        return "{$m}m {$s}s";
    }

    // Scopes
    public function scopePlanned($query)
    {
        return $query->whereIn('status', ['Planned', 'Scheduled']);
    }

    public function scopeConducted($query)
    {
        return $query->where('status', 'Conducted');
    }

    public function scopeClosed($query)
    {
        return $query->where('status', 'Closed');
    }

    public function scopeOverdue($query)
    {
        return $query->where('planned_date', '<', today())
            ->whereIn('status', ['Planned', 'Scheduled']);
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('drill_type', $type);
    }

    public function scopeByErp($query, $erpId)
    {
        return $query->where('erp_id', $erpId);
    }

    public function scopeUpcoming($query)
    {
        return $query->where('planned_date', '>=', today())
            ->whereIn('status', ['Planned', 'Scheduled']);
    }

    public function scopeDueForDrill($query)
    {
        return $query->whereNotNull('next_drill_due')
            ->where('next_drill_due', '<=', now()->addDays(14));
    }
}
