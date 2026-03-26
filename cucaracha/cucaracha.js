/**
 * LA CUCARACHA - LÓGICA DEL CLIENTE
 */

const CONFIG = {
    POLLING_INTERVAL: 3000,
    DICE_ANIMATION_DURATION: 1500,
    // Intentar obtener la URL global del padre (index.html) o usar la hardcoded si falla
    SCRIPT_URL: (window.parent && window.parent.API_URL) ? window.parent.API_URL : 'https://script.google.com/macros/s/AKfycbw7SBiUzhJtmmNwMN5bblvfyGMewgwijWaJ9Z_fIwYhpkFU3oyLBQNcARah_PEQFuv3/exec',
    WS_URL: 'wss://natillerasistem.onrender.com'
};

let state = {
    partidaId: null,
    playerName: null,
    status: 'login',
    phase: 'ESPERA',
    lastRondaNum: 0,
    availableDice: [],
    progreso: { piezas_marcadas: [], dados_guardados: 0 },
    isRolling: false,
    pollTimer: null,
    isMuted: false,
    pendingMarks: new Set(),
    boardInitialized: false,
    socket: null,
    identity: `jugador_${Math.floor(Math.random() * 1000)}`,
    hasDecided: false,
    lastDecision: null,
    selectionZone: null,
    decisionTimer: null,
    decisionTimeLeft: 15
};


// --- INICIALIZACIÓN ---
window.onload = async () => {
    handleUrlParams();
    detectActiveGame();
};

function handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const urlName = params.get('nombre') || params.get('name');
    const urlCedula = params.get('cedula') || params.get('id');

    // Intentar obtener de sessionStorage (Bingo compatibility)
    const sessionName = sessionStorage.getItem('natillera_name');
    const sessionCedula = sessionStorage.getItem('natillera_id');

    const finalName = (urlName || sessionName || "").trim();
    const finalCedula = (urlCedula || sessionCedula || "").trim();

    if (finalName) {
        state.playerName = finalName;
        localStorage.setItem('cucaracha_player_name', finalName);

        const input = document.getElementById('playerName');
        if (input) {
            input.value = finalName;
            // No ocultamos el input aún, dejamos que el usuario vea su sesión lista
        }

        const infoText = document.querySelector('#loginForm p.text-muted');
        if (infoText) {
            infoText.innerHTML = `Hola <strong style="color:var(--gold); font-size:1.2rem;">${finalName}</strong>,<br>tu sesión de Socio está lista. <br>Solo falta adjuntar tu recibo para entrar:`;
        }
        
        // NO llamamos a preLogin(finalName) aquí automáticamente. 
        // Dejamos que el flujo de syncState detecte si ya existe o que el usuario se registre.
    }

    if (finalCedula) {
        localStorage.setItem('cucaracha_player_cedula', finalCedula);
    }
}

function startDecisionTimer(forcedTime = 20) {
    if (state.decisionTimer) {
        // Si ya está corriendo pero el desfase es grande, reiniciamos el tiempo
        if (Math.abs(state.decisionTimeLeft - forcedTime) > 2) {
            state.decisionTimeLeft = forcedTime;
        }
        return;
    }

    state.decisionTimeLeft = forcedTime;
    const timerClock = document.getElementById('neonClock');

    if (timerClock) {
        const ss = state.decisionTimeLeft.toString().padStart(2, '0');
        timerClock.textContent = `00:${ss}`;
        timerClock.classList.remove('low-time');
        if (state.decisionTimeLeft <= 5) timerClock.classList.add('low-time');
    }

    // Iniciar intervalo
    state.decisionTimer = setInterval(() => {
        state.decisionTimeLeft--;
        const ss = state.decisionTimeLeft.toString().padStart(2, '0');
        
        if (timerClock) {
            timerClock.textContent = `00:${ss}`;
            if (state.decisionTimeLeft <= 5) {
                timerClock.classList.add('low-time');
            }
        }

        if (state.decisionTimeLeft <= 0) {
            stopDecisionTimer();
            if (timerClock) {
                timerClock.textContent = "00:00";
            }
            submitDecisionV2('PASAR');
        }
    }, 1000);
}

function stopDecisionTimer() {
    if (state.decisionTimer) {
        clearInterval(state.decisionTimer);
        state.decisionTimer = null;
    }
    const timerClock = document.getElementById('neonClock');
    if (timerClock) {
        timerClock.textContent = "00:20";
        timerClock.classList.remove('low-time');
    }
}

