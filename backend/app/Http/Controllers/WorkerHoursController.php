<?php

namespace App\Http\Controllers;

use App\Models\Worker;
use App\Models\WorkerDailyHours;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WorkerHoursController extends Controller
{
    public function index(Request $request, string $workerId): JsonResponse
    {
        $worker = Worker::findOrFail($workerId);
        $query = WorkerDailyHours::where('worker_id', $worker->id);

        if ($from = $request->get('date_from')) $query->whereDate('work_date', '>=', $from);
        if ($to = $request->get('date_to')) $query->whereDate('work_date', '<=', $to);

        if ($period = $request->get('period')) {
            match ($period) {
                'week' => $query->whereBetween('work_date', [now()->startOfWeek()->toDateString(), now()->endOfWeek()->toDateString()]),
                'month' => $query->whereMonth('work_date', now()->month)->whereYear('work_date', now()->year),
                'last_month' => $query->whereMonth('work_date', now()->subMonth()->month)->whereYear('work_date', now()->subMonth()->year),
                default => null,
            };
        }

        $hours = $query->orderBy('work_date', 'desc')->paginate(31);

        $summaryQuery = WorkerDailyHours::where('worker_id', $worker->id);
        if ($from = $request->get('date_from')) $summaryQuery->whereDate('work_date', '>=', $from);
        if ($to = $request->get('date_to')) $summaryQuery->whereDate('work_date', '<=', $to);
        if ($period = $request->get('period')) {
            match ($period) {
                'week' => $summaryQuery->whereBetween('work_date', [now()->startOfWeek()->toDateString(), now()->endOfWeek()->toDateString()]),
                'month' => $summaryQuery->whereMonth('work_date', now()->month)->whereYear('work_date', now()->year),
                'last_month' => $summaryQuery->whereMonth('work_date', now()->subMonth()->month)->whereYear('work_date', now()->subMonth()->year),
                default => null,
            };
        }

        $summary = $summaryQuery->selectRaw("
            COALESCE(SUM(hours_worked), 0) as total_regular,
            COALESCE(SUM(overtime_hours), 0) as total_overtime,
            COUNT(*) as days_recorded,
            SUM(attendance_status = 'Present') as days_present
        ")->first();

        return response()->json([
            'hours' => $hours,
            'summary' => [
                'total_regular' => round((float) ($summary->total_regular ?? 0), 2),
                'total_overtime' => round((float) ($summary->total_overtime ?? 0), 2),
                'days_recorded' => (int) ($summary->days_recorded ?? 0),
                'days_present' => (int) ($summary->days_present ?? 0),
            ],
        ]);
    }

    public function store(Request $request, string $workerId): JsonResponse
    {
        $worker = Worker::findOrFail($workerId);

        $validated = $request->validate([
            'work_date' => 'required|date',
            'shift' => 'required|in:Day,Night,Split',
            'hours_worked' => 'required|numeric|min:0|max:24',
            'overtime_hours' => 'nullable|numeric|min:0|max:12',
            'attendance_status' => 'required|in:Present,Absent,Half Day,Leave,Holiday,Off',
            'site_area' => 'nullable|string|max:150',
            'notes' => 'nullable|string',
        ]);

        $record = WorkerDailyHours::firstOrNew(
            ['worker_id' => $worker->id, 'work_date' => $validated['work_date']]
        );

        if (!$record->exists) {
            $record->id = Str::uuid()->toString();
        }

        $record->fill(array_merge($validated, [
            'worker_id' => $worker->id,
            'recorded_by' => $request->user()?->id,
        ]));
        $record->save();

        return response()->json([
            'message' => 'Hours recorded successfully',
            'record' => $record,
        ], 201);
    }

    public function update(Request $request, string $workerId, string $recordId): JsonResponse
    {
        Worker::findOrFail($workerId);
        $record = WorkerDailyHours::where('id', $recordId)->where('worker_id', $workerId)->firstOrFail();

        $validated = $request->validate([
            'hours_worked' => 'sometimes|numeric|min:0|max:24',
            'overtime_hours' => 'nullable|numeric|min:0|max:12',
            'attendance_status' => 'sometimes|in:Present,Absent,Half Day,Leave,Holiday,Off',
            'shift' => 'sometimes|in:Day,Night,Split',
            'site_area' => 'nullable|string|max:150',
            'notes' => 'nullable|string',
        ]);

        $record->update($validated);

        return response()->json([
            'message' => 'Hours updated',
            'record' => $record->fresh(),
        ]);
    }

    public function destroy(string $workerId, string $recordId): JsonResponse
    {
        Worker::findOrFail($workerId);
        $record = WorkerDailyHours::where('id', $recordId)->where('worker_id', $workerId)->firstOrFail();
        $record->delete();
        return response()->json(['message' => 'Record deleted']);
    }

    public function bulkStore(Request $request): JsonResponse
    {
        $request->validate([
            'work_date' => 'required|date',
            'shift' => 'required|in:Day,Night,Split',
            'records' => 'required|array|min:1',
            'records.*.worker_id' => 'required|exists:workers,id',
            'records.*.hours_worked' => 'required|numeric|min:0|max:24',
            'records.*.overtime_hours' => 'nullable|numeric|min:0',
            'records.*.attendance_status' => 'required|in:Present,Absent,Half Day,Leave,Holiday,Off',
            'records.*.site_area' => 'nullable|string',
        ]);

        $saved = 0;
        $errors = [];

        DB::transaction(function () use ($request, &$saved, &$errors) {
            foreach ($request->records as $rec) {
                try {
                    $record = WorkerDailyHours::firstOrNew(
                        ['worker_id' => $rec['worker_id'], 'work_date' => $request->work_date]
                    );

                    if (!$record->exists) {
                        $record->id = Str::uuid()->toString();
                    }

                    $record->fill(array_merge($rec, [
                        'work_date' => $request->work_date,
                        'shift' => $request->shift,
                        'recorded_by' => $request->user()?->id,
                    ]));
                    $record->save();
                    $saved++;
                } catch (\Exception $e) {
                    $errors[] = ['worker_id' => $rec['worker_id'], 'error' => $e->getMessage()];
                }
            }
        });

        return response()->json([
            'message' => "{$saved} records saved",
            'saved' => $saved,
            'errors' => $errors,
        ]);
    }

    public function summary(Request $request): JsonResponse
    {
        $from = $request->get('date_from', now()->startOfMonth()->toDateString());
        $to = $request->get('date_to', now()->toDateString());

        $summary = DB::selectOne("
            SELECT
                COALESCE(SUM(hours_worked), 0) as total_regular_hours,
                COALESCE(SUM(overtime_hours), 0) as total_overtime_hours,
                COALESCE(SUM(hours_worked + overtime_hours), 0) as total_hours,
                COUNT(DISTINCT worker_id) as workers_with_records,
                COUNT(*) as total_entries,
                SUM(attendance_status = 'Present') as present_count,
                SUM(attendance_status = 'Absent') as absent_count
            FROM worker_daily_hours
            WHERE work_date BETWEEN ? AND ?
        ", [$from, $to]);

        $dailyTotals = DB::select("
            SELECT work_date,
                   SUM(hours_worked) as regular_hours,
                   SUM(overtime_hours) as overtime_hours,
                   COUNT(DISTINCT worker_id) as worker_count
            FROM worker_daily_hours
            WHERE work_date BETWEEN ? AND ?
            GROUP BY work_date ORDER BY work_date
        ", [$from, $to]);

        return response()->json([
            'summary' => [
                'total_regular_hours' => round((float) ($summary->total_regular_hours ?? 0), 2),
                'total_overtime_hours' => round((float) ($summary->total_overtime_hours ?? 0), 2),
                'total_hours' => round((float) ($summary->total_hours ?? 0), 2),
                'workers_with_records' => (int) ($summary->workers_with_records ?? 0),
                'total_entries' => (int) ($summary->total_entries ?? 0),
                'present_count' => (int) ($summary->present_count ?? 0),
                'absent_count' => (int) ($summary->absent_count ?? 0),
            ],
            'dailyTotals' => array_map(fn ($r) => [
                'work_date' => $r->work_date,
                'regular_hours' => round((float) $r->regular_hours, 2),
                'overtime_hours' => round((float) $r->overtime_hours, 2),
                'worker_count' => (int) $r->worker_count,
            ], $dailyTotals),
            'from' => $from,
            'to' => $to,
        ]);
    }
}
