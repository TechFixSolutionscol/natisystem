Metodología de trabajo — MUY IMPORTANTE:
Vamos a construir esto de forma incremental, paso a paso. No implementes todo de una vez. Espera mi confirmación después de cada paso antes de continuar con el siguiente.
El orden de implementación será exactamente el siguiente:

Migración de columnas en Polla_Numeros + Inicializar Config de la Polla
Nuevas funciones GET en GAS
Nuevas funciones POST en GAS
Motor de verificación y procesamiento del sorteo
Scraping y triggers automáticos
Interfaz del participante en la consulta externa
Sección Gestión Polla en el panel admin
Tarjeta de configuración en el módulo Ajustes

Después de implementar cada paso debes:

Explicarme exactamente qué agregaste y en qué archivo
Decirme cómo probarlo antes de continuar
Esperar mi confirmación de que funciona antes de pasar al siguiente paso

Si en algún paso detectas que algo del código existente necesita ajustarse para que la integración funcione, primero avísame y explícame el ajuste antes de hacerlo. No toques nada existente sin mi aprobación explícita.

Contexto del proyecto:
Tengo un sistema de natillera colombiana ya funcionando con HTML, CSS, JavaScript en el frontend y Google Apps Script (GAS) como backend, conectado a Google Sheets como base de datos. El sistema ya tiene módulos completos para participantes, aportes, préstamos, ciclos, polla básica, y una interfaz de consulta externa por cédula. Regla absoluta: no modificar, renombrar ni eliminar ninguna función, hoja o interfaz existente. Solo crear cosas nuevas que se integren con lo que ya existe.

ESTRUCTURA EXISTENTE QUE DEBES CONOCER Y RESPETAR
Hojas existentes relevantes:

Polla_Numeros: columnas actuales id_participante | numero | fecha_asignacion | pagado
Polla_Sorteos: columnas actuales id | fecha | numero_ganador | id_ganador | monto_total | estado | created_at
Config: columnas clave | valor | descripcion — actualmente vacía, lista para usar
Participantes: contiene id | nombre | cedula | telefono | email | total_aportado | ganancias_acumuladas | activo | ...
Actividades: contiene id | nombre | descripcion | monto_generado | fecha | responsable | estado | created_at

Funciones existentes que NO debes tocar:
getPollaData(), asignarNumeroPolla(), marcarPagoPolla(), registrarSorteoPolla(), calcularDistribucionGanancias(), registrarAporteExterno(), saveFileToDrive(), agregarAporte(), getConfig(), updateConfig(), generateId(), getData(), executeWithLock()
Objeto HOJAS existente: ya tiene POLLA_NUMEROS: "Polla_Numeros" y POLLA_SORTEOS: "Polla_Sorteos" y CONFIG: "Config"
Constante existente: FOLDER_ID_COMPROBANTES ya está definida y apunta a la carpeta de Drive para comprobantes. Reutilízala para los comprobantes de la polla.

PASO 1 — MIGRACIÓN SUAVE DE COLUMNAS EN Polla_Numeros
Crea la función migrarPollaNumerosV2() que agregue estas columnas al final de Polla_Numeros solo si no existen ya, nunca reordenar ni tocar las existentes:
sorteo_id | estado_polla | comprobante_url | fecha_solicitud | nombre_participante
El campo estado_polla puede tener los valores: PENDIENTE, PAGADO, RECHAZADO, GANADOR. Se usa estado_polla como nombre para no colisionar con cualquier uso previo de estado o pagado.

PASO 2 — INICIALIZAR CONFIGURACIÓN DE LA POLLA
Crea la función inicializarConfigPolla() que inserte en la hoja Config las siguientes claves solo si no existen ya (verificar antes de insertar):
ClaveValor por defectoDescripciónPOLLA_VALOR_NUMERO10000Valor en COP que paga cada participante por su númeroPOLLA_RANGO_MIN0Número mínimo disponible (00)POLLA_RANGO_MAX99Número máximo disponible (99)EMAIL_ADMIN``Correo del administrador para notificaciones de la polla
En todas las funciones nuevas de la polla, leer estos valores siempre desde getConfig() que ya existe y nunca hardcodearlos. Si una clave no existe, usar el valor por defecto indicado como fallback.

