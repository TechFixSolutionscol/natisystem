// ============================================================
// NATILLERA - SETUP Y LANZAMIENTO DE BASE DE DATOS
// Archivo: DbSetup.gs
// ============================================================
//
// PROPÓSITO:
//   Consolida TODAS las funciones de inicialización, migración
//   y configuración de la base de datos en un solo lugar.
//   Úsate este archivo cada vez que:
//     - Lances el sistema por primera vez en un Google Sheet nuevo
//     - Necesites agregar una hoja o columna nueva al esquema
//     - Quieras configurar los triggers automáticos
//     - Hagas una nueva implementación del sistema
//
// CÓMO USAR (Primera vez):
//   1. Configura SPREADSHEET_ID en Code.gs
//   2. En el editor de Apps Script, selecciona "testInicializar"
//   3. Haz clic en ▶️ Ejecutar y autoriza permisos
//   4. Luego ejecuta "configurarTriggers" para activar el motor de interés
//   5. (Opcional) Ejecuta "setupPolla" para activar el módulo de Polla
//
// CÓMO AGREGAR UNA NUEVA HOJA O COLUMNA:
//   - Agrega la hoja/columnas al objeto `hojas` dentro de inicializarBaseDatos()
//   - Ejecuta testInicializar() → detecta automáticamente qué falta y lo crea
//   - No borra datos existentes (migración suave)
//
// ⚠️ IMPORTANTE: En Google Apps Script todos los archivos .gs
//   del mismo proyecto comparten el scope global. Las funciones
//   aquí definidas son visibles directamente desde Code.gs.
// ============================================================


// ============================================================
// FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
// ============================================================

/**
 * Inicializa la base de datos creando las hojas necesarias.
 * Si las hojas ya existen, verifica y agrega columnas nuevas
 * sin borrar datos (migración suave - NO DESTRUCTIVA).
 *
 * FUENTE DE VERDAD DEL ESQUEMA: Edita los arrays de columnas
 * aquí para agregar nuevas columnas al sistema.
 *
 * @returns {Object} Resultado con status y lista de acciones realizadas
 */
