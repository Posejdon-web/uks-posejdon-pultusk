// Porównuje zbudowaną stronę (_site) z szablonami – test, że wygląd się nie zmienił.
'use strict';
const { fs, path, ROOT, PAGES, parseHTML } = require('./lib');
const norm = (html) => {
  const d = parseHTML(html).document;
  d.querySelectorAll('script:not([src])').forEach((s) => s.remove());
  d.querySelectorAll('*').forEach((el) => {
    const at = Array.from(el.attributes).map((a) => [a.name, a.value]).sort((x, y) => (x[0] < y[0] ? -1 : 1));
    at.forEach(([n]) => el.removeAttribute(n));
    at.forEach(([n, v]) => el.setAttribute(n, v));
  });
  return d.documentElement.outerHTML.replace(/>\s+</g, '><').replace(/\s+/g, ' ');
};
let bad = 0;
for (const p of PAGES) {
  const a = norm(fs.readFileSync(path.join(ROOT, p.file), 'utf8'));
  const b = norm(fs.readFileSync(path.join(ROOT, '_site', p.file), 'utf8'));
  if (a === b) { console.log('OK  ', p.file); continue; }
  bad++;
  let i = 0; while (a[i] === b[i]) i++;
  console.log('RÓŻNICA', p.file, '\n  szablon:', a.slice(i - 80, i + 120), '\n  wynik:  ', b.slice(i - 80, i + 120));
}
process.exit(bad ? 1 : 0);
