<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Mockup extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'ref_number', 'title', 'procedure_type', 'area',
        'contractor', 'status', 'description', 'fft_decision',
        'consultant_decision', 'client_decision', 'attachments',
    ];

    protected function casts(): array
    {
        return ['attachments' => 'array'];
    }
}
