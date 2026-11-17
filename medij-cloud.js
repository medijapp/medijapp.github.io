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
    "#mjc-adm{position:fixed;top:calc(40px + env(safe-area-inset-top,0px));right:10px;z-index:50;border:0;border-radius:999px;padding:5px 10px;font:700 12px system-ui,sans-serif;background:#3f8a62;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.2);cursor:pointer}" +
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
      (!isAdmin() ? "<p>📅 " + (expireLe ? "Abonnement valable jusqu'au <strong>" + frDate(expireLe) + "</strong>" + (joursRestants(expireLe) <= 7 ? " ⚠️ (bientôt fini : pense à renouveler)" : "") : "Abonnement actif") + "</p>" : "") +
      (isAdmin() ? '<button class="mjc-p" id="mjc-adm2">👑 Validation des comptes</button>' : "") +
      '<button class="mjc-p" id="mjc-now">Synchroniser maintenant</button>' +
      '<button class="mjc-s" id="mjc-out">Me déconnecter</button><button class="mjc-l" id="mjc-x">Fermer</button>');
    var ad = o.querySelector("#mjc-adm2"); if (ad) ad.onclick = adminBox;
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
      : statut === "expire" ? "<h2>⌛ Ton abonnement est terminé</h2><p>Ton accès à MédiJ a pris fin le <strong>" + frDate(expireLe) + "</strong>. Tes cours et ta progression sont gardés 🔒</p><p>Pour continuer, renouvelle ton accès : <strong>2 000 F pour un semestre</strong>.</p>" + PAY + waBtn("Bonjour Mariame, je renouvelle mon abonnement MédiJ (2 000 F).") + '<button class="mjc-p" id="mjc-chk">Vérifier</button>'
      : "<h2>⏳ Dernière étape : ton accès</h2><p>Ton compte <strong>" + (user.email || "") + "</strong> est bien créé 🎉</p>" +
        "<p>L'accès à MédiJ coûte <strong>2 000 F par semestre</strong> (prix de lancement).</p>" +
        "<p>1. Envoie <strong>2 000 F</strong> par <strong>Wave</strong> ou <strong>Orange Money</strong> au <strong>78 171 88 76</strong> (Mariame MOUIGNI).<br>2. Préviens Mariame sur WhatsApp avec ton e-mail.<br>3. Dès que ton compte est validé, appuie sur « Vérifier ».</p>" + FRP +
        '<a class="mjc-p" style="display:block;text-align:center;text-decoration:none;border-radius:999px;padding:12px;font-weight:700;font-size:15px;background:#1f9d55;color:#fff" target="_blank" rel="noopener" href="https://wa.me/221781718876?text=' + encodeURIComponent("Bonjour Mariame, j'ai payé les 2 000 F pour MédiJ. Mon e-mail : " + (user.email || "")) + '">💬 Prévenir Mariame sur WhatsApp</a>' +
        '<button class="mjc-p" id="mjc-chk">Vérifier</button>');
    o.querySelector("#mjc-b").insertAdjacentHTML("beforeend", '<button class="mjc-s" id="mjc-out">Me déconnecter</button>');
    o.style.background = "rgba(74,26,44,.92)";
    var chk = o.querySelector("#mjc-chk");
    if (chk) chk.onclick = async function () { this.disabled = true; var st2 = await access(); if (st2 === "accepte") location.reload(); else { this.disabled = false; msg(o, "Pas encore validé. Réessaie un peu plus tard."); } };
    o.querySelector("#mjc-out").onclick = async function () { await sb.auth.signOut(); clearLocal(); setMeta({}); location.reload(); };
  }
  async function access() {
    try { var r = await sb.from("medij_access").select("statut,expire_le,pro").eq("user_id", user.id).maybeSingle(); if (r.error) throw r.error;
      if (!r.data) return "en_attente"; expireLe = r.data.expire_le || null; isPro = !!r.data.pro;
      if (r.data.statut === "accepte" && expireLe && expireLe < ymdLocal()) return "expire";
      return r.data.statut; }
    catch (e) { lastErr = (e && e.message) || ""; return "erreur"; }
  }
  /* ---------- Abonnement : date de fin ---------- */
  var expireLe = null, isPro = false, PRO_ACTIF = false; /* MédiJ Pro pas encore lancé */
  function ymdLocal(d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function frDate(s) { try { return new Date(s + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return s; } }
  function plusSemestre(from) { var d = new Date((from || ymdLocal()) + "T12:00:00"); d.setMonth(d.getMonth() + 6); return ymdLocal(d); }
  function joursRestants(s) { return Math.round((new Date(s + "T12:00:00") - new Date(ymdLocal() + "T12:00:00")) / 864e5); }
  var FRP = '<p style="font-size:.9rem;opacity:.9">🇫🇷 <strong>Tu es en France ?</strong> Envoie <strong>5 €</strong> avec Taptap Send ou LemFi, vers le Wave ou l\'Orange Money <strong>+221 78 171 88 76</strong> (Mariame MOUIGNI), puis préviens Mariame.</p>';
  var PAY = "<p>1. Envoie <strong>2 000 F</strong> par <strong>Wave</strong> ou <strong>Orange Money</strong> au <strong>78 171 88 76</strong> (Mariame MOUIGNI).<br>2. Préviens Mariame sur WhatsApp avec ton e-mail.<br>3. Dès que c'est validé, appuie sur « Vérifier ».</p>" + FRP;
  function waBtn(txt) { return '<a style="display:block;text-align:center;text-decoration:none;border-radius:999px;padding:12px;font-weight:700;font-size:15px;background:#1f9d55;color:#fff" target="_blank" rel="noopener" href="https://wa.me/221781718876?text=' + encodeURIComponent(txt + " Mon e-mail : " + ((user && user.email) || "")) + '">💬 Prévenir Mariame sur WhatsApp</a>'; }
  function rappelExpiration() {
    if (!expireLe || isAdmin()) return;
    var j = joursRestants(expireLe); if (j > 7 || j < 0) return;
    var k = "medij-rappel-" + ymdLocal(); try { if (localStorage.getItem(k)) return; rawSet.call(ls, k, "1"); } catch (e) {}
    var o = box("<h2>📅 Ton abonnement se termine bientôt</h2><p>Ton accès à MédiJ est valable jusqu'au <strong>" + frDate(expireLe) + "</strong> (" + (j === 0 ? "aujourd'hui" : "dans " + j + " jour" + (j > 1 ? "s" : "")) + ").</p><p>Pour continuer sans interruption, renouvelle ton accès : <strong>2 000 F</strong> par Wave ou Orange Money au <strong>78 171 88 76</strong>.</p>" + FRP + waBtn("Bonjour Mariame, je renouvelle mon abonnement MédiJ (2 000 F).") + '<button class="mjc-s" id="mjc-rx">Plus tard</button>');
    o.querySelector("#mjc-rx").onclick = close;
  }

  /* ---------- Validation des comptes (réservé à Mariame) ---------- */
  var ADMIN = "3960f8a9-876c-4d1c-bbfc-0578bb80cf5c";
  function isAdmin() { return !!(user && user.id === ADMIN); }
  var LBL = { en_attente: "⏳ En attente", accepte: "✅ Accepté", refuse: "⛔ Refusé" };
  async function adminBadge() {
    if (!isAdmin() || !sb) return;
    var n = 0, al = 0, today = new Date().toISOString().slice(0, 10);
    try { var r = await sb.from("medij_access").select("user_id", { count: "exact", head: true }).eq("statut", "en_attente"); n = r.count || 0; } catch (e) {}
    try { var r2 = await sb.from("medij_ia_alertes").select("id", { count: "exact", head: true }).eq("jour", today); al = r2.count || 0; } catch (e) {}
    var av = 0; try { var r3 = await sb.from("medij_avis").select("id", { count: "exact", head: true }).eq("lu", false); av = r3.count || 0; } catch (e) {}
    var b = document.getElementById("mjc-adm");

    if (!b) { b = el('<button id="mjc-adm" type="button"></button>'); b.onclick = adminBox; document.body.appendChild(b); }
    b.style.background = al ? "#b5533f" : "#3f8a62";
    b.textContent = "👑 Gestion" + ([al ? " · ⚠️ Limite IA" : "", n ? " · " + n + " à valider" : "", av ? " · 💬 " + av + " avis" : ""].join(""));
    if (!al && !n && !av) b.style.background = "#c2577a";
  }
  async function adminBox() {
    var o = box("<h2>👑 Gestion de MédiJ</h2><p>Chargement…</p>");
    var r = await sb.from("medij_access").select("user_id,email,statut,created_at,expire_le,pro").order("created_at", { ascending: false });
    if (r.error) { msg(o, "Erreur : " + r.error.message, true); return; }
    var rows = (r.data || []).filter(function (x) { return x.user_id !== ADMIN; });
    rows.sort(function (a, b) { return (a.statut === "en_attente" ? 0 : 1) - (b.statut === "en_attente" ? 0 : 1); });
    var pend = rows.filter(function (x) { return x.statut === "en_attente"; }).length;
    var esc2 = function (t) { return String(t || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var today = new Date().toISOString().slice(0, 10), ia = "";
    try {
      var us = await sb.from("medij_ia_usage").select("n").eq("jour", today);
      var tot = (us.data || []).reduce(function (t, x) { return t + (x.n || 0); }, 0);
      var al = await sb.from("medij_ia_alertes").select("type,email,created_at").eq("jour", today).order("created_at", { ascending: false });
      var A = al.data || [], G = A.filter(function (x) { return x.type === "limite_google"; }), U = A.filter(function (x) { return x.type === "limite_utilisateur"; });
      ia = '<div style="border-radius:14px;padding:10px 12px;text-align:left;background:' + (A.length ? "#fbe7e0" : "#e3f3ea") + ';color:#3a1f2b"><strong>🤖 IA aujourd\'hui : ' + tot + " demande" + (tot > 1 ? "s" : "") + "</strong>" +
        (G.length ? "<br>⚠️ <strong>Limite gratuite de Google atteinte</strong> : l'IA est bloquée pour tout le monde jusqu'à ce que Google remette le compteur à zéro. Pour ne plus être bloquée, active la facturation sur aistudio.google.com." : "") +
        (U.length ? "<br>⚠️ Limite du jour atteinte par : " + U.map(function (x) { return esc2(x.email); }).join(", ") + ". Dis-moi si tu veux augmenter cette limite." : "") +
        (A.length ? "" : "<br>✅ Aucune limite atteinte.") + "</div>";
    } catch (e) {}
    var html = "<h2>👑 Gestion de MédiJ</h2>" + ia + "<p>" + (pend ? "<strong>" + pend + " compte" + (pend > 1 ? "s" : "") + " en attente.</strong> Vérifie le paiement sur Wave ou Orange Money avant d'accepter." : "Personne en attente pour l'instant.") + "</p>" +
      '<div style="display:flex;flex-direction:column;gap:8px;max-height:55vh;overflow:auto">' +
      (rows.length ? rows.map(function (x) {
        var d = new Date(x.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
        var btn = function (st, t, bg) { return '<button data-u="' + x.user_id + '" data-s="' + st + '" style="flex:1;border:0;border-radius:999px;padding:8px;font-weight:700;background:' + bg + ';color:#fff;cursor:pointer">' + t + "</button>"; };
        var exp = "";
        if (x.statut === "accepte") { if (!x.expire_le) exp = "<br>📅 Sans date de fin"; else { var jr = joursRestants(x.expire_le); exp = jr < 0 ? '<br><strong style="color:#b5533f">⌛ Expiré depuis le ' + frDate(x.expire_le) + "</strong>" : "<br>📅 Jusqu'au " + frDate(x.expire_le) + (jr <= 7 ? ' <strong style="color:#b5533f">(' + jr + " j)</strong>" : ""); } }
        return '<div style="border:1px solid #f2d9e1;border-radius:14px;padding:10px;text-align:left"><div style="font-weight:700;word-break:break-all">' + esc2(x.email) + '</div><div style="font-size:.82rem;opacity:.8">' + LBL[x.statut] + (PRO_ACTIF && x.pro ? " · ⭐ Pro" : "") + " · inscrit le " + d + exp + '</div><div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">' +
          (PRO_ACTIF && x.statut === "accepte" ? '<button data-pro="' + x.user_id + '" data-v="' + (x.pro ? "0" : "1") + '" style="flex:1;border:0;border-radius:999px;padding:8px;font-weight:700;background:' + (x.pro ? "#8a6b78" : "#d4a017") + ';color:#fff;cursor:pointer">' + (x.pro ? "Retirer Pro" : "⭐ Passer Pro") + "</button>" : "") +
          (x.statut === "accepte" ? '<button data-ext="' + x.user_id + '" data-exp="' + (x.expire_le || "") + '" style="flex:1;border:0;border-radius:999px;padding:8px;font-weight:700;background:#c2577a;color:#fff;cursor:pointer">➕ 1 semestre</button>' : "") +
          (x.statut !== "accepte" ? btn("accepte", "✅ Accepter", "#3f8a62") : "") +
          (x.statut !== "refuse" ? btn("refuse", "⛔ Refuser", "#b5533f") : "") +
          (x.statut !== "en_attente" ? btn("en_attente", "⏳ En attente", "#8a6b78") : "") + "</div></div>";
      }).join("") : "<p>Aucun autre compte pour l'instant.</p>") + "</div>" +
      '<button class="mjc-s" id="mjc-ax">Fermer</button>';
    o.querySelector("#mjc-b").innerHTML = html;
    o.querySelectorAll("button[data-u]").forEach(function (b) {
      b.onclick = async function () {
        this.disabled = true;
        var st = this.getAttribute("data-s"), upd = { statut: st };
        if (st === "accepte") { var cur = (rows.find(function (y) { return y.user_id === b.getAttribute("data-u"); }) || {}).expire_le; if (!cur || cur < ymdLocal()) upd.expire_le = plusSemestre(); }
        var u = await sb.from("medij_access").update(upd).eq("user_id", this.getAttribute("data-u"));
        if (u.error) { msg(o, "Erreur : " + u.error.message, true); this.disabled = false; return; }
        adminBadge(); adminBox();
      };
    });
    o.querySelectorAll("button[data-pro]").forEach(function (b) {
      b.onclick = async function () {
        this.disabled = true;
        var u = await sb.from("medij_access").update({ pro: this.getAttribute("data-v") === "1" }).eq("user_id", this.getAttribute("data-pro"));
        if (u.error) { msg(o, "Erreur : " + u.error.message, true); this.disabled = false; return; }
        adminBox();
      };
    });
    o.querySelectorAll("button[data-ext]").forEach(function (b) {
      b.onclick = async function () {
        this.disabled = true; var cur = this.getAttribute("data-exp"), base = cur && cur > ymdLocal() ? cur : ymdLocal();
        var u = await sb.from("medij_access").update({ expire_le: plusSemestre(base) }).eq("user_id", this.getAttribute("data-ext"));
        if (u.error) { msg(o, "Erreur : " + u.error.message, true); this.disabled = false; return; }
        adminBox();
      };
    });
    try {
      var av = await sb.from("medij_avis").select("id,email,texte,lu,created_at").order("created_at", { ascending: false }).limit(50);
      var V = av.data || [];
      var sec = '<h2 style="font-size:1.1rem;margin-top:6px">💬 Avis et remarques' + (V.filter(function (x) { return !x.lu; }).length ? " · " + V.filter(function (x) { return !x.lu; }).length + " nouveau(x)" : "") + "</h2>" +
        (V.length ? V.map(function (x) {
          return '<div style="border:1px solid #f2d9e1;border-radius:14px;padding:10px;text-align:left;' + (x.lu ? "opacity:.6" : "background:#fdf0f4;color:#3a1f2b") + '"><div style="font-size:.8rem;opacity:.8">' + esc2(x.email || "") + " · " + new Date(x.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + '</div><div style="white-space:pre-wrap;margin-top:4px">' + esc2(x.texte) + "</div>" + (x.lu ? "" : '<button data-lu="' + x.id + '" style="margin-top:8px;border:0;border-radius:999px;padding:6px 12px;font-weight:700;background:#8a6b78;color:#fff;cursor:pointer">Marquer comme lu</button>') + "</div>";
        }).join("") : "<p>Aucun avis pour l'instant.</p>");
      var box2 = document.createElement("div"); box2.style.cssText = "display:flex;flex-direction:column;gap:8px;max-height:45vh;overflow:auto"; box2.innerHTML = sec;
      o.querySelector("#mjc-ax").before(box2);
      box2.querySelectorAll("button[data-lu]").forEach(function (b) { b.onclick = async function () { this.disabled = true; await sb.from("medij_avis").update({ lu: true }).eq("id", +this.getAttribute("data-lu")); adminBadge(); adminBox(); }; });
    } catch (e) {}
    o.querySelector("#mjc-ax").onclick = close;
  }
  function passwordBox() {
    var o = box('<h2>Nouveau mot de passe</h2><input id="mjc-w" type="password" autocomplete="new-password" placeholder="Nouveau mot de passe"><button class="mjc-p" id="mjc-go">Enregistrer</button>');
    o.querySelector("#mjc-go").onclick = async function () { var r = await sb.auth.updateUser({ password: o.querySelector("#mjc-w").value }); if (r.error) msg(o, FR(r.error), true); else close(); };
  }

  /* ---------- démarrage ---------- */
  if (!window.supabase || !window.supabase.createClient) { cloud.ready = Promise.resolve(); return; }
  sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  cloud.sb = sb; cloud.url = SB_URL; cloud.key = SB_KEY; cloud.allowed = function () { return allowed; }; cloud.expire = function () { return expireLe; }; cloud.pro = function () { return isPro || isAdmin(); }; cloud.waBtn = function (t) { return waBtn(t); };
  cloud.client = sb;
  var started = false;
  async function onUser(u) {
    user = u; pillWhenReady();
    if (!u) { setState("off"); return; }
    if (started) return; started = true;
    var statut = await access();
    if (statut === "erreur") { setState("error"); close(); return; } /* hors ligne : on laisse utiliser ce qui est sur l'appareil */
    if (statut !== "accepte") { allowed = false; setState("off"); gateBox(statut); return; }
    allowed = true; close(); setTimeout(rappelExpiration, 2500); if (isAdmin()) { adminBadge(); setInterval(adminBadge, 60000); if (/gestion/i.test(location.hash)) setTimeout(adminBox, 600); window.addEventListener("hashchange", function () { if (/gestion/i.test(location.hash)) adminBox(); }); }
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
