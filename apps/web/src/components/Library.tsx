import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { MediaKind } from '@tulu/shared';
import { api, ApiRequestError } from '../api/client';
import { useDebounced } from '../lib/useDebounced';
import { MOVIE_STATUS_OPTIONS, SERIES_STATUS_OPTIONS } from '../lib/ui-mapping';
import { AddTitleModal } from './AddTitleModal';
import { EntryCard } from './entries';
import type { Entry } from './entries';
import { PageHeader } from './PageHeader';
import { TitleEditor } from './TitleEditor';
import { useToast } from './ToastHost';
import { Banner, Button, EmptyState, IconButton, SearchBar, Select } from './ui';

export function Library({ kind }: { kind: MediaKind }) {
  const noun = kind === 'tv' ? 'series' : 'movie';
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [genre, setGenre] = useState('');
  const [view, setView] = useState<'grid' | 'list'>(() => {
    try { return localStorage.getItem('tt-view') === 'list' ? 'list' : 'grid'; } catch { return 'grid'; }
  });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const toast = useToast();
  const q = useDebounced(text.trim(), 250);

  const params = { q: q || undefined, status: status || undefined, genre: genre ? Number(genre) : undefined };
  const list = useQuery({
    queryKey: [kind === 'tv' ? 'series' : 'movies', params],
    queryFn: async (): Promise<Entry[]> =>
      kind === 'tv'
        ? (await api.series.list(params)).map((item) => ({ kind: 'series' as const, item }))
        : (await api.movies.list(params)).map((item) => ({ kind: 'movie' as const, item })),
  });
  const genres = useQuery({ queryKey: ['genres'], queryFn: api.genres });

  const filtered = !!(q || status || genre);
  const options = useMemo(
    () => [{ value: '', label: 'All statuses' }, ...(kind === 'tv' ? SERIES_STATUS_OPTIONS : MOVIE_STATUS_OPTIONS)],
    [kind],
  );
  const setViewPersist = (v: 'grid' | 'list') => {
    setView(v);
    try { localStorage.setItem('tt-view', v); } catch { /* storage unavailable */ }
  };

  const err = list.error as ApiRequestError | null;

  return (
    <section>
      <PageHeader
        eyebrow="The archive"
        title={kind === 'tv' ? 'TV Series' : 'Movies'}
        actions={<Button icon="plus" onClick={() => setAdding(true)}>Add {noun}</Button>}
      />
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <SearchBar value={text} onChange={setText} shortcut label={`Search ${noun === 'series' ? 'series' : 'movies'}`} className="min-w-60 flex-1" />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={options} className="w-44" />
        <Select
          label="Genre"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          options={[{ value: '', label: 'All genres' }, ...(genres.data ?? []).map((g) => ({ value: String(g.id), label: g.name }))]}
          className="w-44"
        />
        <div className="tt-segment" role="group" aria-label="View">
          <IconButton icon="grid" label="Grid view" aria-pressed={view === 'grid'} onClick={() => setViewPersist('grid')} />
          <IconButton icon="list" label="List view" aria-pressed={view === 'list'} onClick={() => setViewPersist('list')} />
        </div>
      </div>

      {err && <Banner tone="error" title="Could not load your library." action={{ label: 'Retry', onClick: () => void list.refetch() }}>{err.message}</Banner>}

      {list.data && list.data.length === 0 && !err && (
        filtered ? (
          <EmptyState title="Nothing matches" actions={<Button variant="outline" onClick={() => { setText(''); setStatus(''); setGenre(''); }}>Clear filters</Button>}>
            No {noun === 'series' ? 'series' : 'movies'} fit those filters.
          </EmptyState>
        ) : (
          <EmptyState title="The stage is empty" actions={<Button icon="plus" onClick={() => setAdding(true)}>Add {noun}</Button>}>
            Add your first {noun} to start building the archive.
          </EmptyState>
        )
      )}

      {list.data && list.data.length > 0 && (
        <div className={view === 'grid' ? 'grid gap-6' : 'flex flex-col gap-3'} style={view === 'grid' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' } : undefined}>
          {list.data.map((e) => <EntryCard key={`${e.kind}-${e.item.id}`} entry={e} variant={view} onOpen={setEditing} />)}
        </div>
      )}

      <AddTitleModal kind={kind} open={adding} onClose={() => setAdding(false)} onAdded={(t) => toast({ title: `${t} added to the archive` })} />
      <TitleEditor entry={editing} onClose={() => setEditing(null)} />
    </section>
  );
}
