export type UiRequestStatus =
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'DECLINED';

const REQUEST_STATUS_LABELS: Record<UiRequestStatus, string> = {
  REQUESTED: 'Requested',
  UNDER_REVIEW: 'Under Review',
  QUOTED: 'Quoted',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
};

export function toUiRequestStatus(status?: string | null): UiRequestStatus {
  const normalized = (status ?? 'NEW').toUpperCase();
  if (normalized === 'NEW' || normalized === 'OTP_VERIFIED') return 'REQUESTED';
  if (normalized === 'CONTACTED') return 'UNDER_REVIEW';
  if (normalized === 'QUOTED') return 'QUOTED';
  if (normalized === 'CONVERTED') return 'ACCEPTED';
  if (normalized === 'CLOSED_REJECTED') return 'DECLINED';
  return 'REQUESTED';
}

export function requestStatusLabel(status?: string | null): string {
  return REQUEST_STATUS_LABELS[toUiRequestStatus(status)];
}

export function isTerminalRequestStatus(status?: string | null): boolean {
  const normalized = toUiRequestStatus(status);
  return normalized === 'ACCEPTED' || normalized === 'DECLINED';
}

export function getRequestStatusBadgeClass(status?: string | null): string {
  const normalized = toUiRequestStatus(status);
  if (normalized === 'REQUESTED') return 'border border-blue-200 bg-blue-50 text-blue-700';
  if (normalized === 'UNDER_REVIEW') {
    return 'border border-orange-200 bg-orange-50 text-orange-700';
  }
  if (normalized === 'QUOTED') return 'border border-amber-200 bg-amber-50 text-amber-700';
  if (normalized === 'ACCEPTED') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  return 'border border-rose-200 bg-rose-50 text-rose-700';
}

export function getRequestStatusTone(
  status?: string | null,
): { bg: string; text: string; dot: string } {
  const normalized = toUiRequestStatus(status);
  if (normalized === 'REQUESTED') {
    return { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' };
  }
  if (normalized === 'UNDER_REVIEW') {
    return { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' };
  }
  if (normalized === 'QUOTED') {
    return { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' };
  }
  if (normalized === 'ACCEPTED') {
    return { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' };
  }
  return { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-400' };
}
