const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const COLORS = ["#0f766e", "#2563eb", "#a16207", "#7c3aed", "#c2410c", "#be123c", "#15803d", "#475569"];

const state = {
  comandas: [],
  detalles: [],
  cambioClientes: [],
  cambioDetalles: [],
  orders: [],
  joined: [],
  changes: [],
  periods: [],
  selectedPeriodKeys: [],
  filters: {
    groups: new Set(),
    clients: new Set(),
    statuses: new Set(),
  },
};

const els = {
  salesTab: document.querySelector("#salesTab"),
  changesTab: document.querySelector("#changesTab"),
  metric: document.querySelector("#metricFilter"),
  basePeriod: document.querySelector("#basePeriodFilter"),
  groupBtn: document.querySelector("#groupFilterBtn"),
  groupPanel: document.querySelector("#groupFilterPanel"),
  clientBtn: document.querySelector("#clientFilterBtn"),
  clientPanel: document.querySelector("#clientFilterPanel"),
  statusBtn: document.querySelector("#statusFilterBtn"),
  statusPanel: document.querySelector("#statusFilterPanel"),
  product: document.querySelector("#productSearch"),
  periodPicker: document.querySelector("#periodPicker"),
  statusLine: document.querySelector("#statusLine"),
  executiveTitle: document.querySelector("#executiveTitle"),
  executiveFilters: document.querySelector("#executiveFilters"),
  baseTotal: document.querySelector("#baseTotal"),
  baseCaption: document.querySelector("#baseCaption"),
  momDelta: document.querySelector("#momDelta"),
  momCaption: document.querySelector("#momCaption"),
  yoyDelta: document.querySelector("#yoyDelta"),
  yoyCaption: document.querySelector("#yoyCaption"),
  orderCount: document.querySelector("#orderCount"),
  orderCountLabel: document.querySelector("#orderCountLabel"),
  lineCount: document.querySelector("#lineCount"),
  summaryCaption: document.querySelector("#summaryCaption"),
  monthlyHead: document.querySelector("#monthlyHead"),
  monthlyRows: document.querySelector("#monthlyRows"),
  productHead: document.querySelector("#productHead"),
  productRows: document.querySelector("#productRows"),
  groupHead: document.querySelector("#groupHead"),
  groupRows: document.querySelector("#groupRows"),
  clientHead: document.querySelector("#clientHead"),
  clientRows: document.querySelector("#clientRows"),
  monthBar: document.querySelector("#monthBarChart"),
  groupPie: document.querySelector("#groupPieChart"),
  productBar: document.querySelector("#productBarChart"),
  clientBar: document.querySelector("#clientBarChart"),
  print: document.querySelector("#printBtn"),
};

function reportType() {
  return document.querySelector(".tab-button.active")?.dataset.reportType || "sales";
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    const next = csv[i + 1];

    if (quoted && char === '"' && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const headers = rows.shift().map((header) => header.trim());
  return rows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]))
  );
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const normalized = String(value).replace(/\./g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function parsePeriodFromDate(value) {
  const datePart = String(value || "").trim().split(/\s+/)[0];
  const match = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!month || !year) return null;
  return { month, year };
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value);
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMetric(value) {
  return metricKey() === "amount" ? formatMoney(value) : formatNumber(value);
}

function metricKey() {
  if (reportType() === "changes") return "units";
  return els.metric.value;
}

function metricLabel() {
  if (reportType() === "changes") return "Unidades cambiadas";
  if (metricKey() === "amount") return "Monto";
  if (metricKey() === "bonusUnits") return "Bonificacion";
  if (metricKey() === "deliveryUnits") return "Unidades a entregar";
  return "Unidades vendidas";
}

