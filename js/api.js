// ============================================================
// API — Llamadas a APIs externas con fallback de CORS
// ============================================================

// ── Bot API ──────────────────────────────────────────────────
// Valores leídos desde js/config.local.js (gitignoreado); fallback a vacío
const BOT_API = {
  url: (typeof BOT_CONFIG !== 'undefined' ? BOT_CONFIG.url : null) || 'http://localhost:3000',
  key: (typeof BOT_CONFIG !== 'undefined' ? BOT_CONFIG.key : null) || ''
};

async function fetchGastosBot() {
  try {
    const res = await fetch(`${BOT_API.url}/api/gastos?confirmado=0`, {
      headers: { 'X-API-Key': BOT_API.key },
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function confirmarGastoBot(id, gasto) {
  const txnId = Date.now();
  try {
    state.transacciones.push({
      id: txnId,
      tipo: 'gasto',
      desc: gasto.compartido_con?.length
        ? `${gasto.desc} (con ${gasto.compartido_con.join(', ')})`
        : gasto.desc,
      monto: gasto.monto_personal,
      cat:   gasto.categoria,
      fecha: gasto.fecha
    });
    save();
  } catch (e) {
    showToast('Error al guardar el gasto. Intentá de nuevo.', 'error');
    return null;
  }
  try {
    await fetch(`${BOT_API.url}/api/gastos/${id}/confirmar`, {
      method:  'POST',
      headers: { 'X-API-Key': BOT_API.key },
      signal:  AbortSignal.timeout(3000)
    });
  } catch {}
  return txnId;
}

async function rechazarGastoBot(id) {
  try {
    await fetch(`${BOT_API.url}/api/gastos/${id}`, {
      method:  'DELETE',
      headers: { 'X-API-Key': BOT_API.key },
      signal:  AbortSignal.timeout(3000)
    });
  } catch {}
}

async function fetchJSON(url) {
  const strategies = [
    // 1. Intento directo
    () => fetch(url, { signal: AbortSignal.timeout(5000) }).then(r => r.ok ? r.json() : null),
    // 2. Proxy allorigins
    () => fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(8000) })
            .then(r => r.ok ? r.json() : null)
            .then(wrapper => wrapper ? JSON.parse(wrapper.contents) : null),
    // 3. Proxy corsproxy.io
    () => fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(8000) }).then(r => r.ok ? r.json() : null)
  ];

  for (const attempt of strategies) {
    try {
      const data = await attempt();
      if (data) return data;
    } catch (err) {
      continue; // Probar la siguiente estrategia
    }
  }

  throw new Error('No se pudo conectar a ' + url);
}

async function fetchDolares() {
  try {
    const data = await fetchJSON('https://dolarapi.com/v1/dolares');
    const oficial = data.find(d => d.casa === 'oficial');
    const cripto  = data.find(d => d.casa === 'cripto');
    if (oficial) state.precios.dolarBNA    = oficial.venta;
    if (cripto)  state.precios.dolarCripto = cripto.venta;
    return true;
  } catch (e) {
    // Fallback: bluelytics
    try {
      const data2 = await fetchJSON('https://api.bluelytics.com.ar/v2/latest');
      if (data2?.oficial?.value_sell) state.precios.dolarBNA    = data2.oficial.value_sell;
      if (data2?.blue?.value_sell)    state.precios.dolarCripto = data2.blue.value_sell;
      return true;
    } catch (e2) {
      console.warn('Error fetching dolares:', e2);
      showApiError('No se pudo obtener la cotización del dólar. Revisá tu conexión.');
      return false;
    }
  }
}

async function fetchP2P() {
  try {
    const data = await fetchJSON('https://dolarapi.com/v1/dolares/cripto');
    if (data?.venta) state.precios.usdtP2P = data.venta;
  } catch {
    if (state.precios.dolarCripto) state.precios.usdtP2P = state.precios.dolarCripto;
  }
}

async function fetchCriptoPrices() {
  const symbols = [...new Set(state.activos.map(a => a.symbol))];
  if (symbols.length === 0) return;

  const symbolMap = {
    'bitcoin':     'BTCUSDT',
    'ethereum':    'ETHUSDT',
    'binancecoin': 'BNBUSDT',
    'solana':      'SOLUSDT',
    'ripple':      'XRPUSDT',
    'cardano':     'ADAUSDT',
    'dogecoin':    'DOGEUSDT',
    'tether':      'USDCUSDT'
  };

  // Intento 1: CoinGecko
  try {
    const ids  = symbols.join(',');
    const data = await fetchJSON(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
    );
    if (data && Object.keys(data).length > 0) {
      state.precios.cripto = data;
      return;
    }
  } catch (e) {}

  // Intento 2: Binance Spot API
  try {
    for (const sym of symbols) {
      if (sym === 'tether') { state.precios.cripto['tether'] = { usd: 1 }; continue; }
      const pair = symbolMap[sym];
      if (!pair) continue;
      try {
        const d = await fetchJSON(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
        if (d?.price) state.precios.cripto[sym] = { usd: parseFloat(d.price) };
      } catch (e2) {}
    }
  } catch (e) {
    console.warn('Cripto prices fetch failed:', e);
  }
}

function showApiError(msg) {
  const el = document.getElementById('api-error-banner');
  if (el) {
    el.textContent = '⚠ ' + msg;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 6000);
  }
}

async function refreshAll() {
  const btn = document.getElementById('refresh-btn');
  btn.innerHTML = '<span class="spin"><i data-lucide="refresh-cw"></i></span> Actualizando';
  if (typeof lucide !== 'undefined') lucide.createIcons();
  btn.disabled = true;

  await fetchDolares();
  await fetchP2P();
  await fetchCriptoPrices();

  updateHeader();
  renderDashboard();
  renderCambio();
  renderActivos();
  renderCasa();
  renderCompromisos();
  renderBotPendientes();

  const now = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('last-update').textContent = `Actualizado ${now}`;
  startCountdown();

  btn.innerHTML = '<i data-lucide="refresh-cw"></i> Actualizar';
  if (typeof lucide !== 'undefined') lucide.createIcons();
  btn.disabled = false;
}
