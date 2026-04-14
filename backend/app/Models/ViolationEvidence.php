<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ViolationEvidence extends Model
{
    protected $table = 'violation_evidence';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'violation_id', 'related_type', 'related_id',
        'file_path', 'original_name', 'file_type', 'file_size',
        'uploaded_by', 'uploaded_by_name',
    ];

    protected static function booted(): void
    {
        static::creating(function (ViolationEvidence $e) {
            if (empty($e->id)) {
                $e->id = Str::uuid()->toString();
            }
        });
    }

    public function violation()
    {
        return $this->belongsTo(Violation::class);
    }

    public function action()
    {
        return $this->belongsTo(ViolationAction::class, 'related_id');
    }
}