function inicializarBaseDatos() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const mensajes = [];

    // ══════════════════════════════════════════════════
    // ESQUEMA COMPLETO DE LA BASE DE DATOS
    // Agrega nuevas columnas aquí y ejecuta testInicializar()
    // ══════════════════════════════════════════════════
    const hojas = {
      'Usuarios': [
        'id', 'email', 'password_hash', 'nombre', 'rol', 'created_at'
      ],
      'Participantes': [
        'id', 'nombre', 'cedula', 'telefono', 'email',
        'total_aportado', 'ganancias_acumuladas', 'activo', 'fecha_ingreso',
        'dia_pago_acordado', 'mora_por_dia', 'frecuencia_pago', 'config_pago',
        'porcentaje_participacion'
      ],
      'Aportes': [
        'id', 'participante_id', 'monto', 'fecha', 'concepto',
        'comprobante', 'created_at', 'dias_retraso', 'monto_mora', 'estado'
      ],
      'Actividades': [
        'id', 'nombre', 'descripcion', 'monto_generado', 'fecha',
        'responsable', 'estado', 'created_at'
      ],
      'Prestamos': [
        'id', 'participante_id', 'monto_prestado', 'tasa_interes',
        'fecha_prestamo', 'fecha_vencimiento', 'interes_generado',
        'saldo_pendiente', 'estado', 'created_at', 'fiador_id'
      ],
      'Movimientos_Prestamos': [
        'id', 'prestamo_id', 'fecha', 'tipo', 'monto',
        'saldo_resultante_capital', 'saldo_resultante_interes', 'created_at'
      ],
      'Pagos_Intereses': [
        // Legacy: se mantiene por compatibilidad con registros históricos
        'id', 'prestamo_id', 'monto_interes', 'fecha_pago', 'estado', 'created_at'
      ],
      'Ganancias_Distribuidas': [
        'id', 'participante_id', 'actividad_id', 'monto_ganancia',
        'fecha_distribucion', 'tipo', 'created_at'
      ],
      'Ciclos': [
        'id', 'nombre', 'fecha_inicio', 'fecha_cierre', 'total_recaudado',
        'total_ganancias', 'total_intereses', 'estado', 'created_at'
      ],
      'Polla_Numeros': [
        'id_participante', 'numero', 'fecha_asignacion', 'pagado',
        'sorteo_id', 'estado_polla', 'comprobante_url', 'fecha_solicitud'
      ],
      'Polla_Sorteos': [
        'id', 'fecha', 'numero_ganador', 'id_ganador',
        'monto_total', 'estado', 'created_at'
      ],
      'Polla_Config': [
        'id_sorteo_activo', 'valor_numero', 'fecha_juego', 'descripcion_tema'
      ],
      'Config': [
        'clave', 'valor', 'descripcion'
      ]
    };

    // Crear o verificar cada hoja
    Object.keys(hojas).forEach(nombreHoja => {
      let sheet = ss.getSheetByName(nombreHoja);

      if (!sheet) {
        // Hoja nueva: crear con encabezados
        sheet = ss.insertSheet(nombreHoja);
        sheet.getRange(1, 1, 1, hojas[nombreHoja].length).setValues([hojas[nombreHoja]]);
        sheet.setFrozenRows(1);
        mensajes.push(`✅ Hoja '${nombreHoja}' creada`);

        // Valores iniciales para Config
        if (nombreHoja === 'Config') {
          sheet.appendRow(['APORTE_MINIMO',        '30000',    'Monto mínimo mensual de aporte']);
          sheet.appendRow(['MORA_DIARIA',           '3000',     'Valor de la mora por cada día de retraso']);
          sheet.appendRow(['DIAS_PAGO',             '15,30',    'Días hábiles para pago sin mora (separados por coma)']);
          sheet.appendRow(['METODO_DISTRIBUCION',   'EQUITATIVA','Método de distribución de ganancias: EQUITATIVA, PROPORCIONAL o MANUAL']);
          mensajes.push(`   → Valores iniciales de Config insertados`);
        }

      } else {
        // Hoja existente: verificar si faltan columnas y agregarlas
        const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const targetHeaders = hojas[nombreHoja];
        let columnaAgregada = false;

        targetHeaders.forEach(header => {
          if (!currentHeaders.includes(header)) {
            sheet.getRange(1, currentHeaders.length + 1).setValue(header);
            currentHeaders.push(header); // Actualizar lista local
            mensajes.push(`➕ Columna '${header}' agregada a '${nombreHoja}'`);
            columnaAgregada = true;
          }
        });

        if (!columnaAgregada) {
          mensajes.push(`☑️  Hoja '${nombreHoja}' verificada (sin cambios)`);
        }
      }
    });

    // Crear usuario admin por defecto si no existe ningún usuario
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
      mensajes.push('👤 Usuario admin creado  →  email: admin@natillera.com  |  password: admin123');
    }

    return {
      status: 'success',
      message: 'Base de datos inicializada correctamente',
      detalles: mensajes
    };

  } catch (error) {
    return {
      status: 'error',
      message: `Error al inicializar base de datos: ${error.message}`
    };
  }
}


// ============================================================
// FUNCIONES DE CORRECCIÓN Y MIGRACIÓN
// ============================================================

/**
 * FUNCIÓN DE EMERGENCIA - Úsala si nuevos campos no aparecen en la grilla.
 * Actualiza los encabezados de las hojas sin borrar datos.
 * Equivalente a ejecutar inicializarBaseDatos() pero más liviana.
 */
function corregirBaseDatos() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hojas = {
    'Participantes': [
      'id', 'nombre', 'cedula', 'telefono', 'email',
      'total_aportado', 'ganancias_acumuladas', 'activo', 'fecha_ingreso',
      'dia_pago_acordado', 'mora_por_dia', 'frecuencia_pago', 'config_pago',
      'porcentaje_participacion'
    ],
    'Aportes': [
      'id', 'participante_id', 'monto', 'fecha', 'concepto',
      'comprobante', 'created_at', 'dias_retraso', 'monto_mora', 'estado'
    ],
    'Prestamos': [
      'id', 'participante_id', 'monto_prestado', 'tasa_interes',
      'fecha_prestamo', 'fecha_vencimiento', 'interes_generado',
      'saldo_pendiente', 'estado', 'created_at', 'fiador_id'
    ]
  };

  const resultados = [];

  Object.keys(hojas).forEach(nombreHoja => {
    const sheet = ss.getSheetByName(nombreHoja);
    if (sheet) {
      const headersActuales = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const nuevosHeaders = hojas[nombreHoja];

      nuevosHeaders.forEach(header => {
        if (!headersActuales.includes(header)) {
          sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
          resultados.push(`✅ Columna '${header}' agregada a '${nombreHoja}'`);
        }
      });
    }
  });

  if (resultados.length === 0) {
    resultados.push('☑️  Todas las columnas ya estaban correctas. No se realizaron cambios.');
  }

  return { status: 'success', detalles: resultados };
}

