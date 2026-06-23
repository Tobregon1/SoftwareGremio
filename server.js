const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', credentials: true }));
app.use(express.json());
app.use(express.static(__dirname));

// Base de datos SQLite local
const dbPath = path.join(__dirname, 'sindicato.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error al conectar con la base de datos:', err.message);
  } else {
    console.log('📦 Base de datos conectada:', dbPath);
  }
});

// Crear tabla si no existe (compatible con schema existente)
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS afiliados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    ciudad TEXT,
    localidad TEXT,
    fecha_alta TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS habitaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT NOT NULL,
    tipo TEXT NOT NULL,
    capacidad INTEGER,
    estado TEXT DEFAULT 'Disponible'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reservas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    afiliado_id INTEGER,
    habitacion_id INTEGER,
    fecha_inicio TEXT,
    fecha_fin TEXT,
    estado TEXT DEFAULT 'Activa',
    FOREIGN KEY(afiliado_id) REFERENCES afiliados(id),
    FOREIGN KEY(habitacion_id) REFERENCES habitaciones(id)
  )`);

  // Sembrar habitaciones si está vacía
  db.get('SELECT COUNT(*) as count FROM habitaciones', (err, row) => {
    if (!err && row.count === 0) {
      const stmt = db.prepare('INSERT INTO habitaciones (numero, tipo, capacidad) VALUES (?, ?, ?)');
      stmt.run('101', 'Simple', 1);
      stmt.run('102', 'Doble', 2);
      stmt.run('103', 'Familiar', 4);
      stmt.run('201', 'Simple', 1);
      stmt.run('202', 'Doble', 2);
      stmt.run('203', 'Familiar', 4);
      stmt.run('301', 'Doble', 2);
      stmt.run('302', 'Doble', 2);
      stmt.run('401', 'Suite', 2);
      stmt.run('402', 'Suite', 2);
      stmt.finalize();
      console.log('✅ 10 habitaciones por defecto insertadas');
    }
  });
});

// GET - Obtener todos los afiliados
app.get('/api/afiliados', (req, res) => {
  db.all('SELECT * FROM afiliados ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST - Registrar nuevo afiliado
app.post('/api/afiliados', (req, res) => {
  const { nombre, localidad } = req.body;
  if (!nombre || !localidad) {
    return res.status(400).json({ error: 'Nombre y localidad son requeridos' });
  }
  const d = new Date();
  const now = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  const sql = 'INSERT INTO afiliados (nombre, ciudad, localidad, fecha_alta) VALUES (?, ?, ?, ?)';
  db.run(sql, [nombre.toUpperCase(), localidad, localidad, now], function(err) {
    if (err) {
      console.error('❌ Error en el INSERT:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Afiliado guardado con ID: ${this.lastID}`);
    res.json({ id: this.lastID, nombre: nombre.toUpperCase(), localidad, ciudad: localidad });
  });
});

// DELETE - Eliminar afiliado por ID
app.delete('/api/afiliados/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM afiliados WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Afiliado no encontrado' });
    console.log(`🗑️ Afiliado eliminado ID: ${id}`);
    res.json({ success: true, id });
  });
});

// GET - Estadísticas del mes actual
app.get('/api/stats', (req, res) => {
  const now = new Date();
  const mesActual = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  db.get(
    `SELECT COUNT(*) as total,
     SUM(CASE WHEN fecha_alta LIKE ? THEN 1 ELSE 0 END) as este_mes
     FROM afiliados`,
    [`${mesActual}%`],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    }
  );
});

// ==========================================
// MÓDULO HOTEL (HABITACIONES Y RESERVAS)
// ==========================================

// GET - Obtener todas las habitaciones
app.get('/api/habitaciones', (req, res) => {
  db.all('SELECT * FROM habitaciones ORDER BY numero ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET - Obtener todas las reservas activas/pasadas con info del afiliado
app.get('/api/reservas', (req, res) => {
  const sql = `
    SELECT r.*, a.nombre as afiliado_nombre, h.numero as habitacion_numero, h.tipo as habitacion_tipo 
    FROM reservas r
    JOIN afiliados a ON r.afiliado_id = a.id
    JOIN habitaciones h ON r.habitacion_id = h.id
    ORDER BY r.id DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST - Crear nueva reserva
app.post('/api/reservas', (req, res) => {
  const { afiliado_id, habitacion_id, fecha_inicio, fecha_fin } = req.body;
  if (!afiliado_id || !habitacion_id || !fecha_inicio) {
    return res.status(400).json({ error: 'Faltan datos requeridos (afiliado, habitacion, fecha)' });
  }

  // Verificar si la habitación ya está ocupada
  db.get('SELECT estado FROM habitaciones WHERE id = ?', [habitacion_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Habitación no encontrada' });
    if (row.estado !== 'Disponible') return res.status(400).json({ error: 'Habitación no está disponible' });

    db.serialize(() => {
      // 1. Insertar la reserva
      const sqlReserva = 'INSERT INTO reservas (afiliado_id, habitacion_id, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?)';
      db.run(sqlReserva, [afiliado_id, habitacion_id, fecha_inicio, fecha_fin], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const reservaId = this.lastID;

        // 2. Cambiar estado de habitación a "Ocupada"
        db.run('UPDATE habitaciones SET estado = "Ocupada" WHERE id = ?', [habitacion_id], (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          console.log(`✅ Reserva creada ID: ${reservaId} para Habitación ${habitacion_id}`);
          res.json({ success: true, id: reservaId });
        });
      });
    });
  });
});

// DELETE - Finalizar o cancelar una reserva
app.delete('/api/reservas/:id', (req, res) => {
  const { id } = req.params;
  
  // Buscar a qué habitación pertenece la reserva
  db.get('SELECT habitacion_id, estado FROM reservas WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Reserva no encontrada' });
    
    db.serialize(() => {
      // 1. Marcar reserva como Finalizada
      db.run('UPDATE reservas SET estado = "Finalizada" WHERE id = ?', [id], (err1) => {
        if (err1) return res.status(500).json({ error: err1.message });
        
        // 2. Liberar la habitación
        db.run('UPDATE habitaciones SET estado = "Disponible" WHERE id = ?', [row.habitacion_id], (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          console.log(`🗑️ Reserva finalizada ID: ${id}, Habitación liberada.`);
          res.json({ success: true, id });
        });
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
});
