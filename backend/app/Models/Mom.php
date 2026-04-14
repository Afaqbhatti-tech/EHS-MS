<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Mom extends Model
{
    use SoftDeletes;

    protected $table = 'moms';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'ref_number', 'mom_code', 'week_number', 'year', 'title',
        'meeting_date', 'meeting_time', 'meeting_location', 'meeting_type',
        'chaired_by', 'minutes_prepared_by', 'site_project', 'client_name',
        'attendees', 'summary',
        'in_progress_points',
        'resolved_points', 'closed_points', 'overdue_points',
        'attachments', 'previous_mom_id', 'distributed_at', 'distributed_by',
        'status', 'notes',
        'action_items', 'previous_closeouts', 'location', 'recorded_by',
        'created_by', 'updated_by',
        'import_id', 'source_document_path', 'source_document_name', 'imported_at',
        'deleted_by',
        'document_path', 'document_name', 'ai_analysis_id', 'ai_analysed',
    ];

    protected function casts(): array
    {
        return [
            'meeting_date'   => 'date',
            'distributed_at' => 'datetime',
            'imported_at'    => 'datetime',
            'attendees'      => 'array',
            'attachments'    => 'array',
            'action_items'   => 'array',
            'previous_closeouts' => 'array',
            'ai_analysed'    => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Mom $m) {
            if (empty($m->id)) {
                $m->id = (string) Str::uuid();
            }
            if (empty($m->mom_code) && $m->week_number && $m->year) {
                $week = str_pad($m->week_number, 2, '0', STR_PAD_LEFT);
                $m->mom_code = 'MOM-' . $m->year . '-W' . $week;
            }
            if (empty($m->ref_number) && $m->mom_code) {
                $m->ref_number = $m->mom_code;
            }
        });
    }

    // ── Relationships ────────────────────────────────

    public function points()
    {
        return $this->hasMany(MomPoint::class, 'mom_id')->orderBy('point_number');
    }

    public function openPoints()
    {
        return $this->hasMany(MomPoint::class, 'mom_id')
            ->whereIn('status', ['Open', 'Pending', 'Blocked']);
    }

    public function previousMom()
    {
        return $this->belongsTo(Mom::class, 'previous_mom_id');
    }

    public function nextMom()
    {
        return $this->hasOne(Mom::class, 'previous_mom_id');
    }

    public function createdByUser()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function distributedByUser()
    {
        return $this->belongsTo(User::class, 'distributed_by');
    }

    public function aiAnalysis()
    {
        return $this->belongsTo(AiDocumentAnalysis::class, 'ai_analysis_id');
    }

    // ── Helpers ──────────────────────────────────────

    public function recalculatePointCounts(): void
    {
        $counts = $this->points()
            ->selectRaw(
                'COUNT(*) as total,
                 SUM(status IN ("Open","Pending","Blocked")) as open_count,
                 SUM(status = "In Progress") as in_progress,
                 SUM(status = "Resolved") as resolved,
                 SUM(status = "Closed") as closed,
                 SUM(due_date < CURDATE() AND status NOT IN ("Resolved","Closed","Carried Forward")) as overdue'
            )->first();

        $total       = $counts->total ?? 0;
        $openCount   = $counts->open_count ?? 0;
        $inProgress  = $counts->in_progress ?? 0;
        $resolved    = $counts->resolved ?? 0;
        $closed      = $counts->closed ?? 0;
        $overdue     = $counts->overdue ?? 0;

        // Auto-calculate MOM status from point statuses
        $unresolved = $openCount + $inProgress;
        if ($total === 0) {
            $status = 'Open';
        } elseif ($unresolved > 0) {
            $status = 'In Progress';
        } else {
            $status = 'Closed';
        }

        $this->update([
            'total_points'       => $total,
            'open_points'        => $openCount,
            'in_progress_points' => $inProgress,
            'resolved_points'    => $resolved,
            'closed_points'      => $closed,
            'overdue_points'     => $overdue,
            'status'             => $status,
        ]);
    }

    public function getDocumentUrlAttribute(): ?string
    {
        if ($this->document_path) {
            return asset('storage/' . $this->document_path);
        }
        return null;
    }

    public function getAttachmentUrlsAttribute(): array
    {
        if (empty($this->attachments)) return [];
        return array_map(fn($path) => [
            'path'     => $path,
            'url'      => asset('storage/' . $path),
            'filename' => basename($path),
        ], $this->attachments ?? []);
    }

    // ── Scopes ───────────────────────────────────────

    public function scopeByYear($q, $year)
    {
        return $q->where('year', $year);
    }

    public function scopeByWeek($q, $week, $year)
    {
        return $q->where('week_number', $week)->where('year', $year);
    }

    public function scopeHasOpenPoints($q)
    {
        return $q->where('open_points', '>', 0);
    }
}
