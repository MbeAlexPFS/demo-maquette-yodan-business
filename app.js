/*
 * Maquette interactive YODAN — refonte UX (v2).
 * Toutes les données sont fictives (noms « Démo / Test / Fictif », N° « DEMO-… »).
 * Aucun appel réseau : tout est simulé dans le navigateur.
 */
"use strict";

/* =====================================================================
 * Outils
 * ===================================================================== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const TODAY = "2026-11-07";
const D = (ymd) => new Date(`${ymd}T12:00:00`);
const ymdOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (ymd, n) => { const d = D(ymd); d.setDate(d.getDate() + n); return ymdOf(d); };
const addMonths = (ymd, n) => { const d = D(ymd); d.setMonth(d.getMonth() + n); return ymdOf(d); };
const diffDays = (a, b) => Math.round((D(b) - D(a)) / 864e5);
const monday = (ymd) => addDays(ymd, -((D(ymd).getDay() + 6) % 7));
const fmt = (ymd) => D(ymd).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const fmtLong = (ymd) => D(ymd).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const daysAgo = (ymd) => diffDays(ymd, TODAY);
const rel = (ymd) => { const n = daysAgo(ymd); return n === 0 ? "aujourd'hui" : n === 1 ? "hier" : n > 1 ? `il y a ${n} j` : `dans ${-n} j`; };
const token = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const short = (agency) => agency.replace("Agence ", "");

function bind(root, handlers) {
  $$("[data-act]", root).forEach((el) => {
    const fn = handlers[el.dataset.act];
    if (fn) el.addEventListener(el.dataset.ev || "click", (e) => fn(el, e));
  });
}
function segmented(root, onChange) {
  $$("[data-seg]", root).forEach((group) => {
    $$("button", group).forEach((b) => b.addEventListener("click", () => {
      $$("button", group).forEach((x) => x.classList.toggle("on", x === b));
      onChange(group.dataset.seg, b.dataset.v);
    }));
  });
}
function toast(msg, undo) {
  const el = h(`<div class="toast"><span>${msg}</span>${undo ? "<button type='button'>Annuler</button>" : ""}</div>`);
  $("#toast").append(el);
  const timer = setTimeout(() => el.remove(), undo ? 6000 : 3200);
  if (undo) el.querySelector("button").addEventListener("click", () => { clearTimeout(timer); el.remove(); undo(); });
}
/** Panneau latéral : dans le cadre du téléphone en mode mobile, sur la page sinon. */
function drawer(title, html, mount) {
  const back = h(`<div class="drawer-back"><div class="drawer" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="drawer-head"><h2>${esc(title)}</h2><button type="button" class="x" aria-label="Fermer">×</button></div>
    <div class="drawer-body"></div></div></div>`);
  const body = $(".drawer-body", back);
  body.innerHTML = html || "";
  const close = () => { back.remove(); document.removeEventListener("keydown", onEsc); };
  const onEsc = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onEsc);
  back.addEventListener("click", (e) => { if (e.target === back) close(); });
  $(".x", back).addEventListener("click", close);
  ($("#stage .phone") || document.body).append(back);
  mount?.(body, close);
  return { body, close };
}
function stepperHtml(labels, i) {
  return `<div class="stepper">${labels.map((l, k) => `<div class="${k < i ? "done" : k === i ? "on" : ""}"><div class="bar"></div><div class="lbl">${k + 1}. ${esc(l)}</div></div>`).join("")}</div>`;
}
/** Assistant générique : chaque étape fournit html(data) et bind(root, api). */
function runWizard(container, steps, data, onFinish) { runWizardFrom(container, steps, data, 0, onFinish); }
function runWizardFrom(container, steps, data, start, onFinish) {
  let i = start;
  const draw = () => {
    const s = steps[i];
    container.innerHTML = stepperHtml(steps.map((x) => x.label), i) + `<div class="wz-body">${s.html(data)}</div>`;
    const api = {
      data,
      next: () => { if (i < steps.length - 1) { i++; draw(); } else { onFinish?.(data); } },
      back: () => { if (i > 0) { i--; draw(); } },
      redraw: draw,
    };
    bind(container, { next: () => api.next(), back: () => api.back() });
    s.bind?.(container, api);
    $("input:not([readonly]):not([type=checkbox]), select", $(".wz-body", container))?.focus();
  };
  draw();
}
function fakeQr(seed = 7) {
  let x = seed, cells = "";
  for (let r = 0; r < 25; r++) for (let c = 0; c < 25; c++) {
    const finder = (r < 7 && c < 7) || (r < 7 && c > 17) || (r > 17 && c < 7);
    const ring = finder && ((r % 18 === 0 || r % 18 === 6 || c % 18 === 0 || c % 18 === 6) || ((r % 18) >= 2 && (r % 18) <= 4 && (c % 18) >= 2 && (c % 18) <= 4));
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    cells += (finder ? ring : (x >> 8) % 2) ? "<i></i>" : "<b></b>";
  }
  return `<div class="qr" aria-label="QR code fictif">${cells}</div>`;
}

/* ---------- Filtre de dates optionnel (Du → Au) pour les listes ---------- */
const ranges = {};
function rangeHtml(key) {
  const r = ranges[key] || {};
  if (r.open) {
    return `<span class="range"><input type="date" data-range="${key}" data-k="from" value="${r.from || ""}" aria-label="Du"> → <input type="date" data-range="${key}" data-k="to" value="${r.to || ""}" aria-label="Au"><button type="button" class="btn btn-ghost btn-sm" data-range-clear="${key}">Effacer</button></span>`;
  }
  return r.from || r.to
    ? `<span class="chip">📅 ${r.from ? fmt(r.from) : "…"} → ${r.to ? fmt(r.to) : "…"} <button type="button" data-range-clear="${key}" aria-label="Retirer la période">×</button></span>`
    : `<button type="button" class="btn btn-sm" data-range-open="${key}">📅 Période</button>`;
}
function bindRange(root, key, redraw) {
  $$(`[data-range-open="${key}"]`, root).forEach((b) => b.addEventListener("click", () => { ranges[key] = { ...(ranges[key] || {}), open: true }; redraw(); }));
  $$(`[data-range-clear="${key}"]`, root).forEach((b) => b.addEventListener("click", () => { ranges[key] = {}; redraw(); }));
  $$(`[data-range="${key}"]`, root).forEach((input) => input.addEventListener("change", () => {
    ranges[key] = { ...(ranges[key] || {}), [input.dataset.k]: input.value };
    if (ranges[key].from && ranges[key].to) ranges[key].open = false;
    redraw();
  }));
}
const inRange = (key, ymd) => { const r = ranges[key] || {}; return (!r.from || ymd >= r.from) && (!r.to || ymd <= r.to); };

/* ---------- Pagination des listes : 10, 20, 50 ou « Tout » ---------- */
const PAGE_SIZES = [10, 20, 50, "all"];
const pagers = {};
/** Taille choisie mémorisée par liste, sur ce navigateur seulement (simple confort). */
function savedSize(key) {
  try { const v = localStorage.getItem(`pager:${key}`); return v === "all" ? "all" : PAGE_SIZES.includes(+v) ? +v : 10; } catch { return 10; }
}
function saveSize(key, size) { try { localStorage.setItem(`pager:${key}`, String(size)); } catch { /* stockage indisponible : on garde la taille pour la session */ } }
const resetPage = (key) => { if (pagers[key]) pagers[key].page = 1; };
/** Découpe `rows` pour la page courante ; renvoie les lignes et le pied de liste. */
function paginate(key, rows) {
  const p = (pagers[key] ||= { size: savedSize(key), page: 1 });
  const size = p.size === "all" ? Math.max(1, rows.length) : p.size;
  const pages = Math.max(1, Math.ceil(rows.length / size));
  p.page = Math.min(Math.max(1, p.page), pages);
  const from = (p.page - 1) * size;
  const slice = rows.slice(from, from + size);
  return { rows: slice, html: pagerHtml(key, rows.length, from, slice.length, pages) };
}
function pageNumbers(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = [...new Set([1, page - 1, page, page + 1, pages].filter((n) => n >= 1 && n <= pages))].sort((a, b) => a - b);
  return set.flatMap((n, i) => (i && n - set[i - 1] > 1 ? ["…", n] : [n]));
}
function pagerHtml(key, total, from, count, pages) {
  if (total <= PAGE_SIZES[0]) return total ? `<div class="pager"><span class="muted small">${total} élément${total > 1 ? "s" : ""}</span></div>` : "";
  const p = pagers[key];
  return `<div class="pager" data-pager="${key}">
    <span class="muted small">${from + 1}–${from + count} sur ${total}</span>
    ${pages > 1 ? `<nav class="pager-pages" aria-label="Pages">
      <button type="button" data-page="${p.page - 1}" ${p.page === 1 ? "disabled" : ""} aria-label="Page précédente">‹</button>
      ${isMobile() ? `<span class="small">${p.page} / ${pages}</span>` : pageNumbers(p.page, pages).map((n) => (n === "…" ? '<span class="muted">…</span>' : `<button type="button" data-page="${n}" class="${n === p.page ? "on" : ""}" ${n === p.page ? 'aria-current="page"' : ""}>${n}</button>`)).join("")}
      <button type="button" data-page="${p.page + 1}" ${p.page === pages ? "disabled" : ""} aria-label="Page suivante">›</button>
    </nav>` : ""}
    <span class="pager-size"><span class="muted small">Afficher</span><span class="segmented">${PAGE_SIZES.map((s) => `<button type="button" data-size="${s}" class="${p.size === s ? "on" : ""}">${s === "all" ? "Tout" : s}</button>`).join("")}</span></span>
  </div>`;
}
function bindPager(root, key, redraw) {
  const el = $(`[data-pager="${key}"]`, root);
  if (!el) return;
  $$("[data-page]", el).forEach((b) => b.addEventListener("click", () => { pagers[key].page = +b.dataset.page; redraw(); $(`[data-pager="${key}"]`, root)?.closest(".card")?.scrollIntoView({ block: "nearest" }); }));
  $$("[data-size]", el).forEach((b) => b.addEventListener("click", () => {
    const size = b.dataset.size === "all" ? "all" : +b.dataset.size;
    Object.assign(pagers[key], { size, page: 1 });
    saveSize(key, size);
    redraw();
  }));
}

/* ---------- Liste dynamique : recherche + pagination ---------- */
const searches = {};
const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
/**
 * Barre de recherche + résultats paginés. Seule la zone des résultats est redessinée,
 * le champ de recherche garde donc le focus pendant la frappe.
 * cfg : { key, rows(), text(row), render(rows), placeholder, tools, empty, bind(res, draw), onTools(toolsEl, draw) }
 */
function listBlock(box, cfg) {
  box.innerHTML = `<div class="toolbar list-tools"><input type="search" class="grow" data-lb-q placeholder="${esc(cfg.placeholder || "Rechercher…")}" aria-label="${esc(cfg.placeholder || "Rechercher")}" value="${esc(searches[cfg.key] || "")}">${cfg.tools || ""}</div><div data-lb-res></div>`;
  const res = $("[data-lb-res]", box);
  const draw = () => {
    const q = norm(searches[cfg.key]).trim();
    const all = cfg.rows().filter((r) => !q || norm(cfg.text(r)).includes(q));
    const page = paginate(cfg.key, all);
    res.innerHTML = all.length ? cfg.render(page.rows) + page.html : `<div class="empty">${q ? `Aucun résultat pour « ${esc(searches[cfg.key])} ».` : cfg.empty || "Rien à afficher."}</div>`;
    bindPager(res, cfg.key, draw);
    cfg.bind?.(res, draw);
  };
  $("[data-lb-q]", box).addEventListener("input", (e) => { searches[cfg.key] = e.target.value; resetPage(cfg.key); draw(); });
  cfg.onTools?.($(".list-tools", box), () => { resetPage(cfg.key); draw(); });
  draw();
  return draw;
}

/* ---------- Blocs déroulables : un seul ouvert par groupe, état gardé entre deux rendus ---------- */
const accOpen = {};
/** Un bloc : icône, titre, résumé de l'état actuel (visible fermé), action rapide facultative. */
function acc(group, id, { ico = "", title, meta = "", body, action = "", sub = false }) {
  return `<details class="acc ${sub ? "sub" : ""}" data-acc="${group}" data-id="${id}" ${accOpen[group] === id ? "open" : ""}>
    <summary>${ico ? `<span class="acc-ico" aria-hidden="true">${ico}</span>` : ""}<span class="acc-txt"><span class="acc-title">${title}</span>${meta ? `<span class="acc-meta">${meta}</span>` : ""}</span>${action ? `<span class="acc-act">${action}</span>` : ""}<span class="acc-chev" aria-hidden="true">›</span></summary>
    <div class="acc-body">${body}</div></details>`;
}
function bindAcc(root) {
  $$("details.acc", root).forEach((d) => d.addEventListener("toggle", () => {
    const g = d.dataset.acc;
    if (d.open) {
      accOpen[g] = d.dataset.id;
      $$(`details.acc[data-acc="${g}"]`, root).forEach((o) => { if (o !== d) o.open = false; });
    } else if (accOpen[g] === d.dataset.id) {
      accOpen[g] = null;
    }
  }));
  // Une action dans l'en-tête (ex. « + Ajouter ») ne doit pas replier le bloc.
  $$("details.acc > summary [data-act]", root).forEach((el) => el.addEventListener("click", (e) => e.preventDefault()));
}

/* =====================================================================
 * Données fictives
 * ===================================================================== */
const AGENCIES = ["Agence Plateau", "Agence Yopougon", "Agence Bouaké"];
const MY_AGENCIES = ["Agence Plateau", "Agence Yopougon"]; // validateur et superviseur de la démo : plusieurs agences
const MULTI_AGENCY_ROLES = ["Validateur", "Superviseur"];
const ZONE_LABEL = { VERT: "Sous le seuil d'alerte", ORANGE: "Symptômes modérés", ROUGE: "Symptômes significatifs" };
const ZONE_SHORT = { VERT: "Vert", ORANGE: "Orange", ROUGE: "Rouge" };
const ZONE_TEXT = {
  VERT: "Vos réponses ne montrent pas de signe d'alerte. N'hésitez pas à en reparler si les choses changent.",
  ORANGE: "Vos réponses montrent des signes de difficulté. Un accompagnement peut vous aider.",
  ROUGE: "Vos réponses montrent une souffrance importante. Un professionnel peut vous accompagner rapidement.",
};
const QUESTIONS = [
  "Des souvenirs répétés et pénibles de l'événement vous reviennent-ils ?",
  "Faites-vous des rêves pénibles en lien avec l'événement ?",
  "Évitez-vous d'y penser ou d'en parler ?",
  "Évitez-vous les lieux ou situations qui vous le rappellent ?",
  "Avez-vous perdu de l'intérêt pour des activités que vous aimiez ?",
  "Vous sentez-vous irritable ou en colère plus souvent ?",
  "Êtes-vous constamment sur vos gardes ?",
  "Avez-vous du mal à vous endormir ou à rester endormi ?",
];
const ANSWERS = ["Pas du tout", "Un peu", "Modérément", "Beaucoup", "Extrêmement"];
const scoreOf = (answers) => Math.round(answers.reduce((s, a) => s + (a ?? 0), 0) * 80 / (QUESTIONS.length * 4));
const zoneOf = (score) => (score < 32 ? "VERT" : score < 53 ? "ORANGE" : "ROUGE");
const answersFor = (score) => QUESTIONS.map((_, i) => Math.max(0, Math.min(4, Math.round(score / 20 + ((i * 7) % 3) - 1))));

const KNOWN_PERSON = { nom: "Démo", prenom: "Aya", sexe: "F", naissance: "1988-04-12", tel: "07 00 00 00 01", type: "AT", accident: "2026-09-30" };

const FIELD_TYPES = {
  text: ["Texte", "Aa", "Profession, quartier…"],
  tel: ["Téléphone", "📞", "Numéro du patient"],
  email: ["Email", "@", "Adresse email"],
  number: ["Nombre", "123", "Âge, nombre d'enfants…"],
  date: ["Date passée", "📅", "Date de l'accident…"],
  select: ["Liste (un choix)", "☰", "Situation familiale…"],
  checkbox: ["Cases à cocher", "☑", "Plusieurs choix possibles"],
};
const HIDEABLE_ROLES = ["Superviseur", "Administrateur", "Super admin", "Admin Yodan", "Praticien"];
const PII_HIDDEN = ["Superviseur", "Administrateur", "Super admin"];

const db = {
  myEvals: [
    { name: "Koffi Test", imm: "DEMO-100231", date: TODAY, mode: "Avec le patient", kind: "Initiale" },
    { name: "Mariam Fictif", imm: "DEMO-100412", date: TODAY, mode: "QR code", kind: "Initiale" },
    { name: "Yao Exemple", imm: "DEMO-100077", date: addDays(TODAY, -2), mode: "Avec le patient", kind: "Suivi" },
    { name: "Adjoua Démo", imm: "DEMO-100918", date: addDays(TODAY, -3), mode: "Avec le patient", kind: "Initiale" },
    { name: "Ibrahim Test", imm: "DEMO-100655", date: addDays(TODAY, -12), mode: "QR code", kind: "Initiale" },
    { name: "Fanta Exemple", imm: "DEMO-100302", date: addDays(TODAY, -20), mode: "Avec le patient", kind: "Initiale" },
  ],
  decide: [
    { id: "e1", imm: "DEMO-104521", sin: "SIN-88120", name: "Aya Démo", score: 41, zone: "ORANGE", evaluator: "Paul Démo", date: TODAY, agency: "Agence Plateau", type: "Accident du travail", closes: addDays(TODAY, 7) },
    { id: "e2", imm: "DEMO-104777", sin: "SIN-88241", name: "Serge Fictif", score: 47, zone: "ORANGE", evaluator: "Lina Démo", date: addDays(TODAY, -1), agency: "Agence Yopougon", type: "Maladie professionnelle", closes: addDays(TODAY, 6) },
    { id: "e3", imm: "DEMO-103990", sin: "SIN-87702", name: "Clarisse Test", score: 36, zone: "ORANGE", evaluator: "Lina Démo", date: addDays(TODAY, -4), agency: "Agence Yopougon", type: "Accident du travail", closes: addDays(TODAY, 3), late: true },
    { id: "e4", imm: "DEMO-104012", sin: "SIN-87755", name: "Bakary Exemple", score: 50, zone: "ORANGE", evaluator: "Paul Démo", date: addDays(TODAY, -5), agency: "Agence Plateau", type: "Accident du travail", closes: addDays(TODAY, 2), late: true },
  ],
  callbacks: [
    { id: "c1", imm: "DEMO-102211", name: "Rose Fictif", phone: "07 00 00 00 12", zone: "ROUGE", agency: "Agence Plateau", requested: addDays(TODAY, -1), consent: false, attempts: 0, contents: [["Être rappelé par un psychologue", true], ["Recevoir des conseils par SMS", false]] },
    { id: "c2", imm: "DEMO-102367", name: "Moussa Test", phone: "07 00 00 00 34", zone: "ORANGE", agency: "Agence Yopougon", requested: addDays(TODAY, -3), consent: true, attempts: 1, contents: [["Être rappelé par un psychologue", true]] },
  ],
  activate: [
    { id: "a1", imm: "DEMO-101544", sin: "SIN-86012", name: "Aminata Démo", agency: "Agence Plateau", since: addDays(TODAY, -8), needsVoucher: true, ready: true },
    { id: "a2", imm: "DEMO-101689", sin: "", name: "Hervé Exemple", agency: "Agence Yopougon", since: addDays(TODAY, -9), needsVoucher: false, ready: true },
    { id: "a3", imm: "DEMO-101802", sin: "SIN-86230", name: "Grâce Fictif", agency: "Agence Plateau", since: addDays(TODAY, -2), needsVoucher: true, ready: false, availableAt: addDays(TODAY, 3) },
  ],
  done: [
    { imm: "DEMO-100980", name: "Jean Démo", zone: "ROUGE", decision: "AUTO_YES", date: addDays(TODAY, -1), by: "Automatique", agency: "Agence Plateau" },
    { imm: "DEMO-100981", name: "Nadia Test", zone: "VERT", decision: "AUTO_NO", date: addDays(TODAY, -1), by: "Automatique", agency: "Agence Yopougon" },
    { imm: "DEMO-100850", name: "Ali Fictif", zone: "ORANGE", decision: "YES", date: addDays(TODAY, -2), by: "Vous", agency: "Agence Yopougon" },
    { imm: "DEMO-100812", name: "Esther Exemple", zone: "ORANGE", decision: "NO", date: addDays(TODAY, -16), by: "Sophie Test", agency: "Agence Plateau" },
  ],
  team: [
    { name: "Paul Démo", role: "Évaluateur", agencies: ["Agence Plateau"], evals: 38, decided: null, pending: null, active: true },
    { name: "Lina Démo", role: "Évaluateur", agencies: ["Agence Yopougon"], evals: 27, decided: null, pending: null, active: true },
    { name: "Eric Test", role: "Évaluateur", agencies: ["Agence Plateau"], evals: 4, decided: null, pending: null, active: false },
    { name: "Marc Démo", role: "Validateur", agencies: ["Agence Plateau", "Agence Yopougon"], evals: 6, decided: 41, pending: 2, active: true },
    { name: "Sophie Test", role: "Validateur", agencies: ["Agence Plateau"], evals: 2, decided: 33, pending: 2, active: true },
  ],
  agencies: [
    { name: "Agence Plateau", supervisor: "Claire Démo", evaluators: 2, validators: 2, appeal: 7, zones: ["ORANGE"], qr: true, evals: 312 },
    { name: "Agence Yopougon", supervisor: "Claire Démo", evaluators: 1, validators: 1, appeal: 7, zones: ["ORANGE"], qr: false, evals: 205 },
    { name: "Agence Bouaké", supervisor: "Awa Fictif", evaluators: 2, validators: 0, appeal: 10, zones: ["ORANGE", "ROUGE"], qr: true, evals: 88 },
  ],
  supervisors: [
    { name: "Claire Démo", agencies: ["Agence Plateau", "Agence Yopougon"], late: 2, active: true },
    { name: "Awa Fictif", agencies: ["Agence Bouaké"], late: 0, active: true },
  ],
  tenants: [
    { name: "CNPS", slug: "cnps", test: "PCL-5", state: "Actif", agencies: 3, modules: ["Évaluation", "Validation"], type: "assureur", yodanLink: null, color: "#0b6e6e" },
    { name: "Partenaire Démo B", slug: "demo-b", test: "ICJE", state: "Actif", agencies: 1, modules: ["Évaluation"], type: "non_assureur", yodanLink: "Yodan Démo", color: "#7a4b9a" },
  ],
  fields: [
    { label: "Nom", key: "nom", type: "text", level: "person", pii: true, required: true, locks: true, identifier: false, hidden: PII_HIDDEN },
    { label: "Prénom", key: "prenom", type: "text", level: "person", pii: true, required: true, locks: true, identifier: false, hidden: PII_HIDDEN },
    { label: "Sexe", key: "sexe", type: "select", options: ["Femme", "Homme"], level: "person", pii: false, required: true, locks: true, hidden: [] },
    { label: "Téléphone", key: "telephone", type: "tel", level: "person", pii: true, required: false, locks: false, hidden: PII_HIDDEN },
    { label: "Type de sinistre", key: "type_sinistre", type: "select", options: ["Accident du travail", "Maladie professionnelle"], level: "case", pii: false, required: true, locks: true, hidden: [] },
    { label: "Date de l'accident", key: "date_accident", type: "date", level: "case", pii: false, required: true, locks: true, hidden: [] },
  ],
  bilan: {
    // moment « pre » : demandé avant le questionnaire ; « post » : proposé avec le résultat.
    consents: [
      { id: "k0", moment: "pre", type: "consent", required: true, label: "J'accepte que mes réponses soient traitées de façon confidentielle pour évaluer mon besoin d'accompagnement" },
      { id: "k1", moment: "post", type: "callback", label: "J'accepte d'être recontacté par un psychologue" },
      { id: "k2", moment: "post", type: "consent", label: "J'accepte de recevoir des conseils par SMS" },
    ],
    links: [
      { id: "l1", label: "Ligne d'écoute (numéro fictif)", url: "https://exemple.ci/ecoute", zones: ["ORANGE", "ROUGE"] },
      { id: "l2", label: "Conseils pour mieux dormir", url: "https://exemple.ci/sommeil", zones: ["VERT", "ORANGE"] },
    ],
  },
  history: [
    { date: TODAY, who: "Admin Démo", action: "Export SQL (code vérifié)" },
    { date: addDays(TODAY, -1), who: "Claire Démo", action: "Régénération QR Agence Plateau" },
    { date: addDays(TODAY, -2), who: "Admin Démo", action: "Création compte validateur" },
    { date: addDays(TODAY, -19), who: "Admin Démo", action: "Correction N° de sinistre" },
  ],
  toAssign: [
    { id: "p1", name: "Aminata Démo", tenant: "CNPS", agency: "Agence Plateau", city: "Abidjan", suggest: "Dr Kader Démo" },
    { id: "p2", name: "Hervé Exemple", tenant: "CNPS", agency: "Agence Plateau", city: "Abidjan", suggest: "Mme Ines Test" },
    { id: "p3", name: "Patient Démo B-12", tenant: "Partenaire Démo B", agency: "Siège", city: "Bouaké", suggest: "Dr Yves Fictif" },
  ],
  ceilings: [{ id: "k1", name: "Rose Fictif", tenant: "CNPS", sessions: "8 / 8", practitioner: "Dr Kader Démo" }],
  unlocks: [{ id: "u1", name: "Moussa Test", tenant: "CNPS", report: "Nouvelle prise en charge nécessaire" }],
  practitioners: [
    { name: "Dr Kader Démo", type: "Psychiatre", city: "Abidjan", patients: 6, active: true, external: false },
    { name: "Mme Ines Test", type: "Psychologue", city: "Abidjan", patients: 4, active: true, external: false },
    { name: "Dr Yves Fictif", type: "Psychologue", city: "Bouaké", patients: 2, active: true, external: true },
  ],
  patients: [
    { name: "Aya Démo", tenant: "CNPS", practitioner: "Dr Kader Démo", status: "En cours", sessions: "3 / 8", since: addDays(TODAY, -30) },
    { name: "Rose Fictif", tenant: "CNPS", practitioner: "Dr Kader Démo", status: "Plafond atteint", sessions: "8 / 8", since: addDays(TODAY, -80) },
    { name: "Aminata Démo", tenant: "CNPS", practitioner: "—", status: "Sans praticien", sessions: "0 / 8", since: addDays(TODAY, -8) },
    { name: "Koffi Test", tenant: "CNPS", practitioner: "Mme Ines Test", status: "Clos", sessions: "6 / 8", since: addDays(TODAY, -120) },
    { name: "Patient Démo B-07", tenant: "Partenaire Démo B", practitioner: "Dr Yves Fictif", status: "En cours", sessions: "2 / 6", since: addDays(TODAY, -15) },
  ],
  sessions: [
    { id: "s1", name: "Aya Démo", tenant: "CNPS", n: "Séance 4 / 8", where: "En ligne", status: null },
    { id: "s2", name: "Serge Fictif", tenant: "CNPS", n: "Séance 1 / 8", where: "Présentiel — Agence Plateau", status: null },
    { id: "s3", name: "Patient Démo B-07", tenant: "Partenaire Démo B", n: "Séance 3 / 6", where: "En ligne", status: null },
  ],
  weekdays: [true, true, false, true, true, false, false],
};

/* Volume de démo pour la pagination : lignes fictives générées de façon déterministe. */
(() => {
  const FIRST = ["Aya", "Koffi", "Mariam", "Yao", "Adjoua", "Ibrahim", "Fanta", "Serge", "Clarisse", "Bakary", "Rose", "Moussa", "Aminata", "Hervé", "Grâce", "Jean", "Nadia", "Ali", "Esther", "Didier"];
  const LAST = ["Démo", "Test", "Fictif", "Exemple"];
  const name = (i) => `${FIRST[(i * 7) % FIRST.length]} ${LAST[i % LAST.length]}`;
  const imm = (i) => `DEMO-${String(110000 + i * 37).padStart(6, "0")}`;
  const zones = ["VERT", "ORANGE", "ROUGE"];
  for (let i = 0; i < 34; i++) db.myEvals.push({ name: name(i), imm: imm(i), date: addDays(TODAY, -(4 + Math.floor(i * 1.7))), mode: i % 3 ? "Avec le patient" : "QR code", kind: i % 5 ? "Initiale" : "Suivi" });
  for (let i = 0; i < 58; i++) {
    const zone = zones[i % 3];
    db.done.push({ imm: imm(200 + i), name: name(i + 3), zone, decision: zone === "VERT" ? "AUTO_NO" : zone === "ROUGE" ? "AUTO_YES" : i % 2 ? "YES" : "NO", date: addDays(TODAY, -(3 + i)), by: zone === "ORANGE" ? (i % 4 ? "Vous" : "Sophie Test") : "Automatique", agency: MY_AGENCIES[i % 2] });
  }
  const statuses = ["En cours", "En cours", "Clos", "Sans praticien", "Plafond atteint"];
  for (let i = 0; i < 27; i++) {
    const status = statuses[i % statuses.length];
    db.patients.push({ name: name(i + 11), tenant: i % 4 ? "CNPS" : "Partenaire Démo B", practitioner: status === "Sans praticien" ? "—" : db.practitioners[i % 3].name, status, sessions: status === "Plafond atteint" ? "8 / 8" : `${i % 8} / 8`, since: addDays(TODAY, -(10 + i * 4)) });
  }
  const actions = ["Création compte évaluateur", "Export CSV", "Désactivation compte", "Changement délai de recours", "Régénération QR", "Correction N° d'immatriculation"];
  for (let i = 0; i < 41; i++) db.history.push({ date: addDays(TODAY, -(3 + i * 2)), who: i % 3 ? "Admin Démo" : "Claire Démo", action: actions[i % actions.length] });
})();

/* Type d'agence : réglé une fois par partenaire (admin système), toutes ses agences le suivent.
 * Le partenaire « CNPS » est celui affiché dans les espaces validateur, superviseur, super admin. */
