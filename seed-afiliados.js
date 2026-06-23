// seed-afiliados.js - Inserta 50 afiliados aleatorios en Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const nombres = [
  'JUAN', 'MARIA', 'CARLOS', 'ANA', 'LUIS', 'LAURA', 'PEDRO', 'SOFIA',
  'DIEGO', 'VALERIA', 'ROBERTO', 'CLAUDIA', 'MARCELO', 'PATRICIA', 'SERGIO',
  'NATALIA', 'GUSTAVO', 'DANIELA', 'PABLO', 'MONICA', 'HORACIO', 'CECILIA',
  'DANIEL', 'SILVANA', 'ARIEL', 'GRACIELA', 'FACUNDO', 'LORENA', 'RODRIGO',
  'BEATRIZ', 'NELSON', 'VERONICA', 'OSCAR', 'SABRINA', 'MARTIN', 'ADRIANA'
];

const apellidos = [
  'GARCIA', 'RODRIGUEZ', 'GONZALEZ', 'FERNANDEZ', 'LOPEZ', 'MARTINEZ',
  'SANCHEZ', 'PEREZ', 'ROMERO', 'SOTO', 'TORRES', 'FLORES', 'DIAZ',
  'REYES', 'MORALES', 'JIMENEZ', 'RUIZ', 'HERRERA', 'MEDINA', 'CASTRO',
  'VARGAS', 'RAMOS', 'CHAVEZ', 'AGUILAR', 'RIOS', 'NUNEZ', 'CABRERA',
  'VEGA', 'ORTIZ', 'MENDOZA', 'SALINAS', 'GUERRERO', 'ESPINOZA', 'MORA',
  'SUAREZ', 'MOLINA', 'LUNA', 'SILVA', 'PEREYRA', 'ACOSTA'
];

const localidades = [
  'Corrientes Capital', 'Goya', 'Paso de los Libres', 'Curuzú Cuatiá',
  'Mercedes', 'Monte Caseros', 'Bella Vista', 'Empedrado', 'Esquina',
  'Ituzaingó', 'San Roque', 'San Miguel', 'Loreto', 'San Cosme',
  'Saladas', 'Mburucuyá', 'Concepción', 'Sauce', 'Yapeyú', 'Santa Lucía'
];

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFecha() {
  const start = new Date('2023-01-01');
  const end   = new Date('2026-06-23');
  const date  = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  const pad   = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function generarAfiliados(n) {
  const usados = new Set();
  const lista  = [];
  while (lista.length < n) {
    const nombre   = `${random(nombres)} ${random(apellidos)}`;
    if (usados.has(nombre)) continue;
    usados.add(nombre);
    const localidad = random(localidades);
    lista.push({ nombre, ciudad: localidad, localidad, fecha_alta: randomFecha() });
  }
  return lista;
}

async function seed() {
  console.log('🌱 Insertando 50 afiliados aleatorios en Supabase...\n');
  const afiliados = generarAfiliados(50);
  let ok = 0;

  for (const a of afiliados) {
    const { error } = await supabase.from('afiliados').insert(a);
    if (error) {
      console.error(`  ❌ ${a.nombre}: ${error.message}`);
    } else {
      ok++;
      console.log(`  ✅ ${a.nombre} — ${a.localidad}`);
    }
  }

  console.log(`\n🎉 ${ok}/50 afiliados insertados correctamente.`);
}

seed().catch(console.error);
