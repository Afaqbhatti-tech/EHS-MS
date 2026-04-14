<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DcLog extends Model
{
    public $timestamps = false;

    const UPDATED_AT = null;

    protected $table = 'dc_logs';

    protected $fillable = [
        'document_id', 'document_revision_id',
        'action', 'from_status', 'to_status',
        'performed_by', 'performed_by_name', 'performed_by_role',
        'description', 'metadata', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $log) {
            if (!$log->created_at) {
                $log->created_at = now();
            }
        });
    }

    // ── Relationships ────────────────────────────────

    public function document()
    {
        return $this->belongsTo(DcDocument::class, 'document_id');
    }

    public function revision()
    {
        return $this->belongsTo(DcRevision::class, 'document_revision_id');
    }

    public function performer()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
