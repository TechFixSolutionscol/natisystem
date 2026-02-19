// ==========================================
// CONTROLADOR DE LA POLLA (PANEL ADMIN)
// Modificado para usar FETCH en lugar de google.script.run
// ==========================================

let currentSorteoAdmin = null;
let currentSolicitudId = null; // Para aprobar/rechazar
let globalParticipantesCache = null; // Cache para busqueda de cedulas

// Se invoca cuando se navega a la sección #polla
async function initPollaDashboard() {
    console.log("Inicializando Dashboard Polla...");
    startLoading();

    // Cargamos todo el paquete de datos de una vez
    await loadFullPollaData();

    stopLoading();

    // Listeners botones principales
    const btnSorteo = document.getElementById('btnSorteoPolla');
    const btnAsignar = document.getElementById('btnAsignarPolla');
    const btnNotificar = document.getElementById('btnNotificarPolla');

    if (btnSorteo) btnSorteo.onclick = abrirModalGestionSorteo;
    if (btnAsignar) btnAsignar.onclick = abrirModalAsignarNumero;
    if (btnNotificar) btnNotificar.onclick = notificarPendientes;
}

// ----------------------------------------------------
// 0. UTILS FETCH
// ----------------------------------------------------

async function fetchBackend(action, params = {}) {
    // API_URL debe estar definida en app.js
    if (typeof API_URL === 'undefined') {
        alert("Error crítico: API_URL no definida.");
        throw new Error("API_URL undefined");
    }

    let url = `${API_URL}?action=${action}`;

    // Si es GET
    if (!params.method || params.method === 'GET') {
        // Convertir params extra a query string si es necesario
        // (En este diseño, muchos GET no tienen params, o los metemos en url)
    }

    const options = {
        method: 'POST', // Por defecto usamos POST para acciones que modifican o requieren body
        body: JSON.stringify({ action, ...params })
    };

    // Ajuste: El backend maneja 'doGet' para lecturas y 'doPost' para escrituras.
    // getPollaSorteoActivo -> doGet
    // getPollaNumerosPorSorteo -> doGet
    // crearSorteoPolla -> doPost
    // solicitarNumeroPolla -> doPost
    // aprobarNumeroPolla -> doPost
    // rechazarNumeroPolla -> doPost

    if (
        action.startsWith('get')
    ) {
        // Usar GET
        const queryParams = new URLSearchParams(params).toString();
        const getUrl = `${API_URL}?action=${action}&${queryParams}`;
        const response = await fetch(getUrl);
        return await response.json();
    } else {
        // Usar POST
        // sendDataToBackend existe en app.js? SÍ. DEBERÍAMOS USARLA.
        if (typeof sendDataToBackend === 'function') {
            return await sendDataToBackend({ action, ...params });
        } else {
            // Fallback manual POST
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action, ...params })
            });
            return await response.json();
        }
    }
}

// ----------------------------------------------------
// 1. CARGA DE DATOS GENERALES
// ----------------------------------------------------

async function loadFullPollaData() {
    try {
        // Asegurar cache de participantes
        await cargarListaParticipantesGlobal();

        const result = await fetchBackend('getPollaData');

        if (result.status === 'success') {
            const data = result.data;

            // 1. Manejar Sorteo Activo
            onSorteoActivoUIUpdate(data.sorteoActivo);

            // 2. Manejar Tabla de Números (si hay sorteo activo)
            if (data.sorteoActivo) {
                renderTablaNumeros({ status: 'success', data: data.numeros });
            } else {
                document.getElementById('pollaTableBody').innerHTML = '<tr><td colspan="4" class="text-center">Active un nuevo sorteo para comenzar.</td></tr>';
                document.getElementById('pollaBolsa').textContent = "$0";
                document.getElementById('countFilteredPolla').textContent = "100";
            }

            // 3. Manejar Historial
            if (typeof renderPollaHistory === 'function') {
                renderPollaHistory(data.sorteos);
            }

        } else {
            handleError(new Error(result.message));
        }
    } catch (e) {
        console.error("Error loading full polla data:", e);
        handleError(e);
    }
}

function onSorteoActivoUIUpdate(sorteoActivo) {
    if (sorteoActivo && sorteoActivo.id) {
        currentSorteoAdmin = sorteoActivo;
        document.getElementById('pollaFecha').textContent = formatDate(sorteoActivo.fecha);
        document.getElementById('btnSorteoPolla').textContent = "🏆 Registrar Resultado / Cerrar";
        document.getElementById('btnAsignarPolla').disabled = false;
    } else {
        currentSorteoAdmin = null;
        document.getElementById('pollaFecha').textContent = "No hay sorteo activo";
        document.getElementById('btnSorteoPolla').textContent = "📅 Crear Nuevo Sorteo";
        document.getElementById('btnAsignarPolla').disabled = true;
    }
}

