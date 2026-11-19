/*! menu-widget.js v2 — menù digitale mobile-first: 5 lingue, tema chiaro/scuro, filtro allergeni, cache offline.
 *
 * Uso minimo:
 *   <div data-menu-widget data-source="json" data-url="menu.json"></div>
 *   <script src="menu-widget.js" defer></script>
 *
 * Sorgenti (data-source): json (data-url) · supabase (data-supabase-url, data-supabase-key, data-table, data-filter,
 *   data-select — usa "*" per leggere anche le colonne di traduzione) · inline (data-inline="#id" oppure window.MENU_DATA)
 *
 * Campi piatto: categoria|category, nome|name, descrizione|description, prezzo|price, ordine|order,
 *   disponibile|available, allergeni|allergens|tags (array o "a, b").
 * Traduzioni (opzionali): nome_en, descrizione_en, nome_fr … oppure un oggetto
 *   translations: {"en":{"name":"…","description":"…"}}. Senza traduzione si mostra il testo originale.
 *
 * Opzioni: data-title, data-subtitle, data-note (e varianti per lingua: data-note-en, data-title-fr …),
 *   data-theme="auto|dark|light", data-accent, data-langs="it,en,fr,de,es", data-lang (lingua predefinita),
 *   data-order, data-search="false", data-currency, data-table-param, data-fallback-url, data-error(-xx),
 *   data-sticky-top, data-timeout, data-cache-key.
 * Il tavolo si legge da ?t=5. Lingua forzata con ?lang=en.
 * Eventi (bubbling, sull'elemento): menu:loaded, menu:lang {lang}, menu:theme {theme}.
 */
