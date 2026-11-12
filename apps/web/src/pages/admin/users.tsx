import { ReactNode, useEffect, useMemo, useState } from 'react';
import type { MRT_ColumnDef } from 'material-react-table';
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DataTable } from '@/components/common/data-table';
import { FormDialog, FormDialogFooter } from '@/components/common/form-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectInput } from '@/components/ui/select-input';
import { CustomerSummary, UserPayload, UserRow, usersService } from '@/features/users/users.service';
import { useConfirmModal } from '@/hooks/use-confirm-modal';
import { PageShell } from '@/layouts/page-shell';
import { cn } from '@/utils/cn';
import { formatInr } from '@/utils/currency';

export function UsersPage() {
  const { confirm, confirmModal } = useConfirmModal();
  const navigate = useNavigate();

  // Active Directory Tab: 'customers' or 'staff'
  const [activeTab, setActiveTab] = useState<'customers' | 'staff'>('customers');

  // Staff state
  const [staffRows, setStaffRows] = useState<UserRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [staffForm, setStaffForm] = useState<UserPayload & { isActiveVal: string }>({
    name: '',
    email: '',
    phone: '',
    role: 'STAFF',
    password: '',
    isActiveVal: 'true',
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Customers state
  const [customerRows, setCustomerRows] = useState<CustomerSummary[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'ALL' | 'BOOKED' | 'QUOTED'>('ALL');
  const [customerViewMode, setCustomerViewMode] = useState<'grid' | 'table'>('grid');

  // Staff search
  const [staffSearch, setStaffSearch] = useState('');

  const refreshStaff = async () => {
    try {
      const res = await usersService.list(1, 100);
      setStaffRows(res.data);
    } catch {
      toast.error('Failed to load team members');
    } finally {
      setLoadingStaff(false);
    }
  };

  const refreshCustomers = async () => {
    try {
      const data = await usersService.listCustomers();
      setCustomerRows(data);
    } catch {
      toast.error('Failed to load customers directory');
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    void refreshStaff();
    void refreshCustomers();
  }, []);

  // Customer Metrics
  const customerMetrics = useMemo(() => {
    const totalClients = customerRows.length;
    let totalBookings = 0;
    let totalValue = 0;
    let inNegotiation = 0;

    for (const c of customerRows) {
      totalBookings += c.totalBookings;
      totalValue += c.lifetimeValue;
      if (c.totalBookings === 0 && c.totalQuotations > 0) {
        inNegotiation += 1;
      }
    }

    return {
      totalClients,
      totalBookings,
      totalValue,
      inNegotiation,
    };
  }, [customerRows]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();

    return customerRows.filter((c) => {
      // Filter by status tab
      if (customerFilter === 'BOOKED' && c.totalBookings === 0) return false;
      if (customerFilter === 'QUOTED' && c.totalBookings > 0) return false;

      // Text search
      if (!q) return true;
      const nameMatch = c.name.toLowerCase().includes(q);
      const phoneMatch = c.phone.includes(q);
      const addrMatch = (c.address ?? '').toLowerCase().includes(q);
      const eventMatch = (c.lastEventType ?? '').toLowerCase().includes(q) || (c.lastVenue ?? '').toLowerCase().includes(q);
      return nameMatch || phoneMatch || addrMatch || eventMatch;
    });
  }, [customerRows, customerSearch, customerFilter]);

  // Staff Metrics
  const staffMetrics = useMemo(() => {
    const total = staffRows.length;
    const admins = staffRows.filter((u) => u.role === 'ADMIN').length;
    const staff = staffRows.filter((u) => u.role === 'STAFF').length;
    const active = staffRows.filter((u) => u.isActive).length;
    return { total, admins, staff, active };
  }, [staffRows]);

  // Filtered Staff
  const filteredStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return staffRows;
    return staffRows.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone ?? '').includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [staffRows, staffSearch]);

  // Customer Table Columns
  const customerColumns = useMemo<MRT_ColumnDef<CustomerSummary>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Client / Customer',
        Cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-3 py-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#080C14] text-[#F3CA52] font-black text-xs border border-[#D4AF37]/30 shadow-xs">
                {c.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900">{c.name}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono">{c.phone}</span>
                  {c.address && (
                    <span className="truncate max-w-[150px] text-slate-400">• {c.address}</span>
                  )}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'events',
        header: 'Events & Quotes',
        Cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="py-1">
              <p className="text-xs font-bold text-slate-800">
                {c.totalBookings > 0 ? (
                  <span className="text-emerald-700">{c.totalBookings} Confirmed Event{c.totalBookings > 1 ? 's' : ''}</span>
                ) : (
                  <span className="text-amber-700">Inquiry / Quote</span>
                )}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {c.totalQuotations} total quotation{c.totalQuotations > 1 ? 's' : ''}
              </p>
            </div>
          );
        },
      },
      {
        id: 'latestEvent',
        header: 'Latest Event',
        Cell: ({ row }) => {
          const c = row.original;
          if (!c.lastEventType && !c.lastEventDate) {
            return <span className="text-xs text-slate-400 italic">No events recorded</span>;
          }
          return (
            <div className="py-1">
              <p className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
                {c.lastEventType || 'Event Feast'}
              </p>
              {c.lastEventDate && (
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {new Date(c.lastEventDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'lifetimeValue',
        header: 'Portfolio Value',
        Cell: ({ row }) => {
          const val = row.original.lifetimeValue;
          return (
            <span className="font-mono text-xs font-bold text-[#B8860B]">
              {val > 0 ? formatInr(val) : '—'}
            </span>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        Cell: ({ row }) => {
          const c = row.original;
          const isConfirmed = c.totalBookings > 0;
          return (
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
                isConfirmed
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200',
              )}
            >
              {isConfirmed ? 'Client Confirmed' : 'Lead / Quoted'}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        Cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                className="h-8 px-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-[#B8860B] flex items-center gap-1"
                onClick={() => setSelectedCustomer(c)}
              >
                <Eye size={13} />
                <span>View Profile</span>
              </Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  // Staff Table Columns
  const staffColumns = useMemo<MRT_ColumnDef<UserRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        Cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex items-center gap-3 py-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        Cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-700">
            {row.original.phone || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Role',
        Cell: ({ row }) => {
          const isAdmin = row.original.role === 'ADMIN';
          return (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border',
                isAdmin
                  ? 'bg-[#080C14] text-[#F3CA52] border-[#D4AF37]/40'
                  : 'bg-sky-50 text-sky-700 border-sky-200',
              )}
            >
              {isAdmin ? <ShieldCheck size={12} className="text-[#F3CA52]" /> : <User size={12} />}
              {row.original.role}
            </span>
          );
        },
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        Cell: ({ row }) =>
          row.original.isActive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Inactive
            </span>
          ),
      },
      {
        id: 'actions',
        header: 'Actions',
        Cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                className="h-8 w-8 p-0 rounded-lg text-slate-600 hover:text-slate-900"
                onClick={() => {
                  setSelectedUser(user);
                  setStaffForm({
                    name: user.name,
                    email: user.email,
                    phone: user.phone || '',
                    role: user.role,
                    password: '',
                    isActiveVal: String(user.isActive),
                  });
                  setEditOpen(true);
                }}
                title="Edit staff member"
              >
                <Edit3 size={14} />
              </Button>
              <Button
                variant="danger"
                className="h-8 w-8 p-0 rounded-lg"
                onClick={() => void onDeleteUser(user.id, user.name)}
                title="Delete account"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  const onCreateUser = async () => {
    try {
      await usersService.create({
        name: staffForm.name.trim(),
        email: staffForm.email.trim(),
        phone: staffForm.phone ? staffForm.phone.trim() : undefined,
        password: staffForm.password,
        role: staffForm.role,
      });
      toast.success('Team member created successfully');
      setCreateOpen(false);
      setStaffForm({
        name: '',
        email: '',
        phone: '',
        role: 'STAFF',
        password: '',
        isActiveVal: 'true',
      });
      refreshStaff();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to create user');
    }
  };

  const onUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      await usersService.update(selectedUser.id, {
        name: staffForm.name.trim(),
        email: staffForm.email.trim(),
        phone: staffForm.phone ? staffForm.phone.trim() : undefined,
        role: staffForm.role,
        isActive: staffForm.isActiveVal === 'true',
      });
      toast.success('Team member updated');
      setEditOpen(false);
      refreshStaff();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to update user');
    }
  };

  const onDeleteUser = async (id: string, name: string) => {
    const accepted = await confirm({
      title: 'Delete Team Member',
      description: `Are you sure you want to delete the account for "${name}"?`,
      confirmLabel: 'Delete Account',
      destructive: true,
    });
    if (!accepted) return;

    try {
      await usersService.remove(id);
      toast.success(`User "${name}" removed`);
      refreshStaff();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to delete user');
    }
  };

  return (
    <PageShell
      title="People & Directory"
      subtitle="Manage internal event staff accounts and explore client customer profiles with complete booking timelines."
    >
      {/* 1. Main Navigation Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 mb-6">
        <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all',
              activeTab === 'customers'
                ? 'bg-[#080C14] text-[#F3CA52] shadow-xs border border-[#D4AF37]/50'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            <Users size={15} />
            <span>Customers & Clients</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-black',
                activeTab === 'customers'
                  ? 'bg-[#F3CA52] text-[#080C14]'
                  : 'bg-slate-100 text-slate-500',
              )}
            >
              {customerRows.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all',
              activeTab === 'staff'
                ? 'bg-[#080C14] text-[#F3CA52] shadow-xs border border-[#D4AF37]/50'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            <ShieldCheck size={15} />
            <span>Team & Staff</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-black',
                activeTab === 'staff'
                  ? 'bg-[#F3CA52] text-[#080C14]'
                  : 'bg-slate-100 text-slate-500',
              )}
            >
              {staffRows.length}
            </span>
          </button>
        </div>

        {/* Action Button for Active Tab */}
        <div>
          {activeTab === 'staff' ? (
            <button
              type="button"
              onClick={() => {
                setStaffForm({
                  name: '',
                  email: '',
                  phone: '',
                  role: 'STAFF',
                  password: '',
                  isActiveVal: 'true',
                });
                setShowCreatePassword(false);
                setCreateOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#080C14] px-4 py-2.5 text-xs font-bold text-[#F3CA52] border border-[#D4AF37] shadow-xs hover:bg-[#121927] transition-all"
            >
              <UserPlus size={15} />
              <span>Add Team Member</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">
                Clients automatically sync from event quotes & portal requests
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. CUSTOMERS DIRECTORY TAB CONTENT */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          {/* Customer Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Clients</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-[#B8860B]">
                  <Users size={14} />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">{customerMetrics.totalClients}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Unique customer profiles</p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Confirmed Events</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={14} />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">{customerMetrics.totalBookings}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Bookings & signed contracts</p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">In Negotiation</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <Clock size={14} />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">{customerMetrics.inNegotiation}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Active quote discussions</p>
            </div>

            <div className="rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#080C14] to-[#121927] p-4 text-white shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">Total Portfolio</span>
                <TrendingUp size={15} className="text-[#F3CA52]" />
              </div>
              <p className="mt-2 text-2xl font-black font-mono text-[#F3CA52]">
                {formatInr(customerMetrics.totalValue)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Finalized contract value</p>
            </div>
          </div>

          {/* Search, Filter & View Mode Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customers by name, phone (+91), venue, or event..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-xs outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
              />
              {customerSearch && (
                <button
                  onClick={() => setCustomerSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter tabs */}
              <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setCustomerFilter('ALL')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-bold rounded-lg transition-all',
                    customerFilter === 'ALL'
                      ? 'bg-[#080C14] text-[#F3CA52]'
                      : 'text-slate-500 hover:text-slate-900',
                  )}
                >
                  All ({customerRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerFilter('BOOKED')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-bold rounded-lg transition-all',
                    customerFilter === 'BOOKED'
                      ? 'bg-[#080C14] text-[#F3CA52]'
                      : 'text-slate-500 hover:text-slate-900',
                  )}
                >
                  Confirmed Clients
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerFilter('QUOTED')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-bold rounded-lg transition-all',
                    customerFilter === 'QUOTED'
                      ? 'bg-[#080C14] text-[#F3CA52]'
                      : 'text-slate-500 hover:text-slate-900',
                  )}
                >
                  Inquiries Only
                </button>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setCustomerViewMode('grid')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
                    customerViewMode === 'grid'
                      ? 'bg-[#080C14] text-[#F3CA52]'
                      : 'text-slate-500 hover:text-slate-900',
                  )}
                >
                  <LayoutGrid size={14} />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerViewMode('table')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
                    customerViewMode === 'table'
                      ? 'bg-[#080C14] text-[#F3CA52]'
                      : 'text-slate-500 hover:text-slate-900',
                  )}
                >
                  <List size={14} />
                  <span className="hidden sm:inline">Table</span>
                </button>
              </div>
            </div>
          </div>

          {/* Customer Content Display */}
          {customerViewMode === 'grid' ? (
            filteredCustomers.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCustomers.map((customer) => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    onOpenProfile={() => setSelectedCustomer(customer)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <Users size={32} className="mx-auto text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-800">No customers found</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {customerSearch
                    ? `No clients matched "${customerSearch}". Try checking the phone number or name.`
                    : 'Customer profiles will appear automatically as quotations and portal bookings are made.'}
                </p>
              </div>
            )
          ) : (
            <Card className="p-0 overflow-hidden border-slate-200">
              <DataTable columns={customerColumns} data={filteredCustomers} />
            </Card>
          )}
        </div>
      )}

      {/* 3. TEAM & STAFF DIRECTORY TAB CONTENT */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          {/* Staff Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Staff</span>
              <p className="mt-2 text-2xl font-black text-slate-900">{staffMetrics.total}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Registered accounts</p>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Administrators</span>
              <p className="mt-2 text-2xl font-black text-[#B8860B]">{staffMetrics.admins}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Full admin control</p>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Coordinators</span>
              <p className="mt-2 text-2xl font-black text-sky-700">{staffMetrics.staff}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Staff & operations</p>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Accounts</span>
              <p className="mt-2 text-2xl font-black text-emerald-600">{staffMetrics.active}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Currently enabled</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Search staff by name, email, or role..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-xs outline-none focus:border-[#D4AF37]"
              />
              {staffSearch && (
                <button
                  onClick={() => setStaffSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <Card className="p-0 overflow-hidden border-slate-200">
            <DataTable columns={staffColumns} data={filteredStaff} />
          </Card>
        </div>
      )}

      {/* 4. Customer Details Profile Modal */}
      {selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onViewQuotation={(qNum) => {
            setSelectedCustomer(null);
            navigate(`/admin/quotations?search=${encodeURIComponent(qNum)}`);
          }}
        />
      )}

      {/* 5. Create Staff Dialog */}
      <FormDialog
        title="Add Team Member"
        description="Create a new administrator or event operations account"
        open={createOpen}
        onOpenChange={setCreateOpen}
      >
        <div className="space-y-3.5">
          <Field label="Full Name">
            <Input
              value={staffForm.name}
              placeholder="e.g. Rahul Nair"
              onChange={(e) => setStaffForm((s) => ({ ...s, name: e.target.value }))}
            />
          </Field>
          <Field label="Email Address">
            <Input
              type="email"
              value={staffForm.email}
              placeholder="e.g. rahul@thankam.com"
              onChange={(e) => setStaffForm((s) => ({ ...s, email: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone (10-digits)">
              <Input
                value={staffForm.phone}
                placeholder="9745XXXXXX"
                inputMode="numeric"
                maxLength={10}
                onChange={(e) =>
                  setStaffForm((s) => ({
                    ...s,
                    phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                  }))
                }
              />
            </Field>
            <Field label="Role">
              <SelectInput
                value={staffForm.role}
                onChange={(e) =>
                  setStaffForm((s) => ({ ...s, role: e.target.value as 'ADMIN' | 'STAFF' }))
                }
              >
                <option value="STAFF">STAFF (Operations)</option>
                <option value="ADMIN">ADMIN (Full Control)</option>
              </SelectInput>
            </Field>
          </div>
          <Field label="Initial Password">
            <div className="relative">
              <Input
                type={showCreatePassword ? 'text' : 'password'}
                value={staffForm.password}
                placeholder="••••••••••••"
                onChange={(e) => setStaffForm((s) => ({ ...s, password: e.target.value }))}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                onClick={() => setShowCreatePassword((prev) => !prev)}
                aria-label={showCreatePassword ? 'Hide password' : 'Show password'}
              >
                {showCreatePassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
          <FormDialogFooter className="flex justify-end gap-2">
            <Button variant="outline" className="h-9 rounded-xl text-xs" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <button
              type="button"
              onClick={() => void onCreateUser()}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-[#080C14] px-4 text-xs font-bold text-[#F3CA52] border border-[#D4AF37] hover:bg-[#121927]"
            >
              Create Account
            </button>
          </FormDialogFooter>
        </div>
      </FormDialog>

      {/* 6. Edit Staff Dialog */}
      <FormDialog
        title="Edit Team Member"
        description="Update staff profile, role, or active status"
        open={editOpen}
        onOpenChange={setEditOpen}
      >
        <div className="space-y-3.5">
          <Field label="Full Name">
            <Input
              value={staffForm.name}
              onChange={(e) => setStaffForm((s) => ({ ...s, name: e.target.value }))}
            />
          </Field>
          <Field label="Email Address">
            <Input
              type="email"
              value={staffForm.email}
              onChange={(e) => setStaffForm((s) => ({ ...s, email: e.target.value }))}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={staffForm.phone}
              inputMode="numeric"
              maxLength={10}
              onChange={(e) =>
                setStaffForm((s) => ({
                  ...s,
                  phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                }))
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <SelectInput
                value={staffForm.role}
                onChange={(e) =>
                  setStaffForm((s) => ({ ...s, role: e.target.value as 'ADMIN' | 'STAFF' }))
                }
              >
                <option value="STAFF">STAFF</option>
                <option value="ADMIN">ADMIN</option>
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput
                value={staffForm.isActiveVal}
                onChange={(e) => setStaffForm((s) => ({ ...s, isActiveVal: e.target.value }))}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </SelectInput>
            </Field>
          </div>
          <FormDialogFooter className="flex justify-end gap-2">
            <Button variant="outline" className="h-9 rounded-xl text-xs" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <button
              type="button"
              onClick={() => void onUpdateUser()}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-[#080C14] px-4 text-xs font-bold text-[#F3CA52] border border-[#D4AF37] hover:bg-[#121927]"
            >
              Save Changes
            </button>
          </FormDialogFooter>
        </div>
      </FormDialog>

      {confirmModal}
    </PageShell>
  );
}

/* ─────────────────────────────────────────────────────────────────
   CustomerCard — Luxury Presentation Card for Clients
───────────────────────────────────────────────────────────────── */
function CustomerCard({
  customer,
  onOpenProfile,
}: {
  customer: CustomerSummary;
  onOpenProfile: () => void;
}) {
  const isBooked = customer.totalBookings > 0;
  const cleanPhone = customer.phone.replace(/\D/g, '');

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D4AF37]/60 hover:shadow-md">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#080C14] text-[#F3CA52] font-black text-xs border border-[#D4AF37]/40 shadow-xs">
              {customer.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#B8860B] transition-colors leading-tight truncate">
                {customer.name}
              </h3>
              <p className="font-mono text-xs text-slate-500 mt-0.5">{customer.phone}</p>
            </div>
          </div>

          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border',
              isBooked
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200',
            )}
          >
            {isBooked ? `${customer.totalBookings} Booked` : 'Inquiry'}
          </span>
        </div>

        {/* Location & Latest Event */}
        <div className="mt-4 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
          {customer.address && (
            <div className="flex items-center gap-2 text-slate-500">
              <MapPin size={13} className="shrink-0 text-[#B8860B]" />
              <span className="truncate">{customer.address}</span>
            </div>
          )}

          {customer.lastEventType && (
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar size={13} className="shrink-0 text-slate-400" />
              <span className="truncate font-medium">{customer.lastEventType}</span>
              {customer.lastEventDate && (
                <span className="text-[11px] text-slate-400 font-mono">
                  ({new Date(customer.lastEventDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Financial Value */}
        <div className="mt-3.5 flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-100">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Quotes</span>
            <span className="text-xs font-bold text-slate-800">{customer.totalQuotations} records</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Lifetime Value</span>
            <span className="text-xs font-mono font-black text-[#B8860B]">
              {customer.lifetimeValue > 0 ? formatInr(customer.lifetimeValue) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        {/* Quick Contact Links */}
        <div className="flex items-center gap-2">
          {cleanPhone && (
            <>
              <a
                href={`tel:${cleanPhone}`}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                title="Call client"
              >
                <Phone size={12} />
              </a>
              <a
                href={`https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(
                  `Hello ${customer.name}, greetings from Thankam Events & Catering!`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                title="Message on WhatsApp"
              >
                <MessageCircle size={12} />
              </a>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenProfile}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-[#B8860B] transition-colors"
        >
          <span>View Details</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   CustomerDetailsModal — Complete Profile & Event Timeline Drawer
───────────────────────────────────────────────────────────────── */
function CustomerDetailsModal({
  customer,
  onClose,
  onViewQuotation,
}: {
  customer: CustomerSummary;
  onClose: () => void;
  onViewQuotation: (quotationNumber: string) => void;
}) {
  const cleanPhone = customer.phone.replace(/\D/g, '');

  return (
    <FormDialog
      title={customer.name}
      description={`Customer profile & booking portfolio for ${customer.phone}`}
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      contentClassName="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0"
      bodyClassName="p-0 flex-1 overflow-y-auto"
    >
      <div className="p-5 space-y-5">
        {/* 1. Customer Hero Banner */}
        <div className="rounded-2xl bg-[#080C14] p-5 text-white border border-[#D4AF37]/30 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#121927] to-[#1e2a40] text-[#F3CA52] font-black text-xl border border-[#D4AF37]/40 shadow-sm">
                {customer.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="text-lg font-black text-white">{customer.name}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
                  <Phone size={12} className="text-[#F3CA52]" />
                  <span className="font-mono">{customer.phone}</span>
                  {customer.address && (
                    <>
                      <span>•</span>
                      <MapPin size={12} className="text-[#D4AF37]" />
                      <span>{customer.address}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Direct Contact Actions */}
            <div className="flex items-center gap-2">
              {cleanPhone && (
                <>
                  <a
                    href={`https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(
                      `Hello ${customer.name}, greetings from Thankam Events & Catering! We are following up regarding your event plans.`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs"
                  >
                    <MessageCircle size={14} />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`tel:${cleanPhone}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20 border border-white/20"
                  >
                    <Phone size={14} />
                    <span>Call Client</span>
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 border-t border-white/10 pt-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Quotes</span>
              <span className="text-sm font-bold text-white">{customer.totalQuotations} records</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Confirmed Events</span>
              <span className="text-sm font-bold text-emerald-400">
                {customer.totalBookings} booked
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#D4AF37] block">Lifetime Value</span>
              <span className="text-sm font-mono font-black text-[#F3CA52]">
                {formatInr(customer.lifetimeValue)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">First Contact</span>
              <span className="text-xs font-mono text-slate-300">
                {customer.firstContactAt
                  ? new Date(customer.firstContactAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Quotation & Booking History Timeline */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <FileText size={14} className="text-[#B8860B]" />
              <span>Event Quotations & Contracts History ({customer.quotations.length})</span>
            </h5>
          </div>

          {customer.quotations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No quotations recorded for this client.
            </div>
          ) : (
            <div className="space-y-2.5">
              {customer.quotations.map((q) => {
                const totalNum = Number(q.grandTotal || 0);
                const isFinalized = q.status === 'FINALIZED';
                const isAccepted = q.agreementStatus === 'ACCEPTED';

                return (
                  <div
                    key={q.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-[#D4AF37]/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-900">
                          {q.quotationNumber}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-bold border',
                            isAccepted
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isFinalized
                                ? 'bg-sky-50 text-sky-800 border-sky-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200',
                          )}
                        >
                          {isAccepted
                            ? 'Agreement Accepted'
                            : isFinalized
                              ? 'Finalized'
                              : q.status}
                        </span>
                        {q.requestStatus && (
                          <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.2 text-[10px] font-semibold">
                            Req: {q.requestStatus}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                        <span className="font-semibold text-slate-800">{q.eventType}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-500">
                          {new Date(q.eventDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span>•</span>
                        <span className="text-slate-500">{q.venue}</span>
                        {q.guestCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500">{q.guestCount} guests</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:text-right shrink-0">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Grand Total</span>
                        <span className="text-xs font-mono font-bold text-[#B8860B]">
                          {formatInr(totalNum)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onViewQuotation(q.quotationNumber)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-[#080C14] hover:text-[#F3CA52] hover:border-[#D4AF37] transition-all"
                      >
                        <span>View Quote</span>
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white px-5 py-3 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          Customer Phone: <strong className="font-mono text-slate-700">{customer.phone}</strong>
        </span>
        <Button variant="outline" className="h-8 px-4 text-xs rounded-xl" onClick={onClose}>
          Close Profile
        </Button>
      </div>
    </FormDialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}
