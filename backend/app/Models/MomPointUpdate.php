<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MomPointUpdate extends Model
{
    public $timestamps = false;

    protected $table = 'mom_point_updates';

    protected $fillable = [
        'mom_point_id', 'mom_id', 'week_number', 'year',
        'old_status', 'new_status', 'old_completion',
        'new_completion', 'update_note',
        'updated_by', 'updated_by_name',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    const UPDATED_AT = null;

    public function point()
    {
        return $this->belongsTo(MomPoint::class, 'mom_point_id');
    }

    public function mom()
    {
        return $this->belongsTo(Mom::class, 'mom_id');
    }

    public function updatedByUser()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
