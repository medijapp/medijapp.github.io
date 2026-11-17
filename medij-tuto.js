/* MédiJ : tutoriel de bienvenue (affiché une seule fois, puis disponible dans Profil) */
(function () {
  var KEY = "medij-tuto-vu";
  var STEPS = [
    { ic: "👋", t: "Bienvenue sur MédiJ !", d: "En 1 minute, découvre comment MédiJ t'aide à réviser chaque jour sans te perdre." },
    { ic: "📥", t: "1. Importe tes cours", d: "Va dans <strong>En classe</strong> puis <strong>Importer un support</strong>. Ajoute ton cours : PDF, PowerPoint, Word ou photos." },
    { ic: "✨", t: "2. MédiJ prépare tout", d: "Appuie sur <strong>Créer la fiche, les flashcards et les QCM</strong> : MédiJ fait ta fiche de synthèse, tes flashcards et des QCM à partir de <strong>ton</strong> cours." },
    { ic: "📚", t: "3. Révise par matière", d: "Dans <strong>Matières</strong>, ouvre un chapitre et choisis : <strong>Fiche</strong>, <strong>Flashcards</strong> ou <strong>QCM</strong>. Tu peux aussi corriger ou ajouter tes propres cartes." },
    { ic: "📅", t: "4. La méthode des J", d: "Quand tu as appris un chapitre, MédiJ te le fait revoir à <strong>J1, J3, J7, J15 et J30</strong>. Chaque matin, l'onglet <strong>Aujourd'hui</strong> te dit quoi réviser." },
    { ic: "🎯", t: "5. Le défi du jour", d: "Sur <strong>Aujourd'hui</strong>, le bouton jaune lance 10 QCM tirés de tes cours. Fais-le chaque jour pour garder ta <strong>série 🔥</strong> et gagner des <strong>badges 🏅</strong>." },
    { ic: "🗓️", t: "6. Ton emploi du temps", d: "Va dans <strong>Planning</strong>, puis l'onglet <strong>Emploi du temps</strong>, et appuie sur <strong>Choisir un fichier</strong> : envoie une photo, une capture ou le PDF de ton emploi du temps. MédiJ trouve tes cours et organise tes révisions autour." },
    { ic: "⏱️", t: "7. Planning et Chrono", d: "<strong>Planning</strong> te montre ton programme du jour et de la semaine. <strong>Chrono</strong> chronomètre tes sessions de travail." },
    { ic: "📲", t: "8. Installe MédiJ", d: "Dans ton navigateur, choisis <strong>« Ajouter à l'écran d'accueil »</strong> (ou « Installer l'application ») : MédiJ s'ouvrira comme une vraie appli." },
    { ic: "🚀", t: "C'est parti !", d: "Commence par importer ton premier cours dans <strong>En classe</strong>. Sur chaque page, une astuce t'expliquera quoi faire. Et le bouton <strong>❓ Aide</strong> répond à tes questions. Bonnes révisions !" }
  ];
  var css = "#mt-o{position:fixed;inset:0;z-index:45;background:rgba(16,36,58,.72);display:flex;align-items:center;justify-content:center;padding:18px;font-family:system-ui,-apple-system,sans-serif}" +
    "#mt-b{background:#fff;color:#1f1a22;border-radius:24px;max-width:420px;width:100%;padding:26px 22px 20px;display:flex;flex-direction:column;gap:14px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.3)}" +
    "#mt-b .ic{font-size:3.2rem;line-height:1}#mt-b h2{margin:0;font-size:1.3rem}#mt-b p{margin:0;font-size:1rem;line-height:1.5;color:#3d3540}" +
    "#mt-dots{display:flex;gap:6px;justify-content:center}#mt-dots i{width:8px;height:8px;border-radius:50%;background:#e2dbe0}#mt-dots i.on{background:#1d6a58;width:22px;border-radius:99px}" +
    "#mt-nav{display:flex;gap:10px}#mt-nav button{flex:1;border:0;border-radius:999px;padding:12px;font-weight:800;font-size:15px;cursor:pointer}" +
    "#mt-next{background:#1d6a58;color:#fff}#mt-prev{background:#eef2f0;color:#1f1a22}#mt-skip{border:0;background:none;color:#6b5f66;font-size:.88rem;text-decoration:underline;cursor:pointer}" +
    "@media (prefers-color-scheme:dark){#mt-b{background:#211b27;color:#efe8ee}#mt-b p{color:#cfc4cc}#mt-prev{background:#3a3040;color:#efe8ee}#mt-dots i{background:#3a3040}}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var i = 0;
  function done() { try { localStorage.setItem(KEY, "1"); } catch (e) {} var o = document.getElementById("mt-o"); if (o) o.remove(); }
  function draw() {
    var s = STEPS[i], last = i === STEPS.length - 1;
    var o = document.getElementById("mt-o");
    if (!o) { o = document.createElement("div"); o.id = "mt-o"; document.body.appendChild(o); }
    o.innerHTML = '<div id="mt-b" role="dialog" aria-modal="true" aria-label="Guide de MédiJ">' +
      '<div class="ic" aria-hidden="true">' + s.ic + "</div><h2>" + s.t + "</h2><p>" + s.d + "</p>" +
      '<div id="mt-dots">' + STEPS.map(function (_, k) { return '<i class="' + (k === i ? "on" : "") + '"></i>'; }).join("") + "</div>" +
      '<div id="mt-nav">' + (i ? '<button id="mt-prev">Précédent</button>' : "") + '<button id="mt-next">' + (last ? "Commencer" : "Suivant") + "</button></div>" +
      (last ? "" : '<button id="mt-skip">Passer le guide</button>') + "</div>";
    var p = document.getElementById("mt-prev"); if (p) p.onclick = function () { i--; draw(); };
    document.getElementById("mt-next").onclick = function () { if (last) done(); else { i++; draw(); } };
    var k = document.getElementById("mt-skip"); if (k) k.onclick = done;
  }
  window.medijTuto = function () { i = 0; draw(); };

  /* première visite : attendre que le compte soit validé, le prénom choisi, et qu'aucune autre fenêtre ne soit ouverte */
  var tries = 0;
  function maybe() {
    tries++;
    var seen = false; try { seen = !!localStorage.getItem(KEY); } catch (e) {}
    if (seen) return;
    var cloud = window.__MEDIJ_CLOUD;
    var ok = (!cloud || !cloud.allowed || cloud.allowed()) && !!localStorage.getItem("medij-prenom");
    var busy = document.getElementById("mjc-o") || document.getElementById("dj-o") || document.querySelector("#overlay .sheet");
    if (ok && !busy) { window.medijTuto(); return; }
    if (tries < 120) setTimeout(maybe, 2000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(maybe, 1500); });
  else setTimeout(maybe, 1500);
})();


