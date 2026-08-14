import React, { useEffect, useMemo, useState } from 'react';

/**
 * The piece shown beside the sign-in form, presented like a museum exhibit.
 *
 * Everything here is drawn as inline SVG rather than loaded as an image: the
 * whole set weighs less than one JPEG, renders on the first paint, and can
 * never show a broken-image icon on a slow connection.
 *
 * A visitor gets a random piece on arrival and the set rotates slowly after
 * that, so the page doesn't look identical on every visit.
 */

const VB_W = 160;
const VB_H = 232;
const ROTATE_MS = 5200;

// Quadratic Bézier: point on the curve plus the tangent angle, so stones and
// pearls can be laid along a strand at even spacing and correct rotation.
const qb = (p0, p1, p2, t) => {
  const u = 1 - t;
  return {
    x: u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    y: u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    a:
      (Math.atan2(
        2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]),
        2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0])
      ) *
        180) /
      Math.PI,
  };
};

// Namespaced so these gradients can't collide with any other SVG on the page.
const AU = 'auraa-au';
const AUV = 'auraa-auv';
const ICE = 'auraa-ice';
const ICE_DEEP = 'auraa-ice-deep';
const AMETHYST = 'auraa-amethyst';
const PEARL = 'auraa-pearl';
const RUBY = 'auraa-ruby';
const EMERALD = 'auraa-emerald';

const Defs = () => (
  <defs>
    <linearGradient id={AU} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#F6E5AE" />
      <stop offset=".34" stopColor="#C9A227" />
      <stop offset=".72" stopColor="#8A6E14" />
      <stop offset="1" stopColor="#E3CB77" />
    </linearGradient>
    <linearGradient id={AUV} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#8A6E14" />
      <stop offset=".5" stopColor="#EBD68F" />
      <stop offset="1" stopColor="#C9A227" />
    </linearGradient>
    <linearGradient id={ICE} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#FFFFFF" />
      <stop offset="1" stopColor="#D6EBF4" />
    </linearGradient>
    <linearGradient id={ICE_DEEP} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#C6E1EE" />
      <stop offset="1" stopColor="#7BA6BD" />
    </linearGradient>
    <radialGradient id={AMETHYST} cx=".34" cy=".28">
      <stop offset="0" stopColor="#FFFFFF" />
      <stop offset=".42" stopColor="#E4D3F1" />
      <stop offset="1" stopColor="#8A6BA6" />
    </radialGradient>
    <radialGradient id={PEARL} cx=".34" cy=".3">
      <stop offset="0" stopColor="#FFFFFF" />
      <stop offset=".55" stopColor="#F0E9DE" />
      <stop offset="1" stopColor="#B9AC98" />
    </radialGradient>
    <radialGradient id={RUBY} cx=".34" cy=".28">
      <stop offset="0" stopColor="#FFE9EC" />
      <stop offset=".38" stopColor="#D0596F" />
      <stop offset="1" stopColor="#7E1B2E" />
    </radialGradient>
    <radialGradient id={EMERALD} cx=".34" cy=".28">
      <stop offset="0" stopColor="#EBFBF3" />
      <stop offset=".38" stopColor="#57AE85" />
      <stop offset="1" stopColor="#124E37" />
    </radialGradient>
  </defs>
);

const Sparkle = ({ x, y, s = 5, o = 0.85 }) => (
  <path
    d={`M${x} ${y - s} l${s * 0.42} ${s * 0.58} ${s * 0.58} ${s * 0.42} -${s * 0.58} ${s * 0.42} -${s * 0.42} ${s * 0.58} -${s * 0.42} -${s * 0.58} -${s * 0.58} -${s * 0.42} ${s * 0.58} -${s * 0.42} Z`}
    fill={`rgba(255,255,255,${o})`}
  />
);

