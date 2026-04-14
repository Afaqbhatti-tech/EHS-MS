<?php

namespace App\Services\Import;

/**
 * Classifies documents into target modules based on content analysis.
 * Uses keyword scoring with context weighting to determine where
 * imported data should be routed.
 *
 * Supports special detection for Weekly EHS Meeting PPT slides:
 * title/header, closing, activities, statistics, MOM, site visits,
 * lookahead, permits progress, training update, ATS progress.
 */
class DocumentClassifierService
{
    /**
     * Module keyword definitions with weights.
     * Higher weight = stronger indicator for that module.
     */
    protected array $moduleSignatures = [
        'mom' => [
            'keywords' => [
                'minutes of meeting' => 10, 'mom' => 5, 'meeting minutes' => 10,
                'action point' => 8, 'action item' => 8, 'agenda' => 5,
                'attendees' => 6, 'chaired by' => 8, 'meeting date' => 6,
                'carried forward' => 7, 'carry forward' => 7,
                'meeting note' => 6, 'open point' => 6, 'closed point' => 6,
                'follow up' => 4, 'discussion point' => 5,
                'week number' => 4, 'weekly meeting' => 7,
                'resolved point' => 6, 'overdue point' => 6,
                'distributed' => 3, 'minutes prepared' => 5,
            ],
        ],
        'training' => [
            'keywords' => [
                'training' => 6, 'training matrix' => 10, 'training record' => 10,
                'induction' => 8, 'site induction' => 9, 'toolbox talk' => 8,
                'certificate' => 4, 'competency' => 6, 'expiry date' => 4,
                'trainer' => 6, 'training date' => 8, 'training topic' => 8,
                'safety training' => 8, 'work at height training' => 10,
                'fire safety training' => 9, 'first aid training' => 9,
                'mewp training' => 9, 'lifting training' => 8,
                'training update' => 8, 'training progress' => 7,
                'training compliance' => 8, 'valid' => 2, 'expired' => 3,
                'bulk assignment' => 5,
            ],
        ],
        'permits' => [
            'keywords' => [
                'permit to work' => 10, 'ptw' => 8, 'work permit' => 10,
                'hot work' => 8, 'confined space' => 8, 'work at height' => 6,
                'excavation' => 6, 'lifting operation' => 7,
                'permit type' => 8, 'permit status' => 8, 'permit number' => 8,
                'valid from' => 5, 'valid to' => 5, 'permit date' => 7,
                'safety measures' => 4, 'ppe requirements' => 4,
                'permit progress' => 8, 'permit update' => 7,
                'applicant' => 3, 'line break' => 5,
            ],
        ],
        'observations' => [
            'keywords' => [
                'observation' => 8, 'unsafe act' => 10, 'unsafe condition' => 10,
                'safety observation' => 10, 'non-conformance' => 7, 'ncr' => 6,
                'corrective action' => 6, 'hazard' => 5,
                'observation type' => 8, 'observation date' => 8,
                'reporting officer' => 7, 'observation category' => 8,
                'near miss' => 6, 'positive observation' => 7,
                'observation status' => 7,
            ],
        ],
        'mockups' => [
            'keywords' => [
                'mock-up' => 10, 'mockup' => 10, 'mock up' => 10,
                'mockup register' => 10, 'procedure approval' => 8,
                'method statement' => 5, 'approval status' => 5,
                'submitted for review' => 6, 'fft decision' => 8,
                'consultant decision' => 8, 'client decision' => 8,
                'procedure type' => 7, 'mockup status' => 8,
            ],
        ],
        'checklists' => [
            'keywords' => [
                'checklist' => 8, 'equipment checklist' => 10,
                'inspection checklist' => 9, 'pre-use check' => 8,
                'safety check' => 6, 'daily check' => 6,
                'condition' => 3, 'pass' => 2, 'fail' => 2,
                'harness' => 5, 'fire extinguisher' => 5,
                'ladder inspection' => 8, 'generator check' => 7,
                'mewp check' => 8, 'health condition' => 5,
                'equipment check' => 7, 'defect' => 4,
            ],
        ],
        'tracker' => [
            'keywords' => [
                'equipment tracker' => 10, 'asset register' => 8,
                'equipment register' => 8, 'asset tracker' => 8,
                'inventory' => 5, 'equipment list' => 7,
                'serial number' => 4, 'plate number' => 4,
                'tuv' => 5, 'tuv inspection' => 8,
                'third party inspection' => 6, 'certificate expiry' => 5,
                'equipment status' => 7, 'swl' => 4,
                'onboarding date' => 5, 'sticker number' => 6,
            ],
        ],
        'incidents' => [
            'keywords' => [
                'incident' => 8, 'accident' => 8, 'injury' => 7,
                'first aid case' => 9, 'lost time injury' => 10,
                'lti' => 7, 'incident report' => 10,
                'root cause' => 6, 'investigation' => 5,
                'severity' => 3, 'classification' => 3,
                'immediate actions' => 5, 'witnesses' => 4,
            ],
        ],
        'manpower' => [
            'keywords' => [
                'manpower' => 8, 'headcount' => 8, 'man-hours' => 8,
                'manhours' => 8, 'worker' => 3, 'labour' => 5,
                'attendance' => 6, 'workforce' => 6,
                'daily hours' => 7, 'overtime' => 5,
                'shift' => 3, 'worker list' => 8,
                'employee' => 3, 'profession' => 4,
                'nationality' => 3, 'demobilization' => 5,
            ],
        ],
        'rams' => [
            'keywords' => [
                'rams' => 8, 'risk assessment' => 8, 'method statement' => 8,
                'risk assessment method statement' => 10,
                'risk register' => 7, 'hazard identification' => 6,
                'control measure' => 5, 'residual risk' => 6,
                'rams document' => 10, 'rams status' => 8,
            ],
        ],
        'reports' => [
            'keywords' => [
                'weekly report' => 9, 'monthly report' => 9,
                'daily report' => 8, 'progress report' => 8,
                'ehs report' => 9, 'safety report' => 8,
                'statistics' => 5, 'kpi' => 6,
                'compliance' => 4, 'summary report' => 7,
                'dashboard' => 4, 'analytics' => 4,
                'site visit' => 5, '7-day lookahead' => 7,
                'lookahead' => 5, 'ats progress' => 7,
            ],
        ],
    ];

