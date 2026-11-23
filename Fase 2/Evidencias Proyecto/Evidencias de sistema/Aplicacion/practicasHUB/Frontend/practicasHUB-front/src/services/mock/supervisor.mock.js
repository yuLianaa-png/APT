/**
 * Supervisor del centro de práctica en el almacén simulado. Mismas reglas que
 * `SupervisorService`: lo registra el estudiante o lo corrige el docente, el enlace vence a
 * los 7 días, cambiar el correo invalida los enlaces anteriores y la validación es solo un
 * respaldo (las horas cuentan igual). Sin backend no hay correo: el enlace se muestra en la
 * consola y el docente puede copiarlo.
 */

import {
  ERRORES, ESTADO_GRUPO, ESTADO_VALIDACION, ROLES, STORAGE_KEYS, TIPO_NOTIFICACION, TIPO_REFERENCIA,
} from '../../utils/constants';
import { formatearFecha } from '../../utils/fechas';
import { listar, porId, transaccion } from './db';
import { ahora, ahoraISO } from './reloj';
import {
  ErrorServicio, exigirExista, exigirGrupoActivo, fallar, notificar, responder,
} from './soporte';

const DIAS_VIGENCIA = 7;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ENLACE_INVALIDO = 'Este enlace no es válido o ya venció. Pide al docente del curso que te envíe uno nuevo.';

const usuarioActual = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEYS.USER)) ?? null;
  } catch {
    return null;
  }
};

const estadoDe = (jornada) => jornada.validacion?.estado ?? ESTADO_VALIDACION.PENDIENTE;
const redondear = (valor) => Math.round(valor * 100) / 100;
const horasDe = (jornadas, estado = null) => redondear(jornadas
  .filter((j) => !estado || estadoDe(j) === estado)
  .reduce((total, j) => total + (j.horas ?? 0), 0));

const vista = (vinculacion) => {
  const jornadas = listar('jornadas').filter((j) => j.vinculacionId === vinculacion.id);
  const s = vinculacion.supervisor ?? {};
  return {
    vinculacionId: vinculacion.id,
    registrado: Boolean(s.correo),
    nombre: s.nombre ?? '',
    cargo: s.cargo ?? '',
    correo: s.correo ?? '',
    empresa: s.empresa ?? '',
    ultimoCorreoEn: s.ultimoCorreoEn ?? null,
    pendientes: jornadas.filter((j) => estadoDe(j) === ESTADO_VALIDACION.PENDIENTE).length,
    validadas: jornadas.filter((j) => estadoDe(j) === ESTADO_VALIDACION.VALIDADA).length,
    observadas: jornadas.filter((j) => estadoDe(j) === ESTADO_VALIDACION.OBSERVADA).length,
    horasValidadas: horasDe(jornadas, ESTADO_VALIDACION.VALIDADA),
    horasRegistradas: horasDe(jornadas),
  };
};

/** Devuelve el rol con que actúa, o lanza si no participa. */
const exigirAcceso = (usuario, vinculacion, grupo) => {
  if (usuario?.rol === ROLES.ESTUDIANTE && vinculacion.estudianteId === usuario.id) return ROLES.ESTUDIANTE;
  if (usuario?.rol === ROLES.DOCENTE && grupo.docenteId === usuario.id) return ROLES.DOCENTE;
  throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'No tienes acceso a esta práctica.');
};

const texto = (valor, etiqueta, minimo, maximo) => {
  const limpio = String(valor ?? '').trim();
  if (limpio.length < minimo) throw new ErrorServicio(ERRORES.NO_AUTORIZADO, `Falta ${etiqueta}.`);
  if (limpio.length > maximo) {
    throw new ErrorServicio(ERRORES.NO_AUTORIZADO, `El campo ${etiqueta} no puede superar los ${maximo} caracteres.`);
  }
  return limpio;
};

const ejecutar = (accion) => {
  try {
    return responder(accion());
  } catch (error) {
    return fallar(error.codigo ?? ERRORES.NO_AUTORIZADO, error.mensaje ?? error.message);
  }
};

/** Enlace nuevo dentro de una transacción; el token solo se devuelve aquí. */
const emitirEnlace = (datos, vinculacion) => {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const venceEn = new Date(ahora().getTime() + DIAS_VIGENCIA * 86_400_000).toISOString();
  datos.enlacesSupervisor.push({
    token, vinculacionId: vinculacion.id, correo: vinculacion.supervisor.correo, venceEn, revocadoEn: null,
  });
  return { url: `${window.location.origin}/supervisor/${token}`, venceEn };
};

