<?php

namespace App\Services\Import;

/**
 * Maps analyzed and classified document content to application model fields.
 * Produces structured data ready for database insertion per module.
 *
 * Handles special weekly meeting PPT sections:
 * - Informational slides (header, closing) → tracked but not imported as records
 * - Weekly MOM sections → mapped to mom/reports with source_slide_no
 * - Permits/Training/ATS/Statistics → mapped to respective modules
 */
class DocumentMapperService
{
    protected StatusNormalizer $statusNormalizer;

    public function __construct(StatusNormalizer $statusNormalizer)
    {
        $this->statusNormalizer = $statusNormalizer;
    }

    /**
     * Map analyzed content to module-specific records.
     *
     * @return array{modules: array, unmapped: array, informational: array, warnings: array}
     */
    public function map(array $analyzedContent, array $classification): array
    {
        $sections = $analyzedContent['sections'] ?? [];
        $tables = $analyzedContent['tables'] ?? [];
        $docMeta = $analyzedContent['document_metadata'] ?? [];
        $sectionAssignments = $classification['section_assignments'] ?? [];
        $isWeeklyMeeting = $classification['is_weekly_meeting'] ?? false;

        $modules = [];
        $unmapped = [];
        $informational = [];
        $warnings = [];

        // Map table-based data (often the richest source)
        foreach ($tables as $table) {
            $tableType = $table['table_type'] ?? 'generic';
            $tableModule = $this->tableTypeToModule($tableType);
            $sourceSlide = $table['source_slide_no'] ?? null;

            if ($tableModule && !empty($table['rows'])) {
                $mapped = $this->mapTableToModule($table, $tableModule, $docMeta, $sourceSlide);
                $modules[$tableModule] = array_merge($modules[$tableModule] ?? [], $mapped['records']);
                $warnings = array_merge($warnings, $mapped['warnings']);
            }
        }

        // Map section-based data
        foreach ($sectionAssignments as $assignment) {
            $sectionIdx = $assignment['section_index'];
            $module = $assignment['module'];
            $confidence = $assignment['confidence'];
            $slideType = $assignment['slide_type'] ?? null;
            $isInformational = $assignment['is_informational'] ?? false;

            if (!isset($sections[$sectionIdx])) continue;
            $section = $sections[$sectionIdx];
            $sourceSlideNo = $section['slide_number'] ?? ($sectionIdx + 1);

            // Handle informational slides (title/header, closing/thank-you)
            if ($isInformational) {
                $infoRecord = $this->mapInformationalSlide($section, $slideType, $docMeta, $sourceSlideNo);
                $informational[] = $infoRecord;

                // Extract meeting metadata from header slides into docMeta
                if ($slideType === 'weekly_mom_header') {
                    $docMeta = array_merge($docMeta, $this->extractHeaderMetadata($section));
                }
                continue;
            }

            // Handle weekly meeting specific sections with slide_type
            if ($slideType && $isWeeklyMeeting) {
                $mapped = $this->mapWeeklySlideSection($section, $module, $slideType, $docMeta, $confidence, $sourceSlideNo);
                $modules[$module] = array_merge($modules[$module] ?? [], $mapped['records']);
                $warnings = array_merge($warnings, $mapped['warnings']);
                continue;
            }

            if ($module === 'general' || $confidence < 0.1) {
                $unmapped[] = [
                    'heading' => $section['heading'] ?? 'Unknown',
                    'content' => mb_substr($section['content'] ?? '', 0, 500),
                    'reason' => $confidence < 0.1 ? 'Low confidence' : 'No matching module',
                    'source_slide_no' => $sourceSlideNo,
                ];
                continue;
            }

            $mapped = $this->mapSectionToModule($section, $module, $docMeta, $confidence, $sourceSlideNo);
            $modules[$module] = array_merge($modules[$module] ?? [], $mapped['records']);
            $warnings = array_merge($warnings, $mapped['warnings']);
        }

        // Deduplicate records within each module
        foreach ($modules as $mod => &$records) {
            $records = $this->deduplicateRecords($records, $mod);
        }

        return [
            'modules' => $modules,
            'unmapped' => $unmapped,
            'informational' => $informational,
            'warnings' => $warnings,
            'document_metadata' => $docMeta,
        ];
    }

    /**
     * Map an informational slide (title/header or closing/thank-you).
     * These are tracked for the import summary but don't create module records.
     */
    protected function mapInformationalSlide(array $section, ?string $slideType, array $docMeta, int $sourceSlideNo): array
    {
        $heading = $section['heading'] ?? '';
        $content = $section['content'] ?? '';
        $slideTitle = $section['slide_title'] ?? '';

        $label = match ($slideType) {
            'weekly_mom_header' => 'Meeting header/title slide',
            'closing_slide' => 'Closing/thank-you slide',
            default => 'Informational slide',
        };

        return [
            'heading' => $heading,
            'slide_title' => $slideTitle,
            'content_preview' => mb_substr($content, 0, 200),
            'slide_type' => $slideType,
            'label' => $label,
            'source_slide_no' => $sourceSlideNo,
            'action' => 'ignored',
        ];
    }

