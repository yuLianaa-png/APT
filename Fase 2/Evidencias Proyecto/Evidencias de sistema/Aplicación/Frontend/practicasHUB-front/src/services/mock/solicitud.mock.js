/**
 * Solicitudes de corrección de jornada (RF-11, RN-12, RN-13, §4.9, §5.8 a §5.11).
 *
 * El flujo completo, y en qué orden:
 *   crear      → jornada REGISTRADA y bloqueada, solicitud PENDIENTE, avisa al docente
 *   habilitar  → jornada OBSERVADA, solicitud HABILITADA, avisa al estudiante
 *   rechazar   → jornada REGISTRADA y bloqueada, solicitud RECHAZADA, avisa al estudiante
 *   (guardar la corrección es `jornada.guardarCorreccion`: COMPLETADA y avisa al docente)
 *
 * RN-13: OBSERVADA no significa aprobación ni rechazo. Solo habilita la edición temporal.
 * Decisión A-09: tras un rechazo se puede volver a solicitar, sin límite. Cada solicitud
 *                es un registro propio y el historial conserva las anteriores (RNF-09).
 */

import {
  ERRORES,
  ESTADO_JORNADA,
  ESTADO_SOLICITUD,
  TIPO_NOTIFICACION,
  TIPO_REFERENCIA,
} from '../../utils/constants';
import { formatearFecha } from '../../utils/fechas';
import { puedeResolverSolicitud, puedeSolicitarCorreccion } from '../../utils/plazo';
import { listar, nuevoId, transaccion } from './db';
import { ahora, ahoraISO } from './reloj';
import {
  ErrorServicio, exigirExista, exigirGrupoActivo, fallar, notificar, responder,
} from './soporte';

/** Historial de solicitudes de una jornada, incluidas las ya cerradas. */
export const historialDeJornada = (jornadaId) =>
  responder(listar('historialSolicitudes').filter((s) => s.jornadaId === jornadaId));

/**
 * RF-11: el estudiante solicita la corrección con motivo obligatorio, pasado el plazo.
 * La jornada NO cambia de estado: sigue REGISTRADA y bloqueada mientras está PENDIENTE.
 */
