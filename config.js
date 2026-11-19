// ─────────────────────────────────────────────
//  Preenota — config.js  (v2 — PWA + WebPush + cold start)
// ─────────────────────────────────────────────
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:8080/api"
  : "https://ristorante-backend-q2w3.onrender.com/api";
// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
const Auth = {
  token:      () => localStorage.getItem("jwt_token"),
  localeId:   () => localStorage.getItem("locale_id"),
  localeNome: () => localStorage.getItem("locale_nome") || "Locale",
  isLogged:   () => !!localStorage.getItem("jwt_token"),
  save(data) {
    if (data?.token) localStorage.setItem("jwt_token", data.token);
    const id = data?.localeId || data?.restaurantId;
    if (id) localStorage.setItem("locale_id", id);
    const nome = data?.localeNome || data?.nome || data?.restaurantName;
    if (nome) localStorage.setItem("locale_nome", nome);
  },
  clear() {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("locale_id");
    localStorage.removeItem("locale_nome");
  }
};
// ─────────────────────────────────────────────
// COLD START SHIELD
// ─────────────────────────────────────────────
(function initColdStartShield() {
  const TIMEOUT_MS = 18000;
  const PING_PATH = "/ping";
  if (window.location.pathname.includes("offline")) return;
  const splash = document.createElement("div");
  splash.id = "cold-start-splash";
  splash.innerHTML = `
    <div style="
      position:fixed;inset:0;z-index:99999;
      background:#0B1F3B;
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      gap:20px;font-family:sans-serif;
    ">
      <div style="font-size:36px">🍽</div>
      <div style="color:#fff;font-size:20px;font-weight:800">Preenota</div>
      <div id="_splash_msg" style="color:rgba(255,255,255,.6);font-size:13px">
        Connessione in corso…
      </div>
      <div style="
        width:40px;height:40px;border-radius:50%;
        border:3px solid rgba(255,255,255,.2);
        border-top-color:#3B82F6;
        animation:spin .8s linear infinite;
      "></div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>
  `;
  function mount() {
    if (document.body) document.body.appendChild(splash);
    else document.addEventListener("DOMContentLoaded", () => document.body.appendChild(splash));
  }
  function remove() {
    const el = document.getElementById("cold-start-splash");
    if (el) el.remove();
  }
  let shown = false;
  const showTimer = setTimeout(() => {
    shown = true;
    mount();
  }, 400);
  const forceRemove = setTimeout(() => {
    clearTimeout(showTimer);
    remove();
  }, TIMEOUT_MS);
  fetch(API_BASE + PING_PATH, { method: "GET", cache: "no-store" })
    .then(() => {
      clearTimeout(showTimer);
      clearTimeout(forceRemove);
      if (shown) remove();
    })
    .catch(() => {
      clearTimeout(showTimer);
      clearTimeout(forceRemove);
      if (shown) {
        const msg = document.getElementById("_splash_msg");
        if (msg) msg.textContent = "Nessuna connessione";
        setTimeout(remove, 2500);
      }
    });
})();
// ─────────────────────────────────────────────
// SERVICE WORKER
// ─────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      console.log("[PWA] SW registrato:", reg.scope);
    } catch (err) {
      console.warn("[PWA] SW error:", err);
    }
  });
}
// ─────────────────────────────────────────────
// WEB PUSH (NUOVO)
// ─────────────────────────────────────────────
let _vapidPublicKey = null;
async function loadVapidPublicKey() {
  if (_vapidPublicKey) return _vapidPublicKey;
  try {
    const res = await fetch(API_BASE + "/push/vapid-public-key");
    if (!res.ok) return null;
    const data = await res.json();
    _vapidPublicKey = data.publicKey;
    return _vapidPublicKey;
  } catch (e) {
    console.warn("[WebPush] errore VAPID:", e);
    return null;
  }
}
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}
async function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (!("serviceWorker" in navigator)) return;
  if (!("PushManager" in window)) return;

  let permission = Notification.permission;

  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") return;

  try {
    const reg = await navigator.serviceWorker.ready;
    const publicKey = await loadVapidPublicKey();
    if (!publicKey) return;

    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }

    await _registerSubscriptionOnBackend(subscription);
  } catch (err) {
    console.warn("[WebPush] errore:", err);
  }
}
async function _registerSubscriptionOnBackend(subscription) {
  const token = Auth.token();
  if (!token) return;
  const sub = subscription.toJSON();
  try {
    await fetch(API_BASE + "/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth
        }
      })
    });
    console.log("[WebPush] registrata");
  } catch (e) {
    console.warn("[WebPush] errore backend:", e);
  }
}
async function unregisterPushSubscription() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const token = Auth.token();
    if (token) {
      await fetch(API_BASE + "/push/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ endpoint: sub.endpoint })
      });
    }
    await sub.unsubscribe();
    console.log("[WebPush] unsubscribed");
  } catch (e) {
    console.warn("[WebPush] errore unsubscribe:", e);
  }
}
function sendBrowserPush(booking) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification("🍽 Nuova prenotazione", {
    body: `${booking.nome} · ${booking.persone} persone`,
    icon: "/icon-192.png"
  });
}
// ─────────────────────────────────────────────
// API FETCH
// ─────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let res;
  try {
    const headers = {
      "Content-Type": "application/json",
      ...(opts.headers || {})
    };
    if (Auth.token()) {
      headers["Authorization"] = "Bearer " + Auth.token();
    }
    res = await fetch(API_BASE + path, {
      ...opts,
      headers,
      signal: controller.signal
    });
  } catch (err) {
    const e = new Error(err.name === "AbortError"
      ? "Il server non risponde, riprova tra poco."
      : "Nessuna connessione.");
    e.status = 0;
    throw e;
  } finally {
    clearTimeout(timeout);
  }
  if (res.status === 401) {
    Auth.clear();
    window.location.href = "login.html";
    return null;
  }
  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { /* risposta non JSON */ }
  if (!res.ok) {
    // errori del backend: { status, message, timestamp }
    const e = new Error((data && data.message) || ("Errore " + res.status));
    e.status = res.status;
    throw e;
  }
  return data;
}
// ─────────────────────────────────────────────
// PUBLIC FETCH
// ─────────────────────────────────────────────
async function publicFetch(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    return res;
  } catch (e) {
    return null;
  }
}
// ─────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}
function fmtDateTime(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function todayISO() {
  return new Date().toISOString().split("T")[0];
}