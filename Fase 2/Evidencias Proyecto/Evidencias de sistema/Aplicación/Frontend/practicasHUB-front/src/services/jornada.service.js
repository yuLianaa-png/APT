/**
 * Jornadas: registro, cálculo de horas y edición directa en la ventana de 24 h
 * (RF-07 a RF-11, RN-07 a RN-14).
 */
import { USAR_MOCKS } from './config';
import { jornadaMock } from './mock/jornada.mock';
import { jornadaHttp } from './http';

export const jornadaService = USAR_MOCKS ? jornadaMock : jornadaHttp;
export default jornadaService;
