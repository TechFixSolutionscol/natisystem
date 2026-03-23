// BINGO 3D - CLIENT LOGIC
// Configuración y variables globales
window.API_URL = 'https://script.google.com/macros/s/AKfycbw7SBiUzhJtmmNwMN5bblvfyGMewgwijWaJ9Z_fIwYhpkFU3oyLBQNcARah_PEQFuv3/exec';
window.WS_URL = 'wss://natisystem.onrender.com';

let currentGameId = null;
let myTable = null;
let calledBalls = [];
let pollingInterval = null;
let currentModoJuego = 'FULL'; // FULL, LINEA, CUATRO_ESQUINAS
const MIN_POLL = 2000;
const MAX_POLL = 5000;

// Utilidad de formato de moneda (local)
function formatCurrency(amount) {
    if (isNaN(amount)) return "$0";
    return "$" + Number(amount).toLocaleString('es-CO', { minimumFractionDigits: 0 });
}

let socket = null;
let socioIdentity = sessionStorage.getItem('natillera_id') || `socio_${Math.floor(Math.random()*1000)}`;

// Configuración de Polling
let lastChatLength = 0;

document.addEventListener('DOMContentLoaded', () => {
    initGame();
    
    // Desbloqueo de audio (Autoplay)
    document.addEventListener('click', () => {
        const player = document.getElementById('voicePlayer');
        if (player && player.paused && window.pendingVoiceStream) {
            console.log("Activando audio pendiente...");
            player.srcObject = window.pendingVoiceStream;
            player.play().catch(e => console.error("Error al reproducir audio:", e));
            delete window.pendingVoiceStream;
        }
    }, { once: true });
});

async function initGame() {
    console.log("Iniciando Bingo Cliente...");
    const userId = sessionStorage.getItem('natillera_id');
    if (!userId || userId === 'undefined') {
        console.warn("No hay sesión de usuario.");
        alert("Sesión no válida o expirada. Por favor, busca tu cédula nuevamente.");
        window.location.href = 'consulta.html';
        return;
    }

    try {
        console.log("Obteniendo estado del juego...");
        const resp = await fetch(`${window.API_URL}?action=getBingoState&juego_id=LATEST`);
        const res = await resp.json();
        
        if (res && res.status === 'success') {
            currentGameId = res.juego_id;
            console.log("Juego Activo:", currentGameId);
            
            const valorLabel = document.getElementById('valorTablaLabel');
            if (valorLabel) valorLabel.innerText = formatCurrency(res.valor_tabla);
            
            const myTableData = await checkAccess();
            if (myTableData) {
                console.log("Acceso concedido. Renderizando tabla...");
                myTable = myTableData;
                renderBingoCard(myTable);
                startSync();
                initWebSocket();
            } else {
                console.log("Acceso bloqueado o pendiente.");
            }
        } else {
            const errorMsg = res && res.message ? res.message : "No hay juegos activos";
            document.getElementById('gameStatus').innerText = "SIN JUEGO";
            const bingoUploadSection = document.getElementById('uploadSection');
            if (bingoUploadSection) {
                bingoUploadSection.innerHTML = `<div class="alert alert-warning">⚠️ ${errorMsg}.</div>`;
            }
            console.log("Estado:", errorMsg);
        }
    } catch (e) {
        console.error("Error inicializando juego:", e);
        alert("Error de conexión. Por favor recarga la página.");
    }
}