    /**
     * Extract meeting metadata from a header/title slide.
     */
    protected function extractHeaderMetadata(array $section): array
    {
        $meta = [];
        $content = $section['content'] ?? '';
        $kvPairs = $section['key_value_pairs'] ?? [];

        // From key-value pairs
        if (!empty($kvPairs['area'])) $meta['area_name'] = $kvPairs['area'];
        if (!empty($kvPairs['area_name'])) $meta['area_name'] = $kvPairs['area_name'];
        if (!empty($kvPairs['date'])) $meta['meeting_date'] = $kvPairs['date'];
        if (!empty($kvPairs['meeting_date'])) $meta['meeting_date'] = $kvPairs['meeting_date'];
        if (!empty($kvPairs['line_builder'])) $meta['line_builder_name'] = $kvPairs['line_builder'];
        if (!empty($kvPairs['line_builders'])) $meta['line_builder_name'] = $kvPairs['line_builders'];
        if (!empty($kvPairs['ehs'])) $meta['ehs_owner'] = $kvPairs['ehs'];
        if (!empty($kvPairs['team'])) $meta['team_name'] = $kvPairs['team'];
        if (!empty($kvPairs['contractor'])) $meta['contractor_name'] = $kvPairs['contractor'];

        // From content pattern matching
        if (preg_match('/week\s*#?\s*(\d{1,2})/i', $content, $m)) {
            $meta['week_number'] = (int) $m[1];
        }
        if (preg_match('/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\b/', $content, $m)) {
            $meta['meeting_date'] = $meta['meeting_date'] ?? $m[1];
        }

        // Detect meeting title from slide
        $slideTitle = $section['slide_title'] ?? '';
        if (!empty($slideTitle)) {
            $meta['meeting_title'] = $slideTitle;
            $meta['document_title'] = $slideTitle;
        }

        $meta['meeting_type'] = 'Weekly EHS Meeting';

        return $meta;
    }

    /**
     * Map a weekly meeting-specific slide section to module records.
     */
    protected function mapWeeklySlideSection(array $section, string $module, string $slideType, array $docMeta, float $confidence, int $sourceSlideNo): array
    {
        $records = [];
        $warnings = [];
        $heading = $section['heading'] ?? '';
        $content = $section['content'] ?? '';
        $items = $section['enriched_items'] ?? $section['items'] ?? [];
        $slideTitle = $section['slide_title'] ?? $heading;

        // If section has table data, map as table
        if (!empty($section['table_data'])) {
            $tableModule = $this->tableTypeToModule($section['table_data']['table_type'] ?? 'generic') ?? $module;
            $tableResult = $this->mapTableToModule($section['table_data'], $tableModule, $docMeta, $sourceSlideNo);
            return $tableResult;
        }

        switch ($slideType) {
            case 'weekly_mom_activities':
            case 'weekly_mom_updates':
            case 'weekly_mom_lookahead':
            case 'weekly_mom_points':
                // Map items as MOM points with section context
                $sectionName = match ($slideType) {
                    'weekly_mom_activities' => 'Completed & Upcoming Activities',
                    'weekly_mom_updates' => 'Site Visit Updates',
                    'weekly_mom_lookahead' => '07 Days Lookahead Plan',
                    'weekly_mom_points' => 'MOM Points',
                    default => $slideTitle,
                };

                if (!empty($items)) {
                    foreach ($items as $idx => $item) {
                        $itemText = is_array($item) ? ($item['text'] ?? '') : $item;
                        $itemStatus = is_array($item) ? ($item['status'] ?? null) : null;
                        $itemAssignee = is_array($item) ? ($item['assignee'] ?? null) : null;
                        $itemDate = is_array($item) ? ($item['date'] ?? null) : null;
                        $itemPriority = is_array($item) ? ($item['priority'] ?? null) : null;

                        if (empty($itemText) || strlen(trim($itemText)) < 3) continue;

                        $records[] = [
                            'title' => mb_substr($itemText, 0, 255),
                            'description' => $itemText,
                            'status' => $this->statusNormalizer->normalize($itemStatus ?? 'Open', 'mom_points'),
                            'assigned_to' => $itemAssignee,
                            'due_date' => $itemDate,
                            'priority' => $itemPriority ?? 'Medium',
                            'category' => 'Action Required',
                            'section_name' => $sectionName,
                            'remarks' => null,
                            'source_slide_no' => $sourceSlideNo,
                            '_section_heading' => $heading,
                            '_slide_type' => $slideType,
                            '_confidence' => $confidence,
                            '_source' => 'weekly_slide_item',
                        ];
                    }
                } elseif (!empty($content) && strlen($content) > 10) {
                    // Create single MOM record from content block
                    $records[] = [
                        'title' => mb_substr($slideTitle !== $heading ? $slideTitle : mb_substr($content, 0, 100), 0, 255),
                        'description' => $content,
                        'status' => 'Open',
                        'priority' => 'Medium',
                        'category' => 'Action Required',
                        'section_name' => $sectionName,
                        'source_slide_no' => $sourceSlideNo,
                        '_section_heading' => $heading,
                        '_slide_type' => $slideType,
                        '_confidence' => $confidence,
                        '_source' => 'weekly_slide_content',
                    ];
                }
                break;

            case 'permits_progress':
                if (!empty($items)) {
                    foreach ($items as $idx => $item) {
                        $itemText = is_array($item) ? ($item['text'] ?? '') : $item;
                        if (empty($itemText) || strlen(trim($itemText)) < 3) continue;

                        $records[] = [
                            'work_description' => $itemText,
                            'permit_type' => $this->detectPermitType($itemText),
                            'status' => $this->statusNormalizer->normalize(
                                (is_array($item) ? ($item['status'] ?? null) : null) ?? 'Draft', 'permits'
                            ),
                            'contractor' => $docMeta['contractor_name'] ?? $docMeta['contractor'] ?? null,
                            'zone' => $docMeta['area_name'] ?? $docMeta['area'] ?? null,
                            'notes' => "From weekly meeting - Permit progress",
                            'source_slide_no' => $sourceSlideNo,
                            '_section_heading' => $heading,
                            '_slide_type' => $slideType,
                            '_confidence' => $confidence,
                            '_source' => 'weekly_slide_item',
                        ];
                    }
                } elseif (!empty($content) && strlen($content) > 10) {
                    $records[] = [
                        'work_description' => $content,
                        'permit_type' => $this->detectPermitType($content),
                        'status' => 'Draft',
                        'notes' => "From weekly meeting - Permit progress",
                        'source_slide_no' => $sourceSlideNo,
                        '_section_heading' => $heading,
                        '_slide_type' => $slideType,
                        '_confidence' => $confidence,
                        '_source' => 'weekly_slide_content',
                    ];
                }
                break;

            case 'training_update':
                if (!empty($items)) {
                    foreach ($items as $idx => $item) {
                        $itemText = is_array($item) ? ($item['text'] ?? '') : $item;
                        if (empty($itemText) || strlen(trim($itemText)) < 3) continue;

                        $records[] = [
                            'training_topic_key' => $this->detectTrainingTopic($itemText),
                            'training_topic_label' => $itemText,
                            'training_date' => $docMeta['meeting_date'] ?? $docMeta['date'] ?? date('Y-m-d'),
                            'notes' => $itemText,
                            'status' => $this->statusNormalizer->normalize(
                                (is_array($item) ? ($item['status'] ?? null) : null) ?? 'Valid', 'training'
                            ),
                            'source_slide_no' => $sourceSlideNo,
                            '_section_heading' => $heading,
                            '_slide_type' => $slideType,
                            '_confidence' => $confidence,
                            '_source' => 'weekly_slide_item',
                        ];
                    }
                } elseif (!empty($content) && strlen($content) > 10) {
                    $records[] = [
                        'training_topic_key' => $this->detectTrainingTopic($content),
                        'training_topic_label' => $slideTitle,
                        'training_date' => $docMeta['meeting_date'] ?? $docMeta['date'] ?? date('Y-m-d'),
                        'notes' => $content,
                        'status' => 'Valid',
                        'source_slide_no' => $sourceSlideNo,
                        '_section_heading' => $heading,
                        '_slide_type' => $slideType,
                        '_confidence' => $confidence,
                        '_source' => 'weekly_slide_content',
                    ];
                }
                break;

            case 'ats_progress':
            case 'weekly_report_statistics':
                // Statistics/report data mapped as a report record
                $records[] = [
                    'title' => $slideTitle ?: ($slideType === 'ats_progress' ? 'ATS Progress' : 'EHS Statistics'),
                    'content' => $content,
                    'date' => $docMeta['meeting_date'] ?? $docMeta['date'] ?? date('Y-m-d'),
                    'stats_title' => $slideTitle,
                    'stats_week_number' => $docMeta['week_number'] ?? null,
                    'stats_period_start' => $docMeta['reporting_period_start'] ?? null,
                    'stats_period_end' => $docMeta['reporting_period_end'] ?? null,
                    'source_slide_no' => $sourceSlideNo,
                    '_section_heading' => $heading,
                    '_slide_type' => $slideType,
                    '_confidence' => $confidence,
                    '_source' => 'weekly_slide_content',
                ];
                break;

            default:
                // Fall back to standard section mapping
                $mapped = $this->mapSectionToModule($section, $module, $docMeta, $confidence, $sourceSlideNo);
                return $mapped;
        }

        return ['records' => $records, 'warnings' => $warnings];
    }

