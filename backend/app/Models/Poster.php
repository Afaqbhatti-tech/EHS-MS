<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Storage;

class Poster extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'poster_code', 'title', 'subtitle', 'category', 'poster_type',
        'topic', 'description',
        'headline', 'subheadline', 'main_body_text', 'bullet_points',
        'warning_text', 'call_to_action', 'footer_text', 'quote_or_slogan',
        'template_id', 'layout_type', 'orientation', 'theme_key',
        'background_color', 'accent_color', 'font_style', 'font_size',
        'text_alignment', 'print_size',
        'target_audience', 'priority', 'language',
        'site', 'project', 'area', 'zone', 'department', 'contractor_name',
        'status', 'version', 'effective_date', 'expiry_date',
        'created_by', 'reviewed_by', 'approved_by', 'published_by',
        'published_at', 'updated_by',
        'main_image_path', 'secondary_image_path', 'background_image_path',
        'company_logo_path', 'qr_code_data',
        'preview_file_path', 'pdf_file_path', 'image_file_path',
        'view_count', 'download_count', 'print_count', 'share_count',
        'last_used_at', 'usage_notes',
        'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'bullet_points'  => 'array',
            'effective_date'  => 'date',
            'expiry_date'     => 'date',
            'published_at'    => 'datetime',
            'last_used_at'    => 'datetime',
        ];
    }

    /* ── Auto-generate poster_code on creating ─────── */

    protected static function booted(): void
    {
        static::creating(function (Poster $poster) {
            if (empty($poster->poster_code)) {
                $year  = now()->year;
                $count = static::withTrashed()
                    ->whereYear('created_at', $year)
                    ->count();
                $poster->poster_code = 'PST-' . $year . '-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);
            }
        });
    }

    /* ── Relationships ─────────────────────────────── */

    public function template(): BelongsTo
    {
        return $this->belongsTo(PosterTemplate::class, 'template_id');
    }

    public function media(): HasMany
    {
        return $this->hasMany(PosterMedia::class);
    }

    public function links(): HasOne
    {
        return $this->hasOne(PosterLink::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(PosterLog::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /* ── Audit logging ─────────────────────────────── */

    public function logHistory(
        string $action,
        ?string $fromStatus = null,
        ?string $toStatus = null,
        ?string $description = null,
        ?array $metadata = null
    ): void {
        $user = auth()->user();
        $this->logs()->create([
            'action'            => $action,
            'from_status'       => $fromStatus,
            'to_status'         => $toStatus,
            'performed_by'      => $user?->id,
            'performed_by_name' => $user?->full_name ?? $user?->email ?? 'System',
            'performed_by_role' => $user?->role ?? null,
            'description'       => $description,
            'metadata'          => $metadata,
        ]);
    }

    /* ── Stat helpers ──────────────────────────────── */

    public function incrementStat(string $field): void
    {
        if (in_array($field, ['view_count', 'download_count', 'print_count', 'share_count'])) {
            $this->timestamps = false;
            $this->increment($field);
            $this->update(['last_used_at' => now()]);
            $this->timestamps = true;
        }
    }

    /* ── Computed attributes ───────────────────────── */

    public function getMainImageUrlAttribute(): ?string
    {
        return $this->main_image_path
            ? asset('storage/' . $this->main_image_path)
            : null;
    }

    public function getSecondaryImageUrlAttribute(): ?string
    {
        return $this->secondary_image_path
            ? asset('storage/' . $this->secondary_image_path)
            : null;
    }

    public function getBackgroundImageUrlAttribute(): ?string
    {
        return $this->background_image_path
            ? asset('storage/' . $this->background_image_path)
            : null;
    }

    public function getCompanyLogoUrlAttribute(): ?string
    {
        return $this->company_logo_path
            ? asset('storage/' . $this->company_logo_path)
            : null;
    }

    public function getPreviewUrlAttribute(): ?string
    {
        return $this->preview_file_path
            ? asset('storage/' . $this->preview_file_path)
            : null;
    }

    public function getPdfUrlAttribute(): ?string
    {
        return $this->pdf_file_path
            ? asset('storage/' . $this->pdf_file_path)
            : null;
    }

    public function getThemeAttribute(): array
    {
        $themes = config('poster_config.themes', []);
        foreach ($themes as $theme) {
            if ($theme['key'] === $this->theme_key) {
                return $theme;
            }
        }
        return $themes[0] ?? [];
    }

    /* ── Scopes ────────────────────────────────────── */

    public function scopePublished($query)
    {
        return $query->where('status', 'Published');
    }

    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    public function scopeByTopic($query, string $topic)
    {
        return $query->where('topic', $topic);
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
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