const TYPE_LABEL = { assureur: "Assureur", non_assureur: "Non assureur" };
const TYPE_TEXT = {
  assureur: "L'agence finance la prise en charge : le validateur dépose un bon de commande avant l'attestation.",
  non_assureur: "Pas de bon : en orange ou rouge, la prise en charge attend l'accord du patient. Plafond de séances géré par Yodan.",
};
const partner = () => db.tenants[0];
const insurer = () => partner().type === "assureur";
const setPartnerType = (t, type) => { t.type = type; if (type === "non_assureur" && !t.yodanLink) t.yodanLink = "Yodan Démo"; if (type === "assureur") t.yodanLink = null; };
/** Rappels visibles : l'« accord du patient » n'existe que chez un partenaire non assureur. */
const callbackList = () => db.callbacks.filter((c) => !c.consent || !insurer());

/* =====================================================================
 * Notes UX par écran
 * ===================================================================== */
const NOTES = {
  synthese: {
    title: "Comment lire cette maquette",
    before: ["Chaque écran de l'app empile toutes les fonctions d'un rôle sur une seule longue page (tableaux, filtres, graphiques).", "Les actions passent par des menus « Actions ⋯ », des fenêtres prompt()/confirm() et un rechargement complet de la page."],
    after: ["Choisissez un profil dans la barre du haut : chaque profil arrive directement sur sa tâche principale.", "Le bouton « PC / Mobile » affiche le même écran sur ordinateur ou sur téléphone.", "Ce panneau compare l'app actuelle (rouge) et la proposition (vert), avec le nombre de clics."],
  },
  connexion: {
    title: "Connexion",
    before: ["Carte de connexion seule sur fond uni : la marque et le message n'apparaissent pas.", "Le code de vérification exige un clic sur « Se connecter » après saisie.", "Deux vues de connexion quasi identiques coexistent (home.blade.php et login.blade.php)."],
    after: ["Bandeau de marque YODAN : logo, message, points de confiance, fond animé (dégradé, halos, battement de cœur). Animation coupée si l'appareil demande « réduire les animations ».", "Sur mobile : bandeau en haut, formulaire en feuille par-dessus.", "Le code à 6 chiffres se valide tout seul dès le 6e chiffre (collage accepté).", "Choix de l'espace par grandes cartes si l'email ouvre plusieurs espaces.", "Supprimer login.blade.php : l'accueil est déjà le seul point d'entrée."],
    clicks: { task: "Se connecter avec code", before: 3, after: 1 },
  },
  "evaluateur:home": {
    title: "Évaluateur — accueil",
    before: ["Anneau « Patients évalués » sans action associée.", "Filtres Du / Au + « Afficher 5/10/50/100 » + menu « Actions » pour un seul choix « Voir la fiche »."],
    after: ["Une seule action visible : le champ N° est déjà actif, Entrée lance l'évaluation.", "« Mes évaluations » = trace simple, regroupée par jour, avec recherche et période optionnelle (Du → Au).", "Pagination 10 / 20 / 50 / Tout, la taille choisie est mémorisée.", "Rien d'autre : l'évaluateur évalue et garde une trace."],
    clicks: { task: "Retrouver une évaluation passée", before: 3, after: 1 },
  },
  "evaluateur:wizard": {
    title: "Évaluateur — assistant d'évaluation",
    before: ["3 pages : tableau de bord → page « Mode d'évaluation » → formulaire unique très long.", "Les consentements (rappel, SMS…) n'arrivent qu'après le résultat, sur une case à cocher en bas de page.", "Après envoi, il faut cliquer « Voir le résultat »."],
    after: ["Pré-consentements au début (ex. traitement des données) : un accord obligatoire refusé arrête l'évaluation.", "Une question par écran, passage automatique, touches 0 à 4.", "Le résultat s'affiche dès l'envoi, avec les post-consentements (ex. être recontacté, enregistrés au toucher) et les liens utiles de sa zone.", "Les champs ajoutés par l'admin système apparaissent ici automatiquement."],
    clicks: { task: "Évaluation assistée complète (hors réponses)", before: 6, after: 3 },
  },
  "evaluateur:qr": {
    title: "Évaluateur — QR code",
    before: ["Le QR s'affiche sur une page à part, sans retour d'état."],
    after: ["Compte à rebours et statut « en attente / terminé ».", "Le patient voit son résultat directement sur son téléphone ; l'agent revient à l'accueil."],
  },
  "validateur:decide": {
    title: "Validateur — à décider",
    before: ["Tableau de 10 colonnes mélangeant dossiers verts, rouges (décidés automatiquement) et orange.", "Décider = filtrer → « Actions ⋯ » → Oui → prompt() → rechargement."],
    after: ["File des seuls dossiers orange, toutes ses agences réunies, avec un filtre par agence en 1 clic.", "Oui / Non en gros boutons (touches O / N), commentaire facultatif sur place.", "Le dossier suivant s'ouvre tout seul ; « Annuler » pendant 6 s.", "Recherche par nom ou N° et pagination en tête de chaque file (À décider, À appeler, À activer)."],
    clicks: { task: "Décider un dossier orange", before: 5, after: 1 },
  },
  "validateur:callbacks": {
    title: "Validateur — rappels",
    before: ["Pas de numéro cliquable, pas d'issue « injoignable ».", "Lien d'attestation à copier à la main dans une notification."],
    after: ["« Appeler » (lien tel:) et compteur de tentatives.", "Issue en 1 clic ; accord → attestation pré-remplie → « Copier » / SMS / Email."],
    clicks: { task: "Accord du patient → lien envoyé", before: 5, after: 3 },
  },
  "validateur:activate": {
    title: "Validateur — activer une prise en charge",
    before: ["Bon et attestation dans 2 colonnes du même tableau ; confirm() natif ; rechargement."],
    after: ["3 étapes guidées : Bon → Attestation → Envoi du lien. Partenaire non assureur : pas d'étape « Bon ».", "Agence des séances présélectionnée sur l'agence du dossier.", "Dossiers en délai de recours rangés à part, avec leur date."],
    clicks: { task: "Bon + attestation + lien", before: 8, after: 4 },
  },
  "validateur:done": {
    title: "Validateur — dossiers traités",
    before: ["L'historique est le même tableau que la file de travail."],
    after: ["Historique séparé, en lecture, avec recherche et période optionnelle (Du → Au).", "Pagination 10 / 20 / 50 / Tout ; la recherche et les filtres ramènent à la page 1."],
  },
  "superviseur:pilotage": {
    title: "Superviseur — pilotage",
    before: ["8 filtres visibles en permanence + 2 notes explicatives.", "Courbe d'évolution difficile à lire quand il y a beaucoup de points.", "Plusieurs jeux de dates sur la même page."],
    after: ["Histogramme empilé : une colonne par jour, semaine ou mois. Survol = détail ; clic = zoom sur la période.", "Bascule Nombre / % et Décision / Zone ; tableau des données à la demande.", "Une seule période pour la page : Semaine / Mois / Trimestre / Année, ou Du → Au.", "Ses agences en 1 clic : toutes ou une seule.", "Colonnes de moins de 5 évaluations masquées (« < 5 »)."],
    clicks: { task: "Chiffres du mois pour une agence", before: 6, after: 2 },
  },
  "superviseur:late": {
    title: "Superviseur — en retard",
    before: ["Le superviseur voit et traite toutes les files du validateur, en plus de ses graphiques."],
    after: ["Il n'intervient que sur les dossiers en attente depuis plus de 3 jours, toutes ses agences réunies.", "Même écran de décision que le validateur ; N° seulement, jamais le nom du patient."],
    clicks: { task: "Trouver les dossiers bloqués", before: 4, after: 0 },
  },
  "superviseur:team": { title: "Superviseur — équipe", before: ["2 tableaux séparés (validateurs, évaluateurs)."], after: ["Un tableau, filtre par rôle et par agence en 1 clic. Les personnes multi-agences sont signalées.", "Recherche par nom et pagination."] },
  "superviseur:qr": { title: "Superviseur — affiches QR", before: ["confirm() natif pour régénérer, puis rechargement."], after: ["Une carte par agence qu'il supervise ; régénérer demande un 2e clic explicite."] },
  "admin:pilotage": {
    title: "Administrateur — pilotage",
    before: ["Le rôle utilise la page du super admin avec un seul onglet « Vue d'ensemble » et tous les filtres visibles."],
    after: ["Écran dédié, lecture seule, chiffres agrégés de tout le réseau.", "Même histogramme et même période que le superviseur, avec un filtre par agence.", "Camembert de répartition à côté : il suit la bascule Décision / Zone et la période. Moins de 5 évaluations au total : masqué."],
  },
  "admin:agencies": { title: "Administrateur — agences", before: ["Comparaison entre agences mélangée aux graphiques."], after: ["Tableau comparatif des agences sur la période choisie, chiffres de moins de 5 masqués.", "Recherche et pagination 10 / 20 / 50 / Tout."] },
  "admin:supervisors": { title: "Administrateur — superviseurs", before: ["Liste des superviseurs sans indicateur de charge."], after: ["Qui supervise quelles agences, et combien de dossiers sont en retard. La gestion des comptes reste au super admin.", "Recherche et pagination."] },
  "superadmin:pilotage": {
    title: "Super admin — pilotage",
    before: ["7 onglets ; onglet « Dossiers » avec 6 filtres pour retrouver un N°."],
    after: ["3 onglets : Pilotage, Agences & comptes, Paramètres.", "Recherche de dossier par N° dans la barre du haut."],
  },
  "superadmin:org": {
    title: "Super admin — agences et comptes",
    before: ["Création d'agence, de compte et options d'agence dans des onglets et fenêtres différents.", "Rattachement multi-agences dans une fenêtre séparée après la création."],
    after: ["Une carte par agence → « Gérer » : équipe, réglages, QR.", "Plus de case « assureur » par agence : le type vient du partenaire (admin système), affiché en lecture seule.", "Création de compte en 3 étapes ; validateur et superviseur choisissent plusieurs agences dès la création."],
    clicks: { task: "Créer un compte validateur sur 2 agences", before: 10, after: 5 },
  },
  "superadmin:settings": {
    title: "Super admin — paramètres",
    before: ["Exports CSV, XLSX et SQL côte à côte.", "Listes préétablies (villes, siège des lésions…) gérées à part des champs qui les utilisent."],
    after: ["Listes du formulaire : un bloc déroulable par champ « Liste », avec ses valeurs, une recherche et une pagination. Le super admin ajoute, renomme ou désactive des valeurs ; les valeurs par défaut viennent de l'admin système.", "CSV et XLSX : téléchargement direct (chiffres agrégés).", "Seul l'export SQL (base complète) demande un code reçu par email.", "Historique avec recherche, période optionnelle et pagination."],
  },
  "sysadmin:tenants": {
    title: "Admin système — partenaires",
    before: ["Réglages sur une seule page très longue.", "Ajout d'un champ : une fenêtre avec ~15 options affichées d'un coup ; choix entre saisie libre et « liste préétablie ».", "Bilan : consentements et liens empilés, il faut faire défiler pour voir toutes les actions."],
    after: ["Réglages en blocs déroulables : chaque bloc fermé montre sa valeur actuelle (type, test, couleur, nombre de champs…). Toutes les actions tiennent sur un écran.", "Bilan : 4 blocs (pré-consentements, post-consentements, liens, aperçu) avec « + Ajouter » dans l'en-tête ; chaque élément tient sur une ligne, « Modifier » l'ouvre.", "Champ « Liste » : plus de liste préétablie. L'admin système saisit des valeurs par défaut, le super admin complète ensuite.", "Options rares d'un champ (condition d'affichage, rôles masqués) repliées dans « Options avancées »."],
  },
  "sysadmin:create": {
    title: "Admin système — nouveau partenaire",
    before: ["Un seul formulaire ; « Tester la connexion » à part.", "Test fixé à PCL-5, à changer ensuite dans les réglages.", "Type assureur réglé agence par agence par le super admin ; compte Yodan à relier à la main ensuite."],
    after: ["5 étapes : Partenaire et test → Type d'agences → Base → Super admin → Récapitulatif.", "Test de dépistage choisi dès la 1re étape, PCL-5 présélectionné.", "Le type (assureur / non assureur) est choisi une fois : toutes les agences du partenaire le suivent.", "Non assureur : le super admin est relié par défaut à un admin Yodan (même personne, deux espaces, code par email)."],
  },
  "yodan:todo": {
    title: "Admin Yodan — à faire",
    before: ["Attribuer : onglet Patients → filtre → cocher → praticien → Attribuer."],
    after: ["Tout ce qui demande une action, regroupé par type.", "Praticien suggéré : « Attribuer » en 1 clic, ou tout attribuer d'un coup."],
    clicks: { task: "Attribuer un patient", before: 7, after: 1 },
  },
  "yodan:patients": { title: "Admin Yodan — patients", before: ["13 colonnes et 5 filtres visibles.", "Pagination « 5 / 10 / 50 / 100 » différente d'une page à l'autre."], after: ["5 colonnes, filtres rapides par statut, période optionnelle, détail dans un panneau.", "Même pagination partout : 10 / 20 / 50 / Tout, numéros de page, taille mémorisée par liste."] },
  "yodan:practitioners": { title: "Admin Yodan — praticiens", before: ["Formulaire d'ajout affiché en permanence."], after: ["Liste d'abord, avec recherche et pagination ; « Ajouter » ouvre un assistant en 3 étapes."] },
  "yodan:stats": {
    title: "Admin Yodan — statistiques",
    before: ["Statistiques en premier onglet, sans graphique d'évolution."],
    after: ["Histogramme des séances (présent / reporté / absent) avec la même période que les partenaires : Semaine / Mois / Trimestre / Année ou Du → Au, survol et zoom.", "Camembert des patients par statut : un clic sur une part ouvre la liste des patients filtrée.", "Filtre par partenaire ; tableau par praticien avec recherche et pagination.", "Dernier onglet : consulté, pas utilisé tous les jours."],
    clicks: { task: "Voir les patients sans praticien", before: 3, after: 1 },
  },
  "praticien:today": {
    title: "Praticien — aujourd'hui",
    before: ["S'ouvre sur « Mes jours de travail » puis l'agenda : il faut cliquer un jour.", "Présent / Absent → prompt() → rechargement."],
    after: ["Ouverture sur les séances du jour.", "Présent / Absent / Reporter en 1 clic ; note facultative ; « Annuler ».", "Scanner l'attestation toujours accessible."],
    clicks: { task: "Noter une présence", before: 3, after: 1 },
  },
  "praticien:agenda": { title: "Praticien — agenda", before: ["Grille semaine/mois + sélecteur + précédent/suivant/aujourd'hui."], after: ["Bande de 7 jours ; jour non travaillé en 1 interrupteur."] },
  "praticien:patients": { title: "Praticien — patients", before: ["Tableau de 9 colonnes avec cases à cocher."], after: ["Liste simple avec recherche et pagination ; rapport final en 3 étapes : Fichier → Issue → Envoyer."] },
  "praticien:settings": { title: "Praticien — réglages", before: ["Cases à cocher + « Enregistrer » en haut de l'agenda."], after: ["Interrupteurs enregistrés dès qu'on les touche."] },
  "praticien:scan": { title: "Praticien — scanner", before: ["Boutons « Ouvrir / Fermer la caméra »."], after: ["Caméra ouverte directement ; aperçu puis « Valider la séance »."] },
  patient: {
    title: "Patient — auto-évaluation (QR)",
    before: ["Page longue sur un petit écran.", "Résultat caché derrière « Voir le résultat », consentements après le résultat."],
    after: ["Pré-consentements au début, une question par écran, grands boutons.", "Résultat affiché dès la dernière réponse, avec les post-consentements (être recontacté…) et les liens utiles de sa zone."],
  },
};

/* =====================================================================
 * État, navigation, cadre PC / mobile
 * ===================================================================== */
const ROLES = [
  { id: "synthese", label: "Synthèse", view: null },
  { id: "connexion", label: "Connexion", view: null },
  { id: "evaluateur", label: "Évaluateur", view: "home" },
  { id: "validateur", label: "Validateur", view: "decide" },
  { id: "superviseur", label: "Superviseur", view: "pilotage" },
  { id: "admin", label: "Administrateur", view: "pilotage" },
  { id: "superadmin", label: "Super admin", view: "pilotage" },
  { id: "sysadmin", label: "Admin système", view: "tenants" },
  { id: "yodan", label: "Admin Yodan", view: "todo" },
  { id: "praticien", label: "Praticien", view: "today" },
  { id: "patient", label: "Patient (QR)", view: null },
];
/** Espaces gérés par Yodan (charte YODAN) ; les autres sont aux couleurs du partenaire. */
const YODAN_SPACES = ["synthese", "connexion", "sysadmin", "yodan", "praticien"];
const state = { role: "synthese", view: null, notes: true, keys: null, timer: null, device: "pc" };
const isMobile = () => state.device === "mobile";

function stopTimers() { clearInterval(state.timer); clearTimeout(state.timer); }
function go(role, view) {
  state.role = role;
  state.view = view ?? ROLES.find((r) => r.id === role).view;
  state.keys = null;
  stopTimers();
  $$(".drawer-back").forEach((d) => d.remove());
  render();
  window.scrollTo(0, 0);
}
function setView(view) { state.view = view; state.keys = null; stopTimers(); render(); }

function render() {
  $$("#role-switch button").forEach((b) => b.classList.toggle("active", b.dataset.role === state.role));
  $("#role-select").value = state.role;
  $$(".device-switch button").forEach((b) => b.classList.toggle("on", b.dataset.device === state.device));
  const stage = $("#stage");
  // Charte : espaces Yodan en bleu YODAN ; espaces partenaires à la couleur du partenaire.
  // Posé sur <body> pour que les panneaux latéraux (hors #stage) suivent la même charte.
  document.body.dataset.brand = YODAN_SPACES.includes(state.role) ? "yodan" : "partner";
  if (document.body.dataset.brand === "partner") document.body.style.setProperty("--primary", partner().color);
  else document.body.style.removeProperty("--primary");
  let root = stage;
  if (isMobile()) {
    stage.innerHTML = `<div class="phone-wrap"><div class="phone"><div class="phone-screen is-mobile" id="screen"></div></div></div>`;
    root = $("#screen");
  } else {
    stage.innerHTML = "";
  }
  RENDER[state.role](root);
  renderNotes();
}
function renderNotes() {
  const key = state.view ? `${state.role}:${state.view}` : state.role;
  const n = NOTES[key] || NOTES[state.role];
  const aside = $("#notes");
  const close = `<button type="button" class="notes-close" aria-label="Fermer les notes">×</button>`;
  if (!n) { aside.innerHTML = `${close}<p class='muted'>Pas de note pour cet écran.</p>`; } else {
  aside.innerHTML = `${close}
    <h2>${esc(n.title)}</h2>
    <span class="tag">Aujourd'hui</span><ul class="before">${n.before.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    <span class="tag">Proposition</span><ul class="after">${n.after.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    ${n.clicks ? `<span class="tag">Clics (hors saisie)</span>
      <div class="clicks"><div class="b"><strong>${n.clicks.before}</strong>avant</div><div class="a"><strong>${n.clicks.after}</strong>après</div></div>
      <p class="task">${esc(n.clicks.task)}</p>` : ""}`;
  }
  $(".notes-close", aside).addEventListener("click", () => setNotes(false));
}
/** Affiche ou masque les notes : panneau à droite sur PC, fenêtre par-dessus l'écran sur téléphone. */
function setNotes(on) {
  state.notes = on;
  $("#notes-toggle").setAttribute("aria-pressed", String(on));
  $("#layout").classList.toggle("with-notes", on);
  $("#notes").hidden = !on;
  document.body.classList.toggle("notes-open", on);
  if (on && matchMedia("(max-width: 760px)").matches) $("#notes .notes-close")?.focus();
}
document.addEventListener("keydown", (e) => {
  if (!state.keys) return;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
  if (document.querySelector(".drawer-back")) return;
  state.keys(e);
});

/** Logo YODAN (silhouette simplifiée + mot) ; `light` pour fond foncé. */
/** Vrai logo YODAN (public/images/logo-yodan.png, celui de l'app) + intitulé facultatif. */
function yodanLogo(sub = "") {
  return `<span class="logo"><img class="logo-img" src="logo-yodan.png" alt="YODAN — Santé et psychologie d'entreprises">${sub ? `<span class="sub">${esc(sub)}</span>` : ""}</span>`;
}
function appBar(role, name, extra = "") {
  const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2);
  const yodan = YODAN_SPACES.includes(state.role);
  return `<header class="app-bar">
    ${yodan ? `<div class="brand">${yodanLogo(isMobile() ? "" : "Prise en charge")}</div>`
      : `<div class="brand"><div class="brand-dot">${esc(partner().name[0])}</div><span class="brand-txt"><span class="brand-name">${esc(partner().name)} · Prise en charge</span><span class="partner-by">avec <b>YODAN</b></span></span></div>`}
    ${extra}
    <div class="spacer"></div>
    <div class="who"><span class="role-pill">${esc(role)}</span><span class="avatar" title="${esc(name)}">${esc(initials)}</span>
    <button type="button" class="btn btn-ghost btn-sm" onclick="go('connexion')">Quitter</button></div>
  </header>`;
}
function tabsHtml(tabs, current) {
  return `<nav class="tabs" role="tablist">${tabs.map((t) => `<button type="button" role="tab" data-tab="${t.id}" class="${t.id === current ? "on" : ""}" aria-selected="${t.id === current}">${esc(t.label)}${t.count != null ? ` <span class="count ${t.hot && t.count ? "hot" : ""}">${t.count}</span>` : ""}</button>`).join("")}</nav>`;
}
function bindTabs(root) { $$(".tabs [data-tab]", root).forEach((b) => b.addEventListener("click", () => setView(b.dataset.tab))); }
const agencyChip = (list) => `<span class="chip" title="${esc(list.join(", "))}">📍 ${list.length > 1 ? `${list.length} agences` : esc(list[0])}</span>`;

/* =====================================================================
 * Synthèse
 * ===================================================================== */
const SUMMARY = [
  { role: "evaluateur", who: "Évaluateur", task: "Évaluer un patient, garder la trace", before: "Accueil chargé, 3 pages, consentements après le résultat", after: "N° → mode → consentements → 1 question par écran → résultat direct", b: 6, a: 3 },
  { role: "validateur", who: "Validateur", task: "Décider les cas orange (plusieurs agences)", before: "Tableau 10 colonnes, menu Actions, prompt(), rechargement", after: "File « À décider » multi-agences, Oui/Non, dossier suivant automatique", b: 5, a: 1 },
  { role: "validateur", view: "activate", who: "Validateur", task: "Activer une prise en charge", before: "Bon + attestation dans un tableau, confirm(), copie à la main", after: "3 étapes guidées, bouton « Copier »", b: 8, a: 4 },
  { role: "superviseur", who: "Superviseur", task: "Piloter ses agences", before: "8 filtres, courbe chargée, files du validateur", after: "Histogramme, 1 période (ou Du → Au), n'intervient que sur les retards", b: 6, a: 2 },
  { role: "admin", who: "Administrateur", task: "Suivre le réseau", before: "Page du super admin réduite à un onglet", after: "Écran dédié en lecture seule : pilotage, agences, superviseurs", b: 5, a: 2 },
  { role: "superadmin", view: "org", who: "Super admin", task: "Créer un compte multi-agences", before: "7 onglets, formulaire + fenêtre « agences »", after: "Assistant Profil → Agences → Identité", b: 10, a: 5 },
  { role: "sysadmin", who: "Admin système", task: "Ajouter un champ au questionnaire", before: "Fenêtre avec ~15 options d'un coup", after: "5 étapes, options sans objet masquées, aperçu", b: 4, a: 5 },
  { role: "yodan", who: "Admin Yodan", task: "Attribuer un patient", before: "Onglet, filtre, case, liste, bouton", after: "« À faire » + praticien suggéré", b: 7, a: 1 },
  { role: "praticien", who: "Praticien", task: "Noter une présence", before: "Clic jour → bouton → prompt() → rechargement", after: "Séances du jour, 1 clic", b: 3, a: 1 },
  { role: "patient", who: "Patient", task: "Auto-évaluation", before: "Page longue, résultat caché", after: "Consentements, 1 question par écran, résultat direct", b: 3, a: 1 },
];
const RENDER = {};
RENDER.synthese = (root) => {
  root.innerHTML = `<div class="page">
    <section class="hero">
      <span class="eyebrow" style="color:#9FCBEA">Maquette interactive</span>
      <h1>Refonte UX — « un rôle, une tâche »</h1>
      <p>Retours des utilisateurs : l'app est lourde. Cette maquette propose, pour chaque profil, un écran d'arrivée centré sur sa tâche principale, des parcours par étapes et moins de clics, sur PC et sur mobile. Toutes les données sont fictives.</p>
    </section>
    <div class="principles">
      ${[
        ["🎯", "Un rôle = une tâche", "Chaque profil arrive sur ce qu'il doit faire, pas sur un tableau de bord générique."],
        ["📥", "Des files « à faire »", "Seuls les dossiers qui demandent une action ; toutes les agences de la personne réunies."],
        ["🪜", "Par étapes", "Une question, un choix à la fois. Les options sans objet n'apparaissent pas."],
        ["⚡", "Valeurs par défaut", "Attestation 3 mois en ligne, praticien suggéré, agence du dossier : on valide au lieu de remplir."],
        ["↩️", "Annuler plutôt que confirmer", "Action immédiate + « Annuler » 6 s. Confirmation explicite gardée pour l'irréversible (envoi du bon)."],
        ["📊", "Histogramme + période", "Colonnes empilées lisibles même avec beaucoup de données ; période libre Du → Au."],
        ["📱", "PC et mobile", "Chaque écran existe dans les deux formats (bouton en haut à droite)."],
        ["🗂", "Blocs déroulables", "Les pages de réglages montrent un résumé par bloc : toutes les actions tiennent sur un écran, sans faire défiler."],
        ["🔎", "Recherche + pagination", "Chaque liste dynamique a sa recherche et le même pied de liste 10 / 20 / 50 / Tout."],
        ["🎨", "Charte YODAN", "Bleu YODAN, Exo 2 et Bebas Neue pour les espaces Yodan ; les espaces partenaires gardent leur couleur."],
        ["🔒", "Sécurité inchangée", "Seuil de 5 personnes, identité masquée au superviseur, code par email pour l'export SQL."],
      ].map(([i, t, d]) => `<div class="principle"><div class="ico">${i}</div><strong>${t}</strong><span class="muted small">${d}</span></div>`).join("")}
    </div>
    <div class="card">
      <h2>Gains par profil</h2>
      <div style="overflow-x:auto"><table class="table">
        <thead><tr><th>Profil</th><th>Tâche principale</th><th>Aujourd'hui</th><th>Proposé</th><th>Clics</th><th></th></tr></thead>
        <tbody>${SUMMARY.map((s, i) => `<tr><td><strong>${s.who}</strong></td><td>${s.task}</td><td class="muted small">${s.before}</td><td class="small">${s.after}</td>
          <td style="white-space:nowrap"><span class="loss">${s.b}</span> → <span class="gain">${s.a}</span></td>
          <td><button type="button" class="btn btn-sm" data-act="open" data-i="${i}">Voir →</button></td></tr>`).join("")}</tbody>
      </table></div>
      <p class="muted small" style="margin-bottom:0">Clics comptés hors saisie de texte et hors réponses. Estimations à partir du code actuel des vues. L'ajout de champ prend un clic de plus, mais chaque écran ne montre que ce qui s'applique au type choisi.</p>
    </div>
    <div class="card">
      <h2>Ce qui change côté serveur</h2>
      <ul>
        <li>Consentements du bilan typés <strong>pré</strong> (avant le questionnaire, option « obligatoire ») ou <strong>post</strong> (avec le résultat, dont la demande d'appel). Les liens restent par zone.</li>
        <li>Type d'agences (assureur / non assureur) porté par le partenaire et non plus par chaque agence (<code>agencies.is_insurer</code> → réglage du partenaire). Non assureur : liaison super admin ↔ admin Yodan créée par défaut.</li>
        <li>Code par email réservé à l'export SQL ; CSV et XLSX (agrégés) téléchargés directement.</li>
        <li>Nouveaux points d'API : file « en retard » du superviseur, suggestion de praticien, issue « injoignable » des rappels, histogramme par jour / semaine / mois.</li>
        <li>Champs « Liste » : supprimer les listes préétablies (<code>options_source</code> <code>builtin:*</code> et <code>list:*</code>). Chaque champ porte ses valeurs ; l'admin système pose les valeurs par défaut, le super admin les complète ou les désactive (une valeur désactivée reste lisible dans les anciens dossiers).</li>
        <li>Test de dépistage choisi à la création du partenaire (PCL-5 par défaut, ICJE possible), via <code>ScreeningCatalog</code>.</li>
        <li>Thème : couleur du partenaire pour ses espaces ; charte YODAN (bleu, Exo 2, Bebas Neue) pour la connexion et les espaces Yodan.</li>
        <li>Recherche + pagination 10 / 20 / 50 / Tout sur toutes les listes dynamiques (remplace <code>list-pager</code> et les sélecteurs « 5 / 10 / 50 / 100 ») ; à faire côté serveur pour les grandes listes, « Tout » plafonné si besoin.</li>
        <li>Remplacer <code>prompt()</code> / <code>confirm()</code> / <code>reloadWith()</code> par des mises à jour sur place ; découper <code>dashboard.blade.php</code> en une vue par rôle.</li>
      </ul>
    </div>
  </div>`;
  bind(root, { open: (el) => { const s = SUMMARY[+el.dataset.i]; go(s.role, s.view); } });
};

/* =====================================================================
 * Connexion
 * ===================================================================== */
