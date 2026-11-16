import { CLAVES_HEREDADAS } from './constants';

/**
 * Borra del navegador las claves que escribió el prototipo anterior.
 *
 * Aquellas pantallas guardaban las «actividades» y los códigos de vinculación
 * directamente en `localStorage`, con un modelo de datos que ya no existe: jornadas con
 * estado `APROBADO`, una sola práctica por estudiante, códigos sueltos sin grupo. Los
 * archivos que las escribían se borraron, pero **las claves siguen en el navegador de
 * quien usó aquella versión**, y nadie las limpia por sí solas.
 *
 * No afectan al funcionamiento —ningún código nuevo las lee— pero ocupan espacio y
 * confunden al depurar: ver `practicahub_actividades` en las herramientas del navegador
 * mientras se busca un problema de jornadas es una pista falsa garantizada.
 *
 * Es deliberadamente tonta y silenciosa: se ejecuta una vez al arrancar, no toca nada más
 * y no falla si el almacenamiento está bloqueado. Cuando pase un tiempo razonable desde
 * el cambio de modelo, esta función y `CLAVES_HEREDADAS` se pueden borrar.
 */
export const limpiarLegado = () => {
  if (typeof window === 'undefined') return [];

  const borradas = [];

  CLAVES_HEREDADAS.forEach((clave) => {
    try {
      if (window.localStorage.getItem(clave) !== null) {
        window.localStorage.removeItem(clave);
        borradas.push(clave);
      }
    } catch {
      // Ventana privada o almacenamiento bloqueado: no hay nada que limpiar.
    }
  });

  if (borradas.length > 0) {
    console.info(
      `[PrácticasHub] Se limpiaron ${borradas.length} claves del prototipo anterior: ${borradas.join(', ')}.`,
    );
  }

  return borradas;
};

export default limpiarLegado;
