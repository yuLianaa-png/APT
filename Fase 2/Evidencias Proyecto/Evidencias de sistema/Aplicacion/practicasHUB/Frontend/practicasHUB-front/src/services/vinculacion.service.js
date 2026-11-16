/**
 * Vinculación del estudiante por código (RF-05, RF-06).
 *
 * La parte docente (crear grupo, desactivar, reactivar) vive en `grupo.service.js`.
 */
import { USAR_MOCKS } from './config';
import { vinculacionMock } from './mock/vinculacion.mock';
import { vinculacionHttp } from './http';

export const vinculacionService = USAR_MOCKS ? vinculacionMock : vinculacionHttp;
export default vinculacionService;

/**
 * Operaciones del prototipo anterior que el contrato real no tiene. Se conservan solo
 * para que las pantallas heredadas que aún las llaman fallen con un mensaje claro en
 * lugar de romperse, hasta que su módulo las reescriba (M-04 y M-07).
 */
const yaNoExiste = (nombre, reemplazo) => () => {
  const mensaje = `vinculacionService.${nombre}() ya no existe en el contrato de PrácticasHub. Usa ${reemplazo}.`;
  console.warn(mensaje);
  return Promise.reject(Object.assign(new Error(mensaje), {
    codigo: 'NO_ENCONTRADO',
    mensaje: 'Esta pantalla todavía no está actualizada al modelo de grupos.',
  }));
};

/** @deprecated un estudiante puede tener varias prácticas: usa `listarDelEstudiante`. */
export const getVinculacionActual = yaNoExiste('getVinculacionActual', 'listarDelEstudiante(estudianteId)');
/** @deprecated usa `previsualizarCodigo` y después `vincular`. */
export const vincularConCodigo = yaNoExiste('vincularConCodigo', 'vincular(codigo, estudianteId)');
