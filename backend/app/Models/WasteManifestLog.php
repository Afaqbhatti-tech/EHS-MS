<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WasteManifestLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'waste_manifest_id', 'action', 'from_status', 'to_status',
        'performed_by', 'performed_by_name', 'performed_by_role',
        'description', 'metadata', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata'   => 'array',
            'created_at' => 'datetime',
        ];
    }

    // ─── Relationships ───────────────────────────────

    public function manifest(): BelongsTo
    {
        return $this->belongsTo(WasteManifest::class, 'waste_manifest_id');
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
