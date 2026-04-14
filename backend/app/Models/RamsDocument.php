<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class RamsDocument extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (!$model->id) {
                $model->id = Str::uuid()->toString();
            }
        });
    }

    protected $fillable = [
        'work_line_id', 'ref_number', 'title', 'description',
        'contractor', 'zone', 'status', 'current_version',
        'submitted_by', 'approved_by', 'approved_at', 'rejected_reason',
        'due_date', 'tags',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'current_version' => 'integer',
            'approved_at' => 'datetime',
            'due_date' => 'date',
        ];
    }

    public function workLine()
    {
        return $this->belongsTo(WorkLine::class);
    }

    public function versions()
    {
        return $this->hasMany(RamsDocumentVersion::class)->orderByDesc('version_number');
    }

    public function latestVersion()
    {
        return $this->hasOne(RamsDocumentVersion::class)->latestOfMany('version_number');
    }

    public function mockups()
    {
        return $this->hasMany(Mockup::class, 'rams_document_id');
    }

    public function submitter()
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
