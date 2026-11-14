/**
 * Notificaciones en dos niveles (RF-12, RN-16, §6.5).
 *
 *  - `generales(usuarioId)`: novedades de TODOS los grupos del usuario. Cada aviso
 *    identifica nombre y código del grupo, porque `Ver` tiene que cargar ese grupo antes
 *    de abrir el elemento.
 *  - `delGrupo(usuarioId, grupoId)`: solo las del grupo seleccionado, para no mezclar
 *    códigos distintos.
 *
 * Decisión A-10: no hay leída/no leída ni borrado; ningún documento los menciona.
 * Orden siempre descendente por fecha.
 */

import { listar } from './db';
import { responder } from './soporte';

const masRecientePrimero = (a, b) => new Date(b.creadaEn) - new Date(a.creadaEn);

export const generales = (usuarioId) =>
  responder(
    listar('notificaciones')
      .filter((notificacion) => notificacion.destinatarioId === usuarioId)
      .sort(masRecientePrimero),
  );

export const delGrupo = (usuarioId, grupoId) =>
  responder(
    listar('notificaciones')
      .filter((notificacion) => notificacion.destinatarioId === usuarioId
        && notificacion.grupoId === grupoId)
      .sort(masRecientePrimero),
  );

/** Cuántas novedades tiene el usuario, para el indicador del resumen. */
export const totalDelUsuario = (usuarioId) =>
  responder(
    listar('notificaciones')
      .filter((notificacion) => notificacion.destinatarioId === usuarioId).length,
  );

export const notificacionMock = { generales, delGrupo, totalDelUsuario };