/**
 * Actualiza el esquema de distribución de ganancias.
 * Asegura que existan la config METODO_DISTRIBUCION y la columna
 * porcentaje_participacion en Participantes.
 * (Migración: fue agregada en versión posterior al lanzamiento inicial)
 */
function actualizarEsquemaDistribucion() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // 1. Verificar Configuración Global
  const sheetConfig = ss.getSheetByName(HOJAS.CONFIG);
  if (sheetConfig) {
    const data = sheetConfig.getDataRange().getValues();
    const existeMetodo = data.some(row => row[0] === 'METODO_DISTRIBUCION');
    if (!existeMetodo) {
      sheetConfig.appendRow(['METODO_DISTRIBUCION', 'EQUITATIVA', 'Método de distribución: EQUITATIVA, PROPORCIONAL o MANUAL']);
      Logger.log('✅ Config METODO_DISTRIBUCION agregada');
    }
  }

  // 2. Verificar Columna en Participantes (Para método Manual)
  const sheetParticipantes = ss.getSheetByName(HOJAS.PARTICIPANTES);
  if (sheetParticipantes) {
    const headers = sheetParticipantes.getRange(1, 1, 1, sheetParticipantes.getLastColumn()).getValues()[0];
    if (!headers.includes('porcentaje_participacion')) {
      const lastCol = sheetParticipantes.getLastColumn();
      sheetParticipantes.getRange(1, lastCol + 1).setValue('porcentaje_participacion');
      Logger.log('✅ Columna porcentaje_participacion agregada a Participantes');
    }
  }

  return { status: 'success', message: 'Esquema de distribución actualizado' };
}

/**
 * Se asegura que la hoja Aportes tenga la columna "estado".
 * (Migración: fue agregada para el flujo de aprobación de aportes externos)
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
        Logger.log('✅ Columna estado agregada a Aportes');
      }
    } else {
      // Hoja vacía: poner estado en columna 10 (posición esperada)
      sheet.getRange(1, 10).setValue('estado');
    }
  } catch (e) {
    Logger.log('Error asegurando headers de Aportes: ' + e.message);
  }
}

/**
 * MIGRACIÓN Y SETUP DEL MÓDULO POLLA LOCA.
 * Crea las hojas de la Polla si no existen con el esquema correcto.
 * Ejecutar cuando se activa el módulo de Polla por primera vez.
 */
function setupPolla() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const mensajes = [];

  // 1. Polla_Sorteos (Historial de sorteos)
  if (!ss.getSheetByName(HOJAS.POLLA_SORTEOS)) {
    const s = ss.insertSheet(HOJAS.POLLA_SORTEOS);
    s.appendRow(['id', 'fecha', 'numero_ganador', 'id_ganador', 'monto_total', 'estado', 'created_at']);
    mensajes.push(`✅ Hoja '${HOJAS.POLLA_SORTEOS}' creada`);
  } else {
    mensajes.push(`☑️  Hoja '${HOJAS.POLLA_SORTEOS}' ya existe`);
  }

  // 2. Polla_Numeros (A=id_part, B=num, C=fecha_asig, D=pagado, E=sorteo_id, F=estado, G=url, H=fecha_solic)
  if (!ss.getSheetByName(HOJAS.POLLA_NUMEROS)) {
    const n = ss.insertSheet(HOJAS.POLLA_NUMEROS);
    n.appendRow(['id_participante', 'numero', 'fecha_asignacion', 'pagado', 'sorteo_id', 'estado_polla', 'comprobante_url', 'fecha_solicitud']);
    mensajes.push(`✅ Hoja '${HOJAS.POLLA_NUMEROS}' creada`);
  } else {
    mensajes.push(`☑️  Hoja '${HOJAS.POLLA_NUMEROS}' ya existe`);
  }

  // 3. Polla_Config (Estructura horizontal de configuración por sorteo)
  if (!ss.getSheetByName(HOJAS.POLLA_CONFIG)) {
    const c = ss.insertSheet(HOJAS.POLLA_CONFIG);
    c.appendRow(['id_sorteo_activo', 'valor_numero', 'fecha_juego', 'descripcion_tema']);
    mensajes.push(`✅ Hoja '${HOJAS.POLLA_CONFIG}' creada`);
  } else {
    mensajes.push(`☑️  Hoja '${HOJAS.POLLA_CONFIG}' ya existe`);
  }

  return { status: 'success', message: 'Hojas de Polla verificadas', detalles: mensajes };
}


