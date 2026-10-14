# Strona UKS Posejdon – Athletic Pułtusk

Strona klubu z panelem administratora (Decap CMS) pod adresem **/admin**.

## Jak to działa
- `*.html` w katalogu głównym to **szablony** (oryginalny wygląd strony) – nie edytuj ich ręcznie.
- Treści edytowane w panelu są zapisywane w `cms/tresci/*.json`.
- Netlify przy każdej publikacji uruchamia `npm run build` (`cms/build.js`), który wstawia treści do szablonów i tworzy gotową stronę w `_site/`.
- Konfiguracja panelu (`admin/config.yml`) jest generowana automatycznie przez `cms/config.js`.
- `node cms/sprawdz.js` sprawdza, czy strona zbudowana z treści wygląda identycznie jak szablony.
- Zdjęcia: `assets/img/…` (nowe trafiają do `assets/img`), dokumenty: `dokumenty/`.

## Logowanie
Netlify Identity (tylko osoby zaproszone) + Git Gateway. Zmiany zapisują się jako wersje robocze z podglądem; na stronie pojawiają się po kliknięciu „Opublikuj”.
