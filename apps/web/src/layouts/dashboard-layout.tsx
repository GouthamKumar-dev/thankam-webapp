import {
  Bell,
  Camera,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  Gauge,
  Image,
  Layers3,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/common/breadcrumbs';
import { logoutThunk } from '@/store/slices/auth.slice';
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
  children?: SidebarLink[];
};

type SidebarSection = {
  title: string;
  links: SidebarLink[];
};

const adminSections: SidebarSection[] = [
  {
    title: 'Navigation',
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
      {
        label: 'Event Media',
        to: '/admin/event-media/gallery',
        icon: Camera,
        children: [
          { label: 'Gallery', to: '/admin/event-media/gallery', icon: Image },
          { label: 'Testimonials', to: '/admin/event-media/testimonials', icon: MessageSquare },
        ],
      },
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
  logoName: 'Thankam Events',
  logoUrl: '/assets/img/Thankam_Logo.png',
  faviconUrl: '/assets/img/favicon.png',
  tagline: 'Celebrations Crafted • Kollam',
};

export function DashboardLayout() {
  const { user, accessToken } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();

  const sidebarSections = user?.role === 'ADMIN' ? adminSections : staffSections;
  const navigate = useNavigate();
  const location = useLocation();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isEventMediaExpanded, setIsEventMediaExpanded] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const [branding, setBranding] = useState<CompanyBranding>(defaultCompanyBranding);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState<AdminNotificationItem[]>([]);
  const [socketStatus, setSocketStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'disconnected'
  >('idle');

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
    const raw = localStorage.getItem(DASHBOARD_SIDEBAR_COLLAPSED_KEY);
    setIsSidebarCollapsed(raw === '1');
  }, []);

  useEffect(() => {
    setNotificationItems(readAdminNotifications());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DASHBOARD_SIDEBAR_COLLAPSED_KEY, isSidebarCollapsed ? '1' : '0');
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (location.pathname.startsWith('/admin/event-media')) {
      setIsEventMediaExpanded(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    let active = true;
    void settingsService
      .list()
      .then((rows) => {
        if (!active) return;
        const company = rows.find((row) => row.key === 'company');
        const value = company?.value ?? {};
        setBranding({
          name: String(value.name || 'Thankam Events'),
          logoName: String(value.logoName || 'Thankam Events'),
          logoUrl: toMediaUrl(String(value.logoUrl ?? '')) || '/assets/img/Thankam_Logo.png',
          faviconUrl: toMediaUrl(String(value.faviconUrl ?? '')) || '/assets/img/favicon.png',
          tagline: String(value.tagline || 'Celebrations Crafted • Kollam'),
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
      playNotificationSound();
    };

    socket.on('connect', () => setSocketStatus('connected'));
    socket.on('disconnect', () => setSocketStatus('disconnected'));
    socket.on('connect_error', () => setSocketStatus('disconnected'));

    const withTime = (text: string) =>
      `${text} | ${new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;

    const broadcastEvent = (event: string, payload: WorkflowEventPayload) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('thankam:quotation-event', { detail: { event, payload } }),
        );
      }
    };

    socket.on('workflow:request.created', (payload: WorkflowEventPayload) => {
      broadcastEvent('workflow:request.created', payload);
      pushNotification(
        `New Request: ${payload.quotationNumber}`,
        withTime('Customer submitted a new quotation request'),
        payload.quotationId,
        payload.quotationNumber,
      );
    });

    socket.on('workflow:request.updated', (payload: WorkflowEventPayload) => {
      broadcastEvent('workflow:request.updated', payload);
      pushNotification(
        `Request Updated: ${payload.quotationNumber}`,
        withTime('Customer edited their quotation request'),
        payload.quotationId,
        payload.quotationNumber,
      );
    });

    socket.on('workflow:request.status', (payload: WorkflowEventPayload) => {
      broadcastEvent('workflow:request.status', payload);
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

    socket.on('workflow:quotation.status', (payload: WorkflowEventPayload) => {
      broadcastEvent('workflow:quotation.status', payload);
    });

    socket.on('workflow:agreement.initiated', (payload: WorkflowEventPayload) => {
      broadcastEvent('workflow:agreement.initiated', payload);
    });

    socket.on('workflow:agreement.feedback', (payload: WorkflowEventPayload) => {
      broadcastEvent('workflow:agreement.feedback', payload);
      const action = payload.status === 'ACCEPTED' ? 'accepted' : 'rejected';
      pushNotification(
        `Agreement ${payload.status === 'ACCEPTED' ? 'Accepted' : 'Rejected'}: ${payload.quotationNumber}`,
        withTime(`Customer ${action} the agreement`),
        payload.quotationId,
        payload.quotationNumber,
      );
    });

    socket.on('workflow:customer.interested', (payload: WorkflowEventPayload) => {
      broadcastEvent('workflow:customer.interested', payload);
      pushNotification(
        `Interested: ${payload.quotationNumber}`,
        withTime('Customer expressed interest — follow up needed'),
        payload.quotationId,
        payload.quotationNumber,
      );
    });

    socket.on('workflow:customer.otpVerified', (payload: WorkflowEventPayload) => {
      broadcastEvent('workflow:customer.otpVerified', payload);
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
    <div className="flex h-screen overflow-hidden bg-[#FAF9F6] font-sans antialiased text-slate-800">
      {/* ── LEFT SIDEBAR ── */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-slate-200/80 bg-white transition-all duration-300 lg:flex ${
          isSidebarCollapsed ? 'w-[76px]' : 'w-[260px]'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4">
          {!isSidebarCollapsed ? (
            <NavLink to="/admin/dashboard" className="flex items-center gap-3 group">
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-amber-500/25 bg-[#080C14] p-1 flex items-center justify-center shadow-xs group-hover:border-[#D4AF37] transition-all">
                <img
                  src={branding.logoUrl || '/assets/img/Thankam_Logo.png'}
                  alt="Thankam Events"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/assets/img/Thankam_Logo.png';
                  }}
                />
              </div>
              <div className="min-w-0">
                <span className="block font-serif text-base font-bold tracking-tight text-slate-900 group-hover:text-[#B8860B] transition-colors leading-none truncate">
                  {branding.name || 'Thankam Events'}
                </span>
                <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-[#B8860B] mt-1 truncate">
                  Celebrations Crafted
                </span>
              </div>
            </NavLink>
          ) : (
            <NavLink to="/admin/dashboard" className="mx-auto block" title="Thankam Events">
              <div className="h-9 w-9 overflow-hidden rounded-xl border border-amber-500/25 bg-[#080C14] p-1 flex items-center justify-center shadow-xs hover:border-[#D4AF37] transition-all">
                <img
                  src={branding.logoUrl || '/assets/img/Thankam_Logo.png'}
                  alt="Thankam Events"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/assets/img/Thankam_Logo.png';
                  }}
                />
              </div>
            </NavLink>
          )}
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3.5 py-4 [scrollbar-width:thin] [scrollbar-color:rgba(203,213,225,0.6)_transparent]">
          {sidebarSections.map((section) => (
            <div key={section.title} className="space-y-1">
              {!isSidebarCollapsed ? (
                <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {section.title}
                </p>
              ) : null}

              {section.links.map((link) => {
                const isExactActive = location.pathname === link.to;
                const hasChildren = Boolean(link.children && link.children.length > 0);
                const isChildActive =
                  link.children?.some((child) => location.pathname === child.to) ?? false;
                const isActive = isExactActive || isChildActive;

                // Special handling for expandable groups
                if (hasChildren && !isSidebarCollapsed) {
                  const isExpanded = isEventMediaExpanded;
                  const toggleExpanded = () => {
                    setIsEventMediaExpanded((prev) => !prev);
                  };

                  return (
                    <div key={link.to} className="space-y-1">
                      <button
                        type="button"
                        onClick={toggleExpanded}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <link.icon
                            size={18}
                            className={isActive ? 'text-[#D4AF37]' : 'text-slate-500'}
                          />
                          <span className="truncate">{link.label}</span>
                        </span>
                        <ChevronDown
                          size={15}
                          className={`transition-transform duration-200 ${
                            isActive ? 'text-slate-300' : 'text-slate-400'
                          } ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {/* Submenu links with dots */}
                      {isExpanded ? (
                        <div className="space-y-0.5 py-1 pl-7">
                          {link.children?.map((child) => {
                            const childActive = location.pathname === child.to;
                            return (
                              <NavLink
                                key={child.to}
                                to={child.to}
                                className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                  childActive
                                    ? 'text-slate-900 font-bold'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    childActive ? 'bg-[#B8860B]' : 'bg-slate-300'
                                  }`}
                                />
                                <span>{child.label}</span>
                              </NavLink>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    title={isSidebarCollapsed ? link.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                      } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`
                    }
                  >
                    <span className="flex items-center gap-3">
                      <link.icon
                        size={18}
                        className={isActive ? 'text-[#D4AF37]' : 'text-slate-500'}
                      />
                      {!isSidebarCollapsed ? (
                        <span className="truncate">{link.label}</span>
                      ) : null}
                    </span>
                    {!isSidebarCollapsed && !isActive ? (
                      <ChevronRight size={14} className="text-slate-300" />
                    ) : null}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-5 backdrop-blur-md">
          {/* Left: Sidebar Toggle & Mobile Brand */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Toggle sidebar"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsNavDrawerOpen(true);
                } else {
                  setIsSidebarCollapsed((prev) => !prev);
                }
              }}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              <Menu size={19} />
            </button>

            {/* Mobile Brand Logo */}
            <NavLink to="/admin/dashboard" className="flex items-center gap-2 lg:hidden">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-amber-500/25 bg-[#080C14] p-1 flex items-center justify-center shadow-xs">
                <img
                  src={branding.logoUrl || '/assets/img/Thankam_Logo.png'}
                  alt="Thankam Events"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/assets/img/Thankam_Logo.png';
                  }}
                />
              </div>
              <span className="font-serif text-sm font-bold text-slate-900 hidden sm:inline">
                Thankam Events
              </span>
            </NavLink>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-2">
            {/* Notifications Button */}
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => setNotificationOpen(true)}
              className="relative grid h-9 w-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Bell size={18} />
              {unreadCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#080C14] px-1 text-[9px] font-black text-[#F3CA52] border border-[#D4AF37]/50 shadow-xs ring-1 ring-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </button>

            {/* User Profile Avatar with Popover */}
            <div className="relative ml-2 pl-2 border-l border-slate-200">
              <button
                type="button"
                onClick={() => setUserDropdownOpen((prev) => !prev)}
                className="relative flex items-center gap-2 rounded-full p-0.5 ring-2 ring-transparent hover:ring-slate-200 transition-all"
              >
                <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-slate-900 border border-[#B8860B]/40 font-bold text-xs text-amber-300 shadow-sm">
                  {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
                </div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </button>

              {userDropdownOpen ? (
                <div className="absolute right-0 top-12 z-50 w-52 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {user?.name || 'Administrator'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {user?.email || 'admin@thankam.com'}
                    </p>
                  </div>
                  <div className="space-y-1 py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        navigate('/admin/settings');
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    >
                      <Settings size={14} /> Account Settings
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setUserDropdownOpen(false);
                        await dispatch(logoutThunk());
                        navigate('/login', { replace: true });
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut size={14} /> Log out
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
          <Breadcrumbs />
          <div className="mt-4">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── MOBILE DRAWER ── */}
      {isNavDrawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsNavDrawerOpen(false)}
          />

          <aside className="relative flex h-full w-[80%] max-w-[280px] flex-col border-r border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <NavLink
                to="/admin/dashboard"
                onClick={() => setIsNavDrawerOpen(false)}
                className="flex items-center gap-3"
              >
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-amber-500/25 bg-[#080C14] p-1 flex items-center justify-center shadow-xs">
                  <img
                    src={branding.logoUrl || '/assets/img/Thankam_Logo.png'}
                    alt="Thankam Events"
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/assets/img/Thankam_Logo.png';
                    }}
                  />
                </div>
                <div>
                  <span className="block font-serif text-base font-bold tracking-tight text-slate-900 leading-none">
                    {branding.name || 'Thankam Events'}
                  </span>
                  <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-[#B8860B] mt-1">
                    Celebrations Crafted
                  </span>
                </div>
              </NavLink>

              <Button
                variant="outline"
                className="h-8 w-8 rounded-lg p-0 text-slate-500"
                onClick={() => setIsNavDrawerOpen(false)}
              >
                <X size={16} />
              </Button>
            </div>

            <nav className="flex-1 space-y-5 overflow-y-auto">
              {sidebarSections.map((section) => (
                <div key={section.title} className="space-y-1">
                  <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </p>
                  {section.links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      onClick={() => setIsNavDrawerOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                          isActive
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`
                      }
                    >
                      <link.icon size={17} />
                      <span>{link.label}</span>
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>

            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={async () => {
                  setIsNavDrawerOpen(false);
                  await dispatch(logoutThunk());
                  navigate('/login', { replace: true });
                }}
                className="flex w-full items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
              >
                <LogOut size={15} /> Log out
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {/* ── NOTIFICATIONS MODAL ── */}
      <FormDialog
        title="Notifications"
        description="Live workflow updates and activities."
        open={notificationOpen}
        onOpenChange={setNotificationOpen}
        contentClassName="max-w-[min(96vw,720px)]"
        bodyClassName="px-4 py-4 sm:px-5"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2.5">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
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
            <div className="max-h-[58vh] space-y-2.5 overflow-auto pr-1">
              {notificationItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`w-full overflow-hidden rounded-xl border bg-white text-left shadow-xs transition-all hover:shadow-md ${
                    item.read
                      ? 'border-slate-200'
                      : 'border-[#D4AF37]/50 bg-amber-50/20 ring-1 ring-amber-200/50'
                  }`}
                  onClick={() => {
                    markNotificationRead(item.id);
                    setNotificationOpen(false);
                    navigate(resolveNotificationRoute(item.title, item.quotationId));
                  }}
                >
                  <div
                    className={`flex items-center justify-between gap-3 px-4 py-2 ${
                      item.read ? 'bg-slate-50' : 'bg-amber-50/70 border-b border-amber-100/60'
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-900">{item.title}</p>
                    {!item.read ? (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#B8860B] animate-pulse" />
                    ) : null}
                  </div>
                  <div className="space-y-1.5 px-4 py-2.5">
                    <p className="text-xs text-slate-600">{item.subtitle}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Clock3 size={11} />
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
              className="text-xs font-bold text-[#B8860B] transition-colors hover:text-[#080C14] hover:underline"
            >
              Review all notifications →
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
