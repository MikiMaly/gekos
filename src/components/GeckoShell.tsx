import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

// Rám stránky v identitě hubu 2.0 ("Skleník"). Gekos nemůže importovat React
// komponenty z hubu (má vlastní typecheck), proto jen skládá hubovské CSS
// třídy .hub-* z hub/src/styles/theme.css a logo bere z /favicon.svg.
interface Props {
  back?: string;
  backLabel?: string;
  icon?: ReactNode;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
  narrow?: boolean;
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
  children,
}: Props) {
  return (
    <div className="hub-page">
      <header className="hub-topbar">
        <div className="hub-container h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="mmaly.cz domů">
            <img src="/favicon.svg" alt="" className="w-[30px] h-[30px]" />
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

      <main className={'hub-container pb-12 ' + (narrow ? 'max-w-5xl' : '')}>
        <div className="pt-6 pb-6">
          <Link to={back} className="hub-back mb-5">
            <ArrowLeft className="w-4 h-4" /> {backLabel}
          </Link>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              {icon && <div className="hub-icon-tile text-2xl">{icon}</div>}
              <div className="min-w-0">
                {eyebrow && <div className="hub-eyebrow mb-1.5">{eyebrow}</div>}
                <h1 className="hub-title text-3xl sm:text-4xl">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
              </div>
            </div>
            {aside && <div className="flex items-center gap-2 flex-wrap">{aside}</div>}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
