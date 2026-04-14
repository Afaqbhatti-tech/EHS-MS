<?php

namespace App\Services;

use App\Models\ImportBatch;
use App\Models\ImportRow;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class ImportReconciliationService
{
    // ── STEP 1: Parse file and classify all rows ────────────

    public function processFile(
        string $module,
        string $filePath,
        string $originalName,
        int|string $userId
    ): ImportBatch {
        $moduleConfig = ImportModuleConfig::get($module);

        $batch = ImportBatch::create([
            'module'            => $module,
            'uploaded_by'       => $userId,
            'original_filename' => $originalName,
            'file_path'         => $filePath,
            'file_size_kb'      => (int) ceil(Storage::disk('local')->size($filePath) / 1024),
            'status'            => 'parsing',
        ]);

        try {
            $rows = $this->parseSpreadsheet($filePath, $moduleConfig);
            $batch->update(['total_rows' => count($rows)]);

            $existingIndex = $this->buildExistingIndex($module, $moduleConfig);

            $seenInFile  = [];
            $importRows  = [];
            $parseErrors = 0;

            foreach ($rows as $i => $rawRow) {
                $rowNumber = $i + 2; // +2 because row 1 is header, array is 0-indexed

                // Validate required fields
                $missing = $this->checkRequiredFields($rawRow, $moduleConfig);
                if (!empty($missing)) {
                    $importRows[] = [
                        'batch_id'       => $batch->id,
                        'row_number'     => $rowNumber,
                        'raw_data'       => json_encode($rawRow),
                        'classification' => 'error',
                        'match_type'     => null,
                        'match_confidence'=> 'none',
                        'conflict_reason'=> 'Missing required field(s): ' . implode(', ', $missing),
                        'sync_action'    => 'pending',
                        'created_at'     => now(),
                    ];
                    $parseErrors++;
                    continue;
                }

                $result = $this->classifyRow($rawRow, $rowNumber, $moduleConfig, $existingIndex, $seenInFile);

                $matchedRecord = $result['matched_record'] ?? null;
                $matchedId     = null;
                $matchedUuid   = null;
                $matchedCode   = null;

                if ($matchedRecord) {
                    $pkType = $moduleConfig['pk_type'] ?? 'integer';
                    if ($pkType === 'uuid') {
                        $matchedUuid = $matchedRecord['id'] ?? null;
                    } else {
                        $matchedId = $matchedRecord['id'] ?? null;
                    }
                    $codeField   = $moduleConfig['display_code_field'] ?? null;
                    $matchedCode = $codeField ? ($matchedRecord[$codeField] ?? null) : null;
                }

                $importRows[] = [
                    'batch_id'            => $batch->id,
                    'row_number'          => $rowNumber,
                    'raw_data'            => json_encode($rawRow),
                    'classification'      => $result['classification'],
                    'match_type'          => $result['match_type'],
                    'match_confidence'    => $result['confidence'],
                    'matched_record_id'   => $matchedId,
                    'matched_record_uuid' => $matchedUuid,
                    'matched_record_code' => $matchedCode,
                    'fields_to_fill'      => !empty($result['to_fill']) ? json_encode($result['to_fill']) : null,
                    'fields_conflicting'  => !empty($result['conflicts']) ? json_encode($result['conflicts']) : null,
                    'fields_identical'    => !empty($result['identical']) ? json_encode($result['identical']) : null,
                    'conflict_reason'     => $result['conflict_reason'] ?? null,
                    'sync_action'         => 'pending',
                    'created_at'          => now(),
                ];
            }

            // Bulk insert rows in chunks
            foreach (array_chunk($importRows, 500) as $chunk) {
                DB::table('import_rows')->insert($chunk);
            }

            $batch->update([
                'parsed_rows' => count($rows),
                'parse_errors'=> $parseErrors,
                'status'      => 'preview_ready',
                'parsed_at'   => now(),
            ]);

            $batch->updateClassificationCounts();

        } catch (\Exception $e) {
            $batch->update([
                'status'              => 'failed',
                'parse_error_message' => $e->getMessage(),
            ]);
            throw $e;
        }

        return $batch->fresh();
    }

    // ── STEP 2: Parse spreadsheet file ──────────────────────

    private function parseSpreadsheet(string $filePath, array $moduleConfig): array
    {
        $fullPath = Storage::disk('local')->path($filePath);
        $ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));

        if ($ext === 'csv') {
            return $this->parseCsv($fullPath, $moduleConfig);
        }

        $spreadsheet = IOFactory::load($fullPath);
        $worksheet   = $spreadsheet->getActiveSheet();
        $rows        = [];
        $headers     = [];
        $columnMap   = $this->buildReverseColumnMap($moduleConfig['column_map']);

        foreach ($worksheet->getRowIterator() as $rowIndex => $row) {
            $cellIterator = $row->getCellIterator();
            $cellIterator->setIterateOnlyExistingCells(false);

            $cells = [];
            foreach ($cellIterator as $cell) {
                $value = $cell->getValue();
                // Handle Excel date values
                if (is_numeric($value) && ExcelDate::isDateTime($cell)) {
                    try {
                        $value = ExcelDate::excelToDateTimeObject($value)->format('Y-m-d');
                    } catch (\Exception $e) {
                        // keep raw value
                    }
                }
                $cells[] = $value;
            }

            if ($rowIndex === 1) {
                // Header row — map to DB field names
                foreach ($cells as $cell) {
                    $header = trim((string) $cell);
                    $headers[] = $columnMap[strtolower($header)] ?? $this->snakeCase($header);
                }
                continue;
            }

            // Skip completely empty rows
            if ($this->isEmptyRow($cells)) {
                continue;
            }

            $mapped = [];
            foreach ($cells as $colIndex => $value) {
                if (isset($headers[$colIndex])) {
                    $mapped[$headers[$colIndex]] = $value;
                }
            }
            $rows[] = $mapped;
        }

        return $rows;
    }

    private function parseCsv(string $fullPath, array $moduleConfig): array
    {
        $handle = fopen($fullPath, 'r');
        if (!$handle) {
            throw new \RuntimeException("Cannot open CSV file");
        }

        $columnMap = $this->buildReverseColumnMap($moduleConfig['column_map']);
        $headers   = [];
        $rows      = [];
        $first     = true;

        while (($line = fgetcsv($handle)) !== false) {
            if ($first) {
                foreach ($line as $cell) {
                    $header = trim((string) $cell);
                    $headers[] = $columnMap[strtolower($header)] ?? $this->snakeCase($header);
                }
                $first = false;
                continue;
            }

            if ($this->isEmptyRow($line)) {
                continue;
            }

            $mapped = [];
            foreach ($line as $colIndex => $value) {
                if (isset($headers[$colIndex])) {
                    $mapped[$headers[$colIndex]] = $value;
                }
            }
            $rows[] = $mapped;
        }

        fclose($handle);
        return $rows;
    }

    // ── STEP 3: Classify a single row ───────────────────────

    public function classifyRow(
        array  $rawRow,
        int    $rowNumber,
        array  $moduleConfig,
        array  $existingIndex,
        array  &$seenInFile
    ): array {
        $normalized = $this->normalizeRow($rawRow);

        // CHECK 1: Intra-file duplicate
        $fileKey = $this->buildFileKey($normalized, $moduleConfig);
        if ($fileKey && isset($seenInFile[$fileKey])) {
            return [
                'classification' => 'intra_file_dup',
                'match_type'     => 'intra_file',
                'confidence'     => 'strong',
                'conflict_reason'=> "Duplicate of row {$seenInFile[$fileKey]} in same file",
                'to_fill'        => [],
                'conflicts'      => [],
                'identical'      => [],
                'matched_record' => null,
            ];
        }
        if ($fileKey) {
            $seenInFile[$fileKey] = $rowNumber;
        }

        // CHECK 2: Match against existing DB records
        $match = $this->findMatch($normalized, $moduleConfig, $existingIndex);

        if (!$match) {
            return [
                'classification' => 'new',
                'match_type'     => 'none',
                'confidence'     => 'none',
                'to_fill'        => [],
                'conflicts'      => [],
                'identical'      => [],
                'matched_record' => null,
            ];
        }

        // CHECK 3: Weak/name-only match → always conflict
        if ($match['confidence'] === 'weak') {
            return [
                'classification' => 'conflict',
                'match_type'     => $match['match_type'],
                'confidence'     => 'weak',
                'conflict_reason'=> 'Name-only match found. Manual review required before merging.',
                'matched_record' => $match['record'],
                'to_fill'        => [],
                'conflicts'      => [],
                'identical'      => [],
            ];
        }

        // CHECK 4: Strong/moderate match → analyze fields
        $analysis = $this->analyzeFields(
            $normalized,
            $match['record'],
            $moduleConfig['fillable_fields']
        );

        // Special: employee_number match + different iqama → extra conflict info
        if ($match['match_type'] === 'employee_number_exact'
            && isset($analysis['conflicts']['iqama_number'])) {
            $analysis['conflicts']['iqama_number']['reason'] =
                'Employee number matched but iqama numbers differ. Manual review required.';
        }

        if (!empty($analysis['conflicts'])) {
            return [
                'classification' => 'conflict',
                'match_type'     => $match['match_type'],
                'confidence'     => $match['confidence'],
                'conflict_reason'=> count($analysis['conflicts']) .
                                    ' field(s) conflict with existing data',
                'matched_record' => $match['record'],
                'to_fill'        => $analysis['to_fill'],
                'conflicts'      => $analysis['conflicts'],
                'identical'      => $analysis['identical'],
            ];
        }

        if (!empty($analysis['to_fill'])) {
            return [
                'classification' => 'update',
                'match_type'     => $match['match_type'],
                'confidence'     => $match['confidence'],
                'matched_record' => $match['record'],
                'to_fill'        => $analysis['to_fill'],
                'conflicts'      => [],
                'identical'      => $analysis['identical'],
            ];
        }

        // No fills, no conflicts → duplicate
        return [
            'classification' => 'duplicate',
            'match_type'     => $match['match_type'],
            'confidence'     => $match['confidence'],
            'matched_record' => $match['record'],
            'to_fill'        => [],
            'conflicts'      => [],
            'identical'      => $analysis['identical'],
        ];
    }

    // ── STEP 4: Normalize a row ─────────────────────────────

    private function normalizeRow(array $row): array
    {
        $normalized = [];
        foreach ($row as $key => $value) {
            if ($value === null) {
                $normalized[$key] = null;
                continue;
            }
            $val = trim((string) $value);

            // Remove non-printable characters
            $val = preg_replace('/[\x00-\x1F\x7F]/u', '', $val);

            // Normalize ID fields
            if (in_array($key, ['iqama_number', 'id_number', 'employee_number', 'registration_number', 'tax_number'])) {
                $val = preg_replace('/\s+/', '', $val);
            }

            // Normalize name fields
            if (str_contains($key, 'name')) {
                $val = preg_replace('/\s+/', ' ', $val);
            }

            // Normalize phone
            if (str_contains($key, 'phone') || str_contains($key, 'mobile') || str_contains($key, 'contact_number')) {
                $val = preg_replace('/[^\d+]/', '', $val);
            }

            // Treat placeholders as empty for ID fields
            $idFields = ['iqama_number', 'id_number', 'employee_number', 'registration_number', 'tax_number', 'serial_number', 'plate_number'];
            if (in_array(strtolower($val), ['n/a', 'na', '-', '0', 'none', 'null', '']) && in_array($key, $idFields)) {
                $val = null;
            }

            $normalized[$key] = ($val !== '' && $val !== null) ? $val : null;
        }
        return $normalized;
    }

    // ── STEP 5: Match against existing records ──────────────

    private function findMatch(
        array $normalizedRow,
        array $moduleConfig,
        array $existingIndex
    ): ?array {
        // TIER 1: Common strong identifiers (iqama, employee_number, id_number)
        $commonStrong = [
            'iqama'           => 'iqama_number',
            'employee_number' => 'employee_number',
            'id_number'       => 'id_number',
        ];

        foreach ($commonStrong as $indexKey => $field) {
            if (!empty($normalizedRow[$field]) && isset($existingIndex[$indexKey])) {
                $key = $normalizedRow[$field];
                if (isset($existingIndex[$indexKey][$key])) {
                    return [
                        'record'     => $existingIndex[$indexKey][$key],
                        'match_type' => $field . '_exact',
                        'confidence' => 'strong',
                    ];
                }
            }
        }

        // TIER 2: Module-specific strong identifiers
        foreach ($moduleConfig['strong_identifiers'] ?? [] as $field => $indexKey) {
            if (!empty($normalizedRow[$field]) && isset($existingIndex[$indexKey])) {
                $key = $normalizedRow[$field];
                if (isset($existingIndex[$indexKey][$key])) {
                    return [
                        'record'     => $existingIndex[$indexKey][$key],
                        'match_type' => $field . '_exact',
                        'confidence' => 'strong',
                    ];
                }
            }
        }

        // TIER 3: Weak heuristic — name + support fields
        $nameField   = $moduleConfig['name_field'] ?? 'name';
        $incomingName = strtolower($normalizedRow[$nameField] ?? '');

        if (strlen($incomingName) >= 3 && isset($existingIndex['name'])) {
            foreach ($existingIndex['name'] as $existingName => $record) {
                if ($existingName === $incomingName) {
                    $supportFields  = $moduleConfig['name_support_fields'] ?? [];
                    $supportMatches = 0;
                    foreach ($supportFields as $sf) {
                        if (!empty($normalizedRow[$sf])
                            && !empty($record[$sf])
                            && strtolower(trim((string) $normalizedRow[$sf]))
                               === strtolower(trim((string) $record[$sf]))) {
                            $supportMatches++;
                        }
                    }

                    $confidence = $supportMatches >= 2 ? 'moderate' : 'weak';

                    return [
                        'record'     => $record,
                        'match_type' => 'name_and_support',
                        'confidence' => $confidence,
                    ];
                }
            }
        }

        return null;
    }

    // ── STEP 6: Field-level analysis ────────────────────────

    private function analyzeFields(
        array $incomingRow,
        array $existingRecord,
        array $fillableFields
    ): array {
        $toFill    = [];
        $conflicts = [];
        $identical = [];

        foreach ($fillableFields as $field) {
            // Skip virtual fields (not in DB)
            $incoming = $incomingRow[$field] ?? null;
            $existing = $existingRecord[$field] ?? null;

            if ($incoming === null || $incoming === '') {
                continue;
            }

            if ($existing === null || $existing === '') {
                $toFill[$field] = $incoming;
            } else {
                $normIncoming = strtolower(trim((string) $incoming));
                $normExisting = strtolower(trim((string) $existing));

                if ($normIncoming === $normExisting) {
                    $identical[] = $field;
                } else {
                    $conflicts[$field] = [
                        'existing' => $existing,
                        'incoming' => $incoming,
                    ];
                }
            }
        }

        return [
            'to_fill'   => $toFill,
            'conflicts' => $conflicts,
            'identical' => $identical,
        ];
    }

    // ── STEP 7: Build existing index ────────────────────────

    public function buildExistingIndex(string $module, array $moduleConfig): array
    {
        $tableName   = $moduleConfig['table'];
        $indexFields = $moduleConfig['index_fields'];

        $records = DB::table($tableName)
            ->whereNull('deleted_at')
            ->get($moduleConfig['select_fields']);

        $index = [];
        foreach ($records as $record) {
            $arr = (array) $record;
            foreach ($indexFields as $indexKey => $field) {
                if (!empty($arr[$field])) {
                    $keyValue = $indexKey === 'name'
                        ? strtolower(trim((string) $arr[$field]))
                        : trim((string) $arr[$field]);
                    $index[$indexKey][$keyValue] = $arr;
                }
            }
        }
        return $index;
    }

    // ── STEP 8: Execute confirmed batch sync ────────────────

    public function executeBatch(ImportBatch $batch, int|string $confirmedBy): array
    {
        $rows         = ImportRow::where('batch_id', $batch->id)->get();
        $moduleConfig = ImportModuleConfig::get($batch->module);
        $modelClass   = $moduleConfig['model'];

        $results = [
            'created'        => 0,
            'updated'        => 0,
            'skipped'        => 0,
            'conflicts_held' => 0,
            'errors'         => 0,
        ];

        $batch->update(['status' => 'syncing']);

        DB::transaction(function () use ($rows, $moduleConfig, $modelClass, &$results, $confirmedBy) {
            foreach ($rows as $row) {
                try {
                    switch ($row->classification) {

                        case 'new':
                            $mappedData = $this->mapToModel($row->raw_data, $moduleConfig);
                            $newRecord  = $modelClass::create($mappedData);

                            $pkType = $moduleConfig['pk_type'] ?? 'integer';
                            $row->update([
                                'sync_action'        => 'created',
                                'synced_record_id'   => $pkType === 'integer' ? $newRecord->id : null,
                                'synced_record_uuid' => $pkType === 'uuid' ? $newRecord->id : null,
                                'synced_at'          => now(),
                            ]);
                            $results['created']++;
                            break;

                        case 'update':
                            $toFill    = $row->fields_to_fill;
                            $recordId  = $row->matched_record_id ?? $row->matched_record_uuid;

                            if ($recordId && !empty($toFill)) {
                                $record = $modelClass::find($recordId);
                                if ($record) {
                                    // Race condition safety: re-check fields are still empty
                                    $safeUpdate = [];
                                    foreach ($toFill as $field => $value) {
                                        $current = $record->$field;
                                        if ($current === null || $current === '') {
                                            $safeUpdate[$field] = $value;
                                        }
                                    }
                                    if (!empty($safeUpdate)) {
                                        $record->update($safeUpdate);
                                    }

                                    $pkType = $moduleConfig['pk_type'] ?? 'integer';
                                    $row->update([
                                        'sync_action'        => 'updated',
                                        'synced_record_id'   => $pkType === 'integer' ? $record->id : null,
                                        'synced_record_uuid' => $pkType === 'uuid' ? $record->id : null,
                                        'synced_at'          => now(),
                                    ]);
                                    $results['updated']++;
                                }
                            }
                            break;

                        case 'duplicate':
                        case 'intra_file_dup':
                            $row->update(['sync_action' => 'skipped', 'synced_at' => now()]);
                            $results['skipped']++;
                            break;

                        case 'conflict':
                            $row->update(['sync_action' => 'held', 'synced_at' => now()]);
                            $results['conflicts_held']++;
                            break;

                        case 'error':
                            $row->update(['sync_action' => 'error', 'synced_at' => now()]);
                            $results['errors']++;
                            break;
                    }
                } catch (\Exception $e) {
                    $row->update([
                        'sync_action' => 'error',
                        'sync_error'  => $e->getMessage(),
                        'synced_at'   => now(),
                    ]);
                    $results['errors']++;
                }
            }
        });

        $batch->update([
            'status'         => 'completed',
            'created_count'  => $results['created'],
            'updated_count'  => $results['updated'],
            'skipped_count'  => $results['skipped'],
            'conflicts_held' => $results['conflicts_held'],
            'confirmed_at'   => now(),
            'confirmed_by'   => $confirmedBy,
            'completed_at'   => now(),
        ]);

        return $results;
    }

    // ── PRIVATE HELPERS ─────────────────────────────────────

    private function buildFileKey(array $normalized, array $moduleConfig): ?string
    {
        $parts = [];

        // Use strong identifier fields for file-level dedup key
        $idFields = array_values($moduleConfig['index_fields']);
        foreach ($idFields as $field) {
            if ($field === ($moduleConfig['name_field'] ?? 'name')) {
                continue; // skip name for file key — too ambiguous
            }
            if (!empty($normalized[$field])) {
                $parts[] = $field . ':' . strtolower(trim((string) $normalized[$field]));
            }
        }

        // Also include name if we have at least one ID
        $nameField = $moduleConfig['name_field'] ?? 'name';
        if (!empty($parts) && !empty($normalized[$nameField])) {
            $parts[] = 'name:' . strtolower(trim((string) $normalized[$nameField]));
        }

        // If no ID fields, use name + all support fields
        if (empty($parts) && !empty($normalized[$nameField])) {
            $parts[] = 'name:' . strtolower(trim((string) $normalized[$nameField]));
            foreach ($moduleConfig['name_support_fields'] ?? [] as $sf) {
                if (!empty($normalized[$sf])) {
                    $parts[] = $sf . ':' . strtolower(trim((string) $normalized[$sf]));
                }
            }
        }

        return !empty($parts) ? implode('|', $parts) : null;
    }

    private function mapToModel(array $rawData, array $moduleConfig): array
    {
        $fillable = $moduleConfig['fillable_fields'];
        $mapped   = [];

        foreach ($rawData as $key => $value) {
            if (in_array($key, $fillable) && $value !== null && $value !== '') {
                $mapped[$key] = $value;
            }
        }

        return $mapped;
    }

    private function checkRequiredFields(array $row, array $moduleConfig): array
    {
        $missing = [];
        foreach ($moduleConfig['required_fields'] as $field) {
            $val = $row[$field] ?? null;
            if ($val === null || trim((string) $val) === '') {
                $missing[] = $field;
            }
        }
        return $missing;
    }

    private function buildReverseColumnMap(array $columnMap): array
    {
        $reverse = [];
        foreach ($columnMap as $header => $field) {
            $reverse[strtolower($header)] = $field;
        }
        return $reverse;
    }

    private function snakeCase(string $header): string
    {
        $snake = preg_replace('/[^a-zA-Z0-9]+/', '_', $header);
        $snake = strtolower(trim($snake, '_'));
        return $snake;
    }

    private function isEmptyRow(array $cells): bool
    {
        foreach ($cells as $cell) {
            if ($cell !== null && trim((string) $cell) !== '') {
                return false;
            }
        }
        return true;
    }
}
