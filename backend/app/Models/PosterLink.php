<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosterLink extends Model
{
    protected $fillable = [
        'poster_id',
        'linked_campaign_id', 'linked_mock_drill_id', 'linked_erp_id',
        'linked_mom_id', 'linked_permit_id', 'linked_rams_id',
        'linked_module_type', 'linked_module_id',
        'link_notes',
    ];

    /* ── Relationships ─────────────────────────────── */

    public function poster(): BelongsTo
    {
        return $this->belongsTo(Poster::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class, 'linked_campaign_id');
    }

    public function mockDrill(): BelongsTo
    {
        return $this->belongsTo(MockDrill::class, 'linked_mock_drill_id');
    }

    public function erp(): BelongsTo
    {
        return $this->belongsTo(Erp::class, 'linked_erp_id');
    }

    /* ── Computed ───────────────────────────────────── */

    public function getLinkedModuleLabelAttribute(): ?string
    {
        if ($this->linked_campaign_id) {
            $c = Campaign::find($this->linked_campaign_id);
            return $c ? 'Campaign: ' . ($c->campaign_code ?? $c->title) : 'Campaign: #' . $this->linked_campaign_id;
        }
        if ($this->linked_mock_drill_id) {
            $d = MockDrill::find($this->linked_mock_drill_id);
            return $d ? 'Mock Drill: ' . ($d->drill_code ?? $d->title) : 'Mock Drill: #' . $this->linked_mock_drill_id;
        }
        if ($this->linked_erp_id) {
            $e = Erp::find($this->linked_erp_id);
            return $e ? 'ERP: ' . ($e->erp_code ?? $e->title) : 'ERP: #' . $this->linked_erp_id;
        }
        if ($this->linked_mom_id) {
            return 'MOM: #' . $this->linked_mom_id;
        }
        if ($this->linked_permit_id) {
            return 'Permit: #' . $this->linked_permit_id;
        }
        if ($this->linked_rams_id) {
            return 'RAMS: #' . $this->linked_rams_id;
        }
        if ($this->linked_module_type && $this->linked_module_id) {
            return ucfirst(str_replace('_', ' ', $this->linked_module_type)) . ': #' . $this->linked_module_id;
        }
        return null;
    }
}
