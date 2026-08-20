import { useId, type ReactNode } from "react";

interface ChapterProps {
  index: string;
  title: string;
  sub?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A page section headed by a mono index and a serif title, with `sub` pushed to the inline end. */
export function Chapter({ index, title, sub, children, className }: ChapterProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={className}>
      <div className="border-ink flex items-baseline gap-3 border-b pb-2">
        <span className="text-annotation font-mono text-xs">{index}</span>
        <h2 id={headingId} className="font-serif text-2xl font-medium">
          {title}
        </h2>
        {sub ? <span className="text-annotation ms-auto text-xs">{sub}</span> : null}
      </div>
      {children}
    </section>
  );
}
