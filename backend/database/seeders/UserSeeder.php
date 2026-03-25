<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\PermissionService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $permService = new PermissionService();

        $users = [
            [
                'email' => 'admin@ehsos.kaec',
                'username' => null,
                'full_name' => 'System Administrator',
                'role' => 'system_admin',
                'contractor' => null,
                'password' => 'Admin@2026',
            ],
            [
                'email' => 'ahmed.siddiqui@ehsos.kaec',
                'username' => null,
                'full_name' => 'Ahmed Siddiqui',
                'role' => 'ehs_manager',
                'contractor' => 'FFT Direct',
                'password' => 'Manager@2026',
            ],
            [
                'email' => 'officer@ehsos.kaec',
                'username' => null,
                'full_name' => 'Safety Officer',
                'role' => 'safety_officer',
                'contractor' => 'FFT Direct',
                'password' => 'Officer@2026',
            ],
            [
                'email' => 'hse@cccc.kaec',
                'username' => null,
                'full_name' => 'CCCC HSE Rep',
                'role' => 'contractor_hse',
                'contractor' => 'CCCC',
                'password' => 'Contractor@2026',
            ],
        ];

        // Test accounts from env
        $testAccounts = [
            [
                'email' => 'master@ehsos.kaec',
                'username' => env('DEFAULT_MASTER_USERNAME', 'master'),
                'full_name' => 'Master Admin',
                'role' => 'master',
                'contractor' => null,
                'password' => env('DEFAULT_MASTER_PASSWORD', 'master'),
            ],
            [
                'email' => 'testofficer@ehsos.kaec',
                'username' => env('DEFAULT_OFFICER_USERNAME', 'officer'),
                'full_name' => 'Test Officer',
                'role' => 'officer',
                'contractor' => 'FFT Direct',
                'password' => env('DEFAULT_OFFICER_PASSWORD', 'officer'),
            ],
            [
                'email' => 'testlead@ehsos.kaec',
                'username' => env('DEFAULT_LEAD_USERNAME', 'lead'),
                'full_name' => 'Test Lead',
                'role' => 'lead',
                'contractor' => 'FFT Direct',
                'password' => env('DEFAULT_LEAD_PASSWORD', 'lead'),
            ],
            [
                'email' => 'testclient@ehsos.kaec',
                'username' => env('DEFAULT_CLIENT_USERNAME', 'client'),
                'full_name' => 'Test Client',
                'role' => 'client',
                'contractor' => null,
                'password' => env('DEFAULT_CLIENT_PASSWORD', 'client'),
            ],
            [
                'email' => 'testoffice@ehsos.kaec',
                'username' => env('DEFAULT_OFFICE_USERNAME', 'office'),
                'full_name' => 'Test Office',
                'role' => 'office',
                'contractor' => null,
                'password' => env('DEFAULT_OFFICE_PASSWORD', 'office'),
            ],
        ];

        $allUsers = array_merge($users, $testAccounts);

        foreach ($allUsers as $userData) {
            $id = (string) Str::uuid();
            $permissions = $permService->getRolePermissions($userData['role']);

            User::updateOrCreate(
                ['email' => $userData['email']],
                [
                    'id' => $id,
                    'username' => $userData['username'],
                    'full_name' => $userData['full_name'],
                    'password_hash' => Hash::make($userData['password']),
                    'role' => $userData['role'],
                    'contractor' => $userData['contractor'],
                    'permissions' => $permissions,
                    'is_active' => true,
                ],
            );
        }

        $this->command->info('Seeded ' . count($allUsers) . ' users.');
    }
}
