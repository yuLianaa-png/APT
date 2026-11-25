/**
 * Evaluaciones del supervisor en el almacén simulado. Mismas reglas que
 * `SupervisorEvaluationService`, salvo el envío automático: sin backend no hay tarea diaria,
 * así que la evaluación se envía con «Enviar ahora» y el enlace aparece en la consola.
 */

import {
  ERRORES, ESPACIO_PAUTA, ESTADO_EVALUACION, ESTADO_GRUPO, ESTADO_PAUTA, MODO_EVALUACION, ROLES,
  STORAGE_KEYS, TIPO_CRITERIO, TIPO_NOTIFICACION, TIPO_REFERENCIA,
} from '../../utils/constants';
import {
  calcularNota, notaDeSeccion, promedioDeNotas, redondearNota, validarRespuestas,
} from '../../utils/pauta';
import { listar, nuevoId, porId, transaccion } from './db';
import { ahora, ahoraISO } from './reloj';
import {
  ErrorServicio, exigirExista, exigirGrupoActivo, fallar, notificar, responder,
} from './soporte';

const DIAS_VIGENCIA = 7;
const ENLACE_INVALIDO = 'Este enlace no es válido o ya venció. Pide al docente del curso que te envíe uno nuevo.';

const HITOS = {
  [MODO_EVALUACION.UNA_INTERMEDIA]: [{ hito: 'INTERMEDIA', parte: 0.5, espacio: ESPACIO_PAUTA.INTERMEDIA, etiqueta: 'Evaluación intermedia' }],
  [MODO_EVALUACION.UNA_FINAL]: [{ hito: 'FINAL', parte: 1, espacio: ESPACIO_PAUTA.FINAL, etiqueta: 'Evaluación final' }],
  [MODO_EVALUACION.DOS_MISMA]: [
    { hito: 'INTERMEDIA', parte: 0.5, espacio: ESPACIO_PAUTA.AMBAS, etiqueta: 'Evaluación intermedia' },
    { hito: 'FINAL', parte: 1, espacio: ESPACIO_PAUTA.AMBAS, etiqueta: 'Evaluación final' },
  ],
  [MODO_EVALUACION.DOS_DISTINTAS]: [
    { hito: 'INTERMEDIA', parte: 0.5, espacio: ESPACIO_PAUTA.INTERMEDIA, etiqueta: 'Evaluación intermedia' },
    { hito: 'FINAL', parte: 1, espacio: ESPACIO_PAUTA.FINAL, etiqueta: 'Evaluación final' },
  ],
};

const usuarioActual = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEYS.USER)) ?? null;
  } catch {
    return null;
  }
};