async function detectActiveGame() {
    try {
        const res = await fetch(`${CONFIG.SCRIPT_URL}?action=getPartidaActivaCucaracha`);
        const data = await res.json();

        if (data.status === 'success' && data.partida) {
            state.partidaId = data.partida.id;
            startPolling();
            checkSession();
            initWebSocket();
        } else {
            document.getElementById('gameStatus').innerText = "NO HAY PARTIDAS ACTIVAS";
        }
    } catch (e) {
        console.error("Error detectando partida:", e);
    }
}

function checkSession() {
    const params = new URLSearchParams(window.location.search);
    const urlName = params.get('nombre') || params.get('name');

    const savedName = urlName || localStorage.getItem('cucaracha_player_name');
    const savedPartidaId = localStorage.getItem('cucaracha_partida_id');

    // Si tenemos nombre (de URL o LocalStorage) y hay partida, intentamos entrar
    if (savedName && state.partidaId) {
        state.playerName = savedName;
        // PERSISTENCIA: Si viene de URL, lo guardamos para futuras recargas
        if (urlName) localStorage.setItem('cucaracha_player_name', urlName);

        // NO llamamos a preLogin automáticamente para permitir registro de nuevos socios
        // El syncState se encargará de detectar si ya es un jugador aprobado
    }
}

function preLogin(name) {
    state.playerName = name;
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('loadingSection').classList.remove('hidden');

    // El timeout ahora es de 10s y simplemente libera el formulario si algo falla
    setTimeout(() => {
        if (state.status === 'login') {
            document.getElementById('loadingSection').classList.add('hidden');
            document.getElementById('loginForm').classList.remove('hidden');
        }
    }, 10000);
}

function showWaitingScreen() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('loadingSection').classList.add('hidden');
    document.getElementById('waitingSection').classList.remove('hidden');

    // Asegurar que el overlay general sea visible
    document.getElementById('loginOverlay').classList.remove('hidden');
}

function showLoginOverlay() {
    document.getElementById('loginOverlay').classList.remove('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('loadingSection').classList.add('hidden');
    document.getElementById('waitingSection').classList.add('hidden');
}

// --- REGISTRO Y LOGIN ---
async function registerPlayer() {
    const nameInput = document.getElementById('playerName');
    const fileInput = document.getElementById('receiptFile');
    const cleanName = (nameInput.value || "").trim();

    if (!cleanName) return alert("Por favor ingresa tu nombre");
    if (!fileInput.files[0]) return alert("Por favor sube la foto de tu recibo");

    toggleLoader(true);

    try {
        const base64 = await toBase64(fileInput.files[0]);
        const payload = {
            action: 'registrarJugadorCucaracha',
            partidaId: state.partidaId,
            nombre: cleanName,
            cedula: new URLSearchParams(window.location.search).get('cedula') || sessionStorage.getItem('natillera_id') || localStorage.getItem('cucaracha_player_cedula') || '',
            fotoBase64: base64
        };

        const res = await fetch(CONFIG.SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.status === 'success') {
            state.playerName = cleanName;
            localStorage.setItem('cucaracha_player_name', state.playerName);
            localStorage.setItem('cucaracha_partida_id', state.partidaId);

            showWaitingScreen();
            startPolling();
        } else {
            alert("Error: " + data.message);
        }
    } catch (e) {
        console.error(e);
        alert("Error de conexión con el servidor");
    } finally {
        toggleLoader(false);
    }
}

// --- POLLING Y SINCRONIZACIÓN ---
function startPolling() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = setInterval(syncState, CONFIG.POLLING_INTERVAL);
    syncState(); // Primera carga inmediata
}

async function syncState() {
    if (!state.partidaId || state.isRolling) return;

    try {
        const res = await fetch(`${CONFIG.SCRIPT_URL}?action=getEstadoPartidaCucaracha&partidaId=${state.partidaId}`);
        const data = await res.json();

        if (data.status === 'success') {
            handleGameStateUpdate(data);
        }
    } catch (e) {
        console.warn("Error syncState:", e);
    }
}

function formatCurrency(val) {
    if (isNaN(val)) return "$0";
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
}

