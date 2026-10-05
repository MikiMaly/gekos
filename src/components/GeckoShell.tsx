import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

// Rám stránky v identitě hubu 2.0 ("Skleník"). Gekos nemůže importovat React
// komponenty z hubu (má vlastní typecheck), proto jen skládá hubovské CSS
// třídy .hub-* z hub/src/styles/theme.css. Logo je inline SVG (kopie
// hub/src/ui/brand.tsx LogoMark) — přes <img src="/favicon.svg"> se při
// nasazování občas načetl index.html místo obrázku a v liště zůstala díra.
//
// Hlavička je jednořádková a nízká, ať se dashboard vejde na Full HD monitor
// bez scrollování (lišta 56 px + hlavička ~64 px).

function LogoMark() {
  return (
    <svg width={28} height={28} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="gecko-aurora" x1="4" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--hub-green)' }} />
          <stop offset="0.55" style={{ stopColor: 'var(--hub-aqua)' }} />
          <stop offset="1" style={{ stopColor: 'var(--hub-mint)' }} />
        </linearGradient>
      </defs>
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="9" style={{ fill: 'var(--hub-ink-2)' }} stroke="url(#gecko-aurora)" strokeOpacity="0.55" strokeWidth="1.5" />
      <path
        d="M7.5 22.5V13.5a3.75 3.75 0 0 1 7.5 0v9M15 13.5a3.75 3.75 0 0 1 7.5 0v9"
        stroke="url(#gecko-aurora)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="26.25" cy="22.25" r="1.9" style={{ fill: 'var(--hub-raspberry)' }} />
    </svg>
  );
}
interface Props {
  back?: string;
  backLabel?: string;
  icon?: ReactNode;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
  narrow?: boolean;
  // Na xl roztáhne obsah přesně na výšku okna (dashboard): děti dostanou
  // flex sloupec a poslední prvek může zabrat zbytek přes flex-1.
  fill?: boolean;
  children: ReactNode;
}

export default function GeckoShell({
  back = '/private',
  backLabel = 'Zpět',
  icon,
  eyebrow = 'Terárium',
  title,
  subtitle,
  aside,
  narrow,
  fill,
  children,
}: Props) {
  return (
    <div className="hub-page">
      <header className="hub-topbar">
        <div className="hub-container h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="mmaly.cz domů">
            <LogoMark />
            <span className="font-display font-semibold text-lg tracking-tight">
              mmaly<span className="text-raspberry">.</span>
              <span className="text-primary">cz</span>
            </span>
          </Link>
          <span className="hidden sm:inline-flex hub-pill hub-pill-ok font-mono uppercase tracking-[0.12em]">
            privátní
          </span>
        </div>
      </header>

      <main
        className={
          'hub-container pb-6 ' +
          (narrow ? 'max-w-5xl ' : '') +
          (fill ? 'xl:h-[calc(100dvh-3.5rem-1px)] xl:flex xl:flex-col xl:pb-4' : '')
        }
      >
        <div className="py-3 flex items-center justify-between gap-4 flex-wrap shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link to={back} className="hub-btn hub-btn-quiet hub-btn-icon shrink-0" aria-label={backLabel} title={backLabel}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
            {icon && <div className="hub-icon-tile w-10 h-10 text-xl">{icon}</div>}
            <div className="min-w-0">
              {eyebrow && <div className="hub-eyebrow !text-[0.62rem]">{eyebrow}</div>}
              <div className="flex items-baseline gap-3 flex-wrap">
                <h1 className="hub-title text-2xl sm:text-[1.75rem]">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
              </div>
            </div>
          </div>
          {aside && <div className="flex items-center gap-2 flex-wrap">{aside}</div>}
        </div>
        {fill ? <div className="xl:flex-1 xl:min-h-0 xl:flex xl:flex-col">{children}</div> : children}
      </main>
    </div>
  );
}
