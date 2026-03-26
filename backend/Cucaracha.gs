/**
 * LA CUCARACHA - MOTOR DE JUEGO (Nati System)
 * Basado en lanzamientos de dados compartidos y construcción de figuras.
 */

const CUCARACHA_CONFIG = {
  PIEZAS_TOTALES: 36,
  PIEZAS_TIPOS: {
    PATAS: 24, // 6 patas * 4 segmentos
    CABEZA: 8, // Antenas(4) + Ojos(2) + Cara(2)
    COLA: 4
  },
  PRIORIDAD: ['COLA', 'CABEZA', 'PATAS']
};

const CUCARACHA_CONFIG_V2 = {
  MAX_USERS_PER_DIE: 2,
  DADOS_CANTIDAD: 10, // Para partidas masivas es mejor lanzar más
  MAX_DADOS_GUARDADOS: 3,
  FASES: {
    ESPERA: 'ESPERA',
    LANZADO: 'LANZADO',
    DECIDIENDO: 'DECIDIENDO',
    RESOLVIENDO: 'RESOLVIENDO',
    FIN_RONDA: 'FIN_RONDA',
    ESPERANDO_DECISION_ADMIN: 'ESPERANDO_DECISION_ADMIN'
  }
};


/**
 * Utilidad de normalización de nombres para evitar duplicidad y fallos de búsqueda
 */
function normalizeNameV2(s) {
  return (s || "").toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ');
}

/**
 * Busca la MEJOR fila de un jugador (mayor progreso) para evitar duplicados fantasma
 */
function findBestPlayerRow(dataJ, headersJ, partidaId, nombre) {
  const targetNormal = normalizeNameV2(nombre);
  const colPiezas = headersJ.indexOf('piezas_completadas');
  let bestIdx = -1;
  let bestScore = -1;
  for (let i = 1; i < dataJ.length; i++) {
    if (String(dataJ[i][0]) === String(partidaId) && normalizeNameV2(dataJ[i][1]) === targetNormal) {
      const score = colPiezas !== -1 ? (parseInt(dataJ[i][colPiezas]) || 0) : 0;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
  }
  return bestIdx;
}

/**
 * PURGA DE DUPLICADOS: Elimina filas duplicadas de un jugador para una partida,
 * manteniendo solo la fila con mayor progreso. Retorna la data actualizada.
 */
function purgeDuplicateRows(sheetJ, partidaId) {
  const dataJ = sheetJ.getDataRange().getValues();
  const headersJ = dataJ[0];
  const colPiezas = headersJ.indexOf('piezas_completadas');
  const colProgreso = headersJ.indexOf('progreso_json');
  
  const playerMap = {};
  for (let i = 1; i < dataJ.length; i++) {
    if (String(dataJ[i][0]) !== String(partidaId)) continue;
    const nameNormal = normalizeNameV2(dataJ[i][1]);
    const key = nameNormal;
    
    let progreso = { piezas_marcadas: [] };
    try {
      progreso = JSON.parse(dataJ[i][colProgreso] || '{"piezas_marcadas":[]}');
    } catch(e) {}
    if (!progreso.piezas_marcadas) progreso.piezas_marcadas = [];

    if (!playerMap[key]) {
      playerMap[key] = { 
        bestIdx: i, 
        mergedPieces: new Set(progreso.piezas_marcadas),
        allIdxs: [i],
        progresoBase: progreso
      };
    } else {
      playerMap[key].allIdxs.push(i);
      // FUSIONAR: Agregar piezas de este duplicado al set principal
      progreso.piezas_marcadas.forEach(p => playerMap[key].mergedPieces.add(p));
      
      // Si esta fila tiene un JSON más "vibrante" o estructurado, lo usamos de base si el actual es muy viejo
      if (progreso.piezas_marcadas.length > playerMap[key].progresoBase.piezas_marcadas.length) {
         playerMap[key].bestIdx = i;
         playerMap[key].progresoBase = progreso;
      }
    }
  }
  
  const rowsToDelete = [];
  for (const key in playerMap) {
    const info = playerMap[key];
    if (info.allIdxs.length > 1) {
      // 1. Fisionar decisiones (tomamos todas las que no estén vacías)
      const decisionesCombinadas = info.allIdxs
        .map(idx => String(dataJ[idx][headersJ.indexOf('decision_actual')] || '').trim())
        .filter(d => d !== '')
        .join(',');
      
      // 2. Preparar el JSON fusionado
      info.progresoBase.piezas_marcadas = Array.from(info.mergedPieces);
      const totalMerged = info.progresoBase.piezas_marcadas.length;
      
      // 3. Escribir la verdad definitiva en la fila 'bestIdx' antes de borrar el resto
      sheetJ.getRange(info.bestIdx + 1, colProgreso + 1).setValue(JSON.stringify(info.progresoBase));
      sheetJ.getRange(info.bestIdx + 1, colPiezas + 1).setValue(totalMerged);
      sheetJ.getRange(info.bestIdx + 1, headersJ.indexOf('decision_actual') + 1).setValue(decisionesCombinadas);
      
      // 4. Marcar el resto para eliminación
      info.allIdxs.forEach(idx => {
        if (idx !== info.bestIdx) rowsToDelete.push(idx);
      });
    }
  }

  
  rowsToDelete.sort((a, b) => b - a);
  rowsToDelete.forEach(idx => {
    sheetJ.deleteRow(idx + 1);
  });
  
  if (rowsToDelete.length > 0) {
    SpreadsheetApp.flush();
    Logger.log('[PURGA-V2] Fusionadas y eliminadas ' + rowsToDelete.length + ' filas duplicadas.');
  }
  
  return sheetJ.getDataRange().getValues();
}


/**
 * Crea una nueva partida de La Cucaracha
 */
function crearPartidaCucaracha(nombre, monto, adminNombre) {
  return executeWithLock(() => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(HOJAS.CUCARACHA_PARTIDAS);
    
    // Crear la hoja si no existe
    if (!sheet) {
      sheet = ss.insertSheet(HOJAS.CUCARACHA_PARTIDAS);
      sheet.appendRow(['id', 'fecha', 'nombre', 'monto', 'estado', 'pozo_total', 'ronda_actual', 'ganador', 'creado_por', 'dados_actuales', 'last_update']);
    }
    
    const id = generateId();
    const nuevaFila = [
      id,
      new Date(),
      nombre || "Gran Carrera de Cucarachas",
      monto || 10000,
      'esperando', // estado
      0, // pozo_total
      0, // ronda_actual
      '', // ganador
      adminNombre || 'Admin',
      '[]', // dados_actuales (JSON string)
      new Date() // last_update
    ];
    
    sheet.appendRow(nuevaFila);
    return { status: 'success', partidaId: id };
  });
}

