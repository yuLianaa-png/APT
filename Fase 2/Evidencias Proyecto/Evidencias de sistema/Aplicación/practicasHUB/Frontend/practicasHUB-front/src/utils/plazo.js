/**
 * Ventana de edición directa de una jornada.
 *
 * RN-10: al guardar, el sistema avisa de que la edición directa estará disponible
 *        durante 24 horas desde la creación.
 * RN-11: la jornada queda REGISTRADA y editable durante esas 24 h, siempre que el grupo
 *        esté ACTIVO. La fecha original permanece bloqueada. Vencido el plazo, la jornada
 *        se bloquea y cualquier cambio requiere autorización del docente.
 * RN-12: pasado el plazo, la solicitud exige motivo. Mientras está PENDIENTE la jornada
 *        sigue REGISTRADA y bloqueada.
 *
 * Decisión A-01: la tabla §6.2 del manual V1.4 contradice esto; es un error del documento.
 * Decisión A-09: tras una solicitud RECHAZADA se puede volver a solicitar, sin límite.
 *
 * `ahora` se inyecta siempre (nunca se llama a Date.now() aquí dentro) para poder
 * verificar el plazo sin esperar 24 horas reales.
 */

import {
  ESTADO_GRUPO,
  ESTADO_JORNADA,
  ESTADO_SOLICITUD,
  VENTANA_EDICION_MS,
} from './constants';

const instante = (valor) => {
  const fecha = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha.getTime();
};

/** Milisegundos transcurridos desde que se creó la jornada. null si no se puede calcular. */
export const msDesdeCreacion = (jornada, ahora) => {
  const creada = instante(jornada?.creadaEn);
  const referencia = instante(ahora);
  if (creada === null || referencia === null) return null;
  return referencia - creada;
};

/** Milisegundos que quedan de ventana de edición directa. 0 si ya venció. */
export const msRestantes = (jornada, ahora) => {
  const transcurrido = msDesdeCreacion(jornada, ahora);
  if (transcurrido === null) return 0;
  return Math.max(0, VENTANA_EDICION_MS - transcurrido);
};

/** Horas decimales que quedan de ventana, para mostrar al estudiante. */
export const horasRestantes = (jornada, ahora) =>
  Math.round((msRestantes(jornada, ahora) / 3_600_000) * 100) / 100;

/**
 * true si el plazo de 24 h sigue abierto, con independencia del estado del grupo.
 * El límite es estricto: a las 24 h 00 min 00 s exactas ya está vencido.
 */
export const dentroDelPlazo = (jornada, ahora) => {
  const transcurrido = msDesdeCreacion(jornada, ahora);
  if (transcurrido === null) return false;
  return transcurrido >= 0 && transcurrido < VENTANA_EDICION_MS;
};

/** El grupo admite modificaciones (RN-03): solo si está ACTIVO. */
export const grupoPermiteEscritura = (grupo) => grupo?.estado === ESTADO_GRUPO.ACTIVO;

/** Hay una solicitud esperando respuesta del docente o una corrección en curso. */
export const tieneSolicitudEnCurso = (jornada) => {
  const estado = jornada?.solicitud?.estado;
  return estado === ESTADO_SOLICITUD.PENDIENTE || estado === ESTADO_SOLICITUD.HABILITADA;
};

/**
 * Edición directa (RN-11): jornada REGISTRADA, grupo ACTIVO, dentro de las 24 h y sin
 * solicitud en curso. La fecha queda fuera en cualquier caso (A-06).
 */
export const puedeEditarDirecto = (jornada, grupo, ahora) =>
  jornada?.estado === ESTADO_JORNADA.REGISTRADA
  && grupoPermiteEscritura(grupo)
  && dentroDelPlazo(jornada, ahora)
  && !tieneSolicitudEnCurso(jornada);

/**
 * Solicitar corrección (RN-12): grupo ACTIVO, jornada REGISTRADA, plazo vencido y sin
 * solicitud en curso. Una solicitud RECHAZADA o COMPLETADA no impide volver a solicitar
 * (decisión A-09).
 */
export const puedeSolicitarCorreccion = (jornada, grupo, ahora) =>
  jornada?.estado === ESTADO_JORNADA.REGISTRADA
  && grupoPermiteEscritura(grupo)
  && !dentroDelPlazo(jornada, ahora)
  && !tieneSolicitudEnCurso(jornada);

/**
 * Modificar una jornada OBSERVADA (RN-13): el docente habilitó la corrección y el
 * estudiante aún no la ha guardado. No depende del plazo de 24 h.
 */
export const puedeModificarObservada = (jornada, grupo) =>
  jornada?.estado === ESTADO_JORNADA.OBSERVADA
  && jornada?.solicitud?.estado === ESTADO_SOLICITUD.HABILITADA
  && grupoPermiteEscritura(grupo);

/** El docente puede resolver la solicitud: está PENDIENTE y el grupo está ACTIVO (§5.8). */
export const puedeResolverSolicitud = (jornada, grupo) =>
  jornada?.solicitud?.estado === ESTADO_SOLICITUD.PENDIENTE
  && grupoPermiteEscritura(grupo);
