/**
 * Única fuente de verdad de qué acción se habilita sobre una jornada.
 *
 * Ninguna pantalla debe decidir por su cuenta si un botón está activo: todas llaman
 * aquí. Así el modo de solo lectura (RN-03, §1 y §9 del manual) y la ventana de 24 h
 * (RN-11) se aplican igual en la vista del estudiante y en la del docente.
 *
 * Cada acción devuelve `{ habilitada, motivoBloqueo }`. Cuando está bloqueada, el botón
 * NO se oculta: el manual (§1) exige que permanezca visible y muestre el motivo.
 */

import {
  ESTADO_JORNADA,
  ESTADO_SOLICITUD,
  MOTIVOS_BLOQUEO,
  CAMPOS_EDITABLES_JORNADA,
} from './constants';
import {
  dentroDelPlazo,
  grupoPermiteEscritura,
  puedeEditarDirecto,
  puedeModificarObservada,
  puedeResolverSolicitud,
  puedeSolicitarCorreccion,
  tieneSolicitudEnCurso,
} from './plazo';

const permitida = () => ({ habilitada: true, motivoBloqueo: null });
const bloqueada = (motivoBloqueo) => ({ habilitada: false, motivoBloqueo });

/** Motivo por el que no se puede editar directamente, en orden de precedencia. */
const motivoSinEdicionDirecta = (jornada, grupo) => {
  if (!grupoPermiteEscritura(grupo)) return MOTIVOS_BLOQUEO.GRUPO_INACTIVO;
  if (jornada?.estado === ESTADO_JORNADA.OBSERVADA) return MOTIVOS_BLOQUEO.CORRECCION_HABILITADA;
  if (jornada?.solicitud?.estado === ESTADO_SOLICITUD.PENDIENTE) {
    return MOTIVOS_BLOQUEO.SOLICITUD_PENDIENTE;
  }
  return MOTIVOS_BLOQUEO.PLAZO_VENCIDO;
};

/** Motivo por el que no se puede solicitar corrección. */
const motivoSinSolicitud = (jornada, grupo, ahora) => {
  if (!grupoPermiteEscritura(grupo)) return MOTIVOS_BLOQUEO.GRUPO_INACTIVO;
  if (jornada?.estado === ESTADO_JORNADA.OBSERVADA) return MOTIVOS_BLOQUEO.CORRECCION_HABILITADA;
  if (tieneSolicitudEnCurso(jornada)) return MOTIVOS_BLOQUEO.SOLICITUD_PENDIENTE;
  if (dentroDelPlazo(jornada, ahora)) return MOTIVOS_BLOQUEO.DENTRO_DEL_PLAZO;
  return MOTIVOS_BLOQUEO.GRUPO_INACTIVO;
};

/**
 * Acciones del ESTUDIANTE sobre una de sus jornadas.
 *
 * @param {object} jornada
 * @param {object} grupo
 * @param {Date|number|string} ahora instante de referencia, inyectado por el llamador
 * @returns {{ ver: object, editar: object, solicitar: object, modificar: object }}
 */
export const accionesDisponibles = (jornada, grupo, ahora) => ({
  // Consultar una jornada nunca se bloquea, ni en grupos inactivos (§4.6).
  ver: permitida(),

  editar: puedeEditarDirecto(jornada, grupo, ahora)
    ? permitida()
    : bloqueada(motivoSinEdicionDirecta(jornada, grupo)),

  solicitar: puedeSolicitarCorreccion(jornada, grupo, ahora)
    ? permitida()
    : bloqueada(motivoSinSolicitud(jornada, grupo, ahora)),

  modificar: puedeModificarObservada(jornada, grupo)
    ? permitida()
    : bloqueada(
      grupoPermiteEscritura(grupo)
        ? MOTIVOS_BLOQUEO.SIN_CORRECCION_HABILITADA
        : MOTIVOS_BLOQUEO.GRUPO_INACTIVO,
    ),
});

/**
 * Acciones del DOCENTE sobre la jornada de un estudiante.
 * §5.7: el docente no registra ni modifica jornadas. Solo revisa solicitudes.
 */
export const accionesDocente = (jornada, grupo) => ({
  ver: permitida(),

  revisarSolicitud: puedeResolverSolicitud(jornada, grupo)
    ? permitida()
    : bloqueada(
      grupoPermiteEscritura(grupo)
        ? MOTIVOS_BLOQUEO.SIN_CORRECCION_HABILITADA
        : MOTIVOS_BLOQUEO.GRUPO_INACTIVO,
    ),
});

/**
 * Qué campos acepta el formulario de edición. Decisión A-06: todo menos la fecha,
 * evidencia incluida. La fecha original queda bloqueada en los dos casos (RN-11, RN-13).
 */
export const camposEditables = (jornada, grupo, ahora) => {
  const puede = puedeEditarDirecto(jornada, grupo, ahora)
    || puedeModificarObservada(jornada, grupo);

  return {
    campos: puede ? [...CAMPOS_EDITABLES_JORNADA] : [],
    fechaBloqueada: true,
  };
};

/**
 * Resumen legible del estado de una jornada para la tabla del historial (§4.7).
 * Devuelve el estado de la jornada y, aparte, el de su solicitud: §5.8 advierte que una
 * jornada REGISTRADA puede tener una solicitud PENDIENTE al mismo tiempo.
 */
export const resumenEstado = (jornada) => ({
  estadoJornada: jornada?.estado ?? null,
  estadoSolicitud: jornada?.solicitud?.estado ?? null,
  tieneSolicitudEnCurso: tieneSolicitudEnCurso(jornada),
});
