// ============================================================
// STATE — Estado global compartido por todos los módulos
// ============================================================
const state = {
  transacciones: [],
  activos: [],
  metaAhorro: 0,
  suscripciones: [],
  cuotas: [],
  pagos: [],
  casa: {
    valorUSD: 15000,
    ahorroMensualUSD: 0,
    ahorroActualUSD: 0,
  },
  precios: {
    dolarBNA: null,
    dolarCripto: null,
    usdtP2P: null,
    cripto: {}
  }
};

