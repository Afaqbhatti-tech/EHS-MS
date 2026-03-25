import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Eye, ClipboardCheck, AlertTriangle, Clock,
  Settings, FileText, BarChart3, Shield,
  Check, CheckCheck, X, Loader2,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../services/api';

// ─── Types ─────────────────────────────────────────
interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  icon: string | null;
  severity: 'info' | 'success' | 'warning' | 'danger';
  link: string | null;
  refModule: string | null;
  refId: string | null;
  readAt: string | null;
  createdAt: string;
  timeAgo: string;
}

interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

// ─── Icon mapping ──────────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
  'eye': Eye,
  'clipboard-check': ClipboardCheck,
  'alert-triangle': AlertTriangle,
  'clock': Clock,
  'settings': Settings,
  'file-text': FileText,
  'bar-chart-3': BarChart3,
  'shield': Shield,
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  info: { bg: 'bg-primary-50', text: 'text-primary-600', dot: 'bg-primary-500' },
  success: { bg: 'bg-success-50', text: 'text-success-600', dot: 'bg-success-500' },
  warning: { bg: 'bg-warning-50', text: 'text-warning-600', dot: 'bg-warning-500' },
  danger: { bg: 'bg-danger-50', text: 'text-danger-600', dot: 'bg-danger-500' },
};

// ─── Component ─────────────────────────────────────
export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch notifications
  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ['notifications', filter],
    queryFn: () => api.get(`/notifications?filter=${filter}&limit=20`),
    refetchInterval: 30_000,
  });

  // Unread count (lightweight poll)
  const { data: countData } = useQuery<{ unreadCount: number }>({
    queryKey: ['notifications-count'],
    queryFn: () => api.get('/notifications/unread-count'),
    refetchInterval: 15_000,
  });

  const unreadCount = countData?.unreadCount ?? data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  // Mark single as read
  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  // Mark all as read
  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  // Delete notification
  const deleteNotification = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  function handleNotificationClick(n: NotificationItem) {
    if (!n.readAt) {
      markRead.mutate(n.id);
    }
    if (n.link) {
      window.location.href = n.link;
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-[var(--radius-sm)] hover:bg-surface-sunken text-text-secondary transition-colors duration-150"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-danger-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="fixed inset-x-0 top-14 sm:top-auto sm:inset-x-auto sm:absolute sm:right-0 sm:top-full sm:mt-2 w-full sm:w-[380px] bg-white sm:rounded-[var(--radius-lg)] shadow-xl border-b sm:border border-border z-50 flex flex-col max-h-[calc(100dvh-3.5rem)] sm:max-h-[520px]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[15px] font-semibold text-text-primary">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-primary-600 hover:text-primary-700 transition-colors disabled:opacity-50"
                >
                  <CheckCheck size={13} />
                  Mark all read
                </button>
              )}
            </div>
            {/* Filter tabs */}
            <div className="flex gap-1 bg-surface-sunken p-0.5 rounded-[var(--radius-sm)]">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 px-3 py-1 text-[11px] font-semibold rounded-[var(--radius-sm)] transition-all ${
                  filter === 'all'
                    ? 'bg-white text-text-primary shadow-xs'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`flex-1 px-3 py-1 text-[11px] font-semibold rounded-[var(--radius-sm)] transition-all ${
                  filter === 'unread'
                    ? 'bg-white text-text-primary shadow-xs'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Unread{unreadCount > 0 && ` (${unreadCount})`}
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-text-tertiary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-12 h-12 rounded-full bg-surface-sunken flex items-center justify-center mb-3">
                  <Bell size={20} className="text-text-tertiary" />
                </div>
                <p className="text-[13px] font-medium text-text-secondary">
                  {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
                </p>
                <p className="text-[11px] text-text-tertiary mt-0.5">
                  {filter === 'unread' ? 'You have no unread notifications.' : 'Notifications will appear here.'}
                </p>
              </div>
            ) : (
              <div>
                {notifications.map((n) => {
                  const style = SEVERITY_STYLES[n.severity] || SEVERITY_STYLES.info;
                  const IconComp = ICON_MAP[n.icon || ''] || Bell;
                  const isUnread = !n.readAt;

                  return (
                    <div
                      key={n.id}
                      className={`group flex gap-3 px-4 py-3 cursor-pointer transition-colors duration-100 border-b border-border/50 last:border-0 ${
                        isUnread ? 'bg-primary-50/30 hover:bg-primary-50/60' : 'hover:bg-surface-sunken'
                      }`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${style.bg}`}>
                        <IconComp size={16} className={style.text} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-[13px] leading-snug ${isUnread ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary'}`}>
                            {n.title}
                          </p>
                          {/* Actions (visible on hover) */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            {isUnread && (
                              <button
                                onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }}
                                className="p-1 rounded hover:bg-primary-100 text-text-tertiary hover:text-primary-600 transition-colors"
                                title="Mark as read"
                              >
                                <Check size={12} />
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteNotification.mutate(n.id); }}
                              className="p-1 rounded hover:bg-danger-50 text-text-tertiary hover:text-danger-600 transition-colors"
                              title="Remove"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                        {n.body && (
                          <p className="text-[12px] text-text-tertiary leading-snug mt-0.5 line-clamp-2">{n.body}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-text-tertiary uppercase tracking-tight">{n.timeAgo}</span>
                          {isUnread && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border shrink-0">
              <button
                onClick={() => setOpen(false)}
                className="w-full text-center text-[11px] font-bold text-primary-600 hover:text-primary-700 uppercase tracking-widest transition-colors"
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
