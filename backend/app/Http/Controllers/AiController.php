<?php

namespace App\Http\Controllers;

use App\Models\AiAlert;
use App\Models\AiDocumentAnalysis;
use App\Models\AiInsight;
use App\Models\AiLog;
use App\Models\AiQuery;
use App\Models\AiRecommendation;
use App\Services\AiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiController extends Controller
{
    private AiService $aiService;

    public function __construct(AiService $aiService)
    {
        $this->aiService = $aiService;
    }

    // ─── Dashboard ──────────────────────────────────────

    public function dashboard(): JsonResponse
    {
        try {
            $data = $this->aiService->getDashboardData();
            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Failed to load AI dashboard', 'message' => $e->getMessage()], 500);
        }
    }

    // ─── Ask AI ─────────────────────────────────────────

    public function ask(Request $request): JsonResponse
    {
        $request->validate([
            'query' => 'required|string|min:3|max:1000',
            'scope' => 'nullable|string|in:' . implode(',', array_keys(config('ai_config.query_scopes', []))),
        ]);

        $apiKey = config('ai_config.api_key');
        if (empty($apiKey) || $apiKey === 'your-anthropic-api-key') {
            return response()->json([
                'id'            => 0,
                'query_text'    => $request->input('query'),
                'response_text' => null,
                'response_type' => 'general',
                'status'        => 'failed',
                'error_message' => 'AI is not configured — ANTHROPIC_API_KEY is missing. Please set a valid API key in your .env file.',
                'created_at'    => now()->toISOString(),
            ]);
        }

        try {
            $result = $this->aiService->askAi(
                $request->input('query'),
                $request->input('scope', 'all'),
                (int) auth()->id()
            );

            return response()->json($result);
        } catch (\Throwable $e) {
            return response()->json([
                'id'            => 0,
                'query_text'    => $request->input('query'),
                'response_text' => null,
                'response_type' => 'general',
                'status'        => 'failed',
                'error_message' => $e->getMessage(),
                'created_at'    => now()->toISOString(),
            ]);
        }
    }

    // ─── Recent Queries (for Ask AI chat) ──────────────

    public function queries(Request $request): JsonResponse
    {
        $queries = AiQuery::where('user_id', auth()->id())
            ->select('id', 'query_text', 'response_text', 'response_type', 'status', 'error_message', 'created_at')
            ->latest()
            ->limit(min(50, max(1, (int) $request->get('limit', 20))))
            ->get()
            ->reverse()
            ->values();

        return response()->json($queries);
    }

    // ─── Insights ───────────────────────────────────────

    public function insights(Request $request): JsonResponse
    {
        $query = AiInsight::query();

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($severity = $request->get('severity')) {
            $query->where('severity', $severity);
        }
        if ($type = $request->get('insight_type')) {
            $query->where('insight_type', $type);
        }
        if ($module = $request->get('linked_module')) {
            $query->where('linked_module', $module);
        }
        if ($dateFrom = $request->get('date_from')) {
            $query->where('generated_at', '>=', $dateFrom);
        }
        if ($dateTo = $request->get('date_to')) {
            $query->where('generated_at', '<=', $dateTo . ' 23:59:59');
        }
        if ($period = $request->get('period')) {
            match ($period) {
                'today' => $query->whereDate('generated_at', today()),
                'week'  => $query->where('generated_at', '>=', now()->startOfWeek()),
                'month' => $query->where('generated_at', '>=', now()->startOfMonth()),
                'year'  => $query->where('generated_at', '>=', now()->startOfYear()),
                default => null,
            };
        }

        $sortBy  = $request->get('sort_by', 'generated_at');
        $sortDir = $request->get('sort_dir', 'desc');
        $allowed = ['generated_at', 'severity', 'insight_type', 'status', 'created_at'];
        if (in_array($sortBy, $allowed)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        }

        $perPage   = min(100, max(1, (int) $request->get('per_page', 20)));
        $paginated = $query->paginate($perPage);

        return response()->json([
            'data'      => $paginated->items(),
            'total'     => $paginated->total(),
            'page'      => $paginated->currentPage(),
            'per_page'  => $paginated->perPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    public function generateInsights(): JsonResponse
    {
        $insights = $this->aiService->generateInsights(auth()->id());
        return response()->json([
            'generated' => count($insights),
            'insights'  => $insights,
        ]);
    }

    public function dismissInsight(Request $request, AiInsight $insight): JsonResponse
    {
        $request->validate(['reason' => 'nullable|string']);

        $insight->update([
            'status'         => 'Dismissed',
            'dismissed_at'   => now(),
            'dismissed_by'   => auth()->id(),
            'dismiss_reason' => $request->input('reason'),
        ]);

        AiLog::create([
            'user_id'         => auth()->id(),
            'user_name'       => auth()->user()?->full_name,
            'action_type'     => 'Insight Dismissed',
            'input_reference' => 'ai_insights:' . $insight->id,
        ]);

        return response()->json(['message' => 'Insight dismissed', 'insight' => $insight->fresh()]);
    }

    // ─── Recommendations ────────────────────────────────

    public function recommendations(Request $request): JsonResponse
    {
        $query = AiRecommendation::query()->with('insight:id,title,severity');

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($priority = $request->get('priority')) {
            $query->where('priority', $priority);
        }
        if ($type = $request->get('recommendation_type')) {
            $query->where('recommendation_type', $type);
        }
        if ($module = $request->get('linked_module')) {
            $query->where('linked_module', $module);
        }
        if ($dateFrom = $request->get('date_from')) {
            $query->where('generated_at', '>=', $dateFrom);
        }
        if ($dateTo = $request->get('date_to')) {
            $query->where('generated_at', '<=', $dateTo . ' 23:59:59');
        }

        $sortBy  = $request->get('sort_by', 'generated_at');
        $sortDir = $request->get('sort_dir', 'desc');
        $allowed = ['generated_at', 'priority', 'status', 'recommendation_type', 'created_at'];
        if (in_array($sortBy, $allowed)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        }

        $perPage   = min(100, max(1, (int) $request->get('per_page', 20)));
        $paginated = $query->paginate($perPage);

        return response()->json([
            'data'      => $paginated->items(),
            'total'     => $paginated->total(),
            'page'      => $paginated->currentPage(),
            'per_page'  => $paginated->perPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    public function generateRecommendations(): JsonResponse
    {
        $recs = $this->aiService->generateRecommendations(auth()->id());
        return response()->json([
            'generated'       => count($recs),
            'recommendations' => $recs,
        ]);
    }

    public function acceptRecommendation(Request $request, AiRecommendation $rec): JsonResponse
    {
        $rec->update([
            'status'      => 'Accepted',
            'accepted_by' => auth()->id(),
            'accepted_at' => now(),
        ]);

        AiLog::create([
            'user_id'         => auth()->id(),
            'user_name'       => auth()->user()?->full_name,
            'action_type'     => 'Recommendation Accepted',
            'input_reference' => 'ai_recommendations:' . $rec->id,
        ]);

        return response()->json(['message' => 'Recommendation accepted', 'recommendation' => $rec->fresh()]);
    }

    public function completeRecommendation(Request $request, AiRecommendation $rec): JsonResponse
    {
        $request->validate(['completion_notes' => 'required|string']);

        $rec->update([
            'status'           => 'Completed',
            'completed_at'     => now(),
            'completion_notes' => $request->input('completion_notes'),
        ]);

        AiLog::create([
            'user_id'         => auth()->id(),
            'user_name'       => auth()->user()?->full_name,
            'action_type'     => 'Recommendation Completed',
            'input_reference' => 'ai_recommendations:' . $rec->id,
        ]);

        return response()->json(['message' => 'Recommendation completed', 'recommendation' => $rec->fresh()]);
    }

    // ─── Alerts ─────────────────────────────────────────

    public function alerts(Request $request): JsonResponse
    {
        $query = AiAlert::query();

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($severity = $request->get('severity')) {
            $query->where('severity', $severity);
        }
        if ($type = $request->get('alert_type')) {
            $query->where('alert_type', $type);
        }
        if ($module = $request->get('linked_module')) {
            $query->where('linked_module', $module);
        }

        $sortBy  = $request->get('sort_by', 'generated_at');
        $sortDir = $request->get('sort_dir', 'desc');
        $allowed = ['generated_at', 'severity', 'status', 'alert_type', 'created_at'];
        if (in_array($sortBy, $allowed)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        }

        $perPage   = min(100, max(1, (int) $request->get('per_page', 20)));
        $paginated = $query->paginate($perPage);

        return response()->json([
            'data'      => $paginated->items(),
            'total'     => $paginated->total(),
            'page'      => $paginated->currentPage(),
            'per_page'  => $paginated->perPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    public function generateAlerts(): JsonResponse
    {
        $alerts = $this->aiService->generateAlerts();
        return response()->json([
            'generated' => count($alerts),
            'alerts'    => $alerts,
        ]);
    }

    public function acknowledgeAlert(Request $request, AiAlert $alert): JsonResponse
    {
        $alert->update([
            'status'          => 'Acknowledged',
            'acknowledged_by' => auth()->id(),
            'acknowledged_at' => now(),
        ]);

        AiLog::create([
            'user_id'         => auth()->id(),
            'user_name'       => auth()->user()?->full_name,
            'action_type'     => 'Alert Acknowledged',
            'input_reference' => 'ai_alerts:' . $alert->id,
        ]);

        return response()->json(['message' => 'Alert acknowledged', 'alert' => $alert->fresh()]);
    }

    public function resolveAlert(Request $request, AiAlert $alert): JsonResponse
    {
        $request->validate(['resolution_notes' => 'nullable|string']);

        $alert->update([
            'status'           => 'Resolved',
            'resolved_at'      => now(),
            'resolution_notes' => $request->input('resolution_notes'),
        ]);

        AiLog::create([
            'user_id'         => auth()->id(),
            'user_name'       => auth()->user()?->full_name,
            'action_type'     => 'Alert Resolved',
            'input_reference' => 'ai_alerts:' . $alert->id,
        ]);

        return response()->json(['message' => 'Alert resolved', 'alert' => $alert->fresh()]);
    }

    // ─── Document Analysis ──────────────────────────────

    public function analyzeDocument(Request $request): JsonResponse
    {
        $apiKey = config('ai_config.api_key');
        if (empty($apiKey) || $apiKey === 'your-anthropic-api-key') {
            return response()->json([
                'error'   => true,
                'message' => 'ANTHROPIC_API_KEY is not configured. Please set a valid API key in your .env file.',
            ], 422);
        }

        $request->validate([
            'document' => 'required|file|max:20480|mimes:pdf,doc,docx,txt,jpg,jpeg,png,xls,xlsx,csv,ppt,pptx,rtf,odt,ods,odp,xml,html,htm,json,md,zip,rar,7z,mp4,mp3,wav,avi,mov,svg,gif,bmp,webp,tiff,tif',
        ]);

        try {
            $file   = $request->file('document');
            $folder = 'ai-analysis/' . date('Y');
            $path   = $file->store($folder, 'public');

            $result = $this->aiService->analyzeDocument(
                $path,
                $file->getClientOriginalName(),
                $file->getClientOriginalExtension(),
                (int) round($file->getSize() / 1024),
                (int) auth()->id()
            );

            return response()->json($result);
        } catch (\Throwable $e) {
            return response()->json(['error' => true, 'message' => $e->getMessage()], 500);
        }
    }

    public function documentAnalyses(Request $request): JsonResponse
    {
        $query = AiDocumentAnalysis::query();

        if ($status = $request->get('mapping_status')) {
            $query->where('mapping_status', $status);
        }
        if ($module = $request->get('suggested_module')) {
            $query->where('suggested_module', $module);
        }
        if ($type = $request->get('detected_document_type')) {
            $query->where('detected_document_type', $type);
        }
        if ($dateFrom = $request->get('date_from')) {
            $query->where('created_at', '>=', $dateFrom);
        }
        if ($dateTo = $request->get('date_to')) {
            $query->where('created_at', '<=', $dateTo . ' 23:59:59');
        }

        $perPage   = min(100, max(1, (int) $request->get('per_page', 20)));
        $paginated = $query->latest()->paginate($perPage);

        return response()->json([
            'data'      => $paginated->items(),
            'total'     => $paginated->total(),
            'page'      => $paginated->currentPage(),
            'per_page'  => $paginated->perPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    public function mapDocumentAnalysis(Request $request, AiDocumentAnalysis $analysis): JsonResponse
    {
        $request->validate([
            'linked_module'    => 'required|string',
            'linked_record_id' => 'nullable|integer',
        ]);

        $analysis->update([
            'linked_module'    => $request->input('linked_module'),
            'linked_record_id' => $request->input('linked_record_id'),
            'mapping_status'   => 'Mapped',
        ]);

        return response()->json(['message' => 'Document mapped', 'analysis' => $analysis->fresh()]);
    }

    // ─── History ────────────────────────────────────────

    public function history(Request $request): JsonResponse
    {
        $query = AiLog::query();

        if ($actionType = $request->get('action_type')) {
            $query->where('action_type', $actionType);
        }
        if ($userId = $request->get('user_id')) {
            $query->where('user_id', $userId);
        }
        if ($dateFrom = $request->get('date_from')) {
            $query->where('created_at', '>=', $dateFrom);
        }
        if ($dateTo = $request->get('date_to')) {
            $query->where('created_at', '<=', $dateTo . ' 23:59:59');
        }

        $perPage   = min(100, max(1, (int) $request->get('per_page', 30)));
        $paginated = $query->latest('created_at')->paginate($perPage);

        return response()->json([
            'data'      => $paginated->items(),
            'total'     => $paginated->total(),
            'page'      => $paginated->currentPage(),
            'per_page'  => $paginated->perPage(),
            'last_page' => $paginated->lastPage(),
        ]);
    }

    // ─── Stats ──────────────────────────────────────────

    public function stats(): JsonResponse
    {
        return response()->json([
            'total_queries'            => AiQuery::count(),
            'total_insights'           => AiInsight::count(),
            'active_insights'          => AiInsight::active()->count(),
            'total_recommendations'    => AiRecommendation::count(),
            'pending_recommendations'  => AiRecommendation::pending()->count(),
            'total_alerts'             => AiAlert::count(),
            'active_alerts'            => AiAlert::active()->count(),
            'documents_analyzed'       => AiDocumentAnalysis::count(),
            'queries_this_week'        => AiQuery::where('created_at', '>=', now()->startOfWeek())->count(),

            'insights_by_type' => AiInsight::select('insight_type', \DB::raw('count(*) as count'))
                ->groupBy('insight_type')->orderByDesc('count')->get(),

            'alerts_by_severity' => AiAlert::select('severity', \DB::raw('count(*) as count'))
                ->groupBy('severity')->orderByDesc('count')->get(),

            'recommendations_by_status' => AiRecommendation::select('status', \DB::raw('count(*) as count'))
                ->groupBy('status')->orderByDesc('count')->get(),

            'top_modules_queried' => AiQuery::select('module_scope', \DB::raw('count(*) as count'))
                ->groupBy('module_scope')->orderByDesc('count')->limit(10)->get(),

            'recent_activity' => AiLog::latest('created_at')->limit(20)->get(),
        ]);
    }
}
