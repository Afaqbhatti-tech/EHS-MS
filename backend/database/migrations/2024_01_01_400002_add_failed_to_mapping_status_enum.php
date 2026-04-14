<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE `ai_document_analyses` MODIFY COLUMN `mapping_status` ENUM('Pending', 'Mapped', 'Dismissed', 'Failed') NOT NULL DEFAULT 'Pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `ai_document_analyses` MODIFY COLUMN `mapping_status` ENUM('Pending', 'Mapped', 'Dismissed') NOT NULL DEFAULT 'Pending'");
    }
};
