Implementación de Flujo de Aprobación de Aportes
1. Problema Actual

Actualmente, cuando un participante registra un aporte desde su interfaz:

El sistema lo marca automáticamente como APROBADO.

El aporte impacta inmediatamente:

El saldo de la natillera.

La distribución de ganancias.

La contabilidad interna.

No existe validación previa contra la consignación bancaria.

Esto genera riesgo financiero y falta de control administrativo.

2. Objetivo

Implementar un flujo de validación en dos pasos, donde:

Registrar un aporte NO significa que el dinero esté confirmado.

El dinero solo debe afectar el sistema cuando un administrador lo valide manualmente.

3. Nueva Lógica Requerida
3.1 Registro del Aporte (Interfaz del Participante)

Cuando el participante crea un aporte:

El estado inicial debe ser: PENDIENTE

No debe afectar:

El saldo total de la natillera.

La distribución de ganancias.

Los reportes financieros reales.

Solo debe crear un registro pendiente de validación.

3.2 Panel Administrativo (Validación)

En el panel administrativo debe existir una columna:

Estado

PENDIENTE

APROBADO

RECHAZADO

Acciones disponibles para el administrador:

✅ Aprobar

❌ Rechazar

(Opcional) Ver comprobante de pago

4. Lógica de Aprobación
Cuando el administrador presiona "Aprobar":

El sistema debe:

Cambiar estado a APROBADO

Registrar:

fecha_aprobacion

aprobado_por

Impactar:

El saldo real de la natillera

El cálculo de ganancias

La contabilidad interna

Cuando el administrador presiona "Rechazar":

Cambiar estado a RECHAZADO

No afectar ningún cálculo financiero

Permitir notificación al participante

5. Regla Crítica del Sistema

Ningún aporte en estado diferente a APROBADO puede afectar:

Saldo

Ganancias

Distribución

Reportes financieros

Contabilidad

Esta regla debe aplicarse a nivel de lógica de negocio, no solo visualmente.

6. Estructura Técnica Sugerida
Modelo: Aporte
id
participante_id
monto
mora
total
concepto
estado (pendiente | aprobado | rechazado)
fecha_creacion
fecha_aprobacion
aprobado_por

Regla para cálculos financieros
SELECT * FROM aportes
WHERE estado = 'aprobado';


Solo los aportes aprobados deben incluirse en cálculos y reportes.

7. Mejoras Recomendadas

Filtro en panel admin: “Ver solo pendientes”

Indicador visual fuerte en amarillo para PENDIENTE

Historial de aprobaciones

Bitácora de acciones (auditoría)

8. Resultado Esperado

Con esta implementación se logra:

Control financiero real

Validación contra banco antes de contabilizar

Transparencia

Trazabilidad

Profesionalización del sistema