    /**
     * Map a table to module records.
     */
    protected function mapTableToModule(array $table, string $module, array $docMeta, ?int $sourceSlideNo = null): array
    {
        $records = [];
        $warnings = [];
        $headers = array_map('strtolower', $table['headers'] ?? []);

        foreach ($table['rows'] ?? [] as $rowIdx => $row) {
            // Normalize row keys to lowercase
            $normalizedRow = [];
            foreach ($row as $key => $value) {
                $normalizedRow[strtolower(trim($key))] = trim((string) $value);
            }

            $mapped = match ($module) {
                'mom' => $this->mapMomPointRow($normalizedRow, $docMeta),
                'training' => $this->mapTrainingRow($normalizedRow, $docMeta),
                'permits' => $this->mapPermitRow($normalizedRow, $docMeta),
                'observations' => $this->mapObservationRow($normalizedRow, $docMeta),
                'mockups' => $this->mapMockupRow($normalizedRow, $docMeta),
                'checklists' => $this->mapChecklistRow($normalizedRow, $docMeta),
                'tracker' => $this->mapTrackerRow($normalizedRow, $docMeta),
                'manpower' => $this->mapManpowerRow($normalizedRow, $docMeta),
                'incidents' => $this->mapIncidentRow($normalizedRow, $docMeta),
                default => null,
            };

            if ($mapped) {
                $mapped['_source'] = 'table';
                $mapped['_row_index'] = $rowIdx;
                if ($sourceSlideNo) {
                    $mapped['source_slide_no'] = $sourceSlideNo;
                }
                $records[] = $mapped;
            } else {
                $rowKeys = implode(', ', array_keys($normalizedRow));
                $warnings[] = "Row {$rowIdx} in table could not be mapped to {$module} (columns: {$rowKeys})";
            }
        }

        return ['records' => $records, 'warnings' => $warnings];
    }

