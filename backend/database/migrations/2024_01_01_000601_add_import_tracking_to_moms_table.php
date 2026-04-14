<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('moms', function (Blueprint $table) {
            if (!Schema::hasColumn('moms', 'import_id')) {
                $table->char('import_id', 36)->nullable()->after('updated_by');
            }
            if (!Schema::hasColumn('moms', 'source_document_path')) {
                $table->string('source_document_path', 500)->nullable()->after('import_id');
            }
            if (!Schema::hasColumn('moms', 'source_document_name')) {
                $table->string('source_document_name', 255)->nullable()->after('source_document_path');
            }
            if (!Schema::hasColumn('moms', 'imported_at')) {
                $table->timestamp('imported_at')->nullable()->after('source_document_name');
            }
        });

        Schema::table('mom_points', function (Blueprint $table) {
            if (!Schema::hasColumn('mom_points', 'source_document_reference')) {
                $table->string('source_document_reference', 500)->nullable()->after('resolution_summary');
            }
            if (!Schema::hasColumn('mom_points', 'source_row_no')) {
                $table->unsignedInteger('source_row_no')->nullable()->after('source_document_reference');
            }
        });
    }

    public function down(): void
    {
        Schema::table('moms', function (Blueprint $table) {
            $cols = ['import_id', 'source_document_path', 'source_document_name', 'imported_at'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('moms', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('mom_points', function (Blueprint $table) {
            $cols = ['source_document_reference', 'source_row_no'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('mom_points', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
