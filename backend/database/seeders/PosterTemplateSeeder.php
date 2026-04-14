<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PosterTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'name'                => 'Safety Awareness - Hero',
                'category'            => 'Safety Awareness',
                'layout_type'         => 'hero',
                'description'         => 'Large hero image with bold headline — ideal for general safety messaging.',
                'placeholder_schema'  => json_encode([
                    'headline'    => 'SAFETY FIRST',
                    'body'        => 'Your safety is our top priority. Follow all safety procedures.',
                    'has_warning' => false,
                ]),
                'default_theme_key'   => 'safety_green',
                'default_orientation' => 'Portrait',
                'print_size'          => 'A4',
                'is_active'           => true,
                'sort_order'          => 1,
            ],
            [
                'name'                => 'Warning Alert - Bold',
                'category'            => 'Safety Awareness',
                'layout_type'         => 'bold',
                'description'         => 'High-impact warning poster with attention-grabbing red theme.',
                'placeholder_schema'  => json_encode([
                    'headline'    => 'DANGER',
                    'body'        => 'Authorized personnel only. PPE required at all times.',
                    'has_warning' => true,
                ]),
                'default_theme_key'   => 'warning_red',
                'default_orientation' => 'Portrait',
                'print_size'          => 'A4',
                'is_active'           => true,
                'sort_order'          => 2,
            ],
            [
                'name'                => 'Emergency Procedure',
                'category'            => 'Emergency / ERP',
                'layout_type'         => 'emergency',
                'description'         => 'Emergency response poster with clear instructions and contact info.',
                'placeholder_schema'  => json_encode([
                    'headline'      => 'EMERGENCY PROCEDURE',
                    'body'          => 'In case of emergency, follow these steps:',
                    'bullet_points' => ['Raise the alarm', 'Evacuate immediately', 'Report to assembly point', 'Call emergency number'],
                    'has_warning'   => true,
                ]),
                'default_theme_key'   => 'warning_red',
                'default_orientation' => 'Portrait',
                'print_size'          => 'A3',
                'is_active'           => true,
                'sort_order'          => 3,
            ],
            [
                'name'                => 'Training Reminder - Minimal',
                'category'            => 'Training',
                'layout_type'         => 'minimal',
                'description'         => 'Clean, minimalist design for training announcements and reminders.',
                'placeholder_schema'  => json_encode([
                    'headline' => 'TRAINING SESSION',
                    'body'     => 'Mandatory safety training for all workers.',
                    'cta'      => 'Register Now',
                ]),
                'default_theme_key'   => 'trust_blue',
                'default_orientation' => 'Portrait',
                'print_size'          => 'A4',
                'is_active'           => true,
                'sort_order'          => 4,
            ],
            [
                'name'                => 'Campaign Poster - Two Column',
                'category'            => 'Campaign',
                'layout_type'         => 'two-column',
                'description'         => 'Two-column layout for campaign posters with image and text side by side.',
                'placeholder_schema'  => json_encode([
                    'headline' => 'SAFETY CAMPAIGN',
                    'body'     => 'Join our safety campaign and make a difference.',
                    'cta'      => 'Get Involved',
                ]),
                'default_theme_key'   => 'safety_green',
                'default_orientation' => 'Landscape',
                'print_size'          => 'A3',
                'is_active'           => true,
                'sort_order'          => 5,
            ],
            [
                'name'                => 'Incident Learning',
                'category'            => 'Incident Learning',
                'layout_type'         => 'hero',
                'description'         => 'Share incident lessons learned with clear visuals and key takeaways.',
                'placeholder_schema'  => json_encode([
                    'headline'      => 'LESSONS LEARNED',
                    'body'          => 'Review this incident and learn from it to prevent recurrence.',
                    'bullet_points' => ['What happened', 'Root cause', 'Corrective actions', 'Key learning'],
                ]),
                'default_theme_key'   => 'caution_amber',
                'default_orientation' => 'Portrait',
                'print_size'          => 'A4',
                'is_active'           => true,
                'sort_order'          => 6,
            ],
            [
                'name'                => 'PPE Requirement',
                'category'            => 'Compliance Reminder',
                'layout_type'         => 'bold',
                'description'         => 'Mandatory PPE compliance poster with icons and clear instructions.',
                'placeholder_schema'  => json_encode([
                    'headline'      => 'PPE REQUIRED',
                    'body'          => 'The following PPE must be worn in this area:',
                    'bullet_points' => ['Hard hat', 'Safety glasses', 'High-vis vest', 'Safety boots', 'Gloves'],
                    'has_warning'   => true,
                ]),
                'default_theme_key'   => 'trust_blue',
                'default_orientation' => 'Portrait',
                'print_size'          => 'A4',
                'is_active'           => true,
                'sort_order'          => 7,
            ],
            [
                'name'                => 'Motivational - Clean',
                'category'            => 'Motivation / Engagement',
                'layout_type'         => 'minimal',
                'description'         => 'Inspirational poster with quote and clean white design.',
                'placeholder_schema'  => json_encode([
                    'headline' => 'WORK SAFE. GO HOME SAFE.',
                    'quote'    => 'Safety is not a gadget but a state of mind.',
                ]),
                'default_theme_key'   => 'clean_white',
                'default_orientation' => 'Portrait',
                'print_size'          => 'A4',
                'is_active'           => true,
                'sort_order'          => 8,
            ],
            [
                'name'                => 'Permit Awareness',
                'category'            => 'Permit Awareness',
                'layout_type'         => 'hero',
                'description'         => 'Permit-to-work awareness poster explaining procedures and requirements.',
                'placeholder_schema'  => json_encode([
                    'headline'      => 'PERMIT TO WORK',
                    'body'          => 'No work shall commence without a valid permit.',
                    'bullet_points' => ['Check permit status', 'Verify conditions', 'Follow restrictions', 'Close out on completion'],
                ]),
                'default_theme_key'   => 'professional_dark',
                'default_orientation' => 'Portrait',
                'print_size'          => 'A4',
                'is_active'           => true,
                'sort_order'          => 9,
            ],
            [
                'name'                => 'Announcement - Landscape',
                'category'            => 'General Notice',
                'layout_type'         => 'hero',
                'description'         => 'Landscape announcement poster for events, updates, and general notices.',
                'placeholder_schema'  => json_encode([
                    'headline' => 'ANNOUNCEMENT',
                    'body'     => 'Important update for all personnel.',
                    'cta'      => 'Learn More',
                ]),
                'default_theme_key'   => 'trust_blue',
                'default_orientation' => 'Landscape',
                'print_size'          => 'A3',
                'is_active'           => true,
                'sort_order'          => 10,
            ],
        ];

        foreach ($templates as $t) {
            DB::table('poster_templates')->updateOrInsert(
                ['name' => $t['name']],
                array_merge($t, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}
