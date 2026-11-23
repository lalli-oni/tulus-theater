import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddedBy, MediaKind, TmdbSearchResult } from '@tulu/shared';
import { api, ApiRequestError } from '../api/client';
import { useDebounced } from '../lib/useDebounced';
import { ADDED_BY_OPTIONS, MOVIE_STATUS_OPTIONS, SERIES_STATUS_OPTIONS } from '../lib/ui-mapping';
import { Banner, Button, Input, Modal, Select } from './ui';

export function AddTitleModal({ kind, open, defaultStatus, onClose, onAdded }: {
  kind: MediaKind;
  open: boolean;
  defaultStatus?: string;
  onClose: () => void;
  onAdded?: (title: string) => void;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<TmdbSearchResult | null>(null);
  const [addedBy, setAddedBy] = useState<AddedBy>('ALECHA');
  const [suggestedBy, setSuggestedBy] = useState('');
  const [status, setStatus] = useState(defaultStatus ?? 'WISHLIST');
  const q = useDebounced(text.trim());

  const search = useQuery({
    queryKey: ['tmdb-search', kind, q],
    queryFn: () => api.search(kind, q),
    enabled: open && q.length >= 2,
    staleTime: 60_000,
    retry: false,
  });

  const add = useMutation({
    mutationFn: async (): Promise<unknown> => {
      const base = { tmdbId: picked!.tmdbId, addedBy, suggestedBy: suggestedBy.trim() || null };
      return kind === 'tv'
        ? api.series.create({ ...base, status: status as 'WISHLIST' })
        : api.movies.create({ ...base, status: status as 'WISHLIST' });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [kind === 'tv' ? 'series' : 'movies'] });
      await qc.invalidateQueries({ queryKey: ['genres'] });
      onAdded?.(picked!.title);
      close();
    },
  });

  const close = () => {
    setText('');
    setPicked(null);
    setSuggestedBy('');
    add.reset();
    onClose();
  };

  const noun = kind === 'tv' ? 'series' : 'movie';
  const err = search.error as ApiRequestError | null;

  return (
    <Modal
      open={open}
      wide
      title={picked ? `Add ${picked.title}` : `Add ${noun}`}
      onClose={close}
      footer={
        picked ? (
          <>
            <Button variant="ghost" onClick={() => { setPicked(null); add.reset(); }}>Back to search</Button>
            <Button onClick={() => add.mutate()} disabled={add.isPending}>{add.isPending ? 'Adding…' : `Add ${noun}`}</Button>
          </>
        ) : (
          <Button variant="ghost" onClick={close}>Close</Button>
        )
      }
    >
      {!picked ? (
        <div className="flex flex-col gap-4">
          <Input label={`Search TMDB for a ${noun}`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Start typing a title…" autoComplete="off" />
          {err && (
            <Banner tone={err.code === 'not_configured' ? 'warning' : 'error'} title={err.code === 'not_configured' ? 'TMDB key not set.' : 'TMDB search failed.'}>
              {err.code === 'not_configured' ? 'Add TMDB_API_KEY to .env and restart the server.' : err.message}
            </Banner>
          )}
          {search.data?.stale && <Banner tone="warning" title="TMDB is unreachable.">Showing cached results.</Banner>}
          {search.isFetching && <p className="text-body-sm text-text-muted">Searching…</p>}
          {search.data && search.data.results.length === 0 && !search.isFetching && <p className="text-text-secondary">No matches. Try a different spelling.</p>}
          <ul className="m-0 flex max-h-96 list-none flex-col gap-2 overflow-y-auto p-0">
            {search.data?.results.map((r) => (
              <li key={r.tmdbId}>
                <button
                  type="button"
                  disabled={r.inLibrary}
                  onClick={() => setPicked(r)}
                  className="flex w-full items-center gap-3 rounded-md border border-border-default bg-surface-raised p-2 text-left text-text-primary hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {r.posterUrl ? <img src={r.posterUrl} alt="" className="h-16 w-11 rounded-sm object-cover" loading="lazy" /> : <span className="h-16 w-11 rounded-sm bg-surface-velvet" aria-hidden="true" />}
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{r.title} {r.year && <span className="tt-mono text-text-muted">({r.year})</span>}</span>
                    {r.overview && <span className="line-clamp-2 text-body-sm text-text-secondary">{r.overview}</span>}
                  </span>
                  {r.inLibrary && <span className="tt-badge tt-tone-silver shrink-0">In library</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Select label="Added by" value={addedBy} onChange={(e) => setAddedBy(e.target.value as AddedBy)} options={ADDED_BY_OPTIONS} />
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={kind === 'tv' ? SERIES_STATUS_OPTIONS : MOVIE_STATUS_OPTIONS} />
          </div>
          <Input label="Suggested by" hint="Optional. Who recommended it?" value={suggestedBy} onChange={(e) => setSuggestedBy(e.target.value)} maxLength={200} />
          {add.error && <Banner tone="error" title="Could not add it.">{(add.error as Error).message}</Banner>}
        </div>
      )}
    </Modal>
  );
}
