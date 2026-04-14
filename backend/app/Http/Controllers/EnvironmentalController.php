<?php

namespace App\Http\Controllers;

use App\Models\EnvironmentalAspect;
use App\Models\EnvironmentalRisk;
use App\Models\WasteRecord;
use App\Models\EnvironmentalMonitoring;
use App\Models\ResourceConsumption;
use App\Models\EnvironmentalIncident;
use App\Models\EnvironmentalInspection;
use App\Models\EnvironmentalComplianceRegister;
use App\Models\EnvironmentalObjective;
use App\Models\EnvironmentalAction;
use App\Models\EnvironmentalLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Constants\StatusConstants;
use App\Services\NotificationService;

class EnvironmentalController extends Controller
{
    // ════════════════════════════════════════════════
    //  DASHBOARD STATS
    // ════════════════════════════════════════════════

    public function stats(Request $request): JsonResponse
    {
        // KPIs — optimized with grouped queries
        $aspectStats = DB::selectOne("
            SELECT COUNT(*) as total, SUM(risk_level IN ('High','Critical')) as significant
            FROM environmental_aspects WHERE deleted_at IS NULL
        ");
        $highRisks = EnvironmentalRisk::whereIn('risk_rating', ['High', 'Critical'])->count();
        $incidentOpen = EnvironmentalIncident::where('status', '!=', 'Closed')->count();
        $pendingInsp = EnvironmentalInspection::whereIn('status', ['Scheduled', 'Pending', 'In Progress'])->count();

        $complianceStats = DB::selectOne("
            SELECT COUNT(*) as total, SUM(compliance_status = 'Compliant') as compliant
            FROM environmental_compliance_register WHERE deleted_at IS NULL
        ");
        $totalCompliance = (int) ($complianceStats->total ?? 0);
        $compliantCount = (int) ($complianceStats->compliant ?? 0);

        $wasteThisMonth = WasteRecord::whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->count();
        $exceedances = EnvironmentalMonitoring::where('compliance_status', 'Non-Compliant')
            ->whereMonth('monitoring_date', now()->month)->whereYear('monitoring_date', now()->year)->count();

        $actionStats = DB::selectOne("
            SELECT
                SUM(status NOT IN ('Closed','Achieved')) as active_objectives,
                0 as placeholder
            FROM environmental_objectives WHERE deleted_at IS NULL
        ");
        $activeObjectives = (int) ($actionStats->active_objectives ?? 0);

        $actionCounts = DB::selectOne("
            SELECT
                SUM(status IN ('Open','In Progress')) as open_actions,
                SUM(status = 'Overdue' OR (status IN ('Open','In Progress') AND due_date < NOW())) as overdue_actions
            FROM environmental_actions WHERE deleted_at IS NULL
        ");

        $thisMonthConsumption = ResourceConsumption::whereMonth('reading_date', now()->month)->whereYear('reading_date', now()->year)->sum('consumption_value');
        $lastMonthConsumption = ResourceConsumption::whereMonth('reading_date', now()->subMonth()->month)->whereYear('reading_date', now()->subMonth()->year)->sum('consumption_value');
        $consumptionTrend = $lastMonthConsumption > 0 ? round((($thisMonthConsumption - $lastMonthConsumption) / $lastMonthConsumption) * 100, 1) : 0;

        $kpis = [
            'total_aspects'              => (int) ($aspectStats->total ?? 0),
            'significant_aspects'        => (int) ($aspectStats->significant ?? 0),
            'high_risks'                 => $highRisks,
            'open_incidents'             => $incidentOpen,
            'pending_inspections'        => $pendingInsp,
            'compliance_rate'            => $totalCompliance > 0 ? round(($compliantCount / $totalCompliance) * 100, 1) : 100,
            'waste_this_month'           => $wasteThisMonth,
            'exceedances_this_month'     => $exceedances,
            'active_objectives'          => $activeObjectives,
            'open_actions'               => (int) ($actionCounts->open_actions ?? 0),
            'overdue_actions'            => (int) ($actionCounts->overdue_actions ?? 0),
            'resource_consumption_trend' => $consumptionTrend,
        ];

        // Waste by type
        $wasteByType = WasteRecord::select('waste_type', DB::raw('SUM(quantity) as total_quantity'))
            ->groupBy('waste_type')
            ->orderByDesc('total_quantity')
            ->get();

        // Resource trend (last 6 months)
        $resourceTrend = ResourceConsumption::select(
                DB::raw("DATE_FORMAT(reading_date, '%Y-%m') as month"),
                'resource_type',
                DB::raw('SUM(consumption_value) as total')
            )
            ->where('reading_date', '>=', now()->subMonths(6)->startOfMonth())
            ->groupBy('month', 'resource_type')
            ->orderBy('month')
            ->get();

        // Incidents by severity
        $incidentsBySeverity = EnvironmentalIncident::select('severity', DB::raw('COUNT(*) as count'))
            ->groupBy('severity')
            ->get();

        // Compliance by status
        $complianceByStatus = EnvironmentalComplianceRegister::select('compliance_status', DB::raw('COUNT(*) as count'))
            ->groupBy('compliance_status')
            ->get();

        // Objectives progress (top 5 by deadline)
        $objectivesProgress = EnvironmentalObjective::select('id', 'title', 'progress_percentage', 'status', 'deadline')
            ->whereNotIn('status', ['Closed'])
            ->orderBy('deadline')
            ->limit(5)
            ->get();

        // Top open actions
        $topOpenActions = EnvironmentalAction::with('assignedToUser:id,full_name')
            ->whereIn('status', ['Open', 'In Progress', 'Overdue'])
            ->orderByRaw("FIELD(priority, 'Critical', 'High', 'Medium', 'Low')")
            ->orderBy('due_date')
            ->limit(10)
            ->get();

        return response()->json([
            'kpis'                 => $kpis,
            'waste_by_type'        => $wasteByType,
            'resource_trend'       => $resourceTrend,
            'incidents_by_severity' => $incidentsBySeverity,
            'compliance_by_status' => $complianceByStatus,
            'objectives_progress'  => $objectivesProgress,
            'top_open_actions'     => $topOpenActions,
        ]);
    }

    // ════════════════════════════════════════════════
    //  ASPECTS & IMPACTS
    // ════════════════════════════════════════════════

    public function indexAspects(Request $request): JsonResponse
    {
        $query = EnvironmentalAspect::query()->with('responsible:id,full_name')
            ->withCount('actions');

        if ($s = $request->input('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('activity', 'like', "%{$s}%")
                  ->orWhere('aspect_description', 'like', "%{$s}%")
                  ->orWhere('aspect_code', 'like', "%{$s}%");
            });
        }
        if ($v = $request->input('aspect_category')) $query->where('aspect_category', $v);
        if ($v = $request->input('impact_type'))      $query->where('impact_type', $v);
        if ($v = $request->input('risk_level'))       $query->where('risk_level', $v);
        if ($v = $request->input('status'))           $query->where('status', $v);
        if ($v = $request->input('area'))             $query->where('area', $v);
        if ($v = $request->input('department'))       $query->where('department', $v);
        if ($v = $request->input('date_from'))        $query->whereDate('created_at', '>=', $v);
        if ($v = $request->input('date_to'))          $query->whereDate('created_at', '<=', $v);

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        $results = $query->orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'data'     => $results->items(),
            'total'    => $results->total(),
            'page'     => $results->currentPage(),
            'per_page' => $results->perPage(),
            'last_page' => $results->lastPage(),
        ]);
    }

    public function storeAspect(Request $request): JsonResponse
    {
        $data = $request->validate([
            'activity'            => 'required|string|max:500',
            'aspect_description'  => 'required|string',
            'impact_description'  => 'nullable|string',
            'aspect_category'     => 'required|string|max:200',
            'impact_type'         => 'nullable|string|max:200',
            'location'            => 'nullable|string|max:255',
            'area'                => 'nullable|string|max:200',
            'department'          => 'nullable|string|max:200',
            'severity'            => 'nullable|integer|min:1|max:4',
            'likelihood'          => 'nullable|integer|min:1|max:4',
            'controls'            => 'nullable|string',
            'additional_controls' => 'nullable|string',
            'responsible_person'  => 'nullable|string|max:255',
            'responsible_id'      => 'nullable|exists:users,id',
            'review_date'         => 'nullable|date',
            'status'              => 'nullable|in:Active,Under Review,Controlled,Closed',
            'notes'               => 'nullable|string',
        ]);

        $data['created_by'] = auth()->id();
        $data['updated_by'] = auth()->id();

        try {
            $aspect = DB::transaction(function () use ($data) {
                $aspect = EnvironmentalAspect::create($data);
                $aspect->logHistory('Aspect Created', null, $aspect->status);
                return $aspect;
            });

            NotificationService::environmentalAspectAssigned($aspect, auth()->id());

            return response()->json(['message' => 'Aspect created', 'aspect' => $aspect->load('responsible:id,full_name')], 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function showAspect(EnvironmentalAspect $aspect): JsonResponse
    {
        $aspect->load([
            'responsible:id,full_name',
            'risks',
            'actions.assignedToUser:id,full_name',
            'createdBy:id,full_name',
        ]);
        $logs = EnvironmentalLog::where('log_type', 'aspect')
            ->where('linked_id', $aspect->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json(['aspect' => $aspect, 'logs' => $logs]);
    }

    public function updateAspect(Request $request, EnvironmentalAspect $aspect): JsonResponse
    {
        $data = $request->validate([
            'activity'            => 'sometimes|required|string|max:500',
            'aspect_description'  => 'sometimes|required|string',
            'impact_description'  => 'nullable|string',
            'aspect_category'     => 'sometimes|required|string|max:200',
            'impact_type'         => 'nullable|string|max:200',
            'location'            => 'nullable|string|max:255',
            'area'                => 'nullable|string|max:200',
            'department'          => 'nullable|string|max:200',
            'severity'            => 'nullable|integer|min:1|max:4',
            'likelihood'          => 'nullable|integer|min:1|max:4',
            'controls'            => 'nullable|string',
            'additional_controls' => 'nullable|string',
            'responsible_person'  => 'nullable|string|max:255',
            'responsible_id'      => 'nullable|exists:users,id',
            'review_date'         => 'nullable|date',
            'status'              => 'nullable|in:Active,Under Review,Controlled,Closed',
            'notes'               => 'nullable|string',
        ]);

        try {
            $oldStatus = $aspect->status;
            $oldResponsible = $aspect->responsible_id;
            $data['updated_by'] = auth()->id();
            $aspect->update($data);
            $aspect->logHistory('Aspect Updated', $oldStatus, $aspect->status);

            // Notify if responsible person changed
            if (isset($data['responsible_id']) && $data['responsible_id'] !== $oldResponsible) {
                NotificationService::environmentalAspectAssigned($aspect, auth()->id());
            }

            return response()->json(['message' => 'Aspect updated', 'aspect' => $aspect->fresh()->load('responsible:id,full_name')]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function destroyAspect(EnvironmentalAspect $aspect): JsonResponse
    {
        try {
            $aspect->deleted_by = Auth::user()?->full_name ?? 'System';
            $aspect->save();
            $aspect->logHistory('Aspect Deleted', $aspect->status, 'Deleted');
            $cascaded = RecycleBinController::cascadeSoftDelete('env_aspect', $aspect);
            $aspect->delete();
            RecycleBinController::logDeleteAction('env_aspect', $aspect, null, $cascaded);
            return response()->json(['message' => 'Aspect deleted']);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function exportAspects(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $query = EnvironmentalAspect::query();
        if ($v = $request->input('aspect_category')) $query->where('aspect_category', $v);
        if ($v = $request->input('risk_level'))      $query->where('risk_level', $v);
        if ($v = $request->input('status'))          $query->where('status', $v);

        $headers = ['Code', 'Activity', 'Description', 'Category', 'Impact Type', 'Area', 'Department', 'Severity', 'Likelihood', 'Risk Score', 'Risk Level', 'Status', 'Responsible', 'Review Date', 'Created'];

        return $this->streamCsv('environmental_aspects', $headers, $query, function ($item) {
            return [
                $item->aspect_code, $item->activity, $item->aspect_description,
                $item->aspect_category, $item->impact_type, $item->area, $item->department,
                $item->severity, $item->likelihood, $item->risk_score, $item->risk_level,
                $item->status, $item->responsible_person, $item->review_date?->format('Y-m-d'),
                $item->created_at->format('Y-m-d H:i'),
            ];
        });
    }

    // ════════════════════════════════════════════════
    //  ENVIRONMENTAL RISKS
    // ════════════════════════════════════════════════

    public function indexRisks(Request $request): JsonResponse
    {
        $query = EnvironmentalRisk::query()->with(['aspect:id,aspect_code,activity', 'responsible:id,full_name']);

        if ($s = $request->input('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('hazard_description', 'like', "%{$s}%")
                  ->orWhere('risk_code', 'like', "%{$s}%");
            });
        }
        if ($v = $request->input('aspect_id'))    $query->where('aspect_id', $v);
        if ($v = $request->input('risk_rating'))  $query->where('risk_rating', $v);
        if ($v = $request->input('status'))       $query->where('status', $v);
        if ($v = $request->input('date_from'))    $query->whereDate('created_at', '>=', $v);
        if ($v = $request->input('date_to'))      $query->whereDate('created_at', '<=', $v);

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        $results = $query->orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'data' => $results->items(), 'total' => $results->total(),
            'page' => $results->currentPage(), 'per_page' => $results->perPage(),
            'last_page' => $results->lastPage(),
        ]);
    }

    public function storeRisk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'aspect_id'           => 'nullable|exists:environmental_aspects,id',
            'hazard_description'  => 'required|string',
            'potential_impact'    => 'nullable|string',
            'likelihood'          => 'nullable|integer|min:1|max:4',
            'severity'            => 'nullable|integer|min:1|max:4',
            'existing_controls'   => 'nullable|string',
            'additional_controls' => 'nullable|string',
            'residual_likelihood' => 'nullable|integer|min:1|max:4',
            'residual_severity'   => 'nullable|integer|min:1|max:4',
            'responsible_person'  => 'nullable|string|max:255',
            'responsible_id'      => 'nullable|exists:users,id',
            'review_date'         => 'nullable|date',
            'status'              => 'nullable|in:Open,Controlled,Closed,Under Review',
            'notes'               => 'nullable|string',
        ]);
        $data['created_by'] = auth()->id();
        $data['updated_by'] = auth()->id();

        try {
            $risk = EnvironmentalRisk::create($data);
            $risk->logHistory('Risk Created', null, $risk->status);

            return response()->json(['message' => 'Risk created', 'risk' => $risk->load('aspect:id,aspect_code,activity')], 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function showRisk(EnvironmentalRisk $risk): JsonResponse
    {
        $risk->load(['aspect:id,aspect_code,activity', 'responsible:id,full_name', 'actions.assignedToUser:id,full_name', 'createdBy:id,full_name']);
        $logs = EnvironmentalLog::where('log_type', 'risk')->where('linked_id', $risk->id)
            ->orderByDesc('created_at')->limit(50)->get();
        return response()->json(['risk' => $risk, 'logs' => $logs]);
    }

    public function updateRisk(Request $request, EnvironmentalRisk $risk): JsonResponse
    {
        $data = $request->validate([
            'aspect_id'           => 'nullable|exists:environmental_aspects,id',
            'hazard_description'  => 'sometimes|required|string',
            'potential_impact'    => 'nullable|string',
            'likelihood'          => 'nullable|integer|min:1|max:4',
            'severity'            => 'nullable|integer|min:1|max:4',
            'existing_controls'   => 'nullable|string',
            'additional_controls' => 'nullable|string',
            'residual_likelihood' => 'nullable|integer|min:1|max:4',
            'residual_severity'   => 'nullable|integer|min:1|max:4',
            'responsible_person'  => 'nullable|string|max:255',
            'responsible_id'      => 'nullable|exists:users,id',
            'review_date'         => 'nullable|date',
            'status'              => 'nullable|in:Open,Controlled,Closed,Under Review',
            'notes'               => 'nullable|string',
        ]);
        try {
            $oldStatus = $risk->status;
            $data['updated_by'] = auth()->id();
            $risk->update($data);
            $risk->logHistory('Risk Updated', $oldStatus, $risk->status);
            return response()->json(['message' => 'Risk updated', 'risk' => $risk->fresh()->load('aspect:id,aspect_code,activity')]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function destroyRisk(EnvironmentalRisk $risk): JsonResponse
    {
        try {
            $risk->deleted_by = Auth::user()?->full_name ?? 'System';
            $risk->save();
            $risk->logHistory('Risk Deleted', $risk->status, 'Deleted');
            $cascaded = RecycleBinController::cascadeSoftDelete('env_risk', $risk);
            $risk->delete();
            RecycleBinController::logDeleteAction('env_risk', $risk, null, $cascaded);
            return response()->json(['message' => 'Risk deleted']);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function exportRisks(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $query = EnvironmentalRisk::query()->with('aspect:id,aspect_code');
        if ($v = $request->input('risk_rating')) $query->where('risk_rating', $v);
        if ($v = $request->input('status'))      $query->where('status', $v);

        $headers = ['Code', 'Aspect Code', 'Hazard', 'Likelihood', 'Severity', 'Risk Score', 'Rating', 'Residual Score', 'Residual Rating', 'Status', 'Responsible', 'Created'];
        return $this->streamCsv('environmental_risks', $headers, $query, function ($item) {
            return [
                $item->risk_code, $item->aspect?->aspect_code, $item->hazard_description,
                $item->likelihood, $item->severity, $item->risk_score, $item->risk_rating,
                $item->residual_risk_score, $item->residual_risk_rating,
                $item->status, $item->responsible_person, $item->created_at->format('Y-m-d H:i'),
            ];
        });
    }

    // ════════════════════════════════════════════════
    //  WASTE MANAGEMENT
    // ════════════════════════════════════════════════

    public function indexWaste(Request $request): JsonResponse
    {
        $query = WasteRecord::query()->with('responsible:id,full_name');

        if ($s = $request->input('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('waste_code', 'like', "%{$s}%")
                  ->orWhere('waste_type', 'like', "%{$s}%")
                  ->orWhere('manifest_number', 'like', "%{$s}%");
            });
        }
        if ($v = $request->input('waste_type'))     $query->where('waste_type', $v);
        if ($v = $request->input('waste_category')) $query->where('waste_category', $v);
        if ($v = $request->input('status'))         $query->where('status', $v);
        if ($v = $request->input('source_area'))    $query->where('source_area', $v);
        if ($v = $request->input('disposal_vendor'))$query->where('disposal_vendor', 'like', "%{$v}%");
        if ($v = $request->input('date_from'))      $query->whereDate('created_at', '>=', $v);
        if ($v = $request->input('date_to'))        $query->whereDate('created_at', '<=', $v);

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        $results = $query->orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'data' => $results->items(), 'total' => $results->total(),
            'page' => $results->currentPage(), 'per_page' => $results->perPage(),
            'last_page' => $results->lastPage(),
        ]);
    }

    public function storeWaste(Request $request): JsonResponse
    {
        $data = $request->validate([
            'waste_type'         => 'required|string|max:200',
            'waste_category'     => 'nullable|in:Hazardous,Non-Hazardous,Recyclable,Other',
            'source_area'        => 'nullable|string|max:255',
            'department'         => 'nullable|string|max:200',
            'quantity'           => 'required|numeric|min:0',
            'unit'               => 'required|string|max:50',
            'storage_location'   => 'nullable|string|max:255',
            'container_type'     => 'nullable|string|max:200',
            'responsible_person' => 'nullable|string|max:255',
            'responsible_id'     => 'nullable|exists:users,id',
            'disposal_method'    => 'nullable|string|max:200',
            'disposal_vendor'    => 'nullable|string|max:255',
            'manifest_number'    => 'nullable|string|max:200',
            'disposal_date'      => 'nullable|date',
            'collection_date'    => 'nullable|date',
            'status'             => 'nullable|in:Pending Collection,In Storage,Collected,Disposed,Recycled',
            'notes'              => 'nullable|string',
        ]);

        // Handle document upload
        if ($request->hasFile('document')) {
            $file = $request->file('document');
            $year = now()->year;
            $name = 'wst-' . time() . '-' . substr(md5(mt_rand()), 0, 6) . '.' . $file->getClientOriginalExtension();
            $data['document_path'] = $file->storeAs("environmental/waste/{$year}", $name, 'public');
        }

        $data['created_by'] = auth()->id();
        $data['updated_by'] = auth()->id();

        try {
            $waste = WasteRecord::create($data);
            $waste->logHistory('Waste Record Created', null, $waste->status);

            return response()->json(['message' => 'Waste record created', 'waste' => $waste], 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function showWaste(WasteRecord $waste): JsonResponse
    {
        $waste->load(['responsible:id,full_name', 'createdBy:id,full_name']);
        $logs = EnvironmentalLog::where('log_type', 'waste')->where('linked_id', $waste->id)
            ->orderByDesc('created_at')->limit(50)->get();
        return response()->json(['waste' => $waste, 'logs' => $logs]);
    }

    public function updateWaste(Request $request, WasteRecord $waste): JsonResponse
    {
        $data = $request->validate([
            'waste_type'         => 'sometimes|required|string|max:200',
            'waste_category'     => 'nullable|in:Hazardous,Non-Hazardous,Recyclable,Other',
            'source_area'        => 'nullable|string|max:255',
            'department'         => 'nullable|string|max:200',
            'quantity'           => 'sometimes|required|numeric|min:0',
            'unit'               => 'sometimes|required|string|max:50',
            'storage_location'   => 'nullable|string|max:255',
            'container_type'     => 'nullable|string|max:200',
            'responsible_person' => 'nullable|string|max:255',
            'responsible_id'     => 'nullable|exists:users,id',
            'disposal_method'    => 'nullable|string|max:200',
            'disposal_vendor'    => 'nullable|string|max:255',
            'manifest_number'    => 'nullable|string|max:200',
            'disposal_date'      => 'nullable|date',
            'collection_date'    => 'nullable|date',
            'status'             => 'nullable|in:Pending Collection,In Storage,Collected,Disposed,Recycled',
            'notes'              => 'nullable|string',
        ]);

        if ($request->hasFile('document')) {
            $file = $request->file('document');
            $year = now()->year;
            $name = 'wst-' . time() . '-' . substr(md5(mt_rand()), 0, 6) . '.' . $file->getClientOriginalExtension();
            $data['document_path'] = $file->storeAs("environmental/waste/{$year}", $name, 'public');
        }

        try {
            $oldStatus = $waste->status;
            $data['updated_by'] = auth()->id();
            $waste->update($data);
            $waste->logHistory('Waste Record Updated', $oldStatus, $waste->status);

            return response()->json(['message' => 'Waste record updated', 'waste' => $waste->fresh()]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function destroyWaste(WasteRecord $waste): JsonResponse
    {
        try {
            $waste->deleted_by = Auth::user()?->full_name ?? 'System';
            $waste->save();
            $waste->logHistory('Waste Record Deleted', $waste->status, 'Deleted');
            $waste->delete();
            RecycleBinController::logDeleteAction('waste_record', $waste);
            return response()->json(['message' => 'Waste record deleted']);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function exportWaste(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $query = WasteRecord::query();
        if ($v = $request->input('waste_type'))     $query->where('waste_type', $v);
        if ($v = $request->input('waste_category')) $query->where('waste_category', $v);
        if ($v = $request->input('status'))         $query->where('status', $v);

        $headers = ['Code', 'Type', 'Category', 'Source Area', 'Quantity', 'Unit', 'Disposal Method', 'Vendor', 'Manifest #', 'Status', 'Collection Date', 'Disposal Date', 'Created'];
        return $this->streamCsv('waste_records', $headers, $query, function ($item) {
            return [
                $item->waste_code, $item->waste_type, $item->waste_category,
                $item->source_area, $item->quantity, $item->unit,
                $item->disposal_method, $item->disposal_vendor, $item->manifest_number,
                $item->status, $item->collection_date?->format('Y-m-d'),
                $item->disposal_date?->format('Y-m-d'), $item->created_at->format('Y-m-d H:i'),
            ];
        });
    }

    // ════════════════════════════════════════════════
    //  MONITORING
    // ════════════════════════════════════════════════

    public function indexMonitoring(Request $request): JsonResponse
    {
        $query = EnvironmentalMonitoring::query()->with('conductedByUser:id,full_name');

        if ($s = $request->input('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('monitoring_code', 'like', "%{$s}%")
                  ->orWhere('parameter', 'like', "%{$s}%");
            });
        }
        if ($v = $request->input('monitoring_type'))   $query->where('monitoring_type', $v);
        if ($v = $request->input('compliance_status')) $query->where('compliance_status', $v);
        if ($v = $request->input('source_area'))       $query->where('source_area', $v);
        if ($v = $request->input('parameter'))         $query->where('parameter', 'like', "%{$v}%");
        if ($v = $request->input('date_from'))         $query->whereDate('monitoring_date', '>=', $v);
        if ($v = $request->input('date_to'))           $query->whereDate('monitoring_date', '<=', $v);

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        $results = $query->orderByDesc('monitoring_date')->paginate($perPage);

        return response()->json([
            'data' => $results->items(), 'total' => $results->total(),
            'page' => $results->currentPage(), 'per_page' => $results->perPage(),
            'last_page' => $results->lastPage(),
        ]);
    }

    public function storeMonitoring(Request $request): JsonResponse
    {
        $data = $request->validate([
            'monitoring_type'   => 'required|string|max:200',
            'source_area'       => 'nullable|string|max:255',
            'parameter'         => 'required|string|max:255',
            'measured_value'    => 'required|numeric',
            'permissible_limit' => 'nullable|numeric',
            'unit'              => 'required|string|max:100',
            'monitoring_date'   => 'required|date',
            'monitoring_time'   => 'nullable|date_format:H:i',
            'conducted_by'      => 'nullable|string|max:255',
            'conducted_by_id'   => 'nullable|exists:users,id',
            'equipment_used'    => 'nullable|string|max:255',
            'remarks'           => 'nullable|string',
        ]);

        if ($request->hasFile('report')) {
            $file = $request->file('report');
            $year = now()->year;
            $name = 'mon-' . time() . '-' . substr(md5(mt_rand()), 0, 6) . '.' . $file->getClientOriginalExtension();
            $data['report_path'] = $file->storeAs("environmental/monitoring/{$year}", $name, 'public');
        }

        $data['created_by'] = auth()->id();

        try {
            $mon = EnvironmentalMonitoring::create($data);
            $mon->logHistory('Monitoring Record Created', null, $mon->compliance_status);

            return response()->json(['message' => 'Monitoring record created', 'monitoring' => $mon], 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function showMonitoring(EnvironmentalMonitoring $mon): JsonResponse
    {
        $mon->load(['conductedByUser:id,full_name', 'createdBy:id,full_name']);
        $logs = EnvironmentalLog::where('log_type', 'monitoring')->where('linked_id', $mon->id)
            ->orderByDesc('created_at')->limit(50)->get();
        return response()->json(['monitoring' => $mon, 'logs' => $logs]);
    }

    public function updateMonitoring(Request $request, EnvironmentalMonitoring $mon): JsonResponse
    {
        $data = $request->validate([
            'monitoring_type'   => 'sometimes|required|string|max:200',
            'source_area'       => 'nullable|string|max:255',
            'parameter'         => 'sometimes|required|string|max:255',
            'measured_value'    => 'sometimes|required|numeric',
            'permissible_limit' => 'nullable|numeric',
            'unit'              => 'sometimes|required|string|max:100',
            'monitoring_date'   => 'sometimes|required|date',
            'monitoring_time'   => 'nullable|date_format:H:i',
            'conducted_by'      => 'nullable|string|max:255',
            'conducted_by_id'   => 'nullable|exists:users,id',
            'equipment_used'    => 'nullable|string|max:255',
            'remarks'           => 'nullable|string',
        ]);

        if ($request->hasFile('report')) {
            $file = $request->file('report');
            $year = now()->year;
            $name = 'mon-' . time() . '-' . substr(md5(mt_rand()), 0, 6) . '.' . $file->getClientOriginalExtension();
            $data['report_path'] = $file->storeAs("environmental/monitoring/{$year}", $name, 'public');
        }

        try {
            $oldStatus = $mon->compliance_status;
            $mon->update($data);
            $mon->logHistory('Monitoring Record Updated', $oldStatus, $mon->compliance_status);

            return response()->json(['message' => 'Monitoring record updated', 'monitoring' => $mon->fresh()]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function destroyMonitoring(EnvironmentalMonitoring $mon): JsonResponse
    {
        try {
            $mon->deleted_by = Auth::user()?->full_name ?? 'System';
            $mon->save();
            $mon->logHistory('Monitoring Record Deleted');
            $mon->delete();
            RecycleBinController::logDeleteAction('env_monitoring', $mon);
            return response()->json(['message' => 'Monitoring record deleted']);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function exportMonitoring(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $query = EnvironmentalMonitoring::query();
        if ($v = $request->input('monitoring_type'))   $query->where('monitoring_type', $v);
        if ($v = $request->input('compliance_status')) $query->where('compliance_status', $v);

        $headers = ['Code', 'Type', 'Source Area', 'Parameter', 'Value', 'Limit', 'Unit', 'Compliance', 'Date', 'Conducted By', 'Equipment'];
        return $this->streamCsv('environmental_monitoring', $headers, $query, function ($item) {
            return [
                $item->monitoring_code, $item->monitoring_type, $item->source_area,
                $item->parameter, $item->measured_value, $item->permissible_limit,
                $item->unit, $item->compliance_status, $item->monitoring_date->format('Y-m-d'),
                $item->conducted_by, $item->equipment_used,
            ];
        });
    }

    // ════════════════════════════════════════════════
    //  RESOURCE CONSUMPTION
    // ════════════════════════════════════════════════

    public function indexResources(Request $request): JsonResponse
    {
        $query = ResourceConsumption::query()->with('recordedByUser:id,full_name');

        if ($s = $request->input('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('consumption_code', 'like', "%{$s}%")
                  ->orWhere('resource_type', 'like', "%{$s}%");
            });
        }
        if ($v = $request->input('resource_type')) $query->where('resource_type', $v);
        if ($v = $request->input('location'))      $query->where('location', 'like', "%{$v}%");
        if ($v = $request->input('area'))           $query->where('area', $v);
        if ($v = $request->input('date_from'))     $query->whereDate('reading_date', '>=', $v);
        if ($v = $request->input('date_to'))       $query->whereDate('reading_date', '<=', $v);

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        $results = $query->orderByDesc('reading_date')->paginate($perPage);

        return response()->json([
            'data' => $results->items(), 'total' => $results->total(),
            'page' => $results->currentPage(), 'per_page' => $results->perPage(),
            'last_page' => $results->lastPage(),
        ]);
    }

    public function storeResource(Request $request): JsonResponse
    {
        $data = $request->validate([
            'resource_type'     => 'required|string|max:100',
            'consumption_value' => 'required|numeric|min:0',
            'unit'              => 'required|string|max:50',
            'meter_reading'     => 'nullable|numeric',
            'previous_reading'  => 'nullable|numeric',
            'reading_date'      => 'required|date',
            'billing_period'    => 'nullable|string|max:100',
            'location'          => 'nullable|string|max:255',
            'area'              => 'nullable|string|max:200',
            'department'        => 'nullable|string|max:200',
            'recorded_by'       => 'nullable|string|max:255',
            'recorded_by_id'    => 'nullable|exists:users,id',
            'cost'              => 'nullable|numeric|min:0',
            'currency'          => 'nullable|string|max:10',
            'remarks'           => 'nullable|string',
        ]);

        if ($request->hasFile('document')) {
            $file = $request->file('document');
            $year = now()->year;
            $name = 'res-' . time() . '-' . substr(md5(mt_rand()), 0, 6) . '.' . $file->getClientOriginalExtension();
            $data['document_path'] = $file->storeAs("environmental/resources/{$year}", $name, 'public');
        }

        try {
            $res = ResourceConsumption::create($data);
            $res->logHistory('Resource Record Created');

            return response()->json(['message' => 'Resource record created', 'resource' => $res], 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function showResource(ResourceConsumption $res): JsonResponse
    {
        $res->load('recordedByUser:id,full_name');
        $logs = EnvironmentalLog::where('log_type', 'resource')->where('linked_id', $res->id)
            ->orderByDesc('created_at')->limit(50)->get();
        return response()->json(['resource' => $res, 'logs' => $logs]);
    }

    public function updateResource(Request $request, ResourceConsumption $res): JsonResponse
    {
        $data = $request->validate([
            'resource_type'     => 'sometimes|required|string|max:100',
            'consumption_value' => 'sometimes|required|numeric|min:0',
            'unit'              => 'sometimes|required|string|max:50',
            'meter_reading'     => 'nullable|numeric',
            'previous_reading'  => 'nullable|numeric',
            'reading_date'      => 'sometimes|required|date',
            'billing_period'    => 'nullable|string|max:100',
            'location'          => 'nullable|string|max:255',
            'area'              => 'nullable|string|max:200',
            'department'        => 'nullable|string|max:200',
            'recorded_by'       => 'nullable|string|max:255',
            'recorded_by_id'    => 'nullable|exists:users,id',
            'cost'              => 'nullable|numeric|min:0',
            'currency'          => 'nullable|string|max:10',
            'remarks'           => 'nullable|string',
        ]);

        if ($request->hasFile('document')) {
            $file = $request->file('document');
            $year = now()->year;
            $name = 'res-' . time() . '-' . substr(md5(mt_rand()), 0, 6) . '.' . $file->getClientOriginalExtension();
            $data['document_path'] = $file->storeAs("environmental/resources/{$year}", $name, 'public');
        }

        try {
            $res->update($data);
            $res->logHistory('Resource Record Updated');

            return response()->json(['message' => 'Resource record updated', 'resource' => $res->fresh()]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function destroyResource(ResourceConsumption $res): JsonResponse
    {
        try {
            $res->deleted_by = Auth::user()?->full_name ?? 'System';
            $res->save();
            $res->logHistory('Resource Record Deleted');
            $res->delete();
            RecycleBinController::logDeleteAction('env_resource', $res);
            return response()->json(['message' => 'Resource record deleted']);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function exportResources(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $query = ResourceConsumption::query();
        if ($v = $request->input('resource_type')) $query->where('resource_type', $v);
        if ($v = $request->input('area'))          $query->where('area', $v);

        $headers = ['Code', 'Type', 'Value', 'Unit', 'Meter Reading', 'Previous Reading', 'Date', 'Period', 'Location', 'Area', 'Cost', 'Currency'];
        return $this->streamCsv('resource_consumption', $headers, $query, function ($item) {
            return [
                $item->consumption_code, $item->resource_type, $item->consumption_value,
                $item->unit, $item->meter_reading, $item->previous_reading,
                $item->reading_date->format('Y-m-d'), $item->billing_period,
                $item->location, $item->area, $item->cost, $item->currency,
            ];
        });
    }

    // ════════════════════════════════════════════════
    //  ENVIRONMENTAL INCIDENTS
    // ════════════════════════════════════════════════

    public function indexIncidents(Request $request): JsonResponse
    {
        $query = EnvironmentalIncident::query()
            ->with(['reportedByUser:id,full_name', 'assignedToUser:id,full_name']);

        if ($s = $request->input('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('incident_code', 'like', "%{$s}%")
                  ->orWhere('description', 'like', "%{$s}%");
            });
        }
        if ($v = $request->input('incident_type')) $query->where('incident_type', $v);
        if ($v = $request->input('severity'))      $query->where('severity', $v);
        if ($v = $request->input('status'))        $query->where('status', $v);
        if ($v = $request->input('area'))          $query->where('area', $v);
        if ($v = $request->input('date_from'))     $query->whereDate('incident_date', '>=', $v);
        if ($v = $request->input('date_to'))       $query->whereDate('incident_date', '<=', $v);

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        $results = $query->orderByDesc('incident_date')->paginate($perPage);

        return response()->json([
            'data' => $results->items(), 'total' => $results->total(),
            'page' => $results->currentPage(), 'per_page' => $results->perPage(),
            'last_page' => $results->lastPage(),
        ]);
    }

    public function storeIncident(Request $request): JsonResponse
    {
        $data = $request->validate([
            'incident_type'        => 'required|string|max:200',
            'incident_date'        => 'required|date',
            'incident_time'        => 'nullable|date_format:H:i',
            'location'             => 'nullable|string|max:255',
            'area'                 => 'nullable|string|max:200',
            'zone'                 => 'nullable|string|max:200',
            'description'          => 'required|string',
            'environmental_impact' => 'nullable|string',
            'severity'             => 'nullable|in:Low,Medium,High,Critical',
            'immediate_action'     => 'nullable|string',
            'root_cause'           => 'nullable|string',
            'contributing_factors' => 'nullable|string',
            'reported_by'          => 'nullable|string|max:255',
            'reported_by_id'       => 'nullable|exists:users,id',
            'assigned_to'          => 'nullable|string|max:255',
            'assigned_to_id'       => 'nullable|exists:users,id',
            'linked_incident_id'   => 'nullable|integer',
            'status'               => 'nullable|in:Reported,Under Investigation,Action Assigned,In Progress,Closed,Reopened',
            'notes'                => 'nullable|string',
        ]);

        // Multi-file evidence upload
        if ($request->hasFile('evidence')) {
            $request->validate([
                'evidence'   => 'array',
                'evidence.*' => 'file|mimes:jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx|max:10240',
            ]);
        }
        $paths = [];
        if ($request->hasFile('evidence')) {
            $year = now()->year;
            foreach ($request->file('evidence') as $file) {
                $name = 'einc-' . time() . '-' . substr(md5(mt_rand()), 0, 6) . '.' . $file->getClientOriginalExtension();
                $paths[] = $file->storeAs("environmental/incidents/{$year}", $name, 'public');
            }
        }
        if (!empty($paths)) $data['evidence_paths'] = $paths;

        $data['created_by'] = auth()->id();
        $data['updated_by'] = auth()->id();

        try {
            $incident = EnvironmentalIncident::create($data);
            $incident->logHistory('Incident Reported', null, $incident->status);

            return response()->json(['message' => 'Incident reported', 'incident' => $incident], 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function showIncident(EnvironmentalIncident $inc): JsonResponse
    {
        $inc->load(['reportedByUser:id,full_name', 'assignedToUser:id,full_name', 'closedByUser:id,full_name', 'createdBy:id,full_name']);
        $logs = EnvironmentalLog::where('log_type', 'incident')->where('linked_id', $inc->id)
            ->orderByDesc('created_at')->limit(50)->get();
        return response()->json(['incident' => $inc, 'logs' => $logs]);
    }

    public function updateIncident(Request $request, EnvironmentalIncident $inc): JsonResponse
    {
        $data = $request->validate([
            'incident_type'        => 'sometimes|required|string|max:200',
            'incident_date'        => 'sometimes|required|date',
            'incident_time'        => 'nullable|date_format:H:i',
            'location'             => 'nullable|string|max:255',
            'area'                 => 'nullable|string|max:200',
            'zone'                 => 'nullable|string|max:200',
            'description'          => 'sometimes|required|string',
            'environmental_impact' => 'nullable|string',
            'severity'             => 'nullable|in:Low,Medium,High,Critical',
            'immediate_action'     => 'nullable|string',
            'root_cause'           => 'nullable|string',
            'contributing_factors' => 'nullable|string',
            'reported_by'          => 'nullable|string|max:255',
            'reported_by_id'       => 'nullable|exists:users,id',
            'assigned_to'          => 'nullable|string|max:255',
            'assigned_to_id'       => 'nullable|exists:users,id',
            'status'               => 'nullable|in:Reported,Under Investigation,Action Assigned,In Progress,Closed,Reopened',
            'notes'                => 'nullable|string',
        ]);

        if ($request->hasFile('evidence')) {
            $year = now()->year;
            $existing = $inc->evidence_paths ?? [];
            foreach ($request->file('evidence') as $file) {
                $name = 'einc-' . time() . '-' . substr(md5(mt_rand()), 0, 6) . '.' . $file->getClientOriginalExtension();
                $existing[] = $file->storeAs("environmental/incidents/{$year}", $name, 'public');
            }
            $data['evidence_paths'] = $existing;
        }

        try {
            $oldStatus = $inc->status;
            $data['updated_by'] = auth()->id();
            $inc->update($data);
            $inc->logHistory('Incident Updated', $oldStatus, $inc->status);

            return response()->json(['message' => 'Incident updated', 'incident' => $inc->fresh()]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function destroyIncident(EnvironmentalIncident $inc): JsonResponse
    {
        try {
            $inc->deleted_by = Auth::user()?->full_name ?? 'System';
            $inc->save();
            $inc->logHistory('Incident Deleted', $inc->status, 'Deleted');
            $cascaded = RecycleBinController::cascadeSoftDelete('env_incident', $inc);
            $inc->delete();
            RecycleBinController::logDeleteAction('env_incident', $inc, null, $cascaded);
            return response()->json(['message' => 'Incident deleted']);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function closeIncident(Request $request, EnvironmentalIncident $inc): JsonResponse
    {
        $request->validate(['closure_notes' => 'required|string']);

        $oldStatus = $inc->status;
        $inc->update([
            'status'    => StatusConstants::ENV_CLOSED,
            'closed_at' => now(),
            'closed_by' => auth()->id(),
            'notes'     => $inc->notes . "\n\n--- Closure Notes ---\n" . $request->input('closure_notes'),
        ]);
        $inc->logHistory('Incident Closed', $oldStatus, StatusConstants::ENV_CLOSED, $request->input('closure_notes'));

        return response()->json(['message' => 'Incident closed', 'incident' => $inc->fresh()]);
    }

    public function exportIncidents(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $query = EnvironmentalIncident::query();
        if ($v = $request->input('incident_type')) $query->where('incident_type', $v);
        if ($v = $request->input('severity'))      $query->where('severity', $v);
        if ($v = $request->input('status'))        $query->where('status', $v);

        $headers = ['Code', 'Type', 'Date', 'Location', 'Area', 'Severity', 'Status', 'Reported By', 'Assigned To', 'Description', 'Created'];
        return $this->streamCsv('environmental_incidents', $headers, $query, function ($item) {
            return [
                $item->incident_code, $item->incident_type, $item->incident_date->format('Y-m-d'),
                $item->location, $item->area, $item->severity, $item->status,
                $item->reported_by, $item->assigned_to, substr($item->description, 0, 200),
                $item->created_at->format('Y-m-d H:i'),
            ];
        });
    }

    // ════════════════════════════════════════════════
    //  INSPECTIONS
    // ════════════════════════════════════════════════

    public function indexInspections(Request $request): JsonResponse
    {
        $query = EnvironmentalInspection::query()->with('inspector:id,full_name');

        if ($s = $request->input('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('inspection_code', 'like', "%{$s}%")
                  ->orWhere('inspector_name', 'like', "%{$s}%")
                  ->orWhere('findings_summary', 'like', "%{$s}%");
            });
        }
        if ($v = $request->input('inspection_type'))   $query->where('inspection_type', $v);
        if ($v = $request->input('compliance_status')) $query->where('compliance_status', $v);
        if ($v = $request->input('area'))              $query->where('area', $v);
        if ($v = $request->input('inspector_name'))    $query->where('inspector_name', 'like', "%{$v}%");
        if ($v = $request->input('status'))            $query->where('status', $v);
        if ($v = $request->input('date_from'))         $query->whereDate('inspection_date', '>=', $v);
        if ($v = $request->input('date_to'))           $query->whereDate('inspection_date', '<=', $v);

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        $results = $query->orderByDesc('inspection_date')->paginate($perPage);

        return response()->json([
            'data' => $results->items(), 'total' => $results->total(),
            'page' => $results->currentPage(), 'per_page' => $results->perPage(),
            'last_page' => $results->lastPage(),
        ]);
    }

    public function storeInspection(Request $request): JsonResponse
    {
        $data = $request->validate([
            'inspection_type'      => 'required|string|max:200',
            'site'                 => 'nullable|string|max:255',
            'area'                 => 'nullable|string|max:200',
            'zone'                 => 'nullable|string|max:200',
            'department'           => 'nullable|string|max:200',
            'inspection_date'      => 'required|date',
            'inspector_name'       => 'required|string|max:255',
            'inspector_id'         => 'nullable|exists:users,id',
            'findings_summary'     => 'nullable|string',
            'compliance_status'    => 'nullable|in:Compliant,Partially Compliant,Non-Compliant',
            'non_compliance_count' => 'nullable|integer|min:0',
            'positive_findings'    => 'nullable|string',
            'recommendations'      => 'nullable|string',
            'follow_up_date'       => 'nullable|date',
            'status'               => 'nullable|in:Open,Closed,Action Required',
            'notes'                => 'nullable|string',
        ]);

        // Photo uploads
        if ($request->hasFile('photos')) {
            $request->validate([
                'photos'   => 'array',
                'photos.*' => 'file|mimes:jpg,jpeg,png,gif|max:5120',
            ]);
        }
        if ($request->hasFile('report')) {
            $request->validate([
                'report' => 'file|mimes:pdf,doc,docx,xls,xlsx|max:10240',
            ]);
        }
        $photos = [];
        if ($request->hasFile('photos')) {
            $year = now()->year;
            foreach ($request->file('photos') as $file) {
                $name = 'einsp-' . time() . '-' . substr(md5(mt_rand()), 0, 6) . '.' . $file->getClientOriginalExtension();
                $photos[] = $file->storeAs("environmental/inspections/{$year}", $name, 'public');
            }
        }
        if (!empty($photos)) $data['photo_paths'] = $photos;

        // Report upload
        if ($request->hasFile('report')) {
            $file = $request->file('report');
            $year = now()->year;
            $name = 'einsp-rpt-' . time() . '-' . substr(md5(mt_rand()), 0, 6) . '.' . $file->getClientOriginalExtension();
            $data['report_path'] = $file->storeAs("environmental/inspections/{$year}", $name, 'public');
        }

        $data['created_by'] = auth()->id();
        $data['updated_by'] = auth()->id();

        try {
            $inspection = EnvironmentalInspection::create($data);
            $inspection->logHistory('Inspection Created', null, $inspection->status);

            $response = ['message' => 'Inspection created', 'inspection' => $inspection];
            if (($data['non_compliance_count'] ?? 0) > 0) {
                $response['suggest_action'] = true;
            }

            return response()->json($response, 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function showInspection(EnvironmentalInspection $ins): JsonResponse
    {
        $ins->load(['inspector:id,full_name', 'createdBy:id,full_name']);
        $logs = EnvironmentalLog::where('log_type', 'inspection')->where('linked_id', $ins->id)
            ->orderByDesc('created_at')->limit(50)->get();
        return response()->json(['inspection' => $ins, 'logs' => $logs]);
    }

    public function updateInspection(Request $request, EnvironmentalInspection $ins): JsonResponse
    {
        $data = $request->validate([
            'inspection_type'      => 'sometimes|required|string|max:200',
            'site'                 => 'nullable|string|max:255',
            'area'                 => 'nullable|string|max:200',
            'zone'                 => 'nullable|string|max:200',
            'department'           => 'nullable|string|max:200',
            'inspection_date'      => 'sometimes|required|date',
            'inspector_name'       => 'sometimes|required|string|max:255',
            'inspector_id'         => 'nullable|exists:users,id',
            'findings_summary'     => 'nullable|string',
            'compliance_status'    => 'nullable|in:Compliant,Partially Compliant,Non-Compliant',
            'non_compliance_count' => 'nullable|integer|min:0',
            'positive_findings'    => 'nullable|string',
            'recommendations'      => 'nullable|string',
            'follow_up_date'       => 'nullable|date',
            'status'               => 'nullable|in:Open,Closed,Action Required',
            'notes'                => 'nullable|string',
        ]);

        if ($request->hasFile('photos')) {
            $year = now()->year;
            $existing = $ins->photo_paths ?? [];
            foreach ($request->file('photos') as $file) {
                $name = 'einsp-' . time() . '-' . substr(md5(mt_rand()), 0, 6) . '.' . $file->getClientOriginalExtension();
                $existing[] = $file->storeAs("environmental/inspections/{$year}", $name, 'public');
            }
            $data['photo_paths'] = $existing;
        }

        if ($request->hasFile('report')) {
            $file = $request->file('report');
            $year = now()->year;
            $name = 'einsp-rpt-' . time() . '-' . substr(md5(mt_rand()), 0, 6) . '.' . $file->getClientOriginalExtension();
            $data['report_path'] = $file->storeAs("environmental/inspections/{$year}", $name, 'public');
        }

        try {
            $oldStatus = $ins->status;
            $data['updated_by'] = auth()->id();
            $ins->update($data);
            $ins->logHistory('Inspection Updated', $oldStatus, $ins->status);

            return response()->json(['message' => 'Inspection updated', 'inspection' => $ins->fresh()]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function destroyInspection(EnvironmentalInspection $ins): JsonResponse
    {
        try {
            $ins->deleted_by = Auth::user()?->full_name ?? 'System';
            $ins->save();
            $ins->logHistory('Inspection Deleted', $ins->status, 'Deleted');
            $cascaded = RecycleBinController::cascadeSoftDelete('env_inspection', $ins);
            $ins->delete();
            RecycleBinController::logDeleteAction('env_inspection', $ins, null, $cascaded);
            return response()->json(['message' => 'Inspection deleted']);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function exportInspections(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $query = EnvironmentalInspection::query();
        if ($v = $request->input('inspection_type'))   $query->where('inspection_type', $v);
        if ($v = $request->input('compliance_status')) $query->where('compliance_status', $v);

        $headers = ['Code', 'Type', 'Site', 'Area', 'Date', 'Inspector', 'Compliance', 'NC Count', 'Status', 'Follow-Up Date'];
        return $this->streamCsv('environmental_inspections', $headers, $query, function ($item) {
            return [
                $item->inspection_code, $item->inspection_type, $item->site,
                $item->area, $item->inspection_date->format('Y-m-d'),
                $item->inspector_name, $item->compliance_status, $item->non_compliance_count,
                $item->status, $item->follow_up_date?->format('Y-m-d'),
            ];
        });
    }

    // ════════════════════════════════════════════════
    //  COMPLIANCE REGISTER
    // ════════════════════════════════════════════════

    public function indexCompliance(Request $request): JsonResponse
    {
        $query = EnvironmentalComplianceRegister::query()->with('responsible:id,full_name');

        if ($s = $request->input('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('compliance_code', 'like', "%{$s}%")
                  ->orWhere('regulation_name', 'like', "%{$s}%");
            });
        }
        if ($v = $request->input('compliance_status'))    $query->where('compliance_status', $v);
        if ($v = $request->input('regulatory_authority')) $query->where('regulatory_authority', 'like', "%{$v}%");
        if ($v = $request->input('applicable_area'))     $query->where('applicable_area', $v);
        if ($v = $request->input('due_from'))            $query->whereDate('next_due_date', '>=', $v);
        if ($v = $request->input('due_to'))              $query->whereDate('next_due_date', '<=', $v);

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        $results = $query->orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'data' => $results->items(), 'total' => $results->total(),
            'page' => $results->currentPage(), 'per_page' => $results->perPage(),
            'last_page' => $results->lastPage(),
        ]);
    }

    public function storeCompliance(Request $request): JsonResponse
    {
        $data = $request->validate([
            'regulation_name'          => 'required|string|max:500',
            'regulatory_authority'     => 'nullable|string|max:255',
            'requirement_type'         => 'nullable|string|max:200',
            'requirement_description'  => 'required|string',
            'applicable_area'          => 'nullable|string|max:255',
            'applicable_process'       => 'nullable|string|max:255',
            'responsible_person'       => 'nullable|string|max:255',
            'responsible_id'           => 'nullable|exists:users,id',
            'compliance_status'        => 'nullable|in:Compliant,Non-Compliant,Pending Review,Expired,Under Action',
            'last_checked_date'        => 'nullable|date',
            'next_due_date'            => 'nullable|date',
            'remarks'                  => 'nullable|string',
        ]);

        if ($request->hasFile('document')) {
            $file = $request->file('document');
            $year = now()->year;
            $name = 'comp-' . time() . '-' . substr(md5(mt_rand()), 0, 6) . '.' . $file->getClientOriginalExtension();
            $data['document_path'] = $file->storeAs("environmental/compliance/{$year}", $name, 'public');
        }

        $data['created_by'] = auth()->id();
        $data['updated_by'] = auth()->id();

        try {
            $comp = EnvironmentalComplianceRegister::create($data);
            $comp->logHistory('Compliance Item Created', null, $comp->compliance_status);

            return response()->json(['message' => 'Compliance item created', 'compliance' => $comp], 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function showCompliance(EnvironmentalComplianceRegister $comp): JsonResponse
    {
        $comp->load(['responsible:id,full_name', 'createdBy:id,full_name']);
        $logs = EnvironmentalLog::where('log_type', 'compliance')->where('linked_id', $comp->id)
            ->orderByDesc('created_at')->limit(50)->get();
        return response()->json(['compliance' => $comp, 'logs' => $logs]);
    }

    public function updateCompliance(Request $request, EnvironmentalComplianceRegister $comp): JsonResponse
    {
        $data = $request->validate([
            'regulation_name'          => 'sometimes|required|string|max:500',
            'regulatory_authority'     => 'nullable|string|max:255',
            'requirement_type'         => 'nullable|string|max:200',
            'requirement_description'  => 'sometimes|required|string',
            'applicable_area'          => 'nullable|string|max:255',
            'applicable_process'       => 'nullable|string|max:255',
            'responsible_person'       => 'nullable|string|max:255',
            'responsible_id'           => 'nullable|exists:users,id',
            'compliance_status'        => 'nullable|in:Compliant,Non-Compliant,Pending Review,Expired,Under Action',
            'last_checked_date'        => 'nullable|date',
            'next_due_date'            => 'nullable|date',
            'remarks'                  => 'nullable|string',
        ]);

        if ($request->hasFile('document')) {
            $file = $request->file('document');
            $year = now()->year;
            $name = 'comp-' . time() . '-' . substr(md5(mt_rand()), 0, 6) . '.' . $file->getClientOriginalExtension();
            $data['document_path'] = $file->storeAs("environmental/compliance/{$year}", $name, 'public');
        }

        try {
            $oldStatus = $comp->compliance_status;
            $data['updated_by'] = auth()->id();
            $comp->update($data);
            $comp->logHistory('Compliance Item Updated', $oldStatus, $comp->compliance_status);

            return response()->json(['message' => 'Compliance item updated', 'compliance' => $comp->fresh()]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function destroyCompliance(EnvironmentalComplianceRegister $comp): JsonResponse
    {
        try {
            $comp->deleted_by = Auth::user()?->full_name ?? 'System';
            $comp->save();
            $comp->logHistory('Compliance Item Deleted', $comp->compliance_status, 'Deleted');
            $cascaded = RecycleBinController::cascadeSoftDelete('env_compliance', $comp);
            $comp->delete();
            RecycleBinController::logDeleteAction('env_compliance', $comp, null, $cascaded);
            return response()->json(['message' => 'Compliance item deleted']);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function exportCompliance(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $query = EnvironmentalComplianceRegister::query();
        if ($v = $request->input('compliance_status')) $query->where('compliance_status', $v);

        $headers = ['Code', 'Regulation', 'Authority', 'Type', 'Description', 'Area', 'Status', 'Last Checked', 'Next Due', 'Responsible'];
        return $this->streamCsv('environmental_compliance', $headers, $query, function ($item) {
            return [
                $item->compliance_code, $item->regulation_name, $item->regulatory_authority,
                $item->requirement_type, substr($item->requirement_description, 0, 200),
                $item->applicable_area, $item->compliance_status,
                $item->last_checked_date?->format('Y-m-d'), $item->next_due_date?->format('Y-m-d'),
                $item->responsible_person,
            ];
        });
    }

    // ════════════════════════════════════════════════
    //  OBJECTIVES
    // ════════════════════════════════════════════════

    public function indexObjectives(Request $request): JsonResponse
    {
        $query = EnvironmentalObjective::query()->with('responsible:id,full_name');

        if ($s = $request->input('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('objective_code', 'like', "%{$s}%")
                  ->orWhere('title', 'like', "%{$s}%");
            });
        }
        if ($v = $request->input('category'))       $query->where('category', $v);
        if ($v = $request->input('status'))         $query->where('status', $v);
        if ($v = $request->input('responsible_id')) $query->where('responsible_id', $v);
        if ($v = $request->input('deadline_from'))  $query->whereDate('deadline', '>=', $v);
        if ($v = $request->input('deadline_to'))    $query->whereDate('deadline', '<=', $v);

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        $results = $query->orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'data' => $results->items(), 'total' => $results->total(),
            'page' => $results->currentPage(), 'per_page' => $results->perPage(),
            'last_page' => $results->lastPage(),
        ]);
    }

    public function storeObjective(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'              => 'required|string|max:500',
            'description'        => 'nullable|string',
            'category'           => 'nullable|string|max:200',
            'target_value'       => 'nullable|numeric',
            'current_value'      => 'nullable|numeric',
            'unit'               => 'nullable|string|max:100',
            'baseline_value'     => 'nullable|numeric',
            'baseline_date'      => 'nullable|date',
            'deadline'           => 'nullable|date',
            'responsible_person' => 'nullable|string|max:255',
            'responsible_id'     => 'nullable|exists:users,id',
            'status'             => 'nullable|in:Planned,In Progress,Achieved,Delayed,Closed',
            'progress_notes'     => 'nullable|string',
        ]);

        $data['created_by'] = auth()->id();
        $data['updated_by'] = auth()->id();

        try {
            $obj = EnvironmentalObjective::create($data);
            $obj->logHistory('Objective Created', null, $obj->status);

            return response()->json(['message' => 'Objective created', 'objective' => $obj], 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function showObjective(EnvironmentalObjective $obj): JsonResponse
    {
        $obj->load(['responsible:id,full_name', 'createdBy:id,full_name']);
        $logs = EnvironmentalLog::where('log_type', 'objective')->where('linked_id', $obj->id)
            ->orderByDesc('created_at')->limit(50)->get();
        return response()->json(['objective' => $obj, 'logs' => $logs]);
    }

    public function updateObjective(Request $request, EnvironmentalObjective $obj): JsonResponse
    {
        $data = $request->validate([
            'title'              => 'sometimes|required|string|max:500',
            'description'        => 'nullable|string',
            'category'           => 'nullable|string|max:200',
            'target_value'       => 'nullable|numeric',
            'current_value'      => 'nullable|numeric',
            'unit'               => 'nullable|string|max:100',
            'baseline_value'     => 'nullable|numeric',
            'baseline_date'      => 'nullable|date',
            'deadline'           => 'nullable|date',
            'responsible_person' => 'nullable|string|max:255',
            'responsible_id'     => 'nullable|exists:users,id',
            'status'             => 'nullable|in:Planned,In Progress,Achieved,Delayed,Closed',
            'progress_notes'     => 'nullable|string',
        ]);

        try {
            $oldStatus = $obj->status;
            $data['updated_by'] = auth()->id();
            $obj->update($data);
            $obj->logHistory('Objective Updated', $oldStatus, $obj->status);

            return response()->json(['message' => 'Objective updated', 'objective' => $obj->fresh()]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function destroyObjective(EnvironmentalObjective $obj): JsonResponse
    {
        try {
            $obj->deleted_by = Auth::user()?->full_name ?? 'System';
            $obj->save();
            $obj->logHistory('Objective Deleted', $obj->status, 'Deleted');
            $cascaded = RecycleBinController::cascadeSoftDelete('env_objective', $obj);
            $obj->delete();
            RecycleBinController::logDeleteAction('env_objective', $obj, null, $cascaded);
            return response()->json(['message' => 'Objective deleted']);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function updateProgress(Request $request, EnvironmentalObjective $obj): JsonResponse
    {
        $data = $request->validate([
            'current_value'  => 'required|numeric',
            'progress_notes' => 'nullable|string',
        ]);

        $oldStatus = $obj->status;
        $data['updated_by'] = auth()->id();
        $obj->update($data);
        $obj->logHistory('Objective Progress Updated', $oldStatus, $obj->status, $request->input('progress_notes'));

        return response()->json(['message' => 'Progress updated', 'objective' => $obj->fresh()]);
    }

    public function exportObjectives(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $query = EnvironmentalObjective::query();
        if ($v = $request->input('category')) $query->where('category', $v);
        if ($v = $request->input('status'))   $query->where('status', $v);

        $headers = ['Code', 'Title', 'Category', 'Target', 'Current', 'Unit', 'Progress %', 'Status', 'Deadline', 'Responsible'];
        return $this->streamCsv('environmental_objectives', $headers, $query, function ($item) {
            return [
                $item->objective_code, $item->title, $item->category,
                $item->target_value, $item->current_value, $item->unit,
                $item->progress_percentage, $item->status,
                $item->deadline?->format('Y-m-d'), $item->responsible_person,
            ];
        });
    }

    // ════════════════════════════════════════════════
    //  ACTIONS
    // ════════════════════════════════════════════════

    public function indexActions(Request $request): JsonResponse
    {
        $query = EnvironmentalAction::query()->with('assignedToUser:id,full_name');

        if ($s = $request->input('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('action_code', 'like', "%{$s}%")
                  ->orWhere('title', 'like', "%{$s}%");
            });
        }
        if ($v = $request->input('linked_type'))    $query->where('linked_type', $v);
        if ($v = $request->input('status'))         $query->where('status', $v);
        if ($v = $request->input('priority'))       $query->where('priority', $v);
        if ($v = $request->input('assigned_to_id')) $query->where('assigned_to_id', $v);
        if ($v = $request->input('date_from'))      $query->whereDate('created_at', '>=', $v);
        if ($v = $request->input('due_from'))       $query->whereDate('due_date', '>=', $v);
        if ($v = $request->input('due_to'))         $query->whereDate('due_date', '<=', $v);
        if ($request->boolean('overdue')) {
            $query->where('due_date', '<', today())->whereIn('status', ['Open', 'In Progress', 'Overdue']);
        }

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        $results = $query->orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'data' => $results->items(), 'total' => $results->total(),
            'page' => $results->currentPage(), 'per_page' => $results->perPage(),
            'last_page' => $results->lastPage(),
        ]);
    }

    public function storeAction(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'          => 'required|string|max:500',
            'description'    => 'nullable|string',
            'linked_type'    => 'nullable|string|max:100',
            'linked_id'      => 'nullable|integer',
            'assigned_to'    => 'nullable|string|max:255',
            'assigned_to_id' => 'nullable|exists:users,id',
            'due_date'       => 'nullable|date',
            'priority'       => 'nullable|in:Low,Medium,High,Critical',
            'status'         => 'nullable|in:Open,In Progress,Completed,Overdue,Closed',
        ]);

        $data['created_by'] = auth()->id();
        $data['updated_by'] = auth()->id();

        try {
            $action = EnvironmentalAction::create($data);
            $action->logHistory('Action Created', null, $action->status);

            return response()->json(['message' => 'Action created', 'action' => $action->load('assignedToUser:id,full_name')], 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function showAction(EnvironmentalAction $action): JsonResponse
    {
        $action->load(['assignedToUser:id,full_name', 'closedByUser:id,full_name', 'createdBy:id,full_name']);
        $logs = EnvironmentalLog::where('log_type', 'action')->where('linked_id', $action->id)
            ->orderByDesc('created_at')->limit(50)->get();
        return response()->json(['action' => $action, 'logs' => $logs]);
    }

    public function updateAction(Request $request, EnvironmentalAction $action): JsonResponse
    {
        $data = $request->validate([
            'title'            => 'sometimes|required|string|max:500',
            'description'      => 'nullable|string',
            'linked_type'      => 'nullable|string|max:100',
            'linked_id'        => 'nullable|integer',
            'assigned_to'      => 'nullable|string|max:255',
            'assigned_to_id'   => 'nullable|exists:users,id',
            'due_date'         => 'nullable|date',
            'priority'         => 'nullable|in:Low,Medium,High,Critical',
            'status'           => 'nullable|in:Open,In Progress,Completed,Overdue,Closed',
            'completion_notes' => 'nullable|string',
        ]);

        // If completing/closing, require completion_notes
        $newStatus = $data['status'] ?? $action->status;
        if (in_array($newStatus, ['Completed', 'Closed']) && empty($data['completion_notes']) && empty($action->completion_notes)) {
            return response()->json(['message' => 'Completion notes are required when closing an action'], 422);
        }

        if (in_array($newStatus, ['Completed', 'Closed'])) {
            $data['closed_at'] = now();
            $data['closed_by'] = auth()->id();
        }

        if ($request->hasFile('evidence')) {
            $file = $request->file('evidence');
            $year = now()->year;
            $name = 'eact-' . time() . '-' . substr(md5(mt_rand()), 0, 6) . '.' . $file->getClientOriginalExtension();
            $data['evidence_path'] = $file->storeAs("environmental/actions/{$year}", $name, 'public');
        }

        try {
            $oldStatus = $action->status;
            $data['updated_by'] = auth()->id();
            $action->update($data);
            $action->logHistory('Action Updated', $oldStatus, $action->status);

            return response()->json(['message' => 'Action updated', 'action' => $action->fresh()->load('assignedToUser:id,full_name')]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function destroyAction(EnvironmentalAction $action): JsonResponse
    {
        try {
            $action->deleted_by = Auth::user()?->full_name ?? 'System';
            $action->save();
            $action->logHistory('Action Deleted', $action->status, 'Deleted');
            $action->delete();
            RecycleBinController::logDeleteAction('env_action', $action);
            return response()->json(['message' => 'Action deleted']);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['error' => 'Operation failed'], 500);
        }
    }

    public function exportActions(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $query = EnvironmentalAction::query();
        if ($v = $request->input('linked_type')) $query->where('linked_type', $v);
        if ($v = $request->input('status'))      $query->where('status', $v);
        if ($v = $request->input('priority'))    $query->where('priority', $v);

        $headers = ['Code', 'Title', 'Linked Type', 'Assigned To', 'Due Date', 'Priority', 'Status', 'Completion Notes', 'Created'];
        return $this->streamCsv('environmental_actions', $headers, $query, function ($item) {
            return [
                $item->action_code, $item->title, $item->linked_type,
                $item->assigned_to, $item->due_date?->format('Y-m-d'),
                $item->priority, $item->status, substr($item->completion_notes ?? '', 0, 200),
                $item->created_at->format('Y-m-d H:i'),
            ];
        });
    }

    // ════════════════════════════════════════════════
    //  CSV STREAM HELPER
    // ════════════════════════════════════════════════

    private function streamCsv(string $filename, array $headers, $query, callable $rowMapper): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $fileName = $filename . '_' . now()->format('Y-m-d_His') . '.csv';

        return response()->streamDownload(function () use ($headers, $query, $rowMapper) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $headers);

            $query->orderByDesc('created_at')->chunk(500, function ($items) use ($handle, $rowMapper) {
                foreach ($items as $item) {
                    fputcsv($handle, $rowMapper($item));
                }
            });

            fclose($handle);
        }, $fileName, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
        ]);
    }
}
