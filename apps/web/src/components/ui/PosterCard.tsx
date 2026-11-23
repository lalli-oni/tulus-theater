import { AddedByBadge, NewEpisodesBadge, ReleaseBadge, StatusBadge } from './Badges';
import { Moon, Sigil } from './Ornaments';
import type { MoonPhase, MovieStatusKey, Person, ReleaseState, SeriesStatusKey } from './types';
import { cx } from './types';

const PLATES = ['velvet', 'violet', 'emerald', 'wood'] as const;
const PLATE_MOONS: MoonPhase[] = ['waxing-crescent', 'first-quarter', 'full', 'waning-gibbous', 'waning-crescent'];

function hash(s: string): number {
  let x = 0;
  for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(x);
}

function PosterArt({ title, posterUrl, compact }: { title: string; posterUrl?: string; compact?: boolean }) {
  if (posterUrl) return <img src={posterUrl} alt="" loading="lazy" />;
  const k = hash(title);
  const initial = title.replace(/^the\s+/i, '').charAt(0).toUpperCase() || '?';
  return (
    <div className={cx('tt-plate', `tt-plate-${PLATES[k % PLATES.length]}`)} aria-hidden="true">
      <Moon phase={PLATE_MOONS[k % PLATE_MOONS.length]} size={compact ? 14 : 40} />
      <div className="tt-plate-title">{compact ? initial : title}</div>
      {!compact && <Sigil size={14} />}
    </div>
  );
}

export interface PosterCardProps {
  title: string;
  kind?: 'series' | 'movie';
  variant?: 'grid' | 'list';
  year?: number;
  posterUrl?: string;
  status?: SeriesStatusKey | MovieStatusKey;
  releaseState?: ReleaseState;
  addedBy?: Person;
  newEpisodes?: number | boolean;
  progress?: { season: number; episode: number; watched: number; total: number };
  runtime?: string;
  overview?: string;
  selected?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function PosterCard(props: PosterCardProps) {
  const { title, kind = 'series', variant = 'grid', year, posterUrl, status, releaseState, addedBy, newEpisodes, progress, runtime, overview, selected, href, onClick, className } = props;

  const meta: string[] = [];
  if (year) meta.push(String(year));
  if (kind === 'series' && progress) meta.push(`S${String(progress.season).padStart(2, '0')}E${String(progress.episode).padStart(2, '0')}`);
  if (kind === 'movie' && runtime) meta.push(runtime);
  const metaText = meta.join(' · ');

  const pct = progress && progress.total ? Math.round((100 * progress.watched) / progress.total) : null;
  const bar = pct != null && (
    <div className="tt-progress" role="progressbar" aria-label="Episodes watched" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );

  const statusBadge = status ? <StatusBadge kind={kind} status={status} /> : null;
  const release = releaseState && kind === 'series' ? <ReleaseBadge state={releaseState} /> : null;
  const fresh = newEpisodes ? <NewEpisodesBadge count={newEpisodes === true ? undefined : newEpisodes} /> : null;
  const added = addedBy ? <AddedByBadge person={addedBy} compact={variant === 'grid'} /> : null;

  const body = variant === 'list' ? (
    <>
      <div className="tt-poster-art"><PosterArt title={title} posterUrl={posterUrl} compact /></div>
      <div className="tt-poster-body">
        <h3 className="tt-poster-title">{title}</h3>
        <div className="tt-badge-line">
          <span className="tt-mono" style={{ color: 'var(--text-muted)', marginRight: 'var(--space-1)' }}>{metaText}</span>
          {release}
        </div>
        {overview && <p className="tt-poster-overview">{overview}</p>}
        {bar}
      </div>
      <div className="tt-poster-side">
        <div className="tt-badge-line">{fresh}{statusBadge}</div>
        {added}
      </div>
    </>
  ) : (
    <>
      <div className="tt-poster-art">
        <PosterArt title={title} posterUrl={posterUrl} />
        <div className="tt-poster-badges">{statusBadge ?? <span />}{fresh}</div>
      </div>
      <div className="tt-poster-body">
        <h3 className="tt-poster-title">{title}</h3>
        <div className="tt-poster-meta"><span className="tt-mono">{metaText}</span>{added}</div>
        {release && <div className="tt-badge-line">{release}</div>}
        {bar}
      </div>
    </>
  );

  const cls = cx('tt-poster', `tt-poster-${variant}`, className);
  const current = selected ? 'true' : undefined;
  return href ? (
    <a className={cls} href={href} onClick={onClick} aria-current={current}>{body}</a>
  ) : (
    <button type="button" className={cls} onClick={onClick} aria-current={current}>{body}</button>
  );
}
