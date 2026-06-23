const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', credentials: true }));
app.use(express.json());
app.use(express.static(__dirname));

// ── Conexión a PostgreSQL (Supabase) ─────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ── Inicializar tablas y datos por defecto ────────────────────────────────────
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS afiliados (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        ciudad TEXT,
        localidad TEXT,
        fecha_alta TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS habitaciones (
        id SERIAL PRIMARY KEY,
        numero TEXT NOT NULL,
        tipo TEXT NOT NULL,
        capacidad INTEGER,
        estado TEXT DEFAULT 'Disponible'
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reservas (
        id SERIAL PRIMARY KEY,
        afiliado_id INTEGER REFERENCES afiliados(id),
        habitacion_id INTEGER REFERENCES habitaciones(id),
        fecha_inicio TEXT,
        fecha_fin TEXT,
        estado TEXT DEFAULT 'Activa'
      )
    `);

    // Sembrar habitaciones si la tabla está vacía
    const { rows } = await client.query('SELECT COUNT(*) as count FROM habitaciones');
    if (parseInt(rows[0].count) === 0) {
      const habitaciones = [
        ['101', 'Simple', 1], ['102', 'Doble', 2], ['103', 'Familiar', 4],
        ['201', 'Simple', 1], ['202', 'Doble', 2], ['203', 'Familiar', 4],
        ['301', 'Doble', 2],  ['302', 'Doble', 2],
        ['401', 'Suite', 2],  ['402', 'Suite', 2],
      ];
      for (const [numero, tipo, capacidad] of habitaciones) {
        await client.query(
          'INSERT INTO habitaciones (numero, tipo, capacidad) VALUES ($1, $2, $3)',
          [numero, tipo, capacidad]
        );
      }
      console.log('✅ 10 habitaciones por defecto insertadas');
    }

    console.log('📦 Base de datos PostgreSQL (Supabase) conectada');
  } catch (err) {
    console.error('❌ Error inicializando la base de datos:', err.message);
  } finally {
    client.release();
  }
}

initDB();

// ── AFILIADOS ─────────────────────────────────────────────────────────────────

// GET - Obtener todos los afiliados
app.get('/api/afiliados', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM afiliados ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST - Registrar nuevo afiliado
app.post('/api/afiliados', async (req, res) => {
  const { nombre, localidad } = req.body;
  if (!nombre || !localidad) {
    return res.status(400).json({ error: 'Nombre y localidad son requeridos' });
  }
  const d = new Date();
  const now = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;

  try {
    const { rows } = await pool.query(
      'INSERT INTO afiliados (nombre, ciudad, localidad, fecha_alta) VALUES ($1, $2, $3, $4) RETURNING id',
      [nombre.toUpperCase(), localidad, localidad, now]
    );
    console.log(`✅ Afiliado guardado con ID: ${rows[0].id}`);
    res.json({ id: rows[0].id, nombre: nombre.toUpperCase(), localidad, ciudad: localidad });
  } catch (err) {
    console.error('❌ Error en el INSERT:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Eliminar afiliado por ID
app.delete('/api/afiliados/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM afiliados WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Afiliado no encontrado' });
    console.log(`🗑️ Afiliado eliminado ID: ${id}`);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET - Estadísticas del mes actual
app.get('/api/stats', async (req, res) => {
  const now = new Date();
  const mesActual = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) as total,
       SUM(CASE WHEN fecha_alta LIKE $1 THEN 1 ELSE 0 END) as este_mes
       FROM afiliados`,
      [`${mesActual}%`]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── HOTEL (HABITACIONES Y RESERVAS) ──────────────────────────────────────────

// GET - Obtener todas las habitaciones
app.get('/api/habitaciones', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM habitaciones ORDER BY numero ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET - Obtener todas las reservas con info del afiliado y habitación
app.get('/api/reservas', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, a.nombre as afiliado_nombre, h.numero as habitacion_numero, h.tipo as habitacion_tipo 
      FROM reservas r
      JOIN afiliados a ON r.afiliado_id = a.id
      JOIN habitaciones h ON r.habitacion_id = h.id
      ORDER BY r.id DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST - Crear nueva reserva
app.post('/api/reservas', async (req, res) => {
  const { afiliado_id, habitacion_id, fecha_inicio, fecha_fin } = req.body;
  if (!afiliado_id || !habitacion_id || !fecha_inicio) {
    return res.status(400).json({ error: 'Faltan datos requeridos (afiliado, habitacion, fecha)' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query('SELECT estado FROM habitaciones WHERE id = $1', [habitacion_id]);
    if (!rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }
    if (rows[0].estado !== 'Disponible') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Habitación no está disponible' });
    }

    const reservaResult = await client.query(
      'INSERT INTO reservas (afiliado_id, habitacion_id, fecha_inicio, fecha_fin) VALUES ($1, $2, $3, $4) RETURNING id',
      [afiliado_id, habitacion_id, fecha_inicio, fecha_fin]
    );
    await client.query('UPDATE habitaciones SET estado = $1 WHERE id = $2', ['Ocupada', habitacion_id]);
    await client.query('COMMIT');

    const reservaId = reservaResult.rows[0].id;
    console.log(`✅ Reserva creada ID: ${reservaId} para Habitación ${habitacion_id}`);
    res.json({ success: true, id: reservaId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE - Finalizar o cancelar una reserva
app.delete('/api/reservas/:id', async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query('SELECT habitacion_id FROM reservas WHERE id = $1', [id]);
    if (!rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    await client.query('UPDATE reservas SET estado = $1 WHERE id = $2', ['Finalizada', id]);
    await client.query('UPDATE habitaciones SET estado = $1 WHERE id = $2', ['Disponible', rows[0].habitacion_id]);
    await client.query('COMMIT');

    console.log(`🗑️ Reserva finalizada ID: ${id}, Habitación liberada.`);
    res.json({ success: true, id });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
});
