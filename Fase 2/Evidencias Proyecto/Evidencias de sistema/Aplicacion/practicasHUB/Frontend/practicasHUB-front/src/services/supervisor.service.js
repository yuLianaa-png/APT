/**
 * Supervisor del centro de práctica: lo registra el estudiante, el docente le envía el enlace
 * y el supervisor valida u observa las jornadas desde ese enlace, sin cuenta.
 */
import { USAR_MOCKS } from './config';
import { supervisorMock, supervisorPublicoMock } from './mock/supervisor.mock';
import { supervisorHttp, supervisorPublicoHttp } from './http';

export const supervisorService = USAR_MOCKS ? supervisorMock : supervisorHttp;
export const supervisorPublicoService = USAR_MOCKS ? supervisorPublicoMock : supervisorPublicoHttp;
export default supervisorService;
