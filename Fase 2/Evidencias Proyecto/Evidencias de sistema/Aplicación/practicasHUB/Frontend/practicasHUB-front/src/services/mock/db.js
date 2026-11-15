/**
 * Almacén simulado del backend.
 *
 * Mantiene las colecciones en memoria y las persiste en `localStorage` bajo una clave
 * versionada. No sustituye al backend: su única razón de ser es que el frontend se pueda
 * construir y verificar entero mientras la API de Spring Boot no exista (RNF-06).
 *
 * Toda escritura pasa por `transaccion`, que guarda al terminar. Las lecturas devuelven
 * copias profundas para que una pantalla no pueda mutar el almacén por accidente.
 */

import { ahoraISO } from './reloj';
import { construirSemilla } from './semilla';

const CLAVE = 'practicashub_mock_v1';

/** Colecciones del almacén. Reflejan el contrato canónico de M-01. */
const COLECCIONES = [
  'usuarios',
  'grupos',
  'vinculaciones',
  'jornadas',
  // Solicitudes ya cerradas que fueron reemplazadas por una nueva sobre la misma
  // jornada (decisión A-09). La vigente vive dentro de `jornada.solicitud`.
  'historialSolicitudes',
  'documentos',
  'entregas',
  'notificaciones',
  'archivos',
];

const vacio = () => COLECCIONES.reduce((acc, nombre) => ({ ...acc, [nombre]: [] }), {});

const clonar = (valor) => (valor === undefined ? valor : JSON.parse(JSON.stringify(valor)));

const almacenDisponible = () => {
  try {
    const prueba = '__practicashub_prueba__';
    window.localStorage.setItem(prueba, '1');
    window.localStorage.removeItem(prueba);
    return true;
  } catch {
    return false;
  }
};

let estado = null;
let persistible = null;

const leerDeDisco = () => {
  if (persistible === null) persistible = typeof window !== 'undefined' && almacenDisponible();
  if (!persistible) return null;

  try {
    const bruto = window.localStorage.getItem(CLAVE);
    if (!bruto) return null;
    const datos = JSON.parse(bruto);
    // Una colección nueva añadida después de que el usuario guardara: no se pierde nada.
    return { ...vacio(), ...datos };
  } catch {
    return null;
  }
};

const escribirEnDisco = () => {
  if (!persistible) return;
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch {
    // Cuota agotada o almacenamiento bloqueado: el almacén sigue en memoria.
    persistible = false;
  }
};

const cargar = () => {
  if (estado) return estado;
  // La semilla se mezcla con `vacio()` para que toda colección exista aunque la semilla
  // no la pueble: así nadie tiene que comprobar si el array está definido.
  estado = leerDeDisco() ?? { ...vacio(), ...construirSemilla(ahoraISO()) };
  escribirEnDisco();
  return estado;
};

/** Devuelve una copia de la colección. Mutarla no afecta al almacén. */
export const listar = (coleccion) => clonar(cargar()[coleccion] ?? []);

/** Primer elemento que cumple el predicado, como copia. undefined si no hay ninguno. */
export const buscar = (coleccion, predicado) =>
  clonar((cargar()[coleccion] ?? []).find(predicado));

/** Elemento por id, como copia. */
export const porId = (coleccion, id) => buscar(coleccion, (item) => item.id === id);

/**
 * Ejecuta una escritura sobre el almacén y persiste al terminar.
 * El callback recibe las colecciones vivas: puede mutarlas.
 * Devuelve, clonado, lo que el callback retorne.
 *
 * Es atómica: si el callback lanza, se restaura el estado anterior completo. Importa
 * porque hay operaciones de varios pasos — registrar una tanda de jornadas (RF-07) valida
 * cada una contra las anteriores, así que la tercera puede fallar cuando las dos primeras
 * ya están escritas. Sin esta reversión, un error de fecha repetida dejaría media tanda
 * guardada y el formulario mostrando un error.
 *
 * El respaldo clona todo el almacén en cada escritura. Con estos volúmenes no se nota, y
 * la alternativa —que cada servicio deshaga sus propios cambios— es justo el tipo de
 * cosa que se olvida al añadir una operación nueva.
 */
export const transaccion = (callback) => {
  const datos = cargar();
  const respaldo = clonar(datos);

  try {
    const resultado = callback(datos);
    escribirEnDisco();
    return clonar(resultado);
  } catch (error) {
    estado = respaldo;
    throw error;
  }
};

/** Identificador nuevo, con prefijo legible para poder leer la consola. */
export const nuevoId = (prefijo) =>
  `${prefijo}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;

/** Vuelve a la semilla y borra lo guardado. */
export const reiniciar = () => {
  estado = { ...vacio(), ...construirSemilla(ahoraISO()) };
  escribirEnDisco();
  return clonar(estado);
};

/** Vacía el almacén por completo, sin semilla. */
export const vaciar = () => {
  estado = vacio();
  escribirEnDisco();
  return clonar(estado);
};

/** Volcado completo, para inspeccionar desde la consola. */
export const volcar = () => clonar(cargar());

export const CLAVE_ALMACEN = CLAVE;
