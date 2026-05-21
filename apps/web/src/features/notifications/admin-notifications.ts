export const ADMIN_NOTIFICATIONS_KEY = 'admin_workflow_notifications';

export type AdminNotificationItem = {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string;
  quotationId?: string;
  quotationNumber?: string;
  read?: boolean;
};

export function readAdminNotifications() {
  if (typeof window === 'undefined') return [] as AdminNotificationItem[];
  const raw = localStorage.getItem(ADMIN_NOTIFICATIONS_KEY);
  if (!raw) return [] as AdminNotificationItem[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as AdminNotificationItem[];
    return parsed
      .filter((item) => item && typeof item.id === 'string')
      .map((item) => ({
        id: String(item.id),
        title: String(item.title ?? ''),
        subtitle: String(item.subtitle ?? ''),
        createdAt:
          typeof item.createdAt === 'string'
            ? item.createdAt
            : new Date().toISOString(),
        quotationId:
          typeof item.quotationId === 'string' ? item.quotationId : undefined,
        quotationNumber:
          typeof item.quotationNumber === 'string'
            ? item.quotationNumber
            : undefined,
        read: Boolean(item.read),
      }))
      .slice(0, 100);
  } catch {
    return [] as AdminNotificationItem[];
  }
}

export function writeAdminNotifications(items: AdminNotificationItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ADMIN_NOTIFICATIONS_KEY, JSON.stringify(items.slice(0, 100)));
}
