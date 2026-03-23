/**
 * POLLA_AUTOMATION.GS
 * Módulo para el scraping automático de resultados y cierre de sorteos.
 */

/**
 * Función principal para ser ejecutada por un Trigger de tiempo (Sábados/Domingos).
 * Busca sorteos pendientes de la fecha y procesa sus resultados.
 */
function procesarSorteosPendientes() {
  Logger.log("Iniciando procesamiento automático de sorteos...");
  
  try {
    const sId = SPREADSHEET_ID;
    const ss = SpreadsheetApp.openById(sId);
    
    // 1. Obtener resultado de la lotería
    const resultadoLoteria = getResultadoLoteriaMedellin();
    if (!resultadoLoteria || !resultadoLoteria.numero) {
      Logger.log("No se pudo obtener el resultado de la lotería. Abortando.");
      return;
    }
    
    const numeroGanadorCompleto = resultadoLoteria.numero;
    const dosUltimasCifras = numeroGanadorCompleto.slice(-2);
    const fechaLoteriaString = resultadoLoteria.fecha; // El formato de SODA suele ser ISO
    const fechaLoteria = new Date(fechaLoteriaString);
    
    Logger.log(`Resultado Lotería: ${numeroGanadorCompleto} (Cifras Polla: ${dosUltimasCifras}) del día ${fechaLoteriaString}`);

    // 2. Buscar sorteos activos en Polla_Config
    const respSorteos = getPollaSorteoActivo();
    if (respSorteos.status !== 'success' || !respSorteos.data || respSorteos.data.length === 0) {
      Logger.log("No hay sorteos activos para procesar.");
      return;
    }

    const sorteosActivos = respSorteos.data;
    
    sorteosActivos.forEach(sorteo => {
      const fechaSorteo = new Date(sorteo.fecha);
      
      // VALIDACIÓN CRÍTICA: La fecha del sorteo en el sistema debe coincidir con la fecha del resultado de la lotería
      if (compareDatesOnly(fechaSorteo, fechaLoteria)) {
        Logger.log(`✅ Coincidencia de fecha encontrada. Cerrando sorteo: ${sorteo.tema} (${sorteo.id})`);
        procesarCierreAutomatico(sorteo, dosUltimasCifras, numeroGanadorCompleto);
      } else {
        Logger.log(`⏭️ Ignorando sorteo "${sorteo.tema}" (${formatDate(sorteo.fecha)}) porque no coincide con la fecha de la lotería (${formatDate(fechaLoteria)})`);
      }
    });

  } catch (error) {
    Logger.log("Error en procesarSorteosPendientes: " + error.message);
  }
}

/**
 * Obtiene el resultado de la Lotería de Medellín mediante la API SODA oficial.
 * Fuente definitiva: datos.gov.co (Dataset: 4w3i-wxax)
 */
function getResultadoLoteriaMedellin() {
  const DATASET_ID = '4w3i-wxax';
  // El error 400 reveló que las columnas técnicas son 'fecha' y 'n_mero'
  const url = `https://www.datos.gov.co/resource/${DATASET_ID}.json?$order=fecha DESC&$limit=1`;
  
  try {
    Logger.log("Consultando resultados oficiales en Datos Abiertos (SODA)...");
    const response = UrlFetchApp.fetch(url, { 
      muteHttpExceptions: true,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        
        // El dataset usa internamente: fecha, n_mero, serie, sorteo
        // Usamos item['n_mero'] por el carácter especial
        const numeroGanador = item.n_mero || item['n_mero'] || item.numero;
        
        if (numeroGanador) {
          Logger.log(`🎯 Resultado oficial obtenido: ${numeroGanador} (Serie: ${item.serie || 'N/A'}) del ${item.fecha}`);
          return {
            numero: String(numeroGanador).trim(),
            serie: String(item.serie || '').trim(),
            fecha: item.fecha,
            sorteo: item.sorteo,
            fuente: 'datos.gov.co',
            metodo: 'SODA Oficial'
          };
        }
      } else {
        Logger.log("⚠️ No se encontraron registros en el dataset SODA.");
      }
    } else {
      Logger.log(`⚠️ Error en SODA: Código ${response.getResponseCode()} - ${response.getContentText()}`);
    }
  } catch (e) {
    Logger.log(`❌ Error crítico consultando SODA: ${e.message}`);
  }
  
  return null;
}

/**
 * Procesa el cierre de un sorteo específico.
 */
