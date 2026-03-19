function getMisTablas(participanteId) {
  try {
    const tablas = getData(HOJAS.BINGO_TABLAS);
    if (tablas.status !== "success") return tablas;

    // Filtrar tablas del participante usando comparación robusta
    const misTablas = tablas.data.filter(t => String(t.participante_id) === String(participanteId));

    return { status: "success", data: misTablas };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
