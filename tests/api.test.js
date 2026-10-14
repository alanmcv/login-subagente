/**
 * 5 pruebas del login y la página de usuario (node:test, sin dependencias).
 * Ejecución: npm test
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Base de datos temporal: las pruebas no tocan database/auth.db
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'login-test-'));
process.env.DB_PATH = path.join(tmpDir, 'test.db');

const server = require('../backend/server.js');
const DEMO = { email: 'admin@demo.com', password: 'Password123!' };
let base;

before(() => new Promise(resolve => server.listen(0, '127.0.0.1', () => {
    base = `http://127.0.0.1:${server.address().port}`;
    resolve();
})));

after(() => new Promise(resolve => server.close(resolve)));

function login(credenciales) {
    return fetch(`${base}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credenciales)
    });
}

test('1. el usuario de prueba hace login y recibe un token', async () => {
    const res = await login(DEMO);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.token);
    assert.equal(data.usuario.email, DEMO.email);
});

test('2. login con contraseña incorrecta devuelve 401', async () => {
    const res = await login({ email: DEMO.email, password: 'incorrecta' });
    assert.equal(res.status, 401);
});

test('3. con el token del login se obtienen los datos de la página de usuario', async () => {
    const { token } = await (await login(DEMO)).json();
    const res = await fetch(`${base}/api/perfil`, { headers: { Authorization: `Bearer ${token}` } });
    const { usuario } = await res.json();
    assert.equal(res.status, 200);
    assert.equal(usuario.nombre, 'Administrador Demo');
    assert.equal(usuario.password_hash, undefined);
});

test('4. sin token no se puede ver el perfil', async () => {
    const res = await fetch(`${base}/api/perfil`);
    assert.equal(res.status, 401);
});

test('5. el servidor entrega la página usuario.html', async () => {
    const res = await fetch(`${base}/usuario.html`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
    assert.match(await res.text(), /usuario\.js/);
});
