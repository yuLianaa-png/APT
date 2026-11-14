/**
 * Jornadas (RF-07 a RF-11, RN-07 a RN-14).
 *
 * Lo que este servicio garantiza, y que ninguna pantalla debe volver a comprobar:
 *  - Las horas las calcula el sistema (RN-07). Si llega un `horas` desde fuera, se ignora.
 *  - RN-08: término posterior al inicio y descanso que no deje duración nula.
 *  - RN-09: fecha única dentro de la práctica, también entre las jornadas de una misma
 *    tanda. La misma fecha sí se admite en grupos distintos.
 *  - RN-11: edición directa solo dentro de las 24 h y con el grupo ACTIVO; la fecha
 *    nunca se puede cambiar (decisión A-06).
 *  - RN-14: no hay aprobación. Una jornada nace REGISTRADA y ahí se queda salvo que una
 *    corrección habilitada la pase temporalmente a OBSERVADA.
 *  - Decisión A-12: las fechas futuras se permiten; no se valida nada más que RN-09.
 */

import {
  CAMPOS_EDITABLES_JORNADA,
  ERRORES,
  ESTADO_JORNADA,
  ESTADO_SOLICITUD,
  TIPO_NOTIFICACION,
  TIPO_REFERENCIA,
} from '../../utils/constants';
import { esFechaValida, fechaRepetida, formatearFecha, porFechaDescendente } from '../../utils/fechas';
import { calcularHoras, validarDuracion } from '../../utils/horas';
import { puedeEditarDirecto, puedeModificarObservada } from '../../utils/plazo';
import { listar, nuevoId, porId, transaccion } from './db';
import { ahora, ahoraISO } from './reloj';
import {
  ErrorServicio, exigirExista, exigirGrupoActivo, fallar, notificar, responder,
} from './soporte';

/** Las jornadas de un estudiante dentro de un grupo, más recientes primero. */
export const listarPorVinculacion = (vinculacionId) =>
  responder(
    listar('jornadas')
      .filter((jornada) => jornada.vinculacionId === vinculacionId)
      .sort(porFechaDescendente),
  );

/** RN-17: el estudiante solo ve sus propias jornadas del grupo seleccionado. */
export const listarDeEstudianteEnGrupo = (estudianteId, grupoId) =>
  responder(
    listar('jornadas')
      .filter((jornada) => jornada.estudianteId === estudianteId && jornada.grupoId === grupoId)
      .sort(porFechaDescendente),
  );

export const obtener = (jornadaId) => {
  const jornada = porId('jornadas', jornadaId);
  if (!jornada) return fallar(ERRORES.NO_ENCONTRADO, 'La jornada no existe.');
  return responder(jornada);
};

/** Valida los campos comunes a registrar y editar. Lanza `ErrorServicio`. */
const validarDatos = ({ horaInicio, horaTermino, descansoMin, actividadPrincipal }) => {
  if (!String(actividadPrincipal ?? '').trim()) {
    throw new ErrorServicio(
      ERRORES.HORARIO_INVALIDO,
      'Indica la actividad principal de la jornada.',
    );
  }

  const duracion = validarDuracion(horaInicio, horaTermino, descansoMin);
  if (!duracion.valido) {
    throw new ErrorServicio(duracion.codigo, duracion.mensaje);
  }
};

/**
 * RF-07 y RF-08. Registra una o varias jornadas en una sola tanda, que es como lo
 * describe el requisito. Si cualquiera de ellas falla, no se guarda ninguna: así el
 * formulario puede mostrar el error sin dejar datos a medias.
 *
 * La descripción y la evidencia son opcionales (RF-07, RF-10).
 */
