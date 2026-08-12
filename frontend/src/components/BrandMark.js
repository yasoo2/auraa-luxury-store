import React from 'react';

/**
 * The Auraa mark — an open gold ring holding a pearl.
 *
 * Inline rather than <img src="/favicon.svg">, for one reason: the mark has to
 * change colour with what is behind it, and CSS cannot reach inside an image.
 * The header bar is a gold gradient, so the gold mark sat on it invisibly —
 * gold ink on gold ground, which the owner spotted on his own storefront
 * before any check did. Dark backgrounds (the footer, the install banner) still
 * get the gold.
 *
 * `favicon.svg` keeps the same artwork for the browser tab and the installed
 * app icon, where the background is the platform's and always neutral.
 */
const TONES = {
  // On dark grounds: the brand gold, shaded so the ring reads as metal.
  gold: {
    ringFrom: '#e8cd7a',
    ringMid: '#c9a227',
    ringTo: '#8c6d15',
    pearlEdge: '#c9a227',
  },
  // On the gold bar: near-black ink, the same family as the LUXURY wordmark
  // beside it. A gold mark there has a contrast ratio close to 1 — it is not
  // dim, it is absent.
  ink: {
    ringFrom: '#4a3610',
    ringMid: '#2b1f08',
    ringTo: '#150f04',
    pearlEdge: '#2b1f08',
  },
};

const BrandMark = ({ tone = 'gold', className = '', title }) => {
  const t = TONES[tone] || TONES.gold;
  // Unique per tone so two marks in different tones on one page cannot share
  // a gradient id and silently take each other's colours.
  const ringId = `auraa-ring-${tone}`;
  const pearlId = `auraa-pearl-${tone}`;

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : 'true'}
      data-testid="brand-mark"
      data-tone={tone}
    >
      <defs>
        <linearGradient id={ringId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={t.ringFrom} />
          <stop offset="0.55" stopColor={t.ringMid} />
          <stop offset="1" stopColor={t.ringTo} />
        </linearGradient>
        <radialGradient id={pearlId} cx="0.36" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#f7f1e4" />
          <stop offset="1" stopColor="#ddd2bb" />
        </radialGradient>
      </defs>

      {/* The gap: circumference 125.66, gap 26, and the path starts at three
          o'clock — so rotating by -52.7 puts the gap's centre at the top,
          directly under the pearl. */}
      <circle
        cx="32" cy="37" r="20"
        fill="none" stroke={`url(#${ringId})`} strokeWidth="6.5" strokeLinecap="round"
        strokeDasharray="99.66 26" transform="rotate(-52.7 32 37)"
        data-testid="brand-mark-ring"
        data-stroke={t.ringMid}
      />
      <circle cx="32" cy="15" r="9.5" fill={`url(#${pearlId})`} stroke={t.pearlEdge} strokeWidth="1.8" />
      <circle cx="28.8" cy="11.8" r="2.4" fill="#ffffff" opacity="0.95" />
    </svg>
  );
};

export default BrandMark;