function handleGameStateUpdate(res) {
    if (!res || !res.status) return;
    const { partida, jugadores, config } = res;

    // 1. Actualizar Info General (Usando IDs reales de index.html)
    const potEl = document.getElementById('potTotal');
    const prizeEl = document.getElementById('yourPrize');
    if (potEl) potEl.innerText = formatCurrency(partida.pozo_total);
    if (prizeEl) prizeEl.innerText = formatCurrency(partida.pozo_total * 0.5);

    // V2: Fase y Temporizador
    const oldPhase = state.phase;
    state.phase = partida.fase_actual || 'ESPERA';

    if (state.phase === 'ESPERA' && oldPhase !== 'ESPERA') {
        state.pendingMarks.clear();
        state.hasDecided = false;
        state.selectionZone = null;
    }

    document.getElementById('gameStatus').innerText = state.phase;
    document.getElementById('phaseLabel').innerText = `RONDA ${partida.ronda_actual || 1}`;

    // 2. Gestionar Pantallas (Normalización Agresiva)
    const normalize = s => (s || "").toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ');

    const targetName = normalize(state.playerName);

    // Buscar la MEJOR fila (mayor progreso) en caso de duplicidad accidental
    let myData = null;
    let bestScore = -1;
    jugadores.forEach(j => {
        if (normalize(j.nombre) === targetName) {
            const score = parseInt(j.piezas_completadas) || 0;
            if (score > bestScore) {
                bestScore = score;
                myData = j;
            }
        }
    });

    if (!myData) {
        // MEJORA: No redirigir inmediatamente si estamos en fase de espera o si el estado local es 'waiting'
        // Esto previene que un lag en el servidor expulse al jugador justo después de registrarse.
        console.warn(`Jugador "${state.playerName}" no encontrado en la lista de ${jugadores.length} jugadores.`);
        
        // Si la partida ya finalizó, o si llevamos mucho tiempo sin encontrar al jugador, redirigimos
        if (partida.estado && partida.estado.toLowerCase() === 'finalizada') {
            console.log("Sesión terminada por fin de partida.");
        } else if (state.status === 'playing') { 
            // Si ya estábamos jugando y desaparecimos, es un error fatal o expulsión
            console.warn("Jugador desapareció de la lista activa. Redirigiendo a login...");
            state.status = 'login';
            showLoginOverlay();
        } else {
            // Si estábamos en 'waiting' o 'login', simplemente permanecemos en espera un poco más
            console.log("Jugador aún no aprobado o en registro. Manteniendo espera...");
            state.status = 'waiting';
            showWaitingScreen();
        }
        return;
    }

    console.log("Jugador encontrado! Estado:", myData.estado);
    if (myData.estado === 'pendiente') {
        state.status = 'waiting';
        showWaitingScreen();
        return;
    } else {
        state.status = 'playing';
        state.progreso = myData.progreso || { piezas_marcadas: [] };
        localStorage.setItem('cucaracha_partida_id', partida.id);

        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('loadingSection').classList.add('hidden');
        document.getElementById('waitingSection').classList.add('hidden');

        // V2: Prioridad
        let prioridadLista = [];
        try {
            prioridadLista = JSON.parse(partida.prioridad_lista || '[]');
        } catch (e) { console.warn("Error prioridad:", e); }

        const myRank = prioridadLista.indexOf(state.playerName) + 1;
        document.getElementById('myPriorityVal').innerText = myRank > 0 ? `${myRank} / ${prioridadLista.length}` : '-';

        // 3. Lógica de Fases
        const rollStatus = document.getElementById('rollStatus');
        if (state.phase === 'DECIDIENDO') {
            // Lógica de disponibilidad mejorada: ver si hay ALGO que pueda marcar
            const hasAnyDie = state.availableDice.some(d => [1, 2, 3].includes(Number(d)));
            const counts = {
                1: state.availableDice.filter(d => Number(d) === 1).length,
                2: state.availableDice.filter(d => Number(d) === 2).length,
                3: state.availableDice.filter(d => Number(d) === 3).length
            };

            // Un jugador puede marcar si tiene piezas pendientes por usar de algún dado disponible
            const canMarkAny = (counts[1] > 0 || counts[2] > 0 || counts[3] > 0);

            document.getElementById('decisionPanel').classList.remove('hidden');
            if (rollStatus) rollStatus.innerText = canMarkAny
                ? `¡ADELANTE! ELIGE TU JUGADA (Usa dados '1', '2' o '3')`
                : `✅ No tienes dados útiles en esta ronda`;

            // INICIAR TEMPORIZADOR DE AUTO-PASO si aún no ha decidido
            if (!state.hasDecided && !state.decisionTimer) {
                startDecisionTimer();
            }



            // Actualizar botones de acción centrales
            updateActionButtons(canMarkAny);

        } else {
            document.getElementById('decisionPanel').classList.add('hidden');
            if (rollStatus) rollStatus.innerText = "Esperando lanzamiento del Administrador...";
            stopDecisionTimer();
        }

        // 4. Sincronizar dados disponibles
        if (partida.dados_actuales) {
            const dados = JSON.parse(partida.dados_actuales);
            state.availableDice = [...dados];

            if (partida.ronda_actual > state.lastRondaNum) {
                state.hasDecided = false;
                state.lastDecision = null;
                state.pendingMarks.clear();
                triggerDiceAnimation(dados, myData.progreso);
                state.lastRondaNum = partida.ronda_actual;
            } else if (!state.isRolling) {
                updateCockroachVisuals(myData.progreso);
            }
        }
    }

    // 5. Ranking
    renderRanking(jugadores, config.PIEZAS_TOTALES);

    // 6. Detección de Victoria / Fin de Ronda (Nuevo Flujo V3)
    const estadoNormal = (partida.estado || '').toUpperCase();

    if (estadoNormal === 'FIN_RONDA') {
        // BLOQUEO TOTAL
        document.getElementById('decisionPanel').classList.add('hidden');
        if (!state.victoryShown) {
            const winnerName = partida.ganador || "ALGUIEN";
            showVictoryOverlay(winnerName);
            state.victoryShown = true;
        }
    } else if (estadoNormal === 'EN_JUEGO' || estadoNormal === 'ESPERA') {
        // Reset de pantalla de victoria si se inicia nueva ronda
        if (state.victoryShown) {
            if (!state.isMuted) playSound('reset');
            const statusMsg = document.getElementById('victoryStatus');
            const waitMsg = document.getElementById('adminWaitMessage');
            if (statusMsg) statusMsg.innerHTML = '<p class="pulse-text" style="color:var(--gold);">¡EL ADMINISTRADOR HA INICIADO UNA NUEVA RONDA! <br> Prepárate...</p>';
            if (waitMsg) waitMsg.classList.add('hidden');

            const overlay = document.querySelector('.victory-overlay');
            if (overlay) {
                setTimeout(() => {
                    overlay.style.opacity = '0';
                    overlay.style.transition = 'opacity 1s ease';
                    setTimeout(() => {
                        overlay.remove();
                        state.victoryShown = false;
                        // Reset visual local
                        state.lastRondaNum = 0;
                        state.pendingMarks.clear();
                        state.selectionZone = null; // Limpiar zona al reiniciar
                        updateCockroachVisuals({ piezas_marcadas: [] });
                        updateActionButtons(); // Resetear botones
                        console.log("Reiniciado para nueva ronda.");
                    }, 1000);
                }, 2000); // 2 segundos de mensaje de reinicio
            }
        }
    }
}

