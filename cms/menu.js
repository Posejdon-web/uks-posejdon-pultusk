// Menu główne, menu mobilne i kolumny linków w stopce.
'use strict';
const { q, qa, clean, setFirstText } = require('./lib');

function extract(doc) {
  const nav = q(doc, 'nav.nav');
  const pozycje = Array.from(nav.children).map((c) => {
    if (c.tagName === 'A') return { tekst: clean(c.textContent), link: c.getAttribute('href'), podmenu: [] };
    return {
      tekst: clean(q(c, '.nav-dd-btn').textContent),
      link: '',
      podmenu: qa(c, '.nav-dd-menu a').map((a) => ({ tekst: clean(a.textContent), link: a.getAttribute('href') })),
    };
  });
  const cols = qa(doc, 'footer .fcols > div').slice(1, 3).map((col) => ({
    tytul: clean(q(col, 'h4').textContent),
    linki: qa(col, 'li a').map((a) => ({ tekst: clean(a.textContent), link: a.getAttribute('href') })),
  }));
  return { pozycje, stopka: cols };
}

function link(doc, text, href, current) {
  const a = doc.createElement('a');
  if (current && href === current) a.setAttribute('aria-current', 'page');
  a.setAttribute('href', href || '#');
  a.textContent = text;
  return a;
}

function render(doc, data, currentUrl) {
  if (!data) return;
  const current = currentUrl === '/' ? null : currentUrl;
  const nav = q(doc, 'nav.nav');
  const ddProto = q(nav, '.nav-dd').cloneNode(true);
  nav.textContent = '';
  let ddCount = 0;
  const topLinks = new Set((data.pozycje || []).filter((p) => !(p.podmenu || []).length).map((p) => p.link));
  for (const p of data.pozycje || []) {
    const sub = (p.podmenu || []).filter((s) => s.tekst);
    if (sub.length) {
      ddCount++;
      const dd = ddProto.cloneNode(true);
      const id = ddCount === 1 ? 'sekcje-menu' : 'sekcje-menu-' + ddCount;
      const btn = q(dd, '.nav-dd-btn');
      btn.setAttribute('aria-controls', id);
      setFirstText(btn, p.tekst);
      const menu = q(dd, '.nav-dd-menu');
      menu.setAttribute('id', id);
      menu.textContent = '';
      let active = false;
      for (const s of sub) {
        if (current && s.link === current && !topLinks.has(current)) active = true;
        menu.appendChild(link(doc, s.tekst, s.link, current));
      }
      dd.setAttribute('class', active ? 'nav-dd is-active' : 'nav-dd');
      nav.appendChild(dd);
    } else if (p.tekst) {
      nav.appendChild(link(doc, p.tekst, p.link, current));
    }
  }
  // menu mobilne: wszystkie pozycje „na płasko”, bez powtórzeń adresów
  const mnav = q(doc, 'nav.mnav');
  const cta = q(mnav, 'a.btn').cloneNode(true);
  const headCta = q(doc, '.head-cta a.btn');
  if (headCta) { cta.textContent = headCta.textContent; cta.setAttribute('href', headCta.getAttribute('href')); }
  mnav.textContent = '';
  const seen = new Set((data.pozycje || []).filter((p) => !(p.podmenu || []).length).map((p) => p.link));
  for (const p of data.pozycje || []) {
    const sub = (p.podmenu || []).filter((s) => s.tekst);
    if (sub.length) {
      for (const s of sub) {
        if (seen.has(s.link)) continue;
        seen.add(s.link);
        mnav.appendChild(link(doc, s.tekst, s.link, current));
      }
    } else if (p.tekst) mnav.appendChild(link(doc, p.tekst, p.link, current));
  }
  mnav.appendChild(cta);
  // stopka
  const cols = qa(doc, 'footer .fcols > div').slice(1, 3);
  cols.forEach((col, i) => {
    const d = (data.stopka || [])[i];
    if (!d) return;
    q(col, 'h4').textContent = d.tytul;
    const ul = q(col, 'ul');
    ul.textContent = '';
    for (const l of d.linki || []) {
      const li = doc.createElement('li');
      li.appendChild(link(doc, l.tekst, l.link, null));
      ul.appendChild(li);
    }
  });
}

module.exports = { extract, render };
