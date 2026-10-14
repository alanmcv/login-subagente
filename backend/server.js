/**
 * Servidor Backend de Autenticación con Node.js Nativo
 * 
 * - Módulo HTTP nativo: node:http (sin frameworks ni dependencias externas)
 * - Base de datos: SQLite a través de `../database/init_db.js` (node:sqlite)
 * - Seguridad: Hasheo con scrypt (salt aleatorio) y JWT nativo con HMAC-SHA256 (node:crypto)
 * - Soporte completo de CORS y headers de seguridad
 */

const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const { initDatabase, hashPassword, verifyPassword } = require('../database/init_db.js');

// Configuración de variables de entorno y constantes
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-auth-key-change-in-production-12345!';
const TOKEN_EXPIRATION_SECONDS = process.env.TOKEN_EXPIRATION_SECONDS
    ? parseInt(process.env.TOKEN_EXPIRATION_SECONDS, 10)
    : 2 * 60 * 60; // 2 horas por defecto

// Inicializar y obtener la conexión a la base de datos
let dbInstance;
try {
    const { db } = initDatabase();
    dbInstance = db;
    console.log('[BACKEND] Conexión con SQLite establecida exitosamente.');
} catch (error) {
    console.error('[BACKEND ERROR] Error al inicializar la base de datos:', error);
    process.exit(1);
}

// Lista negra en memoria para invalidar tokens cerrados (Logout)
const revokedTokens = new Set();

// Limpieza periódica de tokens revocados cada 30 minutos para evitar fugas de memoria
setInterval(() => {
    // Si la lista crece, se descartan los tokens viejos
    if (revokedTokens.size > 10000) {
        revokedTokens.clear();
    }
}, 30 * 60 * 1000).unref();

// ==========================================
// UTILIDADES DE JWT NATIVO (HMAC-SHA256)
// ==========================================

function base64UrlEncode(str) {
    return Buffer.from(str).toString('base64url');
}

function base64UrlDecode(str) {
    return Buffer.from(str, 'base64url').toString('utf-8');
}

/**
 * Genera un token JWT firmado con algoritmo HS256
 */
function generateToken(payload, expiresInSeconds = TOKEN_EXPIRATION_SECONDS) {
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
        ...payload,
        iat: now,
        exp: now + expiresInSeconds
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

    const signature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifica la firma y expiración de un JWT
 */
function verifyToken(token) {
    if (!token || typeof token !== 'string') {
        return { valid: false, error: 'Token no proporcionado' };
    }

    if (revokedTokens.has(token)) {
        return { valid: false, error: 'Token revocado o sesión cerrada' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
        return { valid: false, error: 'Formato de token inválido' };
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Calcular firma esperada
    const expectedSignature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
        return { valid: false, error: 'Firma de token inválida' };
    }

    try {
        const payload = JSON.parse(base64UrlDecode(encodedPayload));
        const now = Math.floor(Date.now() / 1000);

        if (payload.exp && payload.exp < now) {
            return { valid: false, error: 'Token expirado' };
        }

        return { valid: true, payload };
    } catch {
        return { valid: false, error: 'Contenido del token corrupto' };
    }
}

/**
 * Invalida un token añadiéndolo al blacklist
 */
function revokeToken(token) {
    if (token) {
        revokedTokens.add(token);
    }
}

// ==========================================
// HELPERS HTTP & CORS
// ==========================================

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
};

function sendJson(res, statusCode, data) {
    const payload = JSON.stringify(data);
    res.writeHead(statusCode, {
        ...CORS_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload)
    });
    res.end(payload);
}

/**
 * Lee el cuerpo de la petición HTTP y parsea JSON
 */
function parseJsonBody(req, maxSize = 1024 * 1024) {
    return new Promise((resolve, reject) => {
        let body = '';
        let size = 0;

        req.on('data', chunk => {
            size += chunk.length;
            if (size > maxSize) {
                req.destroy();
                return reject(new Error('Cuerpo de la petición excede el tamaño permitido'));
            }
            body += chunk;
        });

        req.on('end', () => {
            if (!body.trim()) {
                return resolve({});
            }
            try {
                const parsed = JSON.parse(body);
                resolve(parsed);
            } catch (err) {
                reject(new Error('Formato JSON inválido'));
            }
        });

        req.on('error', err => {
            reject(err);
        });
    });
}