    /**
     * Weekly meeting slide type patterns.
     * Each type has keyword patterns matched against slide heading + content.
     * Order matters: first match wins.
     */
    protected array $weeklySlidePatterns = [
        'weekly_mom_header' => [
            'patterns' => [
                'weekly ehs meeting', 'weekly ehs review', 'weekly safety meeting',
                'line builder weekly', 'line builders weekly',
                'ehs weekly meeting', 'weekly hse meeting',
            ],
            'indicators' => ['area', 'line builder', 'date', 'ehs'],
            'min_indicators' => 2,
        ],
        'closing_slide' => [
            'patterns' => [
                'thank you', 'thanks', 'end of presentation',
                'any questions', 'questions?', 'q&a',
                'thank you for your attention',
            ],
            'indicators' => [],
            'min_indicators' => 0,
        ],
        'weekly_mom_activities' => [
            'patterns' => [
                'completed & upcoming', 'completed and upcoming',
                'completed activities', 'upcoming activities',
                'activities update', 'activity update',
                'completed & upcoming activities',
            ],
            'indicators' => ['completed', 'upcoming', 'activities'],
            'min_indicators' => 2,
        ],
        'weekly_report_statistics' => [
            'patterns' => [
                'ehs weekly statistically', 'ehs weekly statistical',
                'key ehs statistics', 'ehs statistics',
                'weekly statistics', 'statistical information',
                'statistically information summary',
                'safety statistics', 'ehs kpi',
            ],
            'indicators' => ['statistics', 'statistical', 'statistically', 'kpi', 'summary'],
            'min_indicators' => 1,
        ],
        'weekly_mom_points' => [
            'patterns' => [
                'minutes of meeting', 'mom', 'meeting minutes',
                'action points', 'action items',
            ],
            'indicators' => ['mom', 'action', 'point', 'meeting'],
            'min_indicators' => 1,
        ],
        'weekly_mom_updates' => [
            'patterns' => [
                'site visit updates', 'site visit update',
                'site visit', 'site updates',
                'field visit updates', 'field visit',
            ],
            'indicators' => ['site', 'visit', 'update', 'field'],
            'min_indicators' => 2,
        ],
        'weekly_mom_lookahead' => [
            'patterns' => [
                '07 days lookahead', '7 days lookahead', '7-day lookahead',
                '07 day lookahead', '7 day lookahead',
                'lookahead plan', 'look ahead plan',
                'lookahead', 'look-ahead',
                'week ahead plan', 'next week plan',
            ],
            'indicators' => ['lookahead', 'look ahead', 'look-ahead', 'plan', '07 days', '7 days'],
            'min_indicators' => 1,
        ],
        'permits_progress' => [
            'patterns' => [
                'permit to work progress', 'permit progress',
                'ptw progress', 'permit update',
                'permits progress', 'permit to work update',
                'ptw update', 'permit status update',
            ],
            'indicators' => ['permit', 'ptw', 'progress', 'work'],
            'min_indicators' => 2,
        ],
        'training_update' => [
            'patterns' => [
                'training update', 'training progress',
                'training status', 'training summary',
                'training matrix update',
            ],
            'indicators' => ['training', 'update', 'progress', 'matrix'],
            'min_indicators' => 1,
        ],
        'ats_progress' => [
            'patterns' => [
                'ats progress', 'ats update', 'ats status',
                'ats summary',
            ],
            'indicators' => ['ats', 'progress'],
            'min_indicators' => 1,
        ],
    ];

