<?php

namespace App\Services\Import;

/**
 * Analyzes parsed document content to enrich it with structural understanding.
 * Detects key-value pairs, metadata fields, status indicators, dates, and
 * categorizes each section for downstream classification and mapping.
 */
class DocumentAnalyzerService
{
    /**
     * Analyze parsed document content and enrich with structural understanding.
     */
    public function analyze(array $parsedContent): array
    {
        $sections = $parsedContent['sections'] ?? [];
        $rawText = $parsedContent['raw_text'] ?? '';
        $tables = $parsedContent['tables'] ?? [];

        $enrichedSections = [];
        $documentMetaFields = $this->extractMetadataFields($rawText);
        $allKeyValuePairs = [];

        foreach ($sections as $section) {
            $enriched = $this->analyzeSection($section);
            $enrichedSections[] = $enriched;
            $allKeyValuePairs = array_merge($allKeyValuePairs, $enriched['key_value_pairs'] ?? []);
        }

        // Merge doc-level metadata
        $mergedMeta = array_merge($documentMetaFields, $allKeyValuePairs);

        return [
            'metadata' => $parsedContent['metadata'] ?? [],
            'document_metadata' => $mergedMeta,
            'sections' => $enrichedSections,
            'tables' => $this->analyzeTables($tables),
            'raw_text' => $rawText,
            'statistics' => $this->computeStatistics($enrichedSections, $rawText),
        ];
    }

    /**
     * Analyze a single section and enrich it.
     */
    protected function analyzeSection(array $section): array
    {
        $content = $section['content'] ?? '';
        $heading = $section['heading'] ?? '';

        // Detect key-value pairs
        $kvPairs = $this->extractKeyValuePairs($content);

        // Detect dates
        $dates = $this->extractDates($content);

        // Detect status words
        $statuses = $this->extractStatuses($content);

        // Detect category/context
        $sectionCategory = $this->categorizeSection($heading, $content);

        // Detect items (bullet points, numbered items)
        $items = $section['items'] ?? [];
        if (empty($items)) {
            $items = $this->extractBulletItems($content);
        }

        // Enrich items with status and metadata
        $enrichedItems = array_map(function ($item) {
            return [
                'text' => $item,
                'status' => $this->extractInlineStatus($item),
                'assignee' => $this->extractAssignee($item),
                'date' => $this->extractInlineDate($item),
                'priority' => $this->extractPriority($item),
            ];
        }, $items);

        return array_merge($section, [
            'category' => $sectionCategory,
            'key_value_pairs' => $kvPairs,
            'detected_dates' => $dates,
            'detected_statuses' => $statuses,
            'enriched_items' => $enrichedItems,
            'items' => $items,
            'has_action_items' => $this->hasActionItems($content, $items),
            'has_statistics' => $this->hasStatistics($content),
            'has_table_data' => isset($section['table_data']),
        ]);
    }

    /**
     * Extract key:value pairs from text.
     */
    protected function extractKeyValuePairs(string $text): array
    {
        $pairs = [];
        $lines = explode("\n", $text);

        foreach ($lines as $line) {
            $trimmed = trim($line);

            // Pattern: "Key: Value" or "Key - Value"
            if (preg_match('/^([A-Za-z][\w\s\-\/&]+?)\s*[:]\s*(.+)$/', $trimmed, $m)) {
                $key = trim($m[1]);
                $value = trim($m[2]);
                if (strlen($key) <= 50 && strlen($value) <= 500) {
                    $pairs[strtolower(str_replace(' ', '_', $key))] = $value;
                }
            }
            // Pattern: "Key - Value" (only if key is short)
            elseif (preg_match('/^([A-Za-z][\w\s]{2,30}?)\s+[-–—]\s+(.+)$/', $trimmed, $m)) {
                $key = trim($m[1]);
                $value = trim($m[2]);
                if (strlen($key) <= 40) {
                    $pairs[strtolower(str_replace(' ', '_', $key))] = $value;
                }
            }
        }

        return $pairs;
    }

