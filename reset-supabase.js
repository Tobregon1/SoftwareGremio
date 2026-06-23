// reset-supabase.js - Limpia todas las tablas en Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function reset() {
  console.log('🧹 Limpiando base de datos en Supabase...\n');

  const { error: e1 } = await supabase.from('reservas').delete().gte('id', 1);
  if (e1) console.error('Error borrando reservas:', e1.message);
  else console.log('✅ Reservas eliminadas');

  const { error: e2 } = await supabase.from('habitaciones').delete().gte('id', 1);
  if (e2) console.error('Error borrando habitaciones:', e2.message);
  else console.log('✅ Habitaciones eliminadas');

  const { error: e3 } = await supabase.from('afiliados').delete().gte('id', 1);
  if (e3) console.error('Error borrando afiliados:', e3.message);
  else console.log('✅ Afiliados eliminados');

  console.log('\n🎉 Base de datos limpia. Al iniciar el servidor se crearán las 10 habitaciones automáticamente.');
}

reset().catch(console.error);