function pct(current, previous) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function formatPct(value) {
  if (value === null || !Number.isFinite(value)) return "Sin base";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`;
}

function periodKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function periodLabel(period) {
  return `${MONTHS[period.month - 1]} ${period.year}`;
}

function periodFromKey(key) {
  const [year, month] = key.split("-").map(Number);
  return { key, year, month };
}

function monthIndex(period) {
  return period.year * 12 + period.month - 1;
}

function periodFromIndex(index) {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return { key: periodKey(year, month), year, month };
}

function previousPeriod(period) {
  return period.month === 1
    ? { year: period.year - 1, month: 12, key: periodKey(period.year - 1, 12) }
    : { year: period.year, month: period.month - 1, key: periodKey(period.year, period.month - 1) };
}

function sameMonthLastYear(period) {
  return { year: period.year - 1, month: period.month, key: periodKey(period.year - 1, period.month) };
}

function fillSelect(select, values, allLabel = null) {
  const current = select.value;
  select.innerHTML = "";
  if (allLabel) select.append(new Option(allLabel, ""));
  values.forEach((item) => {
    const option = typeof item === "string" ? new Option(item, item) : new Option(item.label, item.value);
    select.append(option);
  });
  if ([...select.options].some((option) => option.value === current)) {
    select.value = current;
  }
}

function selectedSet(name) {
  return state.filters[name];
}

function passesMultiFilter(value, name) {
  const set = selectedSet(name);
  return set.size === 0 || set.has(value);
}

function filterSummary(name, singular, plural) {
  const set = selectedSet(name);
  if (set.size === 0) return `${plural}: todos`;
  if (set.size === 1) return `${singular}: ${[...set][0]}`;
  return `${plural}: ${set.size} seleccionados`;
}

function renderMultiFilter(panel, button, values, filterName, singular, plural) {
  panel.innerHTML = `
    <button type="button" class="mini-action" data-action="clear">Todos</button>
    <div class="filter-options">
      ${values
        .map(
          (value) => `
            <label class="check-row">
              <input type="checkbox" value="${value}" ${selectedSet(filterName).has(value) ? "checked" : ""}>
              <span>${value}</span>
            </label>
          `
        )
        .join("")}
    </div>
  `;

  button.textContent = filterSummary(filterName, singular, plural);

  panel.querySelector("[data-action='clear']").addEventListener("click", () => {
    selectedSet(filterName).clear();
    panel.querySelectorAll("input").forEach((input) => {
      input.checked = false;
    });
    button.textContent = filterSummary(filterName, singular, plural);
    render();
  });

  panel.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) selectedSet(filterName).add(input.value);
      else selectedSet(filterName).delete(input.value);
      button.textContent = filterSummary(filterName, singular, plural);
      render();
    });
  });
}

function setupDropdown(button, panel) {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter-panel.open").forEach((openPanel) => {
      if (openPanel !== panel) openPanel.classList.remove("open");
    });
    panel.classList.toggle("open");
  });
}

function aggregate(rows) {
  const orderIds = new Set();
  let units = 0;
  let bonusUnits = 0;
  let deliveryUnits = 0;
  let amount = 0;

  rows.forEach((row) => {
    orderIds.add(row.orderNumber);
    units += row.units;
    bonusUnits += row.bonusUnits;
    deliveryUnits += row.deliveryUnits;
    amount += row.amount;
  });

  return { units, bonusUnits, deliveryUnits, amount, orders: orderIds.size, lines: rows.length };
}

function rowsForMetric() {
  if (reportType() === "changes") return state.changes;
  return metricKey() === "amount" ? state.orders : state.joined;
}

function groupRows(rows, keyFn) {
  const grouped = new Map();
  rows.forEach((row) => {
    const key = keyFn(row);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  });
  return grouped;
}

function baseFilters(row) {
  const productNeedle = els.product.value.trim().toLowerCase();
  return (
    passesMultiFilter(row.group, "groups") &&
    passesMultiFilter(row.clientName, "clients") &&
    passesMultiFilter(row.status, "statuses") &&
    (!productNeedle || row.productName.toLowerCase().includes(productNeedle))
  );
}

function rowsForPeriod(period, sourceRows = rowsForMetric()) {
  return sourceRows.filter((row) => row.year === period.year && row.month === period.month && baseFilters(row));
}

function getPeriodValue(period, rows = null) {
  const sourceRows = rows
    ? rows.filter((row) => row.year === period.year && row.month === period.month)
    : rowsForPeriod(period);
  const data = aggregate(sourceRows);
  return data[metricKey()];
}

function selectedPeriods() {
  return state.selectedPeriodKeys.map(periodFromKey).sort((a, b) => a.key.localeCompare(b.key));
}

function activeBasePeriod() {
  const key = els.basePeriod.value || state.selectedPeriodKeys[state.selectedPeriodKeys.length - 1];
  return periodFromKey(key);
}

function valueClass(value) {
  if (value === null) return "neutral";
  return value >= 0 ? "good" : "bad";
}

function buildMatrixRows(rows, keyFn, label, limit = 20) {
  const selected = selectedPeriods();
  const base = activeBasePeriod();
  const prev = previousPeriod(base);
  const yoy = sameMonthLastYear(base);
  const grouped = groupRows(rows.filter(baseFilters), keyFn);

  return [...grouped.entries()]
    .map(([name, itemRows]) => {
      const byPeriod = new Map();
      itemRows.forEach((row) => {
        const key = periodKey(row.year, row.month);
        const value = byPeriod.get(key) || { units: 0, bonusUnits: 0, deliveryUnits: 0, amount: 0 };
        value.units += row.units;
        value.bonusUnits += row.bonusUnits;
        value.deliveryUnits += row.deliveryUnits;
        value.amount += row.amount;
        byPeriod.set(key, value);
      });

      const current = byPeriod.get(base.key)?.[metricKey()] || 0;
      const prevValue = byPeriod.get(prev.key)?.[metricKey()] || 0;
      const yoyValue = byPeriod.get(yoy.key)?.[metricKey()] || 0;

      return {
        name: name || label,
        selectedValues: selected.map((period) => byPeriod.get(period.key)?.[metricKey()] || 0),
        baseValue: current,
        mom: pct(current, prevValue),
        yoy: pct(current, yoyValue),
      };
    })
    .sort((a, b) => b.baseValue - a.baseValue)
    .slice(0, limit);
}

function renderMatrixTable(head, body, firstColumn, rows, totalRows = null) {
  const periods = selectedPeriods();
  head.innerHTML = `
    <tr>
      <th>${firstColumn}</th>
      ${periods.map((period) => `<th class="num">${periodLabel(period)}</th>`).join("")}
      <th class="num">Var. mes anterior</th>
      <th class="num">Var. a\u00f1o anterior</th>
    </tr>
  `;

  body.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${row.name}</td>
          ${row.selectedValues.map((value) => `<td class="num">${formatMetric(value)}</td>`).join("")}
          <td class="num ${valueClass(row.mom)}">${formatPct(row.mom)}</td>
          <td class="num ${valueClass(row.yoy)}">${formatPct(row.yoy)}</td>
        </tr>
      `
    )
    .join("");

  if (metricKey() === "amount" && totalRows) {
    const base = activeBasePeriod();
    const prev = previousPeriod(base);
    const yoy = sameMonthLastYear(base);
    const currentValue = getPeriodValue(base, totalRows.filter(baseFilters));
    const prevValue = getPeriodValue(prev, totalRows.filter(baseFilters));
    const yoyValue = getPeriodValue(yoy, totalRows.filter(baseFilters));
    const selectedValues = periods.map((period) => getPeriodValue(period, totalRows.filter(baseFilters)));
    const mom = pct(currentValue, prevValue);
    const yearly = pct(currentValue, yoyValue);

    body.insertAdjacentHTML(
      "beforeend",
      `
        <tr class="total-row">
          <td>Total</td>
          ${selectedValues.map((value) => `<td class="num">${formatMoney(value)}</td>`).join("")}
          <td class="num ${valueClass(mom)}">${formatPct(mom)}</td>
          <td class="num ${valueClass(yearly)}">${formatPct(yearly)}</td>
        </tr>
      `
    );
  }
}