RENDER.connexion = (root) => {
  let step = 0;
  const hero = `<section class="login-hero" aria-label="YODAN">
      <span class="dots" aria-hidden="true"></span><span class="blob b1" aria-hidden="true"></span><span class="blob b2" aria-hidden="true"></span><span class="blob b3" aria-hidden="true"></span>
      <svg class="pulse" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 70 H380 L420 70 L445 25 L470 105 L495 45 L515 70 H760 L790 70 L810 40 L832 92 L850 70 H1200"/></svg>
      <div>${yodanLogo()}</div>
      <div>
        <span class="eyebrow">Santé mentale au travail · Prise en charge</span>
        <h1>Prendre soin de celles et ceux qui <em>font l'entreprise</em>.</h1>
        <p class="lead">Évaluer, orienter et accompagner chaque personne, en toute confidentialité, avec des professionnels de confiance.</p>
        <div class="trust"><span>🔒 Données de santé protégées</span><span>🤝 Psychologues et praticiens</span><span>📊 Pilotage anonymisé</span></div>
      </div>
      <div class="motto">Agir avec agilité · Innover avec responsabilité · Protéger avec exigence</div>
    </section>`;
  const draw = () => {
    root.innerHTML = `<div class="login-split">${hero}<div class="login-side"><div class="login-card">
      ${step === 0 ? `<span class="eyebrow">Connexion</span><h2>Bon retour 👋</h2><p class="muted" style="margin-top:0">Connectez-vous pour retrouver votre espace.</p>
        <div class="field"><label for="l-email">Email</label><input id="l-email" type="email" value="agent.demo@exemple.ci" autocomplete="email"></div>
        <div class="field"><label for="l-pass">Mot de passe</label><div class="pass-wrap"><input id="l-pass" type="password" value="demo-demo" autocomplete="current-password"><button type="button" data-act="show" aria-label="Afficher le mot de passe">Afficher</button></div></div>
        <label class="small" style="display:flex;gap:.5rem;align-items:center;margin-bottom:1rem"><input type="checkbox" style="width:auto"> Rester connecté (appareil personnel uniquement)</label>
        <button type="button" class="btn btn-primary btn-block btn-lg" data-act="login">Se connecter →</button>
        <p class="small" style="text-align:center"><button class="link-btn" type="button">Mot de passe oublié ?</button></p>`
      : step === 1 ? `<span class="eyebrow">Étape 2 sur 2</span><h2>Code de vérification</h2><p class="muted" style="margin-top:0">Envoyé à agent.demo@exemple.ci. Il se valide tout seul.</p>
        <div class="otp">${[0, 1, 2, 3, 4, 5].map((i) => `<input type="text" inputmode="numeric" maxlength="1" data-otp="${i}" aria-label="Chiffre ${i + 1}">`).join("")}</div>
        <p class="small muted" style="text-align:center;margin-top:1rem">Démo : tapez 6 chiffres au hasard.</p>`
      : `<span class="eyebrow">Bienvenue</span><h2>Quel espace ouvrir ?</h2><p class="muted" style="margin-top:0">Vos identifiants ouvrent plusieurs espaces.</p>
        <div class="choice-cards" style="grid-template-columns:1fr">
          <button type="button" class="choice-card" data-act="space" data-r="validateur"><span class="ico">🏢</span><strong>CNPS — Validateur</strong><span class="muted small">Agences Plateau et Yopougon</span></button>
          <button type="button" class="choice-card" data-act="space" data-r="praticien"><span class="ico">🩺</span><strong>Yodan — Praticien</strong><span class="muted small">Agenda et patients</span></button>
        </div>`}
      <div class="login-foot">🛡 Connexion chiffrée (HTTPS). Code de vérification par email pour les espaces sensibles.</div>
    </div></div></div>`;
    bind(root, {
      login: () => { step = 1; draw(); },
      space: (el) => go(el.dataset.r),
      show: (el) => { const i = $("#l-pass", root); const shown = i.type === "text"; i.type = shown ? "password" : "text"; el.textContent = shown ? "Afficher" : "Masquer"; el.setAttribute("aria-label", shown ? "Afficher le mot de passe" : "Masquer le mot de passe"); },
    });
    if (step === 1) {
      const boxes = $$("[data-otp]", root);
      boxes[0].focus();
      boxes.forEach((b, i) => {
        b.addEventListener("input", () => {
          b.value = b.value.replace(/\D/g, "").slice(-1);
          if (b.value && boxes[i + 1]) boxes[i + 1].focus();
          if (boxes.every((x) => x.value)) { toast("Code vérifié"); setTimeout(() => { step = 2; draw(); }, 350); }
        });
        b.addEventListener("keydown", (e) => { if (e.key === "Backspace" && !b.value && boxes[i - 1]) boxes[i - 1].focus(); });
        b.addEventListener("paste", (e) => {
          const digits = (e.clipboardData.getData("text").match(/\d/g) || []).slice(0, 6);
          if (digits.length) { e.preventDefault(); digits.forEach((d, k) => { boxes[k].value = d; }); boxes[Math.min(digits.length, 5)].dispatchEvent(new Event("input")); }
        });
      });
    }
  };
  draw();
};

/* =====================================================================
 * Morceaux partagés : consentements, résultat, champs du questionnaire
 * ===================================================================== */
