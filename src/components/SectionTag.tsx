type Props = {
  label: string;
  section: string;
  meta?: string;
  className?: string;
};

/** File-header style label above a section. */
export function SectionTag({ label, section, meta, className = '' }: Props) {
  return (
    <p className={className ? `section-tag ${className}` : 'section-tag'}>
      <span className="section-tag-index">{section}</span>
      <span className="section-tag-label">{label}</span>
      <span className="section-tag-rule" aria-hidden="true" />
      {meta ? <span className="section-tag-meta">{meta}</span> : null}
    </p>
  );
}