/**
 * Registra un jugador en la partida
 */
function registrarJugadorCucaracha(partidaId, nombre, fotoBase64, socio_id) {
  return executeWithLock(() => {
    let fotoUrl = "";
    if (fotoBase64) {
      const resFoto = subirFotoReciboCucaracha(fotoBase64, `Recibo_${nombre}_${partidaId}.jpg`);
      if (resFoto.ok) fotoUrl = resFoto.url;
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(HOJAS.CUCARACHA_JUGADORES);
    
    if (!sheet) {
      sheet = ss.insertSheet(HOJAS.CUCARACHA_JUGADORES);
      sheet.appendRow(['partida_id', 'nombre', 'foto_url', 'estado', 'piezas_completadas', 'timestamp_registro', 'timestamp_aprobacion', 'socio_id', 'progreso_json']);
    }
    
    // VERIFICAR EXISTENCIA (PREVENIR DUPLICIDAD CON NORMALIZACIÓN)
    const dataJ = sheet.getDataRange().getValues();
    const headersJ = dataJ[0];
    const targetNormal = normalizeNameV2(nombre);
    const existingIdx = dataJ.findIndex(r => String(r[0]) === String(partidaId) && normalizeNameV2(r[1]) === targetNormal);

    if (existingIdx !== -1) {
        // Ya existe. Solo actualizamos la foto si es nueva y mantenemos el progreso.
        if (fotoUrl) {
            sheet.getRange(existingIdx + 1, headersJ.indexOf('foto_url') + 1).setValue(fotoUrl);
        }
        return { status: 'success', message: 'Sesión recuperada correctamente', reingreso: true };
    }

    const nuevaFila = [
      partidaId,
      nombre.trim(),
      fotoUrl,
      'pendiente', // estado
      0, // piezas_completadas (numérico)
      new Date(), // timestamp_registro
      '', // timestamp_aprobacion
      socio_id || '',
      JSON.stringify({ 
        piezas_marcadas: [], 
        dados_guardados: 0
      }) 
    ];
    
    sheet.appendRow(nuevaFila);
    
    // Limpiar caché para que el admin vea al nuevo pendiente rápido
    CacheService.getScriptCache().remove("CUC_STATE_" + partidaId);

    return { status: 'success', message: 'Registro exitoso' };
  });
}

/**
 * Aprueba a un jugador y actualiza el pozo
 */
function aprobarJugadorCucaracha(partidaId, nombre) {
  return executeWithLock(() => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetPartidas = ss.getSheetByName(HOJAS.CUCARACHA_PARTIDAS);
    const sheetJugadores = ss.getSheetByName(HOJAS.CUCARACHA_JUGADORES);
    
    const dataPartidas = sheetPartidas.getDataRange().getValues();
    const headersPartidas = dataPartidas[0];
    const indexPartida = dataPartidas.findIndex(r => r[0] === partidaId);
    
    if (indexPartida === -1) return { status: 'error', message: 'Partida no encontrada' };
    
    const idxMonto = headersPartidas.indexOf('monto');
    const idxPozo = headersPartidas.indexOf('pozo_total');
    const montoApuesta = Number(dataPartidas[indexPartida][idxMonto]);
    
    // Buscar y actualizar jugador
    const dataJug = sheetJugadores.getDataRange().getValues();
    const headersJug = dataJug[0];
    const indexJug = dataJug.findIndex(r => r[0] === partidaId && r[1] === nombre);
    
    if (indexJug === -1) return { status: 'error', message: 'Jugador no encontrado' };
    
    sheetJugadores.getRange(indexJug + 1, headersJug.indexOf('estado') + 1).setValue('aprobado');
    sheetJugadores.getRange(indexJug + 1, headersJug.indexOf('timestamp_aprobacion') + 1).setValue(new Date());
    
    // Actualizar pozo
    const pozoActual = Number(dataPartidas[indexPartida][idxPozo]) || 0;
    sheetPartidas.getRange(indexPartida + 1, idxPozo + 1).setValue(pozoActual + montoApuesta);

    // Limpiar caché para que el admin vea la aprobación de inmediato
    CacheService.getScriptCache().remove("CUC_STATE_" + partidaId);
    
    return { status: 'success', pozoNuevo: pozoActual + montoApuesta };
  });
}

