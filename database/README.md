# Módulo de Base de Datos y Persistencia - Sistema de Autenticación

Este directorio contiene la definición, esquemas y scripts de inicialización de la base de datos SQLite para el sistema de login.

## Tecnologías y Seguridad
- **Motor:** SQLite a través del módulo nativo de Node.js `node:sqlite` (`DatabaseSync`).
- **Seguridad de contraseñas:** Ninguna contraseña se almacena en texto plano. Se implementa hash criptográfico utilizando la API nativa `node:crypto` con el algoritmo **scrypt** (salt criptográfico aleatorio de 16 bytes y clave derivada de 64 bytes) y comparación en tiempo constante (`timingSafeEqual`) contra ataques de temporización.
- **Rendimiento e Integridad:** Restricción `UNIQUE` e índice `idx_usuarios_email` sobre la columna `email` para garantizar unicidad y búsquedas O(log n).

## Estructura de la Base de Datos

### Tabla: `usuarios`
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Identificador único del usuario |
| `email` | `TEXT` | `UNIQUE NOT NULL` | Correo electrónico para login (indexado) |
| `password_hash` | `TEXT` | `NOT NULL` | Hash seguro generado con scrypt (`salt:hash`) |
| `nombre` | `TEXT` | `NOT NULL` | Nombre completo del usuario |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Marca temporal de registro |

## Archivos
- [`schema.sql`](file:///c:/Users/alanm/Desktop/UPB/6to_Semestre_2026/MODULO%202/CERTIFICACI%C3%93N%201%20%28IA%20IN%20SOFTWARE%20DEVELOPMENT%29/repositorio%20clonado/login-subagente/database/schema.sql): DDL con las sentencias SQL de creación de tabla e índices.
- [`init_db.js`](file:///c:/Users/alanm/Desktop/UPB/6to_Semestre_2026/MODULO%202/CERTIFICACI%C3%93N%201%20%28IA%20IN%20SOFTWARE%20DEVELOPMENT%29/repositorio%20clonado/login-subagente/database/init_db.js): Script de inicialización, inserción de usuario demo y exportación de funciones utilitarias.

## Credenciales de Prueba (Demo)
- **Email:** `admin@demo.com`
- **Password (texto plano para testing):** `Password123!`
- **Nombre:** `Administrador Demo`
- **Hash almacenado:** Generado con `scrypt` (ej. `[salt_hex]:[hash_hex]`)

## Ejecución manual
```bash
node database/init_db.js
```
