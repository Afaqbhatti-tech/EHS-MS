<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractorDocument extends Model
{
    protected $fillable = [
        'contractor_id', 'document_type', 'document_number',
        'issue_date', 'expiry_date', 'issued_by',
        'file_path', 'original_name', 'file_type', 'file_size_kb',
        'status', 'verification_status',
        'verified_by', 'verified_by_id', 'verified_date',
        'remarks', 'uploaded_by', 'uploaded_by_name',
    ];

    protected function casts(): array
    {
        return [
            'issue_date'    => 'date',
            'expiry_date'   => 'date',
            'verified_date' => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $doc) {
            // Auto-calculate status from expiry_date
            if ($doc->expiry_date && ! in_array($doc->status, ['Under Review', 'Rejected'])) {
                $today   = now()->startOfDay();
                $warning = now()->addDays(config('contractor_config.expiry_warning_days', 30));

                if ($doc->expiry_date < $today) {
                    $doc->status = 'Expired';
                } elseif ($doc->expiry_date <= $warning) {
                    $doc->status = 'Expiring Soon';
                } else {
                    $doc->status = 'Valid';
                }
            }
        });

        static::saved(function (self $doc) {
            $contractor = Contractor::find($doc->contractor_id);
            $contractor?->recalculateExpiryFlags();
            $contractor?->recalculateCounts();
        });

        static::deleted(function (self $doc) {
            $contractor = Contractor::find($doc->contractor_id);
            $contractor?->recalculateExpiryFlags();
            $contractor?->recalculateCounts();
        });
    }

    // ─── Relationships ───────────────────────────────

    public function contractor(): BelongsTo
    {
        return $this->belongsTo(Contractor::class);
    }

    public function verifiedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by_id');
    }

    public function uploadedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    // ─── Computed ────────────────────────────────────

    public function getUrlAttribute(): ?string
    {
        return $this->file_path ? asset('storage/' . $this->file_path) : null;
    }

    public function getIsImageAttribute(): bool
    {
        return in_array(strtolower($this->file_type ?? ''), ['jpg', 'jpeg', 'png', 'webp', 'gif']);
    }

    public function getDaysToExpiryAttribute(): ?int
    {
        if (! $this->expiry_date) return null;
        return (int) now()->startOfDay()->diffInDays($this->expiry_date, false);
    }

    public function getIsExpiredAttribute(): bool
    {
        return $this->expiry_date && $this->expiry_date < now()->startOfDay();
    }

    public function getIsExpiringSoonAttribute(): bool
    {
        if (! $this->expiry_date) return false;
        $today   = now()->startOfDay();
        $warning = now()->addDays(config('contractor_config.expiry_warning_days', 30));
        return $this->expiry_date >= $today && $this->expiry_date <= $warning;
    }
}