/**
 * Inicia la partida
 */
function iniciarPartidaCucaracha(partidaId) {
  return executeWithLock(() => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(HOJAS.CUCARACHA_PARTIDAS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const index = data.findIndex(r => r[0] === partidaId);
    
    if (index === -1) return { status: 'error', message: 'Partida no encontrada' };
    
    sheet.getRange(index + 1, headers.indexOf('estado') + 1).setValue('en_juego');
    sheet.getRange(index + 1, headers.indexOf('ronda_actual') + 1).setValue(0); // Empezamos en 0 para que el primer lanzamiento sea 1
    
    // V2: Inicializar Prioridad y Fase
    inicializarPrioridadCucaracha(partidaId);
    // Limpiar caché
    CacheService.getScriptCache().remove("CUC_STATE_" + partidaId);
    
    return { status: 'success' };
  });
}

// --- MOTOR V1 ELIMINADO ---


/**
 * Finaliza la partida y reparte el premio si hay múltiples ganadores
 */
function finalizarPartidaCucaracha(partidaId, ganadores) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetPartidas = ss.getSheetByName(HOJAS.CUCARACHA_PARTIDAS);
  const data = sheetPartidas.getDataRange().getValues();
  const index = data.findIndex(r => r[0] === partidaId);
  
  if (index === -1) return { status: 'error', message: 'Partida no encontrada' };
  
  const headers = data[0];
  const partidaNombre = data[index][headers.indexOf('nombre')];
  const pozoTotal = Number(data[index][headers.indexOf('pozo_total')]);
  const montoGanadorTotal = pozoTotal * 0.5;
  const montoNatillera = pozoTotal * 0.5;
  
  // Si ganadores no viene, lo buscamos en el sheet de jugadores
  if (!ganadores || !Array.isArray(ganadores)) {
      const sheetJ = ss.getSheetByName(HOJAS.CUCARACHA_JUGADORES);
      const dataJ = sheetJ.getDataRange().getValues();
      const headersJ = dataJ[0];
      const idxPiezas = headersJ.indexOf('piezas_completadas');
      
      ganadores = dataJ.filter(r => String(r[0]) === String(partidaId) && Number(r[idxPiezas]) >= CUCARACHA_CONFIG.PIEZAS_TOTALES)
                       .map(r => r[1]);
  }

  sheetPartidas.getRange(index + 1, headers.indexOf('estado') + 1).setValue('FIN_RONDA');
  sheetPartidas.getRange(index + 1, headers.indexOf('ganador') + 1).setValue(ganadores.join(', '));
  
  // Registrar en hoja Actividades (Transacción Inicial)
  const sheetActividades = ss.getSheetByName(HOJAS.ACTIVIDADES);
  if (sheetActividades) {
      sheetActividades.appendRow([
          "CUC-WIN-" + partidaId + "-" + Date.now().toString().slice(-4),
          "La Cucaracha: Victoria",
          "Ronda finalizada. Ganadores: " + ganadores.join(', ') + ". Esperando decisión de premio.",
          montoNatillera,
          new Date(),
          "SISTEMA",
          "PENDIENTE_DECISION",
          new Date()
      ]);
  }
  
  // Limpiar caché
  CacheService.getScriptCache().remove("CUC_STATE_" + partidaId);

  return { 
      status: 'success', 
      estado: 'FIN_RONDA',
      ganadores: ganadores, 
      premioPorCabeza: ganadores.length > 0 ? (montoGanadorTotal / ganadores.length) : 0 
  };
}

