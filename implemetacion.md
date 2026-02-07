MÓDULO DE PRÉSTAMOS – NATI SYSTEM

(NO DISRUPTIVO / SOLO PRÉSTAMOS / PRODUCCIÓN SEGURA)

0. CONTEXTO Y REGLA MADRE

Este desarrollo se realiza sobre Nati System, un sistema YA EN PRODUCCIÓN con datos reales.

🚨 REGLAS OBLIGATORIAS

❌ NO modificar columnas existentes

❌ NO renombrar tablas o campos

❌ NO alterar otros módulos

❌ NO rehacer lógica que ya funciona

✅ SOLO extender el módulo de préstamos

✅ TODO debe ser compatible hacia atrás

Si algo no es estrictamente necesario, NO se toca.

1. ESQUEMA ACTUAL (INTOCABLE)

Tabla prestamos (EXISTENTE):

id

participante_id

monto_prestado → Capital nominal

tasa_interes

fecha_prestamo

fecha_vencimiento

interes_generado → Interés DEVENGADO (NO ganancia)

saldo_pendiente → Capital + interés − pagos

estado → ACTIVO / MORA / PAGADO

created_at

⚠️ Estos campos NO se modifican ni conceptualmente ni estructuralmente.

2. PRINCIPIOS FINANCIEROS OBLIGATORIOS
2.1 Intereses

El interés NO es ganancia al generarse

El interés solo es ganancia cuando se paga

interes_generado = interés causado acumulado

2.2 Separación lógica (aunque no física)

El sistema debe manejar internamente:

Capital pendiente

Interés causado

Interés pagado (ganancia real)

Aunque solo existan:

interes_generado

saldo_pendiente

3. ESQUEMA COMPLETO DE ABONOS (OBLIGATORIO)
3.1 Abonos parciales al préstamo

El sistema debe permitir abonos en cualquier momento.

Regla automática de aplicación:

Primero se paga interes_generado

Luego se abona a capital (monto_prestado)

Ejemplo:

Capital pendiente: 100.000

Interés generado: 5.166

Abono: 20.000

Resultado:

5.166 → interés (ganancia ahora sí)

14.834 → capital

Nuevo saldo_pendiente: 85.332

4. NUEVA TABLA PERMITIDA (SIN ROMPER ESQUEMA)
prestamo_movimientos (NUEVA – COMPLEMENTARIA)

Esta tabla es CLAVE para auditoría y trazabilidad.

Campos mínimos:

id

prestamo_id

fecha

tipo

ABONO

PAGO_INTERES

AJUSTE

MULTA

valor

aplica_a

INTERES

CAPITAL

saldo_pendiente_resultante

created_at

⚠️ Esta tabla NO reemplaza prestamos, solo la respalda.

5. AUTOMATIZACIONES (ACTIVADORES POR TIEMPO)
5.1 Motor automático único

Debe existir UN SOLO activador diario, por ejemplo:

motorAutomaticoPrestamos()


Este motor puede ejecutar internamente:

5.2 Cálculo automático de intereses

Condiciones:

estado = ACTIVO o MORA

saldo_pendiente > 0

Acción:

Calcular interés diario o mensual

Sumar a interes_generado

Actualizar saldo_pendiente

❌ NO registrar ganancia
❌ NO tocar préstamos pagados

5.3 Cambio automático de estado

Si fecha_vencimiento < hoy

Y saldo_pendiente > 0
→ estado = MORA

5.4 Multas o mora automática (si aplica)

Solo para préstamos en MORA

Se registra como movimiento

Nunca como edición directa del préstamo

6. CIERRE DE PRÉSTAMOS (100% MANUAL)
🚨 Regla crítica

EL SISTEMA NUNCA CIERRA PRÉSTAMOS AUTOMÁTICAMENTE

6.1 Estado “listo para cierre” (lógico)

Cuando:

saldo_pendiente <= 0

Entonces:

NO se generan más intereses

NO se aplican multas

El préstamo queda pendiente de acción humana

6.2 Flujo de cierre manual

Usuario visualiza préstamo

Ve:

Saldo = 0

Indicador “Listo para cierre”

Usuario presiona Cerrar préstamo

Sistema valida:

saldo_pendiente == 0

Sistema:

Cambia estado = PAGADO

Registra evento de cierre

Congela el préstamo

7. POST-CIERRE (SEGURIDAD)

Después de cerrar:

❌ No intereses

❌ No abonos

❌ No ediciones

✅ Solo lectura

Reapertura:

Solo manual

Con registro de auditoría

8. RESTRICCIONES ABSOLUTAS

❌ No recalcular préstamos PAGADOS

❌ No generar interés con saldo cero

❌ No tocar otros módulos

❌ No cambiar estructura existente

9. OBJETIVO FINAL

El módulo de préstamos debe quedar:

Contablemente correcto

Con abonos parciales reales

Con intereses automáticos

Con mora controlada

Con cierre manual responsable

Sin romper datos históricos

10. REGLA FINAL (NO NEGOCIABLE)

El esquema actual es sagrado.
La lógica se agrega, no se reemplaza.