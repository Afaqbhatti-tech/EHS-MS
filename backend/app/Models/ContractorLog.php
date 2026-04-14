<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractorLog extends Model
{
    public $timestamps = false;
    const UPDATED_AT = null;

    protected $fillable = [
        'contractor_id', 'action',
        'from_status', 'to_status',
        'performed_by', 'performed_by_name', 'performed_by_role',
        'description', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata'   => 'array',
            'created_at' => 'datetime',
        ];
    }

    // ─── Relationships ───────────────────────────────

    public function contractor(): BelongsTo
    {
        return $this->belongsTo(Contractor::class);
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
