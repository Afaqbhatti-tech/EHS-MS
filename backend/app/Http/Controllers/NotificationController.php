<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * GET /api/notifications
     * List notifications for the authenticated user (paginated).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $filter = $request->query('filter', 'all'); // all | unread
        $limit = min(50, max(1, (int) $request->query('limit', 20)));

        $query = Notification::forUser($user->id)
            ->orderByDesc('created_at');

        if ($filter === 'unread') {
            $query->unread();
        }

        $notifications = $query->limit($limit)->get();

        $unreadCount = Notification::forUser($user->id)->unread()->count();

        return response()->json([
            'notifications' => $notifications->map(fn (Notification $n) => [
                'id' => $n->id,
                'type' => $n->type,
                'title' => $n->title,
                'body' => $n->body,
                'icon' => $n->icon,
                'severity' => $n->severity,
                'link' => $n->link,
                'refModule' => $n->ref_module,
                'refId' => $n->ref_id,
                'readAt' => $n->read_at?->toISOString(),
                'createdAt' => $n->created_at->toISOString(),
                'timeAgo' => $n->created_at->diffForHumans(),
            ]),
            'unreadCount' => $unreadCount,
        ]);
    }

    /**
     * GET /api/notifications/unread-count
     * Quick count endpoint for the badge.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $count = Notification::forUser($request->user()->id)->unread()->count();

        return response()->json(['unreadCount' => $count]);
    }

    /**
     * PATCH /api/notifications/{id}/read
     * Mark a single notification as read.
     */
    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = Notification::forUser($request->user()->id)->findOrFail($id);

        if (!$notification->read_at) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json(['message' => 'Marked as read.']);
    }

    /**
     * PATCH /api/notifications/read-all
     * Mark all notifications as read for the user.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        Notification::forUser($request->user()->id)
            ->unread()
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    /**
     * DELETE /api/notifications/{id}
     * Delete a single notification.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $notification = Notification::forUser($request->user()->id)->findOrFail($id);
        $notification->delete();

        return response()->json(['message' => 'Notification deleted.']);
    }
}
