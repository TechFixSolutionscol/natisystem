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
const SPREADSHEET_ID = "TU_ID_DE_GOOGLE_SHEET_AQUI";

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
  CONFIG: "Config"
};

// ==========================================
// FUNCIÓN DE PRUEBA (EJECUTAR DESDE EL EDITOR)
// ==========================================

/**
 * FUNCIÓN DE PRUEBA - Ejecuta esta función desde el editor de Apps Script
 * para inicializar la base de datos sin necesidad de usar la URL
 * 
 * Instrucciones:
 * 1. Selecciona "testInicializar" en el menú desplegable de funciones
 * 2. Haz clic en el botón ▶️ Ejecutar
 * 3. Autoriza los permisos si te lo pide
 * 4. Revisa los logs para ver el resultado
 */
function testInicializar() {
  Logger.log('=== INICIANDO PRUEBA DE INICIALIZACIÓN ===');
  
  // Verificar que el SPREADSHEET_ID esté configurado
  if (SPREADSHEET_ID === "TU_ID_DE_GOOGLE_SHEET_AQUI") {
    Logger.log('❌ ERROR: Debes configurar el SPREADSHEET_ID en la línea 13');
    Logger.log('Instrucciones:');
    Logger.log('1. Abre tu Google Sheet');
    Logger.log('2. Copia el ID de la URL (entre /d/ y /edit)');
    Logger.log('3. Reemplaza "TU_ID_DE_GOOGLE_SHEET_AQUI" con tu ID');
    return;
  }
  
  Logger.log('SPREADSHEET_ID configurado: ' + SPREADSHEET_ID);
  
  // Ejecutar la inicialización
  const resultado = inicializarBaseDatos();
  
  // Mostrar resultado
  Logger.log('=== RESULTADO ===');
  Logger.log('Status: ' + resultado.status);
  Logger.log('Mensaje: ' + resultado.message);
  
  if (resultado.detalles) {
    Logger.log('Detalles:');
    resultado.detalles.forEach(function(detalle) {
      Logger.log('  - ' + detalle);
    });
  }
  
  if (resultado.status === 'success') {
    Logger.log('✅ ¡Base de datos inicializada correctamente!');
    Logger.log('Ahora puedes usar el sistema con estas credenciales:');
    Logger.log('Email: admin@natillera.com');
    Logger.log('Password: admin123');
  } else {
    Logger.log('❌ Error: ' + resultado.message);
  }
}

/**
 * FUNCIÓN DE PRUEBA - Verifica que el usuario admin existe
 * Ejecuta esta función para ver si el usuario admin fue creado correctamente
 */
function testVerificarUsuarios() {
  Logger.log('=== VERIFICANDO USUARIOS ===');
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('✅ Spreadsheet abierto correctamente');
    
    const sheet = ss.getSheetByName(HOJAS.USUARIOS);
    if (!sheet) {
      Logger.log('❌ ERROR: La hoja "Usuarios" no existe');
      return;
    }
    
    Logger.log('✅ Hoja "Usuarios" encontrada');
    
    const lastRow = sheet.getLastRow();
    Logger.log('Última fila con datos: ' + lastRow);
    
    if (lastRow < 2) {
      Logger.log('⚠️ ADVERTENCIA: La hoja solo tiene encabezados, no hay usuarios');
      Logger.log('Ejecuta testInicializar para crear el usuario admin');
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    Logger.log('Total de filas leídas: ' + data.length);
    
    const headers = data[0];
    Logger.log('Encabezados: ' + JSON.stringify(headers));
    
    const rows = data.slice(1);
    Logger.log('Total de usuarios: ' + rows.length);
    
    rows.forEach(function(row, index) {
      Logger.log('Usuario ' + (index + 1) + ':');
      Logger.log('  ID: ' + row[0]);
      Logger.log('  Email: ' + row[1]);
      Logger.log('  Password: ' + row[2]);
      Logger.log('  Nombre: ' + row[3]);
      Logger.log('  Rol: ' + row[4]);
    });
    
    // Probar getData
    Logger.log('\n=== PROBANDO FUNCIÓN getData ===');
    const resultado = getData(HOJAS.USUARIOS);
    Logger.log('Status: ' + resultado.status);
    if (resultado.status === 'success') {
      Logger.log('Usuarios encontrados: ' + resultado.data.length);
      Logger.log('Datos: ' + JSON.stringify(resultado.data));
    } else {
      Logger.log('Error: ' + resultado.message);
    }
    
  } catch (error) {
    Logger.log('❌ ERROR: ' + error.message);
    Logger.log('Stack: ' + error.stack);
  }
}

