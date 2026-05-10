# FinanzAR Bot

Backend Node.js que recibe mensajes de un bot de Telegram, parsea gastos y los expone vía API REST para la app FinanzAR.

## Requisitos previos

- Node.js v18 o superior (`node --version`)
- Un bot de Telegram creado con @BotFather
- Tu Chat ID (obtenelo con @userinfobot)

## Instalación

```bash
cd finanzar-bot
npm install
```

## Configuración

1. Copiá el archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```

2. Editá `.env` con tus datos reales:
   ```
   TELEGRAM_BOT_TOKEN=7234567890:AAHxxxxxxxxxxxxxxx
   TELEGRAM_ALLOWED_CHAT_ID=123456789
   PORT=3000
   API_KEY=una_clave_larga_y_secreta
   ```

## Correr localmente

```bash
npm start
```

Para desarrollo con auto-reload (Node 18+):
```bash
npm run dev
```

## Formatos de mensajes al bot

| Mensaje | Resultado |
|---------|-----------|
| `Café 3500` | Gasto simple, categoría auto-detectada |
| `Almuerzo 8000 con Juan y María` | Compartido entre 3 → te toca $2.666 |
| `Uber 4500 transporte` | Categoría explícita |
| `Cena 12000 con Pedro` | Compartido entre 2 → te toca $6.000 |

## Comandos del bot

- `/help` — formatos disponibles
- `/pendientes` — gastos sin confirmar en la app
- `/ultimos` — últimos 5 gastos

## API REST

Todos los endpoints (excepto `/api/health`) requieren el header `X-API-Key`.

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Chequear que el server corra |
| GET | `/api/gastos` | Todos los gastos |
| GET | `/api/gastos?confirmado=0` | Solo pendientes |
| POST | `/api/gastos/:id/confirmar` | Marcar como confirmado |
| DELETE | `/api/gastos/:id` | Eliminar gasto |

### Ejemplo de request desde la app

```js
const res = await fetch('http://localhost:3000/api/gastos?confirmado=0', {
  headers: { 'X-API-Key': 'tu_api_key' }
});
const gastos = await res.json();
```

## Deploy en Render

1. Subí el proyecto a GitHub (sin el `.env`)
2. Creá un nuevo Web Service en render.com
3. Configurá las variables de entorno en el dashboard de Render
4. El comando de start es `npm start`

> **Nota:** En el plan gratuito de Render el servicio se duerme tras 15 min de inactividad. El bot dejará de recibir mensajes mientras está dormido. Para evitarlo, usá un servicio de "uptime" como UptimeRobot que pingue `/api/health` cada 5 minutos.