function showVictoryOverlay(winner) {
    if (!state.isMuted) {
        playSound('win');
        setTimeout(() => playSound('applause'), 1000);
    }

    // Confeti
    if (typeof confetti === 'function') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 10000 });
        setTimeout(() => confetti({ particleCount: 100, spread: 100, origin: { y: 0.7 }, zIndex: 10000 }), 1500);
    }

    const overlay = document.createElement('div');
    overlay.className = 'victory-overlay';
    overlay.id = 'victoryOverlay';
    overlay.innerHTML = `
        <div class="victory-content glass-card animate-zoom">
            <h1 class="premium-title glow-text">🏆 ¡VICTORIA! 🏆</h1>
            <div class="winner-display">
                <div class="winner-avatar">👑</div>
                <p class="winner-name">${winner}</p>
            </div>
            <div id="victoryStatus" class="mt-4">
                <p class="pulse-text">¡HA COMPLETADO LA CUCARACHA!</p>
            </div>
            <div id="adminWaitMessage" class="hidden mt-4">
                <div class="spinner-premium mx-auto mb-2"></div>
                <p style="font-size:0.9rem; color:var(--gold);">Esperando decisión del administrador...</p>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Mostrar mensaje de espera tras 5 segundos de gloria
    setTimeout(() => {
        const waitMsg = document.getElementById('adminWaitMessage');
        const statusMsg = document.getElementById('victoryStatus');
        if (waitMsg) waitMsg.classList.remove('hidden');
        if (statusMsg) statusMsg.classList.add('hidden');
    }, 5000);
}


// --- ANIMACIONES Y UI ---
// --- V6: MOTOR DE DADOS 3D ---
function createDice3D(container, index, side = 1) {
    const diceHtml = `
        <div class="dice-container-3d" id="dice-container-${index}">
            <div class="dice-cube show-${side}">
                <div class="die-side side-1"><div class="dot"></div></div>
                <div class="die-side side-2"><div class="dot"></div><div class="dot"></div></div>
                <div class="die-side side-3"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
                <div class="die-side side-4"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
                <div class="die-side side-5"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
                <div class="die-side side-6"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', diceHtml);
}

