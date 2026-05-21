import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, Clock3, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/layouts/page-shell';
import {
  AdminNotificationItem,
  readAdminNotifications,
  writeAdminNotifications,
} from '@/features/notifications/admin-notifications';

export function AdminNotificationsPage() {
  const [items, setItems] = useState<AdminNotificationItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(readAdminNotifications());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.read).length,
    [items],
  );

  const markAllRead = () => {
    const next = items.map((item) => ({ ...item, read: true }));
    setItems(next);
    writeAdminNotifications(next);
  };

  const clearAll = () => {
    setItems([]);
    writeAdminNotifications([]);
  };

  const markOneRead = (id: string) => {
    const next = items.map((item) =>
      item.id === id ? { ...item, read: true } : item,
    );
    setItems(next);
    writeAdminNotifications(next);
  };

  return (
    <PageShell
      title="Notifications"
      subtitle="Review customer and workflow notification updates"
    >
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2.5">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            {unreadCount} unread
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-8 rounded-xl px-3"
              onClick={markAllRead}
              disabled={items.length === 0 || unreadCount === 0}
            >
              <CheckCheck size={14} className="mr-1.5" />
              Mark all read
            </Button>
            <Button
              variant="outline"
              className="h-8 rounded-xl px-3 text-rose-600 hover:text-rose-700"
              onClick={clearAll}
              disabled={items.length === 0}
            >
              <Trash2 size={14} className="mr-1.5" />
              Clear
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Bell className="mx-auto mb-2 h-7 w-7 text-slate-300" />
            <p className="text-sm text-slate-500">No notifications to review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`w-full rounded-2xl border p-0 text-left shadow-sm transition-shadow hover:shadow-md ${
                  item.read
                    ? 'border-slate-200 bg-white'
                    : 'border-teal-200 bg-teal-50/30 ring-1 ring-teal-100'
                }`}
                onClick={() => markOneRead(item.id)}
              >
                <div
                  className={`flex items-center justify-between gap-3 rounded-t-2xl px-4 py-2.5 ${
                    item.read ? 'bg-slate-50' : 'bg-teal-50'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {item.title}
                  </p>
                  {!item.read ? (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-teal-500" />
                  ) : null}
                </div>
                <div className="space-y-2 px-4 py-3">
                  <p className="text-xs text-slate-600">{item.subtitle}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Clock3 size={12} className="text-slate-400" />
                    {new Date(item.createdAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </PageShell>
  );
}