    /**
     * Map a section to module records.
     */
    protected function mapSectionToModule(array $section, string $module, array $docMeta, float $confidence, ?int $sourceSlideNo = null): array
    {
        $records = [];
        $warnings = [];

        $heading = $section['heading'] ?? '';
        $content = $section['content'] ?? '';
        $items = $section['enriched_items'] ?? $section['items'] ?? [];

        // If section has table data, map as table
        if (!empty($section['table_data'])) {
            $tableResult = $this->mapTableToModule($section['table_data'], $module, $docMeta, $sourceSlideNo);
            return $tableResult;
        }

        // Map items as individual records (action points, bullet points)
        if (!empty($items) && in_array($module, ['mom', 'observations', 'permits', 'training', 'checklists'])) {
            foreach ($items as $idx => $item) {
                $itemText = is_array($item) ? ($item['text'] ?? '') : $item;
                $itemStatus = is_array($item) ? ($item['status'] ?? null) : null;
                $itemAssignee = is_array($item) ? ($item['assignee'] ?? null) : null;
                $itemDate = is_array($item) ? ($item['date'] ?? null) : null;
                $itemPriority = is_array($item) ? ($item['priority'] ?? null) : null;

                if (empty($itemText)) continue;

                $mapped = match ($module) {
                    'mom' => [
                        'title' => mb_substr($itemText, 0, 255),
                        'description' => $itemText,
                        'status' => $this->statusNormalizer->normalize($itemStatus ?? 'Open', 'mom_points'),
                        'assigned_to' => $itemAssignee,
                        'due_date' => $itemDate,
                        'priority' => $itemPriority ?? 'Medium',
                        'category' => 'Action Required',
                        '_section_heading' => $heading,
                        '_confidence' => $confidence,
                    ],
                    'observations' => [
                        'description' => $itemText,
                        'status' => $this->statusNormalizer->normalize($itemStatus ?? 'Open', 'observations'),
                        'observation_date' => $docMeta['date'] ?? date('Y-m-d'),
                        'category' => $this->detectObservationCategory($itemText),
                        'type' => $this->detectObservationType($itemText),
                        'priority' => $itemPriority ?? 'Medium',
                        '_section_heading' => $heading,
                        '_confidence' => $confidence,
                    ],
                    'training' => [
                        'training_topic_key' => $this->detectTrainingTopic($itemText),
                        'training_date' => $itemDate ?? $docMeta['date'] ?? date('Y-m-d'),
                        'trainer_name' => $itemAssignee ?? $docMeta['prepared_by'] ?? null,
                        'notes' => $itemText,
                        'status' => $this->statusNormalizer->normalize($itemStatus ?? 'Valid', 'training'),
                        '_section_heading' => $heading,
                        '_confidence' => $confidence,
                    ],
                    'permits' => [
                        'work_description' => $itemText,
                        'status' => $this->statusNormalizer->normalize($itemStatus ?? 'Draft', 'permits'),
                        'permit_type' => $this->detectPermitType($itemText),
                        '_section_heading' => $heading,
                        '_confidence' => $confidence,
                    ],
                    default => [
                        'notes' => $itemText,
                        'status' => $itemStatus,
                        '_section_heading' => $heading,
                        '_confidence' => $confidence,
                    ],
                };

                $mapped['_source'] = 'section_item';
                $mapped['_item_index'] = $idx;
                if ($sourceSlideNo) {
                    $mapped['source_slide_no'] = $sourceSlideNo;
                }
                $records[] = $mapped;
            }
        }
        // If no items but there's content, create a single record
        elseif (!empty($content) && strlen($content) > 10) {
            $mapped = $this->mapSectionContentToRecord($section, $module, $docMeta, $confidence);
            if ($mapped) {
                $mapped['_source'] = 'section_content';
                if ($sourceSlideNo) {
                    $mapped['source_slide_no'] = $sourceSlideNo;
                }
                $records[] = $mapped;
            } else {
                $warnings[] = "Section '{$heading}' could not be mapped to {$module}";
            }
        }

        return ['records' => $records, 'warnings' => $warnings];
    }

    /**
     * Map an entire section content block to a single module record.
     */
    protected function mapSectionContentToRecord(array $section, string $module, array $docMeta, float $confidence): ?array
    {
        $heading = $section['heading'] ?? '';
        $content = $section['content'] ?? '';
        $kvPairs = $section['key_value_pairs'] ?? [];
        $statuses = $section['detected_statuses'] ?? [];

        $status = !empty($statuses) ? $this->statusNormalizer->normalize($statuses[0], $module === 'mom' ? 'mom_points' : $module) : null;

        return match ($module) {
            'mom' => [
                'title' => mb_substr($heading !== 'Document Content' ? $heading : mb_substr($content, 0, 100), 0, 255),
                'description' => $content,
                'status' => $status ?? 'Open',
                'assigned_to' => $kvPairs['assigned_to'] ?? $kvPairs['owner'] ?? $kvPairs['responsible'] ?? null,
                'due_date' => $kvPairs['due_date'] ?? $kvPairs['target_date'] ?? $kvPairs['deadline'] ?? null,
                'priority' => $kvPairs['priority'] ?? 'Medium',
                'category' => 'Action Required',
                '_section_heading' => $heading,
                '_confidence' => $confidence,
            ],
            'observations' => [
                'description' => $content,
                'observation_date' => $kvPairs['date'] ?? $docMeta['date'] ?? date('Y-m-d'),
                'category' => $kvPairs['category'] ?? $this->detectObservationCategory($content),
                'type' => $kvPairs['type'] ?? $this->detectObservationType($content),
                'status' => $status ?? 'Open',
                'contractor' => $kvPairs['contractor'] ?? $docMeta['contractor'] ?? null,
                'zone' => $kvPairs['zone'] ?? $kvPairs['area'] ?? $docMeta['area'] ?? null,
                'priority' => $kvPairs['priority'] ?? 'Medium',
                'corrective_action' => $kvPairs['corrective_action'] ?? null,
                '_section_heading' => $heading,
                '_confidence' => $confidence,
            ],
            'permits' => [
                'work_description' => $content,
                'permit_type' => $kvPairs['permit_type'] ?? $kvPairs['type'] ?? $this->detectPermitType($content),
                'contractor' => $kvPairs['contractor'] ?? $docMeta['contractor'] ?? null,
                'zone' => $kvPairs['zone'] ?? $kvPairs['area'] ?? $docMeta['area'] ?? null,
                'status' => $status ?? 'Draft',
                'valid_from' => $kvPairs['valid_from'] ?? $kvPairs['start_date'] ?? $docMeta['date'] ?? null,
                'valid_to' => $kvPairs['valid_to'] ?? $kvPairs['end_date'] ?? null,
                '_section_heading' => $heading,
                '_confidence' => $confidence,
            ],
            'training' => [
                'training_topic_key' => $this->detectTrainingTopic($heading . ' ' . $content),
                'training_date' => $kvPairs['date'] ?? $kvPairs['training_date'] ?? $docMeta['date'] ?? date('Y-m-d'),
                'trainer_name' => $kvPairs['trainer'] ?? $kvPairs['trainer_name'] ?? $docMeta['prepared_by'] ?? null,
                'notes' => $content,
                'status' => $status ?? 'Valid',
                '_section_heading' => $heading,
                '_confidence' => $confidence,
            ],
            'mockups' => [
                'title' => mb_substr($heading !== 'Document Content' ? $heading : mb_substr($content, 0, 100), 0, 255),
                'description' => $content,
                'area' => $kvPairs['area'] ?? $docMeta['area'] ?? null,
                'contractor' => $kvPairs['contractor'] ?? $docMeta['contractor'] ?? null,
                'zone' => $kvPairs['zone'] ?? null,
                'approval_status' => $status ? $this->statusNormalizer->normalize($status, 'mockups') : 'Draft',
                '_section_heading' => $heading,
                '_confidence' => $confidence,
            ],
            'incidents' => [
                'description' => $content,
                'incident_date' => $kvPairs['date'] ?? $kvPairs['incident_date'] ?? $docMeta['date'] ?? date('Y-m-d'),
                'classification' => $kvPairs['classification'] ?? $kvPairs['type'] ?? 'Near Miss',
                'severity' => $kvPairs['severity'] ?? 'Minor',
                'contractor' => $kvPairs['contractor'] ?? $docMeta['contractor'] ?? null,
                'zone' => $kvPairs['zone'] ?? $docMeta['area'] ?? null,
                'status' => $status ?? 'Open',
                'immediate_actions' => $kvPairs['immediate_actions'] ?? null,
                '_section_heading' => $heading,
                '_confidence' => $confidence,
            ],
            'reports' => [
                'title' => $heading,
                'content' => $content,
                'date' => $docMeta['date'] ?? date('Y-m-d'),
                '_section_heading' => $heading,
                '_confidence' => $confidence,
            ],
            default => null,
        };
    }

