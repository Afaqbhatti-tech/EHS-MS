<?php

namespace Database\Seeders;

use App\Models\DcDocument;
use App\Models\DcRevision;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentControlSeeder extends Seeder
{
    public function run(): void
    {
        if (DcDocument::count() > 0) {
            $this->command->info('Document Control data already exists, skipping seeder.');
            return;
        }

        $user = DB::table('users')->first();
        $userId = $user?->id;

        $sampleDocs = [
            [
                'document_title' => 'Site HSE Plan - KAEC Infrastructure Phase 2',
                'document_number' => 'HSE-PLAN-KAEC-2026-001',
                'document_type' => 'HSE Plan',
                'document_category' => 'Safety & Health',
                'description' => 'Comprehensive HSE plan covering all construction activities for KAEC Phase 2 infrastructure works.',
                'department' => 'HSE Department',
                'owner' => 'FFT Safety Manager',
                'site' => 'KAEC',
                'area' => 'Zone A',
                'confidentiality_level' => 'Internal',
                'priority' => 'Critical',
                'status' => 'Active',
                'revision_number' => 'Rev 02',
                'is_active' => true,
            ],
            [
                'document_title' => 'Risk Assessment - Working at Height',
                'document_number' => 'RA-WAH-2026-015',
                'document_type' => 'Risk Assessment (RA)',
                'document_category' => 'Safety & Health',
                'description' => 'Risk assessment for all work at height activities including scaffolding, MEWP, and ladder usage.',
                'department' => 'HSE Department',
                'owner' => 'Senior Safety Officer',
                'site' => 'KAEC',
                'area' => 'Zone B',
                'confidentiality_level' => 'Internal',
                'priority' => 'High',
                'status' => 'Active',
                'revision_number' => 'Rev 01',
                'is_active' => true,
            ],
            [
                'document_title' => 'RAMS - Steel Structure Erection',
                'document_number' => 'RAMS-SSE-2026-008',
                'document_type' => 'RAMS',
                'document_category' => 'Operational',
                'description' => 'Risk Assessment and Method Statement for steel structure erection works.',
                'department' => 'Engineering',
                'owner' => 'Site Engineer',
                'site' => 'KAEC',
                'area' => 'Station 1',
                'confidentiality_level' => 'Internal',
                'priority' => 'High',
                'status' => 'Under Review',
                'revision_number' => 'Rev 00',
                'is_active' => false,
            ],
            [
                'document_title' => 'Emergency Response Plan - Fire & Evacuation',
                'document_number' => 'ERP-FIRE-2026-001',
                'document_type' => 'Emergency Response Plan (ERP)',
                'document_category' => 'Emergency',
                'description' => 'Emergency response procedures for fire incidents and site evacuation.',
                'department' => 'HSE Department',
                'owner' => 'Emergency Coordinator',
                'site' => 'KAEC',
                'confidentiality_level' => 'Public',
                'priority' => 'Critical',
                'status' => 'Active',
                'revision_number' => 'Rev 03',
                'is_active' => true,
                'expiry_date' => now()->addDays(15)->format('Y-m-d'),
                'is_expiring_soon' => true,
            ],
            [
                'document_title' => 'Environmental Management Plan',
                'document_number' => 'EMP-KAEC-2026-001',
                'document_type' => 'Environmental Management Plan',
                'document_category' => 'Environmental',
                'description' => 'Environmental management plan covering waste management, pollution prevention, and resource conservation.',
                'department' => 'Environmental',
                'owner' => 'Environmental Officer',
                'site' => 'KAEC',
                'confidentiality_level' => 'Internal',
                'priority' => 'Medium',
                'status' => 'Draft',
                'revision_number' => 'Rev 00',
                'is_active' => false,
            ],
        ];

        foreach ($sampleDocs as $data) {
            $revNum = $data['revision_number'];
            $isActive = $data['is_active'];
            $expiryDate = $data['expiry_date'] ?? null;
            $isExpiringSoon = $data['is_expiring_soon'] ?? false;
            unset($data['revision_number'], $data['is_active'], $data['expiry_date'], $data['is_expiring_soon']);

            $doc = DcDocument::create(array_merge($data, [
                'current_revision_number' => $revNum,
                'created_by' => $userId,
                'updated_by' => $userId,
                'is_expiring_soon' => $isExpiringSoon,
                'expiry_date' => $expiryDate,
            ]));

            $revision = DcRevision::create([
                'document_id' => $doc->id,
                'revision_number' => $revNum,
                'status' => $isActive ? 'Active' : ($data['status'] === 'Under Review' ? 'Under Review' : 'Draft'),
                'is_active' => $isActive,
                'issue_date' => now()->subMonths(rand(1, 6)),
                'effective_date' => now()->subMonths(rand(0, 3)),
                'next_review_date' => now()->addMonths(rand(1, 12)),
                'expiry_date' => $expiryDate,
                'change_summary' => $isActive ? 'Initial approved version.' : null,
                'activated_at' => $isActive ? now()->subDays(rand(1, 30)) : null,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            if ($isActive) {
                $doc->update([
                    'active_revision_id' => $revision->id,
                    'next_review_date' => $revision->next_review_date,
                    'expiry_date' => $revision->expiry_date ?? $expiryDate,
                ]);
            }

            $doc->logHistory('Document Created', null, $data['status'], 'Seeded for demonstration.');
        }

        $this->command->info('Document Control seeded with ' . count($sampleDocs) . ' sample documents.');
    }
}
