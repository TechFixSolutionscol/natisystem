// ============================================
// NATILLERA - BACKEND API REST
// Google Apps Script
// Versión: 1.0
// Fecha: 2026-01-20
// ============================================

/**
 * CONFIGURACIÓN PRINCIPAL
 * ⚠️ IMPORTANTE: Reemplaza este ID con el ID de tu Google Sheet
 * El ID se encuentra en la URL del Sheet entre /d/ y /edit
 */
const SPREADSHEET_ID = "1sWL7OTp-RELJRyI9Cbok8UdlhpmfDXlXdlTM3ktm7jA";

/**
 * Nombres de las hojas en Google Sheets
 * Estos nombres deben coincidir exactamente con las pestañas creadas
 */
const HOJAS = {
  USUARIOS: "Usuarios",
  PARTICIPANTES: "Participantes",
  APORTES: "Aportes",
  ACTIVIDADES: "Actividades",
  PRESTAMOS: "Prestamos",
  PAGOS_INTERESES: "Pagos_Intereses",
  GANANCIAS: "Ganancias_Distribuidas",
  CICLOS: "Ciclos",
  POLLA_NUMEROS: "Polla_Numeros",
  POLLA_SORTEOS: "Polla_Sorteos",
  POLLA_CONFIG: "Polla_Config",
  CONFIG: "Config",
  BINGO_JUEGOS: "Bingo_Juegos",
  BINGO_TABLAS: "Bingo_Tablas",
  BINGO_BALOTAS: "Bingo_Balotas",
  BINGO_CHAT: "Bingo_Chat",
  CUCARACHA_PARTIDAS: "Cucaracha_Partidas",
  CUCARACHA_JUGADORES: "Cucaracha_Jugadores"
};

// ==========================================
// FUNCIONES PRINCIPALES - ENDPOINTS
// ==========================================
// 💡 Las funciones de inicialización y lanzamiento están en DbSetup.gs
//    Ejecuta testInicializar() desde el editor para lanzar el sistema.

/**
 * Maneja las peticiones GET
 * Endpoints disponibles:
 * - ?action=getParticipantes
 * - ?action=getAportes
 * - ?action=getActividades
 * - ?action=getPrestamos
 * - ?action=getResumen
 * - ?action=getCicloActual
 */
