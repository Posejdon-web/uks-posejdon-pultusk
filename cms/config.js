// Generuje konfigurację panelu Decap CMS (admin/config.yml) – opisy prostym językiem.
'use strict';
const { fs, path, PAGES } = require('./lib');

const SITE_URL = process.env.URL || 'https://uks-posejdon-pultusk.netlify.app';

const hidden = (name) => ({ name, label: name, widget: 'hidden' });
const str = (name, label, extra = {}) => ({ name, label, widget: 'string', ...extra });
const txt = (name, label, extra = {}) => ({ name, label, widget: 'text', ...extra });
const img = (name, label, extra = {}) => ({ name, label, widget: 'image', choose_url: false, ...extra });
const fixedList = { allow_add: false, allow_remove: false, allow_reorder: false };

const sekcjeField = {
  name: 'sekcje',
  label: 'Sekcje strony (od góry do dołu)',
  label_singular: 'sekcja',
  widget: 'list',
  ...fixedList,
  collapsed: true,
  summary: '{{fields.nazwa}}',
  hint: 'Kliknij sekcję, aby ją rozwinąć. Zmieniasz tylko teksty i zdjęcia – układ i wygląd strony pozostają bez zmian.',
  fields: [
    hidden('id'),
    hidden('nazwa'),
    {
      name: 'teksty', label: 'Teksty', label_singular: 'tekst', widget: 'list', ...fixedList,
      collapsed: false, summary: '{{fields.opis}}: {{fields.tekst}}',
      hint: 'Teksty w kolejności, w jakiej są na stronie. Popraw treść w polu „Treść”. Puste pole = puste miejsce na stronie.',
      fields: [hidden('id'), str('opis', 'Element strony (tylko informacja – nie zmieniaj)', { required: false }), txt('tekst', 'Treść', { required: false })],
    },
    {
      name: 'zdjecia', label: 'Zdjęcia', label_singular: 'zdjęcie', widget: 'list', ...fixedList,
      collapsed: false, summary: '{{fields.opis}}: {{fields.alt}}',
      hint: 'Aby wymienić zdjęcie, kliknij „Wybierz inny obraz” i wgraj nowy plik z komputera.',
      fields: [
        hidden('id'), str('opis', 'Element strony (tylko informacja – nie zmieniaj)', { required: false }),
        img('plik', 'Plik zdjęcia'),
        str('alt', 'Opis zdjęcia (dla niewidomych i Google)', { required: false }),
      ],
    },
  ],
};

function pageFiles() {
  return PAGES.map((p) => ({
    name: p.slug,
    label: p.nazwa,
    file: `cms/tresci/strony/${p.slug}.json`,
    fields: [
      {
        name: 'seo', label: 'Tytuł i opis strony w Google', widget: 'object', collapsed: true,
        fields: [
          str('tytul', 'Tytuł (widoczny na karcie przeglądarki i w Google)'),
          txt('opis', 'Krótki opis (wyświetlany w wynikach Google)', { required: false }),
        ],
      },
      sekcjeField,
    ],
  }));
}

const listFile = (name, label, file, singular, summary, fields, hint) => ({
  name, label, file: `cms/tresci/listy/${file}.json`,
  fields: [{ name: 'elementy', label, label_singular: singular, widget: 'list', collapsed: true, add_to_top: file === 'aktualnosci', summary, hint, fields }],
});

