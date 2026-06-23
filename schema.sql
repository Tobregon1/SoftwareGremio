-- ============================================================
-- Ejecutá esto en Supabase → SQL Editor → New query → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS afiliados (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  ciudad TEXT,
  localidad TEXT,
  fecha_alta TEXT
);

CREATE TABLE IF NOT EXISTS habitaciones (
  id SERIAL PRIMARY KEY,
  numero TEXT NOT NULL,
  tipo TEXT NOT NULL,
  capacidad INTEGER,
  estado TEXT DEFAULT 'Disponible'
);

CREATE TABLE IF NOT EXISTS reservas (
  id SERIAL PRIMARY KEY,
  afiliado_id INTEGER REFERENCES afiliados(id),
  habitacion_id INTEGER REFERENCES habitaciones(id),
  fecha_inicio TEXT,
  fecha_fin TEXT,
  estado TEXT DEFAULT 'Activa'
);
