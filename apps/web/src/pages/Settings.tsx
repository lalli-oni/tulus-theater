import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { RecentChanges } from '../components/RecentChanges';
import { Banner } from '../components/ui';
import { fetchUnknowns, UNKNOWNS_KEY } from './Unknowns';

export function Settings() {
  const health = useQuery({ queryKey: ['health'], queryFn: api.health });
  const unknowns = useQuery({ queryKey: UNKNOWNS_KEY, queryFn: fetchUnknowns });
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ['settings'], queryFn: api.settings.get });
  const save = useMutation({ mutationFn: api.settings.save, onSuccess: (s) => qc.setQueryData(['settings'], s) });
  return (
    <section>
      <PageHeader eyebrow="Backstage" title="Settings" />
      <div className="flex max-w-2xl flex-col gap-3">
        {health.isError && (
          <Banner tone="error" title="The local server is not responding.">
            Start it with <span className="tt-mono">npm run dev</span> and reload. Your saved library is unaffected.
          </Banner>
        )}
        {health.data && !health.data.tmdbConfigured && (
          <Banner tone="warning" title="TMDB key not set.">
            Add <span className="tt-mono">TMDB_API_KEY</span> to <span className="tt-mono">.env</span> and restart to search and refresh titles.
          </Banner>
        )}
        {health.data?.tmdbConfigured && <Banner tone="success" title="TMDB connected.">Search and metadata refresh are available.</Banner>}
        {(unknowns.data?.length ?? 0) > 0 && (
          <Banner tone="info" title={`${unknowns.data!.length} titles have no owner yet.`}>
            <Link to="/unknowns" className="text-text-link underline">Fill in unknowns</Link>
          </Banner>
        )}
        {health.isPending && <p className="text-text-secondary">Checking the server…</p>}
      </div>

      <div className="mt-10 flex max-w-2xl flex-col gap-3">
        <h2 className="font-display text-heading-lg">Automation</h2>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border-subtle bg-surface-raised p-4">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-violet-500"
            checked={settings.data?.automation.progressStatus ?? true}
            disabled={!settings.data || save.isPending}
            onChange={(e) => save.mutate({ automation: { progressStatus: e.target.checked } })}
          />
          <span>
            <span className="block font-semibold">Update status from my progress</span>
            <span className="block text-body-sm text-text-secondary">
              Watching an episode moves a series to Watching, and finishing everything released moves it to Up to date, or Completed once it has ended. Only your own progress actions do this, never TMDB changes. Every change can be undone below.
            </span>
          </span>
        </label>
        {save.error && <Banner tone="error" title="Could not save the setting.">{(save.error as Error).message}</Banner>}
      </div>

      <div className="mt-10 flex max-w-2xl flex-col gap-3">
        <h2 className="font-display text-heading-lg">Recent changes</h2>
        <RecentChanges limit={10} showTitle />
      </div>
    </section>
  );
}
