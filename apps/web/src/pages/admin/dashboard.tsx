import { useEffect, useState } from 'react';
import { ArrowUpRight, ChartBar, Image, LayoutGrid, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '@/layouts/page-shell';
import { dashboardService, DashboardStats } from '@/features/dashboard/dashboard.service';
import { StatCard } from '@/components/common/stat-card';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/common/data-table';
import type { MRT_ColumnDef } from 'material-react-table';
import { Button } from '@/components/ui/button';
import { toMediaUrl } from '@/utils/media-url';
import { formatInr } from '@/utils/currency';

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    void dashboardService.getStats().then(setStats);
  }, []);

  const columns: MRT_ColumnDef<any>[] = [
    { accessorKey: 'quotationNumber', header: 'Quotation #' },
    { accessorKey: 'customerName', header: 'Customer' },
    {
      accessorKey: 'grandTotal',
      header: 'Total',
      Cell: ({ row }) => formatInr(row.original.grandTotal),
    },
  ];

  return (
    <PageShell title="Admin Dashboard" subtitle="Overview of quotations, media and master data">
      <Card className="overflow-hidden border-none bg-gradient-to-r from-slate-900 via-teal-900 to-cyan-900 p-0 text-white">
        <div className="grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/90">
              <Sparkles size={13} /> Operations Center
            </p>
            <h3 className="text-2xl font-extrabold tracking-tight md:text-3xl">Ready to generate today's event quotations</h3>
            <p className="mt-2 max-w-2xl text-sm text-cyan-100/90">
              Track categories, build menus, and produce polished quotation PDFs with one unified workflow.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              className="bg-white text-slate-900 shadow-none hover:bg-slate-100"
              onClick={() => navigate('/admin/quotations')}
            >
              Create Quotation
            </Button>
            <Button
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              onClick={() => navigate('/admin/menus')}
            >
              Open Menus <ArrowUpRight size={14} className="ml-2" />
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Categories"
          value={stats?.cards.totalCategories ?? 0}
          icon={<LayoutGrid size={18} />}
        />
        <StatCard title="Total Items" value={stats?.cards.totalItems ?? 0} icon={<ChartBar size={18} />} />
        <StatCard title="Total Menus" value={stats?.cards.totalMenus ?? 0} icon={<LayoutGrid size={18} />} />
        <StatCard title="Total Users" value={stats?.cards.totalUsers ?? 0} icon={<Users size={18} />} />
      </div>

      <Card>
        <h3 className="mb-3 text-xl font-bold tracking-tight">Recent Quotations</h3>
        <DataTable columns={columns} data={stats?.recentQuotations ?? []} />
      </Card>

      <Card>
        <h3 className="mb-4 flex items-center gap-2 text-xl font-bold tracking-tight">
          <Image size={18} /> Recent Uploads
        </h3>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {(stats?.recentUploads ?? []).map((asset) => (
            <div
              key={asset.id}
              className="group overflow-hidden rounded-xl border border-border bg-slate-100 shadow-sm"
            >
              {asset.type === 'IMAGE' ? (
                <img
                  src={toMediaUrl(asset.url)}
                  alt="upload"
                  className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <video src={toMediaUrl(asset.url)} className="h-28 w-full object-cover" />
              )}
            </div>
          ))}

          {(stats?.recentUploads?.length ?? 0) === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-slate-50 p-10 text-center text-sm text-slate-500">
              No uploads yet. Start adding images and videos from Gallery.
            </div>
          ) : null}
        </div>
      </Card>
    </PageShell>
  );
}
