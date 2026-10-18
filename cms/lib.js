// Wspólna logika: odczyt treści z szablonów HTML i ich ponowne złożenie.
// Szablony = oryginalne pliki *.html w katalogu głównym repozytorium (nie edytuj ich ręcznie).
'use strict';
const fs = require('fs');
const path = require('path');
const { parseHTML } = require('linkedom');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(__dirname, 'tresci');

const PAGES = [
  { slug: 'index', file: 'index.html', nazwa: 'Strona główna', url: '/' },
  { slug: 'o-klubie', file: 'o-klubie.html', nazwa: 'O klubie', url: '/o-klubie' },
  { slug: 'treningi', file: 'treningi.html', nazwa: 'Treningi', url: '/treningi' },
  { slug: 'piecioboj-nowoczesny', file: 'piecioboj-nowoczesny.html', nazwa: 'Pięciobój nowoczesny', url: '/piecioboj-nowoczesny' },
  { slug: 'triathlon', file: 'triathlon.html', nazwa: 'Triathlon', url: '/triathlon' },
  { slug: 'aktualnosci', file: 'aktualnosci.html', nazwa: 'Aktualności', url: '/aktualnosci' },
  { slug: 'kontakt', file: 'kontakt.html', nazwa: 'Kontakt', url: '/kontakt' },
  { slug: 'polityka-prywatnosci', file: 'polityka-prywatnosci.html', nazwa: 'Polityka prywatności', url: '/polityka-prywatnosci' },
];

// Wartości z szablonów, które panel zamienia globalnie (Dane kontaktowe).
const ORIGINAL_CONTACT = {
  telefon: '515 156 693',
  email: 'posejdonpultusk@gmail.com',
  facebook: 'https://www.facebook.com/profile.php?id=100057590104323',
};

const NEWS_CATS = {
  zawody: { chip: 'zaw', label: 'Zawody' },
  ogloszenia: { chip: 'ogl', label: 'Ogłoszenia' },
  wydarzenia: { chip: 'wyd', label: 'Wydarzenia' },
  dotacje: { chip: '', label: 'Dotacje' },
};

function readTemplate(page) {
  const html = fs.readFileSync(path.join(ROOT, page.file), 'utf8');
  return parseHTML(html).document;
}

const q = (root, sel) => root.querySelector(sel);
const qa = (root, sel) => Array.from(root.querySelectorAll(sel));
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
const HAS_CONTENT = /[\p{L}\p{N}]/u;

// ---------- Listy specjalne (elementy, które można dodawać i usuwać) ----------
// Każda lista: gdzie występuje w szablonach.
const LISTS = {
  trenerzy: [
    { page: 'o-klubie', sel: '#trenerzy .g4' },
    { page: 'index', sel: '#trenerzy .g4' },
  ],
  aktualnosci: [{ page: 'aktualnosci', sel: '#lista' }],
  galeria: [{ page: 'index', sel: '#bento' }],
  dokumenty: [{ page: 'kontakt', sel: '#dokumenty ul.g4' }],
  zawody: [
    { page: 'index', sel: '#zawody .events' },
    { page: 'aktualnosci', sel: 'aside .box.dark' },
  ],
  sukcesy: [{ page: 'index', sel: '#sukcesy .tl' }],
  partnerzy: [
    { page: 'index', sel: '.partners .wrap > div' },
    { page: 'o-klubie', sel: '.partners .wrap > div' },
  ],
};

// Elementy wykluczone z edycji „tekst po tekście” (obsługiwane osobno).
function excludedRoots(doc, slug) {
  const out = [];
  const { H, children, itemSel } = require('./listy');
  for (const [name, places] of Object.entries(LISTS)) {
    for (const p of places) {
      if (p.page !== slug) continue;
      const el = q(doc, p.sel);
      if (!el) throw new Error(`Brak elementu ${p.sel} na stronie ${slug}`);
      out.push(...children(el, itemSel(name, slug)));
    }
  }
  out.push(q(doc, 'nav.nav'), q(doc, 'nav.mnav'));
  const fcols = qa(doc, 'footer .fcols > div');
  out.push(fcols[1], fcols[2]); // kolumny menu w stopce
  return out.filter(Boolean);
}

function isInside(node, roots) {
  for (let n = node; n; n = n.parentNode) if (roots.includes(n)) return true;
  return false;
}
function inSvgOrScript(node) {
  for (let n = node.parentNode; n && n.tagName; n = n.parentNode) {
    const t = n.tagName.toLowerCase();
    if (t === 'svg' || t === 'script' || t === 'style') return true;
  }
  return false;
}

