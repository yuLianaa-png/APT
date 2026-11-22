/**
 * Mensajes entre el docente y cada estudiante de su grupo. Solo texto; cada conversación
 * pertenece a una vinculación y solo la leen sus dos participantes.
 */
import { USAR_MOCKS } from './config';
import { mensajeMock } from './mock/mensaje.mock';
import { mensajeHttp } from './http';

export const mensajeService = USAR_MOCKS ? mensajeMock : mensajeHttp;
export default mensajeService;
