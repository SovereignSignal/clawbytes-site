import { ImageResponse } from 'next/og';
import { brand } from '@/config/brand';

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = 'image/png';
export const ogAlt = `${brand.mark} ${brand.name}. ${brand.tagline}`;

const navy = '#121b2b';
const ink = '#f8f6f1';
const red = '#d44a40';
const sand = '#f3e4ce';
const pine = '#2e5c45';
const card = '#0d1522';

export function ogImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: navy,
          color: ink,
          padding: '64px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 28, letterSpacing: 4, color: sand }}>
            {brand.mark} {brand.byline.toUpperCase()}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 18, height: 18, background: red }} />
            <div style={{ width: 18, height: 18, background: pine }} />
            <div style={{ width: 18, height: 18, background: sand }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 108, fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>
            {brand.mark} {brand.name}
          </div>
          <div style={{ display: 'flex', marginTop: 22, fontSize: 36, color: sand }}>
            {brand.tagline}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', height: 8, background: red, width: '100%' }} />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              background: card,
              border: '4px solid #243044',
              padding: '16px 22px',
              fontSize: 24,
            }}
          >
            <div style={{ display: 'flex' }}>TOOLS</div>
            <div style={{ display: 'flex' }}>MODELS</div>
            <div style={{ display: 'flex' }}>REPOS</div>
            <div style={{ display: 'flex', color: sand }}>{brand.mark} OPEN</div>
          </div>
        </div>
      </div>
    ),
    { ...ogSize },
  );
}
