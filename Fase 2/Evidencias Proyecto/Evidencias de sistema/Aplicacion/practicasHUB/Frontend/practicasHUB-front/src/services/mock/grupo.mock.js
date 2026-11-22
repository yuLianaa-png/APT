/**
 * Grupos de práctica y su ciclo de vida (RF-02, RF-03, RF-04, RN-01 a RN-03).
 *
 * RN-01: nombre, descripción y meta mínima son obligatorios.
 * RN-02: el código lo genera el sistema, es único y nace ACTIVO. El docente no lo escribe.
 * RN-03: grupo y código comparten estado. Desactivar no borra nada y reactivar mantiene
 *        el mismo código: no existe regeneración de códigos.
 */

import {
  ERRORES,
  ESTADO_ENTREGA,
  ESTADO_GRUPO,
  ESTADO_JORNADA,
  ESTADO_SOLICITUD,
  NIVEL_RIESGO,
  TIPO_NOTIFICACION,
  TIPO_REFERENCIA,
} from '../../utils/constants';
import { anioDelGrupo } from '../../utils/fechas';
import { avanceMeta } from '../../utils/horas';
import { evaluarRiesgo, ultimaJornada } from '../../utils/riesgo';
import { estadoSeguimiento } from './seguimiento.mock';
import { noLeidosPara } from './mensaje.mock';
import { aFechaISO } from '../../utils/fechas';
import { listar, nuevoId, porId, transaccion } from './db';
import { ahora, ahoraISO } from './reloj';
import {
  ErrorServicio, exigirExista, fallar, generarCodigo, notificar, notificarAlGrupo, responder,
} from './soporte';

/**
 * Añade a un grupo los campos derivados que las tablas necesitan:
 * `anio` sale de la fecha de creación (§5.3) y `totalEstudiantes` de las vinculaciones.
 */
const enriquecer = (grupo, vinculaciones) => ({
  ...grupo,
  anio: anioDelGrupo(grupo.creadoEn),
  totalEstudiantes: vinculaciones.filter((v) => v.grupoId === grupo.id).length,
});

/** RF-02: todos los grupos y códigos del docente, los inactivos incluidos. */
export const listarDelDocente = (docenteId) => {
  const vinculaciones = listar('vinculaciones');
  return responder(
    listar('grupos')
      .filter((grupo) => grupo.docenteId === docenteId)
      .map((grupo) => enriquecer(grupo, vinculaciones))
      .sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn)),
  );
};

export const obtener = (grupoId) => {
  const grupo = porId('grupos', grupoId);
  if (!grupo) return fallar(ERRORES.NO_ENCONTRADO, 'El grupo no existe.');
  return responder(enriquecer(grupo, listar('vinculaciones')));
};

/** Grupo por su código, para la vista previa de la vinculación (§4.3). */
export const obtenerPorCodigo = (codigo) => {
  const buscado = String(codigo ?? '').trim().toUpperCase();
  const grupo = listar('grupos').find((candidato) => candidato.codigo === buscado);
  if (!grupo) return fallar(ERRORES.CODIGO_INEXISTENTE, 'El código no existe.');
  return responder(enriquecer(grupo, listar('vinculaciones')));
};