    /**
     * Extract metadata fields from full document text.
     */
    protected function extractMetadataFields(string $text): array
    {
        $meta = [];

        // Date patterns
        if (preg_match('/\b(?:Date|Meeting Date|Report Date|Document Date)\s*[:]\s*(.+)/i', $text, $m)) {
            $meta['date'] = $this->normalizeDate(trim($m[1]));
        }

        // Area/Location
        if (preg_match('/\b(?:Area|Location|Site|Zone|Project)\s*[:]\s*(.+)/i', $text, $m)) {
            $meta['area'] = trim($m[1]);
        }

        // Contractor/Team
        if (preg_match('/\b(?:Contractor|Team|Company|Builder|Line Builder)\s*[:]\s*(.+)/i', $text, $m)) {
            $meta['contractor'] = trim($m[1]);
        }

        // Prepared by / Author
        if (preg_match('/\b(?:Prepared By|Author|Submitted By|Written By|Reported By)\s*[:]\s*(.+)/i', $text, $m)) {
            $meta['prepared_by'] = trim($m[1]);
        }

        // Week number
        if (preg_match('/\b(?:Week|W)\s*#?\s*(\d{1,2})\b/i', $text, $m)) {
            $meta['week_number'] = (int) $m[1];
        }

        // Project/Site name
        if (preg_match('/\b(?:Project Name|Site Name|Client)\s*[:]\s*(.+)/i', $text, $m)) {
            $meta['project'] = trim($m[1]);
        }

        // Meeting-specific fields
        if (preg_match('/\b(?:Chaired By|Chair)\s*[:]\s*(.+)/i', $text, $m)) {
            $meta['chaired_by'] = trim($m[1]);
        }
        if (preg_match('/\b(?:Attendees|Participants|Present)\s*[:]\s*(.+)/i', $text, $m)) {
            $meta['attendees'] = array_map('trim', preg_split('/[,;]/', trim($m[1])));
        }

        return $meta;
    }

    /**
     * Extract dates from text.
     */
    protected function extractDates(string $text): array
    {
        $dates = [];
        // DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, etc.
        preg_match_all('/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\b/', $text, $matches);
        foreach ($matches[1] as $d) {
            $normalized = $this->normalizeDate($d);
            if ($normalized) $dates[] = $normalized;
        }
        // "January 15, 2025" style
        preg_match_all('/\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})\b/i', $text, $matches);
        foreach ($matches[1] as $d) {
            $normalized = $this->normalizeDate($d);
            if ($normalized) $dates[] = $normalized;
        }
        // "Jan 15, 2025"
        preg_match_all('/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4})\b/i', $text, $matches);
        foreach ($matches[1] as $d) {
            $normalized = $this->normalizeDate($d);
            if ($normalized) $dates[] = $normalized;
        }

        return array_unique($dates);
    }

    /**
     * Extract status words from text.
     */
    protected function extractStatuses(string $text): array
    {
        $statusPatterns = [
            'open', 'closed', 'in progress', 'completed', 'pending',
            'resolved', 'rejected', 'approved', 'draft', 'submitted',
            'overdue', 'upcoming', 'cancelled', 'expired', 'active',
            'blocked', 'carried forward', 'done', 'not started',
            'under review', 'submitted for review', 'approved with comments',
        ];

        $found = [];
        $lower = strtolower($text);

        foreach ($statusPatterns as $status) {
            if (str_contains($lower, $status)) {
                $found[] = $status;
            }
        }

        return array_unique($found);
    }

