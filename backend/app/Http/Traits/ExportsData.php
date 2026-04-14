<?php

namespace App\Http\Traits;

use Illuminate\Http\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Font;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\IOFactory as WordIOFactory;
use PhpOffice\PhpWord\SimpleType\TblWidth;
use PhpOffice\PhpPresentation\PhpPresentation;
use PhpOffice\PhpPresentation\IOFactory as PptIOFactory;
use PhpOffice\PhpPresentation\Style\Color as PptColor;
use PhpOffice\PhpPresentation\Style\Alignment as PptAlignment;
use PhpOffice\PhpPresentation\Style\Fill as PptFill;
use PhpOffice\PhpPresentation\Style\Border as PptBorder;
use Barryvdh\DomPDF\Facade\Pdf;

trait ExportsData
{
    /**
     * Export data in the requested format.
     *
     * @param array $headers Column headers
     * @param array $rows    Array of row arrays
     * @param string $title  Export title / filename prefix
     * @param string $format csv|xlsx|pdf|docx
     */
    protected function exportAs(array $headers, array $rows, string $title, string $format = 'csv')
    {
        $filename = strtolower(str_replace(' ', '_', $title)) . '_' . now()->format('Y-m-d');

        return match ($format) {
            'xlsx'  => $this->exportExcel($headers, $rows, $title, $filename),
            'pdf'   => $this->exportPdf($headers, $rows, $title, $filename),
            'docx'  => $this->exportWord($headers, $rows, $title, $filename),
            'pptx'  => $this->exportPptx($headers, $rows, $title, $filename),
            'json'  => $this->exportJson($headers, $rows, $title, $filename),
            default => $this->exportCsv($headers, $rows, $filename),
        };
    }