const ejecutar = (accion) => {
  try {
    return responder(accion());
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

const hitosDe = (grupo) => HITOS[grupo?.modoEvaluacion] ?? [];
const hitoDe = (grupo, nombre) => {
  const hito = hitosDe(grupo).find((h) => h.hito === nombre);
  if (!hito) throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'Esa evaluación no está configurada en este grupo.');
  return hito;
};

const vista = (evaluacion, hito, horasRequeridas = null, alcanzado = null) => {
  if (!evaluacion) {
    return {
      id: null, hito: hito.hito, etiqueta: hito.etiqueta, estado: ESTADO_EVALUACION.SIN_ENVIAR, horasRequeridas,
      alcanzado, enviadaEn: null, recordatorios: 0, supervisor: null, respondidaEn: null, nota: null,
      notasPorSeccion: null, publicada: false, publicadaEn: null, pauta: null, respuestas: null,
    };
  }
  const pauta = listar('pautas').find((p) => p.id === evaluacion.pautaId) ?? null;
  const respondida = evaluacion.estado === ESTADO_EVALUACION.RESPONDIDA;
  return {
    id: evaluacion.id,
    hito: hito.hito,
    etiqueta: hito.etiqueta,
    estado: evaluacion.estado,
    horasRequeridas,
    alcanzado,
    enviadaEn: evaluacion.enviadaEn ?? null,
    recordatorios: 0,
    supervisor: evaluacion.supervisor ?? null,
    respondidaEn: evaluacion.respondidaEn ?? null,
    nota: evaluacion.nota ?? null,
    notasPorSeccion: respondida && pauta
      ? pauta.secciones.map((_, s) => {
        const nota = notaDeSeccion(pauta.secciones, evaluacion.respuestas, s);
        return nota === null ? null : redondearNota(nota);
      })
      : null,
    publicada: Boolean(evaluacion.publicada),
    publicadaEn: evaluacion.publicadaEn ?? null,
    pauta,
    respuestas: respondida ? evaluacion.respuestas : null,
  };
};

export const deVinculacion = (vinculacionId) => ejecutar(() => {
  const usuario = usuarioActual();
  const vinculacion = exigirExista(porId('vinculaciones', vinculacionId), 'La vinculación no existe.');
  const grupo = porId('grupos', vinculacion.grupoId);
  const esDocente = usuario?.rol === ROLES.DOCENTE && grupo.docenteId === usuario.id;
  const esEstudiante = usuario?.rol === ROLES.ESTUDIANTE && vinculacion.estudianteId === usuario.id;
  if (!esDocente && !esEstudiante) throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'No tienes acceso a esta práctica.');

  const horas = listar('jornadas').filter((j) => j.vinculacionId === vinculacionId).reduce((t, j) => t + (j.horas ?? 0), 0);
  const evaluaciones = listar('evaluaciones').filter((e) => e.vinculacionId === vinculacionId);
  return hitosDe(grupo)
    .map((hito) => ({ hito, evaluacion: evaluaciones.find((e) => e.hito === hito.hito) ?? null }))
    // El estudiante solo ve lo que el docente publicó.
    .filter(({ evaluacion }) => esDocente || evaluacion?.publicada)
    .map(({ hito, evaluacion }) => {
      const requeridas = grupo.metaMinimaHoras ? grupo.metaMinimaHoras * hito.parte : null;
      return vista(evaluacion, hito, requeridas, requeridas !== null && horas >= requeridas);
    });
});

/** Lo común de enviar y copiar enlace, dentro de una transacción. */
const preparar = (datos, vinculacionId, nombreHito) => {
  const vinculacion = exigirExista(datos.vinculaciones.find((v) => v.id === vinculacionId), 'La vinculación no existe.');
  const grupo = exigirGrupoActivo(datos.grupos.find((g) => g.id === vinculacion.grupoId));
  const usuario = usuarioActual();
  if (usuario?.rol !== ROLES.DOCENTE || grupo.docenteId !== usuario.id) {
    throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'No eres el docente de este grupo.');
  }
  if (!vinculacion.supervisor?.correo) throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'El estudiante todavía no registra a su supervisor.');
  const hito = hitoDe(grupo, nombreHito);

  let evaluacion = datos.evaluaciones.find((e) => e.vinculacionId === vinculacionId && e.hito === hito.hito);
  if (evaluacion?.estado === ESTADO_EVALUACION.RESPONDIDA) {
    throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'El supervisor ya respondió esta evaluación.');
  }
  const pauta = evaluacion?.pautaId
    ? datos.pautas.find((p) => p.id === evaluacion.pautaId)
    : datos.pautas.find((p) => p.grupoId === grupo.id && p.espacio === hito.espacio && p.estado === ESTADO_PAUTA.PUBLICADA);
  if (!pauta) throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'Primero publica la pauta de esta evaluación.');

  if (!evaluacion) {
    evaluacion = { id: nuevoId('eva'), vinculacionId, grupoId: grupo.id, hito: hito.hito, publicada: false };
    datos.evaluaciones.push(evaluacion);
  }
  pauta.bloqueada = true;
  evaluacion.pautaId = pauta.id;
  if (evaluacion.estado !== ESTADO_EVALUACION.ENVIADA) {
    evaluacion.estado = ESTADO_EVALUACION.ENVIADA;
    evaluacion.enviadaEn = ahoraISO();
  }

  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const venceEn = new Date(ahora().getTime() + DIAS_VIGENCIA * 86_400_000).toISOString();
  datos.enlacesSupervisor.push({
    token, vinculacionId, correo: vinculacion.supervisor.correo, venceEn, revocadoEn: null,
    proposito: 'EVALUACION', evaluacionId: evaluacion.id,
  });
  return { evaluacion, hito, url: `${window.location.origin}/supervisor/evaluacion/${token}`, venceEn, vinculacion };
};

