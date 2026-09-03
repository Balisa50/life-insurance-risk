"use client";

/* Layout primitives shared by the dashboard sections. */

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  // min-w-0 is load-bearing. A grid item defaults to min-width:auto, so without
  // this a Card refuses to shrink below its content and the Recharts
  // ResponsiveContainer inside it measures a parent wider than the viewport.
  // On a phone that pushed the whole page to ~1228px against a 375px screen.
  return (
    <div className={`min-w-0 rounded-xl border border-border bg-surface p-5 ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <div id={id} className="scroll-mt-20 mb-6">
      <h2 className="text-xl font-semibold text-text">{title}</h2>
      <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  // Drop the value font from text-2xl to text-xl on narrow screens so wide
  // numbers like "$493,700,000" never overflow the card on phone widths.
  // min-w-0 + break-words on the wrapper lets flex/grid parents actually
  // shrink the column, otherwise the number forces the card wider than
  // the viewport.
  return (
    <div className="min-w-0">
      <p className="text-xs text-text-secondary uppercase tracking-wider">{label}</p>
      <p className="text-xl sm:text-2xl font-bold text-text mt-1 break-words leading-tight">{value}</p>
      {sub && <p className="text-xs text-text-secondary mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─── nav ─── */

const NAV_ITEMS = [
  { href: "#overview", label: "Overview" },
  { href: "#mortality", label: "Mortality" },
  { href: "#survival", label: "Survival" },
  { href: "#cox", label: "Cox PH" },
  { href: "#persistency", label: "Persistency" },
  { href: "#pricing", label: "Pricing" },
  { href: "#montecarlo", label: "Monte Carlo" },
  { href: "#scenarios", label: "Scenarios" },
];

export function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 h-14">
        <span className="font-semibold text-text text-sm tracking-tight">
          Life Insurance Risk Model
        </span>
        <div className="hidden md:flex gap-1">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-text hover:bg-surface-hover rounded-md transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