// ============================================================
// RESET DE DATOS
// ============================================================

/**
 * Resetea la base de datos: borra todos los datos pero conserva encabezados.
 * ⚠️ OPERACIÓN DESTRUCTIVA - Úsala solo en entornos de prueba.
 */
function resetBaseDatos() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const mensajes = [];

    Object.keys(HOJAS).forEach(key => {
      const nombreHoja = HOJAS[key];
      const sheet = ss.getSheetByName(nombreHoja);

      if (sheet) {
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          sheet.deleteRows(2, lastRow - 1);
          mensajes.push(`🗑️  Hoja '${nombreHoja}': ${lastRow - 1} filas eliminadas`);
        } else {
          mensajes.push(`☑️  Hoja '${nombreHoja}' ya estaba vacía`);
        }
      }
    });

    return {
      status: 'success',
      message: 'Base de datos reseteada. Todos los datos eliminados (encabezados conservados).',
      detalles: mensajes
    };

  } catch (error) {
    return { status: 'error', message: `Error al resetear base de datos: ${error.message}` };
  }
}


// ============================================================
// CONFIGURACIÓN DE TRIGGERS AUTOMÁTICOS
// ============================================================

/**
 * Configura el trigger diario para el motor de causación de interés.
 * Ejecutar UNA SOLA VEZ desde el editor o desde el frontend (Admin → Configuración).
 * Si ya existe un trigger, lo elimina antes de crear el nuevo.
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

    Logger.log('✅ Trigger de motor de interés configurado: Diario 1:00 AM');
    return { status: 'success', message: 'Trigger configurado correctamente (Diario 1:00 AM)' };
  } catch (error) {
    Logger.log('Error al configurar trigger: ' + error.message);
    return { status: 'error', message: 'Error al configurar trigger: ' + error.message };
  }
}

/**
 * Configura los triggers automáticos del módulo Polla.
 * (Actualmente placeholder - expandir según sea necesario)
 */
function configurarTriggersPolla() {
  return { status: 'success', message: 'Triggers de Polla configurados' };
}


// ============================================================
// FUNCIONES DE PRUEBA - EJECUTAR DESDE EL EDITOR
// ============================================================

/**
 * PRUEBA PRINCIPAL DE LANZAMIENTO
 * Ejecuta esta función desde el editor de Apps Script para
 * inicializar la base de datos sin necesidad de usar la URL.
 *
 * Instrucciones:
 *   1. Selecciona "testInicializar" en el menú de funciones
 *   2. Haz clic en ▶️ Ejecutar
 *   3. Autoriza los permisos si te los pide
 *   4. Revisa los logs para ver el resultado
 */
