// ============================================================
// UI — Estado de vista, helpers DOM y renders
// ============================================================

// ── Estado de vista (no persistido en localStorage) ──────────
let tipoTxn     = 'ingreso';
let editTipoTxn = 'ingreso';
let filtroPersona = null;
let mesVista      = null;

// ── Toast ────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const icons     = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toast-container');
  const toast     = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${icons[type] || '✅'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 260);
  }, 2800);
}

function showUndoToast(msg, undoCallback) {
  const container = document.getElementById('toast-container');
  const toast     = document.createElement('div');
  toast.className = 'toast';
  let undone = false;
  const icon = document.createElement('span');
  icon.textContent = '🗑';
  const text = document.createElement('span');
  text.textContent = msg;
  const btn = document.createElement('button');
  btn.className   = 'toast-undo-btn';
  btn.textContent = 'Deshacer';
  btn.onclick = () => {
    undone = true;
    undoCallback();
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 260);
  };
  toast.append(icon, text, btn);
  container.appendChild(toast);
  setTimeout(() => {
    if (undone) return;
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 260);
  }, 4000);
}

// ── Modales ──────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.querySelectorAll(`#${id} input[type="date"]`).forEach(d => {
    if (!d.value) d.value = new Date().toISOString().slice(0, 10);
  });
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function(e) {
      if (e.target === this) this.classList.remove('open');
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      openModal('modal-txn');
    }
  });
});

// ── Tab activo ───────────────────────────────────────────────
function getCurrentTab() {
  const s = document.querySelector('.section.active');
  return s ? s.id.replace('tab-', '') : 'dashboard';
}

// ── Countdown ────────────────────────────────────────────────
let countdownInterval = null;

function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  let segundos = 60;
  const el  = document.getElementById('last-update');
  const now = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  countdownInterval = setInterval(() => {
    segundos--;
    if (segundos <= 0) { clearInterval(countdownInterval); return; }
    el.textContent = `Actualizado ${now} · próxima en ${segundos}s`;
  }, 1000);
}

// ── Charts ───────────────────────────────────────────────────
let chartInstances = {
  gastos: null,
  patrimonio: null,
  evolucion: null
};
let periodoEvolucion = 6;

function calcTotalCriptoUSD() {
  if (!state.activos || !state.precios.cripto) return 0;
  return state.activos.reduce((total, a) => {
    const precio = state.precios.cripto[a.symbol]?.usd || 0;
    return total + (a.cantidad * precio);
  }, 0);
}

/**
 * Asigna valores a múltiples elementos del DOM de una vez.
 * @param {Object} mapping - Objeto donde la llave es el ID del input y el valor es el dato.
 */
function setFormValues(mapping) {
  Object.entries(mapping).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) {
      if (el.type === 'date' && value) {
        el.value = value;
      } else {
        el.value = value ?? '';
      }
    }
  });
}

/**
 * Genera y actualiza los gráficos usando Chart.js.
 * Requiere la librería Chart.js cargada y elementos <canvas id="chart-gastos"> y <canvas id="chart-patrimonio">.
 */
function setPeriodoEvolucion(meses) {
  periodoEvolucion = meses;
  document.getElementById('evol-btn-6').classList.toggle('active', meses === 6);
  document.getElementById('evol-btn-12').classList.toggle('active', meses === 12);
  renderEvolucion();
}

function renderEvolucion() {
  const ctx = document.getElementById('chart-evolucion');
  if (!ctx || typeof Chart === 'undefined') return;

  const labels = [], dataIngresos = [], dataGastos = [], dataBalance = [];

  for (let i = periodoEvolucion - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
    const { ingresos, gastos, balance } = calcTotalesMes(mes);
    labels.push(label);
    dataIngresos.push(ingresos);
    dataGastos.push(gastos);
    dataBalance.push(balance);
  }

  const isDark = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#666' : '#aaa';

  if (chartInstances.evolucion) chartInstances.evolucion.destroy();
  chartInstances.evolucion = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Ingresos',
          data: dataIngresos,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        },
        {
          label: 'Gastos',
          data: dataGastos,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        },
        {
          label: 'Balance',
          data: dataBalance,
          borderColor: '#3b82f6',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          borderDash: [5, 4],
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 10 }, color: tickColor, padding: 16 }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${fmtARS(ctx.raw)}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: tickColor, font: { size: 10 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: tickColor,
            font: { size: 10 },
            callback: v => fmtARS(v)
          }
        }
      }
    }
  });
}

function renderCharts() {
  const ctxGastos = document.getElementById('chart-gastos');
  const ctxPatrimonio = document.getElementById('chart-patrimonio');

  // Salir si no existen los elementos en el DOM o no está cargada la librería
  if (!ctxGastos || !ctxPatrimonio || typeof Chart === 'undefined') return;

  // 1. Distribución de Gastos (Mes Actual)
  const txnsGastos = getTxnsMes().filter(t => t.tipo === 'gasto');
  const labels = catLabels();
  const dataByCat = {};

  txnsGastos.forEach(t => {
    const name = labels[t.cat] || t.cat;
    dataByCat[name] = (dataByCat[name] || 0) + t.monto;
  });

  if (chartInstances.gastos) chartInstances.gastos.destroy();
  chartInstances.gastos = new Chart(ctxGastos, {
    type: 'doughnut',
    data: {
      labels: Object.keys(dataByCat),
      datasets: [{
        data: Object.values(dataByCat),
        backgroundColor: ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#6366f1'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 }, color: '#888' } } }
    }
  });

  // 2. Composición del Patrimonio (Efectivo vs Cripto en USD)
  const criptoUSD = calcTotalCriptoUSD();
  const efectivoUSD = state.casa.ahorroActualUSD;

  if (chartInstances.patrimonio) chartInstances.patrimonio.destroy();
  chartInstances.patrimonio = new Chart(ctxPatrimonio, {
    type: 'pie',
    data: {
      labels: ['Ahorro Efectivo', 'Portfolio Cripto'],
      datasets: [{
        data: [efectivoUSD, criptoUSD],
        backgroundColor: ['#22c55e', '#facc15'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 }, color: '#888' } } }
    }
  });
}

// ── Header & Tabs ───────────────────────────────────────────
function updateHeader() {
  document.getElementById('dolar-bna').textContent    = state.precios.dolarBNA    ? fmtARS(state.precios.dolarBNA)    : '—';
  document.getElementById('dolar-cripto').textContent = state.precios.dolarCripto ? fmtARS(state.precios.dolarCripto) : '—';
  document.getElementById('usdt-p2p').textContent     = state.precios.usdtP2P     ? fmtARS(state.precios.usdtP2P)     : '—';
  document.getElementById('c-p2p').textContent        = state.precios.usdtP2P     ? fmtARS(state.precios.usdtP2P)     : '—';
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => {
    if (t.getAttribute('onclick') === `switchTab('${tab}')`) t.classList.add('active');
  });
  document.getElementById('tab-' + tab).classList.add('active');
  syncBottomNav(tab);
  if (tab === 'cripto')      renderActivos();
  if (tab === 'cambio')      renderCambio();
  if (tab === 'presupuesto') { renderPresupuesto(); renderBotPendientes(); renderDeudas(); }
  if (tab === 'dashboard')   renderDashboard();
  if (tab === 'casa')        renderCasa();
  if (tab === 'compromisos') renderCompromisos();
}

function syncBottomNav(tab) {
  document.querySelectorAll('.bottom-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
}


// ── Theme ───────────────────────────────────────────────────
function applyTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  document.getElementById('theme-toggle').textContent = isDark ? '🌙' : '☀️';
}

