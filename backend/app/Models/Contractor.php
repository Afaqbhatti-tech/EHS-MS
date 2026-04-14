<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Contractor extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'contractor_code',
        // A: Company Identity
        'contractor_name', 'registered_company_name', 'trade_name',
        'company_type', 'scope_of_work', 'description',
        'registration_number', 'tax_number',
        'country', 'city', 'address',
        // B: Primary Contact
        'primary_contact_name', 'primary_contact_designation',
        'primary_contact_phone', 'primary_contact_email',
        'alternate_contact', 'emergency_contact_number',
        // C: Operational
        'site', 'project', 'area', 'zone', 'department',
        'assigned_supervisor', 'assigned_supervisor_id',
        'contract_start_date', 'contract_end_date',
        // D: Workforce
        'total_workforce', 'skilled_workers_count', 'unskilled_workers_count',
        'supervisors_count', 'operators_count', 'drivers_count',
        'safety_staff_count', 'current_site_headcount',
        'mobilized_date', 'demobilized_date',
        // E: Status & Compliance
        'contractor_status', 'compliance_status',
        'is_active', 'is_suspended',
        'has_expired_documents', 'has_expiring_documents', 'next_expiry_date',
        'document_count', 'contact_count',
        'notes', 'created_by', 'updated_by', 'deleted_by',
        'approved_by', 'approved_by_id', 'approved_at',
        'suspended_at', 'suspension_reason',
    ];

    protected function casts(): array
    {
        return [
            'contract_start_date'    => 'date',
            'contract_end_date'      => 'date',
            'mobilized_date'         => 'date',
            'demobilized_date'       => 'date',
            'next_expiry_date'       => 'date',
            'approved_at'            => 'datetime',
            'suspended_at'           => 'datetime',
            'is_active'              => 'boolean',
            'is_suspended'           => 'boolean',
            'has_expired_documents'  => 'boolean',
            'has_expiring_documents' => 'boolean',
        ];
    }

    // ─── Boot ────────────────────────────────────────

    protected static function booted(): void
    {
        // contractor_code is now generated in ContractorController::store() with lockForUpdate

        static::saving(function (self $contractor) {
            $contractor->is_active    = $contractor->contractor_status === 'Active';
            $contractor->is_suspended = in_array($contractor->contractor_status, ['Suspended', 'Blacklisted']);
        });
    }

    // ─── Relationships ───────────────────────────────

    public function contacts(): HasMany
    {
        return $this->hasMany(ContractorContact::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(ContractorDocument::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(ContractorLog::class);
    }

    public function links(): HasMany
    {
        return $this->hasMany(ContractorModuleLink::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_id');
    }

    public function assignedSupervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_supervisor_id');
    }

    // ─── Helpers ─────────────────────────────────────

    public function logHistory(string $action, ?string $fromStatus = null, ?string $toStatus = null, ?string $description = null, ?array $metadata = null): void
    {
        $user = auth()->user();
        ContractorLog::create([
            'contractor_id'     => $this->id,
            'action'            => $action,
            'from_status'       => $fromStatus,
            'to_status'         => $toStatus,
            'description'       => $description,
            'performed_by'      => $user?->id,
            'performed_by_name' => $user?->full_name ?? $user?->email ?? 'System',
            'performed_by_role' => $user?->role ?? 'unknown',
            'metadata'          => $metadata,
        ]);
    }

    public function recalculateExpiryFlags(): void
    {
        $this->timestamps = false;

        $today    = now()->startOfDay();
        $warning  = now()->addDays(config('contractor_config.expiry_warning_days', 30));

        $docs = $this->documents()->whereNotNull('expiry_date')->get(['expiry_date', 'status']);

        $hasExpired  = $docs->contains(fn ($d) => $d->expiry_date < $today);
        $hasExpiring = $docs->contains(fn ($d) => $d->expiry_date >= $today && $d->expiry_date <= $warning);

        $futureExpiries = $docs->filter(fn ($d) => $d->expiry_date >= $today)->pluck('expiry_date');
        $nextExpiry     = $futureExpiries->min();

        // Also consider contract_end_date
        if ($this->contract_end_date) {
            if ($this->contract_end_date < $today) {
                $hasExpired = true;
            } elseif ($this->contract_end_date <= $warning) {
                $hasExpiring = true;
            }
            if ($this->contract_end_date >= $today && ($nextExpiry === null || $this->contract_end_date < $nextExpiry)) {
                $nextExpiry = $this->contract_end_date;
            }
        }

        $this->update([
            'has_expired_documents'  => $hasExpired,
            'has_expiring_documents' => $hasExpiring,
            'next_expiry_date'       => $nextExpiry,
        ]);

        $this->timestamps = true;
    }

    public function recalculateCounts(): void
    {
        $this->timestamps = false;

        $this->update([
            'document_count' => $this->documents()->count(),
            'contact_count'  => $this->contacts()->count(),
        ]);

        $this->timestamps = true;
    }

    public function getComplianceSummary(): array
    {
        $today = now()->startOfDay();
        $docs  = $this->documents;

        $licenseDoc  = $docs->firstWhere('document_type', 'Trade License');
        $insureDocs  = $docs->filter(fn ($d) => str_contains(strtolower($d->document_type), 'insurance'));

        $licenseValid  = $licenseDoc && $licenseDoc->expiry_date && $licenseDoc->expiry_date >= $today;
        $insuranceValid = $insureDocs->isNotEmpty() && $insureDocs->every(fn ($d) => !$d->expiry_date || $d->expiry_date >= $today);
        $docsComplete   = $docs->count() >= 3;
        $isApproved     = in_array($this->contractor_status, ['Approved', 'Active']);

        $score = collect([$licenseValid, $insuranceValid, $docsComplete, $isApproved])->filter()->count();

        return [
            'license_valid'   => $licenseValid,
            'insurance_valid' => $insuranceValid,
            'docs_complete'   => $docsComplete,
            'is_approved'     => $isApproved,
            'overall'         => match (true) {
                $score >= 4  => 'Compliant',
                $score >= 2  => 'Partially Compliant',
                default      => 'Non-Compliant',
            },
        ];
    }

    // ─── Computed ────────────────────────────────────

    public function getIsContractExpiredAttribute(): bool
    {
        return $this->contract_end_date && $this->contract_end_date < now()->startOfDay();
    }

    public function getDaysToContractEndAttribute(): ?int
    {
        if (! $this->contract_end_date) return null;
        return (int) now()->startOfDay()->diffInDays($this->contract_end_date, false);
    }

    public function getActiveDocumentsCountAttribute(): int
    {
        return $this->documents()->where('status', 'Valid')->count();
    }

    // ─── Scopes ──────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeApproved($query)
    {
        return $query->whereIn('contractor_status', ['Approved', 'Active']);
    }

    public function scopeSuspended($query)
    {
        return $query->where('is_suspended', true);
    }

    public function scopeWithExpiringDocs($query)
    {
        return $query->where('has_expiring_documents', true);
    }

    public function scopeWithExpiredDocs($query)
    {
        return $query->where('has_expired_documents', true);
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('company_type', $type);
    }

    public function scopeBySite($query, string $site)
    {
        return $query->where('site', 'like', "%{$site}%");
    }

    public function scopeByComplianceStatus($query, string $status)
    {
        return $query->where('compliance_status', $status);
    }

    public function scopePeriod($query, string $period)
    {
        return match ($period) {
            'week'  => $query->where('created_at', '>=', now()->startOfWeek()),
            'month' => $query->where('created_at', '>=', now()->startOfMonth()),
            'year'  => $query->where('created_at', '>=', now()->startOfYear()),
            default => $query,
        };
    }
}
