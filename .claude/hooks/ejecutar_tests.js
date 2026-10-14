/**
 * HOOK 3 · PostToolUse (Edit|Write)
 * Después de editar un .js/.html ejecuta las pruebas.
 * Fallan → exit 2 (Claude ve el error y se corrige) | Pasan → aviso verde al usuario.
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ruta = JSON.parse(fs.readFileSync(0, 'utf8')).tool_input?.file_path || '';
if (!/\.(js|html)$/.test(ruta)) process.exit(0);

const r = spawnSync(process.execPath, ['--test'], {
    cwd: path.resolve(__dirname, '../..'),
    encoding: 'utf8',
    timeout: 50000,
});
const salida = (r.stdout || '') + (r.stderr || '');

if (r.status !== 0) {
    console.error('❌ El hook ejecutó las pruebas después de tu cambio y FALLARON. Corrige el código (las pruebas no se pueden modificar):\n\n'
        + salida.slice(-3000));
    process.exit(2);
}

const pass = salida.match(/ℹ pass (\d+)/)?.[1] ?? '?';
console.log(JSON.stringify({ systemMessage: `✅ Hook de pruebas: ${pass} pruebas OK` }));