function shortMoney(value) {
  const abs = Math.abs(value);
  if (abs >= 1000000) return `$${(value / 1000000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1000) return `$${(value / 1000).toLocaleString("es-AR", { maximumFractionDigits: 0 })} K`;
  return formatMoney(value);
}

function shortNumber(value) {
  const abs = Math.abs(value);
  if (abs >= 1000000) return `${(value / 1000000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1000) return `${(value / 1000).toLocaleString("es-AR", { maximumFractionDigits: 0 })} K`;
  return formatNumber(value);
}

function shortMetric(value) {
  return metricKey() === "amount" ? shortMoney(value) : shortNumber(value);
}

function ellipsize(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}

function chartSize(canvas, fallbackHeight) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(360, Math.floor(rect.width));
  const height = Math.max(220, Math.floor(rect.height) || Number(canvas.getAttribute("height")) || fallbackHeight);
  const scale = window.devicePixelRatio || 1;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height };
}

function roundedRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawMonthlyChart(canvas, items) {
  const { ctx, width, height } = chartSize(canvas, 260);
  const margin = { top: 34, right: 24, bottom: 56, left: 72 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const max = Math.max(...items.map((item) => item.value), 1) * 1.18;
  const gridSteps = 4;

  ctx.font = "12px Arial";
  ctx.strokeStyle = "#e5e7eb";
  ctx.fillStyle = "#667085";
  ctx.lineWidth = 1;

  for (let i = 0; i <= gridSteps; i += 1) {
    const y = margin.top + plotH - (plotH / gridSteps) * i;
    const value = (max / gridSteps) * i;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + plotW, y);
    ctx.stroke();
    ctx.fillText(shortMetric(value), 8, y + 4);
  }

  const slot = plotW / Math.max(items.length, 1);
  items.forEach((item, index) => {
    const barW = Math.min(56, slot * 0.5);
    const barH = (item.value / max) * plotH;
    const x = margin.left + index * slot + (slot - barW) / 2;
    const y = margin.top + plotH - barH;
    const gradient = ctx.createLinearGradient(0, y, 0, margin.top + plotH);
    gradient.addColorStop(0, COLORS[index % COLORS.length]);
    gradient.addColorStop(1, "#d7eee9");
    ctx.fillStyle = gradient;
    roundedRect(ctx, x, y, barW, barH, 5);
    ctx.fill();

    ctx.fillStyle = "#17202a";
    ctx.textAlign = "center";
    ctx.font = "700 11px Arial";
    ctx.fillText(shortMetric(item.value), x + barW / 2, Math.max(18, y - 7));
    ctx.font = "12px Arial";
    ctx.save();
    ctx.translate(x + barW / 2, margin.top + plotH + 16);
    ctx.rotate(-Math.PI / 6);
    ctx.fillText(item.label, 0, 0);
    ctx.restore();
  });

  ctx.textAlign = "left";
}