    // ========================================
    // Table Row Mappers (per module)
    // ========================================

    protected function mapMomPointRow(array $row, array $docMeta): ?array
    {
        $title = $row['point'] ?? $row['action'] ?? $row['title'] ?? $row['description'] ?? $row['item'] ?? $row['action point'] ?? $row['action item'] ?? null;
        if (!$title) {
            // Try to find any non-empty text column
            $title = $this->findFirstNonEmptyValue($row, ['status', 'date', 'due date', 'assigned to', 'priority', '#', 'no', 'no.', 's/n']);
        }
        if (!$title) return null;

        return [
            'title' => mb_substr($title, 0, 255),
            'description' => $row['description'] ?? $row['details'] ?? $row['remarks'] ?? $title,
            'status' => $this->statusNormalizer->normalize(
                $row['status'] ?? $row['state'] ?? 'Open', 'mom_points'
            ),
            'assigned_to' => $row['assigned to'] ?? $row['assignee'] ?? $row['owner'] ?? $row['responsible'] ?? $row['action by'] ?? null,
            'due_date' => $this->parseDateField($row['due date'] ?? $row['target date'] ?? $row['deadline'] ?? $row['target'] ?? null),
            'priority' => ucfirst($row['priority'] ?? 'Medium'),
            'category' => $row['category'] ?? 'Action Required',
            'raised_by' => $row['raised by'] ?? $row['reported by'] ?? $docMeta['prepared_by'] ?? null,
            'remarks' => $row['remarks'] ?? $row['notes'] ?? $row['comments'] ?? null,
            '_confidence' => 0.85,
        ];
    }

    protected function mapTrainingRow(array $row, array $docMeta): ?array
    {
        $workerName = $row['worker'] ?? $row['name'] ?? $row['employee'] ?? $row['trainee'] ?? $row['worker name'] ?? $row['participant'] ?? null;
        $topic = $row['topic'] ?? $row['training'] ?? $row['training topic'] ?? $row['course'] ?? $row['subject'] ?? null;

        if (!$workerName && !$topic) return null;

        return [
            'worker_name' => $workerName,
            'training_topic_key' => $this->detectTrainingTopic($topic ?? ''),
            'training_topic_label' => $topic,
            'training_date' => $this->parseDateField($row['date'] ?? $row['training date'] ?? $row['completion date'] ?? null) ?? $docMeta['date'] ?? date('Y-m-d'),
            'expiry_date' => $this->parseDateField($row['expiry'] ?? $row['expiry date'] ?? $row['valid until'] ?? null),
            'trainer_name' => $row['trainer'] ?? $row['instructor'] ?? $row['trainer name'] ?? null,
            'certificate_number' => $row['certificate'] ?? $row['cert number'] ?? $row['certificate number'] ?? $row['cert no'] ?? null,
            'status' => $this->statusNormalizer->normalize(
                $row['status'] ?? $row['result'] ?? 'Valid', 'training'
            ),
            'notes' => $row['notes'] ?? $row['remarks'] ?? null,
            '_confidence' => 0.80,
        ];
    }

