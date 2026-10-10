import { Crab } from '@/components/Crab';
import { HeroShore } from '@/components/PNWScenes';
import { WireConsole } from '@/components/WireConsole';
import { brand } from '@/config/brand';

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-grid" aria-hidden="true" />
      <svg className="hero-topo" viewBox="0 0 400 220" fill="none" aria-hidden="true">
        <path d="M0 120 Q100 80 200 120 Q300 160 400 120" stroke="hsl(var(--secondary))" strokeWidth="1" />
        <path d="M0 140 Q100 100 200 140 Q300 180 400 140" stroke="hsl(var(--secondary))" strokeWidth="1" />
        <path d="M0 100 Q100 60 200 100 Q300 140 400 100" stroke="hsl(var(--secondary))" strokeWidth="0.8" />
        <path d="M0 160 Q100 120 200 160 Q300 200 400 160" stroke="hsl(var(--secondary))" strokeWidth="0.6" />
      </svg>
      <HeroShore />
      <div className="hero-layout">
        <div className="hero-copy">
          <p className="hero-kicker">{brand.byline}</p>
          <h1 id="hero-title">
            <Crab className="hero-crab" />
            <span className="text-gradient">{brand.name}</span>
          </h1>
          <p className="hero-tag">{brand.tagline}</p>
          <p className="dek">{brand.description}</p>
          <div className="hero-actions">
            <a className="button" href="#latest">Latest bytes</a>
            <a className="button button-ghost" href="/feed.xml">
              <Crab /> Items RSS
            </a>
          </div>
        </div>
        <WireConsole />
      </div>
    </section>
  );
}