const EMPTY_LEAF = new Set(['P', 'B', 'DD', 'TD', 'STRONG', 'H1', 'H2', 'H3', 'H4', 'SPAN']);

function labelFor(el) {
  const tag = el.tagName.toLowerCase();
  const cls = (el.getAttribute('class') || '').split(/\s+/);
  const inPara = el.closest && el.closest('p');
  if (tag === 'h1') return 'Tytuł strony';
  if (tag === 'h2') return 'Nagłówek';
  if (tag === 'h3' || tag === 'h4') return 'Podtytuł';
  if (cls.includes('eb')) return 'Nadtytuł (mały napis nad nagłówkiem)';
  if (cls.includes('crumbs') || (el.closest && el.closest('.crumbs'))) return 'Ścieżka nawigacji';
  if (cls.includes('btn') || (el.closest && el.closest('.btn'))) return 'Tekst przycisku';
  if (tag === 'summary') return 'Pytanie';
  if (tag === 'dt') return 'Etykieta';
  if (tag === 'dd') {
    const dt = el.previousElementSibling;
    return 'Wartość: ' + (dt ? clean(dt.textContent) : '');
  }
  if (tag === 'td' || tag === 'th') return 'Komórka tabeli';
  if (tag === 'li') return 'Punkt listy';
  if (tag === 'label') return 'Opis pola formularza';
  if (tag === 'option') return 'Opcja do wyboru';
  if (tag === 'button') return 'Tekst przycisku';
  if (tag === 'a') return inPara ? 'Link w akapicie' : 'Tekst linku';
  if (tag === 'p') return el.closest && el.closest('details') ? 'Odpowiedź' : 'Akapit';
  if (inPara) return 'Fragment akapitu (wyróżniony)';
  if (tag === 'small') return 'Mały tekst / etykieta';
  if (tag === 'b' || tag === 'strong') {
    const sm = el.parentNode && Array.from(el.parentNode.children).find((c) => c.tagName === 'SMALL');
    if (sm && el.parentNode.firstElementChild === sm) return 'Wartość: ' + clean(sm.textContent);
    return 'Wyróżniony tekst';
  }
  if (tag === 'caption') return 'Opis tabeli (dla czytników ekranu)';
  return 'Tekst';
}

function textWithBreaks(el) {
  const c = el.cloneNode(true);
  qa(c, 'br').forEach((b) => b.replaceWith(c.ownerDocument.createTextNode(' ')));
  return clean(c.textContent);
}

function sectionName(sec, i) {
  const h = q(sec, 'h1, h2');
  let name = h ? textWithBreaks(h) : '';
  if (!name) { const eb = q(sec, '.eb, .k'); name = eb ? clean(eb.textContent) : ''; }
  if (!name) name = sec.getAttribute('aria-label') || '';
  if (!name && sec.classList && sec.classList.contains('marquee')) name = 'Przewijany pasek z hasłami';
  return `${i + 1}. ${name || 'Sekcja'}`;
}