    protected function mapPermitRow(array $row, array $docMeta): ?array
    {
        $description = $row['description'] ?? $row['work description'] ?? $row['work'] ?? $row['activity'] ?? $row['scope'] ?? null;
        $type = $row['type'] ?? $row['permit type'] ?? $row['permit_type'] ?? null;

        if (!$description && !$type) return null;

        return [
            'work_description' => $description ?? $type ?? 'Imported permit',
            'permit_type' => $this->detectPermitType($type ?? $description ?? ''),
            'contractor' => $row['contractor'] ?? $row['company'] ?? $docMeta['contractor'] ?? null,
            'zone' => $row['zone'] ?? $row['area'] ?? $row['location'] ?? $docMeta['area'] ?? null,
            'applicant_name' => $row['applicant'] ?? $row['requested by'] ?? null,
            'valid_from' => $this->parseDateField($row['valid from'] ?? $row['start'] ?? $row['start date'] ?? $row['date'] ?? null),
            'valid_to' => $this->parseDateField($row['valid to'] ?? $row['end'] ?? $row['end date'] ?? $row['expiry'] ?? null),
            'status' => $this->statusNormalizer->normalize(
                $row['status'] ?? 'Draft', 'permits'
            ),
            'safety_measures' => $row['safety measures'] ?? $row['precautions'] ?? null,
            'ppe_requirements' => $row['ppe'] ?? $row['ppe requirements'] ?? null,
            'notes' => $row['notes'] ?? $row['remarks'] ?? null,
            '_confidence' => 0.80,
        ];
    }

    protected function mapObservationRow(array $row, array $docMeta): ?array
    {
        $description = $row['description'] ?? $row['observation'] ?? $row['finding'] ?? $row['details'] ?? null;
        if (!$description) {
            $description = $this->findFirstNonEmptyValue($row, ['status', 'date', 'category', 'type', 'contractor', '#', 'no', 'no.']);
        }
        if (!$description) return null;

        return [
            'description' => $description,
            'observation_date' => $this->parseDateField($row['date'] ?? $row['observation date'] ?? null) ?? $docMeta['date'] ?? date('Y-m-d'),
            'category' => $row['category'] ?? $this->detectObservationCategory($description),
            'type' => $row['type'] ?? $row['observation type'] ?? $this->detectObservationType($description),
            'contractor' => $row['contractor'] ?? $row['company'] ?? $docMeta['contractor'] ?? null,
            'zone' => $row['zone'] ?? $row['area'] ?? $row['location'] ?? $docMeta['area'] ?? null,
            'priority' => ucfirst($row['priority'] ?? $row['severity'] ?? 'Medium'),
            'status' => $this->statusNormalizer->normalize(
                $row['status'] ?? 'Open', 'observations'
            ),
            'corrective_action' => $row['corrective action'] ?? $row['action'] ?? $row['action taken'] ?? null,
            'reporting_officer' => $row['reported by'] ?? $row['observer'] ?? $row['officer'] ?? $docMeta['prepared_by'] ?? null,
            '_confidence' => 0.80,
        ];
    }

    protected function mapMockupRow(array $row, array $docMeta): ?array
    {
        $title = $row['title'] ?? $row['mockup'] ?? $row['procedure'] ?? $row['name'] ?? $row['description'] ?? null;
        if (!$title) return null;

        return [
            'title' => mb_substr($title, 0, 255),
            'description' => $row['description'] ?? $row['details'] ?? null,
            'procedure_type' => $row['type'] ?? $row['procedure type'] ?? null,
            'area' => $row['area'] ?? $docMeta['area'] ?? null,
            'zone' => $row['zone'] ?? $row['location'] ?? null,
            'contractor' => $row['contractor'] ?? $row['company'] ?? $docMeta['contractor'] ?? null,
            'approval_status' => $this->statusNormalizer->normalize(
                $row['status'] ?? $row['approval status'] ?? 'Draft', 'mockups'
            ),
            'priority' => ucfirst($row['priority'] ?? 'Medium'),
            'planned_start_date' => $this->parseDateField($row['start date'] ?? $row['planned start'] ?? null),
            'planned_end_date' => $this->parseDateField($row['end date'] ?? $row['planned end'] ?? null),
            '_confidence' => 0.80,
        ];
    }

    protected function mapChecklistRow(array $row, array $docMeta): ?array
    {
        $name = $row['item'] ?? $row['name'] ?? $row['equipment'] ?? $row['description'] ?? null;
        if (!$name) return null;

        return [
            'name' => $name,
            'category_key' => $row['category'] ?? $row['type'] ?? null,
            'serial_number' => $row['serial'] ?? $row['serial number'] ?? $row['serial no'] ?? null,
            'plate_number' => $row['plate'] ?? $row['plate number'] ?? $row['plate no'] ?? null,
            'status' => $this->statusNormalizer->normalize(
                $row['status'] ?? 'Active', 'checklists'
            ),
            'health_condition' => $this->statusNormalizer->normalize(
                $row['condition'] ?? $row['health'] ?? 'Good', 'health_condition'
            ),
            'location_area' => $row['location'] ?? $row['area'] ?? $docMeta['area'] ?? null,
            'notes' => $row['notes'] ?? $row['remarks'] ?? null,
            '_confidence' => 0.75,
        ];
    }

