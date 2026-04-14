<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Carbon\Carbon;

class ChecklistItem extends Model
{
    use SoftDeletes;

    protected $table = 'checklist_items';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'item_code', 'category_id', 'category_key',
        'name', 'item_type', 'plate_number',
        'serial_number', 'make_model', 'swl',
        'certificate_number', 'certificate_expiry',
        'onboarding_date',
        'last_internal_inspection_date',
        'next_internal_inspection_date',
        'last_third_party_inspection_date',
        'next_third_party_inspection_date',
        'health_condition', 'visual_condition',
        'status', 'is_overdue', 'days_until_due',
        'alert_sent_at', 'location_area',
        'assigned_to', 'notes', 'image_path',
        'created_by', 'updated_by',
        // Safety equipment fields
        'manufacture_date', 'retirement_date',
        'last_drop_arrest', 'drop_arrest_date',
        'extinguisher_type', 'capacity_litres',
        'last_service_date', 'next_service_date',
        'pressure_status', 'engine_hours',
        'fuel_type', 'kva_rating',
        'last_toolbox_tag_date', 'toolbox_tag_colour',
        'next_toolbox_tag_date',
        'has_open_defect', 'defect_description',
        'defect_reported_date', 'defect_closed_date',
        // MEWP fields
        'mewp_type', 'third_party_cert_number', 'third_party_cert_expiry',
        'third_party_inspector', 'third_party_company',
        'service_interval_hours',
        'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'certificate_expiry'               => 'date',
            'onboarding_date'                  => 'date',
            'last_internal_inspection_date'    => 'date',
            'next_internal_inspection_date'    => 'date',
            'last_third_party_inspection_date' => 'date',
            'next_third_party_inspection_date' => 'date',
            'alert_sent_at'                    => 'datetime',
            'is_overdue'                       => 'boolean',
            'manufacture_date'                 => 'date',
            'retirement_date'                  => 'date',
            'last_drop_arrest'                 => 'boolean',
            'drop_arrest_date'                 => 'date',
            'last_service_date'                => 'date',
            'next_service_date'                => 'date',
            'capacity_litres'                  => 'decimal:2',
            'engine_hours'                     => 'decimal:2',
            'kva_rating'                       => 'decimal:2',
            'last_toolbox_tag_date'            => 'date',
            'next_toolbox_tag_date'            => 'date',
            'defect_reported_date'             => 'date',
            'defect_closed_date'               => 'date',
            'has_open_defect'                  => 'boolean',
            'third_party_cert_expiry'          => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (ChecklistItem $item) {
            if (empty($item->id)) {
                $item->id = Str::uuid()->toString();
            }
            if (empty($item->item_code)) {
                $catKey = strtoupper(substr($item->category_key ?? 'GEN', 0, 4));
                $count = static::where('category_key', $item->category_key)
                    ->withTrashed()->count() + 1;
                $item->item_code = 'CHK-' . $catKey . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
            }
        });

        static::saving(function (ChecklistItem $item) {
            $item->recalculateDueStatus();
        });
    }

    public function recalculateDueStatus(): void
    {
        $nextDate = $this->next_internal_inspection_date;
        if (!$nextDate) {
            $this->is_overdue = false;
            $this->days_until_due = null;
            return;
        }
        $today = now()->startOfDay();
        $next = Carbon::parse($nextDate)->startOfDay();
        $diff = (int) $today->diffInDays($next, false);
        $this->days_until_due = $diff;
        $this->is_overdue = $diff < 0;
    }

    // Relationships

    public function category()
    {
        return $this->belongsTo(ChecklistCategory::class, 'category_id');
    }

    public function inspections()
    {
        return $this->hasMany(ChecklistInspection::class, 'checklist_item_id')
            ->orderBy('inspection_date', 'desc');
    }

    public function latestInspection()
    {
        return $this->hasOne(ChecklistInspection::class, 'checklist_item_id')
            ->latestOfMany('inspection_date');
    }

    // Computed attributes

    public function getInspectionCountAttribute(): int
    {
        return $this->inspections()->count();
    }

    public function getDueSoonAttribute(): bool
    {
        if (!$this->next_internal_inspection_date) return false;
        return $this->days_until_due !== null
            && $this->days_until_due >= 0
            && $this->days_until_due <= 3;
    }

    public function getCertExpiringSoonAttribute(): bool
    {
        if (!$this->certificate_expiry) return false;
        $diff = now()->startOfDay()->diffInDays(Carbon::parse($this->certificate_expiry)->startOfDay(), false);
        return $diff >= 0 && $diff <= 7;
    }

    // Scopes

    public function scopeByCategory($q, $key)
    {
        return $q->where('category_key', $key);
    }

    public function scopeOverdue($q)
    {
        return $q->where('is_overdue', true)->where('status', 'Active');
    }

    public function scopeDueSoon($q, $days = 3)
    {
        return $q->where('is_overdue', false)
            ->where('status', 'Active')
            ->whereBetween('days_until_due', [0, $days]);
    }

    public function scopeByStatus($q, $status)
    {
        return $q->where('status', $status);
    }

    public function scopeActive($q)
    {
        return $q->where('status', 'Active');
    }
}
