/**
 * Seguimiento de alertas: qué hace el docente con un estudiante que se atrasa (contacto,
 * acuerdo, plan o prórroga) y cuándo se da por resuelta la alerta.
 */
import { USAR_MOCKS } from './config';
import { seguimientoMock } from './mock/seguimiento.mock';
import { seguimientoHttp } from './http';

export const seguimientoService = USAR_MOCKS ? seguimientoMock : seguimientoHttp;
export default seguimientoService;
