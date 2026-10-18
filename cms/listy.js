// Listy, w których można dodawać, usuwać i zmieniać kolejność elementów.
'use strict';
const { q, qa, clean, NEWS_CATS, normalizeAsset, toPanelPath, initials, setText, setFirstText } = require('./lib');

const children = (el, sel) => Array.from(el.children).filter((c) => c.matches(sel));

// Zastępuje elementy listy nowymi (klony wzorców), wstawiając je w miejsce starych.
function replaceItems(container, itemSel, items, makeItem) {
  const old = children(container, itemSel);
  const protos = old.map((o) => o.cloneNode(true));
  const anchor = old.length ? old[old.length - 1].nextSibling : null;
  // separator (np. "\n") między elementami w oryginale
  const sep = old.length > 1 && old[0].nextSibling && old[0].nextSibling.nodeType === 3 ? old[0].nextSibling.data : '';
  for (const o of old) {
    const next = o.nextSibling;
    if (sep && next && next.nodeType === 3 && next.data === sep && next !== anchor) next.remove();
    o.remove();
  }
  const doc = container.ownerDocument;
  items.forEach((data, i) => {
    const el = makeItem(protos, data, i);
    if (!el) return;
    if (anchor) container.insertBefore(el, anchor); else container.appendChild(el);
    if (sep && i < items.length - 1) {
      const t = doc.createTextNode(sep);
      if (anchor) container.insertBefore(t, anchor); else container.appendChild(t);
    }
  });
}

