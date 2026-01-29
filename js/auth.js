/**
 * ============================================
 * NATILLERA - SISTEMA DE AUTENTICACIÓN
 * Archivo: auth.js
 * Descripción: Manejo de autenticación de usuarios
 * ============================================
 */

(function () {
    'use strict';

    /**
     * Verifica si hay un usuario autenticado
     * @returns {string|null} Email del usuario o null
     */
    function getCurrentUser() {
        return sessionStorage.getItem('natillera_user');
    }

    /**
     * Guarda el usuario en la sesión
     * @param {Object} user - Objeto del usuario
     */
    function setCurrentUser(user) {
        sessionStorage.setItem('natillera_user', user.email);
        sessionStorage.setItem('natillera_role', user.rol);
        sessionStorage.setItem('natillera_name', user.nombre);
    }

    /**
     * Cierra la sesión del usuario
     */
    function logout() {
        sessionStorage.removeItem('natillera_user');
        sessionStorage.removeItem('natillera_role');
        sessionStorage.removeItem('natillera_name');
        window.location.href = 'login.html';
    }

    /**
     * Verifica si el usuario está autenticado
     * Redirige a login si no lo está
     */
    function requireAuth() {
        const user = getCurrentUser();
        if (!user && !window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
        return user;
    }

    /**
     * Maneja el envío del formulario de login
     * @param {Event} e - Evento del formulario
     */
    async function handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const messageDiv = document.getElementById('loginMessage');

        // Mostrar mensaje de carga
        showMessage(messageDiv, 'info', 'Validando credenciales...');

        try {
            // ⚠️ IMPORTANTE: Reemplaza esta URL con la URL de tu Google Apps Script
            // La URL termina en /exec
            const API_URL = 'https://script.google.com/macros/s/AKfycbw7SBiUzhJtmmNwMN5bblvfyGMewgwijWaJ9Z_fIwYhpkFU3oyLBQNcARah_PEQFuv3/exec';

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify({
                    action: 'login',
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                setCurrentUser(data.user);
                showMessage(messageDiv, 'success', 'Acceso correcto. Redirigiendo...');

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 800);
            } else {
                showMessage(messageDiv, 'error', data.message || 'Error al iniciar sesión');
            }

        } catch (error) {
            showMessage(messageDiv, 'error', 'Error de conexión: ' + error.message);
        }
    }

    /**
     * Muestra un mensaje en el div especificado
     * @param {HTMLElement} element - Elemento donde mostrar el mensaje
     * @param {string} type - Tipo de mensaje (success, error, warning, info)
     * @param {string} message - Texto del mensaje
     */
    function showMessage(element, type, message) {
        element.className = `message ${type}`;
        element.textContent = message;
        element.classList.remove('hidden');
    }

    // Inicialización cuando el DOM está listo
    document.addEventListener('DOMContentLoaded', function () {

        // Si estamos en la página de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);

            // Si ya hay usuario autenticado, redirigir
            if (getCurrentUser()) {
                window.location.href = 'index.html';
            }
        }

        // Si estamos en el dashboard
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            // Verificar autenticación
            const user = requireAuth();

            // Mostrar nombre de usuario
            const userNameElement = document.getElementById('userName');
            if (userNameElement && user) {
                userNameElement.textContent = user;
            }

            // Configurar botón de logout
            logoutBtn.addEventListener('click', function (e) {
                e.preventDefault();
                if (confirm('¿Está seguro que desea cerrar sesión?')) {
                    logout();
                }
            });
        }
    });

    // Exponer funciones necesarias globalmente
    window.NatilleraAuth = {
        getCurrentUser,
        logout,
        requireAuth
    };

})();