// ==========================================
// FUNCIONES PRINCIPALES - ENDPOINTS
// ==========================================

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
 * Ejecuta una función dentro de un bloqueo (LockService)
 * para evitar condiciones de carrera (escrituras simultáneas)
 * @param {Function} callback - Función a ejecutar
 * @returns {Object} Resultado de la función o error de bloqueo
 */
function executeWithLock(callback) {
  const lock = LockService.getScriptLock();
  
  try {
    // Intentar obtener el bloqueo por 30 segundos
    const hasLock = lock.tryLock(30000);
    
    if (!hasLock) {
      return { 
        status: 'error', 
        message: 'El sistema está ocupado. Por favor intente de nuevo en unos segundos.' 
      };
    }
    
    // Ejecutar la función crítica
    return callback();
    
  } catch (error) {
    return { 
      status: 'error', 
      message: `Error inesperado: ${error.message}` 
    };
  } finally {
    // Siempre liberar el bloqueo
    lock.releaseLock();
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
      
      // Validar montos y fiador
      const monto = Number(data.monto_prestado);
      const tasa = Number(data.tasa_interes);
      const ahorroSolicitante = Number(participante.total_aportado || 0);

      // Regla de Fiador: Si monto > ahorro, se requiere fiador
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
      
      if (isNaN(monto) || monto <= 0) {
        return { status: 'error', message: 'El monto debe ser mayor a cero' };
      }
      if (isNaN(tasa) || tasa < 0 || tasa > 100) {
        return { status: 'error', message: 'La tasa debe estar entre 0 y 100' };
      }
      
      // Calcular interés simple (Causación Inicial - NO es ganancia aún)
      const fechaPrestamo = new Date(data.fecha_prestamo);
      const fechaVencimiento = new Date(data.fecha_vencimiento);
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
        data.fiador_id || '' // Nuevo campo fiador
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
 * @param {Object} data - {id, nuevaFecha}
 */
function modificarVencimientoPrestamo(data) {
  try {
    const { id, nuevaFecha } = data;
    if (!id || !nuevaFecha) return { status: 'error', message: 'Faltan datos' };

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

/**
 * Calcula y distribuye las ganancias del ciclo
 * AHORA BASADO EN MOVIMIENTOS REALES (Principio de Caja)
 */
/**
 * Actualiza el esquema de distribución automáticamente
 * Asegura que existan las configuraciones y columnas necesarias
 */
function actualizarEsquemaDistribucion() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 1. Verificar Configuración Global
  const sheetConfig = ss.getSheetByName(HOJAS.CONFIG);
  if (sheetConfig) {
    const data = sheetConfig.getDataRange().getValues();
    let existeMetodo = false;
    for (let i = 0; i < data.length; i++) {
        if (data[i][0] === 'METODO_DISTRIBUCION') {
            existeMetodo = true;
            break;
        }
    }
    if (!existeMetodo) {
        sheetConfig.appendRow(['METODO_DISTRIBUCION', 'EQUITATIVA']);
    }
  }

  // 2. Verificar Columna en Participantes (Para método Manual)
  const sheetParticipantes = ss.getSheetByName(HOJAS.PARTICIPANTES);
  if (sheetParticipantes) {
      const headers = sheetParticipantes.getRange(1, 1, 1, sheetParticipantes.getLastColumn()).getValues()[0];
      const headerIndex = headers.indexOf('porcentaje_participacion');
      if (headerIndex === -1) {
          // Agregar columna al final si no existe
          const lastCol = sheetParticipantes.getLastColumn();
          sheetParticipantes.getRange(1, lastCol + 1).setValue('porcentaje_participacion');
      }
  }
}

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

    // 2. Calcular Totales (Intereses + Actividades)
    // Intereses (Caja)
    const sheetMovimientos = ss.getSheetByName('Movimientos_Prestamos');
    let totalIntereses = 0;
    if (sheetMovimientos && sheetMovimientos.getLastRow() > 1) {
        const dataMovimientos = sheetMovimientos.getDataRange().getValues();
        for(let i = 1; i < dataMovimientos.length; i++) {
            if (String(dataMovimientos[i][3]).trim().toUpperCase() === 'PAGO_INTERES') {
                totalIntereses += Number(dataMovimientos[i][4]) || 0;
            }
        }
    }

    // Actividades (Solo FINALIZADAS)
    const actividades = getData(HOJAS.ACTIVIDADES);
    let totalActividades = 0;
    if (actividades.status === 'success' && actividades.data) {
      totalActividades = actividades.data.reduce((sum, a) => {
        const estado = String(a.estado || '').trim().toUpperCase();
        return estado === 'FINALIZADA' ? sum + Number(a.monto_generado || 0) : sum;
      }, 0);
    }
    
    const gananciaTotal = totalIntereses + totalActividades;
    
    // 3. Obtener Participantes Activos
    const sheetParticipantes = ss.getSheetByName(HOJAS.PARTICIPANTES);
    const dataParticipantes = sheetParticipantes.getDataRange().getValues();
    const headersP = dataParticipantes[0];
    const idxTotalAportado = headersP.indexOf('total_aportado');
    const idxPorcentaje = headersP.indexOf('porcentaje_participacion'); // Puede ser -1 si no se ha recargado, pero actualizarEsquema ya corrió
    
    // Mapear participantes relevantes
    // Estructura: [ID, Nombre, ..., TotalAportado, ..., Porcentaje]
    let participantesActivos = [];
    let totalAportadoGlobal = 0;
    let sumaPorcentajesManuales = 0;

    for (let i = 1; i < dataParticipantes.length; i++) {
        const row = dataParticipantes[i];
        // Asumimos col 5 es activo (ajustar según esquema real si varía, pero row[5] suele ser activo en standard)
        // Mejor usar el objeto getData para ser seguro, pero aquí necesitamos escribir también.
        // Vamos a usar la lógica de índices relativos es arriesgado. Usaremos getData para lectura robusta y mapeo de IDs.
    }
    
    // RE-LECTURA ROBUSTA USANDO getData
    const respP = getData(HOJAS.PARTICIPANTES);
    if (respP.status !== 'success') return respP;
    
    const listaParticipantes = respP.data.filter(p => p.activo);
    
    if (listaParticipantes.length === 0) {
        return { status: 'success', message: 'No hay participantes activos' };
    }

    // Calcular bases según método
    if (metodoDistribucion === 'PROPORCIONAL') {
        totalAportadoGlobal = listaParticipantes.reduce((sum, p) => sum + (Number(p.total_aportado) || 0), 0);
    } else if (metodoDistribucion === 'MANUAL') {
        sumaPorcentajesManuales = listaParticipantes.reduce((sum, p) => sum + (Number(p.porcentaje_participacion) || 0), 0);
        // Validación estricta
        if (Math.abs(sumaPorcentajesManuales - 100) > 0.1) {
            // Fallback por seguridad o Error
            // Decisión: Error para obligar a corregir
             return { status: 'error', message: `Los porcentajes manuales suman ${sumaPorcentajesManuales}%, deben sumar 100%` };
        }
    }

    // 4. Preparar Distribución
    const sheetGanancias = ss.getSheetByName(HOJAS.GANANCIAS);
    
    // LIMPIEZA
    const rowsG = sheetGanancias.getDataRange().getValues();
    if (rowsG.length > 0) {
        const header = rowsG[0];
        sheetGanancias.clearContents();
        sheetGanancias.clearFormats();
        sheetGanancias.getRange(1, 1, 1, header.length).setValues([header]);
    }

    const fechaDist = new Date();
    const mapGanancias = {}; // pId -> Monto

    // 5. Calcular y Registrar
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

        // Escribir en Historial
        sheetGanancias.appendRow([
            generateId(),
            p.id,
            'DIST-' + generateId().split('-')[1],
            montoGanancia,
            fechaDist,
            `DISTRIBUCION (${metodoDistribucion})`,
            new Date()
        ]);
    });

    // 6. Actualizar Participantes (Columna Ganancias)
    // Necesitamos el índice de la columna 'ganancias_acumuladas'
    // Como getData devuelve objetos, usamos headersP para buscar el índice FÍSICO
    const idxGanancias = headersP.indexOf('ganancias_acumuladas'); 
    
    if (idxGanancias !== -1) {
        // Optimización: Escribir en bloque sería mejor, pero por seguridad iteraremos
        // Usamos el array dataParticipantes original para coincidir filas
        for (let i = 1; i < dataParticipantes.length; i++) {
             const idOriginal = String(dataParticipantes[i][0]);
             const ganancia = mapGanancias[idOriginal] || 0;
             // +1 porque row son 0-based pero sheet es 1-based. idx es 0-based.
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
            
            // Recalcular ganancias si hubo pago de interés
            if (pagoInteres > 0) {
                calcularDistribucionGanancias();
            }

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

/**
 * Configura el trigger diario para el motor de interés
 * Ejecutar UNA SOLA VEZ manualmente desde el frontend o desde el editor de scripts
 */
function configurarTriggers() {
  try {
    // Eliminar triggers existentes para evitar duplicados
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(t => {
      if (t.getHandlerFunction() === 'motorCausacionInteres') {
        ScriptApp.deleteTrigger(t);
      }
    });

    // Crear nuevo trigger: Diario a la 1:00 AM
    ScriptApp.newTrigger('motorCausacionInteres')
      .timeBased()
      .everyDays(1)
      .atHour(1)
      .create();

    Logger.log('Trigger configurado correctamente');
    return { status: 'success', message: 'Trigger configurado correctamente (Diario 1:00 AM)' };
  } catch (error) {
    Logger.log('Error al configurar trigger: ' + error.message);
    return { status: 'error', message: 'Error al configurar trigger: ' + error.message };
  }
}

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
    
    // 2. Calcular total recaudado en Actividades
    let totalActividades = 0;
    if (actividades.status === 'success' && actividades.data) {
        totalActividades = actividades.data.reduce((sum, a) => 
            sum + Number(a.monto_generado || 0), 0
        );
    }
    
    // 3. Calcular Préstamos y sus Intereses
    let capitalPrestado = 0;
    let interesesPagados = 0;
    
    if (prestamos.status === 'success' && prestamos.data) {
      prestamos.data.forEach(p => {
        const estado = String(p.estado || '').trim().toUpperCase();
        if (estado === 'PAGADO') {
          interesesPagados += Number(p.interes_generado || 0);
        } else {
          // Si no está pagado, el capital sigue "en la calle"
          capitalPrestado += Number(p.monto_prestado || 0);
        }
      });
    }

    // 4. Totales Finales
    // Total Ganancias = Actividades + Intereses Cobrados
    const totalGanancias = totalActividades + interesesPagados;
    
    // Dinero Disponible = (Aportado + Ganancias) - Lo que está prestado
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
        interesesPagados,
        totalIntereses: interesesPagados, // Alias para compatibilidad
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

/**
 * Inicializa la base de datos creando las hojas necesarias
 * @returns {Object} Resultado de la operación
 */
function inicializarBaseDatos() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const mensajes = [];
    
    // Definir encabezados para cada hoja
    const hojas = {
      'Usuarios': ['id', 'email', 'password_hash', 'nombre', 'rol', 'created_at'],
      'Participantes': ['id', 'nombre', 'cedula', 'telefono', 'email', 'total_aportado', 'ganancias_acumuladas', 'activo', 'fecha_ingreso', 'dia_pago_acordado', 'mora_por_dia', 'frecuencia_pago', 'config_pago'],
      'Aportes': ['id', 'participante_id', 'monto', 'fecha', 'concepto', 'comprobante', 'created_at', 'dias_retraso', 'monto_mora'],
      'Actividades': ['id', 'nombre', 'descripcion', 'monto_generado', 'fecha', 'responsable', 'estado', 'created_at'],
      'Prestamos': ['id', 'participante_id', 'monto_prestado', 'tasa_interes', 'fecha_prestamo', 'fecha_vencimiento', 'interes_generado', 'saldo_pendiente', 'estado', 'created_at', 'fiador_id'],
      'Movimientos_Prestamos': ['id', 'prestamo_id', 'fecha', 'tipo', 'monto', 'saldo_resultante_capital', 'saldo_resultante_interes', 'created_at'], // NUEVA TABLA
      'Pagos_Intereses': ['id', 'prestamo_id', 'monto_interes', 'fecha_pago', 'estado', 'created_at'], // (Legacy) Se mantendrá por compatibilidad histórica
      'Ganancias_Distribuidas': ['id', 'participante_id', 'actividad_id', 'monto_ganancia', 'fecha_distribucion', 'tipo', 'created_at'],
      'Ciclos': ['id', 'nombre', 'fecha_inicio', 'fecha_cierre', 'total_recaudado', 'total_ganancias', 'total_intereses', 'estado', 'created_at'],
      'Polla_Numeros': ['id_participante', 'numero', 'fecha_asignacion', 'pagado'],
      'Polla_Sorteos': ['id', 'fecha', 'numero_ganador', 'id_ganador', 'monto_total', 'estado', 'created_at'],
      'Config': ['clave', 'valor', 'descripcion']
    };
    
    // Crear o verificar cada hoja
    Object.keys(hojas).forEach(nombreHoja => {
      let sheet = ss.getSheetByName(nombreHoja);
      
      if (!sheet) {
        sheet = ss.insertSheet(nombreHoja);
        sheet.getRange(1, 1, 1, hojas[nombreHoja].length).setValues([hojas[nombreHoja]]);
        sheet.setFrozenRows(1);
        mensajes.push(`Hoja '${nombreHoja}' creada`);
        
        // Valores iniciales para Config
        if (nombreHoja === 'Config') {
          sheet.appendRow(['APORTE_MINIMO', '30000', 'Monto mínimo mensual de aporte']);
          sheet.appendRow(['MORA_DIARIA', '3000', 'Valor de la mora por cada día de retraso']);
          sheet.appendRow(['DIAS_PAGO', '15,30', 'Días hábiles para pago sin mora (separados por coma)']);
        }
      } else {
        // Verificar si faltan columnas y agregarlas (Migración suave - NO DESTRUCTIVA)
        const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const targetHeaders = hojas[nombreHoja];
        
        targetHeaders.forEach((header, index) => {
          if (!currentHeaders.includes(header)) {
            // Agregar al final
            sheet.getRange(1, currentHeaders.length + 1).setValue(header);
            currentHeaders.push(header); // Actualizar lista local para siguientes iteraciones
            mensajes.push(`Columna '${header}' agregada a la hoja '${nombreHoja}'`);
          }
        });
        mensajes.push(`Hoja '${nombreHoja}' verificada`);
      }
    });
    
    // Crear usuario admin por defecto si no existe
    const usuarios = getData(HOJAS.USUARIOS);
    if (usuarios.status === 'success' && usuarios.data.length === 0) {
      const sheetUsuarios = ss.getSheetByName(HOJAS.USUARIOS);
      sheetUsuarios.appendRow([
        'ID-ADMIN',
        'admin@natillera.com',
        'admin123',
        'Administrador',
        'admin',
        new Date()
      ]);
      mensajes.push('Usuario admin creado (email: admin@natillera.com, password: admin123)');
    }
    
    return {
      status: 'success',
      message: 'Base de datos inicializada',
      detalles: mensajes
    };
    
  } catch (error) {
    return {
      status: 'error',
      message: `Error al inicializar base de datos: ${error.message}`
    };
  }
}

/**
 * FUNCIÓN DE EMERGENCIA - Úsala si los nuevos campos no aparecen en la grilla
 * Esta función actualiza los encabezados de las hojas sin borrar datos.
 */
function corregirBaseDatos() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hojas = {
    'Participantes': ['id', 'nombre', 'cedula', 'telefono', 'email', 'total_aportado', 'ganancias_acumuladas', 'activo', 'fecha_ingreso', 'dia_pago_acordado', 'mora_por_dia', 'frecuencia_pago', 'config_pago'],
    'Aportes': ['id', 'participante_id', 'monto', 'fecha', 'concepto', 'comprobante', 'created_at', 'dias_retraso', 'monto_mora'],
    'Prestamos': ['id', 'participante_id', 'monto_prestado', 'tasa_interes', 'fecha_prestamo', 'fecha_vencimiento', 'interes_generado', 'saldo_pendiente', 'estado', 'created_at', 'fiador_id']
  };

  const resultados = [];

  Object.keys(hojas).forEach(nombreHoja => {
    const sheet = ss.getSheetByName(nombreHoja);
    if (sheet) {
      const headersActuales = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const nuevosHeaders = hojas[nombreHoja];
      
      // Solo actualizamos si faltan columnas
      nuevosHeaders.forEach(header => {
         if (!headersActuales.includes(header)) {
             sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
             resultados.push(`✅ Columna '${header}' agregada a '${nombreHoja}'.`);
         }
      });
    }
  });

  return { status: 'success', detalles: resultados };
}

