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

function parsearMensaje(texto) {
  texto = texto.trim();

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
    fecha:          new Date().toISOString().slice(0, 10),
    compartido_con: compartidoCon.length > 0 ? compartidoCon : null,
    monto_personal: montoPersonal,
  };
}

module.exports = { parsearMensaje };
