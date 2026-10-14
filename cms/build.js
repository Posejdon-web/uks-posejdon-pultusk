// Buduje gotową stronę (katalog _site) z szablonów i treści z panelu.
'use strict';
const { fs, path, ROOT, DATA, PAGES, LISTS, ORIGINAL_CONTACT, readTemplate, q, qa, mapScope, applyScope } = require('./lib');
const { H, replaceItems, children, itemSel } = require('./listy');
const menu = require('./menu');
const { writeAdminConfig } = require('./config');

const OUT = path.join(ROOT, '_site');

function readJSON(rel) {
  const f = path.join(DATA, rel);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
}

function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

function replaceContact(doc, kontakt) {
  if (!kontakt) return;
  const pairs = [];
  const digits = (s) => String(s || '').replace(/[^\d+]/g, '');
  const tel = (s) => { const d = digits(s); return d.startsWith('+') ? d : '+48' + d.replace(/^48(?=\d{9}$)/, ''); };
  if (kontakt.telefon && kontakt.telefon !== ORIGINAL_CONTACT.telefon) {
    pairs.push([ORIGINAL_CONTACT.telefon, kontakt.telefon]);
    pairs.push(['tel:' + tel(ORIGINAL_CONTACT.telefon), 'tel:' + tel(kontakt.telefon)]);
  }
  if (kontakt.email && kontakt.email !== ORIGINAL_CONTACT.email) pairs.push([ORIGINAL_CONTACT.email, kontakt.email]);
  if (kontakt.facebook && kontakt.facebook !== ORIGINAL_CONTACT.facebook) pairs.push([ORIGINAL_CONTACT.facebook, kontakt.facebook]);
  if (!pairs.length) return;
  const rep = (s) => pairs.reduce((acc, [a, b]) => acc.split(a).join(b), s);
  const walk = (n) => {
    if (n.nodeType === 3) { const v = rep(n.data); if (v !== n.data) n.data = v; return; }
    if (n.nodeType !== 1) return;
    for (const attr of ['href', 'content']) {
      if (n.hasAttribute(attr)) { const v = n.getAttribute(attr); const r = rep(v); if (r !== v) n.setAttribute(attr, r); }
    }
    for (const c of Array.from(n.childNodes)) walk(c);
  };
  walk(doc.documentElement);
}

function applySeo(doc, seo) {
  if (!seo) return;
  if (seo.tytul) {
    q(doc, 'title').textContent = seo.tytul;
    const og = q(doc, 'meta[property="og:title"]'); if (og) og.setAttribute('content', seo.tytul);
  }
  if (seo.opis != null) {
    const m = q(doc, 'meta[name="description"]'); if (m) m.setAttribute('content', seo.opis);
    const og = q(doc, 'meta[property="og:description"]'); if (og) og.setAttribute('content', seo.opis);
  }
}

// Przekierowanie linków z e-maili (zaproszenie, reset hasła) do panelu /admin.
const IDENTITY_REDIRECT = '<script>if(/(invite|recovery|confirmation|email_change)_token=/.test(location.hash))location.replace("/admin/"+location.hash);</script>';

function renderPage(page, store) {
  const doc = readTemplate(page);
  // 1. mapowanie na nietkniętym szablonie
  const mainMap = mapScope(doc, page.slug, 'main');
  const globMap = mapScope(doc, page.slug, 'global');
  const lists = [];
  for (const [name, places] of Object.entries(LISTS)) {
    for (const p of places) if (p.page === page.slug) lists.push({ name, place: page.slug, el: q(doc, p.sel) });
  }
  // 2. teksty i zdjęcia
  applyScope(mainMap, store.strony[page.slug]);
  applyScope(globMap, store.wspolne);
  // 3. listy
  for (const l of lists) {
    const data = store.listy[l.name];
    if (!data || !Array.isArray(data.elementy)) continue;
    const sel = itemSel(l.name, l.place);
    replaceItems(l.el, sel, data.elementy, (protos, d, i) => H[l.name].render(protos, d, i, l.place));
  }
  // 4. menu
  menu.render(doc, store.menu, page.url);
  // 5. dane kontaktowe i SEO
  replaceContact(doc, store.kontakt);
  applySeo(doc, (store.strony[page.slug] || {}).seo);
  let html = '<!doctype html>\n' + doc.documentElement.outerHTML + '\n';
  if (page.slug === 'index') html = html.replace('</head>', IDENTITY_REDIRECT + '\n</head>');
  return html;
}

function loadStore() {
  const store = { strony: {}, listy: {} };
  for (const p of PAGES) store.strony[p.slug] = readJSON(`strony/${p.slug}.json`);
  store.wspolne = readJSON('wspolne.json');
  store.menu = readJSON('menu.json');
  store.kontakt = readJSON('kontakt.json');
  for (const name of Object.keys(LISTS)) store.listy[name] = readJSON(`listy/${name}.json`);
  return store;
}

function build({ out = OUT, withAssets = true } = {}) {
  const store = loadStore();
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const p of PAGES) fs.writeFileSync(path.join(out, p.file), renderPage(p, store));
  if (withAssets) {
    copyDir(path.join(ROOT, 'assets'), path.join(out, 'assets'));
    copyDir(path.join(ROOT, 'dokumenty'), path.join(out, 'dokumenty'));
    copyDir(path.join(ROOT, 'admin'), path.join(out, 'admin'));
    writeAdminConfig(path.join(out, 'admin', 'config.yml'));
  }
  console.log('Zbudowano stronę w', out);
}

module.exports = { build, renderPage, loadStore };
if (require.main === module) build();
