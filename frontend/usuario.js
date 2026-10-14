/**
 * Página de usuario: solo accesible con un token válido (GET /api/perfil).
 * Sin token o con token inválido → vuelve al login (index.html).
 */

(() => {
  'use strict';

  const API_BASE_URL = 'http://localhost:3000';
  const STORAGE_KEY_TOKEN = 'secure_auth_token';
  const STORAGE_KEY_USER = 'secure_auth_user';

  const token = localStorage.getItem(STORAGE_KEY_TOKEN) || sessionStorage.getItem(STORAGE_KEY_TOKEN);

  function clearSession() {
    [localStorage, sessionStorage].forEach(s => {
      s.removeItem(STORAGE_KEY_TOKEN);
      s.removeItem(STORAGE_KEY_USER);
    });
  }

  function goToLogin(msg) {
    location.replace(`index.html?msg=${msg}`);
  }

  function render(usuario) {
    const nombre = usuario.nombre || usuario.email.split('@')[0];
    document.getElementById('userAvatar').textContent = nombre.charAt(0).toUpperCase();
    document.getElementById('userWelcome').textContent = `¡Hola, ${nombre}!`;
    document.getElementById('profileId').textContent = `#${usuario.id}`;
    document.getElementById('profileName').textContent = nombre;
    document.getElementById('profileEmail').textContent = usuario.email;
    document.getElementById('profileCreated').textContent = usuario.created_at || '-';
    document.getElementById('userSection').classList.remove('hidden');
  }

  async function loadProfile() {
    if (!token) return goToLogin('requerido');

    try {
      const res = await fetch(`${API_BASE_URL}/api/perfil`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 404) {
        clearSession();
        return goToLogin('expirada');
      }
      const data = await res.json();
      render(data.usuario);
    } catch {
      // Sin red: mostramos el usuario cacheado si existe
      const cached = localStorage.getItem(STORAGE_KEY_USER) || sessionStorage.getItem(STORAGE_KEY_USER);
      if (cached) render(JSON.parse(cached));
      else goToLogin('requerido');
    }
  }

  document.getElementById('btnLogout').addEventListener('click', async () => {
    try {
      await fetch(`${API_BASE_URL}/api/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
      console.warn('Error al contactar /api/logout:', e);
    }
    clearSession();
    goToLogin('logout');
  });

  loadProfile();
})();
