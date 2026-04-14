<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Carbon\Carbon;

class ChecklistInspection extends Model
{
    use SoftDeletes;
    protected $table = 'checklist_inspections';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'inspection_code', 'checklist_item_id', 'category_id',
        'inspection_date', 'inspection_type', 'inspector_name',
        'inspector_company', 'overall_result',
        'health_condition_found', 'findings',
        'corrective_actions', 'next_inspection_date',
        'certificate_issued', 'certificate_number',
        'certificate_expiry', 'image_path',
        'additional_images', 'signature', 'notes',
        'recorded_by', 'deleted_by',
        'checklist_responses', 'defect_found', 'defect_detail',
    ];

    protected function casts(): array
    {
        return [
            'inspection_date'      => 'date',
            'next_inspection_date' => 'date',
            'certificate_expiry'   => 'date',
            'certificate_issued'   => 'boolean',
            'additional_images'    => 'array',
            'checklist_responses'  => 'array',
            'defect_found'         => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($insp) {
            if (empty($insp->id)) {
                $insp->id = Str::uuid()->toString();
            }
            if (empty($insp->inspection_code)) {
                $year = now()->year;
                $count = static::whereYear('created_at', $year)->count() + 1;
                $insp->inspection_code = 'INS-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
            }
        });

        // After recording inspection, update parent item
        static::created(function ($insp) {
            $item = ChecklistItem::find($insp->checklist_item_id);
            if (!$item) return;

            $updates = [
                'health_condition' => $insp->health_condition_found,
                'updated_by'       => $insp->recorded_by,
            ];

            if ($insp->inspection_type === 'Third Party') {
                $updates['last_third_party_inspection_date'] = $insp->inspection_date;
                if ($insp->next_inspection_date) {
                    $updates['next_third_party_inspection_date'] = $insp->next_inspection_date;
                }
            } else {
                $updates['last_internal_inspection_date'] = $insp->inspection_date;
                if ($insp->next_inspection_date) {
                    $updates['next_internal_inspection_date'] = $insp->next_inspection_date;
                } elseif ($item->category) {
                    $freq = $item->category->insp_freq_days ?? 7;
                    $updates['next_internal_inspection_date'] =
                        Carbon::parse($insp->inspection_date)->addDays($freq)->toDateString();
                }
            }

            if ($insp->overall_result === 'Fail') {
                $updates['status'] = 'Out of Service';
            }
            if ($insp->certificate_number) {
                $updates['certificate_number'] = $insp->certificate_number;
            }
            if ($insp->certificate_expiry) {
                $updates['certificate_expiry'] = $insp->certificate_expiry;
            }

            $item->update($updates);
        });
    }

    public function item()
    {
        return $this->belongsTo(ChecklistItem::class, 'checklist_item_id');
    }

    public function category()
    {
        return $this->belongsTo(ChecklistCategory::class, 'category_id');
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path ? asset('storage/' . $this->image_path) : null;
    }
}