const H = {
  trenerzy: {
    item: 'article',
    extract(items, place) {
      return items.map((a) => {
        const img = q(a, '.pic img');
        const o = {
          imie: clean(q(a, 'h3').textContent),
          rola: clean(q(a, '.role').textContent),
          zdjecie: img ? toPanelPath(img.getAttribute('src')) : '',
          alt: img ? img.getAttribute('alt') : '',
        };
        o[place === 'index' ? 'opis_glowna' : 'opis'] = clean(q(a, '.body > p:not(.role)').textContent);
        return o;
      });
    },
    render(protos, d, i, place) {
      const withPhoto = protos.find((p) => q(p, '.pic img'));
      const noPhoto = protos.find((p) => !q(p, '.pic img'));
      const el = ((d.zdjecie ? withPhoto : noPhoto) || protos[0]).cloneNode(true);
      setText(q(el, '.role'), d.rola);
      setText(q(el, 'h3'), d.imie);
      const desc = place === 'index' ? (d.opis_glowna || d.opis) : (d.opis || d.opis_glowna);
      setText(q(el, '.body > p:not(.role)'), desc || '');
      const img = q(el, '.pic img');
      if (img) {
        img.setAttribute('src', normalizeAsset(d.zdjecie));
        img.setAttribute('alt', d.alt || `${d.imie} – trener UKS Posejdon – Athletic Pułtusk`);
      } else setText(q(el, '.pic b'), initials(d.imie));
      return el;
    },
  },
  aktualnosci: {
    item: 'article',
    extract(items) {
      return items.map((a) => {
        const img = q(a, '.ph img');
        const board = q(a, '.board');
        const chip = q(a, '.chip');
        const cat = Object.entries(NEWS_CATS).find(([, v]) => v.label === clean(chip.textContent));
        const link = q(a, 'a.more');
        return {
          kategoria: cat ? cat[0] : 'zawody',
          data: clean(q(a, '.meta > span:not(.chip)').textContent),
          tytul: clean(q(a, 'h3').textContent),
          tresc: clean(q(a, '.body > p').textContent),
          zdjecie: img ? toPanelPath(img.getAttribute('src')) : '',
          alt: img ? img.getAttribute('alt') : '',
          plansza: board ? q(board, 'b').innerHTML.split(/<br\s*\/?>/i).map(clean).join('\n') : '',
          plansza_kolor: board ? (board.getAttribute('class').replace('board', '').trim() || 'granat') : 'granat',
          link: link ? link.getAttribute('href') : '/aktualnosci',
        };
      });
    },
    render(protos, d) {
      const withPhoto = protos.find((p) => q(p, '.ph img'));
      const withBoard = protos.find((p) => q(p, '.board'));
      const el = ((d.zdjecie || !d.plansza ? withPhoto : withBoard) || protos[0]).cloneNode(true);
      const cat = NEWS_CATS[d.kategoria] || NEWS_CATS.zawody;
      el.setAttribute('data-cat', d.kategoria || 'zawody');
      const chip = q(el, '.chip');
      chip.setAttribute('class', 'chip ' + cat.chip);
      chip.textContent = cat.label;
      setText(q(el, '.meta > span:not(.chip)'), d.data);
      setText(q(el, 'h3'), d.tytul);
      setText(q(el, '.body > p'), d.tresc);
      const more = q(el, 'a.more');
      if (more) more.setAttribute('href', d.link || '/aktualnosci');
      const img = q(el, '.ph img');
      if (img) {
        img.setAttribute('src', normalizeAsset(d.zdjecie || ''));
        img.setAttribute('alt', d.alt || d.tytul || '');
      }
      const board = q(el, '.board');
      if (board) {
        const kolor = d.plansza_kolor && d.plansza_kolor !== 'granat' ? d.plansza_kolor : '';
        board.setAttribute('class', 'board ' + kolor);
        const b = q(board, 'b');
        b.textContent = '';
        String(d.plansza || '').split('\n').forEach((line, k) => {
          if (k) b.appendChild(b.ownerDocument.createElement('br'));
          b.appendChild(b.ownerDocument.createTextNode(line.trim()));
        });
      }
      return el;
    },
  },
  galeria: {
    item: '.ph',
    extract(items) {
      return items.map((p) => {
        const cls = p.getAttribute('class').split(/\s+/);
        return {
          zdjecie: toPanelPath(q(p, 'img').getAttribute('src')),
          alt: q(p, 'img').getAttribute('alt'),
          podpis: clean(q(p, '.tag').textContent),
          kategoria: p.getAttribute('data-cat'),
          rozmiar: cls.includes('h2x') ? 'duze' : cls.includes('w2') ? 'szerokie' : 'zwykle',
        };
      });
    },
    render(protos, d) {
      const el = protos[0].cloneNode(true);
      const size = { duze: 'w2 h2x', szerokie: 'w2', zwykle: '' }[d.rozmiar] || '';
      el.setAttribute('class', ['ph', size, 'hov'].filter(Boolean).join(' '));
      el.setAttribute('data-cat', d.kategoria || 'wyd');
      q(el, 'img').setAttribute('src', normalizeAsset(d.zdjecie));
      q(el, 'img').setAttribute('alt', d.alt || d.podpis || '');
      setText(q(el, '.tag'), d.podpis);
      return el;
    },
  },
  dokumenty: {
    item: 'li',
    extract(items) {
      return items.map((li) => ({
        nazwa: clean(q(li, 'b').textContent),
        plik: toPanelPath(q(li, 'a').getAttribute('href')),
        opis: clean(q(li, 'a > span > span').textContent),
      }));
    },
    render(protos, d) {
      const el = protos[0].cloneNode(true);
      q(el, 'a').setAttribute('href', normalizeAsset(d.plik));
      setText(q(el, 'b'), d.nazwa);
      setText(q(el, 'a > span > span'), d.opis || 'PDF · do pobrania');
      return el;
    },
  },
  zawody: {
    item: { index: '.ev', aktualnosci: '.cal' },
    extract(items, place) {
      if (place === 'index') {
        return items.map((e) => ({
          dzien: clean(q(e, '.date b').textContent),
          miesiac: clean(q(e, '.date span').textContent),
          nazwa: clean(q(e, 'strong').textContent),
          opis: clean(q(e, 'small').textContent),
          miejsce: clean(q(e, ':scope > p').textContent),
        }));
      }
      return items.map((e) => ({ miejsce_kalendarz: clean(q(e, 'span').textContent) }));
    },
    render(protos, d, i, place) {
      const el = (i === 0 ? protos[0] : protos[1] || protos[0]).cloneNode(true);
      if (place === 'index') {
        setText(q(el, '.date b'), d.dzien);
        setText(q(el, '.date span'), d.miesiac);
        setText(q(el, 'strong'), d.nazwa);
        setText(q(el, 'small'), d.opis);
        setText(q(el, ':scope > p'), d.miejsce);
      } else {
        setText(q(el, '.dd b'), d.dzien);
        setText(q(el, '.dd small'), d.miesiac);
        setText(q(el, 'strong'), d.nazwa);
        setText(q(el, 'span'), d.miejsce_kalendarz || d.miejsce);
      }
      return el;
    },
  },
  sukcesy: {
    item: 'div',
    extract(items) {
      return items.map((e) => ({
        rok: clean(q(e, 'b').textContent),
        tytul: clean(q(e, 'strong').textContent),
        opis: clean(q(e, 'p > span').textContent),
      }));
    },
    render(protos, d) {
      const el = protos[0].cloneNode(true);
      setText(q(el, 'b'), d.rok);
      setText(q(el, 'strong'), d.tytul);
      setText(q(el, 'p > span'), d.opis);
      return el;
    },
  },
  partnerzy: {
    item: 'span',
    extract(items) { return items.map((s) => ({ nazwa: clean(s.textContent) })); },
    render(protos, d) { const el = protos[0].cloneNode(true); setText(el, d.nazwa); return el; },
  },
};

function itemSel(name, place) {
  const it = H[name].item;
  return typeof it === 'string' ? it : it[place];
}

module.exports = { H, replaceItems, children, itemSel };