    protected function mapTrackerRow(array $row, array $docMeta): ?array
    {
        $name = $row['equipment'] ?? $row['item'] ?? $row['name'] ?? $row['asset'] ?? $row['equipment name'] ?? null;
        if (!$name) return null;

        return [
            'equipment_name' => $name,
            'category_key' => $row['category'] ?? $row['type'] ?? null,
            'serial_number' => $row['serial'] ?? $row['serial number'] ?? $row['serial no'] ?? null,
            'plate_number' => $row['plate'] ?? $row['plate number'] ?? $row['plate no'] ?? null,
            'make_model' => $row['make'] ?? $row['model'] ?? $row['make/model'] ?? null,
            'status' => $this->statusNormalizer->normalize(
                $row['status'] ?? 'Active', 'tracker'
            ),
            'condition' => $this->statusNormalizer->normalize(
                $row['condition'] ?? 'Good', 'health_condition'
            ),
            'location_area' => $row['location'] ?? $row['area'] ?? $docMeta['area'] ?? null,
            'assigned_to' => $row['assigned to'] ?? $row['operator'] ?? null,
            'onboarding_date' => $this->parseDateField($row['onboarding'] ?? $row['onboarding date'] ?? null),
            'certificate_number' => $row['certificate'] ?? $row['cert number'] ?? null,
            'certificate_expiry' => $this->parseDateField($row['cert expiry'] ?? $row['certificate expiry'] ?? null),
            'notes' => $row['notes'] ?? $row['remarks'] ?? null,
            '_confidence' => 0.75,
        ];
    }

    protected function mapManpowerRow(array $row, array $docMeta): ?array
    {
        // Try exact key matches first, then fuzzy key matching
        $name = $row['name'] ?? $row['worker'] ?? $row['employee'] ?? $row['worker name']
            ?? $row['employee name'] ?? $row['full name'] ?? $row['staff name'] ?? $row['staff']
            ?? $row['personnel'] ?? $row['personnel name'] ?? $row['member'] ?? $row['member name']
            ?? $row['resource'] ?? $row['resource name'] ?? null;

        // Fuzzy fallback: scan keys for anything containing 'name', 'worker', 'employee', 'personnel'
        if (!$name) {
            $namePatterns = ['name', 'worker', 'employee', 'personnel', 'staff', 'member'];
            foreach ($row as $key => $value) {
                if (!$value || !is_string($value)) continue;
                foreach ($namePatterns as $pattern) {
                    if (str_contains($key, $pattern)) {
                        $name = $value;
                        break 2;
                    }
                }
            }
        }

        // Skip truly empty rows (all values empty)
        if (!$name) {
            $hasAnyValue = false;
            foreach ($row as $v) {
                if (!empty($v) && trim((string) $v) !== '') {
                    $hasAnyValue = true;
                    break;
                }
            }
            if (!$hasAnyValue) return null;
        }

        if (!$name) return null;

        // Flexible profession matching
        $profession = $row['profession'] ?? $row['trade'] ?? $row['designation']
            ?? $row['position'] ?? $row['job title'] ?? $row['job'] ?? $row['role']
            ?? $row['occupation'] ?? $row['craft'] ?? null;

        // Flexible company matching
        $company = $row['company'] ?? $row['contractor'] ?? $row['employer']
            ?? $row['subcontractor'] ?? $row['sub-contractor'] ?? $row['firm']
            ?? $docMeta['contractor'] ?? null;

        // Flexible ID matching
        $workerId = $row['id'] ?? $row['worker id'] ?? $row['employee id']
            ?? $row['staff id'] ?? $row['badge'] ?? $row['badge no'] ?? $row['badge number']
            ?? $row['id no'] ?? $row['id number'] ?? $row['emp id'] ?? $row['emp no'] ?? null;

        // Iqama number (dedicated field)
        $iqamaNumber = $row['iqama'] ?? $row['iqama no'] ?? $row['iqama no.']
            ?? $row['iqama number'] ?? $row['iqama #'] ?? null;

        // ID / Passport number (generic identity document)
        $idNumber = $row['passport'] ?? $row['passport no'] ?? $row['passport no.']
            ?? $row['passport number'] ?? $row['national id'] ?? $row['national id no']
            ?? $row['id / passport'] ?? $row['id/passport'] ?? null;

        // Flexible nationality matching
        $nationality = $row['nationality'] ?? $row['nation'] ?? $row['country'] ?? null;

        return [
            'name' => $name,
            'worker_id' => $workerId,
            'id_number' => $idNumber,
            'iqama_number' => $iqamaNumber,
            'profession' => $profession,
            'company' => $company,
            'nationality' => $nationality,
            'status' => $this->statusNormalizer->normalize(
                $row['status'] ?? 'Active', 'workers'
            ),
            'induction_status' => $row['induction'] ?? $row['induction status'] ?? $row['safety induction'] ?? null,
            'joining_date' => $this->parseDateField($row['joining date'] ?? $row['start date'] ?? $row['date of joining'] ?? $row['doj'] ?? null),
            '_confidence' => 0.75,
        ];
    }

    protected function mapIncidentRow(array $row, array $docMeta): ?array
    {
        $description = $row['description'] ?? $row['incident'] ?? $row['details'] ?? null;
        if (!$description) return null;

        return [
            'description' => $description,
            'incident_date' => $this->parseDateField($row['date'] ?? $row['incident date'] ?? null) ?? $docMeta['date'] ?? date('Y-m-d'),
            'classification' => $row['classification'] ?? $row['type'] ?? 'Near Miss',
            'severity' => $row['severity'] ?? 'Minor',
            'contractor' => $row['contractor'] ?? $docMeta['contractor'] ?? null,
            'zone' => $row['zone'] ?? $row['area'] ?? $row['location'] ?? $docMeta['area'] ?? null,
            'status' => $this->statusNormalizer->normalize(
                $row['status'] ?? 'Open', 'incidents'
            ),
            '_confidence' => 0.80,
        ];
    }

    // ========================================
    // Detection Helpers
    // ========================================

    protected function detectObservationCategory(string $text): string
    {
        $lower = strtolower($text);
        if (str_contains($lower, 'housekeeping')) return 'Housekeeping';
        if (str_contains($lower, 'ppe')) return 'PPE';
        if (str_contains($lower, 'fall') || str_contains($lower, 'height')) return 'Fall Protection';
        if (str_contains($lower, 'electrical')) return 'Electrical';
        if (str_contains($lower, 'fire')) return 'Fire Safety';
        if (str_contains($lower, 'scaffold')) return 'Scaffolding';
        if (str_contains($lower, 'lifting') || str_contains($lower, 'crane')) return 'Lifting';
        if (str_contains($lower, 'excavation')) return 'Excavation';
        if (str_contains($lower, 'environment')) return 'Environmental';
        return 'General';
    }

