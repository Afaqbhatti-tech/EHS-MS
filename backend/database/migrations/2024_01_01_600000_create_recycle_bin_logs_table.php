<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recycle_bin_logs', function (Blueprint $table) {
            $table->id();
            $table->string('action'); // deleted, restored, permanently_deleted
            $table->string('record_type'); // type key from RecycleBinController TYPE_MAP
            $table->string('record_id'); // polymorphic ID of the record
            $table->string('record_name')->nullable(); // display name at time of action
            $table->string('record_code')->nullable(); // reference code at time of action
            $table->string('module'); // module label (e.g. "Observations", "Permits")
            $table->char('performed_by', 36)->nullable();
            $table->string('performed_by_name')->nullable();
            $table->text('reason')->nullable(); // optional reason/comment
            $table->json('metadata')->nullable(); // extra data (e.g. cascaded children)
            $table->timestamp('created_at')->useCurrent();

            $table->index(['record_type', 'record_id']);
            $table->index('action');
            $table->index('performed_by');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recycle_bin_logs');
    }
};
