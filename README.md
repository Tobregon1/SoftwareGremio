# 🏛️ ATE Corrientes — Panel de Control

Sistema de gestión interno para la asociación **ATE Corrientes**. Permite administrar afiliados, habitaciones y reservas del hotel sindical desde un panel web moderno con base de datos local.

---

## 🚀 Características

- **Dashboard** con métricas en tiempo real (total de afiliados, altas del mes, ocupación del hotel)
- **Gestión de Afiliados** — registro, búsqueda y baja de afiliados
- **Check-ins** — visualización de ingresos con gráficos interactivos (Chart.js)
- **Estado de Habitaciones** — vista de disponibilidad en tiempo real
- **Gestión de Reservas** — creación y cancelación de reservas del hotel sindical

---

## 🛠️ Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5 + Tailwind CSS + Chart.js |
| Backend | Node.js + Express 5 |
| Base de Datos | SQLite 3 (local) |
| Fuente | Inter (Google Fonts) |

---

## 📦 Instalación

### Requisitos previos
- [Node.js](https://nodejs.org/) v18 o superior

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/Tobregon1/SoftwareGremio.git
cd SoftwareGremio

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor
npm start
```

El servidor arranca en **http://localhost:3000**

---

## 📁 Estructura del proyecto

```
SoftwareGremio/
├── index.html        # Frontend completo (SPA)
├── server.js         # API REST con Express + SQLite
├── package.json      # Dependencias del proyecto
├── .gitignore        # Excluye node_modules y base de datos
└── sindicato.db      # Base de datos SQLite (generada automáticamente, no incluida en el repo)
```

---

## 🔌 API Endpoints

### Afiliados
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/afiliados` | Lista todos los afiliados |
| `POST` | `/api/afiliados` | Registra un nuevo afiliado |
| `DELETE` | `/api/afiliados/:id` | Elimina un afiliado |
| `GET` | `/api/stats` | Estadísticas del mes actual |

### Hotel
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/habitaciones` | Lista todas las habitaciones con estado |
| `GET` | `/api/reservas` | Lista todas las reservas activas |
| `POST` | `/api/reservas` | Crea una nueva reserva |
| `DELETE` | `/api/reservas/:id` | Finaliza/cancela una reserva |

---

## 🏨 Habitaciones por defecto

Al iniciar por primera vez se crean 10 habitaciones automáticamente:

| N° | Tipo | Capacidad |
|----|------|-----------|
| 101, 201 | Simple | 1 persona |
| 102, 202, 301, 302 | Doble | 2 personas |
| 103, 203 | Familiar | 4 personas |
| 401, 402 | Suite | 2 personas |

---

## 📝 Notas

- La base de datos `sindicato.db` se crea automáticamente en la primera ejecución.
- El archivo `.gitignore` excluye la base de datos del repositorio para proteger los datos de los afiliados.
- El servidor sirve el frontend estático directamente desde Express (`express.static`).

---

## 📄 Licencia

ISC © ATE Corrientes
