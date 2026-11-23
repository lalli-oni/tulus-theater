import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AddedBy, MovieStatus, SeriesStatus } from '@tulu/shared';
import { api } from '../api/client';
import { ADDED_BY_OPTIONS, MOVIE_STATUS_OPTIONS, SERIES_STATUS_OPTIONS, formatRuntime, releaseState } from '../lib/ui-mapping';
import type { Entry } from './entries';
import { Banner, Button, Dialog, Input, Modal, ReleaseBadge, Select, Textarea } from './ui';

export function TitleEditor({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  // Remount the form whenever a different title is opened.
  return entry ? <Editor key={`${entry.kind}-${entry.item.id}`} entry={entry} onClose={onClose} /> : null;
}

function Editor({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const qc = useQueryClient();
  const item = entry.item;
  const [status, setStatus] = useState<string>(item.status);
  const [addedBy, setAddedBy] = useState<AddedBy>(item.addedBy);
  const [suggestedBy, setSuggestedBy] = useState(item.suggestedBy ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [rating, setRating] = useState(item.rating != null ? String(item.rating) : '');
  const [tags, setTags] = useState(entry.kind === 'movie' ? entry.item.tags.join(', ') : '');
  const [dateWatched, setDateWatched] = useState(item.dateWatched ? item.dateWatched.slice(0, 10) : '');
  const [confirmRemove, setConfirmRemove] = useState(false);

  const key = entry.kind === 'series' ? 'series' : 'movies';
  const ratingNum = rating.trim() === '' ? null : Number(rating);
  const ratingError = ratingNum !== null && (Number.isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) ? 'Enter a rating from 0 to 5' : undefined;

  const save = useMutation({
    mutationFn: async (): Promise<unknown> => {
      const common = {
        addedBy,
        suggestedBy: suggestedBy.trim() || null,
        notes: notes.trim() || null,
        rating: ratingNum,
        dateWatched: dateWatched || null,
      };
      return entry.kind === 'series'
        ? api.series.update(item.id, { ...common, status: status as SeriesStatus })
        : api.movies.update(item.id, {
            ...common,
            status: status as MovieStatus,
            tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [key] });
      onClose();
    },
  });

  const remove = useMutation({
    mutationFn: () => (entry.kind === 'series' ? api.series.remove(item.id) : api.movies.remove(item.id)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [key] });
      await qc.invalidateQueries({ queryKey: ['genres'] });
      onClose();
    },
  });

  const meta = [
    entry.kind === 'movie' && entry.item.releaseDate ? String(new Date(entry.item.releaseDate).getUTCFullYear()) : null,
    entry.kind === 'movie' ? formatRuntime(entry.item.runtime) : entry.item.episodeRuntime ? `${entry.item.episodeRuntime}m episodes` : null,
    entry.kind === 'series' && entry.item.numberOfSeasons ? `${entry.item.numberOfSeasons} seasons` : null,
    entry.kind === 'series' && entry.item.numberOfEpisodes ? `${entry.item.numberOfEpisodes} episodes` : null,
  ].filter(Boolean).join(' · ');

  return (
    <>
      <Modal
        open={!confirmRemove}
        wide
        title={item.title}
        onClose={onClose}
        footer={
          <>
            <Button variant="danger" onClick={() => setConfirmRemove(true)} className="mr-auto">Remove</Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !!ratingError}>{save.isPending ? 'Saving…' : 'Save changes'}</Button>
          </>
        }
      >
        <div className="flex gap-5 max-sm:flex-col">
          {item.posterUrl && <img src={item.posterUrl} alt="" className="h-60 w-40 shrink-0 rounded-md object-cover max-sm:hidden" />}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {meta && <span className="tt-mono text-text-muted">{meta}</span>}
              {entry.kind === 'series' && releaseState(entry.item.tmdbStatus) && <ReleaseBadge state={releaseState(entry.item.tmdbStatus)!} />}
              {item.genres.map((g) => <span key={g.id} className="tt-badge tt-tone-silver">{g.name}</span>)}
            </div>
            {item.synopsis && <p className="text-body-lg text-text-secondary">{item.synopsis}</p>}
            <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={entry.kind === 'series' ? SERIES_STATUS_OPTIONS : MOVIE_STATUS_OPTIONS} />
              <Select label="Added by" value={addedBy} onChange={(e) => setAddedBy(e.target.value as AddedBy)} options={ADDED_BY_OPTIONS} />
              <Input label="Suggested by" value={suggestedBy} onChange={(e) => setSuggestedBy(e.target.value)} maxLength={200} />
              <Input label="Rating (0 to 5)" inputMode="decimal" value={rating} onChange={(e) => setRating(e.target.value)} error={ratingError} />
              <Input label="Date watched" type="date" value={dateWatched} onChange={(e) => setDateWatched(e.target.value)} />
              {entry.kind === 'movie' && <Input label="Tags" hint="Comma separated" value={tags} onChange={(e) => setTags(e.target.value)} />}
            </div>
            <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
            {save.error && <Banner tone="error" title="Could not save.">{(save.error as Error).message}</Banner>}
            {remove.error && <Banner tone="error" title="Could not remove it.">{(remove.error as Error).message}</Banner>}
          </div>
        </div>
      </Modal>
      <Dialog
        open={confirmRemove}
        tone="danger"
        title="Remove from the archive?"
        confirmLabel={remove.isPending ? 'Removing…' : 'Remove'}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => remove.mutate()}
      >
        <p>{item.title} and your notes and progress for it will be deleted. This cannot be undone.</p>
      </Dialog>
    </>
  );
}
