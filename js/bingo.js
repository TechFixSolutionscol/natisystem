// BINGO 3D - CLIENT LOGIC
window.API_URL = 'https://script.google.com/macros/s/AKfycbw7SBiUzhJtmmNwMN5bblvfyGMewgwijWaJ9Z_fIwYhpkFU3oyLBQNcARah_PEQFuv3/exec';
window.WS_URL = 'wss://tu-servidor-node.onrender.com'; // Placeholder
let currentGameId = null;
let myTable = null;
let calledBalls = [];
let pollingInterval = null;
let currentModoJuego = 'FULL';
let socket = null;
let socioIdentity = sessionStorage.getItem('natillera_id') || `socio_${Math.floor(Math.random()*1000)}`;

// Configuración de Polling
const MIN_POLL = 3000;
const MAX_POLL = 5000;
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
    // 0. Verificar Sesión
    const userId = sessionStorage.getItem('natillera_id');
    if (!userId || userId === 'undefined') {
        alert("Sesión no válida o expirada. Por favor, busca tu cédula nuevamente en el panel de consulta.");
        window.location.href = 'consulta.html';
        return;
    }

    // 1. Obtener Juego Activo
    const resp = await fetchAPI('getBingoState', { juego_id: 'LATEST' });
    if (resp && resp.status === 'success') {
        currentGameId = resp.juego_id;
        document.getElementById('valorTablaLabel').innerText = formatCurrency(resp.valor_tabla);
        checkAccess();
    } else {
        const errorMsg = resp && resp.message ? resp.message : "No se pudo conectar con el servidor";
        document.getElementById('uploadSection').innerHTML = `<div class="alert alert-warning">⚠️ ${errorMsg}. Por favor, contacta al administrador.</div>`;
    }
}

async function checkAccess() {
    const userId = sessionStorage.getItem('natillera_id');
    if (!userId) { window.location.href = 'login.html'; return; }

    const resp = await fetchAPI('getMisTablas', { participante_id: userId });
    
    let tablaAprobada = null;
    if (resp.status === 'success' && resp.data.length > 0) {
        // Buscar la tabla del juego actual que esté aprobada
        tablaAprobada = resp.data.find(t => String(t.juego_id) === String(currentGameId) && t.estado_pago === 'APROBADO');
    }

    if (tablaAprobada) {
        document.getElementById('overlayPago').style.display = 'none';
        myTable = JSON.parse(tablaAprobada.numeros_json);
        renderBingoCard(myTable);
        startSync();
        initWebSocket();
    } else {
        // Si no está aprobada (o no existe aún), mostramos estado y seguimos polleando
        document.getElementById('statusSection').style.display = 'block';
        document.getElementById('uploadSection').style.display = 'none';
        
        // Polleo de aprobación: Reintentar cada 4 segundos para mayor agilidad
        setTimeout(checkAccess, 4000);
    }
}

function renderBingoCard(matrix) {
    const container = document.getElementById('bingoCardContainer');
    let html = `<div class="bingo-card">`;
    
    // Cabecera B I N G O
    html += `<div class="bingo-header">
                <div>B</div><div>I</div><div>N</div><div>G</div><div>O</div>
             </div>`;
    
    html += `<div class="bingo-grid">`;
    
    // El formato de la matriz es col-major para facilitar la generación (B, I, N, G, O)
    // Pero lo renderizamos fila por fila
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const val = matrix[col][row];
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
        
        console.log("Estado sincronizado. Balotas:", calledBalls.length);

        // 6. Manejo de Estado Finalizado
        if (resp.estado === 'FINALIZADO') {
            const gameStatus = document.getElementById('gameStatus');
            if (gameStatus) {
                gameStatus.innerText = "¡JUEGO TERMINADO!";
                gameStatus.style.color = "#10b981";
            }
            // Mostrar ganador si existe
            if (resp.ganador_nombre) {
                const potLabel = document.getElementById('potLabel');
                if (potLabel) potLabel.innerText = `🏆 Ganador: ${resp.ganador_nombre}`;
            }
            
            // Detener polleo y mostrar botón de reinicio/salir
            if (pollingInterval) {
                clearTimeout(pollingInterval);
                pollingInterval = null;
            }
            
            mostrarBotonNuevaRonda();
        }

        // 6. Sincronizar Chat
        syncChat();

        // 7. Sincronizar Voz (Web Speech API Placeholder)
        // Se implementará con WebSockets en la siguiente fase
    }
}
async function syncChat() {
    const resp = await fetchAPI('getBingoMessages', { juego_id: currentGameId });
    if (resp.status === 'success') {
        renderChat(resp.data);
    }
}

function renderBallHistory() {
    const history = document.getElementById('lastBalls');
    const last3 = calledBalls.slice(-4, -1).reverse();
    history.innerHTML = last3.map(b => `<div style="width:30px;height:30px;background:#fff;color:#000;border-radius:50%;display:flex;justify-content:center;align-items:center;font-size:0.8rem;font-weight:bold;">${getBingoLabel(b)}</div>`).join('');
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
    
    // El formato es "B-12", "I-25", etc.
    const text = `Balota: ${ballCode.split('-').join(' ')}`; 
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    
    // Intentar hablar
    window.speechSynthesis.speak(utterance);
}

function initWebSocket() {
    if (!window.WS_URL || socket) return;
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