/* ---------- Astuces à la première visite de chaque page + page d'aide ---------- */
(function () {
  var WA = "https://wa.me/221781718876";
  var TIPS = {
    home: { t: "Aujourd'hui", d: "Ici, MédiJ te montre <strong>ce que tu dois réviser aujourd'hui</strong> (méthode des J et flashcards à revoir). Le bouton jaune lance ton <strong>défi du jour</strong>." },
    matieres: { t: "Matières", d: "Tous tes chapitres, rangés par matière. Ouvre un chapitre pour voir sa <strong>Fiche</strong>, ses <strong>Flashcards</strong> et ses <strong>QCM</strong>. <strong>+ Chapitre</strong> crée un chapitre vide à remplir toi-même. Pour importer un cours, va plutôt dans <strong>En classe</strong>." },
    classe: { t: "En classe : importer tes cours", d: "C'est ici que tu <strong>importes tes cours</strong> : appuie sur <strong>Importer un support</strong>, choisis ton fichier (PDF, PowerPoint, Word ou photos), indique la matière et le titre, puis appuie sur <strong>Créer la fiche, les flashcards et les QCM</strong>." },
    plan: { t: "Planning", d: "Ton programme de révision du jour et de la semaine. Un <strong>imprévu</strong> ? Écris-le dans <strong>Dis-moi ce qui change</strong> (ex. « imprévu demain de 14h à 16h »). Tes cours de la fac : onglet <strong>Emploi du temps</strong>. Tes habitudes : onglet <strong>Habitudes et réglages</strong>." },
    edt: { t: "Ton emploi du temps", d: "Appuie sur <strong>Choisir un fichier</strong> et envoie une <strong>photo, une capture ou le PDF</strong> de ton emploi du temps. Tu préfères l'écrire ? Tout en bas : <strong>+ Ajouter un cours à la main</strong>." },
    regles: { t: "Habitudes et imprévus", d: "Ajoute tes <strong>habitudes</strong> (sommeil, prière, sport…) et tes <strong>obligations</strong> (rendez-vous, imprévus avec une date) avec les boutons <strong>+ Ajouter … à la main</strong>. Ton programme de révision s'organise autour." },
    timer: { t: "Chrono", d: "Choisis un chapitre et lance le chronomètre pendant que tu révises. Ton temps de travail est compté dans tes statistiques." }
  };
  var FAQ = [
    ["📥 Comment importer un cours ?", "<strong>En classe</strong> → <strong>Importer un support</strong> → choisis ton fichier → indique la matière et le titre → <strong>Créer la fiche, les flashcards et les QCM</strong>."],
    ["📝 Comment créer une fiche moi-même ?", "<strong>Matières</strong> → <strong>+ Chapitre</strong>, puis dans le chapitre, l'onglet <strong>Modifier</strong> pour écrire ta fiche, ajouter des flashcards ou des QCM."],
    ["🗓️ Comment importer mon emploi du temps ?", "<strong>Planning</strong> → onglet <strong>Emploi du temps</strong> → <strong>Choisir un fichier</strong> (photo, capture ou PDF) → vérifie les cours trouvés → enregistre."],
    ["✍️ Écrire mon emploi du temps à la main ?", "<strong>Planning</strong> → onglet <strong>Emploi du temps</strong> → tout en bas, <strong>+ Ajouter un cours à la main</strong> : nom du cours, jour, CM/TD/TP, lieu, heure de début et de fin → <strong>Ajouter</strong>."],
    ["🔁 Ajouter mes habitudes (sommeil, prière, sport…) ?", "<strong>Planning</strong> → onglet <strong>Habitudes et réglages</strong> → partie <strong>Habitudes</strong> → <strong>+ Ajouter une habitude à la main</strong> : nom, jours de la semaine, heures → <strong>Ajouter</strong>."],
    ["⚡ Ajouter un imprévu ou un rendez-vous ?", "Le plus simple : en haut de <strong>Planning</strong>, dans <strong>Dis-moi ce qui change</strong>, écris par exemple « imprévu demain de 14h à 16h » puis <strong>OK</strong>. À la main : <strong>Habitudes et réglages</strong> → <strong>Obligations</strong> → <strong>+ Ajouter une obligation à la main</strong> (avec la date). Ton programme de révision se recalcule tout seul."],
    ["📅 C'est quoi la méthode des J ?", "Quand tu as appris un chapitre, coche-le comme appris : MédiJ te le fait revoir à <strong>J1, J3, J7, J15 et J30</strong>. Chaque jour, regarde l'onglet <strong>Aujourd'hui</strong>."],
    ["🎯 Comment marche le défi du jour ?", "Sur <strong>Aujourd'hui</strong>, le bouton jaune lance 10 QCM tirés de tes cours. Un défi par jour garde ta série 🔥 et débloque des badges 🏅."],
    ["🎓 Changer de filière ou de semestre ?", "Filière : dans <strong>Profil</strong>. Semestre : en haut de <strong>Matières</strong>, choisis la période (L1 · S1, L2 · S3…)."],
    ["📲 Installer MédiJ sur mon téléphone ?", "Android (Chrome) : menu <strong>⋮</strong> → <strong>Installer l'application</strong>. iPhone (Safari) : bouton <strong>Partager</strong> → <strong>Sur l'écran d'accueil</strong>."],
    ["🔑 J'ai oublié mon mot de passe", "Déconnecte-toi, écris ton e-mail, appuie sur <strong>Mot de passe oublié</strong>, puis ouvre le <strong>dernier</strong> e-mail reçu (regarde aussi dans les spams)."]
  ];
  var css = "#mh-tip{position:fixed;left:12px;right:12px;bottom:calc(86px + env(safe-area-inset-bottom,0px));z-index:30;max-width:520px;margin:0 auto;background:#10243a;color:#fff;border-radius:18px;padding:14px 16px;box-shadow:0 10px 30px rgba(0,0,0,.3);font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;gap:8px}" +
    "#mh-tip strong{color:#ffd95a}#mh-tip h3{margin:0;font-size:1rem}#mh-tip p{margin:0;font-size:.93rem;line-height:1.45}" +
    "#mh-tip .r{display:flex;gap:8px;justify-content:flex-end}#mh-tip button{border:0;border-radius:999px;padding:8px 14px;font-weight:800;cursor:pointer}" +
    "#mh-ok{background:#fff;color:#10243a}#mh-more{background:transparent;color:#fff;text-decoration:underline}" +
    "#mh-o{position:fixed;inset:0;z-index:46;background:rgba(16,36,58,.72);display:flex;align-items:flex-end;justify-content:center;font-family:system-ui,-apple-system,sans-serif}" +
    "#mh-b{background:#fff;color:#1f1a22;border-radius:24px 24px 0 0;max-width:560px;width:100%;max-height:85vh;overflow:auto;padding:20px 18px calc(20px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:10px}" +
    "#mh-b h2{margin:0 0 4px;font-size:1.25rem}#mh-b details{border:1px solid #ecd8d1;border-radius:14px;padding:10px 12px}#mh-b summary{font-weight:800;cursor:pointer}#mh-b details p{margin:8px 0 0;line-height:1.5}" +
    "#mh-b .bt{border:0;border-radius:999px;padding:12px;font-weight:800;cursor:pointer;text-align:center;text-decoration:none;display:block}#mh-wa{background:#1f9d55;color:#fff}#mh-x{background:#eef2f0;color:#1f1a22}" +
    "#mh-btn{position:fixed;top:calc(64px + env(safe-area-inset-top,0px));right:10px;z-index:20;border:0;border-radius:999px;padding:6px 11px;font:800 13px system-ui,sans-serif;background:#fff;color:#10243a;box-shadow:0 3px 10px rgba(0,0,0,.15);cursor:pointer}" +
    "@media (prefers-color-scheme:dark){#mh-b{background:#211b27;color:#efe8ee}#mh-b details{border-color:#3a3040}#mh-x{background:#3a3040;color:#efe8ee}#mh-btn{background:#211b27;color:#efe8ee}}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  function seen(k) { try { return !!localStorage.getItem("medij-astuce-" + k); } catch (e) { return true; } }
  function mark(k) { try { localStorage.setItem("medij-astuce-" + k, "1"); } catch (e) {} }

  window.medijAide = function () {
    var o = document.getElementById("mh-o"); if (o) o.remove();
    o = document.createElement("div"); o.id = "mh-o";
    o.innerHTML = '<div id="mh-b" role="dialog" aria-modal="true" aria-label="Aide"><h2>❓ Comment faire ?</h2>' +
      FAQ.map(function (f) { return "<details><summary>" + f[0] + "</summary><p>" + f[1] + "</p></details>"; }).join("") +
      '<button class="bt" id="mh-guide" style="background:#dbece5;color:#10243a">📖 Revoir le guide complet</button>' +
      '<a class="bt" id="mh-wa" target="_blank" rel="noopener" href="' + WA + '">💬 Poser une question à Mariame</a>' +
      '<button class="bt" id="mh-x">Fermer</button></div>';
    document.body.appendChild(o);
    o.addEventListener("click", function (e) { if (e.target === o) o.remove(); });
    document.getElementById("mh-x").onclick = function () { o.remove(); };
    document.getElementById("mh-guide").onclick = function () { o.remove(); window.medijTuto && window.medijTuto(); };
  };

  function current() {
    var pt = document.querySelector('button[data-act="pltab"][aria-selected="true"]');
    if (pt && (pt.getAttribute("data-t") === "edt" || pt.getAttribute("data-t") === "regles")) return pt.getAttribute("data-t");
    var b = document.querySelector('#tabbar button[aria-current="page"]');
    return b ? b.getAttribute("data-v") : null;
  }
  function blocked() {
    var cloud = window.__MEDIJ_CLOUD;
    if (cloud && cloud.allowed && !cloud.allowed()) return true;
    var g = false; try { g = !localStorage.getItem("medij-tuto-vu"); } catch (e) {}
    return g || document.getElementById("mt-o") || document.getElementById("mjc-o") || document.getElementById("dj-o") || document.getElementById("mh-o");
  }
  var shown = null;
  function check() {
    var k = current();
    var tip = document.getElementById("mh-tip");
    if (tip && shown !== k) { tip.remove(); tip = null; }
    if (!k || !TIPS[k] || seen(k) || blocked() || tip) return;
    shown = k;
    tip = document.createElement("div"); tip.id = "mh-tip"; tip.setAttribute("role", "status");
    tip.innerHTML = "<h3>💡 " + TIPS[k].t + "</h3><p>" + TIPS[k].d + '</p><div class="r"><button id="mh-more">Plus d\'aide</button><button id="mh-ok">Compris</button></div>';
    document.body.appendChild(tip);
    document.getElementById("mh-ok").onclick = function () { mark(k); tip.remove(); };
    document.getElementById("mh-more").onclick = function () { mark(k); tip.remove(); window.medijAide(); };
  }
  function helpBtn() {
    if (document.getElementById("mh-btn") || !document.getElementById("tabbar")) return;
    var b = document.createElement("button"); b.id = "mh-btn"; b.type = "button"; b.textContent = "❓ Aide"; b.setAttribute("aria-label", "Aide");
    b.onclick = window.medijAide; document.body.appendChild(b);
  }
  function start() {
    helpBtn();
    var tb = document.getElementById("tabbar");
    if (tb && window.MutationObserver) new MutationObserver(function () { setTimeout(check, 300); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-current", "aria-selected"] });
    setInterval(check, 2500); check();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(start, 1200); });
  else setTimeout(start, 1200);
})();
