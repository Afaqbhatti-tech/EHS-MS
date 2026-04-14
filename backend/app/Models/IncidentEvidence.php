<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class IncidentEvidence extends Model
{
    protected $table = 'incident_evidence';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'incident_id', 'related_type', 'related_id',
        'file_path', 'original_name', 'file_type', 'file_size',
        'uploaded_by', 'uploaded_by_name',
    ];

    protected static function booted(): void
    {
        static::creating(function (IncidentEvidence $e) {
            if (empty($e->id)) {
                $e->id = Str::uuid()->toString();
            }
        });
    }

    public function incident()
    {
        return $this->belongsTo(Incident::class);
    }

    public function action()
    {
        return $this->belongsTo(IncidentAction::class, 'related_id');
    }
}