    /**
     * Classify the analyzed document content.
     *
     * @return array{document_type: string, primary_module: string, module_scores: array, section_assignments: array}
     */
    public function classify(array $analyzedContent): array
    {
        $sections = $analyzedContent['sections'] ?? [];
        $rawText = strtolower($analyzedContent['raw_text'] ?? '');
        $tables = $analyzedContent['tables'] ?? [];

        // Detect if this is a weekly meeting PPT
        $isWeeklyMeeting = $this->isWeeklyMeetingDocument($rawText);

        // Score each module based on full document
        $moduleScores = $this->scoreModules($rawText);

        // Score based on section categories
        foreach ($sections as $section) {
            $cat = $section['category'] ?? 'general';
            if (isset($moduleScores[$cat])) {
                $moduleScores[$cat] += 5; // Boost for categorized sections
            }
        }

        // Score based on table types
        foreach ($tables as $table) {
            $type = $table['table_type'] ?? 'generic';
            $moduleMap = [
                'action_items' => 'mom', 'training' => 'training',
                'permits' => 'permits', 'equipment' => 'tracker',
                'observations' => 'observations', 'manpower' => 'manpower',
            ];
            if (isset($moduleMap[$type])) {
                $moduleScores[$moduleMap[$type]] = ($moduleScores[$moduleMap[$type]] ?? 0) + 15;
            }
        }

        // Normalize scores
        $maxScore = max(array_values($moduleScores) ?: [1]);
        $normalizedScores = [];
        foreach ($moduleScores as $module => $score) {
            $normalizedScores[$module] = round($score / $maxScore, 2);
        }
        arsort($normalizedScores);

        // Determine primary module
        $primaryModule = array_key_first($normalizedScores) ?? 'reports';

        // Determine document type
        $documentType = $this->determineDocumentType($normalizedScores, $analyzedContent, $isWeeklyMeeting);

        // Assign sections to modules (with weekly meeting awareness)
        $sectionAssignments = $this->assignSectionsToModules($sections, $isWeeklyMeeting);

        // Filter modules above threshold
        $relevantModules = array_filter($normalizedScores, fn($score) => $score >= 0.15);

        return [
            'document_type' => $documentType,
            'primary_module' => $primaryModule,
            'module_scores' => $relevantModules,
            'section_assignments' => $sectionAssignments,
            'is_multi_module' => count($relevantModules) > 1,
            'is_weekly_meeting' => $isWeeklyMeeting,
        ];
    }

