<?php

namespace App\Services\Import;

use App\Models\DocumentImport;
use App\Models\DocumentImportItem;
use App\Models\Mom;
use App\Models\MomPoint;
use App\Models\Observation;
use App\Models\Permit;
use App\Models\Mockup;
use App\Models\TrainingRecord;
use App\Models\TrainingTopic;
use App\Models\Worker;
use App\Models\ChecklistItem;
use App\Models\ChecklistCategory;
use App\Models\TrackerRecord;
use App\Models\TrackerCategory;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Exception;

class DocumentImportService
{
    public function __construct(
        protected DocumentParserService $parser,
        protected DocumentAnalyzerService $analyzer,
        protected DocumentClassifierService $classifier,
        protected DocumentMapperService $mapper,
    ) {}

    /**
     * Upload and analyze a document. Returns the import record with preview data.
     */
    public function uploadAndAnalyze(UploadedFile $file, User $user): DocumentImport
    {
        $startTime = microtime(true);

        // Store the original file
        $fileType = $this->detectFileType($file);
        $fileName = Str::uuid() . '.' . $fileType;
        $filePath = $file->storeAs('imports', $fileName, 'public');

        // Create import record
        $import = DocumentImport::create([
            'file_name' => $fileName,
            'original_name' => $file->getClientOriginalName(),
            'file_type' => $fileType,
            'mime_type' => $file->getMimeType(),
            'file_path' => $filePath,
            'file_size' => $file->getSize(),
            'status' => 'processing',
            'imported_by' => $user->id,
            'imported_by_name' => $user->full_name,
        ]);

        try {
            $fullPath = Storage::disk('public')->path($filePath);

            // Step 1: Parse the document
            $parsedContent = $this->parser->parse($fullPath, $fileType);

            // Step 2: Analyze structure
            $analyzedContent = $this->analyzer->analyze($parsedContent);

            // Step 3: Classify destination modules
            $classification = $this->classifier->classify($analyzedContent);

            // Step 4: Map content to module fields
            $mappedData = $this->mapper->map($analyzedContent, $classification);

            // Step 5: Check for duplicates
            $mappedData = $this->checkForDuplicates($mappedData);

            // Step 6: Create import items (preview records)
            $items = $this->createImportItems($import, $mappedData, $classification);

            // Calculate totals
            $totalSections = count($analyzedContent['sections'] ?? []);
            $informationalCount = count($mappedData['informational'] ?? []);
            $unmappedCount = count($mappedData['unmapped'] ?? []);
            $totalWarnings = count($mappedData['warnings'] ?? []) + $unmappedCount;

            // Build warnings list - informational slides are NOT warnings
            $allWarnings = array_merge(
                $mappedData['warnings'] ?? [],
                array_map(fn($u) => "Unmapped: {$u['heading']} - {$u['reason']}", $mappedData['unmapped'] ?? [])
            );

            $processingTime = (int) ((microtime(true) - $startTime) * 1000);

            $import->update([
                'status' => 'analyzed',
                'document_type' => $classification['document_type'],
                'classification' => $classification['module_scores'],
                'extracted_data' => [
                    'document_metadata' => $mappedData['document_metadata'] ?? [],
                    'modules' => array_map(fn($records) => count($records), $mappedData['modules'] ?? []),
                    'unmapped_count' => $unmappedCount,
                    'informational_count' => $informationalCount,
                    'informational_slides' => $mappedData['informational'] ?? [],
                    'is_weekly_meeting' => $classification['is_weekly_meeting'] ?? false,
                ],
                'total_sections' => $totalSections,
                'total_warnings' => $totalWarnings,
                'warnings' => array_slice($allWarnings, 0, 50), // cap at 50
                'processing_time_ms' => $processingTime,
            ]);

        } catch (Exception $e) {
            $import->update([
                'status' => 'failed',
                'errors' => [$e->getMessage()],
                'processing_time_ms' => (int) ((microtime(true) - $startTime) * 1000),
            ]);
            throw $e;
        }

        return $import->fresh(['items']);
    }