function drawHorizontalRanking(canvas, items) {
  const { ctx, width, height } = chartSize(canvas, 300);
  const topItems = items.slice(0, 8);
  const margin = { top: 20, right: 88, bottom: 24, left: 160 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const max = Math.max(...topItems.map((item) => item.value), 1);
  const slot = plotH / Math.max(topItems.length, 1);

  ctx.font = "12px Arial";
  ctx.fillStyle = "#667085";
  ctx.fillText("Top 8 del periodo base", 12, 14);

  topItems.forEach((item, index) => {
    const barH = Math.min(22, slot * 0.58);
    const y = margin.top + index * slot + (slot - barH) / 2;
    const barW = (item.value / max) * plotW;

    ctx.fillStyle = "#f1f5f9";
    roundedRect(ctx, margin.left, y, plotW, barH, 4);
    ctx.fill();

    ctx.fillStyle = COLORS[index % COLORS.length];
    roundedRect(ctx, margin.left, y, barW, barH, 4);
    ctx.fill();

    ctx.fillStyle = "#17202a";
    ctx.textAlign = "right";
    ctx.font = "12px Arial";
    ctx.fillText(ellipsize(item.label, 18), margin.left - 10, y + barH - 5);
    ctx.textAlign = "left";
    ctx.font = "700 12px Arial";
    ctx.fillText(shortMetric(item.value), margin.left + barW + 8, y + barH - 5);
  });

  ctx.textAlign = "left";
}

function drawBarChart(canvas, items, options = {}) {
  if (options.horizontal) {
    drawHorizontalRanking(canvas, items);
    return;
  }
  drawMonthlyChart(canvas, items);
}

function drawOldBarChart(canvas, items, options = {}) {
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width));
  const height = Number(canvas.getAttribute("height")) || 260;
  const scale = window.devicePixelRatio || 1;
  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, width, height);
  ctx.font = "12px Arial";
  ctx.fillStyle = "#667085";

  const margin = { top: 18, right: 18, bottom: options.horizontal ? 28 : 54, left: options.horizontal ? 126 : 48 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const max = Math.max(...items.map((item) => item.value), 1);

  ctx.strokeStyle = "#d9dee7";
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + plotH);
  ctx.lineTo(margin.left + plotW, margin.top + plotH);
  ctx.stroke();

  items.forEach((item, index) => {
    ctx.fillStyle = COLORS[index % COLORS.length];
    if (options.horizontal) {
      const slot = plotH / items.length;
      const barH = Math.max(8, slot * 0.58);
      const barW = (item.value / max) * plotW;
      const y = margin.top + index * slot + (slot - barH) / 2;
      ctx.fillRect(margin.left, y, barW, barH);
      ctx.fillStyle = "#17202a";
      ctx.fillText(item.label.slice(0, 18), 8, y + barH - 2);
      ctx.fillText(formatMetric(item.value), margin.left + Math.min(barW + 6, plotW - 80), y + barH - 2);
    } else {
      const slot = plotW / items.length;
      const barW = Math.max(14, slot * 0.52);
      const barH = (item.value / max) * plotH;
      const x = margin.left + index * slot + (slot - barW) / 2;
      const y = margin.top + plotH - barH;
      ctx.fillRect(x, y, barW, barH);
      ctx.save();
      ctx.translate(x + barW / 2, margin.top + plotH + 12);
      ctx.rotate(-Math.PI / 5);
      ctx.fillStyle = "#17202a";
      ctx.fillText(item.label, 0, 0);
      ctx.restore();
    }
  });
}