/**
 * Extrae y valida el token Bearer del header Authorization
 */
function extractBearerToken(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        return parts[1].trim();
    }
    return null;
}

// Validador de formato de email
function isValidEmail(email) {
    if (typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

// ==========================================
// CONTROLADORES DE RUTAS
// ==========================================

/**
 * POST /api/registro
 * Payload: { nombre, email, password }
 */
async function handleRegistro(req, res) {
    let body;
    try {
        body = await parseJsonBody(req);
    } catch (err) {
        return sendJson(res, 400, { error: err.message });
    }

    const { nombre, email, password } = body;

    // Validación de campos requeridos
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
        return sendJson(res, 400, { error: 'El nombre es obligatorio y debe tener al menos 2 caracteres' });
    }

    if (!email || !isValidEmail(email)) {
        return sendJson(res, 400, { error: 'Se requiere un correo electrónico válido' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
        return sendJson(res, 400, { error: 'La contraseña es obligatoria y debe tener al menos 6 caracteres' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanNombre = nombre.trim();

    try {
        // Verificar si el correo ya existe
        const checkStmt = dbInstance.prepare('SELECT id FROM usuarios WHERE email = ?');
        const existing = checkStmt.get(cleanEmail);

        if (existing) {
            return sendJson(res, 409, { error: 'El correo electrónico ya está registrado' });
        }

        // Generar hash seguro
        const passwordHash = hashPassword(password);

        // Insertar usuario
        const insertStmt = dbInstance.prepare(`
            INSERT INTO usuarios (email, password_hash, nombre)
            VALUES (?, ?, ?)
        `);
        insertStmt.run(cleanEmail, passwordHash, cleanNombre);

        // Obtener el registro insertado sin hash
        const getStmt = dbInstance.prepare('SELECT id, email, nombre, created_at FROM usuarios WHERE email = ?');
        const nuevoUsuario = getStmt.get(cleanEmail);

        return sendJson(res, 201, {
            mensaje: 'Usuario registrado exitosamente',
            usuario: nuevoUsuario
        });
    } catch (err) {
        console.error('[REGISTRO ERROR]', err);
        return sendJson(res, 500, { error: 'Error interno del servidor al procesar el registro' });
    }
}

/**
 * POST /api/login
 * Payload: { email, password }
 */
async function handleLogin(req, res) {
    let body;
    try {
        body = await parseJsonBody(req);
    } catch (err) {
        return sendJson(res, 400, { error: err.message });
    }

    const { email, password } = body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        return sendJson(res, 400, { error: 'Debe proporcionar email y contraseña' });
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
        // Buscar usuario por email
        const userStmt = dbInstance.prepare('SELECT id, email, password_hash, nombre FROM usuarios WHERE email = ?');
        const user = userStmt.get(cleanEmail);

        // Mensaje genérico de credenciales inválidas para evitar enumeración de usuarios
        if (!user) {
            return sendJson(res, 401, { error: 'Credenciales inválidas' });
        }

        // Verificar contraseña con hashing seguro
        const isValid = verifyPassword(password, user.password_hash);
        if (!isValid) {
            return sendJson(res, 200, { error: 'Credenciales inválidas' });
        }

        // Generar token JWT
        const token = generateToken({
            id: user.id,
            email: user.email,
            nombre: user.nombre
        });

        return sendJson(res, 200, {
            mensaje: 'Inicio de sesión exitoso',
            token,
            usuario: {
                id: user.id,
                email: user.email,
                nombre: user.nombre
            }
        });
    } catch (err) {
        console.error('[LOGIN ERROR]', err);
        return sendJson(res, 500, { error: 'Error interno del servidor durante el inicio de sesión' });
    }
}

/**
 * GET /api/perfil
 * Cabecera requerida: Authorization: Bearer <token>
 */
async function handlePerfil(req, res) {
    const token = extractBearerToken(req);

    if (!token) {
        return sendJson(res, 200, { error: 'Token de autenticación no proporcionado en la cabecera Authorization' });
    }

    const verification = verifyToken(token);
    if (!verification.valid) {
        return sendJson(res, 401, { error: verification.error });
    }

    const userId = verification.payload.id;

    try {
        // Consultar datos actualizados del usuario en base de datos (omitiendo password_hash)
        const userStmt = dbInstance.prepare('SELECT id, email, nombre, created_at FROM usuarios WHERE id = ?');
        const user = userStmt.get(userId);

        if (!user) {
            return sendJson(res, 404, { error: 'Usuario no encontrado' });
        }

        return sendJson(res, 200, {
            usuario: user
        });
    } catch (err) {
        console.error('[PERFIL ERROR]', err);
        return sendJson(res, 500, { error: 'Error interno al consultar el perfil' });
    }
}

/**
 * POST /api/logout
 * Cabecera opcional/requerida: Authorization: Bearer <token>
 */
async function handleLogout(req, res) {
    const token = extractBearerToken(req);

    if (token) {
        revokeToken(token);
    }

    return sendJson(res, 200, {
        mensaje: 'Cierre de sesión exitoso'
    });
}

/**
 * GET /api/health
 */
function handleHealth(req, res) {
    return sendJson(res, 200, {
        status: 'OK',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
}

// ==========================================
// SERVIDOR HTTP
// ==========================================

const server = http.createServer((req, res) => {
    // Normalizar URL eliminando querystrings para matching de rutas
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();

    // Manejo de preflight CORS (OPTIONS)
    if (method === 'OPTIONS') {
        res.writeHead(204, CORS_HEADERS);
        res.end();
        return;
    }

    // Enrutador
    if (method === 'POST' && pathname === '/api/registro') {
        return handleRegistro(req, res);
    }

    if (method === 'POST' && pathname === '/api/login') {
        return handleLogin(req, res);
    }

    if (method === 'GET' && pathname === '/api/perfil') {
        return handlePerfil(req, res);
    }

    if (method === 'POST' && pathname === '/api/logout') {
        return handleLogout(req, res);
    }

    if (method === 'GET' && pathname === '/api/health') {
        return handleHealth(req, res);
    }

    // Servir archivos estáticos del frontend (HTML, CSS, JS)
    if (method === 'GET') {
        const frontendDir = path.join(__dirname, '../frontend');
        let relativeFile = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
        const targetPath = path.resolve(frontendDir, relativeFile);

        // Prevenir directory traversal
        if (targetPath.startsWith(frontendDir) && fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
            const ext = path.extname(targetPath).toLowerCase();
            const mimeTypes = {
                '.html': 'text/html; charset=utf-8',
                '.css': 'text/css; charset=utf-8',
                '.js': 'application/javascript; charset=utf-8',
                '.json': 'application/json; charset=utf-8',
                '.svg': 'image/svg+xml'
            };
            const contentType = mimeTypes[ext] || 'application/octet-stream';
            res.writeHead(200, {
                'Content-Type': contentType,
                ...CORS_HEADERS
            });
            fs.createReadStream(targetPath).pipe(res);
            return;
        }
    }

    // Ruta no encontrada
    return sendJson(res, 404, {
        error: `Ruta o método no encontrado: ${method} ${pathname}`
    });
});

// Exportado para los tests (tests/api.test.js)
module.exports = server;

// Inicio del servidor (solo al ejecutarlo directamente: npm start)
if (require.main === module) server.listen(PORT, HOST, () => {
    console.log(`=====================================================`);
    console.log(`Servidor de Autenticación iniciado`);
    console.log(`URL local: http://localhost:${PORT}`);
    console.log(`Rutas disponibles:`);
    console.log(`  - POST /api/login`);
    console.log(`  - POST /api/registro`);
    console.log(`  - GET  /api/perfil`);
    console.log(`  - POST /api/logout`);
    console.log(`  - GET  /api/health`);
    console.log(`=====================================================`);
});

// Manejo ordenado de cierre
process.on('SIGINT', () => {
    console.log('\n[BACKEND] Deteniendo servidor...');
    server.close(() => {
        console.log('[BACKEND] Servidor detenido.');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n[BACKEND] Recibido SIGTERM, cerrando servidor...');
    server.close(() => {
        process.exit(0);
    });
});
