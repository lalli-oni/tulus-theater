import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ChangeDTO, ProgressResult, SeriesDTO } from '@tulu/shared';
import { api } from '../api/client';
import { useToast } from '../components/ToastHost';

/** Refresh everything that shows series data after a progress change or undo. */
export function useRefreshSeries() {
  const qc = useQueryClient();
  return () => Promise.all([
    qc.invalidateQueries({ queryKey: ['series'] }),
    qc.invalidateQueries({ queryKey: ['changes'] }),
    qc.invalidateQueries({ queryKey: ['unknowns'] }),
  ]);
}

/**
 * Every progress change gets an Undo toast. `onSeries` lets the caller update local state
 * (for example the open editor) with the restored or updated series.
 */
export function useUndoToast(onSeries?: (s: SeriesDTO) => void) {
  const toast = useToast();
  const refresh = useRefreshSeries();
  const undo = useMutation({
    mutationFn: (id: number) => api.undo(id),
    onSuccess: async (s) => {
      onSeries?.(s);
      await refresh();
      toast({ title: 'Change undone', body: s.title, tone: 'info' });
    },
    onError: (e) => toast({ title: 'Could not undo', body: (e as Error).message, tone: 'error' }),
  });
  return (change: ChangeDTO | null) => {
    if (!change) return;
    toast({ title: change.summary, body: change.seriesTitle, action: change.canUndo ? { label: 'Undo', icon: 'undo', onClick: () => undo.mutate(change.id) } : undefined });
  };
}

/** The quick "watched next episode" action. */
export function useWatchedNext(onSeries?: (s: SeriesDTO) => void) {
  const refresh = useRefreshSeries();
  const announce = useUndoToast(onSeries);
  const toast = useToast();
  return useMutation<ProgressResult, Error, number>({
    mutationFn: (id) => api.series.watchedNext(id),
    onSuccess: async (r) => {
      onSeries?.(r.series);
      await refresh();
      announce(r.change);
    },
    onError: (e) => toast({ title: 'Could not mark watched', body: e.message, tone: 'error' }),
  });
}