    /**
     * Get preview data for an analyzed import.
     */
    public function getPreview(DocumentImport $import): array
    {
        $items = $import->items()->orderBy('target_module')->orderBy('confidence', 'desc')->get();

        $grouped = [];
        foreach ($items as $item) {
            $module = $item->target_module;
            if (!isset($grouped[$module])) {
                $grouped[$module] = [
                    'module' => $module,
                    'module_label' => $this->getModuleLabel($module),
                    'records' => [],
                    'total' => 0,
                ];
            }
            $grouped[$module]['records'][] = [
                'id' => $item->id,
                'section_heading' => $item->section_heading,
                'mapped_fields' => $item->mapped_fields,
                'confidence' => $item->confidence,
                'status' => $item->status,
                'duplicate_of' => $item->duplicate_of,
                'warnings' => $item->warnings,
            ];
            $grouped[$module]['total']++;
        }

        // Extract informational slides data
        $extractedData = $import->extracted_data ?? [];
        $informationalSlides = $extractedData['informational_slides'] ?? [];

        return [
            'import_id' => $import->id,
            'original_name' => $import->original_name,
            'document_type' => $import->document_type,
            'classification' => $import->classification,
            'total_items' => $items->count(),
            'modules' => array_values($grouped),
            'warnings' => $import->warnings ?? [],
            'metadata' => $extractedData['document_metadata'] ?? [],
            'informational_slides' => $informationalSlides,
            'informational_count' => count($informationalSlides),
            'is_weekly_meeting' => $extractedData['is_weekly_meeting'] ?? false,
        ];
    }