function doGet(e) {
  const action = e.parameter.action;
  let result;
  
  try {
    switch(action) {
      case 'getParticipantes':
        result = getData(HOJAS.PARTICIPANTES);
        break;
        
      case 'getAportes':
        result = getAportesConNombres();
        break;
        
      case 'getActividades':
        result = getData(HOJAS.ACTIVIDADES);
        break;
        
      case 'getPrestamos':
        actualizarEstadoPrestamosVencidos();
        result = getPrestamosConNombres();
        break;
        
      case 'getResumen':
        result = getResumen();
        break;
        
      case 'getCicloActual':
        result = getCicloActual();
        break;
        
      case 'getConfig':
        result = getConfig();
        break;

      case 'getUsuarios':
        result = getData(HOJAS.USUARIOS);
        break;

      case 'getHistorialCiclos':
        result = getHistorialCiclos();
        break;

      case 'getLogs':
        result = getLogs();
        break;

      case 'generateAportesPDF':
        result = generateAportesPDF(e.parameter.id);
        break;
        
      case 'getPollaData':
        result = getPollaData(e.parameter.sorteo_id, { 
          quickUpdate: e.parameter.quickUpdate === 'true' 
        });
        break;

      case 'getConsultaSocio':
        result = getConsultaSocio(e.parameter.cedula, e.parameter.mes);
        break;

      case 'generateConsultaPDF':
        result = generateConsultaPDF(e.parameter.cedula, e.parameter.mes);
        break;

      case 'getMovimientosPrestamo':
        result = getMovimientosPrestamo(e.parameter.prestamo_id);
        break;

      case 'simularAmortizacion':
        result = generarTablaAmortizacion(
          Number(e.parameter.monto),
          Number(e.parameter.tasa),
          Number(e.parameter.cuotas),
          e.parameter.metodo || 'FRANCES'
        );
        break;

      case 'getAmortizacionPrestamo':
        result = getAmortizacionPrestamo(e.parameter.prestamo_id);
        break;

      case 'getMoras':
        result = obtenerMorasPendientes();
        break;

      case 'getPollaSorteoActivo':
        result = getPollaSorteoActivo();
        break;

      case 'getPollaNumerosPorSorteo':
        result = getPollaNumerosPorSorteo(e.parameter.sorteo_id);
        break;

      case 'getNumeroDisponiblePolla':
        result = getNumeroDisponiblePolla(e.parameter.sorteo_id, e.parameter.numero);
        break;

      case 'getBingoState':
        result = getBingoState(e.parameter.juego_id);
        break;

      case 'getBingoMessages':
        result = getBingoMessages(e.parameter.juego_id);
        break;

      case 'getMisTablas':
        result = getMisTablas(e.parameter.participante_id);
        break;

      case 'getResultadoLoteria':
        result = { status: 'success', data: getResultadoLoteriaMedellin() };
        break;

      case 'getTablasBingo':
        result = getTablasBingo(e.parameter.juego_id);
        break;

      case 'getPartidasCucaracha':
        result = getData(HOJAS.CUCARACHA_PARTIDAS);
        break;
        
      case 'getPendientesCucaracha':
        result = getPendientesCucaracha(e.parameter.partidaId);
        break;
        
      case 'getEstadoPartidaCucaracha':
        result = getEstadoPartidaCucaracha(e.parameter.partidaId);
        break;
        
      case 'getPartidaActivaCucaracha':
        result = getPartidaActivaCucaracha();
        break;
        
      default:
        result = { 
          status: 'error', 
          message: `Acción GET '${action}' no válida` 
        };
    }
  } catch (error) {
    result = { 
      status: 'error', 
      message: `Error en doGet: ${error.message}` 
    };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
         .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Maneja las peticiones POST
 * Endpoints disponibles:
 * - action: login
 * - action: agregarParticipante
 * - action: agregarAporte
 * - action: agregarActividad
 * - action: agregarPrestamo
 * - action: inicializarBaseDatos
 */
function doPost(e) {
  try {
    // Validar que se recibieron datos
    if (!e.postData || !e.postData.contents) {
      return createErrorResponse('No se recibieron datos en la solicitud POST');
    }
    
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result;
    
    switch(action) {
      case 'login':
        result = login(data);
        break;
        
      case 'agregarParticipante':
        result = agregarParticipante(data);
        break;

      case 'actualizarParticipante':
        result = actualizarParticipante(data);
        break;
        
      case 'agregarAporte':
        result = agregarAporte(data);
        break;
        
      case 'agregarActividad':
        result = agregarActividad(data);
        break;
        
      case 'agregarPrestamo':
        result = agregarPrestamo(data);
        break;

      case 'crearCiclo':
        result = crearCiclo(data);
        break;

      case 'cerrarCiclo':
        result = cerrarCiclo();
        break;
        
      case 'inicializarBaseDatos':
        result = inicializarBaseDatos();
        break;

      case 'recalcularGanancias':
        result = calcularDistribucionGanancias();
        break;

      case 'resetBaseDatos':
        result = resetBaseDatos();
        break;

      case 'gestionarParticipante':
        result = gestionarParticipante(data);
        break;

      case 'agregarUsuario':
        result = agregarUsuario(data);
        break;

      case 'eliminarUsuario':
        result = eliminarUsuario(data.id);
        break;

      case 'asignarNumeroPolla':
        result = solicitarNumeroPolla(data);
        break;

      case 'registrarSorteoPolla':
        result = registrarResultadoManualPolla(data);
        break;
      
      case 'marcarPagoPolla':
        result = aprobarNumeroPolla(data);
        break;

      case 'modificarVencimientoPrestamo':
        result = modificarVencimientoPrestamo(data);
        break;

      case 'registrarPagoPrestamo':
        result = registrarPagoPrestamo(data);
        break;
        
      case 'registrarAbono':
        result = registrarAbono(data);
        break;

      case 'cerrarPrestamo':
        result = cerrarPrestamo(data);
        break;
        
      case 'updateConfig':
        result = updateConfig(data);
        break;

      case 'verificarMultas':
        result = verificarYAplicarMultas();
        break;

      case 'repararMoras':
        result = repararMorasMasivas();
        break;

      case 'configurarTriggers':
        result = configurarTriggers();
        break;

      case 'registrarAporteExterno':
        result = registrarAporteExterno(data);
        break;

      case 'aprobarAporte':
        result = aprobarAporte(data.id);
        break;

      case 'rechazarAporte':
        result = rechazarAporte(data.id);
        break;

      case 'crearSorteoPolla':
        result = crearSorteoPolla(data);
        break;

      case 'solicitarNumeroPolla':
        result = solicitarNumeroPolla(data);
        break;

      case 'aprobarNumeroPolla':
        result = aprobarNumeroPolla(data);
        break;

      case 'rechazarNumeroPolla':
        result = rechazarNumeroPolla(data);
        break;

      case 'registrarResultadoManualPolla':
        result = registrarResultadoManualPolla(data);
        break;

      case 'setupPolla':
        result = setupPolla();
        break;

      case 'configurarTriggersPolla':
        result = configurarTriggersPolla();
        break;

      case 'forzarCierrePollaAuto':
        result = { status: 'success', message: 'Procesamiento manual lanzado' };
        procesarSorteosPendientes();
        break;

      case 'enviarRecordatorios':
        result = enviarRecordatoriosPrestamos();
        break;

      // Bingo Control
      case 'crearJuegoBingo':
        result = crearJuegoBingo(data);
        break;

      case 'comprarTablaBingo':
        result = comprarTablaBingo(data);
        break;

      case 'cantarBalotaBingo':
        result = cantarBalotaBingo(data);
        break;

      case 'reclamarBingo':
        result = reclamarBingo(data);
        break;

      case 'procesarPremioBingo':
        result = procesarPremioBingo(data);
        break;

      case 'aprobarPagoBingo':
        result = aprobarPagoBingo(data);
        break;

      case 'sendBingoMessage':
        result = sendBingoMessage(data);
        break;

      case 'setBingoVoiceRoom':
        result = setBingoVoiceRoom(data);
        break;

      case 'cancelarJuegoBingo':
        result = cancelarJuegoBingo(data);
        break;

      // JUEGO LA CUCARACHA (Migrado)
      case 'crearPartidaCucaracha':
        result = crearPartidaCucaracha(data.nombre, data.monto, data.adminNombre);
        break;

      case 'registrarJugadorCucaracha':
        result = registrarJugadorCucaracha(data.partidaId, data.nombre, data.fotoBase64, data.cedula || data.socio_id);
        break;

      case 'aprobarJugadorCucaracha':
        result = aprobarJugadorCucaracha(data.partidaId, data.nombre);
        break;

      case 'iniciarPartidaCucaracha':
        result = iniciarPartidaCucaracha(data.partidaId);
        break;

      case 'tomarDecisionAdminCucaracha':
        result = tomarDecisionAdminCucaracha(data.partidaId, data.decision);
        break;

      case 'lanzarDadosCucarachaV2':
        result = lanzarDadosCucarachaV2(data.partidaId);
        break;

      case 'enviarDecisionCucaracha':
        result = enviarDecisionCucaracha(data.partidaId, data.nombre, data.decision);
        break;

      case 'procesarRondaMasiva':
        result = procesarRondaMasiva(data.partidaId);
        break;

      case 'setupCucarachaV2':
        result = setupCucarachaV2();
        break;
        
      case 'getLiveKitToken':
        result = { 
          status: 'error', 
          message: 'LiveKit ya no es soportado. Use WebSockets.'
        };
        break;
        
      default:
        result = { 
          status: 'error', 
          message: `Acción POST '${action}' no reconocida` 
        };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
           .setMimeType(ContentService.MimeType.JSON);
           
  } catch (error) {
    return createErrorResponse(`Error al procesar POST: ${error.message}`);
  }
}

// ==========================================
// FUNCIONES DE UTILIDAD GENERAL
// ==========================================

/**
 * Obtiene datos de una hoja específica
 * @param {string} sheetName - Nombre de la hoja
 * @returns {Object} Objeto con status y data
 */
function getData(sheetName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return { 
        status: 'error', 
        message: `La hoja '${sheetName}' no existe` 
      };
    }
    
    // Si la hoja está vacía (solo encabezados)
    if (sheet.getLastRow() < 2) {
      return { status: 'success', data: [] };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    // Convertir array de arrays a array de objetos
    const result = rows.map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    // Filtrar filas vacías
    const filteredResult = result.filter(row => {
      return Object.values(row).some(val => val !== '' && val !== null);
    });
    
    return { status: 'success', data: filteredResult };
    
  } catch (error) {
    return { 
      status: 'error', 
      message: `Error al obtener datos de ${sheetName}: ${error.message}` 
    };
  }
}

/**
 * Genera un ID único para los registros
 * Formato: ID-TIMESTAMP-RANDOM
 * @returns {string} ID único
 */
function generateId() {
  const timestamp = new Date().getTime().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ID-${timestamp}-${random}`;
}

/**
 * Crea una respuesta de error estandarizada
 * @param {string} message - Mensaje de error
 * @returns {Object} Respuesta HTTP con error
 */
function createErrorResponse(message) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'error',
    message: message
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Valida que los campos requeridos estén presentes
 * @param {Object} data - Datos a validar
 * @param {Array} requiredFields - Campos requeridos
 * @returns {Object|null} Objeto de error o null si es válido
 */
function validateRequiredFields(data, requiredFields) {
  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    return {
      status: 'error',
      message: `Faltan campos requeridos: ${missingFields.join(', ')}`
    };
  }
  
  return null;
}

/**
 * Formatea un número como moneda (Versión Backend)
 * @param {number} amount - Cantidad a formatear
 * @returns {string} Cantidad formateada
 */
function formatCurrency(amount) {
  if (amount === undefined || amount === null) return "$0";
  return "$" + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Generador de Recibo PDF Profesional para Cucaracha
 */
function generarReciboCucarachaPDF(partidaId, partidaNombre, ganadorNombre, monto) {
  try {
    const formatMoney = (amount) => '$' + Number(amount || 0).toLocaleString('es-CO');
    const fechaGeneracion = new Date().toLocaleString('es-CO');
    
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Helvetica', sans-serif; color: #0f172a; padding: 40px; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; background: white; box-shadow: 0 10px 15px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #065f46 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 16px 16px 0 0; }
            .logo { font-size: 24px; font-weight: 800; letter-spacing: 2px; }
            .content { padding: 40px; }
            .prize-card { text-align: center; background: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 20px; margin-bottom: 30px; }
            .prize-amount { font-size: 36px; font-weight: 900; color: #047857; }
            .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
            .label { color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase; }
            .value { color: #1e293b; font-weight: 700; }
            .footer { padding: 20px; text-align: center; color: #94a3b8; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">LA CUCARACHA</div>
              <p>Comprobante de Premio</p>
            </div>
            <div class="content">
              <div class="prize-card">
                <div class="prize-amount">${formatMoney(monto)}</div>
              </div>
              <div class="detail-row">
                <span class="label">Ganador</span>
                <span class="value">${ganadorNombre}</span>
              </div>
              <div class="detail-row">
                <span class="label">Partida</span>
                <span class="value">${partidaNombre}</span>
              </div>
              <div class="detail-row">
                <span class="label">ID de Sesión</span>
                <span class="value">#${partidaId}</span>
              </div>
              <div class="detail-row">
                <span class="label">Fecha</span>
                <span class="value">${fechaGeneracion}</span>
              </div>
            </div>
            <div class="footer">
              <p>Natillera System • Comprobante Digital • Emitido por Sistema</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const blob = Utilities.newBlob('', 'text/html', 'recibo.html').setDataFromString(htmlTemplate, "UTF-8");
    const pdfBlob = blob.getAs("application/pdf");
    const base64 = Utilities.base64Encode(pdfBlob.getBytes());
    
    return {
      base64: base64,
      filename: `Recibo_Cucaracha_${partidaId}_${ganadorNombre.replace(/\s+/g, '_')}.pdf`
    };
  } catch (e) {
    Logger.log("Error en generarReciboCucarachaPDF: " + e.toString());
    return null;
  }
}

// Variable global para controlar la reentrada del bloqueo en la misma ejecución
var _lockDepth = 0;

/**
 * Ejecuta una función dentro de un bloqueo (LockService) de forma segura.
 * Soporta reentrada (bloqueos anidados en la misma ejecución).
 * @param {Function} callback - Función a ejecutar
 * @returns {Object} Resultado de la función o error de bloqueo
 */
function executeWithLock(callback) {
  const lock = LockService.getScriptLock();
  let acquiredHere = false;
  
  try {
    // Si no tenemos el bloqueo aún, intentamos obtenerlo
    if (_lockDepth === 0) {
      const hasLock = lock.tryLock(30000); // 30 segundos
      if (!hasLock) {
        return { 
          status: 'error', 
          message: 'El sistema está ocupado. Por favor intente de nuevo en unos segundos.' 
        };
      }
      acquiredHere = true;
    }
    
    // Aumentar profundidad y ejecutar
    _lockDepth++;
    return callback();
    
  } catch (error) {
    return { 
      status: 'error', 
      message: `Error inesperado: ${error.message}` 
    };
  } finally {
    // Solo liberamos el bloqueo físico si lo obtuvimos en este nivel y ya no hay profundidad
    _lockDepth--;
    if (acquiredHere && _lockDepth === 0) {
      lock.releaseLock();
    }
  }
}


// ==========================================
// FUNCIONES DE AUTENTICACIÓN
// ==========================================

/**
 * Autentica un usuario
 * @param {Object} data - {email, password}
 * @returns {Object} Resultado de la autenticación
 */
function login(data) {
  // Log para debugging
  Logger.log('=== LOGIN ATTEMPT ===');
  Logger.log('Datos recibidos: ' + JSON.stringify(data));
  
  // Validar que data existe
  if (!data) {
    return { 
      status: 'error', 
      message: 'No se recibieron datos de login' 
    };
  }
  
  // Validar campos requeridos
  const validation = validateRequiredFields(data, ['email', 'password']);
  if (validation) {
    Logger.log('Validación fallida: ' + JSON.stringify(validation));
    return validation;
  }
  
  try {
    const usuarios = getData(HOJAS.USUARIOS);
    
    Logger.log('Resultado de getData: ' + JSON.stringify(usuarios));
    
    if (usuarios.status !== 'success') {
      return { status: 'error', message: 'Error al acceder a usuarios' };
    }
    
    Logger.log('Total de usuarios encontrados: ' + usuarios.data.length);
    
    // Buscar usuario por email
    const user = usuarios.data.find(u => 
      String(u.email).toLowerCase() === String(data.email).toLowerCase()
    );
    
    if (!user) {
      Logger.log('Usuario no encontrado: ' + data.email);
      return { status: 'error', message: 'Usuario no encontrado' };
    }
    
    Logger.log('Usuario encontrado: ' + user.email);
    Logger.log('Password en BD: ' + user.password_hash);
    Logger.log('Password recibido: ' + data.password);
    
    // Validar contraseña (sin hash por ahora - Fase 5)
    if (String(user.password_hash) === String(data.password)) {
      Logger.log('Login exitoso para: ' + user.email);
      return { 
        status: 'success', 
        message: 'Autenticación exitosa',
        user: { 
          id: user.id,
          email: user.email, 
          nombre: user.nombre, 
          rol: user.rol 
        }
      };
    }
    
    Logger.log('Contraseña incorrecta');
    return { status: 'error', message: 'Contraseña incorrecta' };
    
  } catch (error) {
    Logger.log('Error en login: ' + error.message);
    return { 
      status: 'error', 
      message: `Error en login: ${error.message}` 
    };
  }
}

// ==========================================
// FUNCIONES DE PARTICIPANTES
// ==========================================

/**
 * Agrega un nuevo participante
 * @param {Object} data - Datos del participante
 * @returns {Object} Resultado de la operación
 */
function agregarParticipante(data) {
  // Validar campos requeridos
  const validation = validateRequiredFields(data, ['nombre', 'cedula', 'telefono']);
  if (validation) return validation;

  // Ejecutar con bloqueo para evitar duplicados
  return executeWithLock(() => {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(HOJAS.PARTICIPANTES);
      
      if (!sheet) {
        return { status: 'error', message: 'La hoja Participantes no existe' };
      }
      
      // Validar que la cédula no exista
      const participantes = getData(HOJAS.PARTICIPANTES);
      if (participantes.status === 'success') {
        const existe = participantes.data.some(p => 
          String(p.cedula) === String(data.cedula)
        );
        
        if (existe) {
          return { 
            status: 'error', 
            message: 'Ya existe un participante con esa cédula' 
          };
        }
      }
      
      const newId = generateId();
      const newRow = [
        newId,
        data.nombre,
        data.cedula,
        data.telefono,
        data.email || '',
        0, // total_aportado
        0, // ganancias_acumuladas
        true, // activo
        new Date(), // fecha_ingreso
        data.dia_pago || 15, // día_pago_acordado (Default 15)
        data.mora_diaria || 3000, // mora_por_dia (Default 3000)
        data.frecuencia_pago || 'MENSUAL',
        data.config_pago || '15'
      ];
      
      sheet.appendRow(newRow);
      
      return { 
        status: 'success', 
        message: 'Participante agregado exitosamente',
        id: newId
      };
      
    } catch (error) {
      return { 
        status: 'error', 
        message: `Error al agregar participante: ${error.message}` 
      };
    }
  });
}

// ==========================================
// FUNCIONES DE APORTES
// ==========================================

/**
 * Registra un nuevo aporte
 * @param {Object} data - Datos del aporte
 * @returns {Object} Resultado de la operación
 */
function agregarAporte(data) {
  // Validar campos requeridos
  const validation = validateRequiredFields(data, 
    ['participante_id', 'monto', 'fecha', 'concepto']
  );
  if (validation) return validation;

  return executeWithLock(() => {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheetAportes = ss.getSheetByName(HOJAS.APORTES);
      
      if (!sheetAportes) {
        return { status: 'error', message: 'La hoja Aportes no existe' };
      }
      
      // Validar que el participante exista
      const participante = findParticipante(data.participante_id);
      if (!participante) {
        return { 
          status: 'error', 
          message: 'El participante no existe' 
        };
      }
      
      // Validar que el participante esté activo
      if (!participante.activo) {
        return { 
          status: 'error', 
          message: 'El participante no está activo' 
        };
      }
      
      // Validar monto
      const monto = Number(data.monto);
      if (isNaN(monto) || monto <= 0) {
        return { 
          status: 'error', 
          message: 'El monto debe ser mayor a cero' 
        };
      }
      
      const newId = generateId();
      // Estado por defecto: APROBADO (para compatibilidad con aportes manuales directos)
      // Si viene 'PENDIENTE', se respeta.
      const estado = data.estado || 'APROBADO';

      const newRow = [
        newId,
        data.participante_id,
        monto,
        new Date(data.fecha),
        data.concepto,
        data.comprobante || '',
        new Date(), // created_at
        data.dias_retraso || 0,
        data.monto_mora || 0,
        estado // COLUMNA J (Index 9) - ESTADO
      ];
      
      sheetAportes.appendRow(newRow);
      
      // Actualizar total_aportado del participante SOLO SI ESTÁ APROBADO
      if (estado === 'APROBADO') {
          actualizarTotalAportado(data.participante_id, monto);
      }
      
      return { 
        status: 'success', 
        message: estado === 'PENDIENTE' ? 'Aporte enviado a validación' : 'Aporte registrado exitosamente',
        id: newId
      };
      
    } catch (error) {
      return { 
        status: 'error', 
        message: `Error al registrar aporte: ${error.message}` 
      };
    }
  });
}

/**
 * Busca un participante por ID
 * @param {string} participanteId - ID del participante
 * @returns {Object|null} Datos del participante o null
 *///
function findParticipante(participanteId) {
  const participantes = getData(HOJAS.PARTICIPANTES);
  if (participantes.status !== 'success') return null;
  
  return participantes.data.find(p => p.id === participanteId);
}

/**
 * Obtiene los aportes incluyendo el nombre del participante
 */
function getAportesConNombres() {
  const aportes = getData(HOJAS.APORTES);
  if (aportes.status !== 'success') return aportes;
  
  const participantes = getData(HOJAS.PARTICIPANTES);
  if (participantes.status !== 'success') return aportes; // Retornar aportes sin nombres si falla participantes
  
  // Crear mapa de participantes por ID para búsqueda rápida
  const mapParticipantes = {};
  participantes.data.forEach(p => {
    mapParticipantes[p.id] = {
      nombre: p.nombre,
      telefono: p.telefono
    };
  });
  
  // Agregar nombre y teléfono a cada aporte
  const dataConNombres = aportes.data.map(aporte => {
    const pInfo = mapParticipantes[aporte.participante_id] || { nombre: 'Desconocido', telefono: '' };
    return {
      ...aporte,
      participante: pInfo.nombre,
      telefono: pInfo.telefono,
      estado: aporte.estado || aporte.Estado || aporte.ESTADO || 'APROBADO' // Probar diferentes keys antes de default
    };
  });
  
  return {
    status: 'success',
    data: dataConNombres
  };
}

/**
 * Obtiene los préstamos incluyendo el nombre del participante
 */
function getPrestamosConNombres() {
  const prestamos = getData(HOJAS.PRESTAMOS);
  if (prestamos.status !== 'success') return prestamos;
  
  const participantes = getData(HOJAS.PARTICIPANTES);
  if (participantes.status !== 'success') return prestamos;
  
  const mapParticipantes = {};
  participantes.data.forEach(p => {
    mapParticipantes[p.id] = p.nombre;
  });

  // Mapa de Fiadores para resolver nombres
  const mapFiadores = {...mapParticipantes}; // Reutilizamos el mapa
  
  const dataConNombres = prestamos.data.map(p => {
    const participante = participantes.data.find(part => part.id === p.participante_id);
    const nombreFiador = p.fiador_id ? (mapFiadores[p.fiador_id] || 'Desconocido') : 'No aplica';

    return {
      ...p,
      participante: participante ? participante.nombre : 'Desconocido',
      telefono: participante ? participante.telefono : '',
      nombre_fiador: nombreFiador
    };
  });
  
  return {
    status: 'success',
    data: dataConNombres
  };
}

/**
 * Actualiza el total aportado de un participante (Recalculando desde cero)
 * Se asegura de sumar SOLO los aportes marcados como 'APROBADO'
 * @param {string} participanteId - ID del participante
 * @param {number} monto - (Ignorado en esta versión, se recalcula todo)
 */
function actualizarTotalAportado(participanteId, monto) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 1. Obtener todos los aportes para recalcular (Fuente de Verdad)
    const datosAportes = getData(HOJAS.APORTES);
    if (datosAportes.status !== 'success') return; // Si falla lectura, no tocamos nada

    // 2. Filtrar y sumar
    let nuevoTotal = 0;
    datosAportes.data.forEach(a => {
      // Verificar pertenencia al participante
      if (String(a.participante_id) === String(participanteId)) {
        // Verificar estado (robusto a mayúsculas/variantes)
        const estado = a.estado || a.Estado || a.ESTADO || 'APROBADO';
        
        if (estado === 'APROBADO') {
          nuevoTotal += Number(a.monto) || 0;
        }
      }
    });

    // 3. Escribir el nuevo total en la hoja Participantes
    const sheetParticipantes = ss.getSheetByName(HOJAS.PARTICIPANTES);
    const dataP = sheetParticipantes.getDataRange().getValues();
    
    // Buscamos la fila del participante
    // Asumimos ID en col 0 y Total Aportado en col 5 (F)
    for (let i = 1; i < dataP.length; i++) {
       // Comparación laxa o string vs string
       if (String(dataP[i][0]) === String(participanteId)) {
         sheetParticipantes.getRange(i + 1, 6).setValue(nuevoTotal);
         // Logger.log(`Total actualizado para ${participanteId}: ${nuevoTotal}`);
         break;
       }
    }

  } catch (error) {
    Logger.log(`Error al recalcular total aportado: ${error.message}`);
  }
}

// ==========================================
// FUNCIONES DE ACTIVIDADES
// ==========================================

/**
 * Registra una nueva actividad
 * @param {Object} data - Datos de la actividad
 * @returns {Object} Resultado de la operación
 */
function agregarActividad(data) {
  // Validar campos requeridos
  const validation = validateRequiredFields(data, 
    ['nombre', 'monto_generado', 'fecha', 'responsable']
  );
  if (validation) return validation;
  
  return executeWithLock(() => {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(HOJAS.ACTIVIDADES);
      
      if (!sheet) {
        return { status: 'error', message: 'La hoja Actividades no existe' };
      }
      
      // Validar monto
      const monto = Number(data.monto_generado);
      if (isNaN(monto) || monto < 0) {
        return { 
          status: 'error', 
          message: 'El monto debe ser mayor o igual a cero' 
        };
      }
      
      const newId = generateId();
      const newRow = [
        newId,
        data.nombre,
        data.descripcion || '',
        monto,
        new Date(data.fecha),
        data.responsable,
        'FINALIZADA',
        new Date() // created_at
      ];
      
      sheet.appendRow(newRow);
      
      return { 
        status: 'success', 
        message: 'Actividad registrada exitosamente',
        id: newId
      };
      
    } catch (error) {
      return { 
        status: 'error', 
        message: `Error al registrar actividad: ${error.message}` 
      };
    }
  });
}

// ==========================================
// FUNCIONES DE PRÉSTAMOS
// ==========================================

/**
 * Crea un nuevo préstamo con validación de fiador
 * @param {Object} data - Datos del préstamo
 * @returns {Object} Resultado de la operación
 */
function agregarPrestamo(data) {
  // Validar campos requeridos
  const validation = validateRequiredFields(data, 
    ['participante_id', 'monto_prestado', 'tasa_interes', 'fecha_prestamo', 'fecha_vencimiento']
  );
  if (validation) return validation;
  
  return executeWithLock(() => {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(HOJAS.PRESTAMOS);
      
      if (!sheet) {
        return { status: 'error', message: 'La hoja Prestamos no existe' };
      }
      
      // Validar que el participante exista y esté activo
      const participante = findParticipante(data.participante_id);
      if (!participante) {
        return { status: 'error', message: 'El participante no existe' };
      }
      if (!participante.activo) {
        return { status: 'error', message: 'El participante no está activo' };
      }
      
      // Validar montos
      const monto = Number(data.monto_prestado);
      const tasa = Number(data.tasa_interes);
      
      if (isNaN(monto) || monto <= 0) {
        return { status: 'error', message: 'El monto debe ser mayor a cero' };
      }
      if (isNaN(tasa) || tasa < 0 || tasa > 100) {
        return { status: 'error', message: 'La tasa debe estar entre 0 y 100' };
      }

      // Validar fechas: la fecha de vencimiento debe ser posterior a la del préstamo
      const fechaPrestamo = new Date(data.fecha_prestamo);
      const fechaVencimiento = new Date(data.fecha_vencimiento);
      if (fechaVencimiento <= fechaPrestamo) {
        return { status: 'error', message: 'La fecha de vencimiento debe ser posterior a la fecha del préstamo' };
      }

      // ══════════════════════════════════════════════════
      // MODO DE PRÉSTAMO: ESTRICTO vs FLEXIBLE (Configurable)
      // ══════════════════════════════════════════════════
      const sheetConfig = ss.getSheetByName(HOJAS.CONFIG);
      let modoPrestamo = 'ESTRICTO'; // Default seguro
      let montoMaximo = 0; // 0 = sin límite
      if (sheetConfig) {
        const dataConfig = sheetConfig.getDataRange().getValues();
        for (let i = 1; i < dataConfig.length; i++) {
          if (dataConfig[i][0] === 'MODO_PRESTAMO') {
            modoPrestamo = String(dataConfig[i][1]).trim().toUpperCase();
          }
          if (dataConfig[i][0] === 'MONTO_MAXIMO_PRESTAMO') {
            montoMaximo = Number(dataConfig[i][1]) || 0;
          }
        }
      }

      // Validar tope máximo de préstamo (si está configurado > 0)
      if (montoMaximo > 0 && monto > montoMaximo) {
        return { 
          status: 'error', 
          message: `El monto ($${monto.toLocaleString()}) excede el límite máximo permitido ($${montoMaximo.toLocaleString()})` 
        };
      }

      // Regla de Fiador: SOLO aplica en modo ESTRICTO
      if (modoPrestamo === 'ESTRICTO') {
        const ahorroSolicitante = Number(participante.total_aportado || 0);

        if (monto > ahorroSolicitante) {
            if (!data.fiador_id) {
                return { status: 'error', message: 'El monto excede sus ahorros. Debe asignar un fiador.' };
            }
            if (data.fiador_id === data.participante_id) {
                return { status: 'error', message: 'El fiador no puede ser el mismo solicitante.' };
            }

            // Validar capacidad conjunta (Ahorro Solicitante + Ahorro Fiador >= Monto)
            const fiador = findParticipante(data.fiador_id);
            if (!fiador || !fiador.activo) {
                return { status: 'error', message: 'El fiador seleccionado no es válido o está inactivo.' };
            }

            const ahorroFiador = Number(fiador.total_aportado || 0);
            const capacidadTotal = ahorroSolicitante + ahorroFiador;

            if (capacidadTotal < monto) {
                 return { 
                     status: 'error', 
                     message: `Capacidad insuficiente. Ahorro conjunto (${formatCurrency(capacidadTotal)}) es menor al préstamo.`
                 };
            }
        }
      }
      // En modo FLEXIBLE: no se valida ahorro ni se exige fiador (pero se guarda si se proporcionó)
      
      // Calcular interés simple (Causación Inicial - NO es ganancia aún)
      const diasDiferencia = (fechaVencimiento - fechaPrestamo) / (1000 * 60 * 60 * 24);
      const meses = diasDiferencia / 30;
      const interes = monto * (tasa / 100) * meses;
      const saldoPendiente = monto + interes;
      
      const newId = generateId();
      const newRow = [
        newId,
        data.participante_id,
        monto,
        tasa,
        fechaPrestamo,
        fechaVencimiento,
        interes,
        saldoPendiente,
        'ACTIVO',
        new Date(), // created_at
        data.fiador_id || '' // Campo fiador (opcional en modo FLEXIBLE)
      ];
      
      sheet.appendRow(newRow);
      
      return { 
        status: 'success', 
        message: 'Préstamo creado exitosamente',
        id: newId,
        interes_calculado: interes,
        saldo_total: saldoPendiente
      };
      
    } catch (error) {
      return { 
        status: 'error', 
        message: `Error al crear préstamo: ${error.message}` 
      };
    }
  });
}

/**
 * Actualiza automáticamente a 'VENCIDO' los préstamos ACTIVOS cuya fecha ya pasó
 */
function actualizarEstadoPrestamosVencidos() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(HOJAS.PRESTAMOS);
    const data = sheet.getDataRange().getValues();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let cambios = 0;
    for (let i = 1; i < data.length; i++) {
      const estado = String(data[i][8]).trim().toUpperCase();
      const fechaVencimiento = new Date(data[i][5]);
      fechaVencimiento.setHours(0, 0, 0, 0);

      if (estado === 'ACTIVO' && fechaVencimiento < hoy) {
        sheet.getRange(i + 1, 9).setValue('VENCIDO');
        cambios++;
      } else if (estado === 'VENCIDO' && fechaVencimiento >= hoy) {
        sheet.getRange(i + 1, 9).setValue('ACTIVO');
        cambios++;
      }
    }
    return cambios;
  } catch (error) {
    Logger.log('Error en actualizarEstadoPrestamosVencidos: ' + error.message);
    return 0;
  }
}

/**
 * Modifica la fecha de vencimiento de un préstamo
 * Protegida con executeWithLock para evitar condiciones de carrera
 * @param {Object} data - {id, nuevaFecha}
 */
function modificarVencimientoPrestamo(data) {
  const { id, nuevaFecha } = data;
  if (!id || !nuevaFecha) return { status: 'error', message: 'Faltan datos' };

  return executeWithLock(() => {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(HOJAS.PRESTAMOS);
      const rows = sheet.getDataRange().getValues();
      
      let rowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === id) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex === -1) return { status: 'error', message: 'Préstamo no encontrado' };

      const monto = Number(rows[rowIndex-1][2]);
      const tasa = Number(rows[rowIndex-1][3]);
      const fechaPrestamo = new Date(rows[rowIndex-1][4]);
      const fechaNuevaVencimiento = new Date(nuevaFecha);

      // Validar que la nueva fecha sea posterior a la fecha del préstamo
      if (fechaNuevaVencimiento <= fechaPrestamo) {
        return { status: 'error', message: 'La nueva fecha debe ser posterior a la fecha del préstamo' };
      }

      // Recalcular interés simple
      const diasDiferencia = (fechaNuevaVencimiento - fechaPrestamo) / (1000 * 60 * 60 * 24);
      const meses = diasDiferencia / 30;
      const nuevoInteres = monto * (tasa / 100) * meses;
      const nuevoSaldo = monto + nuevoInteres;

      // Actualizar fecha de vencimiento (Columna 6), interés (Columna 7) y saldo (Columna 8)
      sheet.getRange(rowIndex, 6).setValue(fechaNuevaVencimiento);
      sheet.getRange(rowIndex, 7).setValue(nuevoInteres);
      sheet.getRange(rowIndex, 8).setValue(nuevoSaldo);
      
      // Al cambiar la fecha, debemos recalcular el estado inmediatamente
      actualizarEstadoPrestamosVencidos();

      return { status: 'success', message: 'Fecha de vencimiento actualizada correctamente' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  });
}

/**
 * Registra el pago total de un préstamo
 * @param {Object} data - {id}
 */
function registrarPagoPrestamo(data) {
  const { id } = data;
  if (!id) return { status: 'error', message: 'ID de préstamo requerido' };

  return executeWithLock(() => {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(HOJAS.PRESTAMOS);
      const rows = sheet.getDataRange().getValues();
      
      let rowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === id) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex === -1) return { status: 'error', message: 'Préstamo no encontrado' };

      // Obtener datos del préstamo para trazabilidad
      const saldoAnterior = Number(rows[rowIndex-1][7]);
      const interesGenerado = Number(rows[rowIndex-1][6]);

      // Registrar movimiento de pago total en Movimientos_Prestamos (Trazabilidad)
      const sheetMovimientos = ss.getSheetByName('Movimientos_Prestamos');
      if (sheetMovimientos) {
        // Si hay interés pendiente, registrar pago de interés
        if (interesGenerado > 0) {
          sheetMovimientos.appendRow([
            generateId(),
            id,
            new Date(),
            'PAGO_INTERES',
            interesGenerado,
            0, // saldo_resultante_capital
            0, // saldo_resultante_interes
            new Date()
          ]);
        }
        // Registrar pago de capital
        const capitalPagado = saldoAnterior - interesGenerado;
        if (capitalPagado > 0) {
          sheetMovimientos.appendRow([
            generateId(),
            id,
            new Date(),
            'PAGO_TOTAL',
            capitalPagado,
            0, // saldo_resultante_capital
            0, // saldo_resultante_interes
            new Date()
          ]);
        }
      }

      // Actualizar estado a PAGADO (Columna 9 - Índice 8)
      sheet.getRange(rowIndex, 9).setValue('PAGADO');
      // Actualizar saldo pendiente a 0 (Columna 8 - Índice 7)
      sheet.getRange(rowIndex, 8).setValue(0);

      // Recalcular ganancias automáticamente al recibir un pago
      calcularDistribucionGanancias();

      return { status: 'success', message: 'Pago registrado exitosamente. Los intereses se han movido a ganancias.' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  });
}

// ==========================================
// FUNCIONES DE CÁLCULO Y GESTIÓN
// ==========================================

// 💡 actualizarEsquemaDistribucion() → movida a DbSetup.gs

/**
 * Calcula y distribuye las ganancias del ciclo
 * SOPORTA 3 MÉTODOS: EQUITATIVA, PROPORCIONAL, MANUAL
 */
function calcularDistribucionGanancias() {
  try {
    // 0. Auto-migración de esquema
    actualizarEsquemaDistribucion();

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 1. Leer Configuración de Distribución
    let metodoDistribucion = 'EQUITATIVA'; // Default
    const sheetConfig = ss.getSheetByName(HOJAS.CONFIG);
    if (sheetConfig) {
        const dataConfig = sheetConfig.getDataRange().getValues();
        for (let i = 1; i < dataConfig.length; i++) {
            if (dataConfig[i][0] === 'METODO_DISTRIBUCION') {
                metodoDistribucion = String(dataConfig[i][1]).trim().toUpperCase();
                break;
            }
        }
    }

    // 2. Calcular Totales (Intereses Pagados + Otras Actividades)
    // Ahora todo sale de Actividades según el requerimiento del usuario
    const respAct = getData(HOJAS.ACTIVIDADES);
    let totalIntereses = 0;
    let totalActividades = 0;
    
    if (respAct.status === 'success' && respAct.data) {
        respAct.data.forEach(a => {
            const monto = Number(a.monto_generado) || 0;
            const nombre = String(a.nombre_actividad || '').trim();
            
            if (nombre === 'Pago Intereses Préstamo') {
                totalIntereses += monto;
            } else {
                totalActividades += monto;
            }
        });
    }
    
    const gananciaTotal = totalIntereses + totalActividades;
    
    // 3. Obtener Participantes Activos
    const sheetParticipantes = ss.getSheetByName(HOJAS.PARTICIPANTES);
    if (!sheetParticipantes) return { status: 'error', message: 'No se encontró la hoja de Participantes' };
    
    const dataParticipantes = sheetParticipantes.getDataRange().getValues();
    const headersP = dataParticipantes[0];
    const idxTotalAportado = headersP.indexOf('total_aportado');
    const idxPorcentaje = headersP.indexOf('porcentaje_participacion');
    
    // RE-LECTURA ROBUSTA USANDO getData para mapeo de objetos
    const respP = getData(HOJAS.PARTICIPANTES);
    if (respP.status !== 'success') return respP;
    
    const listaParticipantes = respP.data.filter(p => p.activo);
    
    if (listaParticipantes.length === 0) {
        return { status: 'success', message: 'No hay participantes activos' };
    }

    let totalAportadoGlobal = 0;
    let sumaPorcentajesManuales = 0;

    // Calcular bases según método
    if (metodoDistribucion === 'PROPORCIONAL') {
        totalAportadoGlobal = listaParticipantes.reduce((sum, p) => sum + (Number(p.total_aportado) || 0), 0);
    } else if (metodoDistribucion === 'MANUAL') {
        sumaPorcentajesManuales = listaParticipantes.reduce((sum, p) => sum + (Number(p.porcentaje_participacion) || 0), 0);
        if (Math.abs(sumaPorcentajesManuales - 100) > 0.1) {
             return { status: 'error', message: `Los porcentajes manuales suman ${sumaPorcentajesManuales}%, deben sumar 100%` };
        }
    }

    const mapGanancias = {}; // pId -> Monto

    // 5. Calcular para cada participante
    listaParticipantes.forEach(p => {
        let montoGanancia = 0;
        
        if (metodoDistribucion === 'EQUITATIVA') {
            montoGanancia = gananciaTotal / listaParticipantes.length;
        } else if (metodoDistribucion === 'PROPORCIONAL') {
            const aporteP = Number(p.total_aportado) || 0;
            if (totalAportadoGlobal > 0) {
                montoGanancia = gananciaTotal * (aporteP / totalAportadoGlobal);
            }
        } else if (metodoDistribucion === 'MANUAL') {
            const porcentaje = Number(p.porcentaje_participacion) || 0;
            montoGanancia = gananciaTotal * (porcentaje / 100);
        }
        
        montoGanancia = Number(montoGanancia.toFixed(2));
        mapGanancias[p.id] = montoGanancia;
    });

    // 6. Actualizar Participantes (Columna Ganancias)
    const idxGanancias = headersP.indexOf('ganancias_acumuladas'); 
    
    if (idxGanancias !== -1) {
        for (let i = 1; i < dataParticipantes.length; i++) {
             const idOriginal = String(dataParticipantes[i][0]);
             const ganancia = mapGanancias[idOriginal] || 0;
             sheetParticipantes.getRange(i + 1, idxGanancias + 1).setValue(ganancia);
        }
    }

    return {
        status: 'success', 
        message: `Ganancias distribuidas (${metodoDistribucion})`,
        data: {
            metodo: metodoDistribucion,
            gananciaTotal: gananciaTotal,
            totalIntereses: totalIntereses,
            totalActividades: totalActividades,
            totalParticipantes: listaParticipantes.length,
            gananciaPorPersona: (metodoDistribucion === 'EQUITATIVA' && listaParticipantes.length > 0) ? (gananciaTotal / listaParticipantes.length) : 0
        }
    };
    
  } catch (error) {
    return { status: 'error', message: `Error al calcular ganancias: ${error.message}` };
  }
}

/**
 * Registra un abono a un préstamo
 * Aplica prelación: Intereses acumulados -> Capital
 */
function registrarAbono(data) {
    const { prestamo_id, monto } = data;
    if (!prestamo_id || !monto || Number(monto) <= 0) {
        return { status: 'error', message: 'Datos inválidos para el abono' };
    }

    return executeWithLock(() => {
        try {
            const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
            
            // 1. Obtener Préstamo
            const sheetPrestamos = ss.getSheetByName(HOJAS.PRESTAMOS);
            const dataPrestamos = sheetPrestamos.getDataRange().getValues();
            let rowPrestamo = -1;
            let prestamo = null;

            for(let i=1; i<dataPrestamos.length; i++) {
                if(dataPrestamos[i][0] === prestamo_id) {
                    rowPrestamo = i + 1;
                    prestamo = {
                        id: dataPrestamos[i][0],
                        monto_prestado: Number(dataPrestamos[i][2]),
                        interes_generado: Number(dataPrestamos[i][6]), // Total devengado histórico
                        saldo_pendiente: Number(dataPrestamos[i][7]),
                        estado: dataPrestamos[i][8]
                    };
                    break;
                }
            }

            if (!prestamo) return { status: 'error', message: 'Préstamo no encontrado' };
            if (prestamo.estado === 'PAGADO') return { status: 'error', message: 'El préstamo ya está PAGADO' };

            // 2. Calcular Intereses YA pagados para saber cuánto se debe
            const sheetMovimientos = ss.getSheetByName('Movimientos_Prestamos');
            if(!sheetMovimientos) return { status: 'error', message: 'Error crítico: Tabla Movimientos no existe' };
            
            const dataMovimientos = sheetMovimientos.getDataRange().getValues();
            let interesesPagados = 0;
            // Index Check Movimientos: id, prestamo_id, fecha, tipo, monto
            for(let i=1; i<dataMovimientos.length; i++) {
                if(dataMovimientos[i][1] === prestamo_id && dataMovimientos[i][3] === 'PAGO_INTERES') {
                    interesesPagados += Number(dataMovimientos[i][4]);
                }
            }

            const interesPendiente = prestamo.interes_generado - interesesPagados;
            // Asegurar no negativos por inconsistencias flotantes
            const deudaInteres = Math.max(0, interesPendiente); 

            // 3. Distribuir el Abono
            let disponible = Number(monto);
            let pagoInteres = 0;
            let pagoCapital = 0;

            // A) Pagar Intereses
            if (deudaInteres > 0) {
                pagoInteres = Math.min(disponible, deudaInteres);
                disponible -= pagoInteres;
            }

            // B) Pagar Capital (solo si sobra)
            if (disponible > 0) {
                pagoCapital = disponible;
            }

            // 4. Registrar Movimientos
            if (pagoInteres > 0) {
                sheetMovimientos.appendRow([
                    generateId(),
                    prestamo_id,
                    new Date(),
                    'PAGO_INTERES',
                    pagoInteres,
                    prestamo.monto_prestado, // El capital nominal no cambia referencialmente para calculos, pero quizas deberiamos guardar saldo resultante?
                    // Dejemos saldo_resultante_capital como referencia
                    prestamo.saldo_pendiente - pagoInteres // Temporal logic
                ]);

                // NUEVA LOGICA: Registrar en Actividades como indica el usuario
                try {
                    const sheetActividades = ss.getSheetByName(HOJAS.ACTIVIDADES);
                    if (sheetActividades) {
                        // Obtener participante
                        const pId = dataPrestamos[rowPrestamo-1][1];
                        const participante = findParticipante(pId);
                        const nombreP = participante ? participante.nombre : 'Desconocido';

                        sheetActividades.appendRow([
                            generateId(),
                            'Pago Intereses Préstamo',
                            pagoInteres,
                            new Date(),
                            'Sistema',
                            `intereses prestamo pagado de ${nombreP}`,
                            'FINALIZADA',
                            new Date()
                        ]);
                    }
                } catch (errAct) {
                    console.error('Error registrando en actividades:', errAct.message);
                }
            }

            if (pagoCapital > 0) {
                sheetMovimientos.appendRow([
                    generateId(),
                    prestamo_id,
                    new Date(),
                    'ABONO',
                    pagoCapital,
                    prestamo.saldo_pendiente - pagoInteres - pagoCapital,
                    0
                ]);
            }

            // 5. Actualizar Saldos en Préstamo
            const nuevoSaldo = prestamo.saldo_pendiente - monto;
            const nuevoSaldoFinal = Math.max(0, nuevoSaldo); // Seguridad

            sheetPrestamos.getRange(rowPrestamo, 8).setValue(nuevoSaldoFinal);

            // Validar si queda en 0 para cambio de estado visual (aunque cierre es manual)
            // El usuario dijo "El préstamo queda pendiente de acción humana". No cambiamos a PAGADO autom.
            
            // Recalcular ganancias si hubo pago de interés o cualquier movimiento que afecte
            calcularDistribucionGanancias();

            return { 
                status: 'success', 
                message: 'Abono registrado con éxito',
                distribucion: { interes: pagoInteres, capital: pagoCapital, saldo_restante: nuevoSaldoFinal }
            };

        } catch (error) {
            return { status: 'error', message: `Error en abono: ${error.message}` };
        }
    });
}

/**
 * Cierra manualmente un préstamo
 * Requisito: Saldo debe ser 0
 */
function cerrarPrestamo(data) {
    const { prestamo_id } = data;
    return executeWithLock(() => {
        try {
            const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
            const sheet = ss.getSheetByName(HOJAS.PRESTAMOS);
            const rows = sheet.getDataRange().getValues();
            
            let rowIndex = -1;
            for (let i = 1; i < rows.length; i++) {
                if (rows[i][0] === prestamo_id) {
                    rowIndex = i + 1;
                    break;
                }
            }

            if (rowIndex === -1) return { status: 'error', message: 'Préstamo no encontrado' };

            const saldo = Number(rows[rowIndex-1][7]);
            if (saldo > 0) {
                return { status: 'error', message: `No se puede cerrar. Saldo pendiente: ${formatCurrency(saldo)}` };
            }

            // Cerrar
            sheet.getRange(rowIndex, 9).setValue('PAGADO');
            
            return { status: 'success', message: 'Préstamo cerrado correctamente.' };

        } catch(error) {
            return { status: 'error', message: error.message };
        }
    });
}

/**
 * Obtiene el historial de movimientos de un préstamo
 */
function getMovimientosPrestamo(prestamoId) {
    const movimientos = getData('Movimientos_Prestamos');
    if (movimientos.status !== 'success') return { status: 'success', data: [] }; // Si no existe tabla, retorna vacio

    const filtrados = movimientos.data.filter(m => m.prestamo_id === prestamoId);
    // Ordenar por fecha desc
    filtrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return { status: 'success', data: filtrados };
}

/**
 * Genera una tabla de amortización para un préstamo
 * Soporta sistema FRANCES (cuota fija) y ALEMAN (cuota decreciente)
 * @param {number} monto - Capital del préstamo
 * @param {number} tasaMensual - Tasa de interés mensual (%)
 * @param {number} numeroCuotas - Número de cuotas mensuales
 * @param {string} metodo - 'FRANCES' o 'ALEMAN'
 * @returns {Object} Tabla de amortización con totales
 */
function generarTablaAmortizacion(monto, tasaMensual, numeroCuotas, metodo) {
  try {
    if (!monto || monto <= 0 || !tasaMensual || !numeroCuotas || numeroCuotas <= 0) {
      return { status: 'error', message: 'Parámetros inválidos: monto, tasa y cuotas son requeridos y deben ser mayores a 0' };
    }

    const tasa = tasaMensual / 100; // Convertir porcentaje a decimal
    const tabla = [];
    let saldo = monto;
    let totalInteres = 0;
    let totalCapital = 0;
    let totalCuota = 0;

    if (metodo === 'FRANCES') {
      // ══════════════════════════════════════════
      // SISTEMA FRANCÉS: Cuota fija mensual
      // Fórmula: C = M × [i(1+i)^n] / [(1+i)^n - 1]
      // ══════════════════════════════════════════
      const cuotaFija = tasa === 0 
        ? monto / numeroCuotas 
        : monto * (tasa * Math.pow(1 + tasa, numeroCuotas)) / (Math.pow(1 + tasa, numeroCuotas) - 1);

      for (let i = 1; i <= numeroCuotas; i++) {
        const interesCuota = saldo * tasa;
        const capitalCuota = cuotaFija - interesCuota;
        saldo = Math.max(0, saldo - capitalCuota);

        // Corregir última cuota para evitar decimales residuales
        if (i === numeroCuotas) saldo = 0;

        totalInteres += interesCuota;
        totalCapital += capitalCuota;
        totalCuota += cuotaFija;

        tabla.push({
          cuota: i,
          cuota_valor: Math.round(cuotaFija),
          capital: Math.round(capitalCuota),
          interes: Math.round(interesCuota),
          saldo: Math.round(saldo)
        });
      }
    } else {
      // ══════════════════════════════════════════
      // SISTEMA ALEMÁN: Capital fijo, cuota decreciente
      // Capital por cuota = Monto / N
      // ══════════════════════════════════════════
      const capitalFijo = monto / numeroCuotas;

      for (let i = 1; i <= numeroCuotas; i++) {
        const interesCuota = saldo * tasa;
        const cuotaValor = capitalFijo + interesCuota;
        saldo = Math.max(0, saldo - capitalFijo);

        if (i === numeroCuotas) saldo = 0;

        totalInteres += interesCuota;
        totalCapital += capitalFijo;
        totalCuota += cuotaValor;

        tabla.push({
          cuota: i,
          cuota_valor: Math.round(cuotaValor),
          capital: Math.round(capitalFijo),
          interes: Math.round(interesCuota),
          saldo: Math.round(saldo)
        });
      }
    }

    return {
      status: 'success',
      data: {
        metodo: metodo,
        monto: monto,
        tasa_mensual: tasaMensual,
        num_cuotas: numeroCuotas,
        cuota_mensual: metodo === 'FRANCES' ? Math.round(tabla[0].cuota_valor) : 'Variable',
        total_interes: Math.round(totalInteres),
        total_a_pagar: Math.round(totalCuota),
        tabla: tabla
      }
    };
  } catch (error) {
    return { status: 'error', message: `Error generando amortización: ${error.message}` };
  }
}

/**
 * Obtiene la tabla de amortización para un préstamo existente
 * Calcula las cuotas basándose en los datos del préstamo
 * @param {string} prestamoId - ID del préstamo
 * @returns {Object} Tabla de amortización
 */
function getAmortizacionPrestamo(prestamoId) {
  try {
    if (!prestamoId) return { status: 'error', message: 'ID de préstamo requerido' };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(HOJAS.PRESTAMOS);
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];

    let prestamo = null;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === prestamoId) {
        prestamo = {};
        headers.forEach((h, idx) => prestamo[h] = rows[i][idx]);
        break;
      }
    }

    if (!prestamo) return { status: 'error', message: 'Préstamo no encontrado' };

    const monto = Number(prestamo.monto_prestado);
    const tasa = Number(prestamo.tasa_interes);
    const fechaPrestamo = new Date(prestamo.fecha_prestamo);
    const fechaVencimiento = new Date(prestamo.fecha_vencimiento);
    
    // Calcular número de meses entre las fechas
    const diffMs = fechaVencimiento - fechaPrestamo;
    const diffDias = diffMs / (1000 * 60 * 60 * 24);
    const numeroCuotas = Math.max(1, Math.round(diffDias / 30));

    return generarTablaAmortizacion(monto, tasa, numeroCuotas, 'FRANCES');
  } catch (error) {
    return { status: 'error', message: `Error: ${error.message}` };
  }
}

/**
 * SISTEMA DE RECORDATORIOS AUTOMATICOS DE PRESTAMOS
 * Escanea prestamos activos/vencidos y envia alertas por email
 * EJECUTAR via trigger semanal o manualmente desde el frontend
 */
function enviarRecordatoriosPrestamos() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 1. Leer configuracion de dias de aviso
    const sheetConfig = ss.getSheetByName(HOJAS.CONFIG);
    let diasAviso = [7, 3, 1];
    if (sheetConfig) {
      const dataConfig = sheetConfig.getDataRange().getValues();
      for (let i = 1; i < dataConfig.length; i++) {
        if (dataConfig[i][0] === 'DIAS_AVISO_PRESTAMO') {
          diasAviso = String(dataConfig[i][1]).split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
          break;
        }
      }
    }

    // 2. Obtener prestamos activos/vencidos
    const sheetPrestamos = ss.getSheetByName(HOJAS.PRESTAMOS);
    if (!sheetPrestamos) return { status: 'error', message: 'Hoja Prestamos no encontrada' };
    
    const rows = sheetPrestamos.getDataRange().getValues();
    const headers = rows[0];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const recordatorios = [];

    for (let i = 1; i < rows.length; i++) {
      const estadoIdx = headers.indexOf('estado');
      const estado = String(rows[i][estadoIdx] || '').toUpperCase();
      if (estado !== 'ACTIVO' && estado !== 'VENCIDO') continue;

      const vencIdx = headers.indexOf('fecha_vencimiento');
      const fechaVencimiento = new Date(rows[i][vencIdx]);
      fechaVencimiento.setHours(0, 0, 0, 0);
      const diasRestantes = Math.round((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
      
      const debeNotificar = diasAviso.includes(diasRestantes) || diasRestantes < 0;
      if (!debeNotificar) continue;

      const participanteId = rows[i][headers.indexOf('participante_id')];
      const participante = findParticipante(participanteId);
      
      if (participante) {
        recordatorios.push({
          prestamo_id: rows[i][0],
          participante: participante.nombre,
          telefono: participante.telefono || '',
          monto: Number(rows[i][headers.indexOf('monto_prestado')]),
          saldo: Number(rows[i][headers.indexOf('saldo_pendiente')]),
          fecha_vencimiento: fechaVencimiento,
          dias_restantes: diasRestantes,
          urgencia: diasRestantes <= 0 ? 'VENCIDO' : diasRestantes <= 3 ? 'URGENTE' : 'PROXIMO'
        });
      }
    }

    if (recordatorios.length === 0) {
      return { status: 'success', message: 'No hay recordatorios pendientes', data: { total: 0, recordatorios: [] }};
    }

    // 3. Construir email resumen
    var htmlEmail = '<h2>Recordatorios de Prestamos - NatiSystem</h2>';
    htmlEmail += '<p>Se encontraron <strong>' + recordatorios.length + '</strong> prestamos que requieren atencion:</p>';
    htmlEmail += '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;">';
    htmlEmail += '<tr style="background:#1e3a5f;color:white;"><th>Estado</th><th>Participante</th><th>Saldo</th><th>Vence</th><th>Dias</th><th>WhatsApp</th></tr>';

    for (var j = 0; j < recordatorios.length; j++) {
      var r = recordatorios[j];
      var fechaStr = Utilities.formatDate(r.fecha_vencimiento, Session.getScriptTimeZone(), 'dd/MM/yyyy');
      var whatsappMsg = encodeURIComponent('Hola ' + r.participante + ', le recordamos que su prestamo por $' + r.saldo.toLocaleString() + ' vence el ' + fechaStr + '. Gracias.');
      var whatsappLink = r.telefono ? 'https://wa.me/57' + r.telefono.replace(/\\D/g, '') + '?text=' + whatsappMsg : '';
      var rowColor = r.dias_restantes <= 0 ? '#ffebee' : r.dias_restantes <= 3 ? '#fff8e1' : '#e8f5e9';
      htmlEmail += '<tr style="background:' + rowColor + ';">';
      htmlEmail += '<td>' + r.urgencia + '</td>';
      htmlEmail += '<td><strong>' + r.participante + '</strong></td>';
      htmlEmail += '<td>$' + r.saldo.toLocaleString() + '</td>';
      htmlEmail += '<td>' + fechaStr + '</td>';
      htmlEmail += '<td>' + (r.dias_restantes <= 0 ? 'VENCIDO (' + Math.abs(r.dias_restantes) + 'd)' : r.dias_restantes + ' dias') + '</td>';
      htmlEmail += '<td>' + (r.telefono ? '<a href="' + whatsappLink + '">Enviar</a>' : 'Sin tel.') + '</td>';
      htmlEmail += '</tr>';
    }
    htmlEmail += '</table>';

    // 4. Enviar email a admins
    var enviados = 0;
    var sheetUsuarios = ss.getSheetByName(HOJAS.USUARIOS);
    if (sheetUsuarios) {
      var usuarios = sheetUsuarios.getDataRange().getValues();
      var headersU = usuarios[0];
      var rolIdx = headersU.indexOf('rol');
      var emailIdx = headersU.indexOf('email');
      for (var k = 1; k < usuarios.length; k++) {
        if (String(usuarios[k][rolIdx]).toLowerCase() === 'admin' && usuarios[k][emailIdx]) {
          MailApp.sendEmail({
            to: usuarios[k][emailIdx],
            subject: 'NatiSystem: ' + recordatorios.length + ' prestamo(s) requieren atencion',
            htmlBody: htmlEmail
          });
          enviados++;
        }
      }
    }

    return { 
      status: 'success', 
      message: recordatorios.length + ' recordatorio(s) procesados. Email enviado a ' + enviados + ' admin(s).',
      data: { total: recordatorios.length, recordatorios: recordatorios }
    };
  } catch (error) {
    return { status: 'error', message: 'Error en recordatorios: ' + error.message };
  }
}

/**
 * MOTOR DE CAUSACIÓN AUTOMÁTICA DE INTERESES
 * Calcula intereses diarios y cambia estados a MORA
 * DEBE EJECUTARSE DIARIAMENTE (Trigger configurado)
 */
function motorCausacionInteres() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetPrestamos = ss.getSheetByName(HOJAS.PRESTAMOS);
    const sheetMovimientos = ss.getSheetByName('Movimientos_Prestamos');
    
    if (!sheetPrestamos) {
      Logger.log('Error: Hoja Prestamos no encontrada');
      return { status: 'error', message: 'Hoja Prestamos no encontrada' };
    }

    // Si no existe la hoja de movimientos, no hacer nada (sistema no inicializado)
    if (!sheetMovimientos) {
      Logger.log('Advertencia: Hoja Movimientos_Prestamos no existe. Ejecute inicializarBaseDatos primero.');
      return { status: 'error', message: 'Sistema no inicializado. Ejecute Inicializar BD primero.' };
    }

    const dataPrestamos = sheetPrestamos.getDataRange().getValues();
    // Headers: id(0), participante_id(1), monto(2), tasa(3), fecha(4), venc(5), int_gen(6), saldo(7), estado(8), created(9), fiador(10)
    
    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    let cambios = 0;
    let prestamosActualizados = [];

    for (let i = 1; i < dataPrestamos.length; i++) {
      const pId = dataPrestamos[i][0];
      const monto = Number(dataPrestamos[i][2]);
      const tasa = Number(dataPrestamos[i][3]);
      const fechaVenc = new Date(dataPrestamos[i][5]);
      let intGenerado = Number(dataPrestamos[i][6]);
      let saldo = Number(dataPrestamos[i][7]);
      let estado = String(dataPrestamos[i][8]).toUpperCase();

      // Solo procesar ACTIVO o MORA con deuda pendiente
      if ((estado === 'ACTIVO' || estado === 'MORA') && saldo > 0) {
        
        // 1. Calcular Interés Diario
        // Fórmula: (Capital * TasaMensual / 100) / 30
        const interesDiario = (monto * (tasa / 100)) / 30;
        
        // Ajuste de precisión
        const intDiarioRedondeado = Math.round(interesDiario * 100) / 100;

        if (intDiarioRedondeado > 0) {
          // Actualizar acumuladores
          intGenerado += intDiarioRedondeado;
          saldo += intDiarioRedondeado;

          // Calcular saldos teóricos para el registro
          const capitalPendiente = saldo - intGenerado;

          // Registrar Movimiento (Contable)
          sheetMovimientos.appendRow([
            generateId(),
            pId,
            new Date(),
            'CAUSACION_INTERES',
            intDiarioRedondeado,
            capitalPendiente,
            intGenerado,
            new Date()
          ]);

          // Actualizar fila en Prestamos
          sheetPrestamos.getRange(i + 1, 7).setValue(intGenerado); // Columna G (Interes)
          sheetPrestamos.getRange(i + 1, 8).setValue(saldo);       // Columna H (Saldo)
          
          cambios++;
          prestamosActualizados.push(pId);
        }

        // 2. Verificar Vencimiento (Cambio a MORA)
        if (estado === 'ACTIVO' && fechaVenc < hoy) {
          sheetPrestamos.getRange(i + 1, 9).setValue('MORA');
          Logger.log(`Préstamo ${pId} pasó a MORA.`);
        }
      }
    }
    
    Logger.log(`Motor finalizado. ${cambios} préstamos procesados.`);
    return { 
      status: 'success', 
      message: `Motor ejecutado: ${cambios} préstamos actualizados`,
      prestamos_actualizados: prestamosActualizados
    };

  } catch (error) {
    Logger.log('Error en motorCausacionInteres: ' + error.message);
    return { status: 'error', message: 'Error en motor: ' + error.message };
  }
}

// 💡 configurarTriggers() → movida a DbSetup.gs

/**
 * Gestiona estados de participantes (Liquidar, Eliminar)
 */
function gestionarParticipante(data) {

    if (!data.id || !data.tipoAccion) {
        return { status: 'error', message: 'Faltan datos requeridos (id, tipoAccion)' };
    }
    
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = ss.getSheetByName(HOJAS.PARTICIPANTES);
        const rows = sheet.getDataRange().getValues();
        
        let rowIndex = -1;
        for (let i = 1; i < rows.length; i++) {
            if (rows[i][0] === data.id) { // ID en columna 0
                rowIndex = i + 1; // 1-based index
                break;
            }
        }
        
        if (rowIndex === -1) {
            return { status: 'error', message: 'Participante no encontrado' };
        }
        
        if (data.tipoAccion === 'ELIMINAR') {
            sheet.deleteRow(rowIndex);
            // Recalcular ganancias automáticamente tras eliminar
            calcularDistribucionGanancias();
            return { status: 'success', message: 'Participante eliminado exitosamente' };
        }
        
        if (data.tipoAccion === 'LIQUIDAR') {
            // Marcar como INACTIVO (Columna 8 - Índice 7, +1 = 8)
            sheet.getRange(rowIndex, 8).setValue(false);
            // Recalcular ganancias automáticamente tras liquidar (ya no cuenta este usuario)
            calcularDistribucionGanancias();
            return { status: 'success', message: 'Participante liquidado (inactivado) exitosamente' };
        }
        
        if (data.tipoAccion === 'ACTIVAR') {
             sheet.getRange(rowIndex, 8).setValue(true);
             calcularDistribucionGanancias();
             return { status: 'success', message: 'Participante activado exitosamente' };
        }
        
        return { status: 'error', message: 'Acción no reconocida' };
        
    } catch (error) {
        return { status: 'error', message: `Error al gestionar participante: ${error.message}` };
    }
}

/**
 * Actualiza los datos de un participante existente
 * @param {Object} data - Datos del participante incluyendo ID
 * @returns {Object} Resultado de la operación
 */
function actualizarParticipante(data) {
  if (!data.id) {
    return { status: 'error', message: 'ID de participante es requerido' };
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(HOJAS.PARTICIPANTES);
    const rows = sheet.getDataRange().getValues();
    
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      return { status: 'error', message: 'Participante no encontrado' };
    }

    // Actualizar campos (Nombre, Cédula, Teléfono, Email, Día Pago, Mora)
    // Columnas: ID(0), Nombre(1), Cédula(2), Teléfono(3), Email(4), ..., DíaPago(9), Mora(10)
    if (data.nombre) sheet.getRange(rowIndex, 2).setValue(data.nombre);
    if (data.cedula) sheet.getRange(rowIndex, 3).setValue(data.cedula);
    if (data.telefono) sheet.getRange(rowIndex, 4).setValue(data.telefono);
    if (data.email !== undefined) sheet.getRange(rowIndex, 5).setValue(data.email);
    if (data.dia_pago !== undefined) sheet.getRange(rowIndex, 10).setValue(data.dia_pago);
    if (data.mora_diaria !== undefined) sheet.getRange(rowIndex, 11).setValue(data.mora_diaria);
    if (data.frecuencia_pago !== undefined) sheet.getRange(rowIndex, 12).setValue(data.frecuencia_pago);
    if (data.config_pago !== undefined) sheet.getRange(rowIndex, 13).setValue(data.config_pago);

    return { status: 'success', message: 'Participante actualizado correctamente' };

  } catch (error) {
    return { status: 'error', message: `Error al actualizar participante: ${error.message}` };
  }
}

/**
 * Obtiene el resumen general para el dashboard
 * @returns {Object} Datos del resumen
 */
function getResumen() {
  try {
    const aportes = getData(HOJAS.APORTES);
    const actividades = getData(HOJAS.ACTIVIDADES);
    const participantes = getData(HOJAS.PARTICIPANTES);
    const prestamos = getData(HOJAS.PRESTAMOS);
    
    // 1. Calcular total aportado (Ahorros)
    let totalAportado = 0;
    if (aportes.status === 'success' && aportes.data) {
      totalAportado = aportes.data.reduce((sum, a) => 
        sum + Number(a.monto || 0), 0
      );
    }
    
    // 2. Calcular totales desde Actividades (Base Caja)
    let totalActividades = 0;
    let totalInteresesPagados = 0;
    
    if (actividades.status === 'success' && actividades.data) {
        actividades.data.forEach(a => {
            const monto = Number(a.monto_generado) || 0;
            const nombre = String(a.nombre_actividad || '').trim();
            
            if (nombre === 'Pago Intereses Préstamo') {
                totalInteresesPagados += monto;
            } else {
                totalActividades += monto;
            }
        });
    }
    
    // 3. Calcular Capital Prestado (Lo que está en la calle)
    let capitalPrestado = 0;
    if (prestamos.status === 'success' && prestamos.data) {
      prestamos.data.forEach(p => {
        const estado = String(p.estado || '').trim().toUpperCase();
        if (estado !== 'PAGADO') {
          capitalPrestado += Number(p.monto_prestado || 0);
        }
      });
    }

    // 4. Totales Finales (Base Caja)
    const totalGanancias = totalActividades + totalInteresesPagados;
    
    // Dinero Disponible = (Aportado + Ganancias Cobradas) - Lo que está prestado (capital)
    const dineroDisponible = (totalAportado + totalGanancias) - capitalPrestado;
    
    // 5. Contar participantes activos
    let numParticipantes = 0;
    if (participantes.status === 'success' && participantes.data) {
      numParticipantes = participantes.data.filter(p => 
        p.activo === true || p.activo === 'true' || p.activo === 'TRUE'
      ).length;
    }
    
    // Obtener datos del ciclo actual dinámicamente
    const cicloInfo = getCicloActual();
    let cicloData = {
        nombre: 'Sin Ciclo Activo',
        fecha_inicio: new Date(),
        fecha_cierre: new Date(),
        estado: 'INACTIVO'
    };
    
    if (cicloInfo.status === 'success' && cicloInfo.data) {
        cicloData = cicloInfo.data;
    }

    return {
      status: 'success',
      data: {
        totalAportado,
        totalRecaudado: totalAportado, // Alias para compatibilidad
        totalGanancias,
        capitalPrestado,
        dineroDisponible,
        totalActividades,
        interesesGenerados: totalInteresesPagados,
        totalIntereses: totalInteresesPagados, // Alias para compatibilidad
        numParticipantes,
        cicloActual: cicloData.nombre,
        fechaInicio: cicloData.fecha_inicio,
        fechaCierre: cicloData.fecha_cierre,
        estadoCiclo: cicloData.estado
      }
    };
    
  } catch (error) {
    return { 
      status: 'error', 
      message: `Error al obtener resumen: ${error.message}` 
    };
  }
}

/**
 * Obtiene el historial de ciclos, enriqueciendo el ciclo activo con datos actuales
 * @returns {Object} Historial de ciclos
 */
function getHistorialCiclos() {
  try {
    const ciclos = getData(HOJAS.CICLOS);
    if (ciclos.status !== 'success') return ciclos;

    // Enriquecer el ciclo activo con datos en tiempo real para que se vea en el gráfico
    const dataEnriquecida = ciclos.data.map(c => {
      // Normalizar estado para comparación
      const estado = String(c.estado || '').trim().toUpperCase();
      
      if (estado === 'ACTIVO') {
        const resumen = getResumen();
        if (resumen.status === 'success') {
          return {
            ...c,
            total_recaudado: resumen.data.totalRecaudado,
            total_ganancias: resumen.data.totalGanancias,
            total_intereses: resumen.data.totalIntereses
          };
        }
      }
      return c;
    });

    return {
      status: 'success',
      data: dataEnriquecida
    };

  } catch (error) {
    return { 
      status: 'error', 
      message: `Error al obtener historial: ${error.message}` 
    };
  }
}

/**
 * Obtiene información del ciclo actual
 * @returns {Object} Datos del ciclo
 */
function getCicloActual() {
  try {
    const ciclos = getData(HOJAS.CICLOS);
    
    if (ciclos.status !== 'success') {
      return { status: 'error', message: 'Error al obtener ciclos' };
    }
    
    // Buscar ciclo activo (robusto ante mayúsculas/espacios)
    const cicloActivo = ciclos.data.find(c => {
      const estado = String(c.estado || c.Estado || c.ESTADO || '').trim().toUpperCase();
      return estado === 'ACTIVO';
    });
    
    if (cicloActivo) {
      return { status: 'success', data: cicloActivo };
    }
    
    return { 
      status: 'success', 
      data: null,
      message: 'No hay ciclo activo' 
    };
    
  } catch (error) {
    return { 
      status: 'error', 
      message: `Error al obtener ciclo actual: ${error.message}` 
    };
  }
}

/**
 * Crea un nuevo ciclo de ahorro
 * @param {Object} data - {nombre, fecha_inicio, fecha_cierre}
 * @returns {Object} Resultado
 */
function crearCiclo(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(HOJAS.CICLOS);
    
    // Verificar si ya existe un ciclo activo
    const cicloActivo = getCicloActual();
    if (cicloActivo.status === 'success' && cicloActivo.data) {
      return { status: 'error', message: 'Ya existe un ciclo ACTIVO. Debe cerrarlo antes de iniciar uno nuevo.' };
    }
    
    const newId = generateId();
    const newRow = [
      newId,
      data.nombre,
      new Date(data.fecha_inicio),
      new Date(data.fecha_cierre),
      0, // total_recaudado
      0, // total_ganancias
      0, // total_intereses
      'ACTIVO',
      new Date() // created_at
    ];
    
    sheet.appendRow(newRow);
    
    return { 
      status: 'success', 
      message: 'Nuevo ciclo iniciado correctamente',
      id: newId
    };
    
  } catch (error) {
    return { status: 'error', message: `Error al crear ciclo: ${error.message}` };
  }
}

/**
 * Cierra el ciclo actual y congela los totales
 * @returns {Object} Resultado
 */
function cerrarCiclo() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(HOJAS.CICLOS);
    const rows = sheet.getDataRange().getValues();
    
    // Buscar el índice del ciclo activo
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][7]).trim().toUpperCase() === 'ACTIVO') {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { status: 'error', message: 'No hay ningún ciclo activo para cerrar' };
    }
    
    // Obtener resumen actual para congelar
    const resumen = getResumen();
    if (resumen.status !== 'success') {
      return { status: 'error', message: 'Error al obtener totales finales: ' + resumen.message };
    }
    
    const data = resumen.data;
    
    // Actualizar fila del ciclo
    // Columnas: id(1), nombre(2), f_inicio(3), f_cierre(4), t_recaudado(5), t_ganancias(6), t_intereses(7), estado(8)
    sheet.getRange(rowIndex, 5).setValue(data.totalRecaudado);
    sheet.getRange(rowIndex, 6).setValue(data.totalGanancias);
    sheet.getRange(rowIndex, 7).setValue(data.totalIntereses);
    sheet.getRange(rowIndex, 8).setValue('CERRADO');
    
    return { 
      status: 'success', 
      message: 'Ciclo cerrado exitosamente y totales guardados' 
    };
    
  } catch (error) {
    return { status: 'error', message: `Error al cerrar ciclo: ${error.message}` };
  }
}

// ==========================================
// FUNCIONES DE INICIALIZACIÓN
// ==========================================
// 💡 inicializarBaseDatos(), corregirBaseDatos(), resetBaseDatos()
//    y funciones de prueba → todas en DbSetup.gs
//    El esquema oficial de hojas y columnas también está en DbSetup.gs.

// ==========================================
// GESTIÓN DE USUARIOS
// ==========================================

/**
 * Agrega un nuevo usuario al sistema
 * @param {Object} data Datos del usuario
 */
function agregarUsuario(data) {
  try {
    const validation = validateRequiredFields(data, ['nombre', 'email', 'password', 'rol']);
    if (validation) return validation;

    const usuarios = getData(HOJAS.USUARIOS);
    if (usuarios.status === 'success') {
      const existe = usuarios.data.some(u => u.email.toLowerCase() === data.email.toLowerCase());
      if (existe) {
        return { status: 'error', message: 'El correo electrónico ya está registrado' };
      }
    }

    const newRow = [
      generateId(),
      data.email.toLowerCase(),
      data.password, // En una fase posterior se aplicará hashing
      data.nombre,
      data.rol,
      new Date().toISOString()
    ];

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(HOJAS.USUARIOS);
    sheet.appendRow(newRow);

    return { status: 'success', message: 'Usuario agregado exitosamente' };
  } catch (error) {
    return { status: 'error', message: `Error al agregar usuario: ${error.message}` };
  }
}

/**
 * Elimina un usuario por ID
 * @param {string} id ID del usuario
 */
function eliminarUsuario(id) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(HOJAS.USUARIOS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        // No permitir eliminar al administrador principal si tiene un ID específico
        if (data[i][1] === 'admin@natillera.com') {
            return { status: 'error', message: 'No se puede eliminar al administrador principal' };
        }
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      return { status: 'error', message: 'Usuario no encontrado' };
    }

    sheet.deleteRow(rowIndex);
    return { status: 'success', message: 'Usuario eliminado correctamente' };
  } catch (error) {
    return { status: 'error', message: `Error al eliminar usuario: ${error.message}` };
  }
}

// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================

/**
 * Obtiene la configuración global del sistema
 * @returns {Object} Respuesta con los datos de configuración
 */
function getConfig() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(HOJAS.CONFIG);
    if (!sheet) return { status: 'error', message: 'Hoja de configuración no encontrada' };
    
    const data = sheet.getDataRange().getValues();
    const config = {};
    
    for (let i = 1; i < data.length; i++) {
      config[data[i][0]] = data[i][1];
    }
    
    return { status: 'success', data: config };
  } catch (error) {
    return { status: 'error', message: `Error al obtener configuración: ${error.message}` };
  }
}

/**
 * Actualiza la configuración global del sistema
 * @param {Object} data - Objeto con los pares clave-valor a actualizar
 * @returns {Object} Respuesta de la operación
 */
function updateConfig(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(HOJAS.CONFIG);
    if (!sheet) return { status: 'error', message: 'Hoja de configuración no encontrada' };
    
    const values = sheet.getDataRange().getValues();
    
    // Recorrer las claves enviadas para actualizar
    Object.keys(data).forEach(key => {
      if (key === 'action') return; // Ignorar la acción de doPost
      
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] === key) {
          sheet.getRange(i + 1, 2).setValue(data[key]);
          break;
        }
      }
    });
    
    return { status: 'success', message: 'Configuración actualizada correctamente' };
  } catch (error) {
    return { status: 'error', message: `Error al actualizar configuración: ${error.message}` };
  }
}

// 💡 resetBaseDatos() → movida a DbSetup.gs

// ==========================================
// AUTOMATIZACIÓN DE MULTAS - LOGICA INDIVIDUAL
// ==========================================

// (Lógica reemplazada por nueva implementación abajo)
      
// Helper para parsear fechas robustamente (Maneja string DD/MM, ISO y Objetos)
function parseDateSmart(input) {
  if (!input) return null;
  if (input instanceof Date) {
    const d = new Date(input);
    d.setHours(0,0,0,0);
    return d;
  }
  
  const str = String(input).trim();
  // Intentar formato ISO (YYYY-MM-DD)
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
    const parts = str.split('T')[0].split('-');
    return new Date(parts[0], parts[1]-1, parts[2]);
  }
  
  // Intentar formato local (DD/MM/YYYY)
  if (str.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
    const parts = str.split('/');
    return new Date(parts[2], parts[1]-1, parts[0]);
  }
  
  // Fallback
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    d.setHours(0,0,0,0);
    return d;
  }
  return null;
}

/**
 * Escanea a todos los participantes y aplica multas de $3.000 COP
 * si no han cumplido con su compromiso de pago individual.
 * Regla: Se cobra DIARIAMENTE a partir del SEGUNDO DÍA de retraso (Día Límite + 2).
 */
/**
 * Obtiene el listado de participantes en mora para reporte INFORMATIVO
 * NO aplica cargos automáticos.
 */
function obtenerMorasPendientes() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const participantes = getData(HOJAS.PARTICIPANTES);
    if (participantes.status !== 'success') return participantes;
    
    const aportes = getData(HOJAS.APORTES);
    const morasDetectadas = [];
    
    participantes.data.forEach(p => {
      // Normalizar estado activo
      const esActivo = p.activo === true || String(p.activo).toUpperCase() === 'TRUE';
      if (!esActivo) return;
      
      const pId = p.id;
      const frecuencia = (p.frecuencia_pago || 'MENSUAL').toString().toUpperCase();
      const config = (p.config_pago || '15').toString();
      const diaActual = hoy.getDate();
      const mesActual = hoy.getMonth();
      const anioActual = hoy.getFullYear();
      
      let esMora = false;
      let diasRetraso = 0;
      let fechaLimite = null;
      
      // Lógica de Detección de Mora (Simplificada para reporte)
      // Se asume que si pasamos la fecha límite y no hay pago en el periodo, es mora.
      
      if (frecuencia === 'MENSUAL') {
        const diaLimite = parseInt(config);
        if (diaActual > diaLimite) { // Solo si ya pasó el día
            fechaLimite = new Date(anioActual, mesActual, diaLimite);
            
            // Verificar si pagó en este mes (después de día 1)
            const inicioMes = new Date(anioActual, mesActual, 1);
            const finMes = new Date(anioActual, mesActual + 1, 0, 23, 59, 59);
            
            const yaPago = aportes.data.some(a => {
                const fechaAporte = parseDateSmart(a.fecha);
                return String(a.participante_id) === String(pId) && 
                       fechaAporte >= inicioMes && 
                       fechaAporte <= finMes;
            });
            
            if (!yaPago) {
                esMora = true;
                diasRetraso = Math.floor((hoy - fechaLimite) / (1000 * 60 * 60 * 24));
            }
        }
      } 
      // TODO: Implementar lógica Quincenal/Semanal si es necesario para el reporte
      // Por ahora mantenemos el foco en mensual que es lo principal
      
      if (esMora && diasRetraso > 0) {
          // Calcular multa estimada (Sugerida)
          // La regla dice: cobrar diariamente a partir del 2do día.
          // OJO: El usuario quería "cuantos dias esta retrazado y cuanto deberia ser la multa"
          // Multa = MoraDiaria * DiasRetraso (o lógica específica)
          // Usaremos la mora_diaria del participante o global
          const moraDiaria = Number(p.mora_por_dia) || 3000;
          const multaEstimada = moraDiaria * diasRetraso;
          
          morasDetectadas.push({
              id: p.id,
              nombre: p.nombre,
              telefono: p.telefono,
              dias_retraso: diasRetraso,
              multa_estimada: multaEstimada,
              fecha_limite: fechaLimite ? formatDate(fechaLimite) : 'N/A'
          });
      }
    });
    
    return {
      status: 'success',
      data: morasDetectadas,
      message: `Se encontraron ${morasDetectadas.length} participantes en mora`
    };
    
  } catch (error) {
    return { status: 'error', message: `Error en obtenerMorasPendientes: ${error.message}` };
  }
}

/**
 * Aplica una multa a un participante específico
 */
/**
 * Aplica una multa a un participante específico
 */
function aplicarMulta(participanteId, fecha) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const montoMulta = 3000;
  const idMulta = generateId();
  
  // 0. Obtener Nombre del Participante
  let nombreParticipante = 'Participante';
  try {
     const sheetP = ss.getSheetByName(HOJAS.PARTICIPANTES);
     const dataP = sheetP.getDataRange().getValues();
     for(let i=1; i<dataP.length; i++) {
        if(String(dataP[i][0]) === String(participanteId)) {
           nombreParticipante = dataP[i][1];
           break;
        }
     }
  } catch(e) { Logger.log('Error buscando nombre: ' + e); }
  
  // 1. Registrar entrada negativa en Aportes (descuenta del ahorro)
  const sheetAportes = ss.getSheetByName(HOJAS.APORTES);
  sheetAportes.appendRow([
    idMulta,
    participanteId,
    -montoMulta,
    fecha,
    'MULTA POR RETRASO',
    '', // comprobante
    new Date(), // created_at
    1, // días retraso
    0  // monto_mora
  ]);
  
  // 2. Registrar como ACTIVIDAD para que se vea en el historial
  // Estado: PENDIENTE (No se reparte hasta que se pague)
  const sheetActividades = ss.getSheetByName(HOJAS.ACTIVIDADES);
  sheetActividades.appendRow([
    generateId(),
    `Multa: ${nombreParticipante} - ${fecha.toLocaleDateString('es-CO')}`,
    'Multa automática por retraso en pago',
    montoMulta,
    fecha,
    'SISTEMA',
    'PENDIENTE', // <-- ESTADO CLAVE
    new Date()
  ]);
  
  // 3. Actualizar totales del participante
  actualizarTotalAportado(participanteId, -montoMulta);
  
  // 4. Forzar recalcular ganancias (aunque PENDIENTE no suma, refresca estados)
  calcularDistribucionGanancias();
}
/**
 * Genera un PDF del reporte de aportes para un participante
 */
function generateAportesPDF(participanteId) {
  try {
    // 1. Validar ID
    if (!participanteId) return { status: 'error', message: 'ID de participante requerido' };

    // 2. Obtener datos
    const responseAportes = getData(HOJAS.APORTES);
    const responseParticipantes = getData(HOJAS.PARTICIPANTES);

    if (responseAportes.status !== 'success' || responseParticipantes.status !== 'success') {
      return { status: 'error', message: 'Error cargando datos de la base de datos' };
    }

    // 3. Buscar participante
    // Convertimos a string para asegurar comparación
    const participante = responseParticipantes.data.find(p => String(p.id) === String(participanteId));
    if (!participante) {
      return { status: 'error', message: 'Participante no encontrado' };
    }

    // 4. Filtrar aportes y ordenar por fecha (más reciente primero)
    const aportes = responseAportes.data
      .filter(a => String(a.participante_id) === String(participanteId))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (aportes.length === 0) {
      return { status: 'error', message: 'No hay aportes registrados para este participante' };
    }

    // 5. Calcular totales y construir filas
    let totalAportado = 0;
    let totalMora = 0;

    // Helper para formatear moneda
    const formatMoney = (amount) => {
      return '$' + Number(amount).toLocaleString('es-CO');
    };

    // Helper para formatear fecha
    const formatDate = (dateString) => {
      try {
        const date = new Date(dateString);
        // Ajuste de zona horaria simple si es necesario, o usar UTC
        return date.toLocaleDateString('es-CO');
      } catch (e) {
        return dateString;
      }
    };

    const filasHtml = aportes.map(a => {
      const monto = Number(a.monto) || 0;
      const mora = Number(a.monto_mora) || 0;
      const total = monto + mora;
      
      totalAportado += monto;
      totalMora += mora;

      return `
        <tr>
          <td>${formatDate(a.fecha)}</td>
          <td>${a.concepto || 'Aporte mensual'}</td>
          <td style="text-align:right">${formatMoney(monto)}</td>
          <td style="text-align:right">${formatMoney(mora)}</td>
          <td style="text-align:right"><strong>${formatMoney(total)}</strong></td>
        </tr>
      `;
    }).join('');

    const granTotal = totalAportado + totalMora;
    const fechaGeneracion = new Date().toLocaleString('es-CO');

    // 6. Template HTML
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; padding: 40px; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
            .logo { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
            .title { font-size: 20px; margin: 5px 0 0 0; color: #1e40af; }
            .meta { font-size: 11px; color: #6b7280; margin-top: 10px; }
            
            .info-card { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .info-row:last-child { margin-bottom: 0; }
            .label { font-weight: bold; color: #475569; }
            .value { color: #1e293b; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
            th { background: #2563eb; color: white; padding: 12px 10px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 11px; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
            tr:nth-child(even) { background-color: #f1f5f9; }
            
            .totals-section { display: flex; justify-content: flex-end; }
            .totals-box { width: 280px; background: #eff6ff; padding: 20px; border-radius: 8px; border: 1px solid #bfdbfe; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
            .total-row.big { font-size: 16px; font-weight: bold; color: #1e40af; border-top: 2px solid #bfdbfe; padding-top: 10px; margin-top: 10px; }
            
            .footer { text-align: center; margin-top: 60px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Natillera System</div>
            <h1 class="title">Estado de Cuenta - Aportes</h1>
            <div class="meta">Fecha de Generación: ${fechaGeneracion}</div>
          </div>

          <div class="info-card">
            <div class="info-row">
              <span class="label">Participante</span>
              <span class="value">${participante.nombre}</span>
            </div>
            <div class="info-row">
              <span class="label">Documento</span>
              <span class="value">${participante.cedula || 'No registrado'}</span>
            </div>
            <div class="info-row">
              <span class="label">Teléfono</span>
              <span class="value">${participante.telefono || 'No registrado'}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th style="text-align:right">Aporte</th>
                <th style="text-align:right">Mora</th>
                <th style="text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${filasHtml}
            </tbody>
          </table>

          <div class="totals-section">
            <div class="totals-box">
              <div class="total-row">
                <span>Subtotal Aportes:</span>
                <span>${formatMoney(totalAportado)}</span>
              </div>
              <div class="total-row">
                <span>Subtotal Mora/Multas:</span>
                <span>${formatMoney(totalMora)}</span>
              </div>
              <div class="total-row big">
                <span>TOTAL ACUMULADO:</span>
                <span>${formatMoney(granTotal)}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Este reporte fue generado automáticamente por <strong>Natillera System</strong>.</p>
            <p>Por favor conserve este documento para su control personal.</p>
          </div>
        </body>
      </html>
    `;

    // 7. Generar PDF (Blob -> Base64)
    // Usamos text/html para que Apps Script lo convierta correctamente a PDF
    const blob = Utilities.newBlob(htmlTemplate, "text/html", "reporte.html");
    const pdfBlob = blob.getAs("application/pdf");
    const base64 = Utilities.base64Encode(pdfBlob.getBytes());
    const filename = `Reporte_Natillera_${participante.nombre.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    return {
      status: 'success',
      filename: filename,
      base64: base64
    };

  } catch (error) {
    Logger.log('Error generando PDF: ' + error.toString());
    return { status: 'error', message: 'Fallo interno al generar PDF: ' + error.toString() };
  }
}

/**
 * Genera un recibo PDF para un ganador de Bingo
 */
function generarReciboBingoPDF(participanteId, juegoId, monto, metodo) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetParticipantes = ss.getSheetByName(HOJAS.PARTICIPANTES);
    const participantes = sheetParticipantes.getDataRange().getValues();
    const pHeaders = participantes[0];
    const pIdIdx = pHeaders.indexOf("id");
    const pNombreIdx = pHeaders.indexOf("nombre");
    const pCedulaIdx = pHeaders.indexOf("cedula");

    let ganador = { nombre: participanteId, cedula: 'N/A' };
    for (let i = 1; i < participantes.length; i++) {
        if (String(participantes[i][pIdIdx]) === String(participanteId)) {
            ganador.nombre = participantes[i][pNombreIdx];
            ganador.cedula = participantes[i][pCedulaIdx];
            break;
        }
    }

    const formatMoney = (amount) => {
      return '$' + Number(amount).toLocaleString('es-CO');
    };

    const fechaGeneracion = new Date().toLocaleString('es-CO');

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; padding: 30px; line-height: 1.5; }
            .container { max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
            .header { background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; }
            .logo { font-size: 24px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 5px; }
            .receipt-title { font-size: 18px; opacity: 0.9; margin: 0; }
            
            .content { padding: 30px; background: white; }
            .prize-highlight { text-align: center; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 25px; }
            .prize-label { font-size: 14px; color: #15803d; font-weight: 600; text-transform: uppercase; margin-bottom: 5px; }
            .prize-amount { font-size: 32px; font-weight: 800; color: #166534; }
            
            .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 25px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px; }
            .info-row:last-child { margin-bottom: 0; border-bottom: none; }
            .label { font-weight: 600; color: #64748b; font-size: 13px; text-transform: uppercase; }
            .value { color: #0f172a; font-weight: 500; }
            
            .footer { background: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 11px; }
            .stamp { color: #94a3b8; font-style: italic; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">NATILLERA SYSTEM</div>
              <p class="receipt-title">Comprobante de Entrega de Premio</p>
            </div>
            
            <div class="content">
              <div class="prize-highlight">
                <div class="prize-label">Monto del Premio</div>
                <div class="prize-amount">${formatMoney(monto)}</div>
              </div>

              <div class="info-box">
                <div class="info-row">
                  <span class="label">Ganador</span>
                  <span class="value">${ganador.nombre}</span>
                </div>
                <div class="info-row">
                  <span class="label">Documento</span>
                  <span class="value">${ganador.cedula || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="label">ID Juego Bingo</span>
                  <span class="value">#${juegoId}</span>
                </div>
                <div class="info-row">
                  <span class="label">Método de Pago</span>
                  <span class="value">${metodo}</span>
                </div>
                <div class="info-row">
                  <span class="label">Fecha y Hora</span>
                  <span class="value">${fechaGeneracion}</span>
                </div>
              </div>

              <p style="font-size: 13px; color: #475569; text-align: center;">
                Este documento certifica la entrega formal del premio correspondiente al sorteo de Bingo mencionado anteriormente.
              </p>
            </div>
            
            <div class="footer">
              <p>Generado por Natillera System - Gestión de Ahorros y Créditos</p>
              <div class="stamp">DOCUMENTO DIGITAL VÁLIDO SIN FIRMA</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const blob = Utilities.newBlob(htmlTemplate, "text/html", "recibo.html");
    const pdfBlob = blob.getAs("application/pdf");
    const base64 = Utilities.base64Encode(pdfBlob.getBytes());
    const filename = `Recibo_Bingo_${juegoId}_${ganador.nombre.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    return {
      status: 'success',
      filename: filename,
      base64: base64
    };

  } catch (error) {
    Logger.log('Error generando PDF Bingo: ' + error.toString());
    return { status: 'error', message: 'Fallo al generar recibo: ' + error.toString() };
  }
}
// ==========================================
// FUNCIONES DE CONSULTA EXTERNA
// ==========================================

/**
 * Obtiene los datos para la consulta externa de un socio
 * @param {string} cedula - Cédula del socio
 * @param {string} mes - Mes opcional en formato YYYY-MM
 * @returns {Object} Datos del socio y sus movimientos
 */
function getConsultaSocio(cedula, mes) {
  try {
    if (!cedula) return { status: 'error', message: 'Cédula requerida' };

    // 1. Buscar socio
    const participantes = getData(HOJAS.PARTICIPANTES);
    if (participantes.status !== 'success') return { status: 'error', message: 'Error de base de datos' };

    const socio = participantes.data.find(p => String(p.cedula).trim() === String(cedula).trim());
    
    if (!socio) {
      return { status: 'error', message: 'Cédula no encontrada en el sistema' };
    }

    // 2. Obtener movimientos
    const aportes = getData(HOJAS.APORTES);
    if (aportes.status !== 'success') return { status: 'error', message: 'Error consultando aportes' };

    // 3. Procesar movimientos filtra solo los del socio
    const movimientosSocio = aportes.data
      .filter(a => String(a.participante_id) === String(socio.id))
      .map(a => {
        // Asegurar fecha válida
        let fechaObj;
        try { fechaObj = new Date(a.fecha); } catch(e) { fechaObj = new Date(); }
        
        return {
          fecha: fechaObj,
          fechaStr: fechaObj.toISOString().substring(0, 10), // YYYY-MM-DD
          mesStr: fechaObj.toISOString().substring(0, 7),    // YYYY-MM
          monto: Number(a.monto) || 0,
          mora: Number(a.monto_mora) || 0,
          concepto: a.concepto,
          estado: a.estado || 'APROBADO', // Default para compatibilidad
          total: (Number(a.monto) || 0) + (Number(a.monto_mora) || 0)
        };
      })
      .sort((a, b) => b.fecha - a.fecha); // Orden descendente

    // 4. Obtener lista de meses disponibles (para el filtro)
    const mesesSet = new Set();
    movimientosSocio.forEach(m => mesesSet.add(m.mesStr));
    const mesesDisponibles = Array.from(mesesSet).sort().reverse(); // Meses más recientes primero

    // 5. Filtrar por mes si se solicita
    let movimientosFinales = movimientosSocio;
    if (mes) {
      movimientosFinales = movimientosSocio.filter(m => m.mesStr === mes);
    } else {
        // Por defecto: Si no hay mes, mostrar todo (o podríamos mostrar solo el último mes, pero la libreta digital suele ser completa)
        // La solicitud dice: "Mes opcional (por defecto mes actual)".
        // Si aplicamos filtro por defecto al mes actual y no hay datos, puede parecer vacía.
        // Mejor devolvemos TODO si no hay filtro, o manejamos el "por defecto" en el frontend.
        // Sin embargo, para cumplir "Mes opcional (por defecto mes actual)" podríamos filtrar aquí.
        // Vamos a devolver TODOS los datos al frontend, y que el frontend maneje la visualización inicial.
        // Espera, "Consulta de datos" dice "Aplicar filtro por mes (si se envía)".
        // Si devuelvo todo, es más rápido navegar. Pero si son muchos datos...
        // Vamos a seguir la instrucción estrictamente: "Aplicar filtro por mes (si se envía)".
    }

    // 6. Calcular Resumen del periodo seleccionado
    const totalAbonado = movimientosFinales.reduce((sum, m) => sum + m.monto, 0);
    const saldoAportes = Number(socio.total_aportado) || 0; 
    const ganancias = Number(socio.ganancias_acumuladas) || 0;
    const totalConsolidado = saldoAportes + ganancias;
    
    // Estado (lógica simple, se puede mejorar con multas reales)
    // Usaremos la bandera 'activo' y si tiene moras recientes
    let estado = socio.activo ? 'AL DÍA' : 'INACTIVO';
    // Si tiene moras pendientes (esto es complejo de calcular sin ir a prestamos/reglas, 
    // pero podemos ver si tiene aportes tipo mora o algo así, por ahora simple).
    
    return {
      status: 'success',
      data: {
        socio: {
          id: socio.id,
          nombre: socio.nombre,
          cedula: socio.cedula,
          // No enviamos teléfono ni email por privacidad
        },
        movimientos: movimientosFinales,
        meses: mesesDisponibles,
        resumen: {
          total_periodo: totalAbonado,
          saldo_aportes: saldoAportes,
          ganancias: ganancias,
          saldo_total: totalConsolidado,
          estado: estado
        }
      }
    };

  } catch (error) {
    return { status: 'error', message: `Error consulta socio: ${error.message}` };
  }
}

/**
 * Genera el PDF de consulta externa
 */
function generateConsultaPDF(cedula, mes) {
  try {
    if (!cedula) return { status: 'error', message: 'Cédula requerida' };

    // Reutilizamos la lógica de obtención de datos
    const consulta = getConsultaSocio(cedula, mes);
    if (consulta.status !== 'success') return consulta;

    const data = consulta.data;
    const socio = data.socio;
    const movimientos = data.movimientos;
    
    // Formateadores
    const formatMoney = (amount) => '$' + Number(amount).toLocaleString('es-CO');
    const formatDate = (dateString) => {
        try {
            // Ajustamos zona horaria UTC a local simple
            const d = new Date(dateString); 
            d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
            return d.toLocaleDateString('es-CO');
        } catch(e) { return dateString; }
    };

    // Filas de la tabla
    const filasHtml = movimientos.map(m => `
        <tr>
            <td>${formatDate(m.fechaStr)}</td>
            <td style="text-align:right">${formatMoney(m.monto)}</td>
            <td style="text-align:right">${formatMoney(m.total)}</td>
        </tr>
    `).join('');

    const fechaGeneracion = new Date().toLocaleString('es-CO');
    const mesTitulo = mes ? mes : 'Histórico Completo';

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; padding: 40px; }
            .header { text-align: center; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
            .company { font-size: 24px; font-weight: bold; color: #10b981; text-transform: uppercase; }
            .title { font-size: 18px; color: #065f46; margin: 5px 0; }
            .meta { font-size: 12px; color: #6b7280; }
            
            .card { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin-bottom: 25px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
            .label { font-weight: bold; color: #047857; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            th { background: #10b981; color: white; padding: 10px; text-align: left; }
            td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
            tr:nth-child(even) { background: #f9fafb; }
            
            .summary { display: flex; justify-content: flex-end; margin-top: 20px; }
            .summary-box { width: 250px; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; }
            .sum-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px; }
            .sum-total { font-weight: bold; font-size: 15px; color: #059669; border-top: 1px solid #bbf7d0; padding-top: 8px; margin-top: 8px; }
            
            .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">Nati System</div>
            <div class="title">Estado de Aportes - Natillera</div>
            <div class="meta">Generado: ${fechaGeneracion}</div>
          </div>
          
          <div class="card">
            <div class="row">
              <span class="label">Socio:</span>
              <span>${socio.nombre}</span>
            </div>
            <div class="row">
              <span class="label">Cédula:</span>
              <span>${socio.cedula}</span>
            </div>
            <div class="row">
              <span class="label">Periodo:</span>
              <span>${mesTitulo}</span>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th style="text-align:right">Abono</th>
                <th style="text-align:right">Total Op.</th>
              </tr>
            </thead>
            <tbody>
              ${filasHtml}
            </tbody>
          </table>
          
          <div class="summary">
            <div class="summary-box">
              <div class="sum-row">
                <span>Total Abonado (Periodo):</span>
                <span>${formatMoney(data.resumen.total_periodo)}</span>
              </div>
              <div class="sum-row">
                <span>Total Aportes Acumulados:</span>
                <span>${formatMoney(data.resumen.saldo_aportes)}</span>
              </div>
              <div class="sum-row">
                <span>Ganancias/Intereses:</span>
                <span>${formatMoney(data.resumen.ganancias)}</span>
              </div>
              <div class="sum-total sum-row">
                <span>GRAN TOTAL (Aportes + Ganancias):</span>
                <span>${formatMoney(data.resumen.saldo_total)}</span>
              </div>
            </div>
          </div>
          
          <div class="footer">
            Documento generado automáticamente por Nati System
          </div>
        </body>
      </html>
    `;

    const blob = Utilities.newBlob(htmlTemplate, "text/html", "estado_cuenta.html");
    const pdfBlob = blob.getAs("application/pdf");
    const base64 = Utilities.base64Encode(pdfBlob.getBytes());
    const safeName = socio.nombre.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `estado_aportes_${safeName}_${mes || 'historico'}.pdf`;

    return {
      status: 'success',
      filename: filename,
      base64: base64
    };

  } catch (error) {
    return { status: 'error', message: 'Error PDF: ' + error.message };
  }
}

/**
 * REPARACIÓN DE EMERGENCIA - MORAS MASIVAS
 * Elimina las moras automáticas (-3000 en Aportes / 3000 en Actividades)
 * para corregir el cálculo erróneo reportado por el usuario.
 */
function repararMorasMasivas() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 1. Limpiar Aportes (-3000)
  const sheetAportes = ss.getSheetByName(HOJAS.APORTES);
  let eliminadosAportes = 0;
  
  if (sheetAportes) {
    const data = sheetAportes.getDataRange().getValues();
    // Recorrer de abajo hacia arriba para borrar sin perder índices
    for (let i = data.length - 1; i >= 1; i--) {
      const monto = Number(data[i][2]); // Columna 3 (Índice 2)
      const concepto = String(data[i][4]).toUpperCase(); // Columna 5 (Índice 4)
      
      // Criterio: Monto negativo 3000 Y concepto que indique mora
      if ((monto === -3000 || Math.abs(monto + 3000) < 0.01) && (concepto.includes('MORA') || concepto.includes('RETRASO'))) {
         sheetAportes.deleteRow(i + 1);
         eliminadosAportes++;
      }
    }
  }

  // 2. Limpiar Actividades (3000)
  const sheetActividades = ss.getSheetByName(HOJAS.ACTIVIDADES);
  let eliminadosActividades = 0;
  
  if (sheetActividades) {
    const data = sheetActividades.getDataRange().getValues();
    // Recorrer de abajo hacia arriba
    for (let i = data.length - 1; i >= 1; i--) {
      const monto = Number(data[i][3]); // Columna 4 (Índice 3)
      const nombre = String(data[i][1]).toUpperCase(); // Columna 2 (Índice 1)
      
      if ((monto === 3000 || Math.abs(monto - 3000) < 0.01) && (nombre.includes('MORA') || nombre.includes('RETRASO'))) {
         sheetActividades.deleteRow(i + 1);
         eliminadosActividades++;
      }
    }
  }
  
  // 3. Recalcular Ganancias
  // Si se eliminaron actividades de mora, el total de ganancias cambia
  calcularDistribucionGanancias();

  return {
    status: 'success',
    message: `Reparación completada. Eliminados: ${eliminadosAportes} aportes y ${eliminadosActividades} actividades.`
  };
}

// ============================================
// NUEVAS FUNCIONES PARA APORTES EXTERNOS
// ============================================

/**
 * ID de la carpeta de Drive donde se guardarán los comprobantes
 * ⚠️ REEMPLAZAR CON EL ID DE LA CARPETA "SOPORTES_PAGOS" o similar
 */
const FOLDER_ID_COMPROBANTES = "1CyTWEAEt2IxKVGMHX-fuo83axPF6VVWp"; 
const FOLDER_ID_RECIBOS_CUCARACHA = "1XCEDWpqzksCZXb6onljjEH5ZwY_4Rh7k";

/**
 * Registra un aporte desde la vista externa (Consulta)
 * Requiere comprobante obligatorio
 */
function registrarAporteExterno(data) {
  // 0. Asegurar que la hoja Aportes tenga la columna "Estado" (Fix Bug Auto-Aprobación)
  ensureAportesHeader();

  // 1. Validar campos básicos
  const validation = validateRequiredFields(data, ['cedula', 'monto', 'fecha', 'fileData', 'fileName', 'mimeType']);
  if (validation) return validation;

  // 2. VALIDACIÓN CRÍTICA: El archivo es obligatorio
  if (!data.fileData || data.fileData.trim() === '') {
    return { status: 'error', message: 'El comprobante de pago es OBLIGATORIO.' };
  }

  // 3. Buscar participante por Cédula
  const participantes = getData(HOJAS.PARTICIPANTES);
  if (participantes.status !== 'success') {
    return { status: 'error', message: 'Error al consultar participantes.' };
  }

  const socio = participantes.data.find(p => String(p.cedula) === String(data.cedula));
  if (!socio) {
    return { status: 'error', message: 'No se encontró un socio con esa cédula.' };
  }

  // 4. Guardar archivo en Drive
  let fileUrl = '';
  try {
    const folderId = FOLDER_ID_COMPROBANTES === "TU_ID_DE_CARPETA_DRIVE_AQUI" ? null : FOLDER_ID_COMPROBANTES;
    // Si no hay ID configurado, se guardará en la raíz (no ideal pero funciona)
    
    fileUrl = saveFileToDrive(data.fileData, data.fileName, data.mimeType, folderId, socio.nombre);
  } catch (e) {
    return { status: 'error', message: 'Error al guardar el comprobante: ' + e.message };
  }

  // 5. Registrar el aporte usando la función existente - ESTADO PENDIENTE
  const aporteData = {
    participante_id: socio.id,
    monto: data.monto,
    fecha: data.fecha,
    concepto: data.concepto || 'Aporte Web',
    comprobante: fileUrl,
    dias_retraso: 0,
    monto_mora: 0,
    estado: 'PENDIENTE' // Forzar validación manual
  };

  return agregarAporte(aporteData);
}

/**
 * Guarda un archivo Base64 en Drive
 */
function saveFileToDrive(base64Data, fileName, mimeType, folderId, socioNombre) {
  try {
    // Asegurar que no venga con header data:image/...
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const decoded = Utilities.base64Decode(cleanBase64);
    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    
    let folder;
    if (folderId) {
      folder = DriveApp.getFolderById(folderId);
    } else {
      folder = DriveApp.getRootFolder();
    }

    // Nombre organizado: FECHA - SOCIO - ORIGINAL
    const fechaStr = new Date().toISOString().slice(0, 10);
    const finalName = `${fechaStr} - ${socioNombre} - ${fileName}`; // Formato solicitado: Fecha y Nombre
    blob.setName(finalName);

    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl();
  } catch (error) {
    throw new Error('Falló subida a Drive: ' + error.message);
  }
}

/**
 * Aprueba un aporte pendiente
 */
function aprobarAporte(aporteId) {
    return executeWithLock(() => {
        try {
            const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
            const sheet = ss.getSheetByName(HOJAS.APORTES);
            const data = sheet.getDataRange().getValues();
            
            // Buscar fila (ID está en col 0)
            let rowIndex = -1;
            for(let i=1; i<data.length; i++) {
                if(data[i][0] === aporteId) {
                    rowIndex = i + 1;
                    break;
                }
            }

            if(rowIndex === -1) return { status: 'error', message: 'Aporte no encontrado' };

            // Verificar estado actual (Columna J -> Index 9 -> Column 10)
            const estadoActual = sheet.getRange(rowIndex, 10).getValue();
            if(estadoActual === 'APROBADO') return { status: 'success', message: 'Ya estaba aprobado' };

            // Actualizar Estado
            sheet.getRange(rowIndex, 10).setValue('APROBADO');

            // Sumar al saldo del participante
            // Datos necesarios: participante_id (Col B -> Index 1), Monto (Col C -> Index 2)
            const participanteId = data[rowIndex-1][1];
            const monto = Number(data[rowIndex-1][2]);

            actualizarTotalAportado(participanteId, monto);

            return { status: 'success', message: 'Aporte aprobado correctamente' };

        } catch(error) {
            return { status: 'error', message: 'Error al aprobar: ' + error.message };
        }
    });
}

/**
 * Rechaza un aporte pendiente
 */
function rechazarAporte(aporteId) {
    return executeWithLock(() => {
        try {
            const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
            const sheet = ss.getSheetByName(HOJAS.APORTES);
            const data = sheet.getDataRange().getValues();
            
            // Buscar fila
            let rowIndex = -1;
            for(let i=1; i<data.length; i++) {
                if(data[i][0] === aporteId) {
                    rowIndex = i + 1;
                    break;
                }
            }

            if(rowIndex === -1) return { status: 'error', message: 'Aporte no encontrado' };

            // Actualizar Estado (Columna 10)
            sheet.getRange(rowIndex, 10).setValue('RECHAZADO');
            
            // RECALCULAR SALDOS SIEMPRE (Auto-Healing)
            // Por si acaso había inconsistencias previas o si se rechaza algo que estaba aprobado por error.
            const participanteId = data[rowIndex-1][1]; // Columna B -> Index 1
            actualizarTotalAportado(participanteId, 0);

            return { status: 'success', message: 'Aporte rechazado y saldos verificados' };

        } catch(error) {
            return { status: 'error', message: 'Error al rechazar: ' + error.message };
        }
    });
}

// 💡 testPermissions() y ensureAportesHeader() → movidas a DbSetup.gs

// ==========================================
// FUNCIONES DE LA POLLA LOCA - SORTEOS Y NÚMEROS
// ==========================================

/**
 * Crea un nuevo sorteo.
 * AHORA: Permite múltiples sorteos activos en Polla_Config.
 */
function crearSorteoPolla(data) {
  return executeWithLock(() => {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheetConfig = ss.getSheetByName(HOJAS.POLLA_CONFIG);

      const id = generateId();
      const valor = parseFloat(data.monto_bolsa) ? 10000 : (parseFloat(data.valor_numero) || 10000); // Ajuste según lo que envíe el front
      const fecha = data.fecha; // YYYY-MM-DD
      const tema = data.tema || 'Polla Normal';

      // Añadir nuevo sorteo activo
      sheetConfig.appendRow([id, valor, fecha, tema]);

      return { status: 'success', message: 'Nuevo sorteo activo creado', id: id };
    } catch (e) {
      return { status: 'error', message: 'Error creando sorteo: ' + e.message };
    }
  });
}

/**
 * Registra el resultado manual de un sorteo y AQUÍ es donde se guarda en el historial
 */
/**
 * Registra el resultado manual de un sorteo específico y lo archiva en el historial.
 */
function registrarResultadoManualPolla(data) {
  return executeWithLock(() => {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheetSorteos = ss.getSheetByName(HOJAS.POLLA_SORTEOS);
      const sheetNumeros = ss.getSheetByName(HOJAS.POLLA_NUMEROS);
      const sheetConfig = ss.getSheetByName(HOJAS.POLLA_CONFIG);
      const sheetParticipantes = ss.getSheetByName(HOJAS.PARTICIPANTES);
      
      const targetSorteoId = data.sorteo_id;
      const esAcumulado = String(data.numero_ganador).toUpperCase() === 'ACUMULADO';
      const ganadorNum = esAcumulado ? 'ACUMULADO' : parseInt(data.numero_ganador, 10);
      const metodoPago = data.metodo_pago || 'AHORRO'; // Por defecto a ahorro
      
      if (!targetSorteoId) return { status: 'error', message: 'ID de sorteo no proporcionado' };
      if (!esAcumulado && isNaN(ganadorNum)) return { status: 'error', message: 'Número ganador inválido' };

      // 1. Obtener datos del sorteo desde Polla_Config
      const configRows = sheetConfig.getDataRange().getValues();
      let configRowIndex = -1;
      let configData = null;

      for (let i = 1; i < configRows.length; i++) {
        if (String(configRows[i][0]).trim() === String(targetSorteoId).trim()) {
          configRowIndex = i + 1;
          configData = configRows[i];
          break;
        }
      }

      if (!configData) return { status: 'error', message: 'Sorteo no encontrado en configuración activa' };
      
      const valorNumero = Number(configData[1]);
      const fechaSorteo = configData[2];
      const temaSorteo = configData[3] || 'Polla Loca';

      // 2. Calcular Recaudo y encontrar TODOS los ganadores
      let totalRecaudo = 0;
      let ganadoresIds = [];

      if (sheetNumeros) {
        const dataNums = sheetNumeros.getDataRange().getValues();
        for (let i = 1; i < dataNums.length; i++) {
          if (String(dataNums[i][4]) === String(targetSorteoId)) {
            const estadoPolla = String(dataNums[i][5]).toUpperCase();
            const pagado = dataNums[i][3];
            
            if (estadoPolla === 'PAGADO' || pagado === true || pagado === 'TRUE') {
              totalRecaudo += valorNumero;
              
              if (!esAcumulado && parseInt(dataNums[i][1], 10) === ganadorNum) {
                ganadoresIds.push(dataNums[i][0]); // ID del participante (Col A)
                sheetNumeros.getRange(i + 1, 6).setValue('GANADOR'); 
              }
            }
          }
        }
      }
      
      // 3. Distribución de Premios / Traslado a Actividades
      let resultadoFinanciero = "";
      if (ganadoresIds.length > 0) {
        // CASO: GANADOR FÍSICO (No afecta el sistema contable según requerimiento del usuario)
        resultadoFinanciero = `Premio de ${formatCurrency(totalRecaudo)} para ${ganadoresIds.length} ganador(es) (Entrega física fuera del sistema).`;
      } else {
        // CASO: SI NO GANA SE VA A LAS ACTIVIDADES PARA LOS INTERESES
        if (totalRecaudo > 0) {
          agregarActividad({
            nombre: `Polla Loca - Traslado Vacante`,
            descripcion: `Sorteo ${temaSorteo} (${targetSorteoId}). Número ganador: ${ganadorNum}. Sin ganadores registrados.`,
            monto_generado: totalRecaudo,
            fecha: new Date().toISOString(),
            responsable: 'SISTEMA'
          });
          resultadoFinanciero = `Bolsa de ${formatCurrency(totalRecaudo)} trasladada a Actividades (Sin ganador).`;
        } else {
          resultadoFinanciero = "Sorteo sin recaudo.";
        }
      }

      // 4. ARCHIVAR EN EL HISTORIAL (Polla_Sorteos)
      sheetSorteos.appendRow([
        targetSorteoId,
        fechaSorteo,
        ganadorNum,
        ganadoresIds.length > 0 ? ganadoresIds.join(', ') : 'ACUMULADO',
        totalRecaudo,
        ganadoresIds.length > 0 ? 'GANADO' : 'ACUMULADO',
        new Date()
      ]);
      
      // 5. Eliminar de Polla_Config
      sheetConfig.deleteRow(configRowIndex);
      
      return { 
          status: 'success', 
          message: `Sorteo cerrado exitosamente. ${resultadoFinanciero}`,
          recaudo: totalRecaudo,
          ganadores: ganadoresIds
      };

    } catch (e) {
      console.error("Error en registrarResultadoManualPolla:", e);
      return { status: 'error', message: 'Error cerrando sorteo: ' + e.message };
    }
  });
}

/**
 * Asigna un número de polla (Solicitud desde Consulta o Admin)
 * Estructura Hoja: [id_part, num, fecha_asig, pagado, sorteo_id, estado, url, fecha_solic]
 */
function solicitarNumeroPolla(data) {
  return executeWithLock(() => {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(HOJAS.POLLA_NUMEROS);
      
      const numero = parseInt(data.numero);
      const sorteoId = data.sorteo_id;
      const cedula = data.cedula;

      // 1. Validaciones de entrada
      if (isNaN(numero) || numero < 0 || numero > 99) {
        return { status: 'error', message: 'El número debe estar entre 00 y 99' };
      }
      if (!sorteoId) return { status: 'error', message: 'ID de sorteo requerido' };

      // 2. Buscar Participante
      let participanteId = cedula;
      let nombreParticipante = "Socio";
      const sheetPart = ss.getSheetByName(HOJAS.PARTICIPANTES);
      if (sheetPart) {
        const dataPart = sheetPart.getDataRange().getValues();
        // Col 2 es Cédula (Index 2), Col 0 es ID (Index 0), Col 1 es Nombre (Index 1)
        const socio = dataPart.find(r => String(r[2]) === String(cedula));
        if (socio) {
          participanteId = socio[0];
          nombreParticipante = socio[1];
        } else {
          // Intentar por ID directo
          const socioById = dataPart.find(r => String(r[0]) === String(cedula));
          if (socioById) {
              participanteId = cedula;
              nombreParticipante = socioById[1];
          } else {
              return { status: 'error', message: 'No se encontró socio con esa identificación' };
          }
        }
      }

      // 3. Verificar Disponibilidad y Duplicados por Socio
      const rows = sheet.getDataRange().getValues();
      
      // 3a. ¿Socio ya tiene número en este sorteo?
      const yaTieneNumero = rows.some((r, idx) => {
        if (idx === 0) return false;
        
        const rowSorteoId = String(r[4] || '').trim();
        const reqSorteoId = String(sorteoId || '').trim();
        const rowParticipanteId = String(r[0] || '').trim();
        const rowEstado = String(r[5] || '').trim();
        
        // Coincidencia de Sorteo: ID exacto o el de la hoja está vacío (para registros previos sin ID)
        const coincideSorteo = (rowSorteoId === reqSorteoId) || (rowSorteoId === "" && reqSorteoId !== "");
        
        // Coincidencia de Participante: ID interno o Cédula (retrocompatibilidad)
        const coincideParticipante = (rowParticipanteId === String(participanteId)) || (rowParticipanteId === String(cedula));
        
        return coincideSorteo && coincideParticipante && rowEstado !== 'RECHAZADO';
      });

      if (yaTieneNumero) return { status: 'error', message: 'Ya tienes un número asignado o solicitado para este sorteo.' };

      // 3b. ¿Número ya ocupado?
      const ocupado = rows.some((r, idx) => {
        if (idx === 0) return false;
        const rowSorteoId = String(r[4] || '').trim();
        const reqSorteoId = String(sorteoId || '').trim();
        const coincideSorteo = (rowSorteoId === reqSorteoId) || (rowSorteoId === "" && reqSorteoId !== "");

        return coincideSorteo && parseInt(r[1]) === numero && String(r[5]) !== 'RECHAZADO';
      });

      if (ocupado) return { status: 'error', message: `El número ${String(numero).padStart(2, '0')} ya está reservado o vendido.` };

      // 4. Manejo de Comprobante (Drive)
      let urlComprobante = "";
      if (data.fileData && data.fileName) {
          urlComprobante = saveFileToDrive(
              data.fileData, 
              `Polla_${String(numero).padStart(2, '0')}_${cedula}`, 
              data.mimeType, 
              FOLDER_ID_COMPROBANTES, 
              nombreParticipante
          );
      }

      // 5. Registrar (Alineado con hoja: id_part, num, fecha_asig, pagado, sorteo_id, estado, url, fecha_solic)
      const estadoInicial = (data.isAdminAssignment && data.autoPay) ? 'PAGADO' : 'PENDIENTE';
      const fechaAsignacion = (data.isAdminAssignment && data.autoPay) ? new Date() : null;
      const esPagado = (data.isAdminAssignment && data.autoPay) ? true : false;

      sheet.appendRow([
        participanteId,      // A: id_participante
        numero,              // B: numero
        fechaAsignacion,     // C: fecha_asignacion
        esPagado,            // D: pagado
        sorteoId,            // E: sorteo_id
        estadoInicial,       // F: estado_polla
        urlComprobante,      // G: comprobante_url
        new Date()           // H: fecha_solicitud
      ]);

      return { 
          status: 'success', 
          message: 'Solicitud registrada correctamente', 
          numero: numero,
          driveUrl: urlComprobante 
      };

    } catch (e) {
      return { status: 'error', message: 'Error en solicitarNumeroPolla: ' + e.message };
    }
  });
}

/**
 * Aprueba una solicitud de número (lo marca como PAGADO)
 * Estructura Hoja: [id_part, num, fecha_asig, pagado, sorteo_id, estado, url, fecha_solic]
 */
function aprobarNumeroPolla(data) {
    return executeWithLock(() => {
        try {
            const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
            const sheet = ss.getSheetByName(HOJAS.POLLA_NUMEROS);
            const rows = sheet.getDataRange().getValues();
            
            let rowIndex = -1;
            
            // Buscar la solicitud (match sorteo + numero)
            for (let i=1; i<rows.length; i++) {
                // E (4) es sorteo_id, B (1) es numero
                if (String(rows[i][4]) === String(data.sorteo_id) && parseInt(rows[i][1]) === parseInt(data.numero)) {
                    rowIndex = i + 1;
                    break;
                }
            }
            
            if (rowIndex === -1) return { status: 'error', message: 'Solicitud no encontrada' };
            
            // Aprobar
            // D (4) es pagado (BOOLEAN), F (6) es estado_polla (STRING), C (3) es fecha_asignacion
            sheet.getRange(rowIndex, 4).setValue(true); // pagado
            sheet.getRange(rowIndex, 6).setValue('PAGADO'); // estado
            sheet.getRange(rowIndex, 3).setValue(new Date()); // fecha_asig
            
            return { status: 'success', message: 'Número aprobado y marcado como PAGADO' };

        } catch (e) {
            return { status: 'error', message: 'Error al aprobar: ' + e.message };
        }
    });
}

/**
 * Rechaza una solicitud de número
 */
function rechazarNumeroPolla(data) {
    return executeWithLock(() => {
        try {
            const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
            const sheet = ss.getSheetByName(HOJAS.POLLA_NUMEROS);
            const rows = sheet.getDataRange().getValues();
            
            let rowIndex = -1;
            for (let i=1; i<rows.length; i++) {
                // E (4) es sorteo_id, B (1) es numero
                if (String(rows[i][4]) === String(data.sorteo_id) && parseInt(rows[i][1]) === parseInt(data.numero)) {
                    rowIndex = i + 1;
                    break;
                }
            }
            
            if (rowIndex === -1) return { status: 'error', message: 'Solicitud no encontrada' };
            
            // F (6) es estado_polla
            sheet.getRange(rowIndex, 6).setValue('RECHAZADO');
            
            return { status: 'success', message: 'Solicitud rechazada.' };

        } catch (e) {
            return { status: 'error', message: e.message };
        }
    });
}

// 💡 setupPolla() y configurarTriggersPolla() → movidas a DbSetup.gs

// ==========================================
// NUEVAS FUNCIONES GET PARA POLLA V2
// ==========================================

/**
 * Busca y retorna los sorteos que estén actualmente ACTIVOS en Polla_Config
 */
function getPollaSorteoActivo() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetConfig = ss.getSheetByName(HOJAS.POLLA_CONFIG);
    if (!sheetConfig || sheetConfig.getLastRow() < 2) {
        return { status: 'success', data: [], message: 'No hay sorteos activos' };
    }

    const data = sheetConfig.getDataRange().getValues();
    const sorteos = [];
    
    for (let i = 1; i < data.length; i++) {
        if (data[i][0]) {
            sorteos.push({
                id: data[i][0],
                valor_por_numero: Number(data[i][1]) || 10000,
                fecha: data[i][2],
                tema: data[i][3],
                estado: 'ACTIVO'
            });
        }
    }

    return {
      status: 'success',
      data: sorteos // Array de sorteos
    };
  } catch (error) {
    return { status: 'error', message: `Error: ${error.message}` };
  }
}

/**
 * Obtiene los números vendidos/reservados para un sorteo específico
 */
function getPollaNumerosPorSorteo(sorteo_id, mapaParticipantesExistente = null) {
  try {
    if (!sorteo_id) return { status: 'error', message: 'ID de sorteo es requerido' };

    const numerosResp = getData(HOJAS.POLLA_NUMEROS);
    if (numerosResp.status !== 'success') return numerosResp;

    const numerosSorteo = numerosResp.data.filter(n => {
      const sId = String(n.sorteo_id || '').trim();
      const reqId = String(sorteo_id || '').trim();
      // Incluir si coincide el ID o si el registro no tiene ID (para recuperar asignaciones previas)
      return sId === reqId || (sId === '' && reqId !== '');
    });

    // Evitar leer participantes de nuevo si ya nos pasan el mapa
    let mapaNombres = mapaParticipantesExistente;
    if (!mapaNombres) {
        mapaNombres = {};
        const participantesResp = getData(HOJAS.PARTICIPANTES);
        if (participantesResp.status === 'success') {
          participantesResp.data.forEach(p => {
            mapaNombres[p.id] = p.nombre;
          });
        }
    }

    const dataEnriquecida = numerosSorteo.map(n => {
      return {
        ...n,
        nombre_participante: mapaNombres[n.id_participante] || 'Desconocido',
        estado_polla: n.estado_polla || (n.pagado ? 'PAGADO' : 'PENDIENTE') 
      };
    });

    return {
      status: 'success',
      data: dataEnriquecida
    };
  } catch (error) {
    return { status: 'error', message: `Error al obtener números del sorteo: ${error.message}` };
  }
}

/**
 * Verifica si un número está disponible
 */
function getNumeroDisponiblePolla(sorteo_id, numero) {
  try {
    if (!sorteo_id || numero === undefined || numero === null) {
      return { status: 'error', available: false, message: 'Faltan datos' };
    }

    const numStr = parseInt(numero, 10);
    const numerosResp = getData(HOJAS.POLLA_NUMEROS);
    if (numerosResp.status !== 'success') return { status: 'error', available: false };

    const ocupado = numerosResp.data.some(n => {
      if (String(n.sorteo_id) !== String(sorteo_id)) return false;
      if (parseInt(n.numero, 10) !== numStr) return false;
      const estado = String(n.estado_polla || '').toUpperCase();
      return ['PENDIENTE', 'PAGADO', 'GANADOR'].includes(estado) || (n.pagado === true); 
    });

    return {
      status: 'success',
      available: !ocupado,
      numero: numStr,
      sorteo_id: sorteo_id
    };
  } catch (error) {
    return { status: 'error', message: `Error validando número: ${error.message}` };
  }
}



/**
 * Obtiene el paquete completo para el panel Admin (Sorteo Activo + Números + Historial)
 */
function getPollaData(sorteo_id = null, options = {}) {
  try {
    const respSorteo = getPollaSorteoActivo();
    let numeros = [];
    
    // 1. Mapa de nombres de participantes (LECTURA ÚNICA)
    const participantesResp = getData(HOJAS.PARTICIPANTES);
    const pMap = {};
    if (participantesResp.status === 'success') {
      participantesResp.data.forEach(p => pMap[p.id] = p.nombre);
    }

    // 2. Determinar qué sorteo mostrar
    const sorteosActivos = (respSorteo.status === 'success' && respSorteo.data) ? respSorteo.data : [];
    
    let mainSorteo = null;
    if (sorteo_id) {
        mainSorteo = sorteosActivos.find(s => String(s.id) === String(sorteo_id)) || (sorteosActivos.length > 0 ? sorteosActivos[0] : null);
    } else {
        mainSorteo = sorteosActivos.length > 0 ? sorteosActivos[0] : null;
    }

    if (mainSorteo) {
      // Pasamos pMap para evitar que esta función vuelva a leer la hoja de participantes
      const respNums = getPollaNumerosPorSorteo(mainSorteo.id, pMap);
      if (respNums.status === 'success') {
        numeros = respNums.data;
      }
    }

    // 3. Historial (Opcional si es update rápido)
    let sorteosHistorial = [];
    const isQuick = options.quickUpdate === true || options.quickUpdate === 'true';

    if (!isQuick) {
        const respHistorial = getData(HOJAS.POLLA_SORTEOS);
        if (respHistorial.status === 'success') {
          sorteosHistorial = respHistorial.data.map(s => {
            return {
              ...s,
              nombre_ganador: pMap[s.id_ganador] || s.id_ganador || (s.id_ganador === 'ACUMULADO' ? 'ACUMULADO' : 'N/A')
            };
          });
        }
    }

    // 4. Obtener último resultado de lotería (solo si no es quickUpdate)
    let ultimoResultado = null;
    if (!isQuick) {
      ultimoResultado = getResultadoLoteriaMedellin();
    }

    // 5. Determinar el último ganador real de la polla (del historial)
    let ultimoGanadorSistema = null;
    if (sorteosHistorial.length > 0) {
        // El historial en Code.gs se guarda con appendRow([id, fecha, numero, ...])
        // El getData suele devolverlos en orden de inserción. El último es el más reciente.
        const ultimoSorteo = sorteosHistorial[sorteosHistorial.length - 1];
        ultimoGanadorSistema = {
            numero: ultimoSorteo.numero_ganador || ultimoSorteo.ganadorNum || (ultimoSorteo[2] ? ultimoSorteo[2] : null),
            ganador: ultimoSorteo.nombre_ganador,
            fecha: ultimoSorteo.fecha
        };
    }

    return {
      status: 'success',
      data: {
        sorteoActivo: mainSorteo,
        sorteosActivos: sorteosActivos,
        numeros: numeros,
        sorteos: sorteosHistorial,
        ultimoResultado: ultimoResultado,
        ultimoGanadorSistema: ultimoGanadorSistema,
        isQuickUpdate: isQuick
      }
    };
  } catch (error) {
    return { status: 'error', message: `Error en getPollaData: ${error.message}` };
  }
}



// ========================================== 
// MÓDULO BINGO MULTIJUGADOR 
// ========================================== 

function crearJuegoBingo(data) {
  return executeWithLock(() => {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(HOJAS.BINGO_JUEGOS);
      if (!sheet) return { status: "error", message: "La hoja de Bingo_Juegos no existe. Ejecuta 'testInicializar' en DbSetup.gs" };
      const newId = generateId();
      const newRow = [
        newId,
        new Date(data.fecha),
        Number(data.valor_tabla),
        0, // total_bolsa
        "ABIERTO",
        "", // ganador_id
        new Date(), // created_at
        "", // voice_room
        data.modo_juego || "FULL"
      ];
      sheet.appendRow(newRow);
      return { status: "success", message: "Juego de Bingo creado", id: newId };
    } catch (e) {
      return { status: "error", message: e.message };
    }
  });
}

function comprarTablaBingo(data) {
  return executeWithLock(() => {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(HOJAS.BINGO_TABLAS);
      if (!sheet) return { status: "error", message: "La hoja de Bingo_Tablas no existe. Ejecuta 'testInicializar' en DbSetup.gs" };

      // 1. Manejo opcional de comprobante en Drive
      let fileUrl = data.comprobante_url || ""; // Por defecto si ya viene una URL o está vacío
      
      if (data.fileData && data.fileName && data.mimeType) {
        try {
          const participantes = getData(HOJAS.PARTICIPANTES);
          const pId = String(data.participante_id || "");
          const socio = pId ? participantes.data.find(p => String(p.id) === pId) : null;
          const nombreSocio = socio ? socio.nombre : "Socio-Desconocido";
          
          const folderId = FOLDER_ID_COMPROBANTES === "TU_ID_DE_CARPETA_DRIVE_AQUI" ? null : FOLDER_ID_COMPROBANTES;
          fileUrl = saveFileToDrive(data.fileData, data.fileName, data.mimeType, folderId, nombreSocio);
        } catch (driveErr) {
          return { status: "error", message: "Error al guardar el recibo en Drive: " + driveErr.message };
        }
      } else if (!fileUrl) {
          return { status: "error", message: "Debe adjuntar un archivo o comprobante válido." };
      }

      const numeros = generarMatrizBingo();
      const newId = generateId();
      const newRow = [
        newId,
        data.juego_id,
        data.participante_id,
        JSON.stringify(numeros),
        "ACTIVA",
        fileUrl,
        "PENDIENTE"
      ];
      sheet.appendRow(newRow);
      return { status: "success", message: "Tabla comprada. Pendiente de aprobación.", id: newId };
    } catch (e) {
      return { status: "error", message: e.message };
    }
  });
}

function generarMatrizBingo() {
  const matriz = [];
  const rangos = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];
  for (let col = 0; col < 5; col++) {
    const [min, max] = rangos[col];
    const nums = [];
    while (nums.length < 5) {
      const n = Math.floor(Math.random() * (max - min + 1)) + min;
      if (!nums.includes(n)) nums.push(n);
    }
    matriz[col] = nums;
  }
  // El centro es libre
  matriz[2][2] = "FREE";
  return matriz;
}

function cantarBalotaBingo(data) {
  return executeWithLock(() => {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(HOJAS.BINGO_BALOTAS);
      if (!sheet) return { status: "error", message: "La hoja de Bingo_Balotas no existe. Ejecuta 'testInicializar' en DbSetup.gs" };
      
      // Obtener balotas ya cantadas en este juego
      const balotasData = getData(HOJAS.BINGO_BALOTAS);
      const cantadas = balotasData.data
        .filter(b => b.juego_id === data.juego_id)
        .map(b => Number(b.numero));
      
      if (cantadas.length >= 75) {
        return { status: "error", message: "Ya se cantaron todas las balotas (1-75)" };
      }

      // Generar número único
      let numero;
      do {
        numero = Math.floor(Math.random() * 75) + 1;
      } while (cantadas.includes(numero));

      const newId = generateId();
      const newRow = [
        newId,
        data.juego_id,
        numero,
        new Date()
      ];
      sheet.appendRow(newRow);
      
      // Limpiar cache para forzar actualización
      CacheService.getScriptCache().remove("bingo_state_" + data.juego_id);
      
      return { status: "success", message: "Balota cantada: " + numero, numero: numero };
    } catch (e) {
      return { status: "error", message: e.message };
    }
  });
}

function getBingoState(juegoId) {
  try {
    const cache = CacheService.getScriptCache();
    
    // Si es LATEST, encontrar el ID real primero
    if (juegoId === 'LATEST') {
      const juegos = getData(HOJAS.BINGO_JUEGOS);
      if (juegos.status !== "success" || juegos.data.length === 0) {
        return { status: "error", message: "No hay juegos activos" };
      }
      // El último juego es el más reciente
      const ultimoJuego = juegos.data[juegos.data.length - 1];
      juegoId = ultimoJuego.id;
    }

    const cached = cache.get("bingo_state_" + juegoId);
    if (cached) return JSON.parse(cached);

    const balotas = getData(HOJAS.BINGO_BALOTAS);
    if (balotas.status !== "success") return balotas;

    const juegosFull = getData(HOJAS.BINGO_JUEGOS);
    const juegoInfo = juegosFull.data.find(j => j.id === juegoId);

    const state = {
      status: "success",
      juego_id: juegoId,
      valor_tabla: juegoInfo ? juegoInfo.valor_tabla : 0,
      total_bolsa: juegoInfo ? juegoInfo.total_bolsa : 0,
      estado: juegoInfo ? juegoInfo.estado : "DESCONOCIDO",
      modo_juego: juegoInfo ? juegoInfo.modo_juego : "FULL",
      balotas: balotas.data.filter(b => String(b.juego_id) === String(juegoId)).map(b => b.numero),
      voice_room: juegoInfo ? juegoInfo.voice_room : null,
      ganador_id: juegoInfo ? juegoInfo.ganador_id : null,
      timestamp: new Date().getTime()
    };

    // Si hay ganador, intentar buscar su nombre
    if (state.ganador_id) {
       const participantes = getData(HOJAS.PARTICIPANTES);
       if (participantes.status === 'success') {
          const p = participantes.data.find(part => String(part.id) === String(state.ganador_id));
          state.ganador_nombre = p ? p.nombre : "Socio " + state.ganador_id;
       }
    }

    cache.put("bingo_state_" + juegoId, JSON.stringify(state), 3); 
    return state;
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function getTablasBingo(juegoId) {
  try {
    const tablas = getData(HOJAS.BINGO_TABLAS);
    if (tablas.status !== "success") return tablas;

    const participantes = getData(HOJAS.PARTICIPANTES);
    // Comparación robusta - Si no hay juegoId, no devolvemos nada para evitar fugas de datos
    if (!juegoId || juegoId === 'null') return { status: "success", data: [] };
    
    const filterTablas = tablas.data.filter(t => String(t.juego_id) === String(juegoId));

    // Cruzar con nombres de participantes
    const result = filterTablas.map(t => {
      const p = participantes.status === "success" ? 
                participantes.data.find(part => String(part.id) === String(t.participante_id)) : null;
      return {
        ...t,
        participante_nombre: p ? p.nombre : "Socio #" + t.participante_id
      };
    });

    return { status: "success", data: result };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function aprobarPagoBingo(data) {
  return executeWithLock(() => {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheetTablas = ss.getSheetByName(HOJAS.BINGO_TABLAS);
      const rowsTablas = sheetTablas.getDataRange().getValues();
      const headersTablas = rowsTablas[0];
      
      const idIdx = headersTablas.indexOf("id");
      const juegoIdIdx = headersTablas.indexOf("juego_id");
      const estadoPagoIdx = headersTablas.indexOf("estado_pago");

      let juegoId = null;
      let tablaEncontrada = false;

      for (let i = 1; i < rowsTablas.length; i++) {
        if (String(rowsTablas[i][idIdx]) === String(data.tabla_id)) {
          // Si ya está aprobado, no hacemos nada más (para evitar duplicar la bolsa)
          if (rowsTablas[i][estadoPagoIdx] === "APROBADO") {
            return { status: "success", message: "El pago ya estaba aprobado" };
          }
          
          sheetTablas.getRange(i + 1, estadoPagoIdx + 1).setValue("APROBADO");
          juegoId = rowsTablas[i][juegoIdIdx];
          tablaEncontrada = true;
          break;
        }
      }

      if (!tablaEncontrada) {
        return { status: "error", message: "Tabla no encontrada" };
      }

      // 2. Actualizar la bolsa en la hoja de Juegos
      const sheetJuegos = ss.getSheetByName(HOJAS.BINGO_JUEGOS);
      const rowsJuegos = sheetJuegos.getDataRange().getValues();
      const headersJuegos = rowsJuegos[0];
      
      const jIdIdx = headersJuegos.indexOf("id");
      const valorTablaIdx = headersJuegos.indexOf("valor_tabla");
      const totalBolsaIdx = headersJuegos.indexOf("total_bolsa");

      for (let j = 1; j < rowsJuegos.length; j++) {
        if (String(rowsJuegos[j][jIdIdx]) === String(juegoId)) {
          const valorTabla = Number(rowsJuegos[j][valorTablaIdx] || 0);
          const bolsaActual = Number(rowsJuegos[j][totalBolsaIdx] || 0);
          // REGLA: 50% para la bolsa, 50% para la natillera
          const nuevaBolsa = bolsaActual + (valorTabla * 0.5);
          
          sheetJuegos.getRange(j + 1, totalBolsaIdx + 1).setValue(nuevaBolsa);
          
          // Limpiar cache del estado para que los jugadores vean la nueva bolsa
          CacheService.getScriptCache().remove("bingo_state_" + juegoId);
          
          return { status: "success", message: "Pago aprobado y bolsa actualizada", nueva_bolsa: nuevaBolsa };
        }
      }

      return { status: "success", message: "Pago aprobado (no se pudo actualizar la bolsa: juego no encontrado)" };
    } catch (e) {
      return { status: "error", message: e.message };
    }
  });
}

/**
 * Un jugador reclama que tiene Bingo
 */
function reclamarBingo(data) {
  return executeWithLock(() => {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(HOJAS.BINGO_TABLAS);
      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      
      const juegoIdx = headers.indexOf("juego_id");
      const partIdx = headers.indexOf("participante_id");
      const estadoIdx = headers.indexOf("estado");
      const numerosIdx = headers.indexOf("numeros_json");

      let tableRow = -1;
      let numerosTabla = [];

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][juegoIdx]) === String(data.juego_id) && 
            String(rows[i][partIdx]) === String(data.participante_id)) {
          tableRow = i;
          numerosTabla = JSON.parse(rows[i][numerosIdx]);
          break;
        }
      }

      if (tableRow === -1) {
        return { status: "error", message: "No se encontró una tabla válida para reclamar en este juego." };
      }

      // 2. Obtener balotas cantadas
      const sheetBalotas = ss.getSheetByName(HOJAS.BINGO_BALOTAS);
      const rowsB = sheetBalotas.getDataRange().getValues();
      const balotasCantadas = rowsB.filter(r => String(r[1]) === String(data.juego_id)).map(r => Number(r[2]));

      // 3. Obtener modo de juego
      const sheetJuegos = ss.getSheetByName(HOJAS.BINGO_JUEGOS);
      const rowsJ = sheetJuegos.getDataRange().getValues();
      const juegoInfo = rowsJ.find(r => String(r[0]) === String(data.juego_id));
      const modoJuego = juegoInfo ? juegoInfo[rowsJ[0].indexOf("modo_juego")] : "FULL";

      // 4. VERIFICACIÓN MATEMÁTICA
      let aciertos = 0;
      let totalNumeros = 0;
      
      // La matriz es de 5x5. numerosTabla[col][row]
      for (let col = 0; col < 5; col++) {
        for (let row = 0; row < 5; row++) {
          const val = numerosTabla[col][row];
          if (val === 'FREE') continue;
          
          totalNumeros++;
          if (balotasCantadas.indexOf(Number(val)) !== -1) {
            aciertos++;
          }
        }
      }

      let verificado = false;
      if (modoJuego === 'FULL') {
        verificado = (aciertos >= 24); // 24 números + FREE
      } else {
        // ANY: El sistema lo marca como verificado si tiene al menos 4 aciertos (mínimo para gritar)
        // El administrador tendrá la última palabra, pero el bot avisa si es matemáticamente posible.
        verificado = (aciertos >= 4);
      }

      if (!verificado) {
        return { status: "error", message: `Validación fallida: Solo tienes ${aciertos} aciertos de ${totalNumeros} requeridos.` };
      }

      // 5. Proceder con el reclamo
      sheet.getRange(tableRow + 1, estadoIdx + 1).setValue('RECLAMANDO');
      
      sendBingoMessage({
        juego_id: data.juego_id,
        usuario_id: data.participante_id,
        usuario_nombre: "SISTEMA",
        mensaje: `✅ Bingo VALIDADO matemáticamente (${aciertos} aciertos). Verificación final por Admin pendiente.`,
        rol: 'admin'
      });

      return { status: "success", message: "¡Bingo reclamado y VALIDADO por el sistema! El administrador dará la aprobación final.", aciertos: aciertos };
    } catch (e) {
      return { status: "error", message: e.message };
    }
  });
}

/**
 * El administrador confirma el ganador y finaliza el juego
 */
function procesarPremioBingo(data) {
  return executeWithLock(() => {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheetJuegos = ss.getSheetByName(HOJAS.BINGO_JUEGOS);
      const sheetTablas = ss.getSheetByName(HOJAS.BINGO_TABLAS);
      
      const juegos = sheetJuegos.getDataRange().getValues();
      const jHeaders = juegos[0];
      const jIdIdx = jHeaders.indexOf("id");
      const jEstIdx = jHeaders.indexOf("estado");
      const jGanIdx = jHeaders.indexOf("ganador_id");

      for (let i = 1; i < juegos.length; i++) {
        if (String(juegos[i][jIdIdx]) === String(data.juego_id)) {
          sheetJuegos.getRange(i + 1, jEstIdx + 1).setValue('FINALIZADO');
          sheetJuegos.getRange(i + 1, jGanIdx + 1).setValue(data.participante_id);
          break;
        }
      }

      const tablas = sheetTablas.getDataRange().getValues();
      const tHeaders = tablas[0];
      const tIdIdx = tHeaders.indexOf("id");
      const tEstIdx = tHeaders.indexOf("estado");

      for (let i = 1; i < tablas.length; i++) {
        if (String(tablas[i][tIdIdx]) === String(data.tabla_id)) {
          sheetTablas.getRange(i + 1, tEstIdx + 1).setValue('GANADORA');
          break;
        }
      }

      sendBingoMessage({
        juego_id: data.juego_id,
        usuario_id: 'ADMIN',
        usuario_nombre: 'ADMINISTRADOR',
        mensaje: `🏆 ¡Tenemos un ganador! Felicitaciones. El juego ha finalizado.`,
        rol: 'admin'
      });

      const state = getBingoState(data.juego_id);
      const bolsaTotal = state.total_bolsa || 0;
      const montoGanador = bolsaTotal * 0.5;
      const montoActividades = bolsaTotal * 0.5;

      CacheService.getScriptCache().remove("bingo_state_" + data.juego_id);

      // 1. Trasladar el 50% a Actividades automáticamente
      if (montoActividades > 0) {
          try {
              agregarActividad({
                  nombre: `Bingo - Comisión Natillera`,
                  descripcion: `50% de la bolsa del juego: ${data.juego_id}. Ganador: ${data.participante_id}.`,
                  monto_generado: montoActividades,
                  fecha: new Date().toISOString(),
                  responsable: 'SISTEMA'
              });
          } catch (errAct) {
              console.error("Error trasladando comisión de bingo a actividades:", errAct);
          }
      }

      // 2. Registrar el 50% para el Ganador (Aporte si es AHORRO)
      if (data.metodo_pago === 'AHORRO' && montoGanador > 0) {
          try {
              agregarAporte({
                  participante_id: data.participante_id,
                  monto: montoGanador,
                  fecha: new Date().toISOString(),
                  concepto: `PREMIO BINGO (50% de Bolsa - Juego: ${data.juego_id})`,
                  estado: 'APROBADO'
              });
          } catch (errAporte) {
              console.error("Error al registrar ahorro de premio bingo:", errAporte);
          }
      }

      let pdfResult = null;
      if (data.metodo_pago === 'EFECTIVO' && montoGanador > 0) {
          try {
              pdfResult = generarReciboBingoPDF(data.participante_id, data.juego_id, montoGanador, 'EFECTIVO');
          } catch (errPdf) {
              console.error("Error generando PDF de premio bingo:", errPdf);
          }
      }

      return { 
          status: "success", 
          message: `Juego finalizado. Bolsa split 50/50: ${formatCurrency(montoGanador)} para ganador y ${formatCurrency(montoActividades)} para actividades.`,
          pdf: pdfResult 
      };
    } catch (e) {
      return { status: "error", message: e.message };
    }
  });
}

/**
 * Cancela un juego de bingo por error (Admin Only)
 */
function cancelarJuegoBingo(data) {
  return executeWithLock(() => {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(HOJAS.BINGO_JUEGOS);
      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      
      const idIdx = headers.indexOf("id");
      const estIdx = headers.indexOf("estado");

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][idIdx]) === String(data.juego_id)) {
          sheet.getRange(i + 1, estIdx + 1).setValue('CANCELADO');
          CacheService.getScriptCache().remove("bingo_state_" + data.juego_id);
          return { status: "success", message: "Juego cancelado correctamente." };
        }
      }
      return { status: "error", message: "Juego no encontrado" };
    } catch (e) {
      return { status: "error", message: e.message };
    }
  });
}

/**
 * Envía un mensaje al chat del Bingo
 */
function sendBingoMessage(data) {
  return executeWithLock(() => {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(HOJAS.BINGO_CHAT);
      
      const id = generateId();
      const timestamp = new Date().toISOString();
      
      sheet.appendRow([
        id,
        data.juego_id,
        data.usuario_id,
        data.usuario_nombre,
        data.mensaje,
        data.rol || 'socio',
        timestamp
      ]);
      
      return { status: "success", message: "Mensaje enviado" };
    } catch (e) {
      return { status: "error", message: e.message };
    }
  });
}

/**
 * Obtiene los mensajes de un juego de Bingo
 */
function getBingoMessages(juegoId) {
  try {
    const mensajes = getData(HOJAS.BINGO_CHAT);
    if (mensajes.status !== "success") return mensajes;
    
    // Filtrar por juego y ordenar por tiempo (últimos 50 para no saturar)
    const result = mensajes.data
      .filter(m => String(m.juego_id) === String(juegoId))
      .slice(-50);
      
    return { status: "success", data: result };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

/**
 * Función de utilidad para obtener la etiqueta de una balota (B-1, I-16, etc.)
 */
function getBingoBallLabel(numero) {
  const n = Number(numero);
  if (n >= 1 && n <= 15) return "B-" + n;
  if (n >= 16 && n <= 30) return "I-" + n;
  if (n >= 31 && n <= 45) return "N-" + n;
  if (n >= 46 && n <= 60) return "G-" + n;
  if (n >= 61 && n <= 75) return "O-" + n;
  return n.toString();
}

/**
 * Actualiza la sala de voz de un juego de Bingo
 */
function setBingoVoiceRoom(data) {
  return executeWithLock(() => {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName(HOJAS.BINGO_JUEGOS);
      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      
      const idIdx = headers.indexOf("id");
      const roomIdx = headers.indexOf("voice_room");

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][idIdx]) === String(data.juego_id)) {
          sheet.getRange(i + 1, roomIdx + 1).setValue(data.voice_room || "");
          CacheService.getScriptCache().remove("bingo_state_" + data.juego_id);
          return { status: "success", message: "Sala de voz actualizada" };
        }
      }
      return { status: "error", message: "Juego no encontrado" };
    } catch (e) {
      return { status: "error", message: e.message };
    }
  });
}
/**
 * Genera un token JWT para LiveKit manualmente en Apps Script
 */
/**
 * Token generation removed (LiveKit deprecated)
 */
function generateLiveKitToken(room, identity, canPublish) {
    return null;
}