const consentsOf = (moment) => db.bilan.consents.filter((c) => c.moment === moment);
/** Pré-consentements manquants (obligatoires et non acceptés). */
const missingPre = (values) => consentsOf("pre").filter((c) => c.required && !values[c.id]);
function consentsHtml(values, moment) {
  const items = consentsOf(moment);
  if (!items.length) return "";
  return items.map((c) => `<div class="switch-row"><span>${c.type === "callback" ? "📞 " : ""}${esc(c.label)}${c.required ? ' <span class="badge b-wait">obligatoire</span>' : ""}</span><button type="button" class="toggle ${values[c.id] ? "on" : ""}" data-act="consent" data-id="${c.id}" aria-pressed="${!!values[c.id]}" aria-label="${esc(c.label)}"></button></div>`).join("");
}
function bindConsents(root, values, onChange) {
  bind(root, { consent: (el) => {
    values[el.dataset.id] = !values[el.dataset.id];
    el.classList.toggle("on", values[el.dataset.id]);
    el.setAttribute("aria-pressed", values[el.dataset.id]);
    onChange?.(db.bilan.consents.find((c) => c.id === el.dataset.id), values[el.dataset.id]);
  } });
}
/** Résultat : zone, post-consentements (enregistrés dès qu'on les touche) puis liens utiles de la zone. */
function resultHtml(zone, withPost = true) {
  const links = db.bilan.links.filter((l) => l.zones.includes(zone));
  const post = withPost ? consentsOf("post") : [];
  return `
    <div class="score z-${zone}" style="justify-content:center;text-align:center"><div><div class="small">Résultat</div><div class="n" style="font-size:1.4rem">${ZONE_LABEL[zone]}</div></div></div>
    <p>${ZONE_TEXT[zone]}</p>
    ${post.length ? `<h3>Pour aller plus loin</h3><div id="post-consents"></div><p class="small muted" style="margin-top:.3rem">Enregistré dès que vous touchez un choix.</p>` : ""}
    ${links.length ? `<h3>Ressources utiles</h3><div class="stack">${links.map((l) => `<a class="btn btn-block" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">↗ ${esc(l.label)}</a>`).join("")}</div>` : ""}`;
}
/** Branche les post-consentements dans le résultat. */
function bindPost(root, values) {
  const box = $("#post-consents", root);
  if (!box) return;
  box.innerHTML = consentsHtml(values, "post");
  bindConsents(box, values, (c, on) => toast(on ? (c.type === "callback" ? "Enregistré : un conseiller rappellera le patient." : "Choix enregistré.") : "Choix retiré."));
}
/** Écran des pré-consentements (évaluateur et patient). */
function preConsentsHtml(values, forPatient) {
  return `<h2>Avant de commencer</h2>
    <p class="muted" style="margin-top:0">${forPatient ? "Lisez et choisissez." : "Lisez ces points au patient."} Les accords marqués « obligatoire » sont nécessaires pour faire le questionnaire.</p>
    ${consentsHtml(values, "pre")}
    <div id="pre-warning"></div>
    <div class="banner banner-info" style="margin-top:1rem">🔒 Réponses confidentielles : l'employeur n'y a pas accès.</div>`;
}
function checkPre(root, values) {
  const missing = missingPre(values);
  $("#pre-warning", root).innerHTML = missing.length ? `<div class="banner banner-warn" style="margin-top:.8rem">Sans cet accord, le questionnaire ne peut pas être rempli. ${forPatientText()}</div>` : "";
  return !missing.length;
}
const forPatientText = () => "Si la personne refuse, l'évaluation s'arrête ici et rien n'est enregistré.";
/** Rendu d'un champ tel que l'évaluateur le voit (aperçu de l'admin système et formulaire). */
/** Valeurs proposées à la saisie : celles que le super admin n'a pas désactivées. */
const activeOptions = (f) => (f.options || []).filter((o) => !(f.off || []).includes(o));
function fieldInputHtml(f, prefix = "cf") {
  const id = `${prefix}-${f.key}`;
  f = { ...f, options: activeOptions(f) };
  const label = `<label for="${id}">${esc(f.label)}${f.required ? "" : ' <span class="muted small">(facultatif)</span>'}</label>`;
  if (f.type === "select") {
    return (f.options || []).length <= 3
      ? `<div class="field"><label>${esc(f.label)}</label><div class="segmented" data-seg="${id}">${(f.options || []).map((o) => `<button type="button" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div></div>`
      : `<div class="field">${label}<select id="${id}"><option value="">Choisir…</option>${(f.options || []).map((o) => `<option>${esc(o)}</option>`).join("")}</select></div>`;
  }
  if (f.type === "checkbox") return `<div class="field"><label>${esc(f.label)}</label><div style="display:flex;gap:.4rem;flex-wrap:wrap">${(f.options || []).map((o) => `<button type="button" class="role-chip" onclick="this.classList.toggle('on')">${esc(o)}</button>`).join("")}</div></div>`;
  const type = { text: "text", tel: "tel", email: "email", number: "number", date: "date" }[f.type];
  return `<div class="field">${label}<input id="${id}" type="${type}" ${f.type === "date" ? `max="${addDays(TODAY, -1)}"` : ""} ${f.min !== "" && f.min != null ? `min="${f.min}"` : ""} ${f.max !== "" && f.max != null ? `max="${f.max}"` : ""}>${f.type === "date" ? '<div class="hint">Antérieure à la date de l\'évaluation.</div>' : ""}</div>`;
}

/* =====================================================================
 * Évaluateur
 * ===================================================================== */
const ev = { step: 0, imm: "", sin: "", path: "new", identity: {}, answers: [], q: 0, fromRecap: false, origin: "evaluateur", consents: {} };
function startEvaluation(imm, origin = "evaluateur") {
  const path = imm.endsWith("2") ? "followup" : imm.endsWith("1") ? "known" : "new";
  Object.assign(ev, { step: 0, imm, path, identity: path === "new" ? { sexe: "", type: "" } : { ...KNOWN_PERSON }, answers: [], q: 0, fromRecap: false, origin, consents: {} });
  go("evaluateur", "wizard");
}
const evSteps = () => (ev.path === "followup" ? ["Dossier", "Questionnaire", "Vérification", "Résultat"] : ["Dossier", ...(consentsOf("pre").length ? ["Consentements"] : []), "Identité", "Questionnaire", "Vérification", "Résultat"]);
const evStepName = () => evSteps()[ev.step];
const evGoto = (name) => { ev.step = evSteps().indexOf(name); render(); };

RENDER.evaluateur = (root) => {
  if (state.view === "wizard") return renderEvWizard(root);
  if (state.view === "qr") return renderEvQr(root);
  return renderEvHome(root);
};

function renderEvHome(root) {
  const weekCount = db.myEvals.filter((e) => daysAgo(e.date) < 7).length;
  root.innerHTML = `${appBar("Évaluateur", "Paul Démo", agencyChip(["Agence Plateau"]))}
  <div class="page narrow">
    <div class="card">
      <h1>Nouvelle évaluation</h1>
      <p class="muted" style="margin-top:0">Saisissez le N° de la personne présente.</p>
      <form id="ev-start" class="stack">
        <input type="text" class="input-xl" id="ev-imm" placeholder="N° d'immatriculation" autocomplete="off" aria-label="N° d'immatriculation">
        <input type="text" id="ev-sin" placeholder="N° de sinistre (si le partenaire le demande)" autocomplete="off" aria-label="N° de sinistre">
        <button type="submit" class="btn btn-primary btn-lg btn-block">Commencer <span class="kbd">Entrée</span></button>
      </form>
      <p class="small muted" style="margin-bottom:0">Démo : N° finissant par <strong>1</strong> = personne connue, par <strong>2</strong> = test de suivi, sinon nouvelle personne.</p>
    </div>
    <div class="card">
      <div class="row-between"><h2 style="margin:0">Mes évaluations</h2><span class="muted small">${weekCount} cette semaine</span></div>
      <div class="toolbar" style="margin:.8rem 0 0"><input type="search" class="grow" id="ev-search" placeholder="Rechercher un nom ou un N°…" aria-label="Rechercher"><span id="ev-range"></span></div>
      <div id="ev-list"></div>
    </div>
  </div>`;
  const list = $("#ev-list", root);
  const drawList = () => {
    $("#ev-range", root).innerHTML = rangeHtml("myEvals");
    bindRange($("#ev-range", root), "myEvals", () => { resetPage("myEvals"); drawList(); });
    const q = $("#ev-search", root).value.trim().toLowerCase();
    const rows = db.myEvals.filter((e) => (!q || `${e.name} ${e.imm}`.toLowerCase().includes(q)) && inRange("myEvals", e.date)).sort((a, b) => b.date.localeCompare(a.date));
    const page = paginate("myEvals", rows);
    const groups = [["Aujourd'hui", (e) => daysAgo(e.date) === 0], ["Cette semaine", (e) => daysAgo(e.date) > 0 && daysAgo(e.date) < 7], ["Plus ancien", (e) => daysAgo(e.date) >= 7]];
    list.innerHTML = rows.length ? groups.map(([label, test]) => {
      const g = page.rows.filter(test);
      return g.length ? `<p class="small muted" style="font-weight:700;margin:.8rem 0 .3rem">${label}</p>${g.map((e) => `
        <div class="item" data-act="open" data-imm="${e.imm}" role="button" tabindex="0" style="margin-bottom:.4rem">
          <span class="t">${esc(e.name)}</span><span class="badge b-neutral">${esc(e.kind)}</span>
          <span class="s">${esc(e.imm)} · ${esc(e.mode)} · ${fmt(e.date)} · ✓ transmise</span>
        </div>`).join("")}` : "";
    }).join("") + page.html : `<div class="empty">Aucune évaluation ne correspond.</div>`;
    bindPager(list, "myEvals", drawList);
    bind(list, { open: (el) => {
      const e = db.myEvals.find((x) => x.imm === el.dataset.imm);
      drawer(e.name, `<dl class="kv"><dt>N° d'immatriculation</dt><dd>${esc(e.imm)}</dd><dt>Type</dt><dd>${esc(e.kind)}</dd><dt>Mode</dt><dd>${esc(e.mode)}</dd><dt>Transmise le</dt><dd>${fmtLong(e.date)}</dd></dl>
        <div class="banner banner-info" style="margin-top:1rem">🔒 Le résultat clinique n'est pas conservé dans la trace de l'évaluateur : seul le validateur en a besoin.</div>`);
    } });
  };
  $("#ev-search", root).addEventListener("input", () => { resetPage("myEvals"); drawList(); });
  drawList();
  $("#ev-imm", root).focus();
  $("#ev-start", root).addEventListener("submit", (e) => {
    e.preventDefault();
    const imm = $("#ev-imm", root).value.trim();
    if (!imm) { toast("Saisissez le N° d'immatriculation."); $("#ev-imm", root).focus(); return; }
    ev.sin = $("#ev-sin", root).value.trim();
    startEvaluation(imm.toUpperCase());
  });
}

function renderEvWizard(root) {
  const isVal = ev.origin === "validateur";
  root.innerHTML = `${appBar(isVal ? "Validateur" : "Évaluateur", isVal ? "Marc Démo" : "Paul Démo", `<span class="chip">Dossier ${esc(ev.imm)}</span>`)}
    <div class="page narrow"><div class="card">${stepperHtml(evSteps(), ev.step)}<div id="wz-body"></div></div>
    ${evStepName() === "Résultat" ? "" : `<p style="text-align:center"><button type="button" class="btn btn-ghost btn-sm" data-act="quit">Abandonner cette évaluation</button></p>`}</div>`;
  bind(root, { quit: () => { toast("Évaluation abandonnée : rien n'a été transmis."); exitEval(); } });
  const body = $("#wz-body", root);
  ({ Dossier: evDossier, Consentements: evConsents, Identité: evIdentity, Questionnaire: evQuestion, Vérification: evRecap, Résultat: evResult })[evStepName()](body);
}
const evNext = () => { ev.step++; render(); };
/** Après « Modifier » depuis la vérification : retour direct à la vérification. */
const evAfterEdit = () => { if (ev.fromRecap) { ev.fromRecap = false; evGoto("Vérification"); } else { evNext(); } };
const evBack = () => { ev.step = Math.max(0, ev.step - 1); render(); };
const exitEval = () => go(ev.origin, ev.origin === "validateur" ? "decide" : "home");

function evDossier(body) {
  const look = {
    new: ["🆕", "banner-info", "Nouvelle personne", "Consentements, identification puis questionnaire."],
    known: ["👤", "banner-ok", `Personne connue : ${KNOWN_PERSON.prenom} ${KNOWN_PERSON.nom}`, "Son identité est déjà enregistrée, vous vérifierez le reste."],
    followup: ["🔁", "banner-warn", `Prise en charge en cours : ${KNOWN_PERSON.prenom} ${KNOWN_PERSON.nom}`, "Test de suivi : questionnaire seul, à titre informatif."],
  }[ev.path];
  body.innerHTML = `
    <div class="lookup-result banner ${look[1]}"><span style="font-size:1.6rem">${look[0]}</span><div><strong>${esc(look[2])}</strong><br><span class="small">${esc(look[3])}</span></div></div>
    <h2>Comment le questionnaire est-il rempli ?</h2>
    <div class="choice-cards">
      <button type="button" class="choice-card" data-act="assisted"><span class="ico">🤝</span><strong>Avec le patient <span class="kbd">1</span></strong><span class="muted small">Vous remplissez ensemble sur cet écran.</span></button>
      <button type="button" class="choice-card" data-act="qr"><span class="ico">📱</span><strong>Par QR code <span class="kbd">2</span></strong><span class="muted small">Le patient remplit seul sur son téléphone (15 min, un seul appareil).</span></button>
    </div>
    <div class="wizard-foot"><button type="button" class="btn btn-ghost" data-act="change">← Changer de N°</button><span></span></div>`;
  const assisted = () => evNext();
  const qr = () => go("evaluateur", "qr");
  bind(body, { assisted, qr, change: () => exitEval() });
  state.keys = (e) => { if (e.key === "1") assisted(); if (e.key === "2") qr(); };
}

function evConsents(body) {
  body.innerHTML = `${preConsentsHtml(ev.consents, false)}
    <div class="wizard-foot"><button type="button" class="btn btn-ghost" data-act="back">← Retour</button><button type="button" class="btn btn-primary btn-lg" data-act="next">Continuer</button></div>`;
  bindConsents(body, ev.consents, () => { if ($("#pre-warning", body).innerHTML) checkPre(body, ev.consents); });
  bind(body, { back: evBack, next: () => { if (checkPre(body, ev.consents)) evAfterEdit(); } });
}

function evIdentity(body) {
  const id = ev.identity;
  const known = ev.path === "known";
  const custom = db.fields.filter((f) => f.custom);
  const seg = (key, opts) => `<div class="segmented" data-seg="${key}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" class="${id[key] === v ? "on" : ""}">${l}</button>`).join("")}</div>`;
  body.innerHTML = `
    <div class="row-between"><h2 style="margin:0">Identité</h2><span class="chip">📍 Agence Plateau (automatique)</span></div>
    ${known ? `<div class="card-flat" style="margin:1rem 0;background:var(--surface-2)">
        <div class="row-between"><strong>✓ Déjà enregistré</strong><span class="muted small">non modifiable ici</span></div>
        <div class="small" style="margin-top:.4rem">${esc(id.prenom)} ${esc(id.nom)} · ${id.sexe === "F" ? "Femme" : "Homme"} · née le ${fmt(id.naissance)}</div>
      </div>
      <p class="muted small">Vérifiez seulement ce qui peut avoir changé :</p>` : `
      <div class="grid-2" style="margin-top:1rem">
        <div class="field"><label for="i-nom">Nom</label><input id="i-nom" type="text" value="${esc(id.nom)}" data-f="nom"></div>
        <div class="field"><label for="i-prenom">Prénom</label><input id="i-prenom" type="text" value="${esc(id.prenom)}" data-f="prenom"></div>
      </div>
      <div class="grid-2">
        <div class="field"><label>Sexe</label>${seg("sexe", [["F", "Femme"], ["H", "Homme"]])}</div>
        <div class="field"><label for="i-naiss">Date de naissance</label><input id="i-naiss" type="date" value="${esc(id.naissance)}" data-f="naissance"></div>
      </div>`}
    <div class="grid-2">
      <div class="field"><label for="i-tel">Téléphone</label><input id="i-tel" type="tel" value="${esc(id.tel)}" data-f="tel"></div>
      <div class="field"><label>Type de sinistre</label>${seg("type", [["AT", "Accident du travail"], ["MP", "Maladie prof."]])}</div>
    </div>
    <div class="field" style="max-width:50%"><label for="i-acc">Date de l'accident</label><input id="i-acc" type="date" max="${addDays(TODAY, -1)}" value="${esc(id.accident)}" data-f="accident"><div class="hint">Antérieure à aujourd'hui.</div></div>
    ${custom.length ? `<h3>Autres informations</h3>${custom.map((f) => fieldInputHtml(f, "ev")).join("")}` : ""}
    <div class="wizard-foot"><button type="button" class="btn btn-ghost" data-act="back">← Retour</button><button type="button" class="btn btn-primary btn-lg" data-act="next">Continuer vers le questionnaire</button></div>`;
  $$("[data-f]", body).forEach((input) => input.addEventListener("input", () => { id[input.dataset.f] = input.value; }));
  segmented(body, (k, v) => { id[k] = v; });
  bind(body, {
    back: evBack,
    next: () => {
      const missing = ["nom", "prenom", "sexe", "type"].filter((k) => !id[k]);
      if (missing.length) { toast("Complétez nom, prénom, sexe et type de sinistre."); return; }
      evAfterEdit();
    },
  });
  (known ? $("#i-tel", body) : $("#i-nom", body)).focus();
}

function evQuestion(body) {
  const i = ev.q;
  const n = QUESTIONS.length;
  const answered = ev.answers.filter((a) => a != null).length;
  body.innerHTML = `
    <div class="row-between small muted"><span>Question ${i + 1} sur ${n}</span><span>${Math.round(answered / n * 100)} %</span></div>
    <div class="progress" style="margin:.4rem 0 1rem"><i style="width:${answered / n * 100}%"></i></div>
    <div class="question">
      <div class="idx">Au cours du dernier mois…</div>
      <p>${esc(QUESTIONS[i])}</p>
      <div class="answers">${ANSWERS.map((a, k) => `<button type="button" class="answer ${ev.answers[i] === k ? "on" : ""}" data-act="answer" data-k="${k}"><span class="k">${k}</span>${a}</button>`).join("")}</div>
    </div>
    <div class="wizard-foot">
      <button type="button" class="btn btn-ghost" data-act="prev">← ${i === 0 ? "Étape précédente" : "Question précédente"}</button>
      <span class="small muted">Touches 0 à 4 · passage automatique</span>
    </div>
    <p class="small muted" style="text-align:center">Maquette : ${n} questions (20 dans l'app réelle).</p>`;
  const choose = (k) => {
    ev.answers[i] = k;
    $$(".answer", body).forEach((b) => b.classList.toggle("on", +b.dataset.k === k));
    setTimeout(() => {
      if (ev.fromRecap) { ev.fromRecap = false; evGoto("Vérification"); return; }
      if (i < n - 1) { ev.q++; render(); } else { evNext(); }
    }, 220);
  };
  bind(body, {
    answer: (el) => choose(+el.dataset.k),
    prev: () => { if (i === 0) evBack(); else { ev.q--; render(); } },
  });
  state.keys = (e) => { if (/^[0-4]$/.test(e.key)) choose(+e.key); if (e.key === "Backspace" && i > 0) { ev.q--; render(); } };
}

function evRecap(body) {
  const id = ev.identity;
  const missing = QUESTIONS.map((_, i) => i).filter((i) => ev.answers[i] == null);
  const accepted = consentsOf("pre").filter((c) => ev.consents[c.id]);
  body.innerHTML = `
    <h2>Vérification avant envoi</h2>
    ${ev.path !== "followup" ? `<div class="card-flat" style="background:var(--surface-2)"><div class="row-between"><strong>${esc(id.prenom)} ${esc(id.nom)}</strong><button class="link-btn" type="button" data-act="edit-id">Modifier</button></div>
      <div class="small muted">${esc(ev.imm)}${ev.sin ? ` · ${esc(ev.sin)}` : ""} · ${id.type === "MP" ? "Maladie professionnelle" : "Accident du travail"} · tél. ${esc(id.tel || "—")}</div>
      <div class="row-between small" style="margin-top:.4rem"><span>Pré-consentements : ${accepted.length ? `${accepted.length} accepté${accepted.length > 1 ? "s" : ""}` : "aucun"}</span>${consentsOf("pre").length ? '<button class="link-btn" type="button" data-act="edit-consents">Modifier</button>' : ""}</div></div>` : ""}
    <div class="recap-list" style="margin-top:1rem">${QUESTIONS.map((q, i) => `<div class="recap-row"><span>${i + 1}. ${esc(q)}</span><span style="white-space:nowrap"><strong>${ev.answers[i] != null ? ANSWERS[ev.answers[i]] : "<span style='color:var(--danger)'>Sans réponse</span>"}</strong> <button class="link-btn" type="button" data-act="edit-q" data-i="${i}">Modifier</button></span></div>`).join("")}</div>
    <div class="wizard-foot"><button type="button" class="btn btn-ghost" data-act="back">← Retour</button>
      <button type="button" class="btn btn-primary btn-lg" data-act="send" ${missing.length ? "disabled" : ""}>Transmettre et voir le résultat</button></div>`;
  bind(body, {
    back: () => { ev.q = QUESTIONS.length - 1; evBack(); },
    "edit-id": () => { ev.fromRecap = true; evGoto("Identité"); },
    "edit-consents": () => { ev.fromRecap = true; evGoto("Consentements"); },
    "edit-q": (el) => { ev.q = +el.dataset.i; ev.fromRecap = true; evGoto("Questionnaire"); },
    send: () => {
      db.myEvals.unshift({ name: `${id.prenom} ${id.nom}`, imm: ev.imm, date: TODAY, mode: "Avec le patient", kind: ev.path === "followup" ? "Suivi" : "Initiale" });
      evNext();
    },
  });
}

function evResult(body) {
  const zone = zoneOf(scoreOf(ev.answers));
  body.innerHTML = `
    <div class="banner banner-ok">✓ ${ev.path === "followup" ? "Test de suivi enregistré" : "Dossier transmis"} — résultat à montrer au patient</div>
    <div style="margin-top:1rem">${resultHtml(zone, ev.path !== "followup")}</div>
    <div class="wizard-foot"><button type="button" class="btn btn-ghost" data-act="finish">Terminer</button>
      <button type="button" class="btn btn-primary btn-lg" data-act="again">+ Nouvelle évaluation</button></div>`;
  bindPost(body, ev.consents);
  bind(body, {
    finish: () => exitEval(),
    again: () => { if (ev.origin === "validateur") { go("validateur"); toast("Utilisez « + Nouvelle évaluation »."); } else { go("evaluateur", "home"); } },
  });
}

function renderEvQr(root) {
  let left = 15 * 60;
  root.innerHTML = `${appBar("Évaluateur", "Paul Démo", `<span class="chip">Dossier ${esc(ev.imm)}</span>`)}
  <div class="page narrow"><div class="card" style="text-align:center">
    <h1>Faites scanner ce code au patient</h1>
    <p class="muted">Il donne ses consentements, répond, puis voit son résultat sur son téléphone.</p>
    ${fakeQr(ev.imm.length * 13)}
    <p style="margin-top:1rem"><span class="badge b-wait" id="qr-status">⏳ En attente du patient…</span></p>
    <p class="small muted">Expire dans <strong id="qr-left">15:00</strong></p>
    <div class="wizard-foot" style="justify-content:center">
      <button type="button" class="btn btn-ghost" data-act="cancel">Annuler</button>
      <button type="button" class="btn btn-primary" data-act="done">Démo : le patient a terminé</button>
    </div>
    <p class="small"><button type="button" class="link-btn" onclick="go('patient')">Voir l'écran du patient →</button></p>
  </div></div>`;
  state.timer = setInterval(() => {
    left--;
    const el = $("#qr-left");
    if (el) el.textContent = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  }, 1000);
  bind(root, {
    cancel: () => exitEval(),
    done: () => {
      $("#qr-status").className = "badge b-ok";
      $("#qr-status").textContent = "✓ Transmis — le patient voit son résultat sur son téléphone";
      db.myEvals.unshift({ name: ev.path === "new" ? "Nouvelle personne" : `${KNOWN_PERSON.prenom} ${KNOWN_PERSON.nom}`, imm: ev.imm, date: TODAY, mode: "QR code", kind: ev.path === "followup" ? "Suivi" : "Initiale" });
      stopTimers();
      state.timer = setTimeout(() => { toast("Évaluation par QR code reçue."); exitEval(); }, 1200);
    },
  });
}

/* =====================================================================
 * Files de travail (validateur, superviseur) — liste + détail
 * ===================================================================== */
const displayName = (item, hidden) => (hidden ? `Dossier ${item.imm}` : item.name);
const DECISION_BADGE = {
  YES: ["b-ok", "Prise en charge"], NO: ["b-no", "Pas de prise en charge"], AUTO_YES: ["b-ok", "Prise en charge (auto)"], AUTO_NO: ["b-neutral", "Pas de prise en charge (auto)"],
};

/** Sur PC : liste à gauche, détail à droite. Sur mobile : liste, puis détail plein écran avec retour. */
function inboxInto(root, cfg) {
  const source = cfg.items();
  if (!source.length) { root.innerHTML = `<div class="card empty"><div class="big">🎉</div><p><strong>Rien à faire ici.</strong></p><p>${cfg.empty}</p></div>`; return; }
  // Recherche (nom ou N° ; N° seul si l'identité est masquée) puis pagination de la file.
  const q = norm(cfg.state.q || "").trim();
  const items = source.filter((it) => !q || norm(cfg.hidden ? it.imm : `${it.name} ${it.imm}`).includes(q));
  const pagerKey = `inbox-${cfg.key}`;
  const page = paginate(pagerKey, items);
  const ready = items.filter((x) => x.ready !== false);
  const sel = items.find((x) => x.id === cfg.state.sel) || ready[0] || items[0];
  cfg.state.sel = sel?.id ?? null;
  const search = `<input type="search" data-inbox-q value="${esc(cfg.state.q || "")}" placeholder="Rechercher ${cfg.hidden ? "un N°" : "un nom ou un N°"}…" aria-label="Rechercher dans la file" style="margin-bottom:.5rem">`;
  const rows = page.rows.map((it) => `<div class="item ${it.id === sel?.id && !isMobile() ? "on" : ""}" data-act="pick" data-id="${it.id}" role="button" tabindex="0" ${it.ready === false ? 'style="opacity:.6"' : ""}>${cfg.row(it)}</div>`).join("");
  const listHtml = `<div class="inbox-col">${search}<div class="inbox-list">${rows || `<div class="empty small">Aucun dossier ne correspond.</div>`}</div>${page.html}</div>`;
  const wire = () => {
    const input = $("[data-inbox-q]", root);
    input?.addEventListener("input", () => {
      cfg.state.q = input.value; resetPage(pagerKey); cfg.state.sel = null;
      const pos = input.selectionStart;
      inboxInto(root, cfg);
      const again = $("[data-inbox-q]", root); again?.focus(); again?.setSelectionRange(pos, pos);
    });
    bindPager(root, pagerKey, () => inboxInto(root, cfg));
  };
  if (isMobile() && !cfg.state.open) {
    root.innerHTML = listHtml;
    bind(root, { pick: (el) => { cfg.state.sel = el.dataset.id; cfg.state.open = true; inboxInto(root, cfg); } });
    wire();
    return;
  }
  if (!sel) {
    root.innerHTML = isMobile() ? listHtml : `<div class="inbox">${listHtml}<div class="card detail empty">Aucun dossier ne correspond à la recherche.</div></div>`;
    wire();
    return;
  }
  if (isMobile()) {
    root.innerHTML = `<div class="row-between" style="margin-bottom:.6rem"><button type="button" class="btn btn-ghost btn-sm" data-act="list">← Liste</button><span class="small muted">${items.indexOf(sel) + 1} / ${items.length}</span></div><div class="card detail" id="inbox-detail"></div>`;
    bind(root, { list: () => { cfg.state.open = false; inboxInto(root, cfg); } });
  } else {
    root.innerHTML = `<div class="inbox">${listHtml}<div class="card detail" id="inbox-detail"></div></div>`;
    bind(root, { pick: (el) => { cfg.state.sel = el.dataset.id; inboxInto(root, cfg); } });
    wire();
  }
  cfg.detail($("#inbox-detail", root), sel);
}

function decideRow(it, hidden) {
  return `<span class="t">${esc(displayName(it, hidden))}</span><span class="badge z-${it.zone}">${it.score}/80</span>
    <span class="s">📍 ${esc(short(it.agency))} · évalué ${rel(it.date)}${it.late ? " · <strong style='color:var(--danger)'>en retard</strong>" : ""}</span>`;
}
function decideDetail(el, it, ctx) {
  const answers = answersFor(it.score);
  el.innerHTML = `
    <div class="row-between"><div><h2 style="margin:0">${esc(displayName(it, ctx.hidden))}</h2><span class="muted small">${esc(it.agency)} · évalué par ${esc(it.evaluator)} · ${fmtLong(it.date)}</span></div><span class="badge z-${it.zone}">${ZONE_LABEL[it.zone]}</span></div>
    <div class="score z-${it.zone}"><div class="n">${it.score}<span class="small">/80</span></div><div class="score-bar" aria-hidden="true"><i style="left:${it.score / 80 * 100}%"></i></div></div>
    <dl class="kv"><dt>N° d'immatriculation</dt><dd>${esc(it.imm)}</dd><dt>N° de sinistre</dt><dd>${esc(it.sin || "—")}</dd><dt>Type</dt><dd>${esc(it.type)}</dd><dt>Décision possible jusqu'au</dt><dd>${fmtLong(it.closes)}</dd></dl>
    <details><summary>Voir les réponses au questionnaire</summary><div class="recap-list">${QUESTIONS.map((q, i) => `<div class="recap-row"><span>${esc(q)}</span><strong>${ANSWERS[answers[i]]}</strong></div>`).join("")}</div></details>
    <div id="comment-box" ${ctx.state.comment ? "" : "hidden"} class="field" style="margin-top:.6rem"><label for="d-comment">Commentaire (facultatif)</label><textarea id="d-comment" rows="2" placeholder="Motif, éléments utiles au suivi…"></textarea></div>
    ${ctx.state.comment ? "" : `<button type="button" class="link-btn small" data-act="comment">+ Ajouter un commentaire</button>`}
    <div class="decide">
      <button type="button" class="btn btn-success" data-act="yes">✓ Prise en charge <span class="kbd">O</span></button>
      <button type="button" class="btn btn-danger" data-act="no">✕ Pas de prise en charge <span class="kbd">N</span></button>
    </div>
    <p style="text-align:center;margin:.6rem 0 0"><button type="button" class="btn btn-ghost btn-sm" data-act="later">Décider plus tard (fin de file)</button></p>`;
  const resolve = (decision) => {
    const idx = db.decide.indexOf(it);
    db.decide.splice(idx, 1);
    db.done.unshift({ imm: it.imm, name: it.name, zone: it.zone, decision, date: TODAY, by: ctx.hidden ? "Superviseur" : "Vous", agency: it.agency });
    ctx.state.sel = null;
    ctx.state.comment = false;
    toast(`${DECISION_BADGE[decision][1]} — ${esc(displayName(it, ctx.hidden))}`, () => { db.done.shift(); db.decide.splice(idx, 0, it); ctx.state.sel = it.id; render(); });
    render();
  };
  bind(el, {
    comment: (btn) => { ctx.state.comment = true; $("#comment-box", el).hidden = false; $("#d-comment", el).focus(); btn.remove(); },
    yes: () => resolve("YES"),
    no: () => resolve("NO"),
    later: () => { db.decide.push(db.decide.splice(db.decide.indexOf(it), 1)[0]); ctx.state.sel = null; toast("Dossier remis en fin de file."); render(); },
  });
  state.keys = (e) => { if (e.key.toLowerCase() === "o") resolve("YES"); if (e.key.toLowerCase() === "n") resolve("NO"); };
}

function attestationStep(d, name) {
  return {
    label: "Attestation",
    html: () => `
      <h3>Où se déroulent les séances de ${esc(name)} ?</h3>
      <div class="segmented full" data-seg="kind"><button type="button" data-v="ONLINE" class="${d.kind !== "IN_PERSON" ? "on" : ""}">💻 En ligne</button><button type="button" data-v="IN_PERSON" class="${d.kind === "IN_PERSON" ? "on" : ""}">🏢 En présentiel</button></div>
      ${d.kind === "IN_PERSON" ? `<div class="field" style="margin-top:.8rem"><label for="att-ag">Agence des séances</label><select id="att-ag">${AGENCIES.map((a) => `<option ${a === d.agency ? "selected" : ""}>${a}</option>`).join("")}</select><div class="hint">Présélectionnée : agence du dossier.</div></div>` : ""}
      <p class="small" style="margin-top:1rem">Valable jusqu'au <strong>${fmtLong(d.until)}</strong> <span class="muted">(3 mois, durée habituelle)</span> · <button type="button" class="link-btn" data-act="edit-until">modifier</button></p>
      <div class="field" id="until-box" hidden><input type="date" id="att-until" value="${d.until}" aria-label="Valable jusqu'au"></div>
      <div class="wizard-foot"><span></span><button type="button" class="btn btn-primary btn-lg" data-act="emit">Émettre l'attestation</button></div>`,
    bind: (root, api) => {
      segmented(root, (k, v) => { d.kind = v; api.redraw(); });
      bind(root, {
        "edit-until": () => { $("#until-box", root).hidden = false; $("#att-until", root).focus(); },
        emit: () => { const u = $("#att-until", root); if (u?.value) d.until = u.value; d.token = token(); api.next(); },
      });
    },
  };
}
function linkStep(d, name, onDone) {
  return {
    label: "Envoi du lien",
    html: () => `
      <div class="banner banner-ok">✓ Prise en charge activée pour <strong>&nbsp;${esc(name)}</strong></div>
      <div class="field" style="margin-top:1rem"><label for="att-link">Lien de l'attestation à envoyer au patient</label>
        <div style="display:flex;gap:.5rem"><input type="text" id="att-link" readonly value="https://pec.exemple.ci/att/${d.token}"><button type="button" class="btn btn-primary" data-act="copy">Copier</button></div>
        <div class="hint">Affiché une seule fois. Le lien ne contient aucune donnée de santé.</div></div>
      <div class="grid-2"><a class="btn" href="sms:?body=${encodeURIComponent("Votre attestation : https://pec.exemple.ci/att/" + d.token)}">✉️ Par SMS</a><a class="btn" href="mailto:?subject=Attestation&body=${encodeURIComponent("https://pec.exemple.ci/att/" + d.token)}">📧 Par email</a></div>
      <div class="wizard-foot"><span></span><button type="button" class="btn btn-primary btn-lg" data-act="finish">Terminé → dossier suivant</button></div>`,
    bind: (root) => bind(root, {
      copy: (el) => { navigator.clipboard?.writeText($("#att-link", root).value).catch(() => {}); el.textContent = "✓ Copié"; },
      finish: onDone,
    }),
  };
}

function callbackRow(it, hidden) {
  return `<span class="t">${esc(displayName(it, hidden))}</span><span class="badge ${it.consent ? "b-info" : "b-wait"}">${it.consent ? "Accord attendu" : "Rappel"}</span>
    <span class="s">📍 ${esc(short(it.agency))} · demandé ${rel(it.requested)}${it.attempts ? ` · ${it.attempts} tentative${it.attempts > 1 ? "s" : ""}` : ""}</span>`;
}
function callbackDetail(el, it, ctx) {
  const removeAndNext = (msg) => { db.callbacks.splice(db.callbacks.indexOf(it), 1); ctx.state.sel = null; toast(msg); render(); };
  el.innerHTML = `
    <div class="row-between"><h2 style="margin:0">${esc(displayName(it, ctx.hidden))}</h2><span class="badge z-${it.zone}">${ZONE_SHORT[it.zone]}</span></div>
    <p class="muted small">${esc(it.agency)} · ${it.consent ? "agence non assureur : l'accord du patient est nécessaire pour démarrer." : `a demandé à être rappelé ${rel(it.requested)}.`}</p>
    <a class="btn btn-primary btn-lg btn-block" href="tel:${it.phone.replace(/\s/g, "")}">📞 Appeler ${esc(it.phone)}</a>
    <h3 style="margin-top:1.2rem">Choix du patient avec son résultat (post-consentements)</h3>
    <ul class="small">${it.contents.map(([l, v]) => `<li>${esc(l)} : <strong>${v ? "oui" : "non"}</strong></li>`).join("")}</ul>
    <h3>Issue de l'appel</h3>
    <div class="choice-cards">
      ${it.consent ? `<button type="button" class="choice-card" data-act="accept"><span class="ico">👍</span><strong>Il accepte</strong><span class="muted small">On émet l'attestation.</span></button>`
        : `<button type="button" class="choice-card" data-act="done"><span class="ico">✓</span><strong>Rappel fait</strong></button>`}
      ${it.consent ? `<button type="button" class="choice-card" data-act="refuse"><span class="ico">👎</span><strong>Il refuse</strong><span class="muted small">Le dossier sera clos.</span></button>` : ""}
      <button type="button" class="choice-card" data-act="unreachable"><span class="ico">📵</span><strong>Injoignable</strong><span class="muted small">Reste dans la liste.</span></button>
    </div>`;
  bind(el, {
    done: () => removeAndNext("Rappel enregistré."),
    unreachable: () => { it.attempts++; db.callbacks.push(db.callbacks.splice(db.callbacks.indexOf(it), 1)[0]); ctx.state.sel = null; toast(`Tentative n° ${it.attempts} notée.`); render(); },
    refuse: (btn) => {
      if (btn.dataset.armed) { removeAndNext("Refus enregistré : dossier clos."); return; }
      btn.dataset.armed = "1";
      btn.innerHTML = `<span class="ico">⚠️</span><strong>Confirmer le refus</strong><span class="muted small">Cliquez encore pour clore le dossier.</span>`;
      btn.style.borderColor = "var(--danger)";
    },
    accept: () => {
      const d = { kind: "ONLINE", until: addMonths(TODAY, 3), agency: it.agency };
      el.innerHTML = `<h2>${esc(displayName(it, ctx.hidden))} accepte</h2><div id="cb-wz"></div>`;
      runWizard($("#cb-wz", el), [attestationStep(d, displayName(it, ctx.hidden)), linkStep(d, displayName(it, ctx.hidden), () => removeAndNext("Prise en charge activée."))], d);
    },
  });
}

function activateRow(it, hidden) {
  return `<span class="t">${esc(displayName(it, hidden))}</span>${it.ready ? `<span class="badge b-info">${insurer() ? "Bon + attestation" : "Attestation"}</span>` : `<span class="badge b-neutral">le ${fmt(it.availableAt)}</span>`}
    <span class="s">📍 ${esc(short(it.agency))} · validée ${rel(it.since)}</span>`;
}
function activateDetail(el, it, ctx) {
  const name = displayName(it, ctx.hidden);
  if (!it.ready) {
    el.innerHTML = `<h2>${esc(name)}</h2><div class="banner banner-info">⏳ Délai de recours en cours. Activation possible à partir du <strong>&nbsp;${fmtLong(it.availableAt)}</strong>. Le dossier remontera tout seul.</div>`;
    return;
  }
  const d = { kind: "ONLINE", until: addMonths(TODAY, 3), file: null, agency: it.agency };
  const done = () => { db.activate.splice(db.activate.indexOf(it), 1); ctx.state.sel = null; toast("Prise en charge activée."); render(); };
  const voucher = {
    label: "Bon",
    html: () => `<h3>Bon de prise en charge de ${esc(name)}</h3>
      ${d.file ? `<div class="card-flat row-between"><div><strong>📄 ${esc(d.file)}</strong><div class="small muted">PDF · 1 page · 240 Ko</div></div><button type="button" class="link-btn" data-act="pick">Changer</button></div>
        <div class="banner banner-warn" style="margin-top:1rem">Après l'envoi, le bon part chez Yodan et vous ne pourrez plus l'ouvrir. Vérifiez qu'il s'agit du bon document.</div>`
      : `<button type="button" class="choice-card" data-act="pick" style="width:100%;align-items:center;text-align:center;border-style:dashed;padding:2rem"><span class="ico">⬆️</span><strong>Déposer le bon ici</strong><span class="muted small">ou ${isMobile() ? "prendre une photo" : "cliquer pour choisir"} · PDF, JPG, PNG · 10 Mo max.</span></button>`}
      <div class="wizard-foot"><span></span><button type="button" class="btn btn-primary btn-lg" data-act="send" ${d.file ? "" : "disabled"}>Envoyer le bon à Yodan</button></div>`,
    bind: (root, api) => bind(root, {
      pick: () => { d.file = `bon_${it.imm}.pdf`; api.redraw(); },
      send: () => { toast("Bon transmis à Yodan."); api.next(); },
    }),
  };
  el.innerHTML = `<div id="act-wz"></div>`;
  runWizard($("#act-wz", el), [...(insurer() ? [voucher] : []), attestationStep(d, name), linkStep(d, name, done)], d);
}

/** Filtre d'agence en 1 clic pour les personnes qui couvrent plusieurs agences. */
function agencyFilterHtml(list, current, counts) {
  return `<div class="segmented" data-seg="agency" style="margin-bottom:1rem">${["", ...list].map((a) => `<button type="button" data-v="${a}" class="${current === a ? "on" : ""}">${a ? short(a) : "Toutes"}${counts ? ` (${counts(a)})` : ""}</button>`).join("")}</div>`;
}

/* =====================================================================
 * Validateur (plusieurs agences)
 * ===================================================================== */
const vaState = { agency: "", decide: { sel: null, comment: false, open: false }, callbacks: { sel: null, open: false }, activate: { sel: null, open: false } };
const vaScope = (list) => list.filter((x) => !vaState.agency || x.agency === vaState.agency);
RENDER.validateur = (root) => {
  const v = state.view;
  const greet = `${db.decide.length} à décider · ${callbackList().length} à appeler · ${db.activate.filter((a) => a.ready).length} à activer`;
  root.innerHTML = `${appBar("Validateur", "Marc Démo", `${agencyChip(MY_AGENCIES)}<button type="button" class="btn btn-sm" data-act="new-eval">+ Évaluation</button>`)}
  <div class="page">
    <div style="margin-bottom:1rem"><h1 style="margin:0">Bonjour Marc</h1><span class="muted">${greet} · ${MY_AGENCIES.map(short).join(" et ")}</span>
      <div class="small muted" style="margin-top:.3rem">Partenaire <strong>${TYPE_LABEL[partner().type].toLowerCase()}</strong> · <button type="button" class="link-btn small" data-act="demo-type">Démo : passer en ${insurer() ? "non assureur" : "assureur"}</button></div></div>
    ${tabsHtml([
      { id: "decide", label: "À décider", count: db.decide.length, hot: true },
      { id: "callbacks", label: "À appeler", count: callbackList().length, hot: true },
      { id: "activate", label: "À activer", count: db.activate.filter((a) => a.ready).length, hot: true },
      { id: "done", label: "Traités" },
    ], v)}
    <div id="va-agency"></div>
    <div id="va-body"></div>
  </div>`;
  bindTabs(root);
  bind(root, { "demo-type": () => { setPartnerType(partner(), insurer() ? "non_assureur" : "assureur"); toast(`Démo : partenaire ${TYPE_LABEL[partner().type].toLowerCase()} (réglé normalement par l'admin système).`); render(); } });
  bind(root, { "new-eval": () => { drawer("Nouvelle évaluation", `<form id="va-ev" class="stack"><input type="text" class="input-xl" id="va-imm" placeholder="N° d'immatriculation" aria-label="N° d'immatriculation"><button class="btn btn-primary btn-block btn-lg">Commencer</button></form><p class="small muted">Même assistant que l'évaluateur.</p>`, (body, close) => { $("#va-imm", body).focus(); $("#va-ev", body).addEventListener("submit", (e) => { e.preventDefault(); const imm = $("#va-imm", body).value.trim(); if (!imm) return; close(); startEvaluation(imm.toUpperCase(), "validateur"); }); }); } });
  const body = $("#va-body", root);
  const source = { decide: () => db.decide, callbacks: callbackList, activate: () => db.activate, done: () => db.done }[v];
  $("#va-agency", root).innerHTML = agencyFilterHtml(MY_AGENCIES, vaState.agency, (a) => source().filter((x) => (!a || x.agency === a) && (v !== "activate" || x.ready)).length);
  segmented($("#va-agency", root), (k, val) => { vaState.agency = val; Object.values(vaState).forEach((s) => { if (s && typeof s === "object") { s.sel = null; s.open = false; } }); render(); });
  if (v === "done") return renderDone(body, false, vaScope);
  const cfgs = {
    decide: { items: () => vaScope(db.decide), row: (it) => decideRow(it, false), detail: (el, it) => decideDetail(el, it, { hidden: false, state: vaState.decide }), empty: "Les dossiers verts et rouges sont décidés automatiquement. Seuls les cas orange arrivent ici." },
    callbacks: { items: () => vaScope(callbackList()), row: (it) => callbackRow(it, false), detail: (el, it) => callbackDetail(el, it, { hidden: false, state: vaState.callbacks }), empty: "Aucun patient à rappeler." },
    activate: { items: () => vaScope([...db.activate]).sort((a, b) => (b.ready === true) - (a.ready === true)), row: (it) => activateRow(it, false), detail: (el, it) => activateDetail(el, it, { hidden: false, state: vaState.activate }), empty: "Aucune prise en charge à activer." },
  };
  inboxInto(body, { ...cfgs[v], key: v, state: vaState[v] });
};

function renderDone(body, hidden, scope = (x) => x) {
  body.innerHTML = `<div class="card"><div class="toolbar"><input type="search" class="grow" id="done-q" placeholder="Rechercher un ${hidden ? "N°" : "nom ou un N°"}…" aria-label="Rechercher"><span id="done-range"></span></div>
    <table class="table"><thead><tr><th>Dossier</th><th>Agence</th><th>Résultat</th><th>Décision</th><th>Par</th><th>Date</th></tr></thead><tbody id="done-tb"></tbody></table><div id="done-pager"></div></div>`;
  const draw = () => {
    $("#done-range", body).innerHTML = rangeHtml("done");
    bindRange($("#done-range", body), "done", () => { resetPage("done"); draw(); });
    const q = $("#done-q", body).value.trim().toLowerCase();
    const page = paginate("done", scope(db.done).filter((d) => (!q || `${hidden ? "" : d.name} ${d.imm}`.toLowerCase().includes(q)) && inRange("done", d.date)).sort((a, b) => b.date.localeCompare(a.date)));
    $("#done-pager", body).innerHTML = page.html;
    bindPager(body, "done", draw);
    $("#done-tb", body).innerHTML = page.rows.map((d) => `<tr>
      <td><strong>${esc(displayName(d, hidden))}</strong>${hidden ? "" : `<div class="small muted">${esc(d.imm)}</div>`}</td><td class="small">${esc(short(d.agency))}</td>
      <td><span class="badge z-${d.zone}">${ZONE_SHORT[d.zone]}</span></td><td><span class="badge ${DECISION_BADGE[d.decision][0]}">${DECISION_BADGE[d.decision][1]}</span></td>
      <td class="small">${esc(d.by)}</td><td class="small">${fmt(d.date)}</td></tr>`).join("") || `<tr><td colspan="6" class="empty">Aucun dossier.</td></tr>`;
  };
  $("#done-q", body).addEventListener("input", () => { resetPage("done"); draw(); });
  draw();
}

/* =====================================================================
 * Pilotage : période, histogramme, tuiles (superviseur, administrateur, super admin)
 * ===================================================================== */
const pil = { period: "Mois", range: null, rangeOpen: false, offset: 0, filters: [], agency: "", dim: "decision", scale: "n", table: false };
const DIMS = {
  decision: [["Prise en charge", "#2a9d8f"], ["En attente", "#e9a03b"], ["Pas de prise en charge", "#c4504a"]],
  zone: [["Sous le seuil", "#2a9d8f"], ["Modéré", "#e9a03b"], ["Significatif", "#c4504a"]],
};
const SCOPE_FACTOR = { agences: 2.2, reseau: 4.5 };
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function seeded(str) {
  let x = 2166136261;
  for (const c of str) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); }
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1000) / 1000; };
}
/** Colonnes de l'histogramme : jours, semaines ou mois selon la période. */
function buckets() {
  const out = [];
  const pushDays = (from, to, weekday) => { for (let d = from; d <= to; d = addDays(d, 1)) out.push({ from: d, to: d, unit: "day", label: weekday ? D(d).toLocaleDateString("fr-FR", { weekday: "short" }) : String(+d.slice(8)), long: fmtLong(d) }); };
  const pushWeeks = (from, to) => { for (let w = monday(from); w <= to; w = addDays(w, 7)) { const f = w < from ? from : w; const e = addDays(w, 6); out.push({ from: f, to: e > to ? to : e, unit: "week", label: fmt(f), long: `Semaine du ${fmtLong(f)}` }); } };
  const pushMonths = (from, to) => {
    let d = D(from); d = new Date(d.getFullYear(), d.getMonth(), 1, 12);
    while (ymdOf(d) <= to) {
      const f = ymdOf(d); const e = ymdOf(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12));
      out.push({ from: f < from ? from : f, to: e > to ? to : e, unit: "month", label: MONTHS[d.getMonth()], long: d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) });
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1, 12);
    }
  };
  let title;
  const t = D(TODAY);
  if (pil.range) {
    const { from, to } = pil.range;
    const n = diffDays(from, to) + 1;
    (n <= 31 ? pushDays : n <= 120 ? pushWeeks : pushMonths)(from, to);
    title = `Du ${fmt(from)} au ${fmt(to)}`;
  } else if (pil.period === "Semaine") {
    const m = addDays(monday(TODAY), 7 * pil.offset); pushDays(m, addDays(m, 6), true); title = `Semaine du ${fmt(m)}`;
  } else if (pil.period === "Mois") {
    const b = new Date(t.getFullYear(), t.getMonth() + pil.offset, 1, 12);
    pushDays(ymdOf(b), ymdOf(new Date(b.getFullYear(), b.getMonth() + 1, 0, 12))); title = b.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  } else if (pil.period === "Trimestre") {
    const b = new Date(t.getFullYear(), 3 * Math.floor(t.getMonth() / 3) + 3 * pil.offset, 1, 12);
    pushWeeks(ymdOf(b), ymdOf(new Date(b.getFullYear(), b.getMonth() + 3, 0, 12))); title = `T${Math.floor(b.getMonth() / 3) + 1} ${b.getFullYear()}`;
  } else {
    const y = t.getFullYear() + pil.offset; pushMonths(`${y}-01-01`, `${y}-12-31`); title = String(y);
  }
  return { list: out, title };
}
/** Valeurs simulées par catégorie (null = période future). Mêmes totaux quel que soit l'axe choisi. */
function bucketValues(b, dim, scope) {
  if (b.from > TODAY) return null;
  const to = b.to > TODAY ? TODAY : b.to;
  const r = seeded(`${b.from}${to}${pil.agency}${scope}${pil.filters.length}`);
  const days = diffDays(b.from, to) + 1;
  const weekend = b.unit === "day" && [0, 6].includes(D(b.from).getDay());
  const agencyShare = pil.agency ? 0.5 : 1;
  const total = Math.round(days * (weekend ? 0.6 : 4) * SCOPE_FACTOR[scope] * agencyShare * Math.pow(0.45, pil.filters.length) * (0.45 + r() * 1.1));
  const base = dim === "zone" ? [0.46, 0.33, 0.21] : [0.43, 0.19, 0.38];
  const w = base.map((s) => s * (0.75 + r() * 0.5));
  const sum = w.reduce((a, c) => a + c, 0);
  const vals = w.map((s) => Math.floor(total * s / sum));
  vals[0] += total - vals.reduce((a, c) => a + c, 0);
  return vals;
}
const masked = (n) => (n < 5 ? "< 5" : n);
const niceMax = (v) => { if (v <= 5) return 5; const p = Math.pow(10, Math.floor(Math.log10(v))); const m = v / p; return (m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };
const roundTop = (x, y, w, hh, r) => { const rr = Math.min(r, hh, w / 2); return `M${x},${y + hh}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + hh}Z`; };

function histogramSvg(cols, cats, minN = 5) {
  const W = 680, H = 250, ml = 36, mr = 8, mt = 12, mb = 28, pw = W - ml - mr, ph = H - mt - mb;
  const max = pil.scale === "pct" ? 100 : niceMax(Math.max(1, ...cols.map((c) => (c.vals ? c.total : 0))));
  const bw = pw / cols.length;
  const barW = Math.max(3, Math.min(44, bw * 0.66));
  const every = Math.ceil(cols.length / (isMobile() ? 6 : 12));
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Histogramme empilé des évaluations">`;
  [0, 0.5, 1].forEach((g) => {
    const y = mt + ph - g * ph;
    s += `<line x1="${ml}" x2="${W - mr}" y1="${y}" y2="${y}" stroke="#e1e6ea" stroke-width="1"/><text x="${ml - 6}" y="${y + 4}" text-anchor="end" font-size="11" fill="#64737e">${pil.scale === "pct" ? `${g * 100} %` : Math.round(g * max)}</text>`;
  });
  cols.forEach((c, i) => {
    const x = ml + i * bw + (bw - barW) / 2;
    s += `<g class="col" data-i="${i}">`;
    if (c.vals && c.total >= minN) {
      let y = mt + ph;
      const parts = c.vals.map((v, k) => ({ v, k })).filter((p) => p.v > 0);
      parts.forEach((p, j) => {
        const val = pil.scale === "pct" ? p.v / c.total * 100 : p.v;
        let hh = val / max * ph;
        const gap = j > 0 ? 2 : 0;
        y -= hh;
        hh -= gap;
        if (hh <= 0) return;
        s += j === parts.length - 1
          ? `<path d="${roundTop(x, y, barW, hh, 4)}" fill="${cats[p.k][1]}"/>`
          : `<rect x="${x}" y="${y}" width="${barW}" height="${hh}" fill="${cats[p.k][1]}"/>`;
      });
    } else if (c.vals && c.total > 0) {
      const hh = 18;
      s += `<rect x="${x}" y="${mt + ph - hh}" width="${barW}" height="${hh}" rx="3" fill="url(#hatch)" stroke="#c3ccd3"/>`;
    }
    s += `</g>`;
    if (i % every === 0) s += `<text x="${x + barW / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#64737e">${esc(c.label)}</text>`;
    s += `<rect class="hit" data-i="${i}" x="${ml + i * bw}" y="${mt}" width="${bw}" height="${ph}"/>`;
  });
  s += `<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#f4f6f8"/><line x1="0" y1="0" x2="0" y2="6" stroke="#c3ccd3" stroke-width="2"/></pattern></defs></svg>`;
  return s;
}

function periodHtml() {
  return `<div class="toolbar" style="margin-bottom:.6rem">
    <div class="segmented" data-seg="period">${["Semaine", "Mois", "Trimestre", "Année"].map((p) => `<button type="button" data-v="${p}" class="${!pil.range && pil.period === p ? "on" : ""}">${p}</button>`).join("")}</div>
    ${pil.rangeOpen
      ? `<span class="range"><input type="date" id="pr-from" value="${pil.range?.from || ""}" aria-label="Du"> → <input type="date" id="pr-to" value="${pil.range?.to || ""}" aria-label="Au"><button type="button" class="btn btn-primary btn-sm" data-act="range-apply">Appliquer</button><button type="button" class="btn btn-ghost btn-sm" data-act="range-cancel">Annuler</button></span>`
      : pil.range ? `<span class="chip">📅 ${fmt(pil.range.from)} → ${fmt(pil.range.to)} <button type="button" data-act="range-clear" aria-label="Retirer les dates">×</button></span>`
      : `<button type="button" class="btn btn-sm" data-act="range-open">📅 Du … au …</button>`}
  </div>`;
}

/** Actions communes de la période (Du → Au, précédent / suivant) pour toute page de statistiques. */
function periodActs(root) {
  return {
    "range-open": () => { pil.rangeOpen = true; render(); },
    "range-cancel": () => { pil.rangeOpen = false; render(); },
    "range-clear": () => { pil.range = null; render(); },
    "range-apply": () => {
      const from = $("#pr-from", root).value, to = $("#pr-to", root).value;
      if (!from || !to || from > to) { toast("Choisissez une date de début et une date de fin."); return; }
      pil.range = { from, to }; pil.rangeOpen = false; render();
    },
    prev: () => { pil.offset--; render(); },
    next: () => { pil.offset++; render(); },
    table: () => { pil.table = !pil.table; render(); },
  };
}
/** Bascule de période ; renvoie true si la clé la concerne. */
function periodSeg(k, v) {
  if (k !== "period") return false;
  pil.period = v; pil.range = null; pil.rangeOpen = false; pil.offset = 0;
  return true;
}

/** Carte histogramme empilé : navigation de période, bascules, légende, SVG, infobulle, tableau. */
function histoCardHtml(cols, cats, { title, heading = "", toggles = "", minN = 5, unit = "évaluations" }) {
  return `<div class="card">
      ${heading ? `<h3 style="margin:0 0 .4rem">${heading}</h3>` : ""}
      <div class="chart-head">
        <div class="chart-nav">${pil.range ? "" : `<button type="button" data-act="prev" aria-label="Période précédente">‹</button>`}<strong style="text-transform:capitalize">${esc(title)}</strong>${pil.range || pil.offset >= 0 ? "" : `<button type="button" data-act="next" aria-label="Période suivante">›</button>`}</div>
        <div style="display:flex;gap:.4rem;flex-wrap:wrap">${toggles}</div>
      </div>
      <div class="legend">${cats.map(([l, c]) => `<span><i class="sw" style="background:${c}"></i>${l}</span>`).join("")}${minN ? `<span><i class="sw" style="border:1px solid #c3ccd3;background:repeating-linear-gradient(45deg,#f4f6f8 0 3px,#c3ccd3 3px 5px)"></i>Moins de ${minN} (masqué)</span>` : ""}</div>
      <div class="chart-wrap" id="chart">${histogramSvg(cols, cats, minN)}<div class="chart-tip" hidden></div></div>
      <div class="row-between small muted" style="margin-top:.4rem"><span>Survolez une colonne pour le détail${cols[0]?.unit !== "day" ? " · cliquez pour zoomer" : ""}.</span><button type="button" class="link-btn small" data-act="table">${pil.table ? "Masquer le tableau" : "Voir les données en tableau"}</button></div>
      ${pil.table ? `<div style="overflow-x:auto;margin-top:.6rem"><table class="table"><thead><tr><th>Période</th>${cats.map(([l]) => `<th>${l}</th>`).join("")}<th>Total</th></tr></thead><tbody>${cols.filter((c) => c.vals).map((c) => `<tr><td>${esc(c.long)}</td>${minN && c.total < minN ? `<td colspan="${cats.length}" class="muted">masqué</td>` : c.vals.map((v) => `<td>${v}</td>`).join("")}<td>${minN ? masked(c.total) : c.total}</td></tr>`).join("")}</tbody></table></div>` : ""}
    </div>`;
}
/** Survol : infobulle par colonne ; clic : zoom sur la semaine ou le mois (tactile : 2e appui). */
function bindHisto(root, cols, cats, minN = 5) {
  const wrap = $("#chart", root);
  if (!wrap) return;
  const tip = $(".chart-tip", wrap);
  $$(".hit", wrap).forEach((hit) => {
    const c = cols[+hit.dataset.i];
    hit.addEventListener("mouseenter", () => {
      wrap.classList.add("hovering");
      $$(".col", wrap).forEach((g) => g.classList.toggle("hl", g.dataset.i === hit.dataset.i));
      tip.hidden = false;
      tip.innerHTML = `<strong>${esc(c.long)}</strong>${!c.vals ? "<div>À venir</div>" : minN && c.total < minN ? `<div>Moins de ${minN} : masqué</div>` : cats.map(([l, col], k) => `<div><span><i class="sw" style="background:${col}"></i> ${l}</span><strong>${c.vals[k]}${pil.scale === "pct" && c.total ? ` (${Math.round(c.vals[k] / c.total * 100)} %)` : ""}</strong></div>`).join("") + `<div><span>Total</span><strong>${c.total}</strong></div>`}`;
    });
    hit.addEventListener("mousemove", (e) => {
      const r = wrap.getBoundingClientRect();
      tip.style.left = `${Math.min(Math.max(0, e.clientX - r.left + 12), r.width - tip.offsetWidth)}px`;
      tip.style.top = `${Math.max(0, e.clientY - r.top - tip.offsetHeight - 10)}px`;
    });
    hit.addEventListener("mouseleave", () => { wrap.classList.remove("hovering"); tip.hidden = true; });
    hit.addEventListener("click", () => {
      if (isMobile() && wrap.dataset.tapped !== hit.dataset.i) { wrap.dataset.tapped = hit.dataset.i; return; }
      if (c.unit !== "day" && c.vals) { pil.range = { from: c.from, to: c.to }; render(); }
    });
  });
}

/* ---------- Camembert (anneau) : parts d'un total, légende chiffrée = lecture sans couleur ---------- */
function donutSvg(parts, total) {
  const R = 92, r = 58, cx = 100, cy = 100;
  let a0 = -Math.PI / 2, s = "";
  const pt = (rad, a) => `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`;
  parts.forEach((p, i) => {
    if (!p.value) return;
    const sweep = p.value / total * Math.PI * 2;
    const a1 = a0 + sweep;
    if (sweep >= Math.PI * 2 - 1e-6) {
      s += `<path class="slice" data-i="${i}" d="M${cx - R},${cy}a${R},${R} 0 1,0 ${2 * R},0a${R},${R} 0 1,0 ${-2 * R},0M${cx - r},${cy}a${r},${r} 0 1,1 ${2 * r},0a${r},${r} 0 1,1 ${-2 * r},0Z" fill="${p.color}" fill-rule="evenodd"/>`;
    } else {
      const large = sweep > Math.PI ? 1 : 0;
      s += `<path class="slice" data-i="${i}" d="M${pt(R, a0)}A${R},${R} 0 ${large} 1 ${pt(R, a1)}L${pt(r, a1)}A${r},${r} 0 ${large} 0 ${pt(r, a0)}Z" fill="${p.color}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>`;
    }
    a0 = a1;
  });
  return s;
}
/**
 * Carte camembert. parts : [{ label, color, value }].
 * minN > 0 : sous ce total, rien n'est dessiné (seuil anti-réidentification).
 * onPick(i) facultatif : clic sur une part ou une ligne de légende.
 */
function donutCardHtml(title, parts, { minN = 5, unit = "évaluations", hint = "", pickable = false } = {}) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  const hidden = minN && total < minN;
  const pct = (v) => (total ? `${Math.round(v / total * 100)} %` : "—");
  const Tag = pickable ? "button" : "div";
  return `<div class="card"><h3 style="margin:0">${title}</h3>${hint ? `<p class="small muted" style="margin:.2rem 0 0">${hint}</p>` : ""}
    ${hidden ? `<div class="empty">Moins de ${minN} ${unit} : répartition masquée.</div>` : `
    <div class="donut-wrap" id="donut" style="margin-top:.8rem">
      <svg viewBox="0 0 200 200" role="img" aria-label="${esc(title)}">${donutSvg(parts, total)}
        <text x="100" y="98" text-anchor="middle" font-family="Bebas Neue, Arial Narrow, sans-serif" font-size="38" fill="#24608f">${total}</text>
        <text x="100" y="120" text-anchor="middle" font-size="12" fill="#5d6e7d">${esc(unit)}</text></svg>
      <div class="chart-tip" hidden></div>
      <div class="donut-legend">${parts.map((p, i) => `<${Tag} ${pickable ? `type="button" data-act="pick-slice"` : ""} data-i="${i}"><i class="sw" style="background:${p.color}"></i><span>${esc(p.label)}</span><span class="v">${p.value}</span><span class="p">${pct(p.value)}</span></${Tag}>`).join("")}</div>
    </div>`}</div>`;
}
function bindDonut(root, parts, onPick) {
  const wrap = $("#donut", root);
  if (!wrap) return;
  const total = parts.reduce((a, p) => a + p.value, 0);
  const tip = $(".chart-tip", wrap);
  const hl = (i) => { wrap.classList.toggle("hovering", i != null); $$(".slice", wrap).forEach((el) => el.classList.toggle("hl", el.dataset.i === String(i))); };
  $$(".slice, .donut-legend [data-i]", wrap).forEach((el) => {
    const i = +el.dataset.i;
    el.addEventListener("mouseenter", () => {
      hl(i);
      if (!el.classList.contains("slice")) return;
      tip.hidden = false;
      tip.innerHTML = `<strong>${esc(parts[i].label)}</strong><div><span>Nombre</span><strong>${parts[i].value}</strong></div><div><span>Part</span><strong>${Math.round(parts[i].value / total * 100)} %</strong></div>`;
    });
    el.addEventListener("mousemove", (e) => {
      if (!el.classList.contains("slice")) return;
      const r = wrap.getBoundingClientRect();
      tip.style.left = `${Math.min(Math.max(0, e.clientX - r.left + 12), r.width - tip.offsetWidth)}px`;
      tip.style.top = `${Math.max(0, e.clientY - r.top - tip.offsetHeight - 10)}px`;
    });
    el.addEventListener("mouseleave", () => { hl(null); tip.hidden = true; });
    if (onPick) el.addEventListener("click", () => onPick(i));
  });
}

