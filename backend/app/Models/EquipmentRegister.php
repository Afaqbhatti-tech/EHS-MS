<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EquipmentRegister extends Model
{
    use SoftDeletes;

    protected $table = 'equipment_register';

    protected $fillable = [
        'equipment_code',
        // Basic Identification
        'equipment_name', 'serial_number', 'equipment_category', 'equipment_type',
        'manufacturer', 'model_number', 'asset_tag', 'registration_number',
        // Status & Lifecycle
        'equipment_status', 'working_status', 'condition_status', 'condition_details',
        'purchase_date', 'commissioning_date', 'retirement_date',
        // Location / Assignment
        'project_name', 'current_location', 'area', 'zone',
        'assigned_team', 'assigned_supervisor', 'assigned_operator',
        // Ownership / Authorization
        'company_name', 'tuv_authorized', 'vendor_supplier',
        // Inspection / Condition
        'last_inspection_date', 'next_inspection_date', 'inspection_frequency',
        'inspection_status', 'certificate_number', 'tuv_valid_until',
        // Financial / Administrative
        'purchase_cost', 'rental_status', 'rental_company', 'warranty_expiry',
        // Media / Notes
        'image_path', 'additional_images', 'attachments', 'notes', 'remarks',
        // Audit
        'created_by', 'updated_by', 'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'additional_images' => 'array',
            'attachments'       => 'array',
            'purchase_date'          => 'date',
            'commissioning_date'     => 'date',
            'retirement_date'        => 'date',
            'last_inspection_date'   => 'date',
            'next_inspection_date'   => 'date',
            'tuv_valid_until'        => 'date',
            'warranty_expiry'        => 'date',
            'purchase_cost'          => 'decimal:2',
        ];
    }

    // ── Auto-generate equipment_code ──

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model) {
            // equipment_code is now generated in EquipmentRegisterController::store() with lockForUpdate
            $model->recalculateInspectionStatus();
        });

        static::updating(function (self $model) {
            $model->recalculateInspectionStatus();
        });
    }

    // ── Computed Attributes ──

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path ? asset('storage/' . $this->image_path) : null;
    }

    public function getAdditionalImageUrlsAttribute(): array
    {
        return array_map(
            fn($path) => asset('storage/' . $path),
            $this->additional_images ?? []
        );
    }

    public function getAttachmentUrlsAttribute(): array
    {
        return array_map(
            fn($path) => asset('storage/' . $path),
            $this->attachments ?? []
        );
    }

    // ── Inspection Status Calculation ──

    public function recalculateInspectionStatus(): void
    {
        if (!$this->next_inspection_date) {
            $this->inspection_status = 'valid';
            return;
        }

        $daysUntil = now()->startOfDay()->diffInDays($this->next_inspection_date, false);

        if ($daysUntil < 0) {
            $this->inspection_status = 'overdue';
        } elseif ($daysUntil <= 7) {
            $this->inspection_status = 'due_soon';
        } else {
            $this->inspection_status = 'valid';
        }
    }

    // ── Scopes ──

    public function scopeActive($query)
    {
        return $query->where('equipment_status', 'active');
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('equipment_status', $status);
    }

    public function scopeByWorkingStatus($query, string $status)
    {
        return $query->where('working_status', $status);
    }

    public function scopeByCategory($query, string $category)
    {
        return $query->where('equipment_category', $category);
    }

    public function scopeOverdue($query)
    {
        return $query->where('inspection_status', 'overdue');
    }

    public function scopeDueSoon($query)
    {
        return $query->where('inspection_status', 'due_soon');
    }

    // ── Constants ──

    public const STATUSES = ['active', 'inactive', 'under_maintenance', 'out_of_service', 'retired'];

    public const WORKING_STATUSES = ['currently_working', 'standby', 'damaged', 'old_equipment'];

    public const CONDITIONS = ['excellent', 'good', 'fair', 'poor', 'damaged'];

    public const CATEGORIES = [
        'heavy_equipment', 'lifting_equipment', 'safety_equipment', 'fire_equipment',
        'power_tool', 'light_equipment', 'vehicle', 'monitoring_equipment',
        'electrical_equipment', 'hand_tool', 'other',
    ];

    public const INSPECTION_FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'];

    public const RENTAL_STATUSES = ['owned', 'rented', 'leased'];
}
