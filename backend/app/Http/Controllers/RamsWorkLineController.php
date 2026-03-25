<?php

namespace App\Http\Controllers;

use App\Models\WorkLine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RamsWorkLineController extends Controller
{
    /**
     * GET /api/rams/work-lines
     * Board view: all active work lines with document counts by status.
     */
    public function index(): JsonResponse
    {
        $lines = WorkLine::where('is_active', true)
            ->orderBy('sort_order')
            ->withCount('ramsDocuments')
            ->get()
            ->map(function ($line) {
                // Get status counts for this work line
                $statusCounts = $line->ramsDocuments()
                    ->selectRaw('status, count(*) as count')
                    ->groupBy('status')
                    ->pluck('count', 'status')
                    ->toArray();

                return [
                    'id' => $line->id,
                    'name' => $line->name,
                    'slug' => $line->slug,
                    'description' => $line->description,
                    'color' => $line->color,
                    'sort_order' => $line->sort_order,
                    'total_documents' => $line->rams_documents_count,
                    'status_counts' => $statusCounts,
                ];
            });

        return response()->json($lines);
    }

    /**
     * GET /api/rams/work-lines/{slug}
     * Single work line with its documents.
     */
    public function show(string $slug): JsonResponse
    {
        $line = WorkLine::where('slug', $slug)->where('is_active', true)->firstOrFail();

        $documents = $line->ramsDocuments()
            ->with(['submitter:id,full_name', 'approver:id,full_name', 'latestVersion'])
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn ($doc) => $this->formatDocument($doc));

        return response()->json([
            'work_line' => [
                'id' => $line->id,
                'name' => $line->name,
                'slug' => $line->slug,
                'description' => $line->description,
                'color' => $line->color,
            ],
            'documents' => $documents,
        ]);
    }

    /**
     * POST /api/rams/work-lines  (master only)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'color' => 'nullable|string|max:7',
        ]);

        $slug = Str::slug($validated['name']);
        if (WorkLine::where('slug', $slug)->exists()) {
            return response()->json(['message' => 'A work line with this name already exists.'], 422);
        }

        $maxOrder = WorkLine::max('sort_order') ?? 0;

        $line = WorkLine::create([
            'id' => (string) Str::uuid(),
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? '#3b82f6',
            'sort_order' => $maxOrder + 1,
            'is_active' => true,
        ]);

        return response()->json($line, 201);
    }

    /**
     * PUT /api/rams/work-lines/{slug}  (master only)
     */
    public function update(Request $request, string $slug): JsonResponse
    {
        $line = WorkLine::where('slug', $slug)->firstOrFail();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:150',
            'description' => 'nullable|string',
            'color' => 'nullable|string|max:7',
            'is_active' => 'sometimes|boolean',
        ]);

        if (isset($validated['name']) && $validated['name'] !== $line->name) {
            $newSlug = Str::slug($validated['name']);
            if (WorkLine::where('slug', $newSlug)->where('id', '!=', $line->id)->exists()) {
                return response()->json(['message' => 'A work line with this name already exists.'], 422);
            }
            $validated['slug'] = $newSlug;
        }

        $line->update($validated);

        return response()->json($line);
    }

    private function formatDocument($doc): array
    {
        return [
            'id' => $doc->id,
            'ref_number' => $doc->ref_number,
            'title' => $doc->title,
            'description' => $doc->description,
            'contractor' => $doc->contractor,
            'zone' => $doc->zone,
            'status' => $doc->status,
            'current_version' => $doc->current_version,
            'due_date' => $doc->due_date?->format('Y-m-d'),
            'tags' => $doc->tags,
            'submitted_by' => $doc->submitter ? [
                'id' => $doc->submitter->id,
                'name' => $doc->submitter->full_name,
            ] : null,
            'approved_by' => $doc->approver ? [
                'id' => $doc->approver->id,
                'name' => $doc->approver->full_name,
            ] : null,
            'approved_at' => $doc->approved_at?->toISOString(),
            'latest_version' => $doc->latestVersion ? [
                'id' => $doc->latestVersion->id,
                'version_number' => $doc->latestVersion->version_number,
                'file_name' => $doc->latestVersion->file_name,
                'file_size' => $doc->latestVersion->file_size,
                'uploaded_at' => $doc->latestVersion->created_at->toISOString(),
            ] : null,
            'created_at' => $doc->created_at->toISOString(),
            'updated_at' => $doc->updated_at->toISOString(),
        ];
    }
}