/**
 * PROCESAR DECISIÓN DEL ADMIN (Premio / Fondo / Reinicio)
 */
function tomarDecisionAdminCucaracha(partidaId, decision) {
  return executeWithLock(function() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetP = ss.getSheetByName(HOJAS.CUCARACHA_PARTIDAS);
    const dataP = sheetP.getDataRange().getValues();
    const headersP = dataP[0];
    const index = dataP.findIndex(r => r[0] === partidaId);
    
    if (index === -1) throw new Error("Partida no encontrada");

    if (decision === 'REINICIAR_PARTIDA') {
      // RESET TOTAL DE JUGADORES (Mantiene los que están aprobados)
      const sheetJ = ss.getSheetByName(HOJAS.CUCARACHA_JUGADORES);
      const dataJ = sheetJ.getDataRange().getValues();
      const headersJ = dataJ[0];
      const colProgreso = headersJ.indexOf('progreso_json');
      const colPiezas = headersJ.indexOf('piezas_completadas');
      const colDecision = headersJ.indexOf('decision_actual');

      for (let i = 1; i < dataJ.length; i++) {
        if (String(dataJ[i][0]) === String(partidaId)) {
          sheetJ.getRange(i + 1, colProgreso + 1).setValue(JSON.stringify({ piezas_marcadas: [], dados_guardados: 0 }));
          sheetJ.getRange(i + 1, colPiezas + 1).setValue(0);
          sheetJ.getRange(i + 1, colDecision + 1).setValue('');
        }
      }

      // Reset Partida
      sheetP.getRange(index + 1, headersP.indexOf('estado') + 1).setValue('esperando'); // Vuelve a fase inicial
      sheetP.getRange(index + 1, headersP.indexOf('ronda_actual') + 1).setValue(0);
      sheetP.getRange(index + 1, headersP.indexOf('ganador') + 1).setValue('');
      sheetP.getRange(index + 1, headersP.indexOf('dados_actuales') + 1).setValue('[]');
      
      CacheService.getScriptCache().remove("CUC_STATE_" + partidaId);
      return { status: 'success', message: 'Partida reiniciada correctamente' };

    } else if (decision === 'ENTREGAR_PREMIO' || decision === 'ENVIAR_FONDO') {
      const gNombreIdx = headersP.indexOf('ganador');
      const gVal = dataP[index][gNombreIdx];
      const mVal = (Number(dataP[index][headersP.indexOf('pozo_total')]) || 0) * 0.5;
      const pNombre = dataP[index][headersP.indexOf('nombre')];

      let pdfResult = null;
      if (decision === 'ENTREGAR_PREMIO') {
          try {
              // Llamamos a la nueva función de PDF (definida en Code.gs)
              pdfResult = generarReciboCucarachaPDF(partidaId, pNombre, gVal, mVal);
          } catch (errPdf) {
              Logger.log("Error generando PDF Cucaracha: " + errPdf.toString());
          }
      }

      // Finalizar definitivamente esta sesión
      sheetP.getRange(index + 1, headersP.indexOf('estado') + 1).setValue('finalizada');
      
      const sheetActividades = ss.getSheetByName(HOJAS.ACTIVIDADES);
      sheetActividades.appendRow([
          "CUC-RES-" + partidaId + "-" + Date.now().toString().slice(-4),
          "La Cucaracha: " + pNombre,
          "Decisión Admin: " + decision + " para " + gVal,
          0,
          new Date(),
          "ADMIN",
          "COMPLETADO",
          new Date()
      ]);

      CacheService.getScriptCache().remove("CUC_STATE_" + partidaId);
      return { 
          status: 'success', 
          message: 'Decisión registrada y partida cerrada',
          pdf: pdfResult
      };
    }
    
    return { status: 'error', message: 'Decisión no reconocida' };
  });
}

/**
 * Obtiene el estado completo de la partida para el cliente
 */
