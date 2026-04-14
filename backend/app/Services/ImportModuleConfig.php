<?php

namespace App\Services;

use App\Models\Worker;
use App\Models\TrainingRecord;
use App\Models\TrackerRecord;
use App\Models\Contractor;

class ImportModuleConfig
{
    public static function get(string $module): array
    {
        return match ($module) {

            'workers' => [
                'table'      => 'workers',
                'model'      => Worker::class,
                'name_field' => 'name',
                'pk_type'    => 'uuid',

                'index_fields' => [
                    'iqama'           => 'iqama_number',
                    'employee_number' => 'employee_number',
                    'id_number'       => 'id_number',
                    'name'            => 'name',
                ],

                'strong_identifiers' => [],

                'name_support_fields' => [
                    'nationality', 'company', 'profession',
                ],

                'fillable_fields' => [
                    'name', 'employee_number', 'iqama_number',
                    'id_number', 'profession', 'department',
                    'company', 'nationality', 'contact_number',
                    'emergency_contact', 'joining_date',
                    'induction_status', 'induction_date', 'induction_by',
                    'status', 'remarks',
                ],

                'select_fields' => [
                    'id', 'worker_id', 'name', 'employee_number',
                    'iqama_number', 'id_number', 'profession',
                    'department', 'company', 'nationality',
                    'contact_number', 'joining_date', 'status',
                    'induction_status', 'emergency_contact',
                    'induction_date', 'induction_by', 'remarks',
                ],

                'required_fields' => ['name'],

                'display_code_field' => 'worker_id',

                'column_map' => [
                    'Full Name'        => 'name',
                    'Name'             => 'name',
                    'Worker Name'      => 'name',
                    'Employee Name'    => 'name',
                    'Employee ID'      => 'employee_number',
                    'Employee Number'  => 'employee_number',
                    'Employee No'      => 'employee_number',
                    'Emp No'           => 'employee_number',
                    'Iqama Number'     => 'iqama_number',
                    'Iqama No'         => 'iqama_number',
                    'Iqama'            => 'iqama_number',
                    'ID Number'        => 'id_number',
                    'National ID'      => 'id_number',
                    'Profession'       => 'profession',
                    'Designation'      => 'profession',
                    'Position'         => 'profession',
                    'Department'       => 'department',
                    'Company'          => 'company',
                    'Contractor'       => 'company',
                    'Nationality'      => 'nationality',
                    'Phone'            => 'contact_number',
                    'Mobile'           => 'contact_number',
                    'Contact Number'   => 'contact_number',
                    'Emergency Contact'=> 'emergency_contact',
                    'Joining Date'     => 'joining_date',
                    'Date of Joining'  => 'joining_date',
                    'Status'           => 'status',
                    'Induction Status' => 'induction_status',
                    'Induction Date'   => 'induction_date',
                    'Inducted By'      => 'induction_by',
                    'Remarks'          => 'remarks',
                    'Notes'            => 'remarks',
                ],
            ],

            'training' => [
                'table'      => 'training_records',
                'model'      => TrainingRecord::class,
                'name_field' => 'worker_name',
                'pk_type'    => 'uuid',

                'index_fields' => [
                    'certificate_number' => 'certificate_number',
                    'name'               => 'worker_name',
                ],

                'strong_identifiers' => [
                    'certificate_number' => 'certificate_number',
                ],

                'name_support_fields' => ['training_topic_key', 'training_date'],

                'fillable_fields' => [
                    'worker_id', 'training_topic_key', 'training_topic_id',
                    'training_date', 'expiry_date', 'trainer_name',
                    'training_provider', 'training_location',
                    'certificate_number', 'result_status', 'notes',
                ],

                'select_fields' => [
                    'id', 'record_id', 'worker_id', 'training_topic_key',
                    'training_date', 'expiry_date', 'trainer_name',
                    'certificate_number', 'status', 'result_status',
                ],

                'required_fields' => ['training_topic_key'],

                'display_code_field' => 'record_id',

                'virtual_fields' => ['worker_name'],

                'column_map' => [
                    'Worker Name'      => 'worker_name',
                    'Employee Name'    => 'worker_name',
                    'Name'             => 'worker_name',
                    'Topic'            => 'training_topic_key',
                    'Training Topic'   => 'training_topic_key',
                    'Course'           => 'training_topic_key',
                    'Training Date'    => 'training_date',
                    'Date'             => 'training_date',
                    'Expiry Date'      => 'expiry_date',
                    'Expiry'           => 'expiry_date',
                    'Trainer'          => 'trainer_name',
                    'Trainer Name'     => 'trainer_name',
                    'Provider'         => 'training_provider',
                    'Location'         => 'training_location',
                    'Certificate No'   => 'certificate_number',
                    'Certificate Number' => 'certificate_number',
                    'Result'           => 'result_status',
                    'Notes'            => 'notes',
                ],
            ],

            'equipment' => [
                'table'      => 'tracker_records',
                'model'      => TrackerRecord::class,
                'name_field' => 'equipment_name',
                'pk_type'    => 'integer',

                'index_fields' => [
                    'serial_number' => 'serial_number',
                    'plate_number'  => 'plate_number',
                    'record_code'   => 'record_code',
                    'name'          => 'equipment_name',
                ],

                'strong_identifiers' => [
                    'serial_number' => 'serial_number',
                    'plate_number'  => 'plate_number',
                    'record_code'   => 'record_code',
                ],

                'name_support_fields' => ['category_key', 'make_model'],

                'fillable_fields' => [
                    'equipment_name', 'category_key', 'template_type',
                    'serial_number', 'make_model', 'plate_number',
                    'location_area', 'assigned_to', 'onboarding_date',
                    'status', 'condition', 'certificate_number',
                    'certificate_expiry', 'certificate_issuer',
                    'swl', 'load_capacity_tons', 'checker_number',
                    'tuv_certificate_number', 'tuv_expiry_date',
                    'notes', 'item_subtype',
                ],

                'select_fields' => [
                    'id', 'record_code', 'equipment_name', 'category_key',
                    'serial_number', 'make_model', 'plate_number',
                    'location_area', 'assigned_to', 'status', 'condition',
                    'certificate_number', 'certificate_expiry',
                    'tuv_certificate_number', 'tuv_expiry_date',
                    'onboarding_date', 'swl', 'item_subtype',
                    'template_type', 'load_capacity_tons', 'checker_number',
                    'certificate_issuer', 'notes',
                ],

                'required_fields' => ['equipment_name'],

                'display_code_field' => 'record_code',

                'column_map' => [
                    'Equipment Name'   => 'equipment_name',
                    'Name'             => 'equipment_name',
                    'Description'      => 'equipment_name',
                    'Category'         => 'category_key',
                    'Type'             => 'template_type',
                    'Sub Type'         => 'item_subtype',
                    'Serial Number'    => 'serial_number',
                    'Serial No'        => 'serial_number',
                    'S/N'              => 'serial_number',
                    'Make/Model'       => 'make_model',
                    'Model'            => 'make_model',
                    'Plate Number'     => 'plate_number',
                    'Plate No'         => 'plate_number',
                    'Location'         => 'location_area',
                    'Area'             => 'location_area',
                    'Assigned To'      => 'assigned_to',
                    'Operator'         => 'assigned_to',
                    'Onboarding Date'  => 'onboarding_date',
                    'Date'             => 'onboarding_date',
                    'Status'           => 'status',
                    'Condition'        => 'condition',
                    'Cert Number'      => 'certificate_number',
                    'Certificate No'   => 'certificate_number',
                    'Cert Expiry'      => 'certificate_expiry',
                    'SWL'              => 'swl',
                    'TUV Cert'         => 'tuv_certificate_number',
                    'TUV Expiry'       => 'tuv_expiry_date',
                    'Notes'            => 'notes',
                    'Record Code'      => 'record_code',
                    'Code'             => 'record_code',
                ],
            ],

            'contractors' => [
                'table'      => 'contractors',
                'model'      => Contractor::class,
                'name_field' => 'contractor_name',
                'pk_type'    => 'integer',

                'index_fields' => [
                    'registration_number' => 'registration_number',
                    'tax_number'          => 'tax_number',
                    'contractor_code'     => 'contractor_code',
                    'name'                => 'contractor_name',
                ],

                'strong_identifiers' => [
                    'registration_number' => 'registration_number',
                    'tax_number'          => 'tax_number',
                    'contractor_code'     => 'contractor_code',
                ],

                'name_support_fields' => ['city', 'company_type', 'primary_contact_email'],

                'fillable_fields' => [
                    'contractor_name', 'registered_company_name', 'trade_name',
                    'company_type', 'scope_of_work', 'description',
                    'registration_number', 'tax_number',
                    'country', 'city', 'address',
                    'primary_contact_name', 'primary_contact_designation',
                    'primary_contact_phone', 'primary_contact_email',
                    'alternate_contact', 'emergency_contact_number',
                    'site', 'project', 'area', 'zone', 'department',
                    'notes',
                ],

                'select_fields' => [
                    'id', 'contractor_code', 'contractor_name',
                    'registered_company_name', 'company_type',
                    'registration_number', 'tax_number',
                    'country', 'city', 'address',
                    'primary_contact_name', 'primary_contact_phone',
                    'primary_contact_email', 'primary_contact_designation',
                    'alternate_contact', 'emergency_contact_number',
                    'scope_of_work', 'site', 'project', 'area',
                    'zone', 'department', 'description', 'trade_name',
                    'notes',
                ],

                'required_fields' => ['contractor_name'],

                'display_code_field' => 'contractor_code',

                'column_map' => [
                    'Company Name'     => 'contractor_name',
                    'Contractor Name'  => 'contractor_name',
                    'Contractor'       => 'contractor_name',
                    'Registered Name'  => 'registered_company_name',
                    'Trade Name'       => 'trade_name',
                    'Type'             => 'company_type',
                    'Company Type'     => 'company_type',
                    'Scope of Work'    => 'scope_of_work',
                    'Reg Number'       => 'registration_number',
                    'Registration No'  => 'registration_number',
                    'CR Number'        => 'registration_number',
                    'Tax Number'       => 'tax_number',
                    'VAT Number'       => 'tax_number',
                    'Country'          => 'country',
                    'City'             => 'city',
                    'Address'          => 'address',
                    'Contact Name'     => 'primary_contact_name',
                    'Contact Person'   => 'primary_contact_name',
                    'Contact Phone'    => 'primary_contact_phone',
                    'Contact Email'    => 'primary_contact_email',
                    'Email'            => 'primary_contact_email',
                    'Site'             => 'site',
                    'Project'          => 'project',
                    'Area'             => 'area',
                    'Zone'             => 'zone',
                    'Notes'            => 'notes',
                ],
            ],

            default => throw new \InvalidArgumentException(
                "No import config found for module: {$module}"
            ),
        };
    }

    public static function supportedModules(): array
    {
        return [
            'workers'     => 'Workers / Manpower',
            'training'    => 'Training Records',
            'equipment'   => 'Equipment / Tracker',
            'contractors' => 'Contractors',
        ];
    }
}
