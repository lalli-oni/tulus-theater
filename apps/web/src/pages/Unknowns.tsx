import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddedBy } from '@tulu/shared';
import { api } from '../api/client';
import type { Entry } from '../components/entries';
import { PageHeader } from '../components/PageHeader';
import { AddedByBadge, Banner, Button, EmptyState, Input } from '../components/ui';

export const UNKNOWNS_KEY = ['unknowns'];

export async function fetchUnknowns(): Promise<Entry[]> {
  const [s, m] = await Promise.all([api.series.list({ addedBy: 'UNKNOWN' }), api.movies.list({ addedBy: 'UNKNOWN' })]);
  return [...s.map((item) => ({ kind: 'series' as const, item })), ...m.map((item) => ({ kind: 'movie' as const, item }))].sort((a, b) => a.item.title.localeCompare(b.item.title));
}

/** Quick cleanup for imported titles whose "added by" is not known. One click per row. */
export function Unknowns() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: UNKNOWNS_KEY, queryFn: fetchUnknowns });
  const [suggested, setSuggested] = useState<Record<string, string>>({});

  const assign = useMutation({
    mutationFn: async (v: { entry: Entry; who: AddedBy }): Promise<unknown> => {
      const body = { addedBy: v.who, suggestedBy: suggested[`${v.entry.kind}-${v.entry.item.id}`]?.trim() || v.entry.item.suggestedBy };
      return v.entry.kind === 'series' ? api.series.update(v.entry.item.id, body) : api.movies.update(v.entry.item.id, body);
    },
    onSuccess: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: UNKNOWNS_KEY }), qc.invalidateQueries({ queryKey: ['series'] }), qc.invalidateQueries({ queryKey: ['movies'] })]);
    },
  });

  const rows = list.data ?? [];
  return (
    <section>
      <PageHeader eyebrow="Backstage" title="Fill in unknowns" />
      <p className="mb-6 max-w-2xl text-text-secondary">
        These titles came in without anyone recorded as adding them. Pick Alecha or Lalli on each row and it leaves this list.
      </p>
      {list.error && <Banner tone="error" title="Could not load the list.">{(list.error as Error).message}</Banner>}
      {assign.error && <Banner tone="error" title="Could not save that change.">{(assign.error as Error).message}</Banner>}
      {list.data && rows.length === 0 && <EmptyState title="Every title has an owner">Nothing to fill in. New imports with an unknown adder will show up here.</EmptyState>}
      {rows.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {rows.map((e) => {
            const key = `${e.kind}-${e.item.id}`;
            return (
              <li key={key} className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised p-3">
                <div className="min-w-48 flex-1">
                  <div className="font-semibold">{e.item.title}</div>
                  <div className="tt-mono text-text-muted">{e.kind === 'series' ? 'TV series' : 'Movie'}</div>
                </div>
                <Input
                  label="Suggested by"
                  value={suggested[key] ?? e.item.suggestedBy ?? ''}
                  onChange={(ev) => setSuggested((p) => ({ ...p, [key]: ev.target.value }))}
                  className="w-48"
                />
                <div className="flex items-center gap-2 self-end">
                  <AddedByBadge person="unknown" compact />
                  <Button variant="outline" size="sm" disabled={assign.isPending} onClick={() => assign.mutate({ entry: e, who: 'ALECHA' })}>Alecha</Button>
                  <Button variant="outline" size="sm" disabled={assign.isPending} onClick={() => assign.mutate({ entry: e, who: 'LALLI' })}>Lalli</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