function config() {
  return {
    locale: 'pl',
    backend: {
      name: 'git-gateway',
      branch: 'main',
      commit_messages: {
        create: 'Panel: dodano „{{slug}}”', update: 'Panel: zmieniono „{{slug}}”', delete: 'Panel: usunięto „{{slug}}”',
        uploadMedia: 'Panel: dodano plik {{path}}', deleteMedia: 'Panel: usunięto plik {{path}}',
      },
    },
    publish_mode: 'editorial_workflow',
    site_url: SITE_URL,
    display_url: SITE_URL,
    logo_url: '/assets/img/logo-emblem.png',
    show_preview_links: true,
    media_folder: 'assets/img',
    public_folder: 'assets/img',
    collections: [
      {
        name: 'podstrony', label: 'Treści podstron', label_singular: 'podstrona',
        description: 'Teksty, nagłówki i zdjęcia na poszczególnych podstronach. Wybierz podstronę, rozwiń sekcję i popraw tekst.',
        editor: { preview: false },
        files: pageFiles(),
      },
      {
        name: 'listy', label: 'Trenerzy, aktualności, galeria…',
        description: 'Elementy, które można dodawać, usuwać i przestawiać (przeciągając).',
        editor: { preview: false },
        files: [
          listFile('aktualnosci', 'Aktualności (lista wpisów)', 'aktualnosci', 'wpis', '{{fields.data}} – {{fields.tytul}}', [
            { name: 'kategoria', label: 'Kategoria', widget: 'select', default: 'zawody', options: [
              { label: 'Zawody', value: 'zawody' }, { label: 'Ogłoszenia', value: 'ogloszenia' },
              { label: 'Wydarzenia', value: 'wydarzenia' }, { label: 'Dotacje', value: 'dotacje' }] },
            str('data', 'Data (np. 23.06.2026)'),
            str('tytul', 'Tytuł'),
            txt('tresc', 'Krótki opis'),
            img('zdjecie', 'Zdjęcie (opcjonalnie)', { required: false }),
            str('alt', 'Opis zdjęcia', { required: false }),
            txt('plansza', 'Napis na kolorowej planszy – gdy nie ma zdjęcia (nowa linia = Enter)', { required: false }),
            { name: 'plansza_kolor', label: 'Kolor planszy', widget: 'select', default: 'granat', options: [
              { label: 'Granatowy', value: 'granat' }, { label: 'Błękitny', value: 'sky' }, { label: 'Niebieski', value: 'blue' }] },
            str('link', 'Link „Czytaj więcej”', { default: '/aktualnosci', hint: 'Np. /aktualnosci lub /treningi#grafik' }),
          ], 'Nowy wpis pojawia się na górze listy. Kolejność możesz zmienić, przeciągając wpisy. Wpis bez zdjęcia pokaże kolorową planszę z napisem.'),
          listFile('zawody', 'Najbliższe zawody (kalendarz)', 'zawody', 'zawody', '{{fields.dzien}} {{fields.miesiac}} – {{fields.nazwa}}', [
            str('dzien', 'Dzień (np. 6)'), str('miesiac', 'Miesiąc (np. XII)'), str('nazwa', 'Nazwa zawodów'),
            str('opis', 'Dodatkowa informacja (np. organizator)', { required: false }),
            str('miejsce', 'Miejsce'),
            str('miejsce_kalendarz', 'Miejsce – w bocznym kalendarzu na stronie Aktualności (jeśli inne)', { required: false }),
          ], 'Lista na stronie głównej i w kalendarzu na stronie Aktualności.'),
          listFile('trenerzy', 'Trenerzy', 'trenerzy', 'trenera', '{{fields.imie}} – {{fields.rola}}', [
            str('imie', 'Imię i nazwisko'), str('rola', 'Funkcja (np. Trener · grupy A, B)'),
            txt('opis', 'Opis na stronie „O klubie”'), txt('opis_glowna', 'Opis na stronie głównej', { required: false }),
            img('zdjecie', 'Zdjęcie (opcjonalnie – bez zdjęcia pokażą się inicjały)', { required: false, media_folder: '/assets/img/trenerzy', public_folder: 'assets/img/trenerzy' }),
            str('alt', 'Opis zdjęcia', { required: false }),
          ], 'Wyświetlani na stronie głównej i na stronie „O klubie”.'),
          listFile('galeria', 'Galeria zdjęć (strona główna)', 'galeria', 'zdjęcie', '{{fields.podpis}}', [
            img('zdjecie', 'Zdjęcie'), str('alt', 'Opis zdjęcia'), str('podpis', 'Podpis na zdjęciu'),
            { name: 'kategoria', label: 'Kategoria (filtr)', widget: 'select', options: [
              { label: 'Treningi', value: 'tren' }, { label: 'Zawody', value: 'zaw' }, { label: 'Wyjazdy', value: 'wyj' }, { label: 'Wydarzenia', value: 'wyd' }] },
            { name: 'rozmiar', label: 'Rozmiar kafelka', widget: 'select', default: 'zwykle', options: [
              { label: 'Zwykły', value: 'zwykle' }, { label: 'Szeroki', value: 'szerokie' }, { label: 'Duży', value: 'duze' }] },
          ], 'Kolejność na liście = kolejność na stronie. Najlepiej 7 zdjęć, w tym jedno duże i dwa szerokie.'),
          listFile('dokumenty', 'Dokumenty do pobrania', 'dokumenty', 'dokument', '{{fields.nazwa}}', [
            str('nazwa', 'Nazwa dokumentu'),
            { name: 'plik', label: 'Plik (PDF, DOC…)', widget: 'file', choose_url: false, media_folder: '/dokumenty', public_folder: 'dokumenty' },
            str('opis', 'Opis pod nazwą', { default: 'PDF · do pobrania' }),
          ], 'Wyświetlane na stronie Kontakt w sekcji „Do pobrania”.'),
          listFile('sukcesy', 'Sukcesy – oś czasu (strona główna)', 'sukcesy', 'sukces', '{{fields.rok}} – {{fields.tytul}}', [
            str('rok', 'Rok'), str('tytul', 'Tytuł'), str('opis', 'Opis'),
          ]),
          listFile('partnerzy', 'Wspierają nas (partnerzy)', 'partnerzy', 'partnera', '{{fields.nazwa}}', [str('nazwa', 'Nazwa')]),
        ],
      },
      {
        name: 'ustawienia', label: 'Menu i dane klubu',
        description: 'Menu strony, linki w stopce oraz telefon, e-mail i Facebook (zmieniane na wszystkich podstronach naraz).',
        editor: { preview: false },
        files: [
          {
            name: 'menu', label: 'Menu i linki w stopce', file: 'cms/tresci/menu.json',
            fields: [
              {
                name: 'pozycje', label: 'Menu główne', label_singular: 'pozycję menu', widget: 'list', collapsed: true, summary: '{{fields.tekst}} → {{fields.link}}',
                hint: 'Kolejność na liście = kolejność w menu. Menu na telefonie tworzy się automatycznie.',
                fields: [
                  str('tekst', 'Nazwa w menu'),
                  str('link', 'Adres (np. /kontakt lub ./#galeria)', { required: false, hint: 'Zostaw puste, jeśli pozycja ma rozwijane podmenu.' }),
                  { name: 'podmenu', label: 'Podmenu (rozwijane)', label_singular: 'pozycję podmenu', widget: 'list', required: false, collapsed: true, summary: '{{fields.tekst}} → {{fields.link}}',
                    fields: [str('tekst', 'Nazwa'), str('link', 'Adres')] },
                ],
              },
              {
                name: 'stopka', label: 'Kolumny linków w stopce', widget: 'list', ...fixedList, collapsed: true, summary: '{{fields.tytul}}',
                fields: [
                  str('tytul', 'Tytuł kolumny'),
                  { name: 'linki', label: 'Linki', label_singular: 'link', widget: 'list', collapsed: true, summary: '{{fields.tekst}} → {{fields.link}}',
                    fields: [str('tekst', 'Nazwa'), str('link', 'Adres')] },
                ],
              },
            ],
          },
          {
            name: 'kontakt', label: 'Dane kontaktowe (telefon, e-mail, Facebook)', file: 'cms/tresci/kontakt.json',
            fields: [
              str('telefon', 'Telefon', { hint: 'Zmienia się wszędzie na stronie, także w przyciskach „Zadzwoń”.' }),
              str('email', 'E-mail'),
              str('facebook', 'Adres profilu na Facebooku'),
            ],
          },
          {
            name: 'wspolne', label: 'Nagłówek, stopka i okno cookies (teksty)', file: 'cms/tresci/wspolne.json',
            fields: [sekcjeField],
          },
        ],
      },
    ],
  };
}

function writeAdminConfig(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // JSON jest poprawnym YAML-em
  fs.writeFileSync(file, '# Wygenerowano automatycznie przez cms/config.js – nie edytuj ręcznie\n' + JSON.stringify(config(), null, 2) + '\n');
}

module.exports = { config, writeAdminConfig };
if (require.main === module) writeAdminConfig(path.join(__dirname, '..', 'admin', 'config.yml'));
