#!/usr/bin/env node
/* Genera il menù statico dentro menu.html a partire da un export della tabella "piatti".
 *
 * Uso:   node tools/build-menu.mjs piatti.json
 *        node tools/build-menu.mjs piatti.csv
 *
 * Colonne usate: categoria, nome, descrizione, prezzo, ordine, disponibile
 * (i piatti con disponibile = false non vengono pubblicati).
 * Riscrive solo le parti tra i marcatori <!-- MENU:... --> di menu.html:
 * puoi rilanciarlo ogni volta che il menù cambia, poi fai il deploy.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv[2];
const target = process.argv[3] || path.join(root, "menu.html");
if (!input) { console.error("Uso: node tools/build-menu.mjs piatti.json|piatti.csv [menu.html]"); process.exit(1); }

const BASE = "https://DUE DI PICCHErestaurant.netlify.app";
const ORDER = ["Antipasti", "Primi", "Secondi", "Contorni", "Dolci"];
const PHOTO = { Antipasti: "antipasti", Primi: "primi", Secondi: "secondi", Dolci: "dolci" };

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

function parseCsv(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === "," || c === ";") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...rest] = rows.filter((r) => r.some((x) => x.trim()));
  const keys = head.map((h) => h.trim().toLowerCase());
  return rest.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

const raw = fs.readFileSync(input, "utf8").replace(/^﻿/, "");
let dishes = input.toLowerCase().endsWith(".csv") ? parseCsv(raw) : JSON.parse(raw);
dishes = dishes.filter((d) => d.nome && !["false", "f", "0", false].includes(typeof d.disponibile === "string" ? d.disponibile.toLowerCase() : d.disponibile));

function category(v) {
  const n = String(v || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (n.includes("antipast")) return "Antipasti";
  if (n.includes("prim")) return "Primi";
  if (n.includes("second") || n.includes("carne")) return "Secondi";
  if (n.includes("contorn")) return "Contorni";
  if (n.includes("dolc")) return "Dolci";
  return String(v || "Altro").trim() || "Altro";
}
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const price = (v) => { const n = Number(String(v).replace(",", ".")); return Number.isFinite(n) && String(v).trim() !== "" ? n : null; };

const groups = new Map();
dishes.sort((a, b) => (Number(a.ordine) || 0) - (Number(b.ordine) || 0)).forEach((d) => {
  const c = category(d.categoria);
  if (!groups.has(c)) groups.set(c, []);
  groups.get(c).push(d);
});
const cats = [...groups.keys()].sort((a, b) => {
  const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
  return ia === -1 && ib === -1 ? a.localeCompare(b, "it") : ia === -1 ? 1 : ib === -1 ? -1 : ia - ib;
});

const nav = cats.map((c) => `  <li><a href="#categoria-${slug(c)}">${esc(c)}</a></li>`).join("\n");

const body = cats.map((c) => {
  const photo = PHOTO[c];
  const style = photo ? ` style="--cat-img:url('images/menu-${photo}.webp')"` : "";
  const list = groups.get(c).map((d) => {
    const p = price(d.prezzo);
    return `    <li class="dish"><div><h3>${esc(d.nome)}</h3>${d.descrizione ? `<p>${esc(d.descrizione)}</p>` : ""}</div>${p !== null ? `<span class="price">€&nbsp;${p.toFixed(2).replace(".", ",")}</span>` : ""}</li>`;
  }).join("\n");
  return `  <section class="menu-cat${photo ? " has-photo" : ""}" id="categoria-${slug(c)}"${style}>
   <div class="menu-cat-inner">
    <h2>${esc(c)}</h2>
    <ul class="dishes">
${list}
    </ul>
   </div>
  </section>`;
}).join("\n");

const schema = {
  "@context": "https://schema.org", "@type": "Menu", "@id": `${BASE}/menu.html#menu`, name: "Menù DUE DI PICCHE ", inLanguage: "it",
  hasMenuSection: cats.map((c) => ({
    "@type": "MenuSection", name: c,
    hasMenuItem: groups.get(c).map((d) => {
      const item = { "@type": "MenuItem", name: d.nome };
      if (d.descrizione) item.description = d.descrizione;
      const p = price(d.prezzo);
      if (p !== null) item.offers = { "@type": "Offer", price: p.toFixed(2), priceCurrency: "EUR" };
      return item;
    }),
  })),
};
const jsonld = `<script type="application/ld+json" id="menu-jsonld">\n${JSON.stringify(schema, null, 1)}\n</script>`;

let html = fs.readFileSync(target, "utf8");
function swap(name, content) {
  const re = new RegExp(`(<!-- MENU:${name}:START -->)[\\s\\S]*?(<!-- MENU:${name}:END -->)`);
  if (!re.test(html)) throw new Error(`Marcatore MENU:${name} non trovato in ${target}`);
  html = html.replace(re, (_, a, b) => `${a}\n${content}\n${b}`);
}
swap("NAV", nav); swap("BODY", body); swap("JSONLD", jsonld);
fs.writeFileSync(target, html);
console.log(`Menù aggiornato: ${dishes.length} piatti in ${cats.length} categorie → ${path.relative(process.cwd(), target)}`);
