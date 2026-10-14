(function () {
  'use strict';

  // Menu mobilne
  var head = document.querySelector('.site-head');
  var burger = document.querySelector('.burger');
  if (head && burger) {
    burger.addEventListener('click', function () {
      var open = head.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
    });
  }

  // Filtry (treningi, aktualności, galeria)
  document.querySelectorAll('[data-filter-group]').forEach(function (group) {
    var target = document.getElementById(group.getAttribute('data-filter-group'));
    if (!target) return;
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      var f = btn.getAttribute('data-filter');
      group.querySelectorAll('button[data-filter]').forEach(function (b) {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      target.querySelectorAll('[data-cat]').forEach(function (item) {
        var cats = item.getAttribute('data-cat').split(' ');
        item.hidden = !(f === 'all' || cats.indexOf(f) !== -1);
      });
      var empty = target.querySelector('.empty-msg');
      if (empty) {
        var any = target.querySelector('[data-cat]:not([hidden])');
        empty.hidden = !!any;
      }
    });
  });

  // Zgoda na cookies
  var KEY = 'posejdon-cookie-consent';
  function readConsent() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function saveConsent(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* tryb prywatny */ }
  }
  var banner = document.getElementById('cookie');
  if (banner) {
    var prefs = banner.querySelector('fieldset');
    var stats = document.getElementById('ck-stats');
    var media = document.getElementById('ck-media');
    var current = readConsent();
    if (!current) banner.hidden = false;
    banner.addEventListener('click', function (e) {
      var a = e.target.closest('[data-ck]');
      if (!a) return;
      var act = a.getAttribute('data-ck');
      if (act === 'settings') { prefs.hidden = !prefs.hidden; return; }
      var v = { necessary: true, stats: false, media: false, date: new Date().toISOString() };
      if (act === 'all') { v.stats = true; v.media = true; }
      if (act === 'save') { v.stats = !!(stats && stats.checked); v.media = !!(media && media.checked); }
      saveConsent(v);
      banner.hidden = true;
    });
    document.querySelectorAll('[data-open-cookies]').forEach(function (l) {
      l.addEventListener('click', function (e) {
        e.preventDefault();
        var c = readConsent();
        if (c && stats) stats.checked = !!c.stats;
        if (c && media) media.checked = !!c.media;
        prefs.hidden = false;
        banner.hidden = false;
      });
    });
  }

  // Formularz kontaktowy (Netlify Forms; poza Netlify pokazuje adres e-mail)
  document.querySelectorAll('form[data-contact]').forEach(function (form) {
    var msg = form.querySelector('.fmsg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var data = new URLSearchParams(new FormData(form)).toString();
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: data })
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          msg.className = 'fmsg ok';
          msg.textContent = 'Dziękujemy! Wiadomość trafiła do klubu. Odpowiemy najszybciej, jak to możliwe.';
          msg.hidden = false;
          form.reset();
        })
        .catch(function () {
          msg.className = 'fmsg err';
          msg.textContent = 'Nie udało się wysłać formularza. Napisz do nas bezpośrednio: posejdonpultusk@gmail.com lub zadzwoń: 515 156 693.';
          msg.hidden = false;
        })
        .then(function () { btn.disabled = false; });
    });
  });

  // Rok w stopce
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();

// Menu „Sekcje” – obsługa kliknięcia (dotyk/klawiatura)
(function () {
  document.querySelectorAll('.nav-dd').forEach(function (dd) {
    var btn = dd.querySelector('.nav-dd-btn');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = dd.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (!dd.contains(e.target)) { dd.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    });
    dd.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { dd.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
    });
  });
})();
