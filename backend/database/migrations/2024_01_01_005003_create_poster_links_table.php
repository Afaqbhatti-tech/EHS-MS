<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('poster_links', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('poster_id')->unique();

            // Hard FK links (bigint unsigned tables)
            $table->unsignedBigInteger('linked_campaign_id')->nullable();
            $table->unsignedBigInteger('linked_mock_drill_id')->nullable();
            $table->unsignedBigInteger('linked_erp_id')->nullable();

            // Soft FK links (UUID char(36) tables)
            $table->string('linked_mom_id', 36)->nullable();
            $table->string('linked_permit_id', 36)->nullable();
            $table->string('linked_rams_id', 36)->nullable();

            // Generic reference for other modules
            $table->string('linked_module_type', 100)->nullable();
            $table->string('linked_module_id', 36)->nullable();

            $table->text('link_notes')->nullable();
            $table->timestamps();

            $table->index('poster_id', 'idx_pl_poster');
            $table->index('linked_campaign_id', 'idx_pl_campaign');
            $table->index('linked_mock_drill_id', 'idx_pl_drill');

            $table->foreign('poster_id')->references('id')->on('posters')->cascadeOnDelete();
            $table->foreign('linked_campaign_id')->references('id')->on('campaigns')->nullOnDelete();
            $table->foreign('linked_mock_drill_id')->references('id')->on('mock_drills')->nullOnDelete();
            $table->foreign('linked_erp_id')->references('id')->on('erps')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('poster_links');
    }
};