function getEstadoPartidaCucaracha(partidaId) {
  const cache = CacheService.getScriptCache();
  const cacheKey = "CUC_STATE_" + partidaId;
  const cached = cache.get(cacheKey);
  if (cached) {
    // Logger.log("Sirviendo estado desde caché para " + partidaId);
    return JSON.parse(cached);
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetP = ss.getSheetByName(HOJAS.CUCARACHA_PARTIDAS);
    const dataP = sheetP.getDataRange().getValues();
    const headersP = dataP[0];
    const partida = dataP.find(r => r[0] === partidaId);
    
    if (!partida) return { status: 'error', message: 'Partida no encontrada' };
    
    const objP = {};
    headersP.forEach((h, i) => objP[h] = partida[i]);
    
    const sheetJ = ss.getSheetByName(HOJAS.CUCARACHA_JUGADORES);
    const dataJ = sheetJ.getDataRange().getValues();
    const headersJ = dataJ[0];
    
    const colPiezas = headersJ.indexOf('piezas_completadas');
    
    // Filtrar y colapsar duplicados por nombre (priorizando mayor progreso)
    const uniqueMap = {};
    dataJ.slice(1).forEach(r => {
      if (String(r[0]) === String(partidaId)) {
        const nameNormal = normalizeNameV2(r[1]);
        const score = colPiezas !== -1 ? (parseInt(r[colPiezas]) || 0) : 0;
        if (!uniqueMap[nameNormal] || score > (colPiezas !== -1 ? (parseInt(uniqueMap[nameNormal][colPiezas]) || 0) : 0)) {
           uniqueMap[nameNormal] = r;
        }
      }
    });


    const jugadores = Object.values(uniqueMap).map((r, i) => {
      let obj = {};
      headersJ.forEach((h, idx) => obj[h] = r[idx]);
      
      let progreso = {};
      try {
        progreso = JSON.parse(obj.progreso_json || '{}');
      } catch(e) { progreso = {}; }

      // Asegurar que el progreso tenga la estructura mínima
      progreso.piezas_marcadas = progreso.piezas_marcadas || [];
      progreso.dados_guardados = progreso.dados_guardados || 0;

      obj.progreso = progreso;
      return obj;
    });
    
    const finalResult = {
      status: 'success',
      partida: objP,
      jugadores: jugadores,
      config: CUCARACHA_CONFIG
    };

    // Almacenar en caché por 2 segundos (tiempo de polling sugerido es 4s)
    cache.put(cacheKey, JSON.stringify(finalResult), 2);
    return finalResult;
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

/**
 * Busca si hay una partida activa
 */
function getPartidaActivaCucaracha() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(HOJAS.CUCARACHA_PARTIDAS);
  if (!sheet || sheet.getLastRow() < 2) return { status: 'none' };
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const activa = data.slice(1).reverse().find(r => r[4] !== 'finalizada');
  
  if (!activa) return { status: 'none' };
  
  const obj = {};
  headers.forEach((h, i) => obj[h] = activa[i]);
  
  // Agregar conteo de jugadores para el dashboard
  const sheetJ = ss.getSheetByName(HOJAS.CUCARACHA_JUGADORES);
  if (sheetJ) {
    const dataJ = sheetJ.getDataRange().getValues();
    obj.num_jugadores = dataJ.filter(r => String(r[0]) === String(activa[0]) && r[3] !== 'pendiente').length;
  } else {
    obj.num_jugadores = 0;
  }

  return { status: 'success', partida: obj };
}

/**
 * Sube foto del recibo a Drive
 */
function subirFotoReciboCucaracha(base64Data, nombreArchivo) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const folderId = FOLDER_ID_RECIBOS_CUCARACHA;
    const folder = DriveApp.getFolderById(folderId);
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data.split(',')[1] || base64Data),
      'image/jpeg',
      nombreArchivo
    );
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // URL de visualización directa (UC) para carga instantánea en <img>
    const directUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
    return { ok: true, url: directUrl };
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

function getPendientesCucaracha(partidaId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(HOJAS.CUCARACHA_JUGADORES);
  if (!sheet || sheet.getLastRow() < 2) return { status: 'success', data: [] };
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const pendientes = data.filter(r => r[0] === partidaId && r[3] === 'pendiente').map(r => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
  
  return { status: 'success', data: pendientes };
}

function checkCucarachaAccess(cedula) {
  return { status: 'success', accessible: true };
}

function reclamarPremioCucaracha(partidaId, jugadorId) {
    // Lógica opcional para reclamar una parte del premio a mitad del juego
    return { status: 'success', message: 'Función en desarrollo' };
}

/**
 * Cancela una partida (Admin)
 */

/**
 * Cancela una partida (Admin)
 */
function cancelarPartidaCucaracha(partidaId) {
  return executeWithLock(() => {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(HOJAS.CUCARACHA_PARTIDAS);
      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      const idIdx = headers.indexOf("id");
      const estIdx = headers.indexOf("estado");

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][idIdx]) === String(partidaId)) {
          sheet.getRange(i + 1, estIdx + 1).setValue('CANCELADA');
          return { status: "success", message: "Partida cancelada" };
        }
      }
      return { status: "error", message: "Partida no encontrada" };
    } catch (e) {
      return { status: "error", message: e.message };
    }
  });
}

