<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Carbon\Carbon;

class TrainingRecord extends Model
{
    use SoftDeletes;

    protected $table = 'training_records';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'record_id', 'worker_id', 'training_topic_key',
        'training_topic_id', 'training_date', 'expiry_date',
        'next_training_date', 'training_duration',
        'trainer_name', 'training_provider', 'training_location',
        'certificate_number', 'certificate_path',
        'certificate_file_path', 'certificate_file_name',
        'status', 'result_status',
        'is_bulk_assignment', 'bulk_assignment_id',
        'notes', 'source_slide_no', 'verified_by', 'verified_at',
        'created_by', 'updated_by', 'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'training_date' => 'date',
            'expiry_date' => 'date',
            'next_training_date' => 'date',
            'verified_at' => 'datetime',
            'is_bulk_assignment' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (TrainingRecord $r) {
            if (empty($r->id)) {
                $r->id = Str::uuid()->toString();
            }

            // Auto-generate record_id
            if (empty($r->record_id)) {
                $year = now()->year;
                $count = static::whereYear('created_at', $year)->withTrashed()->count() + 1;
                $r->record_id = 'TRN-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
            }

            // Auto-calculate expiry if not set (cached topic lookup)
            if (empty($r->expiry_date) && !empty($r->training_date) && !empty($r->training_topic_key)) {
                static $topicCache = [];
                $key = $r->training_topic_key;
                if (!array_key_exists($key, $topicCache)) {
                    $topicCache[$key] = TrainingTopic::where('key', $key)->first();
                }
                $topic = $topicCache[$key];
                if ($topic && $topic->validity_days) {
                    $r->expiry_date = Carbon::parse($r->training_date)
                        ->addDays($topic->validity_days)
                        ->toDateString();
                }
            }
        });

        static::saving(function (TrainingRecord $r) {
            $r->status = $r->calculateStatus();
        });
    }

    public function calculateStatus(): string
    {
        if (!$this->expiry_date) {
            return 'Valid';
        }

        $today = now()->startOfDay();
        $expiry = Carbon::parse($this->expiry_date)->startOfDay();
        $diff = $today->diffInDays($expiry, false);

        return match (true) {
            $diff < 0 => 'Expired',
            $diff <= 30 => 'Expiring Soon',
            default => 'Valid',
        };
    }

    // ── Relationships ────────────────────────────────

    public function worker()
    {
        return $this->belongsTo(Worker::class, 'worker_id');
    }

    public function topic()
    {
        return $this->belongsTo(TrainingTopic::class, 'training_topic_id');
    }

    public function logs()
    {
        return $this->hasMany(TrainingLog::class, 'training_record_id')->orderByDesc('created_at');
    }

    // ── Audit Logging ────────────────────────────────

    public function logActivity(
        string $actionType,
        ?string $description = null,
        ?string $oldValue = null,
        ?string $newValue = null,
        ?array $metadata = null
    ): TrainingLog {
        $user = request()->user();
        return TrainingLog::create([
            'training_record_id' => $this->id,
            'record_code' => $this->record_id,
            'action_type' => $actionType,
            'description' => $description,
            'old_value' => $oldValue,
            'new_value' => $newValue,
            'metadata' => $metadata,
            'user_id' => $user?->id,
            'user_name' => $user?->full_name ?? $user?->email ?? 'System',
        ]);
    }

    // ── Recycle Bin Restore Hook ────────────────────

    /**
     * Called by RecycleBinController after this record is restored.
     * Creates a TrainingLog entry so the restore event appears
     * in the training-specific audit trail.
     */
    public function onRestoredFromRecycleBin(): void
    {
        $user = request()->user();
        $this->loadMissing(['worker', 'topic']);

        TrainingLog::create([
            'training_record_id' => $this->id,
            'record_code' => $this->record_id,
            'action_type' => 'restored',
            'description' => "Training record {$this->record_id} restored from Recycle Bin",
            'metadata' => [
                'worker_name' => $this->worker?->name,
                'topic' => $this->topic?->label ?? $this->training_topic_key,
            ],
            'user_id' => $user?->id,
            'user_name' => $user?->full_name ?? $user?->email ?? 'System',
        ]);
    }

    // ── Computed Attributes ──────────────────────────

    public function getDaysUntilExpiryAttribute(): ?int
    {
        if (!$this->expiry_date) {
            return null;
        }
        return (int) now()->startOfDay()->diffInDays(
            Carbon::parse($this->expiry_date)->startOfDay(),
            false
        );
    }

    public function getCertificateUrlAttribute(): ?string
    {
        if ($this->certificate_file_path) {
            return asset('storage/' . $this->certificate_file_path);
        }
        return $this->certificate_path
            ? asset('storage/' . $this->certificate_path)
            : null;
    }

    // ── Scopes ────────────────────────────────────────

    public function scopeByWorker($q, $workerId)
    {
        return $q->where('worker_id', $workerId);
    }

    public function scopeByTopic($q, $topicKey)
    {
        return $q->where('training_topic_key', $topicKey);
    }

    public function scopeValid($q)
    {
        return $q->where('status', 'Valid');
    }

    public function scopeExpired($q)
    {
        return $q->where('status', 'Expired');
    }

    public function scopeExpiringSoon($q, $days = 30)
    {
        return $q->where(function ($query) use ($days) {
            $query->where('status', 'Expiring Soon')
                ->orWhere(function ($subQ) use ($days) {
                    $subQ->whereNotNull('expiry_date')
                        ->where('expiry_date', '>=', now()->toDateString())
                        ->where('expiry_date', '<=', now()->addDays($days)->toDateString());
                });
        });
    }

    public function scopeByProfession($q, $profession)
    {
        return $q->whereHas('worker', function ($query) use ($profession) {
            $query->where('profession', $profession);
        });
    }

    public function scopePeriod($q, $period)
    {
        return match ($period) {
            'today' => $q->whereDate('training_date', today()),
            'week' => $q->whereBetween('training_date', [
                now()->startOfWeek()->toDateString(),
                now()->endOfWeek()->toDateString(),
            ]),
            'month' => $q->whereMonth('training_date', now()->month)
                ->whereYear('training_date', now()->year),
            'year' => $q->whereYear('training_date', now()->year),
            default => $q,
        };
    }
}