/**
 * Page de pilotage. scope : « agences » (superviseur) ou « reseau » (administrateur, super admin).
 * opts.pie : camembert de répartition à côté de l'histogramme ; opts.mountAfter(el) : contenu sous le graphique.
 */
function pilotage(root, scope, opts = {}) {
  const agencies = scope === "agences" ? MY_AGENCIES : AGENCIES;
  const { list, title } = buckets();
  const cats = DIMS[pil.dim];
  const cols = list.map((b) => { const vals = bucketValues(b, pil.dim, scope); return { ...b, vals, total: vals ? vals.reduce((a, c) => a + c, 0) : 0 }; });
  const decisionTotals = [0, 0, 0];
  list.forEach((b) => { const v = bucketValues(b, "decision", scope); if (v) v.forEach((n, k) => { decisionTotals[k] += n; }); });
  const total = decisionTotals.reduce((a, c) => a + c, 0);
  const dimTotals = cats.map((_, k) => cols.reduce((a, c) => a + (c.vals ? c.vals[k] : 0), 0));
  const parts = cats.map(([label, color], k) => ({ label, color, value: dimTotals[k] }));
  const toggles = `<div class="segmented" data-seg="dim"><button type="button" data-v="decision" class="${pil.dim === "decision" ? "on" : ""}">Décision</button><button type="button" data-v="zone" class="${pil.dim === "zone" ? "on" : ""}">Zone</button></div>
    <div class="segmented" data-seg="scale"><button type="button" data-v="n" class="${pil.scale === "n" ? "on" : ""}">Nombre</button><button type="button" data-v="pct" class="${pil.scale === "pct" ? "on" : ""}">%</button></div>`;
  const histo = histoCardHtml(cols, cats, { title, toggles });
  root.innerHTML = `
    ${periodHtml()}
    <div class="toolbar">
      ${scope === "agences"
        ? `<div class="segmented" data-seg="agency">${["", ...agencies].map((a) => `<button type="button" data-v="${a}" class="${pil.agency === a ? "on" : ""}">${a ? short(a) : "Toutes mes agences"}</button>`).join("")}</div>`
        : `<select data-act="agency" data-ev="change" style="width:auto" aria-label="Agence"><option value="">Toutes les agences</option>${agencies.map((a) => `<option ${pil.agency === a ? "selected" : ""}>${a}</option>`).join("")}</select>`}
      <div class="grow" style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center">${pil.filters.map((f, i) => `<span class="chip">${esc(f)} <button type="button" data-act="rm-filter" data-i="${i}" aria-label="Retirer le filtre ${esc(f)}">×</button></span>`).join("")}<button type="button" class="btn btn-sm" data-act="add-filter">+ Filtrer</button></div>
      <button type="button" class="btn btn-sm" data-act="export">⬇ Exporter</button>
    </div>
    <div class="tiles">
      <div class="tile"><div class="n">${masked(total)}</div><div class="l">Évaluations</div></div>
      <div class="tile"><div class="n">${masked(decisionTotals[0])}</div><div class="l">Prises en charge</div></div>
      <div class="tile"><div class="n">${masked(decisionTotals[1])}</div><div class="l">En attente de décision</div></div>
      <div class="tile"><div class="n">${masked(Math.round(total * 0.27))}</div><div class="l">Dossiers clos</div></div>
    </div>
    ${opts.pie ? `<div class="grid-chart">${histo}${donutCardHtml(`Répartition par ${pil.dim === "zone" ? "zone" : "décision"}`, parts, { hint: `${title.charAt(0).toUpperCase()}${title.slice(1)}${pil.agency ? ` · ${short(pil.agency)}` : ""}` })}</div>` : histo}
    <div id="pil-after"></div>
    <p class="muted small">🔒 Chiffres agrégés uniquement, jamais de ligne individuelle. Moins de 5 évaluations : masqué.</p>`;
  segmented(root, (k, v) => {
    if (!periodSeg(k, v)) {
      if (k === "agency") pil.agency = v;
      if (k === "dim") pil.dim = v;
      if (k === "scale") pil.scale = v;
    }
    render();
  });
  bind(root, {
    ...periodActs(root),
    agency: (el) => { pil.agency = el.value; render(); },
    "rm-filter": (el) => { pil.filters.splice(+el.dataset.i, 1); render(); },
    "add-filter": () => drawer("Ajouter un filtre", `
      ${[["Évaluateur", ["Paul Démo", "Lina Démo"]], ["Validateur", ["Marc Démo", "Sophie Test"]], ["Sexe", ["Femme", "Homme"]], ["Type de sinistre", ["Accident du travail", "Maladie professionnelle"]]]
        .map(([l, o]) => `<div class="field"><label>${l}</label><select data-l="${l}"><option value="">Tous</option>${o.map((x) => `<option>${x}</option>`).join("")}</select></div>`).join("")}
      <p class="small muted">Seuls les champs non identifiants (non PII) sont filtrables.</p>
      <button type="button" class="btn btn-primary btn-block" data-act="apply">Appliquer</button>`, (body, close) => bind(body, {
      apply: () => { $$("select", body).forEach((s) => { if (s.value) pil.filters.push(`${s.dataset.l} : ${s.value}`); }); close(); render(); },
    })),
    export: () => exportDrawer(false),
  });
  bindHisto(root, cols, cats);
  if (opts.pie) bindDonut(root, parts);
  opts.mountAfter?.($("#pil-after", root));
}

/** Export : CSV / XLSX en direct ; code par email uniquement pour l'export SQL. */
function exportDrawer(withSql) {
  drawer("Exporter", "", (body, close) => {
    const d = { format: null };
    const finish = () => { close(); toast(`Export ${d.format} téléchargé (démo).`); };
    const fmtStep = {
      label: "Format",
      html: () => `<p class="muted">${withSql ? "Choisissez le format." : `Chiffres agrégés selon la période et les filtres actifs.`}</p><div class="choice-cards" style="grid-template-columns:1fr">${[["CSV", "Chiffres agrégés, téléchargement direct"], ["XLSX", "Chiffres agrégés, téléchargement direct"], ...(withSql ? [["SQL", "Base complète — code par email requis"]] : [])].map(([f, s]) => `<button type="button" class="choice-card" data-act="fmt" data-f="${f}"><strong>${f === "SQL" ? "🔒 " : "📄 "}${f}</strong><span class="muted small">${s}</span></button>`).join("")}</div>`,
      bind: (root) => bind(root, { fmt: (el) => {
        d.format = el.dataset.f;
        if (d.format !== "SQL") { finish(); return; }
        runWizardFrom(body, [fmtStep, codeStep, readyStep], d, 1, finish);
      } }),
    };
    const codeStep = { label: "Code", html: () => `<p>Un code a été envoyé à votre email pour autoriser l'export de la base complète.</p><div class="field"><label for="x-code">Code à 6 chiffres</label><input id="x-code" type="text" inputmode="numeric" maxlength="6"></div><div class="wizard-foot"><button type="button" class="btn btn-ghost" data-act="back">← Retour</button><button type="button" class="btn btn-primary" data-act="next">Valider</button></div>` };
    const readyStep = { label: "Téléchargement", html: () => `<div class="banner banner-ok">✓ Code vérifié, export tracé dans l'historique.</div><div class="wizard-foot"><span></span><button type="button" class="btn btn-primary" data-act="next">Télécharger</button></div>` };
    runWizard(body, [fmtStep], d, finish);
  });
}

/* =====================================================================
 * Superviseur (plusieurs agences)
 * ===================================================================== */
const svState = { late: { sel: null, comment: false, open: false } };
RENDER.superviseur = (root) => {
  const v = state.view;
  const late = () => db.decide.filter((d) => d.late && MY_AGENCIES.includes(d.agency));
  root.innerHTML = `${appBar("Superviseur", "Claire Démo", agencyChip(MY_AGENCIES))}
  <div class="page">
    ${tabsHtml([{ id: "pilotage", label: "Pilotage" }, { id: "late", label: "En retard", count: late().length, hot: true }, { id: "team", label: "Équipe" }, { id: "qr", label: "Affiches QR" }], v)}
    <div id="sv-body"></div>
  </div>`;
  bindTabs(root);
  const body = $("#sv-body", root);
  if (v === "pilotage") return pilotage(body, "agences");
  if (v === "late") {
    body.innerHTML = `<div class="banner banner-info" style="margin-bottom:1rem">Dossiers orange sans décision depuis plus de 3 jours, dans ${MY_AGENCIES.map(short).join(" et ")}. Le reste est géré par les validateurs.</div><div id="late-box"></div>`;
    inboxInto($("#late-box", body), { key: "late", hidden: true, items: late, row: (it) => decideRow(it, true), detail: (el, it) => decideDetail(el, it, { hidden: true, state: svState.late }), empty: "Aucun dossier en retard : l'équipe est à jour.", state: svState.late });
    return;
  }
  if (v === "team") return renderTeam(body);
  renderQrPosters(body);
};
const teamFilter = { role: "Tous", agency: "" };
function renderTeam(body) {
  body.innerHTML = `<div class="card"><div id="team-list"></div><p class="small muted">La création et la désactivation des comptes restent chez le super administrateur.</p></div>`;
  const segs = () => `<div class="segmented" data-seg="role">${["Tous", "Évaluateur", "Validateur"].map((r) => `<button type="button" data-v="${r}" class="${teamFilter.role === r ? "on" : ""}">${r === "Tous" ? r : r + "s"}</button>`).join("")}</div>
      <div class="segmented" data-seg="agency">${["", ...MY_AGENCIES].map((a) => `<button type="button" data-v="${a}" class="${teamFilter.agency === a ? "on" : ""}">${a ? short(a) : "Toutes"}</button>`).join("")}</div>`;
  listBlock($("#team-list", body), {
    key: "team", placeholder: "Rechercher une personne…", tools: segs(),
    rows: () => db.team.filter((t) => (teamFilter.role === "Tous" || t.role === teamFilter.role) && (!teamFilter.agency || t.agencies.includes(teamFilter.agency))),
    text: (t) => `${t.name} ${t.role}`,
    render: (rows) => `<table class="table"><thead><tr><th>Nom</th><th>Rôle</th><th>Agences</th><th>Évaluations</th><th>Décisions</th><th>En attente</th></tr></thead>
      <tbody>${rows.map((t) => `<tr><td><strong>${esc(t.name)}</strong>${t.active ? "" : ' <span class="badge b-neutral">désactivé</span>'}</td><td>${t.role}</td><td>${t.agencies.map((a) => `<span class="chip">${short(a)}</span>`).join(" ")}</td><td>${t.evals}</td><td>${t.decided ?? "—"}</td><td>${t.pending ? `<span class="badge b-wait">${t.pending}</span>` : "—"}</td></tr>`).join("")}</tbody></table>`,
    onTools: (tools, redraw) => segmented(tools, (k, val) => { if (k === "role") teamFilter.role = val; else teamFilter.agency = val; redraw(); }),
  });
}
function renderQrPosters(body) {
  const mine = db.agencies.filter((a) => MY_AGENCIES.includes(a.name));
  body.innerHTML = `<p class="muted">Affiche permanente : un nouveau patient fait le test seul. Les personnes déjà connues sont orientées vers un agent.</p>
  <div class="grid-3">${mine.map((a) => `<div class="card"><div class="row-between"><h3 style="margin:0">${a.name}</h3><span class="badge ${a.qr ? "b-ok" : "b-neutral"}">${a.qr ? "Actif" : "Inactif"}</span></div>
    ${a.qr ? `<div style="transform:scale(.6);transform-origin:top center;height:150px">${fakeQr(a.name.length)}</div>` : `<p class="muted small" style="height:60px">Aucune affiche en service.</p>`}
    <div class="stack">${a.qr ? `<button type="button" class="btn btn-block" data-act="print">🖨 Imprimer l'affiche</button>` : ""}
    <button type="button" class="btn ${a.qr ? "btn-ghost" : "btn-primary"} btn-block" data-act="regen" data-n="${esc(a.name)}">${a.qr ? "Régénérer" : "Activer"}</button></div></div>`).join("")}</div>`;
  bind(body, {
    print: () => toast("Ouverture de l'affiche à imprimer (démo)."),
    regen: (el) => {
      const a = db.agencies.find((x) => x.name === el.dataset.n);
      if (!a.qr) { a.qr = true; toast("Affiche activée."); render(); return; }
      if (!el.dataset.armed) { el.dataset.armed = "1"; el.className = "btn btn-danger btn-block"; el.textContent = "Confirmer : l'ancienne affiche ne marchera plus"; return; }
      toast("Nouvelle affiche générée."); render();
    },
  });
}

/* =====================================================================
 * Administrateur du partenaire (lecture seule, agrégé)
 * ===================================================================== */
/** Tableau « Par agence » (période de la page), avec recherche et pagination. */
function mountAgencyTable(el) {
  const factor = pil.period === "Année" ? 11 : pil.period === "Trimestre" ? 3 : pil.period === "Semaine" ? 0.25 : 1;
  el.innerHTML = `<div class="card" style="margin-top:1rem"><div class="row-between" style="margin-bottom:.6rem"><h3 style="margin:0">Par agence</h3><span class="small muted">${pil.range ? `${fmt(pil.range.from)} → ${fmt(pil.range.to)}` : pil.period}</span></div><div id="ag-list"></div></div>`;
  listBlock($("#ag-list", el), {
    key: "agencyTable", placeholder: "Rechercher une agence ou un superviseur…",
    rows: () => db.agencies, text: (a) => `${a.name} ${a.supervisor}`,
    render: (rows) => `<table class="table"><thead><tr><th>Agence</th><th>Superviseur</th><th>Évaluations</th><th>Prises en charge</th><th>En attente</th></tr></thead><tbody>
      ${rows.map((a) => { const n = Math.round(a.evals / 6 * factor); return `<tr><td><strong>${a.name}</strong></td><td>${esc(a.supervisor)}</td><td>${masked(n)}</td><td>${masked(Math.round(n * 0.43))}</td><td>${masked(Math.round(n * 0.08))}</td></tr>`; }).join("")}</tbody></table>`,
  });
}
RENDER.admin = (root) => {
  const v = state.view;
  root.innerHTML = `${appBar("Administrateur", "Direction Démo", `<span class="chip">🏛 Réseau : ${AGENCIES.length} agences</span>`)}
  <div class="page">
    <div class="row-between"><h1>Vue d'ensemble</h1><span class="badge b-neutral">Lecture seule</span></div>
    ${tabsHtml([{ id: "pilotage", label: "Pilotage" }, { id: "agencies", label: "Agences" }, { id: "supervisors", label: "Superviseurs" }], v)}
    <div id="ad-body"></div>
  </div>`;
  bindTabs(root);
  const body = $("#ad-body", root);
  if (v === "pilotage") return pilotage(body, "reseau", { pie: true });
  if (v === "agencies") {
    body.innerHTML = periodHtml() + `<div id="ag-table"></div><p class="muted small">🔒 Aucun dossier individuel : uniquement des chiffres agrégés.</p>`;
    segmented(body, (k, val) => { if (periodSeg(k, val)) render(); });
    bind(body, periodActs(body));
    mountAgencyTable($("#ag-table", body));
    return;
  }
  body.innerHTML = `<div class="card"><div id="sup-list"></div><p class="small muted">La gestion des comptes reste au super administrateur.</p></div>`;
  listBlock($("#sup-list", body), {
    key: "supervisors", placeholder: "Rechercher un superviseur ou une agence…",
    rows: () => db.supervisors, text: (s) => `${s.name} ${s.agencies.join(" ")}`,
    render: (rows) => `<table class="table"><thead><tr><th>Superviseur</th><th>Agences</th><th>Dossiers en retard</th><th>État</th></tr></thead><tbody>
      ${rows.map((s) => `<tr><td><strong>${esc(s.name)}</strong></td><td>${s.agencies.map((a) => `<span class="chip">${short(a)}</span>`).join(" ")}</td><td>${s.late ? `<span class="badge b-wait">${s.late}</span>` : "—"}</td><td><span class="badge b-ok">Actif</span></td></tr>`).join("")}</tbody></table>`,
  });
};

/* =====================================================================
 * Super admin
 * ===================================================================== */
