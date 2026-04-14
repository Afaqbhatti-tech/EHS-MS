<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tracker_inspection_logs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('log_code', 30)->unique();
            $table->unsignedBigInteger('tracker_record_id');
            $table->string('category_key', 100);

            $table->date('inspection_date');
            $table->enum('inspection_type', [
                'Internal Daily', 'Internal Weekly', 'Internal Monthly',
                'Third Party / TUV', 'Pre-Use Check', 'Post-Incident',
                'Handover', 'Electrical Test', 'Certification Renewal',
            ])->default('Internal Weekly');

            $table->string('inspector_name', 255);
            $table->string('inspector_company', 200)->nullable();
            $table->enum('result', ['Pass', 'Fail', 'Pass with Issues', 'Requires Action']);
            $table->enum('condition_found', ['Good', 'Fair', 'Poor', 'Out of Service', 'Quarantined'])->default('Good');

            $table->date('next_inspection_date')->nullable();
            $table->boolean('certificate_issued')->default(false);
            $table->string('certificate_number', 200)->nullable();
            $table->date('certificate_expiry')->nullable();
            $table->boolean('tuv_updated')->default(false);

            $table->text('findings')->nullable();
            $table->text('corrective_actions')->nullable();
            $table->boolean('defect_found')->default(false);
            $table->text('defect_detail')->nullable();
            $table->string('image_path', 1000)->nullable();
            $table->text('notes')->nullable();

            $table->unsignedBigInteger('recorded_by')->nullable();
            $table->timestamps();

            $table->foreign('tracker_record_id')->references('id')->on('tracker_records')->onDelete('cascade');

            $table->index('tracker_record_id', 'idx_inl_record');
            $table->index('inspection_date', 'idx_inl_date');
            $table->index('result', 'idx_inl_result');
            $table->index('category_key', 'idx_inl_category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tracker_inspection_logs');
    }
};
