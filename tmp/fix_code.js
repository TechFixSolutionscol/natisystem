const fs = require('fs');
const path = 'f:/Natillera/natisystem/backend/Code.gs';

try {
    let content = fs.readFileSync(path, 'utf8');
    
    // Encontrar el inicio de la corrupción
    // Sabemos que getBingoMessages termina en line 4199 aprox
    const lines = content.split('\n');
    console.log('Total lines:', lines.length);
    
    // Mantener hasta la línea 4195 (cierre de getBingoMessages)
    // Buscamos la última llave de cierre de la función getBingoMessages
    let lastGoodLine = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].includes('return { status: "success", data: result };')) {
            lastGoodLine = i + 4; // Incluir la llave de cierre y catch/try
            break;
        }
    }
    
    if (lastGoodLine === -1) {
        console.error('No se pudo encontrar el punto de corte seguro.');
        process.exit(1);
    }
    
    const fixedLines = lines.slice(0, lastGoodLine + 1);
    let finalContent = fixedLines.join('\n');
    
    if (!finalContent.endsWith('}\n')) finalContent += '\n}\n';
    
    const newFunctions = `
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
`;
    
    fs.writeFileSync(path, finalContent + newFunctions, 'utf8');
    console.log('Archivo reparado y actualizado exitosamente.');
    
} catch (err) {
    console.error('Error procesando el archivo:', err);
}