async function cargarSorteoActivo() {
    await loadFullPollaData();
}

async function cargarTablaNumeros(sorteoId) {
    if (!sorteoId) return;

    document.getElementById('pollaTableBody').innerHTML = '<tr><td colspan="4" class="text-center">Cargando números...</td></tr>';

    try {
        const result = await fetchBackend('getPollaNumerosPorSorteo', { sorteo_id: sorteoId });
        renderTablaNumeros(result);
    } catch (e) {
        handleError(e);
    }
}

function renderTablaNumeros(result) {
    if (result.status !== 'success') {
        alert("Error cargando números: " + result.message);
        return;
    }

    const numeros = result.data;
    const tbody = document.getElementById('pollaTableBody');
    tbody.innerHTML = '';

    const mapaNumeros = {};
    numeros.forEach(n => mapaNumeros[parseInt(n.numero)] = n);

    let totalVendidos = 0;
    let totalRecaudado = 0;
    const valorNumero = currentSorteoAdmin ? currentSorteoAdmin.valor_por_numero : 10000;
    let contadorFiltrados = 0;

    for (let i = 0; i <= 99; i++) {
        const numStr = String(i).padStart(2, '0');
        const data = mapaNumeros[i];
        const row = document.createElement('tr');

        if (data) {
            contadorFiltrados++;
            const estado = data.estado_polla || 'PENDIENTE';
            let badgeClass = 'bg-warning text-dark';
            if (estado === 'PAGADO') {
                badgeClass = 'bg-success';
                totalVendidos++;
                totalRecaudado += valorNumero;
            }
            if (estado === 'RECHAZADO') badgeClass = 'bg-danger';
            if (estado === 'GANADOR') badgeClass = 'bg-info text-dark';

            row.innerHTML = `
                <td><strong>${numStr}</strong></td>
                <td>${data.nombre_participante}</td>
                <td><span class="badge ${badgeClass}">${estado}</span></td>
                <td>
                    ${getActionButtons(data)}
                </td>
            `;
        } else {
            row.innerHTML = `
                <td><span class="text-muted">${numStr}</span></td>
                <td class="text-muted">Libre</td>
                <td><span class="badge bg-light text-dark">DISPONIBLE</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="abrirModalAsignarNumeroEspecifico(${i})">Asignar</button>
                </td>
            `;
        }
        tbody.appendChild(row);
    }

    document.getElementById('pollaBolsa').textContent = formatCurrency(totalRecaudado);
    document.getElementById('countFilteredPolla').textContent = contadorFiltrados > 0 ? contadorFiltrados : 100;
}

