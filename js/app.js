/**
 * ============================================
 * NATILLERA - APLICACIÓN PRINCIPAL
 * Archivo: app.js
 * Descripción: Lógica principal del dashboard
 * ============================================
 */

(function () {
    'use strict';

    // ==========================================
    // CONFIGURACIÓN DE LA API
    // ==========================================

    /**
     * ⚠️ IMPORTANTE: Reemplaza esta URL con la URL de tu Google Apps Script
     * La URL termina en /exec y se obtiene al implementar el script
     */
    const API_URL = 'https://script.google.com/macros/s/AKfycbw7SBiUzhJtmmNwMN5bblvfyGMewgwijWaJ9Z_fIwYhpkFU3oyLBQNcARah_PEQFuv3/exec';

    // Variables globales de configuración (con valores por defecto)
    let GLOBAL_CONFIG = {
        APORTE_MINIMO: 30000,
        MORA_DIARIA: 3000,
        DIAS_PAGO: "15,30"
    };

    // VARIABLES GLOBALES DEL MÓDULO
    let cicloActivoGlobal = null;
    let noCicloAlert = null;

    // ==========================================
    // 1. NAVEGACIÓN ENTRE SECCIONES
    // ==========================================

    /**
     * Configura la navegación entre secciones del dashboard
     */
    function setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('.content-section');
        const userRole = sessionStorage.getItem('natillera_role');

        // Control de acceso al menú ajustes y usuarios
        const navUsuarios = document.getElementById('navUsuarios');
        const navConfig = document.getElementById('navConfig');
        const isAdmin = userRole === 'admin' || userRole === 'ADMIN';

        if (navUsuarios) navUsuarios.style.display = isAdmin ? 'flex' : 'none';
        if (navConfig) navConfig.style.display = isAdmin ? 'flex' : 'none';

        navLinks.forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();

                const targetSection = this.getAttribute('data-section');

                // Remover clase active de todos los links
                navLinks.forEach(l => l.classList.remove('active'));

                // Agregar clase active al link clickeado
                this.classList.add('active');

                // Ocultar todas las secciones
                sections.forEach(s => s.classList.remove('active'));

                // Mostrar la sección seleccionada
                const target = document.getElementById(targetSection);
                if (target) {
                    target.classList.add('active');

                    // Cargar datos según la sección
                    loadSectionData(targetSection);
                }
            });
        });
    }

    /**
     * Carga los datos de una sección específica
     * @param {string} sectionName - Nombre de la sección
     */
    function loadSectionData(sectionName) {
        switch (sectionName) {
            case 'dashboard':
                loadDashboardData();
                break;
            case 'participantes':
                loadParticipantes();
                break;
            case 'aportes':
                loadAportes();
                break;
            case 'actividades':
                loadActividades();
                break;
            case 'prestamos':
                loadPrestamos();
                break;
            case 'usuarios':
                loadUsuarios();
                break;
            case 'polla':
                loadPollaData();
                break;
            case 'config':
                loadGlobalConfig();
                break;
        }
    }

    // ==========================================
    // 2. CARGA DE DATOS DEL DASHBOARD
    // ==========================================

    /**
     * Carga los datos del dashboard desde la API
     */
    async function loadDashboardData() {
        try {
            const response = await fetch(`${API_URL}?action=getResumen`);
            const result = await response.json();

            if (result.status === 'success') {
                updateDashboard(result.data);
                initGananciasChart(); // Cargar historial de ganancias
            } else {
                console.error('Error al cargar dashboard:', result.message);
                // Mostrar datos por defecto en caso de error
                updateDashboard({
                    totalRecaudado: 0,
                    totalGanancias: 0,
                    numParticipantes: 0,
                    cicloActual: '-',
                    fechaInicio: '-',
                    fechaCierre: '-',
                    totalIntereses: 0,
                    estadoCiclo: '-'
                });
            }

        } catch (error) {
            console.error('Error al cargar dashboard:', error);
        }
    }

    /**
     * Actualiza los elementos del dashboard con los datos
     * @param {Object} data - Datos del dashboard
     */
    function updateDashboard(data) {
        // Actualizar estadísticas principales
        const elAportado = document.getElementById('totalAportado');
        const elPrestado = document.getElementById('capitalPrestado');
        const elDisponible = document.getElementById('dineroDisponible');
        const elGanancias = document.getElementById('totalGanancias');

        if (elAportado) elAportado.textContent = formatCurrency(data.totalAportado);
        if (elPrestado) elPrestado.textContent = formatCurrency(data.capitalPrestado);
        if (elDisponible) elDisponible.textContent = formatCurrency(data.dineroDisponible);
        if (elGanancias) elGanancias.textContent = formatCurrency(data.totalGanancias);

        // Actualizar información secundaria
        const elCicloNombre = document.getElementById('infoCicloNombre');
        const elParticipantes = document.getElementById('infoParticipantes');

        if (elCicloNombre) elCicloNombre.textContent = data.cicloActual || '-';
        if (elParticipantes) elParticipantes.textContent = data.numParticipantes || '0';

        // Títulos de Dashboard también se actualizan
        const elCicloHeader = document.getElementById('cicloActual');
        if (elCicloHeader) elCicloHeader.textContent = data.cicloActual;

        // Actualizar información del ciclo
        document.getElementById('fechaInicio').textContent = formatDate(data.fechaInicio);
        document.getElementById('fechaCierre').textContent = formatDate(data.fechaCierre);
        document.getElementById('estadoCiclo').textContent = data.estadoCiclo || 'INACTIVO';

        // Actualizar estado global
        cicloActivoGlobal = data.cicloActual;

        // Mostrar alerta si no hay ciclo
        if (noCicloAlert) {
            if (!data.cicloActual || data.cicloActual === 'Sin Ciclo Activo') {
                noCicloAlert.style.display = 'block';
                document.getElementById('estadoCiclo').className = 'badge badge-danger';
            } else {
                noCicloAlert.style.display = 'none';
                document.getElementById('estadoCiclo').className = 'badge badge-success';
            }
        }
    }

    // ==========================================
    // 3. GESTIÓN DE PARTICIPANTES
    // ==========================================

    /**
     * Carga la lista de participantes
     */
    async function loadParticipantes() {
        try {
            const tbody = document.getElementById('participantesTableBody');
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">Cargando participantes...</td></tr>';

            const response = await fetch(`${API_URL}?action=getParticipantes`);
            const result = await response.json();

            if (result.status === 'success') {
                renderParticipantes(result.data);
            } else {
                console.error('Error al cargar participantes:', result.message);
                tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">Error: ${result.message}</td></tr>`;
            }

        } catch (error) {
            console.error('Error al cargar participantes:', error);
            const tbody = document.getElementById('participantesTableBody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error de conexión: ${error.message}</td></tr>`;
            }
        }
    }

    /**
     * Renderiza la tabla de participantes
     * @param {Array} participantes - Lista de participantes
     */
    function renderParticipantes(participantes) {
        const tbody = document.getElementById('participantesTableBody');

        if (participantes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No hay participantes registrados</td></tr>';
            return;
        }

        tbody.innerHTML = participantes.map(p => `
            <tr>
                <td>${p.nombre}</td>
                <td>${p.cedula} <br><small class="text-muted">${p.telefono}</small></td>
                <td>${formatCurrency(p.total_aportado || 0)}</td>
                <td>${formatCurrency(p.ganancias_acumuladas || 0)}</td>
                <td><strong>${formatCurrency(Number(p.total_aportado || 0) + Number(p.ganancias_acumuladas || 0))}</strong></td>
                <td>
                    <span class="badge ${p.activo ? 'badge-success' : 'badge-danger'}">
                        ${p.activo ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="abrirEditarParticipante('${p.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    ${p.activo ?
                `<button class="btn btn-sm btn-warning" onclick="gestionarParticipanteState('${p.id}', 'LIQUIDAR', '${p.nombre}', ${p.total_aportado}, ${p.ganancias_acumuladas})">Liquidar</button>`
                : `<button class="btn btn-sm btn-success" onclick="gestionarParticipanteState('${p.id}', 'ACTIVAR', '${p.nombre}')">Activar</button>`
            }
                    <button class="btn btn-sm btn-danger" onclick="gestionarParticipanteState('${p.id}', 'ELIMINAR', '${p.nombre}')">Eliminar</button>
                </td>
            </tr>
        `).join('');
    }


    // ==========================================
    // 4. GESTIÓN DE APORTES
    // ==========================================

    /**
     * Carga la lista de aportes
     */
    async function loadAportes() {
        try {
            const tbody = document.getElementById('aportesTableBody');
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Cargando aportes...</td></tr>';

            // Cargar participantes en el select primero
            await loadParticipantesSelect('aporteParticipante');

            const response = await fetch(`${API_URL}?action=getAportes`);
            const result = await response.json();

            if (result.status === 'success') {
                renderAportes(result.data);
            } else {
                console.error('Error al cargar aportes:', result.message);
                tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${result.message}</td></tr>`;
            }

            // Configurar fecha actual
            const fechaInput = document.getElementById('aporteFecha');
            if (fechaInput) {
                fechaInput.valueAsDate = new Date();
            }

        } catch (error) {
            console.error('Error al cargar aportes:', error);
            const tbody = document.getElementById('aportesTableBody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error de conexión: ${error.message}</td></tr>`;
            }
        }
    }

    /**
     * Renderiza la tabla de aportes
     * @param {Array} aportes - Lista de aportes
     */
    function renderAportes(aportes) {
        const tbody = document.getElementById('aportesTableBody');

        if (aportes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay aportes registrados</td></tr>';
            return;
        }

        tbody.innerHTML = aportes.map(a => `
            <tr>
                <td>${formatDate(a.fecha)}</td>
                <td>${a.participante}</td>
                <td>${formatCurrency(a.monto)}</td>
                <td class="text-danger">${formatCurrency(a.monto_mora || 0)}</td>
                <td><strong>${formatCurrency(Number(a.monto || 0) + Number(a.monto_mora || 0))}</strong></td>
                <td>${a.concepto}</td>
                <td>
                    <button class="btn btn-sm btn-whatsapp" onclick="enviarComprobanteAporte('${a.participante}', '${a.telefono}', '${a.fecha}', ${a.monto}, ${a.monto_mora || 0}, '${a.concepto}')" title="Enviar comprobante">
                        <i class="fab fa-whatsapp"></i> Notificar
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // ==========================================
    // 5. GESTIÓN DE ACTIVIDADES
    // ==========================================

    /**
     * Carga la lista de actividades
     */
    async function loadActividades() {
        try {
            const tbody = document.getElementById('actividadesTableBody');
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Cargando actividades...</td></tr>';

            const response = await fetch(`${API_URL}?action=getActividades`);
            const result = await response.json();

            if (result.status === 'success') {
                renderActividades(result.data);
            } else {
                console.error('Error al cargar actividades:', result.message);
                tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${result.message}</td></tr>`;
            }

            // Configurar fecha actual
            const fechaInput = document.getElementById('actividadFecha');
            if (fechaInput) {
                fechaInput.valueAsDate = new Date();
            }

        } catch (error) {
            console.error('Error al cargar actividades:', error);
            const tbody = document.getElementById('actividadesTableBody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error de conexión: ${error.message}</td></tr>`;
            }
        }
    }

    /**
     * Renderiza la tabla de actividades
     * @param {Array} actividades - Lista de actividades
     */
    function renderActividades(actividades) {
        const tbody = document.getElementById('actividadesTableBody');

        if (actividades.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay actividades registradas</td></tr>';
            return;
        }

        tbody.innerHTML = actividades.map(a => `
            <tr>
                <td>${formatDate(a.fecha)}</td>
                <td>${a.nombre}</td>
                <td>${a.responsable}</td>
                <td>${formatCurrency(a.monto_generado)}</td>
                <td>
                    <span class="badge ${a.estado === 'FINALIZADA' ? 'badge-success' : 'badge-warning'}">
                        ${a.estado}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    // ==========================================
    // 6. GESTIÓN DE PRÉSTAMOS
    // ==========================================

    /**
     * Carga la lista de préstamos
     */
    async function loadPrestamos() {
        try {
            const tbody = document.getElementById('prestamosTableBody');
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Cargando préstamos...</td></tr>';

            // Cargar participantes en el select primero
            await loadParticipantesSelect('prestamoParticipante');

            const response = await fetch(`${API_URL}?action=getPrestamos`);
            const result = await response.json();

            if (result.status === 'success') {
                renderPrestamos(result.data);
            } else {
                console.error('Error al cargar préstamos:', result.message);
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error: ${result.message}</td></tr>`;
            }

            // Configurar fechas
            const fechaInput = document.getElementById('prestamoFecha');
            if (fechaInput) {
                fechaInput.valueAsDate = new Date();
            }

        } catch (error) {
            console.error('Error al cargar préstamos:', error);
            const tbody = document.getElementById('prestamosTableBody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error de conexión: ${error.message}</td></tr>`;
            }
        }
    }

    /**
     * Renderiza la tabla de préstamos
     * @param {Array} prestamos - Lista de préstamos
     */
    function renderPrestamos(prestamos) {
        const tbody = document.getElementById('prestamosTableBody');

        if (prestamos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay préstamos registrados</td></tr>';
            return;
        }

        tbody.innerHTML = prestamos.map(p => `
            <tr>
                <td>${p.participante}</td>
                <td>${formatCurrency(p.monto_prestado)}</td>
                <td>${p.tasa_interes}%</td>
                <td>${formatDate(p.fecha_prestamo)}</td>
                <td>${formatDate(p.fecha_vencimiento)}</td>
                <td>${formatCurrency(p.interes_generado)}</td>
                <td>
                    <span class="badge ${getBadgeClass(p.estado)}">
                        ${p.estado}
                    </span>
                </td>
                <td class="table-actions">
                    ${p.estado !== 'PAGADO' ? `
                        <button class="btn btn-sm btn-success" onclick="liquidarPrestamoUI('${p.id}')" title="Pagar completo">💰 Pagar</button>
                        <button class="btn btn-sm btn-info" onclick="abrirModalVencimiento('${p.id}', '${p.fecha_vencimiento}')" title="Modificar fecha">📅</button>
                        <button class="btn btn-sm btn-whatsapp" onclick="enviarRecordatorioWhatsApp('${p.participante}', '${p.telefono}', '${p.monto_prestado}', '${p.interes_generado}', '${p.fecha_vencimiento}')" title="Recordatorio WhatsApp">📱</button>
                    ` : '<span class="text-muted">Liquidado</span>'}
                </td>
            </tr>
        `).join('');
    }

    // ==========================================
    // 7. FUNCIONES AUXILIARES
    // ==========================================

    /**
     * Carga participantes en un select
     * @param {string} selectId - ID del select
     */
    async function loadParticipantesSelect(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;

        try {
            // Mantener la opción por defecto mientras carga
            const defaultOption = '<option value="">Seleccione un participante</option>';
            select.innerHTML = '<option value="">Cargando...</option>';

            const response = await fetch(`${API_URL}?action=getParticipantes`);
            const result = await response.json();

            if (result.status === 'success') {
                select.innerHTML = defaultOption +
                    result.data.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
            } else {
                select.innerHTML = '<option value="">Error al cargar</option>';
                console.error('Error loading participants for select:', result.message);
            }

        } catch (error) {
            console.error('Error al cargar select participantes:', error);
            select.innerHTML = '<option value="">Error de conexión</option>';
        }
    }

    // ==========================================
    // 7.5 GESTIÓN DE LA POLLA LOCA
    // ==========================================

    /**
     * Carga los datos de la Polla Loca
     */
    async function loadPollaData() {
        const tbody = document.getElementById('pollaTableBody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Cargando datos de la polla...</td></tr>';

        try {
            // Cargar select de participantes para asignación
            loadParticipantesSelect('pollaAsignarParticipante');

            // Cargar datos reales desde el backend con anti-cache
            const response = await fetch(`${API_URL}?action=getPollaData&v=${new Date().getTime()}`);
            const result = await response.json();

            if (result.status === 'success') {
                const { numeros, sorteos } = result.data;

                // Mapear números asignados para fácil acceso
                const numMap = {};
                numeros.forEach(n => {
                    numMap[String(n.numero).padStart(2, '0')] = {
                        nombre: n.participante,
                        id: n.id_participante,
                        pagado: n.pagado === true || String(n.pagado).toUpperCase() === 'TRUE'
                    };
                });

                renderPollaTable(numMap);
                renderPollaHistory(sorteos);

                // Calcular bolsa (Solo los números pagados)
                const totalPagados = numeros.filter(n => n.pagado === true || String(n.pagado).toUpperCase() === 'TRUE').length;
                document.getElementById('pollaBolsa').textContent = formatCurrency(totalPagados * 10000);

                document.getElementById('pollaFecha').textContent = 'Próximo Viernes';
            } else {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${result.message}</td></tr>`;
            }

        } catch (error) {
            console.error('Error al cargar datos de la polla:', error);
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error de conexión</td></tr>';
        }
    }

    /**
     * Renderiza la tabla de la polla
     * @param {Array} data - Lista de números y asignaciones
     */
    function renderPollaTable(numMap) {
        const tbody = document.getElementById('pollaTableBody');
        if (!tbody) return;

        let html = '';
        for (let i = 0; i <= 99; i++) {
            const numStr = String(i).padStart(2, '0');
            const data = numMap[numStr];
            const participante = data ? data.nombre : null;
            const pagado = data ? data.pagado : false;

            html += `
                <tr>
                    <td><strong>${numStr}</strong></td>
                    <td>${participante || '<span class="text-muted">Libre</span>'}</td>
                    <td>
                        <span class="badge ${!participante ? 'badge-info' : (pagado ? 'badge-success' : 'badge-warning')}">
                            ${!participante ? 'DISPONIBLE' : (pagado ? 'PAGADO' : 'PENDIENTE')}
                        </span>
                    </td>
                    <td>
                        <div class="header-actions" style="justify-content: flex-start; gap: 5px;">
                            ${participante && !pagado ?
                    `<button class="btn btn-sm btn-success" onclick="marcarPagoPolla('${data.id}', '${numStr}', true)" title="Marcar como pagado">
                                    💰 Pagar
                                </button>` : ''
                }
                            ${participante && pagado ?
                    `<button class="btn btn-sm btn-warning" onclick="marcarPagoPolla('${data.id}', '${numStr}', false)" title="Anular pago">
                                    ↩️ Devolver
                                </button>` : ''
                }
                            <button class="btn btn-sm ${participante ? 'btn-secondary' : 'btn-primary'}" 
                                    onclick="abrirAsignarPolla(${i})">
                                ${participante ? 'Cambiar' : 'Asignar'}
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
        tbody.innerHTML = html;
    }

    /**
     * Renderiza el historial de sorteos
     * @param {Array} sorteos - Lista de sorteos realizados
     */
    async function renderPollaHistory(sorteos) {
        const tbody = document.getElementById('pollaHistoryBody');
        if (!tbody) return;

        if (!sorteos || sorteos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay sorteos registrados aún</td></tr>';
            return;
        }

        // Obtener participantes para buscar nombres de ganadores
        const resParticipantes = await fetch(`${API_URL}?action=getParticipantes`);
        const resultP = await resParticipantes.json();
        const pMap = {};
        if (resultP.status === 'success') {
            resultP.data.forEach(p => pMap[p.id] = p.nombre);
        }

        tbody.innerHTML = sorteos.reverse().map(s => {
            const ganador = s.id_ganador === 'ACUMULADO' ? '<span class="badge badge-info">ACUMULADO</span>' :
                (pMap[s.id_ganador] || 'Desconocido');

            return `
                <tr>
                    <td>${formatDate(s.fecha)}</td>
                    <td><strong class="text-primary">${s.numero_ganador}</strong></td>
                    <td>${ganador}</td>
                    <td>${formatCurrency(s.monto_total)}</td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Formatea un número como moneda colombiana
     * @param {number} amount - Cantidad a formatear
     * @returns {string} Cantidad formateada
     */
    function formatCurrency(amount) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount);
    }

    /**
     * Formatea una fecha
     * @param {string} dateString - Fecha en formato string
     * @returns {string} Fecha formateada
     */
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-CO');
    }

    /**
     * Obtiene la clase de badge según el estado
     * @param {string} estado - Estado del préstamo
     * @returns {string} Clase CSS
     */
    function getBadgeClass(estado) {
        const classes = {
            'ACTIVO': 'badge-info',
            'PAGADO': 'badge-success',
            'VENCIDO': 'badge-danger'
        };
        return classes[estado] || 'badge-info';
    }

    // ==========================================
    // 8. MANEJO DE FORMULARIOS
    // ==========================================

    /**
     * Carga y aplica la configuración global
     */
    async function loadGlobalConfig() {
        try {
            const response = await fetch(`${API_URL}?action=getConfig`);
            const result = await response.json();
            if (result.status === 'success') {
                GLOBAL_CONFIG = result.data;
                // Rellenar formulario de ajustes
                const inputMin = document.getElementById('configAporteMinimo');
                const inputMora = document.getElementById('configMoraDiaria');
                const inputDias = document.getElementById('configDiasPago');

                if (inputMin) inputMin.value = GLOBAL_CONFIG.APORTE_MINIMO;
                if (inputMora) inputMora.value = GLOBAL_CONFIG.MORA_DIARIA;
                if (inputDias) inputDias.value = GLOBAL_CONFIG.DIAS_PAGO;

                console.log('Configuración global cargada:', GLOBAL_CONFIG);
            }
        } catch (error) {
            console.error('Error al cargar configuración:', error);
        }
    }

    /**
     * Maneja el envío del formulario de configuración
     */
    async function handleConfigSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('btnGuardarConfig');
        btn.disabled = true;
        btn.textContent = 'Guardando...';

        const data = {
            action: 'updateConfig',
            APORTE_MINIMO: document.getElementById('configAporteMinimo').value,
            MORA_DIARIA: document.getElementById('configMoraDiaria').value,
            DIAS_PAGO: document.getElementById('configDiasPago').value
        };

        try {
            const result = await sendDataToBackend(data);
            if (result.status === 'success') {
                alert('✅ Configuración actualizada globalmente');
                GLOBAL_CONFIG.APORTE_MINIMO = data.APORTE_MINIMO;
                GLOBAL_CONFIG.MORA_DIARIA = data.MORA_DIARIA;
                GLOBAL_CONFIG.DIAS_PAGO = data.DIAS_PAGO;
                loadDashboardData(); // Refrescar por si acaso
            } else {
                alert('❌ ' + result.message);
            }
        } catch (error) {
            console.error('Error al actualizar config:', error);
            alert('❌ Error de conexión');
        } finally {
            btn.disabled = false;
            btn.textContent = '💾 Guardar Configuración';
        }
    }

    /**
     * Configura los manejadores de formularios
     */
    function setupForms() {
        // Formulario de Ajustes Globales
        const configForm = document.getElementById('formConfigGlobal');
        if (configForm) configForm.addEventListener('submit', handleConfigSubmit);

        // Gestión de Participantes
        const btnAgregarP = document.getElementById('btnAgregarParticipante');
        const btnCancelarP = document.getElementById('btnCancelarParticipante');
        const formP = document.getElementById('participanteForm');
        const cardP = document.getElementById('participanteFormCard');

        if (btnAgregarP) {
            btnAgregarP.addEventListener('click', () => {
                formP.reset();
                document.getElementById('editParticipanteId').value = '';
                document.getElementById('participanteFormTitle').innerHTML = '<i class="fas fa-user-plus"></i> Nuevo Participante';
                document.getElementById('btnGuardarParticipante').textContent = '💾 Guardar Participante';
                cardP.style.display = 'block';
                cardP.scrollIntoView({ behavior: 'smooth' });
            });
        }

        if (btnCancelarP) {
            btnCancelarP.addEventListener('click', () => {
                formP.reset();
                cardP.style.display = 'none';
            });
        }

        if (formP) formP.addEventListener('submit', handleParticipanteSubmit);
        // Formulario de aportes
        const aporteForm = document.getElementById('aporteForm');
        if (aporteForm) {
            aporteForm.addEventListener('submit', handleAporteSubmit);
        }

        // Formulario de actividades
        const actividadForm = document.getElementById('actividadForm');
        if (actividadForm) {
            actividadForm.addEventListener('submit', handleActividadSubmit);
        }

        // Formulario de préstamos
        const prestamoForm = document.getElementById('prestamoForm');
        if (prestamoForm) {
            prestamoForm.addEventListener('submit', handlePrestamoSubmit);
        }

        // Formulario de usuarios (Solo Admin)
        const usuarioForm = document.getElementById('usuarioForm');
        if (usuarioForm) {
            usuarioForm.addEventListener('submit', handleUsuarioSubmit);
        }

        // === GESTIÓN DE LA POLLA LOCA ===
        const btnSorteoPolla = document.getElementById('btnSorteoPolla');
        const btnAsignarPolla = document.getElementById('btnAsignarPolla');
        const modalPollaSorteo = document.getElementById('modalPollaSorteo');
        const modalPollaNumeros = document.getElementById('modalPollaNumeros');
        const formPollaSorteo = document.getElementById('formPollaSorteo');
        const formPollaAsignar = document.getElementById('formPollaAsignar');

        if (btnSorteoPolla) {
            btnSorteoPolla.addEventListener('click', () => {
                modalPollaSorteo.style.display = 'flex';
                document.getElementById('pollaSorteoFecha').valueAsDate = new Date();
            });
        }

        if (btnAsignarPolla) {
            btnAsignarPolla.addEventListener('click', () => {
                modalPollaNumeros.style.display = 'flex';
                loadParticipantesSelect('pollaAsignarParticipante');
            });
        }

        if (formPollaSorteo) {
            formPollaSorteo.addEventListener('submit', handlePollaSorteoSubmit);
        }

        if (formPollaAsignar) {
            formPollaAsignar.addEventListener('submit', handlePollaAsignarSubmit);
        }

        const btnNotificarPolla = document.getElementById('btnNotificarPolla');
        if (btnNotificarPolla) {
            btnNotificarPolla.addEventListener('click', enviarNotificacionMasivaPolla);
        }

        // Formulario Modificar Vencimiento
        const formModificarVencimiento = document.getElementById('formModificarVencimiento');
        if (formModificarVencimiento) {
            formModificarVencimiento.addEventListener('submit', handleModificarVencimientoSubmit);
        }

        // Cerrar Modales (Genérico)
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                const modales = ['modalCiclo', 'modalPollaSorteo', 'modalPollaNumeros', 'modalModificarVencimiento'];
                modales.forEach(id => {
                    const m = document.getElementById(id);
                    if (m) m.style.display = 'none';
                });
                const mCiclo = document.getElementById('modalCiclo');
                if (mCiclo) mCiclo.style.display = 'none';
            });
        });

        // Elementos Ciclo y Dashboard
        noCicloAlert = document.getElementById('noCicloAlert');
        const btnActualizarDashboard = document.getElementById('btnActualizarDashboard');
        const btnGestionarCiclo = document.getElementById('btnGestionarCiclo');
        const modalCiclo = document.getElementById('modalCiclo');
        const viewCrearCiclo = document.getElementById('viewCrearCiclo');
        const viewCerrarCiclo = document.getElementById('viewCerrarCiclo');
        const formNuevoCiclo = document.getElementById('formNuevoCiclo');
        const btnConfirmarCierre = document.getElementById('btnConfirmarCierre');
        const linkCrearCiclo = document.getElementById('linkCrearCiclo');

        if (btnActualizarDashboard) btnActualizarDashboard.addEventListener('click', loadDashboardData);

        if (btnGestionarCiclo && modalCiclo) {
            btnGestionarCiclo.addEventListener('click', () => {
                modalCiclo.style.display = 'flex';
                if (cicloActivoGlobal && cicloActivoGlobal !== 'Sin Ciclo Activo' && cicloActivoGlobal !== 'INACTIVO') {
                    if (viewCrearCiclo) viewCrearCiclo.style.display = 'none';
                    if (viewCerrarCiclo) viewCerrarCiclo.style.display = 'block';
                    const elRecaudado = document.getElementById('totalRecaudado');
                    const elGanancias = document.getElementById('totalGanancias');
                    const mRecaudado = document.getElementById('modalCierreRecaudado');
                    const mGanancias = document.getElementById('modalCierreGanancias');
                    if (elRecaudado && mRecaudado) mRecaudado.textContent = elRecaudado.textContent;
                    if (elGanancias && mGanancias) mGanancias.textContent = elGanancias.textContent;
                } else {
                    if (viewCrearCiclo) viewCrearCiclo.style.display = 'block';
                    if (viewCerrarCiclo) viewCerrarCiclo.style.display = 'none';
                    const cicInicio = document.getElementById('cicloInicio');
                    if (cicInicio) cicInicio.valueAsDate = new Date();
                }
            });
        }

        if (linkCrearCiclo) {
            linkCrearCiclo.addEventListener('click', (e) => {
                e.preventDefault();
                if (btnGestionarCiclo) btnGestionarCiclo.click();
            });
        }

        if (btnConfirmarCierre) {
            btnConfirmarCierre.addEventListener('click', async () => {
                if (!confirm('⚠️ ¿Estás seguro de CERRAR el ciclo actual?')) return;
                const result = await sendDataToBackend({ action: 'cerrarCiclo' });
                if (result.status === 'success') {
                    alert('✅ Ciclo cerrado');
                    if (modalCiclo) modalCiclo.style.display = 'none';
                    loadDashboardData();
                }
            });
        }

        // Crear Ciclo
        if (formNuevoCiclo) {
            formNuevoCiclo.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!confirm('¿Estás seguro de iniciar este nuevo ciclo?')) return;

                const datos = {
                    action: 'crearCiclo',
                    nombre: document.getElementById('cicloNombre').value,
                    fecha_inicio: document.getElementById('cicloInicio').value,
                    fecha_cierre: document.getElementById('cicloCierre').value
                };

                const result = await sendDataToBackend(datos);
                if (result.status === 'success') {
                    alert('✅ Ciclo iniciado correctamente');
                    modalCiclo.style.display = 'none';
                    loadDashboardData();
                } else {
                    alert('❌ Error: ' + result.message);
                }
            });
        }


        // === GESTIÓN DE PARTICIPANTES ===

        // Cambio de descripción según frecuencia
        const selectFrecuencia = document.getElementById('participanteFrecuencia');
        const inputConfig = document.getElementById('participanteConfigPago');
        const descConfig = document.getElementById('configPagoDesc');

        if (selectFrecuencia) {
            selectFrecuencia.addEventListener('change', function () {
                const valor = this.value;
                if (valor === 'MENSUAL') {
                    inputConfig.placeholder = '15';
                    descConfig.textContent = 'Día del mes (1-31). Ejemplo: 15';
                } else if (valor === 'QUINCENAL') {
                    inputConfig.placeholder = '5, 20';
                    descConfig.textContent = 'Días del mes separados por coma. Ejemplo: 5, 20';
                } else if (valor === 'SEMANAL') {
                    inputConfig.placeholder = '1';
                    descConfig.textContent = 'Día de la semana (0=Dom, 1=Lun, ..., 6=Sab). Ejemplo: 1';
                }
            });
        }
    }

    /**
     * Maneja el envío del formulario de participantes
     */
    async function handleParticipanteSubmit(e) {
        e.preventDefault();
        const editId = document.getElementById('editParticipanteId').value;
        const submitBtn = document.getElementById('btnGuardarParticipante');
        const originalText = submitBtn.textContent;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        try {
            const data = {
                action: editId ? 'actualizarParticipante' : 'agregarParticipante',
                id: editId || undefined,
                nombre: document.getElementById('participanteNombre').value.trim(),
                cedula: document.getElementById('participanteCedula').value.trim(),
                telefono: document.getElementById('participanteTelefono').value.trim(),
                email: document.getElementById('participanteEmail').value.trim(),
                frecuencia_pago: document.getElementById('participanteFrecuencia').value,
                config_pago: document.getElementById('participanteConfigPago').value.trim()
            };

            const result = await sendDataToBackend(data);

            if (result.status === 'success') {
                alert('✅ ' + (editId ? 'Participante actualizado' : 'Participante agregado'));
                e.target.reset();
                document.getElementById('editParticipanteId').value = '';
                document.getElementById('participanteFormCard').style.display = 'none';
                loadParticipantes();
            } else {
                alert('❌ Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error al guardar participante:', error);
            alert('❌ Error de conexión');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    /**
     * Abre el formulario para editar un participante
     */
    window.abrirEditarParticipante = async function (id) {
        try {
            const response = await fetch(`${API_URL}?action=getParticipantes`);
            const result = await response.json();

            if (result.status === 'success') {
                const p = result.data.find(item => item.id === id);
                if (!p) {
                    alert('No se encontró el participante');
                    return;
                }

                // Llenar formulario
                document.getElementById('editParticipanteId').value = p.id;
                document.getElementById('participanteNombre').value = p.nombre;
                document.getElementById('participanteCedula').value = p.cedula;
                document.getElementById('participanteTelefono').value = p.telefono;
                document.getElementById('participanteEmail').value = p.email || '';
                document.getElementById('participanteFrecuencia').value = p.frecuencia_pago || 'MENSUAL';
                document.getElementById('participanteConfigPago').value = p.config_pago || '15';

                // Disparar evento de cambio para actualizar la descripción
                document.getElementById('participanteFrecuencia').dispatchEvent(new Event('change'));

                // Cambiar UI
                document.getElementById('participanteFormTitle').innerHTML = '<i class="fas fa-user-edit"></i> Editar Participante';
                document.getElementById('btnGuardarParticipante').textContent = '💾 Actualizar Datos';

                // Mostrar formulario
                const formCard = document.getElementById('participanteFormCard');
                formCard.style.display = 'block';
                formCard.scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Error al cargar participante:', error);
            alert('Error al obtener datos');
        }
    };

    /**
     * Maneja el envío del formulario de aportes
     */
    async function handleAporteSubmit(e) {
        e.preventDefault();

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registrando...';

        try {
            const data = {
                action: 'agregarAporte',
                participante_id: document.getElementById('aporteParticipante').value,
                monto: document.getElementById('aporteMonto').value,
                fecha: document.getElementById('aporteFecha').value,
                concepto: document.getElementById('aporteConcepto').value.trim(),
                monto_mora: document.getElementById('aporteMora').value || 0,
                dias_retraso: document.getElementById('labelDiasRetraso').textContent.split(' ')[0] || 0,
                comprobante: ''
            };

            // Validación de Aporte Mínimo Global
            if (Number(data.monto) < Number(GLOBAL_CONFIG.APORTE_MINIMO)) {
                if (!confirm(`⚠️ El monto es inferior al aporte mínimo global (${formatCurrency(GLOBAL_CONFIG.APORTE_MINIMO)}). ¿Deseas continuar de todas formas?`)) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Registrar Aporte';
                    return;
                }
            }

            // Validaciones básicas
            if (!data.participante_id || !data.monto || !data.fecha || !data.concepto) {
                alert('Por favor complete todos los campos obligatorios');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Registrar Aporte';
                return;
            }

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.status === 'success') {
                alert('✅ ' + result.message);

                // Sugerir envío por WhatsApp
                if (confirm('¿Deseas enviar el comprobante por WhatsApp al participante?')) {
                    const pSelect = document.getElementById('aporteParticipante');
                    const nombre = pSelect.options[pSelect.selectedIndex].text;
                    const fecha = document.getElementById('aporteFecha').value;
                    const monto = document.getElementById('aporteMonto').value;
                    const mora = document.getElementById('aporteMora').value;
                    const concepto = document.getElementById('aporteConcepto').value;

                    // Buscar el teléfono en los participantes cargados
                    try {
                        const responseP = await fetch(`${API_URL}?action=getParticipantes`);
                        const resultP = await responseP.json();
                        const socio = resultP.data.find(p => p.id === data.participante_id);

                        if (socio && socio.telefono) {
                            enviarComprobanteAporte(nombre, socio.telefono, fecha, monto, mora, concepto);
                        } else {
                            alert('No se encontró el teléfono del participante.');
                        }
                    } catch (e) {
                        console.error('Error al obtener teléfono para WhatsApp:', e);
                    }
                }

                e.target.reset();

                // Recalcular ganancias automáticamente al ingresar dinero
                if (typeof window.recalcularGananciasManual === 'function') {
                    window.recalcularGananciasManual(true);
                }

                loadAportes(); // Recargar la lista
                loadParticipantes(); // Para actualizar totales
            } else {
                alert('❌ ' + result.message);
            }

        } catch (error) {
            console.error('Error al registrar aporte:', error);
            alert('❌ Error de conexión: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Registrar Aporte';
        }
    }

    /**
     * Maneja el envío del formulario de actividades
     */
    async function handleActividadSubmit(e) {
        e.preventDefault();

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registrando...';

        try {
            const data = {
                action: 'agregarActividad',
                nombre: document.getElementById('actividadNombre').value.trim(),
                monto_generado: document.getElementById('actividadMonto').value,
                fecha: document.getElementById('actividadFecha').value,
                responsable: document.getElementById('actividadResponsable').value.trim(),
                descripcion: document.getElementById('actividadDescripcion').value.trim()
            };

            // Validaciones básicas
            if (!data.nombre || !data.monto_generado || !data.fecha || !data.responsable) {
                alert('Por favor complete todos los campos obligatorios');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Registrar Actividad';
                return;
            }

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.status === 'success') {
                alert('✅ Actividad registrada exitosamente');
                e.target.reset();
                document.getElementById('actividadFecha').valueAsDate = new Date(); // Reset fecha
                loadActividades(); // Recargar la lista
            } else {
                alert('❌ Error: ' + result.message);
            }

        } catch (error) {
            console.error('Error al registrar actividad:', error);
            alert('❌ Error de conexión: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Registrar Actividad';
        }
    }

    /**
     * Maneja el envío del formulario de préstamos
     */
    async function handlePrestamoSubmit(e) {
        e.preventDefault();

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registrando...';

        try {
            const data = {
                action: 'agregarPrestamo',
                participante_id: document.getElementById('prestamoParticipante').value,
                monto_prestado: document.getElementById('prestamoMonto').value,
                tasa_interes: document.getElementById('prestamoTasa').value,
                fecha_prestamo: document.getElementById('prestamoFecha').value,
                fecha_vencimiento: document.getElementById('prestamoVencimiento').value
            };

            // Validaciones básicas
            if (!data.participante_id || !data.monto_prestado || !data.tasa_interes || !data.fecha_prestamo || !data.fecha_vencimiento) {
                alert('Por favor complete todos los campos obligatorios');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Crear Préstamo';
                return;
            }

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.status === 'success') {
                alert(`✅ Préstamo creado exitosamente!\n\nInterés Generado: ${formatCurrency(result.interes_calculado)}\nTotal a Pagar: ${formatCurrency(result.saldo_total)}`);
                e.target.reset();

                // Reset fechas
                const fechaInput = document.getElementById('prestamoFecha');
                if (fechaInput) fechaInput.valueAsDate = new Date();

                const vencimientoInput = document.getElementById('prestamoVencimiento');
                if (vencimientoInput) {
                    const nextMonth = new Date();
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    vencimientoInput.valueAsDate = nextMonth;
                }

                loadPrestamos(); // Recargar la lista
            } else {
                alert('❌ Error: ' + result.message);
            }

        } catch (error) {
            console.error('Error al crear préstamo:', error);
            alert('❌ Error de conexión: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Crear Préstamo';
        }
    }

    /**
     * Maneja el envío del formulario de usuarios
     */
    async function handleUsuarioSubmit(e) {
        e.preventDefault();

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creando...';

        try {
            const data = {
                action: 'agregarUsuario',
                nombre: document.getElementById('usuarioNombre').value,
                email: document.getElementById('usuarioEmail').value,
                password: document.getElementById('usuarioPass').value,
                rol: document.getElementById('usuarioRol').value
            };

            // Validaciones básicas
            if (!data.nombre || !data.email || !data.password || !data.rol) {
                alert('Por favor complete todos los campos obligatorios');
                submitBtn.disabled = false;
                submitBtn.textContent = '➕ Crear Usuario';
                return;
            }

            const result = await sendDataToBackend(data);

            if (result.status === 'success') {
                alert('✅ Usuario creado exitosamente');
                e.target.reset();
                loadUsuarios(); // Recargar la lista
            } else {
                alert('❌ Error: ' + result.message);
            }

        } catch (error) {
            console.error('Error al crear usuario:', error);
            alert('❌ Error de conexión: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '➕ Crear Usuario';
        }
    }

    /**
     * Carga la lista de usuarios del sistema
     */
    async function loadUsuarios() {
        const tbody = document.getElementById('usuariosTableBody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Cargando usuarios...</td></tr>';

        try {
            const response = await fetch(`${API_URL}?action=getUsuarios`);
            const result = await response.json();

            if (result.status === 'success') {
                renderUsuarios(result.data);
            } else {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${result.message}</td></tr>`;
            }
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error de conexión</td></tr>';
        }
    }

    /**
     * Renderiza la tabla de usuarios
     * @param {Array} usuarios - Lista de usuarios
     */
    function renderUsuarios(usuarios) {
        const tbody = document.getElementById('usuariosTableBody');
        if (!tbody) return;

        if (!usuarios || usuarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay usuarios registrados</td></tr>';
            return;
        }

        tbody.innerHTML = usuarios.map(u => `
            <tr>
                <td>${u.nombre || 'N/A'}</td>
                <td>${u.email}</td>
                <td><span class="badge ${u.rol === 'admin' ? 'badge-info' : 'badge-success'}">${u.rol.toUpperCase()}</span></td>
                <td>${formatDate(u.created_at)}</td>
                <td class="table-actions">
                    ${u.email !== 'admin@natillera.com' ? `
                        <button class="btn btn-sm btn-danger" onclick="eliminarUsuarioUI('${u.id}', '${u.nombre}')">Eliminar</button>
                    ` : '<span class="text-muted">Protegido</span>'}
                </td>
            </tr>
        `).join('');
    }

    /**
     * Maneja el envío del formulario para modificar vencimiento
     */
    async function handleModificarVencimientoSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('editVencimientoId').value;
        const nuevaFecha = document.getElementById('nuevaFechaVencimiento').value;

        try {
            const result = await sendDataToBackend({
                action: 'modificarVencimientoPrestamo',
                id,
                nuevaFecha
            });

            if (result.status === 'success') {
                alert('✅ Fecha actualizada correctamente');
                document.getElementById('modalModificarVencimiento').style.display = 'none';
                loadPrestamos();
            } else {
                alert('❌ Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error al modificar vencimiento:', error);
        }
    }

    // ==========================================
    // 9. FUNCIONES GLOBALES (Exponer a window)
    // ==========================================

    window.abrirModalVencimiento = function (id, fechaActual) {
        document.getElementById('editVencimientoId').value = id;
        // La fecha llega como string de Excel/Google, formatear para input date
        const d = new Date(fechaActual);
        const dateStr = d.toISOString().split('T')[0];
        document.getElementById('nuevaFechaVencimiento').value = dateStr;
        document.getElementById('modalModificarVencimiento').style.display = 'flex';
    };

    window.liquidarPrestamoUI = async function (id) {
        if (!confirm('¿Confirmas que el participante ha pagado el TOTAL del préstamo (Monto + Interés)?')) return;

        try {
            const result = await sendDataToBackend({
                action: 'registrarPagoPrestamo',
                id: id
            });

            if (result.status === 'success') {
                alert('✅ ' + result.message);

                // Recargar datos
                loadPrestamos();
                loadDashboardData(); // Para ver el cambio en ganancias inmediatamente

                // Recalcular ganancias manual si existe la función
                if (typeof window.recalcularGananciasManual === 'function') {
                    window.recalcularGananciasManual(true);
                }
            } else {
                alert('❌ Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error al registrar pago:', error);
            alert('❌ Error de conexión al registrar pago');
        }
    };

    window.enviarRecordatorioWhatsApp = function (nombre, telefono, monto, interes, vencimiento) {
        if (!telefono) {
            alert('El participante no tiene un teléfono registrado.');
            return;
        }

        const total = Number(monto) + Number(interes);
        const fecha = new Date(vencimiento).toLocaleDateString();

        const mensaje = encodeURIComponent(
            `Hola ${nombre}, 👋 Te recordamos de tu préstamo en la Natillera.\n\n` +
            `💰 *Monto:* ${formatCurrency(monto)}\n` +
            `📈 *Interés:* ${formatCurrency(interes)}\n` +
            `💵 *Total a pagar:* ${formatCurrency(total)}\n` +
            `📅 *Vencimiento:* ${fecha}\n\n` +
            `Por favor, tenlo presente para evitar vencimientos. ¡Gracias! 😊`
        );

        // Limpiar el teléfono (solo dejar números)
        const telLimpio = telefono.replace(/\D/g, '');
        // Agregar código de país si no lo tiene (asumiendo Colombia +57 si tiene 10 dígitos)
        const telFinal = telLimpio.length === 10 ? '57' + telLimpio : telLimpio;

        window.open(`https://wa.me/${telFinal}?text=${mensaje}`, '_blank');
    };

    // ==========================================
    // 10. INICIALIZACIÓN
    // ==========================================


    // Exponer funciones necesarias globalmente
    window.NatilleraApp = {
        loadDashboardData,
        loadParticipantes,
        loadAportes,
        loadActividades,
        loadPrestamos
    };

    // ==========================================
    // FUNCIONES GLOBALES (ACCIONES)
    // ==========================================

    /**
     * Gestiona el estado de un participante (Liquidar/Eliminar/Activar)
     */
    window.gestionarParticipanteState = async function (id, accion, nombre, totalAportado = 0, ganancias = 0) {
        let mensajeConfirmacion = '';

        if (accion === 'LIQUIDAR') {
            const total = Number(totalAportado) + Number(ganancias);
            mensajeConfirmacion = `¿Estás seguro de LIQUIDAR a ${nombre}?\n\n` +
                `Se le debe entregar: ${formatCurrency(total)}\n` +
                `(Aportes: ${formatCurrency(totalAportado)} + Ganancias: ${formatCurrency(ganancias)})\n\n` +
                `Esta acción lo marcará como INACTIVO.`;
        } else if (accion === 'ELIMINAR') {
            mensajeConfirmacion = `⚠️ PELIGRO ⚠️\n\n¿Estás seguro de ELIMINAR definitivamente a ${nombre}?\n` +
                `Esta acción no se puede deshacer y borrará su historial.`;
        } else if (accion === 'ACTIVAR') {
            mensajeConfirmacion = `¿Deseas REACTIVAR a ${nombre}?`;
        }

        if (!confirm(mensajeConfirmacion)) return;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'gestionarParticipante',
                    id: id,
                    tipoAccion: accion
                })
            });

            const result = await response.json();

            if (result.status === 'success') {
                alert(`✅ ${result.message}`);

                // Si es liquidación, generar recibo PDF
                if (accion === 'LIQUIDAR') {
                    generarReciboLiquidacion({
                        nombre: nombre,
                        cedula: '', // Idealmente vendría del backend, pero usaremos nombre por ahora
                        fecha: new Date(),
                        totalAportado: Number(totalAportado),
                        ganancias: Number(ganancias),
                        totalPagar: Number(totalAportado) + Number(ganancias)
                    });
                }

                // Recargar para ver cambios
                loadParticipantes();
            } else {
                alert(`❌ Error: ${result.message}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión');
        }
    };

    /**
     * Elimina un usuario del sistema (UI Wrapper)
     */
    window.eliminarUsuarioUI = async function (id, nombre) {
        if (!confirm(`¿Estás seguro de que deseas eliminar al usuario ${nombre}?`)) return;

        try {
            const result = await sendDataToBackend({
                action: 'eliminarUsuario',
                id: id
            });

            if (result.status === 'success') {
                alert('✅ Usuario eliminado correctamente');
                loadUsuarios();
            } else {
                alert('❌ Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            alert('Error de conexión');
        }
    };

    /**
     * Genera un recibo de liquidación en PDF
     */
    /**
     * Genera un recibo de liquidación usando el servicio Python local
     */
    /**
     * Genera un reporte de liquidación en Excel
     */
    function generarReciboLiquidacion(datos) {
        if (typeof XLSX === 'undefined') {
            alert('Error: Librería Excel no cargada. Intenta recargar la página.');
            return;
        }

        // Crear datos para el Excel
        // Usamos un array de arrays para controlar la posición exacta de cada celda
        const data = [
            ["NATILLERA COMUNITARIA"],
            ["COMPROBANTE DE LIQUIDACIÓN"],
            [],
            ["Fecha:", formatDate(datos.fecha)],
            ["Participante:", datos.nombre],
            ["Cédula:", datos.cedula || ''],
            [],
            ["CONCEPTOS", "VALOR"], // Encabezados de tabla
            ["Total Aportado", datos.totalAportado],
            ["Ganancias Acumuladas", datos.ganancias],
            [],
            ["TOTAL A ENTREGAR", datos.totalPagar],
            [],
            [],
            ["_______________________", "_______________________"],
            ["Firma Tesorero", "Firma Participante"]
        ];

        // Crear libro y hoja
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);

        // Ajustar anchos de columna (opcional pero recomendado)
        ws['!cols'] = [{ wch: 25 }, { wch: 20 }];

        // Agregar hoja al libro
        XLSX.utils.book_append_sheet(wb, ws, "Liquidación");

        // Generar nombre de archivo
        const filename = `Liquidacion_${datos.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

        // Descargar archivo
        XLSX.writeFile(wb, filename);

        alert('✅ Archivo de liquidación (Excel) generado correctamente.');
    }



    /**
     * Recalcula las ganancias manualmente
     */
    /**
     * Envía datos al backend (POST) de forma genérica
     * @param {Object} data - Objeto con action y datos
     * @returns {Object} Respuesta del servidor
     */
    async function sendDataToBackend(data) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error('Error en sendDataToBackend:', error);
            return { status: 'error', message: 'Error de conexión con el servidor' };
        }
    }

    /**
     * Inicializa y carga el gráfico de ganancias
     */
    let myChart = null;
    async function initGananciasChart() {
        const canvas = document.getElementById('gananciasChart');
        if (!canvas) {
            console.warn('Canvas "gananciasChart" no encontrado.');
            return;
        }

        // Verificar si Chart.js está cargado
        if (typeof Chart === 'undefined') {
            console.error('Librería Chart.js no cargada.');
            canvas.parentElement.innerHTML = '<p class="text-center text-danger">Error: Librería de gráficos no cargada</p>';
            return;
        }

        const ctx = canvas.getContext('2d');

        try {
            console.log('Solicitando historial de ciclos...');
            const response = await fetch(`${API_URL}?action=getHistorialCiclos`);
            const result = await response.json();

            console.log('Respuesta historial:', result);

            if (result.status === 'success' && result.data) {
                // Filtrar solo ciclos con ganancias o el ciclo activo
                const data = result.data.filter(c => Number(c.total_ganancias) > 0 || String(c.estado).toUpperCase() === 'ACTIVO');

                if (data.length === 0) {
                    console.log('No hay datos suficientes para el gráfico.');
                    return;
                }

                const labels = data.map(c => c.nombre || 'Sin Nombre');
                const values = data.map(c => Number(c.total_ganancias || 0));

                if (myChart) {
                    myChart.destroy();
                }

                const isDark = document.body.classList.contains('dark-theme');
                const textColor = isDark ? '#e9ecef' : '#343a40';
                const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

                myChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Ganancias (COP)',
                            data: values,
                            backgroundColor: isDark ? 'rgba(52, 152, 219, 0.5)' : 'rgba(52, 152, 219, 0.7)',
                            borderColor: 'rgba(52, 152, 219, 1)',
                            borderWidth: 2,
                            borderRadius: 5,
                            hoverBackgroundColor: 'rgba(52, 152, 219, 0.9)'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false,
                                labels: { color: textColor }
                            },
                            tooltip: {
                                backgroundColor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(0,0,0,0.8)',
                                titleFont: { size: 14 },
                                bodyFont: { size: 14 },
                                callbacks: {
                                    label: function (context) {
                                        return 'Ganancia: ' + formatCurrency(context.raw);
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: { color: gridColor },
                                ticks: {
                                    color: textColor,
                                    font: { size: 12 },
                                    callback: function (value) {
                                        return formatCurrency(value);
                                    }
                                }
                            },
                            x: {
                                grid: { display: false },
                                ticks: {
                                    color: textColor,
                                    font: { size: 12 }
                                }
                            }
                        }
                    }
                });
                console.log('Gráfico renderizado correctamente.');
            } else {
                console.error('Error en respuesta API:', result.message);
            }
        } catch (error) {
            console.error('Error al inicializar gráfico:', error);
        }
    }

    window.recalcularGananciasManual = async function (silencioso = false) {
        if (!silencioso && !confirm('¿Deseas recalcular la distribución de ganancias ahora?')) return;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'recalcularGanancias' })
            });

            const result = await response.json();

            if (result.status === 'success') {
                if (!silencioso) {
                    const data = result.data;
                    alert(`✅ Ganancias Actualizadas\n\n` +
                        `Intereses: ${formatCurrency(data.totalIntereses)}\n` +
                        `Actividades: ${formatCurrency(data.totalActividades)}\n` +
                        `Total a Repartir: ${formatCurrency(data.gananciaTotal)}\n` +
                        `Participantes Activos: ${data.participantesActivos}\n` +
                        `--------------------------------\n` +
                        `Ganancia por Persona: ${formatCurrency(data.gananciaPorPersona)}`);
                }
                loadParticipantes();
                initGananciasChart(); // Refrescar gráfico
            } else {
                if (!silencioso) alert(`❌ Error: ${result.message}`);
            }
        } catch (error) {
            console.error('Error:', error);
            if (!silencioso) alert('Error de conexión');
        }
    };

    /**
     * Maneja el envío del resultado del sorteo de la Polla
     */
    async function handlePollaSorteoSubmit(e) {
        e.preventDefault();
        const fecha = document.getElementById('pollaSorteoFecha').value;
        const numero = document.getElementById('pollaSorteoNumero').value;

        if (!fecha || numero === '') {
            alert('Por favor complete todos los campos');
            return;
        }

        if (numero < 0 || numero > 99) {
            alert('El número debe estar entre 00 y 99');
            return;
        }

        try {
            const result = await sendDataToBackend({
                action: 'registrarSorteoPolla',
                fecha: fecha,
                numero: numero
            });

            if (result.status === 'success') {
                alert('🏆 ' + result.message);
                document.getElementById('modalPollaSorteo').style.display = 'none';
                loadPollaData();
            } else {
                alert('❌ Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error al registrar sorteo:', error);
            alert('Error de conexión');
        }
    }

    /**
     * Maneja la asignación de un número de la Polla
     */
    async function handlePollaAsignarSubmit(e) {
        e.preventDefault();
        const participanteId = document.getElementById('pollaAsignarParticipante').value;
        const numero = document.getElementById('pollaAsignarNumero').value;

        if (!participanteId || numero === '') {
            alert('Por favor complete todos los campos');
            return;
        }

        try {
            const result = await sendDataToBackend({
                action: 'asignarNumeroPolla',
                participante_id: participanteId,
                numero: numero
            });

            if (result.status === 'success') {
                alert('✅ Número asignado correctamente');
                document.getElementById('modalPollaNumeros').style.display = 'none';
                loadPollaData();
            } else {
                alert('❌ Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error al asignar número:', error);
            alert('Error de conexión');
        }
    }

    /**
     * Abre el modal de asignación con un número pre-seleccionado
     */
    window.abrirAsignarPolla = function (numero) {
        const modal = document.getElementById('modalPollaNumeros');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('pollaAsignarNumero').value = numero;
            loadParticipantesSelect('pollaAsignarParticipante');
        }
    };

    /**
     * Marca un número de la polla como pagado/pendiente
     */
    window.marcarPagoPolla = async function (participanteId, numero, pagado) {
        // Encontrar el botón y dar feedback
        const btn = event?.target?.closest('button');
        const originalText = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...';
        }

        try {
            const result = await sendDataToBackend({
                action: 'marcarPagoPolla',
                participante_id: participanteId,
                numero: numero,
                pagado: pagado
            });

            if (result.status === 'success') {
                // Pequeña pausa para asegurar que Apps Script ha terminado de escribir
                setTimeout(async () => {
                    await loadPollaData();
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                    }
                }, 500);
            } else {
                alert('❌ Error: ' + result.message);
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            }
        } catch (error) {
            console.error('Error al marcar pago:', error);
            alert('Error de conexión');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    };

    /**
     * Genera un mensaje de WhatsApp para notificar a los que deben la polla
     */
    async function enviarNotificacionMasivaPolla() {
        try {
            const response = await fetch(`${API_URL}?action=getPollaData`);
            const result = await response.json();

            if (result.status === 'success') {
                const { numeros } = result.data;
                const pendientes = numeros.filter(n => n.pagado === false || String(n.pagado).toUpperCase() === 'FALSE');

                if (pendientes.length === 0) {
                    alert('✅ Todos los números asignados están al día.');
                    return;
                }

                let mensaje = `🚨 *RECORDATORIO POLLA LOCA* 🚨\n\nHola familias, recordamos que para el sorteo de esta semana faltan los siguientes aportes ($10.000 c/u):\n\n`;

                pendientes.forEach(p => {
                    mensaje += `• ${p.participante} (Número: ${String(p.numero).padStart(2, '0')})\n`;
                });

                mensaje += `\nFavor ponerse al día para completar la bolsa. ¡Muchas gracias! 🙏\n\n🔗 *Únete al grupo:* https://chat.whatsapp.com/FYoURBzrX9wAfBAiw9D5U0`;

                const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
                window.open(url, '_blank');
            }
        } catch (error) {
            console.error('Error al generar notificación:', error);
            alert('Error al obtener datos');
        }
    }

    /**
     * Configura el alternador de tema (Modo Oscuro)
     */
    function setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        const body = document.body;
        const icon = themeToggle.querySelector('.icon');
        const text = themeToggle.querySelector('.text');

        // Cargar preferencia guardada
        const savedTheme = localStorage.getItem('natillera_theme');
        if (savedTheme === 'dark') {
            body.classList.add('dark-theme');
            if (icon) icon.textContent = '☀️';
            if (text) text.textContent = 'Modo Claro';
        }

        themeToggle.addEventListener('click', () => {
            const isDark = body.classList.toggle('dark-theme');
            localStorage.setItem('natillera_theme', isDark ? 'dark' : 'light');

            // Actualizar UI del botón
            if (isDark) {
                if (icon) icon.textContent = '☀️';
                if (text) text.textContent = 'Modo Claro';
            } else {
                if (icon) icon.textContent = '🌙';
                if (text) text.textContent = 'Modo Oscuro';
            }

            // Refrescar gráfico si existe
            if (typeof initGananciasChart === 'function') {
                initGananciasChart();
            }
        });
    }

    /**
     * Calcula la mora sugerida basada en el acuerdo del socio
     */
    async function actualizarMoraSugerida() {
        const pId = document.getElementById('aporteParticipante').value;
        const fechaStr = document.getElementById('aporteFecha').value;
        const inputMora = document.getElementById('aporteMora');
        const labelDias = document.getElementById('labelDiasRetraso');
        const infoMora = document.getElementById('calcMoraInfo');

        if (!pId || !fechaStr) {
            inputMora.value = 0;
            labelDias.style.display = 'none';
            return;
        }

        try {
            const hoy = new Date(fechaStr + 'T00:00:00');
            const moraDiaria = parseInt(GLOBAL_CONFIG.MORA_DIARIA || 3000);

            // Obtener datos del participante para su frecuencia y config
            const responseP = await fetch(`${API_URL}?action=getParticipantes`);
            const resultP = await responseP.json();
            const socio = resultP.data.find(p => p.id === pId);

            if (!socio) return;

            const frecuencia = (socio.frecuencia_pago || 'MENSUAL').toUpperCase();
            const config = (socio.config_pago || '15').toString();

            let fechasLimite = [];
            const mesActual = hoy.getMonth();
            const anioActual = hoy.getFullYear();

            if (frecuencia === 'MENSUAL') {
                const dia = parseInt(config);
                for (let m = -1; m <= 0; m++) {
                    let f = new Date(anioActual, mesActual + m, dia);
                    if (f.getMonth() !== (mesActual + m + 12) % 12) f = new Date(anioActual, mesActual + m + 1, 0);
                    fechasLimite.push(f);
                }
            } else if (frecuencia === 'QUINCENAL') {
                const dias = config.split(',').map(d => parseInt(d.trim()));
                for (let m = -1; m <= 0; m++) {
                    dias.forEach(dia => {
                        let f = new Date(anioActual, mesActual + m, dia);
                        if (f.getMonth() !== (mesActual + m + 12) % 12) f = new Date(anioActual, mesActual + m + 1, 0);
                        fechasLimite.push(f);
                    });
                }
            } else if (frecuencia === 'SEMANAL') {
                const diaSemana = parseInt(config);
                // Buscar los últimos 2 domingos/lunes... antes de hoy
                for (let i = 0; i < 14; i++) {
                    let f = new Date(hoy);
                    f.setDate(hoy.getDate() - i);
                    if (f.getDay() === diaSemana) {
                        fechasLimite.push(f);
                    }
                }
            }

            // Ordenar de más reciente a más antigua
            fechasLimite.sort((a, b) => b - a);

            // Encontrar el límite más cercano que sea igual o anterior a hoy
            const limiteCercano = fechasLimite.find(f => f <= hoy);

            if (limiteCercano && hoy > limiteCercano) {
                const diffTime = Math.abs(hoy - limiteCercano);
                const diasRetraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const moraSugerida = diasRetraso * moraDiaria;

                inputMora.value = moraSugerida;
                labelDias.textContent = `${diasRetraso} días`;
                labelDias.style.display = 'inline-block';
                infoMora.textContent = `Venció el ${limiteCercano.toLocaleDateString()}. Sugerido: ${diasRetraso} días x ${formatCurrency(moraDiaria)}`;
            } else {
                inputMora.value = 0;
                labelDias.style.display = 'none';
                infoMora.textContent = 'A tiempo. Sin mora sugerida.';
            }
        } catch (error) {
            console.error('Error calculando mora:', error);
        }
    }

    // Inicialización al cargar el script
    if (window.NatilleraAuth) {
        window.NatilleraAuth.requireAuth();
    }
    setupNavigation();
    setupForms();
    setupThemeToggle();
    loadDashboardData();
    loadGlobalConfig();

    // Eventos para cálculo de mora
    const elP = document.getElementById('aporteParticipante');
    const elF = document.getElementById('aporteFecha');
    if (elP) elP.addEventListener('change', actualizarMoraSugerida);
    if (elF) elF.addEventListener('change', actualizarMoraSugerida);

    /**
     * Envía un comprobante de aporte por WhatsApp
     */
    window.enviarComprobanteAporte = function (participante, telefono, fecha, monto, mora, concepto) {
        if (!telefono) {
            alert('El participante no tiene un número de teléfono registrado.');
            return;
        }

        const total = Number(monto) + Number(mora);

        // Parsear la fecha de forma robusta
        let dateObj;
        if (fecha && fecha.includes('T')) {
            dateObj = new Date(fecha); // Ya es ISO
        } else {
            dateObj = new Date(fecha + 'T00:00:00'); // Es YYYY-MM-DD
        }

        const fechaFormateada = dateObj.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        const mensaje =
            `*NATILLERA - COMPROBANTE DE APORTE* 📝\n\n` +
            `Hola *${participante}*, 👋 te confirmamos el recibo de tu aporte:\n\n` +
            `📅 *Fecha:* ${fechaFormateada}\n` +
            `💵 *Monto:* ${formatCurrency(monto)}\n` +
            (Number(mora) > 0 ? `⚠️ *Mora:* ${formatCurrency(mora)}\n` : '') +
            `💰 *Total Recibido:* ${formatCurrency(total)}\n` +
            `🏷️ *Concepto:* ${concepto}\n\n` +
            `¡Gracias por tu cumplimiento! ✨`;

        const url = `https://wa.me/57${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
    };

})();
