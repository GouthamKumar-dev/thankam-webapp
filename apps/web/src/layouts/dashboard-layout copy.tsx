import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Gauge,
  Image,
  Layers3,
  LayoutDashboard,
  Menu,
  LogOut,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/common/breadcrumbs';
import { logoutThunk } from '@/store/slices/auth.slice';
import { Card } from '@/components/ui/card';
import { FormDialog } from '@/components/common/form-dialog';
import {
  createWorkflowSocket,
  type WorkflowEventPayload,
} from '@/features/quotations/workflow-socket';
import { playNotificationSound } from '@/features/notifications/notification-sound';
import {
  AdminNotificationItem,
  readAdminNotifications,
  writeAdminNotifications,
} from '@/features/notifications/admin-notifications';
import { settingsService } from '@/features/settings/settings.service';
import { toMediaUrl } from '@/utils/media-url';

const adminLinks = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Categories', to: '/admin/categories', icon: Layers3 },
  { label: 'Menus', to: '/admin/menus', icon: ClipboardList },
  { label: 'Quotations', to: '/admin/quotations', icon: FileText },
  { label: 'Customer Requests', to: '/admin/customer-requests', icon: Gauge },
  { label: 'Gallery', to: '/admin/gallery', icon: Image },
  { label: 'Website Review', to: '/admin/website-review', icon: Sparkles },
  { label: 'Notifications', to: '/admin/notifications', icon: Bell },
  { label: 'Users', to: '/admin/users', icon: Users },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
];

const staffLinks = [
  { label: 'Dashboard', to: '/staff/dashboard', icon: LayoutDashboard },
  { label: 'My Uploads', to: '/staff/gallery', icon: Image },
];

const DASHBOARD_SIDEBAR_COLLAPSED_KEY = 'dashboard_sidebar_collapsed';

type CompanyBranding = {
  name: string;
  logoName: string;
  logoUrl: string;
  faviconUrl: string;
  tagline: string;
};

const defaultCompanyBranding: CompanyBranding = {
  name: 'Thankam Events',
  logoName: 'TE',
  logoUrl: '',
  faviconUrl: '',
  tagline: 'Admin command center',
};

