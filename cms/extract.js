// Jednorazowo odczytuje obecne treści z szablonów HTML i zapisuje je w cms/tresci (dla panelu).
// Uruchom: node cms/extract.js   (nie nadpisuje istniejących plików bez opcji --force)
'use strict';
const { fs, path, DATA, PAGES, LISTS, ORIGINAL_CONTACT, readTemplate, q, mapScope, stripNodes } = require('./lib');
const { H, children, itemSel } = require('./listy');
const menu = require('./menu');

const force = process.argv.includes('--force');
function write(rel, obj) {
  const f = path.join(DATA, rel);
  if (fs.existsSync(f) && !force) { console.log('pomijam (istnieje):', rel); return; }
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(obj, null, 2) + '\n');
  console.log('zapisano:', rel);
}

const docs = {};
for (const p of PAGES) docs[p.slug] = readTemplate(p);

for (const p of PAGES) {
  const doc = docs[p.slug];
  write(`strony/${p.slug}.json`, {
    seo: {
      tytul: q(doc, 'title').textContent,
      opis: (q(doc, 'meta[name="description"]') || { getAttribute: () => '' }).getAttribute('content'),
    },
    sekcje: stripNodes(mapScope(doc, p.slug, 'main')),
  });
}
write('wspolne.json', { sekcje: stripNodes(mapScope(docs.index, 'index', 'global')) });
write('menu.json', menu.extract(docs.index));
write('kontakt.json', { ...ORIGINAL_CONTACT });

for (const [name, places] of Object.entries(LISTS)) {
  let merged = null;
  for (const pl of places) {
    const el = q(docs[pl.page], pl.sel);
    const items = H[name].extract(children(el, itemSel(name, pl.page)), pl.page);
    if (!merged) merged = items;
    else merged = merged.map((m, i) => ({ ...(items[i] || {}), ...m }));
  }
  write(`listy/${name}.json`, { elementy: merged });
}
