# Servidor Backend de Autenticación

Servidor de autenticación y gestión de sesiones implementado con módulos nativos de **Node.js** (`node:http`, `node:crypto`, `node:sqlite`), sin dependencias externas (`node_modules`), compatible directamente con Node.js v24.

---

## 🚀 Cómo Iniciar el Servidor

Desde la raíz del proyecto:

```bash
node backend/server.js
```

O definiendo variables de entorno personalizadas:

```bash
PORT=3000 JWT_SECRET=mi-clave-super-secreta node backend/server.js
```

Por defecto, se ejecutará en:
`http://localhost:3000`

---

## 🔒 Mecanismo de Seguridad y Tokens

1. **Hashing de Contraseñas:**
   - Algoritmo seguro `scrypt` con salt aleatorio criptográfico de 16 bytes.
   - Comparación en tiempo constante (`crypto.timingSafeEqual`) contra ataques de tiempo (timing attacks).
2. **Tokens JWT Nativos:**
   - Algoritmo estándar `HS256` (HMAC con SHA-256) implementado mediante `node:crypto`.
   - Payload incluye identificador de usuario (`id`), `email`, fecha de emisión (`iat`) y expiración (`exp`).
   - Verificación de firma con `timingSafeEqual`.
3. **Mecanismo de Invalidación / Logout:**
   - Lista negra en memoria para invalidar tokens cuando el usuario llama a `/api/logout`.
   - Limpieza periódica para optimizar memoria.
4. **CORS Completo:**
   - Cabeceras `Access-Control-Allow-Origin: *`, métodos permitidos y manejo de preflight `OPTIONS` con código HTTP 204.

---

## 📡 Lista de Endpoints

### 1. `POST /api/registro`
Registra un nuevo usuario en la base de datos.

- **Cabeceras:** `Content-Type: application/json`
- **Payload (Body):**
  ```json
  {
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "password": "Password123!"
  }
  ```
- **Respuesta Exitosa (HTTP 201 Created):**
  ```json
  {
    "mensaje": "Usuario registrado exitosamente",
    "usuario": {
      "id": 2,
      "email": "juan@example.com",
      "nombre": "Juan Pérez",
      "created_at": "2026-10-12 18:05:00"
    }
  }
  ```
- **Errores:**
  - `400 Bad Request`: Datos incompletos o formato inválido (email no válido, contraseña < 6 caracteres).
  - `409 Conflict`: Correo electrónico ya registrado.

---

### 2. `POST /api/login`
Autentica credenciales y emite un token JWT.

- **Cabeceras:** `Content-Type: application/json`
- **Payload (Body):**
  ```json
  {
    "email": "admin@demo.com",
    "password": "Password123!"
  }
  ```
- **Respuesta Exitosa (HTTP 200 OK):**
  ```json
  {
    "mensaje": "Inicio de sesión exitoso",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id": 1,
      "email": "admin@demo.com",
      "nombre": "Administrador Demo"
    }
  }
  ```
- **Errores:**
  - `400 Bad Request`: Email o contraseña no proporcionados.
  - `401 Unauthorized`: Credenciales inválidas.

---

### 3. `GET /api/perfil`
Obtiene los datos del usuario autenticado (sin exponer el hash de la contraseña).

- **Cabeceras:** `Authorization: Bearer <token>`
- **Payload (Body):** Ninguno
- **Respuesta Exitosa (HTTP 200 OK):**
  ```json
  {
    "usuario": {
      "id": 1,
      "email": "admin@demo.com",
      "nombre": "Administrador Demo",
      "created_at": "2026-10-12 17:50:00"
    }
  }
  ```
- **Errores:**
  - `401 Unauthorized`: Token faltante, corrupto, expirado o revocado.
  - `404 Not Found`: Usuario no encontrado en la base de datos.

---

### 4. `POST /api/logout`
Cierra la sesión e invalida el token JWT activo en la lista negra.

- **Cabeceras:** `Authorization: Bearer <token>` (opcional / recomendado)
- **Payload (Body):** Ninguno
- **Respuesta Exitosa (HTTP 200 OK):**
  ```json
  {
    "mensaje": "Cierre de sesión exitoso"
  }
  ```

---

### 5. `GET /api/health`
Monitoreo de estado y tiempo de actividad del servicio.

- **Respuesta Exitosa (HTTP 200 OK):**
  ```json
  {
    "status": "OK",
    "uptime": 12.34,
    "timestamp": "2026-10-12T18:05:00.000Z"
  }
  ```

---

## 👤 Usuario de Prueba Demo

- **Email:** `admin@demo.com`
- **Contraseña:** `Password123!`
