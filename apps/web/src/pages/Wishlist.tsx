import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { EntryCard } from '../components/entries';
import type { Entry } from '../components/entries';
import { PageHeader } from '../components/PageHeader';
import { TitleEditor } from '../components/TitleEditor';
import { Banner, EmptyState, Tabs } from '../components/ui';

/** A filtered view (status = Wishlist) over the same series and movie tables. */
export function Wishlist() {
  const [tab, setTab] = useState('all');
  const [editing, setEditing] = useState<Entry | null>(null);
  const series = useQuery({ queryKey: ['series', { status: 'WISHLIST' }], queryFn: () => api.series.list({ status: 'WISHLIST' }) });
  const movies = useQuery({ queryKey: ['movies', { status: 'WISHLIST' }], queryFn: () => api.movies.list({ status: 'WISHLIST' }) });

  const s: Entry[] = (series.data ?? []).map((item) => ({ kind: 'series', item }));
  const m: Entry[] = (movies.data ?? []).map((item) => ({ kind: 'movie', item }));
  const shown = tab === 'tv' ? s : tab === 'movie' ? m : [...s, ...m].sort((a, b) => a.item.title.localeCompare(b.item.title));
  const err = (series.error ?? movies.error) as Error | null;

  return (
    <section>
      <PageHeader eyebrow="The archive" title="Wishlist" />
      <Tabs
        label="Wishlist type"
        value={tab}
        onChange={setTab}
        tabs={[{ id: 'all', label: 'All', count: s.length + m.length }, { id: 'tv', label: 'Series', count: s.length }, { id: 'movie', label: 'Movies', count: m.length }]}
        className="mb-6"
      />
      {err && <Banner tone="error" title="Could not load the wishlist.">{err.message}</Banner>}
      {!err && series.data && movies.data && shown.length === 0 && (
        <EmptyState title="Nothing waiting in the wings">Series and movies with the Wishlist status gather here. Add them from TV Series or Movies.</EmptyState>
      )}
      {shown.length > 0 && (
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
          {shown.map((e) => <EntryCard key={`${e.kind}-${e.item.id}`} entry={e} variant="grid" onOpen={setEditing} />)}
        </div>
      )}
      <TitleEditor entry={editing} onClose={() => setEditing(null)} />
    </section>
  );
}
