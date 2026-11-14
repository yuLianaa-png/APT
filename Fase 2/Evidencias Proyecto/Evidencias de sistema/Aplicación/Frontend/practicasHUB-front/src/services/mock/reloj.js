/**
 * Reloj del sistema, sustituible.
 *
 * Todo el dominio recibe `ahora` desde fuera y nadie llama a `Date.now()` directamente.
 * Así la ventana de 24 h (RN-11) se puede verificar en segundos en lugar de esperar un
 * día: `avanzar(25 * 3600)` adelanta el reloj 25 horas.
 *
 * El desfase se guarda en memoria, no en localStorage: recargar la página devuelve el
 * reloj a la hora real, que es el comportamiento que se espera de una herramienta de
 * prueba.
 */

let desfaseMs = 0;

/** Instante actual del sistema, con el desfase aplicado. */
export const ahora = () => new Date(Date.now() + desfaseMs);

/** Instante actual en ISO 8601. */
export const ahoraISO = () => ahora().toISOString();

/** Adelanta el reloj. Acepta segundos; negativo lo atrasa. */
export const avanzar = (segundos) => {
  desfaseMs += Number(segundos) * 1000;
  return ahora();
};

/** Devuelve el reloj a la hora real. */
export const reiniciarReloj = () => {
  desfaseMs = 0;
  return ahora();
};

/** Desfase aplicado, en segundos. Útil para mostrarlo en la galería de desarrollo. */
export const desfaseSegundos = () => Math.round(desfaseMs / 1000);
