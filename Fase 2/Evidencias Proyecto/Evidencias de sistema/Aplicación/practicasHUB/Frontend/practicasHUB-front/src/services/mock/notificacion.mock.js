/**
 * Notificaciones en dos niveles (RF-12, RN-16, §6.5).
 *
 *  - `generales(usuarioId)`: novedades de TODOS los grupos del usuario. Cada aviso
 *    identifica nombre y código del grupo, porque `Ver` tiene que cargar ese grupo antes
 *    de abrir el elemento.
 *  - `delGrupo(usuarioId, grupoId)`: solo las del grupo seleccionado, para no mezclar
 *    códigos distintos.
 *
 * Decisión A-10 (ampliada): no hay borrado. Sí hay leída/no leída, para el contador del
 * menú lateral: una notificación sin `leida: true` cuenta como nueva.
 * Orden siempre descendente por fecha.
 */

import { listar, transaccion } from './db';
import { responder } from './soporte';

const masRecientePrimero = (a, b) => new Date(b.creadaEn) - new Date(a.creadaEn);

/** Una notificación sin `leida` es nueva: así las de la semilla también cuentan. */
const conLeida = (notificacion) => ({ ...notificacion, leida: Boolean(notificacion.leida) });

export const generales = (usuarioId) =>
  responder(
    listar('notificaciones')
      .filter((notificacion) => notificacion.destinatarioId === usuarioId)
      .sort(masRecientePrimero)
      .map(conLeida),
  );

export const delGrupo = (usuarioId, grupoId) =>
  responder(
    listar('notificaciones')
      .filter((notificacion) => notificacion.destinatarioId === usuarioId
        && notificacion.grupoId === grupoId)
      .sort(masRecientePrimero)
      .map(conLeida),
  );

/** Cuántas novedades tiene el usuario, para el indicador del resumen. */
export const totalDelUsuario = (usuarioId) =>
  responder(
    listar('notificaciones')
      .filter((notificacion) => notificacion.destinatarioId === usuarioId).length,
  );

const esDelUsuario = (usuarioId, grupoId) => (notificacion) =>
  notificacion.destinatarioId === usuarioId
  && (grupoId === null || notificacion.grupoId === grupoId);

/** Cuántas notificaciones sin leer hay: todas, o solo las de un grupo. */
export const noLeidas = (usuarioId, grupoId = null) =>
  responder(
    listar('notificaciones')
      .filter(esDelUsuario(usuarioId, grupoId))
      .filter((notificacion) => !notificacion.leida).length,
  );

/** Marca como leídas todas las notificaciones, o solo las de un grupo. */
export const marcarLeidas = (usuarioId, grupoId = null) => {
  transaccion((datos) => {
    datos.notificaciones
      .filter(esDelUsuario(usuarioId, grupoId))
      .forEach((notificacion) => { notificacion.leida = true; });
  });
  return responder(undefined);
};

export const notificacionMock = {
  generales, delGrupo, totalDelUsuario, noLeidas, marcarLeidas,
};
