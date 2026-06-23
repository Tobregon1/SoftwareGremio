// seed-habitaciones.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function main() {
  // Verificar cuántas hay
  const { data, error } = await supabase.from('habitaciones').select('*');
  if (error) { console.error('Error:', error.message); return; }

  console.log(`🏨 Habitaciones actuales en Supabase: ${data.length}`);
  data.forEach(h => console.log(`  - Hab ${h.numero} (${h.tipo}) — ${h.estado}`));

  if (data.length === 0) {
    console.log('\n⬆️  Insertando habitaciones...');
    const { error: e } = await supabase.from('habitaciones').insert([
      { numero: '101', tipo: 'Simple',   capacidad: 1 },
      { numero: '102', tipo: 'Doble',    capacidad: 2 },
      { numero: '103', tipo: 'Familiar', capacidad: 4 },
      { numero: '201', tipo: 'Simple',   capacidad: 1 },
      { numero: '202', tipo: 'Doble',    capacidad: 2 },
      { numero: '203', tipo: 'Familiar', capacidad: 4 },
      { numero: '301', tipo: 'Doble',    capacidad: 2 },
      { numero: '302', tipo: 'Doble',    capacidad: 2 },
      { numero: '401', tipo: 'Suite',    capacidad: 2 },
      { numero: '402', tipo: 'Suite',    capacidad: 2 },
    ]);
    if (e) console.error('Error insertando:', e.message);
    else console.log('✅ 10 habitaciones insertadas correctamente');
  } else {
    console.log('\n✅ Las habitaciones ya existen en Supabase');
  }
}

main().catch(console.error);