function testCorregirBaseDatos() {
  const res = corregirBaseDatos();
  Logger.log(JSON.stringify(res));
}

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

/**
 * Resetea la base de datos (borra todos los datos excepto encabezados)
 */
function resetBaseDatos() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const mensajes = [];
    
    // Obtenemos todas las claves de las hojas para iterar
    Object.keys(HOJAS).forEach(key => {
      const nombreHoja = HOJAS[key];
      const sheet = ss.getSheetByName(nombreHoja);
      
      if (sheet) {
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          // Eliminamos desde la fila 2 hasta la última fila
          sheet.deleteRows(2, lastRow - 1);
          mensajes.push(`Hoja '${nombreHoja}' reseteada: ${lastRow - 1} filas eliminadas`);
        } else {
          mensajes.push(`Hoja '${nombreHoja}' ya estaba vacía`);
        }
      }
    });

    return { 
      status: 'success', 
      message: 'Base de datos reseteada correctamente. Todos los datos han sido eliminados manteniendo los encabezados.',
      detalles: mensajes
    };
    
  } catch (error) {
    return { status: 'error', message: `Error al resetear base de datos: ${error.message}` };
  }
}

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

/**
 * FUNCIÓN PARA FORZAR LA SOLICITUD DE PERMISOS DE ESCRITURA
 * Ejecuta esta función manualmente desde el editor
 */