// ── Dashboard ───────────────────────────────────────────────
function renderDashboard() {
  const { ingresos, gastos, balance } = calcTotalesMes();
  const dolar = state.precios.dolarBNA;

  document.getElementById('d-ingresos').textContent     = fmtARS(ingresos);
  document.getElementById('d-ingresos-usd').textContent = dolar ? '≈ ' + fmtUSD(ingresos / dolar) : '';
  document.getElementById('d-gastos').textContent       = fmtARS(gastos);
  document.getElementById('d-gastos-usd').textContent   = dolar ? '≈ ' + fmtUSD(gastos / dolar)   : '';
  document.getElementById('d-balance').textContent      = fmtARS(balance);
  document.getElementById('d-balance-usd').textContent  = dolar ? '≈ ' + fmtUSD(balance / dolar)  : '';
  
  const totalCriptoUSD = calcTotalCriptoUSD();
  const totalCriptoARS = dolar ? totalCriptoUSD * dolar : 0;

  document.getElementById('d-cripto').textContent     = fmtARS(totalCriptoARS);
  document.getElementById('d-cripto-usd').textContent = fmtUSD(totalCriptoUSD);

  const meta = state.metaAhorro;
  const pct  = meta > 0 ? Math.min(100, (balance / meta) * 100) : 0;
  document.getElementById('d-ahorro').textContent    = fmtARS(balance);
  document.getElementById('d-meta').textContent      = fmtARS(meta);
  document.getElementById('ahorro-bar').style.width  = Math.max(0, pct) + '%';
  document.getElementById('ahorro-pct').textContent  = pct.toFixed(0) + '%';

  const recent = [...state.transacciones].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5);
  const cont   = document.getElementById('recent-txns');
  if (recent.length === 0) {
    cont.innerHTML = `<div class="empty-state" style="padding:20px"><div class="empty-state-icon">📭</div><p>Sin transacciones aún</p></div>`;
  } else {
    const labels = catLabels();
    cont.innerHTML = recent.map(t => {
      const personas   = extractPersonas(t.desc);
      const descLimpia = t.desc.replace(/\s*\(con .+?\)/, '');
      const pills      = personas.map(p => {
        const c = getPersonaColor(p);
        return `<span class="persona-pill" style="background:${c.bg};color:${c.color}">con ${p}</span>`;
      }).join('');
      const pc    = personas.length > 0 ? getPersonaColor(personas[0]) : null;
      const style = pc ? `background:${pc.bg};border-left:3px solid ${pc.color};padding-left:8px;border-radius:0 6px 6px 0` : 'border-left:3px solid transparent;padding-left:8px';
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="${style}">
          <div style="font-size:0.82rem">${descLimpia}${pills ? ' ' + pills : ''}</div>
          <div style="font-size:0.68rem;color:var(--muted)">${t.fecha} · ${labels[t.cat] || t.cat}</div>
        </div>
        <div class="${t.tipo === 'ingreso' ? 'amount-positive' : 'amount-negative'}" style="font-weight:600;font-size:0.85rem">
          ${t.tipo === 'ingreso' ? '+' : '-'}${fmtARS(t.monto)}
        </div>
      </div>`;
    }).join('') + `<div style="font-size:0.7rem;color:var(--muted);text-align:center;padding:8px 0;cursor:pointer" onclick="switchTab('presupuesto')">Ver todos →</div>`;
  }

  renderCharts();
  renderEvolucion();
}

// ── Navegación de mes ────────────────────────────────────────
function getMesVista() {
  return mesVista || getMesActual();
}

function labelMesVista(mes) {
  const [y, m] = mes.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

function mesAnterior() {
  const [y, m] = getMesVista().split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  mesVista = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  filtroPersona = null;
  renderPresupuesto();
}

function mesSiguiente() {
  if (getMesVista() >= getMesActual()) return;
  const [y, m] = getMesVista().split('-').map(Number);
  const d = new Date(y, m, 1);
  const sig = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  mesVista = sig >= getMesActual() ? null : sig;
  filtroPersona = null;
  renderPresupuesto();
}

// ── Helpers de personas ──────────────────────────────────────
const PERSONA_COLORS = [
  { bg: 'rgba(59,130,246,0.13)',  color: '#2563eb' },
  { bg: 'rgba(16,185,129,0.13)', color: '#059669' },
  { bg: 'rgba(245,158,11,0.13)', color: '#b45309' },
  { bg: 'rgba(139,92,246,0.13)', color: '#7c3aed' },
  { bg: 'rgba(236,72,153,0.13)', color: '#be185d' },
  { bg: 'rgba(239,68,68,0.13)',  color: '#dc2626' },
];
const _personaColorMap = {};
let   _personaColorIdx = 0;

function getPersonaColor(persona) {
  if (!_personaColorMap[persona]) {
    _personaColorMap[persona] = PERSONA_COLORS[_personaColorIdx++ % PERSONA_COLORS.length];
  }
  return _personaColorMap[persona];
}

function extractPersonas(desc) {
  const m = desc.match(/\(con (.+?)\)/);
  if (!m) return [];
  return m[1].split(/,\s*|\s+y\s+/i).map(s => s.trim()).filter(Boolean);
}

function setFiltroPersona(p) {
  filtroPersona = p;
  renderPresupuesto();
}

// ── Bot Pendientes ───────────────────────────────────────────
let _botGastosVistosIds = new Set();

async function renderBotPendientes() {
  const cont = document.getElementById('bot-pendientes');
  if (!cont) return;

  const raw    = await fetchGastosBot();
  // Bug 4: deduplicar por id en caso de respuestas duplicadas
  const seen   = new Set();
  const gastos = raw.filter(g => { if (seen.has(g.id)) return false; seen.add(g.id); return true; });

  // Feature 16: notificar si llegaron gastos nuevos mientras la pestaña estaba en background
  const nuevos = gastos.filter(g => !_botGastosVistosIds.has(g.id));
  if (nuevos.length > 0 && document.hidden && Notification.permission === 'granted') {
    new Notification('FinanzAR — Gastos nuevos', {
      body: `${nuevos.length} gasto${nuevos.length > 1 ? 's' : ''} por confirmar`,
    });
  }
  _botGastosVistosIds = new Set(gastos.map(g => g.id));

  if (gastos.length === 0) { cont.innerHTML = ''; return; }

  cont.innerHTML = `
    <div class="card bot-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div>
          <div class="card-title" style="margin-bottom:2px">🤖 Gastos del bot</div>
          <div style="font-size:0.75rem;color:var(--muted)">${gastos.length} pendiente${gastos.length > 1 ? 's' : ''} de confirmar</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="confirmarTodosBot()">✓ Confirmar todos</button>
      </div>
      ${gastos.map(g => `
        <div class="bot-gasto-row">
          <div style="flex:1;min-width:0">
            <div style="font-size:0.88rem;font-weight:600;color:var(--text)">
              ${g.desc}${g.compartido_con?.length ? ` <span style="font-weight:400;color:var(--muted)">con ${g.compartido_con.join(' y ')}</span>` : ''}
            </div>
            <div style="font-size:0.7rem;color:var(--muted);margin-top:2px">${g.categoria} · ${g.fecha}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-weight:700;font-size:0.95rem">${fmtARS(g.monto_personal)}</div>
            ${g.compartido_con?.length ? `<div style="font-size:0.68rem;color:var(--muted)">de ${fmtARS(g.monto)} total</div>` : ''}
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="btn btn-primary btn-sm" style="padding:5px 14px" onclick="confirmarUnBot(${g.id})">✓</button>
            <button class="btn btn-danger" style="padding:5px 10px" onclick="rechazarUnBot(${g.id})">✕</button>
          </div>
        </div>`).join('')}
    </div>`;
}

async function confirmarUnBot(id) {
  const gastos = await fetchGastosBot();
  const g = gastos.find(g => g.id === id);
  if (!g) return;
  const txnId = await confirmarGastoBot(id, g);
  if (txnId === null) return;
  renderBotPendientes();
  renderPresupuesto();
  renderDeudas();
  if (getCurrentTab() === 'dashboard') renderDashboard();
  showUndoToast(`${g.desc} importado`, () => {
    state.transacciones = state.transacciones.filter(t => t.id !== txnId);
    save();
    renderPresupuesto();
    renderDeudas();
    if (getCurrentTab() === 'dashboard') renderDashboard();
  });
}

async function rechazarUnBot(id) {
  await rechazarGastoBot(id);
  renderBotPendientes();
  showToast('Gasto descartado', 'info');
}

async function confirmarTodosBot() {
  const gastos = await fetchGastosBot();
  const txnIds = [];
  for (const g of gastos) txnIds.push(await confirmarGastoBot(g.id, g));
  renderBotPendientes();
  renderPresupuesto();
  renderDeudas();
  if (getCurrentTab() === 'dashboard') renderDashboard();
  showUndoToast(`${gastos.length} gasto${gastos.length > 1 ? 's' : ''} importados`, () => {
    state.transacciones = state.transacciones.filter(t => !txnIds.includes(t.id));
    save();
    renderPresupuesto();
    renderDeudas();
    if (getCurrentTab() === 'dashboard') renderDashboard();
  });
}

// ── Deudas entre personas ────────────────────────────────────
function calcDeudas() {
  const mapa = {};
  state.transacciones.forEach(t => {
    if (t.tipo !== 'gasto') return;
    const personas = extractPersonas(t.desc);
    personas.forEach(p => {
      if (!mapa[p]) mapa[p] = { debe: 0, cobrado: 0 };
      mapa[p].debe += t.monto;
    });
  });
  (state.pagos || []).forEach(pg => {
    if (!mapa[pg.persona]) mapa[pg.persona] = { debe: 0, cobrado: 0 };
    mapa[pg.persona].cobrado += pg.monto;
  });
  Object.values(mapa).forEach(v => { v.saldo = v.debe - v.cobrado; });
  return mapa;
}

function renderDeudas() {
  const cont = document.getElementById('deudas-panel');
  if (!cont) return;
  const deudas = calcDeudas();
  const personas = Object.keys(deudas);
  if (personas.length === 0) { cont.innerHTML = ''; return; }

  const filas = personas.map(p => {
    const d = deudas[p];
    const c = getPersonaColor(p);
    const saldoLabel = d.saldo > 0
      ? `<span style="color:var(--green);font-weight:700">${fmtARS(d.saldo)}</span>`
      : d.saldo < 0
      ? `<span style="color:var(--red);font-weight:700">${fmtARS(Math.abs(d.saldo))} (overpaid)</span>`
      : `<span style="color:var(--muted);font-weight:600">Saldado ✓</span>`;

    return `<div class="deuda-row">
      <div class="deuda-avatar" style="background:${c.bg};color:${c.color}">${p[0].toUpperCase()}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.88rem;font-weight:600;color:var(--text)">${p}</div>
        <div style="font-size:0.7rem;color:var(--muted);margin-top:1px">
          Total: ${fmtARS(d.debe)} · Cobrado: ${fmtARS(d.cobrado)}
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;margin-right:10px">
        <div style="font-size:0.65rem;color:var(--muted);margin-bottom:2px">Te debe</div>
        ${saldoLabel}
      </div>
      ${d.saldo > 0
        ? `<button class="btn btn-primary btn-sm" style="padding:5px 12px;white-space:nowrap" onclick="openModalPago('${p}',${d.saldo})">Cobrar</button>`
        : `<button class="btn btn-ghost btn-sm" style="padding:5px 12px;opacity:0.5" disabled>Cobrar</button>`
      }
    </div>`;
  }).join('');

  cont.innerHTML = `
    <div class="card deuda-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div>
          <div class="card-title" style="margin-bottom:2px">👥 Deudas entre personas</div>
          <div style="font-size:0.75rem;color:var(--muted)">Basado en todos los gastos compartidos</div>
        </div>
      </div>
      ${filas}
    </div>`;
}

function openModalPago(persona, saldoPendiente) {
  document.getElementById('pago-persona').value  = persona;
  document.getElementById('pago-monto').value    = saldoPendiente;
  document.getElementById('pago-persona-label').textContent = persona;
  openModal('modal-pago');
}

function registrarPago() {
  const persona = document.getElementById('pago-persona').value;
  const monto   = parseFloat(document.getElementById('pago-monto').value);
  if (!persona || isNaN(monto) || monto <= 0) { showToast('Monto inválido.', 'error'); return; }
  state.pagos.push({ id: Date.now(), persona, monto, fecha: new Date().toISOString().slice(0, 10) });
  save();
  closeModal('modal-pago');
  renderDeudas();
  showToast(`Pago de ${fmtARS(monto)} de ${persona} registrado ✓`);
}

// ── Presupuesto ─────────────────────────────────────────────
function setTipo(tipo) {
  tipoTxn = tipo;
  document.getElementById('tipo-ingreso').classList.toggle('active', tipo === 'ingreso');
  document.getElementById('tipo-gasto').classList.toggle('active', tipo === 'gasto');
}

function addTransaccion() {
  const desc  = document.getElementById('txn-desc').value.trim();
  const monto = parseFloat(document.getElementById('txn-monto').value);
  const cat   = document.getElementById('txn-cat').value;
  const fecha = document.getElementById('txn-fecha').value;

  if (!desc || isNaN(monto) || monto <= 0) { showToast('Completá descripción y monto.', 'error'); return; }

  state.transacciones.push({
    id: Date.now(), tipo: tipoTxn, desc, monto, cat,
    fecha: fecha || new Date().toISOString().slice(0, 10)
  });

  save();
  closeModal('modal-txn');
  document.getElementById('txn-desc').value  = '';
  document.getElementById('txn-monto').value = '';
  renderPresupuesto();
  if (getCurrentTab() === 'dashboard') renderDashboard();
  showToast(tipoTxn === 'ingreso' ? 'Ingreso guardado ✓' : 'Gasto guardado ✓');
}

// Patrón compartido por todas las eliminaciones con undo
function deleteWithUndo(col, id, renderFn, msg, refreshesDashboard = false) {
  const item = state[col].find(x => x.id === id);
  if (!item) return;
  state[col] = state[col].filter(x => x.id !== id);
  save();
  renderFn();
  if (refreshesDashboard && getCurrentTab() === 'dashboard') renderDashboard();
  showUndoToast(msg, () => {
    state[col].push(item);
    save();
    renderFn();
    if (refreshesDashboard && getCurrentTab() === 'dashboard') renderDashboard();
  });
}

function deleteTxn(id)         { deleteWithUndo('transacciones', id, renderPresupuesto, 'Transacción eliminada', true); }
function deleteActivo(id)      { deleteWithUndo('activos',       id, renderActivos,     'Activo eliminado',      true); }
function deleteSuscripcion(id) { deleteWithUndo('suscripciones', id, renderCompromisos, 'Suscripción eliminada'); }
function deleteCuota(id)       { deleteWithUndo('cuotas',        id, renderCompromisos, 'Cuota eliminada'); }

function renderPresupuesto() {
  const mes   = getMesVista();
  const dolar = state.precios.dolarBNA;
  const { ingresos, gastos } = calcTotalesMes(mes);

  // Actualizar label y botón siguiente
  const labelEl  = document.getElementById('mes-vista-label');
  const btnSig   = document.getElementById('btn-mes-sig');
  if (labelEl) labelEl.textContent = labelMesVista(mes);
  if (btnSig)  btnSig.disabled = mes >= getMesActual();

  document.getElementById('p-ingresos').textContent     = fmtARS(ingresos);
  document.getElementById('p-ingresos-usd').textContent = dolar ? '≈ ' + fmtUSD(ingresos / dolar) : '';
  document.getElementById('p-gastos').textContent       = fmtARS(gastos);
  document.getElementById('p-gastos-usd').textContent   = dolar ? '≈ ' + fmtUSD(gastos / dolar)   : '';

  const todasTxns = [...getTxnsMes(mes)].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const labels    = catLabels();
  const cont      = document.getElementById('txn-list');

  if (todasTxns.length === 0) {
    cont.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💸</div><p>Sin transacciones este mes</p><button class="btn btn-primary btn-sm" onclick="openModal('modal-txn')">+ Agregar</button></div>`;
    return;
  }

  // Acumular totales por persona para los chips de filtro
  const totalesPorPersona = {};
  todasTxns.filter(t => t.tipo === 'gasto').forEach(t => {
    const ps = extractPersonas(t.desc);
    if (ps.length === 0) {
      totalesPorPersona['__solo__'] = (totalesPorPersona['__solo__'] || 0) + t.monto;
    } else {
      ps.forEach(p => { totalesPorPersona[p] = (totalesPorPersona[p] || 0) + t.monto; });
    }
  });

  // Aplicar filtro de persona y búsqueda
  const busqueda = (document.getElementById('txn-search')?.value || '').toLowerCase().trim();
  const filtradas = filtroPersona === '__solo__'
    ? todasTxns.filter(t => extractPersonas(t.desc).length === 0)
    : filtroPersona
    ? todasTxns.filter(t => extractPersonas(t.desc).includes(filtroPersona))
    : todasTxns;
  const txns = busqueda
    ? filtradas.filter(t =>
        t.desc.toLowerCase().includes(busqueda) ||
        (labels[t.cat] || t.cat).toLowerCase().includes(busqueda)
      )
    : filtradas;

  // Construir chips de filtro
  const hayFiltros = Object.keys(totalesPorPersona).length > 1 ||
    (Object.keys(totalesPorPersona).length === 1 && !totalesPorPersona['__solo__']);

  let filtersHTML = '';
  if (hayFiltros) {
    const chips = [
      `<button class="filter-chip ${!filtroPersona ? 'active' : ''}" onclick="setFiltroPersona(null)">Todos</button>`
    ];
    if (totalesPorPersona['__solo__']) {
      chips.push(`<button class="filter-chip ${filtroPersona === '__solo__' ? 'active' : ''}" onclick="setFiltroPersona('__solo__')">Solo yo <span class="filter-chip-amt">${fmtARS(totalesPorPersona['__solo__'])}</span></button>`);
    }
    Object.entries(totalesPorPersona).filter(([k]) => k !== '__solo__').forEach(([p, total]) => {
      const c = getPersonaColor(p);
      chips.push(`<button class="filter-chip ${filtroPersona === p ? 'active' : ''}" style="--pc:${c.color};--pb:${c.bg}" onclick="setFiltroPersona('${p}')">Con ${p} <span class="filter-chip-amt">${fmtARS(total)}</span></button>`);
    });
    filtersHTML = `<div class="txn-filters">${chips.join('')}</div>`;
  }

  cont.innerHTML = `${filtersHTML}<table class="data-table">
    <thead><tr>
      <th>Fecha</th><th>Descripción</th><th>Categoría</th>
      <th style="text-align:right">Monto</th><th style="text-align:right">USD</th><th></th>
    </tr></thead>
    <tbody>
    ${txns.map(t => {
      const personas   = extractPersonas(t.desc);
      const descLimpia = t.desc.replace(/\s*\(con .+?\)/, '');
      const pills      = personas.map(p => {
        const c = getPersonaColor(p);
        return `<span class="persona-pill" style="background:${c.bg};color:${c.color}">con ${p}</span>`;
      }).join('');
      const pc         = personas.length > 0 ? getPersonaColor(personas[0]) : null;
      const rowBg      = pc ? `background:${pc.bg}` : '';
      const borderLeft = pc ? `border-left:3px solid ${pc.color}` : 'border-left:3px solid transparent';
      return `<tr style="${rowBg}">
        <td style="color:var(--muted);${borderLeft};padding-left:10px">${t.fecha}</td>
        <td>${descLimpia}${pills ? ' ' + pills : ''}</td>
        <td><span class="badge ${t.tipo === 'ingreso' ? 'badge-green' : 'badge-red'}">${labels[t.cat] || t.cat}</span></td>
        <td style="text-align:right" class="${t.tipo === 'ingreso' ? 'amount-positive' : 'amount-negative'}">${t.tipo === 'ingreso' ? '+' : '-'}${fmtARS(t.monto)}</td>
        <td style="text-align:right;color:var(--muted);font-size:0.78rem">${dolar ? fmtUSD(t.monto / dolar) : '—'}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost" style="padding:4px 10px;font-size:0.72rem;margin-right:4px" onclick="openEditTxn(${t.id})">✏️</button>
          <button class="btn btn-danger" onclick="deleteTxn(${t.id})">✕</button>
        </td>
      </tr>`;
    }).join('')}
    </tbody>
  </table>`;
}

function saveMeta() {
  const m = parseFloat(document.getElementById('meta-monto').value);
  if (!isNaN(m) && m > 0) { state.metaAhorro = m; save(); }
  closeModal('modal-meta');
  renderDashboard();
}

// ── Cripto ──────────────────────────────────────────────────
const cryptoMeta = {
  bitcoin:     { symbol: 'BTC',  name: 'Bitcoin',  icon: 'btc',   emoji: '₿' },
  ethereum:    { symbol: 'ETH',  name: 'Ethereum', icon: 'eth',   emoji: 'Ξ' },
  tether:      { symbol: 'USDT', name: 'Tether',   icon: 'usdt',  emoji: '₮' },
  binancecoin: { symbol: 'BNB',  name: 'BNB',      icon: 'bnb',   emoji: 'B' },
  solana:      { symbol: 'SOL',  name: 'Solana',   icon: 'sol',   emoji: '◎' },
  ripple:      { symbol: 'XRP',  name: 'XRP',      icon: 'other', emoji: '✕' },
  cardano:     { symbol: 'ADA',  name: 'Cardano',  icon: 'other', emoji: '₳' },
  dogecoin:    { symbol: 'DOGE', name: 'Dogecoin', icon: 'other', emoji: 'Ð' },
};

function addCripto() {
  const symbol       = document.getElementById('cripto-symbol').value;
  const cantidad     = parseFloat(document.getElementById('cripto-cantidad').value);
  const precioCompra = parseFloat(document.getElementById('cripto-precio-compra').value);
  const fecha        = document.getElementById('cripto-fecha').value;
  const nota         = document.getElementById('cripto-nota').value.trim();

  if (isNaN(cantidad) || cantidad <= 0 || isNaN(precioCompra) || precioCompra <= 0) {
    showToast('Completá cantidad y precio de compra.', 'error'); return;
  }

  state.activos.push({
    id: Date.now(), symbol, cantidad, precioCompra, nota,
    fecha: fecha || new Date().toISOString().slice(0, 10),
    historial: [{ fecha: fecha || new Date().toISOString().slice(0, 10), precio: precioCompra }]
  });

  save();
  closeModal('modal-cripto');
  document.getElementById('cripto-cantidad').value      = '';
  document.getElementById('cripto-precio-compra').value = '';
  document.getElementById('cripto-nota').value          = '';
  fetchCriptoPrices().then(() => renderActivos());
  showToast('Activo cripto agregado ✓');
}


function renderActivos() {
  const grid  = document.getElementById('asset-grid');
  const dolar = state.precios.dolarBNA;

  if (state.activos.length === 0) {
    grid.innerHTML = `<div class="card empty-state" style="grid-column:1/-1"><div class="empty-state-icon">₿</div><p>Agregá tus criptomonedas</p><button class="btn btn-primary btn-sm" onclick="openModal('modal-cripto')">+ Agregar</button></div>`;
    document.getElementById('c-total-ars').textContent = '$0';
    document.getElementById('c-total-usd').textContent = 'USD 0';
    document.getElementById('c-pnl-usd').textContent   = '—';
    return;
  }

  let totalUSD = 0, totalCostoUSD = 0;

  const cards = state.activos.map(a => {
    const meta          = cryptoMeta[a.symbol] || { symbol: a.symbol.toUpperCase(), name: a.symbol, icon: 'other', emoji: '?' };
    const precioCurrent = state.precios.cripto[a.symbol]?.usd || null;
    const valorActualUSD = precioCurrent ? a.cantidad * precioCurrent : null;
    const costoUSD      = a.cantidad * a.precioCompra;
    const pnlUSD        = valorActualUSD !== null ? valorActualUSD - costoUSD : null;
    const pnlPct        = (valorActualUSD !== null && costoUSD > 0) ? ((valorActualUSD - costoUSD) / costoUSD) * 100 : null;
    const valorARS      = valorActualUSD && dolar ? valorActualUSD * dolar : null;

    if (valorActualUSD) totalUSD += valorActualUSD;
    totalCostoUSD += costoUSD;

    const pnlClass = pnlUSD !== null ? (pnlUSD >= 0 ? 'pnl-positive' : 'pnl-negative') : '';
    const pnlSign  = pnlUSD !== null ? (pnlUSD >= 0 ? '+' : '') : '';

    return `<div class="asset-card">
      <div class="asset-header">
        <div class="asset-name">
          <div class="asset-icon ${meta.icon}">${meta.emoji}</div>
          <div>
            <div class="asset-symbol">${meta.symbol}</div>
            <div class="asset-name-text">${meta.name}</div>
          </div>
        </div>
        <div>
          ${pnlPct !== null ? `<div class="pnl-display ${pnlClass}">${pnlSign}${pnlPct.toFixed(2)}%</div>` : '<div style="color:var(--muted);font-size:0.8rem">Sin precio</div>'}
          <button class="btn btn-danger" style="margin-top:6px;font-size:0.65rem;padding:4px 8px" onclick="deleteActivo(${a.id})">✕ Eliminar</button>
        </div>
      </div>
      <div class="asset-stats">
        <div><div class="asset-stat-label">Cantidad</div><div class="asset-stat-value">${a.cantidad} ${meta.symbol}</div></div>
        <div><div class="asset-stat-label">Precio Actual</div><div class="asset-stat-value">${precioCurrent ? fmtUSD(precioCurrent) : '—'}</div></div>
        <div><div class="asset-stat-label">Precio Compra</div><div class="asset-stat-value">${fmtUSD(a.precioCompra)}</div></div>
        <div><div class="asset-stat-label">P&L (USD)</div><div class="asset-stat-value ${pnlClass}">${pnlUSD !== null ? pnlSign + fmtUSD(pnlUSD) : '—'}</div></div>
        <div><div class="asset-stat-label">Valor USD</div><div class="asset-stat-value">${valorActualUSD ? fmtUSD(valorActualUSD) : '—'}</div></div>
        <div><div class="asset-stat-label">Valor ARS</div><div class="asset-stat-value">${valorARS ? fmtARS(valorARS) : '—'}</div></div>
      </div>
      ${a.nota  ? `<div style="margin-top:12px;font-size:0.72rem;color:var(--muted);border-top:1px solid var(--border);padding-top:10px">📝 ${a.nota}</div>` : ''}
      ${a.fecha ? `<div style="font-size:0.68rem;color:var(--muted);margin-top:4px">Comprado el ${a.fecha}</div>` : ''}
    </div>`;
  });

  grid.innerHTML = cards.join('');

  const totalPnL = totalUSD - totalCostoUSD;
  const totalARS = dolar ? totalUSD * dolar : 0;
  document.getElementById('c-total-ars').textContent = fmtARS(totalARS);
  document.getElementById('c-total-usd').textContent = fmtUSD(totalUSD);
  const pnlEl = document.getElementById('c-pnl-usd');
  pnlEl.textContent = (totalPnL >= 0 ? '+' : '') + fmtUSD(totalPnL);
  pnlEl.style.color = totalPnL >= 0 ? 'var(--green)' : 'var(--red)';
}

// ── Tipo de Cambio ───────────────────────────────────────────
async function renderCambio() {
  try {
    const data = await fetchJSON('https://dolarapi.com/v1/dolares');
    const nombres = {
      oficial: 'Dólar BNA Oficial', blue: 'Dólar Blue', bolsa: 'Dólar MEP (Bolsa)',
      contadoconliqui: 'Dólar CCL', mayorista: 'Dólar Mayorista',
      tarjeta: 'Dólar Tarjeta', cripto: 'Dólar Cripto (USDT)', ahorro: 'Dólar Ahorro'
    };
    const colors = { oficial: 'green', blue: 'blue', bolsa: 'yellow', contadoconliqui: 'yellow', mayorista: 'green', cripto: 'green' };
    document.getElementById('cambio-grid').innerHTML = data.map(d => `
      <div class="card stat-card ${colors[d.casa] || ''}">
        <div class="card-title">${nombres[d.casa] || d.casa}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">
          <div>
            <div style="font-size:0.62rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Compra</div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--accent)">${d.compra ? fmtARS(d.compra) : '—'}</div>
          </div>
          <div>
            <div style="font-size:0.62rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Venta</div>
            <div style="font-size:1.1rem;font-weight:700">${d.venta ? fmtARS(d.venta) : '—'}</div>
          </div>
        </div>
      </div>`).join('');
  } catch (e) {
    document.getElementById('cambio-grid').innerHTML = '<div class="card"><p style="color:var(--muted)">Error cargando tipos de cambio.</p></div>';
  }
}

function calcConvert() {
  const amount = parseFloat(document.getElementById('conv-amount').value);
  const from   = document.getElementById('conv-from').value;
  const bna    = state.precios.dolarBNA;
  const cripto = state.precios.usdtP2P || state.precios.dolarCripto;
  const el     = document.getElementById('conv-result');

  if (isNaN(amount)) { el.textContent = '—'; return; }
  if (!bna) { el.textContent = 'Actualizando...'; return; }

  let ars = 0;
  if (from === 'ars')  ars = amount;
  if (from === 'usd')  ars = amount * bna;
  if (from === 'usdt') ars = amount * (cripto || bna);

  const usd  = ars / bna;
  const usdt = cripto ? ars / cripto : ars / bna;

  el.textContent = from === 'ars'
    ? `${fmtUSD(usd)} · ${fmt(usdt, 2)} USDT`
    : from === 'usd'
    ? `${fmtARS(ars)} · ${fmt(usdt, 2)} USDT`
    : `${fmtARS(ars)} · ${fmtUSD(usd)}`;
}

// ── Casa ────────────────────────────────────────────────────
function saveCasaConfig() {
  const valor   = parseFloat(document.getElementById('casa-valor').value);
  const mensual = parseFloat(document.getElementById('casa-ahorro-mensual').value);
  const actual  = parseFloat(document.getElementById('casa-ahorro-actual').value);
  if (!isNaN(valor)   && valor   > 0)  state.casa.valorUSD          = valor;
  if (!isNaN(mensual) && mensual >= 0) state.casa.ahorroMensualUSD  = mensual;
  if (!isNaN(actual)  && actual  >= 0) state.casa.ahorroActualUSD   = actual;
  save(); closeModal('modal-casa-config'); renderCasa();
  showToast('Meta de casa guardada ✓');
}

function renderCasa() {
  const { valorUSD, ahorroMensualUSD, ahorroActualUSD } = state.casa;
  const dolar = state.precios.dolarBNA;

  const criptoUSD = calcTotalCriptoUSD();
  const totalUSD = ahorroActualUSD + criptoUSD;
  const faltaUSD = Math.max(0, valorUSD - totalUSD);
  const pct      = Math.min(100, (totalUSD / valorUSD) * 100);

  document.getElementById('casa-acumulado-usd').textContent = fmtUSD(totalUSD, 0);
  document.getElementById('casa-meta-usd').textContent      = 'USD ' + fmt(valorUSD);
  document.getElementById('casa-pct-label').textContent     = pct.toFixed(1) + '%';
  document.getElementById('casa-bar').style.width           = pct + '%';
  document.getElementById('casa-falta-usd').textContent     = fmtUSD(faltaUSD, 0);
  document.getElementById('casa-falta-ars').textContent     = dolar ? fmtARS(faltaUSD * dolar) : '—';

  const tiempoEl = document.getElementById('casa-tiempo');
  if (ahorroMensualUSD > 0 && faltaUSD > 0) {
    const meses  = Math.ceil(faltaUSD / ahorroMensualUSD);
    const años   = Math.floor(meses / 12);
    const mesesR = meses % 12;
    let label = '';
    if (años   > 0) label += años   + (años   === 1 ? ' año'  : ' años');
    if (mesesR > 0) label += (años > 0 ? ' y ' : '') + mesesR + (mesesR === 1 ? ' mes' : ' meses');
    tiempoEl.textContent = label;
    tiempoEl.style.color = 'var(--blue)';
  } else if (faltaUSD === 0) {
    tiempoEl.textContent = '¡Meta alcanzada! 🎉';
    tiempoEl.style.color = 'var(--green)';
  } else {
    tiempoEl.textContent = 'Configurá el ahorro mensual';
    tiempoEl.style.color = 'var(--muted)';
  }

  document.getElementById('casa-milestones').innerHTML = [0, 25, 50, 75, 100].map(m => `
    <div class="milestone-dot ${pct >= m ? 'reached' : ''}"><div class="dot"></div><span>${m}%</span></div>
  `).join('');

  document.getElementById('casa-contribuciones').innerHTML = `
    <div class="contribucion-card">
      <div class="contribucion-icon" style="background:rgba(52,199,89,0.1)">💵</div>
      <div>
        <div style="font-size:0.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Ahorro en efectivo/cuenta</div>
        <div style="font-weight:700;font-size:1.05rem;letter-spacing:-0.3px">${fmtUSD(ahorroActualUSD, 0)}</div>
        <div style="font-size:0.7rem;color:var(--muted)">${valorUSD > 0 ? ((ahorroActualUSD / valorUSD) * 100).toFixed(1) : 0}% del total</div>
      </div>
    </div>
    <div class="contribucion-card">
      <div class="contribucion-icon" style="background:rgba(247,183,49,0.1)">₿</div>
      <div>
        <div style="font-size:0.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Portfolio Cripto</div>
        <div style="font-weight:700;font-size:1.05rem;letter-spacing:-0.3px">${fmtUSD(criptoUSD, 0)}</div>
        <div style="font-size:0.7rem;color:var(--muted)">${valorUSD > 0 ? ((criptoUSD / valorUSD) * 100).toFixed(1) : 0}% del total</div>
      </div>
    </div>
    <div class="contribucion-card">
      <div class="contribucion-icon" style="background:rgba(0,122,255,0.1)">📅</div>
      <div>
        <div style="font-size:0.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Ahorro mensual planificado</div>
        <div style="font-weight:700;font-size:1.05rem;letter-spacing:-0.3px">${ahorroMensualUSD > 0 ? fmtUSD(ahorroMensualUSD, 0) + '/mes' : 'No configurado'}</div>
        <div style="font-size:0.7rem;color:var(--muted)">${dolar && ahorroMensualUSD > 0 ? fmtARS(ahorroMensualUSD * dolar) + '/mes' : '—'}</div>
      </div>
    </div>`;

  const tlEl = document.getElementById('casa-timeline');
  if (ahorroMensualUSD <= 0) {
    tlEl.innerHTML = `<div style="color:var(--muted);font-size:0.82rem;padding:12px 0">Configurá el ahorro mensual para ver la proyección.</div>`;
  } else {
    const now = new Date();
    tlEl.innerHTML = [25, 50, 75, 100].map(h => {
      const metaH   = valorUSD * h / 100;
      const mesesH  = totalUSD >= metaH ? 0 : Math.ceil((metaH - totalUSD) / ahorroMensualUSD);
      const fecha   = new Date(now);
      fecha.setMonth(fecha.getMonth() + mesesH);
      const reached = totalUSD >= metaH;
      return `<div class="timeline-item">
        <div class="timeline-dot ${reached ? '' : 'future'}"></div>
        <div>
          <div style="font-size:0.82rem;font-weight:500">${h === 100 ? '🏠 ¡Tu casa!' : h + '% — ' + fmtUSD(metaH, 0)}</div>
          <div style="font-size:0.7rem;color:var(--muted);margin-top:2px">
            ${reached ? '✅ Ya superado' : fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) + ' (~' + mesesH + ' meses)'}
          </div>
        </div>
      </div>`;
    }).join('');
  }

  const tips = [];
  if (ahorroMensualUSD === 0)                      tips.push({ icon: '📅', tip: 'Configurá un ahorro mensual fijo para ver proyecciones.' });
  if (criptoUSD < valorUSD * 0.1)                  tips.push({ icon: '₿',  tip: 'Invertir en cripto puede acelerar tu meta.' });
  if (ahorroMensualUSD > 0 && ahorroMensualUSD < 300) tips.push({ icon: '📈', tip: 'Aumentar el ahorro mensual USD 50 puede acortar el plazo meses.' });
  if (criptoUSD > 0)                               tips.push({ icon: '💡', tip: 'Actualizá los precios regularmente para tener el progreso al día.' });
  tips.push({ icon: '🎯', tip: `Con USD ${fmt(valorUSD)} como meta, cada dólar cuenta.` });
  tips.push({ icon: '🔄', tip: 'Cuando el cripto suba, considerá mover ganancias a ahorro estable.' });

  document.getElementById('casa-tips').innerHTML = tips.slice(0, 4).map(t => `
    <div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:1.1rem">${t.icon}</span>
      <span style="font-size:0.8rem;color:var(--muted);line-height:1.5">${t.tip}</span>
    </div>`).join('') + '<div style="height:1px"></div>';

  document.getElementById('casa-valor').value          = valorUSD;
  document.getElementById('casa-ahorro-mensual').value = ahorroMensualUSD || '';
  document.getElementById('casa-ahorro-actual').value  = ahorroActualUSD  || '';
}

// ── Compromisos ─────────────────────────────────────────────
const susIconos = { streaming: '🎬', musica: '🎵', software: '💻', gym: '🏋️', noticias: '📰', juegos: '🎮', otro: '📦' };
const susCats   = { streaming: 'Streaming', musica: 'Música', software: 'Software', gym: 'Gym / Salud', noticias: 'Noticias', juegos: 'Juegos', otro: 'Otro' };

function addSuscripcion() {
  const nombre = document.getElementById('sus-nombre').value.trim();
  const monto  = parseFloat(document.getElementById('sus-monto').value);
  const cat    = document.getElementById('sus-cat').value;
  const dia    = parseInt(document.getElementById('sus-dia').value) || 1;
  if (!nombre || isNaN(monto) || monto <= 0) { showToast('Completá nombre y monto.', 'error'); return; }
  state.suscripciones.push({ id: Date.now(), nombre, monto, cat, dia, activa: true });
  save(); closeModal('modal-suscripcion');
  document.getElementById('sus-nombre').value = '';
  document.getElementById('sus-monto').value  = '';
  renderCompromisos(); showToast('Suscripción guardada ✓');
}


function toggleSuscripcion(id) {
  const s = state.suscripciones.find(s => s.id === id);
  if (s) { s.activa = !s.activa; save(); renderCompromisos(); }
}

function addCuota() {
  const nombre  = document.getElementById('cuota-nombre').value.trim();
  const persona = document.getElementById('cuota-persona').value.trim() || 'Yo';
  const monto   = parseFloat(document.getElementById('cuota-monto').value);
  const total   = parseInt(document.getElementById('cuota-total').value);
  const pagadas = parseInt(document.getElementById('cuota-pagadas').value) || 0;
  const dia     = parseInt(document.getElementById('cuota-dia').value) || 10;
  const nota    = document.getElementById('cuota-nota').value.trim();
  if (!nombre || isNaN(monto) || monto <= 0 || isNaN(total) || total < 1) { showToast('Completá los datos requeridos.', 'error'); return; }
  if (pagadas >= total) { showToast('Las cuotas pagadas no pueden igualar al total.', 'error'); return; }
  state.cuotas.push({ id: Date.now(), nombre, persona, monto, total, pagadas, dia, nota, fechaInicio: getMesActual() });
  save(); closeModal('modal-cuota');
  ['cuota-nombre','cuota-monto','cuota-total','cuota-nota'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('cuota-pagadas').value = '0';
  document.getElementById('cuota-persona').value = 'Yo';
  renderCompromisos(); showToast('Cuota agregada ✓');
}

function pagarCuota(id) {
  const c = state.cuotas.find(c => c.id === id);
  if (c && c.pagadas < c.total) { c.pagadas++; save(); renderCompromisos(); showToast('Cuota marcada como pagada ✓'); }
}


function renderCompromisos() {
  const dolar    = state.precios.dolarBNA;
  const totalSus = state.suscripciones.filter(s => s.activa).reduce((a, s) => a + s.monto, 0);
  document.getElementById('sus-total-badge').textContent = state.suscripciones.length ? fmtARS(totalSus) + '/mes' : '';

  const susList = document.getElementById('suscripciones-list');
  susList.innerHTML = state.suscripciones.length === 0
    ? `<div class="empty-state" style="padding:28px 0"><div class="empty-state-icon">📺</div><p>Sin suscripciones cargadas</p><button class="btn btn-ghost btn-sm" onclick="openModal('modal-suscripcion')">+ Agregar</button></div>`
    : state.suscripciones.map(s => `
      <div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border2)">
        <div style="width:36px;height:36px;border-radius:10px;background:var(--accent-light);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0">${susIconos[s.cat] || '📦'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.88rem;font-weight:600;color:var(--text)">${s.nombre}</div>
          <div style="font-size:0.7rem;color:var(--muted)">${susCats[s.cat] || s.cat} · día ${s.dia}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:0.9rem;font-weight:700;color:${s.activa ? 'var(--text)' : 'var(--muted)'}">${fmtARS(s.monto)}</div>
          <div style="font-size:0.68rem;color:var(--muted)">${dolar ? fmtUSD(s.monto / dolar) : ''}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
          <button onclick="toggleSuscripcion(${s.id})" style="background:${s.activa ? 'var(--green-light)' : 'var(--border)'};color:${s.activa ? 'var(--green)' : 'var(--muted)'};border:none;border-radius:6px;padding:3px 8px;font-size:0.65rem;font-weight:600;cursor:pointer">${s.activa ? 'Activa' : 'Pausada'}</button>
          <button class="btn btn-ghost" style="padding:3px 8px;font-size:0.65rem" onclick="openEditSus(${s.id})">✏️</button>
          <button class="btn btn-danger" style="padding:3px 8px;font-size:0.65rem" onclick="deleteSuscripcion(${s.id})">✕</button>
        </div>
      </div>`).join('') + `<div style="padding-top:10px;font-size:0.78rem;color:var(--muted);text-align:right">Total activas: <strong style="color:var(--text)">${fmtARS(totalSus)}/mes</strong></div>`;

  const cuotasActivas = state.cuotas.filter(c => c.pagadas < c.total);
  const totalCuotas   = cuotasActivas.reduce((a, c) => a + c.monto, 0);
  document.getElementById('cuotas-total-badge').textContent = cuotasActivas.length ? fmtARS(totalCuotas) + '/mes' : '';

  const cuotasList = document.getElementById('cuotas-list');
  cuotasList.innerHTML = state.cuotas.length === 0
    ? `<div class="empty-state" style="padding:28px 0"><div class="empty-state-icon">💳</div><p>Sin cuotas cargadas</p><button class="btn btn-primary btn-sm" onclick="openModal('modal-cuota')">+ Agregar</button></div>`
    : state.cuotas.map(c => {
        const restantes = c.total - c.pagadas;
        const pct       = (c.pagadas / c.total) * 100;
        const fechaFin  = new Date(); fechaFin.setMonth(fechaFin.getMonth() + restantes);
        const finaliza  = fechaFin.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
        const terminada = restantes === 0;
        return `<div style="padding:12px 0;border-bottom:1px solid var(--border2)${terminada ? ';opacity:0.5' : ''}">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:7px">
                <div style="font-size:0.88rem;font-weight:600;color:var(--text)">${c.nombre}${terminada ? ' <span style="color:var(--green);font-size:0.72rem">✓ Terminada</span>' : ''}</div>
                <span style="font-size:0.65rem;font-weight:600;padding:1px 7px;border-radius:20px;background:var(--accent-light);color:var(--accent)">${c.persona || 'Yo'}</span>
              </div>
              <div style="font-size:0.7rem;color:var(--muted);margin-top:2px">${c.pagadas}/${c.total} cuotas · día ${c.dia}${c.nota ? ' · ' + c.nota : ''}</div>
              <div style="margin-top:8px">
                <div style="height:3px;background:var(--border);border-radius:2px;overflow:hidden">
                  <div style="height:100%;width:${pct}%;background:${terminada ? 'var(--green)' : 'var(--accent)'};border-radius:2px;transition:width 0.4s"></div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:var(--muted);margin-top:4px">
                  <span>${restantes} cuota${restantes !== 1 ? 's' : ''} restante${restantes !== 1 ? 's' : ''}</span>
                  ${!terminada ? `<span>Finaliza ${finaliza}</span>` : ''}
                </div>
              </div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:0.95rem;font-weight:700;color:var(--text)">${fmtARS(c.monto)}</div>
              <div style="font-size:0.68rem;color:var(--muted)">por cuota</div>
              <div style="font-size:0.75rem;font-weight:600;color:var(--red);margin-top:2px">${fmtARS(c.monto * restantes)} total</div>
            </div>
          </div>
          <div style="display:flex;gap:6px;margin-top:8px">
            ${!terminada ? `<button class="btn btn-ghost btn-sm" style="font-size:0.72rem;padding:4px 10px" onclick="pagarCuota(${c.id})">✓ Marcar pagada</button>` : ''}
            <button class="btn btn-ghost btn-sm" style="font-size:0.72rem;padding:4px 10px" onclick="openEditCuota(${c.id})">✏️ Editar</button>
            <button class="btn btn-danger" style="padding:4px 10px;font-size:0.72rem" onclick="deleteCuota(${c.id})">✕ Eliminar</button>
          </div>
        </div>`;
      }).join('');

  const varCats = ['servicios','comida','transporte','entretenimiento','salud','ropa','otros'];
  const mesesPrevios = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    mesesPrevios.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const txnsHist = state.transacciones.filter(t =>
    t.tipo === 'gasto' && varCats.includes(t.cat) && mesesPrevios.some(m => t.fecha.startsWith(m))
  );
  const mesesConDatos = mesesPrevios.filter(m => txnsHist.some(t => t.fecha.startsWith(m)));
  const variables = mesesConDatos.length > 0
    ? Math.round(txnsHist.reduce((a, t) => a + t.monto, 0) / mesesConDatos.length)
    : getTxnsMes().filter(t => t.tipo === 'gasto' && varCats.includes(t.cat)).reduce((a, t) => a + t.monto, 0);
  const totalProy = totalSus + totalCuotas + variables;
  document.getElementById('proy-suscripciones').textContent = fmtARS(totalSus);
  document.getElementById('proy-cuotas').textContent        = fmtARS(totalCuotas);
  document.getElementById('proy-variables').textContent     = fmtARS(variables);
  document.getElementById('proy-total').textContent         = fmtARS(totalProy);
  document.getElementById('proy-total-usd').textContent     = dolar ? '≈ ' + fmtUSD(totalProy / dolar) : '';
}

// ── Edit — Transacciones ─────────────────────────────────────
function openEditTxn(id) {
  const t = state.transacciones.find(t => t.id === id);
  if (!t) return;
  setFormValues({
    'edit-txn-id': t.id,
    'edit-txn-desc': t.desc,
    'edit-txn-monto': t.monto,
    'edit-txn-fecha': t.fecha,
    'edit-txn-cat': t.cat
  });
  setEditTipo(t.tipo);
  openModal('modal-edit-txn');
}

function setEditTipo(tipo) {
  editTipoTxn = tipo;
  document.getElementById('edit-tipo-ingreso').classList.toggle('active', tipo === 'ingreso');
  document.getElementById('edit-tipo-gasto').classList.toggle('active', tipo === 'gasto');
}

function saveEditTxn() {
  const id    = parseInt(document.getElementById('edit-txn-id').value);
  const t     = state.transacciones.find(t => t.id === id);
  if (!t) return;
  const desc  = document.getElementById('edit-txn-desc').value.trim();
  const monto = parseFloat(document.getElementById('edit-txn-monto').value);
  if (!desc || isNaN(monto) || monto <= 0) { showToast('Completá descripción y monto.', 'error'); return; }
  t.desc  = desc; t.monto = monto;
  t.fecha = document.getElementById('edit-txn-fecha').value;
  t.cat   = document.getElementById('edit-txn-cat').value;
  t.tipo  = editTipoTxn;
  save(); closeModal('modal-edit-txn');
  renderPresupuesto(); renderDashboard();
  showToast('Transacción actualizada ✓');
}

// ── Edit — Suscripciones ─────────────────────────────────────
function openEditSus(id) {
  const s = state.suscripciones.find(s => s.id === id);
  if (!s) return;
  setFormValues({
    'edit-sus-id': s.id,
    'edit-sus-nombre': s.nombre,
    'edit-sus-monto': s.monto,
    'edit-sus-cat': s.cat,
    'edit-sus-dia': s.dia
  });
  openModal('modal-edit-sus');
}

function saveEditSus() {
  const id     = parseInt(document.getElementById('edit-sus-id').value);
  const s      = state.suscripciones.find(s => s.id === id);
  if (!s) return;
  const nombre = document.getElementById('edit-sus-nombre').value.trim();
  const monto  = parseFloat(document.getElementById('edit-sus-monto').value);
  if (!nombre || isNaN(monto) || monto <= 0) { showToast('Completá nombre y monto.', 'error'); return; }
  s.nombre = nombre; s.monto = monto;
  s.cat = document.getElementById('edit-sus-cat').value;
  s.dia = parseInt(document.getElementById('edit-sus-dia').value) || 1;
  save(); closeModal('modal-edit-sus');
  renderCompromisos(); showToast('Suscripción actualizada ✓');
}

// ── Edit — Cuotas ────────────────────────────────────────────
function openEditCuota(id) {
  const c = state.cuotas.find(c => c.id === id);
  if (!c) return;
  setFormValues({
    'edit-cuota-id': c.id,
    'edit-cuota-nombre': c.nombre,
    'edit-cuota-persona': c.persona || 'Yo',
    'edit-cuota-monto': c.monto,
    'edit-cuota-total': c.total,
    'edit-cuota-pagadas': c.pagadas,
    'edit-cuota-dia': c.dia,
    'edit-cuota-nota': c.nota
  });
  openModal('modal-edit-cuota');
}

function saveEditCuota() {
  const id      = parseInt(document.getElementById('edit-cuota-id').value);
  const c       = state.cuotas.find(c => c.id === id);
  if (!c) return;
  const nombre  = document.getElementById('edit-cuota-nombre').value.trim();
  const persona = document.getElementById('edit-cuota-persona').value.trim() || 'Yo';
  const monto   = parseFloat(document.getElementById('edit-cuota-monto').value);
  const total   = parseInt(document.getElementById('edit-cuota-total').value);
  const pagadas = parseInt(document.getElementById('edit-cuota-pagadas').value) || 0;
  if (!nombre || isNaN(monto) || monto <= 0 || isNaN(total) || total < 1) { showToast('Completá los datos requeridos.', 'error'); return; }
  if (pagadas >= total) { showToast('Las cuotas pagadas no pueden igualar al total.', 'error'); return; }
  c.nombre = nombre; c.persona = persona; c.monto = monto; c.total = total; c.pagadas = pagadas;
  c.dia    = parseInt(document.getElementById('edit-cuota-dia').value) || 10;
  c.nota   = document.getElementById('edit-cuota-nota').value.trim();
  save(); closeModal('modal-edit-cuota');
  renderCompromisos(); showToast('Cuota actualizada ✓');
}

// ── Backup / Restaurar ───────────────────────────────────────
function openModalBackup() {
  const info = [
    `${state.transacciones.length} transacciones`,
    `${state.activos.length} activos cripto`,
    `${state.suscripciones.length} suscripciones`,
    `${state.cuotas.length} cuotas`,
    `${(state.pagos || []).length} pagos registrados`,
  ].join(' · ');
  document.getElementById('backup-info').textContent = info;
  openModal('modal-backup');
}

function exportarDatos() {
  const datos = {
    version:       1,
    exportado:     new Date().toISOString(),
    transacciones: state.transacciones,
    activos:       state.activos,
    metaAhorro:    state.metaAhorro,
    suscripciones: state.suscripciones,
    cuotas:        state.cuotas,
    pagos:         state.pagos || [],
    casa:          state.casa,
  };
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `finanzar_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup descargado ✓');
}

function onImportarDatos(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const d = JSON.parse(e.target.result);
      if (!Array.isArray(d.transacciones)) { showToast('Archivo inválido — no es un backup de FinanzAR.', 'error'); return; }
      state.transacciones = d.transacciones || [];
      state.activos       = d.activos       || [];
      state.metaAhorro    = d.metaAhorro    || 0;
      state.suscripciones = d.suscripciones || [];
      state.cuotas        = d.cuotas        || [];
      state.pagos         = d.pagos         || [];
      state.casa          = d.casa          || { valorUSD: 15000, ahorroMensualUSD: 0, ahorroActualUSD: 0 };
      save();
      renderDashboard();
      renderPresupuesto();
      renderDeudas();
      renderCompromisos();
      closeModal('modal-backup');
      showToast(`Restaurado — ${d.transacciones.length} transacciones importadas ✓`);
    } catch {
      showToast('Error al leer el archivo.', 'error');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}