/* --- 1. kite pendant on a chain ----------------------------------------- */
const Pendant = () => (
  <g>
    <path d="M30 12 C44 66, 66 96, 80 112" stroke={`url(#${AUV})`} strokeWidth="2.2" fill="none" />
    <path d="M130 12 C116 66, 94 96, 80 112" stroke={`url(#${AUV})`} strokeWidth="2.2" fill="none" />
    <circle cx="80" cy="120" r="7.5" stroke={`url(#${AUV})`} strokeWidth="2.4" />
    <path d="M80 133 L112 161 L80 210 L48 161 Z" fill={`url(#${AMETHYST})`} />
    <path d="M48 161 L112 161" stroke="rgba(255,255,255,.85)" strokeWidth="1.2" />
    <path d="M80 133 L80 210" stroke="rgba(255,255,255,.4)" strokeWidth=".9" />
    <path d="M64 147 L96 147" stroke="rgba(255,255,255,.3)" strokeWidth=".8" />
    <path
      d="M80 133 L64 147 L48 161 M80 133 L96 147 L112 161"
      stroke="rgba(255,255,255,.45)"
      strokeWidth=".8"
      fill="none"
    />
    <Sparkle x={96} y={150} s={4.5} o={0.8} />
  </g>
);

/* --- 2. solitaire ring --------------------------------------------------- */
const Ring = () => (
  <g>
    <circle cx="80" cy="146" r="46" stroke={`url(#${AU})`} strokeWidth="8" />
    <circle cx="80" cy="146" r="49.5" stroke="rgba(255,255,255,.15)" strokeWidth="1" />
    <circle cx="80" cy="146" r="42.5" stroke="rgba(0,0,0,.42)" strokeWidth="1" />
    {/* claws rising from the shank to grip the girdle */}
    <path d="M66 102 L53 69 M94 102 L107 69" stroke={`url(#${AU})`} strokeWidth="3.4" strokeLinecap="round" />
    <path d="M64 52 L96 52 L110 68 L50 68 Z" fill={`url(#${ICE})`} />
    <path d="M50 68 L110 68 L80 98 Z" fill={`url(#${ICE_DEEP})`} />
    <path d="M50 68 L110 68" stroke="rgba(255,255,255,.95)" strokeWidth="1.2" />
    <path d="M64 52 L58 68 M96 52 L102 68 M80 52 L80 68" stroke="rgba(255,255,255,.5)" strokeWidth=".8" />
    <path d="M65 68 L80 98 M95 68 L80 98 M80 68 L80 98" stroke="rgba(255,255,255,.34)" strokeWidth=".8" />
    <Sparkle x={91} y={58} s={5} o={0.9} />
  </g>
);

/* --- 3. tennis bracelet -------------------------------------------------- */
/* Wide and shallow on purpose: a circular loop would read as a second ring. */
const Bracelet = () => {
  const stones = useMemo(() => {
    const cx = 80;
    const cy = 120;
    const rx = 66;
    const ry = 31;
    const n = 24;
    return Array.from({ length: n }, (_, i) => {
      const th = (i / n) * Math.PI * 2;
      const front = (Math.sin(th) + 1) / 2; // 1 = nearest the viewer
      return {
        x: cx + rx * Math.cos(th),
        y: cy + ry * Math.sin(th),
        a: (Math.atan2(ry * Math.cos(th), -rx * Math.sin(th)) * 180) / Math.PI,
        o: 0.55 + 0.45 * front,
        s: 4.6 + 1.8 * front,
      };
    });
  }, []);

  return (
    <g>
      <ellipse cx="80" cy="166" rx="46" ry="7" fill="rgba(0,0,0,.55)" />
      <g transform="rotate(-13 80 120)">
        <ellipse cx="80" cy="120" rx="66" ry="31" stroke={`url(#${AU})`} strokeWidth="2.2" fill="none" opacity=".75" />
        {stones.map((s, i) => (
          <g key={i} transform={`translate(${s.x.toFixed(2)} ${s.y.toFixed(2)}) rotate(${s.a.toFixed(2)})`} opacity={s.o.toFixed(2)}>
            <rect
              x={-s.s}
              y={-s.s}
              width={s.s * 2}
              height={s.s * 2}
              transform="rotate(45)"
              fill={`url(#${ICE})`}
              stroke={`url(#${AU})`}
              strokeWidth="1.3"
            />
            <path
              d={`M${-s.s * 0.55} 0 L0 ${-s.s * 0.55} L${s.s * 0.55} 0`}
              stroke="rgba(255,255,255,.9)"
              strokeWidth=".7"
              fill="none"
            />
          </g>
        ))}
      </g>
      <Sparkle x={104} y={146} s={5.5} o={0.95} />
    </g>
  );
};