export const obtener = (vinculacionId) => ejecutar(() => {
  const vinculacion = exigirExista(porId('vinculaciones', vinculacionId), 'La vinculación no existe.');
  exigirAcceso(usuarioActual(), vinculacion, porId('grupos', vinculacion.grupoId));
  return vista(vinculacion);
});

export const guardar = (vinculacionId, { nombre, cargo, correo, empresa } = {}) => ejecutar(() => {
  const usuario = usuarioActual();
  transaccion((datos) => {
    const vinculacion = exigirExista(datos.vinculaciones.find((v) => v.id === vinculacionId), 'La vinculación no existe.');
    const grupo = exigirGrupoActivo(datos.grupos.find((g) => g.id === vinculacion.grupoId));
    const rol = exigirAcceso(usuario, vinculacion, grupo);

    const limpio = {
      nombre: texto(nombre, 'el nombre del supervisor', 3, 120),
      cargo: texto(cargo, 'el cargo del supervisor', 2, 100),
      empresa: texto(empresa, 'la empresa o institución', 2, 150),
      correo: texto(correo, 'el correo del supervisor', 6, 150).toLowerCase(),
    };
    if (!CORREO.test(limpio.correo)) throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'El correo del supervisor no es válido.');
    const correos = [vinculacion.estudianteId, grupo.docenteId]
      .map((uid) => datos.usuarios.find((u) => u.id === uid)?.correo?.toLowerCase());
    if (correos.includes(limpio.correo)) {
      throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'El supervisor debe ser una persona del centro de práctica, no el estudiante ni el docente.');
    }

    const anterior = vinculacion.supervisor ?? {};
    const cambioCorreo = Boolean(anterior.correo) && anterior.correo !== limpio.correo;
    if (cambioCorreo) {
      datos.enlacesSupervisor
        .filter((e) => e.vinculacionId === vinculacionId && !e.revocadoEn)
        .forEach((e) => { e.revocadoEn = ahoraISO(); });
    }
    vinculacion.supervisor = { ...limpio, ultimoCorreoEn: cambioCorreo ? null : (anterior.ultimoCorreoEn ?? null) };

    if (rol === ROLES.ESTUDIANTE) {
      notificar(datos, {
        destinatarioId: grupo.docenteId,
        grupo,
        tipo: TIPO_NOTIFICACION.SUPERVISOR_ACTUALIZADO,
        mensaje: `${usuario.nombre ?? 'Un estudiante'} registró como supervisor a ${limpio.nombre} (${limpio.empresa}).`,
        referencia: { tipo: TIPO_REFERENCIA.VINCULACION, id: vinculacionId },
      });
    }
  });
  return vista(porId('vinculaciones', vinculacionId));
});

/** Vinculación con supervisor, grupo activo y docente dueño: lo que exigen enlace y correo. */
const paraDocente = (datos, vinculacionId) => {
  const vinculacion = exigirExista(datos.vinculaciones.find((v) => v.id === vinculacionId), 'La vinculación no existe.');
  const grupo = exigirGrupoActivo(datos.grupos.find((g) => g.id === vinculacion.grupoId));
  if (exigirAcceso(usuarioActual(), vinculacion, grupo) !== ROLES.DOCENTE) {
    throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'Solo el docente puede enviar el enlace al supervisor.');
  }
  if (!vinculacion.supervisor?.correo) {
    throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'El estudiante todavía no registra a su supervisor.');
  }
  return vinculacion;
};

export const crearEnlace = (vinculacionId) => ejecutar(() =>
  transaccion((datos) => emitirEnlace(datos, paraDocente(datos, vinculacionId))));

export const enviarAhora = (vinculacionId) => ejecutar(() => {
  transaccion((datos) => {
    const vinculacion = paraDocente(datos, vinculacionId);
    const { url } = emitirEnlace(datos, vinculacion);
    vinculacion.supervisor.ultimoCorreoEn = ahoraISO();
    // Sin backend no hay correo: se deja el enlace en la consola para probar el flujo.
    console.info(`[CORREO SIMULADO] Para: ${vinculacion.supervisor.correo} | Enlace: ${url}`);
  });
  return vista(porId('vinculaciones', vinculacionId));
});

/* ----------------------------------------------------------- enlace público del supervisor */

const enlaceValido = (datos, token) => {
  const enlace = datos.enlacesSupervisor.find((e) => e.token === token);
  const vinculacion = enlace && datos.vinculaciones.find((v) => v.id === enlace.vinculacionId);
  if (!enlace || enlace.revocadoEn || new Date(enlace.venceEn) < ahora()
    || !vinculacion || vinculacion.supervisor?.correo !== enlace.correo) {
    throw new ErrorServicio(ERRORES.NO_ENCONTRADO, ENLACE_INVALIDO);
  }
  return { enlace, vinculacion };
};