export const enviarAhora = (vinculacionId, hito) => ejecutar(() => {
  const { evaluacion, hito: h, url, vinculacion } = transaccion((datos) => preparar(datos, vinculacionId, hito));
  console.info(`[CORREO SIMULADO] Para: ${vinculacion.supervisor.correo} | Enlace: ${url}`);
  return vista(evaluacion, h);
});

export const crearEnlace = (vinculacionId, hito) => ejecutar(() => {
  const { url, venceEn } = transaccion((datos) => preparar(datos, vinculacionId, hito));
  return { url, venceEn };
});

const publicarUna = (datos, evaluacion, grupo, etiqueta) => {
  if (evaluacion.publicada) return;
  evaluacion.publicada = true;
  evaluacion.publicadaEn = ahoraISO();
  const vinculacion = datos.vinculaciones.find((v) => v.id === evaluacion.vinculacionId);
  notificar(datos, {
    destinatarioId: vinculacion.estudianteId,
    grupo,
    tipo: TIPO_NOTIFICACION.EVALUACION_PUBLICADA,
    mensaje: `Tu docente publicó la ${etiqueta.toLowerCase()} que hizo tu supervisor. Ya puedes verla en el resumen de tu práctica.`,
    referencia: { tipo: TIPO_REFERENCIA.EVALUACION, id: grupo.id },
  });
};

const docenteDe = (grupo) => {
  const usuario = usuarioActual();
  if (usuario?.rol !== ROLES.DOCENTE || grupo.docenteId !== usuario.id) {
    throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'No eres el docente de este grupo.');
  }
};

export const publicar = (vinculacionId, nombreHito) => ejecutar(() => {
  const resultado = transaccion((datos) => {
    const vinculacion = exigirExista(datos.vinculaciones.find((v) => v.id === vinculacionId), 'La vinculación no existe.');
    const grupo = datos.grupos.find((g) => g.id === vinculacion.grupoId);
    docenteDe(grupo);
    const hito = hitoDe(grupo, nombreHito);
    const evaluacion = datos.evaluaciones.find((e) => e.vinculacionId === vinculacionId && e.hito === hito.hito);
    if (evaluacion?.estado !== ESTADO_EVALUACION.RESPONDIDA) {
      throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'El supervisor todavía no responde esta evaluación.');
    }
    publicarUna(datos, evaluacion, grupo, hito.etiqueta);
    return { evaluacion, hito };
  });
  return vista(resultado.evaluacion, resultado.hito);
});

const resultados = (grupoId) => {
  const grupo = porId('grupos', grupoId);
  const evaluaciones = listar('evaluaciones').filter((e) => e.grupoId === grupoId);
  return hitosDe(grupo).map((hito) => {
    const suyas = evaluaciones.filter((e) => e.hito === hito.hito);
    return {
      hito: hito.hito,
      etiqueta: hito.etiqueta,
      esperandoPauta: suyas.filter((e) => e.estado === ESTADO_EVALUACION.ESPERANDO_PAUTA).length,
      enviadas: suyas.filter((e) => e.estado === ESTADO_EVALUACION.ENVIADA).length,
      respondidas: suyas.filter((e) => e.estado === ESTADO_EVALUACION.RESPONDIDA).length,
      publicadas: suyas.filter((e) => e.publicada).length,
    };
  });
};

export const resultadosDelGrupo = (grupoId) => ejecutar(() => {
  docenteDe(exigirExista(porId('grupos', grupoId), 'El grupo no existe.'));
  return resultados(grupoId);
});

export const publicarDelGrupo = (grupoId, nombreHito) => ejecutar(() => {
  transaccion((datos) => {
    const grupo = exigirExista(datos.grupos.find((g) => g.id === grupoId), 'El grupo no existe.');
    docenteDe(grupo);
    const hito = hitoDe(grupo, nombreHito);
    datos.evaluaciones
      .filter((e) => e.grupoId === grupoId && e.hito === hito.hito && e.estado === ESTADO_EVALUACION.RESPONDIDA)
      .forEach((e) => publicarUna(datos, e, grupo, hito.etiqueta));
  });
  return resultados(grupoId);
});

/* --------------------------------------------------------------- enlace del supervisor */

