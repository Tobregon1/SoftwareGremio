const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', credentials: true }));
app.use(express.json());
app.use(express.static(__dirname));

// ── Cliente Supabase ──────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ── Sembrar habitaciones por defecto si la tabla está vacía ──────────────────
async function initDB() {
  try {
    const { count, error } = await supabase
      .from('habitaciones')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    if (count === 0) {
      await supabase.from('habitaciones').insert([
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
      console.log('✅ 10 habitaciones por defecto insertadas');
    }
    console.log('📦 Supabase conectado correctamente');
  } catch (err) {
    console.error('❌ Error al inicializar:', err.message);
  }
}

initDB();

// ── AFILIADOS ─────────────────────────────────────────────────────────────────

// GET - Todos los afiliados
app.get('/api/afiliados', async (req, res) => {
  const { data, error } = await supabase
    .from('afiliados')
    .select('*')
    .order('id', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST - Registrar afiliado
app.post('/api/afiliados', async (req, res) => {
  const { nombre, localidad } = req.body;
  if (!nombre || !localidad) {
    return res.status(400).json({ error: 'Nombre y localidad son requeridos' });
  }
  const d = new Date();
  const now = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;

  const { data, error } = await supabase
    .from('afiliados')
    .insert({ nombre: nombre.toUpperCase(), ciudad: localidad, localidad, fecha_alta: now })
    .select('id')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  console.log(`✅ Afiliado guardado con ID: ${data.id}`);
  res.json({ id: data.id, nombre: nombre.toUpperCase(), localidad, ciudad: localidad });
});

// DELETE - Eliminar afiliado
app.delete('/api/afiliados/:id', async (req, res) => {
  const { id } = req.params;
  const { error, count } = await supabase
    .from('afiliados')
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  if (count === 0) return res.status(404).json({ error: 'Afiliado no encontrado' });
  console.log(`🗑️ Afiliado eliminado ID: ${id}`);
  res.json({ success: true, id });
});

// GET - Estadísticas del mes actual
app.get('/api/stats', async (req, res) => {
  const now = new Date();
  const mesActual = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  const { data, error } = await supabase.from('afiliados').select('fecha_alta');
  if (error) return res.status(500).json({ error: error.message });

  const total = data.length;
  const este_mes = data.filter(a => a.fecha_alta?.startsWith(mesActual)).length;
  res.json({ total: String(total), este_mes: String(este_mes) });
});

// ── HOTEL (HABITACIONES Y RESERVAS) ──────────────────────────────────────────

// GET - Todas las habitaciones
app.get('/api/habitaciones', async (req, res) => {
  const { data, error } = await supabase
    .from('habitaciones')
    .select('*')
    .order('numero', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET - Reservas con info de afiliado y habitación
app.get('/api/reservas', async (req, res) => {
  const { data, error } = await supabase
    .from('reservas')
    .select('*, afiliados(nombre), habitaciones(numero, tipo)')
    .order('id', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Aplanar el resultado para mantener compatibilidad con el frontend
  const rows = data.map(r => ({
    ...r,
    afiliado_nombre:    r.afiliados?.nombre,
    habitacion_numero:  r.habitaciones?.numero,
    habitacion_tipo:    r.habitaciones?.tipo,
  }));

  res.json(rows);
});

// POST - Crear reserva
app.post('/api/reservas', async (req, res) => {
  const { afiliado_id, habitacion_id, fecha_inicio, fecha_fin } = req.body;
  if (!afiliado_id || !habitacion_id || !fecha_inicio) {
    return res.status(400).json({ error: 'Faltan datos requeridos (afiliado, habitacion, fecha)' });
  }

  // Verificar disponibilidad
  const { data: hab, error: habError } = await supabase
    .from('habitaciones')
    .select('estado')
    .eq('id', habitacion_id)
    .single();

  if (habError || !hab) return res.status(404).json({ error: 'Habitación no encontrada' });
  if (hab.estado !== 'Disponible') return res.status(400).json({ error: 'Habitación no está disponible' });

  // Crear la reserva
  const { data: reserva, error: resError } = await supabase
    .from('reservas')
    .insert({ afiliado_id, habitacion_id, fecha_inicio, fecha_fin })
    .select('id')
    .single();

  if (resError) return res.status(500).json({ error: resError.message });

  // Marcar habitación como ocupada
  await supabase.from('habitaciones').update({ estado: 'Ocupada' }).eq('id', habitacion_id);

  console.log(`✅ Reserva creada ID: ${reserva.id} para Habitación ${habitacion_id}`);
  res.json({ success: true, id: reserva.id });
});

// DELETE - Finalizar reserva
app.delete('/api/reservas/:id', async (req, res) => {
  const { id } = req.params;

  const { data: reserva, error: findError } = await supabase
    .from('reservas')
    .select('habitacion_id')
    .eq('id', id)
    .single();

  if (findError || !reserva) return res.status(404).json({ error: 'Reserva no encontrada' });

  await supabase.from('reservas').update({ estado: 'Finalizada' }).eq('id', id);
  await supabase.from('habitaciones').update({ estado: 'Disponible' }).eq('id', reserva.habitacion_id);

  console.log(`🗑️ Reserva finalizada ID: ${id}, Habitación liberada.`);
  res.json({ success: true, id });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
});
