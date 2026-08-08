/**
 * Can the shop's primary button actually be read?
 *
 * "أضف إلى السلة" was white text on a gradient that ran through silver and
 * gold — around 2:1 against white, where ordinary text needs 4.5:1. The label
 * faded out across the right-hand half of the button and the cart icon with
 * it, on the one control the whole shop exists to get pressed.
 *
 * Gradient stops are checked rather than rendered pixels: a stop that fails is
 * a stretch of button that fails, wherever the browser happens to paint it.
 */
import fs from 'node:fs';

const css = fs.readFileSync('frontend/src/App.css', 'utf8');

const luminance = (hex) => {
  const c = hex.replace('#', '');
  const rgb = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Rules that matter: a class, the colour its text is painted in, and the floor.
// 4.5:1 is the WCAG AA threshold for text at ordinary sizes.
const RULES = [
  { selector: '.btn-luxury', text: '#ffffff', floor: 4.5 },
];

let failed = 0;
for (const rule of RULES) {
  const block = css.split(`${rule.selector} {`)[1]?.split('}')[0] ?? '';
  // Only what is painted *behind* the text. Reading every colour in the block
  // caught the gold border and called the button unreadable — the border is
  // not behind anything, and a check that cries about correct code gets
  // switched off.
  const background = block.split('\n').find((l) => /^\s*background(-color)?\s*:/.test(l)) ?? '';
  const stops = [...background.matchAll(/#([0-9a-fA-F]{6})\b/g)].map((m) => `#${m[1]}`);
  if (!stops.length) {
    console.log(`❌ ${rule.selector} — لم يُعثر على ألوان`);
    failed++;
    continue;
  }
  const worst = stops
    .map((s) => ({ s, r: ratio(s, rule.text) }))
    .sort((a, b) => a.r - b.r)[0];
  const ok = worst.r >= rule.floor;
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${rule.selector} على ${rule.text} — أسوأ تباين ${worst.r.toFixed(2)}:1 عند ${worst.s} (الحدّ ${rule.floor})`);
}

console.log(failed ? `\n${failed} فشل` : '\nكل الفحوص تمرّ');
process.exit(failed ? 1 : 0);
