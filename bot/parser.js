// ============================================================
// parser.js — Convierte texto libre en un objeto de gasto
// ============================================================
//
// Formatos soportados:
//   "Café 3500"                         → gasto simple
//   "Almuerzo 8000 con Juan y María"    → compartido entre 3
//   "Uber 4500 transporte"              → categoría explícita
//   "Cena 12000 con Pedro"              → compartido entre 2
//   "Pizza 2 personas 3500 con Luis"    → descripción con número
// ============================================================

const CATEGORIAS = {
  comida:          ['café', 'cafe', 'almuerzo', 'cena', 'desayuno', 'restaurant', 'restaurante',
                    'comida', 'pizza', 'sushi', 'empanada', 'medialunas', 'facturas', 'milanesa',
                    'hamburguesa', 'helado', 'postre', 'delivery', 'pedidos', 'rappi'],
  transporte:      ['uber', 'taxi', 'cabify', 'nafta', 'combustible', 'subte', 'colectivo', 'tren',
                    'remis', 'bus', 'estacionamiento', 'peaje', 'bici'],
  servicios:       ['luz', 'gas', 'agua', 'internet', 'celular', 'expensas', 'alquiler',
                    'suscripcion', 'suscripción', 'abono', 'factura'],
  entretenimiento: ['cine', 'teatro', 'recital', 'juego', 'netflix', 'spotify', 'disney',
                    'streaming', 'bar', 'boliche', 'disco', 'tragos', 'cerveza'],
  salud:           ['farmacia', 'médico', 'medico', 'dentista', 'remedio', 'medicamento',
                    'consultorio', 'psicólogo', 'psicologo', 'kinesiología', 'kinesiologo'],
  ropa:            ['ropa', 'zapatillas', 'remera', 'pantalón', 'pantalon', 'camisa',
                    'vestido', 'calzado', 'abrigo', 'campera', 'buzo'],
};

function detectarCategoria(texto) {
  const lower = texto.toLowerCase();
  for (const [cat, palabras] of Object.entries(CATEGORIAS)) {
    if (palabras.some(p => lower.includes(p))) return cat;
  }
  return 'otros';
}

// Normaliza formatos de número argentinos: "3.500" → 3500, "3,50" → 3.50
function parseMonto(str) {
  // Si tiene punto seguido de exactamente 3 dígitos, es separador de miles
  str = str.replace(/\.(\d{3})(?!\d)/g, '$1');
  // La coma es separador decimal
  str = str.replace(',', '.');
  return parseFloat(str);
}

const MESES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
};

