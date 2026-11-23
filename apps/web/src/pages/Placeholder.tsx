import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/ui';

export function Placeholder({ eyebrow, title, heading = 'The stage is empty', blurb }: { eyebrow?: string; title: string; heading?: string; blurb: string }) {
  return (
    <section>
      <PageHeader eyebrow={eyebrow} title={title} />
      <EmptyState title={heading}>{blurb}</EmptyState>
    </section>
  );
}
