/* MédiJ · Défi du jour, série et badges (inspiré de Jeu d'Hippocrate)
   Les questions viennent des QCM de TES cours : d'abord celles que tu as ratées,
   puis celles jamais vues, puis au hasard. Les résultats sont gardés dans
   « medij-defi-v1 » (synchronisé avec ton compte comme le reste). */
(function () {
  "use strict";
  var KEY = "medij-defi-v1", N = 10, L = "ABCDEFGH";
  var BADGES = [
    { id: "premier", ic: "🌱", t: "Premier défi", d: "Tu as fait ton premier défi du jour." },
    { id: "serie3", ic: "🔥", t: "3 jours d'affilée", d: "Défi fait 3 jours de suite." },
    { id: "serie7", ic: "🔥🔥", t: "1 semaine d'affilée", d: "Défi fait 7 jours de suite." },
    { id: "serie30", ic: "👑", t: "1 mois d'affilée", d: "Défi fait 30 jours de suite." },
    { id: "sansfaute", ic: "💯", t: "Sans faute", d: "Toutes les questions d'un défi justes." },
    { id: "rattrape10", ic: "🩹", t: "Erreurs corrigées", d: "10 questions déjà ratées, réussies dans un défi." },
    { id: "cent", ic: "🏅", t: "100 questions", d: "100 questions répondues dans les défis." },
    { id: "cinqcents", ic: "🏆", t: "500 questions", d: "500 questions répondues dans les défis." }
  ];
  var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var ymd = function (d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  var yest = function () { var d = new Date(); d.setDate(d.getDate() - 1); return ymd(d); };
  var MEM = null;
  function load() { if (MEM) return JSON.parse(JSON.stringify(MEM)); try { return JSON.parse(localStorage.getItem(KEY) || "null") || {}; } catch (e) { return {}; } }
  function save(s) { MEM = JSON.parse(JSON.stringify(s)); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} db().then(function (d) { if (d) d.doc("meta/defi").set(s); }).catch(function () {}); }
  async function pullState() { try { var d = await db(); if (!d) return; var r = await d.doc("meta/defi").get(); if (r && r.exists) { var x = r.data(); var loc = load(); if ((x.total || 0) >= (loc.total || 0)) { MEM = x; try { localStorage.setItem(KEY, JSON.stringify(x)); } catch (e) {} } } } catch (e) {} button(); }
  function st() { var s = load(); s.days = s.days || {}; s.badges = s.badges || []; s.total = s.total || 0; s.fixed = s.fixed || 0; s.streak = s.streak || 0; s.best = s.best || 0; s.last = s.last || ""; return s; }
  function streakNow(s) { return (s.last === ymd() || s.last === yest()) ? s.streak : 0; }

  async function db() { return window.claude && window.claude.use ? await window.claude.use("db") : null; }
  async function allQuestions() {
    var d = await db(); if (!d) return [];
    var c = d.collection("decks"); var snap = await (c.limit ? c.limit(1000) : c).get(), out = [];
    snap.docs.forEach(function (doc) {
      var k = doc.data(); if (!k || k.example) return;
      (k.qcm || []).forEach(function (q) {
        if (!q || !q.options || !q.correct || !q.correct.length) return;
        out.push({ deckId: doc.id, deck: k.name || "", mat: k.matiere || "", q: q });
      });
    });
    return out;
  }
  function pick(all) {
    var shuffle = function (a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    var missed = shuffle(all.filter(function (x) { return (x.q.errs || 0) > 0 && (x.q.okSince || 0) < 2; }));
    var fresh = shuffle(all.filter(function (x) { return !(x.q.errs > 0) && !(x.q.okSince > 0); }));
    var rest = shuffle(all.filter(function (x) { return missed.indexOf(x) < 0 && fresh.indexOf(x) < 0; }));
    var take = missed.slice(0, 5); /* au plus la moitié en erreurs à corriger */
    fresh.concat(rest, missed.slice(5)).forEach(function (x) { if (take.length < N) take.push(x); });
    return shuffle(take);
  }
  async function grade(item, ok) {
    try {
      var d = await db(); if (!d) return;
      var ref = d.doc("decks/" + item.deckId), snap = await ref.get(); if (!snap.exists) return;
      var deck = snap.data(), q = (deck.qcm || []).find(function (x) { return x.id === item.q.id; }); if (!q) return;
      if (ok) { q.okSince = (q.okSince || 0) + 1; } else { q.errs = (q.errs || 0) + 1; q.lastErr = ymd(); q.okSince = 0; }
      await ref.set(deck);
    } catch (e) {}
  }

  /* ---------- interface ---------- */
  var css = "#dj-btn{position:fixed;left:max(14px,env(safe-area-inset-left,0px));bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:7;border:0;border-radius:999px;padding:11px 16px;font:800 14px system-ui,sans-serif;background:#f7c3d3;color:#5a2338;box-shadow:0 6px 20px rgba(0,0,0,.2)}" +
    "#dj-btn.done{background:#e3f0e5;color:#2b5d3b}" +
    "#dj-o{position:fixed;inset:0;z-index:40;background:rgba(74,26,44,.6);display:flex;align-items:flex-end;justify-content:center;font-family:system-ui,-apple-system,sans-serif}" +
    "#dj-b{background:#fff;color:#1f2430;border-radius:22px 22px 0 0;max-width:560px;width:100%;max-height:92vh;overflow:auto;padding:18px 18px calc(18px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:12px}" +
    "@media(min-width:600px){#dj-o{align-items:center}#dj-b{border-radius:22px}}" +
    "#dj-b h2{margin:0;font-size:1.3rem}#dj-b p{margin:0;line-height:1.45}.dj-mu{color:#6b7280;font-size:.88rem}" +
    ".dj-bar{height:8px;border-radius:99px;background:#f8e6ec;overflow:hidden}.dj-bar i{display:block;height:100%;background:#e88aa6}" +
    ".dj-pill{align-self:flex-start;border-radius:99px;padding:4px 11px;font-size:.85rem;font-weight:700;background:#fdeef3;color:#8e3a56}.dj-pill.w{background:#fbe6df;color:#b5533f}" +
    ".dj-opt{display:flex;gap:10px;align-items:flex-start;text-align:left;width:100%;padding:11px 12px;border:1.5px solid #f2d9e1;border-radius:14px;background:#fff;font:inherit;color:inherit;cursor:pointer}" +
    ".dj-opt b{flex:none;width:24px;height:24px;border-radius:7px;border:1px solid #e8c3d0;display:grid;place-items:center;font-size:.8rem}" +
    ".dj-opt.on{border-color:#b4506f}.dj-opt.on b{background:#b4506f;color:#fff}.dj-opt.ok{border-color:#2e8b57;background:#e8f6ee}.dj-opt.ko{border-color:#c0392b;background:#fbeaea}" +
    ".dj-go{border:0;border-radius:999px;padding:13px;font:800 15px system-ui,sans-serif;background:#b4506f;color:#fff;cursor:pointer}.dj-go:disabled{opacity:.4;cursor:default}" +
    ".dj-s{border:0;border-radius:999px;padding:11px;font:700 14px system-ui,sans-serif;background:#fbeef2;color:#b4506f;cursor:pointer}" +
    ".dj-ex{border-left:4px solid #e88aa6;background:#fdf0f4;border-radius:0 12px 12px 0;padding:10px 12px;font-size:.93rem}" +
    ".dj-big{font-size:3rem;font-weight:900;text-align:center;line-height:1}.dj-row{display:flex;gap:8px;flex-wrap:wrap}" +
    ".dj-bd{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}.dj-bd div{border-radius:14px;padding:10px;background:#fdf3f6;font-size:.85rem}.dj-bd div.off{opacity:.38;filter:grayscale(1)}.dj-bd strong{display:block}";
  function el(h) { var d = document.createElement("div"); d.innerHTML = h; return d.firstElementChild; }
  function close() { var o = document.getElementById("dj-o"); if (o) o.remove(); button(); }
  function sheet(inner) { var o = document.getElementById("dj-o"); if (!o) { o = el('<div id="dj-o"><div id="dj-b"></div></div>'); document.body.appendChild(o); o.addEventListener("click", function (e) { if (e.target === o) close(); }); } o.firstChild.innerHTML = inner; o.firstChild.scrollTop = 0; return o.firstChild; }
  function button() {
    var b = document.getElementById("dj-btn"); if (!b) { b = el('<button id="dj-btn" type="button"></button>'); b.onclick = home; document.body.appendChild(b); }
    var s = st(), done = !!s.days[ymd()], k = streakNow(s);
    var onHome = function () { var h = document.querySelector('#tabbar button[data-v="home"]'); return !h || h.getAttribute("aria-current") === "page"; };
    b.style.display = onHome() ? "" : "none";
    if (!b._obs) { var tb = document.getElementById("tabbar"); if (tb && window.MutationObserver) { b._obs = new MutationObserver(function () { b.style.display = onHome() ? "" : "none"; }); b._obs.observe(tb, { childList: true, subtree: true, attributes: true }); } }
    b.className = done ? "done" : ""; b.textContent = done ? "✅ Défi fait" + (k ? " · 🔥 " + k : "") : "🎯 Défi du jour" + (k ? " · 🔥 " + k : "");
  }
  function badgesHtml(s) {
    return '<div class="dj-bd">' + BADGES.map(function (b) { var on = s.badges.indexOf(b.id) >= 0; return '<div class="' + (on ? "" : "off") + '"><strong>' + b.ic + " " + esc(b.t) + "</strong>" + esc(b.d) + "</div>"; }).join("") + "</div>";
  }
  function home() {
    var s = st(), today = s.days[ymd()], k = streakNow(s);
    var box = sheet("<h2>🎯 Défi du jour</h2>" +
      "<p>" + N + " QCM tirés <strong>de tes cours</strong> : d'abord ceux que tu as ratés, puis ceux que tu n'as jamais faits.</p>" +
      '<div class="dj-row"><span class="dj-pill">🔥 Série : ' + k + " jour" + (k > 1 ? "s" : "") + '</span><span class="dj-pill">⭐ Record : ' + s.best + '</span><span class="dj-pill">✍️ ' + s.total + " questions</span></div>" +
      (today ? '<p class="dj-mu">Défi d\'aujourd\'hui fait : <strong>' + today.score + " / " + today.n + "</strong>. Reviens demain pour garder ta série ! Tu peux t'entraîner encore, sans changer ton score du jour.</p>" : "") +
      '<button class="dj-go" id="dj-start">' + (today ? "S'entraîner encore" : "Commencer le défi") + "</button>" +
      "<h2 style=\"font-size:1.05rem;margin-top:6px\">🏅 Mes badges</h2>" + badgesHtml(s) +
      '<button class="dj-s" id="dj-x">Fermer</button>');
    box.querySelector("#dj-x").onclick = close;
    box.querySelector("#dj-start").onclick = function () { start(!!today); };
  }
  async function start(practice) {
    sheet("<h2>🎯 Défi du jour</h2><p class=\"dj-mu\">Je prépare tes questions…</p>");
    var all = []; try { all = await allQuestions(); } catch (e) {}
    if (all.length < 3) {
      var b = sheet("<h2>🎯 Défi du jour</h2><p>Il faut d'abord des <strong>QCM dans tes cours</strong>. Ajoute un cours (onglet Matières) et laisse MédiJ créer ses QCM, puis reviens ici.</p><button class=\"dj-s\" id=\"dj-x\">Fermer</button>");
      b.querySelector("#dj-x").onclick = close; return;
    }
    var run = { items: pick(all), i: 0, score: 0, fixed: 0, practice: practice };
    ask(run);
  }
  function ask(run) {
    var it = run.items[run.i], q = it.q, sel = [], checked = false, need = q.correct.length;
    function draw() {
      var got = sel.length;
      var box = sheet('<div class="dj-row" style="justify-content:space-between;align-items:center"><strong>Question ' + (run.i + 1) + " / " + run.items.length + '</strong><span class="dj-mu">' + esc(it.mat) + (it.deck ? " · " + esc(it.deck) : "") + "</span></div>" +
        '<div class="dj-bar"><i style="width:' + Math.round(run.i / run.items.length * 100) + '%"></i></div>' +
        ((q.errs || 0) > 0 ? '<span class="dj-pill w">🩹 Déjà ratée ' + q.errs + " fois</span>" : "") +
        "<p style=\"font-weight:700;font-size:1.05rem\">" + esc(String(q.q || "").replace(/^\[QCM du prof\]\s*/, "")) + "</p>" +
        '<span class="dj-pill' + (!checked && got !== need ? " w" : "") + '">🎯 ' + need + " réponse" + (need > 1 ? "s" : "") + " attendue" + (need > 1 ? "s" : "") + " · " + got + " cochée" + (got > 1 ? "s" : "") + "</span>" +
        q.options.map(function (o, k) {
          var c = "dj-opt" + (sel.indexOf(k) >= 0 ? " on" : "");
          if (checked) { if (q.correct.indexOf(k) >= 0) c += " ok"; else if (sel.indexOf(k) >= 0) c += " ko"; }
          var miss = checked && q.correct.indexOf(k) >= 0 && sel.indexOf(k) < 0;
          return '<button class="' + c + '" data-k="' + k + '"' + (checked ? " disabled" : "") + "><b>" + L[k] + "</b><span>" + esc(o) + (miss ? ' <strong style="color:#b5533f">← oubliée</strong>' : "") + "</span></button>";
        }).join("") +
        (checked ? '<div class="dj-ex"><strong>' + (run.lastOk ? "✅ Juste !" : "❌ Réponse : " + q.correct.map(function (k) { return L[k]; }).join(", ")) + "</strong>" + (q.expl ? "<div>" + esc(q.expl) + "</div>" : "") + "</div>" +
          '<button class="dj-go" id="dj-n">' + (run.i + 1 < run.items.length ? "Question suivante" : "Voir mon résultat") + "</button>"
          : '<button class="dj-go" id="dj-v"' + (got === need ? "" : " disabled") + ">" + (got === need ? "Valider" : got < need ? "Coche encore " + (need - got) : "Tu as coché " + (got - need) + " de trop") + "</button>") +
        '<button class="dj-s" id="dj-q">Arrêter</button>');
      box.querySelectorAll(".dj-opt").forEach(function (b) { b.onclick = function () { var k = +b.dataset.k; var i = sel.indexOf(k); if (i >= 0) sel.splice(i, 1); else sel.push(k); draw(); }; });
      var v = box.querySelector("#dj-v"); if (v) v.onclick = function () {
        var ok = sel.slice().sort().join() === q.correct.slice().sort().join();
        run.lastOk = ok; if (ok) { run.score++; if ((q.errs || 0) > 0) run.fixed++; }
        checked = true; grade(it, ok); draw();
      };
      var n = box.querySelector("#dj-n"); if (n) n.onclick = function () { run.i++; if (run.i < run.items.length) ask(run); else finish(run); };
      box.querySelector("#dj-q").onclick = close;
    }
    draw();
  }
  function finish(run) {
    var s = st(), n = run.items.length, newB = [];
    s.total += n; s.fixed += run.fixed;
    if (!run.practice) {
      var t = ymd();
      if (!s.days[t]) { s.streak = (s.last === yest()) ? s.streak + 1 : (s.last === t ? s.streak : 1); s.last = t; s.best = Math.max(s.best, s.streak); }
      s.days[t] = { score: run.score, n: n };
      var keys = Object.keys(s.days).sort(); if (keys.length > 120) keys.slice(0, keys.length - 120).forEach(function (k) { delete s.days[k]; });
    }
    var give = function (id, cond) { if (cond && s.badges.indexOf(id) < 0) { s.badges.push(id); newB.push(id); } };
    give("premier", true); give("serie3", s.streak >= 3); give("serie7", s.streak >= 7); give("serie30", s.streak >= 30);
    give("sansfaute", n >= 5 && run.score === n); give("rattrape10", s.fixed >= 10); give("cent", s.total >= 100); give("cinqcents", s.total >= 500);
    save(s);
    var pct = Math.round(run.score / n * 100);
    var box = sheet("<h2>" + (pct >= 80 ? "🎉 Bravo !" : pct >= 50 ? "👍 Bien joué" : "💪 On continue") + "</h2>" +
      '<div class="dj-big">' + run.score + " / " + n + "</div>" +
      (run.practice ? '<p class="dj-mu" style="text-align:center">Entraînement : ton score du jour ne change pas.</p>' : '<p style="text-align:center">🔥 Série : <strong>' + s.streak + " jour" + (s.streak > 1 ? "s" : "") + "</strong> · ⭐ Record : " + s.best + "</p>") +
      (run.fixed ? '<p style="text-align:center">🩹 ' + run.fixed + " erreur" + (run.fixed > 1 ? "s" : "") + " d'avant corrigée" + (run.fixed > 1 ? "s" : "") + " !</p>" : "") +
      (newB.length ? "<h2 style=\"font-size:1.05rem\">Nouveau" + (newB.length > 1 ? "x" : "") + " badge" + (newB.length > 1 ? "s" : "") + " 🏅</h2>" + '<div class="dj-bd">' + BADGES.filter(function (b) { return newB.indexOf(b.id) >= 0; }).map(function (b) { return "<div><strong>" + b.ic + " " + esc(b.t) + "</strong>" + esc(b.d) + "</div>"; }).join("") + "</div>" : "") +
      '<p class="dj-mu">Les questions ratées reviennent dans tes prochains défis jusqu\'à ce que tu les réussisses 2 fois.</p>' +
      '<button class="dj-go" id="dj-x">Terminer</button>');
    box.querySelector("#dj-x").onclick = close;
  }
  function boot() { var stl = document.createElement("style"); stl.textContent = css; document.head.appendChild(stl); button(); setTimeout(pullState, 1500); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.__MEDIJ_DEFI = { open: home };
})();