const acceso = (datos, token) => {
  const enlace = datos.enlacesSupervisor.find((e) => e.token === token && e.proposito === 'EVALUACION');
  const vinculacion = enlace && datos.vinculaciones.find((v) => v.id === enlace.vinculacionId);
  const evaluacion = enlace && datos.evaluaciones.find((e) => e.id === enlace.evaluacionId);
  if (!enlace || enlace.revocadoEn || new Date(enlace.venceEn) < ahora() || !vinculacion || !evaluacion
    || vinculacion.supervisor?.correo !== enlace.correo) {
    throw new ErrorServicio(ERRORES.NO_ENCONTRADO, ENLACE_INVALIDO);
  }
  const grupo = datos.grupos.find((g) => g.id === vinculacion.grupoId);
  const pauta = datos.pautas.find((p) => p.id === evaluacion.pautaId);
  return { enlace, vinculacion, evaluacion, grupo, pauta };
};

const vistaPublica = (token) => {
  const { enlace, vinculacion, evaluacion, grupo, pauta } = transaccion((datos) => acceso(datos, token));
  const enviada = evaluacion.estado === ESTADO_EVALUACION.RESPONDIDA;
  return {
    estudiante: porId('usuarios', vinculacion.estudianteId)?.nombre ?? 'Estudiante',
    practica: grupo.nombre,
    empresa: vinculacion.supervisor.empresa,
    supervisor: vinculacion.supervisor.nombre,
    etiqueta: hitoDe(grupo, evaluacion.hito).etiqueta,
    venceEn: enlace.venceEn,
    enviada,
    enviadaEn: evaluacion.respondidaEn ?? null,
    soloLectura: grupo.estado !== ESTADO_GRUPO.ACTIVO,
    pauta: enviada ? null : pauta,
  };
};

export const ver = (token) => ejecutar(() => vistaPublica(token));

export const enviar = (token, respuestas) => ejecutar(() => {
  transaccion((datos) => {
    const { vinculacion, evaluacion, grupo, pauta } = acceso(datos, token);
    if (evaluacion.estado === ESTADO_EVALUACION.RESPONDIDA) {
      throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'Esta evaluación ya fue enviada.');
    }
    exigirGrupoActivo(grupo);
    const { lista } = validarRespuestas(pauta.secciones, respuestas);
    if (lista.length > 0) throw new ErrorServicio(ERRORES.NO_AUTORIZADO, lista[0]);

    // Los calculados los pone el sistema, igual que el backend.
    const guardadas = respuestas.map((seccion, s) => ({
      criterios: seccion.criterios.map((r, c) => {
        const criterio = pauta.secciones[s].criterios[c];
        if (criterio.tipo === TIPO_CRITERIO.CALCULADO) {
          const valor = promedioDeNotas(pauta.secciones, respuestas, criterio.seccionOrigen);
          return { nota: valor === null ? null : redondearNota(valor), noAplica: false, texto: '', actividades: [] };
        }
        return {
          nota: r.noAplica ? null : r.nota,
          noAplica: Boolean(r.noAplica),
          texto: String(r.texto ?? '').trim(),
          actividades: (r.actividades ?? []).map((a) => ({ descripcion: a.descripcion.trim(), nota: a.nota })),
        };
      }),
    }));
    Object.assign(evaluacion, {
      estado: ESTADO_EVALUACION.RESPONDIDA,
      respondidaEn: ahoraISO(),
      respuestas: guardadas,
      nota: calcularNota(pauta.secciones, guardadas),
      supervisor: vinculacion.supervisor.nombre,
    });
    const nombre = datos.usuarios.find((u) => u.id === vinculacion.estudianteId)?.nombre ?? 'un estudiante';
    notificar(datos, {
      destinatarioId: grupo.docenteId,
      grupo,
      tipo: TIPO_NOTIFICACION.EVALUACION_RECIBIDA,
      mensaje: `El supervisor de ${nombre} envió la ${hitoDe(grupo, evaluacion.hito).etiqueta.toLowerCase()}. Revísala y publícala cuando quieras.`,
      referencia: { tipo: TIPO_REFERENCIA.VINCULACION, id: vinculacion.id },
    });
  });
  return vistaPublica(token);
});

export const evaluacionMock = {
  deVinculacion, enviarAhora, crearEnlace, publicar, resultadosDelGrupo, publicarDelGrupo,
};
export const evaluacionPublicaMock = { ver, enviar };