// Extrae fecha del final del texto. Devuelve { fecha, textoLimpio }.
// Si no encuentra nada, devuelve hoy.
function extraerFecha(texto) {
  const now = new Date();

  // "próximo mes" / "mes que viene" al final
  const rProxMes = /\s+(?:para\s+|en\s+)?(pr[oó]ximo\s+mes|mes\s+que\s+viene)\s*$/i;
  if (rProxMes.test(texto)) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { fecha: d.toISOString().slice(0, 10), textoLimpio: texto.replace(rProxMes, '').trim() };
  }

  // Nombre de mes al final: "junio", "para junio", "en junio"
  const rMes = /\s+(?:para\s+|en\s+|el\s+mes\s+de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s*$/i;
  const mMes = texto.match(rMes);
  if (mMes) {
    const num = MESES[mMes[1].toLowerCase()];
    let año = now.getFullYear();
    if (num < now.getMonth() + 1) año++;   // mes ya pasó → año siguiente
    const fecha = `${año}-${String(num).padStart(2, '0')}-01`;
    return { fecha, textoLimpio: texto.replace(mMes[0], '').trim() };
  }

  // Fecha explícita al final: "15/06", "15/06/26", "15-06-2026"
  const rFecha = /\s+(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\s*$/;
  const mFecha = texto.match(rFecha);
  if (mFecha) {
    const dia = String(mFecha[1]).padStart(2, '0');
    const mes = String(mFecha[2]).padStart(2, '0');
    let año = now.getFullYear();
    if (mFecha[3]) { año = parseInt(mFecha[3]); if (año < 100) año += 2000; }
    return { fecha: `${año}-${mes}-${dia}`, textoLimpio: texto.replace(mFecha[0], '').trim() };
  }

  return { fecha: now.toISOString().slice(0, 10), textoLimpio: texto };
}

function parsearMensaje(texto) {
  texto = texto.trim();

  // 0. Extraer fecha/mes si se especificó al final
  const { fecha, textoLimpio } = extraerFecha(texto);
  texto = textoLimpio;

  // 1. Extraer "con PERSONAS" desde el final del string
  //    Acepta: "con Juan", "con Juan y María", "con Juan, María y Pedro"
  const regexCon = /\s+con\s+([a-záéíóúüñA-ZÁÉÍÓÚÜÑ][a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s,y]+?)(\s+\w+)?\s*$/i;
  let compartidoCon = [];
  let textoBase = texto;

  const matchCon = texto.match(regexCon);
  if (matchCon) {
    const nombresRaw = matchCon[1].trim();
    compartidoCon = nombresRaw
      .split(/\s+y\s+|,\s*/i)
      .map(n => n.trim())
      .filter(n => n.length > 1 && !/^\d+$/.test(n));
    textoBase = texto.slice(0, matchCon.index).trim();
  }

  // 2. Encontrar todos los números en el texto base
  //    Soporta: 3500, 3.500, 3,500, 3500.50
  const regexNumeros = /\b(\d[\d.,]*)\b/g;
  const matches = [...textoBase.matchAll(regexNumeros)];
  if (matches.length === 0) return null;

  // El monto es el ÚLTIMO número del texto base
  // ("Pizza 2 personas 3500" → 3500, no 2)
  const matchMonto = matches[matches.length - 1];
  const monto = parseMonto(matchMonto[1]);
  if (isNaN(monto) || monto <= 0) return null;

  // 3. Todo lo anterior al monto es la descripción
  const desc = textoBase.slice(0, matchMonto.index).trim() || 'Gasto';

  // 4. Lo que queda después del monto puede ser una categoría explícita
  const resto = textoBase.slice(matchMonto.index + matchMonto[1].length).trim().toLowerCase();
  const categoriaExplicita = Object.keys(CATEGORIAS).find(c => resto === c) || null;

  // 5. Auto-detectar categoría si no fue explícita
  const categoria = categoriaExplicita || detectarCategoria(texto);

  // 6. Calcular monto personal (yo soy +1 persona)
  const totalPersonas  = compartidoCon.length + 1;
  const montoPersonal  = monto / totalPersonas;

  return {
    desc,
    monto,
    categoria,
    fecha,
    compartido_con: compartidoCon.length > 0 ? compartidoCon : null,
    monto_personal: montoPersonal,
  };
}

// Separa un mensaje en segmentos de gasto.
// Una coma inicia un nuevo gasto SOLO si el segmento siguiente empieza con letra Y tiene número.
// Esto preserva "con Juan, María" como parte del mismo gasto.
function separarGastos(texto) {
  const segmentos = texto.split(',');
  const grupos = [];
  let actual = segmentos[0];

  for (let i = 1; i < segmentos.length; i++) {
    const trim = segmentos[i].trim();
    // Nuevo gasto: arranca con letra y contiene un número
    if (/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ'"]/.test(trim) && /\d/.test(trim)) {
      grupos.push(actual.trim());
      actual = trim;
    } else {
      actual += ',' + segmentos[i];
    }
  }
  grupos.push(actual.trim());
  return grupos.filter(g => g.length > 0);
}

// Parsea uno o múltiples gastos de un mismo mensaje.
// Soporta separación por coma y por salto de línea.
function parsearMultiple(texto) {
  const lineas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const grupos = lineas.flatMap(linea => separarGastos(linea));
  return grupos.map(g => parsearMensaje(g)).filter(Boolean);
}

module.exports = { parsearMensaje, parsearMultiple };