RENDER.superadmin = (root) => {
  const v = state.view;
  root.innerHTML = `${appBar("Super admin", "Admin Démo", `<form id="sa-search" style="flex:1;max-width:360px;min-width:160px"><input type="search" placeholder="🔍 Dossier par N°…" aria-label="Rechercher un dossier"></form>`)}
  <div class="page">
    <div class="row-between"><div><h1 style="margin-bottom:.2rem">Supervision générale</h1><span class="chip">Agences ${TYPE_LABEL[partner().type].toLowerCase()}s</span></div>
      ${partner().yodanLink ? `<button type="button" class="btn btn-ghost btn-sm" data-act="switch" title="Compte relié à ${esc(partner().yodanLink)}">Espace Yodan →</button>` : ""}</div>
    ${tabsHtml([{ id: "pilotage", label: "Pilotage" }, { id: "org", label: "Agences & comptes" }, { id: "settings", label: "Paramètres" }], v)}
    <div id="sa-body"></div>
  </div>`;
  bindTabs(root);
  bind(root, { switch: () => go("yodan") });
  $("#sa-search", root).addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("input", e.target).value.trim().toUpperCase() || "DEMO-104521";
    drawer(`Dossier ${q}`, `<dl class="kv"><dt>Agence</dt><dd>Agence Plateau</dd><dt>Type</dt><dd>Évaluation initiale</dd><dt>Résultat</dt><dd><span class="badge z-ORANGE">Orange</span></dd><dt>Décision</dt><dd>En attente</dd><dt>Date</dt><dd>${fmtLong(TODAY)}</dd></dl>
      <p class="small muted">Lecture seule, sans nom ni réponse.</p><div id="renum"></div><button type="button" class="btn btn-block" data-act="renum">Corriger un numéro</button>`, (body) => bind(body, {
      renum: (btn) => {
        btn.remove();
        runWizard($("#renum", body), [
          { label: "Champ", html: () => `<div class="choice-cards" style="grid-template-columns:1fr 1fr">${["N° d'immatriculation", "N° de sinistre"].map((f) => `<button type="button" class="choice-card" data-act="next"><strong>${f}</strong></button>`).join("")}</div>` },
          { label: "Nouveau N°", html: () => `<div class="field"><label for="rn">Nouveau numéro</label><input id="rn" type="text"></div><div class="wizard-foot"><button type="button" class="btn btn-ghost" data-act="back">← Retour</button><button type="button" class="btn btn-primary" data-act="next">Corriger</button></div>` },
        ], {}, () => { $("#renum", body).innerHTML = `<div class="banner banner-ok">✓ Numéro corrigé et tracé dans l'historique.</div>`; });
      },
    }));
  });
  const body = $("#sa-body", root);
  if (v === "pilotage") return pilotage(body, "reseau", { mountAfter: mountAgencyTable });
  if (v === "org") return renderOrg(body);
  renderSaSettings(body);
};
function renderOrg(body) {
  listBlock(body, {
    key: "orgAgencies", placeholder: "Rechercher une agence ou une personne…",
    tools: `<button type="button" class="btn" data-act="new-agency">+ Nouvelle agence</button><button type="button" class="btn btn-primary" data-act="new-account">+ Nouveau compte</button>`,
    rows: () => db.agencies,
    text: (a) => `${a.name} ${a.supervisor} ${db.team.filter((t) => t.agencies.includes(a.name)).map((t) => t.name).join(" ")}`,
    render: (rows) => `<div class="grid-3">${rows.map((a) => `<div class="card"><h3>${a.name}</h3><p class="small muted" style="margin:0">Superviseur : ${esc(a.supervisor)}</p>
      <p class="small">${a.evaluators} évaluateur${a.evaluators > 1 ? "s" : ""} · ${a.validators} validateur${a.validators > 1 ? "s" : ""}</p>
      <div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.8rem"><span class="badge b-neutral">${TYPE_LABEL[partner().type]}</span>${a.zones.map((z) => `<span class="badge z-${z}">Valide : ${ZONE_SHORT[z]}</span>`).join("")}${a.qr ? '<span class="badge b-ok">QR ouvert</span>' : ""}${a.validators === 0 ? '<span class="badge b-wait">Pas de validateur</span>' : ""}</div>
      <button type="button" class="btn btn-block" data-act="manage" data-i="${db.agencies.indexOf(a)}">Gérer →</button></div>`).join("")}</div>`,
    bind: (res) => bind(res, { manage: (el) => manageAgency(db.agencies[+el.dataset.i]) }),
  });
  bind($(".list-tools", body), {
    "new-agency": () => drawer("Nouvelle agence", "", (b, close) => runWizard(b, [
      { label: "Agence", html: () => `<div class="field"><label for="na">Nom de l'agence</label><input id="na" type="text" placeholder="Agence …"></div><div class="wizard-foot"><span></span><button type="button" class="btn btn-primary" data-act="next">Continuer</button></div>` },
      { label: "Superviseur", html: () => `<div class="choice-cards" style="grid-template-columns:1fr">${[["Superviseur existant", "Ajouter cette agence à un superviseur qui en gère déjà d'autres."], ["Nouveau superviseur", "Créer son compte maintenant."]].map(([t, s]) => `<button type="button" class="choice-card" data-act="next"><strong>${t}</strong><span class="muted small">${s}</span></button>`).join("")}</div><div class="wizard-foot"><button type="button" class="btn btn-ghost" data-act="back">← Retour</button><span></span></div>` },
      { label: "Confirmation", html: () => `<div class="field"><label for="ns">Superviseur</label><select id="ns">${db.supervisors.map((s) => `<option>${s.name}</option>`).join("")}<option>+ Nouveau…</option></select></div><div class="wizard-foot"><button type="button" class="btn btn-ghost" data-act="back">← Retour</button><button type="button" class="btn btn-primary" data-act="next">Créer l'agence</button></div>` },
    ], {}, () => { close(); toast("Agence créée."); })),
    "new-account": () => newAccountDrawer(),
  });
}
function newAccountDrawer() {
  drawer("Nouveau compte", "", (b, close) => {
    const d = { role: null, agencies: [] };
    const finish = () => { close(); toast(`Compte ${d.role.toLowerCase()} créé${d.agencies.length > 1 ? ` sur ${d.agencies.length} agences` : ""}.`); };
    const stepsFor = () => (d.role === "Administrateur" ? [roleStep, idStep] : [roleStep, agencyStep, idStep]);
    const roleStep = { label: "Profil", html: () => `<div class="choice-cards" style="grid-template-columns:1fr 1fr">${[["Évaluateur", "📝", "Remplit les questionnaires · 1 agence"], ["Validateur", "✅", "Décide les cas orange · 1 ou plusieurs agences"], ["Superviseur", "📊", "Pilote 1 ou plusieurs agences"], ["Administrateur", "🏛", "Chiffres de tout le réseau"]].map(([r, i, t]) => `<button type="button" class="choice-card ${d.role === r ? "on" : ""}" data-act="role" data-r="${r}"><span class="ico">${i}</span><strong>${r}</strong><span class="muted small">${t}</span></button>`).join("")}</div>`,
      bind: (root) => bind(root, { role: (el) => { d.role = el.dataset.r; d.agencies = []; runWizardFrom(b, stepsFor(), d, 1, finish); } }) };
    const agencyStep = {
      label: "Agences",
      html: () => {
        const multi = MULTI_AGENCY_ROLES.includes(d.role);
        return `<p class="muted">${multi ? "Cochez une ou plusieurs agences." : "Agence de rattachement."}</p>
          <div class="choice-cards" style="grid-template-columns:1fr">${AGENCIES.map((a) => `<button type="button" class="choice-card ${d.agencies.includes(a) ? "on" : ""}" data-act="ag" data-a="${a}"><strong>${multi ? (d.agencies.includes(a) ? "☑ " : "☐ ") : ""}${a}</strong></button>`).join("")}</div>
          <div class="wizard-foot"><button type="button" class="btn btn-ghost" data-act="back">← Retour</button>${multi ? `<button type="button" class="btn btn-primary" data-act="next" ${d.agencies.length ? "" : "disabled"}>Continuer (${d.agencies.length})</button>` : "<span></span>"}</div>`;
      },
      bind: (root, api) => bind(root, { ag: (el) => {
        const a = el.dataset.a;
        if (!MULTI_AGENCY_ROLES.includes(d.role)) { d.agencies = [a]; api.next(); return; }
        d.agencies = d.agencies.includes(a) ? d.agencies.filter((x) => x !== a) : [...d.agencies, a];
        api.redraw();
      } }),
    };
    const idStep = { label: "Identité", html: () => `<p><span class="chip">${esc(d.role)}</span> ${d.agencies.map((a) => `<span class="chip">${esc(short(a))}</span>`).join(" ")}</p><div class="field"><label for="acc-n">Nom</label><input id="acc-n" type="text"></div><div class="field"><label for="acc-e">Email (identifiant)</label><input id="acc-e" type="email"></div><p class="small muted">Un mot de passe temporaire est envoyé par email ; il devra être changé à la première connexion.</p><div class="wizard-foot"><button type="button" class="btn btn-ghost" data-act="back">← Retour</button><button type="button" class="btn btn-primary btn-lg" data-act="next">Créer le compte</button></div>` };
    runWizard(b, [roleStep, agencyStep, idStep], d, finish);
  });
}
function manageAgency(a) {
  let tab = "team";
  drawer(a.name, "", (b) => {
    const draw = () => {
      const people = db.team.filter((t) => t.agencies.includes(a.name));
      b.innerHTML = `<div class="segmented full" data-seg="t" style="margin-bottom:1rem">${[["team", "Équipe"], ["settings", "Réglages"], ["qr", "QR ouvert"]].map(([k, l]) => `<button type="button" data-v="${k}" class="${tab === k ? "on" : ""}">${l}</button>`).join("")}</div>
      ${tab === "team" ? `<div id="ma-team"></div>`
      : tab === "settings" ? `<p class="small muted">Enregistré automatiquement.</p>
        <div class="card-flat" style="background:var(--surface-2);margin-bottom:1rem"><strong>Type : ${TYPE_LABEL[partner().type]}</strong><div class="small muted">${TYPE_TEXT[partner().type]} Réglé par l'admin système pour toutes les agences du partenaire.</div></div>
        <div class="field"><label for="ap">Délai de recours (jours)</label><input id="ap" type="number" value="${a.appeal}" data-auto></div>
        <label style="font-weight:600;font-size:.9rem">Zones décidées par un validateur</label>
        ${["VERT", "ORANGE", "ROUGE"].map((z) => `<div class="switch-row"><span><span class="badge z-${z}">${ZONE_SHORT[z]}</span> ${ZONE_LABEL[z]}</span><button type="button" class="toggle ${a.zones.includes(z) ? "on" : ""}" data-act="zone" data-z="${z}" aria-label="${ZONE_SHORT[z]}"></button></div>`).join("")}
        <p class="small muted">Zones non cochées : décision automatique.</p>
        <div class="field" style="margin-top:1rem"><label for="ad">Adresse</label><input id="ad" type="text" value="Adresse fictive, Abidjan" data-auto></div>`
      : `<p>${a.qr ? "Affiche en service." : "Aucune affiche."}</p><button type="button" class="btn btn-primary" data-act="qr">${a.qr ? "Imprimer l'affiche" : "Activer le QR ouvert"}</button>`}`;
      segmented(b, (k, v) => { tab = v; draw(); });
      if (tab === "team") {
        listBlock($("#ma-team", b), {
          key: "agencyTeam", placeholder: "Rechercher une personne…",
          rows: () => [{ name: a.supervisor, role: "Superviseur", agencies: db.supervisors.find((s) => s.name === a.supervisor)?.agencies || [a.name], active: true }, ...people],
          text: (p) => `${p.name} ${p.role}`,
          render: (rows) => rows.map((p) => `<div class="switch-row"><div><strong>${esc(p.name)}</strong><div class="small muted">${p.role}${p.agencies.length > 1 ? ` · aussi : ${p.agencies.filter((x) => x !== a.name).map(short).join(", ")}` : ""}</div></div><div style="display:flex;gap:.4rem;align-items:center"><button type="button" class="btn btn-ghost btn-sm" data-act="reset">Mot de passe</button><button type="button" class="toggle ${p.active ? "on" : ""}" data-act="active" aria-label="Compte actif" aria-pressed="${p.active}"></button></div></div>`).join(""),
          bind: (res) => bind(res, {
            reset: () => toast("Mot de passe temporaire envoyé par email."),
            active: (el) => { el.classList.toggle("on"); toast(el.classList.contains("on") ? "Compte réactivé." : "Compte désactivé."); },
          }),
        });
      }
      bind(b, {
        zone: (el) => { const z = el.dataset.z; a.zones = a.zones.includes(z) ? a.zones.filter((x) => x !== z) : [...a.zones, z]; el.classList.toggle("on"); toast("Enregistré"); },
        qr: () => { a.qr = true; toast("QR ouvert actif."); draw(); },
      });
      $$("[data-auto]", b).forEach((input) => input.addEventListener("change", () => toast("Enregistré")));
    };
    draw();
  });
}
/** Valeurs des champs « Liste » : par défaut chez l'admin système, complétées ici par le super admin. */
const saEdit = { key: null, value: null };
function drawListFields(box) {
  const listFields = db.fields.filter((f) => ["select", "checkbox"].includes(f.type));
  const meta = (f) => { const n = f.options.length - (f.off || []).length; const off = (f.off || []).length; return `${n} valeur${n > 1 ? "s" : ""} proposée${n > 1 ? "s" : ""}${off ? ` · ${off} désactivée${off > 1 ? "s" : ""}` : ""}`; };
  box.innerHTML = `<h2>Listes du formulaire</h2>
    <p class="muted small" style="margin-top:0">Valeurs proposées dans les champs « Liste » du questionnaire. L'admin système pose les valeurs par défaut ; vous ajoutez, renommez ou désactivez. Une valeur désactivée n'est plus proposée mais reste lisible dans les anciens dossiers.</p>
    ${listFields.map((f) => acc("salists", f.key, { ico: f.type === "checkbox" ? "☑" : "☰", title: esc(f.label), meta: meta(f), body: `<div data-lv="${f.key}"></div>
      <form class="toolbar" data-add="${f.key}" style="margin:.8rem 0 0"><input type="text" class="grow" placeholder="Nouvelle valeur…" aria-label="Nouvelle valeur pour ${esc(f.label)}"><button type="submit" class="btn btn-sm">+ Ajouter</button></form>` })).join("") || '<p class="muted">Aucun champ « Liste » dans le questionnaire.</p>'}`;
  bindAcc(box);
  const redrawAll = () => drawListFields(box);
  listFields.forEach((f) => {
    listBlock($(`[data-lv="${f.key}"]`, box), {
      key: `list-${f.key}`, placeholder: `Rechercher dans « ${f.label} »…`,
      rows: () => f.options, text: (o) => o,
      render: (rows) => rows.map((o) => {
        const off = (f.off || []).includes(o);
        const editing = saEdit.key === f.key && saEdit.value === o;
        return `<div class="row-item ${off ? "off" : ""}">${editing
          ? `<input type="text" class="grow" data-rename value="${esc(o)}" aria-label="Nouveau nom"><button type="button" class="btn btn-primary btn-sm" data-act="save-v">OK</button>`
          : `<span class="grow"><span class="lbl">${esc(o)}</span></span><span class="acts"><button type="button" class="btn btn-ghost btn-sm" data-act="edit-v" data-v="${esc(o)}" aria-label="Renommer ${esc(o)}">✎</button><button type="button" class="toggle ${off ? "" : "on"}" data-act="tog-v" data-v="${esc(o)}" aria-label="${esc(o)} proposée" aria-pressed="${!off}"></button></span>`}</div>`;
      }).join(""),
      bind: (res, draw) => {
        bind(res, {
          "edit-v": (el) => { Object.assign(saEdit, { key: f.key, value: el.dataset.v }); draw(); $("[data-rename]", res)?.select(); },
          "save-v": () => {
            const name = $("[data-rename]", res).value.trim();
            if (name && name !== saEdit.value) {
              if (f.options.includes(name)) { toast("Cette valeur existe déjà."); return; }
              f.options[f.options.indexOf(saEdit.value)] = name;
              f.off = (f.off || []).map((x) => (x === saEdit.value ? name : x));
              toast("Valeur renommée.");
            }
            Object.assign(saEdit, { key: null, value: null });
            redrawAll();
          },
          "tog-v": (el) => {
            const v = el.dataset.v;
            const off = (f.off ||= []);
            if (off.includes(v)) {
              off.splice(off.indexOf(v), 1); toast("Valeur proposée à nouveau.");
            } else {
              off.push(v); toast(`« ${esc(v)} » n'est plus proposée.`, () => { off.splice(off.indexOf(v), 1); redrawAll(); });
            }
            redrawAll();
          },
        });
        $("[data-rename]", res)?.addEventListener("keydown", (e) => {
          if (e.key === "Enter") $("[data-act=save-v]", res).click();
          if (e.key === "Escape") { Object.assign(saEdit, { key: null, value: null }); draw(); }
        });
      },
    });
    $(`[data-add="${f.key}"]`, box).addEventListener("submit", (e) => {
      e.preventDefault();
      const v = $("input", e.target).value.trim();
      if (!v) return;
      if (f.options.includes(v)) { toast("Cette valeur existe déjà."); return; }
      f.options.push(v);
      toast(`« ${esc(v)} » ajoutée à « ${esc(f.label)} ».`);
      redrawAll();
      $(`[data-add="${f.key}"] input`, box)?.focus();
    });
  });
}
function renderSaSettings(body) {
  let sec = "lists";
  const draw = () => {
    body.innerHTML = `<div style="display:grid;grid-template-columns:220px 1fr;gap:1rem" class="sa-set">
      <div class="inbox-list">${[["lists", "📋 Listes du formulaire"], ["exports", "⬇ Exports"], ["history", "🕘 Historique"], ["account", "👤 Mon compte"]].map(([k, l]) => `<div class="item ${sec === k ? "on" : ""}" data-act="sec" data-s="${k}" role="button" tabindex="0"><span class="t">${l}</span></div>`).join("")}</div>
      <div class="card" id="sa-sec">${{
        lists: "",
        exports: `<h2>Exports</h2><p class="muted">CSV et XLSX : téléchargement direct. SQL (base complète) : un code est envoyé par email.</p><button type="button" class="btn btn-primary" data-act="export">Lancer un export</button>`,
        history: `<h2>Historique</h2><div id="h-list"></div>`,
        account: `<h2>Mon compte</h2><div class="field"><label for="me-n">Nom affiché</label><input id="me-n" type="text" value="Admin Démo"></div><button type="button" class="btn">Changer mon mot de passe</button>`,
      }[sec]}</div></div>`;
    bind(body, { sec: (el) => { sec = el.dataset.s; draw(); }, export: () => exportDrawer(true) });
    if (sec === "lists") drawListFields($("#sa-sec", body));
    if (sec === "history") {
      listBlock($("#h-list", body), {
        key: "history", placeholder: "Rechercher une personne ou une action…", tools: `<span data-range-slot></span>`,
        rows: () => db.history.filter((x) => inRange("history", x.date)), text: (x) => `${x.who} ${x.action}`,
        empty: "Rien sur cette période.",
        render: (rows) => `<table class="table"><thead><tr><th>Date</th><th>Qui</th><th>Action</th></tr></thead><tbody>${rows.map((x) => `<tr><td>${fmt(x.date)}</td><td>${esc(x.who)}</td><td>${esc(x.action)}</td></tr>`).join("")}</tbody></table>`,
        onTools: (tools, redraw) => {
          const slot = $("[data-range-slot]", tools);
          const paint = () => { slot.innerHTML = rangeHtml("history"); bindRange(slot, "history", () => { paint(); redraw(); }); };
          paint();
        },
      });
    }
  };
  draw();
}

/* =====================================================================
 * Admin système : partenaires, réglages, champs du questionnaire, bilan
 * ===================================================================== */
/** Tests de dépistage disponibles (ScreeningCatalog) : PCL-5 par défaut. */
const TESTS = {
  "PCL-5": ["🧠", "Stress post-traumatique", "20 questions · après un accident ou un événement grave"],
  ICJE: ["🎲", "Jeu excessif", "9 questions · habitudes de jeu"],
};
const DEFAULT_TEST = "PCL-5";
/** Contraste du texte blanc sur une couleur (WCAG) : sert à prévenir quand le thème devient peu lisible. */
function whiteContrast(hex) {
  const c = hex.replace("#", "").match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return 1.05 / (L + 0.05);
}

RENDER.sysadmin = (root) => {
  const v = state.view;
  root.innerHTML = `${appBar("Admin système", "Système Démo")}
  <div class="page">
    <span class="eyebrow">Administration YODAN</span>
    <h1>Partenaires</h1>
    ${tabsHtml([{ id: "tenants", label: "Espaces partenaires" }, { id: "create", label: "+ Nouveau partenaire" }], v)}
    <div id="sy-body"></div>
  </div>`;
  bindTabs(root);
  const body = $("#sy-body", root);
  if (v === "tenants") {
    listBlock(body, {
      key: "tenants", placeholder: "Rechercher un partenaire, un test, un type…",
      rows: () => db.tenants, text: (t) => `${t.name} ${t.slug} ${t.test} ${TYPE_LABEL[t.type]}`,
      render: (rows) => `<div class="grid-3">${rows.map((t) => { const i = db.tenants.indexOf(t); return `<div class="card"><div class="row-between"><h3 style="margin:0"><i class="sw" style="background:${t.color};width:12px;height:12px"></i> ${esc(t.name)}</h3><span class="badge b-ok">${t.state}</span></div>
        <p class="small muted">/${esc(t.slug)} · test ${t.test} · ${t.agencies} agence${t.agencies > 1 ? "s" : ""}</p>
        <p><span class="badge ${t.type === "assureur" ? "b-info" : "b-wait"}">Agences ${TYPE_LABEL[t.type].toLowerCase()}s</span>${t.yodanLink ? ` <span class="badge b-ok">🔗 Relié à ${esc(t.yodanLink)}</span>` : ""}</p>
        <p>${t.modules.map((m) => `<span class="chip">${m}</span>`).join(" ")}</p>
        <div class="stack"><button type="button" class="btn btn-block" data-act="settings" data-i="${i}">Réglages →</button>
        <button type="button" class="btn btn-ghost btn-block" data-act="fields" data-i="${i}">Questionnaire · Bilan</button></div></div>`; }).join("")}</div>`,
      bind: (res) => bind(res, { settings: (el) => tenantSettings(db.tenants[+el.dataset.i], null), fields: (el) => tenantSettings(db.tenants[+el.dataset.i], "form") }),
    });
    return;
  }
  body.innerHTML = `<div class="card" style="max-width:720px" id="sy-wz"></div>`;
  const d = { name: "", slug: "", tested: false, type: null, yodanLink: "Yodan Démo", test: DEFAULT_TEST };
  const typeStep = {
    label: "Type d'agences",
    html: () => `<p class="muted" style="margin-top:0">S'applique à toutes les agences du partenaire.</p>
      <div class="choice-cards" style="grid-template-columns:1fr">${Object.keys(TYPE_LABEL).map((k) => `<button type="button" class="choice-card ${d.type === k ? "on" : ""}" data-act="type" data-t="${k}"><strong>${k === "assureur" ? "🏦" : "🤝"} ${TYPE_LABEL[k]}</strong><span class="muted small">${TYPE_TEXT[k]}</span></button>`).join("")}</div>
      ${d.type === "non_assureur" ? `<div class="banner banner-info" style="margin-top:1rem;flex-direction:column">🔗 Le super administrateur sera relié à un compte admin Yodan (passage d'un espace à l'autre avec un code par email, sans cumuler les droits).
        <select id="ty-link" style="margin-top:.5rem" aria-label="Admin Yodan relié"><option>Yodan Démo</option><option>Autre admin Yodan…</option></select></div>` : ""}
      <div class="wizard-foot"><button type="button" class="btn btn-ghost" data-act="back">← Retour</button><button type="button" class="btn btn-primary" data-act="next" ${d.type ? "" : "disabled"}>Continuer</button></div>`,
    bind: (root2, api) => {
      bind(root2, { type: (el) => { d.type = el.dataset.t; if (d.type === "assureur") { api.next(); } else { api.redraw(); } } });
      $("#ty-link", root2)?.addEventListener("change", (e) => { d.yodanLink = e.target.value; });
    },
  };
  runWizard($("#sy-wz", body), [
    { label: "Partenaire et test", html: () => `<div class="field"><label for="t-n">Nom</label><input id="t-n" type="text" value="${esc(d.name)}" placeholder="Nom du partenaire"></div>
      <div class="field"><label>Adresse de l'espace</label><div class="chip" id="t-s">pec.exemple.ci/${esc(d.slug) || "…"}</div><div class="hint">Déduite du nom, modifiable plus tard.</div></div>
      <label style="font-weight:600;font-size:.9rem">Test de dépistage</label>
      <div class="choice-cards" style="grid-template-columns:1fr 1fr;margin-top:.4rem">${Object.entries(TESTS).map(([k, [ico, title, sub]]) => `<button type="button" class="choice-card ${d.test === k ? "on" : ""}" data-act="pick-test" data-t="${k}"><span class="ico">${ico}</span><strong>${k}${k === DEFAULT_TEST ? ' <span class="badge b-neutral">par défaut</span>' : ""}</strong><span class="muted small">${title} · ${sub}</span></button>`).join("")}</div>
      <div class="hint">Modifiable ensuite dans les réglages ; un changement ne s'applique qu'aux nouvelles évaluations.</div>
      <div class="wizard-foot"><span></span><button type="button" class="btn btn-primary" data-act="next">Continuer</button></div>`,
      bind: (root2) => {
        $("#t-n", root2).addEventListener("input", (e) => { d.name = e.target.value; d.slug = slug(d.name).replace(/_/g, "-"); $("#t-s", root2).textContent = `pec.exemple.ci/${d.slug || "…"}`; });
        bind(root2, { "pick-test": (el) => { d.test = el.dataset.t; $$("[data-act=pick-test]", root2).forEach((x) => x.classList.toggle("on", x === el)); } });
      } },
    typeStep,
    { label: "Base", html: () => `<div class="grid-2"><div class="field"><label for="db-h">Hôte</label><input id="db-h" type="text" value="db.interne"></div><div class="field"><label for="db-n">Nom de la base</label><input id="db-n" type="text" value="pec_${esc(d.slug.replace(/-/g, "_"))}"></div><div class="field"><label for="db-u">Utilisateur</label><input id="db-u" type="text"></div><div class="field"><label for="db-p">Mot de passe</label><input id="db-p" type="password" autocomplete="new-password"></div></div>
      <div class="switch-row"><span>Connexion chiffrée (TLS)</span><button type="button" class="toggle on" aria-label="TLS" onclick="this.classList.toggle('on')"></button></div>
      <div id="db-res" style="margin-top:1rem">${d.tested ? '<div class="banner banner-ok">✓ Connexion réussie</div>' : ""}</div>
      <div class="wizard-foot"><button type="button" class="btn btn-ghost" data-act="back">← Retour</button><button type="button" class="btn btn-primary" data-act="test">${d.tested ? "Continuer" : "Tester et continuer"}</button></div>`,
      bind: (root2, api) => bind(root2, { test: () => { if (d.tested) { api.next(); return; } $("#db-res", root2).innerHTML = '<div class="banner banner-info">⏳ Test de la connexion…</div>'; state.timer = setTimeout(() => { d.tested = true; api.next(); toast("Connexion réussie."); }, 700); } }) },
    { label: "Super admin", html: () => `<div class="field"><label for="sa-n">Nom</label><input id="sa-n" type="text"></div><div class="field"><label for="sa-e">Email</label><input id="sa-e" type="email"></div><div class="switch-row"><span>Envoyer le mot de passe temporaire par email</span><button type="button" class="toggle on" aria-label="Envoyer par email" onclick="this.classList.toggle('on')"></button></div><div class="wizard-foot"><button type="button" class="btn btn-ghost" data-act="back">← Retour</button><button type="button" class="btn btn-primary" data-act="next">Continuer</button></div>` },
    { label: "Récapitulatif", html: () => `<dl class="kv"><dt>Partenaire</dt><dd>${esc(d.name || "—")}</dd><dt>Adresse</dt><dd>/${esc(d.slug || "—")}</dd><dt>Test</dt><dd>${d.test} — ${TESTS[d.test][1]}</dd><dt>Agences</dt><dd>${d.type ? TYPE_LABEL[d.type] : "—"}</dd><dt>Compte Yodan relié</dt><dd>${d.type === "non_assureur" ? `🔗 ${esc(d.yodanLink)}` : "Non"}</dd><dt>Base</dt><dd>${d.tested ? "✓ testée" : "non testée"}</dd></dl><div class="wizard-foot"><button type="button" class="btn btn-ghost" data-act="back">← Retour</button><button type="button" class="btn btn-primary btn-lg" data-act="next">Créer l'espace</button></div>` },
  ], d, () => { db.tenants.push({ name: d.name || "Nouveau partenaire", slug: d.slug || "nouveau", test: d.test, state: "Actif", agencies: 0, modules: ["Évaluation", "Validation"], type: d.type || "assureur", yodanLink: d.type === "non_assureur" ? d.yodanLink : null, color: "#0b6e6e" }); toast(d.type === "non_assureur" ? "Espace créé, super admin relié à Yodan." : "Espace créé."); setView("tenants"); });
};

