// ============================================================
// server.js — Punto de entrada: servidor Express + bot
// ============================================================

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const db      = require('./db');

const app     = express();
const PORT    = process.env.PORT    || 3000;
const API_KEY = process.env.API_KEY || '';

if (!API_KEY) console.warn('⚠️  API_KEY no configurada en .env — la API quedará sin protección');

// ── Middleware ───────────────────────────────────────────

app.use(cors({
  origin: [
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://localhost:3000',
  ]
}));

app.use(express.json());

// ── Autenticación ────────────────────────────────────────

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'API key inválida o ausente' });
  }
  next();
}

// ── Endpoints ────────────────────────────────────────────

// Health check — público
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /api/gastos?confirmado=0|1
app.get('/api/gastos', requireApiKey, (req, res) => {
  const { confirmado } = req.query;
  const filtros = confirmado !== undefined ? { confirmado: parseInt(confirmado, 10) } : {};
  res.json(db.getGastos(filtros));
});

// POST /api/gastos/:id/confirmar
app.post('/api/gastos/:id/confirmar', requireApiKey, (req, res) => {
  const ok = db.confirmarGasto(parseInt(req.params.id, 10));
  if (!ok) return res.status(404).json({ error: 'Gasto no encontrado' });
  res.json({ ok: true });
});

// DELETE /api/gastos/:id
app.delete('/api/gastos/:id', requireApiKey, (req, res) => {
  const ok = db.eliminarGasto(parseInt(req.params.id, 10));
  if (!ok) return res.status(404).json({ error: 'Gasto no encontrado' });
  res.json({ ok: true });
});

// ── Arrancar ─────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 FinanzAR backend en http://localhost:${PORT}`);
  console.log(`   GET /api/health  → chequear estado`);
  console.log(`   GET /api/gastos  → listar gastos (requiere X-API-Key)`);

  require('./bot');
  console.log('🤖 Bot de Telegram iniciado — esperando mensajes...\n');
});