    /**
     * Confirm and create actual records from analyzed import.
     */
    public function confirm(DocumentImport $import, array $options = []): DocumentImport
    {
        if (!$import->canConfirm()) {
            throw new Exception('Import is not in a confirmable state. Status: ' . $import->status);
        }

        $skipItemIds = $options['skip_items'] ?? [];
        $overrides = $options['overrides'] ?? []; // item_id => field overrides

        $items = $import->items()
            ->where('status', 'pending')
            ->whereNotIn('id', $skipItemIds)
            ->get();

        $summary = [
            'created' => [],
            'skipped' => [],
            'failed' => [],
            'informational' => $import->extracted_data['informational_slides'] ?? [],
        ];

        DB::beginTransaction();
        try {
            foreach ($items as $item) {
                // Apply any user overrides
                $fields = $item->mapped_fields ?? [];
                if (isset($overrides[$item->id])) {
                    $fields = array_merge($fields, $overrides[$item->id]);
                }

                // Remove internal metadata fields
                $fields = $this->cleanMappedFields($fields);

                try {
                    $recordId = $this->createModuleRecord($item->target_module, $fields, $import);

                    if ($recordId) {
                        $item->update([
                            'action' => 'created',
                            'status' => 'created',
                            'target_record_id' => $recordId,
                        ]);
                        $summary['created'][] = [
                            'module' => $item->target_module,
                            'record_id' => $recordId,
                            'heading' => $item->section_heading,
                        ];
                    } else {
                        $item->update([
                            'action' => 'skipped',
                            'status' => 'skipped',
                            'error_message' => 'Could not create record - insufficient data',
                        ]);
                        $summary['skipped'][] = [
                            'module' => $item->target_module,
                            'reason' => 'Insufficient data',
                        ];
                    }
                } catch (Exception $e) {
                    $item->update([
                        'action' => 'failed',
                        'status' => 'failed',
                        'error_message' => $e->getMessage(),
                    ]);
                    $summary['failed'][] = [
                        'module' => $item->target_module,
                        'error' => $e->getMessage(),
                    ];
                }
            }

            // Mark skipped items
            $skippedItems = $import->items()->whereIn('id', $skipItemIds)->get();
            foreach ($skippedItems as $skipped) {
                $skipped->update(['action' => 'skipped', 'status' => 'skipped']);
            }

            DB::commit();

            $import->update([
                'status' => 'confirmed',
                'confirmed_at' => now(),
                'total_records_created' => count($summary['created']),
                'import_summary' => $summary,
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            $import->update([
                'status' => 'failed',
                'errors' => array_merge($import->errors ?? [], [$e->getMessage()]),
            ]);
            throw $e;
        }

        return $import->fresh(['items']);
    }

    /**
     * Create a record in the appropriate module.
     */
    protected function createModuleRecord(string $module, array $fields, DocumentImport $import): ?string
    {
        return match ($module) {
            'mom' => $this->createMomRecord($fields, $import),
            'training' => $this->createTrainingRecord($fields, $import),
            'permits' => $this->createPermitRecord($fields, $import),
            'observations' => $this->createObservationRecord($fields, $import),
            'mockups' => $this->createMockupRecord($fields, $import),
            'manpower' => $this->createWorkerRecord($fields, $import),
            'tracker' => $this->createTrackerRecord($fields, $import),
            'checklists' => $this->createChecklistRecord($fields, $import),
            default => null,
        };
    }

    protected function createMomRecord(array $fields, DocumentImport $import): ?string
    {
        // MOM items are created as points in an existing or new MOM
        $title = $fields['title'] ?? null;
        if (!$title) return null;

        // Find or create MOM for today/this week
        $weekNumber = $fields['week_number'] ?? (int) date('W');
        $year = $fields['year'] ?? (int) date('Y');

        $mom = Mom::where('week_number', $weekNumber)->where('year', $year)->first();

        if (!$mom) {
            // Use extracted meeting metadata if available
            $extractedData = $import->extracted_data ?? [];
            $docMeta = $extractedData['document_metadata'] ?? [];

            $mom = Mom::create([
                'title' => $docMeta['meeting_title'] ?? $fields['meeting_title'] ?? "Imported MOM - Week {$weekNumber}, {$year}",
                'week_number' => $weekNumber,
                'year' => $year,
                'meeting_date' => $docMeta['meeting_date'] ?? $fields['meeting_date'] ?? date('Y-m-d'),
                'meeting_type' => $docMeta['meeting_type'] ?? 'Weekly EHS Meeting',
                'status' => 'Draft',
                'created_by' => $import->imported_by,
                'updated_by' => $import->imported_by,
            ]);
        }

        // Create point
        $point = new MomPoint([
            'mom_id' => $mom->id,
            'point_number' => ($mom->points()->max('point_number') ?? 0) + 1,
            'title' => $title,
            'description' => $fields['description'] ?? $title,
            'status' => $fields['status'] ?? 'Open',
            'priority' => $fields['priority'] ?? 'Medium',
            'category' => $fields['category'] ?? 'Action Required',
            'assigned_to' => $fields['assigned_to'] ?? null,
            'due_date' => $fields['due_date'] ?? null,
            'raised_by' => $fields['raised_by'] ?? $import->imported_by_name,
            'remarks' => $fields['remarks'] ?? null,
            'source_slide_no' => $fields['source_slide_no'] ?? null,
            'section_name' => $fields['section_name'] ?? null,
            'created_by' => $import->imported_by,
            'updated_by' => $import->imported_by,
        ]);
        $point->save();

        $mom->recalculatePointCounts();

        return (string) $point->id;
    }

    protected function createTrainingRecord(array $fields, DocumentImport $import): ?string
    {
        $workerName = $fields['worker_name'] ?? null;
        $topicKey = $fields['training_topic_key'] ?? null;

        if (!$topicKey) return null;

        // Find or create worker
        $workerId = null;
        if ($workerName) {
            $worker = Worker::where('name', 'like', "%{$workerName}%")->first();
            if (!$worker) {
                $worker = Worker::create([
                    'name' => $workerName,
                    'status' => 'Active',
                    'created_by' => $import->imported_by,
                    'updated_by' => $import->imported_by,
                ]);
            }
            $workerId = $worker->id;
        }

        if (!$workerId) {
            // Create an "Unknown" worker as fallback
            $worker = Worker::firstOrCreate(
                ['name' => 'Unknown (Imported)'],
                [
                    'status' => 'Active',
                    'created_by' => $import->imported_by,
                    'updated_by' => $import->imported_by,
                ]
            );
            $workerId = $worker->id;
        }

        // Find topic
        $topic = TrainingTopic::where('key', $topicKey)->first();

        $record = TrainingRecord::create([
            'worker_id' => $workerId,
            'training_topic_key' => $topicKey,
            'training_topic_id' => $topic?->id,
            'training_date' => $fields['training_date'] ?? date('Y-m-d'),
            'expiry_date' => $fields['expiry_date'] ?? ($topic && $topic->validity_days ?
                date('Y-m-d', strtotime("+{$topic->validity_days} days", strtotime($fields['training_date'] ?? 'today'))) : null),
            'trainer_name' => $fields['trainer_name'] ?? null,
            'certificate_number' => $fields['certificate_number'] ?? null,
            'status' => $fields['status'] ?? 'Valid',
            'notes' => $fields['notes'] ?? "Imported from: {$import->original_name}",
            'source_slide_no' => $fields['source_slide_no'] ?? null,
            'created_by' => $import->imported_by,
            'updated_by' => $import->imported_by,
        ]);

        return $record->id;
    }

    protected function createPermitRecord(array $fields, DocumentImport $import): ?string
    {
        $description = $fields['work_description'] ?? null;
        if (!$description) return null;

        $permit = Permit::create([
            'permit_type' => $fields['permit_type'] ?? 'general',
            'work_description' => $description,
            'contractor' => $fields['contractor'] ?? null,
            'zone' => $fields['zone'] ?? null,
            'applicant_name' => $fields['applicant_name'] ?? null,
            'valid_from' => $fields['valid_from'] ?? now(),
            'valid_to' => $fields['valid_to'] ?? now()->addDays(1),
            'status' => $fields['status'] ?? 'Draft',
            'safety_measures' => $fields['safety_measures'] ?? null,
            'ppe_requirements' => $fields['ppe_requirements'] ?? null,
            'notes' => $fields['notes'] ?? "Imported from: {$import->original_name}",
            'source_slide_no' => $fields['source_slide_no'] ?? null,
            'created_by' => $import->imported_by,
            'updated_by' => $import->imported_by,
        ]);

        return $permit->id;
    }

    protected function createObservationRecord(array $fields, DocumentImport $import): ?string
    {
        $description = $fields['description'] ?? null;
        if (!$description) return null;

        $observation = Observation::create([
            'observation_date' => $fields['observation_date'] ?? date('Y-m-d'),
            'reporting_officer' => $fields['reporting_officer'] ?? $import->imported_by_name,
            'category' => $fields['category'] ?? 'General',
            'type' => $fields['type'] ?? 'Unsafe Condition',
            'zone' => $fields['zone'] ?? null,
            'contractor' => $fields['contractor'] ?? null,
            'priority' => $fields['priority'] ?? 'Medium',
            'status' => $fields['status'] ?? 'Open',
            'description' => $description,
            'corrective_action' => $fields['corrective_action'] ?? null,
        ]);

        return $observation->id;
    }

    protected function createMockupRecord(array $fields, DocumentImport $import): ?string
    {
        $title = $fields['title'] ?? null;
        if (!$title) return null;

        $mockup = Mockup::create([
            'title' => $title,
            'description' => $fields['description'] ?? null,
            'procedure_type' => $fields['procedure_type'] ?? null,
            'area' => $fields['area'] ?? null,
            'zone' => $fields['zone'] ?? null,
            'contractor' => $fields['contractor'] ?? null,
            'approval_status' => $fields['approval_status'] ?? 'Draft',
            'priority' => $fields['priority'] ?? 'Medium',
            'planned_start_date' => $fields['planned_start_date'] ?? null,
            'planned_end_date' => $fields['planned_end_date'] ?? null,
            'notes' => $fields['notes'] ?? "Imported from: {$import->original_name}",
            'created_by' => $import->imported_by,
            'updated_by' => $import->imported_by,
        ]);

        return $mockup->id;
    }

    protected function createWorkerRecord(array $fields, DocumentImport $import): ?string
    {
        $name = $fields['name'] ?? null;
        if (!$name) return null;

        // Check for existing worker
        $existing = Worker::where('name', $name)->first();
        if ($existing) return $existing->id;

        $worker = Worker::create([
            'worker_id' => $fields['worker_id'] ?? 'W-' . strtoupper(Str::random(6)),
            'name' => $name,
            'profession' => $fields['profession'] ?? null,
            'company' => $fields['company'] ?? null,
            'nationality' => $fields['nationality'] ?? null,
            'status' => $fields['status'] ?? 'Active',
            'induction_status' => $fields['induction_status'] ?? 'Not Done',
            'joining_date' => $fields['joining_date'] ?? null,
            'created_by' => $import->imported_by,
            'updated_by' => $import->imported_by,
        ]);

        return $worker->id;
    }

    protected function createTrackerRecord(array $fields, DocumentImport $import): ?string
    {
        $name = $fields['equipment_name'] ?? null;
        if (!$name) return null;

        // Try to find category
        $categoryKey = $fields['category_key'] ?? null;
        $category = null;
        if ($categoryKey) {
            $category = TrackerCategory::where('key', $categoryKey)->first();
            if (!$category) {
                $category = TrackerCategory::where('label', 'like', "%{$categoryKey}%")->first();
            }
        }
        if (!$category) {
            $category = TrackerCategory::first();
        }

        $record = new TrackerRecord([
            'category_id' => $category?->id,
            'category_key' => $category?->key ?? 'general',
            'template_type' => $category?->template_type ?? 'light_equipment',
            'equipment_name' => $name,
            'serial_number' => $fields['serial_number'] ?? null,
            'plate_number' => $fields['plate_number'] ?? null,
            'make_model' => $fields['make_model'] ?? null,
            'status' => $fields['status'] ?? 'Active',
            'condition' => $fields['condition'] ?? 'Good',
            'location_area' => $fields['location_area'] ?? null,
            'assigned_to' => $fields['assigned_to'] ?? null,
            'onboarding_date' => $fields['onboarding_date'] ?? null,
            'certificate_number' => $fields['certificate_number'] ?? null,
            'certificate_expiry' => $fields['certificate_expiry'] ?? null,
            'notes' => $fields['notes'] ?? "Imported from: {$import->original_name}",
            'created_by' => $import->imported_by ? (int) $import->imported_by : null,
        ]);
        $record->save();

        return (string) $record->id;
    }

    protected function createChecklistRecord(array $fields, DocumentImport $import): ?string
    {
        $name = $fields['name'] ?? null;
        if (!$name) return null;

        // Try to find category
        $categoryKey = $fields['category_key'] ?? null;
        $category = null;
        if ($categoryKey) {
            $category = ChecklistCategory::where('key', $categoryKey)->first();
            if (!$category) {
                $category = ChecklistCategory::where('label', 'like', "%{$categoryKey}%")->first();
            }
        }
        if (!$category) {
            $category = ChecklistCategory::first();
        }

        $item = ChecklistItem::create([
            'category_id' => $category?->id,
            'category_key' => $category?->key ?? 'general',
            'name' => $name,
            'serial_number' => $fields['serial_number'] ?? null,
            'plate_number' => $fields['plate_number'] ?? null,
            'status' => $fields['status'] ?? 'Active',
            'health_condition' => $fields['health_condition'] ?? 'Good',
            'location_area' => $fields['location_area'] ?? null,
            'notes' => $fields['notes'] ?? "Imported from: {$import->original_name}",
            'created_by' => $import->imported_by,
            'updated_by' => $import->imported_by,
        ]);

        return $item->id;
    }

    // ========================================
    // Helper Methods
    // ========================================

    protected function detectFileType(UploadedFile $file): string
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $mimeType = $file->getMimeType();

        $map = [
            'pdf' => 'pdf',
            'docx' => 'docx', 'doc' => 'doc',
            'xlsx' => 'xlsx', 'xls' => 'xls',
            'csv' => 'csv',
            'pptx' => 'pptx', 'ppt' => 'ppt',
            'txt' => 'txt',
        ];

        return $map[$extension] ?? 'txt';
    }

    protected function createImportItems(DocumentImport $import, array $mappedData, array $classification): array
    {
        $items = [];

        foreach ($mappedData['modules'] ?? [] as $module => $records) {
            foreach ($records as $record) {
                $sectionHeading = $record['_section_heading'] ?? null;
                $confidence = $record['_confidence'] ?? 0.5;

                $item = DocumentImportItem::create([
                    'document_import_id' => $import->id,
                    'target_module' => $module,
                    'target_model' => $this->getModelClass($module),
                    'section_heading' => $sectionHeading,
                    'extracted_fields' => $record,
                    'mapped_fields' => $this->cleanMappedFields($record),
                    'confidence' => min($confidence, 1.0),
                    'status' => 'pending',
                    'duplicate_of' => $record['_duplicate_of'] ?? null,
                    'warnings' => $record['_warnings'] ?? null,
                ]);

                $items[] = $item;
            }
        }

        return $items;
    }

    protected function cleanMappedFields(array $fields): array
    {
        $cleaned = [];
        foreach ($fields as $key => $value) {
            if (!str_starts_with($key, '_')) {
                $cleaned[$key] = $value;
            }
        }
        return $cleaned;
    }

    protected function checkForDuplicates(array $mappedData): array
    {
        foreach ($mappedData['modules'] as $module => &$records) {
            foreach ($records as &$record) {
                $duplicate = $this->findDuplicate($module, $record);
                if ($duplicate) {
                    $record['_duplicate_of'] = $duplicate;
                    $record['_warnings'] = ["Potential duplicate of existing record: {$duplicate}"];
                }
            }
        }
        return $mappedData;
    }

    protected function findDuplicate(string $module, array $record): ?string
    {
        return match ($module) {
            'observations' => $this->findDuplicateObservation($record),
            'permits' => $this->findDuplicatePermit($record),
            'mockups' => $this->findDuplicateMockup($record),
            'mom' => $this->findDuplicateMomPoint($record),
            default => null,
        };
    }

    protected function findDuplicateObservation(array $record): ?string
    {
        if (empty($record['description'])) return null;
        $existing = Observation::where('description', $record['description'])
            ->where('observation_date', $record['observation_date'] ?? date('Y-m-d'))
            ->first();
        return $existing?->ref_number;
    }

    protected function findDuplicatePermit(array $record): ?string
    {
        if (empty($record['work_description'])) return null;
        $existing = Permit::where('work_description', $record['work_description'])
            ->where('permit_type', $record['permit_type'] ?? 'general')
            ->whereDate('created_at', '>=', now()->subDays(7))
            ->first();
        return $existing?->ref_number;
    }

    protected function findDuplicateMockup(array $record): ?string
    {
        if (empty($record['title'])) return null;
        $existing = Mockup::where('title', $record['title'])->first();
        return $existing?->ref_number;
    }

    protected function findDuplicateMomPoint(array $record): ?string
    {
        if (empty($record['title'])) return null;
        $existing = MomPoint::where('title', $record['title'])
            ->whereIn('status', ['Open', 'In Progress', 'Pending'])
            ->first();
        return $existing?->point_code;
    }

    protected function getModelClass(string $module): string
    {
        return match ($module) {
            'mom' => 'MomPoint',
            'training' => 'TrainingRecord',
            'permits' => 'Permit',
            'observations' => 'Observation',
            'mockups' => 'Mockup',
            'checklists' => 'ChecklistItem',
            'tracker' => 'TrackerRecord',
            'manpower' => 'Worker',
            'incidents' => 'Incident',
            default => 'Unknown',
        };
    }

    protected function getModuleLabel(string $module): string
    {
        return match ($module) {
            'mom' => 'Weekly MOM',
            'training' => 'Training Matrix',
            'permits' => 'Permits',
            'observations' => 'Observations',
            'mockups' => 'Mock-Up Register',
            'checklists' => 'Checklists',
            'tracker' => 'Equipment Tracker',
            'manpower' => 'Manpower',
            'incidents' => 'Incidents',
            'rams' => 'RAMS Board',
            'reports' => 'Reports / Statistics',
            default => ucfirst($module),
        };
    }

    /**
     * List import history.
     */
    public function listImports(array $filters = []): \Illuminate\Database\Eloquent\Collection
    {
        $query = DocumentImport::with('items')
            ->orderBy('created_at', 'desc');

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (!empty($filters['document_type'])) {
            $query->where('document_type', $filters['document_type']);
        }

        return $query->limit(50)->get();
    }

    /**
     * Delete an import and its items.
     */
    public function deleteImport(DocumentImport $import): void
    {
        // Delete stored file
        if ($import->file_path) {
            Storage::disk('public')->delete($import->file_path);
        }

        // Items cascade-delete via FK
        $import->delete();
    }
}