/* --- 4. drop earrings ---------------------------------------------------- */
const Earring = ({ cx }) => (
  <g transform={`translate(${cx} 26)`}>
    <path
      d="M0 44 C -14 44, -14 22, 0 22 C 10 22, 11 32, 11 37"
      stroke={`url(#${AUV})`}
      strokeWidth="2.1"
      fill="none"
      strokeLinecap="round"
    />
    <circle cx="0" cy="54" r="7.2" fill={`url(#${ICE})`} stroke={`url(#${AU})`} strokeWidth="1.4" />
    <path d="M-4 54 L0 50 L4 54" stroke="rgba(255,255,255,.9)" strokeWidth=".7" fill="none" />
    <path d="M0 61 L0 72" stroke={`url(#${AUV})`} strokeWidth="1.8" />
    <circle cx="0" cy="77" r="5.2" stroke={`url(#${AUV})`} strokeWidth="1.8" />
    <path
      d="M0 84 C 15 94, 22 114, 22 128 A 22 22 0 0 1 -22 128 C -22 114, -15 94, 0 84 Z"
      fill={`url(#${EMERALD})`}
      stroke={`url(#${AU})`}
      strokeWidth="1.2"
    />
    <path d="M-19 120 L19 120" stroke="rgba(255,255,255,.34)" strokeWidth=".9" />
    <path d="M0 84 L0 150" stroke="rgba(255,255,255,.26)" strokeWidth=".8" />
    <path d="M-11 102 C -6 114, -5 130, -8 141" stroke="rgba(255,255,255,.3)" strokeWidth=".8" fill="none" />
  </g>
);

const Earrings = () => (
  <g>
    <Earring cx={40} />
    <Earring cx={120} />
    <Sparkle x={53} y={122} s={4.8} o={0.85} />
  </g>
);

/* --- 5. graduated pearl strand ------------------------------------------- */
const Pearls = () => {
  const beads = useMemo(() => {
    // The control point is not on the curve: the strand's lowest pearl sits at
    // a quarter of the way down from it, so this has to be pushed well past
    // the box to make the strand hang as deep as the other pieces.
    const p0 = [14, 36];
    const p1 = [80, 330];
    const p2 = [146, 36];
    const n = 27;
    return Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      const { x, y } = qb(p0, p1, p2, t);
      return { x, y, r: 3.4 + 4.3 * Math.sin(Math.PI * t) };
    });
  }, []);

  return (
    <g>
      <path d="M14 36 Q80 330 146 36" stroke="rgba(201,162,39,.30)" strokeWidth="1" fill="none" />
      {beads.map((b, i) => (
        <g key={i}>
          <circle cx={b.x.toFixed(2)} cy={b.y.toFixed(2)} r={b.r.toFixed(2)} fill={`url(#${PEARL})`} />
          <circle
            cx={(b.x - b.r * 0.3).toFixed(2)}
            cy={(b.y - b.r * 0.34).toFixed(2)}
            r={(b.r * 0.26).toFixed(2)}
            fill="rgba(255,255,255,.75)"
          />
        </g>
      ))}
      <circle cx="14" cy="36" r="4.6" stroke={`url(#${AUV})`} strokeWidth="1.8" />
      <circle cx="146" cy="36" r="4.6" stroke={`url(#${AUV})`} strokeWidth="1.8" />
    </g>
  );
};

