<?php

namespace App\Services\Import;

use PhpOffice\PhpSpreadsheet\IOFactory as SpreadsheetIOFactory;
use PhpOffice\PhpWord\IOFactory as WordIOFactory;
use Smalot\PdfParser\Parser as PdfParser;
use Exception;

class DocumentParserService
{
    /**
     * Parse a document file and return structured content.
     *
     * @return array{metadata: array, sections: array, tables: array, raw_text: string}
     */
    public function parse(string $filePath, string $fileType): array
    {
        return match ($fileType) {
            'pdf' => $this->parsePdf($filePath),
            'docx', 'doc' => $this->parseDocx($filePath),
            'xlsx', 'xls' => $this->parseSpreadsheet($filePath),
            'csv' => $this->parseCsv($filePath),
            'pptx', 'ppt' => $this->parsePptx($filePath),
            'txt' => $this->parseText($filePath),
            default => throw new Exception("Unsupported file type: {$fileType}"),
        };
    }

    /**
     * Parse PDF using smalot/pdfparser.
     */
    protected function parsePdf(string $filePath): array
    {
        $parser = new PdfParser();
        $pdf = $parser->parseFile($filePath);

        $metadata = $this->extractPdfMetadata($pdf);
        $sections = [];
        $rawText = '';

        $pages = $pdf->getPages();
        foreach ($pages as $pageIndex => $page) {
            $pageText = $page->getText();
            $rawText .= $pageText . "\n\n";

            $pageSections = $this->splitTextIntoSections($pageText);
            foreach ($pageSections as $section) {
                $section['page'] = $pageIndex + 1;
                $sections[] = $section;
            }
        }

        return [
            'metadata' => $metadata,
            'sections' => $sections,
            'tables' => $this->detectTablesInText($rawText),
            'raw_text' => trim($rawText),
        ];
    }

    /**
     * Parse DOCX using phpoffice/phpword.
     */
    protected function parseDocx(string $filePath): array
    {
        $phpWord = WordIOFactory::load($filePath);
        $metadata = $this->extractDocxMetadata($phpWord);
        $sections = [];
        $tables = [];
        $rawText = '';

        foreach ($phpWord->getSections() as $section) {
            foreach ($section->getElements() as $element) {
                $elementClass = get_class($element);

                if ($element instanceof \PhpOffice\PhpWord\Element\TextRun) {
                    $text = $this->extractTextRunContent($element);
                    $rawText .= $text . "\n";

                    if ($this->isLikelyHeading($element, $text)) {
                        $sections[] = [
                            'heading' => trim($text),
                            'level' => $this->detectHeadingLevel($element),
                            'content' => '',
                            'type' => 'heading',
                            'items' => [],
                        ];
                    } elseif (!empty($sections)) {
                        $lastIdx = count($sections) - 1;
                        $sections[$lastIdx]['content'] .= $text . "\n";
                        if ($this->isBulletPoint($text)) {
                            $sections[$lastIdx]['items'][] = $this->cleanBulletText($text);
                        }
                    } else {
                        $sections[] = [
                            'heading' => 'Document Content',
                            'level' => 0,
                            'content' => $text . "\n",
                            'type' => 'paragraph',
                            'items' => [],
                        ];
                    }
                } elseif ($element instanceof \PhpOffice\PhpWord\Element\Text) {
                    $text = $element->getText();
                    $rawText .= $text . "\n";

                    if (!empty($sections)) {
                        $lastIdx = count($sections) - 1;
                        $sections[$lastIdx]['content'] .= $text . "\n";
                    } else {
                        $sections[] = [
                            'heading' => 'Document Content',
                            'level' => 0,
                            'content' => $text . "\n",
                            'type' => 'paragraph',
                            'items' => [],
                        ];
                    }
                } elseif ($element instanceof \PhpOffice\PhpWord\Element\Table) {
                    $tableData = $this->extractWordTable($element);
                    $tables[] = $tableData;
                    $rawText .= $this->tableToText($tableData) . "\n";

                    if (!empty($sections)) {
                        $lastIdx = count($sections) - 1;
                        $sections[$lastIdx]['type'] = 'table';
                        $sections[$lastIdx]['table_data'] = $tableData;
                    } else {
                        $sections[] = [
                            'heading' => 'Table Data',
                            'level' => 0,
                            'content' => $this->tableToText($tableData),
                            'type' => 'table',
                            'items' => [],
                            'table_data' => $tableData,
                        ];
                    }
                } elseif ($element instanceof \PhpOffice\PhpWord\Element\ListItemRun) {
                    $text = $this->extractListItemContent($element);
                    $rawText .= "  • " . $text . "\n";

                    if (!empty($sections)) {
                        $lastIdx = count($sections) - 1;
                        $sections[$lastIdx]['content'] .= "  • " . $text . "\n";
                        $sections[$lastIdx]['items'][] = trim($text);
                    }
                }
            }
        }

        // Clean up section content
        foreach ($sections as &$s) {
            $s['content'] = trim($s['content'] ?? '');
        }

        return [
            'metadata' => $metadata,
            'sections' => $sections,
            'tables' => $tables,
            'raw_text' => trim($rawText),
        ];
    }

