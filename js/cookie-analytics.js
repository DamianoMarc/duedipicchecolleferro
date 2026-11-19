/* Cookie banner + statistiche anonime minimali — caricato da tutte le pagine
 *
 * Principi (minimizzazione dei dati):
 *  - Nessuna geolocalizzazione, nessun dato di posizione.
 *  - Le statistiche sono OPT-IN: spente finché l'utente non le accetta.
 *  - Nessun ID persistente: solo un ID casuale di sessione (sessionStorage),
 *    che sparisce alla chiusura della scheda.
 *  - Si inviano solo: tipo di evento, pagina (path), tipo di dispositivo
 *    (mobile/tablet/desktop) e l'ID di sessione. Niente referrer, lingua,
 *    risoluzione, titolo pagina, testo/URL dei click, scroll.
 *  - Nessun log locale degli eventi.
 */
(function () {

    "use strict";


    /* =====================================================
       HTML di banner, modale e pulsante privacy.
       Iniettato qui così non va duplicato in ogni pagina.
    ===================================================== */

    const UNICO_UI_HTML = `
<!-- COOKIE BANNER -->
<div id="unico-cookie-banner" role="dialog" aria-label="Privacy">
    <button id="unico-cookie-x" type="button" aria-label="Chiudi senza accettare">&times;</button>
    <h3>La tua privacy è importante</h3>
    <p>
        Questo sito usa solo lo storage tecnico necessario al suo
        funzionamento (ad esempio per ricordare le tue scelte). Solo con il
        tuo consenso raccogliamo anche statistiche anonime di utilizzo.
        Non rileviamo la tua posizione e non condividiamo dati con
        inserzionisti. Chiudendo il banner con la &times; o scegliendo
        &laquo;Rifiuta&raquo; prosegui senza statistiche. Leggi l'
        <a href="privacy.html" target="_blank" rel="noopener">Informativa Privacy &amp; Cookie</a>
        o gestisci le tue scelte qui sotto.
    </p>
    <div class="unico-cookie-buttons">
        <button id="unico-cookie-accept" type="button">Accetta</button>
        <button id="unico-cookie-reject" type="button">Rifiuta</button>
        <button id="unico-cookie-settings" type="button">Personalizza</button>
    </div>
</div>

<!-- COOKIE SETTINGS MODAL -->
<div id="unico-cookie-modal">
    <div class="unico-cookie-modal-box">
        <h2>Impostazioni privacy</h2>
        <p>
            Puoi scegliere quali categorie consentire e modificare la scelta
            in qualsiasi momento riaprendo questo pannello. Per i dettagli su
            cosa viene raccolto, perché e per quanto tempo, consulta l'
            <a href="privacy.html" target="_blank" rel="noopener">Informativa Privacy &amp; Cookie</a>.
        </p>
        <div class="unico-cookie-option">
            <div class="unico-cookie-option-header">
                <div>
                    <h4>Necessari</h4>
                    <p>Servono al funzionamento del sito e a ricordare le tue scelte. Nessun dato personale.</p>
                </div>
                <span class="unico-cookie-required">Sempre attivi</span>
            </div>
        </div>
        <div class="unico-cookie-option">
            <div class="unico-cookie-option-header">
                <div>
                    <h4>Statistiche</h4>
                    <p>
                        Conteggi anonimi delle visualizzazioni di pagina e dei clic sulle
                        azioni principali (prenotazione, WhatsApp, telefono, Maps, Instagram),
                        con il solo tipo di dispositivo. Disattivate di default; nessuna
                        posizione, nessun ID persistente. Puoi cambiare idea in qualsiasi momento.
                    </p>
                </div>
                <label class="unico-cookie-toggle">
                    <input type="checkbox" id="unico-analytics-consent" aria-label="Statistiche">
                    <span class="unico-cookie-slider"></span>
                </label>
            </div>
        </div>
        <div class="unico-cookie-modal-buttons">
            <button id="unico-cookie-close" type="button">Annulla</button>
            <button id="unico-cookie-save" type="button">Salva preferenze</button>
        </div>
    </div>
</div>

<!-- PRIVACY SETTINGS BUTTON -->
<button id="unico-privacy-button" title="Impostazioni privacy" aria-label="Impostazioni privacy" type="button">
    ⚙️ Impostazioni privacy
</button>
`;

    document.body.insertAdjacentHTML("beforeend", UNICO_UI_HTML);


    /* Il pulsante delle impostazioni privacy va accanto al link
       "Privacy & Cookie Policy" nel footer (se la pagina ce l'ha),
       invece di restare isolato in fondo alla pagina. */

    (function placePrivacyButton() {

        const button =
            document.getElementById("unico-privacy-button");

        const footerText =
            document.querySelector("footer .footer-bottom > span");

        if (button && footerText) {

            footerText.appendChild(
                document.createTextNode(" · ")
            );

            footerText.appendChild(button);

        }

    })();


    /* =====================================================
       INVIO STATISTICHE (Supabase REST, senza librerie)

       Stesso progetto Supabase già usato per il menù.
       Usiamo una semplice fetch: non serve più caricare
       supabase-js da una CDN esterna su ogni pagina.
    ===================================================== */

    const ANALYTICS_ENDPOINT =
        "https://udvdgozontyttoeaijph.supabase.co/rest/v1/analytics_events";

    const ANALYTICS_KEY =
        "sb_publishable_nsS-CkirN0jwrJjsGwsncw_Hya8h2Ak";


    /* =====================================================
       STORAGE KEYS

       Le chiavi sono "_v2": cambiando informativa, a tutti
       gli utenti viene richiesto di nuovo il consenso.
    ===================================================== */

    const STORAGE = {

        consent:
            "unico_privacy_consent_v3",

        consentTs:
            "unico_privacy_consent_ts_v3",

        analytics:
            "unico_analytics_enabled_v3",

        session:
            "unico_session_id"

    };


    /* Chiavi delle versioni precedenti (visitor ID persistente,
       log eventi, geolocalizzazione): vengono cancellate. */

    const LEGACY_KEYS = [

        "unico_privacy_consent_v2",
        "unico_analytics_enabled_v2",

        "unico_privacy_consent",
        "unico_analytics_enabled",
        "unico_location_enabled",
        "unico_nearby_last_shown",
        "unico_visitor_id",
        "unico_analytics_events"

    ];


    function removeLegacyData() {

        try {

            LEGACY_KEYS.forEach(function (key) {
                localStorage.removeItem(key);
            });

        } catch (error) {
            /* storage non disponibile: nulla da pulire */
        }

    }


    /* =====================================================
       ELEMENTI DOM
    ===================================================== */

    const banner =
        document.getElementById("unico-cookie-banner");

    const modal =
        document.getElementById("unico-cookie-modal");

    const acceptButton =
        document.getElementById("unico-cookie-accept");

    const rejectButton =
        document.getElementById("unico-cookie-reject");

    const settingsButton =
        document.getElementById("unico-cookie-settings");

    const saveButton =
        document.getElementById("unico-cookie-save");

    const closeButton =
        document.getElementById("unico-cookie-close");

    const analyticsCheckbox =
        document.getElementById("unico-analytics-consent");

    const privacyButton =
        document.getElementById("unico-privacy-button");


    /* =====================================================
       STORAGE SICURO
    ===================================================== */

    function readStorage(storage, key) {

        try {
            return storage.getItem(key);
        } catch (error) {
            return null;
        }

    }


    function writeStorage(storage, key, value) {

        try {
            storage.setItem(key, value);
        } catch (error) {
            /* storage non disponibile: ignoriamo */
        }

    }


    function removeStorage(storage, key) {

        try {
            storage.removeItem(key);
        } catch (error) {
            /* ignoriamo */
        }

    }


    /* =====================================================
       CONSENSO
    ===================================================== */

    /* La scelta vale 6 mesi, poi il banner viene riproposto
       (Linee guida Garante 10/06/2021). */

    const CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

    function hasChoice() {

        if (readStorage(localStorage, STORAGE.consent) !== "true") {
            return false;
        }

        const ts = Number(readStorage(localStorage, STORAGE.consentTs));

        return ts > 0 && (Date.now() - ts) < CONSENT_MAX_AGE_MS;

    }


    /* Opt-in: attive SOLO se l'utente le ha accettate. */

    function isAnalyticsEnabled() {

        if (!hasChoice()) {
            return false;
        }

        return readStorage(
            localStorage,
            STORAGE.analytics
        ) === "true";

    }


    function showCookieBanner() {

        if (!hasChoice()) {

            banner.style.display = "block";

        }

    }


    function openSettings() {

        analyticsCheckbox.checked =
            isAnalyticsEnabled();

        modal.style.display = "flex";

    }


    function closeSettings() {

        modal.style.display = "none";

    }


    function saveConsent(analytics) {

        writeStorage(
            localStorage,
            STORAGE.consent,
            "true"
        );

        writeStorage(
            localStorage,
            STORAGE.consentTs,
            String(Date.now())
        );

        writeStorage(
            localStorage,
            STORAGE.analytics,
            analytics ? "true" : "false"
        );

        banner.style.display = "none";

        closeSettings();


        if (analytics) {

            initAnalytics();

        } else {

            /* Consenso negato o revocato: cancelliamo
               anche l'ID di sessione. */

            removeStorage(
                sessionStorage,
                STORAGE.session
            );

        }

    }


    acceptButton.addEventListener(
        "click",
        function () {
            saveConsent(true);
        }
    );


    document.getElementById("unico-cookie-x").addEventListener(
        "click",
        function () {
            saveConsent(false);
        }
    );


    rejectButton.addEventListener(
        "click",
        function () {
            saveConsent(false);
        }
    );


    settingsButton.addEventListener(
        "click",
        openSettings
    );


    privacyButton.addEventListener(
        "click",
        openSettings
    );


    closeButton.addEventListener(
        "click",
        closeSettings
    );


    saveButton.addEventListener(
        "click",
        function () {
            saveConsent(analyticsCheckbox.checked);
        }
    );


    /* =====================================================
       DATI MINIMI
    ===================================================== */

    /* ID casuale valido solo per la scheda corrente
       (sessionStorage): non identifica la persona e non
       sopravvive alla chiusura del browser. */

    function getSessionId() {

        let id =
            readStorage(
                sessionStorage,
                STORAGE.session
            );

        if (!id) {

            id =
                "s_" + (
                    window.crypto &&
                    typeof window.crypto.randomUUID === "function"
                        ? window.crypto.randomUUID()
                        : String(Date.now()) +
                          Math.random().toString(36).slice(2)
                );

            writeStorage(
                sessionStorage,
                STORAGE.session,
                id
            );

        }

        return id;

    }


    function getDeviceType() {

        const width =
            window.innerWidth;

        if (width <= 600) {
            return "mobile";
        }

        if (width <= 1024) {
            return "tablet";
        }

        return "desktop";

    }


    /* =====================================================
       TRACK EVENT
    ===================================================== */

    function trackEvent(eventName) {

        /* Senza consenso non si registra nulla. */

        if (!isAnalyticsEnabled()) {
            return;
        }

        const payload = {

            visitor_id:
                getSessionId(),

            event:
                eventName,

            device:
                getDeviceType(),

            page:
                window.location.pathname,

            data:
                {}

        };

        try {

            fetch(
                ANALYTICS_ENDPOINT,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        apikey:
                            ANALYTICS_KEY,

                        Authorization:
                            "Bearer " +
                            ANALYTICS_KEY,

                        Prefer:
                            "return=minimal"

                    },

                    body:
                        JSON.stringify(payload),

                    keepalive:
                        true

                }
            ).catch(function () {
                /* statistiche non critiche: ignoriamo gli errori */
            });

        } catch (error) {
            /* ignoriamo */
        }

    }


    /* =====================================================
       ANALYTICS
    ===================================================== */

    let pageViewSent = false;


    function initAnalytics() {

        if (
            !isAnalyticsEnabled() ||
            pageViewSent
        ) {
            return;
        }

        pageViewSent = true;

        trackEvent("page_view");

    }


    /*
     * Click sulle azioni principali. Registriamo SOLO il tipo
     * di azione, mai il testo o l'URL del link.
     * Il listener è sempre presente ma trackEvent() non fa
     * nulla se le statistiche non sono consentite.
     */

    document.addEventListener(
        "click",
        function (event) {

            if (!isAnalyticsEnabled()) {
                return;
            }

            const element =
                event.target.closest("a");

            if (!element) {
                return;
            }

            const href =
                element.getAttribute("href") || "";

            if (href.includes("preenota.it")) {

                trackEvent("reservation_click");

            } else if (
                href.includes("wa.me") ||
                href.includes("whatsapp")
            ) {

                trackEvent("whatsapp_click");

            } else if (href.startsWith("tel:")) {

                trackEvent("phone_click");

            } else if (
                href.includes("google.com/maps") ||
                href.includes("maps.google")
            ) {

                trackEvent("maps_click");

            } else if (href.includes("instagram.com")) {

                trackEvent("instagram_click");

            }

        }
    );


    /* =====================================================
       INIZIALIZZAZIONE
    ===================================================== */

    function init() {

        /* Pulizia dei dati raccolti dalle versioni precedenti */

        removeLegacyData();

        initAnalytics();

        showCookieBanner();

    }


    init();


})();