PASO 3 — NUEVAS FUNCIONES GET EN GAS
Crea estas funciones y agrégalas al switch de doGet existente con sus acciones:
getPollaSorteoActivo() — acción GET: getPollaSorteoActivo
Busca en Polla_Sorteos el registro con estado ACTIVO. Retorna { id, fecha, monto_bolsa, valor_por_numero, estado }. Si no hay ninguno retorna { data: null }.
getPollaNumerosPorSorteo(sorteo_id) — acción GET: getPollaNumerosPorSorteo, parámetro: sorteo_id
Filtra Polla_Numeros por sorteo_id. Enriquece cada registro con el nombre del participante buscándolo en Participantes por id_participante. Retorna la lista completa para que el admin vea el estado de todos los números de ese sorteo.
getNumeroDisponiblePolla(sorteo_id, numero) — acción GET: getNumeroDisponiblePolla, parámetros: sorteo_id, numero
Verifica si el número está libre para ese sorteo: que no exista en Polla_Numeros un registro con ese sorteo_id y ese numero con estado_polla igual a PENDIENTE o PAGADO. Retorna { disponible: true/false }.

PASO 4 — NUEVAS FUNCIONES POST EN GAS
Crea estas funciones y agrégalas al switch de doPost existente:
solicitarNumeroPolla(data) — acción POST: solicitarNumeroPolla
Parámetros: { cedula, numero, sorteo_id, fileData, fileName, mimeType }
Lógica paso a paso:

Buscar participante por cédula en Participantes igual que hace registrarAporteExterno()
Leer POLLA_RANGO_MIN y POLLA_RANGO_MAX desde getConfig() y validar que el número esté dentro del rango
Verificar que el número no esté ocupado en ese sorteo llamando internamente a la lógica de getNumeroDisponiblePolla
Verificar que ese participante no tenga ya un número en ese mismo sorteo_id con estado PENDIENTE o PAGADO
El comprobante es obligatorio. Guardar en Drive usando exactamente saveFileToDrive() que ya existe, pasando FOLDER_ID_COMPROBANTES como carpeta
Hacer appendRow en Polla_Numeros con: id_participante, numero, fecha_actual, false, sorteo_id, PENDIENTE, url_comprobante, fecha_actual, nombre_participante
Leer EMAIL_ADMIN desde getConfig() y enviar correo con GmailApp.sendEmail() avisando que hay una solicitud nueva. Si EMAIL_ADMIN está vacío, usar Session.getActiveUser().getEmail() como fallback
Retornar { status: 'success', message: 'Solicitud enviada, pendiente de aprobación' }

aprobarNumeroPolla(data) — acción POST: aprobarNumeroPolla
Parámetros: { id_participante, sorteo_id }
Busca en Polla_Numeros el registro que tenga ese id_participante y ese sorteo_id. Cambia estado_polla a PAGADO y pagado a true (para mantener compatibilidad con getPollaData() existente). Busca el email del participante en Participantes y envía correo de confirmación con su número y la fecha del sorteo.
rechazarNumeroPolla(data) — acción POST: rechazarNumeroPolla
Parámetros: { id_participante, sorteo_id }
Busca el registro, cambia estado_polla a RECHAZADO y pagado a false. Envía correo al participante indicando que su solicitud fue rechazada y que puede intentar con otro número.
crearSorteoPolla(data) — acción POST: crearSorteoPolla
Parámetros: { fecha, monto_bolsa }
Valida que no exista ya un sorteo con estado ACTIVO en Polla_Sorteos. Lee POLLA_VALOR_NUMERO desde getConfig() y lo guarda como valor_por_numero. Crea el registro en Polla_Sorteos con estado ACTIVO usando generateId(). El monto_total se calculará dinámicamente al procesar el resultado (números vendidos × valor_por_numero), no al crear el sorteo.
registrarResultadoManualPolla(data) — acción POST: registrarResultadoManualPolla
Parámetros: { sorteo_id, numero_resultado }
Llama internamente a verificarYProcesarSorteo(sorteo_id, numero_resultado) descrita en el Paso 5.

PASO 5 — MOTOR DE VERIFICACIÓN Y PROCESAMIENTO DEL SORTEO
Crea la función verificarYProcesarSorteo(sorteo_id, numeroGanador):