    /**
     * Detect if this document is a weekly EHS meeting PPT.
     */
    protected function isWeeklyMeetingDocument(string $rawText): bool
    {
        $indicators = [
            'weekly ehs meeting' => 3,
            'line builder weekly' => 3,
            'line builders weekly' => 3,
            'ehs weekly' => 2,
            'weekly safety meeting' => 2,
            'weekly hse meeting' => 2,
            'weekly ehs review' => 2,
            'permit to work progress' => 1,
            'training update' => 1,
            'site visit updates' => 1,
            'lookahead plan' => 1,
            'lookahead' => 1,
            'ats progress' => 1,
            'thank you' => 1,
        ];

        $score = 0;
        foreach ($indicators as $keyword => $weight) {
            if (str_contains($rawText, $keyword)) {
                $score += $weight;
            }
        }

        // Need a strong signal (title match) or multiple weaker signals
        return $score >= 3;
    }

    /**
     * Score each module based on keyword presence in text.
     */
    protected function scoreModules(string $text): array
    {
        $scores = [];

        foreach ($this->moduleSignatures as $module => $config) {
            $score = 0;
            foreach ($config['keywords'] as $keyword => $weight) {
                $count = substr_count($text, strtolower($keyword));
                if ($count > 0) {
                    $score += $weight * min($count, 5); // Cap repeats to avoid over-scoring
                }
            }
            if ($score > 0) {
                $scores[$module] = $score;
            }
        }

        return $scores;
    }

    /**
     * Determine the overall document type.
     */
    protected function determineDocumentType(array $scores, array $analyzedContent, bool $isWeeklyMeeting = false): string
    {
        $primary = array_key_first($scores) ?? 'general';
        $rawText = strtolower($analyzedContent['raw_text'] ?? '');
        $stats = $analyzedContent['statistics'] ?? [];
        $sectionCategories = $stats['section_categories'] ?? [];

        // Weekly meeting PPT detection takes priority
        if ($isWeeklyMeeting) {
            return 'weekly_ehs_meeting';
        }

        // Multi-module documents
        $relevantModules = array_filter($scores, fn($s) => $s >= 0.3);
        if (count($relevantModules) >= 3) {
            if (str_contains($rawText, 'weekly report') || str_contains($rawText, 'weekly update')) {
                return 'weekly_report';
            }
            if (str_contains($rawText, 'monthly report') || str_contains($rawText, 'monthly update')) {
                return 'monthly_report';
            }
            return 'multi_module_report';
        }

        // Specific document types
        $typeMap = [
            'mom' => 'meeting_minutes',
            'training' => 'training_record',
            'permits' => 'permit_document',
            'observations' => 'observation_report',
            'mockups' => 'mockup_register',
            'checklists' => 'inspection_checklist',
            'tracker' => 'equipment_register',
            'incidents' => 'incident_report',
            'manpower' => 'manpower_record',
            'rams' => 'risk_assessment',
            'reports' => 'general_report',
        ];

        return $typeMap[$primary] ?? 'general_document';
    }