/** RF-03 y RN-01: crea el grupo y genera su código. */
export const crear = ({
  docenteId, nombre, descripcion, metaMinimaHoras, fechaTermino = null,
}) => {
  const nombreLimpio = String(nombre ?? '').trim();
  const descripcionLimpia = String(descripcion ?? '').trim();
  const meta = Number(metaMinimaHoras);

  if (!nombreLimpio || !descripcionLimpia) {
    return fallar(
      ERRORES.NO_AUTORIZADO,
      'El nombre y la descripción del grupo son obligatorios.',
    );
  }
  if (!Number.isFinite(meta) || meta <= 0) {
    return fallar(
      ERRORES.NO_AUTORIZADO,
      'Indica la meta mínima de horas del grupo, mayor que cero.',
    );
  }
  if (fechaTermino && fechaTermino < aFechaISO(ahora())) {
    return fallar(ERRORES.NO_AUTORIZADO, 'La fecha de término no puede ser anterior a hoy.');
  }

  try {
    const grupo = transaccion((datos) => {
      const docente = exigirExista(
        datos.usuarios.find((usuario) => usuario.id === docenteId),
        'El docente no existe.',
      );
      const creadoEn = ahoraISO();
      const nuevo = {
        id: nuevoId('gru'),
        nombre: nombreLimpio,
        descripcion: descripcionLimpia,
        codigo: generarCodigo(
          datos.grupos.map((g) => g.codigo),
          new Date(creadoEn).getFullYear(),
        ),
        metaMinimaHoras: meta,
        // Opcional: permite estimar si el ritmo de cada estudiante alcanza la meta.
        fechaTermino: fechaTermino || null,
        estado: ESTADO_GRUPO.ACTIVO,
        docenteId,
        docenteNombre: docente.nombre,
        creadoEn,
      };
      datos.grupos.push(nuevo);
      return nuevo;
    });

    return responder(enriquecer(grupo, listar('vinculaciones')));
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

/** RN-03: cambia el estado conservando código, estudiantes e historial. */
const cambiarEstado = (grupoId, estado) => {
  try {
    const grupo = transaccion((datos) => {
      const encontrado = exigirExista(
        datos.grupos.find((candidato) => candidato.id === grupoId),
        'El grupo no existe.',
      );
      if (encontrado.estado === estado) {
        throw new ErrorServicio(
          ERRORES.NO_AUTORIZADO,
          estado === ESTADO_GRUPO.ACTIVO
            ? 'El grupo ya está activo.'
            : 'El grupo ya está inactivo.',
        );
      }
      encontrado.estado = estado;

      // Los estudiantes se enteran de que su práctica cambió de estado.
      notificarAlGrupo(datos, {
        grupo: encontrado,
        tipo: estado === ESTADO_GRUPO.ACTIVO
          ? TIPO_NOTIFICACION.GRUPO_REACTIVADO
          : TIPO_NOTIFICACION.GRUPO_DESACTIVADO,
        mensaje: estado === ESTADO_GRUPO.ACTIVO
          ? `Se reactivó la práctica «${encontrado.nombre}». Ya puedes registrar jornadas y entregas.`
          : `Se desactivó la práctica «${encontrado.nombre}». Queda en solo lectura.`,
        referencia: { tipo: TIPO_REFERENCIA.GRUPO, id: encontrado.id },
      });
      return encontrado;
    });

    return responder(enriquecer(grupo, listar('vinculaciones')));
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

/**
 * Elimina el grupo y todo lo que cuelga de él: vinculaciones, jornadas, documentos,
 * entregas y notificaciones. A diferencia de desactivar, no se puede deshacer.
 */
export const eliminar = (grupoId, docenteId = null) => {
  try {
    transaccion((datos) => {
      const grupo = exigirExista(
        datos.grupos.find((candidato) => candidato.id === grupoId),
        'El grupo no existe.',
      );
      // RN-18: el docente solo actúa sobre los grupos de su cuenta.
      if (docenteId && grupo.docenteId !== docenteId) {
        throw new ErrorServicio(
          ERRORES.NO_AUTORIZADO,
          'Solo el docente responsable puede eliminar este grupo.',
        );
      }

      const documentosDelGrupo = new Set(
        datos.documentos.filter((d) => d.grupoId === grupoId).map((d) => d.id),
      );
      const estudiantesVinculados = datos.vinculaciones
        .filter((v) => v.grupoId === grupoId)
        .map((v) => v.estudianteId);
      datos.grupos = datos.grupos.filter((g) => g.id !== grupoId);
      datos.vinculaciones = datos.vinculaciones.filter((v) => v.grupoId !== grupoId);
      datos.jornadas = datos.jornadas.filter((j) => j.grupoId !== grupoId);
      datos.documentos = datos.documentos.filter((d) => d.grupoId !== grupoId);
      datos.entregas = datos.entregas.filter((e) => !documentosDelGrupo.has(e.documentoId));
      datos.notificaciones = datos.notificaciones.filter((n) => n.grupoId !== grupoId);

      // Se avisa a los que estaban vinculados. Sin referencia: el grupo ya no existe.
      estudiantesVinculados.forEach((estudianteId) => notificar(datos, {
        destinatarioId: estudianteId,
        grupo,
        tipo: TIPO_NOTIFICACION.GRUPO_ELIMINADO,
        mensaje: `Se eliminó la práctica «${grupo.nombre}» (${grupo.codigo}). Ya no está disponible.`,
        referencia: null,
      }));
    });

    return responder(grupoId);
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

export const desactivar = (grupoId) => cambiarEstado(grupoId, ESTADO_GRUPO.INACTIVO);
export const reactivar = (grupoId) => cambiarEstado(grupoId, ESTADO_GRUPO.ACTIVO);

/**
 * Padrón del grupo (decisión A-03): quién está vinculado, desde cuándo y cómo va.
 * Es también lo que alimenta el listado previo de la sección Jornadas (§5.6).
 */
/** Semáforo, ritmo, seguimiento y plan de un estudiante: mismas reglas que el backend. */
const seguimientoDeFila = (grupo, vinculacion, jornadas) => {
  const riesgo = evaluarRiesgo({ grupo, vinculacion, jornadas, ahora: ahora() });
  return {
    riesgo: { nivel: riesgo.nivel, motivos: riesgo.motivos },
    ritmoSemanal: riesgo.ritmoSemanal,
    seguimiento: { estado: estadoSeguimiento(vinculacion.id, riesgo) },
    plan: {
      fechaTermino: vinculacion.fechaTerminoIndividual ?? null,
      horasSemanales: vinculacion.compromisoSemanal ?? null,
    },
    mensajesNoLeidos: noLeidosPara(vinculacion.id, grupo.docenteId),
  };
};

export const estudiantesDelGrupo = (grupoId) => {
  const grupo = porId('grupos', grupoId);
  if (!grupo) return fallar(ERRORES.NO_ENCONTRADO, 'El grupo no existe.');

  const usuarios = listar('usuarios');
  const jornadas = listar('jornadas');

  const padron = listar('vinculaciones')
    .filter((vinculacion) => vinculacion.grupoId === grupoId)
    .map((vinculacion) => {
      const usuario = usuarios.find((u) => u.id === vinculacion.estudianteId);
      const suyas = jornadas.filter((j) => j.vinculacionId === vinculacion.id);
      const horas = suyas.reduce((total, j) => total + (j.horas ?? 0), 0);

      return {
        vinculacionId: vinculacion.id,
        estudianteId: vinculacion.estudianteId,
        nombre: usuario?.nombre ?? 'Estudiante',
        correo: usuario?.correo ?? '',
        vinculadoEn: vinculacion.vinculadoEn,
        totalJornadas: suyas.length,
        ...avanceMeta(Math.round(horas * 100) / 100, grupo.metaMinimaHoras),
        solicitudesPendientes: suyas
          .filter((j) => j.solicitud?.estado === ESTADO_SOLICITUD.PENDIENTE).length,
        correccionesHabilitadas: suyas
          .filter((j) => j.estado === ESTADO_JORNADA.OBSERVADA).length,
        ultimaJornada: ultimaJornada(suyas),
        ...seguimientoDeFila(grupo, vinculacion, suyas),
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  return responder(padron);
};

/** Define, cambia o quita (`null`) la fecha de término del grupo. */
export const definirFechaTermino = (grupoId, fechaTermino) => {
  try {
    const grupo = transaccion((datos) => {
      const encontrado = exigirExista(
        datos.grupos.find((candidato) => candidato.id === grupoId),
        'El grupo no existe.',
      );
      if (fechaTermino && fechaTermino < aFechaISO(encontrado.creadoEn)) {
        throw new ErrorServicio(
          ERRORES.NO_AUTORIZADO,
          'La fecha de término no puede ser anterior a la creación del grupo.',
        );
      }
      encontrado.fechaTermino = fechaTermino || null;
      return encontrado;
    });
    return responder(enriquecer(grupo, listar('vinculaciones')));
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

/**
 * Los cuatro indicadores del resumen docente, que §5.4 sí nombra: meta mínima,
 * estudiantes vinculados, solicitudes pendientes y entregas nuevas.
 *
 * Decisión A-11: «entregas nuevas» son las que están ENTREGADO y sobre las que el
 * docente no ha pedido corrección, es decir las que esperan su revisión.
 */
export const resumen = (grupoId) => {
  const grupo = porId('grupos', grupoId);
  if (!grupo) return fallar(ERRORES.NO_ENCONTRADO, 'El grupo no existe.');

  const vinculaciones = listar('vinculaciones').filter((v) => v.grupoId === grupoId);
  const idsVinculacion = new Set(vinculaciones.map((v) => v.id));
  const jornadas = listar('jornadas').filter((j) => idsVinculacion.has(j.vinculacionId));
  const documentosDelGrupo = new Set(
    listar('documentos').filter((d) => d.grupoId === grupoId).map((d) => d.id),
  );

  // Estudiantes con alguna alerta, los en riesgo primero.
  const usuarios = listar('usuarios');
  const alertas = vinculaciones
    .map((vinculacion) => {
      const fila = seguimientoDeFila(
        grupo, vinculacion, jornadas.filter((j) => j.vinculacionId === vinculacion.id),
      );
      return {
        vinculacionId: vinculacion.id,
        nombre: usuarios.find((u) => u.id === vinculacion.estudianteId)?.nombre ?? 'Estudiante',
        riesgo: fila.riesgo,
        seguimiento: fila.seguimiento,
        mensajesNoLeidos: fila.mensajesNoLeidos,
      };
    })
    .filter((fila) => fila.riesgo.nivel !== NIVEL_RIESGO.SIN_ALERTA)
    .sort((a, b) => (a.riesgo.nivel === b.riesgo.nivel ? 0 : a.riesgo.nivel === NIVEL_RIESGO.RIESGO ? -1 : 1));

  return responder({
    metaMinimaHoras: grupo.metaMinimaHoras,
    estudiantesVinculados: vinculaciones.length,
    alertas,
    solicitudesPendientes: jornadas
      .filter((j) => j.solicitud?.estado === ESTADO_SOLICITUD.PENDIENTE).length,
    entregasNuevas: listar('entregas')
      .filter((entrega) => documentosDelGrupo.has(entrega.documentoId)
        && entrega.estado === ESTADO_ENTREGA.ENTREGADO).length,
  });
};

/**
 * Indicadores del resumen del estudiante dentro de un grupo (§4.5).
 *
 * Decisión A-05: el manual no dice cuáles son; este conjunto es el propuesto.
 * RN-06: «restantes» llega a cero pero las horas registradas siguen subiendo. Quien
 * dibuje esto no debe tratar la meta como un tope alcanzado y cerrado.
 */
/** Lo que ve el estudiante: sin las alertas que dependen del docente. */
export const alertaDelEstudiante = (riesgo, vinculacion) => ({
  nivel: riesgo.nivelEstudiante,
  motivos: riesgo.motivosEstudiante,
  ritmoSemanal: riesgo.ritmoSemanal,
  fechaTermino: riesgo.fechaTermino,
  compromisoSemanal: vinculacion?.compromisoSemanal ?? null,
});

export const resumenEstudiante = (grupoId, estudianteId) => {
  const grupo = porId('grupos', grupoId);
  if (!grupo) return fallar(ERRORES.NO_ENCONTRADO, 'El grupo no existe.');

  const jornadas = listar('jornadas')
    .filter((jornada) => jornada.grupoId === grupoId && jornada.estudianteId === estudianteId);
  const horas = Math.round(jornadas.reduce((total, j) => total + (j.horas ?? 0), 0) * 100) / 100;

  const documentosDelGrupo = listar('documentos').filter((d) => d.grupoId === grupoId);
  const idsDocumento = new Set(documentosDelGrupo.map((d) => d.id));
  const entregas = listar('entregas')
    .filter((entrega) => entrega.estudianteId === estudianteId
      && idsDocumento.has(entrega.documentoId));

  const vinculacion = listar('vinculaciones')
    .find((v) => v.grupoId === grupoId && v.estudianteId === estudianteId);
  const riesgo = evaluarRiesgo({ grupo, vinculacion, jornadas, ahora: ahora() });

  return responder({
    vinculacionId: vinculacion?.id ?? null,
    alerta: alertaDelEstudiante(riesgo, vinculacion),
    mensajesNoLeidos: vinculacion ? noLeidosPara(vinculacion.id, estudianteId) : 0,
    ...avanceMeta(horas, grupo.metaMinimaHoras),
    totalJornadas: jornadas.length,
    solicitudesPendientes: jornadas
      .filter((j) => j.solicitud?.estado === ESTADO_SOLICITUD.PENDIENTE).length,
    correccionesHabilitadas: jornadas
      .filter((j) => j.estado === ESTADO_JORNADA.OBSERVADA).length,
    documentosDelGrupo: documentosDelGrupo.length,
    // Lo que le falta por entregar: pendientes más los que le pidieron corregir.
    entregasPendientes: entregas
      .filter((e) => e.estado === ESTADO_ENTREGA.PENDIENTE
        || e.estado === ESTADO_ENTREGA.CORRECCION_SOLICITADA).length,
  });
};

export const grupoMock = {
  listarDelDocente,
  obtener,
  resumenEstudiante,
  obtenerPorCodigo,
  crear,
  desactivar,
  reactivar,
  eliminar,
  definirFechaTermino,
  estudiantesDelGrupo,
  resumen,
};
