-- Esquema de base de datos para autenticación / login
-- Tabla: usuarios

CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice explícito para acelerar búsquedas de login por email
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
