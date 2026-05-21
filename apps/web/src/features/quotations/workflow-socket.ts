import { io, Socket } from 'socket.io-client';

type WorkflowSocketOptions = {
  token: string;
};

export type WorkflowEventPayload = {
  quotationId: string;
  quotationNumber: string;
  customerPhone?: string;
  requestStatus?: string;
  status?: string;
  agreementStatus?: string;
  reason?: string;
  existingCustomer?: boolean;
  updatedAt?: string;
  eventType?: string;
  eventDate?: string;
  venue?: string;
  guestCount?: number;
  grandTotal?: number | string;
};

function resolveWorkflowUrl() {
  const fallbackApiBase =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:4000/api`
      : 'http://localhost:4000/api';
  const apiBase = import.meta.env.VITE_API_URL ?? fallbackApiBase;

  try {
    const url = new URL(apiBase);
    return `${url.protocol}//${url.host}/workflow`;
  } catch {
    return 'http://localhost:4000/workflow';
  }
}

export function createWorkflowSocket({ token }: WorkflowSocketOptions): Socket {
  return io(resolveWorkflowUrl(), {
    auth: { token },
    transports: ['websocket'],
  });
}