function testPermissions() {
  Logger.log('Probando permisos de ESCRITURA...');
  
  // 1. Permiso de Hoja de Cálculo
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('Hoja: ' + ss.getName());
  
  // 2. Permiso de Drive (Crear archivo para forzar scope de escritura)
  const folder = DriveApp.getRootFolder();
  const file = folder.createFile('prueba_permisos_natisystem.txt', 'Si lees esto, los permisos funcionan.');
  Logger.log('Archivo creado: ' + file.getUrl());
  
  // Limpieza
  file.setTrashed(true);
  
  return '¡EXITO! Permisos de ESCRITURA Otorgados Correctamente.';
}

/**
 * Se asegura que la hoja Aportes tenga la columna "estado"
 */
function ensureAportesHeader() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(HOJAS.APORTES);
    if (!sheet) return;

    if (sheet.getLastColumn() > 0) {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const lowerHeaders = headers.map(h => String(h).toLowerCase().trim());
      
      if (!lowerHeaders.includes('estado')) {
        sheet.getRange(1, headers.length + 1).setValue('estado');
      }
    } else {
        // Hoja vacía
        sheet.getRange(1, 10).setValue('estado');
    }
  } catch (e) {
    Logger.log('Error asegurando headers: ' + e.message);
  }
}

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
      
      const targetSorteoId = data.sorteo_id;
      const esAcumulado = String(data.numero_ganador).toUpperCase() === 'ACUMULADO';
      const ganadorNum = esAcumulado ? 'ACUMULADO' : parseInt(data.numero_ganador);
      
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

      // 2. Calcular Recaudo y marcar ganadores en Polla_Numeros
      let totalRecaudo = 0;
      let ganadorId = 'ACUMULADO';

      if (sheetNumeros) {
        const dataNums = sheetNumeros.getDataRange().getValues();
        for (let i = 1; i < dataNums.length; i++) {
          if (String(dataNums[i][4]) === String(targetSorteoId)) {
            const estadoPolla = String(dataNums[i][5]).toUpperCase();
            const pagado = dataNums[i][3]; // Col D (index 3)
            
            if (estadoPolla === 'PAGADO' || pagado === true || pagado === 'TRUE') {
              totalRecaudo += valorNumero;
              
              // Solo buscar ganador si NO es un cierre por acumulado (traslado al fondo)
              if (!esAcumulado && parseInt(dataNums[i][1]) === ganadorNum) {
                ganadorId = dataNums[i][0]; // Col A (index 0)
                sheetNumeros.getRange(i + 1, 6).setValue('GANADOR'); // Col F (index 5 -> Column 6)
              }
            }
          }
        }
      }
      
      // 3. ARCHIVAR EN EL HISTORIAL (Polla_Sorteos)
      sheetSorteos.appendRow([
        targetSorteoId,
        fechaSorteo,
        ganadorNum,
        ganadorId,
        totalRecaudo,
        ganadorId === 'ACUMULADO' ? 'ACUMULADO' : 'GANADO',
        new Date()
      ]);
      
      // 4. Eliminar de Polla_Config
      sheetConfig.deleteRow(configRowIndex);
      
      return { 
          status: 'success', 
          message: `Sorteo ${targetSorteoId} cerrado. Ganador: ${ganadorId}. Recaudo: ${totalRecaudo}` 
      };

    } catch (e) {
      return { status: 'error', message: 'Error en registro manual: ' + e.message };
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

/**
 * MIGRACION Y SETUP POLLA
 */
function setupPolla() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 1. Polla Sorteos (Historial corregido)
    if (!ss.getSheetByName(HOJAS.POLLA_SORTEOS)) {
        const s = ss.insertSheet(HOJAS.POLLA_SORTEOS);
        s.appendRow(['id', 'fecha', 'numero_ganador', 'id_ganador', 'monto_total', 'estado', 'created_at']);
    }

    // 2. Polla Numeros (Alineado con captura: A=id_part, B=num, C=fecha_asig, D=pagado, E=sorteo_id, F=estado, G=url, H=fecha_solic)
    if (!ss.getSheetByName(HOJAS.POLLA_NUMEROS)) {
        const n = ss.insertSheet(HOJAS.POLLA_NUMEROS);
        n.appendRow(['id_participante', 'numero', 'fecha_asignacion', 'pagado', 'sorteo_id', 'estado_polla', 'comprobante_url', 'fecha_solicitud']);
    }

    // 3. Polla Config (Estructura Horizontal)
    if (!ss.getSheetByName(HOJAS.POLLA_CONFIG)) {
        const c = ss.insertSheet(HOJAS.POLLA_CONFIG);
        c.appendRow(['id_sorteo_activo', 'valor_numero', 'fecha_juego', 'descripcion_tema']);
    }

    return { status: 'success', message: 'Hojas de Polla verificadas' };
}

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
 * Configura los triggers automáticos de la Polla (Placeholder Logic)
 */
function configurarTriggersPolla() {
  return { status: 'success', message: 'Triggers de Polla configurados' };
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

