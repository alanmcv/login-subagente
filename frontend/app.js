/**
 * Frontend de Autenticación - SecureAuth Pro
 * Conexión completa con endpoints de autenticación backend (http://localhost:3000)
 */

(() => {
  'use strict';

  // --- CONFIGURACIÓN ---
  const API_BASE_URL = 'http://localhost:3000';
  const STORAGE_KEY_TOKEN = 'secure_auth_token';
  const STORAGE_KEY_USER = 'secure_auth_user';

  // --- REFERENCIAS AL DOM ---
  // Vistas y Contenedores
  const alertBox = document.getElementById('alertBox');
  const alertTitle = document.getElementById('alertTitle');
  const alertMessage = document.getElementById('alertMessage');
  const alertIcon = document.getElementById('alertIcon');
  const closeAlertBtn = document.getElementById('closeAlertBtn');

  // Tabs
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  // Formulario Login
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const loginEmailError = document.getElementById('loginEmailError');
  const loginPasswordError = document.getElementById('loginPasswordError');
  const btnLoginSubmit = document.getElementById('btnLoginSubmit');
  const toggleLoginPassword = document.getElementById('toggleLoginPassword');
  const rememberMeCheckbox = document.getElementById('rememberMeCheckbox');
  const btnFillDemo = document.getElementById('btnFillDemo');

  // Formulario Registro
  const regNombre = document.getElementById('regNombre');
  const regEmail = document.getElementById('regEmail');
  const regPassword = document.getElementById('regPassword');
  const regNombreError = document.getElementById('regNombreError');
  const regEmailError = document.getElementById('regEmailError');
  const regPasswordError = document.getElementById('regPasswordError');
  const btnRegisterSubmit = document.getElementById('btnRegisterSubmit');
  const toggleRegPassword = document.getElementById('toggleRegPassword');

  // Timer para alertas
  let alertTimeoutId = null;

  // --- UTILIDADES DE ALERTA Y FEEDBACK ---
  const ICONS = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };

  function showAlert(title, message, type = 'info', autoDismiss = 6000) {
    if (alertTimeoutId) clearTimeout(alertTimeoutId);

    alertBox.className = `alert-box alert-${type}`;
    alertTitle.textContent = title;
    alertMessage.textContent = message;
    alertIcon.innerHTML = ICONS[type] || ICONS.info;
    alertBox.classList.remove('hidden');

    if (autoDismiss > 0) {
      alertTimeoutId = setTimeout(() => {
        dismissAlert();
      }, autoDismiss);
    }
  }

  function dismissAlert() {
    alertBox.classList.add('hidden');
    if (alertTimeoutId) clearTimeout(alertTimeoutId);
  }

  if (closeAlertBtn) {
    closeAlertBtn.addEventListener('click', dismissAlert);
  }

  // --- GESTIÓN DE ALMACENAMIENTO DE TOKEN ---
  function saveSession(token, user, remember = true) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEY_TOKEN, token);
    if (user) {
      storage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    }
  }

  function getStoredToken() {
    return localStorage.getItem(STORAGE_KEY_TOKEN) || sessionStorage.getItem(STORAGE_KEY_TOKEN);
  }

  // --- CAMBIO DE PESTAÑAS (LOGIN / REGISTRO) ---
  function setActiveTab(tab) {
    dismissAlert();
    clearValidationErrors();

    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabLogin.setAttribute('aria-selected', 'true');
      tabRegister.classList.remove('active');
      tabRegister.setAttribute('aria-selected', 'false');

      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
    } else {
      tabRegister.classList.add('active');
      tabRegister.setAttribute('aria-selected', 'true');
      tabLogin.classList.remove('active');
      tabLogin.setAttribute('aria-selected', 'false');

      registerForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
    }
  }

  tabLogin.addEventListener('click', () => setActiveTab('login'));
  tabRegister.addEventListener('click', () => setActiveTab('register'));

  // --- TOGGLE MOSTRAR / OCULTAR CONTRASEÑA ---
  function setupPasswordToggle(button, input) {
    button.addEventListener('click', () => {
      const isPassword = input.getAttribute('type') === 'password';
      input.setAttribute('type', isPassword ? 'text' : 'password');
      
      const eyeOpen = button.querySelector('.eye-open');
      const eyeClosed = button.querySelector('.eye-closed');
      if (eyeOpen && eyeClosed) {
        eyeOpen.classList.toggle('hidden', isPassword);
        eyeClosed.classList.toggle('hidden', !isPassword);
      }
    });
  }

  setupPasswordToggle(toggleLoginPassword, loginPassword);
  setupPasswordToggle(toggleRegPassword, regPassword);

  // --- BOTÓN ACCESO RÁPIDO DEMO ---
  btnFillDemo.addEventListener('click', () => {
    setActiveTab('login');
    loginEmail.value = 'admin@demo.com';
    loginPassword.value = 'Password123!';
    clearFieldValidation(loginEmail, loginEmailError);
    clearFieldValidation(loginPassword, loginPasswordError);
    showAlert('Credenciales Demo cargadas', 'Se han autollenado admin@demo.com y Password123! para inicio rápido.', 'info', 3000);
    loginPassword.focus();
  });

  // --- VALIDACIONES DE FORMULARIO (UX EN TIEMPO REAL) ---
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setFieldError(input, errorElement, message) {
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
    if (errorElement) errorElement.textContent = message;
  }

  function clearFieldValidation(input, errorElement) {
    input.classList.remove('is-invalid');
    input.classList.remove('is-valid');
    if (errorElement) errorElement.textContent = '';
  }

  function setFieldValid(input, errorElement) {
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
    if (errorElement) errorElement.textContent = '';
  }

  function clearValidationErrors() {
    [
      [loginEmail, loginEmailError],
      [loginPassword, loginPasswordError],
      [regNombre, regNombreError],
      [regEmail, regEmailError],
      [regPassword, regPasswordError]
    ].forEach(([input, err]) => clearFieldValidation(input, err));
  }

  // Limpiar error al tipear
  [
    [loginEmail, loginEmailError],
    [loginPassword, loginPasswordError],
    [regNombre, regNombreError],
    [regEmail, regEmailError],
    [regPassword, regPasswordError]
  ].forEach(([input, err]) => {
    input.addEventListener('input', () => {
      if (input.classList.contains('is-invalid')) {
        clearFieldValidation(input, err);
      }
    });
  });

  // --- MANEJO DE ESTADO DE BOTÓN (LOADING) ---
  function setButtonLoading(button, isLoading, originalText = '') {
    const textSpan = button.querySelector('.btn-text');
    const loader = button.querySelector('.btn-loader');

    if (isLoading) {
      button.disabled = true;
      if (textSpan) textSpan.classList.add('hidden');
      if (loader) loader.classList.remove('hidden');
    } else {
      button.disabled = false;
      if (textSpan) {
        textSpan.classList.remove('hidden');
        if (originalText) textSpan.textContent = originalText;
      }
      if (loader) loader.classList.add('hidden');
    }
  }

  // --- SERVICIOS DE API (FETCH) ---

  /**
   * 1. Iniciar Sesión (POST /api/login)
   */
  async function handleLogin(e) {
    e.preventDefault();
    dismissAlert();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    let isValid = true;

    if (!email) {
      setFieldError(loginEmail, loginEmailError, 'El correo electrónico es requerido.');
      isValid = false;
    } else if (!EMAIL_REGEX.test(email)) {
      setFieldError(loginEmail, loginEmailError, 'Ingresa un correo electrónico con formato válido.');
      isValid = false;
    } else {
      setFieldValid(loginEmail, loginEmailError);
    }

    if (!password) {
      setFieldError(loginPassword, loginPasswordError, 'La contraseña es requerida.');
      isValid = false;
    } else {
      setFieldValid(loginPassword, loginPasswordError);
    }

    if (!isValid) return;

    setButtonLoading(btnLoginSubmit, true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.mensaje || data.error || data.message || `Error de autenticación (${response.status})`;
        showAlert('Credenciales Incorrectas', errorMsg, 'error');
        setFieldError(loginPassword, loginPasswordError, 'Verifica tu usuario o contraseña.');
        return;
      }

      // Éxito
      const { token, usuario } = data;
      saveSession(token, usuario, rememberMeCheckbox.checked);

      showAlert('¡Inicio de sesión exitoso!', `Bienvenido ${usuario?.nombre || usuario?.email}. Redirigiendo a tu espacio seguro...`, 'success', 2500);

      setTimeout(() => {
        location.href = 'usuario.html';
      }, 700);

    } catch (err) {
      showAlert(
        'Error de Conexión', 
        `No fue posible comunicarse con el backend (${API_BASE_URL}). Verifica que el servidor Node.js/Express esté iniciado en el puerto 3000.`, 
        'error', 
        8000
      );
    } finally {
      setButtonLoading(btnLoginSubmit, false, 'Iniciar Sesión');
    }
  }

  /**
   * 2. Registrar Cuenta (POST /api/registro)
   */
  async function handleRegister(e) {
    e.preventDefault();
    dismissAlert();

    const nombre = regNombre.value.trim();
    const email = regEmail.value.trim();
    const password = regPassword.value;
    let isValid = true;

    if (!nombre) {
      setFieldError(regNombre, regNombreError, 'El nombre completo es requerido.');
      isValid = false;
    } else {
      setFieldValid(regNombre, regNombreError);
    }

    if (!email) {
      setFieldError(regEmail, regEmailError, 'El correo electrónico es requerido.');
      isValid = false;
    } else if (!EMAIL_REGEX.test(email)) {
      setFieldError(regEmail, regEmailError, 'Ingresa un correo electrónico con formato válido.');
      isValid = false;
    } else {
      setFieldValid(regEmail, regEmailError);
    }

    if (!password) {
      setFieldError(regPassword, regPasswordError, 'La contraseña es requerida.');
      isValid = false;
    } else if (password.length < 6) {
      setFieldError(regPassword, regPasswordError, 'La contraseña debe tener al menos 6 caracteres.');
      isValid = false;
    } else {
      setFieldValid(regPassword, regPasswordError);
    }

    if (!isValid) return;

    setButtonLoading(btnRegisterSubmit, true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/registro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nombre, email, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.mensaje || data.error || data.message || `No se pudo registrar (${response.status})`;
        showAlert('No se pudo crear la cuenta', errorMsg, 'error');
        if (response.status === 409) {
          setFieldError(regEmail, regEmailError, 'Este correo ya se encuentra registrado.');
        }
        return;
      }

      // Éxito: cambiar al formulario de login con correo prellenado
      showAlert('¡Cuenta creada exitosamente!', 'Tu cuenta ha sido creada. Ahora puedes iniciar sesión con tus nuevas credenciales.', 'success', 5000);
      setActiveTab('login');
      loginEmail.value = email;
      loginPassword.value = '';
      loginPassword.focus();

    } catch (err) {
      showAlert(
        'Error de Conexión', 
        `No fue posible comunicarse con el backend en ${API_BASE_URL}. Verifica que el servidor esté activo.`, 
        'error', 
        8000
      );
    } finally {
      setButtonLoading(btnRegisterSubmit, false, 'Registrar Cuenta');
    }
  }

  /**
   * Comprobación rápida de conectividad
   */
  async function checkApiHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/perfil`, { method: 'GET' });
      // Si responde 401 (no token) o 200, significa que la API está viva y escuchando
      if (res.status === 401 || res.status === 200 || res.status === 404) {
        showAlert('Servidor En Línea', `Conexión confirmada con ${API_BASE_URL}`, 'success', 3500);
      } else {
        showAlert('API Respondiendo', `Código de estado recibido: ${res.status}`, 'info', 3500);
      }
    } catch (e) {
      showAlert('API No Disponible', `No se pudo conectar a ${API_BASE_URL}. Asegúrate de que el backend esté ejecutándose (npm run dev / npm start).`, 'error', 6000);
    }
  }

  // --- LISTENERS ---
  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
  if (btnCheckHealth) {
    btnCheckHealth.addEventListener('click', checkApiHealth);
  }

  // --- INICIALIZACIÓN ---
  // Con sesión guardada vamos directo a la página de usuario (ella valida el token)
  if (getStoredToken()) {
    location.replace('usuario.html');
  }
  const MENSAJES = {
    logout: ['Sesión Finalizada', 'Has cerrado sesión de forma segura.', 'info'],
    expirada: ['Sesión Caducada', 'Tu token de acceso ha expirado o no es válido. Inicia sesión nuevamente.', 'error'],
    requerido: ['Acceso Restringido', 'Debes iniciar sesión para ver tu página de usuario.', 'error']
  };
  const msg = MENSAJES[new URLSearchParams(location.search).get('msg')];
  if (msg) showAlert(...msg);

})();
