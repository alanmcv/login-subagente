# Sistema de Login (Orquestado con Subagentes de Antigravity)

Este proyecto implementa un sistema completo de autenticación y login (Base de Datos → Backend → Frontend) generado y coordinado mediante la skill `/crear-login` y los subagentes especializados en **Google Antigravity**.

---

## 🏗️ Arquitectura de Subagentes (.agent/)

```text
.agent/
├── agents/
│   ├── base-datos.md      # Subagente encargado del diseño y persistencia (SQLite + scrypt)
│   ├── backend.md         # Subagente encargado de la API REST y seguridad (JWT + CORS)
│   └── frontend.md        # Subagente encargado de la interfaz de usuario reactiva
└── skills/
    ├── crear-login/
    │   └── SKILL.md       # Skill orquestadora principal
    └── flujo-login/
        └── SKILL.md       # Variante tipo pipeline
```

---

## 🚀 Componentes Generados

1. **`database/`**:
   - `schema.sql`: DDL de la tabla `usuarios` con restricción `UNIQUE` en email.
   - `init_db.js`: Inicializador con hashing `scrypt` + salt criptográfico aleatorio y usuario demo.
   - `auth.db`: Archivo SQLite generado.

2. **`backend/`**:
   - `server.js`: Servidor HTTP nativo en Node.js v24 (cero dependencias externas).
   - Endpoints:
     - `POST /api/login`: Emite token JWT firmado con HMAC-SHA256.
     - `POST /api/registro`: Registro con validaciones de email y hashing.
     - `GET /api/perfil`: Ruta protegida con validación de cabecera `Authorization: Bearer <token>`.
     - `POST /api/logout`: Cierre de sesión y revocación de token.
     - `GET /api/health`: Estado del servidor.
   - `test_api.js`: Suite de pruebas automatizadas con 9 tests de validación.

3. **`frontend/`**:
   - `index.html`: UI accesible con formulario de login, toggle de contraseña y dashboard post-login.
   - `styles.css`: Diseño moderno responsive con estados interactivos.
   - `app.js`: Lógica cliente con validaciones, llamadas `fetch` y persistencia en storage.
   - Botón directo **"⚡ Autollenar con Usuario Demo"** para pruebas inmediatas.

---

## 🧪 Credenciales de Prueba

- **Email:** `admin@demo.com`
- **Contraseña:** `Password123!`

---

## ⚡ Cómo Ejecutar y Probar

### 1. Iniciar el Servidor Backend:
```bash
npm start
# o directamente:
node backend/server.js
```
El backend estará disponible en `http://localhost:3000`.

### 2. Abrir el Frontend:
- Abre directamente `frontend/index.html` en tu navegador (doble clic o Live Server).
- Haz clic en **"⚡ Autollenar con Usuario Demo"** y luego en **"Iniciar Sesión"**.

### 3. Ejecutar Pruebas Automatizadas:
```bash
npm test
# o directamente:
node backend/test_api.js
```

