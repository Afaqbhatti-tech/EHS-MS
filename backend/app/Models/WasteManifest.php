<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WasteManifest extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'manifest_code', 'manifest_number', 'manifest_date',
        'dispatch_date', 'dispatch_time', 'priority', 'notes', 'status',
        // Source / Generator
        'source_site', 'source_project', 'source_area', 'source_zone',
        'source_department', 'generating_activity', 'generator_company',
        'responsible_person', 'responsible_person_id', 'contact_number',
        // Waste Identification
        'waste_type', 'waste_category', 'waste_description',
        'hazard_classification', 'waste_code', 'un_code', 'physical_form',
        'chemical_composition', 'compatibility_notes', 'special_handling',
        // Quantity & Packaging
        'quantity', 'unit', 'container_count', 'packaging_type',
        'container_ids', 'gross_weight_kg', 'net_weight_kg',
        'temporary_storage_location', 'storage_condition',
        // Transporter
        'transporter_name', 'transporter_license_no', 'driver_name',
        'driver_contact', 'vehicle_number', 'vehicle_type',
        'transport_permit_number', 'handover_by', 'handover_date',
        'handover_time', 'transport_start_date', 'expected_delivery_date',
        'handover_note',
        // Disposal / Facility
        'facility_name', 'facility_license_no', 'facility_address',
        'treatment_method', 'receiving_person', 'receiving_date',
        'receiving_time', 'final_destination_status',
        'disposal_certificate_no', 'final_notes',
        // Compliance
        'regulatory_reference', 'permit_license_reference',
        'manifest_compliance_status', 'hazardous_waste_compliance',
        'special_approval_required', 'special_approval_note', 'legal_remarks',
        // Cross-module links
        'linked_waste_record_id', 'linked_env_incident_id',
        'linked_incident_id', 'linked_inspection_id', 'linked_compliance_id',
        // Workflow
        'created_by', 'updated_by', 'reviewed_by', 'approved_by',
        'dispatched_by', 'dispatched_at', 'received_by', 'received_at',
        'completed_by', 'completed_at', 'cancelled_at', 'cancellation_reason',
        'is_delayed', 'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'manifest_date'           => 'date',
            'dispatch_date'           => 'date',
            'handover_date'           => 'date',
            'transport_start_date'    => 'date',
            'expected_delivery_date'  => 'date',
            'receiving_date'          => 'date',
            'dispatched_at'           => 'datetime',
            'received_at'            => 'datetime',
            'completed_at'           => 'datetime',
            'cancelled_at'           => 'datetime',
            'hazardous_waste_compliance' => 'boolean',
            'special_approval_required'  => 'boolean',
            'is_delayed'             => 'boolean',
            'quantity'               => 'decimal:4',
            'gross_weight_kg'        => 'decimal:3',
            'net_weight_kg'          => 'decimal:3',
        ];
    }

    // ─── Boot ────────────────────────────────────────

    protected static function booted(): void
    {
        // manifest_code is now generated in WasteManifestController::store() with lockForUpdate

        static::saving(function (self $model) {
            if ($model->expected_delivery_date
                && $model->expected_delivery_date < now()->startOfDay()
                && ! in_array($model->status, ['Received', 'Completed', 'Cancelled', 'Rejected'])
            ) {
                $model->is_delayed = true;
            } else {
                $model->is_delayed = false;
            }
        });
    }

    // ─── Relationships ───────────────────────────────

    public function attachments(): HasMany
    {
        return $this->hasMany(WasteManifestAttachment::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(WasteManifestLog::class);
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function dispatchedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dispatched_by');
    }

    public function completedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }

    public function responsiblePersonUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_person_id');
    }

    public function linkedWasteRecord(): BelongsTo
    {
        return $this->belongsTo(WasteRecord::class, 'linked_waste_record_id');
    }

    public function linkedEnvIncident(): BelongsTo
    {
        return $this->belongsTo(EnvironmentalIncident::class, 'linked_env_incident_id');
    }

    public function linkedInspection(): BelongsTo
    {
        return $this->belongsTo(EnvironmentalInspection::class, 'linked_inspection_id');
    }

    public function linkedCompliance(): BelongsTo
    {
        return $this->belongsTo(EnvironmentalComplianceRegister::class, 'linked_compliance_id');
    }

    // ─── Computed Attributes ─────────────────────────

    public function getIsHazardousAttribute(): bool
    {
        return $this->waste_category === 'Hazardous';
    }

    public function getDaysInTransitAttribute(): ?int
    {
        if (! $this->dispatched_at) return null;
        if (in_array($this->status, ['Received', 'Completed'])) {
            $end = $this->received_at ?? $this->completed_at ?? now();
        } else {
            $end = now();
        }
        return (int) $this->dispatched_at->diffInDays($end);
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->is_delayed && $this->status === 'In Transit';
    }

    // ─── Helpers ─────────────────────────────────────

    public function logHistory(string $action, ?string $fromStatus = null, ?string $toStatus = null, ?string $description = null, ?array $metadata = null): void
    {
        $user = auth()->user();
        WasteManifestLog::create([
            'waste_manifest_id' => $this->id,
            'action'            => $action,
            'from_status'       => $fromStatus,
            'to_status'         => $toStatus,
            'performed_by'      => $user?->id,
            'performed_by_name' => $user?->full_name ?? $user?->email ?? 'System',
            'performed_by_role' => $user?->role ?? 'unknown',
            'description'       => $description,
            'metadata'          => $metadata,
        ]);
    }

    // ─── Scopes ──────────────────────────────────────

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeHazardous($query)
    {
        return $query->where('waste_category', 'Hazardous');
    }

    public function scopeDispatched($query)
    {
        return $query->whereIn('status', ['Dispatched', 'In Transit']);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'Completed');
    }

    public function scopeDelayed($query)
    {
        return $query->where('is_delayed', true);
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('waste_type', $type);
    }

    public function scopeByArea($query, string $area)
    {
        return $query->where('source_area', 'like', "%{$area}%");
    }

    public function scopePeriod($query, string $period)
    {
        return match ($period) {
            'week'  => $query->where('manifest_date', '>=', now()->startOfWeek()),
            'month' => $query->where('manifest_date', '>=', now()->startOfMonth()),
            'year'  => $query->where('manifest_date', '>=', now()->startOfYear()),
            default => $query,
        };
    }
}
