
/* Menù live da Supabase — caricato solo da menu.html */

/* ============================================================
   MENÙ LIVE DA SUPABASE
   ============================================================ */

const SUPABASE_URL = "https://udvdgozontyttoeaijph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_nsS-CkirN0jwrJjsGwsncw_Hya8h2Ak";

const MENU_REST_URL =
  SUPABASE_URL +
  "/rest/v1/piatti?select=*&disponibile=eq.true&order=ordine.asc";

const MENU_CACHE_KEY = "DUE DI PICCHE_menu_cache_v1";

const MENU_CATEGORY_ORDER = [
  "Antipasti",
  "Primi",
  "Secondi",
  "Dolci"
];

/* ============================================================
   CATEGORIE FOTOGRAFICHE
   ============================================================ */

const MENU_CATEGORY_CARDS = {
  "Antipasti": {
    image: "images/menu-antipasti.webp",
    alt: "Antipasti di DUE DI PICCHE  a COLLEFERRO",
    description: "Scopri gli antipasti"
  },

  "Primi": {
    image: "images/menu-primi.webp",
    alt: "Primi piatti di DUE DI PICCHE  a COLLEFERRO",
    description: "Scopri i primi"
  },

  "Secondi": {
    image: "images/menu-secondi.webp",
    alt: "Secondi piatti di DUE DI PICCHE  a COLLEFERRO",
    description: "Scopri i secondi"
  },

  "Dolci": {
    image: "images/menu-dolci.webp",
    alt: "Dolci di DUE DI PICCHE  a COLLEFERRO",
    description: "Scopri i dolci"
  }
};


/* ============================================================
   FRECCIA ACCORDION
   ============================================================ */

const MENU_ARROW_SVG =
  '<svg viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
  '<path d="M1 1L6 6L11 1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';


/* ============================================================
   SICUREZZA HTML
   ============================================================ */