function testInicializar() {
  Logger.log('=== INICIANDO PRUEBA DE INICIALIZACIÓN ===');

  // Verificar que el SPREADSHEET_ID esté configurado
  if (SPREADSHEET_ID === 'TU_ID_DE_GOOGLE_SHEET_AQUI') {
    Logger.log('❌ ERROR: Debes configurar el SPREADSHEET_ID en Code.gs');
    Logger.log('1. Abre tu Google Sheet');
    Logger.log('2. Copia el ID de la URL (entre /d/ y /edit)');
    Logger.log('3. Reemplaza "TU_ID_DE_GOOGLE_SHEET_AQUI" con tu ID');
    return;
  }

  Logger.log('SPREADSHEET_ID configurado: ' + SPREADSHEET_ID);

  const resultado = inicializarBaseDatos();

  Logger.log('=== RESULTADO ===');
  Logger.log('Status: ' + resultado.status);
  Logger.log('Mensaje: ' + resultado.message);

  if (resultado.detalles) {
    Logger.log('Detalles:');
    resultado.detalles.forEach(detalle => Logger.log('  ' + detalle));
  }

  if (resultado.status === 'success') {
    Logger.log('✅ ¡Base de datos inicializada correctamente!');
    Logger.log('Credenciales por defecto:');
    Logger.log('  Email: admin@natillera.com');
    Logger.log('  Password: admin123');
    Logger.log('');
    Logger.log('Próximos pasos:');
    Logger.log('  → Ejecuta "configurarTriggers" para activar el motor de interés');
    Logger.log('  → Ejecuta "setupPolla" si usas el módulo de Polla Loca');
  } else {
    Logger.log('❌ Error: ' + resultado.message);
  }
}

/**
 * PRUEBA - Verifica que el usuario admin existe y lista todos los usuarios.
 */
function testVerificarUsuarios() {
  Logger.log('=== VERIFICANDO USUARIOS ===');

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('✅ Spreadsheet abierto correctamente');

    const sheet = ss.getSheetByName(HOJAS.USUARIOS);
    if (!sheet) {
      Logger.log('❌ ERROR: La hoja "Usuarios" no existe. Ejecuta testInicializar primero.');
      return;
    }

    Logger.log('✅ Hoja "Usuarios" encontrada');

    const lastRow = sheet.getLastRow();
    Logger.log('Última fila con datos: ' + lastRow);

    if (lastRow < 2) {
      Logger.log('⚠️ ADVERTENCIA: La hoja solo tiene encabezados, no hay usuarios.');
      Logger.log('Ejecuta testInicializar para crear el usuario admin.');
      return;
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    Logger.log('Encabezados: ' + JSON.stringify(headers));

    const rows = data.slice(1);
    Logger.log('Total de usuarios: ' + rows.length);

    rows.forEach((row, index) => {
      Logger.log(`Usuario ${index + 1}:`);
      Logger.log('  ID: '     + row[0]);
      Logger.log('  Email: '  + row[1]);
      Logger.log('  Nombre: ' + row[3]);
      Logger.log('  Rol: '    + row[4]);
    });

    // Probar getData
    Logger.log('\n=== PROBANDO FUNCIÓN getData ===');
    const resultado = getData(HOJAS.USUARIOS);
    Logger.log('Status: ' + resultado.status);
    if (resultado.status === 'success') {
      Logger.log('Usuarios encontrados: ' + resultado.data.length);
    } else {
      Logger.log('Error: ' + resultado.message);
    }

  } catch (error) {
    Logger.log('❌ ERROR: ' + error.message);
    Logger.log('Stack: ' + error.stack);
  }
}

/**
 * PRUEBA - Ejecuta corregirBaseDatos() y muestra resultados en logs.
 */
function testCorregirBaseDatos() {
  Logger.log('=== CORRECCIÓN DE BASE DE DATOS ===');
  const res = corregirBaseDatos();
  Logger.log('Status: ' + res.status);
  if (res.detalles) {
    res.detalles.forEach(d => Logger.log('  ' + d));
  }
}

/**
 * PRUEBA - Fuerza la solicitud de permisos de escritura en Drive y Sheets.
 * Ejecutar manualmente desde el editor si el sistema no puede subir archivos.
 */
function testPermissions() {
  Logger.log('Probando permisos de ESCRITURA...');

  // 1. Permiso de Hoja de Cálculo
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('Hoja: ' + ss.getName());

  // 2. Permiso de Drive (Crear archivo temporal para forzar scope de escritura)
  const folder = DriveApp.getRootFolder();
  const file = folder.createFile('prueba_permisos_natisystem.txt', 'Si lees esto, los permisos funcionan.');
  Logger.log('Archivo creado: ' + file.getUrl());

  // Limpieza
  file.setTrashed(true);

  Logger.log('✅ ¡ÉXITO! Permisos de ESCRITURA otorgados correctamente.');
  return '¡ÉXITO! Permisos de ESCRITURA Otorgados Correctamente.';
}
