<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// ─── Scheduled tasks ──────────────────────────────
Schedule::command('notifications:send-expiry')->dailyAt('07:00');
Schedule::command('tracker:refresh-due-status')->dailyAt('06:00');
Schedule::command('checklist:refresh-due-dates')->dailyAt('06:00');