    protected function detectObservationType(string $text): string
    {
        $lower = strtolower($text);
        if (str_contains($lower, 'unsafe act')) return 'Unsafe Act';
        if (str_contains($lower, 'unsafe condition')) return 'Unsafe Condition';
        if (str_contains($lower, 'positive') || str_contains($lower, 'safe')) return 'Positive';
        if (str_contains($lower, 'near miss')) return 'Near Miss';
        return 'Unsafe Condition';
    }

    protected function detectPermitType(string $text): string
    {
        $lower = strtolower($text);
        if (str_contains($lower, 'hot work') || str_contains($lower, 'welding') || str_contains($lower, 'grinding')) return 'hot_work';
        if (str_contains($lower, 'confined space')) return 'confined_space';
        if (str_contains($lower, 'work at height') || str_contains($lower, 'height')) return 'work_at_height';
        if (str_contains($lower, 'excavation') || str_contains($lower, 'digging')) return 'excavation';
        if (str_contains($lower, 'lifting') || str_contains($lower, 'crane')) return 'lifting';
        if (str_contains($lower, 'line break') || str_contains($lower, 'pipe')) return 'line_break';
        return 'general';
    }

    protected function detectTrainingTopic(string $text): string
    {
        $lower = strtolower($text);
        $topicMap = [
            'site_induction' => ['site induction', 'induction', 'orientation'],
            'work_at_height' => ['work at height', 'working at height', 'wah', 'height safety'],
            'fire_safety' => ['fire safety', 'fire fighting', 'fire prevention', 'fire extinguisher'],
            'first_aid' => ['first aid', 'cpr', 'emergency response'],
            'manual_handling' => ['manual handling', 'manual lifting'],
            'mewp_operation' => ['mewp', 'aerial', 'scissor lift', 'boom lift', 'cherry picker'],
            'lifting_rigging' => ['lifting', 'rigging', 'crane', 'slinging'],
            'forklift_operation' => ['forklift', 'fork lift'],
            'hot_work_safety' => ['hot work', 'welding safety', 'grinding safety'],
            'confined_space_entry' => ['confined space'],
            'defensive_driving' => ['defensive driving', 'safe driving'],
            'heavy_vehicle' => ['heavy vehicle', 'truck driving', 'hgv'],
            'bbs' => ['behavior', 'behavioural', 'bbs'],
            'supervisor_safety' => ['supervisor', 'leadership'],
            'environmental_awareness' => ['environmental', 'waste management', 'spill'],
            'electrical_safety' => ['electrical', 'loto', 'lockout', 'tagout'],
            'chemical_handling' => ['chemical', 'hazmat', 'msds', 'sds', 'coshh'],
        ];

        foreach ($topicMap as $key => $keywords) {
            foreach ($keywords as $kw) {
                if (str_contains($lower, $kw)) return $key;
            }
        }

        return 'site_induction'; // default
    }

    protected function tableTypeToModule(string $tableType): ?string
    {
        return match ($tableType) {
            'action_items' => 'mom',
            'training' => 'training',
            'permits' => 'permits',
            'equipment' => 'tracker',
            'observations' => 'observations',
            'manpower' => 'manpower',
            default => null,
        };
    }

    protected function parseDateField(?string $value): ?string
    {
        if (!$value || empty(trim($value))) return null;
        $value = trim($value);

        $formats = [
            'd/m/Y', 'd-m-Y', 'Y-m-d', 'm/d/Y', 'd/m/y',
            'd M Y', 'd F Y', 'M d, Y', 'F d, Y',
            'j M Y', 'j F Y', 'M j, Y', 'F j, Y',
        ];

        foreach ($formats as $format) {
            $dt = \DateTime::createFromFormat($format, $value);
            if ($dt !== false) {
                return $dt->format('Y-m-d');
            }
        }

        try {
            $ts = strtotime($value);
            if ($ts !== false && $ts > 0) {
                return date('Y-m-d', $ts);
            }
        } catch (\Exception $e) {}

        return null;
    }

    protected function findFirstNonEmptyValue(array $row, array $excludeKeys): ?string
    {
        foreach ($row as $key => $value) {
            if (in_array(strtolower($key), $excludeKeys)) continue;
            if (!empty($value) && strlen($value) > 3) {
                return $value;
            }
        }
        return null;
    }

    protected function deduplicateRecords(array $records, string $module): array
    {
        $seen = [];
        $unique = [];

        foreach ($records as $record) {
            // Build a fingerprint based on key fields
            $fingerprint = $this->buildFingerprint($record, $module);
            if (!isset($seen[$fingerprint])) {
                $seen[$fingerprint] = true;
                $unique[] = $record;
            }
        }

        return $unique;
    }

    protected function buildFingerprint(array $record, string $module): string
    {
        $keyFields = match ($module) {
            'mom' => ['title'],
            'training' => ['worker_name', 'training_topic_key'],
            'permits' => ['work_description', 'permit_type'],
            'observations' => ['description'],
            'mockups' => ['title'],
            'checklists' => ['name', 'serial_number'],
            'tracker' => ['equipment_name', 'serial_number'],
            'manpower' => ['name', 'worker_id'],
            'incidents' => ['description', 'incident_date'],
            default => ['title', 'description'],
        };

        $parts = [];
        foreach ($keyFields as $field) {
            $parts[] = strtolower(trim($record[$field] ?? ''));
        }

        return md5(implode('|', $parts));
    }
}
