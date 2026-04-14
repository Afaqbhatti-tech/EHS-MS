<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('moms', function (Blueprint $table) {
            $table->string('document_path', 1000)->nullable()->after('source_document_name');
            $table->string('document_name', 500)->nullable()->after('document_path');
            $table->unsignedBigInteger('ai_analysis_id')->nullable()->after('document_name');
            $table->tinyInteger('ai_analysed')->default(0)->after('ai_analysis_id');

            $table->foreign('ai_analysis_id')
                  ->references('id')
                  ->on('ai_document_analyses')
                  ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('moms', function (Blueprint $table) {
            $table->dropForeign(['ai_analysis_id']);
            $table->dropColumn(['document_path', 'document_name', 'ai_analysis_id', 'ai_analysed']);
        });
    }
};
