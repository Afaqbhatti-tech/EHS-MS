<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PermissionAuditLog extends Model
{
    protected $table = 'permission_audit_logs';
    public $timestamps = false;

    protected $fillable = [
        'actor_id',
        'actor_name',
        'target_role',
        'target_user_id',
        'action',
        'changes',
        'notes',
        'created_at',
    ];

    protected $casts = [
        'changes' => 'array',
        'created_at' => 'datetime',
    ];
}