function procesarCierreAutomatico(sorteo, numeroGanadorDosCifras, numeroCompleto) {
  try {
    Logger.log(`Procesando cierre para sorteo ${sorteo.id} con número ${numeroGanadorDosCifras}...`);
    
    // 1. Obtener números para verificar si hay ganadores (solo para el log de la automatización)
    const respNums = getPollaNumerosPorSorteo(sorteo.id);
    if (respNums.status !== 'success') {
      Logger.log("Error obteniendo números para el cierre.");
      return;
    }

    const numerosSorteo = respNums.data;
    const ganadores = numerosSorteo.filter(n => 
      String(n.numero).padStart(2, '0') === String(numeroGanadorDosCifras).padStart(2, '0') && 
      String(n.estado_polla).toUpperCase() === 'PAGADO'
    );

    const esAcumulado = ganadores.length === 0;
    const numeroFinal = esAcumulado ? 'ACUMULADO' : numeroGanadorDosCifras;

    Logger.log(esAcumulado ? "No se detectaron ganadores pagados. Se marcará como ACUMULADO." : `Se detectaron ${ganadores.length} ganador(es).`);

    // 2. Ejecutar el cierre centralizado en Code.gs
    // Esta función ahora maneja el Aporte al socio o el Traslado a Actividades automáticamente
    const resultCierre = registrarResultadoManualPolla({
      sorteo_id: sorteo.id,
      numero_ganador: numeroFinal,
      metodo_pago: 'AHORRO',
      comentario: `Cierre automático (Lotería: ${numeroCompleto})`
    });

    if (resultCierre.status === 'success') {
      Logger.log(`✅ Cierre exitoso: ${resultCierre.message}`);
      
      // 3. Notificaciones opcionales
      if (!esAcumulado) {
        const totalBolsa = resultCierre.recaudo || 0;
        ganadores.forEach(g => {
          enviarEmailGanador(g, totalBolsa / ganadores.length, sorteo, numeroCompleto);
        });
      }
    } else {
      Logger.log(`❌ Fallo en el cierre centralizado: ${resultCierre.message}`);
    }

  } catch (error) {
    Logger.log(`Error crítico en procesarCierreAutomatico ${sorteo.id}: ${error.message}`);
  }
}

/**
 * Calcula el total recaudado de los números pagados.
 */
function calcularTotalBolsa(numeros) {
  return numeros.reduce((sum, n) => {
    const estado = String(n.estado_polla || '').toUpperCase();
    const esPagado = n.pagado === true || n.pagado === 'TRUE' || estado === 'PAGADO';
    return esPagado ? sum + (Number(n.monto) || 0) : sum;
  }, 0);
}

/**
 * Traslada el dinero de la polla a la hoja de Actividades (Fondo).
 */
function trasladarBolsaAFondoActividades(sorteo, monto, numeroLoteria) {
  try {
    const dataActividad = {
      nombre: `Polla Loca - Traslado por Vacante`,
      descripcion: `Traslado de bolsa sorteo ${sorteo.tema} (${sorteo.id}). Número lotería: ${numeroLoteria}. Sin ganadores.`,
      monto_generado: monto,
      fecha: new Date().toISOString(),
      responsable: 'SISTEMA AUTOMÁTICO'
    };
    
    // Llamar a agregarActividad de Code.gs
    agregarActividad(dataActividad);
    Logger.log(`Se trasladaron ${monto} al fondo de actividades.`);
    
  } catch (e) {
    Logger.log("Error trasladando fondos: " + e.message);
  }
}

/**
 * Envía notificación por correo al ganador.
 */
function enviarEmailGanador(ganador, monto, sorteo, numeroReal) {
  try {
    const emailTo = ganador.email_participante || ""; // Necesitaríamos el email en el mapa o buscarlo
    if (!emailTo) {
      Logger.log("No hay correo para el ganador. Notificando solo al admin.");
    }

    const subject = `🏆 ¡Ganaste en La Polla Loca! - ${sorteo.tema}`;
    const body = `
      Hola ${ganador.nombre_participante},
      
      ¡Felicitaciones! Has ganado el sorteo de La Polla Loca correspondiente al ${new Date(sorteo.fecha).toLocaleDateString()}.
      
      Resultado Lotería de Medellín: ${numeroReal}
      Tu número ganador: ${ganador.numero}
      Premio acumulado: ${formatCurrency(monto)}
      
      El administrador se pondrá en contacto contigo pronto para la entrega del premio.
      
      ¡Gracias por participar!
      Natillera Sistema.
    `;

    // Intentar enviar con GmailApp si hay permisos
    if (emailTo) {
      GmailApp.sendEmail(emailTo, subject, body);
    }
    
    // Siempre avisar al admin (Configurado en la hoja config o quemado por ahora)
    // GmailApp.sendEmail("admin@ejemplo.com", "NOTIFICACIÓN GANADOR POLLA", body);
    
  } catch (e) {
    Logger.log("Error enviando correo: " + e.message);
  }
}

/**
 * Función para configurar el trigger automáticamente desde el código (opcional)
 */
function setupAutomationTrigger() {
  // Eliminar triggers previos para evitar duplicados
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'procesarSorteosPendientes') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Crear nuevo trigger para los viernes a las 11:30 PM
  ScriptApp.newTrigger('procesarSorteosPendientes')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.FRIDAY)
    .atHour(23)
    .nearMinute(30)
    .create();
    
  Logger.log("Trigger de automatización configurado el viernes a las 11:30 PM.");
}

/**
 * Compara dos objetos Date ignorando la hora.
 */
function compareDatesOnly(d1, d2) {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