export function DashboardLayout() {
  const { user, accessToken } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const links = user?.role === 'ADMIN' ? adminLinks : staffLinks;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [branding, setBranding] = useState<CompanyBranding>(defaultCompanyBranding);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState<AdminNotificationItem[]>([]);
  const [socketStatus, setSocketStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'disconnected'
  >('idle');
  const compactBrandName = useMemo(() => {
    const preferred = branding.logoName?.trim() || branding.name?.trim() || 'Brand';
    return preferred.length > 18 ? `${preferred.slice(0, 18)}...` : preferred;
  }, [branding.logoName, branding.name]);

  const unreadCount = useMemo(
    () => notificationItems.filter((item) => !item.read).length,
    [notificationItems],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(DASHBOARD_SIDEBAR_COLLAPSED_KEY);
    setIsSidebarCollapsed(raw === '1');
  }, []);

  useEffect(() => {
    setNotificationItems(readAdminNotifications());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      DASHBOARD_SIDEBAR_COLLAPSED_KEY,
      isSidebarCollapsed ? '1' : '0',
    );
  }, [isSidebarCollapsed]);

  useEffect(() => {
    let active = true;
    void settingsService
      .list()
      .then((rows) => {
        if (!active) return;
        const company = rows.find((row) => row.key === 'company');
        const value = company?.value ?? {};
        setBranding({
          name: String(value.name ?? 'Thankam Events'),
          logoName: String(value.logoName ?? 'TE'),
          logoUrl: toMediaUrl(String(value.logoUrl ?? '')),
          faviconUrl: toMediaUrl(String(value.faviconUrl ?? '')),
          tagline: String(value.tagline ?? 'Admin command center'),
        });
      })
      .catch(() => {
        if (!active) return;
        setBranding(defaultCompanyBranding);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (branding.name) {
      document.title = `${branding.name} | Admin`;
    }
    if (!branding.faviconUrl) return;
    const existing = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (existing) {
      existing.href = branding.faviconUrl;
      return;
    }
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = branding.faviconUrl;
    document.head.appendChild(link);
  }, [branding.faviconUrl, branding.name]);

  useEffect(() => {
    writeAdminNotifications(notificationItems);
  }, [notificationItems]);

  useEffect(() => {
    if (!accessToken) return;

    setSocketStatus('connecting');
    const socket = createWorkflowSocket({ token: accessToken });

    const pushNotification = (
      title: string,
      subtitle: string,
      quotationId?: string,
      quotationNumber?: string,
    ) => {
      setNotificationItems((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title,
          subtitle,
          quotationId,
          quotationNumber,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...prev,
      ]);
      void playNotificationSound('admin');
    };

    const withTime = (message: string) =>
      `${message} | ${new Date().toLocaleTimeString()}`;

    socket.on('connect', () => {
      setSocketStatus('connected');
    });

    socket.on('disconnect', () => {
      setSocketStatus('disconnected');
    });

    socket.on('workflow:request.created', (payload: WorkflowEventPayload) => {
      pushNotification(
        `New Request: ${payload.quotationNumber}`,
        withTime('Customer quotation request created'),
        payload.quotationId,
        payload.quotationNumber,
      );
    });

    socket.on('workflow:request.status', (payload: WorkflowEventPayload) => {
      pushNotification(
        `Request Updated: ${payload.quotationNumber}`,
        withTime(`Status: ${payload.requestStatus ?? 'Updated'}`),
        payload.quotationId,
        payload.quotationNumber,
      );
    });

    socket.on('workflow:quotation.status', (payload: WorkflowEventPayload) => {
      pushNotification(
        `Quotation Updated: ${payload.quotationNumber}`,
        withTime(`Approval: ${payload.status ?? 'Updated'}`),
        payload.quotationId,
        payload.quotationNumber,
      );
    });

    socket.on('workflow:agreement.feedback', (payload: WorkflowEventPayload) => {
      pushNotification(
        `Agreement ${payload.status ?? 'Updated'}: ${payload.quotationNumber}`,
        withTime(
          payload.reason
            ? `Customer note: ${payload.reason}`
            : 'Customer agreement action received',
        ),
        payload.quotationId,
        payload.quotationNumber,
      );
    });

    socket.on('workflow:customer.otpVerified', (payload: WorkflowEventPayload) => {
      pushNotification(
        'Customer OTP Verified',
        withTime(payload.customerPhone ?? 'Customer authenticated'),
      );
    });

    socket.on('workflow:customer.interested', (payload: WorkflowEventPayload) => {
      pushNotification(
        `Need to Talk: ${payload.quotationNumber}`,
        withTime(
          payload.reason
            ? `Customer note: ${payload.reason}`
            : 'Customer marked as interested and requested a callback',
        ),
        payload.quotationId,
        payload.quotationNumber,
      );
    });

    return () => {
      socket.disconnect();
      setSocketStatus('disconnected');
    };
  }, [accessToken]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,rgba(15,23,42,0.08),transparent_30%),radial-gradient(circle_at_100%_0%,rgba(20,184,166,0.12),transparent_22%)] px-2 py-3 md:px-3 lg:px-4">
      <div className={`flex w-full ${isSidebarCollapsed ? 'gap-4' : 'gap-3 lg:gap-4'}`}>
        <aside
          className={`sticky top-3 hidden h-[calc(100vh-1.5rem)] shrink-0 overflow-visible transition-[width] duration-300 lg:block ${
            isSidebarCollapsed ? 'w-24' : 'w-72'
          }`}
        >
          <Card
            className={`relative h-full overflow-y-auto border-slate-800/70 bg-slate-950 text-slate-100 shadow-[0_18px_42px_rgba(2,6,23,0.45)] ${
              isSidebarCollapsed ? 'p-3' : 'p-4'
            }`}
          >
            <div className={`mb-6 ${isSidebarCollapsed ? 'pt-2' : ''}`}>
              <div
                className={`rounded-3xl bg-gradient-to-br from-teal-500 via-cyan-500 to-teal-600 p-4 text-white shadow-[0_14px_34px_rgba(20,184,166,0.4)] transition-all ${
                  isSidebarCollapsed ? 'mx-auto w-14 px-0 py-3 text-center' : 'w-full'
                }`}
              >
                {isSidebarCollapsed ? (
                  branding.logoUrl ? (
                    <img
                      src={branding.logoUrl}
                      alt={branding.logoName || branding.name}
                      className="mx-auto h-8 w-8 rounded-md bg-white/90 object-contain p-1"
                    />
                  ) : (
                    <h1 className="text-lg font-extrabold">
                      {(branding.logoName || 'TE').slice(0, 2).toUpperCase()}
                    </h1>
                  )
                ) : (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Workspace</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/35 backdrop-blur">
                        {branding.logoUrl ? (
                          <img
                            src={branding.logoUrl}
                            alt={branding.logoName || branding.name}
                            className="h-9 w-9 rounded-xl bg-white/90 object-contain p-1"
                          />
                        ) : (
                          <span className="text-lg font-extrabold text-white">
                            {(branding.logoName || 'TE').slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h1 className="truncate text-[1.6rem] font-extrabold leading-none" title={branding.name}>
                          {compactBrandName}
                        </h1>
                      </div>
                    </div>
                    <p className="mt-2 truncate text-xs text-white/85" title={branding.tagline}>
                      {branding.tagline || 'Admin command center'}
                    </p>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="absolute right-3 top-3 z-20 inline-grid h-8 w-8 place-items-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 shadow-sm hover:text-white"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            >
              {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            <nav className={`space-y-1 ${isSidebarCollapsed ? 'mt-1' : ''}`}>
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  title={isSidebarCollapsed ? link.label : undefined}
                  className={({ isActive }) =>
                    `block rounded-xl text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-[0_10px_24px_rgba(34,211,238,0.35)]'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    } ${
                      isSidebarCollapsed
                        ? 'mx-auto grid h-10 w-10 place-items-center px-0 py-0 text-[11px]'
                        : 'px-3 py-2.5'
                    }`
                  }
                >
                  <span
                    className={`${
                      isSidebarCollapsed
                        ? 'inline-flex items-center justify-center'
                        : 'grid grid-cols-[18px,1fr] items-center gap-2.5'
                    }`}
                  >
                    <link.icon size={16} className="justify-self-center" />
                    {!isSidebarCollapsed ? <span>{link.label}</span> : null}
                  </span>
                </NavLink>
              ))}
            </nav>
          </Card>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-2 z-20 mb-4 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_8px_28px_rgba(15,23,42,0.08)] backdrop-blur md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-9 p-0 lg:hidden"
                  onClick={() => setIsNavDrawerOpen(true)}
                  aria-label="Open navigation menu"
                >
                  <Menu size={17} />
                </Button>
                <div className="rounded-xl border border-teal-100 bg-teal-50 p-2 text-primary">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Signed in as</p>
                  <p className="text-lg font-bold text-slate-900">{user?.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className={`relative rounded-xl border bg-white p-2.5 transition-colors hover:text-slate-900 ${
                    socketStatus === 'connected'
                      ? 'border-[#4CAF0B]/50 text-[#3f930c]'
                      : 'border-border text-slate-500'
                  }`}
                  onClick={() => setNotificationOpen(true)}
                >
                  <Bell size={17} />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                      socketStatus === 'connected' ? 'bg-[#4CAF0B]' : 'bg-slate-300'
                    }`}
                  />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold leading-4 text-white">
                      {Math.min(unreadCount, 9)}
                    </span>
                  ) : null}
                </button>
                <Button variant="outline" className="border-slate-300" onClick={() => void dispatch(logoutThunk())}>
                  <LogOut size={15} className="mr-2" /> Logout
                </Button>
              </div>
            </div>
          </header>

          <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-[0_8px_28px_rgba(15,23,42,0.04)] backdrop-blur md:p-4 lg:p-5">
            <Breadcrumbs />
            <div className="mt-3">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {isNavDrawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
            onClick={() => setIsNavDrawerOpen(false)}
            aria-label="Close navigation menu overlay"
          />
          <aside className="relative h-full w-[84%] max-w-[320px] border-r border-slate-800 bg-slate-950 p-4 text-slate-100 shadow-[0_18px_42px_rgba(2,6,23,0.45)]">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2">
                {branding.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt={branding.logoName || branding.name}
                    className="h-9 w-9 rounded-md bg-white/90 object-contain p-1"
                  />
                ) : (
                  <span className="inline-grid h-9 w-9 place-items-center rounded-md bg-cyan-500 font-bold text-white">
                    {(branding.logoName || 'TE').slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-white">{branding.name}</p>
                  <p className="truncate text-xs text-cyan-100/80">{branding.tagline || 'Admin command center'}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-9 w-9 border-slate-700 bg-slate-900 p-0 text-slate-200"
                onClick={() => setIsNavDrawerOpen(false)}
                aria-label="Close navigation menu"
              >
                <X size={16} />
              </Button>
            </div>
            <nav className="space-y-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsNavDrawerOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-[0_10px_24px_rgba(34,211,238,0.35)]'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`
                  }
                >
                  <span className="grid grid-cols-[18px,1fr] items-center gap-2.5">
                    <link.icon size={16} className="justify-self-center" />
                    <span>{link.label}</span>
                  </span>
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}

      <FormDialog
        title="Notifications"
        description="Live workflow updates from customer requests, quotations, and agreements."
        open={notificationOpen}
        onOpenChange={setNotificationOpen}
      >
        <div className="space-y-3">
          {notificationItems.length === 0 ? (
            <p className="text-sm text-slate-500">
              No notifications yet.
            </p>
          ) : (
            <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
              {notificationItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.subtitle}</p>
                </div>
              ))}
            </div>
          )}
          <div className="pt-1 text-right">
            <NavLink
              to="/admin/notifications"
              onClick={() => setNotificationOpen(false)}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Review all notifications
            </NavLink>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}

