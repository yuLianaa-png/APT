/**
 * Notificaciones en dos niveles: generales y del grupo seleccionado (RF-12, RN-16).
 */
import { USAR_MOCKS } from './config';
import { notificacionMock } from './mock/notificacion.mock';
import { notificacionHttp } from './http';

export const notificacionService = USAR_MOCKS ? notificacionMock : notificacionHttp;
export default notificacionService;
