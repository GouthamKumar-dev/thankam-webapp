import { useEffect, useState } from 'react';
import { PageShell } from '@/layouts/page-shell';
import { dashboardService, DashboardStats } from '@/features/dashboard/dashboard.service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toMediaUrl } from '@/utils/media-url';

export function StaffDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    void dashboardService.getStats().then(setStats);
  }, []);

  return (
    <PageShell title="Staff Dashboard" subtitle="Recent uploads and quick actions">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="mb-2 text-lg font-semibold">Assigned Tasks</h3>
          <p className="text-sm text-slate-600">
            Task assignment integration is ready for API binding.
          </p>
        </Card>
        <Card>
          <h3 className="mb-2 text-lg font-semibold">Quick Upload</h3>
          <p className="mb-3 text-sm text-slate-600">
            Upload image and video content directly to your gallery.
          </p>
          <Button>Start Upload</Button>
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 text-lg font-semibold">Recent Uploads</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(stats?.recentUploads ?? []).map((asset) => (
            <div key={asset.id} className="overflow-hidden rounded-md border border-border">
              {asset.type === 'IMAGE' ? (
                <img src={toMediaUrl(asset.url)} alt="upload" className="h-28 w-full object-cover" />
              ) : (
                <video src={toMediaUrl(asset.url)} className="h-28 w-full object-cover" />
              )}
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
