<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportBatch extends Model
{
    protected $table = 'import_batches';

    protected $fillable = [
        'batch_code', 'module', 'uploaded_by',
        'original_filename', 'file_path', 'file_size_kb',
        'total_rows', 'parsed_rows', 'parse_errors',
        'new_count', 'update_count', 'duplicate_count',
        'conflict_count', 'error_count', 'intra_file_dup_count',
        'created_count', 'updated_count', 'skipped_count', 'conflicts_held',
        'status', 'parse_error_message',
        'parsed_at', 'confirmed_at', 'confirmed_by', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'parsed_at'    => 'datetime',
            'confirmed_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $batch) {
            if (empty($batch->batch_code)) {
                $year  = now()->year;
                $count = static::whereYear('created_at', $year)->count() + 1;
                $batch->batch_code = 'IMP-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
            }
        });
    }

    // ── Relationships ──────────────────────────────────

    public function rows(): HasMany
    {
        return $this->hasMany(ImportRow::class, 'batch_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function confirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    // ── Helpers ────────────────────────────────────────

    public function updateClassificationCounts(): void
    {
        $counts = $this->rows()
            ->selectRaw("
                SUM(classification = 'new') as new_count,
                SUM(classification = 'update') as update_count,
                SUM(classification = 'duplicate') as duplicate_count,
                SUM(classification = 'conflict') as conflict_count,
                SUM(classification = 'error') as error_count,
                SUM(classification = 'intra_file_dup') as intra_file_dup_count
            ")
            ->first();

        $this->update([
            'new_count'           => (int) $counts->new_count,
            'update_count'        => (int) $counts->update_count,
            'duplicate_count'     => (int) $counts->duplicate_count,
            'conflict_count'      => (int) $counts->conflict_count,
            'error_count'         => (int) $counts->error_count,
            'intra_file_dup_count'=> (int) $counts->intra_file_dup_count,
        ]);
    }

    public function getSummaryTextAttribute(): string
    {
        $parts = [];
        if ($this->new_count > 0)            $parts[] = "{$this->new_count} new";
        if ($this->update_count > 0)         $parts[] = "{$this->update_count} updates";
        if ($this->duplicate_count > 0)      $parts[] = "{$this->duplicate_count} duplicates";
        if ($this->conflict_count > 0)       $parts[] = "{$this->conflict_count} conflicts";
        if ($this->intra_file_dup_count > 0) $parts[] = "{$this->intra_file_dup_count} file dups";
        if ($this->error_count > 0)          $parts[] = "{$this->error_count} errors";
        return implode(' · ', $parts) ?: 'No rows';
    }

    // ── Scopes ─────────────────────────────────────────

    public function scopeByModule($query, string $module)
    {
        return $query->where('module', $module);
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }
}
