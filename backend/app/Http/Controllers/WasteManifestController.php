<?php

namespace App\Http\Controllers;

use App\Models\WasteManifest;
use App\Models\WasteManifestAttachment;
use App\Models\WasteManifestLog;
use App\Http\Traits\ExportsData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Constants\StatusConstants;
use App\Services\NotificationService;

class WasteManifestController extends Controller
{
    use ExportsData;

    // ── LIST ──────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = WasteManifest::with([
            'createdByUser:id,full_name',
            'linkedWasteRecord:id,waste_code,waste_type',
        ])->withCount('attachments');

        // Search
        if ($s = $request->get('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('manifest_code', 'like', "%{$s}%")
                  ->orWhere('manifest_number', 'like', "%{$s}%")
                  ->orWhere('waste_type', 'like', "%{$s}%")
                  ->orWhere('transporter_name', 'like', "%{$s}%")
                  ->orWhere('facility_name', 'like', "%{$s}%")
                  ->orWhere('generator_company', 'like', "%{$s}%")
                  ->orWhere('responsible_person', 'like', "%{$s}%")
                  ->orWhere('source_area', 'like', "%{$s}%");
            });
        }

        // Filters
        if ($v = $request->get('status'))              $query->where('status', $v);
        if ($v = $request->get('waste_type'))           $query->where('waste_type', $v);
        if ($v = $request->get('waste_category'))       $query->where('waste_category', $v);
        if ($v = $request->get('source_area'))          $query->where('source_area', 'like', "%{$v}%");
        if ($v = $request->get('source_department'))    $query->where('source_department', 'like', "%{$v}%");
        if ($v = $request->get('transporter_name'))     $query->where('transporter_name', 'like', "%{$v}%");
        if ($v = $request->get('facility_name'))        $query->where('facility_name', 'like', "%{$v}%");
        if ($v = $request->get('generator_company'))    $query->where('generator_company', 'like', "%{$v}%");
        if ($v = $request->get('priority'))             $query->where('priority', $v);
        if ($v = $request->get('manifest_compliance_status')) $query->where('manifest_compliance_status', $v);
        if ($v = $request->get('linked_waste_record_id'))     $query->where('linked_waste_record_id', $v);

        if ($request->has('is_delayed') && $request->get('is_delayed') !== '') {
            $query->where('is_delayed', (bool) $request->get('is_delayed'));
        }

        // Date filters
        if ($v = $request->get('date_from'))      $query->whereDate('manifest_date', '>=', $v);
        if ($v = $request->get('date_to'))        $query->whereDate('manifest_date', '<=', $v);
        if ($v = $request->get('dispatch_from'))  $query->whereDate('dispatch_date', '>=', $v);
        if ($v = $request->get('dispatch_to'))    $query->whereDate('dispatch_date', '<=', $v);

        // Period
        if ($v = $request->get('period')) {
            $query->period($v);
        }

        // Sorting
        $sortBy  = $request->get('sort_by', 'manifest_date');
        $sortDir = $request->get('sort_dir', 'desc');
        $allowed = ['manifest_date', 'dispatch_date', 'status', 'waste_type', 'quantity', 'created_at', 'manifest_code'];
        if (in_array($sortBy, $allowed)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('manifest_date', 'desc');
        }

        $perPage = min(max((int) $request->get('per_page', 20), 1), 100);
        $data = $query->paginate($perPage);

        return response()->json($data);
    }

    // ── CREATE ────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            // Section A — Basics
            'manifest_date'         => 'required|date',
            'manifest_number'       => 'nullable|string|max:200',
            'dispatch_date'         => 'nullable|date',
            'dispatch_time'         => 'nullable|date_format:H:i',
            'priority'              => 'nullable|in:Normal,Urgent,Critical',
            'notes'                 => 'nullable|string',
            // Section B — Source
            'source_site'           => 'nullable|string|max:255',
            'source_project'        => 'nullable|string|max:255',
            'source_area'           => 'nullable|string|max:200',
            'source_zone'           => 'nullable|string|max:200',
            'source_department'     => 'nullable|string|max:200',
            'generating_activity'   => 'nullable|string',
            'generator_company'     => 'nullable|string|max:255',
            'responsible_person'    => 'nullable|string|max:255',
            'responsible_person_id' => 'nullable|exists:users,id',
            'contact_number'        => 'nullable|string|max:100',
            // Section C — Waste
            'waste_type'            => 'required|string|max:200',
            'waste_category'        => 'required|in:Hazardous,Non-Hazardous,Recyclable,Special Waste,Inert Waste',
            'waste_description'     => 'nullable|string',
            'hazard_classification' => 'nullable|string|max:200',
            'waste_code'            => 'nullable|string|max:100',
            'un_code'               => 'nullable|string|max:50',
            'physical_form'         => 'nullable|string|max:100',
            'chemical_composition'  => 'nullable|string',
            'compatibility_notes'   => 'nullable|string',
            'special_handling'      => 'nullable|string',
            // Section D — Quantity
            'quantity'              => 'required|numeric|min:0.001',
            'unit'                  => 'required|string|max:50',
            'container_count'       => 'nullable|integer|min:1',
            'packaging_type'        => 'nullable|string|max:200',
            'container_ids'         => 'nullable|string',
            'gross_weight_kg'       => 'nullable|numeric',
            'net_weight_kg'         => 'nullable|numeric',
            'temporary_storage_location' => 'nullable|string|max:255',
            'storage_condition'     => 'nullable|string',
            // Section E — Transporter
            'transporter_name'      => 'nullable|string|max:255',
            'transporter_license_no'=> 'nullable|string|max:200',
            'driver_name'           => 'nullable|string|max:255',
            'driver_contact'        => 'nullable|string|max:100',
            'vehicle_number'        => 'nullable|string|max:100',
            'vehicle_type'          => 'nullable|string|max:100',
            'transport_permit_number' => 'nullable|string|max:200',
            'handover_by'           => 'nullable|string|max:255',
            'handover_date'         => 'nullable|date',
            'handover_time'         => 'nullable|date_format:H:i',
            'transport_start_date'  => 'nullable|date',
            'expected_delivery_date'=> 'nullable|date',
            'handover_note'         => 'nullable|string',
            // Section F — Facility
            'facility_name'         => 'nullable|string|max:255',
            'facility_license_no'   => 'nullable|string|max:200',
            'facility_address'      => 'nullable|string',
            'treatment_method'      => 'nullable|string|max:200',
            'receiving_person'      => 'nullable|string|max:255',
            'receiving_date'        => 'nullable|date',
            'receiving_time'        => 'nullable|date_format:H:i',
            'disposal_certificate_no' => 'nullable|string|max:200',
            'final_destination_status'=> 'nullable|string|max:200',
            'final_notes'           => 'nullable|string',
            // Section G — Compliance
            'regulatory_reference'     => 'nullable|string|max:500',
            'permit_license_reference' => 'nullable|string|max:500',
            'manifest_compliance_status'=> 'nullable|in:Compliant,Non-Compliant,Pending,N/A',
            'hazardous_waste_compliance'=> 'nullable|boolean',
            'special_approval_required' => 'nullable|boolean',
            'special_approval_note'    => 'nullable|string',
            'legal_remarks'            => 'nullable|string',
            // Links
            'linked_waste_record_id'   => 'nullable|exists:waste_records,id',
            'linked_env_incident_id'   => 'nullable|exists:environmental_incidents,id',
            'linked_inspection_id'     => 'nullable|exists:environmental_inspections,id',
            'linked_compliance_id'     => 'nullable|exists:environmental_compliance_register,id',
            // Attachments
            'attachments'              => 'nullable|array',
            'attachments.*'            => 'file|max:20480|mimes:pdf,doc,docx,xlsx,xls,jpg,jpeg,png,webp',
            'attachment_categories'    => 'nullable|array',
            'attachment_categories.*'  => 'nullable|string',
        ]);

        $user = $request->user();

        try {
            return DB::transaction(function () use ($request, $user) {
                // Generate manifest_code with lock to prevent race conditions
                $year = date('Y');
                $lastCode = WasteManifest::withTrashed()
                    ->whereYear('created_at', $year)
                    ->lockForUpdate()
                    ->orderByDesc('id')
                    ->value('manifest_code');
                $seq = $lastCode ? (int) substr($lastCode, -4) + 1 : 1;
                $manifestCode = 'WMF-' . $year . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);

                $manifest = WasteManifest::create(array_merge(
                    $request->only([
                        'manifest_date', 'manifest_number', 'dispatch_date', 'dispatch_time',
                        'priority', 'notes',
                        'source_site', 'source_project', 'source_area', 'source_zone',
                        'source_department', 'generating_activity', 'generator_company',
                        'responsible_person', 'responsible_person_id', 'contact_number',
                        'waste_type', 'waste_category', 'waste_description',
                        'hazard_classification', 'waste_code', 'un_code', 'physical_form',
                        'chemical_composition', 'compatibility_notes', 'special_handling',
                        'quantity', 'unit', 'container_count', 'packaging_type',
                        'container_ids', 'gross_weight_kg', 'net_weight_kg',
                        'temporary_storage_location', 'storage_condition',
                        'transporter_name', 'transporter_license_no', 'driver_name',
                        'driver_contact', 'vehicle_number', 'vehicle_type',
                        'transport_permit_number', 'handover_by', 'handover_date',
                        'handover_time', 'transport_start_date', 'expected_delivery_date',
                        'handover_note',
                        'facility_name', 'facility_license_no', 'facility_address',
                        'treatment_method', 'receiving_person', 'receiving_date',
                        'receiving_time', 'disposal_certificate_no', 'final_destination_status',
                        'final_notes',
                        'regulatory_reference', 'permit_license_reference',
                        'manifest_compliance_status', 'hazardous_waste_compliance',
                        'special_approval_required', 'special_approval_note', 'legal_remarks',
                        'linked_waste_record_id', 'linked_env_incident_id',
                        'linked_inspection_id', 'linked_compliance_id',
                    ]),
                    [
                        'manifest_code' => $manifestCode,
                        'status'        => StatusConstants::WASTE_DRAFT,
                        'created_by'    => $user?->id,
                        'updated_by'    => $user?->id,
                    ]
                ));

                // Handle file uploads
                if ($request->hasFile('attachments')) {
                    $year   = now()->year;
                    $folder = 'waste-manifests/' . $year . '/' . $manifest->id;
                    foreach ($request->file('attachments') as $i => $file) {
                        $path = $file->store($folder, 'public');
                        WasteManifestAttachment::create([
                            'waste_manifest_id'   => $manifest->id,
                            'file_path'           => $path,
                            'original_name'       => $file->getClientOriginalName(),
                            'file_type'           => $file->getClientOriginalExtension(),
                            'file_size_kb'        => (int) ($file->getSize() / 1024),
                            'attachment_category' => $request->attachment_categories[$i] ?? 'Other',
                            'uploaded_by'         => $user?->id,
                            'uploaded_by_name'    => $user?->full_name ?? $user?->name,
                        ]);
                    }
                }

                $manifest->logHistory('Manifest Created', null, StatusConstants::WASTE_DRAFT, 'Created by ' . ($user?->full_name ?? $user?->name ?? 'System'));

                NotificationService::wasteManifestCreated($manifest, $user?->id ?? auth()->id());

                return response()->json([
                    'message'  => 'Waste manifest created',
                    'manifest' => $manifest->fresh()->load('attachments'),
                ], 201);
            });
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    // ── SHOW ──────────────────────────────────────────────

    public function show(WasteManifest $manifest): JsonResponse
    {
        $manifest->load([
            'attachments',
            'logs' => fn($q) => $q->orderBy('created_at', 'asc'),
            'logs.performer:id,full_name',
            'createdByUser:id,full_name',
            'dispatchedByUser:id,full_name',
            'completedByUser:id,full_name',
            'linkedWasteRecord',
            'linkedEnvIncident',
            'linkedInspection',
            'linkedCompliance',
            'responsiblePersonUser:id,full_name',
        ]);

        $data = $manifest->toArray();
        $data['is_hazardous']    = $manifest->is_hazardous;
        $data['days_in_transit'] = $manifest->days_in_transit;
        $data['is_overdue']      = $manifest->is_overdue;

        // Append URLs for attachments
        if (isset($data['attachments'])) {
            foreach ($data['attachments'] as &$att) {
                $att['url'] = asset('storage/' . $att['file_path']);
                $att['is_image'] = in_array(strtolower($att['file_type'] ?? ''), ['jpg', 'jpeg', 'png', 'webp', 'gif']);
            }
        }

        return response()->json($data);
    }

    // ── UPDATE ────────────────────────────────────────────

    public function update(Request $request, WasteManifest $manifest): JsonResponse
    {
        if (in_array($manifest->status, ['Completed', 'Cancelled'])) {
            return response()->json([
                'message' => 'Completed or cancelled manifests cannot be edited.',
            ], 422);
        }

        $request->validate([
            'manifest_date'         => 'sometimes|required|date',
            'manifest_number'       => 'nullable|string|max:200',
            'dispatch_date'         => 'nullable|date',
            'dispatch_time'         => 'nullable|date_format:H:i',
            'priority'              => 'nullable|in:Normal,Urgent,Critical',
            'notes'                 => 'nullable|string',
            'source_site'           => 'nullable|string|max:255',
            'source_project'        => 'nullable|string|max:255',
            'source_area'           => 'nullable|string|max:200',
            'source_zone'           => 'nullable|string|max:200',
            'source_department'     => 'nullable|string|max:200',
            'generating_activity'   => 'nullable|string',
            'generator_company'     => 'nullable|string|max:255',
            'responsible_person'    => 'nullable|string|max:255',
            'responsible_person_id' => 'nullable|exists:users,id',
            'contact_number'        => 'nullable|string|max:100',
            'waste_type'            => 'sometimes|required|string|max:200',
            'waste_category'        => 'sometimes|required|in:Hazardous,Non-Hazardous,Recyclable,Special Waste,Inert Waste',
            'waste_description'     => 'nullable|string',
            'hazard_classification' => 'nullable|string|max:200',
            'waste_code'            => 'nullable|string|max:100',
            'un_code'               => 'nullable|string|max:50',
            'physical_form'         => 'nullable|string|max:100',
            'chemical_composition'  => 'nullable|string',
            'compatibility_notes'   => 'nullable|string',
            'special_handling'      => 'nullable|string',
            'quantity'              => 'sometimes|required|numeric|min:0.001',
            'unit'                  => 'sometimes|required|string|max:50',
            'container_count'       => 'nullable|integer|min:1',
            'packaging_type'        => 'nullable|string|max:200',
            'container_ids'         => 'nullable|string',
            'gross_weight_kg'       => 'nullable|numeric',
            'net_weight_kg'         => 'nullable|numeric',
            'temporary_storage_location' => 'nullable|string|max:255',
            'storage_condition'     => 'nullable|string',
            'transporter_name'      => 'nullable|string|max:255',
            'transporter_license_no'=> 'nullable|string|max:200',
            'driver_name'           => 'nullable|string|max:255',
            'driver_contact'        => 'nullable|string|max:100',
            'vehicle_number'        => 'nullable|string|max:100',
            'vehicle_type'          => 'nullable|string|max:100',
            'transport_permit_number' => 'nullable|string|max:200',
            'handover_by'           => 'nullable|string|max:255',
            'handover_date'         => 'nullable|date',
            'handover_time'         => 'nullable|date_format:H:i',
            'transport_start_date'  => 'nullable|date',
            'expected_delivery_date'=> 'nullable|date',
            'handover_note'         => 'nullable|string',
            'facility_name'         => 'nullable|string|max:255',
            'facility_license_no'   => 'nullable|string|max:200',
            'facility_address'      => 'nullable|string',
            'treatment_method'      => 'nullable|string|max:200',
            'receiving_person'      => 'nullable|string|max:255',
            'receiving_date'        => 'nullable|date',
            'receiving_time'        => 'nullable|date_format:H:i',
            'disposal_certificate_no' => 'nullable|string|max:200',
            'final_destination_status'=> 'nullable|string|max:200',
            'final_notes'           => 'nullable|string',
            'regulatory_reference'     => 'nullable|string|max:500',
            'permit_license_reference' => 'nullable|string|max:500',
            'manifest_compliance_status'=> 'nullable|in:Compliant,Non-Compliant,Pending,N/A',
            'hazardous_waste_compliance'=> 'nullable|boolean',
            'special_approval_required' => 'nullable|boolean',
            'special_approval_note'    => 'nullable|string',
            'legal_remarks'            => 'nullable|string',
            'linked_waste_record_id'   => 'nullable|exists:waste_records,id',
            'linked_env_incident_id'   => 'nullable|exists:environmental_incidents,id',
            'linked_inspection_id'     => 'nullable|exists:environmental_inspections,id',
            'linked_compliance_id'     => 'nullable|exists:environmental_compliance_register,id',
            'attachments'              => 'nullable|array',
            'attachments.*'            => 'file|max:20480|mimes:pdf,doc,docx,xlsx,xls,jpg,jpeg,png,webp',
            'attachment_categories'    => 'nullable|array',
            'attachment_categories.*'  => 'nullable|string',
            'remove_attachments'       => 'nullable|array',
            'remove_attachments.*'     => 'integer|exists:waste_manifest_attachments,id',
        ]);

        $user = $request->user();

        try {
            return DB::transaction(function () use ($request, $manifest, $user) {
                $manifest->update(array_merge(
                $request->only([
                    'manifest_date', 'manifest_number', 'dispatch_date', 'dispatch_time',
                    'priority', 'notes',
                    'source_site', 'source_project', 'source_area', 'source_zone',
                    'source_department', 'generating_activity', 'generator_company',
                    'responsible_person', 'responsible_person_id', 'contact_number',
                    'waste_type', 'waste_category', 'waste_description',
                    'hazard_classification', 'waste_code', 'un_code', 'physical_form',
                    'chemical_composition', 'compatibility_notes', 'special_handling',
                    'quantity', 'unit', 'container_count', 'packaging_type',
                    'container_ids', 'gross_weight_kg', 'net_weight_kg',
                    'temporary_storage_location', 'storage_condition',
                    'transporter_name', 'transporter_license_no', 'driver_name',
                    'driver_contact', 'vehicle_number', 'vehicle_type',
                    'transport_permit_number', 'handover_by', 'handover_date',
                    'handover_time', 'transport_start_date', 'expected_delivery_date',
                    'handover_note',
                    'facility_name', 'facility_license_no', 'facility_address',
                    'treatment_method', 'receiving_person', 'receiving_date',
                    'receiving_time', 'disposal_certificate_no', 'final_destination_status',
                    'final_notes',
                    'regulatory_reference', 'permit_license_reference',
                    'manifest_compliance_status', 'hazardous_waste_compliance',
                    'special_approval_required', 'special_approval_note', 'legal_remarks',
                    'linked_waste_record_id', 'linked_env_incident_id',
                    'linked_inspection_id', 'linked_compliance_id',
                ]),
                ['updated_by' => $user?->id]
            ));

            // Remove attachments
            if ($request->has('remove_attachments')) {
                foreach ($request->remove_attachments as $attId) {
                    $att = WasteManifestAttachment::where('waste_manifest_id', $manifest->id)->find($attId);
                    if ($att) {
                        Storage::disk('public')->delete($att->file_path);
                        $att->delete();
                    }
                }
            }

            // Add new attachments
            if ($request->hasFile('attachments')) {
                $year   = now()->year;
                $folder = 'waste-manifests/' . $year . '/' . $manifest->id;
                foreach ($request->file('attachments') as $i => $file) {
                    $path = $file->store($folder, 'public');
                    WasteManifestAttachment::create([
                        'waste_manifest_id'   => $manifest->id,
                        'file_path'           => $path,
                        'original_name'       => $file->getClientOriginalName(),
                        'file_type'           => $file->getClientOriginalExtension(),
                        'file_size_kb'        => (int) ($file->getSize() / 1024),
                        'attachment_category' => $request->attachment_categories[$i] ?? 'Other',
                        'uploaded_by'         => $user?->id,
                        'uploaded_by_name'    => $user?->full_name ?? $user?->name,
                    ]);
                }
            }

            $manifest->logHistory('Manifest Updated', null, null, 'Updated by ' . ($user?->full_name ?? $user?->name ?? 'System'));

            return response()->json([
                'message'  => 'Manifest updated',
                'manifest' => $manifest->fresh()->load('attachments'),
            ]);
            });
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    // ── DELETE ────────────────────────────────────────────

    public function destroy(WasteManifest $manifest): JsonResponse
    {
        if (! in_array($manifest->status, ['Draft', 'Cancelled'])) {
            return response()->json([
                'message' => 'Only Draft or Cancelled manifests can be deleted.',
            ], 422);
        }

        try {
            $manifest->deleted_by = Auth::user()?->full_name ?? 'System';
            $manifest->save();
            $manifest->logHistory('Manifest Deleted', $manifest->status, null, 'Soft-deleted by ' . (auth()->user()?->full_name ?? 'System'));
            $manifest->delete();
            RecycleBinController::logDeleteAction('waste_manifest', $manifest);

            return response()->json(['message' => 'Manifest deleted']);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    // ── CHANGE STATUS ────────────────────────────────────

    public function changeStatus(Request $request, WasteManifest $manifest): JsonResponse
    {
        $request->validate([
            'status'              => 'required|in:Draft,Prepared,Ready for Dispatch,Dispatched,In Transit,Received,Completed,Cancelled,Rejected,Under Review',
            'cancellation_reason' => 'required_if:status,Cancelled|nullable|string',
        ]);

        $newStatus = $request->status;
        $oldStatus = $manifest->status;

        // Guard transitions
        $allowed = $this->getAllowedTransitions($oldStatus);
        if (! in_array($newStatus, $allowed)) {
            return response()->json([
                'message' => "Cannot transition from '{$oldStatus}' to '{$newStatus}'.",
            ], 422);
        }

        $updates = ['status' => $newStatus, 'updated_by' => Auth::id()];

        if ($newStatus === 'Dispatched') {
            $updates['dispatched_at'] = now();
            $updates['dispatched_by'] = Auth::id();
        } elseif ($newStatus === 'Completed') {
            $updates['completed_at'] = now();
            $updates['completed_by'] = Auth::id();
        } elseif ($newStatus === 'Cancelled') {
            $updates['cancelled_at']       = now();
            $updates['cancellation_reason'] = $request->cancellation_reason;
        }

        DB::transaction(function () use ($manifest, $updates, $oldStatus, $newStatus) {
            $manifest->update($updates);
            $manifest->logHistory('Status Changed', $oldStatus, $newStatus, "Status changed from {$oldStatus} to {$newStatus}");
        });

        NotificationService::wasteManifestStatusChanged($manifest, $oldStatus, $newStatus, Auth::id());

        return response()->json([
            'message'  => "Status changed to {$newStatus}",
            'manifest' => $manifest->fresh(),
        ]);
    }

    // ── CONFIRM DISPATCH ─────────────────────────────────

    public function confirmDispatch(Request $request, WasteManifest $manifest): JsonResponse
    {
        if (! in_array($manifest->status, ['Prepared', 'Ready for Dispatch'])) {
            return response()->json([
                'message' => 'Manifest must be Prepared or Ready for Dispatch to confirm dispatch.',
            ], 422);
        }

        $request->validate([
            'transporter_name'       => 'required|string|max:255',
            'driver_name'            => 'required|string|max:255',
            'vehicle_number'         => 'required|string|max:100',
            'handover_by'            => 'required|string|max:255',
            'handover_date'          => 'required|date',
            'handover_time'          => 'nullable|date_format:H:i',
            'transport_start_date'   => 'nullable|date',
            'expected_delivery_date' => 'nullable|date',
            'handover_note'          => 'nullable|string',
            'dispatch_date'          => 'nullable|date',
            'dispatch_time'          => 'nullable|date_format:H:i',
            'transporter_license_no' => 'nullable|string|max:200',
            'driver_contact'         => 'nullable|string|max:100',
            'vehicle_type'           => 'nullable|string|max:100',
        ]);

        $oldStatus = $manifest->status;

        $manifest->update(array_merge(
            $request->only([
                'transporter_name', 'transporter_license_no', 'driver_name',
                'driver_contact', 'vehicle_number', 'vehicle_type',
                'handover_by', 'handover_date', 'handover_time',
                'transport_start_date', 'expected_delivery_date',
                'handover_note', 'dispatch_date', 'dispatch_time',
            ]),
            [
                'status'        => StatusConstants::WASTE_DISPATCHED,
                'dispatched_at' => now(),
                'dispatched_by' => Auth::id(),
                'updated_by'    => Auth::id(),
            ]
        ));

        $manifest->logHistory(
            'Dispatch Confirmed', $oldStatus, StatusConstants::WASTE_DISPATCHED,
            'Dispatched by ' . Auth::user()?->full_name . '. Driver: ' . $request->driver_name . '. Vehicle: ' . $request->vehicle_number,
            ['transporter' => $request->transporter_name, 'vehicle' => $request->vehicle_number]
        );

        return response()->json([
            'message'  => 'Dispatch confirmed',
            'manifest' => $manifest->fresh(),
        ]);
    }

    // ── CONFIRM RECEIVING ────────────────────────────────

    public function confirmReceiving(Request $request, WasteManifest $manifest): JsonResponse
    {
        if (! in_array($manifest->status, ['Dispatched', 'In Transit'])) {
            return response()->json([
                'message' => 'Manifest must be Dispatched or In Transit to confirm receiving.',
            ], 422);
        }

        $request->validate([
            'receiving_person'    => 'required|string|max:255',
            'receiving_date'      => 'required|date',
            'receiving_time'      => 'nullable|date_format:H:i',
            'facility_name'       => 'required|string|max:255',
            'facility_license_no' => 'nullable|string|max:200',
            'final_notes'         => 'nullable|string',
        ]);

        $oldStatus = $manifest->status;

        $manifest->update(array_merge(
            $request->only([
                'receiving_person', 'receiving_date', 'receiving_time',
                'facility_name', 'facility_license_no', 'final_notes',
            ]),
            [
                'status'      => StatusConstants::WASTE_RECEIVED,
                'received_at' => now(),
                'received_by' => Auth::id(),
                'updated_by'  => Auth::id(),
            ]
        ));

        $manifest->logHistory(
            'Receiving Confirmed', $oldStatus, StatusConstants::WASTE_RECEIVED,
            'Received at ' . $request->facility_name . ' by ' . $request->receiving_person
        );

        return response()->json([
            'message'  => 'Receiving confirmed',
            'manifest' => $manifest->fresh(),
        ]);
    }

    // ── CONFIRM DISPOSAL ─────────────────────────────────

    public function confirmDisposal(Request $request, WasteManifest $manifest): JsonResponse
    {
        if ($manifest->status !== 'Received') {
            return response()->json([
                'message' => 'Manifest must be Received to confirm disposal.',
            ], 422);
        }

        $request->validate([
            'treatment_method'           => 'required|string|max:200',
            'disposal_certificate_no'    => 'nullable|string|max:200',
            'final_destination_status'   => 'nullable|string|max:200',
            'final_notes'                => 'nullable|string',
            'manifest_compliance_status' => 'nullable|in:Compliant,Non-Compliant,Pending,N/A',
            'disposal_certificate'       => 'nullable|file|max:20480|mimes:pdf,jpg,jpeg,png',
        ]);

        $oldStatus = $manifest->status;

        // Handle disposal certificate upload (file I/O stays outside transaction)
        $uploadedFilePath = null;
        $uploadedFile = null;
        if ($request->hasFile('disposal_certificate')) {
            $uploadedFile = $request->file('disposal_certificate');
            $uploadedFilePath = $uploadedFile->store('waste-manifests/' . $manifest->id . '/certificates', 'public');
        }

        DB::transaction(function () use ($manifest, $request, $oldStatus, $uploadedFilePath, $uploadedFile) {
            if ($uploadedFilePath && $uploadedFile) {
                WasteManifestAttachment::create([
                    'waste_manifest_id'   => $manifest->id,
                    'file_path'           => $uploadedFilePath,
                    'original_name'       => $uploadedFile->getClientOriginalName(),
                    'file_type'           => $uploadedFile->getClientOriginalExtension(),
                    'file_size_kb'        => (int) ($uploadedFile->getSize() / 1024),
                    'attachment_category' => 'Disposal Certificate',
                    'uploaded_by'         => Auth::id(),
                    'uploaded_by_name'    => Auth::user()?->full_name,
                ]);
            }

            $manifest->update([
                'treatment_method'           => $request->treatment_method,
                'disposal_certificate_no'    => $request->disposal_certificate_no,
                'final_destination_status'   => $request->final_destination_status,
                'final_notes'                => $request->final_notes,
                'manifest_compliance_status' => $request->manifest_compliance_status ?? 'Compliant',
                'status'                     => StatusConstants::WASTE_COMPLETED,
                'completed_at'               => now(),
                'completed_by'               => Auth::id(),
                'updated_by'                 => Auth::id(),
            ]);

            $manifest->logHistory(
                'Disposal Confirmed', $oldStatus, StatusConstants::WASTE_COMPLETED,
                'Treatment: ' . $request->treatment_method . ($request->disposal_certificate_no ? '. Cert: ' . $request->disposal_certificate_no : ''),
                ['treatment_method' => $request->treatment_method, 'compliance_status' => $request->manifest_compliance_status]
            );
        });

        return response()->json([
            'message'  => 'Disposal confirmed. Manifest completed.',
            'manifest' => $manifest->fresh()->load('attachments'),
        ]);
    }

    // ── UPLOAD ATTACHMENTS ───────────────────────────────

    public function uploadAttachment(Request $request, WasteManifest $manifest): JsonResponse
    {
        $request->validate([
            'attachments'              => 'required|array',
            'attachments.*'            => 'required|file|max:20480',
            'attachment_category'      => 'nullable|string',
            'attachment_categories'    => 'nullable|array',
            'attachment_categories.*'  => 'nullable|string',
            'caption'                  => 'nullable|string|max:500',
            'description'              => 'nullable|string',
        ]);

        $folder  = 'waste-manifests/' . $manifest->id . '/files';
        $created = [];
        $user    = $request->user();

        foreach ($request->file('attachments') as $i => $f) {
            $path = $f->store($folder, 'public');
            $created[] = WasteManifestAttachment::create([
                'waste_manifest_id'   => $manifest->id,
                'file_path'           => $path,
                'original_name'       => $f->getClientOriginalName(),
                'file_type'           => $f->getClientOriginalExtension(),
                'file_size_kb'        => (int) ($f->getSize() / 1024),
                'attachment_category' => $request->attachment_categories[$i]
                    ?? $request->attachment_category
                    ?? 'Other',
                'caption'             => $request->caption,
                'description'         => $request->description,
                'uploaded_by'         => $user?->id,
                'uploaded_by_name'    => $user?->full_name ?? $user?->name,
            ]);
        }

        $manifest->logHistory('Attachment Uploaded', null, null, count($created) . ' file(s) uploaded');

        // Append URLs
        $result = collect($created)->map(fn($a) => array_merge($a->toArray(), ['url' => $a->url]));

        return response()->json(['attachments' => $result]);
    }

    // ── REMOVE ATTACHMENT ────────────────────────────────

    public function removeAttachment(WasteManifest $manifest, WasteManifestAttachment $attachment): JsonResponse
    {
        if ($attachment->waste_manifest_id !== $manifest->id) {
            return response()->json(['message' => 'Attachment does not belong to this manifest.'], 404);
        }

        Storage::disk('public')->delete($attachment->file_path);
        $attachment->delete();

        $manifest->logHistory('Attachment Removed', null, null, 'Removed: ' . $attachment->original_name);

        return response()->json(['message' => 'Attachment removed']);
    }

    // ── STATS ────────────────────────────────────────────

    public function stats(Request $request): JsonResponse
    {
        $year = $request->get('year', now()->year);
        $base = WasteManifest::whereYear('manifest_date', $year);

        $kpis = [
            'total_manifests'       => (clone $base)->count(),
            'draft_prepared'        => (clone $base)->whereIn('status', ['Draft', 'Prepared', 'Ready for Dispatch'])->count(),
            'in_transit'            => (clone $base)->whereIn('status', ['Dispatched', 'In Transit'])->count(),
            'completed'             => (clone $base)->where('status', 'Completed')->count(),
            'cancelled_rejected'    => (clone $base)->whereIn('status', ['Cancelled', 'Rejected'])->count(),
            'hazardous_manifests'   => (clone $base)->where('waste_category', 'Hazardous')->count(),
            'non_compliant_manifests' => (clone $base)->where('manifest_compliance_status', 'Non-Compliant')->count(),
            'delayed_manifests'     => (clone $base)->where('is_delayed', true)->count(),
            'created_this_month'    => WasteManifest::whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->count(),
        ];

        $byStatus = (clone $base)
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')->get();

        $byWasteType = (clone $base)
            ->select('waste_type', DB::raw('COUNT(*) as count'), DB::raw('SUM(quantity) as total_quantity'))
            ->groupBy('waste_type')
            ->orderByDesc('count')
            ->limit(15)->get();

        $byWasteCategory = (clone $base)
            ->select('waste_category', DB::raw('COUNT(*) as count'))
            ->groupBy('waste_category')->get();

        $byTreatmentMethod = (clone $base)
            ->whereNotNull('treatment_method')
            ->select('treatment_method', DB::raw('COUNT(*) as count'))
            ->groupBy('treatment_method')
            ->orderByDesc('count')
            ->limit(10)->get();

        $topTransporters = (clone $base)
            ->whereNotNull('transporter_name')
            ->select('transporter_name', DB::raw('COUNT(*) as count'))
            ->groupBy('transporter_name')
            ->orderByDesc('count')
            ->limit(10)->get();

        $topFacilities = (clone $base)
            ->whereNotNull('facility_name')
            ->select('facility_name', DB::raw('COUNT(*) as count'))
            ->groupBy('facility_name')
            ->orderByDesc('count')
            ->limit(10)->get();

        $monthlyTrend = WasteManifest::select(
                DB::raw("DATE_FORMAT(manifest_date, '%Y-%m') as month"),
                DB::raw('COUNT(*) as total_manifests'),
                DB::raw("SUM(CASE WHEN waste_category = 'Hazardous' THEN 1 ELSE 0 END) as hazardous_count"),
                DB::raw("SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_count"),
            )
            ->where('manifest_date', '>=', now()->subMonths(12)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        $quantityByType = WasteManifest::select(
                'waste_type', 'unit',
                DB::raw('SUM(quantity) as total_quantity')
            )
            ->where('manifest_date', '>=', now()->subMonths(6)->startOfMonth())
            ->groupBy('waste_type', 'unit')
            ->orderByDesc('total_quantity')
            ->limit(10)->get();

        $delayedList = WasteManifest::where('is_delayed', true)
            ->whereIn('status', ['Dispatched', 'In Transit'])
            ->select('id', 'manifest_code', 'waste_type', 'transporter_name', 'expected_delivery_date', 'dispatched_at')
            ->orderBy('expected_delivery_date')
            ->limit(10)
            ->get()
            ->map(function ($m) {
                $m->days_delayed = $m->expected_delivery_date
                    ? (int) now()->diffInDays($m->expected_delivery_date)
                    : null;
                return $m;
            });

        return response()->json([
            'kpis'                => $kpis,
            'by_status'           => $byStatus,
            'by_waste_type'       => $byWasteType,
            'by_waste_category'   => $byWasteCategory,
            'by_treatment_method' => $byTreatmentMethod,
            'top_transporters'    => $topTransporters,
            'top_facilities'      => $topFacilities,
            'monthly_trend'       => $monthlyTrend,
            'quantity_by_type'    => $quantityByType,
            'delayed_list'        => $delayedList,
        ]);
    }

    // ── EXPORT ───────────────────────────────────────────

    public function export(Request $request)
    {
        $query = WasteManifest::query();

        // Apply same filters as index
        if ($s = $request->get('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('manifest_code', 'like', "%{$s}%")
                  ->orWhere('waste_type', 'like', "%{$s}%")
                  ->orWhere('transporter_name', 'like', "%{$s}%");
            });
        }
        if ($v = $request->get('status'))           $query->where('status', $v);
        if ($v = $request->get('waste_type'))        $query->where('waste_type', $v);
        if ($v = $request->get('waste_category'))    $query->where('waste_category', $v);
        if ($v = $request->get('source_area'))       $query->where('source_area', 'like', "%{$v}%");
        if ($v = $request->get('transporter_name'))  $query->where('transporter_name', 'like', "%{$v}%");
        if ($v = $request->get('facility_name'))     $query->where('facility_name', 'like', "%{$v}%");
        if ($v = $request->get('priority'))          $query->where('priority', $v);
        if ($v = $request->get('date_from'))         $query->whereDate('manifest_date', '>=', $v);
        if ($v = $request->get('date_to'))           $query->whereDate('manifest_date', '<=', $v);
        if ($v = $request->get('period'))            $query->period($v);

        $query->orderByDesc('manifest_date');
        $items = $query->get();

        $headers = [
            'Manifest Code', 'Manifest Number', 'Date', 'Status',
            'Waste Type', 'Category', 'Description', 'Quantity', 'Unit',
            'Source Site', 'Source Area', 'Source Department',
            'Generator Company', 'Responsible Person',
            'Transporter', 'Vehicle', 'Driver', 'Dispatch Date',
            'Facility Name', 'Treatment Method',
            'Receiving Date', 'Completion Date',
            'Compliance Status', 'Hazardous Compliance',
            'Disposal Certificate No.', 'Notes',
        ];

        $rows = $items->map(fn($m) => [
            $m->manifest_code,
            $m->manifest_number,
            $m->manifest_date?->format('Y-m-d'),
            $m->status,
            $m->waste_type,
            $m->waste_category,
            $m->waste_description,
            $m->quantity,
            $m->unit,
            $m->source_site,
            $m->source_area,
            $m->source_department,
            $m->generator_company,
            $m->responsible_person,
            $m->transporter_name,
            $m->vehicle_number,
            $m->driver_name,
            $m->dispatch_date?->format('Y-m-d'),
            $m->facility_name,
            $m->treatment_method,
            $m->receiving_date?->format('Y-m-d'),
            $m->completed_at?->format('Y-m-d'),
            $m->manifest_compliance_status,
            $m->hazardous_waste_compliance ? 'Yes' : 'No',
            $m->disposal_certificate_no,
            $m->notes,
        ])->toArray();

        $format = $request->get('format', 'csv');
        return $this->exportAs($headers, $rows, 'Waste Manifests', $format);
    }

    // ── HELPERS ──────────────────────────────────────────

    private function getAllowedTransitions(string $current): array
    {
        return match ($current) {
            'Draft'              => ['Prepared', 'Ready for Dispatch', 'Cancelled'],
            'Prepared'           => ['Ready for Dispatch', 'Dispatched', 'Cancelled'],
            'Ready for Dispatch' => ['Dispatched', 'Cancelled'],
            'Dispatched'         => ['In Transit', 'Received', 'Under Review', 'Cancelled'],
            'In Transit'         => ['Received', 'Under Review', 'Cancelled'],
            'Received'           => ['Completed', 'Rejected'],
            'Under Review'       => ['Ready for Dispatch', 'Cancelled'],
            default              => [],
        };
    }
}