function triggerDiceAnimation(dados, finalProgreso) {
    state.isRolling = true;
    const grid = document.getElementById('diceGrid');
    if (!grid) return;

    grid.innerHTML = '';
    // Crear los 10 dados inicialmente
    for (let i = 0; i < 10; i++) {
        let currentCube = grid.querySelector(`#dice-container-${i} .dice-cube`);
        if (!currentCube) {
            createDice3D(grid, i, 1);
            currentCube = grid.querySelector(`#dice-container-${i} .dice-cube`);
        }

        if (dados[i] === '?' || state.isRolling) {
            currentCube.classList.add('rolling');
        } else {
            currentCube.classList.remove('rolling');
        }
    }


    if (!state.isMuted) playSound('roll');

    setTimeout(() => {
        // Detener rotación y mostrar resultados finales con rotación 3D
        for (let i = 0; i < 10; i++) {
            const cube = grid.querySelector(`#dice-container-${i} .dice-cube`);
            if (cube) {
                cube.classList.remove('rolling');
                // Remover clases show-X previas
                for (let s = 1; s <= 6; s++) cube.classList.remove(`show-${s}`);
                // Aplicar el resultado real si es válido
                const valor = Number(dados[i]);
                if (!isNaN(valor) && valor >= 1 && valor <= 6) {
                    cube.classList.add(`show-${valor}`);
                }

            }
        }

        renderAvailableDice();
        updateCockroachVisuals(finalProgreso);
        state.isRolling = false;
    }, CONFIG.DICE_ANIMATION_DURATION);
}

function renderAvailableDice() {
    const diceElements = document.querySelectorAll('.die');
    diceElements.forEach(d => d.classList.remove('used'));
}


function playSound(type) {
    if (state.isMuted) return;

    let audioId = 'soundBall'; // Default
    if (type === 'mark') audioId = 'soundBall';
    if (type === 'roll') audioId = 'soundRoll';
    if (type === 'win') audioId = 'soundWin';
    if (type === 'error') audioId = 'soundError';

    const audio = document.getElementById(audioId);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.warn("Audio blocked:", e));
    }
}

function initWebSocket() {
    if (state.socket) return;
    try {
        state.socket = new WebSocket(CONFIG.WS_URL);
        state.socket.onopen = () => {
            console.log("🔌 Conectado a WebSocket Relay (Cucaracha)");
            if (state.partidaId) {
                state.socket.send(JSON.stringify({
                    type: 'join',
                    room: `cucaracha_${state.partidaId}`,
                    identity: state.identity
                }));
            }
        };
        state.socket.onmessage = (e) => {
            const msg = JSON.parse(e.data);
            handleSocketMessage(msg);
        };
        state.socket.onclose = () => {
            state.socket = null;
            setTimeout(initWebSocket, 5000);
        };
    } catch (e) { console.error("WS error:", e); }
}

function handleSocketMessage(msg) {
    if (state.status !== 'playing') return; // Ignorar ruidos y animaciones si no estamos dentro
    switch (msg.type) {
        case 'cucaracha-dice':
            // El admin lanzó dados -> Mostrar animación y sonido inmediatamente
            if (!state.isRolling) {
                // Usamos '?' para la animación hasta que el polleo traiga los reales
                triggerDiceAnimation(['?', '?', '?', '?', '?'], state.progreso);
                playSound('roll');
            }
            break;
        case 'piece-marked':
            // Otro jugador marcó una pieza
            playSound('mark');
            break;
    }
}

