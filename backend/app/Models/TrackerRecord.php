<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;
use App\Models\ChecklistItem;

class TrackerRecord extends Model
{
    use SoftDeletes;

    protected $table = 'tracker_records';

    protected $fillable = [
        'record_code', 'category_id', 'category_key',
        'template_type', 'equipment_name', 'item_subtype',
        'serial_number', 'make_model', 'location_area',
        'assigned_to', 'onboarding_date', 'status', 'condition',
        'plate_number', 'swl', 'load_capacity_tons',
        'checker_number', 'certificate_number',
        'certificate_expiry', 'certificate_issuer',
        'tuv_inspection_date', 'tuv_expiry_date',
        'tuv_inspector', 'tuv_company', 'tuv_certificate_number',
        'last_internal_inspection_date',
        'next_internal_inspection_date', 'inspected_by',
        'expiry_date', 'is_overdue', 'days_until_due',
        'is_tuv_overdue', 'days_until_tuv', 'is_cert_expired',
        'extinguisher_type', 'weight_kg', 'civil_defense_tag',
        'manufacture_date', 'retirement_date',
        'last_drop_arrest', 'drop_arrest_date',
        'voltage_rating', 'electrical_test_date',
        'electrical_test_expiry', 'toolbox_tag_colour',
        'last_toolbox_tag_date', 'next_toolbox_tag_date',
        'has_open_defect', 'defect_description',
        'defect_reported_date', 'defect_closed_date',
        'import_batch_id', 'checklist_item_id', 'image_path',
        'certificate_file_path', 'tuv_certificate_path',
        'notes', 'sticker_number',
        'total_inspections_count', 'last_inspection_result',
        'last_inspector_name',
        'created_by', 'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'onboarding_date'               => 'date',
        'certificate_expiry'            => 'date',
        'tuv_inspection_date'           => 'date',
        'tuv_expiry_date'               => 'date',
        'last_internal_inspection_date' => 'date',
        'next_internal_inspection_date' => 'date',
        'expiry_date'                   => 'date',
        'manufacture_date'              => 'date',
        'retirement_date'               => 'date',
        'drop_arrest_date'              => 'date',
        'electrical_test_date'          => 'date',
        'electrical_test_expiry'        => 'date',
        'last_toolbox_tag_date'         => 'date',
        'next_toolbox_tag_date'         => 'date',
        'defect_reported_date'          => 'date',
        'defect_closed_date'            => 'date',
        'is_overdue'                    => 'boolean',
        'is_tuv_overdue'                => 'boolean',
        'is_cert_expired'               => 'boolean',
        'civil_defense_tag'             => 'boolean',
        'last_drop_arrest'              => 'boolean',
        'has_open_defect'               => 'boolean',
        'sticker_number'                => 'string',
    ];

    protected static function booted(): void
    {
        static::creating(function (TrackerRecord $r) {
            if (empty($r->record_code)) {
                $catKey = strtoupper(substr($r->category_key ?? 'TRK', 0, 4));
                $count = static::where('category_key', $r->category_key)
                    ->withTrashed()
                    ->lockForUpdate()
                    ->count() + 1;
                $r->record_code = 'TRK-' . $catKey . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
            }
        });

        static::saving(function (TrackerRecord $r) {
            $r->recalculateDueStatus();
        });
    }

    public function recalculateDueStatus(): void
    {
        $today = now()->startOfDay();

        // Internal inspection due status
        if ($this->next_internal_inspection_date) {
            $next = Carbon::parse($this->next_internal_inspection_date)->startOfDay();
            $diff = (int) $today->diffInDays($next, false);
            $this->days_until_due = $diff;
            $this->is_overdue = $diff < 0;
        } else {
            $this->is_overdue = false;
            $this->days_until_due = null;
        }

        // TUV expiry
        if ($this->tuv_expiry_date) {
            $tuv = Carbon::parse($this->tuv_expiry_date)->startOfDay();
            $diff = (int) $today->diffInDays($tuv, false);
            $this->days_until_tuv = $diff;
            $this->is_tuv_overdue = $diff < 0;
        } else {
            $this->is_tuv_overdue = false;
            $this->days_until_tuv = null;
        }

        // Certificate expiry
        if ($this->certificate_expiry) {
            $cert = Carbon::parse($this->certificate_expiry)->startOfDay();
            $this->is_cert_expired = $today->gt($cert);
        } else {
            $this->is_cert_expired = false;
        }

        // Harness retirement on fall arrest
        if ($this->category_key === 'full_body_harness'
            && $this->last_drop_arrest
            && $this->status === 'Active') {
            $this->status = 'Out of Service';
            $this->condition = 'Out of Service';
        }
    }

    // ── Relationships ────────────────────────────────────

    public function category()
    {
        return $this->belongsTo(TrackerCategory::class, 'category_id');
    }

    public function checklistItem()
    {
        return $this->belongsTo(ChecklistItem::class, 'checklist_item_id');
    }

    public function inspectionLogs()
    {
        return $this->hasMany(TrackerInspectionLog::class, 'tracker_record_id')->orderBy('inspection_date', 'desc');
    }

    public function latestInspection()
    {
        return $this->hasOne(TrackerInspectionLog::class, 'tracker_record_id')->latestOfMany('inspection_date');
    }

    // ── Computed Attributes ──────────────────────────────

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path ? asset('storage/' . $this->image_path) : null;
    }

    public function getCertFileUrlAttribute(): ?string
    {
        return $this->certificate_file_path ? asset('storage/' . $this->certificate_file_path) : null;
    }

    public function getTuvCertUrlAttribute(): ?string
    {
        return $this->tuv_certificate_path ? asset('storage/' . $this->tuv_certificate_path) : null;
    }

    public function getDueSoonAttribute(): bool
    {
        return !$this->is_overdue && $this->days_until_due !== null && $this->days_until_due >= 0 && $this->days_until_due <= 3;
    }

    public function getTuvExpiringSoonAttribute(): bool
    {
        return !$this->is_tuv_overdue && $this->days_until_tuv !== null && $this->days_until_tuv >= 0 && $this->days_until_tuv <= 30;
    }

    // ── Scopes ───────────────────────────────────────────

    public function scopeByCategory($q, $key)
    {
        return $q->where('category_key', $key);
    }

    public function scopeOverdue($q)
    {
        return $q->where('is_overdue', true);
    }

    public function scopeDueSoon($q, $days = 3)
    {
        return $q->where('is_overdue', false)->whereBetween('days_until_due', [0, $days]);
    }

    public function scopeTuvExpiringSoon($q, $days = 30)
    {
        return $q->where('is_tuv_overdue', false)->whereBetween('days_until_tuv', [0, $days]);
    }

    public function scopeByStatus($q, $status)
    {
        return $q->where('status', $status);
    }

    public function scopeActive($q)
    {
        return $q->where('status', 'Active');
    }

    public function scopePeriod($q, $period)
    {
        return match ($period) {
            'week'  => $q->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]),
            'month' => $q->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year),
            'year'  => $q->whereYear('created_at', now()->year),
            default => $q,
        };
    }
}