    /**
     * Categorize a section based on its heading and content.
     * Includes detection for weekly EHS meeting slide types.
     */
    protected function categorizeSection(string $heading, string $content): string
    {
        $combined = strtolower($heading . ' ' . $content);

        // Check for weekly meeting slide types first (highest priority)
        $weeklyType = $this->detectWeeklySlideCategory($combined);
        if ($weeklyType) {
            return $weeklyType;
        }

        $categories = [
            'mom' => ['minutes of meeting', 'mom', 'meeting minutes', 'action point', 'action item', 'meeting note', 'carried forward'],
            'training' => ['training', 'induction', 'certificate', 'competency', 'toolbox talk', 'safety training', 'training matrix', 'training record'],
            'permit' => ['permit to work', 'ptw', 'work permit', 'hot work', 'confined space', 'work at height', 'excavation', 'lifting'],
            'observation' => ['observation', 'unsafe act', 'unsafe condition', 'ncr', 'non-conformance', 'near miss', 'hazard'],
            'inspection' => ['inspection', 'checklist', 'equipment check', 'safety check', 'pre-use', 'daily check'],
            'mockup' => ['mock-up', 'mockup', 'mock up', 'procedure approval', 'method statement'],
            'incident' => ['incident', 'accident', 'injury', 'first aid', 'lost time', 'lti', 'near miss'],
            'report' => ['report', 'summary', 'statistics', 'kpi', 'weekly report', 'monthly report', 'dashboard'],
            'tracker' => ['equipment', 'tracker', 'asset', 'register', 'inventory'],
            'rams' => ['rams', 'risk assessment', 'method statement', 'risk register'],
            'manpower' => ['manpower', 'headcount', 'man-hours', 'manhours', 'worker', 'labour', 'attendance'],
            'general' => ['update', 'progress', 'plan', 'lookahead', 'upcoming', 'completed'],
        ];

        $scores = [];
        foreach ($categories as $cat => $keywords) {
            $score = 0;
            foreach ($keywords as $kw) {
                $count = substr_count($combined, $kw);
                $score += $count;
                // Extra weight for heading matches
                if (str_contains(strtolower($heading), $kw)) {
                    $score += 3;
                }
            }
            if ($score > 0) {
                $scores[$cat] = $score;
            }
        }

        if (empty($scores)) return 'general';
        arsort($scores);
        return array_key_first($scores);
    }

    /**
     * Detect weekly EHS meeting slide categories from text.
     */
    protected function detectWeeklySlideCategory(string $text): ?string
    {
        // Title/header slide
        $headerPatterns = [
            'weekly ehs meeting', 'weekly ehs review', 'weekly safety meeting',
            'line builder weekly', 'line builders weekly', 'ehs weekly meeting',
        ];
        foreach ($headerPatterns as $p) {
            if (str_contains($text, $p)) return 'weekly_header';
        }

        // Closing slide
        $closingPatterns = ['thank you', 'thanks', 'end of presentation', 'any questions'];
        $stripped = preg_replace('/\bslide\s*\d+\b/', '', $text);
        $stripped = trim($stripped);
        if (strlen($stripped) < 50) {
            foreach ($closingPatterns as $p) {
                if (str_contains($stripped, $p)) return 'closing';
            }
        }

        // Activities
        if (str_contains($text, 'completed & upcoming') || str_contains($text, 'completed and upcoming')
            || str_contains($text, 'completed activities') || str_contains($text, 'upcoming activities')) {
            return 'mom';
        }

        // Statistics
        if (str_contains($text, 'ehs weekly statistic') || str_contains($text, 'key ehs statistics')
            || str_contains($text, 'statistical information') || str_contains($text, 'statistically information')) {
            return 'report';
        }

        // Site visit updates
        if (str_contains($text, 'site visit update') || str_contains($text, 'site visit')) {
            return 'mom';
        }

        // Lookahead
        if (str_contains($text, 'lookahead') || str_contains($text, 'look ahead')
            || str_contains($text, '07 days') || str_contains($text, '7-day')) {
            return 'mom';
        }

        // Permit progress
        if (str_contains($text, 'permit') && (str_contains($text, 'progress') || str_contains($text, 'update'))) {
            return 'permit';
        }

        // Training update
        if (str_contains($text, 'training update') || str_contains($text, 'training progress')
            || str_contains($text, 'training status')) {
            return 'training';
        }

        // ATS progress
        if (str_contains($text, 'ats progress') || str_contains($text, 'ats update')) {
            return 'report';
        }

        return null;
    }

