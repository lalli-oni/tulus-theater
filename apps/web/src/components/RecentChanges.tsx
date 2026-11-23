import { useMutation, useQuery } from '@tanstack/react-query';
import type { SeriesDTO } from '@tulu/shared';
import { api } from '../api/client';
import { useRefreshSeries } from '../lib/useProgressActions';
import { useToast } from './ToastHost';
import { Button } from './ui';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Latest progress and status changes, manual and automatic, each with Undo while it is the newest for its series. */
export function RecentChanges({ seriesId, limit = 8, onSeries, showTitle }: { seriesId?: number; limit?: number; onSeries?: (s: SeriesDTO) => void; showTitle?: boolean }) {
  const refresh = useRefreshSeries();
  const toast = useToast();
  const list = useQuery({ queryKey: ['changes', seriesId ?? 'all', limit], queryFn: () => api.changes({ seriesId, limit }) });
  const undo = useMutation({
    mutationFn: (id: number) => api.undo(id),
    onSuccess: async (s) => {
      onSeries?.(s);
      await refresh();
    },
    onError: (e) => toast({ title: 'Could not undo', body: (e as Error).message, tone: 'error' }),
  });

  if (list.isPending) return null;
  if (!list.data?.length) return <p className="text-body-sm text-text-muted">No changes recorded yet.</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {list.data.map((c) => (
        <li key={c.id} className="flex items-center gap-3 rounded-md border border-border-subtle bg-surface-sunken px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className={`text-body-sm ${c.undone ? 'text-text-muted line-through' : 'text-text-primary'}`}>
              {showTitle && <strong>{c.seriesTitle}: </strong>}
              {c.summary}
            </div>
            <div className="tt-mono text-text-muted">{when(c.createdAt)}{c.undone ? ' · undone' : ''}</div>
          </div>
          {c.canUndo && <Button variant="outline" size="sm" icon="undo" disabled={undo.isPending} onClick={() => undo.mutate(c.id)}>Undo</Button>}
        </li>
      ))}
    </ul>
  );
}
