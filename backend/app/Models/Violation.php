<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Violation extends Model
{
    use HasFactory, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'violation_code',
        'violation_date', 'violation_time', 'location', 'area', 'department',
        'violator_name', 'employee_id', 'designation', 'contractor_name',
        'violation_type', 'violation_category', 'description', 'violated_rule', 'hazard_description',
        'severity', 'immediate_action', 'immediate_action_notes',
        'reported_by', 'reported_by_name',
        'assigned_to', 'assigned_to_name',
        'investigated_by', 'investigated_by_name', 'investigation_date',
        'root_cause', 'root_cause_category', 'intentional', 'system_failure', 'investigation_notes',
        'status',
        'closed_by', 'closed_by_name', 'closed_at', 'close_notes',
        'remarks', 'photos', 'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'violation_date' => 'date',
            'investigation_date' => 'date',
            'closed_at' => 'datetime',
            'intentional' => 'boolean',
            'system_failure' => 'boolean',
            'photos' => 'array',
        ];
    }

    protected $hidden = ['deleted_at', 'deleted_by'];

    protected static function booted(): void
    {
        static::creating(function (Violation $v) {
            if (empty($v->id)) {
                $v->id = Str::uuid()->toString();
            }
            if (empty($v->violation_code)) {
                $year = now()->year;
                $count = static::withTrashed()->whereYear('created_at', $year)->count() + 1;
                $v->violation_code = 'VIO-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
            }
            if (empty($v->status)) {
                $v->status = 'Open';
            }
        });
    }

    // ─── Relationships ──────────────────────────────

    public function evidence()
    {
        return $this->hasMany(ViolationEvidence::class)->orderByDesc('created_at');
    }

    public function reportEvidence()
    {
        return $this->hasMany(ViolationEvidence::class)->where('related_type', 'report');
    }

    public function investigationEvidence()
    {
        return $this->hasMany(ViolationEvidence::class)->where('related_type', 'investigation');
    }

    public function actions()
    {
        return $this->hasMany(ViolationAction::class)->orderByDesc('created_at');
    }

    public function pendingActions()
    {
        return $this->hasMany(ViolationAction::class)->whereIn('status', ['Pending', 'In Progress', 'Overdue']);
    }

    public function logs()
    {
        return $this->hasMany(ViolationLog::class)->orderByDesc('created_at');
    }

    public function reportedByUser()
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function assignedToUser()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    // ─── Helpers ────────────────────────────────────

    public function logActivity(string $actionType, ?string $description = null, ?string $oldValue = null, ?string $newValue = null, ?array $metadata = null): ViolationLog
    {
        $user = request()->user();
        return $this->logs()->create([
            'id' => Str::uuid()->toString(),
            'violation_id' => $this->id,
            'action_type' => $actionType,
            'description' => $description,
            'old_value' => $oldValue,
            'new_value' => $newValue,
            'metadata' => $metadata,
            'user_id' => $user?->id,
            'user_name' => $user?->full_name ?? $user?->email ?? 'System',
        ]);
    }
}
