<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('email', 255)->unique();
            $table->string('username', 100)->nullable()->unique();
            $table->string('full_name', 255);
            $table->string('password_hash', 255)->nullable();
            $table->string('role', 50)->default('viewer_management');
            $table->string('contractor', 100)->nullable();
            $table->json('permissions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('avatar_url', 500)->nullable();
            $table->string('setup_token', 255)->nullable()->unique();
            $table->timestamp('setup_token_expires_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