    /**
     * Parse Excel/ODS spreadsheet using phpspreadsheet.
     */
    protected function parseSpreadsheet(string $filePath): array
    {
        $spreadsheet = SpreadsheetIOFactory::load($filePath);
        $metadata = [
            'title' => $spreadsheet->getProperties()->getTitle() ?: basename($filePath),
            'creator' => $spreadsheet->getProperties()->getCreator(),
            'sheet_count' => $spreadsheet->getSheetCount(),
        ];

        $sections = [];
        $tables = [];
        $rawText = '';

        foreach ($spreadsheet->getAllSheets() as $sheetIndex => $sheet) {
            $sheetName = $sheet->getTitle();
            $sheetData = $sheet->toArray(null, true, true, true);

            if (empty($sheetData)) continue;

            // Try to detect if first row is headers
            $firstRow = reset($sheetData);
            $headers = [];
            $isTabular = $this->detectIfTabular($sheetData);

            if ($isTabular && $firstRow) {
                $headers = array_values(array_filter(array_map('trim', $firstRow)));
                $rows = array_slice($sheetData, 1, null, true);
            } else {
                $rows = $sheetData;
            }

            $tableRows = [];
            $sectionText = '';

            foreach ($rows as $rowIdx => $row) {
                $rowValues = array_values(array_map(function ($v) {
                    return $v !== null ? trim((string)$v) : '';
                }, $row));

                $nonEmpty = array_filter($rowValues, fn($v) => $v !== '');

                if (empty($nonEmpty)) continue;

                if ($isTabular && !empty($headers)) {
                    $mappedRow = [];
                    foreach ($headers as $hIdx => $header) {
                        $mappedRow[$header] = $rowValues[$hIdx] ?? '';
                    }
                    $tableRows[] = $mappedRow;
                }

                $rowText = implode(' | ', array_filter($rowValues, fn($v) => $v !== ''));
                $sectionText .= $rowText . "\n";
                $rawText .= $rowText . "\n";
            }

            if (!empty($headers) && !empty($tableRows)) {
                $tables[] = ['headers' => $headers, 'rows' => $tableRows, 'sheet' => $sheetName];
            }

            $sections[] = [
                'heading' => $sheetName,
                'level' => 1,
                'content' => trim($sectionText),
                'type' => $isTabular ? 'table' : 'paragraph',
                'items' => [],
                'table_data' => !empty($tableRows) ? ['headers' => $headers, 'rows' => $tableRows] : null,
            ];

            $rawText .= "\n";
        }

        return [
            'metadata' => $metadata,
            'sections' => $sections,
            'tables' => $tables,
            'raw_text' => trim($rawText),
        ];
    }

    /**
     * Parse CSV file.
     */
    protected function parseCsv(string $filePath): array
    {
        $handle = fopen($filePath, 'r');
        if (!$handle) throw new Exception("Cannot read CSV file");

        $headers = [];
        $rows = [];
        $rawText = '';
        $lineIndex = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $rowValues = array_map('trim', $row);

            if ($lineIndex === 0) {
                $headers = $rowValues;
                $rawText .= implode(' | ', $rowValues) . "\n";
            } else {
                $mappedRow = [];
                foreach ($headers as $hIdx => $header) {
                    $mappedRow[$header] = $rowValues[$hIdx] ?? '';
                }
                $rows[] = $mappedRow;
                $rawText .= implode(' | ', $rowValues) . "\n";
            }
            $lineIndex++;
        }
        fclose($handle);