function drawPieChart(canvas, items) {
  const { ctx, width, height } = chartSize(canvas, 260);

  const total = items.reduce((sum, item) => sum + item.value, 0);
  const cx = width * 0.34;
  const cy = height / 2;
  const radius = Math.min(width * 0.24, height * 0.36);
  const innerRadius = radius * 0.56;
  let angle = -Math.PI / 2;

  if (!total) {
    ctx.fillStyle = "#667085";
    ctx.fillText("Sin datos", cx - 24, cy);
    return;
  }

  items.forEach((item, index) => {
    const slice = (item.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = COLORS[index % COLORS.length];
    ctx.fill();
    angle += slice;
  });

  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  ctx.textAlign = "center";
  ctx.fillStyle = "#17202a";
  ctx.font = "700 14px Arial";
  ctx.fillText("Total", cx, cy - 4);
  ctx.font = "12px Arial";
  ctx.fillText(shortMetric(total), cx, cy + 14);

  ctx.font = "12px Arial";
  ctx.textAlign = "left";
  items.slice(0, 6).forEach((item, index) => {
    const x = width * 0.62;
    const y = 38 + index * 28;
    ctx.fillStyle = COLORS[index % COLORS.length];
    ctx.fillRect(x, y - 10, 12, 12);
    ctx.fillStyle = "#17202a";
    ctx.fillText(`${ellipsize(item.label, 20)} ${formatPct((item.value / total) * 100)}`, x + 18, y);
  });
}

function renderMonthlySummary(periods) {
  const base = activeBasePeriod();
  const prev = previousPeriod(base);
  const yoy = sameMonthLastYear(base);
  const rows =
    reportType() === "changes"
      ? [
          { label: "Unidades cambiadas", metric: "units" },
          { label: "Registros de cambio", metric: "orders" },
        ]
      : [
          { label: "Unidades vendidas", metric: "units" },
          { label: "Bonificacion", metric: "bonusUnits" },
          { label: "Unidades a entregar", metric: "deliveryUnits" },
          { label: "Monto", metric: "amount" },
          { label: "Comandas", metric: "orders" },
        ];

  els.monthlyHead.innerHTML = `
    <tr>
      <th>Indicador</th>
      ${periods.map((period) => `<th class="num">${periodLabel(period)}</th>`).join("")}
      <th class="num">Var. mes anterior</th>
      <th class="num">Var. a\u00f1o anterior</th>
    </tr>
  `;

  els.monthlyRows.innerHTML = rows
    .map((row) => {
      const sourceRows =
        reportType() === "changes"
          ? state.changes
          : row.metric === "amount" || row.metric === "orders"
            ? state.orders
            : state.joined;
      const values = periods.map((period) => aggregate(rowsForPeriod(period, sourceRows))[row.metric]);
      const current = aggregate(rowsForPeriod(base, sourceRows))[row.metric];
      const prevValue = aggregate(rowsForPeriod(prev, sourceRows))[row.metric];
      const yoyValue = aggregate(rowsForPeriod(yoy, sourceRows))[row.metric];
      const formatter = row.metric === "amount" ? formatMoney : formatNumber;
      const mom = pct(current, prevValue);
      const yoyPct = pct(current, yoyValue);

      return `
        <tr>
          <td>${row.label}</td>
          ${values.map((value) => `<td class="num">${formatter(value)}</td>`).join("")}
          <td class="num ${valueClass(mom)}">${formatPct(mom)}</td>
          <td class="num ${valueClass(yoyPct)}">${formatPct(yoyPct)}</td>
        </tr>
      `;
    })
    .join("");
}

function render() {
  const periods = selectedPeriods();
  const base = activeBasePeriod();
  const prev = previousPeriod(base);
  const yoy = sameMonthLastYear(base);
  const baseRows = rowsForPeriod(base);
  const baseAgg = aggregate(baseRows);
  const baseValue = baseAgg[metricKey()];
  const prevValue = getPeriodValue(prev);
  const yoyValue = getPeriodValue(yoy);
  const mom = pct(baseValue, prevValue);
  const yoyPct = pct(baseValue, yoyValue);

  els.baseTotal.textContent = formatMetric(baseValue);
  els.baseCaption.textContent = periodLabel(base);
  els.momDelta.textContent = formatPct(mom);
  els.momDelta.className = valueClass(mom);
  els.momCaption.textContent = `vs ${periodLabel(prev)}`;
  els.yoyDelta.textContent = formatPct(yoyPct);
  els.yoyDelta.className = valueClass(yoyPct);
  els.yoyCaption.textContent = `vs ${periodLabel(yoy)}`;
  els.orderCount.textContent = formatNumber(baseAgg.orders);
  els.orderCountLabel.textContent = reportType() === "changes" ? "Cambios" : "Comandas";
  els.lineCount.textContent = `${formatNumber(baseAgg.lines)} lineas de detalle`;
  els.summaryCaption.textContent = `${metricLabel()} seleccionado como metrica principal`;
  els.statusLine.textContent = `${periods.length} periodos seleccionados. Datos actualizados desde Google Sheets.`;
  els.executiveTitle.textContent = `${metricLabel()} - ${periodLabel(base)}`;
  const activeFilters = [
    selectedSet("groups").size ? filterSummary("groups", "Grupo", "Grupos") : null,
    selectedSet("clients").size ? filterSummary("clients", "Distribuidor", "Distribuidores") : null,
    selectedSet("statuses").size ? filterSummary("statuses", "Estado", "Estados") : null,
    els.product.value.trim() ? `Producto: ${els.product.value.trim()}` : null,
  ].filter(Boolean);
  els.executiveFilters.textContent = activeFilters.length ? activeFilters.join(" | ") : "Todos los grupos y distribuidores";

  renderMonthlySummary(periods);

  const detailRows = reportType() === "changes" ? state.changes : state.joined;
  const productRows = buildMatrixRows(detailRows, (row) => row.productName, "Sin producto", 25);
  renderMatrixTable(els.productHead, els.productRows, "Producto", productRows, detailRows);

  const matrixRows = rowsForMetric();
  const groupRows = buildMatrixRows(matrixRows, (row) => row.group, "Sin grupo", 25);
  renderMatrixTable(els.groupHead, els.groupRows, "Grupo", groupRows, matrixRows);

  const clientRows = buildMatrixRows(matrixRows, (row) => row.clientName, "Sin distribuidor", 25);
  renderMatrixTable(els.clientHead, els.clientRows, "Distribuidor", clientRows, matrixRows);

  const monthChartItems = periods.map((period) => ({
    label: `${MONTHS[period.month - 1].slice(0, 3)} ${String(period.year).slice(2)}`,
    value: getPeriodValue(period),
  }));
  drawBarChart(els.monthBar, monthChartItems);
  document.querySelector("#barCaption").textContent = metricLabel();

  const groupItems = buildMatrixRows(matrixRows, (row) => row.group, "Sin grupo", 8).map((row) => ({
    label: row.name,
    value: row.baseValue,
  }));
  drawPieChart(els.groupPie, groupItems);

  drawBarChart(
    els.productBar,
    productRows.slice(0, 10).map((row) => ({ label: row.name, value: row.baseValue })),
    { horizontal: true }
  );
  drawBarChart(
    els.clientBar,
    clientRows.slice(0, 10).map((row) => ({ label: row.name, value: row.baseValue })),
    { horizontal: true }
  );
}

async function loadSheet(sheetName) {
  const response = await fetch(`/api/sheet/${encodeURIComponent(sheetName)}`);
  if (!response.ok) throw new Error(`No se pudo leer ${sheetName}`);
  return parseCsv(await response.text());
}

function normalize() {
  const comandasByNumber = new Map(
    state.comandas.map((row) => [
      row["NUMERO DE COMANDA"],
      {
        group: row.GRUPO || "Sin grupo",
        status: row.STATUS || "Sin estado",
        paymentStatus: row["STATUS COBRO"] || "Sin estado de cobro",
      },
    ])
  );

  state.orders = state.comandas
    .map((row) => {
      const period = parsePeriodFromDate(row["FECHA DE ENTREGA"]);
      return {
        orderNumber: row["NUMERO DE COMANDA"],
        clientName: row["NOMBRE DEL CLIENTE"] || "Sin cliente",
        productName: "",
        group: row.GRUPO || "Sin grupo",
        status: row.STATUS || "Sin estado",
        paymentStatus: row["STATUS COBRO"] || "Sin estado de cobro",
        units: 0,
        bonusUnits: 0,
        deliveryUnits: 0,
        amount: parseNumber(row.IMPORTE),
        month: period?.month,
        year: period?.year,
      };
    })
    .filter((row) => row.month >= 1 && row.month <= 12 && row.year > 2000 && row.status === "ENTREGADO");

  state.joined = state.detalles
    .map((row) => {
      const order = comandasByNumber.get(row["NUMERO DE COMANDA"]) || {};
      const period = parsePeriodFromDate(row["FECHA DE ENTREGA"]);
      return {
        orderNumber: row["NUMERO DE COMANDA"],
        clientName: row["NOMBRE CLIENTE"] || "Sin cliente",
        productName: row["NOMBRE PRODUCTO"] || "Sin producto",
        group: order.group || "Sin grupo",
        status: order.status || "Sin estado",
        paymentStatus: order.paymentStatus || "Sin estado de cobro",
        units: parseNumber(row.CANTIDAD),
        bonusUnits: parseNumber(row["BONIFICACION A ENTREGAR"]),
        deliveryUnits: parseNumber(row["TOTAL A ENTREGAR"] || row.CANTIDAD),
        amount: parseNumber(row.SUBTOTAL),
        month: period?.month,
        year: period?.year,
      };
    })
    .filter((row) => row.month >= 1 && row.month <= 12 && row.year > 2000 && row.status === "ENTREGADO");

  const clientGroupById = new Map(
    state.comandas.map((row) => [String(row.CLIENTE || "").trim().toUpperCase(), row.GRUPO || "Sin grupo"])
  );
  const clientGroupByName = new Map(
    state.comandas.map((row) => [String(row["NOMBRE DEL CLIENTE"] || "").trim().toUpperCase(), row.GRUPO || "Sin grupo"])
  );
  const cambiosByNumber = new Map(
    state.cambioClientes.map((row) => [
      row["NUMERO DE COMANDA DE CAMBIOS"],
      {
        clientId: row.CLIENTE || "",
        clientName: row["NOMBRE CLIENTE"] || "Sin cliente",
        status: row.STATUS || "Sin estado",
        period: parsePeriodFromDate(row["FECHA DE ENTREGA"] || row["FECHA CREACION DE CDC"]),
      },
    ])
  );

  state.changes = state.cambioDetalles
    .map((row) => {
      const changeOrder = cambiosByNumber.get(row["NUMERO DE COMANDA DE CAMBIOS"]) || {};
      const period = changeOrder.period || parsePeriodFromDate(row["FECHA DE ENTREGA"]);
      const clientName = changeOrder.clientName || row.CLIENTE || "Sin cliente";
      const group =
        clientGroupById.get(String(changeOrder.clientId || "").trim().toUpperCase()) ||
        clientGroupByName.get(String(clientName).trim().toUpperCase()) ||
        "Sin grupo";
      return {
        orderNumber: row["NUMERO DE COMANDA DE CAMBIOS"] || row["ID_DETALLE DE CAMBIOS"],
        clientName,
        productName: row["NOMBRE PRODUCTO"] || "Sin producto",
        group,
        status: changeOrder.status || "Sin estado",
        paymentStatus: "",
        units: parseNumber(row.CANTIDAD),
        bonusUnits: 0,
        deliveryUnits: parseNumber(row.CANTIDAD),
        amount: 0,
        month: period?.month,
        year: period?.year,
      };
    })
    .filter((row) => row.month >= 1 && row.month <= 12 && row.year > 2000 && row.status === "ENTREGADO");
}
function setupPeriods() {
  const periodMap = new Map();
  const isChangesReport = reportType() === "changes";
  const dataRows = isChangesReport ? state.changes : [...state.joined, ...state.orders];
  const sourceRows = isChangesReport ? [...state.joined, ...state.orders, ...state.changes] : dataRows;
  sourceRows.forEach((row) => {
    const key = periodKey(row.year, row.month);
    periodMap.set(key, { key, year: row.year, month: row.month });
  });

  const availablePeriods = [...periodMap.values()].sort((a, b) => a.key.localeCompare(b.key));
  if (isChangesReport && availablePeriods.length) {
    const first = monthIndex(availablePeriods[0]);
    const last = monthIndex(availablePeriods[availablePeriods.length - 1]);
    state.periods = Array.from({ length: last - first + 1 }, (_, index) => periodFromIndex(first + index));
  } else {
    state.periods = availablePeriods;
  }

  const dataPeriodKeys = [
    ...new Set(dataRows.map((row) => periodKey(row.year, row.month)).sort((a, b) => a.localeCompare(b))),
  ];
  const defaults = (isChangesReport ? dataPeriodKeys : state.periods.map((period) => period.key)).slice(-5);
  state.selectedPeriodKeys = defaults.length ? defaults : state.periods.map((period) => period.key);

  els.periodPicker.innerHTML = state.periods
    .map(
      (period) => `
        <label class="period-chip">
          <input type="checkbox" value="${period.key}" ${state.selectedPeriodKeys.includes(period.key) ? "checked" : ""}>
          <span>${periodLabel(period)}</span>
        </label>
      `
    )
    .join("");

  els.periodPicker.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      const checked = [...els.periodPicker.querySelectorAll("input:checked")].map((item) => item.value);
      if (!checked.length) {
        input.checked = true;
        return;
      }
      state.selectedPeriodKeys = checked;
      refreshBasePeriodOptions();
      render();
    });
  });

  refreshBasePeriodOptions();
}

