/**
 * Seguimiento de alertas en el almacén simulado. Mismas reglas que `RiskFollowUpService`:
 *  - una alerta nueva queda ABIERTA (sin gestionar);
 *  - cuando el docente registra algo pasa a EN_SEGUIMIENTO;
 *  - se cierra (RESUELTA) cuando el docente la resuelve o, si la abrió una alerta, cuando
 *    el estudiante vuelve a estar al día.
 */

import {
  ERRORES, ESTADO_SEGUIMIENTO, NIVEL_RIESGO, TIPO_ACCION_SEGUIMIENTO, TIPO_NOTIFICACION, TIPO_REFERENCIA,
} from '../../utils/constants';
import { aFechaISO, formatearFecha } from '../../utils/fechas';
import { evaluarRiesgo } from '../../utils/riesgo';
import { listar, nuevoId, porId, transaccion } from './db';
import { ahora, ahoraISO } from './reloj';
import {
  ErrorServicio, exigirExista, exigirGrupoActivo, fallar, notificar, responder,
} from './soporte';

const ACCIONES_MANUALES = [
  TIPO_ACCION_SEGUIMIENTO.CONTACTO, TIPO_ACCION_SEGUIMIENTO.ACUERDO, TIPO_ACCION_SEGUIMIENTO.NOTA,
];

const riesgoDe = (vinculacion) => {
  const grupo = porId('grupos', vinculacion.grupoId);
  const jornadas = listar('jornadas').filter((j) => j.vinculacionId === vinculacion.id);
  return evaluarRiesgo({ grupo, vinculacion, jornadas, ahora: ahora() });
};

/** El seguimiento más reciente de una vinculación, o null. */
const ultimoDe = (seguimientos, vinculacionId) => seguimientos
  .filter((s) => s.vinculacionId === vinculacionId)
  .sort((a, b) => new Date(b.abiertaEn) - new Date(a.abiertaEn))[0] ?? null;

/**
 * Estado que corresponde ahora, sin escribir nada: lo usa el padrón del docente.
 * Equivale a `sync` del backend.
 */
export const estadoSeguimiento = (vinculacionId, riesgo) => {
  const ultimo = ultimoDe(listar('seguimientos'), vinculacionId);
  const conAlerta = riesgo.nivel !== NIVEL_RIESGO.SIN_ALERTA;
  if (!ultimo || ultimo.estado === ESTADO_SEGUIMIENTO.RESUELTA) {
    return conAlerta ? ESTADO_SEGUIMIENTO.ABIERTA : (ultimo?.estado ?? null);
  }
  if (!conAlerta && ultimo.nivel !== NIVEL_RIESGO.SIN_ALERTA) return ESTADO_SEGUIMIENTO.RESUELTA;
  return ultimo.estado;
};

const vista = (vinculacionId) => {
  const vinculacion = porId('vinculaciones', vinculacionId);
  const riesgo = riesgoDe(vinculacion);
  const ultimo = ultimoDe(listar('seguimientos'), vinculacionId);

  return {
    vinculacionId,
    estado: estadoSeguimiento(vinculacionId, riesgo),
    abiertaEn: ultimo?.abiertaEn ?? null,
    resueltaEn: ultimo?.resueltaEn ?? null,
    riesgo: { nivel: riesgo.nivel, motivos: riesgo.motivos },
    ritmoSemanal: riesgo.ritmoSemanal,
    fechaTermino: riesgo.fechaTermino,
    plan: {
      fechaTermino: vinculacion.fechaTerminoIndividual ?? null,
      horasSemanales: vinculacion.compromisoSemanal ?? null,
      desde: vinculacion.compromisoDesde ?? null,
    },
    acciones: listar('accionesSeguimiento')
      .filter((a) => a.vinculacionId === vinculacionId)
      .sort((a, b) => new Date(b.creadaEn) - new Date(a.creadaEn)),
  };
};

/** Seguimiento abierto o uno nuevo en seguimiento, dentro de una transacción. */
const abrirOCrear = (datos, vinculacionId) => {
  let seguimiento = ultimoDe(datos.seguimientos, vinculacionId);
  if (!seguimiento || seguimiento.estado === ESTADO_SEGUIMIENTO.RESUELTA) {
    seguimiento = {
      id: nuevoId('seg'), vinculacionId, nivel: NIVEL_RIESGO.SIN_ALERTA, abiertaEn: ahoraISO(), resueltaEn: null,
    };
    datos.seguimientos.push(seguimiento);
  }
  seguimiento.estado = ESTADO_SEGUIMIENTO.EN_SEGUIMIENTO;
  return seguimiento;
};

