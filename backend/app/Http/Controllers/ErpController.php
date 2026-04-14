<?php

namespace App\Http\Controllers;

use App\Models\Erp;
use App\Http\Traits\ExportsData;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Constants\StatusConstants;

class ErpController extends Controller
{
    use ExportsData;

    // ─── LIST ───────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = Erp::query();

        // Text search
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('erp_code', 'like', "%{$search}%")
                  ->orWhere('incident_controller', 'like', "%{$search}%");
            });
        }

        // Filters
        if ($erpType = $request->get('erp_type')) {
            $query->where('erp_type', $erpType);
        }
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($site = $request->get('site')) {
            $query->where('site', $site);
        }
        if ($riskLevel = $request->get('risk_level')) {
            $query->where('risk_level', $riskLevel);
        }
        if ($request->get('due_for_review') === 'true' || $request->get('due_for_review') === '1') {
            $query->dueForReview();
        }
        if ($from = $request->get('date_from')) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->get('date_to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        $query->withCount('drills')->with('createdBy:id,full_name');

        $perPage = min(100, max(1, (int) $request->get('per_page', 20)));

        $paginated = $query->orderBy('created_at', 'desc')->paginate($perPage);

        $data = collect($paginated->items())->map(fn ($erp) => [
            'id'                    => $erp->id,
            'erp_code'              => $erp->erp_code,
            'title'                 => $erp->title,
            'erp_type'              => $erp->erp_type,
            'version'               => $erp->version,
            'revision_number'       => $erp->revision_number,
            'status'                => $erp->status,
            'site'                  => $erp->site,
            'project'               => $erp->project,
            'area'                  => $erp->area,
            'zone'                  => $erp->zone,
            'department'            => $erp->department,
            'scenario_description'  => $erp->scenario_description,
            'scope'                 => $erp->scope,
            'purpose'               => $erp->purpose,
            'risk_level'            => $erp->risk_level,
            'trigger_conditions'    => $erp->trigger_conditions,
            'incident_controller'   => $erp->incident_controller,
            'emergency_coordinator' => $erp->emergency_coordinator,
            'fire_wardens'          => $erp->fire_wardens,
            'first_aiders'          => $erp->first_aiders,
            'rescue_team'           => $erp->rescue_team,
            'security_team'         => $erp->security_team,
            'medical_team'          => $erp->medical_team,
            'emergency_contacts'    => $erp->emergency_contacts,
            'communication_method'  => $erp->communication_method,
            'radio_channel'         => $erp->radio_channel,
            'alarm_method'          => $erp->alarm_method,
            'assembly_point'        => $erp->assembly_point,
            'muster_point'          => $erp->muster_point,
            'evacuation_route'      => $erp->evacuation_route,
            'response_steps'        => $erp->response_steps,
            'escalation_hierarchy'  => $erp->escalation_hierarchy,
            'required_equipment'    => $erp->required_equipment,
            'equipment_locations'   => $erp->equipment_locations,
            'backup_equipment'      => $erp->backup_equipment,
            'file_path'             => $erp->file_path,
            'file_url'              => $erp->file_url,
            'drawings_path'         => $erp->drawings_path,
            'drawings_url'          => $erp->drawings_url,
            'sop_path'              => $erp->sop_path,
            'notes'                 => $erp->notes,
            'approved_by'           => $erp->approved_by,
            'approved_by_id'        => $erp->approved_by_id,
            'approval_date'         => $erp->approval_date?->format('Y-m-d'),
            'review_frequency'      => $erp->review_frequency,
            'next_review_date'      => $erp->next_review_date?->format('Y-m-d'),
            'due_for_review'        => $erp->due_for_review,
            'drills_count'          => $erp->drills_count,
            'created_by'            => $erp->created_by,
            'created_by_name'       => $erp->createdBy?->full_name,
            'updated_by'            => $erp->updated_by,
            'created_at'            => $erp->created_at?->toISOString(),
            'updated_at'            => $erp->updated_at?->toISOString(),
        ]);

        return response()->json([
            'data'      => $data,
            'total'     => $paginated->total(),
            'page'      => $paginated->currentPage(),
            'per_page'  => $paginated->perPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    // ─── STORE ──────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title'                 => 'required|string|max:255',
            'erp_type'              => 'required|string|max:100',
            'scenario_description'  => 'required|string|min:10',
            'risk_level'            => 'required|string|max:50',
            'site'                  => 'nullable|string|max:255',
            'project'               => 'nullable|string|max:255',
            'area'                  => 'nullable|string|max:255',
            'zone'                  => 'nullable|string|max:255',
            'department'            => 'nullable|string|max:255',
            'scope'                 => 'nullable|string',
            'purpose'               => 'nullable|string',
            'trigger_conditions'    => 'nullable|string',
            'incident_controller'   => 'nullable|string|max:255',
            'emergency_coordinator' => 'nullable|string|max:255',
            'communication_method'  => 'nullable|string|max:255',
            'radio_channel'         => 'nullable|string|max:100',
            'alarm_method'          => 'nullable|string|max:255',
            'assembly_point'        => 'nullable|string|max:255',
            'muster_point'          => 'nullable|string|max:255',
            'evacuation_route'      => 'nullable|string',
            'response_steps'        => 'nullable|string',
            'escalation_hierarchy'  => 'nullable|string',
            'equipment_locations'   => 'nullable|string',
            'backup_equipment'      => 'nullable|string',
            'notes'                 => 'nullable|string',
            'version'               => 'nullable|string|max:50',
            'revision_number'       => 'nullable|string|max:50',
            'review_frequency'      => 'nullable|string|max:50',
            'next_review_date'      => 'nullable|date',
            'file'                  => 'nullable|file|max:20480',
            'drawings'              => 'nullable|file|max:20480',
            'sop'                   => 'nullable|file|max:20480',
        ]);

        $user = $request->user();
        $year = now()->year;

        $erp = DB::transaction(function () use ($request, $user, $year) {
            // Handle file uploads
            $filePath     = null;
            $drawingsPath = null;
            $sopPath      = null;

            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $name = 'erp-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
                $dir  = storage_path("app/public/erps/documents/{$year}");
                $file->move($dir, $name);
                $filePath = "erps/documents/{$year}/{$name}";
            }

            if ($request->hasFile('drawings')) {
                $file = $request->file('drawings');
                $name = 'erp-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
                $dir  = storage_path("app/public/erps/drawings/{$year}");
                $file->move($dir, $name);
                $drawingsPath = "erps/drawings/{$year}/{$name}";
            }

            if ($request->hasFile('sop')) {
                $file = $request->file('sop');
                $name = 'erp-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
                $dir  = storage_path("app/public/erps/sop/{$year}");
                $file->move($dir, $name);
                $sopPath = "erps/sop/{$year}/{$name}";
            }

            $erp = Erp::create([
                'title'                 => $request->input('title'),
                'erp_type'              => $request->input('erp_type'),
                'version'               => $request->input('version', '1.0'),
                'revision_number'       => $request->input('revision_number', '0'),
                'status'                => StatusConstants::ERP_DRAFT,
                'site'                  => $request->input('site'),
                'project'               => $request->input('project'),
                'area'                  => $request->input('area'),
                'zone'                  => $request->input('zone'),
                'department'            => $request->input('department'),
                'scenario_description'  => $request->input('scenario_description'),
                'scope'                 => $request->input('scope'),
                'purpose'               => $request->input('purpose'),
                'risk_level'            => $request->input('risk_level'),
                'trigger_conditions'    => $request->input('trigger_conditions'),
                'incident_controller'   => $request->input('incident_controller'),
                'emergency_coordinator' => $request->input('emergency_coordinator'),
                'fire_wardens'          => $request->input('fire_wardens'),
                'first_aiders'          => $request->input('first_aiders'),
                'rescue_team'           => $request->input('rescue_team'),
                'security_team'         => $request->input('security_team'),
                'medical_team'          => $request->input('medical_team'),
                'emergency_contacts'    => $request->input('emergency_contacts'),
                'communication_method'  => $request->input('communication_method'),
                'radio_channel'         => $request->input('radio_channel'),
                'alarm_method'          => $request->input('alarm_method'),
                'assembly_point'        => $request->input('assembly_point'),
                'muster_point'          => $request->input('muster_point'),
                'evacuation_route'      => $request->input('evacuation_route'),
                'response_steps'        => $request->input('response_steps'),
                'escalation_hierarchy'  => $request->input('escalation_hierarchy'),
                'required_equipment'    => $request->input('required_equipment'),
                'equipment_locations'   => $request->input('equipment_locations'),
                'backup_equipment'      => $request->input('backup_equipment'),
                'file_path'             => $filePath,
                'drawings_path'         => $drawingsPath,
                'sop_path'              => $sopPath,
                'notes'                 => $request->input('notes'),
                'created_by'            => $user->id,
                'review_frequency'      => $request->input('review_frequency'),
                'next_review_date'      => $request->input('next_review_date'),
            ]);

            $erp->logHistory('ERP Created');

            return $erp;
        });

        return response()->json([
            'message' => 'ERP created successfully',
            'erp'     => $this->mapToFrontend($erp->fresh(['createdBy'])),
        ], 201);
    }

    // ─── SHOW ───────────────────────────────────────

    public function show($id): JsonResponse
    {
        $erp = Erp::with(['createdBy:id,full_name', 'logs'])->withCount('drills')->findOrFail($id);

        $recentDrills = $erp->drills()->latest()->take(3)->get();

        $data = $this->mapToFrontend($erp);

        $data['drills'] = [
            'count'  => $erp->drills_count,
            'recent' => $recentDrills->map(fn ($drill) => [
                'id'         => $drill->id,
                'title'      => $drill->title ?? $drill->drill_type ?? null,
                'drill_type' => $drill->drill_type ?? null,
                'drill_date' => $drill->drill_date?->format('Y-m-d'),
                'status'     => $drill->status ?? null,
                'score'      => $drill->score ?? null,
                'created_at' => $drill->created_at?->toISOString(),
            ]),
        ];

        $data['logs'] = $erp->logs->map(fn ($l) => [
            'id'                => $l->id,
            'action'            => $l->action,
            'from_status'       => $l->from_status,
            'to_status'         => $l->to_status,
            'description'       => $l->description,
            'performed_by_name' => $l->performed_by_name,
            'metadata'          => $l->metadata,
            'created_at'        => $l->created_at?->toISOString(),
        ]);

        return response()->json($data);
    }

    // ─── UPDATE ─────────────────────────────────────

    public function update(Request $request, $id): JsonResponse
    {
        $erp = Erp::findOrFail($id);

        $request->validate([
            'title'                 => 'sometimes|required|string|max:255',
            'erp_type'              => 'sometimes|required|string|max:100',
            'scenario_description'  => 'sometimes|required|string|min:10',
            'risk_level'            => 'sometimes|required|string|max:50',
            'site'                  => 'nullable|string|max:255',
            'project'               => 'nullable|string|max:255',
            'area'                  => 'nullable|string|max:255',
            'zone'                  => 'nullable|string|max:255',
            'department'            => 'nullable|string|max:255',
            'scope'                 => 'nullable|string',
            'purpose'               => 'nullable|string',
            'trigger_conditions'    => 'nullable|string',
            'incident_controller'   => 'nullable|string|max:255',
            'emergency_coordinator' => 'nullable|string|max:255',
            'communication_method'  => 'nullable|string|max:255',
            'radio_channel'         => 'nullable|string|max:100',
            'alarm_method'          => 'nullable|string|max:255',
            'assembly_point'        => 'nullable|string|max:255',
            'muster_point'          => 'nullable|string|max:255',
            'evacuation_route'      => 'nullable|string',
            'response_steps'        => 'nullable|string',
            'escalation_hierarchy'  => 'nullable|string',
            'equipment_locations'   => 'nullable|string',
            'backup_equipment'      => 'nullable|string',
            'notes'                 => 'nullable|string',
            'version'               => 'nullable|string|max:50',
            'revision_number'       => 'nullable|string|max:50',
            'review_frequency'      => 'nullable|string|max:50',
            'next_review_date'      => 'nullable|date',
            'file'                  => 'nullable|file|max:20480',
            'drawings'              => 'nullable|file|max:20480',
            'sop'                   => 'nullable|file|max:20480',
        ]);

        $user     = $request->user();
        $year     = now()->year;
        $oldStatus = $erp->status;

        $fields = [];
        $fillableInputs = [
            'title', 'erp_type', 'version', 'revision_number',
            'site', 'project', 'area', 'zone', 'department',
            'scenario_description', 'scope', 'purpose', 'risk_level', 'trigger_conditions',
            'incident_controller', 'emergency_coordinator',
            'communication_method', 'radio_channel', 'alarm_method',
            'assembly_point', 'muster_point', 'evacuation_route', 'response_steps', 'escalation_hierarchy',
            'equipment_locations', 'backup_equipment', 'notes',
            'review_frequency', 'next_review_date',
        ];

        foreach ($fillableInputs as $field) {
            if ($request->has($field)) {
                $fields[$field] = $request->input($field);
            }
        }

        // JSON fields
        $jsonFields = ['fire_wardens', 'first_aiders', 'rescue_team', 'security_team', 'medical_team', 'emergency_contacts', 'required_equipment'];
        foreach ($jsonFields as $jsonField) {
            if ($request->has($jsonField)) {
                $fields[$jsonField] = $request->input($jsonField);
            }
        }

        // Handle file replacements
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $name = 'erp-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
            $dir  = storage_path("app/public/erps/documents/{$year}");
            $file->move($dir, $name);
            $fields['file_path'] = "erps/documents/{$year}/{$name}";
        }

        if ($request->hasFile('drawings')) {
            $file = $request->file('drawings');
            $name = 'erp-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
            $dir  = storage_path("app/public/erps/drawings/{$year}");
            $file->move($dir, $name);
            $fields['drawings_path'] = "erps/drawings/{$year}/{$name}";
        }

        if ($request->hasFile('sop')) {
            $file = $request->file('sop');
            $name = 'erp-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
            $dir  = storage_path("app/public/erps/sop/{$year}");
            $file->move($dir, $name);
            $fields['sop_path'] = "erps/sop/{$year}/{$name}";
        }

        $fields['updated_by'] = $user->id;

        $erp->update($fields);

        $newStatus = $erp->status;
        $erp->logHistory('ERP Updated', $oldStatus, $newStatus);

        return response()->json([
            'message' => 'ERP updated successfully',
            'erp'     => $this->mapToFrontend($erp->fresh(['createdBy'])),
        ]);
    }

    // ─── DELETE ─────────────────────────────────────

    public function destroy($id): JsonResponse
    {
        $erp = Erp::findOrFail($id);

        $erp->deleted_by = Auth::user()?->full_name ?? 'System';
        $erp->save();
        $erp->logHistory('ERP Deleted');
        $cascaded = RecycleBinController::cascadeSoftDelete('erp', $erp);
        $erp->delete();
        RecycleBinController::logDeleteAction('erp', $erp, null, $cascaded);

        return response()->json(['message' => 'ERP deleted successfully']);
    }

    // ─── APPROVE ────────────────────────────────────

    public function approve($id): JsonResponse
    {
        $erp  = Erp::findOrFail($id);
        $user = request()->user();

        if (!in_array($erp->status, ['Draft', 'Under Review'])) {
            return response()->json(['message' => 'Only draft or under-review ERPs can be approved'], 422);
        }

        $oldStatus = $erp->status;

        $erp->update([
            'status'         => StatusConstants::ERP_ACTIVE,
            'approval_date'  => now(),
            'approved_by'    => $user->full_name ?? $user->email,
            'approved_by_id' => $user->id,
        ]);

        $erp->logHistory('ERP Approved', $oldStatus, StatusConstants::ERP_ACTIVE);

        return response()->json([
            'message' => 'ERP approved successfully',
            'erp'     => $this->mapToFrontend($erp->fresh(['createdBy'])),
        ]);
    }

    // ─── STATS ──────────────────────────────────────

    public function stats(): JsonResponse
    {
        $kpis = DB::selectOne("
            SELECT
                COUNT(*) as total,
                SUM(status = 'Active') as active,
                SUM(status = 'Draft') as draft,
                SUM(status = 'Under Review') as under_review,
                SUM(status = 'Obsolete') as obsolete
            FROM erps
            WHERE deleted_at IS NULL
        ");

        $dueForReview = DB::selectOne("
            SELECT COUNT(*) as total
            FROM erps
            WHERE deleted_at IS NULL
              AND next_review_date IS NOT NULL
              AND next_review_date <= DATE_ADD(NOW(), INTERVAL 30 DAY)
        ");

        $byType = DB::select("
            SELECT erp_type, COUNT(*) as total
            FROM erps
            WHERE deleted_at IS NULL AND erp_type IS NOT NULL AND erp_type != ''
            GROUP BY erp_type
            ORDER BY total DESC
        ");

        $recentCreated = DB::select("
            SELECT id, erp_code, title, erp_type, status, risk_level, created_at
            FROM erps
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT 5
        ");

        return response()->json([
            'total'          => (int) ($kpis->total ?? 0),
            'active'         => (int) ($kpis->active ?? 0),
            'draft'          => (int) ($kpis->draft ?? 0),
            'under_review'   => (int) ($kpis->under_review ?? 0),
            'obsolete'       => (int) ($kpis->obsolete ?? 0),
            'due_for_review' => (int) ($dueForReview->total ?? 0),
            'by_type'        => array_map(fn ($r) => ['erp_type' => $r->erp_type, 'total' => (int) $r->total], $byType),
            'recent_created' => array_map(fn ($r) => [
                'id'         => $r->id,
                'erp_code'   => $r->erp_code,
                'title'      => $r->title,
                'erp_type'   => $r->erp_type,
                'status'     => $r->status,
                'risk_level' => $r->risk_level,
                'created_at' => $r->created_at,
            ], $recentCreated),
        ]);
    }

    // ─── EXPORT ─────────────────────────────────────

    public function export(Request $request)
    {
        $query = Erp::query();

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($erpType = $request->get('erp_type')) {
            $query->where('erp_type', $erpType);
        }
        if ($from = $request->get('date_from')) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->get('date_to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        $records = $query->orderBy('created_at', 'desc')->get();

        $headers = [
            'ERP Code', 'Title', 'Type', 'Version', 'Status', 'Site', 'Area',
            'Risk Level', 'Incident Controller', 'Emergency Coordinator',
            'Assembly Point', 'Review Frequency', 'Next Review Date',
            'Approved By', 'Approval Date', 'Created At',
        ];

        $rows = $records->map(fn ($erp) => [
            $erp->erp_code,
            $erp->title,
            $erp->erp_type,
            $erp->version,
            $erp->status,
            $erp->site,
            $erp->area,
            $erp->risk_level,
            $erp->incident_controller,
            $erp->emergency_coordinator,
            $erp->assembly_point,
            $erp->review_frequency,
            $erp->next_review_date?->format('Y-m-d'),
            $erp->approved_by,
            $erp->approval_date?->format('Y-m-d'),
            $erp->created_at?->format('Y-m-d H:i'),
        ])->toArray();

        return $this->exportAs($headers, $rows, 'Emergency_Response_Plans', $request->get('format', 'csv'));
    }

    // ─── Private helpers ────────────────────────────

    private function mapToFrontend(Erp $erp): array
    {
        return [
            'id'                    => $erp->id,
            'erp_code'              => $erp->erp_code,
            'title'                 => $erp->title,
            'erp_type'              => $erp->erp_type,
            'version'               => $erp->version,
            'revision_number'       => $erp->revision_number,
            'status'                => $erp->status,
            'site'                  => $erp->site,
            'project'               => $erp->project,
            'area'                  => $erp->area,
            'zone'                  => $erp->zone,
            'department'            => $erp->department,
            'scenario_description'  => $erp->scenario_description,
            'scope'                 => $erp->scope,
            'purpose'               => $erp->purpose,
            'risk_level'            => $erp->risk_level,
            'trigger_conditions'    => $erp->trigger_conditions,
            'incident_controller'   => $erp->incident_controller,
            'emergency_coordinator' => $erp->emergency_coordinator,
            'fire_wardens'          => $erp->fire_wardens,
            'first_aiders'          => $erp->first_aiders,
            'rescue_team'           => $erp->rescue_team,
            'security_team'         => $erp->security_team,
            'medical_team'          => $erp->medical_team,
            'emergency_contacts'    => $erp->emergency_contacts,
            'communication_method'  => $erp->communication_method,
            'radio_channel'         => $erp->radio_channel,
            'alarm_method'          => $erp->alarm_method,
            'assembly_point'        => $erp->assembly_point,
            'muster_point'          => $erp->muster_point,
            'evacuation_route'      => $erp->evacuation_route,
            'response_steps'        => $erp->response_steps,
            'escalation_hierarchy'  => $erp->escalation_hierarchy,
            'required_equipment'    => $erp->required_equipment,
            'equipment_locations'   => $erp->equipment_locations,
            'backup_equipment'      => $erp->backup_equipment,
            'file_path'             => $erp->file_path,
            'file_url'              => $erp->file_url,
            'drawings_path'         => $erp->drawings_path,
            'drawings_url'          => $erp->drawings_url,
            'sop_path'              => $erp->sop_path,
            'notes'                 => $erp->notes,
            'approved_by'           => $erp->approved_by,
            'approved_by_id'        => $erp->approved_by_id,
            'approval_date'         => $erp->approval_date?->format('Y-m-d'),
            'review_frequency'      => $erp->review_frequency,
            'next_review_date'      => $erp->next_review_date?->format('Y-m-d'),
            'due_for_review'        => $erp->due_for_review,
            'drills_count'          => $erp->drills_count ?? 0,
            'created_by'            => $erp->created_by,
            'created_by_name'       => $erp->createdBy?->full_name,
            'updated_by'            => $erp->updated_by,
            'created_at'            => $erp->created_at?->toISOString(),
            'updated_at'            => $erp->updated_at?->toISOString(),
        ];
    }
}
