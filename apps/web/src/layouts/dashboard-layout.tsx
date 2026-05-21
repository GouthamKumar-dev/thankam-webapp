import {
  Bell,
  Camera,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ClipboardList,
  FileText,
  Gauge,
  Image,
  Layers3,
  LayoutDashboard,
  Menu,
  LogOut,
  Settings,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

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

type SidebarLink = {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
};

type SidebarSection = {
  title: string;
  links: SidebarLink[];
};

const adminSections: SidebarSection[] = [
  {
    title: 'Overview',
    links: [
      { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Customer Requests', to: '/admin/customer-requests', icon: Gauge },
      { label: 'Notifications', to: '/admin/notifications', icon: Bell },
    ],
  },
  {
    title: 'Catalog',
    links: [
      { label: 'Categories', to: '/admin/categories', icon: Layers3 },
      { label: 'Menus', to: '/admin/menus', icon: ClipboardList },
      { label: 'Event Media', to: '/admin/event-media', icon: Camera },
    ],
  },
  {
    title: 'Administration',
    links: [
      { label: 'Quotations', to: '/admin/quotations', icon: FileText },
      { label: 'Users', to: '/admin/users', icon: Users },
      { label: 'Settings', to: '/admin/settings', icon: Settings },
    ],
  },
];

const staffSections: SidebarSection[] = [
  {
    title: 'Workspace',
    links: [
      { label: 'Dashboard', to: '/staff/dashboard', icon: LayoutDashboard },
      { label: 'Event Photos', to: '/staff/gallery', icon: Image },
    ],
  },
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
  tagline: 'Premium Event Management Workspace',
};

export function DashboardLayout() {
  const { user, accessToken } = useAppSelector((s) => s.auth);

  const dispatch = useAppDispatch();

  const sidebarSections =
    user?.role === 'ADMIN' ? adminSections : staffSections;
  const links = useMemo(
    () => sidebarSections.flatMap((section) => section.links),
    [sidebarSections],
  );

  const navigate = useNavigate();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);

  const [branding, setBranding] = useState<CompanyBranding>(
    defaultCompanyBranding,
  );

  const [notificationOpen, setNotificationOpen] = useState(false);

  const [notificationItems, setNotificationItems] = useState<
    AdminNotificationItem[]
  >([]);

  const [socketStatus, setSocketStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'disconnected'
  >('idle');

  const compactBrandName = useMemo(() => {
    const preferred =
      branding.logoName?.trim() || branding.name?.trim() || 'Brand';

    return preferred.length > 18
      ? `${preferred.slice(0, 18)}...`
      : preferred;
  }, [branding.logoName, branding.name]);

  const unreadCount = useMemo(
    () => notificationItems.filter((item) => !item.read).length,
    [notificationItems],
  );

  const markAllNotificationsRead = () => {
    setNotificationItems((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const clearNotifications = () => {
    setNotificationItems([]);
  };

  const markNotificationRead = (id: string) => {
    setNotificationItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const raw = localStorage.getItem(
      DASHBOARD_SIDEBAR_COLLAPSED_KEY,
    );

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
          tagline: String(
            value.tagline ?? 'Premium Event Management Workspace',
          ),
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

    const existing =
      document.querySelector<HTMLLinkElement>('link[rel="icon"]');

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

    const socket = createWorkflowSocket({
      token: accessToken,
    });

    const pushNotification = (
      title: string,
      subtitle: string,
      quotationId?: string,
      quotationNumber?: string,
    ) => {
      setNotificationItems((prev) => [
        {
          id: `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
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
        withTime('Customer submitted a new quotation request'),
        payload.quotationId,
        payload.quotationNumber,
      );
    });

    socket.on('workflow:request.updated', (payload: WorkflowEventPayload) => {
      pushNotification(
        `Request Updated: ${payload.quotationNumber}`,
        withTime('Customer edited their quotation request'),
        payload.quotationId,
        payload.quotationNumber,
      );
    });

    socket.on('workflow:request.status', (payload: WorkflowEventPayload) => {
      const statusLabel =
        payload.requestStatus === 'CONVERTED'
          ? 'Customer accepted the quote'
          : payload.requestStatus === 'CLOSED_REJECTED'
            ? 'Customer declined the quote'
            : payload.requestStatus === 'CONTACTED'
              ? 'Customer marked as interested'
              : `Status changed to ${payload.requestStatus ?? 'unknown'}`;
      pushNotification(
        `Customer Response: ${payload.quotationNumber}`,
        withTime(statusLabel),
        payload.quotationId,
        payload.quotationNumber,
      );
    });

    socket.on('workflow:agreement.feedback', (payload: WorkflowEventPayload) => {
      const action = payload.status === 'ACCEPTED' ? 'accepted' : 'rejected';
      pushNotification(
        `Agreement ${payload.status === 'ACCEPTED' ? 'Accepted' : 'Rejected'}: ${payload.quotationNumber}`,
        withTime(`Customer ${action} the agreement`),
        payload.quotationId,
        payload.quotationNumber,
      );
    });

    socket.on('workflow:customer.interested', (payload: WorkflowEventPayload) => {
      pushNotification(
        `Interested: ${payload.quotationNumber}`,
        withTime('Customer expressed interest — follow up needed'),
        payload.quotationId,
        payload.quotationNumber,
      );
    });

    socket.on('workflow:customer.otpVerified', (payload: WorkflowEventPayload) => {
      if (!payload.existingCustomer) {
        pushNotification(
          'New Customer Registered',
          withTime(`+${payload.customerPhone ?? 'unknown'} just created an account`),
          undefined,
          undefined,
        );
      }
    });

    return () => {
      socket.disconnect();
      setSocketStatus('disconnected');
    };
  }, [accessToken]);

  return (
    <div className="relative min-h-screen bg-[#f4f7fb] lg:h-screen lg:overflow-hidden">
      <div className="relative flex min-h-screen gap-4 p-3 lg:h-full lg:min-h-0 lg:p-4">
        {/* Sidebar */}
        <aside
          className={`hidden shrink-0 transition-all duration-300 lg:sticky lg:top-4 lg:block lg:h-[calc(100vh-2rem)] ${
            isSidebarCollapsed ? 'w-[92px]' : 'w-[290px]'
          }`}
        >
          <Card
            className={`relative flex h-full flex-col overflow-hidden border border-white/10 bg-[#071018] text-white shadow-[0_20px_60px_rgba(2,6,23,0.45)] ${
              isSidebarCollapsed ? 'p-3' : 'p-4'
            }`}
          >
            {/* Sidebar Glow */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.1),transparent_38%)]" />

            {/* Collapse Button */}
            <button
              type="button"
              aria-label={
                isSidebarCollapsed
                  ? 'Expand sidebar'
                  : 'Collapse sidebar'
              }
              className="absolute right-4 top-4 z-20 inline-grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-white backdrop-blur-xl transition-all hover:bg-white/10"
              onClick={() =>
                setIsSidebarCollapsed((prev) => !prev)
              }
            >
              {isSidebarCollapsed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronLeft size={16} />
              )}
            </button>

            {/* Branding */}
            <div className="relative z-10 mb-8">
              <div
                className={`rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-2xl ${
                  isSidebarCollapsed ? 'p-3' : 'p-5'
                }`}
              >
                {isSidebarCollapsed ? (
                  <div className="flex justify-center">
                    {branding.logoUrl ? (
                      <img
                        src={branding.logoUrl}
                        alt={branding.name}
                        className="h-10 w-10 rounded-2xl bg-white object-contain p-1"
                      />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 font-black text-white">
                        TE
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-500 shadow-[0_10px_30px_rgba(45,212,191,0.45)]">
                        {branding.logoUrl ? (
                          <img
                            src={branding.logoUrl}
                            alt={branding.name}
                            className="h-10 w-10 rounded-2xl bg-white object-contain p-1"
                          />
                        ) : (
                          <span className="text-xl font-black text-white">
                            TE
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h1 className="truncate text-[1.45rem] font-black tracking-[-0.03em] text-white">
                          {compactBrandName}
                        </h1>

                        <p className="truncate text-xs text-slate-300">
                          {branding.tagline}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Navigation */}
            <nav className="relative z-10 mt-1 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.45)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-500/40 [&::-webkit-scrollbar-track]:bg-transparent">
              {sidebarSections.map((section) => (
                <div key={section.title}>
                  {!isSidebarCollapsed ? (
                    <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400/90">
                      {section.title}
                    </p>
                  ) : null}
                  <div className="space-y-1.5">
                    {section.links.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        title={
                          isSidebarCollapsed
                            ? link.label
                            : undefined
                        }
                        className={({ isActive }) =>
                          `group relative block overflow-hidden rounded-2xl transition-all duration-300 ${
                            isActive
                              ? 'border border-white/10 bg-white/10 shadow-[0_0_30px_rgba(45,212,191,0.25)] backdrop-blur-xl'
                              : 'hover:translate-x-[2px] hover:bg-white/[0.06]'
                          } ${
                            isSidebarCollapsed
                              ? 'mx-auto h-14 w-14 p-0'
                              : 'px-3 py-2.5'
                          }`
                        }
                      >
                        <span
                          className={`relative z-10 ${
                            isSidebarCollapsed
                              ? 'flex h-full items-center justify-center'
                              : 'grid grid-cols-[38px_1fr] items-center gap-2.5'
                          }`}
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 transition-all duration-300 group-hover:bg-teal-400/20">
                            <link.icon size={17} />
                          </span>

                          {!isSidebarCollapsed ? (
                            <span className="truncate text-[0.92rem] font-semibold tracking-[-0.01em]">
                              {link.label}
                            </span>
                          ) : null}
                        </span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </Card>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 lg:h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1">
          {/* Header */}
          <header className="sticky top-0 z-20 mb-4 rounded-[30px] border border-teal-100 bg-gradient-to-r from-white to-teal-50 p-4 shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Left */}
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-11 rounded-2xl border-white/40 bg-white/70 p-0 backdrop-blur-xl lg:hidden"
                  onClick={() => setIsNavDrawerOpen(true)}
                >
                  <Menu size={18} />
                </Button>

                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-[0_10px_30px_rgba(45,212,191,0.35)]">
                  <Camera size={18} />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                    Good Evening
                  </p>

                  <h2 className="text-[1.35rem] font-black tracking-[-0.03em] text-slate-900">
                    {user?.name}
                  </h2>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-2">
                {/* Notification */}
                <button
                  className={`relative grid h-12 w-12 place-items-center rounded-2xl border bg-teal-50 transition-all hover:scale-[1.03] ${
                    socketStatus === 'connected'
                      ? 'border-teal-300 text-teal-700 shadow-[0_10px_30px_rgba(45,212,191,0.18)]'
                      : 'border-teal-200 text-slate-700'
                  }`}
                  onClick={() => setNotificationOpen(true)}
                >
                  <Bell size={18} />

                  <span
                    className={`absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                      socketStatus === 'connected'
                        ? 'animate-pulse bg-teal-500'
                        : 'bg-slate-300'
                    }`}
                  />

                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 px-1 text-[10px] font-black text-white">
                      {Math.min(unreadCount, 9)}
                    </span>
                  ) : null}
                </button>

                {/* Logout */}
                <Button
                  variant="outline"
                  className="h-12 rounded-2xl border-white/40 bg-white/70 px-5 font-semibold shadow-sm backdrop-blur-xl"
                  onClick={() =>
                    void dispatch(logoutThunk())
                  }
                >
                  <LogOut size={16} className="mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="rounded-[34px] border border-white/50 bg-white/80 p-4 shadow-[0_10px_50px_rgba(2,6,23,0.06)] md:p-5 lg:p-6">
            <Breadcrumbs />

            <div className="mt-4">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Drawer */}
      {isNavDrawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsNavDrawerOpen(false)}
          />

          <aside className="relative h-full w-[85%] max-w-[320px] border-r border-white/10 bg-[#071018]/95 p-4 text-white shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500">
                  <span className="font-black text-white">
                    TE
                  </span>
                </div>

                <div>
                  <h2 className="font-black tracking-[-0.03em]">
                    {branding.name}
                  </h2>

                  <p className="text-xs text-slate-300">
                    {branding.tagline}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                className="h-10 w-10 rounded-2xl border-white/10 bg-white/5 p-0 text-white"
                onClick={() => setIsNavDrawerOpen(false)}
              >
                <X size={16} />
              </Button>
            </div>

            <nav className="space-y-5">
              {sidebarSections.map((section) => (
                <div key={section.title}>
                  <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400/90">
                    {section.title}
                  </p>
                  <div className="space-y-1.5">
                    {section.links.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={() =>
                          setIsNavDrawerOpen(false)
                        }
                        className={({ isActive }) =>
                          `grid grid-cols-[38px_1fr] items-center gap-2.5 rounded-2xl px-3 py-2.5 transition-all ${
                            isActive
                              ? 'border border-white/10 bg-white/10 backdrop-blur-xl'
                              : 'hover:bg-white/5'
                          }`
                        }
                      >
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/5">
                          <link.icon size={17} />
                        </span>

                        <span className="truncate text-sm font-semibold">
                          {link.label}
                        </span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}

      {/* Notifications */}
      <FormDialog
        title="Notifications"
        description="Live workflow updates and activities."
        open={notificationOpen}
        onOpenChange={setNotificationOpen}
        contentClassName="max-w-[min(96vw,760px)]"
        bodyClassName="px-4 py-4 sm:px-5"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2.5">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              {unreadCount} unread
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-8 rounded-xl px-3 text-xs"
                onClick={markAllNotificationsRead}
                disabled={notificationItems.length === 0 || unreadCount === 0}
              >
                <CheckCheck size={13} className="mr-1.5" />
                Mark all read
              </Button>
              <Button
                variant="outline"
                className="h-8 rounded-xl px-3 text-xs text-rose-600 hover:text-rose-700"
                onClick={clearNotifications}
                disabled={notificationItems.length === 0}
              >
                <Trash2 size={13} className="mr-1.5" />
                Clear
              </Button>
            </div>
          </div>

          {notificationItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <Bell className="mx-auto mb-2 h-7 w-7 text-slate-300" />
              <p className="text-sm text-slate-500">No notifications yet.</p>
            </div>
          ) : (
            <div className="max-h-[58vh] space-y-3 overflow-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.45)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400/60 [&::-webkit-scrollbar-track]:bg-transparent">
              {notificationItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`w-full overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all hover:shadow-md ${
                    item.read
                      ? 'border-slate-200'
                      : 'border-teal-200 ring-1 ring-teal-100'
                  }`}
                  onClick={() => {
                    markNotificationRead(item.id);
                    setNotificationOpen(false);
                    navigate(resolveNotificationRoute(item.title, item.quotationId));
                  }}
                >
                  <div
                    className={`flex items-center justify-between gap-3 px-4 py-2.5 ${
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

          <div className="pt-2 text-right">
            <NavLink
              to="/admin/notifications"
              onClick={() => setNotificationOpen(false)}
              className="text-sm font-bold text-teal-600 transition-colors hover:text-teal-700"
            >
              Review all notifications
            </NavLink>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}

function resolveNotificationRoute(title: string, quotationId?: string): string {
  const t = title.toLowerCase();
  if (
    t.startsWith('new request') ||
    t.startsWith('request updated') ||
    t.startsWith('customer response') ||
    t.startsWith('interested:') ||
    t.startsWith('agreement') ||
    t.startsWith('new customer') ||
    quotationId
  ) {
    return '/admin/customer-requests';
  }
  return '/admin/notifications';
}
