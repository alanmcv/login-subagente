/**
 * HOOK 2 · PreToolUse (Bash|PowerShell)
 * Bloquea comandos peligrosos y, antes de un `git push`, exige que pasen las pruebas.
 * exit 0 → se permite | exit 2 → se BLOQUEA y stderr le llega a Claude
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PELIGROSOS = [
    [/\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r/i, 'borrado recursivo forzado (rm -rf)'],
    [/Remove-Item\b.*-Recurse/i, 'borrado recursivo en PowerShell'],
    [/git\s+push\b.*(--force|-f\b)/i, 'git push --force (reescribe la historia del equipo)'],
    [/git\s+reset\s+--hard/i, 'git reset --hard (pierde cambios sin confirmar)'],
    [/DROP\s+(TABLE|DATABASE)/i, 'eliminar tablas o bases de datos'],
    [/\bdel\s+\/[sq]/i, 'borrado masivo en Windows'],
];

const comando = JSON.parse(fs.readFileSync(0, 'utf8')).tool_input?.command || '';

for (const [patron, motivo] of PELIGROSOS) {
    if (patron.test(comando)) {
        console.error(`⛔ BLOQUEADO por hook: ${motivo}.\nComando: ${comando}\nSi de verdad es necesario, pide al usuario que lo ejecute manualmente.`);
        process.exit(2);
    }
}

// Antes del push: las pruebas deben pasar (git push, git.exe push, git -C ruta push)
if (/\bgit(?:\.exe)?\b[^\r\n;&|]*\bpush\b/i.test(comando)) {
    const r = spawnSync(process.execPath, ['--test'], {
        cwd: path.resolve(__dirname, '../..'),
        encoding: 'utf8',
        timeout: 50000,
    });
    if (r.status !== 0) {
        console.error('⛔ PUSH BLOQUEADO: las pruebas fallaron. Corrige el código (sin tocar tests/), haz commit y reintenta.\n\n'
            + ((r.stdout || '') + (r.stderr || '') || String(r.error)).slice(-4000));
        process.exit(2);
    }
}
