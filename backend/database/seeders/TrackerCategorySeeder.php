<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TrackerCategory;

class TrackerCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = config('tracker_categories.categories');

        foreach ($categories as $cat) {
            TrackerCategory::updateOrCreate(
                ['key' => $cat['key']],
                [
                    'label'          => $cat['label'],
                    'group_name'     => $cat['group'],
                    'icon'           => $cat['icon'],
                    'color'          => $cat['color'],
                    'light_color'    => $cat['light_color'],
                    'text_color'     => $cat['text_color'],
                    'has_plate'      => $cat['has_plate'],
                    'has_swl'        => $cat['has_swl'],
                    'has_tuv'        => $cat['has_tuv'],
                    'has_cert'       => $cat['has_cert'],
                    'insp_freq_days' => $cat['insp_freq_days'],
                    'tuv_freq_days'  => $cat['tuv_freq_days'],
                    'template_type'  => $cat['template_type'],
                    'description'    => $cat['description'],
                    'sort_order'     => $cat['sort_order'],
                    'is_active'      => true,
                ]
            );
        }
    }
}
