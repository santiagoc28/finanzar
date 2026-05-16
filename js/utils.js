// ============================================================
// UTILS — Formateadores y helpers puros (sin acceso al DOM)
// ============================================================

const fmt    = (n, dec = 0) => new Intl.NumberFormat('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);
const fmtARS = (n)          => '$' + fmt(n);
const fmtUSD = (n, dec = 2) => 'USD ' + fmt(n, dec);

function getMesActual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getTxnsMes(mes) {
  const m = mes || getMesActual();
  return state.transacciones.filter(t => t.fecha.startsWith(m));
}

// Devuelve true si la cuota tiene un pago en el mes dado.
// Requiere c.fechaInicio (YYYY-MM). Cuotas sin fechaInicio solo se incluyen en el mes actual.
function esCuotaActivaEnMes(c, mes) {
  const m = mes || getMesActual();
  if (!c.fechaInicio) return m === getMesActual() && c.pagadas < c.total;
  const [mY, mM] = m.split('-').map(Number);
  const [cY, cM] = c.fechaInicio.split('-').map(Number);
  const diff = (mY - cY) * 12 + (mM - cM);
  return diff >= 0 && diff < c.total;
}

function calcTotalesMes(mes) {
  const m        = mes || getMesActual();
  const txns     = getTxnsMes(m);
  const ingresos = txns.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0);
  const gastosTxn    = txns.filter(t => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0);
  const gastosCuotas = state.cuotas
    .filter(c => esCuotaActivaEnMes(c, m))
    .reduce((s, c) => s + c.monto, 0);
  const gastos = gastosTxn + gastosCuotas;
  return { ingresos, gastos, balance: ingresos - gastos };
}

function catLabels() {
  return {
    sueldo: '💼 Sueldo', freelance: '💻 Freelance', inversion: '📈 Inversión',
    otros_ing: '🔹 Otros', comida: '🍔 Comida', transporte: '🚗 Transporte',
    servicios: '💡 Servicios', entretenimiento: '🎮 Entretenimiento',
    salud: '🏥 Salud', ropa: '👕 Ropa', otros: '📦 Otros'
  };
}
