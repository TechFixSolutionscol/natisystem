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
        result = getPollaData();
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
        result = asignarNumeroPolla(data);
        break;

      case 'registrarSorteoPolla':
        result = registrarSorteoPolla(data);
        break;
      
      case 'marcarPagoPolla':
        result = marcarPagoPolla(data);
        break;

      case 'modificarVencimientoPrestamo':
        result = modificarVencimientoPrestamo(data);
        break;

      case 'registrarPagoPrestamo':
        result = registrarPagoPrestamo(data);
        break;
        
      case 'updateConfig':
        result = updateConfig(data);
        break;

      case 'verificarMultas':
        result = verificarYAplicarMultas();
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
      const newRow = [
        newId,
        data.participante_id,
        monto,
        new Date(data.fecha),
        data.concepto,
        data.comprobante || '',
        new Date(), // created_at
        data.dias_retraso || 0,
        data.monto_mora || 0
      ];
      
      sheetAportes.appendRow(newRow);
      
      // Actualizar total_aportado del participante
      actualizarTotalAportado(data.participante_id, monto);
      
      return { 
        status: 'success', 
        message: 'Aporte registrado exitosamente',
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
 */
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
      telefono: pInfo.telefono
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
  
  const dataConNombres = prestamos.data.map(p => {
    const participante = participantes.data.find(part => part.id === p.participante_id);
    return {
      ...p,
      participante: participante ? participante.nombre : 'Desconocido',
      telefono: participante ? participante.telefono : ''
    };
  });
  
  return {
    status: 'success',
    data: dataConNombres
  };
}

/**
 * Actualiza el total aportado de un participante
 * @param {string} participanteId - ID del participante
 * @param {number} monto - Monto a sumar
 */
