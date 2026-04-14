<?php

namespace App\Services;

use App\Models\AiAlert;
use App\Models\AiDocumentAnalysis;
use App\Models\AiInsight;
use App\Models\AiLog;
use App\Models\AiQuery;
use App\Models\AiRecommendation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiService
{
    // ─── Claude API Call Wrapper ─────────────────────────

    private function callClaude(
        string $systemPrompt,
        string $userMessage,
        int $maxTokens = 1000
    ): array {
        $start = microtime(true);

        $apiKey = config('ai_config.api_key');
        if (empty($apiKey) || $apiKey === 'your-anthropic-api-key') {
            return [
                'success'     => false,
                'error'       => 'ANTHROPIC_API_KEY is not configured. Please set a valid API key in your .env file.',
                'text'        => '',
                'tokens_used' => 0,
                'duration_ms' => 0,
            ];
        }

        try {
            $response = Http::withOptions([
                'verify' => 'C:/laragon/etc/ssl/cacert.pem',
            ])->withHeaders([
                'x-api-key'         => $apiKey,
                'anthropic-version' => config('ai_config.api_version'),
                'content-type'      => 'application/json',
            ])->timeout(60)->post(config('ai_config.api_url'), [
                'model'      => config('ai_config.model'),
                'max_tokens' => $maxTokens,
                'messages'   => [
                    ['role' => 'user', 'content' => $userMessage],
                ],
                'system' => $systemPrompt,
            ]);

            $duration = round((microtime(true) - $start) * 1000);

            if ($response->failed()) {
                Log::error('Claude API call failed', [
                    'status' => $response->status(),
                    'body'   => substr($response->body(), 0, 500),
                ]);

                // Parse user-friendly message based on error type
                $body = $response->json() ?? [];
                $apiMsg = $body['error']['message'] ?? '';
                $errorType = $body['error']['type'] ?? '';

                if ($response->status() === 400 && str_contains($apiMsg, 'credit balance')) {
                    $userError = 'AI features are temporarily unavailable — Anthropic API credit balance is too low. Please top up your credits at console.anthropic.com.';
                } elseif ($response->status() === 401) {
                    $userError = 'AI features are unavailable — invalid API key. Please check your ANTHROPIC_API_KEY in .env.';
                } elseif ($response->status() === 429) {
                    $userError = 'AI service is rate-limited. Please try again in a few moments.';
                } elseif ($response->status() === 529 || $response->status() === 503) {
                    $userError = 'AI service is temporarily overloaded. Please try again shortly.';
                } else {
                    $userError = 'AI service error (' . $response->status() . '). Please try again later.';
                }

                return [
                    'success'     => false,
                    'error'       => $userError,
                    'text'        => '',
                    'tokens_used' => 0,
                    'duration_ms' => $duration,
                ];
            }

            $data = $response->json();
            $text = collect($data['content'] ?? [])
                ->where('type', 'text')
                ->pluck('text')
                ->implode("\n");

            return [
                'success'     => true,
                'text'        => $text,
                'tokens_used' => $data['usage']['output_tokens'] ?? 0,
                'duration_ms' => $duration,
            ];
        } catch (\Exception $e) {
            $duration = round((microtime(true) - $start) * 1000);
            Log::error('Claude API exception', ['message' => $e->getMessage()]);
            return [
                'success'     => false,
                'error'       => $e->getMessage(),
                'text'        => '',
                'tokens_used' => 0,
                'duration_ms' => $duration,
            ];
        }
    }

    // ─── System Context Builder ─────────────────────────

    public function buildSystemContext(): string
    {
        try {
            $workerCount     = DB::table('workers')->where('status', 'Active')->count();
            $contractorCount = DB::table('contractors')->where('is_active', 1)->count();
            $zoneCount       = DB::table('observations')->distinct()->count('zone');
        } catch (\Throwable $e) {
            $workerCount = 0;
            $contractorCount = 0;
            $zoneCount = 0;
        }

        return "You are an EHS (Environment, Health & Safety) AI assistant for the FFT/Lucid KAEC " .
            "(King Abdullah Economic City) Riyadh Rail project. " .
            "The project currently has {$workerCount} active workers from {$contractorCount} active contractors " .
            "across {$zoneCount} zones. " .
            "You analyze EHS data and provide concise, actionable insights. " .
            "Always be specific. Always cite numbers from the data provided. Never fabricate data. " .
            "Format responses as plain structured text, no markdown.";
    }

    // ─── Data Context Builders ──────────────────────────

    private function windowStart()
    {
        return now()->subDays(config('ai_config.analysis_window_days', 90));
    }

    public function gatherObservationContext(): array
    {
        $ws = $this->windowStart();

        $total   = DB::table('observations')->where('created_at', '>=', $ws)->whereNull('deleted_at')->count();
        $overdue = DB::table('observations')->where('created_at', '>=', $ws)->whereNull('deleted_at')
            ->where('status', 'Overdue')->count();

        $byCategory = DB::table('observations')
            ->select('category', DB::raw('count(*) as count'))
            ->where('created_at', '>=', $ws)->whereNull('deleted_at')
            ->groupBy('category')->orderByDesc('count')->limit(10)->get()->toArray();

        $byArea = DB::table('observations')
            ->select('zone as area', DB::raw('count(*) as count'))
            ->where('created_at', '>=', $ws)->whereNull('deleted_at')
            ->groupBy('zone')->orderByDesc('count')->limit(10)->get()->toArray();

        $byContractor = DB::table('observations')
            ->select('contractor', DB::raw('count(*) as count'))
            ->where('created_at', '>=', $ws)->whereNull('deleted_at')
            ->whereNotNull('contractor')
            ->groupBy('contractor')->orderByDesc('count')->limit(10)->get()->toArray();

        $thisWeek = DB::table('observations')
            ->where('created_at', '>=', now()->startOfWeek())->whereNull('deleted_at')->count();
        $lastWeek = DB::table('observations')
            ->whereBetween('created_at', [now()->subWeek()->startOfWeek(), now()->subWeek()->endOfWeek()])
            ->whereNull('deleted_at')->count();

        return [
            'total'           => $total,
            'overdue'         => $overdue,
            'by_category'     => $byCategory,
            'by_area'         => $byArea,
            'by_contractor'   => $byContractor,
            'trend_this_week' => $thisWeek,
            'trend_last_week' => $lastWeek,
        ];
    }

    public function gatherIncidentContext(): array
    {
        $ws = $this->windowStart();

        $total    = DB::table('incidents')->where('created_at', '>=', $ws)->whereNull('deleted_at')->count();
        $critical = DB::table('incidents')->where('created_at', '>=', $ws)->whereNull('deleted_at')->where('severity', 'Critical')->count();
        $high     = DB::table('incidents')->where('created_at', '>=', $ws)->whereNull('deleted_at')->where('severity', 'High')->count();
        $lti      = DB::table('incidents')->where('created_at', '>=', $ws)->whereNull('deleted_at')->where('lost_time_injury', 1)->count();
        $open     = DB::table('incidents')->where('created_at', '>=', $ws)->whereNull('deleted_at')->whereNotIn('status', ['Closed', 'Verified'])->count();

        $byContractor = DB::table('incidents')
            ->select('contractor_name', DB::raw('count(*) as count'))
            ->where('created_at', '>=', $ws)->whereNull('deleted_at')->whereNotNull('contractor_name')
            ->groupBy('contractor_name')->orderByDesc('count')->limit(10)->get()->toArray();

        $byArea = DB::table('incidents')
            ->select('area', DB::raw('count(*) as count'))
            ->where('created_at', '>=', $ws)->whereNull('deleted_at')->whereNotNull('area')
            ->groupBy('area')->orderByDesc('count')->limit(10)->get()->toArray();

        $recent5 = DB::table('incidents')
            ->select('incident_code', 'incident_type', 'severity', 'area', 'contractor_name', 'status', 'created_at')
            ->where('created_at', '>=', $ws)->whereNull('deleted_at')
            ->orderByDesc('created_at')->limit(5)->get()->toArray();

        return [
            'total'         => $total,
            'critical'      => $critical,
            'high'          => $high,
            'lti_count'     => $lti,
            'open'          => $open,
            'by_contractor' => $byContractor,
            'by_area'       => $byArea,
            'recent_5'      => $recent5,
        ];
    }

    public function gatherViolationContext(): array
    {
        $ws = $this->windowStart();

        $total    = DB::table('violations')->where('created_at', '>=', $ws)->whereNull('deleted_at')->count();
        $critical = DB::table('violations')->where('created_at', '>=', $ws)->whereNull('deleted_at')->where('severity', 'Critical')->count();

        $byContractor = DB::table('violations')
            ->select('contractor_name', DB::raw('count(*) as count'))
            ->where('created_at', '>=', $ws)->whereNull('deleted_at')->whereNotNull('contractor_name')
            ->groupBy('contractor_name')->orderByDesc('count')->limit(10)->get()->toArray();

        $byArea = DB::table('violations')
            ->select('area', DB::raw('count(*) as count'))
            ->where('created_at', '>=', $ws)->whereNull('deleted_at')->whereNotNull('area')
            ->groupBy('area')->orderByDesc('count')->limit(10)->get()->toArray();

        $repeatOffenders = DB::table('violations')
            ->select('violator_name', 'contractor_name', DB::raw('count(*) as count'))
            ->where('created_at', '>=', $ws)->whereNull('deleted_at')->whereNotNull('violator_name')
            ->groupBy('violator_name', 'contractor_name')
            ->having('count', '>=', config('ai_config.thresholds.violation_repeat_count', 3))
            ->orderByDesc('count')->limit(10)->get()->toArray();

        return [
            'total'            => $total,
            'critical'         => $critical,
            'by_contractor'    => $byContractor,
            'by_area'          => $byArea,
            'repeat_offenders' => $repeatOffenders,
        ];
    }

    public function gatherPermitContext(): array
    {
        $ws = $this->windowStart();

        $total   = DB::table('permits')->where('created_at', '>=', $ws)->whereNull('deleted_at')->count();
        $active  = DB::table('permits')->where('status', 'Active')->whereNull('deleted_at')->count();
        $expired = DB::table('permits')->where('status', 'Expired')->whereNull('deleted_at')->count();
        $pending = DB::table('permits')->where('status', 'Pending')->whereNull('deleted_at')->count();

        $byType = DB::table('permits')
            ->select('permit_type', DB::raw('count(*) as count'))
            ->whereNull('deleted_at')
            ->groupBy('permit_type')->orderByDesc('count')->limit(10)->get()->toArray();

        return [
            'total'   => $total,
            'active'  => $active,
            'expired' => $expired,
            'pending' => $pending,
            'by_type' => $byType,
        ];
    }

    public function gatherTrainingContext(): array
    {
        $total         = DB::table('training_records')->whereNull('deleted_at')->count();
        $expired       = DB::table('training_records')->whereNull('deleted_at')->where('status', 'Expired')->count();
        $expiringSoon  = DB::table('training_records')->whereNull('deleted_at')->where('status', 'Expiring Soon')->count();

        $byTopic = DB::table('training_records')
            ->select('training_topic_key', DB::raw('count(*) as count'))
            ->whereNull('deleted_at')
            ->groupBy('training_topic_key')->orderByDesc('count')->limit(10)->get()->toArray();

        $validCount     = DB::table('training_records')->whereNull('deleted_at')->where('status', 'Valid')->count();
        $complianceRate = $total > 0 ? round(($validCount / $total) * 100) : 0;

        return [
            'total'           => $total,
            'expired'         => $expired,
            'expiring_soon'   => $expiringSoon,
            'by_topic'        => $byTopic,
            'compliance_rate' => $complianceRate . '%',
        ];
    }

    public function gatherContractorContext(): array
    {
        $total      = DB::table('contractors')->count();
        $active     = DB::table('contractors')->where('is_active', 1)->count();
        $suspended  = DB::table('contractors')->where('is_suspended', 1)->count();
        $expiredDoc = DB::table('contractors')->where('has_expired_documents', 1)->where('is_active', 1)->count();
        $nonCompl   = DB::table('contractors')->where('compliance_status', 'Non-Compliant')->where('is_active', 1)->count();

        $topByRisk = DB::table('contractors')
            ->select('contractor_name', 'contractor_status', 'compliance_status',
                     'has_expired_documents', 'current_site_headcount')
            ->where('is_active', 1)
            ->orderByDesc('has_expired_documents')
            ->orderByDesc('current_site_headcount')
            ->limit(10)->get()->toArray();

        return [
            'total'           => $total,
            'active'          => $active,
            'suspended'       => $suspended,
            'with_expired_docs' => $expiredDoc,
            'non_compliant'   => $nonCompl,
            'contractors'     => $topByRisk,
        ];
    }

    public function gatherDocumentContext(): array
    {
        $total          = DB::table('dc_documents')->whereNull('deleted_at')->count();
        $active         = DB::table('dc_documents')->whereNull('deleted_at')->where('status', 'Active')->count();
        $expired        = DB::table('dc_documents')->whereNull('deleted_at')->where('is_expired', 1)->count();
        $overdueReview  = DB::table('dc_documents')->whereNull('deleted_at')->where('is_overdue_review', 1)->count();
        $pendingAppr    = DB::table('dc_documents')->whereNull('deleted_at')->where('status', 'Pending Approval')->count();

        return [
            'total'            => $total,
            'active'           => $active,
            'expired'          => $expired,
            'overdue_review'   => $overdueReview,
            'pending_approval' => $pendingAppr,
        ];
    }

    public function gatherMomContext(): array
    {
        $totalMoms    = DB::table('moms')->whereNull('deleted_at')->count();
        $openActions  = DB::table('mom_points')->whereNotIn('status', ['Closed', 'Resolved'])->count();
        $overdueAct   = DB::table('mom_points')
            ->whereNotIn('status', ['Closed', 'Resolved'])
            ->where('due_date', '<', now())
            ->count();

        $recentMeetings = DB::table('moms')
            ->select('ref_number', 'title', 'meeting_date', 'status', 'total_points', 'open_points', 'overdue_points')
            ->whereNull('deleted_at')
            ->orderByDesc('meeting_date')->limit(3)->get()->toArray();

        return [
            'total_moms'      => $totalMoms,
            'open_actions'    => $openActions,
            'overdue_actions' => $overdueAct,
            'recent_meetings' => $recentMeetings,
        ];
    }

    public function gatherWasteContext(): array
    {
        $total     = DB::table('waste_manifests')->whereNull('deleted_at')->count();
        $delayed   = DB::table('waste_manifests')->whereNull('deleted_at')->where('is_delayed', 1)->count();
        $hazardous = DB::table('waste_manifests')->whereNull('deleted_at')->where('waste_category', 'Hazardous')->count();
        $nonCompl  = DB::table('waste_manifests')->whereNull('deleted_at')->where('manifest_compliance_status', 'Non-Compliant')->count();

        return [
            'total'         => $total,
            'delayed'       => $delayed,
            'hazardous'     => $hazardous,
            'non_compliant' => $nonCompl,
        ];
    }

    public function gatherEnvironmentalContext(): array
    {
        $highRiskAspects = DB::table('environmental_aspects')
            ->where(function($q) {
                $q->where('risk_level', 'High')->orWhere('risk_level', 'Critical');
            })
            ->whereNull('deleted_at')->count();
        $openActions     = DB::table('environmental_actions')
            ->whereIn('status', ['Open', 'In Progress'])->count();
        $incidents       = DB::table('environmental_incidents')
            ->where('created_at', '>=', $this->windowStart())->whereNull('deleted_at')->count();
        $nonComplMon     = DB::table('environmental_inspections')
            ->where('status', '!=', 'Closed')->whereNull('deleted_at')->count();

        return [
            'high_risk_aspects'          => $highRiskAspects,
            'open_actions'               => $openActions,
            'incidents'                  => $incidents,
            'non_compliant_monitoring'   => $nonComplMon,
        ];
    }

    public function gatherFullContext(): array
    {
        return [
            'observations'  => $this->gatherObservationContext(),
            'incidents'     => $this->gatherIncidentContext(),
            'violations'    => $this->gatherViolationContext(),
            'permits'       => $this->gatherPermitContext(),
            'training'      => $this->gatherTrainingContext(),
            'contractors'   => $this->gatherContractorContext(),
            'documents'     => $this->gatherDocumentContext(),
            'mom'           => $this->gatherMomContext(),
            'waste'         => $this->gatherWasteContext(),
            'environmental' => $this->gatherEnvironmentalContext(),
        ];
    }

    // ─── Intent Detection ───────────────────────────────

    public function detectIntent(string $query): string
    {
        $query = strtolower($query);

        $patterns = [
            'summary'        => ['summary', 'overview', 'show me', 'how many', 'what is', 'status', 'total', 'count'],
            'trend'          => ['trend', 'over time', 'this month', 'last week', 'increasing', 'decreasing', 'change', 'growth'],
            'risk'           => ['risk', 'danger', 'unsafe', 'hazard', 'critical', 'concern', 'high risk', 'worst'],
            'recommendation' => ['recommend', 'suggest', 'what should', 'improve', 'fix', 'action', 'advice', 'next step'],
            'comparison'     => ['compare', 'versus', 'vs', 'difference', 'between', 'better', 'worse'],
            'alert'          => ['alert', 'warn', 'urgent', 'overdue', 'expired', 'missing', 'due', 'deadline'],
        ];

        $scores = [];
        foreach ($patterns as $intent => $keywords) {
            $score = 0;
            foreach ($keywords as $kw) {
                if (str_contains($query, $kw)) {
                    $score++;
                }
            }
            $scores[$intent] = $score;
        }

        arsort($scores);
        $top = array_key_first($scores);

        return $scores[$top] > 0 ? $top : 'general';
    }

    // ─── Ask AI (Core Flow) ─────────────────────────────

    public function askAi(string $queryText, string $scope, int $userId): AiQuery
    {
        $query = AiQuery::create([
            'user_id'      => $userId,
            'user_name'    => auth()->user()?->name ?? 'System',
            'query_text'   => $queryText,
            'module_scope' => $scope,
            'status'       => 'pending',
        ]);

        try {
            $intent = $this->detectIntent($queryText);

            $context = match ($scope) {
                'observations'  => $this->gatherObservationContext(),
                'incidents'     => $this->gatherIncidentContext(),
                'violations'    => $this->gatherViolationContext(),
                'permits'       => $this->gatherPermitContext(),
                'training'      => $this->gatherTrainingContext(),
                'contractors'   => $this->gatherContractorContext(),
                'documents'     => $this->gatherDocumentContext(),
                'mom'           => $this->gatherMomContext(),
                'waste'         => $this->gatherWasteContext(),
                'environmental' => $this->gatherEnvironmentalContext(),
                default         => $this->gatherFullContext(),
            };

            $systemPrompt = $this->buildSystemContext();

            $userMessage = "CURRENT SYSTEM DATA:\n" .
                json_encode($context, JSON_PRETTY_PRINT) .
                "\n\nUSER QUESTION: " . $queryText .
                "\n\nRespond concisely. Be specific. Use exact numbers from the data provided. " .
                "If asking for recommendations, number them 1-5.";

            $result = $this->callClaude($systemPrompt, $userMessage, 1500);

            // Truncate context for storage
            $contextForStorage = json_decode(json_encode($context), true);
            if (is_array($contextForStorage)) {
                $contextForStorage = array_slice($contextForStorage, 0, 20, true);
            }

            $query->update([
                'context_data'    => $contextForStorage,
                'response_text'   => $result['success'] ? $result['text'] : null,
                'response_type'   => $intent,
                'intent_detected' => $intent,
                'tokens_used'     => $result['tokens_used'] ?? 0,
                'model_used'      => config('ai_config.model'),
                'status'          => $result['success'] ? 'completed' : 'failed',
                'error_message'   => $result['error'] ?? null,
            ]);

            AiLog::create([
                'user_id'          => $userId,
                'user_name'        => auth()->user()?->name ?? 'System',
                'action_type'      => 'Query Asked',
                'input_reference'  => 'ai_queries:' . $query->id,
                'module_scope'     => $scope,
                'tokens_used'      => $result['tokens_used'] ?? 0,
                'duration_ms'      => $result['duration_ms'] ?? 0,
            ]);
        } catch (\Exception $e) {
            Log::error('AiService::askAi failed', ['error' => $e->getMessage()]);
            $query->update([
                'status'        => 'failed',
                'error_message' => $e->getMessage(),
            ]);
        }

        return $query->fresh();
    }

    // ─── Insights Engine ────────────────────────────────

    public function generateInsights(?int $userId = null): array
    {
        $insightsCreated = [];
        $window = config('ai_config.analysis_window_days', 90);

        // Rule 1: Repeated violations in same area
        $violationClusters = DB::table('violations')
            ->select('area', DB::raw('count(*) as count'))
            ->where('created_at', '>=', now()->subDays($window))
            ->whereNotNull('area')
            ->groupBy('area')
            ->having('count', '>=', config('ai_config.thresholds.violation_repeat_count', 3))
            ->get();

        foreach ($violationClusters as $cluster) {
            $exists = AiInsight::where('insight_type', 'Violation Pattern')
                ->where('linked_module', 'violations')
                ->active()
                ->whereJsonContains('data_snapshot->area', $cluster->area)
                ->exists();

            if (!$exists) {
                $aiResult = $this->callClaude(
                    $this->buildSystemContext(),
                    "Generate a 2-sentence insight about repeated violations in {$cluster->area} " .
                    "({$cluster->count} violations in the last {$window} days). " .
                    "Be specific and state what action is needed."
                );

                $insight = AiInsight::create([
                    'title'            => "{$cluster->count} violations in {$cluster->area} — Pattern Detected",
                    'description'      => $aiResult['success'] ? $aiResult['text'] : "Repeated violation pattern detected in {$cluster->area} with {$cluster->count} incidents in {$window} days. Investigation and corrective action required.",
                    'insight_type'     => 'Violation Pattern',
                    'severity'         => $cluster->count >= 5 ? 'High' : 'Medium',
                    'linked_module'    => 'violations',
                    'data_snapshot'    => ['area' => $cluster->area, 'count' => $cluster->count],
                    'generated_by'     => $userId ? 'manual' : 'auto',
                    'generated_by_user' => $userId,
                ]);
                $insightsCreated[] = $insight;
            }
        }

        // Rule 2: Contractor with multiple incidents
        $contractorIncidents = DB::table('incidents')
            ->select('contractor_name', DB::raw('count(*) as count'))
            ->where('created_at', '>=', now()->subDays($window))
            ->whereNotNull('contractor_name')
            ->groupBy('contractor_name')
            ->having('count', '>=', config('ai_config.thresholds.contractor_incident_count', 2))
            ->get();

        foreach ($contractorIncidents as $ci) {
            $exists = AiInsight::where('insight_type', 'Contractor Alert')
                ->active()
                ->whereJsonContains('data_snapshot->contractor_name', $ci->contractor_name)
                ->exists();

            if (!$exists) {
                $aiResult = $this->callClaude(
                    $this->buildSystemContext(),
                    "Generate a 2-sentence insight about contractor '{$ci->contractor_name}' having {$ci->count} " .
                    "incidents in the last {$window} days. Be specific about the safety concern."
                );

                $insight = AiInsight::create([
                    'title'            => "Contractor Performance Alert: {$ci->contractor_name}",
                    'description'      => $aiResult['success'] ? $aiResult['text'] : "Contractor {$ci->contractor_name} has {$ci->count} reported incidents in {$window} days. Review contractor safety performance.",
                    'insight_type'     => 'Contractor Alert',
                    'severity'         => $ci->count >= 3 ? 'High' : 'Medium',
                    'linked_module'    => 'incidents',
                    'data_snapshot'    => ['contractor_name' => $ci->contractor_name, 'count' => $ci->count],
                    'generated_by'     => $userId ? 'manual' : 'auto',
                    'generated_by_user' => $userId,
                ]);
                $insightsCreated[] = $insight;
            }
        }

        // Rule 3: Overdue MOM actions
        $overdueMomActions = DB::table('mom_points')
            ->whereNotIn('status', ['Closed', 'Resolved'])
            ->where('due_date', '<', now())
            ->count();

        if ($overdueMomActions >= 3) {
            $exists = AiInsight::where('insight_type', 'Action Overdue')
                ->where('linked_module', 'mom')
                ->active()->exists();

            if (!$exists) {
                $insight = AiInsight::create([
                    'title'            => "{$overdueMomActions} Overdue MOM Actions Require Attention",
                    'description'      => "{$overdueMomActions} MOM action points are past their due dates. These represent commitments from weekly meetings that have not been fulfilled. Immediate follow-up with responsible persons is needed.",
                    'insight_type'     => 'Action Overdue',
                    'severity'         => $overdueMomActions >= 10 ? 'High' : 'Medium',
                    'linked_module'    => 'mom',
                    'data_snapshot'    => ['overdue_count' => $overdueMomActions],
                    'generated_by'     => $userId ? 'manual' : 'auto',
                    'generated_by_user' => $userId,
                ]);
                $insightsCreated[] = $insight;
            }
        }

        // Rule 4: Training expiry gap
        $expiredTraining = DB::table('training_records')
            ->where('status', 'Expired')
            ->whereNull('deleted_at')
            ->count();

        if ($expiredTraining >= 5) {
            $exists = AiInsight::where('insight_type', 'Training Gap')
                ->active()->exists();

            if (!$exists) {
                $insight = AiInsight::create([
                    'title'            => "Training Compliance Gap: {$expiredTraining} Expired Records",
                    'description'      => "{$expiredTraining} training records have expired. Workers with expired training certifications may be non-compliant and should be restricted from related tasks until retraining is completed.",
                    'insight_type'     => 'Training Gap',
                    'severity'         => $expiredTraining >= 15 ? 'High' : 'Medium',
                    'linked_module'    => 'training',
                    'data_snapshot'    => ['expired_count' => $expiredTraining],
                    'generated_by'     => $userId ? 'manual' : 'auto',
                    'generated_by_user' => $userId,
                ]);
                $insightsCreated[] = $insight;
            }
        }

        // Rule 5: Expired contractor documents
        $contractorsWithExpiredDocs = DB::table('contractors')
            ->where('has_expired_documents', 1)
            ->where('is_active', 1)
            ->count();

        if ($contractorsWithExpiredDocs >= 1) {
            $exists = AiInsight::where('insight_type', 'Contractor Alert')
                ->where('linked_module', 'contractors')
                ->active()
                ->where('title', 'like', '%expired documents%')
                ->exists();

            if (!$exists) {
                $insight = AiInsight::create([
                    'title'            => "{$contractorsWithExpiredDocs} Active Contractor(s) With Expired Documents",
                    'description'      => "{$contractorsWithExpiredDocs} active contractors have expired documents on file. This is a compliance risk that needs immediate attention. Review and request updated documentation.",
                    'insight_type'     => 'Contractor Alert',
                    'severity'         => 'High',
                    'linked_module'    => 'contractors',
                    'data_snapshot'    => ['count' => $contractorsWithExpiredDocs],
                    'generated_by'     => $userId ? 'manual' : 'auto',
                    'generated_by_user' => $userId,
                ]);
                $insightsCreated[] = $insight;
            }
        }

        // Rule 6: Documents overdue for review
        $overdueDocReviews = DB::table('dc_documents')
            ->where('is_overdue_review', 1)
            ->where('status', 'Active')
            ->whereNull('deleted_at')
            ->count();

        if ($overdueDocReviews >= 3) {
            $exists = AiInsight::where('insight_type', 'Document Alert')
                ->active()->exists();

            if (!$exists) {
                $insight = AiInsight::create([
                    'title'            => "{$overdueDocReviews} Active Documents Overdue for Review",
                    'description'      => "{$overdueDocReviews} controlled documents are past their review date. Document owners should be notified to initiate review cycles to maintain compliance.",
                    'insight_type'     => 'Document Alert',
                    'severity'         => 'Medium',
                    'linked_module'    => 'documents',
                    'data_snapshot'    => ['overdue_review_count' => $overdueDocReviews],
                    'generated_by'     => $userId ? 'manual' : 'auto',
                    'generated_by_user' => $userId,
                ]);
                $insightsCreated[] = $insight;
            }
        }

        // Rule 7: Incident cluster
        $recentIncidents = DB::table('incidents')
            ->where('created_at', '>=', now()->subDays(config('ai_config.thresholds.incident_cluster_days', 7)))
            ->count();

        if ($recentIncidents >= 3) {
            $exists = AiInsight::where('insight_type', 'Incident Pattern')
                ->active()->exists();

            if (!$exists) {
                $insight = AiInsight::create([
                    'title'            => "Incident Cluster Detected: {$recentIncidents} Incidents in " . config('ai_config.thresholds.incident_cluster_days', 7) . " Days",
                    'description'      => "{$recentIncidents} incidents reported in the last " . config('ai_config.thresholds.incident_cluster_days', 7) . " days indicates a potential systemic issue. Immediate safety stand-down and root cause analysis is strongly recommended.",
                    'insight_type'     => 'Incident Pattern',
                    'severity'         => 'Critical',
                    'linked_module'    => 'incidents',
                    'data_snapshot'    => ['count' => $recentIncidents, 'days' => config('ai_config.thresholds.incident_cluster_days', 7)],
                    'generated_by'     => $userId ? 'manual' : 'auto',
                    'generated_by_user' => $userId,
                ]);
                $insightsCreated[] = $insight;
            }
        }

        AiLog::create([
            'user_id'          => $userId,
            'user_name'        => auth()->user()?->name ?? 'System',
            'action_type'      => 'Insights Generated',
            'output_reference' => count($insightsCreated) . ' insights created',
        ]);

        return $insightsCreated;
    }

    // ─── Recommendations Engine ─────────────────────────

    public function generateRecommendations(?int $userId = null): array
    {
        $insights = AiInsight::active()
            ->whereDoesntHave('recommendations', function ($q) {
                $q->whereIn('status', ['Pending', 'Accepted', 'In Progress']);
            })
            ->get();

        $recommendations = [];

        foreach ($insights as $insight) {
            $aiResult = $this->callClaude(
                $this->buildSystemContext(),
                "Based on this EHS insight: \"{$insight->title}\"\n" .
                "Description: {$insight->description}\n\n" .
                "Provide ONE specific, actionable recommendation.\n" .
                "Format exactly:\n" .
                "TITLE: [action title]\n" .
                "TYPE: [one of: Launch Safety Campaign, Schedule Training, Review Contractor, Update RAMS / Document, Conduct Inspection, Conduct Mock Drill, Escalate to Management, Issue Warning, Renew Document / License, Add Observation Drive, Review Permit, Environmental Action, Other]\n" .
                "ACTION: [3-5 specific steps]\n" .
                "OUTCOME: [expected result]"
            );

            $parsed = $this->parseRecommendationResponse($aiResult['success'] ? $aiResult['text'] : '');

            $rec = AiRecommendation::create([
                'title'               => $parsed['title'] ?: 'Action Required: ' . $insight->title,
                'description'         => $aiResult['success'] ? $aiResult['text'] : 'Review this insight and take appropriate action.',
                'recommendation_type' => $parsed['type'] ?: 'Other',
                'priority'            => match ($insight->severity) {
                    'Critical' => 'Critical',
                    'High'     => 'High',
                    default    => 'Medium',
                },
                'linked_module'       => $insight->linked_module,
                'linked_record_id'    => $insight->linked_record_id,
                'linked_insight_id'   => $insight->id,
                'action_suggestion'   => $parsed['action'] ?? null,
                'expected_outcome'    => $parsed['outcome'] ?? null,
                'generated_by_user'   => $userId,
            ]);
            $recommendations[] = $rec;
        }

        AiLog::create([
            'user_id'          => $userId,
            'user_name'        => auth()->user()?->name ?? 'System',
            'action_type'      => 'Recommendations Generated',
            'output_reference' => count($recommendations) . ' recommendations created',
        ]);

        return $recommendations;
    }

    private function parseRecommendationResponse(string $text): array
    {
        $result = ['title' => '', 'type' => '', 'action' => '', 'outcome' => ''];

        if (preg_match('/TITLE:\s*(.+?)(?=\nTYPE:|\n\n|$)/si', $text, $m)) {
            $result['title'] = trim($m[1]);
        }
        if (preg_match('/TYPE:\s*(.+?)(?=\nACTION:|\n\n|$)/si', $text, $m)) {
            $result['type'] = trim($m[1]);
        }
        if (preg_match('/ACTION:\s*(.+?)(?=\nOUTCOME:|\n\n|$)/si', $text, $m)) {
            $result['action'] = trim($m[1]);
        }
        if (preg_match('/OUTCOME:\s*(.+?)$/si', $text, $m)) {
            $result['outcome'] = trim($m[1]);
        }

        // Validate type against config
        $validTypes = config('ai_config.recommendation_types', []);
        if (!in_array($result['type'], $validTypes)) {
            $result['type'] = 'Other';
        }

        return $result;
    }

    // ─── Alert Generator ────────────────────────────────

    public function generateAlerts(): array
    {
        $alerts = [];

        // Expiring documents (dc_documents)
        $expiringDocs = DB::table('dc_documents')
            ->where('is_expiring_soon', 1)
            ->where('is_expired', 0)
            ->whereNull('deleted_at')
            ->get(['id', 'document_code', 'document_title', 'expiry_date']);

        foreach ($expiringDocs as $doc) {
            $alert = AiAlert::fireOrUpdate("doc:{$doc->id}:expiring", [
                'title'              => 'Document Expiring Soon',
                'description'        => "{$doc->document_title} ({$doc->document_code}) expires on {$doc->expiry_date}.",
                'alert_type'         => 'Document Expiry',
                'severity'           => 'Medium',
                'linked_module'      => 'documents',
                'linked_record_id'   => $doc->id,
                'linked_record_code' => $doc->document_code,
            ]);
            $alerts[] = $alert;
        }

        // Expired documents still active
        $expiredDocs = DB::table('dc_documents')
            ->where('is_expired', 1)
            ->where('status', 'Active')
            ->whereNull('deleted_at')
            ->get(['id', 'document_code', 'document_title']);

        foreach ($expiredDocs as $doc) {
            $alert = AiAlert::fireOrUpdate("doc:{$doc->id}:expired", [
                'title'              => 'Active Document Has Expired',
                'description'        => "{$doc->document_title} ({$doc->document_code}) is expired and still marked Active.",
                'alert_type'         => 'Document Expiry',
                'severity'           => 'Critical',
                'linked_module'      => 'documents',
                'linked_record_id'   => $doc->id,
                'linked_record_code' => $doc->document_code,
            ]);
            $alerts[] = $alert;
        }

        // Contractor expired docs
        $contractorsExpired = DB::table('contractors')
            ->where('has_expired_documents', 1)
            ->where('is_active', 1)
            ->get(['id', 'contractor_code', 'contractor_name']);

        foreach ($contractorsExpired as $c) {
            $alert = AiAlert::fireOrUpdate("contractor:{$c->id}:expired_docs", [
                'title'              => 'Contractor Has Expired Documents',
                'description'        => "{$c->contractor_name} ({$c->contractor_code}) has expired documents requiring renewal.",
                'alert_type'         => 'Certificate Expiry',
                'severity'           => 'High',
                'linked_module'      => 'contractors',
                'linked_record_id'   => $c->id,
                'linked_record_code' => $c->contractor_code,
            ]);
            $alerts[] = $alert;
        }

        // Overdue MOM actions
        $overdueMomCount = DB::table('mom_points')
            ->whereNotIn('status', ['Closed', 'Resolved'])
            ->where('due_date', '<', now())
            ->count();

        if ($overdueMomCount > 0) {
            $alert = AiAlert::fireOrUpdate('mom:overdue:' . date('Ym'), [
                'title'         => "{$overdueMomCount} Overdue MOM Actions",
                'description'   => "{$overdueMomCount} MOM action points are past their due dates and require follow-up.",
                'alert_type'    => 'Overdue Action',
                'severity'      => $overdueMomCount >= 10 ? 'Critical' : 'High',
                'linked_module' => 'mom',
            ]);
            $alerts[] = $alert;
        }

        // Delayed waste manifests
        $delayedWaste = DB::table('waste_manifests')
            ->where('is_delayed', 1)
            ->whereIn('status', ['In Transit', 'Dispatched'])
            ->whereNull('deleted_at')
            ->count();

        if ($delayedWaste > 0) {
            $alert = AiAlert::fireOrUpdate('waste:delayed:' . date('Ym'), [
                'title'         => "{$delayedWaste} Delayed Waste Manifest(s)",
                'description'   => "{$delayedWaste} waste manifests are flagged as delayed and require attention.",
                'alert_type'    => 'Waste Manifest Delay',
                'severity'      => 'High',
                'linked_module' => 'waste',
            ]);
            $alerts[] = $alert;
        }

        AiLog::create([
            'user_id'          => auth()->id(),
            'user_name'        => auth()->user()?->name ?? 'System',
            'action_type'      => 'Alerts Generated',
            'output_reference' => count($alerts) . ' alerts processed',
        ]);

        return $alerts;
    }

    // ─── Document Analysis ──────────────────────────────

    public function analyzeDocument(
        string $filePath,
        string $originalName,
        string $fileType,
        int $fileSizeKb,
        ?int $userId
    ): AiDocumentAnalysis {
        $analysis = AiDocumentAnalysis::create([
            'user_id'        => $userId,
            'file_path'      => $filePath,
            'original_name'  => $originalName,
            'file_type'      => $fileType,
            'file_size_kb'   => $fileSizeKb,
            'mapping_status' => 'Pending',
        ]);

        $fileContent = '';
        if (in_array(strtolower($fileType), ['txt', 'csv'])) {
            $fullPath = storage_path('app/public/' . $filePath);
            if (file_exists($fullPath)) {
                $fileContent = substr(file_get_contents($fullPath), 0, 3000);
            }
        }

        $isMomDoc = str_contains(strtolower($originalName), 'mom')
            || str_contains(strtolower($originalName), 'minutes')
            || str_contains(strtolower($originalName), 'meeting');

        $prompt = "You are analyzing a document for an EHS (Environment, Health & Safety) system.\n\n" .
            "File name: {$originalName}\n" .
            "File type: {$fileType}\n" .
            ($fileContent ? "Content preview:\n{$fileContent}\n\n" : "") .
            "Analyze this document and respond in JSON only:\n" .
            "{\n" .
            "  \"detected_type\": \"[HSE Plan|RAMS|MOS|ERP|Lift Plan|Incident Report|Training Record|Inspection Report|MOM|Permit|Campaign Report|Environmental Plan|Waste Manifest|Other]\",\n" .
            "  \"confidence\": [0-100],\n" .
            "  \"key_fields_detected\": {\n" .
            "    \"title\": \"[if found from filename]\",\n" .
            "    \"date\": \"[if found]\",\n" .
            "    \"reference_number\": \"[if found]\",\n" .
            "    \"area\": \"[if found]\",\n" .
            "    \"contractor\": \"[if found]\"\n" .
            "  },\n" .
            "  \"missing_fields\": [\"field1\", \"field2\"],\n" .
            "  \"summary\": \"[2-3 sentence summary based on filename and content]\",\n" .
            "  \"suggested_module\": \"[rams|permits|incidents|documents|mom|training|observations|violations|environmental|waste|campaigns]\",\n" .
            "  \"suggested_action\": \"[what to do with this doc]\"\n" .
            "}\n\n" .
            "Return ONLY valid JSON. No other text.";

        if ($isMomDoc) {
            $prompt .= "\n\nThis appears to be a Minutes of Meeting document. " .
                "Also extract and include in your key_fields_detected JSON:\n" .
                "\"meeting_title\": \"title\",\n" .
                "\"meeting_date\": \"YYYY-MM-DD or empty string\",\n" .
                "\"location\": \"location or empty string\",\n" .
                "\"chaired_by\": \"name or empty string\",\n" .
                "\"prepared_by\": \"name or empty string\",\n" .
                "\"meeting_type\": \"Weekly HSE Meeting|Monthly HSE Meeting|Client PMC HSE Meeting|Incident Review|RAMS Review|Other\",\n" .
                "\"attendees\": [\"name1\", \"name2\"],\n" .
                "\"action_items\": [{\"description\": \"\", \"owner\": \"\", \"due_date\": \"\"}]";
        }

        $result = $this->callClaude(
            "You are a document analysis AI for an EHS management system. Respond only in valid JSON.",
            $prompt,
            800
        );

        if (!$result['success']) {
            $analysis->update([
                'mapping_status' => 'Failed',
                'summary'        => $result['error'] ?? 'AI analysis failed',
            ]);
            throw new \RuntimeException($result['error'] ?? 'AI analysis failed');
        }

        $parsed = [];
        try {
            $clean  = preg_replace('/```json|```/', '', $result['text']);
            $parsed = json_decode(trim($clean), true) ?? [];
        } catch (\Exception $e) {
            $parsed = [];
        }

        $analysis->update([
            'detected_document_type' => $parsed['detected_type'] ?? null,
            'confidence_score'       => $parsed['confidence'] ?? null,
            'extracted_data'         => $parsed['key_fields_detected'] ?? null,
            'missing_fields'         => $parsed['missing_fields'] ?? null,
            'summary'                => $parsed['summary'] ?? null,
            'suggested_module'       => $parsed['suggested_module'] ?? null,
            'suggested_action'       => $parsed['suggested_action'] ?? null,
            'raw_response'           => $result['text'] ?? null,
            'tokens_used'            => $result['tokens_used'] ?? 0,
        ]);

        AiLog::create([
            'user_id'          => $userId,
            'user_name'        => auth()->user()?->name ?? 'System',
            'action_type'      => 'Document Analyzed',
            'input_reference'  => $originalName,
            'output_reference' => 'ai_document_analyses:' . $analysis->id,
            'tokens_used'      => $result['tokens_used'] ?? 0,
            'duration_ms'      => $result['duration_ms'] ?? 0,
        ]);

        return $analysis->fresh();
    }

    // ─── Dashboard Summary ──────────────────────────────

    public function getDashboardData(): array
    {
        return [
            'active_alerts'           => AiAlert::active()->count(),
            'critical_alerts'         => AiAlert::active()->where('severity', 'Critical')->count(),
            'active_insights'         => AiInsight::active()->count(),
            'pending_recommendations' => AiRecommendation::pending()->count(),

            'top_alerts' => AiAlert::active()
                ->orderByRaw("FIELD(severity, 'Critical', 'High', 'Medium', 'Low')")
                ->orderByDesc('created_at')
                ->limit(5)->get(),

            'top_insights' => AiInsight::active()
                ->orderByRaw("FIELD(severity, 'Critical', 'High', 'Medium', 'Low', 'Info')")
                ->limit(5)->get(),

            'top_recommendations' => AiRecommendation::pending()
                ->orderByRaw("FIELD(priority, 'Critical', 'High', 'Medium', 'Low')")
                ->limit(5)->get(),

            'module_summary' => [
                'open_observations'       => DB::table('observations')->whereNull('deleted_at')->whereNotIn('status', ['Closed', 'Verified'])->count(),
                'overdue_observations'    => DB::table('observations')->whereNull('deleted_at')->where('status', 'Overdue')->count(),
                'open_incidents'          => DB::table('incidents')->whereNotIn('status', ['Closed', 'Verified'])->count(),
                'active_permits'          => DB::table('permits')->whereNull('deleted_at')->where('status', 'Active')->count(),
                'open_violations'         => DB::table('violations')->whereNotIn('status', ['Closed', 'Verified'])->count(),
                'overdue_mom_actions'     => DB::table('mom_points')->whereNotIn('status', ['Closed', 'Resolved'])->where('due_date', '<', now())->count(),
                'expired_documents'       => DB::table('dc_documents')->whereNull('deleted_at')->where('is_expired', 1)->count(),
                'suspended_contractors'   => DB::table('contractors')->where('is_suspended', 1)->count(),
                'delayed_waste_manifests' => DB::table('waste_manifests')->whereNull('deleted_at')->where('is_delayed', 1)->count(),
                'training_expiring'       => DB::table('training_records')->whereNull('deleted_at')->where('status', 'Expiring Soon')->count(),
            ],

            'recent_queries' => AiQuery::successful()
                ->latest()->limit(5)->get(['id', 'query_text', 'response_type', 'created_at']),
        ];
    }
}
