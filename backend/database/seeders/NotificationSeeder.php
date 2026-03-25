<?php

namespace Database\Seeders;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Seeder;

class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        // Seed notifications for every user
        $users = User::all();

        $templates = [
            [
                'type' => 'observation',
                'title' => 'New Observation Assigned',
                'body' => 'Observation OBS-0192 in Zone B has been assigned to you for follow-up.',
                'icon' => 'eye',
                'severity' => 'warning',
                'link' => '/observations',
                'ref_module' => 'observations',
                'ref_id' => 'OBS-0192',
                'minutes_ago' => 8,
            ],
            [
                'type' => 'permit',
                'title' => 'Permit Approved',
                'body' => 'Hot Work Permit PTW-0048 has been approved and is now active.',
                'icon' => 'clipboard-check',
                'severity' => 'success',
                'link' => '/permits',
                'ref_module' => 'permits',
                'ref_id' => 'PTW-0048',
                'minutes_ago' => 25,
            ],
            [
                'type' => 'incident',
                'title' => 'Incident Reported',
                'body' => 'A near-miss incident INC-0015 was reported in Zone A — investigation required.',
                'icon' => 'alert-triangle',
                'severity' => 'danger',
                'link' => '/incidents',
                'ref_module' => 'incidents',
                'ref_id' => 'INC-0015',
                'minutes_ago' => 45,
            ],
            [
                'type' => 'overdue',
                'title' => '3 Observations Overdue',
                'body' => 'Observations OBS-0184, OBS-0181, OBS-0177 are overdue by more than 7 days.',
                'icon' => 'clock',
                'severity' => 'danger',
                'link' => '/observations',
                'ref_module' => 'observations',
                'ref_id' => null,
                'minutes_ago' => 120,
            ],
            [
                'type' => 'system',
                'title' => 'System Maintenance Scheduled',
                'body' => 'EHS-OS will undergo maintenance on Friday 28 Mar from 22:00–23:00 AST.',
                'icon' => 'settings',
                'severity' => 'info',
                'link' => null,
                'ref_module' => null,
                'ref_id' => null,
                'minutes_ago' => 180,
            ],
            [
                'type' => 'assignment',
                'title' => 'New MOM Action Assigned',
                'body' => 'Action item from Weekly MOM #48: "Update scaffolding inspection checklist" is due in 3 days.',
                'icon' => 'file-text',
                'severity' => 'warning',
                'link' => '/weekly-mom',
                'ref_module' => 'moms',
                'ref_id' => 'MOM-48',
                'minutes_ago' => 240,
            ],
            [
                'type' => 'permit',
                'title' => 'Permit Expiring Soon',
                'body' => 'Confined Space Permit PTW-0039 will expire in 24 hours. Renew or close it.',
                'icon' => 'clock',
                'severity' => 'warning',
                'link' => '/permits',
                'ref_module' => 'permits',
                'ref_id' => 'PTW-0039',
                'minutes_ago' => 360,
            ],
            [
                'type' => 'system',
                'title' => 'Weekly Report Generated',
                'body' => 'Your automated weekly EHS performance report is ready to download.',
                'icon' => 'bar-chart-3',
                'severity' => 'info',
                'link' => '/reports',
                'ref_module' => 'reports',
                'ref_id' => null,
                'minutes_ago' => 1440,
            ],
        ];

        foreach ($users as $user) {
            foreach ($templates as $i => $tpl) {
                Notification::create([
                    'user_id' => $user->id,
                    'type' => $tpl['type'],
                    'title' => $tpl['title'],
                    'body' => $tpl['body'],
                    'icon' => $tpl['icon'],
                    'severity' => $tpl['severity'],
                    'link' => $tpl['link'],
                    'ref_module' => $tpl['ref_module'],
                    'ref_id' => $tpl['ref_id'],
                    // Mark half as read for demo
                    'read_at' => $i >= 4 ? now()->subMinutes($tpl['minutes_ago']) : null,
                    'created_at' => now()->subMinutes($tpl['minutes_ago']),
                    'updated_at' => now()->subMinutes($tpl['minutes_ago']),
                ]);
            }
        }
    }
}