/* --- 6. riviera collar with a suspended ruby drop ------------------------ */
const Riviera = () => {
  const { stones, c } = useMemo(() => {
    const p0 = [12, 40];
    const p1 = [80, 178];
    const p2 = [148, 40];
    const n = 13;
    return {
      stones: Array.from({ length: n }, (_, i) => {
        const t = i / (n - 1);
        const p = qb(p0, p1, p2, t);
        const h = 4.4 + 5.2 * Math.sin(Math.PI * t); // half length, along the strand
        return { ...p, h, w: h * 1.05 }; // control offset -> roughly a 2:1 marquise
      }),
      c: qb(p0, p1, p2, 0.5),
    };
  }, []);

  return (
    <g>
      <path d="M12 40 Q80 178 148 40" stroke={`url(#${AUV})`} strokeWidth="1.6" fill="none" />
      {stones.map((s, i) => (
        <g key={i} transform={`translate(${s.x.toFixed(2)} ${s.y.toFixed(2)}) rotate(${s.a.toFixed(2)})`}>
          <path
            d={`M${(-s.h).toFixed(2)} 0 Q0 ${(-s.w).toFixed(2)} ${s.h.toFixed(2)} 0 Q0 ${s.w.toFixed(2)} ${(-s.h).toFixed(2)} 0 Z`}
            fill={`url(#${ICE})`}
            stroke={`url(#${AU})`}
            strokeWidth="1"
          />
          <path d={`M${(-s.h).toFixed(2)} 0 L${s.h.toFixed(2)} 0`} stroke="rgba(255,255,255,.85)" strokeWidth=".7" />
        </g>
      ))}
      {/* the centrepiece hangs from the lowest stone */}
      <path d={`M${c.x} ${c.y + 4} L${c.x} ${c.y + 13}`} stroke={`url(#${AUV})`} strokeWidth="1.6" />
      <circle cx={c.x} cy={c.y + 17} r="4.4" stroke={`url(#${AUV})`} strokeWidth="1.6" />
      <path
        d={`M${c.x} ${c.y + 22} C ${c.x + 13} ${c.y + 32}, ${c.x + 20} ${c.y + 50}, ${c.x + 20} ${c.y + 62}
            A 20 20 0 0 1 ${c.x - 20} ${c.y + 62}
            C ${c.x - 20} ${c.y + 50}, ${c.x - 13} ${c.y + 32}, ${c.x} ${c.y + 22} Z`}
        fill={`url(#${RUBY})`}
        stroke={`url(#${AU})`}
        strokeWidth="1.2"
      />
      <path d={`M${c.x - 17} ${c.y + 56} L${c.x + 17} ${c.y + 56}`} stroke="rgba(255,255,255,.3)" strokeWidth=".9" />
      <path d={`M${c.x} ${c.y + 22} L${c.x} ${c.y + 82}`} stroke="rgba(255,255,255,.24)" strokeWidth=".8" />
      <Sparkle x={c.x - 9} y={c.y + 44} s={5} o={0.8} />
    </g>
  );
};

export const PIECES = [
  { ref: '0 4 2', ar: 'قلادة الأميرة', en: 'The Princess Pendant', Art: Pendant },
  { ref: '1 1 7', ar: 'خاتم الوعد', en: 'The Promise Ring', Art: Ring },
  { ref: '2 0 5', ar: 'سوار التنس', en: 'The Tennis Bracelet', Art: Bracelet },
  { ref: '3 3 1', ar: 'أقراط الشلال', en: 'The Cascade Earrings', Art: Earrings },
  { ref: '4 6 8', ar: 'العقد', en: 'The Strand', Art: Pearls },
  { ref: '5 9 0', ar: 'طوق الريفييرا', en: 'The Riviera Collar', Art: Riviera },
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const JewelExhibit = ({ language = 'ar' }) => {
  // A first-time visitor shouldn't always meet the same piece.
  const [index, setIndex] = useState(() => Math.floor(Math.random() * PIECES.length));
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || prefersReducedMotion()) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % PIECES.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [paused]);

  const current = PIECES[index];
  const label = language === 'ar' ? current.ar : current.en;

  return (
    <div className="auth-exhibit" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="auth-exhibit__frames">
        {PIECES.map((piece, i) => (
          <div key={piece.ref} className={`auth-exhibit__frame${i === index ? ' is-on' : ''}`}>
            <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width={VB_W} height={VB_H} fill="none" aria-hidden="true" focusable="false">
              <Defs />
              <piece.Art />
            </svg>
          </div>
        ))}
      </div>

      <div className="auth-exhibit__plate" key={current.ref}>
        <div className="auth-exhibit__ref">{`R E F ${current.ref}`}</div>
        <div className="auth-exhibit__name">{label}</div>
      </div>

      <div className="auth-exhibit__dots">
        {PIECES.map((piece, i) => (
          <button
            key={piece.ref}
            type="button"
            className={i === index ? 'is-on' : ''}
            aria-label={language === 'ar' ? piece.ar : piece.en}
            aria-current={i === index}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
};

export default JewelExhibit;
