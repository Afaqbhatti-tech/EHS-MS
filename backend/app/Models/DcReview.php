<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DcReview extends Model
{
    protected $table = 'dc_reviews';

    protected $fillable = [
        'document_revision_id', 'document_id',
        'reviewer_id', 'reviewer_name', 'reviewer_role',
        'review_status', 'review_comments', 'review_party',
        'reviewed_at', 'due_date',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
            'due_date' => 'date',
        ];
    }

    // ── Relationships ────────────────────────────────

    public function revision()
    {
        return $this->belongsTo(DcRevision::class, 'document_revision_id');
    }

    public function document()
    {
        return $this->belongsTo(DcDocument::class, 'document_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}