function updateCockroachVisuals(progreso) {
    const prog = progreso || state.progreso || {};
    const serverMarks = prog.piezas_marcadas || [];

    // Conciliación: Si el servidor ya tiene la pieza, la quitamos de pendientes
    serverMarks.forEach(n => state.pendingMarks.delete(Number(n)));

    // Unión de marcas para visualización (Mantenemos pendingMarks solo para efecto visual)
    const piezas_visuales = new Set([
        ...serverMarks.map(n => Number(n)),
        ...Array.from(state.pendingMarks)
    ]);


    // 1. Inicializar eventos solo una vez
    if (!state.boardInitialized) {
        for (let i = 0; i < 36; i++) {
            const node = document.getElementById(`node-${i}`);
            if (!node) continue;
            const textEl = node.querySelector('text');
            if (!textEl) continue;
            const val = Number(textEl.textContent);
            node.onclick = () => marcarPieza(i, val);

            let tipo = 'PATA';
            if (i >= 24) tipo = 'CABEZA';
            if (i >= 32) tipo = 'COLA';
            node.setAttribute('data-tipo', tipo);
        }
        state.boardInitialized = true;
    }

    // 2. Actualizar estado visual de cada nodo (Bingo Style)
    for (let i = 0; i < 36; i++) {
        const node = document.getElementById(`node-${i}`);
        if (!node) continue;

        const isMarked = piezas_visuales.has(i);
        const textEl = node.querySelector('text');
        const valRequired = textEl ? Number(textEl.textContent) : 0;
        const diceAvailable = state.availableDice.some(d => Number(d) === valRequired);

        // 2. Resaltar piezas según zona seleccionada y disponibilidad
        node.classList.remove('marked', 'selected-action', 'can-mark', 'zone-highlight');

        if (isMarked) {
            node.classList.add('marked');
            if (state.pendingMarks.has(i)) node.classList.add('selected-action'); // Diferenciar visualmente las pendientes
        } else if (state.phase === 'DECIDIENDO') {

            // Verificar si esta pieza pertenece a la zona seleccionada
            const tipo = node.getAttribute('data-tipo');
            const inZone = state.selectionZone === tipo; // RESTRICCIÓN: Solo si la zona coincide exactamente

            if (inZone && diceAvailable) {
                node.classList.add('can-mark');
            }
            if (state.selectionZone && state.selectionZone === tipo && !isMarked) {
                node.classList.add('zone-highlight');
            }
        }
    }

    // 3. Barra de progreso SÓLO BASADA EN EL SERVIDOR
    const serverTotal = serverMarks.length;
    const percent = (serverTotal / 36) * 100;
    const mainProgressBar = document.getElementById('mainProgressBar');
    if (mainProgressBar) mainProgressBar.style.width = `${percent}%`;

    const piecesCountLabel = document.getElementById('piecesCountLabel');
    if (piecesCountLabel) {
        piecesCountLabel.innerText = `CARRERA: ${serverTotal} / 36 PIEZAS`;
    }


    // 4. Actualizar estado de los dados
    updateDiceVisualsAfterConsumption();
}


async function marcarPieza(idx, valRequired) {
    if (state.status !== 'playing' || !state.partidaId || state.isRolling) return;
    if (state.phase !== 'DECIDIENDO') {
        addChatMessage('SISTEMA', "Espera a la fase de DECISIÓN para elegir pieza.", true);
        return;
    }

    // Enviar la pieza específica elegida por el usuario
    submitDecisionV2(`CONSTRUIR_${idx}`);
}

async function submitDecisionV2(decision) {
    if (state.phase !== 'DECIDIENDO') {
        addChatMessage('SISTEMA', '⚠️ Espera a que el administrador lance los dados.', true);
        return;
    }

    stopDecisionTimer();
    // NO marcamos hasDecided aquí todavía, dejamos que el usuario marque varias veces si tiene dados

    if (decision === 'PASAR') {
        state.hasDecided = true; // El PASAR sí es final
        state.pendingMarks.clear();
        state.selectionZone = null;
        state.lastDecision = 'PASAR';
        updateCockroachVisuals(state.progreso);
        enviarDecisionAlServidor(state.lastDecision);
        return;
    }

    // MODO SELECTOR DE ZONA: PATA, CABEZA, COLA solo activan la zona visual
    if (decision === 'PATA' || decision === 'CABEZA' || decision === 'COLA') {
        // RESTRICCIÓN: Si ya hay una zona seleccionada, NO dejamos cambiar (bloqueo solicitado por usuario)
        if (state.selectionZone && state.selectionZone !== decision) {
            addChatMessage('SISTEMA', `🛑 Ya seleccionaste ${state.selectionZone}. Debes terminar tu turno o PASAR.`, true);
            return;
        }

        const oldZone = state.selectionZone;
        
        // Bloqueo total: Una vez seleccionado, no se puede deseleccionar (toggle off desactivado)
        state.selectionZone = decision;

        playSound('mark');
        addChatMessage('SISTEMA', `👉 Zona ${state.selectionZone} activa. Haz clic en las piezas para construir.`, true);

        updateCockroachVisuals(state.progreso);
        updateActionButtons(); // Actualizar visual de botones

        // SI la zona cambió, informamos al servidor para que el administrador la vea
        if (state.selectionZone !== oldZone) {
            enviarDecisionAlServidor(state.selectionZone || 'EN ESPERA');
        }
        return;
    }


    // CONSTRUIR_X: Marcado específico de pieza (clic directo en el tablero)
    let added = false; // Inicializar variable de control

    if (decision.startsWith('CONSTRUIR_')) {
        const idx = parseInt(decision.split('_')[1]);
        if (state.pendingMarks.has(idx)) return; // Ya pendiente

        // RESTRICCIÓN: Debe haber una zona seleccionada
        if (!state.selectionZone) {
            addChatMessage('SISTEMA', '⚠️ Primero selecciona la zona (PATA, CABEZA o COLA) que quieres construir.', true);
            return;
        }

        // RESTRICCIÓN: La pieza debe coincidir con la zona seleccionada
        let tipoPieza = 'PATA';
        if (idx >= 24 && idx < 32) tipoPieza = 'CABEZA';
        if (idx >= 32) tipoPieza = 'COLA';

        if (tipoPieza !== state.selectionZone) {
            addChatMessage('SISTEMA', `🛑 Esa pieza no pertenece a la zona ${state.selectionZone} que seleccionaste.`, true);
            return;
        }

        // Determinar qué dado necesita esta pieza
        let valRequired = 1;
        if (idx >= 24 && idx < 32) valRequired = 2;
        if (idx >= 32) valRequired = 3;

        const countPool = state.availableDice.filter(d => Number(d) === valRequired).length;

        // Contar cuántas piezas de este tipo ya tenemos en pendientes
        const countUsedThisVal = Array.from(state.pendingMarks).filter(pIdx => {
            let pVal = 1;
            if (pIdx >= 24 && pIdx < 32) pVal = 2;
            if (pIdx >= 32) pVal = 3;
            return pVal === valRequired;
        }).length;

        if (countUsedThisVal >= countPool) {
            addChatMessage('SISTEMA', `🛑 No puedes marcar más piezas de este tipo. Solo hay ${countPool} dados '${valRequired}' disponibles.`, true);
            return;
        }

        state.pendingMarks.add(idx);
        added = true;
    }


    if (added) {
        playSound('mark');
        state.lastDecision = Array.from(state.pendingMarks).map(idx => `CONSTRUIR_${idx}`).join(',');
        updateCockroachVisuals(state.progreso);
        enviarDecisionAlServidor(state.lastDecision);
    }
}