function getActionButtons(data) {
    const json = JSON.stringify(data).replace(/"/g, '&quot;');
    if (data.estado_polla === 'PENDIENTE') {
        return `
            <button class="btn btn-sm btn-info" onclick="validarSolicitud(${json})">🔍 Validar</button>
            <button class="btn btn-sm btn-danger" onclick="rechazarSolicitud(${json})">✖</button>
        `;
    } else if (data.estado_polla === 'PAGADO') {
        return `<button class="btn btn-sm btn-secondary" disabled>✅ Pagado</button>`;
    }
    return '';
}

// ----------------------------------------------------
// 2. GESTIÓN DE SORTEOS
// ----------------------------------------------------

function abrirModalGestionSorteo() {
    if (currentSorteoAdmin) {
        document.getElementById('pollaResultadoFecha').value = formatDate(currentSorteoAdmin.fecha);
        document.getElementById('pollaResultadoId').value = currentSorteoAdmin.id;
        document.getElementById('pollaNumeroGanador').value = '';
        document.getElementById('modalPollaResultado').style.display = 'block';
    } else {
        const proximoViernes = getNextFriday();
        document.getElementById('nuevoSorteoFecha').valueAsDate = proximoViernes;
        document.getElementById('modalCrearSorteo').style.display = 'block';
    }
}

// Submit Crear Sorteo
document.getElementById('formCrearSorteo').onsubmit = async function (e) {
    e.preventDefault();
    const fecha = document.getElementById('nuevoSorteoFecha').value;
    const valor = document.getElementById('nuevoSorteoValor').value;

    if (!fecha || !valor) return alert("Complete los campos");

    startLoading();
    try {
        const res = await fetchBackend('crearSorteoPolla', { fecha: fecha, valor: valor });
        stopLoading();
        if (res.status === 'success') {
            alert("✅ Sorteo creado correctamente");
            closeModal('modalCrearSorteo');
            cargarSorteoActivo();
        } else {
            alert("Error: " + res.message);
        }
    } catch (e) {
        handleError(e);
    }
};

// Submit Resultado Sorteo
document.getElementById('formPollaResultado').onsubmit = async function (e) {
    e.preventDefault();
    const id = document.getElementById('pollaResultadoId').value;
    const num = document.getElementById('pollaNumeroGanador').value;

    if (num === '' || num < 0 || num > 99) return alert("Número inválido");

    if (!confirm("¿Está seguro de cerrar el sorteo con el número ganador " + num + "?")) return;

    startLoading();
    try {
        const res = await fetchBackend('registrarResultadoManualPolla', { sorteo_id: id, numero_ganador: num });
        stopLoading();
        closeModal('modalPollaResultado');
        if (res.status === 'success') {
            alert("🏆 Sorteo procesado exitosamente.\n" + res.message);
            cargarSorteoActivo();
        } else {
            alert("Error: " + res.message);
        }
    } catch (e) {
        handleError(e);
    }
};

// ----------------------------------------------------
// 3. ASIGNACIÓN MANUAL DE NÚMEROS
// ----------------------------------------------------

async function cargarListaParticipantesGlobal() {
    try {
        const res = await fetchBackend('getParticipantes');
        if (res.status === 'success') {
            globalParticipantesCache = res.data;
        }
    } catch (e) {
        console.error("Error cacheando participantes:", e);
    }
}

function abrirModalAsignarNumero() {
    if (!currentSorteoAdmin) return alert("No hay sorteo activo");
    abrirModalAsignarNumeroEspecifico(null);
}

function abrirModalAsignarNumeroEspecifico(numeroPreseleccionado) {
    if (!currentSorteoAdmin) return alert("No hay sorteo activo");

    document.getElementById('modalAsignarNumero').style.display = 'block';

    const selectP = document.getElementById('asignarParticipante');
    selectP.innerHTML = '<option value="">Seleccione...</option>';

    if (globalParticipantesCache) {
        globalParticipantesCache.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.cedula;
            opt.textContent = p.nombre;
            selectP.appendChild(opt);
        });
    } else {
        selectP.innerHTML = '<option>Error cargando participantes</option>';
    }

    const selectN = document.getElementById('asignarNumero');
    selectN.innerHTML = '';
    for (let i = 0; i <= 99; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = String(i).padStart(2, '0');
        if (numeroPreseleccionado !== null && i === numeroPreseleccionado) opt.selected = true;
        selectN.appendChild(opt);
    }
}

// Submit Asignar
document.getElementById('formAsignarNumero').onsubmit = async function (e) {
    e.preventDefault();
    const cedula = document.getElementById('asignarParticipante').value;
    const numero = document.getElementById('asignarNumero').value;
    const pagado = document.getElementById('asignarPagado').checked;

    if (!cedula || numero === '') return alert("Datos incompletos");

    const data = {
        cedula: cedula,
        numero: numero,
        sorteo_id: currentSorteoAdmin.id,
        isAdminAssignment: true,
        autoPay: pagado
    };

    startLoading();
    try {
        const res = await fetchBackend('solicitarNumeroPolla', data);

        if (res.status !== 'success') {
            stopLoading();
            alert(res.message);
            return;
        }

        if (pagado) {
            await fetchBackend('aprobarNumeroPolla', {
                cedula: cedula,
                sorteo_id: currentSorteoAdmin.id,
                numero: numero
            });
            alert("✅ Número asignado y pagado correctamente.");
        } else {
            alert("✅ Número asignado (Pendiente de pago).");
        }

        stopLoading();
        closeModal('modalAsignarNumero');
        cargarTablaNumeros(currentSorteoAdmin.id);

    } catch (e) {
        handleError(e);
    }
};

// ----------------------------------------------------
// 4. VALIDACIÓN DE SOLICITUDES
// ----------------------------------------------------

function validarSolicitud(data) {
    currentSolicitudId = data;
    document.getElementById('modalGestionarSolicitud').style.display = 'block';

    document.getElementById('detalleSolicitud').innerHTML = `
        <p><strong>Participante:</strong> ${data.nombre_participante}</p>
        <p><strong>Número:</strong> <span class="badge bg-warning text-dark" style="font-size:1.2rem">${data.numero}</span></p>
        <p><strong>Fecha Solicitud:</strong> ${data.fecha_solicitud || 'Hoy'}</p>
    `;

    const imgView = document.getElementById('imgComprobante');
    const pdfView = document.getElementById('pdfComprobante');
    const noMsg = document.getElementById('noComprobanteMsg');

    imgView.style.display = 'none';
    pdfView.style.display = 'none';
    noMsg.style.display = 'none';

    if (data.comprobante_url) {
        let url = data.comprobante_url;
        if (url.includes('drive.google.com/file/d/')) {
            url = url.replace('/view', '/preview');
            pdfView.src = url;
            pdfView.style.display = 'block';
        } else {
            noMsg.textContent = "Abrir enlace externo: " + url;
            noMsg.style.display = 'block';
            window.open(url, '_blank');
        }
    } else {
        noMsg.style.display = 'block';
        noMsg.textContent = "No se adjuntó comprobante digital.";
    }
}