/**
 * Marca una parte individualmente (Acción manual del jugador)
 */
// --- FUNCIÓN MANUAL ELIMINADA ---


function verificarYRegistrarGanadorCucaracha(partidaId, nombre) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetP = ss.getSheetByName(HOJAS.CUCARACHA_PARTIDAS);
    const dataP = sheetP.getDataRange().getValues();
    const headersP = dataP[0];
    const rowIndex = dataP.findIndex(r => String(r[0]) === String(partidaId));
    
    if (rowIndex === -1) return;
    
    const colGanador = headersP.indexOf('ganador');
    let ganadorActual = dataP[rowIndex][colGanador] || "";
    
    let ganadores = ganadorActual ? ganadorActual.split("; ").filter(x => x) : [];
    if (!ganadores.includes(nombre)) {
        ganadores.push(nombre);
    }
    
    // Llamar a la función centralizada de finalización para registrar en Actividades
    return finalizarPartidaCucaracha(partidaId, ganadores);
}

/**
 * Genera una distribución aleatoria de 36 números (6 de cada uno del 1 al 6)
 */
/**
 * MOTOR V2 - RONDAS SINCRONIZADAS PARA PARTIDAS MASIVAS
 */

/**
 * Inicializa el orden de prioridad de los jugadores al empezar
 */
function inicializarPrioridadCucaracha(partidaId) {
  return executeWithLock(() => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetJ = ss.getSheetByName(HOJAS.CUCARACHA_JUGADORES);
    
    // PASO 0: PURGA ANTES DE EMPEZAR
    purgeDuplicateRows(sheetJ, partidaId);
    
    const dataJ = sheetJ.getDataRange().getValues();
    // Obtener nombres ÚNICOS normalizados para la prioridad
    const nombresUnicos = new Set();
    for (let i = 1; i < dataJ.length; i++) {
      if (String(dataJ[i][0]) === String(partidaId) && dataJ[i][3] === 'aprobado') {
        nombresUnicos.add(dataJ[i][1]); // Guardar nombre original
      }
    }

    const jugadores = Array.from(nombresUnicos);
    
    // Mezclar jugadores aleatoriamente para el inicio
    for (let i = jugadores.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [jugadores[i], jugadores[j]] = [jugadores[j], jugadores[i]];
    }

    
    // Guardar lista en la partida
    const sheetP = ss.getSheetByName(HOJAS.CUCARACHA_PARTIDAS);
    const dataP = sheetP.getDataRange().getValues();
    const headersP = dataP[0];
    const idx = dataP.findIndex(r => String(r[0]) === String(partidaId));
    
    // Asumimos que hemos añadido columnas 'prioridad_lista' y 'fase_actual' en el sheet
    // Si no existen, las añadiremos en la migración.
    const colPrioridad = headersP.indexOf('prioridad_lista');
    if (colPrioridad !== -1) {
      sheetP.getRange(idx + 1, colPrioridad + 1).setValue(JSON.stringify(jugadores));
    }
    
    return { status: 'success', prioridad: jugadores };
  });
}

/**
 * Lanza los dados para una ronda masiva (V2)
 */
function lanzarDadosCucarachaV2(partidaId) {
  return executeWithLock(() => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetP = ss.getSheetByName(HOJAS.CUCARACHA_PARTIDAS);
    const dataP = sheetP.getDataRange().getValues();
    const headersP = dataP[0];
    const idxP = dataP.findIndex(r => String(r[0]) === String(partidaId));
    
    // Generar N dados
    const dados = Array.from({length: CUCARACHA_CONFIG_V2.DADOS_CANTIDAD}, () => Math.floor(Math.random() * 6) + 1);
    
    // Actualizar partida: Dados, Fase y Ronda
    const rondaActual = Number(dataP[idxP][headersP.indexOf('ronda_actual')]) || 0;
    sheetP.getRange(idxP + 1, headersP.indexOf('dados_actuales') + 1).setValue(JSON.stringify(dados));
    sheetP.getRange(idxP + 1, headersP.indexOf('ronda_actual') + 1).setValue(rondaActual + 1);
    
    const colFase = headersP.indexOf('fase_actual');
    if (colFase !== -1) {
      sheetP.getRange(idxP + 1, colFase + 1).setValue(CUCARACHA_CONFIG_V2.FASES.DECIDIENDO);
    }
    
    // Reiniciar decisiones de jugadores para esta ronda
    const sheetJ = ss.getSheetByName(HOJAS.CUCARACHA_JUGADORES);
    const dataJ = sheetJ.getDataRange().getValues();
    const colDecision = dataJ[0].indexOf('decision_actual');
    if (colDecision !== -1) {
      for (let i = 1; i < dataJ.length; i++) {
        if (String(dataJ[i][0]) === String(partidaId)) {
          sheetJ.getRange(i + 1, colDecision + 1).setValue('');
        }
      }
    }

    return { status: 'success', dados: dados, fase: 'DECIDIENDO' };
  });
}

