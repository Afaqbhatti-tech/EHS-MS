<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractorModuleLink extends Model
{
    public $timestamps = false;
    const UPDATED_AT = null;

    protected $fillable = [
        'contractor_id', 'module_type', 'module_id',
        'module_code', 'module_title', 'link_date',
    ];

    protected function casts(): array
    {
        return [
            'link_date'  => 'date',
            'created_at' => 'datetime',
        ];
    }

    // ─── Relationships ───────────────────────────────

    public function contractor(): BelongsTo
    {
        return $this->belongsTo(Contractor::class);
    }

    // ─── Computed ────────────────────────────────────

    public function getModuleLabelAttribute(): string
    {
        $typeLabels = [
            'permit'       => 'Permit',
            'rams'         => 'RAMS',
            'mockup'       => 'Mockup',
            'observation'  => 'Observation',
            'incident'     => 'Incident',
            'violation'    => 'Violation',
            'training_record' => 'Training',
            'campaign'     => 'Campaign',
            'mom'          => 'MOM',
            'drill'        => 'Mock Drill',
            'waste_manifest' => 'Waste Manifest',
            'inspection'   => 'Inspection',
            'env_incident' => 'Env. Incident',
            'equipment'    => 'Equipment',
        ];

        $label = $typeLabels[$this->module_type] ?? ucfirst($this->module_type);
        $parts = [$label];
        if ($this->module_code) $parts[] = $this->module_code;
        if ($this->module_title) $parts[] = '— ' . $this->module_title;

        return implode(': ', array_slice($parts, 0, 2)) . (isset($parts[2]) ? ' ' . $parts[2] : '');
    }
}
