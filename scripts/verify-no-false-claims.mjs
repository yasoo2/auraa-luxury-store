/**
 * Does any screen in this shop claim a material it cannot stand behind?
 *
 * The shop sold «خاتم لامع فاخر مرصّع بالألماس» — a ring set with diamonds —
 * for fifty-four dollars, with «الخامة: الماس» printed underneath on a line of
 * its own, and a heart ring «مرصّع باللؤلؤ» for thirty-seven. The supplier's
 * cost on those pieces is a few dollars. There is no diamond and no pearl in
 * them. The words came from CJ's titles, where "diamond" and "pearl" are how
 * the trade writes "sparkly" and "white bead" — but a shop that reprints them
 * is not quoting a supplier, it is making the claim to its own customer.
 *
 * The composer has been corrected and the catalogue is rewritten at every
 * boot, and that is guarded by tests. This guards the other way in: a word
 * typed straight into a screen — a homepage banner, a category label, a
 * placeholder — where no composer runs and no backend test would ever see it.
 *
 * Nothing here forbids selling a real diamond. It forbids *this* shop, whose
 * every piece is dropshipped costume jewellery bought for a few dollars,
 * printing the word on a page. When the owner stocks a real one he writes the
 * material into the product himself, in the field built for it — and that path
 * does not pass through the source of a React component.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] || 'frontend/src';

// The Arabic as this shop would print it, and the English as CJ writes it.
const CLAIMS = [
  'ألماس', 'الماس', 'لؤلؤ', 'زمرّد', 'زمرد', 'ياقوت', 'جمشت', 'زبرجد',
  'أحجار كريمة', 'حجر القمر', 'فيروز', 'توباز', 'أكوامارين',
  'diamond', 'pearl', 'emerald', 'ruby', 'sapphire', 'amethyst', 'topaz',
  'aquamarine', 'peridot', 'gemstone', 'moonstone',
];

// Comments are not claims. The rule has to be explainable in the files it
// governs, and writing down which word was removed — in the comment saying why
// — must not itself trip the check.
const stripComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ')
  .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1 ');

const sources = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== 'node_modules') walk(full); }
    else if (/\.jsx?$/.test(entry.name)) sources.push(full);
  }
};
walk(ROOT);

/**
 * Only what a person could read on the screen.
 *
 * A first version scanned whole lines and reported forty-one places, of which
 * most were Tailwind's colour `emerald-500`, an SVG gradient id `auraa-pearl`,
 * and a variable called `pearlId`. A check that cries about a CSS class is a
 * check that gets skimmed, and the four real claims underneath it — a homepage
 * caption reading «لؤلؤ أصيل», genuine pearl — were buried in the noise.
 *
 * So: string literals only, and inside them the word must stand on its own.
 * Anything welded to a hyphen or an underscore is an identifier, not a
 * sentence, and no customer will ever see it.
 */
const LITERAL = /'([^'\n\\]*)'|"([^"\n\\]*)"|`([^`\n\\]*)`/g;
const isIdentifierish = (s) => /^[a-z0-9:@[\]/\s._-]+$/.test(s) && /[-_]/.test(s);

const found = [];
for (const file of sources) {
  const text = stripComments(fs.readFileSync(file, 'utf8'));
  text.split('\n').forEach((line, i) => {
    for (const match of line.matchAll(LITERAL)) {
      // `url(#${PEARL})` names an SVG gradient, not a stone. What is
      // interpolated is a variable, and a variable is not something a customer
      // reads — drop it and judge only the words actually written here.
      const literal = (match[1] ?? match[2] ?? match[3] ?? '').replace(/\$\{[^}]*\}/g, ' ');
      if (!literal.trim() || isIdentifierish(literal)) continue;
      for (const claim of CLAIMS) {
        const pattern = /^[a-z]+$/.test(claim)
          ? new RegExp(`(?<![\\w-])${claim}(?![\\w-])`, 'i')
          : new RegExp(`(?<![\\u0621-\\u064A-])(?:[بوفلك]?(?:ال)?)${claim}(?![\\u0621-\\u064A-])`);
        if (pattern.test(literal)) {
          found.push({ file: path.relative(ROOT, file), line: i + 1, claim, text: literal.slice(0, 90) });
        }
      }
    }
  });
}

console.log(`فُحص ${sources.length} ملفاً في الواجهة بحثاً عن ادّعاء خامة لا يقوم عليه دليل`);
if (found.length) {
  console.log(`\n❌ ${found.length} موضعاً يذكر خامة لا يستطيع المتجر أن يقف خلفها:`);
  for (const f of found) console.log(`   ${f.file}:${f.line}  «${f.claim}»  ←  ${f.text}`);
  console.log('\nهذه بضاعة تكلّف بضعة دولارات عند المورّد. إن كانت القطعة حقيقية');
  console.log('فخامتها تُكتب في حقل المنتج نفسه، لا في كود الشاشة.');
  process.exit(1);
}
console.log('✅ لا شاشة تدّعي خامة لا يقوم عليها دليل');