function actualizarTotalAportado(participanteId, monto) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(HOJAS.PARTICIPANTES);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === participanteId) {
        const totalActual = Number(data[i][5]) || 0;
        sheet.getRange(i + 1, 6).setValue(totalActual + monto);
        break;
      }
    }
  } catch (error) {
    Logger.log(`Error al actualizar total aportado: ${error.message}`);
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
 * Crea un nuevo préstamo
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
      
      // Calcular interés simple
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
        new Date() // created_at
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
 */
function calcularDistribucionGanancias() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 1. Calcular total intereses generados (TODOS LOS PRÉSTAMOS: ACTIVO, VENCIDO, PAGADO)
    const prestamos = getData(HOJAS.PRESTAMOS);
    let totalIntereses = 0;
    if (prestamos.status === 'success' && prestamos.data) {
      totalIntereses = prestamos.data.reduce((sum, p) => {
        // Incluir intereses de todos los préstamos, no solo los pagados
        return sum + Number(p.interes_generado || 0);
      }, 0);
    }
    
    // 2. Calcular total actividades
    const actividades = getData(HOJAS.ACTIVIDADES);
    let totalActividades = 0;
    if (actividades.status === 'success' && actividades.data) {
      totalActividades = actividades.data.reduce((sum, a) => 
        sum + Number(a.monto_generado || 0), 0
      );
    }
    
    const gananciaTotal = totalIntereses + totalActividades;
    
    // 3. Obtener participantes
    const sheetParticipantes = ss.getSheetByName(HOJAS.PARTICIPANTES);
    const dataParticipantes = sheetParticipantes.getDataRange().getValues();
    // Headers: id, nombre, cedula, telefono, email, total_aportado, ganancias, activo, fecha
    
    // Índices (basados en inicializarBaseDatos)
    // 0: id, 6: ganancias_acumuladas, 7: activo
    
    // Contar TODOS los participantes (no solo activos)
    const totalParticipantes = dataParticipantes.length - 1; // -1 para excluir header
    
    if (totalParticipantes === 0) {
        return { status: 'success', message: 'No hay participantes registrados' };
    }
    
    // IMPORTANTE: Dividir entre TODOS los participantes, no solo los activos
    const gananciaPorPersona = Number((gananciaTotal / totalParticipantes).toFixed(2));
    const sheetGanancias = ss.getSheetByName(HOJAS.GANANCIAS);
    
    // 4. LIMPIEZA AGRESIVA: Eliminar TODO excepto el encabezado y las ganancias de POLLA
    // Este enfoque garantiza que no queden distribuciones antiguas
    const rowsG = sheetGanancias.getDataRange().getValues();
    
    if (rowsG.length > 1) {
        const header = rowsG[0]; // Guardar encabezado
        
        // Filtrar SOLO las ganancias de POLLA (premios individuales)
        const pollaEntries = [];
        for (let i = 1; i < rowsG.length; i++) {
            const tipo = String(rowsG[i][5] || '').trim().toUpperCase();
            // Mantener solo POLLA, eliminar TODO lo demás (DISTRIBUCION y cualquier otra cosa)
            if (tipo === 'POLLA') {
                pollaEntries.push(rowsG[i]);
            }
        }
        
        // Limpiar COMPLETAMENTE la hoja
        sheetGanancias.clearContents();
        sheetGanancias.clearFormats();
        
        // Reescribir: primero el encabezado
        sheetGanancias.getRange(1, 1, 1, header.length).setValues([header]);
        
        // Luego las entradas de POLLA (si existen)
        if (pollaEntries.length > 0) {
            sheetGanancias.getRange(2, 1, pollaEntries.length, pollaEntries[0].length).setValues(pollaEntries);
        }
    }

    const fechaDist = new Date();
    
    // 5. Aplicar nuevas distribuciones a TODOS los participantes (activos e inactivos)
    // Ahora agregamos las nuevas distribuciones a la hoja limpia
    for (let i = 1; i < dataParticipantes.length; i++) {
        const pId = dataParticipantes[i][0];
        
        // Distribuir a TODOS, sin importar si están activos o inactivos
        sheetGanancias.appendRow([
            generateId(),
            pId,
            'DIST-' + generateId().split('-')[1],
            gananciaPorPersona,
            fechaDist,
            'DISTRIBUCION',
            new Date()
        ]);
    }

    // Finalmente, actualizamos la tabla de participantes sumando TODO su historial de ganancias
    // Las ganancias de POLLA son individuales y se suman solo al ganador
    // Las ganancias de DISTRIBUCION son equitativas y se suman a todos los activos
    const actualizadasG = sheetGanancias.getDataRange().getValues();
    const mapGanancias = {};
    
    for (let j = 1; j < actualizadasG.length; j++) {
        const pId = actualizadasG[j][1];
        const monto = Number(actualizadasG[j][3] || 0);
        // Sumar TODAS las ganancias (DISTRIBUCION + POLLA) para cada participante
        mapGanancias[pId] = (mapGanancias[pId] || 0) + monto;
    }

    for (let i = 1; i < dataParticipantes.length; i++) {
        const pId = dataParticipantes[i][0];
        const totalGanado = mapGanancias[pId] || 0;
        sheetParticipantes.getRange(i + 1, 7).setValue(totalGanado);
    }
    
    return {
        status: 'success', 
        message: 'Ganancias redistribuidas correctamente (reparto equitativo entre TODOS los participantes)',
        data: {
            totalIntereses,
            totalActividades,
            gananciaTotal,
            totalParticipantes: totalParticipantes,
            gananciaPorPersona
        }
    };
    
  } catch (error) {
    return { status: 'error', message: `Error al calcular ganancias: ${error.message}` };
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
      'Prestamos': ['id', 'participante_id', 'monto_prestado', 'tasa_interes', 'fecha_prestamo', 'fecha_vencimiento', 'interes_generado', 'saldo_pendiente', 'estado', 'created_at'],
      'Pagos_Intereses': ['id', 'prestamo_id', 'monto_interes', 'fecha_pago', 'estado', 'created_at'],
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
        // Verificar si faltan columnas y agregarlas (Migración suave)
        const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const targetHeaders = hojas[nombreHoja];
        
        targetHeaders.forEach((header, index) => {
          if (!currentHeaders.includes(header)) {
            sheet.getRange(1, currentHeaders.length + 1).setValue(header);
            currentHeaders.push(header);
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
    'Participantes': ['id', 'nombre', 'cedula', 'telefono', 'email', 'total_aportado', 'ganancias_acumuladas', 'activo', 'fecha_ingreso', 'dia_pago_acordado', 'mora_por_dia'],
    'Aportes': ['id', 'participante_id', 'monto', 'fecha', 'concepto', 'comprobante', 'created_at', 'dias_retraso', 'monto_mora']
  };

  const resultados = [];

  Object.keys(hojas).forEach(nombreHoja => {
    const sheet = ss.getSheetByName(nombreHoja);
    if (sheet) {
      const headersActuales = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const nuevosHeaders = hojas[nombreHoja];
      
      // Solo actualizamos si faltan columnas
      if (headersActuales.length < nuevosHeaders.length) {
        sheet.getRange(1, 1, 1, nuevosHeaders.length).setValues([nuevosHeaders]);
        resultados.push(`✅ Hoja '${nombreHoja}' actualizada con nuevos encabezados.`);
      } else {
        resultados.push(`ℹ️ Hoja '${nombreHoja}' ya tiene los encabezados completos.`);
      }
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
// GESTIÓN DE LA POLLA LOCA
// ==========================================

/**
 * Obtiene los números asignados y sorteos recientes
 */
function getPollaData() {
  try {
    const numeros = getData(HOJAS.POLLA_NUMEROS);
    const sorteos = getData(HOJAS.POLLA_SORTEOS);
    const participantes = getData(HOJAS.PARTICIPANTES);

    // Enriquecer números con nombres de participantes
    let numerosData = [];
    if (numeros.status === 'success' && participantes.status === 'success') {
      const pMap = {};
      participantes.data.forEach(p => pMap[p.id] = p.nombre);
      
      numeros.data.forEach(n => {
        numerosData.push({
          ...n,
          participante: pMap[n.id_participante] || 'Desconocido',
          pagado: n.pagado === true || String(n.pagado).toUpperCase() === 'TRUE'
        });
      });
    }

    return {
      status: 'success',
      data: {
        numeros: numerosData,
        sorteos: sorteos.status === 'success' ? sorteos.data : []
      }
    };
  } catch (error) {
    return { status: 'error', message: `Error al obtener datos de la polla: ${error.message}` };
  }
}

/**
 * Asigna un número a un participante
 */
function asignarNumeroPolla(data) {
  try {
    const { participante_id, numero } = data;
    if (!participante_id || numero === undefined) {
      return { status: 'error', message: 'Datos incompletos' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(HOJAS.POLLA_NUMEROS);
    
    // Asegurar encabezado 'pagado'
    sheet.getRange(1, 4).setValue('pagado');
    
    const rows = sheet.getDataRange().getValues();

    // Validar que el número no esté ocupado
    for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][1]) === String(numero)) {
            return { status: 'error', message: `El número ${numero} ya fue asignado` };
        }
    }

    // Si el participante ya tenía un número, actualizarlo; si no, crear nuevo
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === participante_id) {
            rowIndex = i + 1;
            break;
        }
    }

    if (rowIndex !== -1) {
        sheet.getRange(rowIndex, 2).setValue(numero);
        sheet.getRange(rowIndex, 3).setValue(new Date());
        sheet.getRange(rowIndex, 4).setValue(false); // Reiniciar pago al reasignar
    } else {
        sheet.appendRow([participante_id, numero, new Date(), false]);
    }

    return { status: 'success', message: 'Número asignado correctamente' };
} catch (error) {
    return { status: 'error', message: `Error al asignar número: ${error.message}` };
}
}

/**
* Marca el estado de pago de un número de la polla
*/
function marcarPagoPolla(data) {
try {
    const { participante_id, numero, pagado } = data;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(HOJAS.POLLA_NUMEROS);
    
    // Asegurar encabezado 'pagado'
    sheet.getRange(1, 4).setValue('pagado');
    
    const rows = sheet.getDataRange().getValues();
    
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
        const idEnBD = String(rows[i][0]).trim();
        const numEnBD = parseInt(rows[i][1], 10);
        const idRecibido = String(participante_id).trim();
        const numRecibido = parseInt(numero, 10);

        if (idEnBD === idRecibido && numEnBD === numRecibido) {
            rowIndex = i + 1;
            break;
        }
    }
    
    if (rowIndex !== -1) {
        sheet.getRange(rowIndex, 4).setValue(pagado);
        return { status: 'success', message: 'Estado de pago actualizado' };
    }
    
    return { status: 'error', message: 'Registro no encontrado' };
} catch (error) {
    return { status: 'error', message: `Error al marcar pago: ${error.message}` };
}
}

/**
 * Registra el resultado de un sorteo
 */
function registrarSorteoPolla(data) {
  try {
    const { fecha, numero } = data;
    const numeroGanador = String(numero).padStart(2, '0');
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetSorteos = ss.getSheetByName(HOJAS.POLLA_SORTEOS);
    const sheetNumeros = ss.getSheetByName(HOJAS.POLLA_NUMEROS);
    const sheetParticipantes = ss.getSheetByName(HOJAS.PARTICIPANTES);

    // 1. Obtener participantes activos para calcular el pozo
    const participantes = getData(HOJAS.PARTICIPANTES);
    if (participantes.status !== 'success') return participantes;
    
    const activos = participantes.data.filter(p => p.activo === true || String(p.activo).toUpperCase() === 'TRUE');
    const totalActivos = activos.length;
    const montoPozo = totalActivos * 10000;

    // 2. Buscar ganador en Polla_Numeros
    const numerosData = sheetNumeros.getDataRange().getValues();
    let idGanador = '';
    let nombreGanador = '';

    for (let i = 1; i < numerosData.length; i++) {
      if (String(numerosData[i][1]).padStart(2, '0') === numeroGanador) {
        idGanador = numerosData[i][0];
        // Buscar nombre
        const p = activos.find(pa => pa.id === idGanador);
        nombreGanador = p ? p.nombre : 'Ganador Desconocido';
        break;
      }
    }

    let mensaje = '';
    let estado = 'GANADO';

    if (idGanador) {
      mensaje = `¡Tenemos un ganador! ${nombreGanador} con el número ${numeroGanador}. Se lleva ${formatCurrency(montoPozo)}`;
      
      // Registrar ganancia individual en Ganancias_Distribuidas
      const sheetGanancias = ss.getSheetByName(HOJAS.GANANCIAS);
      sheetGanancias.appendRow([
        generateId(),
        idGanador,
        'POLLA-' + generateId().split('-')[1],
        montoPozo,
        new Date(fecha),
        'POLLA',
        new Date()
      ]);
      
      // Actualizar saldo en hoja Participantes (sumar al valor actual)
      const rowsP = sheetParticipantes.getDataRange().getValues();
      for (let i = 1; i < rowsP.length; i++) {
        if (rowsP[i][0] === idGanador) {
          const actual = Number(rowsP[i][6] || 0);
          sheetParticipantes.getRange(i + 1, 7).setValue(actual + montoPozo);
          break;
        }
      }
    } else {
      mensaje = `No hubo ganadores para el número ${numeroGanador}. Se acumula ${formatCurrency(montoPozo)} para ganancias generales.`;
      idGanador = 'ACUMULADO';
      estado = 'ACUMULADO';

      // 3. Registrar como actividad (Fondo de Ganancias)
      const sheetActividades = ss.getSheetByName(HOJAS.ACTIVIDADES);
      sheetActividades.appendRow([
        generateId(),
        `Polla Acumulada - ${fecha}`,
        `Sorteo Lotería Medellín con número ${numeroGanador}`,
        montoPozo,
        new Date(fecha),
        'SISTEMA',
        'FINALIZADA',
        new Date()
      ]);
    }
    // 4. Registrar sorteo
    sheetSorteos.appendRow([
      generateId(),
      new Date(fecha),
      numeroGanador,
      idGanador,
      montoPozo,
      estado,
      new Date()
    ]);

    // 5. LIMPIEZA: Borrar todos los números asignados para el próximo sorteo
    // Solo si el sorteo fue registrado exitosamente
    const lastRow = sheetNumeros.getLastRow();
    if (lastRow > 1) {
      sheetNumeros.deleteRows(2, lastRow - 1);
    }

    return { 
      status: 'success', 
      message: mensaje,
      idGanador: idGanador,
      monto: montoPozo
    };

  } catch (error) {
    return { status: 'error', message: `Error al registrar sorteo: ${error.message}` };
  }
}

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

/**
 * Escanea a todos los participantes y aplica multas de $3.000 COP
 * si no han cumplido con su compromiso de pago individual.
 * Se recomienda programar este script para ejecución diaria (Triggers).
 */
function verificarYAplicarMultas() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const participantes = getData(HOJAS.PARTICIPANTES);
    if (participantes.status !== 'success') return participantes;
    
    const aportes = getData(HOJAS.APORTES);
    let totalMultasAplicadas = 0;
    
    participantes.data.forEach(p => {
      if (!(p.activo === true || p.activo === 'true' || p.activo === 'TRUE')) return;
      
      const pId = p.id;
      const frecuencia = (p.frecuencia_pago || 'MENSUAL').toString().toUpperCase();
      const config = (p.config_pago || '15').toString();
      const diaActual = hoy.getDate();
      const mesActual = hoy.getMonth();
      const anioActual = hoy.getFullYear();
      
      let esDiaLimite = false;
      let periodoInicio, periodoFin;
      
      // Determinar si hoy es el día siguiente al límite acordado
      // La multa se aplica el día después de que venció el plazo.
      
      if (frecuencia === 'MENSUAL') {
        const diaLimite = parseInt(config);
        if (diaActual === diaLimite + 1) {
          esDiaLimite = true;
          periodoInicio = new Date(anioActual, mesActual, 1);
          periodoFin = new Date(anioActual, mesActual + 1, 0);
        }
      } else if (frecuencia === 'QUINCENAL') {
        const dias = config.split(',').map(d => parseInt(d.trim()));
        dias.forEach(diaLimite => {
          if (diaActual === diaLimite + 1) {
            esDiaLimite = true;
            if (diaLimite < 15) {
              periodoInicio = new Date(anioActual, mesActual, 1);
              periodoFin = new Date(anioActual, mesActual, 15);
            } else {
              periodoInicio = new Date(anioActual, mesActual, 16);
              periodoFin = new Date(anioActual, mesActual + 1, 0);
            }
          }
        });
      } else if (frecuencia === 'SEMANAL') {
        // config espera día de la semana 0-6 (0=Domingo)
        const diaSemanaLimite = parseInt(config);
        const hoyDiaSemana = hoy.getDay();
        if (hoyDiaSemana === (diaSemanaLimite + 1) % 7) {
          esDiaLimite = true;
          periodoInicio = new Date(hoy);
          periodoInicio.setDate(hoy.getDate() - 7);
          periodoFin = new Date(hoy);
          periodoFin.setDate(hoy.getDate() - 1);
        }
      }
      
      if (esDiaLimite) {
        // Verificar si ya tiene un aporte en este periodo
        const yaPago = aportes.data.some(a => {
          if (a.participante_id !== pId) return false;
          const fechaAporte = new Date(a.fecha);
          return fechaAporte >= periodoInicio && fechaAporte <= periodoFin && Number(a.monto) > 0;
        });
        
        // Verificar si ya se le aplicó la multa hoy
        const multaYaAplicada = aportes.data.some(a => {
          if (a.participante_id !== pId) return false;
          const fechaAporte = new Date(a.fecha);
          fechaAporte.setHours(0,0,0,0);
          return fechaAporte.getTime() === hoy.getTime() && a.concepto === 'MULTA POR RETRASO';
        });
        
        if (!yaPago && !multaYaAplicada) {
          aplicarMulta(pId, hoy);
          totalMultasAplicadas++;
        }
      }
    });
    
    return {
      status: 'success',
      message: `Proceso completado. Multas aplicadas: ${totalMultasAplicadas}`
    };
    
  } catch (error) {
    return { status: 'error', message: `Error en verificarYAplicarMultas: ${error.message}` };
  }
}

/**
 * Aplica una multa a un participante específico
 */
function aplicarMulta(participanteId, fecha) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const montoMulta = 3000;
  const idMulta = generateId();
  
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
  
  // 2. Registrar como ACTIVIDAD para que se reparta equitativamente
  const sheetActividades = ss.getSheetByName(HOJAS.ACTIVIDADES);
  sheetActividades.appendRow([
    generateId(),
    'Multa por Retraso - ' + fecha.toLocaleDateString('es-CO'),
    'Multa aplicada automáticamente por incumplimiento de pago',
    montoMulta,
    fecha,
    'SISTEMA',
    'FINALIZADA',
    new Date()
  ]);
  
  // 3. Actualizar totales del participante
  actualizarTotalAportado(participanteId, -montoMulta);
  
  // 4. Forzar recalcular ganancias
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
