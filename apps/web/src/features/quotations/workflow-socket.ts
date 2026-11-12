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
  if (typeof window !== 'undefined') {
    // If running in development on port 5173, connect to backend port 4000
    if (window.location.port === '5173') {
      return `${window.location.protocol}//${window.location.hostname}:4000/workflow`;
    }
    // On production (thankamevents.in), use the same origin
    return `${window.location.origin}/workflow`;
  }
  return 'http://localhost:4000/workflow';
}

export function createWorkflowSocket({ token }: WorkflowSocketOptions): Socket {
  return io(resolveWorkflowUrl(), {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
}
