// SnakeSky — estado global (ATProto se añadirá después)

// Este archivo existe para que el juego cargue sin errores.
// Más adelante aquí añadiremos:
//
// - leer estado global desde ATProto
// - guardar estado global
// - reiniciar estado cuando muere
// - timestamp updatedAt
// - validación mínima
//
// Por ahora, solo dejamos funciones vacías para que game.js pueda llamarlas.

function loadGlobalState() {
  console.log("ATProto: loadGlobalState() aún no implementado.");
  return null;
}

function saveGlobalState(state) {
  console.log("ATProto: saveGlobalState() aún no implementado.", state);
}

console.log("state.js cargado (modo local).");