async function procesarSolicitud(accion) {
    if (!currentSolicitudId) return;

    // Necesitamos la CEDULA, pero 'data' solo trae 'id_participante'.
    // Usamos el cache globalParticipantesCache para encontrar la cedula.
    let cedulaTarget = "";

    if (globalParticipantesCache) {
        const p = globalParticipantesCache.find(x => x.id === currentSolicitudId.id_participante);
        if (p) cedulaTarget = p.cedula;
    }

    if (!cedulaTarget) {
        alert("Error: No se pudo identificar la cédula del participante. Intente recargar la página.");
        return;
    }

    const payload = {
        cedula: cedulaTarget,
        sorteo_id: currentSorteoAdmin.id,
        numero: currentSolicitudId.numero
    };

    const handler = accion === 'APROBAR' ? 'aprobarNumeroPolla' : 'rechazarNumeroPolla';

    startLoading();
    try {
        const r = await fetchBackend(handler, payload);
        stopLoading();
        closeModal('modalGestionarSolicitud');

        if (r.status === 'success') {
            alert("Acción realizada: " + accion);
            cargarTablaNumeros(currentSorteoAdmin.id);
        } else {
            alert("Error: " + r.message);
        }
    } catch (e) {
        handleError(e);
    }

}

// ----------------------------------------------------
// UTILS
// ----------------------------------------------------

function getNextFriday() {
    const d = new Date();
    d.setDate(d.getDate() + (5 + 7 - d.getDay()) % 7);
    return d;
}

function stopLoading() {
    document.body.style.cursor = 'default';
}

function startLoading() {
    document.body.style.cursor = 'wait';
}

function handleError(e) {
    stopLoading();
    console.error(e);
    alert("Error de sistema: " + e.message);
}

function notificarPendientes() {
    alert("Funcionalidad en desarrollo: Enviará emails a todos los pendientes.");
}

function cargarHistorialSorteos() {
    loadFullPollaData();
}

/**
 * Renderiza el historial de sorteos en la tabla
 */
function renderPollaHistory(sorteos) {
    const tbody = document.getElementById('pollaHistoryBody');
    if (!tbody) return;

    if (!sorteos || sorteos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay sorteos registrados en el sistema</td></tr>';
        return;
    }

    tbody.innerHTML = sorteos.reverse().map(s => {
        const ganadorLabel = s.nombre_ganador || (s.id_ganador === 'ACUMULADO' ? 'ACUMULADO' : 'N/A');
        const badgeCls = s.estado === 'GANADO' ? 'bg-success' : (s.estado === 'ACUMULADO' ? 'bg-warning text-dark' : 'bg-info');

        return `
            <tr>
                <td>${formatDate(s.fecha)}</td>
                <td><strong class="text-primary">${s.numero_ganador || '--'}</strong></td>
                <td>${ganadorLabel}</td>
                <td>${formatCurrency(s.monto_total || 0)}</td>
                <td><span class="badge ${badgeCls}">${s.estado || 'FINALIZADO'}</span></td>
            </tr>
        `;
    }).join('');
}

function formatDate(isoStr) {
    if (!isoStr) return '';
    // Ajuste de Zona Horaria: UTC a Local si viene ISO completo
    // Pero si viene YYYY-MM-DD ya es local-ish.
    // Usamos split para evitar conversiones de zona extrañas
    if (isoStr.includes('T')) return new Date(isoStr).toLocaleDateString();
    return isoStr;
}

function formatCurrency(v) {
    return '$' + Number(v).toLocaleString();
}

function rechazarSolicitud(data) {
    currentSolicitudId = data; // Setear contexto
    if (confirm("¿Rechazar solicitud de " + data.nombre_participante + "?")) {
        procesarSolicitud('RECHAZAR');
    }
}

// Exponer globalmente para onclicks HTML
window.initPollaDashboard = initPollaDashboard;
window.abrirModalAsignarNumeroEspecifico = abrirModalAsignarNumeroEspecifico;
window.validarSolicitud = validarSolicitud;
window.rechazarSolicitud = rechazarSolicitud;
window.closeModal = function (id) {
    document.getElementById(id).style.display = 'none';
};
