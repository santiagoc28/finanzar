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

function calcTotalesMes(mes) {
  const txns     = getTxnsMes(mes);
  const ingresos = txns.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0);
  const gastos   = txns.filter(t => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0);
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