const registrar = (datos, seguimiento, { tipo, nota, fechaCompromiso = null, automatica = false }) => {
  datos.accionesSeguimiento.push({
    id: nuevoId('acc'),
    seguimientoId: seguimiento.id,
    vinculacionId: seguimiento.vinculacionId,
    tipo,
    nota,
    fechaCompromiso,
    creadaEn: ahoraISO(),
    automatica,
  });
};

/** Vinculación y grupo activo, dentro de una transacción. */
const vinculacionActiva = (datos, vinculacionId) => {
  const vinculacion = exigirExista(
    datos.vinculaciones.find((v) => v.id === vinculacionId),
    'La vinculación no existe.',
  );
  const grupo = exigirGrupoActivo(datos.grupos.find((g) => g.id === vinculacion.grupoId));
  return { vinculacion, grupo };
};

const ejecutar = (vinculacionId, cambio) => {
  try {
    transaccion((datos) => cambio(datos));
    return responder(vista(vinculacionId));
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

export const obtener = (vinculacionId) => {
  if (!porId('vinculaciones', vinculacionId)) return fallar(ERRORES.NO_ENCONTRADO, 'La vinculación no existe.');
  return responder(vista(vinculacionId));
};

export const registrarAccion = (vinculacionId, { tipo, nota, fechaCompromiso = null } = {}) =>
  ejecutar(vinculacionId, (datos) => {
    vinculacionActiva(datos, vinculacionId);
    if (!ACCIONES_MANUALES.includes(tipo)) {
      throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'Elige el tipo de acción: contacto, acuerdo o nota.');
    }
    const texto = String(nota ?? '').trim();
    if (!texto) throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'Describe brevemente lo que hiciste o acordaste.');
    if (fechaCompromiso && fechaCompromiso < aFechaISO(ahora())) {
      throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'La fecha de compromiso no puede ser anterior a hoy.');
    }
    registrar(datos, abrirOCrear(datos, vinculacionId), { tipo, nota: texto, fechaCompromiso: fechaCompromiso || null });
  });

export const resolver = (vinculacionId, nota = '') =>
  ejecutar(vinculacionId, (datos) => {
    vinculacionActiva(datos, vinculacionId);
    const seguimiento = ultimoDe(datos.seguimientos, vinculacionId);
    if (!seguimiento || seguimiento.estado === ESTADO_SEGUIMIENTO.RESUELTA) {
      throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'Este estudiante no tiene una alerta abierta.');
    }
    seguimiento.estado = ESTADO_SEGUIMIENTO.RESUELTA;
    seguimiento.resueltaEn = ahoraISO();
    registrar(datos, seguimiento, {
      tipo: TIPO_ACCION_SEGUIMIENTO.CIERRE,
      nota: String(nota ?? '').trim() || 'El docente marcó la alerta como resuelta.',
    });
  });

export const definirPlan = (vinculacionId, { fechaTermino = null, horasSemanales = null, nota = '' } = {}) =>
  ejecutar(vinculacionId, (datos) => {
    const { vinculacion, grupo } = vinculacionActiva(datos, vinculacionId);
    const hoy = aFechaISO(ahora());
    const horas = horasSemanales === '' || horasSemanales === null ? null : Number(horasSemanales);

    if (fechaTermino && fechaTermino < hoy) {
      throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'La nueva fecha de término no puede ser anterior a hoy.');
    }
    if (horas !== null && (!Number.isFinite(horas) || horas <= 0 || horas > 80)) {
      throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'Las horas semanales deben ser mayores que 0 y como máximo 80.');
    }

    if (horas !== (vinculacion.compromisoSemanal ?? null)) vinculacion.compromisoDesde = horas === null ? null : hoy;
    vinculacion.fechaTerminoIndividual = fechaTermino || null;
    vinculacion.compromisoSemanal = horas;

    const partes = [];
    if (fechaTermino) partes.push(`Nueva fecha de término: ${formatearFecha(fechaTermino)}.`);
    if (horas !== null) partes.push(`Compromiso: ${horas} h por semana.`);
    const resumen = partes.length ? partes.join(' ') : 'Se quitó el plan; vuelve a regir la fecha del grupo.';
    const texto = String(nota ?? '').trim();

    registrar(datos, abrirOCrear(datos, vinculacionId), {
      tipo: TIPO_ACCION_SEGUIMIENTO.PLAN, nota: texto ? `${resumen} ${texto}` : resumen, fechaCompromiso: fechaTermino || null,
    });
    notificar(datos, {
      destinatarioId: vinculacion.estudianteId,
      grupo,
      tipo: TIPO_NOTIFICACION.PLAN_SEGUIMIENTO,
      mensaje: `Tu docente actualizó tu plan de práctica: ${resumen}`,
      referencia: { tipo: TIPO_REFERENCIA.GRUPO, id: grupo.id },
    });
  });

export const seguimientoMock = {
  obtener,
  registrarAccion,
  resolver,
  definirPlan,
};
