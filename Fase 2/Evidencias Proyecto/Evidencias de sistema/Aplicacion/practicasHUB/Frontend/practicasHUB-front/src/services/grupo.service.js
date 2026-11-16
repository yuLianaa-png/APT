/**
 * Grupos de práctica y su ciclo de vida (RF-02 a RF-04).
 *
 * Sustituye la mitad «docente» del antiguo `vinculacion.service.js`, cuyas operaciones
 * `generarCodigo()` sin datos y `anularCodigo()` no existen en el contrato real: el
 * código se genera al crear el grupo (RN-02) y los grupos se desactivan y reactivan,
 * nunca se anulan (RN-03).
 */
import { USAR_MOCKS } from './config';
import { grupoMock } from './mock/grupo.mock';
import { grupoHttp } from './http';

export const grupoService = USAR_MOCKS ? grupoMock : grupoHttp;
export default grupoService;