    /**
     * Extract bullet/numbered items from text.
     */
    protected function extractBulletItems(string $content): array
    {
        $items = [];
        $lines = explode("\n", $content);

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if (preg_match('/^[\-\*\•\→\►\‣\⁃\◦\●\○]\s+(.+)$/', $trimmed, $m)) {
                $items[] = trim($m[1]);
            } elseif (preg_match('/^\d+[\.\)]\s+(.+)$/', $trimmed, $m)) {
                $items[] = trim($m[1]);
            } elseif (preg_match('/^[a-z][\.\)]\s+(.+)$/i', $trimmed, $m)) {
                $items[] = trim($m[1]);
            }
        }

        return $items;
    }

    /**
     * Extract inline status from a single item/line.
     */
    protected function extractInlineStatus(string $text): ?string
    {
        $lower = strtolower($text);

        $statusMap = [
            'completed' => 'Completed', 'complete' => 'Completed', 'done' => 'Completed', 'finished' => 'Completed',
            'in progress' => 'In Progress', 'ongoing' => 'In Progress', 'in-progress' => 'In Progress', 'wip' => 'In Progress',
            'open' => 'Open', 'not started' => 'Open', 'new' => 'Open',
            'closed' => 'Closed', 'resolved' => 'Resolved',
            'pending' => 'Pending', 'awaiting' => 'Pending', 'waiting' => 'Pending',
            'approved' => 'Approved', 'rejected' => 'Rejected', 'blocked' => 'Blocked',
            'overdue' => 'Overdue', 'expired' => 'Expired',
            'upcoming' => 'Upcoming', 'planned' => 'Upcoming',
            'cancelled' => 'Cancelled', 'canceled' => 'Cancelled',
            'carried forward' => 'Carried Forward',
        ];

        foreach ($statusMap as $keyword => $status) {
            if (str_contains($lower, $keyword)) {
                return $status;
            }
        }

        // Check for status in brackets/parentheses: "[Open]", "(Completed)", etc.
        if (preg_match('/[\[\(]\s*(open|closed|completed|in progress|pending|resolved|approved|rejected|overdue|blocked|draft|submitted)\s*[\]\)]/i', $text, $m)) {
            return ucfirst(strtolower(trim($m[1])));
        }

        return null;
    }

    /**
     * Extract assignee name from text.
     */
    protected function extractAssignee(string $text): ?string
    {
        // Patterns like "Assigned to: John", "Owner: John", "@John"
        if (preg_match('/(?:assigned to|owner|responsible|action by|by)\s*[:]\s*([A-Z][\w\s\.]+)/i', $text, $m)) {
            return trim($m[1]);
        }
        if (preg_match('/@([A-Z][\w\.]+)/i', $text, $m)) {
            return trim($m[1]);
        }
        return null;
    }

    /**
     * Extract inline date from text.
     */
    protected function extractInlineDate(string $text): ?string
    {
        // "Due: 15/01/2025", "by 15-01-2025", "Target: Jan 15, 2025"
        if (preg_match('/(?:due|by|target|deadline)\s*[:]\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i', $text, $m)) {
            return $this->normalizeDate($m[1]);
        }
        if (preg_match('/(?:due|by|target|deadline)\s*[:]\s*(\d{1,2}\s+\w+\s+\d{4})/i', $text, $m)) {
            return $this->normalizeDate($m[1]);
        }
        return null;
    }

    /**
     * Extract priority from text.
     */
    protected function extractPriority(string $text): ?string
    {
        $lower = strtolower($text);
        if (str_contains($lower, 'critical') || str_contains($lower, 'urgent')) return 'Critical';
        if (str_contains($lower, 'high priority') || str_contains($lower, 'high')) return 'High';
        if (str_contains($lower, 'medium') || str_contains($lower, 'moderate')) return 'Medium';
        if (str_contains($lower, 'low priority') || str_contains($lower, 'low')) return 'Low';
        return null;
    }

    protected function hasActionItems(string $content, array $items): bool
    {
        $lower = strtolower($content);
        if (str_contains($lower, 'action') || str_contains($lower, 'todo') || str_contains($lower, 'follow up')) {
            return true;
        }
        return count($items) > 0;
    }

    protected function hasStatistics(string $content): bool
    {
        // Contains numbers with % or numeric patterns
        return (bool) preg_match('/\d+\s*%/', $content)
            || (bool) preg_match('/\b\d{2,}\s+(?:incidents?|observations?|permits?|hours?|workers?|inspections?)/i', $content);
    }

    protected function analyzeTables(array $tables): array
    {
        return array_map(function ($table) {
            $headers = array_map('strtolower', $table['headers'] ?? []);
            $tableType = 'generic';

            // Classify table by headers
            if (array_intersect($headers, ['status', 'action', 'assigned to', 'due date', 'point'])) {
                $tableType = 'action_items';
            } elseif (array_intersect($headers, ['training', 'topic', 'certificate', 'expiry'])) {
                $tableType = 'training';
            } elseif (array_intersect($headers, ['permit', 'type', 'valid from', 'valid to'])) {
                $tableType = 'permits';
            } elseif (array_intersect($headers, ['equipment', 'serial', 'condition', 'inspection'])) {
                $tableType = 'equipment';
            } elseif (array_intersect($headers, ['observation', 'category', 'corrective'])) {
                $tableType = 'observations';
            } elseif (array_intersect($headers, ['worker', 'name', 'hours', 'attendance'])) {
                $tableType = 'manpower';
            }

            return array_merge($table, ['table_type' => $tableType]);
        }, $tables);
    }

    protected function computeStatistics(array $sections, string $rawText): array
    {
        $totalSections = count($sections);
        $totalItems = 0;
        $totalKeyValues = 0;
        $sectionCategories = [];

        foreach ($sections as $s) {
            $totalItems += count($s['items'] ?? []);
            $totalKeyValues += count($s['key_value_pairs'] ?? []);
            $cat = $s['category'] ?? 'general';
            $sectionCategories[$cat] = ($sectionCategories[$cat] ?? 0) + 1;
        }

        return [
            'total_sections' => $totalSections,
            'total_items' => $totalItems,
            'total_key_value_pairs' => $totalKeyValues,
            'section_categories' => $sectionCategories,
            'text_length' => strlen($rawText),
            'word_count' => str_word_count($rawText),
        ];
    }

    /**
     * Normalize date string to Y-m-d format.
     */
    protected function normalizeDate(string $dateStr): ?string
    {
        $dateStr = trim($dateStr);
        if (empty($dateStr)) return null;

        // Try multiple formats
        $formats = [
            'd/m/Y', 'd-m-Y', 'Y-m-d', 'm/d/Y', 'd/m/y',
            'd M Y', 'd F Y', 'M d, Y', 'F d, Y',
            'j M Y', 'j F Y', 'M j, Y', 'F j, Y',
            'd-M-Y', 'd-M-y', 'Y/m/d',
        ];

        foreach ($formats as $format) {
            $dt = \DateTime::createFromFormat($format, $dateStr);
            if ($dt !== false) {
                return $dt->format('Y-m-d');
            }
        }

        // Try PHP's natural parsing
        try {
            $ts = strtotime($dateStr);
            if ($ts !== false && $ts > 0) {
                return date('Y-m-d', $ts);
            }
        } catch (\Exception $e) {
            // ignore
        }

        return null;
    }
}