export const registrar = (vinculacionId, nuevasJornadas) => {
  const lista = Array.isArray(nuevasJornadas) ? nuevasJornadas : [nuevasJornadas];

  try {
    const creadas = transaccion((datos) => {
      const vinculacion = exigirExista(
        datos.vinculaciones.find((candidata) => candidata.id === vinculacionId),
        'La vinculación no existe.',
      );
      const grupo = exigirGrupoActivo(
        datos.grupos.find((candidato) => candidato.id === vinculacion.grupoId),
      );

      const delGrupo = datos.jornadas.filter(
        (jornada) => jornada.vinculacionId === vinculacionId,
      );
      const fechasDeLaTanda = [];
      const resultado = [];

      lista.forEach((entrada) => {
        validarDatos(entrada);

        if (!esFechaValida(entrada.fecha)) {
          throw new ErrorServicio(
            ERRORES.FECHA_REPETIDA,
            'Indica una fecha válida para la jornada.',
          );
        }

        // RN-09, en las dos direcciones que exige §4.17: contra el historial...
        if (fechaRepetida(entrada.fecha, delGrupo)) {
          throw new ErrorServicio(
            ERRORES.FECHA_REPETIDA,
            `Ya existe una jornada del ${formatearFecha(entrada.fecha)} en esta práctica.`,
          );
        }
        // ...y contra las demás jornadas del mismo formulario.
        if (fechasDeLaTanda.includes(entrada.fecha)) {
          throw new ErrorServicio(
            ERRORES.FECHA_REPETIDA,
            `Estás registrando dos jornadas con la fecha ${formatearFecha(entrada.fecha)}.`,
          );
        }
        fechasDeLaTanda.push(entrada.fecha);

        const creadaEn = ahoraISO();
        const jornada = {
          id: nuevoId('jor'),
          vinculacionId,
          grupoId: grupo.id,
          estudianteId: vinculacion.estudianteId,
          fecha: entrada.fecha,
          horaInicio: entrada.horaInicio,
          horaTermino: entrada.horaTermino,
          descansoMin: Number(entrada.descansoMin) || 0,
          actividadPrincipal: String(entrada.actividadPrincipal).trim(),
          descripcion: String(entrada.descripcion ?? '').trim() || null,
          // RN-07: lo calcula el sistema, nunca llega de fuera.
          horas: calcularHoras(entrada.horaInicio, entrada.horaTermino, entrada.descansoMin),
          evidencia: entrada.evidencia ?? null,
          estado: ESTADO_JORNADA.REGISTRADA,
          creadaEn,
          actualizadaEn: creadaEn,
          solicitud: null,
        };

        datos.jornadas.push(jornada);
        delGrupo.push(jornada);
        resultado.push(jornada);
      });

      return resultado;
    });

    return responder(creadas);
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

/** Aplica solo los campos editables; la fecha queda fuera por construcción (A-06). */
const aplicarCambios = (jornada, cambios) => {
  CAMPOS_EDITABLES_JORNADA.forEach((campo) => {
    if (!(campo in cambios)) return;

    if (campo === 'descansoMin') jornada.descansoMin = Number(cambios.descansoMin) || 0;
    else if (campo === 'descripcion') {
      jornada.descripcion = String(cambios.descripcion ?? '').trim() || null;
    } else if (campo === 'actividadPrincipal') {
      jornada.actividadPrincipal = String(cambios.actividadPrincipal).trim();
    } else jornada[campo] = cambios[campo];
  });

  jornada.horas = calcularHoras(jornada.horaInicio, jornada.horaTermino, jornada.descansoMin);
  jornada.actualizadaEn = ahoraISO();
  return jornada;
};

/**
 * RN-11. Edición directa dentro de las 24 h. Si llega una `fecha` en los cambios se
 * ignora en silencio: la fecha original no se toca nunca.
 */
export const editarDirecto = (jornadaId, cambios) => {
  try {
    const actualizada = transaccion((datos) => {
      const jornada = exigirExista(
        datos.jornadas.find((candidata) => candidata.id === jornadaId),
        'La jornada no existe.',
      );
      const grupo = exigirGrupoActivo(
        datos.grupos.find((candidato) => candidato.id === jornada.grupoId),
      );

      if (!puedeEditarDirecto(jornada, grupo, ahora())) {
        throw new ErrorServicio(
          ERRORES.PLAZO_VENCIDO,
          'El plazo de 24 horas terminó. Solicita una corrección al docente.',
        );
      }

      validarDatos({ ...jornada, ...cambios });
      return aplicarCambios(jornada, cambios);
    });

    return responder(actualizada);
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

/**
 * RN-12 y §4.19. Guarda la corrección de una jornada OBSERVADA: vuelve a REGISTRADA,
 * la solicitud queda COMPLETADA y el docente recibe una notificación.
 */
export const guardarCorreccion = (jornadaId, cambios) => {
  try {
    const actualizada = transaccion((datos) => {
      const jornada = exigirExista(
        datos.jornadas.find((candidata) => candidata.id === jornadaId),
        'La jornada no existe.',
      );
      const grupo = exigirGrupoActivo(
        datos.grupos.find((candidato) => candidato.id === jornada.grupoId),
      );

      if (!puedeModificarObservada(jornada, grupo)) {
        throw new ErrorServicio(
          ERRORES.NO_AUTORIZADO,
          'Esta jornada no tiene una corrección habilitada.',
        );
      }

      validarDatos({ ...jornada, ...cambios });
      aplicarCambios(jornada, cambios);

      jornada.estado = ESTADO_JORNADA.REGISTRADA;
      jornada.solicitud.estado = ESTADO_SOLICITUD.COMPLETADA;
      jornada.solicitud.completadaEn = ahoraISO();

      const estudiante = datos.usuarios.find((u) => u.id === jornada.estudianteId);
      notificar(datos, {
        destinatarioId: grupo.docenteId,
        grupo,
        tipo: TIPO_NOTIFICACION.CORRECCION_GUARDADA,
        mensaje: `${estudiante?.nombre ?? 'Un estudiante'} guardó la corrección de la jornada del ${formatearFecha(jornada.fecha)}.`,
        referencia: { tipo: TIPO_REFERENCIA.JORNADA, id: jornada.id },
      });

      return jornada;
    });

    return responder(actualizada);
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

/**
 * Los cuatro indicadores de la vista Jornadas del estudiante (§4.7).
 * Decisión A-05: el manual no los nombra; este conjunto se deriva por simetría con §5.4.
 */
export const indicadores = (estudianteId, grupoId) => {
  const grupo = porId('grupos', grupoId);
  if (!grupo) return fallar(ERRORES.NO_ENCONTRADO, 'El grupo no existe.');

  const jornadas = listar('jornadas')
    .filter((jornada) => jornada.estudianteId === estudianteId && jornada.grupoId === grupoId);
  const horas = Math.round(jornadas.reduce((total, j) => total + (j.horas ?? 0), 0) * 100) / 100;

  return responder({
    horasRegistradas: horas,
    metaMinimaHoras: grupo.metaMinimaHoras,
    // RN-06: la meta no es un máximo; «restantes» llega a cero y las horas siguen.
    horasRestantes: Math.max(0, Math.round((grupo.metaMinimaHoras - horas) * 100) / 100),
    porcentaje: grupo.metaMinimaHoras > 0
      ? Math.min(100, Math.round((horas / grupo.metaMinimaHoras) * 1000) / 10)
      : 0,
    totalJornadas: jornadas.length,
    solicitudesPendientes: jornadas
      .filter((j) => j.solicitud?.estado === ESTADO_SOLICITUD.PENDIENTE).length,
    correccionesHabilitadas: jornadas
      .filter((j) => j.estado === ESTADO_JORNADA.OBSERVADA).length,
  });
};

export const jornadaMock = {
  listarPorVinculacion,
  listarDeEstudianteEnGrupo,
  obtener,
  registrar,
  editarDirecto,
  guardarCorreccion,
  indicadores,
};
