<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('rams_documents') && !Schema::hasColumn('rams_documents', 'dc_document_id')) {
            Schema::table('rams_documents', function (Blueprint $table) {
                $table->unsignedBigInteger('dc_document_id')->nullable()->after('id');
                $table->foreign('dc_document_id')->references('id')->on('dc_documents')->onDelete('set null');
                $table->index('dc_document_id', 'idx_rams_dc_doc');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('rams_documents') && Schema::hasColumn('rams_documents', 'dc_document_id')) {
            Schema::table('rams_documents', function (Blueprint $table) {
                $table->dropForeign(['dc_document_id']);
                $table->dropIndex('idx_rams_dc_doc');
                $table->dropColumn('dc_document_id');
            });
        }
    }
};
