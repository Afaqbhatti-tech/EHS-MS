<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DcApproval extends Model
{
    protected $table = 'dc_approvals';

    protected $fillable = [
        'document_revision_id', 'document_id',
        'approver_id', 'approver_name', 'approver_role',
        'approval_status', 'approval_comments', 'approval_party',
        'approved_at', 'due_date',
    ];

    protected function casts(): array
    {
        return [
            'approved_at' => 'datetime',
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

    public function approver()
    {
        return $this->belongsTo(User::class, 'approver_id');
    }
}