/** Réglages d'un partenaire : un bloc déroulable par sujet ; chaque bloc fermé affiche son réglage actuel. */
function tenantSettings(t, start) {
  accOpen.tenant = start;
  drawer(`Réglages — ${t.name}`, "", (b) => {
    const draw = () => {
      const bilanMeta = () => { const pre = consentsOf("pre").length, post = consentsOf("post").length, links = db.bilan.links.length; return `${pre} pré · ${post} post-consentement${post > 1 ? "s" : ""} · ${links} lien${links > 1 ? "s" : ""}`; };
      const contrast = whiteContrast(t.color);
      b.innerHTML = `<p class="small muted" style="margin-top:0">Enregistré automatiquement. Ouvrez un bloc pour le modifier.</p>
        ${acc("tenant", "parcours", { ico: "🧭", title: "Parcours", meta: `Agences ${TYPE_LABEL[t.type].toLowerCase()}s · ${t.modules.join(" + ") || "aucun module"} · ${t.retention || 24} mois · ${t.maxSessions || 8} séances`, body: `<div id="sec-parcours">
          <label style="font-weight:600;font-size:.9rem">Type d'agences <span class="muted small">(toutes les agences du partenaire)</span></label>
          <div class="segmented full" data-seg="ptype" style="margin:.4rem 0 .3rem">${Object.keys(TYPE_LABEL).map((k) => `<button type="button" data-v="${k}" class="${t.type === k ? "on" : ""}">${TYPE_LABEL[k]}</button>`).join("")}</div>
          <p class="small muted" style="margin-top:0">${TYPE_TEXT[t.type]}${t.yodanLink ? ` 🔗 Super admin relié à ${esc(t.yodanLink)}.` : ""}</p>
          ${[["Évaluation", "Profil évaluateur (questionnaire avec le patient)"], ["Validation", "Profil validateur (sinon le superviseur décide)"]].map(([m, d]) => `<div class="switch-row"><div><strong>${m}</strong><div class="small muted">${d}</div></div><button type="button" class="toggle ${t.modules.includes(m) ? "on" : ""}" data-act="mod" data-m="${m}" aria-label="${m}"></button></div>`).join("")}
          <div class="grid-2" style="margin-top:1rem"><div class="field"><label for="ret">Dossiers clos conservés (mois)</label><input id="ret" type="number" min="1" value="${t.retention || 24}" data-k="retention"></div><div class="field"><label for="max">Séances par prise en charge</label><input id="max" type="number" min="1" value="${t.maxSessions || 8}" data-k="maxSessions"></div></div></div>` })}
        ${acc("tenant", "test", { ico: "🧠", title: "Test de dépistage", meta: `${t.test} — ${TESTS[t.test]?.[1] || ""}`, body: `<div id="sec-test"><div class="choice-cards" style="grid-template-columns:1fr 1fr">${Object.entries(TESTS).map(([k, [ico, title]]) => `<button type="button" class="choice-card ${t.test === k ? "on" : ""}" data-act="test" data-t="${k}"><span class="ico">${ico}</span><strong>${k}</strong><span class="muted small">${title}</span></button>`).join("")}</div><p class="small muted">S'applique aux nouvelles évaluations.</p></div>` })}
        ${acc("tenant", "theme", { ico: "🎨", title: "Thème", meta: `<i class="sw" style="background:${t.color}"></i> ${t.color} · titre « ${esc(t.name)} »`, body: `<div id="sec-theme"><div class="grid-2"><div class="field"><label for="th-t">Titre</label><input id="th-t" type="text" value="${esc(t.name)}"></div><div class="field"><label for="th-c">Couleur des espaces du partenaire</label><input id="th-c" type="color" value="${t.color}" style="height:44px"></div></div>
          ${contrast < 4.5 ? `<div class="banner banner-warn" style="margin-bottom:.8rem">Texte blanc peu lisible sur cette couleur (contraste ${contrast.toFixed(1)} : 1, minimum conseillé 4,5). Choisissez une teinte plus foncée.</div>` : ""}
          <div class="preview-box" style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap"><span class="small muted">Aperçu :</span><span class="btn" style="background:${t.color};border-color:${t.color};color:#fff">Bouton principal</span><span class="badge" style="background:color-mix(in srgb, ${t.color} 12%, #fff);color:${t.color}">Onglet actif</span></div>
          <button type="button" class="btn" style="margin-top:.8rem">Déposer un logo</button>
          <p class="small muted">Les espaces Yodan (connexion, praticiens, admin Yodan) gardent la charte YODAN.</p></div>` })}
        ${acc("tenant", "form", { ico: "📝", title: "Questionnaire", meta: `${db.fields.length} champs remplis avant le test`, action: `<button type="button" class="btn btn-sm" data-act="add-field">+ Champ</button>`, body: `<div id="sec-form"></div>` })}
        ${acc("tenant", "bilan", { ico: "📋", title: "Bilan", meta: bilanMeta(), body: `<div id="sec-bilan"></div>` })}
        ${acc("tenant", "advanced", { ico: "⚙️", title: "Avancé", meta: `Base de données · compte Yodan ${t.yodanLink ? "relié" : "non relié"} · suppression`, body: `<div class="stack"><button type="button" class="btn btn-block">Accès à la base de données</button><button type="button" class="btn btn-block">Compte Yodan relié : ${t.yodanLink ? `🔗 ${esc(t.yodanLink)}${t.type === "non_assureur" ? " (par défaut)" : ""}` : "aucun"}</button><button type="button" class="btn btn-block">Nouveau mot de passe du super admin</button><button type="button" class="btn btn-danger btn-block">Supprimer l'espace…</button></div>` })}`;
      bindAcc(b);
      drawFields($("#sec-form", b), draw);
      drawBilan($("#sec-bilan", b), () => { const m = $('details[data-id="bilan"] .acc-meta', b); if (m) m.textContent = bilanMeta(); });
      const parcours = $("#sec-parcours", b);
      segmented(parcours, (k, v) => {
        if (k !== "ptype") return;
        setPartnerType(t, v);
        toast(v === "non_assureur" ? `Toutes les agences passent en non assureur ; super admin relié à ${esc(t.yodanLink)}.` : "Toutes les agences passent en assureur.");
        draw();
      });
      $$("[data-k]", parcours).forEach((i) => i.addEventListener("change", () => { t[i.dataset.k] = +i.value || null; toast("Enregistré"); draw(); }));
      bind(b, {
        mod: (el) => { const m = el.dataset.m; t.modules = t.modules.includes(m) ? t.modules.filter((x) => x !== m) : [...t.modules, m]; toast("Enregistré"); draw(); },
        test: (el) => { t.test = el.dataset.t; toast("Test enregistré"); draw(); },
        "add-field": () => { accOpen.tenant = "form"; fieldWizard(draw); },
      });
      $("#th-c", b).addEventListener("change", (e) => { t.color = e.target.value; toast("Couleur appliquée aux espaces du partenaire."); draw(); });
      $("#th-t", b).addEventListener("change", () => toast("Enregistré"));
    };
    draw();
  });
}

function drawFields(box, redraw) {
  const typeOf = (f) => FIELD_TYPES[f.type][0];
  box.innerHTML = `<p class="muted small" style="margin-top:0">Champs remplis avant le test, dans cet ordre. Un nouveau champ apparaît tout de suite dans l'assistant de l'évaluateur.</p>
    ${db.fields.map((f, i) => `<div class="row-item"><span class="grow"><span class="lbl">${esc(f.label)}</span><span class="small muted">${typeOf(f)} · ${f.level === "person" ? "Personne" : "Dossier"}${f.options ? ` · ${activeOptions(f).length} valeurs` : ""}</span>
      <span style="display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.2rem">${f.pii ? '<span class="badge b-info">🔒 PII</span>' : ""}${f.required ? '<span class="badge b-neutral">Obligatoire</span>' : ""}${f.visibleIf ? `<span class="badge b-wait">Si ${esc(f.visibleIf.field)} = ${esc(f.visibleIf.value)}</span>` : ""}${f.custom ? '<span class="badge b-ok">Nouveau</span>' : ""}</span></span>
      <span class="acts">${i > 0 ? `<button type="button" class="btn btn-ghost btn-sm" data-act="up" data-i="${i}" aria-label="Monter ${esc(f.label)}">↑</button>` : ""}${f.custom ? `<button type="button" class="btn btn-ghost btn-sm" data-act="del" data-i="${i}" aria-label="Retirer ${esc(f.label)}">✕</button>` : ""}</span></div>`).join("")}
    <button type="button" class="btn btn-primary btn-sm" style="margin-top:.6rem" data-act="add">+ Ajouter un champ</button>`;
  bind(box, {
    add: () => fieldWizard(redraw),
    up: (el) => { const i = +el.dataset.i; [db.fields[i - 1], db.fields[i]] = [db.fields[i], db.fields[i - 1]]; redraw(); },
    del: (el) => { const f = db.fields.splice(+el.dataset.i, 1)[0]; toast(`Champ « ${esc(f.label)} » désactivé (ses valeurs restent dans les dossiers).`); redraw(); },
  });
}

/** Ajout d'un champ : Type → Libellé → Valeurs par défaut / Bornes → Confidentialité → Aperçu. Les étapes sans objet disparaissent. */
function fieldWizard(onDone) {
  accOpen.fwadv = null;
  drawer("Nouveau champ du questionnaire", "", (b, close) => {
    const d = { type: null, label: "", key: "", keyEdited: false, level: "case", identifier: false, options: "", min: "", max: "", bands: "", pii: false, required: true, locks: false, ifField: "", ifValue: "", hidden: [] };
    const hasChoices = () => ["select", "checkbox"].includes(d.type);
    const choiceFields = () => db.fields.filter((f) => ["select", "checkbox"].includes(f.type) && f.options?.length);
    const options = () => [...new Set(d.options.split("\n").map((s) => s.trim()).filter(Boolean))];
    const field = () => ({ label: d.label || "Nouveau champ", key: d.key || "nouveau_champ", type: d.type, options: options(), min: d.min, max: d.max, required: d.required || d.identifier });
    const hiddenList = () => [...new Set([...(d.pii ? PII_HIDDEN : []), ...d.hidden])];
    const foot = (nextLabel = "Continuer", disabled = false) => `<div class="wizard-foot"><button type="button" class="btn btn-ghost" data-act="w-back">← Retour</button><button type="button" class="btn btn-primary" data-act="w-next" ${disabled ? "disabled" : ""}>${nextLabel}</button></div>`;
    const chips = () => `${options().map((o) => `<span class="chip">${esc(o)}</span>`).join("")}${options().length ? `<span class="small muted" style="align-self:center">${options().length} valeur${options().length > 1 ? "s" : ""}</span>` : ""}`;

    const STEPS = {
      Type: {
        html: () => `<p class="muted" style="margin-top:0">Que doit saisir l'évaluateur ?</p><div class="choice-cards" style="grid-template-columns:1fr 1fr">${Object.entries(FIELD_TYPES).map(([k, [l, i, ex]]) => `<button type="button" class="choice-card ${d.type === k ? "on" : ""}" data-act="type" data-t="${k}"><span class="ico">${i}</span><strong>${l}</strong><span class="muted small">${ex}</span></button>`).join("")}</div>`,
        bind: () => bind(b, { type: (el) => { d.type = el.dataset.t; if (!["text", "tel", "email"].includes(d.type)) d.identifier = false; d.pii = ["tel", "email"].includes(d.type); goNext("Type"); } }),
      },
      Libellé: {
        html: () => `<div class="field"><label for="fw-l">Libellé affiché</label><input id="fw-l" type="text" value="${esc(d.label)}" placeholder="Ex. : Situation familiale" maxlength="120"></div>
          <div class="field"><label for="fw-k">Clé technique</label><input id="fw-k" type="text" value="${esc(d.key)}" pattern="[a-z][a-z0-9_]{1,39}"><div class="hint">Remplie depuis le libellé. Minuscules, chiffres et _ ; <strong>définitive</strong>.</div></div>
          <label style="font-weight:600;font-size:.9rem">Niveau <span class="muted small">(définitif)</span></label>
          <div class="choice-cards" style="grid-template-columns:1fr 1fr;margin:.4rem 0 1rem">
            <button type="button" class="choice-card ${d.level === "person" ? "on" : ""}" data-act="level" data-l="person"><strong>👤 Personne</strong><span class="muted small">Repris d'un dossier à l'autre (ex. date de naissance).</span></button>
            <button type="button" class="choice-card ${d.level === "case" ? "on" : ""}" data-act="level" data-l="case"><strong>📁 Dossier</strong><span class="muted small">Propre à chaque épisode (ex. date de l'accident).</span></button>
          </div>
          ${["text", "tel", "email"].includes(d.type) ? `<div class="switch-row"><div><strong>Identifiant de la personne</strong><div class="small muted">Sert à retrouver la personne (comme le N° d'immatriculation). Toujours obligatoire et chiffré.</div></div><button type="button" class="toggle ${d.identifier ? "on" : ""}" data-act="ident" aria-label="Identifiant"></button></div>` : ""}
          ${foot()}`,
        bind: () => {
          const l = $("#fw-l", b), k = $("#fw-k", b);
          l.addEventListener("input", () => { d.label = l.value; if (!d.keyEdited) { d.key = slug(l.value).slice(0, 40); k.value = d.key; } });
          k.addEventListener("input", () => { d.key = k.value; d.keyEdited = true; });
          bind(b, {
            level: (el) => { d.level = el.dataset.l; draw(); },
            ident: (el) => { d.identifier = !d.identifier; if (d.identifier) { d.pii = true; d.required = true; } el.classList.toggle("on", d.identifier); },
            "w-next": () => { if (!d.label.trim()) { toast("Donnez un libellé au champ."); l.focus(); return; } if (!/^[a-z][a-z0-9_]{1,39}$/.test(d.key)) { toast("Clé technique invalide."); k.focus(); return; } goNext("Libellé"); },
          });
        },
      },
      Valeurs: {
        html: () => hasChoices()
          ? `<div class="field"><label for="fw-o">Valeurs par défaut <span class="muted small">(une par ligne)</span></label><textarea id="fw-o" rows="6" placeholder="Célibataire&#10;Marié(e)&#10;Veuf(ve)">${esc(d.options)}</textarea>
              <div class="hint">Tapez ou collez une valeur par ligne (au moins 2). Le super admin du partenaire pourra ensuite en ajouter, en renommer ou en désactiver dans <strong>Paramètres → Listes du formulaire</strong>.</div></div>
            <div id="fw-chips" style="display:flex;gap:.3rem;flex-wrap:wrap">${chips()}</div>
            ${foot("Continuer", options().length < 2)}`
          : `<div class="grid-2"><div class="field"><label for="fw-min">Valeur minimale</label><input id="fw-min" type="number" value="${esc(d.min)}"></div><div class="field"><label for="fw-max">Valeur maximale</label><input id="fw-max" type="number" value="${esc(d.max)}"></div></div>
            <div class="field"><label for="fw-b">Tranches pour les statistiques <span class="muted small">(facultatif)</span></label><input id="fw-b" type="text" value="${esc(d.bands)}" placeholder="0-17, 18-25, 26-35, 36+"><div class="hint">Permet de filtrer les graphiques par tranche (champ non PII uniquement).</div></div>${foot()}`,
        bind: () => {
          const ta = $("#fw-o", b);
          ta?.addEventListener("input", () => { d.options = ta.value; $("#fw-chips", b).innerHTML = chips(); $("[data-act=w-next]", b).disabled = options().length < 2; });
          [["fw-min", "min"], ["fw-max", "max"], ["fw-b", "bands"]].forEach(([id, k]) => $(`#${id}`, b)?.addEventListener("input", (e) => { d[k] = e.target.value; }));
          bind(b, { "w-next": () => goNext("Valeurs") });
          ta?.focus();
        },
      },
      Confidentialité: {
        html: () => {
          const forced = d.pii ? PII_HIDDEN : [];
          const fields = choiceFields();
          const cond = fields.find((f) => f.label === d.ifField);
          return `<div class="switch-row"><div><strong>🔒 Donnée d'identité (PII)</strong><div class="small muted">Chiffrée et rangée avec l'identité. Jamais montrée au superviseur ni au-dessus, jamais filtrable. À activer pour tout champ libre précis (nom, adresse, profession…).</div></div><button type="button" class="toggle ${d.pii ? "on" : ""}" data-act="pii" aria-label="PII" ${d.identifier ? "disabled" : ""}></button></div>
            <div class="switch-row"><span>Obligatoire</span><button type="button" class="toggle ${d.required ? "on" : ""}" data-act="req" aria-label="Obligatoire"></button></div>
            <div class="switch-row"><div><span>Fixé une fois connu</span><div class="small muted">Grisé au test suivant ${d.level === "person" ? "de la même personne" : "du même dossier"}.</div></div><button type="button" class="toggle ${d.locks ? "on" : ""}" data-act="locks" aria-label="Fixé une fois connu"></button></div>
            <p class="small muted" style="margin:1rem 0 .4rem;font-weight:700">Options avancées</p>
            ${acc("fwadv", "cond", { sub: true, ico: "👁", title: "Afficher seulement si…", meta: d.ifField ? `Si « ${esc(d.ifField)} » = ${esc(d.ifValue)}` : "Toujours affiché", body: `<div class="grid-2"><select id="fw-if" aria-label="Champ condition"><option value="">Toujours affiché</option>${fields.map((f) => `<option ${d.ifField === f.label ? "selected" : ""}>${esc(f.label)}</option>`).join("")}</select>
              <select id="fw-ifv" aria-label="Valeur" ${cond ? "" : "disabled"}>${(cond ? activeOptions(cond) : []).map((o) => `<option ${d.ifValue === o ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></div>` })}
            ${acc("fwadv", "hide", { sub: true, ico: "🙈", title: "Masqué pour…", meta: esc(hiddenList().join(", ") || "Aucun rôle"), body: `<p class="small muted" style="margin-top:0">La valeur n'est jamais lue pour ces rôles (fiches, listes, exports, filtres). L'évaluateur et le validateur la voient toujours.</p>
              <div style="display:flex;gap:.4rem;flex-wrap:wrap">${HIDEABLE_ROLES.map((r) => `<button type="button" class="role-chip ${forced.includes(r) || d.hidden.includes(r) ? "on" : ""}" data-act="hide" data-r="${r}" ${forced.includes(r) ? "disabled title='Imposé par PII'" : ""}>${r}</button>`).join("")}</div>
              ${forced.length ? '<p class="small muted">Superviseur, administrateur et super admin : imposé par « PII ».</p>' : ""}` })}
            ${foot()}`;
        },
        bind: () => {
          bindAcc(b);
          bind(b, {
            pii: () => { d.pii = !d.pii; draw(); },
            req: (el) => { d.required = !d.required; el.classList.toggle("on", d.required); },
            locks: (el) => { d.locks = !d.locks; el.classList.toggle("on", d.locks); },
            hide: (el) => { const r = el.dataset.r; d.hidden = d.hidden.includes(r) ? d.hidden.filter((x) => x !== r) : [...d.hidden, r]; el.classList.toggle("on"); $('details[data-id="hide"] .acc-meta', b).textContent = hiddenList().join(", ") || "Aucun rôle"; },
            "w-next": () => goNext("Confidentialité"),
          });
          $("#fw-if", b).addEventListener("change", (e) => { d.ifField = e.target.value; const f = choiceFields().find((x) => x.label === d.ifField); d.ifValue = f ? activeOptions(f)[0] || "" : ""; draw(); });
          $("#fw-ifv", b).addEventListener("change", (e) => { d.ifValue = e.target.value; $('details[data-id="cond"] .acc-meta', b).textContent = `Si « ${d.ifField} » = ${d.ifValue}`; });
        },
      },
      Aperçu: {
        html: () => `<p class="muted" style="margin-top:0">Ce que verra l'évaluateur :</p><div class="preview-box">${fieldInputHtml(field(), "pv")}${d.ifField ? `<p class="small muted" style="margin:0">Affiché seulement si « ${esc(d.ifField)} » = ${esc(d.ifValue)}.</p>` : ""}</div>
          <dl class="kv" style="margin-top:1rem"><dt>Type</dt><dd>${FIELD_TYPES[d.type][0]}</dd><dt>Clé</dt><dd>${esc(d.key)}</dd><dt>Niveau</dt><dd>${d.level === "person" ? "Personne" : "Dossier"}</dd>${hasChoices() ? `<dt>Valeurs par défaut</dt><dd>${options().length} · complétées par le super admin</dd>` : ""}<dt>Identifiant</dt><dd>${d.identifier ? "Oui" : "Non"}</dd><dt>PII</dt><dd>${d.pii ? "Oui, chiffré" : "Non"}</dd><dt>Obligatoire</dt><dd>${d.required ? "Oui" : "Non"}</dd><dt>Masqué pour</dt><dd>${hiddenList().join(", ") || "—"}</dd></dl>
          ${foot("Créer le champ")}`,
        bind: () => {
          segmented(b, () => {});
          bind(b, { "w-next": () => {
            db.fields.push({ ...field(), level: d.level, pii: d.pii, locks: d.locks, identifier: d.identifier, hidden: hiddenList(), visibleIf: d.ifField ? { field: d.ifField, value: d.ifValue } : null, custom: true, off: [] });
            close(); toast(`Champ « ${esc(d.label)} » ajouté au questionnaire.`); onDone();
          } });
        },
      },
    };
    const names = () => ["Type", "Libellé", ...(hasChoices() || d.type === "number" ? ["Valeurs"] : []), ...(d.identifier ? [] : ["Confidentialité"]), "Aperçu"];
    let cur = "Type";
    const draw = () => {
      const list = names();
      b.innerHTML = stepperHtml(list, list.indexOf(cur)) + `<div class="wz-body">${STEPS[cur].html()}</div>`;
      STEPS[cur].bind();
      bind(b, { "w-back": () => { const l = names(); cur = l[Math.max(0, l.indexOf(cur) - 1)]; draw(); } });
      if (cur === "Libellé") $("#fw-l", b)?.focus();
    };
    const goNext = (from) => { const l = names(); cur = l[l.indexOf(from) + 1]; draw(); };
    draw();
  });
}

/**
 * Contenus du bilan en 4 blocs déroulables : pré-consentements, post-consentements, liens, aperçu.
 * Chaque élément tient sur une ligne ; « Modifier » l'ouvre. refreshMeta met à jour le résumé du bloc parent.
 */
const bilanEdit = { id: null };
const bilanPreview = { zone: "ORANGE" };
function drawBilan(box, refreshMeta) {
  const B = db.bilan;
  const zonesText = (l) => l.zones.map((z) => ZONE_SHORT[z]).join(", ") || "aucune zone";
  const draw = () => {
    const pre = B.consents.filter((c) => c.moment === "pre"), post = B.consents.filter((c) => c.moment === "post");
    const consentRow = (c) => {
      const i = B.consents.indexOf(c);
      if (bilanEdit.id === c.id) {
        return `<div class="editor" data-editor="${c.id}">
          ${c.moment === "post" ? `<div class="segmented full" data-seg="ctype-${i}" style="margin-bottom:.5rem"><button type="button" data-v="consent" class="${c.type === "consent" ? "on" : ""}">Consentement</button><button type="button" data-v="callback" class="${c.type === "callback" ? "on" : ""}">📞 Demande d'appel</button></div>` : ""}
          <input type="text" value="${esc(c.label)}" data-c="${i}" placeholder="J'accepte…" aria-label="Libellé du consentement">
          ${c.moment === "pre" ? `<div class="switch-row" style="padding:.4rem 0 0;border:0"><span class="small">Obligatoire <span class="muted">(refus = l'évaluation s'arrête)</span></span><button type="button" class="toggle ${c.required ? "on" : ""}" data-act="req-c" data-i="${i}" aria-label="Obligatoire"></button></div>` : ""}
          ${c.type === "callback" ? '<div class="hint">Si le patient accepte, il entre dans la file « À appeler » du validateur.</div>' : ""}
          <div class="row-between" style="margin-top:.6rem"><button type="button" class="btn btn-ghost btn-sm" data-act="rm-c" data-i="${i}">Retirer</button><button type="button" class="btn btn-primary btn-sm" data-act="done-edit">OK</button></div></div>`;
      }
      return `<div class="row-item"><span class="grow"><span class="lbl">${c.type === "callback" ? "📞 " : ""}${esc(c.label) || '<span class="muted">Sans libellé</span>'}</span>
        <span class="small muted">${c.moment === "pre" ? (c.required ? "Obligatoire" : "Facultatif") : c.type === "callback" ? "Demande d'appel → file « À appeler »" : "Consentement"}</span></span>
        <span class="acts"><button type="button" class="btn btn-ghost btn-sm" data-act="edit" data-id="${c.id}" aria-label="Modifier">✎</button><button type="button" class="btn btn-ghost btn-sm" data-act="rm-c" data-i="${i}" aria-label="Retirer">✕</button></span></div>`;
    };
    const linkRow = (l, i) => (bilanEdit.id === l.id
      ? `<div class="editor" data-editor="${l.id}"><div class="stack"><input type="text" value="${esc(l.label)}" data-l="${i}" data-k="label" placeholder="Texte du lien" aria-label="Texte du lien">
          <input type="text" value="${esc(l.url)}" data-l="${i}" data-k="url" placeholder="https://…" aria-label="Adresse du lien">
          <div style="display:flex;gap:.3rem;flex-wrap:wrap;align-items:center"><span class="small muted">Affiché pour :</span>${["VERT", "ORANGE", "ROUGE"].map((z) => `<button type="button" class="role-chip ${l.zones.includes(z) ? "on" : ""}" data-act="lz" data-i="${i}" data-z="${z}">${ZONE_SHORT[z]}</button>`).join("")}</div></div>
          <div class="row-between" style="margin-top:.6rem"><button type="button" class="btn btn-ghost btn-sm" data-act="rm-l" data-i="${i}">Retirer</button><button type="button" class="btn btn-primary btn-sm" data-act="done-edit">OK</button></div></div>`
      : `<div class="row-item"><span class="grow"><span class="lbl">↗ ${esc(l.label) || '<span class="muted">Sans texte</span>'}</span><span class="small muted">${esc(l.url)} · ${zonesText(l)}</span></span>
          <span class="acts"><button type="button" class="btn btn-ghost btn-sm" data-act="edit" data-id="${l.id}" aria-label="Modifier">✎</button><button type="button" class="btn btn-ghost btn-sm" data-act="rm-l" data-i="${i}" aria-label="Retirer">✕</button></span></div>`);
    const add = (act, m) => `<button type="button" class="btn btn-sm" data-act="${act}" ${m ? `data-m="${m}"` : ""}>+ Ajouter</button>`;
    const req = pre.filter((c) => c.required).length;
    box.innerHTML = `
      ${acc("bilan", "pre", { sub: true, ico: "①", title: "Pré-consentements", meta: `${pre.length} · avant le questionnaire${req ? ` · ${req} obligatoire${req > 1 ? "s" : ""}` : ""}`, action: add("add-c", "pre"), body: pre.map(consentRow).join("") || '<p class="muted small" style="margin:0">Aucun : l\'étape disparaît du parcours.</p>' })}
      ${acc("bilan", "post", { sub: true, ico: "②", title: "Post-consentements", meta: `${post.length} · avec le résultat${post.some((c) => c.type === "callback") ? " · dont demande d'appel" : ""}`, action: add("add-c", "post"), body: post.map(consentRow).join("") || '<p class="muted small" style="margin:0">Aucun : rien n\'est proposé avec le résultat.</p>' })}
      ${acc("bilan", "links", { sub: true, ico: "🔗", title: "Liens utiles", meta: `${B.links.length} · avec le résultat, selon la zone`, action: add("add-l"), body: B.links.map(linkRow).join("") || '<p class="muted small" style="margin:0">Aucun lien.</p>' })}
      ${acc("bilan", "preview", { sub: true, ico: "👁", title: "Aperçu du résultat", meta: "Ce que voit le patient, zone par zone", body: `<div class="segmented full" data-seg="pz" style="margin-bottom:.8rem">${["VERT", "ORANGE", "ROUGE"].map((z) => `<button type="button" data-v="${z}" class="${bilanPreview.zone === z ? "on" : ""}">${ZONE_SHORT[z]}</button>`).join("")}</div><div class="preview-box">${resultHtml(bilanPreview.zone)}</div>` })}`;
    const pc = $("#post-consents", box);
    if (pc) pc.innerHTML = consentsHtml({}, "post");
    bindAcc(box);
    B.consents.forEach((c, i) => { const seg = $(`[data-seg="ctype-${i}"]`, box); if (seg) segmented(seg.parentElement, (k, v) => { c.type = v; toast("Enregistré"); draw(); }); });
    const pz = $('[data-seg="pz"]', box);
    segmented(pz.parentElement, (k, v) => { if (k === "pz") { bilanPreview.zone = v; draw(); } });
    $$("[data-c]", box).forEach((inp) => inp.addEventListener("change", () => { B.consents[+inp.dataset.c].label = inp.value; toast("Enregistré"); }));
    $$("[data-l]", box).forEach((inp) => inp.addEventListener("change", () => {
      if (inp.dataset.k === "url" && inp.value && !/^https:\/\//.test(inp.value)) { toast("Le lien doit commencer par https://"); inp.focus(); return; }
      B.links[+inp.dataset.l][inp.dataset.k] = inp.value; toast("Enregistré");
    }));
    const openEditor = (group, id) => { bilanEdit.id = id; accOpen.bilan = group; draw(); $(`[data-editor="${id}"] input[type=text]`, box)?.focus(); };
    bind(box, {
      edit: (el) => { const id = el.dataset.id; openEditor(B.links.some((l) => l.id === id) ? "links" : B.consents.find((c) => c.id === id).moment, id); },
      "done-edit": () => { bilanEdit.id = null; draw(); },
      "add-c": (el) => { const m = el.dataset.m; const c = { id: token(), moment: m, type: "consent", required: m === "pre", label: "" }; B.consents.push(c); openEditor(m, c.id); },
      "req-c": (el) => { const c = B.consents[+el.dataset.i]; c.required = !c.required; el.classList.toggle("on", c.required); toast("Enregistré"); },
      "rm-c": (el) => { const i = +el.dataset.i; const removed = B.consents.splice(i, 1)[0]; if (bilanEdit.id === removed.id) bilanEdit.id = null; toast("Consentement retiré", () => { B.consents.splice(i, 0, removed); draw(); }); draw(); },
      "add-l": () => { const l = { id: token(), label: "", url: "https://", zones: ["VERT", "ORANGE", "ROUGE"] }; B.links.push(l); openEditor("links", l.id); },
      "rm-l": (el) => { const i = +el.dataset.i; const removed = B.links.splice(i, 1)[0]; if (bilanEdit.id === removed.id) bilanEdit.id = null; toast("Lien retiré", () => { B.links.splice(i, 0, removed); draw(); }); draw(); },
      lz: (el) => { const l = B.links[+el.dataset.i]; const z = el.dataset.z; l.zones = l.zones.includes(z) ? l.zones.filter((x) => x !== z) : [...l.zones, z]; el.classList.toggle("on"); toast("Enregistré"); },
    });
    refreshMeta?.();
  };
  draw();
}

/* =====================================================================
 * Admin Yodan
 * ===================================================================== */
RENDER.yodan = (root) => {
  const v = state.view;
  const todo = db.toAssign.length + db.ceilings.length + db.unlocks.length;
  root.innerHTML = `${appBar("Admin Yodan", "Yodan Démo", partner().yodanLink ? `<button type="button" class="btn btn-ghost btn-sm" onclick="go('superadmin')" title="Compte relié au super admin de ${esc(partner().name)}">← Espace ${esc(partner().name)}</button>` : "")}
  <div class="page">
    <span class="eyebrow">Accompagnement</span>
    <h1>Patients pris en charge</h1>
    ${tabsHtml([{ id: "todo", label: "À faire", count: todo, hot: true }, { id: "patients", label: "Patients" }, { id: "practitioners", label: "Praticiens" }, { id: "stats", label: "Statistiques" }], v)}
    <div id="yo-body"></div>
  </div>`;
  bindTabs(root);
  const body = $("#yo-body", root);
  if (v === "todo") return renderYodanTodo(body);
  if (v === "patients") return renderYodanPatients(body);
  if (v === "practitioners") return renderYodanPractitioners(body);
  renderYodanStats(body);
};

/* ---------- Statistiques Yodan : séances (histogramme) et patients par statut (camembert) ---------- */
const yo = { tenant: "" };
/** Palettes validées (daltonisme, contraste) : même ordre partout, jamais recyclé. */
const SESSION_CATS = [["Présent", "#2a9d8f"], ["Reporté", "#e9a03b"], ["Absent", "#c4504a"]];
const PATIENT_STATUS = [["En cours", "#1566AA"], ["Sans praticien", "#e9a03b"], ["Plafond atteint", "#c4504a"], ["Clos", "#2a9d8f"]];
function sessionValues(b) {
  if (b.from > TODAY) return null;
  const to = b.to > TODAY ? TODAY : b.to;
  const r = seeded(`s${b.from}${to}${yo.tenant}`);
  const days = diffDays(b.from, to) + 1;
  const weekend = b.unit === "day" && [0, 6].includes(D(b.from).getDay());
  const share = yo.tenant ? (yo.tenant === "CNPS" ? 0.75 : 0.25) : 1;
  const total = Math.round(days * (weekend ? 0.4 : 7) * share * (0.6 + r() * 0.8));
  const w = [0.8, 0.07, 0.13].map((x) => x * (0.75 + r() * 0.5));
  const sum = w.reduce((a, c) => a + c, 0);
  const vals = w.map((x) => Math.floor(total * x / sum));
  vals[0] += total - vals.reduce((a, c) => a + c, 0);
  return vals;
}
function renderYodanStats(body) {
  const { list, title } = buckets();
  const cols = list.map((b) => { const vals = sessionValues(b); return { ...b, vals, total: vals ? vals.reduce((a, c) => a + c, 0) : 0 }; });
  const tot = [0, 0, 0];
  cols.forEach((c) => c.vals?.forEach((n, k) => { tot[k] += n; }));
  const sessions = tot.reduce((a, c) => a + c, 0);
  const pats = db.patients.filter((p) => !yo.tenant || p.tenant === yo.tenant);
  const parts = PATIENT_STATUS.map(([label, color]) => ({ label, color, value: pats.filter((p) => p.status === label).length }));
  const toggles = `<div class="segmented" data-seg="scale"><button type="button" data-v="n" class="${pil.scale === "n" ? "on" : ""}">Nombre</button><button type="button" data-v="pct" class="${pil.scale === "pct" ? "on" : ""}">%</button></div>`;
  body.innerHTML = `${periodHtml()}
    <div class="toolbar"><select data-act="yo-tenant" data-ev="change" style="width:auto" aria-label="Partenaire"><option value="">Tous les partenaires</option>${db.tenants.map((t) => `<option ${yo.tenant === t.name ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select><span class="grow"></span><button type="button" class="btn btn-sm" data-act="export">⬇ Exporter</button></div>
    <div class="tiles">
      <div class="tile"><div class="n">${parts[0].value}</div><div class="l">Prises en charge en cours</div></div>
      <div class="tile"><div class="n">${sessions}</div><div class="l">Séances sur la période</div></div>
      <div class="tile"><div class="n">${sessions ? Math.round(tot[2] / sessions * 100) : 0} %</div><div class="l">Absences</div></div>
      <div class="tile"><div class="n">${parts[1].value}</div><div class="l">Patients sans praticien</div></div>
    </div>
    <div class="grid-chart">${histoCardHtml(cols, SESSION_CATS, { title, heading: "Séances", toggles, minN: 0, unit: "séances" })}
      ${donutCardHtml("Patients par statut", parts, { minN: 0, unit: "patients", hint: "Situation actuelle · cliquez une part pour ouvrir la liste", pickable: true })}</div>
    <div class="card" style="margin-top:1rem"><h3 style="margin:0 0 .6rem">Par praticien <span class="small muted">· ${esc(title)}</span></h3><div id="yo-prac"></div></div>`;
  segmented(body, (k, v) => { if (!periodSeg(k, v) && k === "scale") pil.scale = v; render(); });
  bind(body, { ...periodActs(body), "yo-tenant": (el) => { yo.tenant = el.value; render(); }, export: () => exportDrawer(false) });
  bindHisto(body, cols, SESSION_CATS, 0);
  bindDonut(body, parts, (i) => { yp.status = parts[i].label; searches.patients = ""; resetPage("patients"); go("yodan", "patients"); });
  const load = db.practitioners.reduce((a, p) => a + p.patients, 0) || 1;
  listBlock($("#yo-prac", body), {
    key: "yoStats", placeholder: "Rechercher un praticien…",
    rows: () => db.practitioners, text: (p) => `${p.name} ${p.type} ${p.city}`,
    render: (rows) => `<table class="table"><thead><tr><th>Praticien</th><th>Patients en cours</th><th>Séances</th><th>Absences</th></tr></thead><tbody>${rows.map((p) => { const n = Math.round(sessions * p.patients / load); return `<tr><td><strong>${esc(p.name)}</strong><div class="small muted">${p.type} · ${p.city}</div></td><td>${p.patients}</td><td>${n}</td><td>${n ? Math.round(tot[2] / Math.max(1, sessions) * n) : 0}</td></tr>`; }).join("")}</tbody></table>`,
  });
}

function renderYodanTodo(body) {
  body.innerHTML = `<div class="toolbar"><input type="search" class="grow" id="todo-q" value="${esc(searches.todo || "")}" placeholder="Rechercher un patient, un partenaire, un praticien…" aria-label="Rechercher dans « À faire »"></div><div id="todo-sec"></div>
    <div class="banner banner-info" style="margin-top:1rem">ℹ️ 3 rappels en attente dans les agences partenaires : traités par les validateurs, aucune action ici.</div>`;
  const sec = $("#todo-sec", body);
  const section = (title, hint, inner, extra = "") => `<div class="card"><div class="row-between"><div><h2 style="margin:0">${title}</h2><span class="muted small">${hint}</span></div>${extra}</div><div style="margin-top:.8rem">${inner}</div></div>`;
  const empty = (t) => `<p class="muted small">${t}</p>`;
  const draw = () => {
    const q = norm(searches.todo).trim();
    const match = (txt) => !q || norm(txt).includes(q);
    const nothing = q ? "Aucun résultat pour cette recherche." : null;
    const assign = paginate("todo-assign", db.toAssign.filter((p) => match(`${p.name} ${p.tenant} ${p.agency} ${p.city} ${p.suggest}`)));
    const ceil = paginate("todo-ceil", db.ceilings.filter((c) => match(`${c.name} ${c.tenant} ${c.practitioner}`)));
    const unl = paginate("todo-unlock", db.unlocks.filter((u) => match(`${u.name} ${u.tenant}`)));
    sec.innerHTML = [
      section(`Patients à attribuer <span class="count hot">${db.toAssign.length}</span>`, "Bon reçu, sans praticien. Suggestion : même ville, le moins chargé.",
        assign.rows.length ? assign.rows.map((p) => `<div class="switch-row" style="flex-wrap:wrap;gap:.5rem"><div><strong>${esc(p.name)}</strong><div class="small muted">${p.tenant} · ${p.agency} · ${p.city}</div></div>
          <div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap"><select data-p="${p.id}" style="width:auto" aria-label="Praticien pour ${esc(p.name)}">${db.practitioners.map((pr) => `<option ${pr.name === p.suggest ? "selected" : ""}>${pr.name}${pr.name === p.suggest ? " (suggéré)" : ""}</option>`).join("")}</select>
          <button type="button" class="btn btn-primary btn-sm" data-act="assign" data-id="${p.id}">Attribuer</button></div></div>`).join("") + assign.html : empty(nothing || "Tous les patients ont un praticien."),
        db.toAssign.length > 1 && !q ? `<button type="button" class="btn" data-act="assign-all">Tout attribuer</button>` : ""),
      section(`Plafond de séances atteint <span class="count">${db.ceilings.length}</span>`, "Agence non assureur : prolonger ou clore.",
        ceil.rows.length ? ceil.rows.map((c) => `<div class="switch-row"><div><strong>${esc(c.name)}</strong><div class="small muted">${c.tenant} · ${c.sessions} · ${c.practitioner}</div></div><div style="display:flex;gap:.4rem"><button type="button" class="btn btn-sm" data-act="extend" data-id="${c.id}">+ 4 séances</button><button type="button" class="btn btn-ghost btn-sm" data-act="extend" data-id="${c.id}">Clore</button></div></div>`).join("") + ceil.html : empty(nothing || "Rien à traiter.")),
      section(`Nouvelle attestation à débloquer <span class="count">${db.unlocks.length}</span>`, "Rapport final reçu : l'agence pourra émettre une nouvelle attestation.",
        unl.rows.length ? unl.rows.map((u) => `<div class="switch-row"><div><strong>${esc(u.name)}</strong><div class="small muted">${u.tenant} · ${u.report}</div></div><button type="button" class="btn btn-sm" data-act="unlock" data-id="${u.id}">Débloquer</button></div>`).join("") + unl.html : empty(nothing || "Rien à traiter.")),
    ].join("");
    ["todo-assign", "todo-ceil", "todo-unlock"].forEach((k) => bindPager(sec, k, draw));
    const assignOne = (id) => {
      const p = db.toAssign.find((x) => x.id === id);
      const pr = $(`select[data-p="${id}"]`, sec).value.replace(" (suggéré)", "");
      db.toAssign.splice(db.toAssign.indexOf(p), 1);
      const row = db.patients.find((x) => x.name === p.name);
      if (row) { row.practitioner = pr; row.status = "En cours"; }
      return [p, pr];
    };
    bind(sec, {
      assign: (el) => { const [p, pr] = assignOne(el.dataset.id); toast(`${esc(p.name)} → ${esc(pr)}`, () => { db.toAssign.unshift(p); render(); }); render(); },
      "assign-all": () => { const n = db.toAssign.length; [...db.toAssign].forEach((p) => assignOne(p.id)); toast(`${n} patients attribués.`); render(); },
      extend: (el) => { db.ceilings = db.ceilings.filter((c) => c.id !== el.dataset.id); toast("Enregistré."); render(); },
      unlock: (el) => { db.unlocks = db.unlocks.filter((c) => c.id !== el.dataset.id); toast("Débloqué : l'agence est prévenue."); render(); },
    });
  };
  $("#todo-q", body).addEventListener("input", (e) => { searches.todo = e.target.value; ["todo-assign", "todo-ceil", "todo-unlock"].forEach(resetPage); draw(); });
  draw();
}

/** Filtre de statut gardé entre deux visites (le camembert des statistiques s'en sert). */
const yp = { status: "Tous" };
function renderYodanPatients(body) {
  body.innerHTML = `<div class="card"><div class="segmented" data-seg="st" style="margin-bottom:.8rem">${["Tous", "Sans praticien", "En cours", "Plafond atteint", "Clos"].map((s) => `<button type="button" data-v="${s}" class="${yp.status === s ? "on" : ""}">${s}</button>`).join("")}</div><div id="yp-list"></div></div>`;
  const redraw = listBlock($("#yp-list", body), {
    key: "patients", placeholder: "Rechercher un patient, un partenaire, un praticien…",
    tools: `<span data-range-slot></span><button type="button" class="btn btn-sm" data-act="export">⬇ Exporter</button>`,
    rows: () => db.patients.filter((p) => (yp.status === "Tous" || p.status === yp.status) && inRange("patients", p.since)),
    text: (p) => `${p.name} ${p.tenant} ${p.practitioner}`,
    empty: "Aucun patient.",
    render: (rows) => `<table class="table"><thead><tr><th>Patient</th><th>Partenaire</th><th>Praticien</th><th>Statut</th><th>Séances</th></tr></thead>
      <tbody>${rows.map((p) => `<tr class="click" data-act="open" data-i="${db.patients.indexOf(p)}"><td><strong>${esc(p.name)}</strong><div class="small muted">depuis le ${fmt(p.since)}</div></td><td>${p.tenant}</td><td>${esc(p.practitioner)}</td><td><span class="badge ${p.status === "En cours" ? "b-ok" : p.status === "Clos" ? "b-neutral" : "b-wait"}">${p.status}</span></td><td>${p.sessions}</td></tr>`).join("")}</tbody></table>`,
    bind: (res) => bind(res, {
      open: (el) => { const p = db.patients[+el.dataset.i]; drawer(p.name, `<dl class="kv"><dt>Partenaire</dt><dd>${p.tenant}</dd><dt>Praticien</dt><dd>${esc(p.practitioner)}</dd><dt>Séances</dt><dd>${p.sessions}</dd><dt>Téléphone</dt><dd>07 00 00 00 99</dd><dt>Bon</dt><dd><a href="#" onclick="return false">Ouvrir le bon (PDF)</a></dd></dl>
        <h3 style="margin-top:1.2rem">Suivi</h3>${["Présent", "Présent", "Absent", "À venir"].map((s, i) => `<div class="switch-row"><span>Séance ${i + 1} · ${fmt(addDays(TODAY, (i - 2) * 7))}</span><span class="badge ${s === "Présent" ? "b-ok" : s === "Absent" ? "b-no" : "b-neutral"}">${s}</span></div>`).join("")}`); },
    }),
    onTools: (tools, redrawList) => {
      const slot = $("[data-range-slot]", tools);
      const paint = () => { slot.innerHTML = rangeHtml("patients"); bindRange(slot, "patients", () => { paint(); redrawList(); }); };
      paint();
      bind(tools, { export: () => exportDrawer(false) });
    },
  });
  segmented(body, (k, v) => { if (k !== "st") return; yp.status = v; resetPage("patients"); redraw(); });
}
function renderYodanPractitioners(body) {
  listBlock(body, {
    key: "practitioners", placeholder: "Rechercher un praticien, une ville…",
    tools: `<button type="button" class="btn btn-primary" data-act="add">+ Ajouter un praticien</button>`,
    rows: () => db.practitioners, text: (p) => `${p.name} ${p.type} ${p.city}`,
    render: (rows) => `<div class="card"><table class="table"><thead><tr><th>Nom</th><th>Type</th><th>Ville</th><th>Patients en cours</th><th>Actif</th></tr></thead><tbody>
      ${rows.map((p) => `<tr><td><strong>${p.name}</strong>${p.external ? ' <span class="badge b-info">externe</span>' : ""}</td><td>${p.type}</td><td>${p.city}</td><td>${p.patients}</td><td><button type="button" class="toggle ${p.active ? "on" : ""}" aria-label="Actif" onclick="this.classList.toggle('on')"></button></td></tr>`).join("")}</tbody></table></div>`,
  });
  bind($(".list-tools", body), {
    add: () => drawer("Nouveau praticien", "", (b, close) => {
      const d = {};
      runWizard(b, [
        { label: "Type", html: () => `<div class="choice-cards" style="grid-template-columns:1fr 1fr">${["Psychologue", "Psychiatre"].map((t) => `<button type="button" class="choice-card" data-act="t" data-t="${t}"><strong>${t}</strong></button>`).join("")}</div>`, bind: (r, api) => bind(r, { t: (el) => { d.type = el.dataset.t; api.next(); } }) },
        { label: "Identité", html: () => `<div class="field"><label for="pr-e">Email (identifiant)</label><input id="pr-e" type="email"></div><div class="field"><label for="pr-n">Nom affiché</label><input id="pr-n" type="text"></div><div class="wizard-foot"><button type="button" class="btn btn-ghost" data-act="back">← Retour</button><button type="button" class="btn btn-primary" data-act="next">Continuer</button></div>` },
        { label: "Rattachement", html: () => `<div class="choice-cards" style="grid-template-columns:1fr">${[["Yodan", "Reçoit les patients attribués par Yodan."], ["Externe — CNPS, Agence Plateau", "Valide les séances en présentiel par scan."]].map(([t, s]) => `<button type="button" class="choice-card" data-act="next"><strong>${t}</strong><span class="muted small">${s}</span></button>`).join("")}</div><div class="wizard-foot"><button type="button" class="btn btn-ghost" data-act="back">← Retour</button><span></span></div>` },
      ], d, () => { close(); toast(`${d.type} ajouté, email d'accès envoyé.`); });
    }),
  });
}

/* =====================================================================
 * Praticien — PC : onglets en haut ; mobile : navigation en bas
 * ===================================================================== */
const pr = { sel: TODAY, integrated: false, patient: null };
const PR_TABS = [["today", "📅", "Aujourd'hui"], ["agenda", "🗓", "Agenda"], ["patients", "👥", "Patients"], ["settings", "⚙️", "Réglages"]];
RENDER.praticien = (root) => {
  const v = state.view;
  const title = { today: "Aujourd'hui", agenda: "Agenda", patients: "Mes patients", scan: "Scanner", settings: "Réglages" }[v];
  if (isMobile()) {
    root.innerHTML = `<div class="m-shell">
      <div class="phone-top"><div class="row-between"><div class="brand">${yodanLogo(title)}</div><span class="avatar">KD</span></div></div>
      <div class="m-body" id="pr-body"></div>
      ${v === "scan" ? "" : `<button type="button" class="fab" data-act="scan">📷 Scanner</button>`}
      <nav class="phone-nav">${PR_TABS.map(([k, i, l]) => `<button type="button" data-tab="${k}" class="${v === k ? "on" : ""}"><span>${i}</span>${l}</button>`).join("")}</nav>
    </div>`;
    $$(".phone-nav [data-tab]", root).forEach((b) => b.addEventListener("click", () => setView(b.dataset.tab)));
  } else {
    root.innerHTML = `${appBar("Praticien", "Kader Démo", `<button type="button" class="btn btn-primary btn-sm" data-act="scan">📷 Scanner une attestation</button>`)}
      <div class="page narrow">${tabsHtml(PR_TABS.map(([id, , label]) => ({ id, label })), v)}<div id="pr-body"></div></div>`;
    bindTabs(root);
  }
  bind(root, { scan: () => setView("scan") });
  const body = $("#pr-body", root);
  ({ today: prToday, agenda: prAgenda, patients: prPatients, settings: prSettings, scan: prScan })[v](body);
};
function sessionCard(s) {
  return `<div class="session"><div class="row-between"><strong>${esc(s.name)}</strong><span class="small muted">${s.n}</span></div><div class="small muted">${s.where}</div>
    ${s.status ? `<div class="row-between" style="margin-top:.5rem"><span class="badge ${s.status === "Présent" ? "b-ok" : s.status === "Absent" ? "b-no" : "b-wait"}">${s.status}</span><span><button type="button" class="link-btn small" data-act="note" data-id="${s.id}">+ note</button> · <button type="button" class="link-btn small" data-act="undo" data-id="${s.id}">annuler</button></span></div>`
    : `<div class="acts"><button type="button" class="btn btn-success" data-act="mark" data-s="Présent" data-id="${s.id}">Présent</button><button type="button" class="btn" data-act="mark" data-s="Absent" data-id="${s.id}">Absent</button><button type="button" class="btn" data-act="mark" data-s="Reporté" data-id="${s.id}">Reporter</button></div>`}</div>`;
}
function bindSessions(body) {
  bind(body, {
    mark: (el) => { const s = db.sessions.find((x) => x.id === el.dataset.id); s.status = el.dataset.s; toast(s.status === "Reporté" ? "Reporté au prochain jour de travail." : `${s.status} — prochaine séance planifiée.`); render(); },
    undo: (el) => { db.sessions.find((x) => x.id === el.dataset.id).status = null; render(); },
    note: () => drawer("Observation", `<p class="small muted">Transmise au partenaire. Aucun contenu clinique : uniquement l'organisation (retard, report…).</p><textarea rows="3" aria-label="Observation"></textarea><button type="button" class="btn btn-primary btn-block" style="margin-top:.8rem" data-act="save">Enregistrer</button>`, (b, close) => bind(b, { save: () => { close(); toast("Note enregistrée."); } })),
  });
}
function prToday(body) {
  const left = db.sessions.filter((s) => !s.status).length;
  body.innerHTML = `<p class="muted small" style="margin-top:0">${fmtLong(TODAY)} · ${left} séance${left > 1 ? "s" : ""} à noter</p>
    ${pr.integrated ? "" : `<div class="banner banner-warn" style="margin-bottom:.8rem;flex-wrap:wrap;justify-content:space-between"><span><strong>2 nouveaux patients</strong> vous ont été attribués.</span><button type="button" class="btn btn-primary btn-sm" data-act="integrate">Les intégrer à l'agenda</button></div>`}
    <div class="${isMobile() ? "" : "grid-2"}">${db.sessions.map(sessionCard).join("")}</div>`;
  bindSessions(body);
  bind(body, { integrate: () => { pr.integrated = true; toast("Première séance planifiée pour 2 patients."); render(); } });
}
function prAgenda(body) {
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(monday(TODAY), i));
  const isWorking = (d) => db.weekdays[(D(d).getDay() + 6) % 7];
  const count = (d) => (d === TODAY ? db.sessions.length : isWorking(d) ? (d.charCodeAt(9) % 3) + 1 : 0);
  body.innerHTML = `<div class="week">${days.map((d) => `<button type="button" data-act="day" data-d="${d}" class="${d === pr.sel ? "on" : ""} ${isWorking(d) ? "" : "off"}">${D(d).toLocaleDateString("fr-FR", { weekday: "short" })}<b>${+d.slice(8)}</b><span class="dot ${count(d) ? "" : "none"}"></span></button>`).join("")}</div>
    <div class="row-between"><strong>${fmtLong(pr.sel)}</strong><span class="small">Travaillé <button type="button" class="toggle ${isWorking(pr.sel) ? "on" : ""}" data-act="work" aria-label="Jour travaillé" style="vertical-align:middle"></button></span></div>
    <div style="margin-top:.8rem">${pr.sel === TODAY ? db.sessions.map(sessionCard).join("") : count(pr.sel) ? Array.from({ length: count(pr.sel) }, (_, i) => `<div class="session"><strong>${["Aya Démo", "Serge Fictif", "Patient Démo B-07"][i]}</strong><div class="small muted">À venir</div></div>`).join("") : `<div class="empty">Aucune séance.</div>`}</div>`;
  bindSessions(body);
  bind(body, {
    day: (el) => { pr.sel = el.dataset.d; render(); },
    work: (el) => { el.classList.toggle("on"); toast(el.classList.contains("on") ? "Jour ouvert." : "Jour fermé : les séances glissent au jour de travail suivant."); },
  });
}
function prPatients(body) {
  if (pr.patient) {
    const p = pr.patient;
    body.innerHTML = `<button type="button" class="link-btn" data-act="back">← Mes patients</button><h2 style="margin-top:.6rem">${esc(p.name)}</h2><p class="small muted">${p.tenant} · ${p.sessions}</p>
      <div class="progress" style="margin-bottom:1rem"><i style="width:${parseInt(p.sessions, 10) / parseInt(p.sessions.split("/")[1], 10) * 100}%"></i></div>
      ${["Présent", "Présent", "Absent"].map((s, i) => `<div class="switch-row small"><span>Séance ${i + 1}</span><span class="badge ${s === "Présent" ? "b-ok" : "b-no"}">${s}</span></div>`).join("")}
      <div class="card" style="margin-top:1rem;padding:1rem" id="rep"><button type="button" class="btn btn-block" data-act="report">Déposer le rapport final</button></div>`;
    bind(body, {
      back: () => { pr.patient = null; render(); },
      report: () => {
        const d = {};
        runWizard($("#rep", body), [
          { label: "Fichier", html: () => `<button type="button" class="choice-card" data-act="next" style="width:100%;text-align:center;align-items:center;border-style:dashed"><span class="ico">📄</span><strong>Choisir le PDF</strong><span class="muted small">10 Mo max.</span></button>` },
          { label: "Issue", html: () => `<div class="choice-cards" style="grid-template-columns:1fr">${["Dossier clos", "Nouvelle prise en charge nécessaire"].map((o) => `<button type="button" class="choice-card" data-act="o" data-o="${o}"><strong>${o}</strong></button>`).join("")}</div>`, bind: (r, api) => bind(r, { o: (el) => { d.o = el.dataset.o; api.next(); } }) },
          { label: "Envoi", html: () => `<p>rapport_final.pdf · <strong>${esc(d.o)}</strong></p><button type="button" class="btn btn-primary btn-block" data-act="next">Envoyer le rapport</button>` },
        ], d, () => { $("#rep", body).innerHTML = `<div class="banner banner-ok">✓ Rapport transmis à Yodan.</div>`; });
      },
    });
    return;
  }
  const mine = db.patients.filter((p) => p.practitioner === "Dr Kader Démo" || p.status === "En cours");
  listBlock(body, {
    key: "prPatients", placeholder: "Rechercher un patient…",
    rows: () => mine, text: (p) => `${p.name} ${p.tenant}`,
    render: (rows) => rows.map((p) => `<div class="item" data-act="open" data-i="${mine.indexOf(p)}" role="button" tabindex="0" style="margin-bottom:.5rem"><span class="t">${esc(p.name)}</span><span class="badge ${p.status === "En cours" ? "b-ok" : "b-wait"}">${p.status}</span><span class="s">${p.tenant} · ${p.sessions}</span></div>`).join(""),
    bind: (res) => bind(res, { open: (el) => { pr.patient = mine[+el.dataset.i]; render(); } }),
  });
}
function prSettings(body) {
  const names = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  body.innerHTML = `<h3>Mes jours de travail</h3><p class="small muted">Enregistré dès que vous touchez un jour. Les séances sont planifiées sur ces jours.</p>
    ${names.map((n, i) => `<div class="switch-row"><span>${n}</span><button type="button" class="toggle ${db.weekdays[i] ? "on" : ""}" data-act="wd" data-i="${i}" aria-label="${n}" aria-pressed="${db.weekdays[i]}"></button></div>`).join("")}
    <button type="button" class="btn btn-ghost btn-block" style="margin-top:1.2rem" onclick="go('connexion')">Se déconnecter</button>`;
  bind(body, { wd: (el) => { const i = +el.dataset.i; db.weekdays[i] = !db.weekdays[i]; el.classList.toggle("on"); toast("Enregistré"); } });
}
function prScan(body) {
  body.innerHTML = `<div class="camera" style="${isMobile() ? "" : "max-width:420px;margin:0 auto"}"><div class="frame"></div><div class="scanline"></div></div><p class="small muted" style="text-align:center">${isMobile() ? "Visez le QR code de l'attestation du patient." : "Webcam : présentez le QR code de l'attestation devant la caméra."}</p>
    <details><summary>Le QR ne passe pas ? Code de secours</summary><div style="display:flex;gap:.5rem"><input type="text" placeholder="CODE" style="text-transform:uppercase" aria-label="Code de secours"><button type="button" class="btn" data-act="found">Vérifier</button></div></details>
    <div id="scan-res"></div><button type="button" class="btn btn-ghost btn-block" data-act="close">Fermer</button>`;
  const found = () => {
    const res = $("#scan-res", body);
    if (!res) return;
    res.innerHTML = `<div class="card" style="padding:1rem;margin:.8rem 0"><strong>Aya Démo</strong><div class="small muted">CNPS · attestation valable jusqu'au ${fmt(addMonths(TODAY, 2))}</div><p class="small">Séance 4 / 8 · aujourd'hui</p><button type="button" class="btn btn-success btn-block btn-lg" data-act="validate">Valider la séance</button></div>`;
    bind(res, { validate: () => { toast("Séance validée — la suivante est planifiée."); setView("today"); } });
  };
  bind(body, { found, close: () => setView("today") });
  state.timer = setTimeout(found, 1600);
}

/* =====================================================================
 * Patient — auto-évaluation par QR code (PC ou téléphone)
 * ===================================================================== */
const pa = { step: "intro", q: 0, answers: [], consents: {}, done: false };
RENDER.patient = (root) => {
  if (isMobile()) {
    root.innerHTML = `<div class="m-shell"><div class="phone-top"><div class="brand"><div class="brand-dot">${esc(partner().name[0])}</div><span class="brand-txt">${esc(partner().name)} · Auto-évaluation<span class="partner-by">avec <b>YODAN</b></span></span></div></div><div class="m-body" id="pa-body"></div></div>`;
  } else {
    root.innerHTML = `<header class="app-bar"><div class="brand"><div class="brand-dot">${esc(partner().name[0])}</div><span class="brand-txt">${esc(partner().name)} · Auto-évaluation<span class="partner-by">avec <b>YODAN</b></span></span></div></header><div class="page narrow"><div class="card" id="pa-body"></div>
      <p style="text-align:center"><button type="button" class="btn btn-ghost btn-sm" data-act="restart">Recommencer la démo</button></p></div>`;
  }
  bind(root, { restart: () => { Object.assign(pa, { step: "intro", q: 0, answers: [], consents: {}, done: false }); render(); } });
  const body = $("#pa-body", root);
  if (pa.step === "intro") {
    body.innerHTML = `<div style="text-align:center;padding-top:1rem"><div style="font-size:3rem">🌿</div><h2>Comment allez-vous depuis l'événement ?</h2>
      <p class="muted">${QUESTIONS.length} questions courtes, environ 5 minutes. Il n'y a pas de bonne ou de mauvaise réponse.</p>
      <div class="banner banner-info" style="text-align:left">🔒 Vos réponses sont confidentielles. Votre employeur n'y a pas accès.</div>
      <button type="button" class="btn btn-primary btn-lg btn-block" style="margin-top:1.5rem" data-act="start">Commencer</button></div>`;
    bind(body, { start: () => { pa.step = consentsOf("pre").length ? "consents" : "id"; render(); } });
    return;
  }
  if (pa.step === "consents") {
    body.innerHTML = `${preConsentsHtml(pa.consents, true)}
      <button type="button" class="btn btn-primary btn-lg btn-block" style="margin-top:1rem" data-act="go">Continuer</button>`;
    bindConsents(body, pa.consents, () => { if ($("#pre-warning", body).innerHTML) checkPre(body, pa.consents); });
    bind(body, { go: () => { if (checkPre(body, pa.consents)) { pa.step = "id"; render(); } } });
    return;
  }
  if (pa.step === "id") {
    body.innerHTML = `<h2>Quelques informations</h2>
      <div class="field"><label for="pa-n">Nom et prénom</label><input id="pa-n" type="text" autocomplete="name"></div>
      <div class="field"><label>Sexe</label><div class="segmented full" data-seg="s"><button type="button" data-v="F">Femme</button><button type="button" data-v="H">Homme</button></div></div>
      <div class="field"><label for="pa-t">Téléphone</label><input id="pa-t" type="tel" autocomplete="tel"></div>
      <button type="button" class="btn btn-primary btn-lg btn-block" data-act="go">Continuer</button>`;
    segmented(body, () => {});
    bind(body, { go: () => { pa.step = "q"; render(); } });
    return;
  }
  if (pa.step === "q") {
    const i = pa.q;
    body.innerHTML = `<div class="progress" style="margin-bottom:.4rem"><i style="width:${i / QUESTIONS.length * 100}%"></i></div><div class="small muted">${i + 1} / ${QUESTIONS.length}</div>
      <div class="question"><div class="idx">Au cours du dernier mois…</div><p style="font-size:1.1rem">${esc(QUESTIONS[i])}</p>
      <div class="answers">${ANSWERS.map((a, k) => `<button type="button" class="answer ${pa.answers[i] === k ? "on" : ""}" data-act="a" data-k="${k}">${a}</button>`).join("")}</div></div>
      ${i > 0 ? `<button type="button" class="link-btn" data-act="prev">← Précédente</button>` : ""}`;
    bind(body, {
      a: (el) => { pa.answers[i] = +el.dataset.k; el.classList.add("on"); setTimeout(() => { if (i < QUESTIONS.length - 1) pa.q++; else pa.step = "result"; render(); }, 200); },
      prev: () => { pa.q--; render(); },
    });
    return;
  }
  const zone = zoneOf(scoreOf(pa.answers));
  body.innerHTML = pa.done
    ? `<div style="text-align:center;padding-top:3rem"><div style="font-size:3rem">✓</div><h2>Merci</h2><p class="muted">Vous pouvez fermer cette page.</p></div>`
    : `<div class="banner banner-ok">✓ Réponses transmises</div><div style="margin-top:1rem">${resultHtml(zone)}</div>
      <button type="button" class="btn btn-primary btn-lg btn-block" style="margin-top:1rem" data-act="end">Terminer</button>`;
  bindPost(body, pa.consents);
  bind(body, { end: () => { pa.done = true; render(); } });
};

/* =====================================================================
 * Démarrage
 * ===================================================================== */
$("#role-switch").innerHTML = ROLES.map((r) => `<button type="button" data-role="${r.id}">${r.label}</button>`).join("");
// Téléphone : mêmes profils dans une liste déroulante (une seule ligne de barre).
$("#role-select").innerHTML = ROLES.map((r) => `<option value="${r.id}">${r.label}</option>`).join("");
$("#role-select").addEventListener("change", (e) => go(e.target.value));
// La barre peut changer de hauteur (passage à la ligne) : on la mesure pour placer le reste dessous.
const syncBarHeight = () => document.documentElement.style.setProperty("--bar-h", `${$(".mock-bar").offsetHeight}px`);
new ResizeObserver(syncBarHeight).observe($(".mock-bar"));
syncBarHeight();
// Petit écran : vue mobile et notes repliées par défaut, pour laisser toute la place à l'interface.
if (matchMedia("(max-width: 760px)").matches) {
  state.device = "mobile";
  setNotes(false);
}
$$("#role-switch button").forEach((b) => b.addEventListener("click", () => go(b.dataset.role)));
$$(".device-switch button").forEach((b) => b.addEventListener("click", () => {
  state.device = b.dataset.device;
  Object.values({ ...vaState, ...svState }).forEach((s) => { if (s && typeof s === "object") s.open = false; });
  $$(".drawer-back").forEach((d) => d.remove());
  render();
}));
$("#notes-toggle").addEventListener("click", () => setNotes(!state.notes));
// Fond assombri de la fenêtre des notes (téléphone) : un toucher dessus ou Échap la ferme.
document.body.append(h(`<div class="notes-backdrop" id="notes-backdrop"></div>`));
$("#notes-backdrop").addEventListener("click", () => setNotes(false));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && state.notes && matchMedia("(max-width: 760px)").matches) setNotes(false); });
go("synthese");