async function enviarDecisionAlServidor(decisionStr) {
    try {
        await fetch(CONFIG.SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'enviarDecisionCucaracha',
                partidaId: state.partidaId,
                nombre: state.playerName,
                decision: decisionStr
            })
        });
        addChatMessage('SISTEMA', `✅ Enviado: ${state.pendingMarks.size} pieza(s).`, true);
    } catch (e) {
        console.error("Error al enviar:", e);
    }
}

function updateDiceVisualsAfterConsumption() {
    const diceElements = Array.from(document.querySelectorAll('.dice-container-3d'));
    const currentAvailable = [...state.availableDice].map(n => Number(n));

    // Todas las piezas ahora consumen dados '1'
    let toConsume = state.pendingMarks.size;

    diceElements.forEach((el, i) => {
        const cube = el.querySelector('.dice-cube');
        if (cube) {
            const val = currentAvailable[i];
            const isUsed = (val === 1 && toConsume > 0);
            if (isUsed) toConsume--;

            cube.style.opacity = isUsed ? '0.3' : '1';
            cube.style.filter = isUsed ? 'grayscale(1)' : 'none';
        }
    });
}



function renderRanking(jugadores, totalPiezas) {
    const container = document.getElementById('playerRanking');
    container.innerHTML = jugadores.map(j => `
        <div class="player-chip ${j.nombre === state.playerName ? 'active' : ''}">
            <span class="name">${j.nombre}</span>
            <span class="score">${j.piezas_completadas}/${totalPiezas}</span>
        </div>
    `).join('');
}

/**
 * Actualiza el estado visual de los botones de acción para reflejar los bloqueos
 */
function updateActionButtons(canMarkAny = true) {
    const buttons = document.querySelectorAll('.btn-decision');
    buttons.forEach(btn => {
        const onclickText = btn.getAttribute('onclick') || "";
        let action = "";
        if (onclickText.includes("'PATA'")) action = 'PATA';
        else if (onclickText.includes("'CABEZA'")) action = 'CABEZA';
        else if (onclickText.includes("'COLA'")) action = 'COLA';
        else if (onclickText.includes("'PASAR'")) action = 'PASAR';

        if (!action) return;
        const isPasar = action === 'PASAR';

        // 1. Si ya decidió definitivamente (ej. pulsó PASAR o ganó), todo bloqueado
        if (state.hasDecided) {
            btn.disabled = true;
            btn.style.opacity = '0.3';
            btn.style.filter = 'grayscale(1)';
            btn.classList.remove('selected-glow');
            return;
        }

        // 2. Si hay una zona seleccionada, bloquear las demás (excepto PASAR)
        if (state.selectionZone) {
            if (action !== state.selectionZone && !isPasar) {
                btn.disabled = true;
                btn.style.opacity = '0.3';
                btn.style.filter = 'grayscale(1)';
                btn.style.cursor = 'not-allowed';
                btn.classList.remove('selected-glow');
            } else {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.filter = 'none';
                btn.style.cursor = 'pointer';
                if (action === state.selectionZone) {
                    btn.classList.add('selected-glow');
                } else {
                    btn.classList.remove('selected-glow');
                }
            }
        } else {
            // 3. Si no hay zona, habilitar según disponibilidad de dados (PASAR siempre disponible)
            btn.disabled = !isPasar && !canMarkAny;
            btn.style.opacity = (!isPasar && !canMarkAny) ? '0.3' : '1';
            btn.style.filter = (!isPasar && !canMarkAny) ? 'grayscale(0.5)' : 'none';
            btn.style.cursor = btn.disabled ? 'not-allowed' : 'pointer';
            btn.classList.remove('selected-glow');
        }
    });
}

