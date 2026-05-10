// ============================================================
// bot.js — Lógica del bot de Telegram
// ============================================================

const TelegramBot        = require('node-telegram-bot-api');
const { parsearMensaje } = require('./parser');
const db                 = require('./db');

const token         = process.env.TELEGRAM_BOT_TOKEN;
const allowedChatId = parseInt(process.env.TELEGRAM_ALLOWED_CHAT_ID, 10);

if (!token)         throw new Error('Falta TELEGRAM_BOT_TOKEN en el .env');
if (!allowedChatId) throw new Error('Falta TELEGRAM_ALLOWED_CHAT_ID en el .env');

const bot = new TelegramBot(token, { polling: true });

// ── Comandos ──────────────────────────────────────────────

bot.onText(/\/(start|help)/, (msg) => {
  if (!esAutorizado(msg)) return;
  bot.sendMessage(msg.chat.id,
    '💰 *FinanzAR Bot* — Registrá gastos rápido\n\n' +
    '*Formatos válidos:*\n' +
    '`Café 3500`\n' +
    '`Almuerzo 8000 con Juan y María`\n' +
    '`Uber 4500 transporte`\n' +
    '`Cena 12000 con Pedro`\n\n' +
    '*Categorías detectadas automáticamente:*\n' +
    'comida · transporte · servicios · entretenimiento · salud · ropa\n\n' +
    '*Comandos:*\n' +
    '/pendientes — gastos sin confirmar en la app\n' +
    '/ultimos — últimos 5 gastos registrados\n' +
    '/help — esta ayuda',
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/pendientes/, (msg) => {
  if (!esAutorizado(msg)) return;

  const pendientes = db.getGastos({ confirmado: 0 }).slice(0, 10);

  if (pendientes.length === 0) {
    bot.sendMessage(msg.chat.id, '✅ No hay gastos pendientes de confirmar en la app.');
    return;
  }

  const lista = pendientes
    .map(g => `• *${g.desc}* — $${fmt(g.monto_personal || g.monto)} (${g.categoria}) — ${g.fecha}`)
    .join('\n');

  bot.sendMessage(msg.chat.id,
    `📋 *${pendientes.length} gasto${pendientes.length > 1 ? 's' : ''} pendiente${pendientes.length > 1 ? 's' : ''}:*\n\n${lista}`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/ultimos/, (msg) => {
  if (!esAutorizado(msg)) return;

  const ultimos = db.getGastos().slice(0, 5);

  if (ultimos.length === 0) {
    bot.sendMessage(msg.chat.id, 'Todavía no registraste ningún gasto.');
    return;
  }

  const lista = ultimos
    .map(g => {
      const estado = g.confirmado ? '✅' : '⏳';
      return `${estado} *${g.desc}* — $${fmt(g.monto_personal || g.monto)} (${g.categoria}) — ${g.fecha}`;
    })
    .join('\n');

  bot.sendMessage(msg.chat.id, `🕐 *Últimos gastos:*\n\n${lista}`, { parse_mode: 'Markdown' });
});

// ── Mensajes de texto libre ───────────────────────────────

bot.on('message', (msg) => {
  if (!esAutorizado(msg)) return;

  const texto = msg.text;
  if (!texto || texto.startsWith('/')) return;

  const gasto = parsearMensaje(texto);

  if (!gasto) {
    bot.sendMessage(msg.chat.id,
      '❓ No entendí ese gasto. Probá con:\n\n' +
      '`Café 3500`\n' +
      '`Almuerzo 8000 con Juan y María`\n' +
      '`Uber 4500 transporte`\n\n' +
      'Usá /help para ver todos los formatos.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const guardado = db.insertGasto(gasto);

  let respuesta = `✅ *${guardado.desc}* — $${fmt(guardado.monto)}`;

  if (guardado.compartido_con) {
    const personas   = guardado.compartido_con;
    const totalPerso = personas.length + 1;
    respuesta += `\n👥 Con ${personas.join(' y ')} (${totalPerso} en total)`;
    respuesta += `\n💸 Tu parte: *$${fmt(guardado.monto_personal)}*`;
  }

  respuesta += `\n🏷 ${guardado.categoria}  ·  📅 ${guardado.fecha}`;
  respuesta += `\n\n_Pendiente de confirmar en FinanzAR_`;

  bot.sendMessage(msg.chat.id, respuesta, { parse_mode: 'Markdown' });
});

// ── Helpers ───────────────────────────────────────────────

function esAutorizado(msg) {
  if (msg.chat.id !== allowedChatId) {
    bot.sendMessage(msg.chat.id, '⛔ No tenés permiso para usar este bot.');
    return false;
  }
  return true;
}

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
}

bot.on('polling_error', (err) => console.error('Polling error:', err.message));

module.exports = bot;