async function checkAccess() {
    const userId = sessionStorage.getItem('natillera_id');
    const overlay = document.getElementById('overlayPago');
    const uploadSection = document.getElementById('uploadSection');
    const statusSection = document.getElementById('statusSection');
    const statusMsg = document.getElementById('statusMsg');

    if (!userId) {
        console.warn("checkAccess: No userId");
        return null;
    }

    try {
        console.log(`Verificando tablas para usuario: ${userId} en juego: ${currentGameId}`);
        const resp = await fetch(`${window.API_URL}?action=getMisTablas&participante_id=${userId}`);
        const res = await resp.json();

        console.log("Tablas del usuario recibidas:", JSON.stringify(res.data));

        if (res.status === 'success' && res.data) {
            // Comparación robusta de IDs alfanuméricos (trim y case-insensitive por si acaso)
            const idBuscado = String(currentGameId || '').trim().toLowerCase();
            const tablaActual = res.data.find(t => String(t.juego_id || '').trim().toLowerCase() === idBuscado);

            if (tablaActual) {
                console.log("Tabla encontrada. Estado pago:", tablaActual.estado_pago);
                if (tablaActual.estado_pago === 'APROBADO') {
                    if (overlay) overlay.style.display = 'none';
                    if (!tablaActual.numeros_json) {
                        console.error("Error: numeros_json está vacío");
                        return null;
                    }
                    try {
                        return JSON.parse(tablaActual.numeros_json);
                    } catch (errJson) {
                        console.error("Error al parsear numeros_json:", errJson);
                        return null;
                    }
                } else if (tablaActual.estado_pago === 'PENDIENTE') {
                    if (overlay) overlay.style.display = 'flex';
                    if (uploadSection) uploadSection.style.display = 'none';
                    if (statusSection) {
                        statusSection.style.display = 'block';
                        statusMsg.innerText = "⌛ Tu pago está en revisión administrativa. Por favor espera...";
                    }
                    setTimeout(checkAccess, 10000);
                    return null;
                }
            }
        }

        // Si no hay tabla para este juego, mostramos el formulario de carga
        console.log("No se encontró tabla para este juego. Mostrando overlay de pago.");
        if (overlay) overlay.style.display = 'flex';
        if (uploadSection) uploadSection.style.display = 'block';
        if (statusSection) statusSection.style.display = 'none';
        return null;

    } catch (e) {
        console.error("Error en checkAccess:", e);
        return null;
    }
}

function renderBingoCard(matrix) {
    console.log("renderBingoCard: Iniciando renderizado...");
    const container = document.getElementById('bingoCardContainer');
    if (!container) {
        console.error("Error: bingoCardContainer no existe en el DOM");
        return;
    }

    if (!Array.isArray(matrix) || matrix.length < 5) {
        console.error("Error: La matriz de bingo es inválida o no tiene las dimensiones correctas", matrix);
        return;
    }

    try {
        let html = `<div class="bingo-card">`;
        
        // Cabecera B I N G O
        html += `<div class="bingo-header">
                    <div>B</div><div>I</div><div>N</div><div>G</div><div>O</div>
                 </div>`;
        
        html += `<div class="bingo-grid">`;
        
        // El formato de la matriz es col-major (matrix[col][row])
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                if (!matrix[col] || matrix[col][row] === undefined) {
                    console.warn(`Celda faltante en [${col}][${row}]`);
                }
                const val = (matrix[col] && matrix[col][row] !== undefined) ? matrix[col][row] : '?';
                const isFree = val === 'FREE';
                html += `<div class="bingo-cell ${isFree ? 'marked' : ''}" 
                              onclick="markCell(this)" 
                              data-val="${val}">
                              ${isFree ? '★' : val}
                         </div>`;
            }
        }
        
        html += `</div></div>`;
        container.innerHTML = html;
        console.log("renderBingoCard: Renderizado completado.");
    } catch (err) {
        console.error("Fallo crítico en renderBingoCard:", err);
    }
}

function markCell(cell) {
    if (cell.classList.contains('marked')) return;
    const val = cell.dataset.val;
    if (calledBalls.includes(Number(val)) || val === 'FREE') {
        cell.classList.add('marked');
        cell.classList.remove('ready-to-mark'); // Quitar resalte al marcar
        playSound('soundBall');
        checkBingoWin();
    } else {
        // Efecto visual de error
        cell.style.animation = "shake 0.3s";
        setTimeout(() => cell.style.animation = "", 350);
    }
}

