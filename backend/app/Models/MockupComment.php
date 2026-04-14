<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class MockupComment extends Model
{
    protected $table = 'mockup_comments';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'mockup_id', 'parent_comment_id', 'user_id',
        'user_name', 'user_role', 'comment_type',
        'comment_text', 'is_resolved', 'resolved_by',
        'resolved_by_name', 'resolved_at', 'resolution_note',
        'mockup_status_at_time',
    ];

    protected function casts(): array
    {
        return [
            'is_resolved' => 'boolean',
            'resolved_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (MockupComment $c) {
            if (empty($c->id)) {
                $c->id = (string) Str::uuid();
            }
        });
    }

    public function mockup()
    {
        return $this->belongsTo(Mockup::class);
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function resolvedByUser()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function replies()
    {
        return $this->hasMany(MockupComment::class, 'parent_comment_id')
            ->orderBy('created_at', 'asc');
    }

    public function parent()
    {
        return $this->belongsTo(MockupComment::class, 'parent_comment_id');
    }
}