/**
 * Registra la decisión de un jugador en la ronda actual
 */
function enviarDecisionCucaracha(partidaId, nombre, decision) {
  return executeWithLock(() => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetJ = ss.getSheetByName(HOJAS.CUCARACHA_JUGADORES);
    const dataJ = sheetJ.getDataRange().getValues();
    const headersJ = dataJ[0];
    const idxJ = findBestPlayerRow(dataJ, headersJ, partidaId, nombre);
    
    if (idxJ === -1) return { status: 'error', message: 'Jugador no encontrado' };
    
    const colDecision = headersJ.indexOf('decision_actual');
    if (colDecision !== -1) {
      sheetJ.getRange(idxJ + 1, colDecision + 1).setValue(decision);
      return { status: 'success' };
    }
    return { status: 'error', message: 'Sistema no preparado para V2' };
  });
}

/**
 * Resuelve la ronda masiva basada en la prioridad y escasez
 */
function procesarRondaMasiva(partidaId) {
  return executeWithLock(() => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetP = ss.getSheetByName(HOJAS.CUCARACHA_PARTIDAS);
    const dataP = sheetP.getDataRange().getValues();
    const headersP = dataP[0];
    const idxP = dataP.findIndex(r => String(r[0]) === String(partidaId));
    
    if (idxP === -1) return { status: 'error', message: 'Partida no encontrada' };

    const dados = JSON.parse(dataP[idxP][headersP.indexOf('dados_actuales')] || '[]');
    
    // Contar disponibilidad real de cada dado (1, 2, 3)
    const dicePool = {
      1: dados.filter(d => Number(d) === 1).length,
      2: dados.filter(d => Number(d) === 2).length,
      3: dados.filter(d => Number(d) === 3).length
    };
    
    const colPrioridad = headersP.indexOf('prioridad_lista');
    let prioridadLista = JSON.parse(dataP[idxP][colPrioridad] || '[]');
    
    let ganadoresDeEstaRonda = [];
    
    const sheetJ = ss.getSheetByName(HOJAS.CUCARACHA_JUGADORES);

    
    // PASO 0: PURGA DE DUPLICADOS
    purgeDuplicateRows(sheetJ, partidaId);
    
    const dataJ = sheetJ.getDataRange().getValues();
    const headersJ = dataJ[0];
    
    // PASO 1: Identificar a todos los jugadores que tienen decisiones pendientes
    const jugadoresConDecision = [];
    for (let i = 1; i < dataJ.length; i++) {
        const d = String(dataJ[i][headersJ.indexOf('decision_actual')] || '');
        if (String(dataJ[i][0]) === String(partidaId) && d.trim() !== '') {
            jugadoresConDecision.push(String(dataJ[i][1]));
        }
    }

    // PASO 2: Unificar con la lista de prioridad (prioridad va primero, luego el resto)
    const colaProcesamiento = [...new Set([...prioridadLista, ...jugadoresConDecision])];
    
    Logger.log('RESOLVER: ' + colaProcesamiento.length + ' jugadores con acciones. Dados: ' + JSON.stringify(dados));
    
    // PASO 3: Resolver en el orden establecido
    colaProcesamiento.forEach(nombre => {

      const targetNormal = normalizeNameV2(nombre);
      
      // RE-LEER datos frescos en cada iteración para evitar dataJ obsoleta
      const freshDataJ = sheetJ.getDataRange().getValues();
      const headersJ = freshDataJ[0];
      
      // USAR findBestPlayerRow en lugar de findIndex para no caer en filas fantasma
      const rowIdx = findBestPlayerRow(freshDataJ, headersJ, partidaId, nombre);
      if (rowIdx === -1) return;

      const progreso = JSON.parse(freshDataJ[rowIdx][headersJ.indexOf('progreso_json')] || '{"piezas_marcadas":[]}');

      if (!progreso.piezas_marcadas) progreso.piezas_marcadas = [];
      const decisionesRaw = String(freshDataJ[rowIdx][headersJ.indexOf('decision_actual')] || '');
      const listaDecisiones = decisionesRaw.split(',').filter(d => d.trim() !== '');
      
      let cambiosRealizados = false;
      listaDecisiones.forEach(dec => {
        if (dec.startsWith('CONSTRUIR_')) {
          const piezaPreferida = parseInt(dec.split('_')[1]);
          
          let diceNeeded = 1;
          if (piezaPreferida >= 24 && piezaPreferida < 32) diceNeeded = 2;
          else if (piezaPreferida >= 32) diceNeeded = 3;

          // MAPEO DE DADOS: Patas (0-23) -> 1, Cabeza (24-31) -> 2, Cola (32-35) -> 3
          // REGLA: Cada jugador consume dados del pozo compartido según orden de prioridad.
          if (dicePool[diceNeeded] > 0 && !progreso.piezas_marcadas.includes(piezaPreferida)) {
            progreso.piezas_marcadas.push(piezaPreferida);
            dicePool[diceNeeded]--; // <--- VOLVEMOS A DECREMENTAR
            cambiosRealizados = true;
            Logger.log(`[CUCARACHA] ${nombre} marcó pieza ${piezaPreferida} usando dado ${diceNeeded}`);
          } else {
             Logger.log(`[CUCARACHA] ${nombre} NO pudo marcar pieza ${piezaPreferida}. Pool[${diceNeeded}]: ${dicePool[diceNeeded]}`);
          }
        }
      });

      // SIEMPRE sincronizar el total con la longitud real del array (Auto-heal)
      const totalMarcadas = progreso.piezas_marcadas.length;
      sheetJ.getRange(rowIdx + 1, headersJ.indexOf('progreso_json') + 1).setValue(JSON.stringify(progreso));
      sheetJ.getRange(rowIdx + 1, headersJ.indexOf('piezas_completadas') + 1).setValue(totalMarcadas);
      
      SpreadsheetApp.flush();

      if (totalMarcadas >= 36) {
        ganadoresDeEstaRonda.push(freshDataJ[rowIdx][1]);
      }

    });

    // PASO 3: Limpiar decisiones
    SpreadsheetApp.flush(); // Asegurar que todo se guardó antes de limpiar

    const dataFinal = sheetJ.getDataRange().getValues();
    for (let i = 1; i < dataFinal.length; i++) {
      if (String(dataFinal[i][0]) === String(partidaId)) {
        sheetJ.getRange(i + 1, headersJ.indexOf('decision_actual') + 1).setValue('');
      }
    }


    // Gestionar Finalización
    if (ganadoresDeEstaRonda.length > 0) {
      finalizarPartidaCucaracha(partidaId, ganadoresDeEstaRonda);
    } else {
      if (prioridadLista.length > 0) {
        const primero = prioridadLista.shift();
        prioridadLista.push(primero);
        sheetP.getRange(idxP + 1, colPrioridad + 1).setValue(JSON.stringify(prioridadLista));
      }
      
      const colFase = headersP.indexOf('fase_actual');
      if (colFase !== -1) {
        sheetP.getRange(idxP + 1, colFase + 1).setValue(CUCARACHA_CONFIG_V2.FASES.ESPERA);
      }
    }
    
    return { status: 'success', ganadores: ganadoresDeEstaRonda };

  });
}


