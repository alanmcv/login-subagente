/**
 * Inicializador y verificador de Base de Datos SQLite para Sistema de Login
 * 
 * Utiliza el módulo nativo de Node.js `node:sqlite` (DatabaseSync) y `node:crypto`.
 */

const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');

// Ruta del archivo de base de datos SQLite
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'auth.db');

/**
 * Genera un hash seguro utilizando scrypt con salt aleatorio.
 * @param {string} password 
 * @returns {string} Formato 'salt:hash'
 */
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifica si una contraseña coincide con el hash almacenado.
 * @param {string} password 
 * @param {string} storedHash Formato 'salt:hash'
 * @returns {boolean}
 */
function verifyPassword(password, storedHash) {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

/**
 * Inicializa la base de datos y la tabla de usuarios.
 */
function initDatabase() {
    console.log(`[DB] Conectando a la base de datos en: ${DB_PATH}`);
    
    // Abrir o crear la base de datos
    const db = new DatabaseSync(DB_PATH);

    // Crear tabla usuarios con restricciones UNIQUE e índices
    db.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            nombre TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
    `);
    console.log('[DB] Tabla `usuarios` e índice `idx_usuarios_email` verificados/creados exitosamente.');

    // Datos del usuario de prueba
    const demoEmail = 'admin@demo.com';
    const demoRawPassword = 'Password123!';
    const demoNombre = 'Administrador Demo';

    // Verificar si el usuario ya existe
    const findStmt = db.prepare('SELECT id, email, password_hash, nombre, created_at FROM usuarios WHERE email = ?');
    let user = findStmt.get(demoEmail);

    if (!user) {
        console.log(`[DB] Insertando usuario demo (${demoEmail})...`);
        const passwordHash = hashPassword(demoRawPassword);
        const insertStmt = db.prepare(`
            INSERT INTO usuarios (email, password_hash, nombre)
            VALUES (?, ?, ?)
        `);
        insertStmt.run(demoEmail, passwordHash, demoNombre);
        user = findStmt.get(demoEmail);
        console.log('[DB] Usuario demo insertado correctamente.');
    } else {
        console.log('[DB] El usuario demo ya existe en la base de datos.');
    }

    // Verificar hash y conexión
    const isPasswordValid = verifyPassword(demoRawPassword, user.password_hash);

    console.log('\n--- RESUMEN DE INICIALIZACIÓN ---');
    console.log('Estado de conexión: OK (SQLite vía node:sqlite)');
    console.log('Archivo BD:', DB_PATH);
    console.log('Tabla: usuarios');
    console.log('Usuario de prueba verificado:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Nombre: ${user.nombre}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Password Hash (scrypt): ${user.password_hash.substring(0, 32)}...`);
    console.log(`  Verificación con contraseña '${demoRawPassword}': ${isPasswordValid ? 'EXITOSA (PASS)' : 'FALLIDA (FAIL)'}`);
    console.log(`  Fecha Creación: ${user.created_at}`);

    return { db, user, isPasswordValid };
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    try {
        initDatabase();
    } catch (err) {
        console.error('[DB ERROR] Error inicializando la base de datos:', err);
        process.exit(1);
    }
}

module.exports = {
    DB_PATH,
    initDatabase,
    hashPassword,
    verifyPassword
};