    protected function exportCsv(array $headers, array $rows, string $filename)
    {
        $callback = function () use ($headers, $rows) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $headers);
            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }
            fclose($handle);
        };

        return response()->stream($callback, 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}.csv\"",
        ]);
    }

    protected function exportExcel(array $headers, array $rows, string $title, string $filename)
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle(substr($title, 0, 31));

        // Header row
        foreach ($headers as $col => $header) {
            $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col + 1);
            $sheet->getCell($colLetter . '1')->setValue($header);
        }

        // Style header
        $lastCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($headers));
        $headerRange = "A1:{$lastCol}1";
        $sheet->getStyle($headerRange)->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4F46E5']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders' => ['bottom' => ['borderStyle' => Border::BORDER_THIN]],
        ]);

        // Data rows
        foreach ($rows as $rowIdx => $row) {
            foreach ($row as $col => $value) {
                $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col + 1);
                $sheet->getCell($colLetter . ($rowIdx + 2))->setValue($value);
            }
            // Alternate row colors
            if ($rowIdx % 2 === 1) {
                $dataRange = "A" . ($rowIdx + 2) . ":{$lastCol}" . ($rowIdx + 2);
                $sheet->getStyle($dataRange)->getFill()
                    ->setFillType(Fill::FILL_SOLID)
                    ->getStartColor()->setRGB('F3F4F6');
            }
        }

        // Auto-size columns
        foreach (range(1, count($headers)) as $col) {
            $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col);
            $sheet->getColumnDimension($colLetter)->setAutoSize(true);
        }

        // Auto-filter
        $sheet->setAutoFilter($headerRange);

        $writer = new Xlsx($spreadsheet);
        $temp = tempnam(sys_get_temp_dir(), 'export_');
        $writer->save($temp);

        return response()->download($temp, "{$filename}.xlsx", [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    protected function exportPdf(array $headers, array $rows, string $title, string $filename)
    {
        $html = $this->buildHtmlTable($headers, $rows, $title);

        $pdf = Pdf::loadHTML($html)
            ->setPaper('a4', 'landscape')
            ->setOptions([
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => false,
                'defaultFont' => 'sans-serif',
            ]);

        return $pdf->download("{$filename}.pdf");
    }

    protected function exportWord(array $headers, array $rows, string $title, string $filename)
    {
        $phpWord = new PhpWord();
        $phpWord->setDefaultFontName('Calibri');
        $phpWord->setDefaultFontSize(10);

        $section = $phpWord->addSection(['orientation' => 'landscape']);

        // Title
        $section->addText($title, ['bold' => true, 'size' => 16, 'color' => '4F46E5']);
        $section->addText('Generated: ' . now()->format('F j, Y g:i A'), ['size' => 9, 'color' => '6B7280']);
        $section->addTextBreak(1);

        // Table
        $tableStyle = [
            'borderSize' => 4,
            'borderColor' => 'D1D5DB',
            'cellMargin' => 60,
        ];
        $phpWord->addTableStyle('exportTable', $tableStyle);
        $table = $section->addTable('exportTable');

        // Header row
        $table->addRow(null, ['tblHeader' => true]);
        $headerStyle = ['bold' => true, 'color' => 'FFFFFF', 'size' => 9];
        $headerCellStyle = ['bgColor' => '4F46E5', 'valign' => 'center'];
        foreach ($headers as $header) {
            $table->addCell(null, $headerCellStyle)->addText($header, $headerStyle);
        }

        // Data rows
        $cellStyle = ['valign' => 'center'];
        $altCellStyle = ['valign' => 'center', 'bgColor' => 'F3F4F6'];
        $textStyle = ['size' => 9];
        foreach ($rows as $idx => $row) {
            $table->addRow();
            $style = $idx % 2 === 1 ? $altCellStyle : $cellStyle;
            foreach ($row as $value) {
                $table->addCell(null, $style)->addText((string) ($value ?? ''), $textStyle);
            }
        }

        $temp = tempnam(sys_get_temp_dir(), 'export_') . '.docx';
        $writer = WordIOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($temp);

        return response()->download($temp, "{$filename}.docx", [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ])->deleteFileAfterSend(true);
    }

    protected function exportPptx(array $headers, array $rows, string $title, string $filename)
    {
        $ppt = new PhpPresentation();
        $ppt->getDocumentProperties()
            ->setCreator('EHS·OS')
            ->setTitle($title)
            ->setDescription("Export: {$title}");

        // Remove default blank slide
        $ppt->removeSlideByIndex(0);

        // ── Title Slide ─────────────────────────────────────
        $titleSlide = $ppt->createSlide();
        $shape = $titleSlide->createRichTextShape()
            ->setHeight(200)->setWidth(800)
            ->setOffsetX(90)->setOffsetY(200);
        $shape->getActiveParagraph()->getAlignment()
            ->setHorizontal(PptAlignment::HORIZONTAL_LEFT);
        $textRun = $shape->createTextRun($title);
        $textRun->getFont()->setBold(true)->setSize(28)
            ->setColor(new PptColor('FF4F46E5'));

        $metaShape = $titleSlide->createRichTextShape()
            ->setHeight(60)->setWidth(800)
            ->setOffsetX(90)->setOffsetY(410);
        $metaRun = $metaShape->createTextRun('Generated: ' . now()->format('F j, Y g:i A') . '  |  Records: ' . count($rows));
        $metaRun->getFont()->setSize(12)->setColor(new PptColor('FF6B7280'));

        // ── Data Slides (12 rows per slide) ─────────────────
        $rowsPerSlide = 12;
        $chunks = array_chunk($rows, $rowsPerSlide);
        $colCount = count($headers);
        $slideWidth = 900;
        $colWidth = $colCount > 0 ? intval($slideWidth / $colCount) : 100;
        $rowHeight = 22;
        $headerHeight = 28;
        $tableOffsetX = 20;
        $tableOffsetY = 50;

        foreach ($chunks as $chunkIdx => $chunk) {
            $slide = $ppt->createSlide();

            // Slide subtitle
            $pageLabel = $slide->createRichTextShape()
                ->setHeight(30)->setWidth(400)
                ->setOffsetX($tableOffsetX)->setOffsetY(12);
            $pageRun = $pageLabel->createTextRun($title . ' — Page ' . ($chunkIdx + 1) . ' of ' . count($chunks));
            $pageRun->getFont()->setSize(10)->setBold(true)->setColor(new PptColor('FF4F46E5'));

            // Build table
            $table = $slide->createTableShape($colCount);
            $table->setHeight($headerHeight + $rowHeight * count($chunk));
            $table->setWidth($slideWidth);
            $table->setOffsetX($tableOffsetX);
            $table->setOffsetY($tableOffsetY);

            // Header row
            $headerRow = $table->createRow();
            $headerRow->setHeight($headerHeight);
            foreach ($headers as $i => $header) {
                $cell = $headerRow->nextCell();
                $cell->setWidth($colWidth);
                $cell->getFill()->setFillType(PptFill::FILL_SOLID)
                    ->setStartColor(new PptColor('FF4F46E5'));
                $cell->getBorders()->getTop()->setLineStyle(PptBorder::LINE_SINGLE)->setColor(new PptColor('FF4338CA'));
                $cell->getBorders()->getBottom()->setLineStyle(PptBorder::LINE_SINGLE)->setColor(new PptColor('FF4338CA'));
                $textRun = $cell->createTextRun($header);
                $textRun->getFont()->setBold(true)->setSize(9)->setColor(new PptColor('FFFFFFFF'));
                $cell->getActiveParagraph()->getAlignment()
                    ->setHorizontal(PptAlignment::HORIZONTAL_CENTER)
                    ->setVertical(PptAlignment::VERTICAL_CENTER);
            }

            // Data rows
            foreach ($chunk as $rowIdx => $row) {
                $dataRow = $table->createRow();
                $dataRow->setHeight($rowHeight);
                $isAlt = $rowIdx % 2 === 1;
                foreach ($row as $colIdx => $value) {
                    $cell = $dataRow->nextCell();
                    $cell->setWidth($colWidth);
                    if ($isAlt) {
                        $cell->getFill()->setFillType(PptFill::FILL_SOLID)
                            ->setStartColor(new PptColor('FFF3F4F6'));
                    }
                    $cell->getBorders()->getBottom()->setLineStyle(PptBorder::LINE_SINGLE)
                        ->setColor(new PptColor('FFE5E7EB'));
                    $textRun = $cell->createTextRun((string) ($value ?? ''));
                    $textRun->getFont()->setSize(8)->setColor(new PptColor('FF1F2937'));
                    $cell->getActiveParagraph()->getAlignment()
                        ->setHorizontal(PptAlignment::HORIZONTAL_LEFT)
                        ->setVertical(PptAlignment::VERTICAL_CENTER);
                }
            }
        }

        $temp = tempnam(sys_get_temp_dir(), 'export_') . '.pptx';
        $writer = PptIOFactory::createWriter($ppt, 'PowerPoint2007');
        $writer->save($temp);

        return response()->download($temp, "{$filename}.pptx", [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ])->deleteFileAfterSend(true);
    }

    protected function exportJson(array $headers, array $rows, string $title, string $filename)
    {
        $data = array_map(function ($row) use ($headers) {
            $record = [];
            foreach ($headers as $i => $header) {
                $key = strtolower(str_replace([' ', '/', '.'], '_', $header));
                $record[$key] = $row[$i] ?? null;
            }
            return $record;
        }, $rows);

        $json = json_encode([
            'title'      => $title,
            'generated'  => now()->toIso8601String(),
            'count'      => count($data),
            'records'    => $data,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return response($json, 200, [
            'Content-Type'        => 'application/json',
            'Content-Disposition' => "attachment; filename=\"{$filename}.json\"",
        ]);
    }

    protected function buildHtmlTable(array $headers, array $rows, string $title): string
    {
        $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>
            body { font-family: sans-serif; font-size: 10px; color: #1f2937; margin: 20px; }
            h1 { font-size: 18px; color: #4F46E5; margin-bottom: 4px; }
            .meta { font-size: 9px; color: #6B7280; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #4F46E5; color: #fff; font-size: 9px; font-weight: 600; padding: 6px 8px; text-align: left; }
            td { padding: 5px 8px; border-bottom: 1px solid #E5E7EB; font-size: 9px; }
            tr:nth-child(even) td { background: #F9FAFB; }
        </style></head><body>';
        $html .= "<h1>{$title}</h1>";
        $html .= '<div class="meta">Generated: ' . now()->format('F j, Y g:i A') . '</div>';
        $html .= '<table><thead><tr>';
        foreach ($headers as $h) {
            $html .= "<th>" . e($h) . "</th>";
        }
        $html .= '</tr></thead><tbody>';
        foreach ($rows as $row) {
            $html .= '<tr>';
            foreach ($row as $val) {
                $html .= '<td>' . e($val ?? '') . '</td>';
            }
            $html .= '</tr>';
        }
        $html .= '</tbody></table></body></html>';
        return $html;
    }
}