Formatear numeroGanador con padStart(2, '0')
Verificar que el sorteo no haya sido procesado ya (estado distinto de ACTIVO). Si ya fue procesado, retornar sin hacer nada
Leer POLLA_VALOR_NUMERO desde getConfig()
Contar cuántos registros en Polla_Numeros tienen ese sorteo_id con estado_polla === 'PAGADO' — ese es el total de participantes que pagaron
Calcular monto_total = participantes_pagados × POLLA_VALOR_NUMERO
Buscar en Polla_Numeros si existe un registro con ese sorteo_id, ese numero y estado_polla === 'PAGADO'

Si hay ganador:

Cambiar su estado_polla a GANADOR en Polla_Numeros
Actualizar en Polla_Sorteos: numero_ganador, id_ganador, monto_total, estado: 'GANADO'
Buscar email del ganador en Participantes y enviar correo de felicitación con monto ganado
Enviar correo resumen al admin

Si no hay ganador:

Registrar en Actividades con: nombre: "Polla Acumulada - FECHA_SORTEO", descripcion: "Sorteo Lotería Medellín número XX - Sin ganador", monto_generado: monto_total, fecha: fecha_sorteo, responsable: 'SISTEMA', estado: 'FINALIZADA' — exactamente el mismo patrón que usa registrarSorteoPolla() existente
Actualizar en Polla_Sorteos: numero_ganador con el número del resultado, id_ganador: 'ACUMULADO', monto_total, estado: 'ACUMULADO'
Llamar calcularDistribucionGanancias() que ya existe
Enviar correo al admin con resumen

En ambos casos: marcar el sorteo en Polla_Sorteos con estado final (GANADO o ACUMULADO). El próximo sorteo deberá crearse manualmente por el admin.

PASO 6 — SCRAPING AUTOMÁTICO Y TRIGGERS
Función de scraping obtenerResultadoLoteriaMedellin():
Usar UrlFetchApp.fetch('https://loteriasdehoy.co/loteria-de-medellin') dentro de un try/catch. El HTML de esa página tiene el resultado en texto plano con este patrón exacto:
4547 serie 178
Donde 4547 es el número ganador de 4 cifras. Para extraer las últimas 2 cifras usar esta regex sobre el HTML:
javascriptconst match = html.match(/(\d{4})\s+serie\s+\d+/);
if (match) {
  const ultimasDos = match[1].slice(-2); // "47"
}
Si el primer sitio falla, intentar como fallback con https://resultadodelaloteria.com/colombia/loteria-de-medellin usando una regex similar buscando el número de 4 cifras antes de "serie". Si ambos fallan, retornar null.
Adicionalmente verificar que el resultado sea del viernes actual comparando que la página mencione la fecha de hoy antes de extraer el número. Si la fecha no coincide, retornar null para evitar procesar un resultado viejo.
Función trigger verificarResultadoPollaTrigger():

Buscar sorteo activo con getPollaSorteoActivo(). Si no hay, terminar silenciosamente con Logger.log
Verificar que la fecha del sorteo activo coincida con la fecha de hoy. Si no coincide, terminar silenciosamente
Llamar obtenerResultadoLoteriaMedellin()
Si obtiene resultado: llamar verificarYProcesarSorteo(sorteo_id, resultado)
Si no obtiene resultado: leer EMAIL_ADMIN desde getConfig() y enviar correo de alerta al admin con asunto "⚠️ ALERTA: No se pudo verificar el sorteo de la polla automáticamente" indicando que debe ingresar el resultado manualmente desde el panel admin

Función configurarTriggersPolla() — acción POST: configurarTriggersPolla:

Elimina triggers previos que apunten a verificarResultadoPollaTrigger y a recordatorioPollaTrigger para evitar duplicados, usando el mismo patrón que configurarTriggers() existente
Crea trigger diario a las 23:30 para verificarResultadoPollaTrigger — el trigger corre todos los días pero la función internamente solo actúa si hoy es el día del sorteo activo
Crea trigger diario a las 09:00 para recordatorioPollaTrigger

Función recordatorioPollaTrigger():
Verifica si mañana hay un sorteo activo en Polla_Sorteos. Si lo hay, filtra en Polla_Numeros los participantes con estado_polla === 'PAGADO' para ese sorteo, obtiene sus emails desde Participantes, y envía correo individual a cada uno recordándoles el sorteo del día siguiente, su número asignado y el monto de la bolsa.

PASO 7 — INTERFAZ DEL PARTICIPANTE (frontend consulta externa)
En la página de consulta externa donde el socio ingresa su cédula, agregar una nueva sección debajo de la información de aportes existente, sin tocar nada de lo que ya está. Título: "🎟️ Participar en La Polla Loca". Seguir exactamente el mismo estilo visual de la página existente.
La sección debe:

Al cargar, llamar getPollaSorteoActivo. Si hay sorteo activo mostrar: fecha del sorteo, valor por número (leído de POLLA_VALOR_NUMERO), y la sección de participación. Si no hay sorteo activo mostrar mensaje gris "No hay sorteo disponible en este momento"
Campo numérico para elegir número entre POLLA_RANGO_MIN y POLLA_RANGO_MAX, siempre mostrando 2 dígitos con cero a la izquierda
Al escribir o cambiar el número, hacer llamada a getNumeroDisponiblePolla y mostrar en tiempo real: ✅ verde "Número disponible" o ❌ rojo "Número ocupado, elige otro"
Campo para subir comprobante de pago, reutilizando el mismo componente visual y lógica que ya existe en la página para los aportes
Botón "Solicitar Número" que llame solicitarNumeroPolla. Deshabilitar el botón si el número está ocupado o si no hay comprobante subido
Al éxito mostrar mensaje de confirmación verde. Al error mostrar mensaje rojo descriptivo


PASO 8 — PANEL ADMIN: SECCIÓN GESTIÓN POLLA (frontend)
En el panel admin, agregar una nueva sección en el menú lateral llamada "La Polla Loca" siguiendo el mismo estilo visual del menú existente. No tocar ni mover las secciones actuales.
La sección debe contener:
Barra superior con tres botones:

"➕ Crear Sorteo": abre modal con campo fecha (date picker) y campo monto de bolsa. Al confirmar llama crearSorteoPolla
"🔢 Registrar Resultado Manual": abre modal con campo de 2 dígitos para ingresar el resultado. Al confirmar llama registrarResultadoManualPolla. Solo habilitado si hay sorteo activo
"⚙️ Activar Trigger Automático": llama configurarTriggersPolla. Muestra confirmación de éxito. Solo necesita ejecutarse una vez

Selector de sorteo: dropdown que lista todos los sorteos de Polla_Sorteos ordenados por fecha descendente. Al cambiar recarga la tabla
Tabla de participantes del sorteo seleccionado:
Columnas: Número | Nombre | Cédula | Estado (badge de color: amarillo PENDIENTE, verde PAGADO, rojo RECHAZADO, azul GANADOR) | Comprobante (link) | Acciones
Los botones "✅ Aprobar" y "❌ Rechazar" solo visibles cuando estado_polla === 'PENDIENTE'

PASO 9 — MÓDULO AJUSTES: CONFIGURACIÓN DE LA POLLA (frontend)
En el módulo de Ajustes que ya existe, agregar una nueva tarjeta debajo de las tarjetas existentes sin tocar nada de lo actual. Título: "⚙️ Configuración de La Polla Loca". Seguir exactamente el mismo estilo visual de las tarjetas existentes (mismos colores, botones azules de guardar).
La tarjeta debe contener:

Campo numérico "Valor por número (COP)" → clave POLLA_VALOR_NUMERO
Campo numérico "Número mínimo" → clave POLLA_RANGO_MIN
Campo numérico "Número máximo" → clave POLLA_RANGO_MAX
Campo email "Email del administrador (notificaciones)" → clave EMAIL_ADMIN
Botón azul "💾 Guardar Configuración de Polla" que llame updateConfig() con los cuatro valores

Al cargar el módulo de Ajustes, pre-poblar estos campos con los valores actuales de getConfig(). Si una clave no existe, mostrar el valor por defecto correspondiente.

RESTRICCIONES FINALES CRÍTICAS

Nunca modificar ninguna función existente listada al inicio
Todos los nombres de funciones nuevas deben ser distintos a los existentes
Todo appendRow nuevo va solo a las hojas correspondientes, nunca sobreescribir filas existentes de otras hojas
El scraping siempre en try/catch con fallback. Un fallo del scraping nunca debe romper el sistema ni lanzar excepciones no manejadas
Los triggers deben verificar primero si el sorteo ya fue procesado antes de actuar, para evitar doble ejecución si GAS dispara el trigger más de una vez
Al leer Config, siempre usar getConfig() que ya existe y nunca leer la hoja directamente
El monto de la bolsa siempre calcularse dinámicamente como participantes_con_estado_PAGADO × POLLA_VALOR_NUMERO al momento de procesar el sorteo, nunca como valor fijo hardcodeado