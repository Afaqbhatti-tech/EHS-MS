<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class TrackerInspectionLog extends Model
{
    protected $table = 'tracker_inspection_logs';

    protected $fillable = [
        'log_code', 'tracker_record_id', 'category_key',
        'sticker_number', 'plate_number_at_insp',
        'inspection_date', 'inspection_type',
        'inspection_purpose', 'inspection_frequency',
        'inspector_name', 'inspector_company',
        'result', 'condition_found',
        'next_inspection_date',
        'certificate_issued', 'certificate_number', 'certificate_expiry',
        'tuv_updated',
        'findings', 'corrective_actions',
        'defect_found', 'defect_detail',
        'image_path', 'checklist_file_path', 'checklist_image_path',
        'additional_images', 'supporting_docs',
        'notes', 'visual_condition_notes',
        'checklist_data',
        'extinguisher_weight_kg', 'civil_defense_tag_ok',
        'harness_condition', 'drop_arrest_occurred',
        'ladder_type',
        'overdue_at_time', 'days_overdue_at_time',
        'verified_by', 'verified_at',
        'recorded_by',
    ];

    protected $casts = [
        'inspection_date'       => 'date',
        'next_inspection_date'  => 'date',
        'certificate_expiry'    => 'date',
        'verified_at'           => 'datetime',
        'certificate_issued'    => 'boolean',
        'tuv_updated'           => 'boolean',
        'defect_found'          => 'boolean',
        'civil_defense_tag_ok'  => 'boolean',
        'drop_arrest_occurred'  => 'boolean',
        'overdue_at_time'       => 'boolean',
        'additional_images'     => 'array',
        'supporting_docs'       => 'array',
        'checklist_data'        => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (TrackerInspectionLog $log) {
            if (empty($log->log_code)) {
                $year = now()->format('Y');
                $count = static::whereYear('created_at', $year)
                    ->lockForUpdate()
                    ->count() + 1;
                $log->log_code = 'INL-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
            }
        });

        static::created(function (TrackerInspectionLog $log) {
            $record = TrackerRecord::find($log->tracker_record_id);
            if (!$record) return;

            // Update parent record
            $record->last_internal_inspection_date = $log->inspection_date;
            $record->condition = $log->condition_found;
            $record->inspected_by = $log->inspector_name;

            // Denormalized inspection tracking
            $record->last_inspection_result = $log->result;
            $record->last_inspector_name = $log->inspector_name;
            $record->total_inspections_count = static::where('tracker_record_id', $record->id)->count();

            // Update sticker on parent if provided
            if ($log->sticker_number) {
                $record->sticker_number = $log->sticker_number;
            }

            // Calculate next inspection date if not provided
            if ($log->next_inspection_date) {
                $record->next_internal_inspection_date = $log->next_inspection_date;
            } else {
                $cat = TrackerCategory::find($record->category_id);
                if ($cat) {
                    $freq = $cat->insp_freq_days;
                    $record->next_internal_inspection_date = Carbon::parse($log->inspection_date)->addDays($freq);
                }
            }

            // TUV inspection type: update TUV fields
            if ($log->inspection_type === 'Third Party / TUV') {
                $record->tuv_inspection_date = $log->inspection_date;
                if ($log->certificate_expiry) {
                    $record->tuv_expiry_date = $log->certificate_expiry;
                }
                if ($log->certificate_number) {
                    $record->tuv_certificate_number = $log->certificate_number;
                }
            }

            // Certificate renewal
            if ($log->certificate_issued && $log->certificate_number) {
                $record->certificate_number = $log->certificate_number;
                if ($log->certificate_expiry) {
                    $record->certificate_expiry = $log->certificate_expiry;
                }
            }

            // Fail → Out of Service
            if ($log->result === 'Fail') {
                $record->status = 'Out of Service';
                $record->has_open_defect = true;
                if ($log->defect_detail) {
                    $record->defect_description = $log->defect_detail;
                    $record->defect_reported_date = $log->inspection_date;
                }
            }

            // Defect found
            if ($log->defect_found) {
                $record->has_open_defect = true;
                $record->defect_description = $log->defect_detail;
                $record->defect_reported_date = $log->inspection_date;
            }

            $record->save();
        });
    }

    public function record()
    {
        return $this->belongsTo(TrackerRecord::class, 'tracker_record_id');
    }

    // ── Computed Attributes ──────────────────────────────

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path ? asset('storage/' . $this->image_path) : null;
    }

    public function getChecklistFileUrlAttribute(): ?string
    {
        return $this->checklist_file_path ? asset('storage/' . $this->checklist_file_path) : null;
    }

    public function getChecklistImageUrlAttribute(): ?string
    {
        return $this->checklist_image_path ? asset('storage/' . $this->checklist_image_path) : null;
    }

    public function getAdditionalImageUrlsAttribute(): array
    {
        if (!$this->additional_images || !is_array($this->additional_images)) return [];
        return array_map(fn($path) => asset('storage/' . $path), $this->additional_images);
    }

    public function getSupportingDocUrlsAttribute(): array
    {
        if (!$this->supporting_docs || !is_array($this->supporting_docs)) return [];
        return array_map(fn($path) => asset('storage/' . $path), $this->supporting_docs);
    }
}
