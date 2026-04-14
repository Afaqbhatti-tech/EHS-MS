<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('permits', function (Blueprint $table) {
            $table->string('activity_type', 255)->nullable()->after('phase');
            $table->text('description')->nullable()->after('work_description');
            $table->time('start_time')->nullable()->after('valid_to');
            $table->time('end_time')->nullable()->after('start_time');
            $table->string('image_path', 1000)->nullable()->after('attachments');
            $table->text('notes')->nullable()->after('ppe_requirements');
            $table->char('created_by', 36)->nullable()->after('closed_at');
            $table->char('updated_by', 36)->nullable()->after('created_by');
            $table->softDeletes();

            $table->index('permit_type');
            $table->index('zone');
        });
    }

    public function down(): void
    {
        Schema::table('permits', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropColumn([
                'activity_type', 'description', 'start_time', 'end_time',
                'image_path', 'notes', 'created_by', 'updated_by',
            ]);
            $table->dropIndex(['permit_type']);
            $table->dropIndex(['zone']);
        });
    }
};
