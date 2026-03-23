/**
 * ============================================
 * NATILLERA - ADMINISTRACIÓN DE BINGO
 * Archivo: bingo_admin.js
 * Descripción: Control de juegos, balotas y pagos
 * ============================================
 */

(function () {
    'use strict';

    const API_URL = window.API_URL;
    const WS_URL = window.WS_URL || "wss://natisystem.onrender.com";

    let adminUpdateInterval = null;
    let currentAdminGameId = null;
    let lastAdminChatLength = 0;
    let isVoiceActive = false;
    let socket = null;

    console.log("Bingo Admin Script: Cargado correctamente.");

    // Inicialización
    document.addEventListener('DOMContentLoaded', () => {
        console.log("Bingo Admin Script: DOMContentLoaded disparado.");
        setupBingoAdminEvents();
    });

    // Exponer función de carga para app.js
    window.loadBingoAdminData = async function() {
        await refreshBingoState();
        await loadPendingBingoReceipts();
        
        // Iniciar polling administrativo si no existe
        if (!adminUpdateInterval) {
            initAdminWebSocket();
            adminUpdateInterval = setInterval(async () => {
                const section = document.getElementById('bingo-admin');
                if (section && section.classList.contains('active')) {
                    await refreshBingoState();
                    await loadPendingBingoReceipts();
                } else {
                    clearInterval(adminUpdateInterval);
                    adminUpdateInterval = null;
                }
            }, 10000); 
        }
    };

    function setupBingoAdminEvents() {
        console.log("Configurando eventos del Bingo...");
        try {
            // Botón abrir modal creación
            const btnModal = document.getElementById('btnCrearJuegoBingoModal');
            if (btnModal) {
                btnModal.addEventListener('click', () => {
                    document.getElementById('bingoGameSetupCard').style.display = 'block';
                });
            }

            // Formulario creación juego
            const formBingo = document.getElementById('bingoGameForm');
            if (formBingo) {
                formBingo.addEventListener('submit', handleCreateGame);
            }

            // Botón Cantar Balota
            const btnBalota = document.getElementById('btnCantarBalota');
            if (btnBalota) {
                btnBalota.addEventListener('click', handleCantarBallWithFeedback); // Feedback táctil
            }

            // Botón Micrófono - ELIMINADO

            // Chat Admin - El envío se maneja ahora desde el globo flotante
            // (Los botones y campos antiguos ya no existen en el HTML)

            // Botón Nueva Ronda
            const btnNewRound = document.getElementById('btnOpenNewRound');
            if (btnNewRound) {
                btnNewRound.addEventListener('click', () => {
                    document.getElementById('bingoGameSetupCard').style.display = 'block';
                    btnNewRound.style.display = 'none';
                });
            }

            console.log("Bingo Admin Script: Eventos configurados exitosamente.");
        } catch (err) {
            console.error("Error en setupBingoAdminEvents:", err);
        }
    }

    async function handleCantarBallWithFeedback() {
        const btn = document.getElementById('btnCantarBalota');
        btn.disabled = true;
        btn.innerText = "⏳ Cantando...";
        await handleCantarBalota();
        btn.disabled = false;
        btn.innerText = "Cantar Balota";
    }

    async function refreshBingoState() {
        try {
            const response = await fetch(`${API_URL}?action=getBingoState&juego_id=LATEST`);
            const res = await response.json();
            
            if (res.status === 'success') {
                currentAdminGameId = res.juego_id;
                document.getElementById('adminBingoId').innerText = res.juego_id;
                document.getElementById('adminBingoBolsa').innerText = formatCurrency(res.total_bolsa || 0);
                
                const statusBadge = document.getElementById('adminBingoStatus');
                const btnCancelar = document.getElementById('btnCancelarJuego');

                if (statusBadge) {
                    statusBadge.innerText = res.estado;
                    statusBadge.className = `badge ${res.estado === 'FINALIZADO' ? 'bg-success' : (res.estado === 'CANCELADO' ? 'bg-danger' : 'bg-primary')}`;
                }

                // Mostrar botón cancelar solo si el juego está en curso y NO está finalizado/cancelado
                if (btnCancelar) {
                    if (res.estado === 'ACTIVO' || res.estado === 'INICIANDO' || res.estado === 'RECLAMANDO') {
                        btnCancelar.style.display = 'inline-block';
                    } else {
                        btnCancelar.style.display = 'none';
                    }
                }
                
                // Actualizar Balotas
                const lastBall = res.balotas && res.balotas.length > 0 ? res.balotas[res.balotas.length - 1] : '?';
                document.getElementById('adminLastBall').innerText = lastBall === '?' ? lastBall : getBingoLabel(lastBall);
                
                const historyEl = document.getElementById('adminBallHistory');
                if (historyEl && res.balotas) {
                    historyEl.innerHTML = res.balotas.map(b => `<div class="bingo-ball-sm">${getBingoLabel(b)}</div>`).reverse().join('');
                }

                // Sincronizar Chat
                refreshAdminChat();

                // Manejo de botones según estado
                const btnCantar = document.getElementById('btnCantarBalota');
                const btnNewRound = document.getElementById('btnOpenNewRound');
                if (res.estado === 'FINALIZADO') {
                    if (btnCantar) btnCantar.style.display = 'none';
                    if (btnNewRound) btnNewRound.style.display = 'inline-block';
                } else {
                    if (btnCantar) btnCantar.style.display = 'inline-block';
                    if (btnNewRound) btnNewRound.style.display = 'none';
                }
            }
        } catch (e) {
            console.error("Error cargando estado bingo admin:", e);
        }
    }

    async function loadPendingBingoReceipts() {
        try {
            let juegoIdBusqueda = currentAdminGameId;
            
            if (!juegoIdBusqueda) {
                const response = await fetch(`${API_URL}?action=getBingoState&juego_id=LATEST`);
                const res = await response.json();
                if (res.status === 'success') {
                    juegoIdBusqueda = res.juego_id;
                    currentAdminGameId = res.juego_id;
                }
            }

            if (!juegoIdBusqueda) {
                document.getElementById('bingoApprovalTableBody').innerHTML = '<tr><td colspan="4" class="text-center">No hay juegos activos</td></tr>';
                document.getElementById('bingoWinnerTableBody').innerHTML = '<tr><td colspan="2" class="text-center">No hay juegos activos</td></tr>';
                return;
            }

            const respTablas = await fetch(`${API_URL}?action=getTablasBingo&juego_id=${juegoIdBusqueda}`);
            const dataTablas = await respTablas.json();

            const tbody = document.getElementById('bingoApprovalTableBody');
            const tbodyWinners = document.getElementById('bingoWinnerTableBody');

            if (dataTablas.status === 'success') {
                const pendientes = dataTablas.data.filter(t => t.estado_pago === 'PENDIENTE');
                const reclamos = dataTablas.data.filter(t => t.estado === 'RECLAMANDO');

                // Recibos
                if (pendientes.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay recibos pendientes</td></tr>';
                } else {
                    tbody.innerHTML = pendientes.map(t => `
                        <tr>
                            <td>${new Date(t.created_at || Date.now()).toLocaleDateString()}</td>
                            <td>${t.participante_nombre || t.participante_id}</td>
                            <td><a href="${t.comprobante_url}" target="_blank" class="btn btn-sm btn-info">Ver Recibo</a></td>
                            <td>
                                <button onclick="aprobarTablaBingo('${t.id}')" class="btn btn-sm btn-success">Aprobar</button>
                            </td>
                        </tr>
                    `).join('');
                }

                // Reclamos de Bingo
                if (reclamos.length === 0) {
                    tbodyWinners.innerHTML = '<tr><td colspan="2" class="text-center">No hay reclamos de Bingo pendientes</td></tr>';
                } else {
                    tbodyWinners.innerHTML = reclamos.map(t => `
                        <tr>
                            <td>${t.participante_nombre || t.participante_id}</td>
                            <td>
                                <button onclick="confirmarGanador('${juegoIdBusqueda}', '${t.participante_id}', '${t.id}')" class="btn btn-sm btn-primary">Confirmar Ganador</button>
                            </td>
                        </tr>
                    `).join('');
                }
            }
        } catch (e) {
            console.error("Error cargando recibos bingo:", e);
        }
    }

    async function handleCreateGame(e) {
        e.preventDefault();
        const fecha = document.getElementById('bingoFecha').value;
        const valor = document.getElementById('bingoValorTabla').value;
        const modo = document.getElementById('bingoModoJuego').value;

        try {
            const resp = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'crearJuegoBingo',
                    fecha: fecha,
                    valor_tabla: Number(valor),
                    modo_juego: modo
                })
            });
            const res = await resp.json();
            if (res.status === 'success') {
                alert("Juego creado exitosamente");
                document.getElementById('bingoGameSetupCard').style.display = 'none';
                refreshBingoState();
            } else {
                alert("Error: " + res.message);
            }
        } catch (e) {
            alert("Error de conexión");
        }
    }

    async function handleCantarBalota() {
        if (!currentAdminGameId) {
            alert("No hay un juego activo");
            return;
        }

        try {
            const resp = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'cantarBalotaBingo',
                    juego_id: currentAdminGameId
                })
            });
            const res = await resp.json();
            if (res.status === 'success') {
                // Notificar vía WebSocket
                sendSocketEvent('ball-drawn', { ball: res.bola_actual });
                refreshBingoState();
            } else {
                alert("Error: " + res.message);
            }
        } catch (e) {
            alert("Error de conexión");
        }
    }

    window.aprobarTablaBingo = async function(tablaId) {
        if (!confirm("¿Aprobar este pago?")) return;

        try {
            const resp = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'aprobarPagoBingo',
                    tabla_id: tablaId
                })
            });
            const res = await resp.json();
            if (res.status === 'success') {
                loadPendingBingoReceipts();
            } else {
                alert("Error: " + res.message);
            }
        } catch (e) {
            alert("Error de conexión");
        }
    };

    window.confirmarGanador = async function(juegoId, partId, tablaId) {
        const modal = document.getElementById('modalConfirmarGanador');
        const spanMonto = document.getElementById('confirmarPremioMonto');
        const btnEfectivo = document.getElementById('btnPremioEfectivo');
        const btnAhorro = document.getElementById('btnPremioAhorro');

        // Mostrar premio actual
        const bolsaText = document.getElementById('adminBingoBolsa').innerText;
        spanMonto.innerText = bolsaText;
        modal.style.display = 'block';

        return new Promise((resolve) => {
            const process = async (metodo) => {
                modal.style.display = 'none';
                try {
                    const resp = await fetch(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify({
                            action: 'procesarPremioBingo',
                            juego_id: juegoId,
                            participante_id: partId,
                            tabla_id: tablaId,
                            metodo_pago: metodo
                        })
                    });
                    const res = await resp.json();
                    if (res.status === 'success') {
                        sendSocketEvent('game-finished', { winner: partId });
                        alert(`¡Juego finalizado! Ganador: ${partId}. Pago: ${metodo}`);
                        
                        // Descargar PDF si está disponible
                        if (res.pdf && res.pdf.base64) {
                            const link = document.createElement('a');
                            link.href = `data:application/pdf;base64,${res.pdf.base64}`;
                            link.download = res.pdf.filename;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }
                        loadPendingBingoReceipts();
                        refreshBingoState();
                    } else {
                        alert("Error: " + res.message);
                    }
                } catch (e) {
                    alert("Error de conexión");
                }
                resolve();
            };

            btnEfectivo.onclick = () => process('EFECTIVO');
            btnAhorro.onclick = () => process('AHORRO');
        });
    };

    window.cancelarJuegoActual = async function() {
        if (!currentAdminGameId) return;

        // Verificar si hay gente (aquí podríamos usar el socket.roomSize si lo tuviéramos)
        // Por ahora, confirmación simple con advertencia
        if (!confirm("⚠️ ¿Estás SEGURO de cancelar este juego? \n\nEsto lo marcará como CANCELADO y se cerrará para todos. Úsalo solo si cometiste un error en la configuración.")) return;

        try {
            const resp = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'cancelarJuegoBingo',
                    juego_id: currentAdminGameId
                })
            });
            const res = await resp.json();
            if (res.status === 'success') {
                sendSocketEvent('game-cancelled', { juego_id: currentAdminGameId });
                alert("Juego cancelado exitosamente.");
                refreshBingoState();
            } else {
                alert("Error: " + res.message);
            }
        } catch (e) {
            alert("Error de conexión al cancelar");
        }
    };

    function getBingoLabel(n) {
        const num = Number(n);
        if (num >= 1 && num <= 15) return "B" + num;
        if (num >= 16 && num <= 30) return "I" + num;
        if (num >= 31 && num <= 45) return "N" + num;
        if (num >= 46 && num <= 60) return "G" + num;
        if (num >= 61 && num <= 75) return "O" + num;
        return num;
    }

    function formatCurrency(v) {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
    }

    // LÓGICA DE CHAT Y VOZ ADMIN

    window.toggleAdminChat = function() {
        const container = document.getElementById('adminChatContainer');
        container.classList.toggle('active');
        if (container.classList.contains('active')) {
            setTimeout(() => {
                const messages = document.getElementById('adminChatMessages');
                messages.scrollTop = messages.scrollHeight;
                document.getElementById('adminChatInputFloating').focus();
            }, 50);
        }
    };

    window.sendAdminChatFloating = async function() {
        const input = document.getElementById('adminChatInputFloating');
        const mensaje = input.value.trim();
        if (!mensaje) return;

        let juegoId = currentAdminGameId;
        
        if (!juegoId) {
            const resState = await fetch(`${API_URL}?action=getBingoState&juego_id=LATEST`);
            const dataState = await resState.json();
            juegoId = dataState.juego_id;
            currentAdminGameId = juegoId;
        }

        if (!juegoId) {
            alert("No hay un juego activo para enviar mensajes.");
            return;
        }

        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'sendBingoMessage',
                    juego_id: juegoId,
                    usuario_id: 'ADMIN',
                    usuario_nombre: 'ADMINISTRADOR',
                    rol: 'admin',
                    mensaje: mensaje
                })
            });
            input.value = '';
            sendSocketEvent('new-bingo-msg', { juego_id: juegoId });
            refreshAdminChat();
        } catch (e) {
            console.error(e);
        }
    };

    async function refreshAdminChat() {
        if (!currentAdminGameId) return;
        try {
            const resp = await fetch(`${API_URL}?action=getBingoMessages&juego_id=${currentAdminGameId}`);
            const res = await resp.json();
            if (res.status === 'success') {
                const container = document.getElementById('adminChatMessages');
                if (res.data.length === lastAdminChatLength) return;
                lastAdminChatLength = res.data.length;
                
                container.innerHTML = res.data.map(m => `
                    <div class="chat-msg ${m.rol === 'admin' ? 'msg-admin' : 'msg-socio'}">
                        <span class="msg-name">${m.usuario_nombre}</span>
                        <span>${m.mensaje}</span>
                    </div>
                `).join('');
                container.scrollTop = container.scrollHeight;
            }
        } catch (e) { console.error("Error refreshing admin chat:", e); }
    }
    function initAdminWebSocket() {
        if (!WS_URL || socket) return;
        try {
            socket = new WebSocket(WS_URL);
            socket.onopen = () => {
                socket.send(JSON.stringify({
                    type: 'join',
                    room: `bingo_${currentAdminGameId}`,
                    identity: 'admin'
                }));
            };
            socket.onclose = () => {
                socket = null;
                setTimeout(initAdminWebSocket, 5000);
            };
        } catch (e) { console.error("WS Admin Error:", e); }
    }

    function sendSocketEvent(type, data = {}) {
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify({
                type: type,
                room: `bingo_${currentAdminGameId}`,
                ...data
            }));
        }
    }

})();
