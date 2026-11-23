import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { Banner } from '../components/ui';
import { fetchUnknowns, UNKNOWNS_KEY } from './Unknowns';

export function Settings() {
  const health = useQuery({ queryKey: ['health'], queryFn: api.health });
  const unknowns = useQuery({ queryKey: UNKNOWNS_KEY, queryFn: fetchUnknowns });
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
    </section>
  );
}
