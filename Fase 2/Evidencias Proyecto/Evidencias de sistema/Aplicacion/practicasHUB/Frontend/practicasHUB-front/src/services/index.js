/**
 * Punto único de entrada a la capa de datos.
 *
 * Las pantallas importan desde aquí y nunca desde `mock/` ni desde `http/`:
 *
 *   import { jornadaService } from '../../services';
 *
 * Qué implementación se usa lo decide `config.js` con `VITE_USAR_MOCKS`. Mientras el
 * backend de Spring Boot no exista, es el almacén simulado.
 */

export { authService } from './auth.service';
export { grupoService } from './grupo.service';
export { vinculacionService } from './vinculacion.service';
export { jornadaService } from './jornada.service';
export { solicitudService } from './solicitud.service';
export { documentoService } from './documento.service';
export { entregaService } from './entrega.service';
export { notificacionService } from './notificacion.service';
export { archivoService } from './archivo.service';
export { relojService } from './reloj.service';

export { USAR_MOCKS, API_URL } from './config';
