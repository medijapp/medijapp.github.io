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
    { ic: "⏱️", t: "6. Planning et Chrono", d: "<strong>Planning</strong> organise ta semaine de révision, <strong>Chrono</strong> chronomètre tes sessions de travail." },
    { ic: "📲", t: "7. Installe MédiJ", d: "Dans ton navigateur, choisis <strong>« Ajouter à l'écran d'accueil »</strong> (ou « Installer l'application ») : MédiJ s'ouvrira comme une vraie appli." },
    { ic: "🚀", t: "C'est parti !", d: "Commence par importer ton premier cours dans <strong>En classe</strong>. Tu peux revoir ce guide à tout moment dans <strong>Profil</strong>. Bonnes révisions !" }
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