const vistaPublica = (token) => {
  const { enlace, vinculacion } = transaccion((datos) => enlaceValido(datos, token));
  const grupo = porId('grupos', vinculacion.grupoId);
  const jornadas = listar('jornadas')
    .filter((j) => j.vinculacionId === vinculacion.id)
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  return {
    estudiante: porId('usuarios', vinculacion.estudianteId)?.nombre ?? 'Estudiante',
    practica: grupo?.nombre ?? '',
    empresa: vinculacion.supervisor.empresa,
    supervisor: vinculacion.supervisor.nombre,
    venceEn: enlace.venceEn,
    soloLectura: grupo?.estado !== ESTADO_GRUPO.ACTIVO,
    metaHoras: Number(grupo?.metaMinimaHoras) || 0,
    horasRegistradas: horasDe(jornadas),
    horasValidadas: horasDe(jornadas, ESTADO_VALIDACION.VALIDADA),
    jornadas: jornadas.map((j) => ({
      id: j.id,
      fecha: j.fecha,
      horaInicio: j.horaInicio,
      horaTermino: j.horaTermino,
      descansoMin: j.descansoMin ?? 0,
      horas: j.horas ?? 0,
      actividadPrincipal: j.actividadPrincipal ?? '',
      descripcion: j.descripcion ?? null,
      validacion: {
        estado: estadoDe(j),
        comentario: j.validacion?.comentario ?? null,
        revisadaEn: j.validacion?.revisadaEn ?? null,
      },
    })),
  };
};

export const ver = (token) => ejecutar(() => vistaPublica(token));

export const revisar = (token, { validar = [], observar = [] } = {}) => ejecutar(() => {
  transaccion((datos) => {
    const { vinculacion } = enlaceValido(datos, token);
    const grupo = exigirGrupoActivo(datos.grupos.find((g) => g.id === vinculacion.grupoId));
    if (validar.length + observar.length === 0) {
      throw new ErrorServicio(ERRORES.NO_AUTORIZADO, 'Selecciona al menos una jornada para validar u observar.');
    }
    const suyas = datos.jornadas.filter((j) => j.vinculacionId === vinculacion.id);
    const jornadaDe = (jornadaId) => exigirExista(
      suyas.find((j) => j.id === jornadaId), 'Una de las jornadas no pertenece a este estudiante.',
    );

    validar.forEach((jornadaId) => {
      jornadaDe(jornadaId).validacion = { estado: ESTADO_VALIDACION.VALIDADA, comentario: null, revisadaEn: ahoraISO() };
    });
    const observadas = observar.map(({ jornadaId, comentario }) => {
      const jornada = jornadaDe(jornadaId);
      const limpio = String(comentario ?? '').trim();
      if (limpio.length < 5 || limpio.length > 500) {
        throw new ErrorServicio(ERRORES.NO_AUTORIZADO, `Cada observación debe tener entre 5 y 500 caracteres (jornada del ${formatearFecha(jornada.fecha)}).`);
      }
      jornada.validacion = { estado: ESTADO_VALIDACION.OBSERVADA, comentario: limpio, revisadaEn: ahoraISO() };
      return jornada;
    });

    if (observadas.length > 0) {
      const detalle = observadas.length === 1
        ? `la jornada del ${formatearFecha(observadas[0].fecha)}`
        : `${observadas.length} jornadas`;
      const nombre = datos.usuarios.find((u) => u.id === vinculacion.estudianteId)?.nombre ?? 'un estudiante';
      const referencia = { tipo: TIPO_REFERENCIA.VINCULACION, id: vinculacion.id };
      notificar(datos, {
        destinatarioId: grupo.docenteId, grupo, tipo: TIPO_NOTIFICACION.OBSERVACION_SUPERVISOR,
        mensaje: `El supervisor de ${nombre} observó ${detalle}.`, referencia,
      });
      notificar(datos, {
        destinatarioId: vinculacion.estudianteId, grupo, tipo: TIPO_NOTIFICACION.OBSERVACION_SUPERVISOR,
        mensaje: `Tu supervisor observó ${detalle}. Revisa el comentario en tus jornadas.`, referencia,
      });
    }
  });
  return vistaPublica(token);
});

export const supervisorMock = { obtener, guardar, crearEnlace, enviarAhora };
export const supervisorPublicoMock = { ver, revisar };
