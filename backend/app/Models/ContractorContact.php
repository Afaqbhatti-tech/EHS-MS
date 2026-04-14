<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractorContact extends Model
{
    protected $fillable = [
        'contractor_id', 'name', 'designation', 'role',
        'phone', 'email', 'id_number',
        'is_primary_contact', 'is_site_supervisor',
        'is_safety_rep', 'is_emergency_contact',
        'status', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'is_primary_contact'  => 'boolean',
            'is_site_supervisor'  => 'boolean',
            'is_safety_rep'       => 'boolean',
            'is_emergency_contact' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saved(function (self $contact) {
            Contractor::find($contact->contractor_id)?->recalculateCounts();
        });

        static::deleted(function (self $contact) {
            Contractor::find($contact->contractor_id)?->recalculateCounts();
        });
    }

    // ─── Relationships ───────────────────────────────

    public function contractor(): BelongsTo
    {
        return $this->belongsTo(Contractor::class);
    }

    // ─── Scopes ──────────────────────────────────────

    public function scopePrimary($query)
    {
        return $query->where('is_primary_contact', true);
    }

    public function scopeSafetyrep($query)
    {
        return $query->where('is_safety_rep', true);
    }
}
