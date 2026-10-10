'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { Crab } from '@/components/Crab';
import { IconCrab } from '@/components/PixelIcons';
import { ThemeToggle } from '@/components/ThemeToggle';
import { brand } from '@/config/brand';

const links = [
  { href: '/', label: 'Latest' },
  { href: '/tools', label: 'Tools' },
  { href: '/models', label: 'Models' },
  { href: '/repos', label: 'Repos' },
  { href: '/issues', label: 'Newsletter' },
  { href: '/archive', label: 'Archive' },
  { href: '/search', label: 'Search' },
];

function isCurrent(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const first = menuRef.current?.querySelector<HTMLElement>('a, button');
    first?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="site-header">
      <div className="wrap masthead">
        <Link href="/" className="wordmark" aria-label={`${brand.name} home`}>
          <IconCrab size={32} />
          <span className="wordmark-name">
            <Crab /> {brand.name}
          </span>
        </Link>
        <p className="byline">{brand.byline}</p>
        <button
          ref={toggleRef}
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>
      <nav className="wrap nav nav-desktop" aria-label="Primary">
        {links.map((item) => (
          <Link key={item.href} href={item.href} aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}>
            {item.label}
          </Link>
        ))}
        <ThemeToggle />
      </nav>
      {open ? (
        <div ref={menuRef} id={menuId} className="wrap nav nav-mobile">
          {links.map((item) => (
            <Link key={item.href} href={item.href} aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}>
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
        </div>
      ) : null}
    </header>
  );
}
