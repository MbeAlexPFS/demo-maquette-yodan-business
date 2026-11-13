/* Maquette ATMP CNPS — graphes admin. Données 100 % fictives, générées de façon déterministe. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const MONTHS_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const DAYS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
  const TODAY = "2026-11-13";

  const ZONES = [
    ["VERT", "Sous le seuil", "var(--color-success)"],
    ["ORANGE", "Symptômes modérés", "var(--color-warning)"],
    ["ROUGE", "Symptômes significatifs", "var(--color-danger)"],
  ];
  const DECISIONS = [
    ["APPROVED", "Prise en charge", "var(--color-success)"],
    ["PENDING", "En attente", "var(--color-warning)"],
    ["REJECTED", "Non prise en charge", "var(--color-danger)"],
  ];

  // ---------- Outils de dates ----------
  const pad2 = (n) => String(n).padStart(2, "0");
  const isoDay = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const parseDay = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const monday = (d) => addDays(d, -((d.getDay() + 6) % 7));
  const dayMonth = (d) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
  const pct = (n, total) => (total ? Math.round((n / total) * 1000) / 10 : 0);
  const fmtPct = (v) => `${String(v).replace(".", ",")} %`;
  const escape = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const svg = (tag, attrs = {}) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) { el.setAttribute(k, v); }
    return el;
  };

  // ---------- Données fictives ----------
  /** Pseudo-aléatoire stable : même jour = mêmes chiffres. */
  const noise = (seed) => { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const dayIndex = (iso) => Math.round(parseDay(iso).getTime() / 86400000);
  function dayCounts(iso) {
    if (iso > TODAY) { return { APPROVED: 0, PENDING: 0, REJECTED: 0, VERT: 0, ORANGE: 0, ROUGE: 0 }; }
    const i = dayIndex(iso);
    const weekend = [0, 6].includes(parseDay(iso).getDay());
    const volume = weekend ? Math.floor(noise(i) * 2) : 1 + Math.floor(noise(i) * 6);
    const recent = (dayIndex(TODAY) - i) < 15; // les décisions récentes sont encore « en attente »
    const c = { APPROVED: 0, PENDING: 0, REJECTED: 0, VERT: 0, ORANGE: 0, ROUGE: 0 };
    for (let k = 0; k < volume; k++) {
      const r = noise(i * 31 + k);
      const d = recent ? (r < .35 ? "APPROVED" : r < .85 ? "PENDING" : "REJECTED") : (r < .58 ? "APPROVED" : r < .72 ? "PENDING" : "REJECTED");
      const z = noise(i * 57 + k);
      c[d]++;
      c[z < .5 ? "VERT" : z < .8 ? "ORANGE" : "ROUGE"]++;
    }
    return c;
  }
  function sumCounts(start, endExclusive) {
    const total = { APPROVED: 0, PENDING: 0, REJECTED: 0, VERT: 0, ORANGE: 0, ROUGE: 0 };
    for (let d = parseDay(start); isoDay(d) < endExclusive; d = addDays(d, 1)) {
      const c = dayCounts(isoDay(d));
      for (const k in total) { total[k] += c[k]; }
    }
    return total;
  }

  // ---------- Périodes (identique au partial kpi-charts) ----------
  function periods(mode, anchor) {
    const a = parseDay(anchor);
    const y = a.getFullYear();
    const m = a.getMonth();
    const list = [];
    if (mode === "year") {
      for (let i = 0; i < 12; i++) {
        list.push({ start: isoDay(new Date(y, i, 1)), end: isoDay(new Date(y, i + 1, 1)), label: MONTHS_SHORT[i], long: `${MONTHS[i]} ${y}` });
      }
      return { title: String(y), periods: list };
    }
    if (mode === "month") {
      const next = new Date(y, m + 1, 1);
      for (let s = new Date(y, m, 1); s < next;) {
        const e = new Date(Math.min(addDays(monday(s), 7), next));
        list.push({ start: isoDay(s), end: isoDay(e), label: `${dayMonth(s)}–${dayMonth(addDays(e, -1))}`, long: `Du ${dayMonth(s)} au ${dayMonth(addDays(e, -1))}/${y}` });
        s = e;
      }
      return { title: `${MONTHS[m]} ${y}`, periods: list };
    }
    const first = monday(a);
    for (let i = 0; i < 7; i++) {
      const d = addDays(first, i);
      list.push({ start: isoDay(d), end: isoDay(addDays(d, 1)), label: `${DAYS[i]} ${pad2(d.getDate())}`, long: `${DAYS[i]} ${dayMonth(d)}/${d.getFullYear()}` });
    }
    const last = addDays(first, 6);
    return { title: `Semaine du ${dayMonth(first)} au ${dayMonth(last)}/${last.getFullYear()}`, periods: list };
  }
  function shift(mode, anchor, direction) {
    const a = parseDay(anchor);
    if (mode === "year") { return isoDay(new Date(a.getFullYear() + direction, a.getMonth(), 1)); }
    if (mode === "month") { return isoDay(new Date(a.getFullYear(), a.getMonth() + direction, 1)); }
    return isoDay(addDays(a, 7 * direction));
  }

  /** Graduation « ronde » de l'axe en mode Nombre (1, 2, 5, 10, 20, 50…). */
  function niceScale(max) {
    if (max <= 0) { return { top: 4, step: 1 }; }
    const raw = max / 4;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 5, 10].map((f) => f * mag).find((s) => s >= raw);
    return { top: Math.ceil(max / step) * step, step };
  }

  // ---------- Histogramme : unité % ou Nombre ----------
  /**
   * data : { periods, series: [{ label, color, counts }], onPick?, unit: "pct" | "count" }.
   * pct   → chaque colonne = 100 %, axe 0–100 %.
   * count → colonnes empilées en nombre, axe gradué, total au-dessus.
   */
  function columns(container, data) {
    const W = 640, H = 250, L = 40, R = 12, T = 20, B = 30;
    const n = data.periods.length;
    const isCount = data.unit === "count";
    const totals = data.periods.map((_, i) => data.series.reduce((sum, s) => sum + s.counts[i], 0));
    const scale = isCount ? niceScale(Math.max(...totals)) : { top: 100, step: 25 };
    const slot = (W - L - R) / n;
    const barWidth = Math.min(48, slot * 0.7);
    const x = (i) => L + slot * i + slot / 2;
    const y = (v) => T + ((scale.top - v) / scale.top) * (H - T - B);

    container.innerHTML = "";
    const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": isCount ? "Nombre d'évaluations par période et par décision" : "Répartition en pourcentage des évaluations par période" });

    for (let v = 0; v <= scale.top; v += scale.step) {
      root.append(svg("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), class: "kpi-grid-line" }));
      const label = svg("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end" });
      label.textContent = isCount ? v : `${v} %`;
      root.append(label);
    }
    const step = Math.ceil(n / 12);
    data.periods.forEach((p, i) => {
      if (i % step) { return; }
      const label = svg("text", { x: x(i), y: H - 8, "text-anchor": "middle" });
      label.textContent = p.label;
      root.append(label);
    });

    data.periods.forEach((_, i) => {
      if (!totals[i]) { return; }
      let base = 0;
      for (const s of data.series) {
        const value = isCount ? s.counts[i] : (s.counts[i] / totals[i]) * 100;
        if (value <= 0) { continue; }
        root.append(svg("rect", {
          class: "kpi-bar", x: x(i) - barWidth / 2, y: y(base + value), width: barWidth, height: y(base) - y(base + value),
          fill: s.color, stroke: "var(--color-surface)", "stroke-width": 1,
        }));
        base += value;
      }
      if (isCount) {
        const total = svg("text", { x: x(i), y: y(totals[i]) - 5, "text-anchor": "middle", class: "kpi-total" });
        total.textContent = totals[i];
        root.append(total);
      }
    });

    // Survol : l'infobulle montre toujours nombre ET %, quelle que soit l'unité.
    const highlight = svg("rect", { y: T, width: slot, height: H - T - B, fill: "var(--color-text-light)", opacity: 0.08, visibility: "hidden" });
    root.insertBefore(highlight, root.firstChild);
    const tooltip = document.createElement("div");
    tooltip.className = "kpi-tooltip";
    tooltip.hidden = true;
    data.periods.forEach((p, i) => {
      const band = svg("rect", { x: x(i) - slot / 2, y: T, width: slot, height: H - T - B, class: `kpi-band${data.onPick ? " is-pickable" : ""}` });
      band.addEventListener("mouseenter", () => {
        highlight.setAttribute("x", x(i) - slot / 2);
        highlight.setAttribute("visibility", "visible");
        tooltip.innerHTML = `<b>${escape(p.long)}</b>` + (totals[i]
          ? data.series.slice().reverse().map((s) => {
            const main = isCount ? s.counts[i] : fmtPct(pct(s.counts[i], totals[i]));
            const other = isCount ? fmtPct(pct(s.counts[i], totals[i])) : s.counts[i];
            return `<div><span class="legend-dot" style="background:${s.color}"></span><span>${escape(s.label)}</span><span class="v">${main} <small>· ${other}</small></span></div>`;
          }).join("") + `<div><span>Total</span><span class="v">${totals[i]}</span></div>`
          : "<div><span>Aucune évaluation</span></div>");
        tooltip.hidden = false;
        const box = container.getBoundingClientRect();
        const left = (x(i) / W) * box.width;
        tooltip.style.left = `${Math.min(Math.max(left - tooltip.offsetWidth / 2, 0), box.width - tooltip.offsetWidth)}px`;
        tooltip.style.top = "0";
      });
      band.addEventListener("mouseleave", () => { highlight.setAttribute("visibility", "hidden"); tooltip.hidden = true; });
      if (data.onPick) { band.addEventListener("click", () => data.onPick(i)); }
      root.append(band);
    });

    const legend = document.createElement("ul");
    legend.className = "kpi-legend";
    legend.innerHTML = data.series.map((s) => `<li><span class="legend-dot" style="background:${s.color}"></span>${escape(s.label)}</li>`).join("");

    const table = document.createElement("details");
    table.className = "kpi-table";
    table.innerHTML = `<summary>Voir les données</summary><div class="wrap"><table><thead><tr><th>Période</th>${data.series.map((s) => `<th>${escape(s.label)}</th>`).join("")}<th>Total</th></tr></thead><tbody>${
      data.periods.map((p, i) => `<tr><td>${escape(p.long)}</td>${data.series.map((s) => `<td>${totals[i] ? `${s.counts[i]} (${fmtPct(pct(s.counts[i], totals[i]))})` : "—"}</td>`).join("")}<td>${totals[i]}</td></tr>`).join("")
    }</tbody></table></div>`;

    container.append(root, tooltip, legend, table);
  }

  // ---------- Camembert : valeurs seules, % au survol ----------
  function pie(container, segments) {
    const total = segments.reduce((sum, s) => sum + s.n, 0);
    container.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "kpi-pie";
    const root = svg("svg", { viewBox: "-70 -70 140 140", role: "group", "aria-label": `Répartition, total ${total}` });
    const legend = document.createElement("ul");
    legend.className = "pie-legend";
    const tooltip = document.createElement("div");
    tooltip.className = "kpi-tooltip";
    tooltip.hidden = true;

    const items = [];
    function show(index, event) {
      const it = items[index];
      wrap.classList.add("is-hovering");
      items.forEach((o, k) => { o.shape?.classList.toggle("is-on", k === index); o.li.classList.toggle("is-on", k === index); });
      if (it.shape) { it.shape.style.transform = `translate(${it.dx}px, ${it.dy}px)`; }
      tooltip.innerHTML = `<div><span class="legend-dot" style="background:${it.s.color}"></span><span>${escape(it.s.label)}</span></div>`
        + `<div class="big">${fmtPct(pct(it.s.n, total))}</div><div class="muted">${it.s.n} sur ${total}</div>`;
      tooltip.hidden = false;
      const box = container.getBoundingClientRect();
      let left, top;
      if (event && "clientX" in event && event.clientX) {
        left = event.clientX - box.left + 14;
        top = event.clientY - box.top + 14;
      } else {
        const svgBox = root.getBoundingClientRect();
        left = svgBox.left - box.left + svgBox.width / 2 + it.mx * svgBox.width / 140;
        top = svgBox.top - box.top + svgBox.height / 2 + it.my * svgBox.height / 140;
      }
      tooltip.style.left = `${Math.min(Math.max(left, 0), box.width - tooltip.offsetWidth)}px`;
      tooltip.style.top = `${top}px`;
    }
    function hide() {
      wrap.classList.remove("is-hovering");
      items.forEach((o) => { o.shape?.classList.remove("is-on"); o.li.classList.remove("is-on"); if (o.shape) { o.shape.style.transform = ""; } });
      tooltip.hidden = true;
    }

    if (!total) {
      root.append(svg("circle", { r: 64, fill: "var(--color-border)" }));
    }
    let angle = -Math.PI / 2;
    segments.forEach((s, index) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="legend-dot" style="background:${s.color}"></span><strong>${s.n}</strong><span>${escape(s.label)}</span>`;
      legend.append(li);
      const item = { s, li, shape: null, dx: 0, dy: 0, mx: 0, my: 0 };
      items.push(item);
      if (total && s.n > 0) {
        const sweep = (s.n / total) * Math.PI * 2;
        const mid = angle + sweep / 2;
        const full = sweep >= Math.PI * 2 - 1e-9;
        const shape = full
          ? svg("circle", { r: 64, fill: s.color })
          : svg("path", {
            d: `M0 0 L${64 * Math.cos(angle)} ${64 * Math.sin(angle)} A64 64 0 ${sweep > Math.PI ? 1 : 0} 1 ${64 * Math.cos(angle + sweep)} ${64 * Math.sin(angle + sweep)} Z`,
            fill: s.color, stroke: "var(--color-surface)", "stroke-width": 2, "stroke-linejoin": "round",
          });
        shape.classList.add("kpi-slice");
        shape.setAttribute("tabindex", "0");
        shape.setAttribute("role", "img");
        shape.setAttribute("aria-label", `${s.label} : ${s.n}, soit ${fmtPct(pct(s.n, total))}`);
        item.shape = shape;
        item.dx = full ? 0 : 5 * Math.cos(mid);
        item.dy = full ? 0 : 5 * Math.sin(mid);
        item.mx = 40 * Math.cos(mid);
        item.my = 40 * Math.sin(mid);
        shape.addEventListener("mousemove", (e) => show(index, e));
        shape.addEventListener("mouseleave", hide);
        shape.addEventListener("focus", () => show(index));
        shape.addEventListener("blur", hide);
        shape.addEventListener("click", (e) => show(index, e)); // appui sur mobile
        root.append(shape);
        angle += sweep;
      }
      li.addEventListener("mouseenter", () => { if (item.shape) { show(index); } });
      li.addEventListener("mouseleave", hide);
    });

    wrap.append(root, legend);
    const foot = document.createElement("p");
    foot.className = "pie-total";
    foot.innerHTML = total ? `Total <strong>${total}</strong>` : "Aucune donnée sur cette période.";
    container.append(wrap, foot, tooltip);
  }

  // ---------- Carte histogramme : navigation + unité ----------
  const card = document.getElementById("decision-curve-card");
  // Unité par défaut : Nombre ; non mémorisée (retour à Nombre à chaque chargement).
  const state = { mode: "month", anchor: TODAY, unit: "count" };
  const PARENT = { week: "month", month: "year" };

  function drawCurve() {
    const { title, periods: list } = periods(state.mode, state.anchor);
    card.querySelector("[data-kpi-title]").textContent = title.charAt(0).toUpperCase() + title.slice(1);
    card.querySelectorAll("[data-kpi-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kpiMode === state.mode)));
    card.querySelectorAll("[data-kpi-unit]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kpiUnit === state.unit)));
    const up = card.querySelector("[data-kpi-up]");
    up.hidden = !PARENT[state.mode];
    up.textContent = state.mode === "week" ? "↑ Voir le mois" : "↑ Voir l'année";

    const sums = list.map((p) => sumCounts(p.start, p.end));
    columns(document.getElementById("decision-curve"), {
      periods: list,
      unit: state.unit,
      series: DECISIONS.map(([key, label, color]) => ({ label, color, counts: sums.map((c) => c[key]) })),
      onPick: state.mode === "week" ? null : (i) => {
        state.anchor = list[i].start;
        state.mode = state.mode === "year" ? "month" : "week";
        drawCurve();
      },
    });
  }
  card.querySelectorAll("[data-kpi-mode]").forEach((b) => b.addEventListener("click", () => { state.mode = b.dataset.kpiMode; drawCurve(); }));
  card.querySelectorAll("[data-kpi-unit]").forEach((b) => b.addEventListener("click", () => { state.unit = b.dataset.kpiUnit; drawCurve(); }));
  card.querySelector("[data-kpi-prev]").addEventListener("click", () => { state.anchor = shift(state.mode, state.anchor, -1); drawCurve(); });
  card.querySelector("[data-kpi-next]").addEventListener("click", () => { state.anchor = shift(state.mode, state.anchor, 1); drawCurve(); });
  card.querySelector("[data-kpi-up]").addEventListener("click", () => { state.mode = PARENT[state.mode]; drawCurve(); });

  // ---------- Camemberts ----------
  function drawPies() {
    const nextDay = (iso) => isoDay(addDays(parseDay(iso), 1));
    const z = sumCounts(document.getElementById("zone-start").value, nextDay(document.getElementById("zone-end").value));
    pie(document.getElementById("zone-pie"), ZONES.map(([key, label, color]) => ({ n: z[key], label, color })));
    const d = sumCounts(document.getElementById("decision-start").value, nextDay(document.getElementById("decision-end").value));
    pie(document.getElementById("decision-pie"), DECISIONS.map(([key, label, color]) => ({ n: d[key], label, color })));
  }
  ["zone-start", "zone-end", "decision-start", "decision-end"].forEach((id) => document.getElementById(id).addEventListener("change", drawPies));

  // ---------- Barre de maquette ----------
  document.querySelectorAll("[data-device]").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("[data-device]").forEach((o) => { o.classList.toggle("on", o === b); o.setAttribute("aria-pressed", String(o === b)); });
    document.getElementById("stage").classList.toggle("is-mobile", b.dataset.device === "mobile");
    drawCurve();
  }));
  const notesToggle = document.getElementById("notes-toggle");
  notesToggle.addEventListener("click", () => {
    const on = notesToggle.getAttribute("aria-pressed") !== "true";
    notesToggle.setAttribute("aria-pressed", String(on));
    document.getElementById("layout").classList.toggle("with-notes", on);
  });

  drawCurve();
  drawPies();
})();
