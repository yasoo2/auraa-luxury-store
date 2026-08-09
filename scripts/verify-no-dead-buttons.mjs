/**
 * A button that does nothing when pressed.
 *
 * "عرض التفاصيل" sat in the customer's order list from the day it was written
 * with no onClick at all. It looked exactly like a working button, and every
 * customer who pressed it got silence. Nothing in the build, the linter or the
 * test suite had an opinion about it, because a React element with no handler
 * is perfectly valid code.
 *
 * So this reads every button in the app and asks the only question that
 * matters: pressing this, does anything happen? Something has to happen —
 * an onClick, a form submit, a link wrapped around it, or an explicit
 * `disabled`. A button with none of those is a promise the screen cannot keep.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['frontend/src'];
const EXTS = new Set(['.js', '.jsx']);

const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      walk(full);
    } else if (EXTS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
};
for (const root of ROOTS) if (fs.existsSync(root)) walk(root);

// Match an opening <Button ...> or <button ...> tag and capture its attributes.
// Deliberately not a parser: the attribute soup between the name and the
// closing bracket is all this needs, and it must never crash on valid JSX.
const OPEN_TAG = /<(Button|button)(\s[^>]*?)?(\/?)>/gs;

// The reasons a button can legitimately have no onClick of its own.
const EXCUSED = [
  // Any React event handler counts: press-and-hold to record is behaviour
  // just as much as a click is.
  /\bon[A-Z]\w*\s*=/,
  /\btype\s*=\s*["']submit["']/, // the form does something
  /\bhref\s*=/,                // it is a link wearing a button
  /\basChild\b/,               // Radix: the child carries the behaviour
  /\bdisabled\s*=\s*\{?\s*true/, // it is off, and says so
  /\{\s*\.\.\./,               // props spread in; the caller supplies onClick
];

// Files that define buttons rather than use them. The primitive in ui/button
// has no handler by design — it is the thing every caller attaches one to.
const SKIP_FILES = [/\/components\/ui\//];

const findings = [];

for (const file of files) {
  if (SKIP_FILES.some((re) => re.test(file))) continue;
  // Comments are stripped first, or a comment explaining a <button> bug gets
  // reported as one. Replaced with spaces of equal length so every offset —
  // and therefore every reported line number — stays where it was.
  const src = fs.readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^([ \t]*)\/\/.*$/gm, (m, indent) => indent + ' '.repeat(m.length - indent.length));

  for (const match of src.matchAll(OPEN_TAG)) {
    const attrs = match[2] || '';
    if (EXCUSED.some((re) => re.test(attrs))) continue;

    // A button can also be wrapped by something that carries the behaviour:
    //   <Link to="..."><Button>…</Button></Link>
    //   <label><input type="file" hidden /><Button>Upload</Button></label>
    //
    // Counting opens against closes inside a fixed window gets this wrong
    // whenever the window boundary clips an opening tag — which it did, and
    // reported the cart's "متابعة التسوق" as dead while it was a perfectly
    // good link. Compare positions instead: if the nearest enclosing tag was
    // opened after the last one was closed, the button is inside it.
    const before = src.slice(0, match.index);
    const wrapped = ['Link', 'a', 'label'].some((tag) => {
      const open = before.lastIndexOf(`<${tag} `);
      const close = before.lastIndexOf(`</${tag}>`);
      return open > -1 && open > close;
    });
    if (wrapped) continue;

    const line = src.slice(0, match.index).split('\n').length;
    const text = src.slice(match.index, match.index + 160).replace(/\s+/g, ' ');
    findings.push({ file, line, text });
  }
}

for (const f of findings) {
  console.log(`❌ ${f.file}:${f.line}  ${f.text.slice(0, 110)}`);
}

if (findings.length) {
  console.log(`\n${findings.length} زرّاً بلا وظيفة — أضف onClick أو اجعله رابطاً أو احذفه`);
  process.exit(1);
}
console.log(`✅ كل الأزرار لها وظيفة (${files.length} ملفاً)`);