function startSync() {
    syncState();
    // Jittered Polling
    const poll = () => {
        syncState();
        const jitter = Math.floor(Math.random() * (MAX_POLL - MIN_POLL)) + MIN_POLL;
        pollingInterval = setTimeout(poll, jitter);
    };
    poll();
}

async function syncState() {
    const resp = await fetchAPI('getBingoState', { juego_id: currentGameId });
    if (resp.status === 'success') {
        const newBalls = resp.balotas || [];
        
        // 5. Última Balota con Animación si cambió
        if (newBalls.length > calledBalls.length) {
            const latest = newBalls[newBalls.length - 1]; // <--- FIX: Definir latest
            const latestLabel = getBingoLabel(latest);
            const currentBallEl = document.getElementById('currentBall');
            if (currentBallEl) {
                currentBallEl.innerText = latestLabel;
                currentBallEl.classList.remove('ballPop');
                void currentBallEl.offsetWidth; // Trigger reflow
                currentBallEl.classList.add('ballPop');
            }
            
            playSound('soundBall');
            announceBall(latestLabel);
        }
        
        calledBalls = newBalls;
        renderBallHistory();
        updateCardVisuals();
        
        currentModoJuego = resp.modo_juego || 'FULL';
        checkBingoWin();

        // 5.5 Actualizar Bolsa y Estado Real-time
        const potLabel = document.getElementById('potLabel');
        if (potLabel) {
            potLabel.innerText = `Bolsa: ${formatCurrency(resp.total_bolsa || 0)}`;
        }

        const gameStatus = document.getElementById('gameStatus');
        if (gameStatus && resp.estado !== 'FINALIZADO' && resp.estado !== 'CANCELADO') {
            if (newBalls.length > 0) {
                gameStatus.innerText = "JUEGO EN CURSO";
                gameStatus.style.color = "#3b82f6";
            } else {
                gameStatus.innerText = "ESPERANDO INICIO...";
                gameStatus.style.color = "#94a3b8";
            }
        }
        
        console.log("Estado sincronizado. Balotas:", calledBalls.length);
        // 6. Manejo de Estado Finalizado
        if (resp.estado === 'FINALIZADO') {
            if (gameStatus) {
                gameStatus.innerText = "¡JUEGO TERMINADO!";
                gameStatus.style.color = "#10b981";
            }
            if (resp.ganador_nombre && potLabel) {
                potLabel.innerText = `🏆 Ganador: ${resp.ganador_nombre}`;
            }
            if (pollingInterval) {
                clearTimeout(pollingInterval);
                pollingInterval = null;
            }
            mostrarBotonNuevaRonda();
        } else if (resp.estado === 'CANCELADO') {
            if (gameStatus) {
                gameStatus.innerText = "JUEGO CANCELADO";
                gameStatus.style.color = "#ef4444";
            }
        }

        // 7. Sincronizar Chat
        syncChat();
    }
}

async function syncChat() {
    const resp = await fetchAPI('getBingoMessages', { juego_id: currentGameId });
    if (resp.status === 'success') {
        renderChat(resp.data);
    }
}

function renderBallHistory() {
    const container = document.getElementById('lastBalls');
    if (!container) return;
    
    // Mostrar las últimas 5 balotas (excluyendo la actual que ya está en grande)
    const history = calledBalls.slice(0, -1).reverse().slice(0, 5);
    container.innerHTML = history.map(b => `<div class="bingo-ball-sm" style="opacity: 0.8; transform: scale(0.8);">${getBingoLabel(b)}</div>`).join('');
}

// UTILIDADES DE COMUNICACIÓN
async function fetchAPI(action, params = {}) {
    const url = new URL(window.API_URL);
    url.searchParams.append('action', action);
    for (const key in params) {
        url.searchParams.append(key, params[key]);
    }

    try {
        const response = await fetch(url.toString()); // Fetch simple para GAS
        return await response.json();
    } catch (e) {
        console.error("Error en fetchAPI:", e);
        return { status: 'error', message: e.message };
    }
}