function resetPeriodsForCurrentReport() {
  setupPeriods();
}

function refreshBasePeriodOptions() {
  const selected = selectedPeriods();
  const current = els.basePeriod.value;
  fillSelect(
    els.basePeriod,
    selected.map((period) => ({ value: period.key, label: periodLabel(period) }))
  );
  els.basePeriod.value = state.selectedPeriodKeys.includes(current)
    ? current
    : selected[selected.length - 1]?.key || "";
}

function setupFilters() {
  const filterRows = reportType() === "changes" ? state.changes : state.joined;
  renderMultiFilter(
    els.groupPanel,
    els.groupBtn,
    [...new Set(filterRows.map((row) => row.group))].sort(),
    "groups",
    "Grupo",
    "Grupos"
  );
  renderMultiFilter(
    els.clientPanel,
    els.clientBtn,
    [...new Set(filterRows.map((row) => row.clientName))].sort(),
    "clients",
    "Distribuidor",
    "Distribuidores"
  );
  renderMultiFilter(
    els.statusPanel,
    els.statusBtn,
    [...new Set(filterRows.map((row) => row.status))].sort(),
    "statuses",
    "Estado",
    "Estados"
  );
  setupDropdown(els.groupBtn, els.groupPanel);
  setupDropdown(els.clientBtn, els.clientPanel);
  setupDropdown(els.statusBtn, els.statusPanel);
  els.groupBtn.disabled = false;
  els.clientBtn.disabled = false;
  els.statusBtn.disabled = false;

  [els.salesTab, els.changesTab].forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.classList.contains("active")) return;
      document.querySelectorAll(".tab-button").forEach((button) => button.classList.remove("active"));
      tab.classList.add("active");
      els.metric.disabled = reportType() === "changes";
      selectedSet("groups").clear();
      selectedSet("clients").clear();
      selectedSet("statuses").clear();
      resetPeriodsForCurrentReport();
      refreshFilterPanels();
      render();
    });
  });

  els.metric.disabled = reportType() === "changes";

  [els.metric, els.basePeriod, els.product].forEach((control) => {
    control.addEventListener("input", render);
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".multi-filter")) {
      document.querySelectorAll(".filter-panel.open").forEach((panel) => panel.classList.remove("open"));
    }
  });

  window.addEventListener("resize", render);
}

async function init() {
  try {
    els.print.addEventListener("click", () => window.print());
    const [comandas, detalles, cambioClientes, cambioDetalles] = await Promise.all([
      loadSheet("COMANDA"),
      loadSheet("DETALLE COMANDA"),
      loadSheet("COMANDA DE  CAMBIOS"),
      loadSheet("DETALLE DE CAMBIOS"),
    ]);
    state.comandas = comandas;
    state.detalles = detalles;
    state.cambioClientes = cambioClientes;
    state.cambioDetalles = cambioDetalles;
    normalize();
    setupPeriods();
    setupFilters();
    render();
  } catch (error) {
    els.statusLine.textContent = error.message;
  }
}

init();
