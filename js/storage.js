// ============================================================
// STORAGE — Persistencia en localStorage
// ============================================================

function save() {
  const toSave = {
    transacciones: state.transacciones,
    activos: state.activos,
    metaAhorro: state.metaAhorro,
    casa: state.casa,
    suscripciones: state.suscripciones,
    cuotas: state.cuotas,
    pagos: state.pagos
  };
  localStorage.setItem('finanzar_data', JSON.stringify(toSave));
}

function load() {
  try {
    const raw = localStorage.getItem('finanzar_data');
    if (raw) {
      const d = JSON.parse(raw);
      state.transacciones  = d.transacciones  || [];
      state.activos        = d.activos        || [];
      state.metaAhorro     = d.metaAhorro     || 0;
      state.casa           = d.casa           || { valorUSD: 15000, ahorroMensualUSD: 0, ahorroActualUSD: 0 };
      state.suscripciones  = d.suscripciones  || [];
      state.cuotas         = d.cuotas         || [];
      state.pagos          = d.pagos          || [];
    }
  } catch (e) {
    console.error('Error cargando datos:', e);
  }
}