async function sendPOST(data) {
    try {
        const response = await fetch(window.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (e) {
        console.error("Error en sendPOST:", e);
        return { status: 'error', message: e.message };
    }
}

// GESTIÓN DE ARCHIVOS (RECIBO)
let fileMeta = {
    base64: null,
    name: null,
    type: null
};

async function handleFileBingo(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        alert("El archivo es muy pesado (máximo 2MB)");
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        fileMeta.base64 = e.target.result;
        fileMeta.name = file.name;
        fileMeta.type = file.type;
        
        document.getElementById('uploadSection').innerHTML = `<p style="color:#10b981">📄 ${file.name} cargado</p>
                                                               <button type="button" onclick="enviarPagoBingo(event)" class="btn-bingo">Confirmar y Participar</button>`;
    };
    reader.readAsDataURL(file);
}

async function enviarPagoBingo(event) {
    if (event) event.preventDefault();
    const userId = sessionStorage.getItem('natillera_id');
    const resp = await sendPOST({
        action: 'comprarTablaBingo',
        juego_id: currentGameId,
        participante_id: userId,
        fileData: fileMeta.base64,
        fileName: fileMeta.name,
        mimeType: fileMeta.type
    });

    if (resp.status === 'success') {
        document.getElementById('statusSection').style.display = 'block';
        document.getElementById('uploadSection').style.display = 'none';
        checkAccess(); // Iniciar polleo inmediatamente
    } else {
        alert("Error al enviar pago: " + resp.message);
    }
}

// MECÁNICA DE JUEGO
function gritarBingo() {
    if (!confirm("¿ESTAS SEGURO QUE TIENES BINGO?")) return;
    
    sendPOST({
        action: 'reclamarBingo',
        juego_id: currentGameId,
        participante_id: sessionStorage.getItem('natillera_id')
    }).then(resp => {
        if (resp.status === 'success') {
            playSound('soundWin');
            alert("¡FELICIDIDADES! El administrador está verificando tu tabla.");
        } else {
            alert("Oops: " + resp.message);
        }
    });
}

function updateCardVisuals() {
    const cells = document.querySelectorAll('.bingo-cell');
    cells.forEach(cell => {
        const val = cell.dataset.val;
        const isMarked = cell.classList.contains('marked');
        const isCalled = calledBalls.includes(Number(val));
        
        if (!isMarked && isCalled && val !== 'FREE') {
            cell.classList.add('ready-to-mark');
        } else {
            cell.classList.remove('ready-to-mark');
        }
    });
}

function checkBingoWin() {
    const marked = document.querySelectorAll('.bingo-cell.marked').length;
    let canWin = false;
    
    if (currentModoJuego === 'FULL') {
        // 25 celdas en total (incluyendo FREE)
        canWin = (marked >= 25);
    } else {
        // Modo ANY: Admin decide reglas externas (líneas, etc), permitimos gritar con min 4 aciertos
        canWin = (marked >= 4);
    }
    
    const btn = document.getElementById('btnGritarBingo');
    if (btn) btn.style.display = canWin ? 'inline-block' : 'none';
}

function animateBall() {
    const el = document.getElementById('currentBall');
    el.classList.remove('ballPop');
    void el.offsetWidth; // Trigger reflow
    el.classList.add('ballPop');
}

function playSound(id) {
    const audio = document.getElementById(id);
    if (audio && audio.getAttribute('src')) { 
        audio.currentTime = 0; 
        audio.play().catch(e => {
            // Solo log por debajo de Error si es bloqueado por Autoplay
            if (e.name === 'NotAllowedError') console.warn("Audio autoplay bloqueado para:", id);
            else console.log("Audio play info:", id, e.message);
        }); 
    }
}

function getBingoLabel(n) {
    const num = Number(n);
    if (num >= 1 && num <= 15) return "B" + num;
    if (num >= 16 && num <= 30) return "I" + num;
    if (num >= 31 && num <= 45) return "N" + num;
    if (num >= 46 && num <= 60) return "G" + num;
    if (num >= 61 && num <= 75) return "O" + num;
    return num;
}

// LÓGICA DE CHAT
function toggleChat() {
    document.getElementById('chatContainer').classList.toggle('active');
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    const userId = sessionStorage.getItem('natillera_id');
    const userName = sessionStorage.getItem('natillera_name') || 'Socio';

    input.value = '';
    const resp = await sendPOST({
        action: 'sendBingoMessage',
        juego_id: currentGameId,
        usuario_id: userId,
        usuario_nombre: userName,
        mensaje: text,
        rol: 'socio'
    });

    if (resp.status === 'success') {
        syncChat();
    }
}

function renderChat(messages) {
    const container = document.getElementById('chatMessages');
    if (!messages || messages.length === lastChatLength) return;
    
    lastChatLength = messages.length;
    container.innerHTML = messages.map(m => `
        <div class="chat-msg ${m.rol === 'admin' ? 'msg-admin' : 'msg-socio'}">
            <span class="msg-name">${m.usuario_nombre}</span>
            ${m.mensaje}
        </div>
    `).join('');
    
    container.scrollTop = container.scrollHeight;
}

function formatCurrency(v) {
    if (typeof v !== 'number') return "$0";
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
}

function mostrarBotonNuevaRonda() {
    // Si ya existe, no duplicar
    if (document.getElementById('btnNovaRonda')) return;

    const container = document.querySelector('.game-scene');
    const btn = document.createElement('button');
    btn.id = 'btnNovaRonda';
    btn.innerText = "🔄 ESPERAR SIGUIENTE RONDA";
    btn.className = "btn-bingo";
    btn.style.position = "absolute";
    btn.style.zIndex = "100";
    btn.style.background = "#3b82f6";
    btn.onclick = () => window.location.reload(); 
    
    if (container) container.appendChild(btn);
}

function announceBall(ballCode) {
    if (!('speechSynthesis' in window)) return;
    
    // Asegurar que sea string para evitar errores de .split o .join
    const ballStr = String(ballCode);
    const text = `Balota: ${ballStr.split('').join(' ')}`; 
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    
    // Intentar hablar
    window.speechSynthesis.speak(utterance);
}

function initWebSocket() {
    if (!window.WS_URL || socket) return;
    
    // Asegurar identidad actualizada
    socioIdentity = sessionStorage.getItem('natillera_id') || socioIdentity;
    
    try {
        socket = new WebSocket(window.WS_URL);
        socket.onopen = () => {
            console.log("🔌 Conectado a WebSocket Relay");
            updateWSStatus(true);
            socket.send(JSON.stringify({
                type: 'join',
                room: `bingo_${currentGameId}`,
                identity: socioIdentity
            }));
        };
        socket.onmessage = (e) => {
            const msg = JSON.parse(e.data);
            handleSocketMessage(msg);
        };
        socket.onclose = () => {
            updateWSStatus(false);
            socket = null;
            setTimeout(initWebSocket, 5000);
        };
        socket.onerror = (e) => {
            console.error("WS Error:", e);
            updateWSStatus(false);
        };
    } catch (e) { 
        console.error("WS Error:", e);
        updateWSStatus(false);
    }
}

function updateWSStatus(connected) {
    const dot = document.getElementById('wsDot');
    const text = document.getElementById('wsText');
    if (dot) dot.style.background = connected ? '#10b981' : '#ef4444';
    if (text) text.innerText = connected ? 'Conectado' : 'Desconectado';
}

function handleSocketMessage(msg) {
    switch(msg.type) {
        case 'ball-drawn':
            syncState(); // Sincronizar balotas inmediatamente
            break;
        case 'chat-message':
            syncChat(); // Sincronizar chat inmediatamente
            break;
        case 'game-finished':
            syncState(); // Mostrar ganador inmediatamente
            break;
    }
}
