<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Permit extends Model
{
    use SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'ref_number', 'permit_type', 'work_description', 'zone', 'phase',
        'contractor', 'applicant_name', 'valid_from', 'valid_to', 'status',
        'safety_measures', 'ppe_requirements', 'attachments',
        'approved_by', 'approved_at', 'closed_by', 'closed_at',
        // New fields
        'activity_type', 'description', 'start_time', 'end_time',
        'image_path', 'notes', 'source_slide_no', 'created_by', 'updated_by',
        'deleted_by',
    ];

    protected static function booted(): void
    {
        static::creating(function (Permit $permit) {
            if (empty($permit->id)) {
                $permit->id = Str::uuid()->toString();
            }
            if (empty($permit->ref_number)) {
                $year  = now()->year;
                $count = static::whereYear('created_at', $year)->withTrashed()->count() + 1;
                $permit->ref_number = 'PTW-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
            }
        });
    }

    protected function casts(): array
    {
        return [
            'attachments'  => 'array',
            'valid_from'   => 'datetime',
            'valid_to'     => 'datetime',
            'approved_at'  => 'datetime',
            'closed_at'    => 'datetime',
        ];
    }

    public function amendments()
    {
        return $this->hasMany(PermitAmendment::class, 'permit_id')
            ->orderBy('revision_number', 'desc');
    }

    public function activeAmendment()
    {
        return $this->hasOne(PermitAmendment::class, 'permit_id')
            ->where('is_active_revision', true);
    }

    public function latestAmendment()
    {
        return $this->hasOne(PermitAmendment::class, 'permit_id')
            ->latestOfMany('revision_number');
    }

    /**
     * Permit type configuration — single source of truth.
     */
    public static function getTypes(): array
    {
        return [
            'work_at_height' => [
                'label'      => 'Work at Height',
                'abbr'       => 'WAH',
                'color'      => '#7C3AED',
                'lightColor' => '#EDE9FE',
                'textColor'  => '#5B21B6',
            ],
            'hot_work' => [
                'label'      => 'Hot Work',
                'abbr'       => 'HW',
                'color'      => '#DC2626',
                'lightColor' => '#FEE2E2',
                'textColor'  => '#991B1B',
            ],
            'confined_space' => [
                'label'      => 'Confined Space',
                'abbr'       => 'CS',
                'color'      => '#92400E',
                'lightColor' => '#FEF3C7',
                'textColor'  => '#78350F',
            ],
            'line_break' => [
                'label'      => 'Line Break',
                'abbr'       => 'LB',
                'color'      => '#0369A1',
                'lightColor' => '#E0F2FE',
                'textColor'  => '#075985',
            ],
            'excavation' => [
                'label'      => 'Excavation',
                'abbr'       => 'EXC',
                'color'      => '#1D4ED8',
                'lightColor' => '#DBEAFE',
                'textColor'  => '#1E40AF',
            ],
            'lifting' => [
                'label'      => 'Lifting',
                'abbr'       => 'LFT',
                'color'      => '#B45309',
                'lightColor' => '#FEF3C7',
                'textColor'  => '#92400E',
            ],
            'general' => [
                'label'      => 'General Permit',
                'abbr'       => 'GEN',
                'color'      => '#065F46',
                'lightColor' => '#D1FAE5',
                'textColor'  => '#064E3B',
            ],
        ];
    }
}