        return [
            'metadata' => [
                'title' => basename($filePath, '.csv'),
                'row_count' => count($rows),
                'column_count' => count($headers),
            ],
            'sections' => [
                [
                    'heading' => basename($filePath, '.csv'),
                    'level' => 1,
                    'content' => trim($rawText),
                    'type' => 'table',
                    'items' => [],
                    'table_data' => ['headers' => $headers, 'rows' => $rows],
                ],
            ],
            'tables' => [['headers' => $headers, 'rows' => $rows]],
            'raw_text' => trim($rawText),
        ];
    }

    /**
     * Parse PowerPoint file.
     * Extracts per-slide: title (first text block or largest font), body content,
     * bullet items, key-value pairs, table data, and slide number metadata.
     */
    protected function parsePptx(string $filePath): array
    {
        // phpoffice/phppresentation may not be installed
        // Fallback: use ZIP to extract text from PPTX XML
        if (!class_exists(\PhpOffice\PhpPresentation\IOFactory::class)) {
            return $this->parsePptxViaZip($filePath);
        }

        $presentation = \PhpOffice\PhpPresentation\IOFactory::load($filePath);
        $sections = [];
        $tables = [];
        $rawText = '';

        foreach ($presentation->getAllSlides() as $slideIdx => $slide) {
            $slideNumber = $slideIdx + 1;
            $slideText = '';
            $items = [];
            $slideTitle = '';
            $bodyLines = [];
            $slideTables = [];
            $largestFontSize = 0;
            $largestFontText = '';

            foreach ($slide->getShapeCollection() as $shape) {
                if ($shape instanceof \PhpOffice\PhpPresentation\Shape\RichText) {
                    $isFirstShape = ($slideTitle === '');

                    foreach ($shape->getParagraphs() as $paragraph) {
                        $text = '';
                        $maxFontInParagraph = 0;

                        foreach ($paragraph->getRichTextElements() as $element) {
                            if (method_exists($element, 'getText')) {
                                $text .= $element->getText();
                            }
                            // Track font size to detect slide title
                            if (method_exists($element, 'getFont')) {
                                $font = $element->getFont();
                                if ($font && method_exists($font, 'getSize')) {
                                    $size = $font->getSize();
                                    if ($size > $maxFontInParagraph) {
                                        $maxFontInParagraph = $size;
                                    }
                                }
                            }
                        }
                        $text = trim($text);
                        if ($text !== '') {
                            $slideText .= $text . "\n";
                            $items[] = $text;
                            $bodyLines[] = $text;

                            // Track largest font text as potential title
                            if ($maxFontInParagraph > $largestFontSize) {
                                $largestFontSize = $maxFontInParagraph;
                                $largestFontText = $text;
                            }

                            // First non-empty text in first shape is likely the title
                            if ($isFirstShape && $slideTitle === '') {
                                $slideTitle = $text;
                                $isFirstShape = false;
                            }
                        }
                    }
                } elseif ($shape instanceof \PhpOffice\PhpPresentation\Shape\Table) {
                    $tableHeaders = [];
                    $tableRows = [];

                    foreach ($shape->getRows() as $rowIdx => $row) {
                        $rowTexts = [];
                        foreach ($row->getCells() as $cell) {
                            $cellText = '';
                            foreach ($cell->getParagraphs() as $paragraph) {
                                foreach ($paragraph->getRichTextElements() as $element) {
                                    if (method_exists($element, 'getText')) {
                                        $cellText .= $element->getText();
                                    }
                                }
                            }
                            $rowTexts[] = trim($cellText);
                        }

                        if ($rowIdx === 0) {
                            $tableHeaders = $rowTexts;
                        } else {
                            $mappedRow = [];
                            foreach ($tableHeaders as $hi => $header) {
                                $key = $header ?: "col_{$hi}";
                                $mappedRow[$key] = $rowTexts[$hi] ?? '';
                            }
                            $tableRows[] = $mappedRow;
                        }

                        $slideText .= implode(' | ', $rowTexts) . "\n";
                    }

                    if (!empty($tableHeaders) && !empty($tableRows)) {
                        $tableData = [
                            'headers' => $tableHeaders,
                            'rows' => $tableRows,
                            'source_slide_no' => $slideNumber,
                        ];
                        $slideTables[] = $tableData;
                        $tables[] = $tableData;
                    }
                }
            }

            // Use largest font text as title if available, fall back to first text
            $effectiveTitle = $largestFontText ?: $slideTitle;

            $rawText .= $slideText . "\n";

            // Build the heading: "Slide N" with title hint for better classification
            $heading = "Slide {$slideNumber}";

            $sections[] = [
                'heading' => $heading,
                'level' => 1,
                'content' => trim($slideText),
                'type' => !empty($slideTables) ? 'table' : 'paragraph',
                'items' => $items,
                'slide_number' => $slideNumber,
                'slide_title' => $effectiveTitle,
                'table_data' => !empty($slideTables) ? $slideTables[0] : null,
            ];
        }

        return [
            'metadata' => [
                'title' => basename($filePath),
                'slide_count' => count($sections),
                'source_file_name' => basename($filePath),
                'source_file_type' => 'pptx',
            ],
            'sections' => $sections,
            'tables' => $tables,
            'raw_text' => trim($rawText),
        ];
    }

    /**
     * Parse PPTX via ZIP extraction (fallback when PhpPresentation not installed).
     * Enhanced to extract structured text per slide with better paragraph splitting.
     */
    protected function parsePptxViaZip(string $filePath): array
    {
        $zip = new \ZipArchive();
        if ($zip->open($filePath) !== true) {
            throw new Exception("Cannot open PPTX file");
        }

        $sections = [];
        $rawText = '';
        $slideIndex = 1;

        while (true) {
            $slideXml = $zip->getFromName("ppt/slides/slide{$slideIndex}.xml");
            if ($slideXml === false) break;

            // Extract text more carefully from XML by preserving paragraph breaks
            $paragraphs = [];
            if (preg_match_all('/<a:p\b[^>]*>(.*?)<\/a:p>/s', $slideXml, $pMatches)) {
                foreach ($pMatches[1] as $pContent) {
                    $pText = strip_tags($pContent);
                    $pText = preg_replace('/\s+/', ' ', $pText);
                    $pText = trim($pText);
                    if ($pText !== '') {
                        $paragraphs[] = $pText;
                    }
                }
            }

            // Fallback: strip all tags
            if (empty($paragraphs)) {
                $text = strip_tags($slideXml);
                $text = preg_replace('/\s+/', ' ', $text);
                $text = trim($text);
                if ($text !== '') {
                    $paragraphs = [$text];
                }
            }

            if (!empty($paragraphs)) {
                $slideText = implode("\n", $paragraphs);
                $slideTitle = $paragraphs[0] ?? '';

                $rawText .= $slideText . "\n\n";
                $sections[] = [
                    'heading' => "Slide {$slideIndex}",
                    'level' => 1,
                    'content' => $slideText,
                    'type' => 'paragraph',
                    'items' => $paragraphs,
                    'slide_number' => $slideIndex,
                    'slide_title' => $slideTitle,
                ];
            }
            $slideIndex++;
        }
        $zip->close();

        return [
            'metadata' => [
                'title' => basename($filePath),
                'slide_count' => $slideIndex - 1,
                'source_file_name' => basename($filePath),
                'source_file_type' => 'pptx',
            ],
            'sections' => $sections,
            'tables' => [],
            'raw_text' => trim($rawText),
        ];
    }

    /**
     * Parse plain text file.
     */
    protected function parseText(string $filePath): array
    {
        $content = file_get_contents($filePath);
        if ($content === false) throw new Exception("Cannot read text file");

        $sections = $this->splitTextIntoSections($content);

        return [
            'metadata' => [
                'title' => basename($filePath, '.txt'),
                'char_count' => strlen($content),
            ],
            'sections' => $sections,
            'tables' => $this->detectTablesInText($content),
            'raw_text' => trim($content),
        ];
    }

    // ========================================
    // Helper Methods
    // ========================================

    protected function extractPdfMetadata($pdf): array
    {
        $details = $pdf->getDetails();
        return [
            'title' => $details['Title'] ?? basename('document'),
            'author' => $details['Author'] ?? null,
            'creator' => $details['Creator'] ?? null,
            'creation_date' => $details['CreationDate'] ?? null,
            'page_count' => count($pdf->getPages()),
        ];
    }

    protected function extractDocxMetadata($phpWord): array
    {
        $info = $phpWord->getDocInfo();
        return [
            'title' => $info->getTitle() ?: 'Document',
            'creator' => $info->getCreator(),
            'company' => $info->getCompany(),
            'description' => $info->getDescription(),
            'created' => $info->getCreated(),
            'modified' => $info->getModified(),
        ];
    }

    protected function extractTextRunContent($textRun): string
    {
        $text = '';
        foreach ($textRun->getElements() as $el) {
            if (method_exists($el, 'getText')) {
                $text .= $el->getText();
            }
        }
        return trim($text);
    }

    protected function extractListItemContent($listItem): string
    {
        $text = '';
        foreach ($listItem->getElements() as $el) {
            if (method_exists($el, 'getText')) {
                $text .= $el->getText();
            }
        }
        return trim($text);
    }

    protected function isLikelyHeading($element, string $text): bool
    {
        if (strlen($text) > 150) return false;
        if (strlen($text) < 2) return false;

        // Check for heading style
        if ($element instanceof \PhpOffice\PhpWord\Element\TextRun) {
            foreach ($element->getElements() as $el) {
                if (method_exists($el, 'getFontStyle')) {
                    $font = $el->getFontStyle();
                    if ($font && method_exists($font, 'isBold') && $font->isBold()) {
                        return true;
                    }
                    if ($font && method_exists($font, 'getSize') && $font->getSize() >= 14) {
                        return true;
                    }
                }
            }
        }

        // Check patterns: ALL CAPS, ends with colon, numbered heading
        if (preg_match('/^[A-Z][A-Z\s\d\-\/&]{3,}$/', $text)) return true;
        if (preg_match('/^\d+[\.\)]\s+\w/', $text) && strlen($text) < 80) return true;

        return false;
    }

    protected function detectHeadingLevel($element): int
    {
        if ($element instanceof \PhpOffice\PhpWord\Element\TextRun) {
            foreach ($element->getElements() as $el) {
                if (method_exists($el, 'getFontStyle')) {
                    $font = $el->getFontStyle();
                    if ($font && method_exists($font, 'getSize')) {
                        $size = $font->getSize();
                        if ($size >= 20) return 1;
                        if ($size >= 16) return 2;
                        if ($size >= 14) return 3;
                    }
                }
            }
        }
        return 2;
    }

    protected function isBulletPoint(string $text): bool
    {
        $text = trim($text);
        return (bool) preg_match('/^[\-\*\•\→\►\‣\⁃\◦\●\○]\s/', $text)
            || (bool) preg_match('/^\d+[\.\)]\s/', $text)
            || (bool) preg_match('/^[a-z][\.\)]\s/i', $text);
    }

    protected function cleanBulletText(string $text): string
    {
        $text = trim($text);
        $text = preg_replace('/^[\-\*\•\→\►\‣\⁃\◦\●\○]\s*/', '', $text);
        $text = preg_replace('/^\d+[\.\)]\s*/', '', $text);
        $text = preg_replace('/^[a-z][\.\)]\s*/i', '', $text);
        return trim($text);
    }

    /**
     * Split raw text into sections based on headings and formatting.
     */
    protected function splitTextIntoSections(string $text): array
    {
        $lines = explode("\n", $text);
        $sections = [];
        $currentSection = null;

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '') {
                if ($currentSection !== null) {
                    $currentSection['content'] .= "\n";
                }
                continue;
            }

            // Detect headings
            $isHeading = false;
            $headingLevel = 2;

            // ALL CAPS line (likely heading)
            if (preg_match('/^[A-Z][A-Z\s\d\-\/&\(\):]{3,}$/', $trimmed) && strlen($trimmed) < 100) {
                $isHeading = true;
                $headingLevel = 1;
            }
            // Numbered heading: "1. Title" or "1) Title"
            elseif (preg_match('/^(\d+)[\.\)]\s+(.+)$/', $trimmed, $m) && strlen($trimmed) < 100) {
                $isHeading = true;
                $headingLevel = 2;
            }
            // Line ending with colon that's relatively short (likely heading)
            elseif (preg_match('/^[A-Z][\w\s\-\/&]+:\s*$/', $trimmed) && strlen($trimmed) < 80) {
                $isHeading = true;
                $headingLevel = 2;
                $trimmed = rtrim($trimmed, ': ');
            }
            // Underlined heading (previous line is ===== or -----)
            elseif (preg_match('/^[=\-]{3,}$/', $trimmed)) {
                continue; // Skip the underline
            }

            if ($isHeading) {
                if ($currentSection !== null) {
                    $currentSection['content'] = trim($currentSection['content']);
                    $sections[] = $currentSection;
                }
                $currentSection = [
                    'heading' => $trimmed,
                    'level' => $headingLevel,
                    'content' => '',
                    'type' => 'heading',
                    'items' => [],
                ];
            } else {
                if ($currentSection === null) {
                    $currentSection = [
                        'heading' => 'Document Content',
                        'level' => 0,
                        'content' => '',
                        'type' => 'paragraph',
                        'items' => [],
                    ];
                }
                $currentSection['content'] .= $trimmed . "\n";

                if ($this->isBulletPoint($trimmed)) {
                    $currentSection['items'][] = $this->cleanBulletText($trimmed);
                    $currentSection['type'] = 'bullet_list';
                }
            }
        }

        if ($currentSection !== null) {
            $currentSection['content'] = trim($currentSection['content']);
            $sections[] = $currentSection;
        }

        return $sections;
    }

    /**
     * Detect table-like structures in plain text.
     */
    protected function detectTablesInText(string $text): array
    {
        $tables = [];
        $lines = explode("\n", $text);
        $currentTable = null;

        foreach ($lines as $line) {
            $trimmed = trim($line);

            // Detect pipe-separated tables
            if (substr_count($trimmed, '|') >= 2) {
                $cells = array_map('trim', explode('|', $trimmed));
                $cells = array_filter($cells, fn($c) => $c !== '' && !preg_match('/^[-=]+$/', $c));

                if (count($cells) >= 2) {
                    if ($currentTable === null) {
                        $currentTable = ['headers' => array_values($cells), 'rows' => []];
                    } else {
                        $row = [];
                        foreach ($currentTable['headers'] as $i => $h) {
                            $row[$h] = $cells[$i] ?? '';
                        }
                        $currentTable['rows'][] = $row;
                    }
                    continue;
                }
            }

            // Detect tab-separated tables
            if (substr_count($trimmed, "\t") >= 2) {
                $cells = array_map('trim', explode("\t", $trimmed));
                if (count($cells) >= 2) {
                    if ($currentTable === null) {
                        $currentTable = ['headers' => $cells, 'rows' => []];
                    } else {
                        $row = [];
                        foreach ($currentTable['headers'] as $i => $h) {
                            $row[$h] = $cells[$i] ?? '';
                        }
                        $currentTable['rows'][] = $row;
                    }
                    continue;
                }
            }

            // Non-table line: save current table if exists
            if ($currentTable !== null && !empty($currentTable['rows'])) {
                $tables[] = $currentTable;
            }
            $currentTable = null;
        }

        if ($currentTable !== null && !empty($currentTable['rows'])) {
            $tables[] = $currentTable;
        }

        return $tables;
    }

    protected function extractWordTable($table): array
    {
        $rows = [];
        $headers = [];

        foreach ($table->getRows() as $rowIdx => $row) {
            $cells = [];
            foreach ($row->getCells() as $cell) {
                $cellText = '';
                foreach ($cell->getElements() as $el) {
                    if ($el instanceof \PhpOffice\PhpWord\Element\TextRun) {
                        $cellText .= $this->extractTextRunContent($el);
                    } elseif ($el instanceof \PhpOffice\PhpWord\Element\Text) {
                        $cellText .= $el->getText();
                    }
                }
                $cells[] = trim($cellText);
            }

            if ($rowIdx === 0) {
                $headers = $cells;
            } else {
                $mappedRow = [];
                foreach ($headers as $i => $h) {
                    $key = $h ?: "col_{$i}";
                    $mappedRow[$key] = $cells[$i] ?? '';
                }
                $rows[] = $mappedRow;
            }
        }

        return ['headers' => $headers, 'rows' => $rows];
    }

    protected function tableToText(array $tableData): string
    {
        $text = implode(' | ', $tableData['headers'] ?? []) . "\n";
        foreach ($tableData['rows'] ?? [] as $row) {
            $text .= implode(' | ', array_values($row)) . "\n";
        }
        return $text;
    }

    protected function detectIfTabular(array $data): bool
    {
        if (count($data) < 2) return false;

        $firstRow = reset($data);
        if (!$firstRow) return false;

        $firstRowValues = array_filter(array_map('trim', $firstRow), fn($v) => $v !== '' && $v !== null);
        if (count($firstRowValues) < 2) return false;

        // Check if first row looks like headers (shorter text, no numbers only)
        $looksLikeHeaders = true;
        foreach ($firstRowValues as $v) {
            if (is_numeric($v) && strlen($v) < 6) {
                $looksLikeHeaders = false;
                break;
            }
        }

        // Check consistency of column count
        $colCounts = [];
        foreach (array_slice($data, 0, 10) as $row) {
            $nonEmpty = count(array_filter($row, fn($v) => $v !== null && trim((string)$v) !== ''));
            if ($nonEmpty > 0) $colCounts[] = $nonEmpty;
        }

        if (empty($colCounts)) return false;
        $avgCols = array_sum($colCounts) / count($colCounts);

        return $looksLikeHeaders && $avgCols >= 2;
    }
}