    /**
     * Assign each section to its most relevant module.
     * When the document is a weekly meeting PPT, use slide-type detection first.
     */
    protected function assignSectionsToModules(array $sections, bool $isWeeklyMeeting = false): array
    {
        $assignments = [];

        foreach ($sections as $idx => $section) {
            $category = $section['category'] ?? 'general';
            $heading = $section['heading'] ?? '';
            $content = $section['content'] ?? '';
            $combined = strtolower($heading . ' ' . $content);

            // For weekly meeting PPTs, try slide-type detection first
            if ($isWeeklyMeeting) {
                $slideType = $this->detectWeeklySlideType($combined);
                if ($slideType) {
                    $module = $this->weeklySlideTypeToModule($slideType);
                    $assignments[] = [
                        'section_index' => $idx,
                        'heading' => $heading,
                        'module' => $module,
                        'confidence' => $this->getWeeklySlideConfidence($slideType),
                        'slide_type' => $slideType,
                        'is_informational' => in_array($slideType, ['weekly_mom_header', 'closing_slide']),
                        'scores' => [$module => 50],
                    ];
                    continue;
                }
            }

            // Standard module scoring for non-weekly or unmatched slides
            $sectionScores = $this->scoreModules($combined);

            // Boost based on analyzer's category
            if (isset($sectionScores[$category])) {
                $sectionScores[$category] *= 1.5;
            } elseif ($category !== 'general') {
                $sectionScores[$category] = 10;
            }

            $bestModule = !empty($sectionScores) ? array_key_first(
                (function ($arr) { arsort($arr); return $arr; })($sectionScores)
            ) : 'general';

            $maxScore = max(array_values($sectionScores) ?: [0]);
            $confidence = $maxScore > 0 ? min($maxScore / 50, 1.0) : 0.1;

            $assignments[] = [
                'section_index' => $idx,
                'heading' => $heading,
                'module' => $bestModule,
                'confidence' => round($confidence, 2),
                'slide_type' => null,
                'is_informational' => false,
                'scores' => $sectionScores,
            ];
        }

        return $assignments;
    }

    /**
     * Detect the weekly meeting slide type from slide text.
     * Returns the slide type key or null if no match.
     */
    protected function detectWeeklySlideType(string $text): ?string
    {
        $text = strtolower(trim($text));

        foreach ($this->weeklySlidePatterns as $slideType => $config) {
            // Check direct pattern matches first (strongest signal)
            foreach ($config['patterns'] as $pattern) {
                if (str_contains($text, $pattern)) {
                    return $slideType;
                }
            }

            // Check indicator-based matching (needs min_indicators threshold)
            if (!empty($config['indicators']) && $config['min_indicators'] > 0) {
                $matched = 0;
                foreach ($config['indicators'] as $indicator) {
                    if (str_contains($text, $indicator)) {
                        $matched++;
                    }
                }
                if ($matched >= $config['min_indicators']) {
                    return $slideType;
                }
            }
        }

        // Special: detect very short slides (< 30 chars) with only generic text as closing
        $stripped = preg_replace('/\bslide\s*\d+\b/i', '', $text);
        $stripped = trim($stripped);
        if (strlen($stripped) < 30 && strlen($stripped) > 0) {
            $closingWords = ['thank', 'thanks', 'end', 'fin', 'q&a', 'questions'];
            foreach ($closingWords as $word) {
                if (str_contains($stripped, $word)) {
                    return 'closing_slide';
                }
            }
        }

        return null;
    }

    /**
     * Map weekly slide type to its target module for data storage.
     */
    protected function weeklySlideTypeToModule(string $slideType): string
    {
        return match ($slideType) {
            'weekly_mom_header' => 'weekly_mom_header',
            'closing_slide' => 'closing_slide',
            'weekly_mom_activities' => 'mom',
            'weekly_report_statistics' => 'reports',
            'weekly_mom_points' => 'mom',
            'weekly_mom_updates' => 'mom',
            'weekly_mom_lookahead' => 'mom',
            'permits_progress' => 'permits',
            'training_update' => 'training',
            'ats_progress' => 'reports',
            default => 'reports',
        };
    }

    /**
     * Confidence score for weekly slide type matches.
     */
    protected function getWeeklySlideConfidence(string $slideType): float
    {
        return match ($slideType) {
            'weekly_mom_header' => 0.95,
            'closing_slide' => 0.95,
            'weekly_mom_activities' => 0.85,
            'weekly_report_statistics' => 0.85,
            'weekly_mom_points' => 0.90,
            'weekly_mom_updates' => 0.80,
            'weekly_mom_lookahead' => 0.80,
            'permits_progress' => 0.85,
            'training_update' => 0.85,
            'ats_progress' => 0.80,
            default => 0.70,
        };
    }
}
