<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Equipment Groups ──────────────────────────
        Schema::create('equipment_groups', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('icon')->default('Package');
            $table->string('color')->default('#6B7280');
            $table->string('light_color')->default('#F3F4F6');
            $table->string('text_color')->default('#374151');
            $table->string('category_type')->default('custom');
            // category_type: lifting_equipment, vehicles, power_tools, safety_equipment, electrical_equipment, custom
            $table->unsignedInteger('item_count')->default(0);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('category_type');
            $table->index('created_by');
        });

        // ── Equipment Group Fields ────────────────────
        Schema::create('equipment_group_fields', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('group_id');
            $table->string('field_key');       // e.g. 'serial_number'
            $table->string('field_label');      // e.g. 'Serial Number'
            $table->string('field_type')->default('text');
            // field_type: text, number, date, select, textarea, file
            $table->json('field_options')->nullable(); // for select dropdowns
            $table->boolean('is_required')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('group_id')->references('id')->on('equipment_groups')->onDelete('cascade');
            $table->unique(['group_id', 'field_key']);
            $table->index('group_id');
        });

        // ── Equipment Items ───────────────────────────
        Schema::create('equipment_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('group_id');
            $table->string('item_code')->unique();  // auto-generated: EQG-{groupId}-0001
            $table->string('status')->default('Active');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('group_id')->references('id')->on('equipment_groups')->onDelete('cascade');
            $table->index('group_id');
            $table->index('status');
            $table->index('created_by');
        });

        // ── Equipment Item Values (EAV) ───────────────
        Schema::create('equipment_item_values', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('item_id');
            $table->string('field_key');
            $table->text('field_value')->nullable();
            $table->timestamps();

            $table->foreign('item_id')->references('id')->on('equipment_items')->onDelete('cascade');
            $table->unique(['item_id', 'field_key']);
            $table->index('item_id');
            $table->index('field_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment_item_values');
        Schema::dropIfExists('equipment_items');
        Schema::dropIfExists('equipment_group_fields');
        Schema::dropIfExists('equipment_groups');
    }
};
