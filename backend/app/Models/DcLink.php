<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DcLink extends Model
{
    public $timestamps = false;

    protected $table = 'dc_links';

    protected $fillable = [
        'document_id', 'document_revision_id',
        'linked_module', 'linked_id', 'linked_code', 'linked_title',
        'link_notes', 'created_by', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
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

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ── Computed ─────────────────────────────────────

    public function getLinkedModuleLabelAttribute(): string
    {
        $moduleLabels = [
            'rams' => 'RAMS',
            'permit' => 'Permit',
            'mockup' => 'Mock-Up',
            'inspection' => 'Inspection',
            'incident' => 'Incident',
            'violation' => 'Violation',
            'training' => 'Training',
            'campaign' => 'Campaign',
            'mom' => 'MOM',
            'drill' => 'Mock Drill',
            'environmental_incident' => 'Environmental Incident',
            'waste_manifest' => 'Waste Manifest',
            'contractor' => 'Contractor',
        ];

        $label = $moduleLabels[$this->linked_module] ?? ucfirst($this->linked_module);
        if ($this->linked_code) {
            $label .= ': ' . $this->linked_code;
        }
        return $label;
    }
}