export const crear = (jornadaId, motivo) => {
  const motivoLimpio = String(motivo ?? '').trim();
  if (motivoLimpio.length < 10) {
    return fallar(
      ERRORES.NO_AUTORIZADO,
      'Explica en el motivo qué necesitas corregir y por qué, con al menos 10 caracteres.',
    );
  }

  try {
    const jornadaActualizada = transaccion((datos) => {
      const jornada = exigirExista(
        datos.jornadas.find((candidata) => candidata.id === jornadaId),
        'La jornada no existe.',
      );
      const grupo = exigirGrupoActivo(
        datos.grupos.find((candidato) => candidato.id === jornada.grupoId),
      );

      if (!puedeSolicitarCorreccion(jornada, grupo, ahora())) {
        throw new ErrorServicio(
          ERRORES.SOLICITUD_EN_CURSO,
          jornada.solicitud?.estado === ESTADO_SOLICITUD.PENDIENTE
            ? 'Ya hay una solicitud esperando respuesta del docente.'
            : 'Esta jornada todavía se puede editar directamente.',
        );
      }

      // La solicitud anterior, si la había, se archiva antes de abrir la nueva (A-09).
      if (jornada.solicitud) {
        datos.historialSolicitudes = datos.historialSolicitudes ?? [];
        datos.historialSolicitudes.push(jornada.solicitud);
      }

      jornada.solicitud = {
        id: nuevoId('sol'),
        jornadaId: jornada.id,
        motivo: motivoLimpio,
        estado: ESTADO_SOLICITUD.PENDIENTE,
        creadaEn: ahoraISO(),
        respuestaDocente: null,
        resueltaEn: null,
        completadaEn: null,
      };

      const estudiante = datos.usuarios.find((u) => u.id === jornada.estudianteId);
      notificar(datos, {
        destinatarioId: grupo.docenteId,
        grupo,
        tipo: TIPO_NOTIFICACION.SOLICITUD_ENVIADA,
        mensaje: `${estudiante?.nombre ?? 'Un estudiante'} solicitó corregir la jornada del ${formatearFecha(jornada.fecha)}.`,
        referencia: { tipo: TIPO_REFERENCIA.JORNADA, id: jornada.id },
      });

      return jornada;
    });

    return responder(jornadaActualizada);
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

/** Comprueba que el docente puede resolver y devuelve jornada y grupo. */
const prepararResolucion = (datos, jornadaId, docenteId) => {
  const jornada = exigirExista(
    datos.jornadas.find((candidata) => candidata.id === jornadaId),
    'La jornada no existe.',
  );
  const grupo = exigirGrupoActivo(
    datos.grupos.find((candidato) => candidato.id === jornada.grupoId),
  );

  // RN-18: el docente solo actúa sobre los grupos de su cuenta.
  if (docenteId && grupo.docenteId !== docenteId) {
    throw new ErrorServicio(
      ERRORES.NO_AUTORIZADO,
      'Solo el docente responsable del grupo puede resolver esta solicitud.',
    );
  }

  if (!puedeResolverSolicitud(jornada, grupo)) {
    throw new ErrorServicio(
      ERRORES.NO_AUTORIZADO,
      'Esta solicitud ya fue resuelta o no está pendiente.',
    );
  }

  return { jornada, grupo };
};

/**
 * §5.9 y RN-12: habilitar exige una observación breve obligatoria.
 * La jornada pasa a OBSERVADA; la fecha sigue bloqueada (RN-13).
 */
export const habilitar = (jornadaId, observacion, docenteId = null) => {
  const texto = String(observacion ?? '').trim();
  if (!texto) {
    return fallar(
      ERRORES.NO_AUTORIZADO,
      'Escribe una observación para el estudiante antes de habilitar la corrección.',
    );
  }

  try {
    const jornadaActualizada = transaccion((datos) => {
      const { jornada, grupo } = prepararResolucion(datos, jornadaId, docenteId);

      jornada.estado = ESTADO_JORNADA.OBSERVADA;
      jornada.solicitud.estado = ESTADO_SOLICITUD.HABILITADA;
      jornada.solicitud.respuestaDocente = texto;
      jornada.solicitud.resueltaEn = ahoraISO();

      notificar(datos, {
        destinatarioId: jornada.estudianteId,
        grupo,
        tipo: TIPO_NOTIFICACION.CORRECCION_HABILITADA,
        mensaje: `Se habilitó la corrección de tu jornada del ${formatearFecha(jornada.fecha)}.`,
        referencia: { tipo: TIPO_REFERENCIA.JORNADA, id: jornada.id },
      });

      return jornada;
    });

    return responder(jornadaActualizada);
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

/**
 * §4.10 y §5.11: rechazar exige comentario obligatorio. La jornada sigue REGISTRADA y
 * bloqueada — el rechazo no habilita ninguna modificación — y el estudiante recibe el
 * comentario. Podrá volver a solicitar (A-09).
 */
export const rechazar = (jornadaId, comentario, docenteId = null) => {
  const texto = String(comentario ?? '').trim();
  if (!texto) {
    return fallar(
      ERRORES.NO_AUTORIZADO,
      'Escribe el motivo del rechazo: el estudiante lo recibirá en su notificación.',
    );
  }

  try {
    const jornadaActualizada = transaccion((datos) => {
      const { jornada, grupo } = prepararResolucion(datos, jornadaId, docenteId);

      // El estado de la jornada NO cambia: queda REGISTRADA y bloqueada.
      jornada.solicitud.estado = ESTADO_SOLICITUD.RECHAZADA;
      jornada.solicitud.respuestaDocente = texto;
      jornada.solicitud.resueltaEn = ahoraISO();

      notificar(datos, {
        destinatarioId: jornada.estudianteId,
        grupo,
        tipo: TIPO_NOTIFICACION.SOLICITUD_RECHAZADA,
        mensaje: `Tu solicitud sobre la jornada del ${formatearFecha(jornada.fecha)} fue rechazada: ${texto}`,
        referencia: { tipo: TIPO_REFERENCIA.JORNADA, id: jornada.id },
      });

      return jornada;
    });

    return responder(jornadaActualizada);
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

/** Solicitudes pendientes del grupo, para el resumen y las notificaciones del docente. */
export const pendientesDelGrupo = (grupoId) => {
  const usuarios = listar('usuarios');

  return responder(
    listar('jornadas')
      .filter((jornada) => jornada.grupoId === grupoId
        && jornada.solicitud?.estado === ESTADO_SOLICITUD.PENDIENTE)
      .map((jornada) => ({
        jornadaId: jornada.id,
        estudianteId: jornada.estudianteId,
        estudianteNombre: usuarios.find((u) => u.id === jornada.estudianteId)?.nombre ?? '',
        fecha: jornada.fecha,
        motivo: jornada.solicitud.motivo,
        creadaEn: jornada.solicitud.creadaEn,
      }))
      .sort((a, b) => new Date(a.creadaEn) - new Date(b.creadaEn)),
  );
};

export const solicitudMock = {
  crear,
  habilitar,
  rechazar,
  pendientesDelGrupo,
  historialDeJornada,
};
