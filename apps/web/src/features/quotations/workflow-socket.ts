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
    const envWsUrl = (import.meta as any).env?.VITE_WS_URL;
    if (envWsUrl) {
      return envWsUrl;
    }
    const envApiUrl = (import.meta as any).env?.VITE_API_URL;
    if (envApiUrl) {
      const stripped = envApiUrl.replace(/\/api\/?$/, '');
      return `${stripped}/workflow`;
    }
    // If running in development on localhost or 127.0.0.1, connect to backend port 4000
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `${window.location.protocol}//${window.location.hostname}:4000/workflow`;
    }
    // On production (e.g. thankamevents.in), use same origin
    return `${window.location.origin}/workflow`;
  }
  return 'http://localhost:4000/workflow';
}

export function createWorkflowSocket({ token }: WorkflowSocketOptions): Socket {
  return io(resolveWorkflowUrl(), {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });
}
