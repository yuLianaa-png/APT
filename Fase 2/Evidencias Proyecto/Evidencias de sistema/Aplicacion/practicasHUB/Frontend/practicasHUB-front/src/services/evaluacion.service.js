/**
 * Evaluación del supervisor del centro de práctica: envío, respuestas, nota y publicación al
 * estudiante. `evaluacionPublicaService` es lo que usa el supervisor desde su enlace, sin sesión.
 */
import { USAR_MOCKS } from './config';
import { evaluacionMock, evaluacionPublicaMock } from './mock/evaluacion.mock';
import { evaluacionHttp, evaluacionPublicaHttp } from './http';

export const evaluacionService = USAR_MOCKS ? evaluacionMock : evaluacionHttp;
export const evaluacionPublicaService = USAR_MOCKS ? evaluacionPublicaMock : evaluacionPublicaHttp;
export default evaluacionService;
