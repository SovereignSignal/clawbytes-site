'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { Crab } from '@/components/Crab';
import { PixelCrab } from '@/components/PixelCrab';
import { ThemeToggle } from '@/components/ThemeToggle';

type NavItem = { href: string; label: string; external?: boolean };

type Props = {
  name: string;
  byline: string;
  newsletterUrl: string;
};

function isCurrent(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer">
        {item.label}
      </a>
    );
  }
  return (
    <Link href={item.href} aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}>
      {item.label}
    </Link>
  );
}

export function SiteHeader({ name, byline, newsletterUrl }: Props) {
  const pathname = usePathname();
  const links: NavItem[] = [
    { href: '/', label: 'Latest' },
    { href: '/tools', label: 'Tools' },
    { href: '/models', label: 'Models' },
    { href: '/repos', label: 'Repos' },
    { href: newsletterUrl, label: 'Newsletter', external: true },
    { href: '/archive', label: 'Archive' },
    { href: '/search', label: 'Search' },
  ];
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
        <Link href="/" className="wordmark" aria-label={`${name} home`}>
          <PixelCrab size={40} />
          <span className="wordmark-name">
            <Crab /> {name}
          </span>
        </Link>
        <p className="byline">{byline}</p>
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
          <NavLink key={item.label} item={item} pathname={pathname} />
        ))}
        <ThemeToggle />
      </nav>
      {open ? (
        <div ref={menuRef} id={menuId} className="wrap nav nav-mobile">
          {links.map((item) => (
            <NavLink key={item.label} item={item} pathname={pathname} />
          ))}
          <ThemeToggle />
        </div>
      ) : null}
    </header>
  );
}