(function () {
  "use strict";

  var LKEYS = ["it", "en", "fr", "de", "es"];
  var DEFAULT_ORDER = ["Antipasti", "Primi", "Secondi", "Pizze", "Insalate", "Contorni", "Dolci", "Bevande", "Cocktail", "Vini", "Birre"];

  /* ---------- testi interfaccia ---------- */
  var UI = {
    it: { search: "Cerca un piatto…", none: "Nessun piatto trovato.", soon: "Il menù sarà disponibile a breve.", table: "Tavolo",
      filter: "Allergeni", filterTitle: "Escludi i piatti che contengono", disclaimer: "Indicazione di massima: per allergie e intolleranze conferma sempre con il nostro staff.",
      clear: "Azzera", contains: "Contiene", theme: "Cambia tema chiaro/scuro", lang: "Lingua", cats: "Categorie del menù",
      error: "Impossibile caricare il menù al momento. Chiedi pure al nostro staff." },
    en: { search: "Search a dish…", none: "No dishes found.", soon: "The menu will be available shortly.", table: "Table",
      filter: "Allergens", filterTitle: "Hide dishes containing", disclaimer: "For guidance only: please always confirm allergies and intolerances with our staff.",
      clear: "Reset", contains: "Contains", theme: "Switch light/dark theme", lang: "Language", cats: "Menu categories",
      error: "The menu cannot be loaded right now. Please ask our staff." },
    fr: { search: "Rechercher un plat…", none: "Aucun plat trouvé.", soon: "Le menu sera bientôt disponible.", table: "Table",
      filter: "Allergènes", filterTitle: "Masquer les plats contenant", disclaimer: "À titre indicatif : confirmez toujours allergies et intolérances auprès de notre équipe.",
      clear: "Réinitialiser", contains: "Contient", theme: "Changer de thème clair/sombre", lang: "Langue", cats: "Catégories du menu",
      error: "Impossible de charger le menu pour le moment. Demandez à notre équipe." },
    de: { search: "Gericht suchen…", none: "Keine Gerichte gefunden.", soon: "Die Speisekarte ist in Kürze verfügbar.", table: "Tisch",
      filter: "Allergene", filterTitle: "Gerichte ausblenden, die enthalten", disclaimer: "Nur zur Orientierung: Bitte bestätigen Sie Allergien und Unverträglichkeiten immer bei unserem Personal.",
      clear: "Zurücksetzen", contains: "Enthält", theme: "Helles/dunkles Design wechseln", lang: "Sprache", cats: "Kategorien der Speisekarte",
      error: "Die Speisekarte kann gerade nicht geladen werden. Bitte fragen Sie unser Personal." },
    es: { search: "Buscar un plato…", none: "No se encontraron platos.", soon: "La carta estará disponible en breve.", table: "Mesa",
      filter: "Alérgenos", filterTitle: "Ocultar platos que contienen", disclaimer: "Solo orientativo: confirma siempre alergias e intolerancias con nuestro personal.",
      clear: "Restablecer", contains: "Contiene", theme: "Cambiar tema claro/oscuro", lang: "Idioma", cats: "Categorías de la carta",
      error: "No se puede cargar la carta en este momento. Pregunta a nuestro personal." }
  };

  /* categorie: chiave italiana → [en, fr, de, es] */
  var CAT = {
    Antipasti: ["Starters", "Entrées", "Vorspeisen", "Entrantes"], Primi: ["First courses", "Premiers plats", "Erste Gänge", "Primeros"],
    Secondi: ["Main courses", "Plats principaux", "Hauptgerichte", "Segundos"], Pizze: ["Pizzas", "Pizzas", "Pizzen", "Pizzas"],
    Insalate: ["Salads", "Salades", "Salate", "Ensaladas"], Contorni: ["Sides", "Accompagnements", "Beilagen", "Guarniciones"],
    Dolci: ["Desserts", "Desserts", "Desserts", "Postres"], Bevande: ["Drinks", "Boissons", "Getränke", "Bebidas"],
    Cocktail: ["Cocktails", "Cocktails", "Cocktails", "Cócteles"], Vini: ["Wines", "Vins", "Weine", "Vinos"], Birre: ["Beers", "Bières", "Biere", "Cervezas"]
  };

  /* allergeni e diciture: chiave → [it, en, fr, de, es, isDiet] */
  var ALG = {
    glutine: ["Glutine", "Gluten", "Gluten", "Gluten", "Gluten"], latte: ["Latte", "Milk", "Lait", "Milch", "Leche"],
    uova: ["Uova", "Eggs", "Œufs", "Eier", "Huevos"], pesce: ["Pesce", "Fish", "Poisson", "Fisch", "Pescado"],
    crostacei: ["Crostacei", "Crustaceans", "Crustacés", "Krebstiere", "Crustáceos"], molluschi: ["Molluschi", "Molluscs", "Mollusques", "Weichtiere", "Moluscos"],
    arachidi: ["Arachidi", "Peanuts", "Arachides", "Erdnüsse", "Cacahuetes"], "frutta a guscio": ["Frutta a guscio", "Tree nuts", "Fruits à coque", "Schalenfrüchte", "Frutos de cáscara"],
    soia: ["Soia", "Soy", "Soja", "Soja", "Soja"], sedano: ["Sedano", "Celery", "Céleri", "Sellerie", "Apio"],
    senape: ["Senape", "Mustard", "Moutarde", "Senf", "Mostaza"], sesamo: ["Sesamo", "Sesame", "Sésame", "Sesam", "Sésamo"],
    solfiti: ["Solfiti", "Sulphites", "Sulfites", "Sulfite", "Sulfitos"], lupini: ["Lupini", "Lupin", "Lupin", "Lupinen", "Altramuces"],
    vegetariano: ["Vegetariano", "Vegetarian", "Végétarien", "Vegetarisch", "Vegetariano", 1], vegano: ["Vegano", "Vegan", "Végétalien", "Vegan", "Vegano", 1],
    "senza glutine": ["Senza glutine", "Gluten-free", "Sans gluten", "Glutenfrei", "Sin gluten", 1], piccante: ["Piccante", "Spicy", "Épicé", "Scharf", "Picante", 1],
    surgelato: ["Surgelato", "Frozen", "Surgelé", "Tiefgekühlt", "Congelado", 1]
  };
  var ALIAS = { lattosio: "latte", lactose: "latte", uovo: "uova", egg: "uova", nuts: "frutta a guscio", noci: "frutta a guscio", "frutta secca": "frutta a guscio",
    peanut: "arachidi", crostaceo: "crostacei", sulfiti: "solfiti", sulfites: "solfiti", sulphite: "solfiti", lupino: "lupini", "gluten free": "senza glutine", "vegan": "vegano", "veg": "vegetariano" };

  /* ---------- utilità ---------- */
  function esc(v) {
    return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function plain(v) { return String(v || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function slug(s) { return plain(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "x"; }
  function first() { for (var i = 0; i < arguments.length; i++) if (arguments[i] != null && arguments[i] !== "") return arguments[i]; return null; }
  function category(v) {
    var n = plain(v);
    if (n.indexOf("antipast") !== -1) return "Antipasti";
    if (n.indexOf("prim") !== -1) return "Primi";
    if (n.indexOf("second") !== -1 || n.indexOf("carne") !== -1) return "Secondi";
    if (n.indexOf("pizz") !== -1) return "Pizze";
    if (n.indexOf("insalat") !== -1) return "Insalate";
    if (n.indexOf("contorn") !== -1) return "Contorni";
    if (n.indexOf("dolc") !== -1 || n.indexOf("dessert") !== -1) return "Dolci";
    if (n.indexOf("cocktail") !== -1) return "Cocktail";
    if (n.indexOf("bevand") !== -1) return "Bevande";
    if (n.indexOf("vini") === 0 || n === "vino") return "Vini";
    if (n.indexOf("birr") !== -1) return "Birre";
    return String(v || "Altro").trim() || "Altro";
  }
  function catLabel(cat, lang) { var i = LKEYS.indexOf(lang); return i > 0 && CAT[cat] ? CAT[cat][i - 1] : cat; }
  function price(v) {
    if (v === null || v === undefined || String(v).trim() === "") return null;
    var n = Number(String(v).replace(",", "."));
    return isFinite(n) ? n : null;
  }
  function toTags(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v.map(String).filter(Boolean);
    return String(v).replace(/^\{|\}$/g, "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function canon(tag) {
    var p = plain(tag);
    if (ALG[p]) return p;
    if (ALIAS[p]) return ALIAS[p];
    for (var k in ALG) for (var i = 0; i < 5; i++) if (plain(ALG[k][i]) === p) return k;
    return null;
  }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* ignora */ } return null; }

  /* ---------- dati ---------- */
  function toRows(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.dishes)) return data.dishes;
    if (data && Array.isArray(data.categories)) {
      var out = [];
      data.categories.forEach(function (c) {
        (c.items || []).forEach(function (it) {
          var copy = {}; for (var k in it) copy[k] = it[k];
          copy.categoria = first(copy.categoria, copy.category, c.name, c.categoria);
          out.push(copy);
        });
      });
      return out;
    }
    throw new Error("Formato dati non riconosciuto");
  }
  function normalize(rows) {
    return rows.map(function (r, i) {
      var tags = toTags(first(r.allergeni, r.allergens, r.tags, r.tag)).map(function (t) { return { raw: t, key: canon(t) }; });
      var tr = r.translations;
      if (typeof tr === "string") { try { tr = JSON.parse(tr); } catch (e) { tr = null; } }
      return {
        raw: r, tr: tr || null, cat: category(first(r.categoria, r.category)),
        name: String(first(r.nome, r.name) || "").trim(), desc: String(first(r.descrizione, r.description) || "").trim(),
        price: price(first(r.prezzo, r.price)), ord: Number(first(r.ordine, r.order)) || i, tags: tags,
        alg: tags.filter(function (t) { return t.key && !ALG[t.key][5]; }).map(function (t) { return t.key; }),
        off: r.disponibile === false || r.available === false
      };
    }).filter(function (d) { return d.name && !d.off; });
  }
  function loc(d, lang, f) {
    if (lang === "it") return d[f];
    var a = f === "name" ? ["nome", "name"] : ["descrizione", "description"];
    var t = d.tr && d.tr[lang];
    if (t && first(t[f], t[a[0]], t[a[1]])) return first(t[f], t[a[0]], t[a[1]]);
    return first(d.raw[a[0] + "_" + lang], d.raw[a[1] + "_" + lang]) || d[f];
  }
  function group(dishes, order) {
    var map = {};
    dishes.slice().sort(function (a, b) { return a.ord - b.ord; }).forEach(function (d) { (map[d.cat] = map[d.cat] || []).push(d); });
    return Object.keys(map).sort(function (a, b) {
      var ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b, "it");
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }).map(function (c) { return { cat: c, dishes: map[c] }; });
  }
  function fetchJson(url, headers, timeout) {
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeout) : null;
    return fetch(url, { headers: headers || { Accept: "application/json" }, signal: ctrl ? ctrl.signal : undefined })
      .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .finally(function () { if (timer) clearTimeout(timer); });
  }
  function load(cfg) {
    if (cfg.source === "supabase") {
      var url = cfg.supabaseUrl.replace(/\/+$/, "") + "/rest/v1/" + encodeURIComponent(cfg.table) +
        "?select=" + encodeURIComponent(cfg.select).replace(/%2C/g, ",") + "&disponibile=eq.true&order=ordine.asc" + (cfg.filter ? "&" + cfg.filter : "");
      return fetchJson(url, { apikey: cfg.supabaseKey, Accept: "application/json" }, cfg.timeout).then(toRows);
    }
    if (cfg.source === "inline") {
      return new Promise(function (resolve) {
        var el = cfg.inline ? document.querySelector(cfg.inline) : null;
        resolve(el ? JSON.parse(el.textContent) : window.MENU_DATA);
      }).then(toRows);
    }
    return fetchJson(cfg.url, null, cfg.timeout).then(toRows);
  }

  /* ---------- stile (isolato nello Shadow DOM) ---------- */
  var CSS = [
    ":host{display:block;color-scheme:dark;--bg:#0e0d0c;--surface:#181615;--ink:#f2ece1;--dim:rgba(242,236,225,.74);--faint:rgba(242,236,225,.54);--line:rgba(242,236,225,.15);--accent:#d4373f;--on-accent:#fff;",
    "--serif:var(--mw-serif,'Cormorant Garamond','Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif);--sans:var(--mw-sans,Jost,'Avenir Next',Avenir,'Helvetica Neue',system-ui,sans-serif)}",
    ":host([data-theme=light]){color-scheme:light;--bg:#fbfaf8;--surface:#fff;--ink:#151312;--dim:rgba(21,19,18,.74);--faint:rgba(21,19,18,.56);--line:rgba(21,19,18,.15);--accent:#b3202a}",
    "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}",
    ".mw{color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%}",
    "button,input{font:inherit;color:inherit}button{cursor:pointer;background:none;border:0;-webkit-tap-highlight-color:transparent}",
    ":focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:6px}[hidden]{display:none!important}",
    ".bar,.head,.tools,.panel,.body,.note{max-width:760px;margin-left:auto;margin-right:auto;padding-left:20px;padding-right:20px}",
    ".bar{display:flex;align-items:center;gap:12px;padding-top:16px}",
    ".badge{padding:5px 14px;border:1px solid var(--accent);border-radius:999px;font-size:14px;font-weight:500;color:var(--ink)}",
    ".ctl{display:flex;align-items:center;gap:8px;margin-left:auto}",
    ".langs{display:flex;padding:2px;border:1px solid var(--line);border-radius:999px}",
    ".langs button{min-width:38px;height:36px;padding:0 6px;border-radius:999px;font-size:12px;font-weight:500;letter-spacing:.08em;color:var(--dim);transition:background .2s,color .2s}",
    ".langs button[aria-pressed=true]{background:var(--ink);color:var(--bg)}",
    ".mode{width:42px;height:42px;display:grid;place-items:center;border:1px solid var(--line);border-radius:50%;color:var(--dim)}",
    ".head{padding-top:18px}.head:empty{display:none}",
    ".title{font-family:var(--serif);font-weight:600;font-size:clamp(32px,8vw,48px);line-height:1.05}",
    ".sub{margin-top:6px;color:var(--dim);font-size:15px}",
    ".tools{display:flex;gap:10px;padding-top:16px}",
    ".search{position:relative;flex:1;min-width:0}.search svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--faint);pointer-events:none}",
    ".search input{width:100%;height:46px;padding:0 14px 0 42px;background:var(--surface);border:1px solid var(--line);border-radius:12px;outline:none;font-size:16px}",
    ".search input::placeholder{color:var(--faint)}.search input:focus{border-color:var(--accent)}",
    ".fbtn{display:inline-flex;align-items:center;gap:8px;height:46px;padding:0 14px;background:var(--surface);border:1px solid var(--line);border-radius:12px;font-size:14px;color:var(--dim)}",
    ".fbtn[aria-expanded=true]{border-color:var(--accent);color:var(--ink)}",
    ".fn{min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:var(--accent);color:var(--on-accent);font-size:12px;font-weight:600;line-height:20px;text-align:center}",
    ".pin{margin-top:10px;padding:16px;background:var(--surface);border:1px solid var(--line);border-radius:12px}",
    ".pt{font-size:14px;color:var(--dim)}.pc{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}",
    ".pc button{min-height:38px;padding:0 14px;border:1px solid var(--line);border-radius:999px;font-size:14px;transition:background .2s}",
    ".pc button[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}",
    ".pd{margin-top:12px;font-size:12.5px;color:var(--faint)}.clr{margin-top:8px;font-size:13px;color:var(--ink);text-decoration:underline;text-underline-offset:3px;min-height:36px}",
    ".tabs{position:sticky;top:var(--mw-sticky-top,0);z-index:5;margin-top:14px;background:var(--bg);border-bottom:1px solid var(--line)}",
    ".tabs ul{list-style:none;display:flex;gap:2px;overflow-x:auto;max-width:760px;margin:0 auto;padding:0 12px;scrollbar-width:none}.tabs ul::-webkit-scrollbar{display:none}",
    ".tabs button{white-space:nowrap;height:48px;padding:0 14px;border-bottom:2px solid transparent;font-size:15px;letter-spacing:.02em;color:var(--dim);transition:color .2s,border-color .2s}",
    ".tabs button[aria-current=true]{color:var(--ink);border-bottom-color:var(--accent);font-weight:500}",
    ".body{padding-bottom:36px}",
    ".cat{scroll-margin-top:var(--mw-scroll-margin,56px);padding-top:44px}",
    ".cat h2{font-family:var(--serif);font-weight:500;font-size:clamp(32px,8vw,42px);line-height:1.1;text-align:center}",
    ".cat h2::after{content:'';display:block;width:34px;height:2px;margin:14px auto 0;background:var(--accent)}",
    ".dishes{list-style:none;margin-top:14px}.dish{padding:15px 0}",
    ".row{display:flex;align-items:baseline;gap:10px}",
    ".dish h3{font-family:var(--serif);font-weight:600;font-size:clamp(20px,5vw,23px);line-height:1.2}",
    ".dots{flex:1;min-width:14px;border-bottom:1px dotted var(--line);transform:translateY(-4px);opacity:.9}",
    ".price{flex-shrink:0;white-space:nowrap;font-family:var(--serif);font-weight:600;font-size:21px;font-variant-numeric:tabular-nums}",
    ".cur{margin-right:3px;font-size:13px;font-weight:500;color:var(--faint)}",
    ".dish p{margin-top:3px;max-width:52ch;font-family:var(--serif);font-style:italic;font-size:17px;line-height:1.4;color:var(--dim)}",
    ".chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}",
    ".chips span{padding:1px 9px;border:1px solid var(--line);border-radius:999px;font-size:11.5px;letter-spacing:.02em;color:var(--faint)}",
    ".chips .d{border-color:var(--accent);color:var(--ink)}",
    ".state{padding:56px 0;text-align:center;color:var(--dim)}",
    ".note{padding-bottom:28px;font-size:12.5px;color:var(--faint)}.note:empty{display:none}",
    ".sk{height:14px;border-radius:7px;background:var(--line);margin:22px 0;animation:p 1.2s ease-in-out infinite}@keyframes p{50%{opacity:.4}}",
    "@media (min-width:640px){.bar,.head,.tools,.panel,.body,.note{padding-left:28px;padding-right:28px}}",
    "@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}"
  ].join("");

  var IC = {
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    filter: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>',
    sun: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>'
  };

  /* ---------- configurazione ---------- */
  function readCfg(host) {
    var d = host.dataset, qs = new URLSearchParams(location.search);
    var langs = (d.langs || LKEYS.join(",")).split(",").map(function (s) { return s.trim().toLowerCase(); }).filter(function (l) { return UI[l]; });
    if (!langs.length) langs = ["it"];
    return {
      source: d.source || (d.supabaseUrl ? "supabase" : d.inline ? "inline" : "json"),
      url: d.url || "menu.json", supabaseUrl: d.supabaseUrl || "", supabaseKey: d.supabaseKey || "",
      table: d.table || "piatti", select: d.select || "categoria,nome,descrizione,prezzo,ordine", filter: d.filter || "", inline: d.inline || "",
      search: d.search !== "false", currency: d.currency == null ? "€" : d.currency, langs: langs, defLang: d.lang || langs[0],
      order: d.order ? d.order.split(",").map(function (s) { return category(s.trim()); }) : DEFAULT_ORDER,
      cacheKey: "mw_cache_" + (d.cacheKey || (d.supabaseUrl || d.url || "inline") + "|" + (d.filter || "") + "|" + (d.select || "")),
      timeout: Number(d.timeout) || 8000, fallbackUrl: d.fallbackUrl || "",
      tableNo: (qs.get(d.tableParam || "t") || "").trim().slice(0, 12), qlang: (qs.get("lang") || "").toLowerCase()
    };
  }
  function pickLang(cfg) {
    var cand = [cfg.qlang, store("mw_lang")].concat(navigator.languages || [navigator.language || ""]).concat([cfg.defLang]);
    for (var i = 0; i < cand.length; i++) {
      var l = String(cand[i] || "").toLowerCase().slice(0, 2);
      if (cfg.langs.indexOf(l) !== -1) return l;
    }
    return cfg.langs[0];
  }

  /* ---------- widget ---------- */
  function mount(host) {
    if (host.__mw) return;
    host.__mw = true;
    var cfg = readCfg(host), d = host.dataset;
    var lang = pickLang(cfg);
    var mq = window.matchMedia ? matchMedia("(prefers-color-scheme: light)") : { matches: false };
    var savedTheme = store("mw_theme");
    var pref = savedTheme === "light" || savedTheme === "dark" ? savedTheme : (d.theme === "light" || d.theme === "dark" ? d.theme : "auto");
    if (d.accent) host.style.setProperty("--accent", d.accent);
    if (d.stickyTop) host.style.setProperty("--mw-sticky-top", d.stickyTop);

    var root = host.attachShadow({ mode: "open" });
    root.innerHTML = "<style>" + CSS + "</style>" +
      '<div class="mw"><div class="bar"><span class="badge" hidden></span><div class="ctl"><div class="langs" role="group"></div>' +
      '<button class="mode" type="button"></button></div></div>' +
      '<header class="head"><h1 class="title" hidden></h1><p class="sub" hidden></p></header>' +
      '<div class="tools">' + (cfg.search ? '<label class="search">' + IC.search + '<input type="search" enterkeyhint="search" autocomplete="off"></label>' : '<span style="flex:1"></span>') +
      '<button class="fbtn" type="button" aria-expanded="false" hidden>' + IC.filter + '<span class="ft"></span><b class="fn" hidden></b></button></div>' +
      '<section class="panel" hidden><div class="pin"><p class="pt"></p><div class="pc"></div><p class="pd"></p><button class="clr" type="button"></button></div></section>' +
      '<nav class="tabs" hidden><ul></ul></nav>' +
      '<main class="body"><div class="sk" style="width:40%"></div><div class="sk"></div><div class="sk" style="width:80%"></div></main><p class="note"></p></div>';

    var $ = function (s) { return root.querySelector(s); };
    var badge = $(".badge"), langsEl = $(".langs"), modeBtn = $(".mode"), titleEl = $(".title"), subEl = $(".sub"), input = $(".search input");
    var fbtn = $(".fbtn"), fn = $(".fn"), panel = $(".panel"), pc = $(".pc"), tabsNav = $(".tabs"), tabsUl = tabsNav.querySelector("ul");
    var body = $(".body"), noteEl = $(".note");
    var dishes = [], excluded = {}, active = "", ticking = false, failed = false;

    function emit(name, detail) { host.dispatchEvent(new CustomEvent(name, { detail: detail, bubbles: true, composed: true })); }
    function txt(name) { var cap = lang.charAt(0).toUpperCase() + lang.slice(1); return d[name + cap] || d[name] || ""; }
    function effTheme() { return pref === "auto" ? (mq.matches ? "light" : "dark") : pref; }
    function applyTheme() {
      var t = effTheme();
      host.setAttribute("data-theme", t);
      modeBtn.innerHTML = t === "dark" ? IC.sun : IC.moon;
      emit("menu:theme", { theme: t });
    }
    function fmt(p) { var s = Number.isInteger(p) ? String(p) : p.toFixed(2); return lang === "en" ? s : s.replace(".", ","); }

    cfg.langs.forEach(function (l) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = l.toUpperCase(); b.dataset.l = l; b.setAttribute("lang", l);
      b.setAttribute("aria-label", { it: "Italiano", en: "English", fr: "Français", de: "Deutsch", es: "Español" }[l]);
      langsEl.appendChild(b);
    });
    if (cfg.langs.length < 2) langsEl.hidden = true;

    function buildPanel() {
      var present = {};
      dishes.forEach(function (x) { x.alg.forEach(function (k) { present[k] = 1; }); });
      var keys = Object.keys(ALG).filter(function (k) { return present[k]; });
      fbtn.hidden = !keys.length;
      var li = LKEYS.indexOf(lang);
      pc.innerHTML = keys.map(function (k) {
        return '<button type="button" data-k="' + esc(k) + '" aria-pressed="' + (excluded[k] ? "true" : "false") + '">' + esc(ALG[k][li]) + "</button>";
      }).join("");
    }
    function updateFilterBadge() {
      var n = Object.keys(excluded).length;
      fn.hidden = !n; fn.textContent = n;
    }

    function render() {
      var u = UI[lang], li = LKEYS.indexOf(lang);
      var q = input ? plain(input.value) : "";
      var exKeys = Object.keys(excluded);
      var list = dishes.filter(function (x) {
        if (exKeys.length && x.alg.some(function (k) { return excluded[k]; })) return false;
        return !q || plain(loc(x, lang, "name") + " " + loc(x, lang, "desc") + " " + x.name + " " + x.tags.map(function (t) { return t.raw; }).join(" ")).indexOf(q) !== -1;
      });
      var groups = group(list, cfg.order);
      tabsNav.hidden = groups.length < 2;
      tabsUl.innerHTML = groups.map(function (g) {
        return '<li><button type="button" data-t="' + slug(g.cat) + '">' + esc(catLabel(g.cat, lang)) + "</button></li>";
      }).join("");
      if (failed) { body.innerHTML = '<p class="state">' + esc(txt("error") || u.error) + "</p>"; return; }
      if (!groups.length) {
        body.innerHTML = '<p class="state">' + (dishes.length ? u.none : u.soon) + "</p>";
        return;
      }
      body.innerHTML = groups.map(function (g) {
        return '<section class="cat" id="c-' + slug(g.cat) + '"><h2>' + esc(catLabel(g.cat, lang)) + '</h2><ul class="dishes">' +
          g.dishes.map(function (x) {
            var chips = x.tags.map(function (t) {
              var diet = t.key && ALG[t.key][5];
              return '<span' + (diet ? ' class="d"' : "") + ">" + esc(t.key ? ALG[t.key][li] : t.raw) + "</span>";
            }).join("");
            var desc = loc(x, lang, "desc");
            return '<li class="dish"><div class="row"><h3>' + esc(loc(x, lang, "name")) + "</h3>" +
              (x.price !== null ? '<i class="dots"></i><span class="price">' + (cfg.currency ? '<span class="cur">' + esc(cfg.currency) + "</span>" : "") + fmt(x.price) + "</span>" : "") + "</div>" +
              (desc ? "<p>" + esc(desc) + "</p>" : "") + (chips ? '<div class="chips">' + chips + "</div>" : "") + "</li>";
          }).join("") + "</ul></section>";
      }).join("");
      spy();
    }

    function applyLang() {
      var u = UI[lang];
      host.setAttribute("lang", lang);
      var t = txt("title"), s = txt("subtitle");
      titleEl.textContent = t; titleEl.hidden = !t; subEl.textContent = s; subEl.hidden = !s;
      noteEl.textContent = txt("note");
      if (input) { input.placeholder = u.search; input.setAttribute("aria-label", u.search); }
      $(".ft").textContent = u.filter; $(".pt").textContent = u.filterTitle; $(".pd").textContent = u.disclaimer; $(".clr").textContent = u.clear;
      modeBtn.setAttribute("aria-label", u.theme); modeBtn.title = u.theme;
      langsEl.setAttribute("aria-label", u.lang); tabsNav.setAttribute("aria-label", u.cats);
      badge.hidden = !cfg.tableNo; badge.textContent = u.table + " " + cfg.tableNo;
      Array.prototype.forEach.call(langsEl.children, function (b) { b.setAttribute("aria-pressed", b.dataset.l === lang ? "true" : "false"); });
      buildPanel(); updateFilterBadge(); render();
      emit("menu:lang", { lang: lang });
    }

    function setActive(id) {
      if (id === active) return;
      active = id;
      Array.prototype.forEach.call(tabsUl.querySelectorAll("button"), function (b) {
        var on = b.dataset.t === id;
        b.setAttribute("aria-current", on ? "true" : "false");
        if (on && tabsUl.scrollTo) tabsUl.scrollTo({ left: b.offsetLeft - (tabsUl.clientWidth - b.offsetWidth) / 2, behavior: "smooth" });
      });
    }
    function spy() {
      ticking = false;
      var secs = body.querySelectorAll(".cat");
      if (!secs.length) return;
      var line = tabsNav.getBoundingClientRect().bottom + 12, cur = secs[0].id;
      Array.prototype.forEach.call(secs, function (s) { if (s.getBoundingClientRect().top <= line) cur = s.id; });
      active = ""; setActive(cur.slice(2));
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });

    tabsUl.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var s = body.querySelector("#c-" + b.dataset.t);
      if (s) s.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    });
    langsEl.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b || b.dataset.l === lang) return;
      lang = b.dataset.l; store("mw_lang", lang); applyLang();
    });
    modeBtn.addEventListener("click", function () { pref = effTheme() === "dark" ? "light" : "dark"; store("mw_theme", pref); applyTheme(); });
    if (mq.addEventListener) mq.addEventListener("change", function () { if (pref === "auto") applyTheme(); });
    if (input) input.addEventListener("input", render);
    fbtn.addEventListener("click", function () {
      var open = panel.hidden; panel.hidden = !open; fbtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    pc.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (excluded[b.dataset.k]) delete excluded[b.dataset.k]; else excluded[b.dataset.k] = 1;
      b.setAttribute("aria-pressed", excluded[b.dataset.k] ? "true" : "false"); updateFilterBadge(); render();
    });
    $(".clr").addEventListener("click", function () { excluded = {}; buildPanel(); updateFilterBadge(); render(); });

    function show(rows) {
      failed = false; dishes = normalize(rows); buildPanel(); render();
      host.dispatchEvent(new CustomEvent("menu:loaded", { detail: { dishes: dishes }, bubbles: true, composed: true }));
    }
    function fail() { failed = true; render(); }
    function readCache() { try { var c = JSON.parse(localStorage.getItem(cfg.cacheKey)); return c && Array.isArray(c.rows) ? c.rows : null; } catch (e) { return null; } }
    function writeCache(rows) { store(cfg.cacheKey, JSON.stringify({ rows: rows, t: Date.now() })); }

    applyTheme(); applyLang();
    var cached = cfg.source === "inline" ? null : readCache();
    if (cached && cached.length) show(cached);

    load(cfg).then(function (rows) {
      if (!rows.length && cached && cached.length) return;
      if (!cached || JSON.stringify(cached) !== JSON.stringify(rows)) show(rows);
      writeCache(rows);
    }).catch(function (err) {
      console.error("[menu-widget]", err);
      if (cached && cached.length) return;
      if (cfg.fallbackUrl) fetchJson(cfg.fallbackUrl, null, cfg.timeout).then(toRows).then(show).catch(fail); else fail();
    });
  }

  function boot() { Array.prototype.forEach.call(document.querySelectorAll("[data-menu-widget]"), mount); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.MenuWidget = { mount: mount, boot: boot };
})();
