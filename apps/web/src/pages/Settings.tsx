import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Badge } from '../components/ui/Badge';

export function Settings() {
  const health = useQuery({ queryKey: ['health'], queryFn: api.health });
  return (
    <section>
      <h1 className="mb-6 text-3xl">Settings</h1>
      <div className="rounded-lg border border-charcoal-line bg-charcoal p-4">
        <h2 className="mb-3 text-lg">Status</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            API: {health.isPending ? <Badge>checking…</Badge> : health.isError ? <Badge tone="muted">offline</Badge> : <Badge tone="emerald">connected</Badge>}
          </li>
          <li className="flex items-center gap-2">
            TMDB key: {health.data?.tmdbConfigured ? <Badge tone="emerald">configured</Badge> : <Badge tone="violet">not set (add TMDB_API_KEY to .env)</Badge>}
          </li>
        </ul>
      </div>
    </section>
  );
}
