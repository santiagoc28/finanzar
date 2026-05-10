// ============================================================
// db.js — Almacenamiento en JSON (sin dependencias nativas)
// ============================================================

const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'finanzar.json');

class DB {
  constructor() {
    this._data   = this._load();
    this._nextId = this._data.gastos.length > 0
      ? Math.max(...this._data.gastos.map(g => g.id)) + 1
      : 1;
  }

  _load() {
    if (fs.existsSync(DB_PATH)) {
      try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch {}
    }
    return { gastos: [] };
  }

  _save() {
    fs.writeFileSync(DB_PATH, JSON.stringify(this._data, null, 2), 'utf8');
  }

  insertGasto({ desc, monto, categoria, fecha, compartido_con, monto_personal }) {
    const id  = this._nextId++;
    const row = {
      id, desc, monto, categoria, fecha,
      compartido_con, monto_personal,
      confirmado: 0,
      creado_en: new Date().toLocaleString('es-AR'),
    };
    this._data.gastos.push(row);
    this._save();
    return row;
  }

  getGastos({ confirmado } = {}) {
    let rows = [...this._data.gastos];
    if (confirmado !== undefined) rows = rows.filter(g => g.confirmado === confirmado);
    return rows.sort((a, b) => b.id - a.id);
  }

  confirmarGasto(id) {
    const g = this._data.gastos.find(g => g.id === id);
    if (!g) return false;
    g.confirmado = 1;
    this._save();
    return true;
  }

  eliminarGasto(id) {
    const idx = this._data.gastos.findIndex(g => g.id === id);
    if (idx === -1) return false;
    this._data.gastos.splice(idx, 1);
    this._save();
    return true;
  }
}

module.exports = new DB();
