import { USAR_MOCKS } from './config';
import { ahora as ahoraSimulado } from './mock/reloj';

/**
 * El instante actual, según la capa de datos.
 *
 * Existe para que **ninguna pantalla llame a `new Date()`** cuando pregunta por el plazo
 * de 24 h. Con datos simulados devuelve el reloj desplazable, así que
 * `window.__mock.avanzarReloj(25*3600)` hace vencer el plazo al instante en lugar de
 * tener que esperar un día para comprobar RN-11.
 *
 * Cuando exista el backend, **el plazo lo decide el servidor**: él es quien tiene la hora
 * de verdad y quien rechaza una edición fuera de plazo. Lo que se calcule aquí será solo
 * para enseñar «te quedan 3 h» y para no ofrecer un botón que el servidor va a rechazar.
 */
export const relojService = {
  ahora: USAR_MOCKS ? ahoraSimulado : () => new Date(),
};

export default relojService;