function escapeMenuHtml(value){
  if(value === null || value === undefined) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* ============================================================
   PREZZI
   ============================================================ */

function formatMenuPrice(value){
  const num = Number(value);

  if(Number.isNaN(num)) return "";

  return "€ " + num.toFixed(2).replace(".", ",");
}


/* ============================================================
   NORMALIZZAZIONE CATEGORIE
   ============================================================

   Serve a gestire eventuali differenze tipo:

   "Antipasti"
   "antipasti"
   " ANTIPASTI "
   "Primi"
   "Secondi"
   "Contorni"

   senza rompere i collegamenti.
   ============================================================ */

function normalizeCategory(value){

  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if(normalized.includes("antipast")){
    return "Antipasti";
  }

  if(normalized.includes("prim")){
    return "Primi";
  }

  if(
    normalized.includes("second") ||
    normalized.includes("carne")
  ){
    return "Secondi";
  }

  if(normalized.includes("contorn")){
    return "Contorni";
  }

  if(normalized.includes("dolc")){
    return "Dolci";
  }

  return String(value || "Altro").trim();
}


/* ============================================================
   RAGGRUPPA I PIATTI PER CATEGORIA
   ============================================================ */

function groupMenuByCategory(dishes){

  const byCategory = {};

  dishes.forEach(dish => {

    const originalCategory = dish.categoria || "Altro";
    const cat = normalizeCategory(originalCategory);

    if(!byCategory[cat]){
      byCategory[cat] = [];
    }

    byCategory[cat].push(dish);
  });


  const categories = Object.keys(byCategory).sort((a, b) => {

    const ia = MENU_CATEGORY_ORDER.indexOf(a);
    const ib = MENU_CATEGORY_ORDER.indexOf(b);

    if(ia === -1 && ib === -1){
      return a.localeCompare(b, "it");
    }

    if(ia === -1) return 1;

    if(ib === -1) return -1;

    return ia - ib;
  });


  return categories.map(cat => ({
    cat,
    dishes: byCategory[cat]
  }));
}


/* ============================================================
   ID SICURO DELLE CATEGORIE
   ============================================================ */

function getCategoryId(category){

  const normalized = normalizeCategory(category);

  const ids = {
    "Antipasti": "categoria-antipasti",
    "Primi": "categoria-primi",
    "Secondi": "categoria-secondi",
    "Contorni": "categoria-contorni",
    "Dolci": "categoria-dolci"
  };

  return ids[normalized] || (
    "categoria-" +
    normalized
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}


/* ============================================================
   RENDER PUBBLICO DEL MENÙ
   ============================================================ */

function renderPublicMenu(dishes){

  const container = document.getElementById("menu-render");

  if(!container) return;


  if(!dishes.length){

    container.setAttribute("aria-busy", "false");

    container.innerHTML =
      '<p class="empty-hint">Il menù sarà disponibile a breve.</p>';

    return;
  }


  /*
   * Se stiamo ri-renderizzando dopo un aggiornamento,
   * ricordiamo quali categorie erano aperte.
   */

  const openState = {};

  container
    .querySelectorAll(".menu-category")
    .forEach(el => {

      openState[el.dataset.cat] =
        el.hasAttribute("open");

    });


  const groups = groupMenuByCategory(dishes);


  let html = "";


  /* ==========================================================
     ACCORDION CATEGORIE
     ========================================================== */

  groups.forEach(({ cat, dishes: catDishes }) => {

    const normalizedCat = normalizeCategory(cat);

    const wasOpen = !!openState[cat];

    const count = catDishes.length;

    const categoryId = getCategoryId(normalizedCat);

    /* Foto della categoria → sfondo dell'intera sezione */
    const photo = MENU_CATEGORY_CARDS[normalizedCat];

    const photoClass = photo ? " has-photo" : "";

    const photoStyle = photo
      ? ` style="background-image:url('${escapeMenuHtml(photo.image)}')"`
      : "";


    html += `
      <details
        class="menu-category${photoClass}"
        id="${escapeMenuHtml(categoryId)}"
        data-cat="${escapeMenuHtml(cat)}"
        ${photoStyle}
        ${wasOpen ? "open" : ""}
      >

        <summary>

          <h3>
            ${escapeMenuHtml(normalizedCat)}
          </h3>

          <span class="menu-count">
            ${count} piatt${count === 1 ? "o" : "i"}
          </span>

          <span class="menu-arrow">
            ${MENU_ARROW_SVG}
          </span>

        </summary>


        <div class="menu-category-body">
    `;


    catDishes.forEach(dish => {

      html += `
        <div class="menu-dish">

          <div class="menu-dish-info">

            <h4>
              ${escapeMenuHtml(dish.nome)}
            </h4>

            ${
              dish.descrizione
                ? `<p>${escapeMenuHtml(dish.descrizione)}</p>`
                : ""
            }

          </div>

          <div class="menu-dish-price">
            ${formatMenuPrice(dish.prezzo)}
          </div>

        </div>
      `;

    });


    html += `
        </div>

      </details>
    `;

  });


  container.setAttribute("aria-busy", "false");


  container.innerHTML = html;



}


/* ============================================================
   JSON-LD DEL MENÙ
   ============================================================ */

function injectMenuJsonLd(dishes){

  if(!dishes.length) return;


  const groups = groupMenuByCategory(dishes);


  const menuSchema = {

    "@context": "https://schema.org",

    "@type": "Menu",

    "@id":
      "https://DUE DI PICCHErestaurant.netlify.app/menu.html#menu",

    "name":
      "Menù DUE DI PICCHE ",

    "inLanguage":
      "it",

    "hasMenuSection":
      groups.map(({ cat, dishes: catDishes }) => ({

        "@type":
          "MenuSection",

        "name":
          cat,

        "hasMenuItem":
          catDishes.map(dish => {

            const item = {

              "@type":
                "MenuItem",

              "name":
                dish.nome

            };


            if(dish.descrizione){

              item.description =
                dish.descrizione;

            }


            const price =
              Number(dish.prezzo);


            if(!Number.isNaN(price)){

              item.offers = {

                "@type":
                  "Offer",

                "price":
                  price.toFixed(2),

                "priceCurrency":
                  "EUR"

              };

            }


            return item;

          })

      }))

  };


  let script =
    document.getElementById("menu-jsonld");


  if(!script){

    script =
      document.createElement("script");

    script.type =
      "application/ld+json";

    script.id =
      "menu-jsonld";

    document.head.appendChild(script);

  }


  script.textContent =
    JSON.stringify(menuSchema);

}


/* ============================================================
   CACHE
   ============================================================ */

function readMenuCache(){

  try{

    const raw =
      localStorage.getItem(
        MENU_CACHE_KEY
      );

    if(!raw){
      return null;
    }


    const parsed =
      JSON.parse(raw);


    if(
      !parsed ||
      !Array.isArray(parsed.dishes)
    ){

      return null;

    }


    return parsed;

  }catch(error){

    return null;

  }

}


function writeMenuCache(dishes){

  try{

    localStorage.setItem(

      MENU_CACHE_KEY,

      JSON.stringify({

        dishes,

        savedAt:
          Date.now()

      })

    );

  }catch(error){

    /*
     * Storage pieno o non disponibile.
     * Il menù continua comunque a funzionare.
     */

  }

}


/* ============================================================
   FETCH SUPABASE
   ============================================================ */

async function fetchMenuDishes(){

  const response =
    await fetch(
      MENU_REST_URL,
      {

        headers: {

          apikey:
            SUPABASE_ANON_KEY,

          Authorization:
            "Bearer " +
            SUPABASE_ANON_KEY

        }

      }
    );


  if(!response.ok){

    throw new Error(
      "Menu REST error " +
      response.status
    );

  }


  return response.json();

}


/* ============================================================
   LOAD MENU
   ============================================================ */

async function loadPublicMenu(){

  const container =
    document.getElementById(
      "menu-render"
    );


  const cached =
    readMenuCache();


  /*
   * CACHE IMMEDIATA
   */

  if(
    cached &&
    cached.dishes.length
  ){

    renderPublicMenu(
      cached.dishes
    );

    injectMenuJsonLd(
      cached.dishes
    );

  }


  /*
   * AGGIORNAMENTO SUPABASE
   */

  try{

    const dishes =
      await fetchMenuDishes();


    const freshJson =
      JSON.stringify(
        dishes || []
      );


    if(
      !cached ||
      JSON.stringify(
        cached.dishes
      ) !== freshJson
    ){

      renderPublicMenu(
        dishes || []
      );

      injectMenuJsonLd(
        dishes || []
      );

    }


    writeMenuCache(
      dishes || []
    );


  }catch(error){

    console.error(
      "Errore loadPublicMenu:",
      error
    );


    /*
     * Se non abbiamo cache,
     * mostriamo errore.
     */

    if(!cached){

      if(container){

        container.setAttribute(
          "aria-busy",
          "false"
        );


        container.innerHTML =
          '<p class="empty-hint">' +
          'Impossibile caricare il menù al momento. ' +
          'Chiamaci allo ' +
          '<a href="tel:+393389536266">' +
          '+39 331 410 0134' +
          '</a>.' +
          '</p>';

      }

    }

    /*
     * Se esiste cache,
     * la lasciamo visibile.
     */

  }

}


/* ============================================================
   AVVIO
   ============================================================ */

loadPublicMenu();

