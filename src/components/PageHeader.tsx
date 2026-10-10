import { Crab } from '@/components/Crab';
import { SectionTag } from '@/components/SectionTag';

export function PageHeader({
  title,
  dek,
  section,
  kicker,
  meta,
}: {
  title: string;
  dek?: string;
  section: string;
  kicker: string;
  meta?: string;
}) {
  return (
    <header className="page-head">
      <SectionTag section={section} label={kicker} meta={meta} />
      <h1>
        <Crab /> {title}
      </h1>
      {dek ? <p className="dek">{dek}</p> : null}
    </header>
  );
}
