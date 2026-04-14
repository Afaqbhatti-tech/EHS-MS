<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Incident extends Model
{
    use HasFactory, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'incident_code',
        'incident_date', 'incident_time', 'location', 'area', 'department',
        'incident_type', 'incident_category', 'description', 'immediate_action',
        'severity',
        'affected_person_name', 'employee_id', 'designation', 'contractor_name',
        'contact_number', 'supervisor_name',
        'injury_type', 'body_part_affected',
        'medical_treatment_required', 'lost_time_injury', 'hospitalization',
        'property_damage', 'equipment_damage', 'environmental_impact',
        'financial_loss', 'incident_outcome_summary',
        'reported_by', 'reported_by_name',
        'assigned_to', 'assigned_to_name',
        'investigated_by', 'investigated_by_name', 'investigation_date',
        'immediate_cause', 'root_cause', 'root_cause_category',
        'ppe_used', 'procedure_followed', 'supervision_adequate', 'training_adequate',
        'witness_details', 'investigation_notes',
        'status',
        'closed_by', 'closed_by_name', 'closed_at', 'close_notes',
        'remarks', 'photos', 'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'incident_date'              => 'date',
            'investigation_date'         => 'date',
            'closed_at'                  => 'datetime',
            'medical_treatment_required' => 'boolean',
            'lost_time_injury'           => 'boolean',
            'hospitalization'            => 'boolean',
            'property_damage'            => 'boolean',
            'equipment_damage'           => 'boolean',
            'environmental_impact'       => 'boolean',
            'ppe_used'                   => 'boolean',
            'procedure_followed'         => 'boolean',
            'supervision_adequate'       => 'boolean',
            'training_adequate'          => 'boolean',
            'financial_loss'             => 'decimal:2',
            'photos'                     => 'array',
        ];
    }

    protected $hidden = ['deleted_at', 'deleted_by'];

    protected static function booted(): void
    {
        static::creating(function (Incident $i) {
            if (empty($i->id)) {
                $i->id = Str::uuid()->toString();
            }
            if (empty($i->incident_code)) {
                $year = now()->year;
                $count = static::withTrashed()->whereYear('created_at', $year)->count() + 1;
                $i->incident_code = 'INC-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
            }
            if (empty($i->status)) {
                $i->status = 'Reported';
            }
        });
    }

    // ─── Relationships ──────────────────────────────

    public function evidence()
    {
        return $this->hasMany(IncidentEvidence::class)->orderByDesc('created_at');
    }

    public function reportEvidence()
    {
        return $this->hasMany(IncidentEvidence::class)->where('related_type', 'report');
    }

    public function investigationEvidence()
    {
        return $this->hasMany(IncidentEvidence::class)->where('related_type', 'investigation');
    }

    public function actions()
    {
        return $this->hasMany(IncidentAction::class)->orderByDesc('created_at');
    }

    public function pendingActions()
    {
        return $this->hasMany(IncidentAction::class)->whereIn('status', ['Pending', 'In Progress', 'Overdue']);
    }

    public function logs()
    {
        return $this->hasMany(IncidentLog::class)->orderByDesc('created_at');
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

    public function logActivity(string $actionType, ?string $description = null, ?string $oldValue = null, ?string $newValue = null, ?array $metadata = null): IncidentLog
    {
        $user = request()->user();
        return $this->logs()->create([
            'id'          => Str::uuid()->toString(),
            'incident_id' => $this->id,
            'action_type' => $actionType,
            'description' => $description,
            'old_value'   => $oldValue,
            'new_value'   => $newValue,
            'metadata'    => $metadata,
            'user_id'     => $user?->id,
            'user_name'   => $user?->full_name ?? $user?->email ?? 'System',
        ]);
    }
}
