# DUE DI PICCHE  — sito aggiornato (23 ottobre 2026)

## Cosa è cambiato
- Menù dinamico rimosso: niente più `js/menu.js`, niente Supabase per il menù. `menu.html` è HTML statico (piatti, prezzi e JSON-LD `Menu` già nella pagina).
- Design nuovo (`css/style.css`, DUE DI PICCHE file): navigazione unica (prima c'erano due menu mobile), hero con `<img>` indicizzabile, scheda "DUE DI PICCHE in breve" con la risposta subito, menù con foto di categoria come sfondo e tutti i piatti visibili.
- 5 pagine SEO nuove: `ristorante-COLLEFERRO`, `steakhouse-COLLEFERRO`, `cena-vicino-COLLEFERRO-outlet`, `cena-vicino-rainbow-magicland`, `come-arrivare`. `zona.html` è ora l'hub che le collega. `faq.html` passa da 6 a 10 domande.
- SEO tecnica: titoli senza "|" nel nome (era "Ristorante|Steakhouse"), JSON-LD `Restaurant` + `WebSite` + `WebPage` + `BreadcrumbList` + `FAQPage` collegati con `@id`, sitemap con le 10 pagine, `robots.txt` (blocca `/admin.html`, consente i crawler AI), favicon quadrata, immagine social 1200x630, immagini Cloudinary ottimizzate (`f_auto,q_auto,w_*`), `_headers` per cache e sicurezza, `404.html`.
- GEO: pagine che aprono con la risposta, FAQ in forma di domanda, NAP identico ovunque, menù in HTML (non PDF), `llms.txt`.
- Privacy aggiornata: tolta la cache locale del menù e il ruolo di Supabase come fornitore del menù.

## DA FARE PRIMA DEL DEPLOY
1. **Inserire i piatti**: esporta la tabella `piatti` da Supabase (JSON o CSV) e lancia
   `node tools/build-menu.mjs piatti.json` — riscrive menu.html (piatti, indice categorie, JSON-LD). Rilancialo a ogni cambio di menù.
2. **Orari**: nello schema ho tolto l'orario di chiusura (era un segnaposto 23:30). Controlla sulla scheda Google Business se i giorni/orari reali differiscono (es. pranzo nel weekend) e aggiorna `openingHoursSpecification` in `index.html`, la home, FAQ e footer.
3. **Coordinate**: `41.7847, 12.9200` sono approssimate. Prendi quelle esatte dal pin su Google Maps (index.html: `geo` + meta `geo.position`).
4. **Distanze**: scrivo "pochi minuti di auto". Se aggiungi i minuti reali da Outlet e MagicLand le pagine diventano più forti.
5. **Immagini**: le cartelle `images/` (ciccia2.webp, menu-*.webp, cover_*) restano le tue: non le ho toccate.
6. Se passi al dominio `.it`: sostituisci `DUE DI PICCHErestaurant.netlify.app` in tutte le pagine, sitemap, robots, llms.txt e metti un redirect 301.

## Fuori dal sito (conta quanto il sito)
- Scheda Google Business: orari, categoria "Steakhouse"/"Ristorante", foto, link a menù e prenotazione, risposta a ogni recensione. Nome, indirizzo e telefono identici a quelli del sito.
- Search Console e Bing Webmaster Tools: invia `sitemap.xml`.
- Profili su TripAdvisor, TheFork, Restaurant Guru con gli stessi dati. Chiedi recensioni che citino piatti e occasioni.
- Ogni mese chiedi a ChatGPT, Perplexity, Gemini e Claude "dove mangiare carne a COLLEFERRO" e controlla se compari.
