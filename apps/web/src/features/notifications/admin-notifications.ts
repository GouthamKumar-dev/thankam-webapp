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

export function deduplicateNotifications(items: AdminNotificationItem[]): AdminNotificationItem[] {
  const result: AdminNotificationItem[] = [];
  for (const item of items) {
    const isDup = result.some((existing) => {
      const sameTitle = existing.title === item.title;
      const sameQuote =
        (item.quotationNumber && existing.quotationNumber === item.quotationNumber) ||
        (item.quotationId && existing.quotationId === item.quotationId);
      const timeDiff = Math.abs(
        new Date(existing.createdAt).getTime() - new Date(item.createdAt).getTime(),
      );
      return sameTitle && (sameQuote || !item.quotationNumber) && timeDiff < 45000;
    });
    if (!isDup) {
      result.push(item);
    }
  }
  return result;
}

export function readAdminNotifications() {
  if (typeof window === 'undefined') return [] as AdminNotificationItem[];
  const raw = localStorage.getItem(ADMIN_NOTIFICATIONS_KEY);
  if (!raw) return [] as AdminNotificationItem[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as AdminNotificationItem[];
    const mapped = parsed
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
      }));
    return deduplicateNotifications(mapped).slice(0, 100);
  } catch {
    return [] as AdminNotificationItem[];
  }
}

export function writeAdminNotifications(items: AdminNotificationItem[]) {
  if (typeof window === 'undefined') return;
  const deduped = deduplicateNotifications(items);
  localStorage.setItem(ADMIN_NOTIFICATIONS_KEY, JSON.stringify(deduped.slice(0, 100)));
}
