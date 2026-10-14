/**
 * HOOK 1 · PreToolUse (Edit|Write)
 * Bloquea modificar las pruebas, los secretos (.env) y la base de datos.
 * exit 0 → se permite | exit 2 → se BLOQUEA y stderr le llega a Claude
 */
const fs = require('node:fs');

const datos = JSON.parse(fs.readFileSync(0, 'utf8'));
const ruta = (datos.tool_input?.file_path || '').replace(/\\/g, '/');
const nombre = ruta.split('/').pop();

let motivo = null;
if (ruta.includes('/tests/')) {
    motivo = `'${nombre}' es una prueba y las pruebas están protegidas. Si una falla, corrige el código, no la prueba.`;
} else if (nombre.startsWith('.env') && nombre !== '.env.example') {
    motivo = `'${nombre}' contiene secretos y no se puede modificar.`;
} else if (nombre.endsWith('.db')) {
    motivo = `'${nombre}' es la base de datos SQLite; usa la API o init_db.js.`;
}

if (motivo) {
    console.error(`⛔ BLOQUEADO por hook: ${motivo}`);
    process.exit(2);
}
