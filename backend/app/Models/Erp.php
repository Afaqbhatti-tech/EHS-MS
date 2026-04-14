<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Erp extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'erp_code', 'title', 'erp_type', 'version', 'revision_number', 'status',
        'site', 'project', 'area', 'zone', 'department',
        'scenario_description', 'scope', 'purpose', 'risk_level', 'trigger_conditions',
        'incident_controller', 'emergency_coordinator',
        'fire_wardens', 'first_aiders', 'rescue_team', 'security_team', 'medical_team',
        'emergency_contacts', 'communication_method', 'radio_channel', 'alarm_method',
        'assembly_point', 'muster_point', 'evacuation_route', 'response_steps', 'escalation_hierarchy',
        'required_equipment', 'equipment_locations', 'backup_equipment',
        'file_path', 'drawings_path', 'sop_path', 'notes',
        'created_by', 'approved_by', 'approved_by_id', 'approval_date',
        'review_frequency', 'next_review_date', 'updated_by',
        'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'fire_wardens'       => 'array',
            'first_aiders'       => 'array',
            'rescue_team'        => 'array',
            'security_team'      => 'array',
            'medical_team'       => 'array',
            'emergency_contacts' => 'array',
            'required_equipment' => 'array',
            'approval_date'      => 'date',
            'next_review_date'   => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Erp $erp) {
            if (empty($erp->erp_code)) {
                $year = now()->year;
                $count = self::withTrashed()->whereYear('created_at', $year)->count();
                $erp->erp_code = 'ERP-' . $year . '-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);
            }
        });
    }

    // Relationships
    public function drills(): HasMany
    {
        return $this->hasMany(MockDrill::class, 'erp_id');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(MockDrillLog::class, 'erp_id')->where('log_type', 'ERP');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_id');
    }

    // Computed
    public function getFileUrlAttribute(): ?string
    {
        return $this->file_path ? url('storage/' . $this->file_path) : null;
    }

    public function getDrawingsUrlAttribute(): ?string
    {
        return $this->drawings_path ? url('storage/' . $this->drawings_path) : null;
    }

    public function getDueForReviewAttribute(): bool
    {
        return $this->next_review_date && $this->next_review_date->lte(now()->addDays(30));
    }

    // Helpers
    public function logHistory(string $action, ?string $fromStatus = null, ?string $toStatus = null, ?string $description = null, ?array $metadata = null): void
    {
        $user = auth()->user();
        MockDrillLog::create([
            'erp_id'            => $this->id,
            'log_type'          => 'ERP',
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

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'Active');
    }

    public function scopeDueForReview($query)
    {
        return $query->whereNotNull('next_review_date')->where('next_review_date', '<=', now()->addDays(30));
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('erp_type', $type);
    }
}
