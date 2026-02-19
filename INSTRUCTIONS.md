# ¡Corrección Definitiva de Saldos!

He implementado un mecanismo de **Auto-Corrección** para los saldos.

**El problema:**
Antes, el sistema solo "sumaba" cada vez que aprobabas algo. Si borrabas una fila en Excel o cambiabas un valor manualmente, el saldo total no se enteraba y quedaba desfasado.

**La Solución:**
He cambiado la lógica interna (`Code.gs`).
Ahora, cada vez que **Apruebas** o **Rechazas** un aporte:
1.  El sistema va a la hoja de Excel.
2.  Busca TODOS los aportes marcados como "APROBADO" de esa persona.
3.  Los suma uno a uno.
4.  Reemplaza el "Saldo Total" con esa suma exacta.

**Beneficio:**
- Si alguna vez tienes un saldo incorrecto, simplemente aprueba o rechaza cualquier aporte (nuevo o viejo), y el sistema **recalculará y corregirá automáticamente todo el historial** de esa persona.
- Ya no importa si borraste filas manualmente antes; el sistema se ajustará solo.

**Prueba:**
Prueba rechazar un aporte o aprobar uno nuevo. Verás que el saldo se ajusta perfectamente a la realidad de la hoja.
