/**
 * Solicitudes de corrección de jornada (RF-11, RN-12, RN-13).
 */
import { USAR_MOCKS } from './config';
import { solicitudMock } from './mock/solicitud.mock';
import { solicitudHttp } from './http';

export const solicitudService = USAR_MOCKS ? solicitudMock : solicitudHttp;
export default solicitudService;
