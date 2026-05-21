import { PageShell } from '@/layouts/page-shell';
import { Card } from '@/components/ui/card';

export function NotFoundPage() {
  return (
    <PageShell title="Page Not Found">
      <Card>
        <p>The page you requested does not exist.</p>
      </Card>
    </PageShell>
  );
}
