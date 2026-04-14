<?php

namespace App\Http\Controllers;

use App\Models\Contractor;
use App\Models\ContractorContact;
use App\Models\ContractorDocument;
use App\Models\ContractorModuleLink;
use App\Http\Traits\ExportsData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Services\NotificationService;

class ContractorController extends Controller
{
    use ExportsData;

    // ── LIST ──────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = Contractor::with([
            'createdBy:id,full_name',
            'approvedBy:id,full_name',
        ])->withCount(['contacts', 'documents']);

        // Search
        if ($s = $request->get('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('contractor_code', 'like', "%{$s}%")
                  ->orWhere('contractor_name', 'like', "%{$s}%")
                  ->orWhere('registered_company_name', 'like', "%{$s}%")
                  ->orWhere('primary_contact_name', 'like', "%{$s}%")
                  ->orWhere('primary_contact_phone', 'like', "%{$s}%")
                  ->orWhere('primary_contact_email', 'like', "%{$s}%")
                  ->orWhere('registration_number', 'like', "%{$s}%")
                  ->orWhere('area', 'like', "%{$s}%")
                  ->orWhere('site', 'like', "%{$s}%");
            });
        }

        // Filters
        if ($v = $request->get('contractor_status'))  $query->where('contractor_status', $v);
        if ($v = $request->get('compliance_status'))   $query->where('compliance_status', $v);
        if ($v = $request->get('company_type'))        $query->where('company_type', $v);
        if ($v = $request->get('scope_of_work'))       $query->where('scope_of_work', $v);
        if ($v = $request->get('site'))                $query->where('site', 'like', "%{$v}%");
        if ($v = $request->get('area'))                $query->where('area', 'like', "%{$v}%");
        if ($v = $request->get('project'))             $query->where('project', 'like', "%{$v}%");

        if ($request->has('is_active') && $request->get('is_active') !== '') {
            $query->where('is_active', (bool) $request->get('is_active'));
        }
        if ($request->has('is_suspended') && $request->get('is_suspended') !== '') {
            $query->where('is_suspended', (bool) $request->get('is_suspended'));
        }
        if ($request->has('has_expired_documents') && $request->get('has_expired_documents') !== '') {
            $query->where('has_expired_documents', (bool) $request->get('has_expired_documents'));
        }
        if ($request->has('has_expiring_documents') && $request->get('has_expiring_documents') !== '') {
            $query->where('has_expiring_documents', (bool) $request->get('has_expiring_documents'));
        }
        if ($request->has('contract_expiring') && $request->get('contract_expiring')) {
            $query->whereBetween('contract_end_date', [now()->startOfDay(), now()->addDays(30)]);
        }

        // Date filters
        if ($v = $request->get('date_from')) $query->whereDate('created_at', '>=', $v);
        if ($v = $request->get('date_to'))   $query->whereDate('created_at', '<=', $v);

        // Period
        if ($v = $request->get('period')) {
            $query->period($v);
        }

        // Sorting
        $sortBy  = $request->get('sort_by', 'contractor_name');
        $sortDir = $request->get('sort_dir', 'asc');
        $allowed = ['contractor_name', 'contractor_code', 'contractor_status', 'next_expiry_date', 'current_site_headcount', 'created_at'];
        if (in_array($sortBy, $allowed)) {
            $query->orderBy($sortBy, $sortDir === 'desc' ? 'desc' : 'asc');
        } else {
            $query->orderBy('contractor_name', 'asc');
        }

        $perPage = min(max((int) $request->get('per_page', 20), 1), 100);
        $data = $query->paginate($perPage);

        return response()->json($data);
    }

    // ── CREATE ────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            // Section A
            'contractor_name'           => 'required|string|max:500',
            'registered_company_name'   => 'nullable|string|max:500',
            'trade_name'                => 'nullable|string|max:300',
            'company_type'              => 'required|string|max:200',
            'scope_of_work'             => 'required|string|max:500',
            'description'               => 'nullable|string',
            'registration_number'       => 'nullable|string|max:200',
            'tax_number'                => 'nullable|string|max:200',
            'country'                   => 'nullable|string|max:100',
            'city'                      => 'nullable|string|max:100',
            'address'                   => 'nullable|string',
            // Section B
            'primary_contact_name'         => 'nullable|string|max:255',
            'primary_contact_designation'  => 'nullable|string|max:200',
            'primary_contact_phone'        => 'nullable|string|max:100',
            'primary_contact_email'        => 'nullable|email|max:255',
            'alternate_contact'            => 'nullable|string|max:255',
            'emergency_contact_number'     => 'nullable|string|max:100',
            // Section C
            'site'                      => 'nullable|string|max:255',
            'project'                   => 'nullable|string|max:255',
            'area'                      => 'nullable|string|max:200',
            'zone'                      => 'nullable|string|max:200',
            'department'                => 'nullable|string|max:200',
            'assigned_supervisor'       => 'nullable|string|max:255',
            'assigned_supervisor_id'    => 'nullable|exists:users,id',
            'contract_start_date'       => 'nullable|date',
            'contract_end_date'         => 'nullable|date|after_or_equal:contract_start_date',
            // Section D
            'total_workforce'           => 'nullable|integer|min:0',
            'skilled_workers_count'     => 'nullable|integer|min:0',
            'unskilled_workers_count'   => 'nullable|integer|min:0',
            'supervisors_count'         => 'nullable|integer|min:0',
            'operators_count'           => 'nullable|integer|min:0',
            'drivers_count'             => 'nullable|integer|min:0',
            'safety_staff_count'        => 'nullable|integer|min:0',
            'current_site_headcount'    => 'nullable|integer|min:0',
            'mobilized_date'            => 'nullable|date',
            'demobilized_date'          => 'nullable|date',
            // Section E
            'contractor_status'         => 'nullable|in:Draft,Under Review,Approved,Active,Inactive,Suspended,Expired,Rejected,Blacklisted',
            'compliance_status'         => 'nullable|in:Compliant,Partially Compliant,Non-Compliant,Under Review,Suspended',
            'notes'                     => 'nullable|string',
        ]);

        $user = $request->user();

        try {
            return DB::transaction(function () use ($request, $user) {
                // Generate contractor_code with lock to prevent race conditions
                $year = date('Y');
                $lastCode = Contractor::withTrashed()
                    ->whereYear('created_at', $year)
                    ->lockForUpdate()
                    ->orderByDesc('id')
                    ->value('contractor_code');
                $seq = $lastCode ? (int) substr($lastCode, -4) + 1 : 1;
                $contractorCode = 'CON-' . $year . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);

                $contractor = Contractor::create(array_merge(
                    $request->only([
                        'contractor_name', 'registered_company_name', 'trade_name',
                        'company_type', 'scope_of_work', 'description',
                        'registration_number', 'tax_number', 'country', 'city', 'address',
                        'primary_contact_name', 'primary_contact_designation',
                        'primary_contact_phone', 'primary_contact_email',
                        'alternate_contact', 'emergency_contact_number',
                        'site', 'project', 'area', 'zone', 'department',
                        'assigned_supervisor', 'assigned_supervisor_id',
                        'contract_start_date', 'contract_end_date',
                        'total_workforce', 'skilled_workers_count', 'unskilled_workers_count',
                        'supervisors_count', 'operators_count', 'drivers_count',
                        'safety_staff_count', 'current_site_headcount',
                        'mobilized_date', 'demobilized_date',
                        'compliance_status', 'notes',
                    ]),
                    [
                        'contractor_code'   => $contractorCode,
                        'contractor_status' => $request->input('contractor_status', 'Draft'),
                        'created_by'        => $user?->id,
                        'updated_by'        => $user?->id,
                    ]
                ));

                $contractor->logHistory('Contractor Created', null, $contractor->contractor_status, 'Created by ' . ($user?->full_name ?? $user?->name ?? 'System'));

                NotificationService::contractorCreated($contractor, $user?->id ?? auth()->id());

                return response()->json([
                    'message'    => 'Contractor registered successfully',
                    'contractor' => $contractor->fresh()->loadCount(['contacts', 'documents']),
                ], 201);
            });
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    // ── SHOW ──────────────────────────────────────────────

    public function show(Contractor $contractor): JsonResponse
    {
        $contractor->load([
            'contacts' => fn($q) => $q->orderByDesc('is_primary_contact')->orderBy('name'),
            'documents' => fn($q) => $q->orderBy('expiry_date'),
            'logs' => fn($q) => $q->orderBy('created_at', 'asc'),
            'logs.performer:id,full_name',
            'links' => fn($q) => $q->orderByDesc('created_at')->limit(20),
            'createdBy:id,full_name',
            'approvedBy:id,full_name',
            'assignedSupervisor:id,full_name',
        ]);

        $data = $contractor->toArray();
        $data['is_contract_expired']    = $contractor->is_contract_expired;
        $data['days_to_contract_end']   = $contractor->days_to_contract_end;
        $data['active_documents_count'] = $contractor->active_documents_count;
        $data['compliance_summary']     = $contractor->getComplianceSummary();

        // Append URLs for documents
        if (isset($data['documents'])) {
            foreach ($data['documents'] as &$doc) {
                $doc['url']      = $doc['file_path'] ? asset('storage/' . $doc['file_path']) : null;
                $doc['is_image'] = in_array(strtolower($doc['file_type'] ?? ''), ['jpg', 'jpeg', 'png', 'webp', 'gif']);
            }
        }

        return response()->json($data);
    }

    // ── UPDATE ────────────────────────────────────────────

    public function update(Request $request, Contractor $contractor): JsonResponse
    {
        if ($contractor->contractor_status === 'Blacklisted') {
            return response()->json(['message' => 'Blacklisted contractors cannot be edited.'], 422);
        }

        $request->validate([
            'contractor_name'           => 'sometimes|required|string|max:500',
            'registered_company_name'   => 'nullable|string|max:500',
            'trade_name'                => 'nullable|string|max:300',
            'company_type'              => 'sometimes|required|string|max:200',
            'scope_of_work'             => 'sometimes|required|string|max:500',
            'description'               => 'nullable|string',
            'registration_number'       => 'nullable|string|max:200',
            'tax_number'                => 'nullable|string|max:200',
            'country'                   => 'nullable|string|max:100',
            'city'                      => 'nullable|string|max:100',
            'address'                   => 'nullable|string',
            'primary_contact_name'         => 'nullable|string|max:255',
            'primary_contact_designation'  => 'nullable|string|max:200',
            'primary_contact_phone'        => 'nullable|string|max:100',
            'primary_contact_email'        => 'nullable|email|max:255',
            'alternate_contact'            => 'nullable|string|max:255',
            'emergency_contact_number'     => 'nullable|string|max:100',
            'site'                      => 'nullable|string|max:255',
            'project'                   => 'nullable|string|max:255',
            'area'                      => 'nullable|string|max:200',
            'zone'                      => 'nullable|string|max:200',
            'department'                => 'nullable|string|max:200',
            'assigned_supervisor'       => 'nullable|string|max:255',
            'assigned_supervisor_id'    => 'nullable|exists:users,id',
            'contract_start_date'       => 'nullable|date',
            'contract_end_date'         => 'nullable|date|after_or_equal:contract_start_date',
            'total_workforce'           => 'nullable|integer|min:0',
            'skilled_workers_count'     => 'nullable|integer|min:0',
            'unskilled_workers_count'   => 'nullable|integer|min:0',
            'supervisors_count'         => 'nullable|integer|min:0',
            'operators_count'           => 'nullable|integer|min:0',
            'drivers_count'             => 'nullable|integer|min:0',
            'safety_staff_count'        => 'nullable|integer|min:0',
            'current_site_headcount'    => 'nullable|integer|min:0',
            'mobilized_date'            => 'nullable|date',
            'demobilized_date'          => 'nullable|date',
            'compliance_status'         => 'nullable|in:Compliant,Partially Compliant,Non-Compliant,Under Review,Suspended',
            'notes'                     => 'nullable|string',
        ]);

        $fillable = [
            'contractor_name', 'registered_company_name', 'trade_name',
            'company_type', 'scope_of_work', 'description',
            'registration_number', 'tax_number', 'country', 'city', 'address',
            'primary_contact_name', 'primary_contact_designation',
            'primary_contact_phone', 'primary_contact_email',
            'alternate_contact', 'emergency_contact_number',
            'site', 'project', 'area', 'zone', 'department',
            'assigned_supervisor', 'assigned_supervisor_id',
            'contract_start_date', 'contract_end_date',
            'total_workforce', 'skilled_workers_count', 'unskilled_workers_count',
            'supervisors_count', 'operators_count', 'drivers_count',
            'safety_staff_count', 'current_site_headcount',
            'mobilized_date', 'demobilized_date',
            'compliance_status', 'notes',
        ];

        $fields = ['updated_by' => Auth::id()];
        foreach ($fillable as $col) {
            if ($request->has($col)) {
                $fields[$col] = $request->input($col);
            }
        }

        try {
            DB::transaction(function () use ($contractor, $fields) {
                $contractor->update($fields);
                $contractor->logHistory('Contractor Updated');
            });

            return response()->json([
                'message'    => 'Contractor updated',
                'contractor' => $contractor->fresh()->loadCount(['contacts', 'documents']),
            ]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    // ── DELETE ────────────────────────────────────────────

    public function destroy(Contractor $contractor): JsonResponse
    {
        if (! in_array($contractor->contractor_status, ['Draft', 'Rejected'])) {
            return response()->json([
                'message' => 'Only Draft or Rejected contractors can be deleted.',
            ], 422);
        }

        try {
            $contractor->deleted_by = Auth::user()?->full_name ?? 'System';
            $contractor->save();
            $contractor->logHistory('Contractor Deleted', $contractor->contractor_status, 'Deleted');
            $contractor->delete();
            RecycleBinController::logDeleteAction('contractor', $contractor);

            return response()->json(['message' => 'Contractor deleted']);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    // ── CHANGE STATUS ─────────────────────────────────────

    public function changeStatus(Request $request, Contractor $contractor): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:Draft,Under Review,Approved,Active,Inactive,Suspended,Expired,Rejected,Blacklisted',
            'notes'  => 'nullable|string',
            'reason' => 'nullable|string',
        ]);

        $newStatus = $request->status;
        $oldStatus = $contractor->contractor_status;

        // Guard transitions
        $allowed = $this->getAllowedTransitions($oldStatus);
        if (! in_array($newStatus, $allowed)) {
            return response()->json([
                'message' => "Cannot transition from '{$oldStatus}' to '{$newStatus}'.",
            ], 422);
        }

        // Require reason for suspension
        if ($newStatus === 'Suspended' && empty($request->reason)) {
            return response()->json(['message' => 'Suspension reason is required.'], 422);
        }

        $updates = [
            'contractor_status' => $newStatus,
            'updated_by'        => Auth::id(),
        ];

        if ($newStatus === 'Approved') {
            $updates['approved_at']    = now();
            $updates['approved_by']    = auth()->user()?->full_name ?? auth()->user()?->name;
            $updates['approved_by_id'] = Auth::id();
        }

        if ($newStatus === 'Suspended') {
            $updates['suspended_at']      = now();
            $updates['suspension_reason'] = $request->reason;
        }

        if (in_array($newStatus, ['Active']) && $oldStatus === 'Suspended') {
            // Reactivation — clear suspension fields
            $updates['suspended_at']      = null;
            $updates['suspension_reason'] = null;
        }

        $contractor->update($updates);
        $contractor->logHistory('Status Changed', $oldStatus, $newStatus, $request->reason ?? $request->notes);

        NotificationService::contractorStatusChanged($contractor, $oldStatus, $newStatus, Auth::id());

        return response()->json([
            'message'    => "Status changed to {$newStatus}",
            'contractor' => $contractor->fresh()->loadCount(['contacts', 'documents']),
        ]);
    }

    private function getAllowedTransitions(string $current): array
    {
        return match ($current) {
            'Draft'        => ['Under Review', 'Approved', 'Rejected'],
            'Under Review' => ['Approved', 'Rejected'],
            'Approved'     => ['Active', 'Rejected'],
            'Active'       => ['Inactive', 'Suspended', 'Expired', 'Blacklisted'],
            'Inactive'     => ['Active', 'Blacklisted'],
            'Suspended'    => ['Active', 'Blacklisted'],
            'Expired'      => ['Active', 'Blacklisted'],
            'Rejected'     => ['Under Review', 'Blacklisted'],
            'Blacklisted'  => [],
            default        => [],
        };
    }

    // ── CONTACTS ──────────────────────────────────────────

    public function addContact(Request $request, Contractor $contractor): JsonResponse
    {
        $request->validate([
            'name'                 => 'required|string|max:255',
            'designation'          => 'nullable|string|max:200',
            'role'                 => 'nullable|string|max:200',
            'phone'                => 'nullable|string|max:100',
            'email'                => 'nullable|email|max:255',
            'id_number'            => 'nullable|string|max:100',
            'is_primary_contact'   => 'nullable|boolean',
            'is_site_supervisor'   => 'nullable|boolean',
            'is_safety_rep'        => 'nullable|boolean',
            'is_emergency_contact' => 'nullable|boolean',
            'status'               => 'nullable|in:Active,Inactive',
            'notes'                => 'nullable|string',
        ]);

        return DB::transaction(function () use ($request, $contractor) {
            // Unset primary if new contact is primary
            if ($request->input('is_primary_contact')) {
                $contractor->contacts()->update(['is_primary_contact' => false]);
            }

            $contact = $contractor->contacts()->create($request->only([
                'name', 'designation', 'role', 'phone', 'email', 'id_number',
                'is_primary_contact', 'is_site_supervisor', 'is_safety_rep',
                'is_emergency_contact', 'status', 'notes',
            ]));

            // Sync denormalized primary contact fields
            if ($request->input('is_primary_contact')) {
                $contractor->update([
                    'primary_contact_name'        => $contact->name,
                    'primary_contact_designation'  => $contact->designation,
                    'primary_contact_phone'        => $contact->phone,
                    'primary_contact_email'        => $contact->email,
                ]);
            }

            $contractor->logHistory('Contact Added', null, null, $contact->name . ' (' . ($contact->role ?? 'N/A') . ')');

            return response()->json([
                'message' => 'Contact added',
                'contact' => $contact,
            ], 201);
        });
    }

    public function updateContact(Request $request, Contractor $contractor, ContractorContact $contact): JsonResponse
    {
        if ($contact->contractor_id !== $contractor->id) {
            return response()->json(['message' => 'Contact not found for this contractor.'], 404);
        }

        $request->validate([
            'name'                 => 'sometimes|required|string|max:255',
            'designation'          => 'nullable|string|max:200',
            'role'                 => 'nullable|string|max:200',
            'phone'                => 'nullable|string|max:100',
            'email'                => 'nullable|email|max:255',
            'id_number'            => 'nullable|string|max:100',
            'is_primary_contact'   => 'nullable|boolean',
            'is_site_supervisor'   => 'nullable|boolean',
            'is_safety_rep'        => 'nullable|boolean',
            'is_emergency_contact' => 'nullable|boolean',
            'status'               => 'nullable|in:Active,Inactive',
            'notes'                => 'nullable|string',
        ]);

        return DB::transaction(function () use ($request, $contractor, $contact) {
            if ($request->input('is_primary_contact')) {
                $contractor->contacts()->where('id', '!=', $contact->id)->update(['is_primary_contact' => false]);
            }

            $contact->update($request->only([
                'name', 'designation', 'role', 'phone', 'email', 'id_number',
                'is_primary_contact', 'is_site_supervisor', 'is_safety_rep',
                'is_emergency_contact', 'status', 'notes',
            ]));

            if ($contact->is_primary_contact) {
                $contractor->update([
                    'primary_contact_name'        => $contact->name,
                    'primary_contact_designation'  => $contact->designation,
                    'primary_contact_phone'        => $contact->phone,
                    'primary_contact_email'        => $contact->email,
                ]);
            }

            $contractor->logHistory('Contact Updated', null, null, $contact->name);

            return response()->json([
                'message' => 'Contact updated',
                'contact' => $contact->fresh(),
            ]);
        });
    }

    public function removeContact(Request $request, Contractor $contractor, ContractorContact $contact): JsonResponse
    {
        if ($contact->contractor_id !== $contractor->id) {
            return response()->json(['message' => 'Contact not found for this contractor.'], 404);
        }

        $contactName = $contact->name;
        $contact->delete();

        // If primary was removed, clear denormalized fields
        if ($contact->is_primary_contact) {
            $contractor->update([
                'primary_contact_name'        => null,
                'primary_contact_designation'  => null,
                'primary_contact_phone'        => null,
                'primary_contact_email'        => null,
            ]);
        }

        $contractor->logHistory('Contact Removed', null, null, $contactName);

        return response()->json(['message' => 'Contact removed']);
    }

    // ── DOCUMENTS ─────────────────────────────────────────

    public function uploadDocument(Request $request, Contractor $contractor): JsonResponse
    {
        $request->validate([
            'document_type'   => 'required|string|max:200',
            'document_number' => 'nullable|string|max:300',
            'issue_date'      => 'nullable|date',
            'expiry_date'     => 'nullable|date|after_or_equal:issue_date',
            'issued_by'       => 'nullable|string|max:255',
            'remarks'         => 'nullable|string',
            'document'        => 'nullable|file|max:20480|mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx',
        ]);

        $user = $request->user();

        return DB::transaction(function () use ($request, $contractor, $user) {
            $filePath     = null;
            $originalName = null;
            $fileType     = null;
            $fileSizeKb   = null;

            if ($request->hasFile('document')) {
                $file         = $request->file('document');
                $folder       = 'contractors/' . $contractor->id . '/docs';
                $filePath     = $file->store($folder, 'public');
                $originalName = $file->getClientOriginalName();
                $fileType     = $file->getClientOriginalExtension();
                $fileSizeKb   = (int) ($file->getSize() / 1024);
            }

            $doc = $contractor->documents()->create([
                'document_type'   => $request->document_type,
                'document_number' => $request->document_number,
                'issue_date'      => $request->issue_date,
                'expiry_date'     => $request->expiry_date,
                'issued_by'       => $request->issued_by,
                'remarks'         => $request->remarks,
                'file_path'       => $filePath,
                'original_name'   => $originalName,
                'file_type'       => $fileType,
                'file_size_kb'    => $fileSizeKb,
                'uploaded_by'     => $user?->id,
                'uploaded_by_name' => $user?->full_name ?? $user?->name,
            ]);

            $contractor->logHistory('Document Uploaded', null, null, $request->document_type);

            return response()->json([
                'message'  => 'Document uploaded',
                'document' => $doc,
            ], 201);
        });
    }

    public function updateDocument(Request $request, Contractor $contractor, ContractorDocument $document): JsonResponse
    {
        if ($document->contractor_id !== $contractor->id) {
            return response()->json(['message' => 'Document not found for this contractor.'], 404);
        }

        $request->validate([
            'document_type'   => 'sometimes|required|string|max:200',
            'document_number' => 'nullable|string|max:300',
            'issue_date'      => 'nullable|date',
            'expiry_date'     => 'nullable|date|after_or_equal:issue_date',
            'issued_by'       => 'nullable|string|max:255',
            'remarks'         => 'nullable|string',
            'document'        => 'nullable|file|max:20480|mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx',
        ]);

        $fields = [];
        foreach (['document_type', 'document_number', 'issue_date', 'expiry_date', 'issued_by', 'remarks'] as $col) {
            if ($request->has($col)) $fields[$col] = $request->input($col);
        }

        if ($request->hasFile('document')) {
            // Delete old file
            if ($document->file_path) {
                Storage::disk('public')->delete($document->file_path);
            }
            $file = $request->file('document');
            $folder = 'contractors/' . $contractor->id . '/docs';
            $fields['file_path']     = $file->store($folder, 'public');
            $fields['original_name'] = $file->getClientOriginalName();
            $fields['file_type']     = $file->getClientOriginalExtension();
            $fields['file_size_kb']  = (int) ($file->getSize() / 1024);
        }

        $document->update($fields);
        $contractor->logHistory('Document Updated', null, null, $document->document_type);

        return response()->json([
            'message'  => 'Document updated',
            'document' => $document->fresh(),
        ]);
    }

    public function removeDocument(Request $request, Contractor $contractor, ContractorDocument $document): JsonResponse
    {
        if ($document->contractor_id !== $contractor->id) {
            return response()->json(['message' => 'Document not found for this contractor.'], 404);
        }

        if ($document->file_path) {
            Storage::disk('public')->delete($document->file_path);
        }

        $docType = $document->document_type;
        $document->delete();

        $contractor->logHistory('Document Removed', null, null, $docType);

        return response()->json(['message' => 'Document removed']);
    }

    public function verifyDocument(Request $request, Contractor $contractor, ContractorDocument $document): JsonResponse
    {
        if ($document->contractor_id !== $contractor->id) {
            return response()->json(['message' => 'Document not found for this contractor.'], 404);
        }

        $request->validate([
            'verification_status' => 'required|in:Verified,Rejected',
            'verified_date'       => 'nullable|date',
            'remarks'             => 'nullable|string',
        ]);

        $user = $request->user();

        $document->update([
            'verification_status' => $request->verification_status,
            'verified_by'         => $user?->full_name ?? $user?->name,
            'verified_by_id'      => $user?->id,
            'verified_date'       => $request->verified_date ?? now()->toDateString(),
            'remarks'             => $request->remarks ?? $document->remarks,
        ]);

        $contractor->logHistory('Document Verified', null, null, $document->document_type . ': ' . $request->verification_status);

        return response()->json([
            'message'  => 'Document verification updated',
            'document' => $document->fresh(),
        ]);
    }

    // ── STATS ─────────────────────────────────────────────

    public function stats(Request $request): JsonResponse
    {
        $year = $request->get('year', now()->year);

        // KPIs — single query
        $raw = DB::selectOne("
            SELECT
                COUNT(*) as total_contractors,
                SUM(is_active = 1) as active_contractors,
                SUM(contractor_status = 'Approved') as approved_not_active,
                SUM(is_suspended = 1) as suspended,
                SUM(contractor_status = 'Expired') as expired,
                SUM(has_expired_documents = 1) as with_expired_docs,
                SUM(has_expiring_documents = 1 AND has_expired_documents = 0) as with_expiring_docs,
                SUM(contract_end_date BETWEEN ? AND ?) as contracts_expiring_soon,
                SUM(CASE WHEN is_active = 1 THEN COALESCE(current_site_headcount, 0) ELSE 0 END) as total_workforce
            FROM contractors WHERE deleted_at IS NULL
        ", [now()->startOfDay(), now()->addDays(30)]);

        $kpis = [
            'total_contractors'       => (int) ($raw->total_contractors ?? 0),
            'active_contractors'      => (int) ($raw->active_contractors ?? 0),
            'approved_not_active'     => (int) ($raw->approved_not_active ?? 0),
            'suspended'               => (int) ($raw->suspended ?? 0),
            'expired'                 => (int) ($raw->expired ?? 0),
            'with_expired_docs'       => (int) ($raw->with_expired_docs ?? 0),
            'with_expiring_docs'      => (int) ($raw->with_expiring_docs ?? 0),
            'contracts_expiring_soon' => (int) ($raw->contracts_expiring_soon ?? 0),
            'total_workforce'         => (int) ($raw->total_workforce ?? 0),
        ];

        // By status
        $byStatus = Contractor::select('contractor_status as status', DB::raw('COUNT(*) as count'))
            ->groupBy('contractor_status')
            ->orderByDesc('count')
            ->get();

        // By compliance
        $byCompliance = Contractor::select('compliance_status as status', DB::raw('COUNT(*) as count'))
            ->groupBy('compliance_status')
            ->orderByDesc('count')
            ->get();

        // By type (top 10)
        $byType = Contractor::select('company_type', DB::raw('COUNT(*) as count'))
            ->groupBy('company_type')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        // By site
        $bySite = Contractor::select('site', DB::raw('COUNT(*) as count'))
            ->whereNotNull('site')
            ->where('site', '!=', '')
            ->groupBy('site')
            ->orderByDesc('count')
            ->get();

        // Expiry alerts (top 15 urgent documents)
        $expiryAlerts = ContractorDocument::join('contractors', 'contractor_documents.contractor_id', '=', 'contractors.id')
            ->whereNotNull('contractor_documents.expiry_date')
            ->where('contractor_documents.expiry_date', '<=', now()->addDays(60))
            ->whereNull('contractors.deleted_at')
            ->select([
                'contractors.contractor_code',
                'contractors.contractor_name',
                'contractor_documents.document_type',
                'contractor_documents.expiry_date',
                'contractor_documents.status',
            ])
            ->orderBy('contractor_documents.expiry_date')
            ->limit(15)
            ->get()
            ->map(function ($item) {
                $days = (int) now()->startOfDay()->diffInDays($item->expiry_date, false);
                $item->days_to_expiry = $days;
                return $item;
            });

        // Contract expiry alerts (top 10)
        $contractExpiryAlerts = Contractor::whereBetween('contract_end_date', [now()->startOfDay(), now()->addDays(60)])
            ->select('contractor_code', 'contractor_name', 'contract_end_date')
            ->orderBy('contract_end_date')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                $item->days_remaining = (int) now()->startOfDay()->diffInDays($item->contract_end_date, false);
                return $item;
            });

        // Monthly trend (last 12 months)
        $monthlyTrend = Contractor::select(
                DB::raw("DATE_FORMAT(created_at, '%Y-%m') as month"),
                DB::raw('COUNT(*) as contractors_added'),
                DB::raw("SUM(CASE WHEN contractor_status = 'Active' THEN 1 ELSE 0 END) as activated")
            )
            ->where('created_at', '>=', now()->subMonths(12)->startOfMonth())
            ->groupBy(DB::raw("DATE_FORMAT(created_at, '%Y-%m')"))
            ->orderBy('month')
            ->get();

        // Performance summary (top 10 by linked activity)
        $performanceSummary = ContractorModuleLink::select(
                'contractor_id',
                DB::raw("SUM(CASE WHEN module_type = 'permit' THEN 1 ELSE 0 END) as permit_count"),
                DB::raw("SUM(CASE WHEN module_type = 'incident' THEN 1 ELSE 0 END) as incident_count"),
                DB::raw("SUM(CASE WHEN module_type = 'violation' THEN 1 ELSE 0 END) as violation_count"),
                DB::raw('COUNT(*) as total_links')
            )
            ->groupBy('contractor_id')
            ->orderByDesc('total_links')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                $contractor = Contractor::select('contractor_name')->find($item->contractor_id);
                $item->contractor_name = $contractor?->contractor_name ?? 'Unknown';
                return $item;
            });

        return response()->json([
            'kpis'                    => $kpis,
            'by_status'               => $byStatus,
            'by_compliance'           => $byCompliance,
            'by_type'                 => $byType,
            'by_site'                 => $bySite,
            'expiry_alerts'           => $expiryAlerts,
            'contract_expiry_alerts'  => $contractExpiryAlerts,
            'monthly_trend'           => $monthlyTrend,
            'performance_summary'     => $performanceSummary,
        ]);
    }

    // ── LINKED RECORDS ────────────────────────────────────

    public function linkedRecords(Request $request, Contractor $contractor): JsonResponse
    {
        $query = $contractor->links();

        if ($v = $request->get('module_type')) $query->where('module_type', $v);
        if ($v = $request->get('date_from'))   $query->whereDate('link_date', '>=', $v);
        if ($v = $request->get('date_to'))     $query->whereDate('link_date', '<=', $v);

        $links = $query->orderByDesc('created_at')->get();

        // Group by module type
        $grouped = $links->groupBy('module_type')->map(function ($items, $type) {
            return [
                'module_type' => $type,
                'count'       => $items->count(),
                'latest'      => $items->take(5)->values(),
            ];
        })->values();

        return response()->json([
            'grouped' => $grouped,
            'total'   => $links->count(),
            'items'   => $links->take(50)->values(),
        ]);
    }

    public function addLink(Request $request, Contractor $contractor): JsonResponse
    {
        $request->validate([
            'module_type'  => 'required|string|max:100',
            'module_id'    => 'required|integer',
            'module_code'  => 'nullable|string|max:100',
            'module_title' => 'nullable|string|max:500',
            'link_date'    => 'nullable|date',
        ]);

        $link = $contractor->links()->create($request->only([
            'module_type', 'module_id', 'module_code', 'module_title', 'link_date',
        ]));

        $contractor->logHistory(
            'Module Link Added',
            null,
            null,
            $request->module_type . ($request->module_code ? ': ' . $request->module_code : '')
        );

        return response()->json([
            'message' => 'Link added',
            'link'    => $link,
        ], 201);
    }

    // ── PERFORMANCE ───────────────────────────────────────

    public function performance(Request $request, Contractor $contractor): JsonResponse
    {
        $links = $contractor->links;

        $summary = [
            'incident_count'  => $links->where('module_type', 'incident')->count(),
            'violation_count' => $links->where('module_type', 'violation')->count(),
            'permit_count'    => $links->where('module_type', 'permit')->count(),
            'rams_count'      => $links->where('module_type', 'rams')->count(),
            'observation_count' => $links->where('module_type', 'observation')->count(),
            'campaign_count'  => $links->where('module_type', 'campaign')->count(),
            'training_count'  => $links->where('module_type', 'training_record')->count(),
        ];

        // Monthly activity (last 12 months)
        $monthlyActivity = ContractorModuleLink::where('contractor_id', $contractor->id)
            ->where('created_at', '>=', now()->subMonths(12)->startOfMonth())
            ->select(
                DB::raw("DATE_FORMAT(created_at, '%Y-%m') as month"),
                DB::raw("SUM(CASE WHEN module_type = 'incident' THEN 1 ELSE 0 END) as incidents"),
                DB::raw("SUM(CASE WHEN module_type = 'violation' THEN 1 ELSE 0 END) as violations"),
                DB::raw("SUM(CASE WHEN module_type = 'permit' THEN 1 ELSE 0 END) as permits")
            )
            ->groupBy(DB::raw("DATE_FORMAT(created_at, '%Y-%m')"))
            ->orderBy('month')
            ->get();

        return response()->json([
            'summary'          => $summary,
            'monthly_activity' => $monthlyActivity,
        ]);
    }

    // ── EXPORT ────────────────────────────────────────────

    public function export(Request $request)
    {
        $query = Contractor::query();

        // Apply same filters as index
        if ($s = $request->get('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('contractor_code', 'like', "%{$s}%")
                  ->orWhere('contractor_name', 'like', "%{$s}%")
                  ->orWhere('primary_contact_name', 'like', "%{$s}%");
            });
        }
        if ($v = $request->get('contractor_status'))  $query->where('contractor_status', $v);
        if ($v = $request->get('compliance_status'))   $query->where('compliance_status', $v);
        if ($v = $request->get('company_type'))        $query->where('company_type', $v);
        if ($v = $request->get('site'))                $query->where('site', 'like', "%{$v}%");

        $contractors = $query->orderBy('contractor_name')->get();

        $headers = [
            'Contractor Code', 'Contractor Name', 'Company Type',
            'Scope of Work', 'Registration No.', 'Status',
            'Compliance Status', 'Site', 'Area',
            'Primary Contact', 'Phone', 'Email',
            'Contract Start', 'Contract End',
            'Total Workforce', 'Current Headcount',
            'Has Expired Docs', 'Next Expiry Date', 'Notes',
        ];

        $rows = $contractors->map(fn ($c) => [
            $c->contractor_code,
            $c->contractor_name,
            $c->company_type,
            $c->scope_of_work,
            $c->registration_number,
            $c->contractor_status,
            $c->compliance_status,
            $c->site,
            $c->area,
            $c->primary_contact_name,
            $c->primary_contact_phone,
            $c->primary_contact_email,
            $c->contract_start_date?->format('Y-m-d'),
            $c->contract_end_date?->format('Y-m-d'),
            $c->total_workforce,
            $c->current_site_headcount,
            $c->has_expired_documents ? 'Yes' : 'No',
            $c->next_expiry_date?->format('Y-m-d'),
            $c->notes,
        ])->toArray();

        $format = $request->get('format', 'csv');
        return $this->exportAs($headers, $rows, 'Contractor Records', $format);
    }

    // ── LIST ACTIVE (for dropdowns) ───────────────────────

    public function listActive(): JsonResponse
    {
        $contractors = Contractor::whereIn('contractor_status', ['Approved', 'Active'])
            ->select('id', 'contractor_code', 'contractor_name')
            ->orderBy('contractor_name')
            ->get();

        return response()->json($contractors);
    }
}
