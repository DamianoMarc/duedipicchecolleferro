/* Script condivisi: menu mobile, lightbox galleria, mappa click-to-load */
(function () {
  "use strict";

  /* Menu mobile */
  var burger = document.querySelector(".burger");
  var panel = document.getElementById("mobile-menu");
  function setMenu(open) {
    if (!burger || !panel) return;
    panel.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Chiudi menu" : "Apri menu");
  }
  if (burger && panel) {
    burger.addEventListener("click", function () {
      setMenu(!panel.classList.contains("open"));
    });
    panel.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
  }

  /* Galleria: lightbox */
  var lightbox = document.getElementById("lightbox");
  if (lightbox) {
    var big = document.getElementById("lightbox-img");
    var closeLightbox = function () {
      lightbox.classList.remove("active");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    };
    document.querySelectorAll("[data-full]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        big.src = btn.dataset.full;
        big.alt = btn.dataset.alt || "";
        lightbox.classList.add("active");
        lightbox.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        lightbox.querySelector(".lightbox-close").focus();
      });
    });
    lightbox.addEventListener("click", function (e) {
      if (e.target.id !== "lightbox-img") closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeLightbox();
    });
  }

  /* Mappa Google: caricata solo dopo un clic esplicito (nessuna connessione a Google prima) */
  document.querySelectorAll("[data-map-load]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var wrap = btn.closest(".map-wrap");
      var frame = wrap && wrap.querySelector("iframe[data-src]");
      var box = wrap && wrap.querySelector(".map-consent");
      if (!frame) return;
      frame.src = frame.dataset.src;
      frame.hidden = false;
      if (box) box.style.display = "none";
    });
  });

  /* Prenotazione: popup con Preenota dentro il sito.
     La pagina di Preenota (iframe) viene caricata SOLO dopo il clic su "Prenota":
     prima non c'è nessuna connessione verso preenota.it.
     Se il popup non si apre (JS spento, ctrl/cmd+clic, clic centrale) il link funziona come sempre. */
  (function () {
    var SEL = 'a[href^="https://preenota.it/r/"],a[href^="https://preenota.it/prenota/"]';
    var DEFAULT_URL = "https://preenota.it/r/DUEDIPICCHE";
    var modal, frame, loader, loaderMsg, closeBtn;
    var isOpen = false, pushed = false, lastFocus = null, loadedSrc = "", slowTimer = null;

    function build() {
      modal = document.createElement("div");
      modal.className = "book-modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-label", "Prenota un tavolo");
      modal.setAttribute("aria-hidden", "true");
      modal.innerHTML =
        '<div class="book-box">' +
          '<div class="book-head">' +
            '<button type="button" class="book-close" aria-label="Chiudi">&times;</button>' +
          '</div>' +
          '<div class="book-body">' +
            '<div class="book-loader" role="status"><span class="book-spin" aria-hidden="true"></span><span class="book-msg">Caricamento della prenotazione…</span></div>' +
            '<iframe class="book-frame" title="Prenotazione tavolo, UNICO Restaurant" referrerpolicy="strict-origin-when-cross-origin" ' +
              'sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
      frame = modal.querySelector(".book-frame");
      loader = modal.querySelector(".book-loader");
      loaderMsg = modal.querySelector(".book-msg");
      closeBtn = modal.querySelector(".book-close");

      closeBtn.addEventListener("click", close);
      modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
      frame.addEventListener("load", function () {
        if (!frame.getAttribute("src")) return;
        clearTimeout(slowTimer);
        modal.classList.add("is-loaded");
      });
    }

    function embedUrl(href) {
      try {
        var u = new URL(href, location.href);
        u.searchParams.set("embed", "1");
        return u.toString();
      } catch (err) { return href; }
    }

    function open(href, from) {
      if (!modal) build();
      if (isOpen) return;
      isOpen = true;
      lastFocus = from || document.activeElement;
      var src = embedUrl(href);
      if (loadedSrc !== src) {
        loadedSrc = src;
        modal.classList.remove("is-loaded");
        loaderMsg.textContent = "Caricamento della prenotazione…";
        clearTimeout(slowTimer);
        slowTimer = setTimeout(function () {
          loaderMsg.textContent = "Ci sta mettendo un po’… attendi ancora qualche istante.";
        }, 9000);
        frame.src = src;
      }
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      document.documentElement.classList.add("book-lock");
      try { history.pushState({ book: 1 }, "", "#prenota"); pushed = true; } catch (err) { pushed = false; }
      closeBtn.focus();
    }

    function hide() {
      if (!isOpen) return;
      isOpen = false;
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      document.documentElement.classList.remove("book-lock");
      if (location.hash === "#prenota") {
        try { history.replaceState(null, "", location.pathname + location.search); } catch (err) {}
      }
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function close() {
      if (!isOpen) return;
      if (pushed) { pushed = false; history.back(); } else { hide(); }
    }

    /* tasto Indietro del telefono = chiude il popup */
    window.addEventListener("popstate", function () { pushed = false; hide(); });

    document.addEventListener("keydown", function (e) {
      if (!isOpen) return;
      if (e.key === "Escape") { close(); return; }
      if (e.key !== "Tab") return;
      var items = [closeBtn, frame];
      var i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    });

    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest(SEL);
      if (!a || (a.target && a.target !== "_self")) return;
      e.preventDefault();
      open(a.href, a);
    });

    /* Link diretto al popup: https://…/#prenota (utile per Google Business, Instagram, QR) */
    if (location.hash === "#prenota") open(DEFAULT_URL, null);
  })();
})();
