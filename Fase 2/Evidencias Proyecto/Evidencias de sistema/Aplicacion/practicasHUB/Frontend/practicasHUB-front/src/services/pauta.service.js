/**
 * Evaluación del centro de práctica: cuántas evaluaciones hay en el grupo y la pauta de
 * cada una (subida desde una plantilla o armada a mano, siempre revisada por el docente).
 */
import { USAR_MOCKS } from './config';
import { pautaMock } from './mock/pauta.mock';
import { pautaHttp } from './http';

export const pautaService = USAR_MOCKS ? pautaMock : pautaHttp;
export default pautaService;
