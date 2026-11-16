/**
 * Documentos publicados por el docente, con historial de versiones (RF-14, RN-20).
 */
import { USAR_MOCKS } from './config';
import { documentoMock } from './mock/documento.mock';
import { documentoHttp } from './http';

export const documentoService = USAR_MOCKS ? documentoMock : documentoHttp;
export default documentoService;