/**
 * CONFIGURACIÓN INICIAL DE COLUMNAS (MIGRACIÓN)
 * Ejecutar una vez para preparar las hojas para V2
 */
function setupCucarachaV2() {
  return executeWithLock(() => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 1. Preparar Hoja de Partidas
    const sheetP = ss.getSheetByName(HOJAS.CUCARACHA_PARTIDAS);
    if (!sheetP) return { status: 'error', message: 'Hoja Partidas no existe' };
    
    const headersP = sheetP.getRange(1, 1, 1, sheetP.getLastColumn()).getValues()[0];
    const nuevasColsP = ['fase_actual', 'prioridad_lista', 'timer_expiracion'];
    
    nuevasColsP.forEach(col => {
      if (headersP.indexOf(col) === -1) {
        sheetP.getRange(1, sheetP.getLastColumn() + 1).setValue(col);
        headersP.push(col);
      }
    });

    // 2. Preparar Hoja de Jugadores
    const sheetJ = ss.getSheetByName(HOJAS.CUCARACHA_JUGADORES);
    if (!sheetJ) return { status: 'error', message: 'Hoja Jugadores no existe' };
    
    const headersJ = sheetJ.getRange(1, 1, 1, sheetJ.getLastColumn()).getValues()[0];
    const nuevasColsJ = ['decision_actual'];
    
    nuevasColsJ.forEach(col => {
      if (headersJ.indexOf(col) === -1) {
        sheetJ.getRange(1, sheetJ.getLastColumn() + 1).setValue(col);
        headersJ.push(col);
      }
    });

    return { status: 'success', message: 'Columnas V2 preparadas correctamente' };
  });
}