// --- UTILS ---
function formatCurrency(val) {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
}

function showWaitingScreen() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('waitingSection').classList.remove('hidden');
}

function toggleLoader(show) {
    document.getElementById('btnEnter').disabled = show;
    document.getElementById('btnLoader').classList.toggle('hidden', !show);
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function previewReceipt(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('uploadPlaceholder').classList.add('hidden');
            const preview = document.getElementById('previewContainer');
            preview.innerHTML = `<img src="${e.target.result}" style="max-width:100%; border-radius:10px;">`;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

// --- V2: FUNCIONES DE LOGICA Y CHAT ---


function startTimer(seconds) {
    const timerBar = document.getElementById('roundTimer');
    timerBar.classList.remove('hidden');
    timerBar.style.width = '100%';

    setTimeout(() => {
        timerBar.style.width = '0%';
    }, 100);

    timerBar.style.transition = `width ${seconds}s linear`;
}

function resetTimer() {
    const timerBar = document.getElementById('roundTimer');
    timerBar.classList.add('hidden');
    timerBar.style.width = '100%';
    timerBar.style.transition = 'none';
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;

    if (state.socket && state.socket.readyState === 1) {
        state.socket.send(JSON.stringify({
            type: 'chat',
            room: `cucaracha_${state.partidaId}`,
            user: state.playerName,
            text: msg
        }));
        input.value = '';
    }
}

function sendEmoji(emoji) {
    if (state.socket && state.socket.readyState === 1) {
        state.socket.send(JSON.stringify({
            type: 'emoji',
            room: `cucaracha_${state.partidaId}`,
            user: state.playerName,
            emoji: emoji
        }));
    }
}

function addChatMessage(user, text, isSystem = false) {
    const chatContent = document.getElementById('chatMessages');
    const msgEl = document.createElement('p');
    msgEl.className = isSystem ? 'system-msg' : 'chat-msg';

    if (isSystem) {
        msgEl.innerText = text;
    } else {
        msgEl.innerHTML = `<span class="user">${user}:</span> ${text}`;
    }

    chatContent.appendChild(msgEl);
    chatContent.scrollTop = chatContent.scrollHeight;
}

// Actualizar handleSocketMessage para soportar chat y emojis
function handleSocketMessage(msg) {
    switch (msg.type) {
        case 'chat':
            addChatMessage(msg.user, msg.text);

            // Si el chat está cerrado, aumentar el badge de notificaciones
            const sidebar = document.getElementById('chatSidebar');
            if (sidebar.classList.contains('hidden')) {
                const badge = document.getElementById('chatBadge');
                const current = parseInt(badge.innerText || '0');
                badge.innerText = current + 1;
                badge.classList.remove('hidden');
            }
            break;
        case 'emoji':
            showFloatingEmoji(msg.emoji);
            break;
        case 'cucaracha-dice':
            if (!state.isRolling) {
                triggerDiceAnimation(['?', '?', '?', '?', '?', '?', '?', '?', '?', '?'], state.progreso);
                playSound('roll');
            }
            break;
    }
}

function showFloatingEmoji(emoji) {
    const el = document.createElement('div');
    el.className = 'floating-emoji';
    el.innerText = emoji;
    el.style.left = `${Math.random() * 80 + 10}%`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
}

// --- V3: REDISEÑO - CHAT FLOTANTE ---
function toggleChat() {
    const sidebar = document.getElementById('chatSidebar');
    const badge = document.getElementById('chatBadge');

    const isHidden = sidebar.classList.toggle('hidden');

    if (!isHidden) {
        // Al abrir, limpiar notificaciones y hacer scroll al final
        badge.innerText = '0';
        badge.classList.add('hidden');
        const content = document.getElementById('chatMessages');
        content.scrollTop = content.scrollHeight;
        document.getElementById('chatInput').focus();
    }
}