// Zbiera edytowalne elementy w obrębie bloku (bez list specjalnych).
function collectBlock(block, excluded) {
  const texts = [];
  const images = [];
  const walker = (node) => {
    if (excluded.includes(node)) return;
    if (node.nodeType === 3) {
      const v = node.data;
      if (HAS_CONTENT.test(v) && !inSvgOrScript(node)) texts.push({ node, kind: 'text' });
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toUpperCase();
    if (tag === 'SVG' || tag === 'SCRIPT' || tag === 'STYLE') return;
    if (tag === 'IMG') { images.push(node); return; }
    if (EMPTY_LEAF.has(tag) && node.childNodes.length === 0 && !node.hasAttribute('hidden') &&
        node.getAttribute('role') !== 'status' && !(node.getAttribute('class') || '').split(/\s+/).some((c) => ['dot', 'tag', 'ic'].includes(c))) {
      texts.push({ node, kind: 'empty' });
      return;
    }
    for (const c of Array.from(node.childNodes)) walker(c);
  };
  walker(block);
  return { texts, images };
}

function blocksFor(doc, scope) {
  if (scope === 'main') {
    const main = q(doc, 'main');
    return Array.from(main.children);
  }
  // wspólne: nagłówek, stopka, pasek mobilny, okno cookies
  return [q(doc, 'header.site-head'), q(doc, 'footer.site-foot'), q(doc, 'nav.mbar'), q(doc, '#cookie')];
}
const GLOBAL_NAMES = ['1. Nagłówek strony (logo i przycisk)', '2. Stopka', '3. Pasek szybkich akcji (telefon)', '4. Okno zgody na cookies'];

// Zwraca strukturę sekcji z odwołaniami do węzłów DOM.
function mapScope(doc, slug, scope) {
  const excluded = excludedRoots(doc, slug);
  const blocks = blocksFor(doc, scope);
  return blocks.map((block, i) => {
    const { texts, images } = collectBlock(block, excluded);
    return {
      id: 's' + (i + 1),
      nazwa: scope === 'main' ? sectionName(block, i) : GLOBAL_NAMES[i],
      teksty: texts.map((t, j) => ({
        id: `s${i + 1}t${j + 1}`,
        node: t.node,
        kind: t.kind,
        opis: labelFor(t.kind === 'text' ? t.node.parentNode : t.node),
        tekst: t.kind === 'text' ? clean(t.node.data) : '',
      })),
      zdjecia: images.map((img, j) => ({
        id: `s${i + 1}z${j + 1}`,
        node: img,
        opis: 'Zdjęcie ' + (j + 1),
        plik: toPanelPath(img.getAttribute('src') || ''),
        alt: img.getAttribute('alt') || '',
      })),
    };
  });
}

function stripNodes(sections) {
  return sections.map((s) => ({
    id: s.id,
    nazwa: s.nazwa,
    teksty: s.teksty.map(({ id, opis, tekst }) => ({ id, opis, tekst })),
    zdjecia: s.zdjecia.map(({ id, opis, plik, alt }) => ({ id, opis, plik, alt })),
  }));
}

function escapeText(s) { return s; } // linkedom sam koduje znaki specjalne

function applyScope(mapped, data) {
  if (!data || !Array.isArray(data.sekcje)) return;
  const byId = new Map();
  for (const s of data.sekcje) {
    for (const t of s.teksty || []) byId.set(t.id, t);
    for (const z of s.zdjecia || []) byId.set(z.id, z);
  }
  for (const s of mapped) {
    for (const t of s.teksty) {
      const d = byId.get(t.id);
      if (!d || d.tekst == null) continue;
      const val = String(d.tekst).replace(/\s*\n\s*/g, ' ').trim();
      if (val === t.tekst) continue; // bez zmian – zostaw dokładnie oryginał
      if (t.kind === 'text') {
        const m = t.node.data.match(/^(\s*)[\s\S]*?(\s*)$/);
        t.node.data = m[1] + val + m[2];
      } else {
        t.node.textContent = val;
      }
    }
    for (const z of s.zdjecia) {
      const d = byId.get(z.id);
      if (!d) continue;
      if (d.plik && normalizeAsset(d.plik) !== normalizeAsset(z.plik)) z.node.setAttribute('src', normalizeAsset(d.plik));
      if (d.alt != null && d.alt !== z.alt) z.node.setAttribute('alt', d.alt);
    }
  }
}

// W panelu ścieżki plików zaczynają się od „/” (wtedy panel pokazuje podgląd zdjęcia).
function toPanelPath(p) {
  if (!p || /^(https?:)?\/\//.test(p) || p.startsWith('/') || p.startsWith('#') || /^(mailto|tel):/.test(p)) return p;
  return '/' + p;
}

function normalizeAsset(p) {
  if (!p) return p;
  if (/^https?:\/\//.test(p)) return p;
  return p.replace(/^\/+/, '');
}

function initials(name) {
  return clean(name).split(' ').filter(Boolean).map((w) => w[0].toUpperCase()).slice(0, 2).join('');
}

function setText(el, val) { if (el) el.textContent = val == null ? '' : String(val); }
// Ustawia pierwszy węzeł tekstowy elementu (zachowuje ikony svg).
function setFirstText(el, val) {
  if (!el) return;
  const tn = Array.from(el.childNodes).find((n) => n.nodeType === 3 && HAS_CONTENT.test(n.data));
  if (tn) { const m = tn.data.match(/^(\s*)[\s\S]*?(\s*)$/); tn.data = m[1] + val + m[2]; }
}

module.exports = {
  fs, path, ROOT, DATA, PAGES, LISTS, ORIGINAL_CONTACT, NEWS_CATS, parseHTML,
  readTemplate, q, qa, clean, mapScope, stripNodes, applyScope, normalizeAsset, toPanelPath,
  initials, setText, setFirstText, HAS_CONTENT,
};
