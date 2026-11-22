import { EmptyState } from '../components/ui/EmptyState';

export function Placeholder({ title, blurb }: { title: string; blurb: string }) {
  return (
    <section>
      <h1 className="mb-6 text-3xl">{title}</h1>
      <EmptyState title="Nothing here yet">{blurb}</EmptyState>
    </section>
  );
}
