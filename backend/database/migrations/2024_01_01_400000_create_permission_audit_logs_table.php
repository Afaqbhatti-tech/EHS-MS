<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Create audit log table
        Schema::create('permission_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->char('actor_id', 36)->nullable();
            $table->string('actor_name', 200)->nullable();
            $table->string('target_role', 100)->nullable();
            $table->char('target_user_id', 36)->nullable();
            $table->string('action', 50); // role_permissions_updated, user_overrides_updated, role_created, role_deleted, permissions_reset
            $table->json('changes')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        // 2. Reset all non-master role permissions to empty (minimal defaults)
        //    This enforces: non-master users see only Dashboard, Profile, Help
        DB::table('role_permissions')
            ->where('role', '!=', 'master')
            ->update(['permissions' => json_encode(new \stdClass())]);

        // 3. Re-sync all non-master users — set their permissions to empty
        DB::table('users')
            ->where('role', '!=', 'master')
            ->update(['permissions' => json_encode(new \stdClass())]);

        // 4. Log the reset
        DB::table('permission_audit_logs')->insert([
            'actor_name' => 'System Migration',
            'action' => 'permissions_reset',
            'notes' => 'All non-master role permissions reset to minimal defaults — only Dashboard, Profile, Help visible. Master Admin must re-configure access from Access Management.',
            'created_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('permission_audit_logs');
    }
};
