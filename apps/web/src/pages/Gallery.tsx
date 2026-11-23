import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import {
  AddedByBadge, Banner, Button, Chip, Dialog, EmptyState, Input, NewEpisodesBadge, OrnamentRule, PosterCard,
  ReleaseBadge, SearchBar, Select, StatusBadge, Tabs, Toast,
} from '../components/ui';
import type { MovieStatusKey, SeriesStatusKey } from '../components/ui';

const SERIES: SeriesStatusKey[] = ['wishlist', 'watching', 'up-to-date', 'on-hold', 'completed', 'dropped'];
const MOVIES: MovieStatusKey[] = ['wishlist', 'watched', 'dropped'];

/** Design-system reference page at /design. Handy for checking the theme while building. */
export function Gallery() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  return (
    <section className="flex flex-col gap-10">
      <PageHeader eyebrow="Backstage" title="Design system" />

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-heading-lg">Posters</h2>
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
          <PosterCard title="The Lantern Hour" year={2024} status="watching" releaseState="returning" addedBy="alecha" newEpisodes={2} progress={{ season: 2, episode: 4, watched: 12, total: 18 }} />
          <PosterCard title="Severance" year={2022} status="up-to-date" releaseState="returning" addedBy="lalli" progress={{ season: 2, episode: 10, watched: 19, total: 19 }} selected />
          <PosterCard title="Fringe" year={2008} status="completed" releaseState="ended" addedBy="unknown" />
          <PosterCard title="Pluribus" status="wishlist" releaseState="in-production" addedBy="lalli" />
        </div>
        <div className="flex max-w-3xl flex-col gap-3">
          <PosterCard variant="list" title="Peaky Blinders" year={2013} status="on-hold" releaseState="ended" addedBy="alecha" overview="A gangster family epic set in 1900s England." progress={{ season: 3, episode: 2, watched: 14, total: 36 }} />
        </div>
      </div>

      <OrnamentRule variant="phases" />

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-heading-lg">Badges</h2>
        <div className="flex flex-wrap gap-2">{SERIES.map((s) => <StatusBadge key={s} status={s} />)}</div>
        <div className="flex flex-wrap gap-2">{MOVIES.map((s) => <StatusBadge key={s} kind="movie" status={s} />)}</div>
        <div className="flex flex-wrap gap-2">
          <ReleaseBadge state="returning" /><ReleaseBadge state="ended" /><ReleaseBadge state="canceled" /><ReleaseBadge state="in-production" />
          <AddedByBadge person="alecha" /><AddedByBadge person="lalli" /><AddedByBadge person="unknown" /><NewEpisodesBadge count={3} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-heading-lg">Controls</h2>
        <div className="flex flex-wrap gap-3">
          <Button icon="plus">Add series</Button><Button variant="secondary" icon="check">Mark watched</Button>
          <Button variant="outline">Edit</Button><Button variant="ghost">Cancel</Button><Button variant="danger" onClick={() => setOpen(true)}>Remove</Button><Button disabled>Disabled</Button>
        </div>
        <div className="grid max-w-3xl gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <SearchBar value={q} onChange={setQ} shortcut />
          <Select label="Status" options={['All statuses', 'Watching', 'Wishlist']} />
          <Input label="Suggested by" hint="Optional free text" placeholder="Who recommended it?" />
          <Input label="Season" error="Enter a number from 1 to 5" defaultValue="9" />
        </div>
        <div className="flex flex-wrap gap-2"><Chip selected count={12}>Drama</Chip><Chip count={4}>Comedy</Chip><Chip onRemove={() => {}}>Anime</Chip></div>
        <Tabs label="Wishlist" tabs={[{ id: 'all', label: 'All', count: 34 }, { id: 'tv', label: 'Series', count: 22 }, { id: 'film', label: 'Movies', count: 12 }]} value={tab} onChange={setTab} />
      </div>

      <div className="flex max-w-xl flex-col gap-3">
        <h2 className="font-display text-heading-lg">Messages</h2>
        <Banner tone="error" title="TMDB is unreachable.">Showing details cached 2 hours ago. Your lists and progress still work.</Banner>
        <Toast tone="success" title="Added to the archive" action={{ label: 'Undo', icon: 'undo' }} />
        <EmptyState title="The stage is empty" actions={<Button icon="plus">Add series</Button>}>Add your first series to start the archive.</EmptyState>
      </div>

      <Dialog open={open} tone="danger" title="Remove from the archive?" confirmLabel="Remove" onConfirm={() => setOpen(false)} onCancel={() => setOpen(false)}>
        <p>Severance and its progress will be deleted. This cannot be undone.</p>
      </Dialog>
    </section>
  );
}
