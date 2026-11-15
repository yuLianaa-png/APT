/**
 * Acceso. Mismas firmas contra el mock y contra la API (RF-01).
 */
import { USAR_MOCKS } from './config';
import { authMock } from './mock/auth.mock';
import { authHttp } from './http';

export const authService = USAR_MOCKS ? authMock : authHttp;
export default authService;
