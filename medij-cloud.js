/* MédiJ · compte et synchronisation (Supabase)
   Toutes les données de l'appli sont dans des clés localStorage « medij-* ».
   Ce fichier les sauvegarde dans le compte de la personne connectée et les recharge
   sur ses autres appareils. Les clés d'IA personnelles restent sur l'appareil. */
(function () {
  "use strict";
  var SB_URL = "https://usldbodkhnmtlqrygywd.supabase.co";
  var SB_KEY = "sb_publishable_ZLCGigSsqD9QcRMngcq9AQ_obq-ytr5";
  var META = "medijsync-meta";      /* hors préfixe medij- : jamais envoyé */
  var LOCALONLY = "medijsync-local"; /* « continuer sans compte » */
  var NOSYNC = /^medij-(ai-key|claude-key|ai-model|claude-model|ai-provider)$/;
  var isApp = function (k) { return typeof k === "string" && k.indexOf("medij-") === 0 && !NOSYNC.test(k); };

  var ls = window.localStorage;
  var rawSet = Storage.prototype.setItem, rawDel = Storage.prototype.removeItem;
  function meta() { try { return JSON.parse(ls.getItem(META) || "{}") || {}; } catch (e) { return {}; } }
  function setMeta(m) { try { rawSet.call(ls, META, JSON.stringify(m)); } catch (e) {} }
  function snapshot() { var o = {}; for (var i = 0; i < ls.length; i++) { var k = ls.key(i); if (isApp(k)) o[k] = ls.getItem(k); } return o; }
  function hasLocal() { for (var i = 0; i < ls.length; i++) { if (isApp(ls.key(i))) return true; } return false; }
  function applyRemote(data) {
    var del = []; for (var i = 0; i < ls.length; i++) { var k = ls.key(i); if (isApp(k)) del.push(k); }
    del.forEach(function (k) { rawDel.call(ls, k); });
    Object.keys(data || {}).forEach(function (k) { if (isApp(k)) rawSet.call(ls, k, data[k]); });
  }
  function clearLocal() { var del = []; for (var i = 0; i < ls.length; i++) { var k = ls.key(i); if (isApp(k)) del.push(k); } del.forEach(function (k) { rawDel.call(ls, k); }); }

  var sb = null, user = null, timer = null, state = "local", lastErr = "", allowed = false;
  var cloud = window.__MEDIJ_CLOUD = { state: function () { return state; }, user: function () { return user; } };

  /* toute écriture de l'appli marque les données « à envoyer » */
  function touched(k) {
    if (!isApp(k)) return;
    var m = meta(); m.dirty = true; m.localAt = Date.now(); setMeta(m);
    if (user && allowed) { clearTimeout(timer); timer = setTimeout(push, 2500); setState("pending"); }
  }
  Storage.prototype.setItem = function (k, v) { rawSet.call(this, k, v); if (this === ls) touched(k); };
  Storage.prototype.removeItem = function (k) { rawDel.call(this, k); if (this === ls) touched(k); };

  async function push() {
    if (!sb || !user || !allowed) return;
    var m = meta();
    try {
      setState("saving");
      var now = new Date().toISOString();
      var r = await sb.from("medij_state").upsert({ user_id: user.id, data: snapshot(), updated_at: now }, { onConflict: "user_id" }).select("updated_at").single();
      if (r.error) throw r.error;
      m = meta(); m.dirty = false; m.uid = user.id; m.remoteAt = r.data.updated_at; setMeta(m);
      setState("ok");
    } catch (e) { lastErr = (e && e.message) || "erreur"; setState("error"); }
  }

  async function pull(firstLogin) {
    var m = meta();
    var r = await sb.from("medij_state").select("data,updated_at").eq("user_id", user.id).maybeSingle();
    if (r.error) throw r.error;
    var row = r.data;
    if (m.uid && m.uid !== user.id) {
      /* l'appareil contenait les données d'une autre personne */
      if (row) { applyRemote(row.data); setMeta({ uid: user.id, remoteAt: row.updated_at, dirty: false }); return true; }
      clearLocal(); setMeta({ uid: user.id, dirty: false }); return true;
    }
    if (!row) { setMeta(Object.assign(m, { uid: user.id })); if (hasLocal()) await push(); else setState("ok"); return false; }
    var remoteNewer = !m.remoteAt || new Date(row.updated_at) > new Date(m.remoteAt);
    if (remoteNewer && (!m.dirty || new Date(row.updated_at).getTime() > (m.localAt || 0))) {
      applyRemote(row.data); setMeta({ uid: user.id, remoteAt: row.updated_at, dirty: false });
      return true;
    }
    if (m.dirty) await push(); else setState("ok");
    return false;
  }

  /* ---------- interface ---------- */
  var css = "#mjc-pill{position:fixed;top:calc(8px + env(safe-area-inset-top,0px));right:10px;z-index:50;border:0;border-radius:999px;padding:5px 10px;font:600 12px system-ui,sans-serif;background:#b4506f;color:#fff;opacity:.88;box-shadow:0 2px 8px rgba(0,0,0,.2)}" +
    "#mjc-pill.err{background:#b5533f}#mjc-pill.loc{background:#6b5f66}" +
    "#mjc-o{position:fixed;inset:0;z-index:60;background:rgba(74,26,44,.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,sans-serif}" +
    "#mjc-b{background:#fff;color:#1f2430;border-radius:20px;max-width:400px;width:100%;padding:22px;display:flex;flex-direction:column;gap:12px;box-shadow:0 12px 40px rgba(0,0,0,.25)}" +
    "#mjc-b h2{margin:0;font-size:1.35rem}#mjc-b p{margin:0;font-size:.92rem;color:#4b5563;line-height:1.45}" +
    "#mjc-b input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #d6dbe3;border-radius:12px;font-size:16px}" +
    "#mjc-b button{border:0;border-radius:999px;padding:12px;font-weight:700;font-size:15px;cursor:pointer}" +
    ".mjc-p{background:#b4506f;color:#fff}.mjc-s{background:#eef2f7;color:#b4506f}.mjc-l{background:none!important;color:#2b6cb0;text-decoration:underline;padding:4px!important;font-weight:600!important}" +
    ".mjc-m{font-size:.88rem;padding:8px 10px;border-radius:10px;background:#eef4fb}.mjc-m.e{background:#fbeaea;color:#8a1f1f}";
  function el(h) { var d = document.createElement("div"); d.innerHTML = h; return d.firstElementChild; }
  function setState(s) {
    state = s; var p = document.getElementById("mjc-pill"); if (!p) return;
    var T = { local: "📱 Sans compte", pending: "☁️ …", saving: "☁️ Envoi…", ok: "☁️ Synchronisé", error: "⚠️ Hors ligne", off: "☁️ Se connecter" };
    p.textContent = T[s] || s; p.className = s === "error" ? "err" : (s === "local" || s === "off") ? "loc" : "";
  }
  function pill() {
    if (document.getElementById("mjc-pill")) return;
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    var p = el('<button id="mjc-pill" type="button"></button>'); p.onclick = function () { user ? accountBox() : authBox(); };
    document.body.appendChild(p); setState(state);
  }
  function close() { var o = document.getElementById("mjc-o"); if (o) o.remove(); }
  function box(inner) { close(); var o = el('<div id="mjc-o"><div id="mjc-b">' + inner + "</div></div>"); o.style.background = "rgba(74,26,44,.88)"; document.body.appendChild(o); return o; }
  function msg(o, t, e) { var m = o.querySelector(".mjc-m"); if (!m) { m = el('<div class="mjc-m"></div>'); o.querySelector("#mjc-b").appendChild(m); } m.className = "mjc-m" + (e ? " e" : ""); m.textContent = t; }
  var FR = function (e) {
    var t = (e && e.message) || String(e || "");
    if (/Invalid login/i.test(t)) return "E-mail ou mot de passe incorrect.";
    if (/Email not confirmed/i.test(t)) return "Confirme d'abord ton adresse : ouvre le lien reçu par e-mail (regarde aussi dans les spams).";
    if (/already registered/i.test(t)) return "Un compte existe déjà avec cet e-mail : appuie sur « J'ai déjà un compte ».";
    if (/at least 6/i.test(t)) return "Le mot de passe doit faire au moins 6 caractères.";
    if (/rate limit/i.test(t)) return "Trop d'essais : attends quelques minutes.";
    if (/Failed to fetch|NetworkError/i.test(t)) return "Pas de connexion internet.";
    return t;
  };
  function authBox(mode) {
    mode = mode || (meta().uid ? "in" : "up");
    var up = mode === "up";
    var o = box('<h2>' + (up ? "Crée ton compte MédiJ" : "Connexion") + '</h2>' +
      '<p>' + (up ? "Ton compte garde tes cours, ta progression et ton planning, et les retrouve sur ton téléphone comme sur ton ordinateur." : "Retrouve tes cours et ta progression.") + "</p>" +
      '<input id="mjc-e" type="email" autocomplete="email" placeholder="Ton e-mail">' +
      '<input id="mjc-w" type="password" autocomplete="' + (up ? "new-password" : "current-password") + '" placeholder="Mot de passe (6 caractères minimum)">' +
      '<button class="mjc-p" id="mjc-go">' + (up ? "Créer mon compte" : "Me connecter") + "</button>" +
      '<button class="mjc-l" id="mjc-sw">' + (up ? "J'ai déjà un compte" : "Je n'ai pas encore de compte") + "</button>" +
      (up ? "" : '<button class="mjc-l" id="mjc-fg">Mot de passe oublié</button>') +
      '<p style="font-size:.8rem">🔒 Accès à MédiJ : 2 000 F par semestre (Wave ou Orange Money). Ton compte est activé après validation du paiement.</p>');
    o.querySelector("#mjc-sw").onclick = function () { authBox(up ? "in" : "up"); };
    var fg = o.querySelector("#mjc-fg");
    if (fg) fg.onclick = async function () {
      var e = o.querySelector("#mjc-e").value.trim(); if (!e) return msg(o, "Écris d'abord ton e-mail.", true);
      var r = await sb.auth.resetPasswordForEmail(e, { redirectTo: location.origin + location.pathname });
      msg(o, r.error ? FR(r.error) : "E-mail envoyé : ouvre le lien pour choisir un nouveau mot de passe.", !!r.error);
    };
    o.querySelector("#mjc-go").onclick = async function () {
      var e = o.querySelector("#mjc-e").value.trim(), w = o.querySelector("#mjc-w").value;
      if (!e || !w) return msg(o, "Remplis ton e-mail et ton mot de passe.", true);
      this.disabled = true; msg(o, up ? "Création du compte…" : "Connexion…");
      var r = up ? await sb.auth.signUp({ email: e, password: w, options: { emailRedirectTo: location.origin + location.pathname } })
                 : await sb.auth.signInWithPassword({ email: e, password: w });
      this.disabled = false;
      if (r.error) return msg(o, FR(r.error), true);
      if (up && !r.data.session) return msg(o, "Compte créé ! Ouvre le lien reçu par e-mail pour confirmer ton adresse (regarde aussi dans les spams), puis reviens te connecter.");
      msg(o, "Vérification de ton accès…");
    };
  }
  function accountBox() {
    var o = box("<h2>Mon compte</h2><p>Connectée avec <strong>" + (user.email || "") + "</strong>.</p>" +
      "<p>" + (state === "error" ? "⚠️ La dernière synchronisation a échoué (" + lastErr + "). Tes changements sont gardés sur cet appareil et seront envoyés au retour d'internet." : "☁️ Tes cours et ta progression sont sauvegardés dans ton compte.") + "</p>" +
      '<button class="mjc-p" id="mjc-now">Synchroniser maintenant</button>' +
      '<button class="mjc-s" id="mjc-out">Me déconnecter</button><button class="mjc-l" id="mjc-x">Fermer</button>');
    o.querySelector("#mjc-now").onclick = async function () { this.disabled = true; try { var ch = await pull(); if (ch) { location.reload(); return; } await push(); } catch (e) { lastErr = e.message; } close(); };
    o.querySelector("#mjc-out").onclick = async function () {
      if (meta().dirty) await push();
      await sb.auth.signOut(); clearLocal(); setMeta({}); location.reload();
    };
    o.querySelector("#mjc-x").onclick = close;
  }
  function gateBox(statut) {
    var refuse = statut === "refuse";
    var o = box(refuse ? "<h2>Accès refusé</h2><p>Ton compte <strong>" + (user.email || "") + "</strong> n'a pas été accepté pour MédiJ.</p>"
      : "<h2>⏳ Dernière étape : ton accès</h2><p>Ton compte <strong>" + (user.email || "") + "</strong> est bien créé 🎉</p>" +
        "<p>L'accès à MédiJ coûte <strong>2 000 F par semestre</strong> (prix de lancement).</p>" +
        "<p>1. Envoie <strong>2 000 F</strong> par <strong>Wave</strong> ou <strong>Orange Money</strong> au <strong>78 171 88 76</strong> (Mariame MOUIGNI).<br>2. Préviens Mariame sur WhatsApp avec ton e-mail.<br>3. Dès que ton compte est validé, appuie sur « Vérifier ».</p>" +
        '<a class="mjc-p" style="display:block;text-align:center;text-decoration:none;border-radius:999px;padding:12px;font-weight:700;font-size:15px;background:#1f9d55;color:#fff" target="_blank" rel="noopener" href="https://wa.me/221781718876?text=' + encodeURIComponent("Bonjour Mariame, j'ai payé les 2 000 F pour MédiJ. Mon e-mail : " + (user.email || "")) + '">💬 Prévenir Mariame sur WhatsApp</a>' +
        '<button class="mjc-p" id="mjc-chk">Vérifier</button>');
    o.querySelector("#mjc-b").insertAdjacentHTML("beforeend", '<button class="mjc-s" id="mjc-out">Me déconnecter</button>');
    o.style.background = "rgba(74,26,44,.92)";
    var chk = o.querySelector("#mjc-chk");
    if (chk) chk.onclick = async function () { this.disabled = true; var st2 = await access(); if (st2 === "accepte") location.reload(); else { this.disabled = false; msg(o, "Pas encore validé. Réessaie un peu plus tard."); } };
    o.querySelector("#mjc-out").onclick = async function () { await sb.auth.signOut(); clearLocal(); setMeta({}); location.reload(); };
  }
  async function access() {
    try { var r = await sb.from("medij_access").select("statut").eq("user_id", user.id).maybeSingle(); if (r.error) throw r.error; return r.data ? r.data.statut : "en_attente"; }
    catch (e) { lastErr = (e && e.message) || ""; return "erreur"; }
  }
  function passwordBox() {
    var o = box('<h2>Nouveau mot de passe</h2><input id="mjc-w" type="password" autocomplete="new-password" placeholder="Nouveau mot de passe"><button class="mjc-p" id="mjc-go">Enregistrer</button>');
    o.querySelector("#mjc-go").onclick = async function () { var r = await sb.auth.updateUser({ password: o.querySelector("#mjc-w").value }); if (r.error) msg(o, FR(r.error), true); else close(); };
  }

  /* ---------- démarrage ---------- */
  if (!window.supabase || !window.supabase.createClient) { cloud.ready = Promise.resolve(); return; }
  sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  cloud.sb = sb; cloud.url = SB_URL; cloud.key = SB_KEY; cloud.allowed = function () { return allowed; };
  cloud.client = sb;
  var started = false;
  async function onUser(u) {
    user = u; pillWhenReady();
    if (!u) { setState("off"); return; }
    if (started) return; started = true;
    var statut = await access();
    if (statut === "erreur") { setState("error"); close(); return; } /* hors ligne : on laisse utiliser ce qui est sur l'appareil */
    if (statut !== "accepte") { allowed = false; setState("off"); gateBox(statut); return; }
    allowed = true; close();
    try {
      var changed = await pull();
      if (changed) { var k = "medijsync-reload"; if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, "1"); location.reload(); return; } }
      sessionStorage.removeItem("medijsync-reload");
    } catch (e) { lastErr = (e && e.message) || ""; setState("error"); }
  }
  sb.auth.onAuthStateChange(function (ev, session) {
    if (ev === "PASSWORD_RECOVERY") setTimeout(passwordBox, 500);
    if (ev === "SIGNED_IN" && !user) onUser(session.user);
    if (ev === "SIGNED_OUT") { user = null; started = false; setState("off"); }
  });
  function pillWhenReady() { if (document.body) pill(); else document.addEventListener("DOMContentLoaded", pill); }
  cloud.ready = sb.auth.getSession().then(function (r) {
    var s = r.data && r.data.session;
    onUser(s ? s.user : null);
    if (!s) {
      var show = function () { setTimeout(function () { authBox(); }, 400); };
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", show); else show();
    }
  });
  window.addEventListener("online", function () { if (user && meta().dirty) push(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && user && meta().dirty) push(); });
})();
