/**
 * Implementación sobre la API REST real (Spring Boot, a través del API Gateway).
 *
 * Mismas firmas y MISMA FORMA DE DATOS que los servicios simulados de `services/mock/`:
 * las pantallas no saben si hablan con el mock o con el backend. Todo lo que aquí se hace
 * es traducir:
 *
 *   backend (inglés, ids numéricos)  ->  contrato del front (español, ids como texto)
 *
 * Reglas de esta capa:
 *  - Los ids se devuelven SIEMPRE como texto, porque las rutas (`:grupoId`,
 *    `:vinculacionId`) llegan como texto y las pantallas comparan con `===`.
 *  - Los errores se rechazan con `{ codigo, mensaje }` (lo arma el interceptor de
 *    `services/api.js`), igual que el mock.
 *  - El backend es el único que autoriza de verdad (RNF-03): valida rol, pertenencia al
 *    grupo y relación con el recurso. Lo que se valida aquí es solo para dar un mensaje
 *    claro antes de ir al servidor.
 *
 * Mapa de rutas usadas (todas relativas a VITE_API_URL, por omisión http://localhost:8080/api):
 *   auth-service         /auth/login, /auth/register, /users/{id}
 *   practice-service     /groups/*, /enrollments/*, /logs/* (incluye seguimiento y mensajes)
 *   document-service     /documents/*
 *   notification-service /notifications/*
 */

import api from '../api';
import {
  ERRORES,
  ESTADO_ENTREGA,
  ESTADO_GRUPO,
  ESTADO_JORNADA,
  ESTADO_SEGUIMIENTO,
  ESTADO_SOLICITUD,
  NIVEL_RIESGO,
  ROLES,
  STORAGE_KEYS,
  TIPO_DOCUMENTO,
  TIPO_NOTIFICACION,
  TIPO_REFERENCIA,
} from '../../utils/constants';
import { anioDelGrupo, esFechaFutura, formatearFecha } from '../../utils/fechas';
import { avanceMeta, validarDuracion } from '../../utils/horas';
import { validarArchivo } from '../../utils/archivos';

/* ------------------------------------------------------------------ utilidades */

const datos = (respuesta) => respuesta.data;

/** Id del backend (número) -> id del front (texto). */
const id = (valor) => (valor === null || valor === undefined ? null : String(valor));

const redondear = (numero) => Math.round((Number(numero) || 0) * 100) / 100;

/** Error con la misma forma que el mock: `{ codigo, mensaje }`. */
const fallo = (codigo, mensaje) => Object.assign(new Error(mensaje), { codigo, mensaje });

/**
 * El backend guarda `LocalDateTime` sin zona horaria. Los contenedores de Docker corren en
 * UTC, así que se marca como UTC para que el navegador lo muestre en la hora local.
 */
const instante = (texto) => {
  if (!texto) return null;
  const valor = String(texto);
  return /([zZ]|[+-]\d\d:?\d\d)$/.test(valor) ? valor : `${valor}Z`;
};

/** '08:30:00' -> '08:30'. */
const hora = (texto) => (texto ? String(texto).slice(0, 5) : '');

const extensionDe = (nombre) => {
  const partes = String(nombre ?? '').toLowerCase().split('.');
  return partes.length > 1 ? partes.at(-1) : '';
};

/** Usuario de la sesión (lo guarda AuthContext al iniciar sesión). */
const usuarioActual = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEYS.USER)) ?? null;
  } catch {
    return null;
  }
};

const esDocenteActual = () => usuarioActual()?.rol === ROLES.DOCENTE;

/*
 * Nombres de usuario: no se piden sueltos. El backend solo deja consultar el perfil
 * propio (`/users/{id}`); los nombres de los demás llegan dentro de las respuestas que
 * ya están autorizadas (padrón del grupo, inscripciones, grupo). Minimización de datos:
 * cada nombre o correo aparece solo donde ya está justificado verlo.
 */

/* ------------------------------------------------------------------------ auth */

const rolDelBackend = (rol) => {
  const texto = String(rol ?? '').toUpperCase();
  return texto === 'PROFESOR' ? ROLES.DOCENTE : texto;
};

const rolParaBackend = (rol) => (rol === ROLES.DOCENTE ? 'PROFESOR' : 'ESTUDIANTE');

const sesionDesde = (respuesta) => ({
  usuario: {
    id: id(respuesta.id),
    nombre: respuesta.name,
    correo: respuesta.email,
    rol: rolDelBackend(respuesta.role),
  },
  token: respuesta.token,
});

const MENSAJES_AUTH = {
  'Invalid Credentials': 'Las credenciales no corresponden a una cuenta registrada.',
  'Email already in use': 'Ese correo ya tiene una cuenta. Inicia sesión o usa otro correo.',
  'Invalid role': 'Elige si te registras como estudiante o como docente.',
  'Role is required': 'Elige si te registras como estudiante o como docente.',
};

const traducirErrorAuth = (error) => {
  if (error?.mensaje && MENSAJES_AUTH[error.mensaje]) {
    error.mensaje = MENSAJES_AUTH[error.mensaje];
  }
  throw error;
};

export const authHttp = {
  login: (correo, password) =>
    api.post('/auth/login', { email: correo, password })
      .then((respuesta) => sesionDesde(respuesta.data))
      .catch(traducirErrorAuth),

  registrar: ({ nombre, correo, password, rol } = {}) =>
    api.post('/auth/register', {
      name: String(nombre ?? '').trim().replace(/\s+/g, ' '),
      email: String(correo ?? '').trim().toLowerCase(),
      password,
      role: rolParaBackend(rol),
    })
      .then((respuesta) => sesionDesde(respuesta.data))
      .catch(traducirErrorAuth),

  perfil: async () => {
    const actual = usuarioActual();
    const usuario = actual?.id ? await api.get(`/users/${actual.id}`).then(datos).catch(() => null) : null;
    if (!usuario) throw fallo(ERRORES.NO_AUTORIZADO, 'La sesión no es válida.');
    return {
      id: id(usuario.id), nombre: usuario.name, correo: usuario.email, rol: rolDelBackend(usuario.role),
    };
  },

  // Solo tiene sentido con datos simulados: con backend no se enseña ninguna cuenta.
  cuentasDisponibles: () => Promise.resolve([]),
};

/* ---------------------------------------------------------------------- grupos */

const estadoGrupo = (estado) =>
  (String(estado ?? '').toUpperCase() === 'ACTIVO' ? ESTADO_GRUPO.ACTIVO : ESTADO_GRUPO.INACTIVO);

/** PracticeGroup -> grupo del front. */
const mapearGrupo = (grupo, extra = {}) => {
  const creadoEn = instante(grupo.creationDate);
  return {
    id: id(grupo.idGroup),
    nombre: grupo.courseName ?? '',
    descripcion: grupo.description ?? '',
    codigo: grupo.groupCode ?? '',
    metaMinimaHoras: Number(grupo.minimumHours) || 0,
    estado: estadoGrupo(grupo.status),
    docenteId: id(grupo.idProfessor),
    // El backend completa el nombre del docente al responder (campo no guardado).
    docenteNombre: grupo.professorName ?? '',
    creadoEn,
    anio: anioDelGrupo(creadoEn) ?? (Number(grupo.period) || null),
    // 'YYYY-MM-DD' u null: permite estimar si el ritmo de cada estudiante alcanza la meta.
    fechaTermino: grupo.endDate ?? null,
    totalEstudiantes: extra.totalEstudiantes ?? 0,
  };
};

const grupoCrudo = (grupoId) => api.get(`/groups/${grupoId}`).then(datos);

const idsDeEstudiantes = (grupoId) =>
  api.get(`/enrollments/group/${grupoId}/student-ids`)
    .then((respuesta) => (respuesta.data ?? []).map(id))
    .catch(() => []);

const completarGrupo = async (crudo) => {
  const estudiantes = await idsDeEstudiantes(crudo.idGroup);
  return mapearGrupo(crudo, { totalEstudiantes: estudiantes.length });
};

/** riskLevel / riskReasons del padrón -> riesgo del front. */
const riesgoDe = (fila) => ({
  nivel: NIVEL_RIESGO[fila.riskLevel] ?? NIVEL_RIESGO.SIN_ALERTA,
  motivos: fila.riskReasons ?? [],
});

const numeroONulo = (valor) => (valor === null || valor === undefined ? null : Number(valor));

/** Padrón del grupo tal como lo da el backend (solo docente). */
const padronCrudo = (grupoId) =>
  api.get(`/enrollments/group/${grupoId}/students`).then(datos);

const cambiarEstadoGrupo = async (grupoId, objetivo) => {
  const actual = mapearGrupo(await grupoCrudo(grupoId));
  if (actual.estado === objetivo) {
    throw fallo(
      ERRORES.NO_AUTORIZADO,
      objetivo === ESTADO_GRUPO.ACTIVO ? 'El grupo ya está activo.' : 'El grupo ya está inactivo.',
    );
  }

  // El backend alterna Activo/Inactivo y toma al docente del token: no se envía su id.
  const respuesta = await api.put(`/groups/${grupoId}/toggle-status`);
  return completarGrupo(respuesta.data);
};

export const grupoHttp = {
  /** RF-02: todos los grupos del docente, inactivos incluidos. */
  listarDelDocente: async () => {
    const grupos = await api.get('/groups/my-groups').then(datos);
    const completos = await Promise.all((grupos ?? []).map(completarGrupo));
    return completos.sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn));
  },

  obtener: async (grupoId) => completarGrupo(await grupoCrudo(grupoId)),

  obtenerPorCodigo: (codigo) => vinculacionHttp.previsualizarCodigo(codigo),

  /** RF-03 y RN-01: crea el grupo; el código lo genera el backend. */
  crear: async ({
    nombre, descripcion, metaMinimaHoras, fechaTermino = null,
  } = {}) => {
    const nombreLimpio = String(nombre ?? '').trim();
    const descripcionLimpia = String(descripcion ?? '').trim();
    const meta = Number(metaMinimaHoras);

    if (!nombreLimpio || !descripcionLimpia) {
      throw fallo(ERRORES.NO_AUTORIZADO, 'El nombre y la descripción del grupo son obligatorios.');
    }
    if (!Number.isFinite(meta) || meta <= 0) {
      throw fallo(ERRORES.NO_AUTORIZADO, 'Indica la meta mínima de horas del grupo, mayor que cero.');
    }

    const creado = await api.post('/groups/create', {
      courseName: nombreLimpio,
      description: descripcionLimpia,
      minimumHours: Math.round(meta),
      period: String(new Date().getFullYear()),
      endDate: fechaTermino || null,
    }).then(datos);

    return completarGrupo(creado);
  },

  /** Elimina el grupo. El backend comprueba que quien lo pide sea su docente. */
  eliminar: (grupoId) => api.delete(`/groups/${grupoId}`).then(() => id(grupoId)),

  /** Define, cambia o quita (`null`) la fecha de término del grupo. */
  definirFechaTermino: async (grupoId, fechaTermino) => {
    const grupo = await api.put(`/groups/${grupoId}/end-date`, { endDate: fechaTermino || null }).then(datos);
    return completarGrupo(grupo);
  },

  desactivar: (grupoId) => cambiarEstadoGrupo(grupoId, ESTADO_GRUPO.INACTIVO),
  reactivar: (grupoId) => cambiarEstadoGrupo(grupoId, ESTADO_GRUPO.ACTIVO),

  /** Padrón del grupo (decisión A-03), ordenado por nombre. */
  estudiantesDelGrupo: async (grupoId) => {
    const [grupo, padron] = await Promise.all([grupoCrudo(grupoId), padronCrudo(grupoId)]);
    const meta = Number(grupo.minimumHours) || 0;

    const filas = (padron ?? []).map((fila) => ({
        vinculacionId: id(fila.enrollmentId),
        estudianteId: id(fila.studentId),
        // El padrón ya trae nombre y correo: solo lo puede pedir el docente del grupo.
        nombre: fila.studentName || 'Estudiante',
        correo: fila.studentEmail ?? '',
        vinculadoEn: instante(fila.enrollmentDate),
        totalJornadas: fila.totalLogs ?? 0,
        ...avanceMeta(redondear(fila.registeredHours), meta),
        solicitudesPendientes: fila.pendingRequests ?? 0,
        correccionesHabilitadas: fila.enabledCorrections ?? 0,
        ultimaJornada: fila.lastLogDate ?? null,
        // Semáforo calculado en el backend (PracticeRiskService).
        riesgo: riesgoDe(fila),
        ritmoSemanal: numeroONulo(fila.requiredWeeklyHours),
        // Qué hizo el docente con la alerta (RiskFollowUpService); null si nunca tuvo una.
        seguimiento: { estado: ESTADO_SEGUIMIENTO[fila.followUpStatus] ?? null },
        plan: {
          fechaTermino: fila.customEndDate ?? null,
          horasSemanales: numeroONulo(fila.weeklyHoursCommitment),
        },
        mensajesNoLeidos: Number(fila.unreadMessages) || 0,
    }));

    return filas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  },

  /** Indicadores del resumen docente (§5.4). */
  resumen: async (grupoId) => {
    const [grupo, padron, entregas] = await Promise.all([
      grupoCrudo(grupoId),
      padronCrudo(grupoId),
      api.get(`/documents/submission/group/${grupoId}/history`).then(datos).catch(() => []),
    ]);

    return {
      metaMinimaHoras: Number(grupo.minimumHours) || 0,
      estudiantesVinculados: (padron ?? []).length,
      // Estudiantes con alguna alerta, los en riesgo primero.
      alertas: (padron ?? [])
        .map((fila) => ({
          vinculacionId: id(fila.enrollmentId),
          nombre: fila.studentName || 'Estudiante',
          riesgo: riesgoDe(fila),
          seguimiento: { estado: ESTADO_SEGUIMIENTO[fila.followUpStatus] ?? null },
          mensajesNoLeidos: Number(fila.unreadMessages) || 0,
        }))
        .filter((fila) => fila.riesgo.nivel !== NIVEL_RIESGO.SIN_ALERTA)
        .sort((a, b) => (a.riesgo.nivel === b.riesgo.nivel ? 0 : a.riesgo.nivel === NIVEL_RIESGO.RIESGO ? -1 : 1)),
      solicitudesPendientes: (padron ?? []).reduce((total, f) => total + (f.pendingRequests ?? 0), 0),
      // Decisión A-11: entregas enviadas que esperan revisión del docente.
      entregasNuevas: (entregas ?? [])
        .filter((e) => e.active && String(e.status).toLowerCase() === 'entregado').length,
    };
  },

  /** Indicadores del resumen del estudiante dentro de un grupo (§4.5). */
  resumenEstudiante: async (grupoId, estudianteId) => {
    const [indicadoresJornadas, tarjetas, inscripcion] = await Promise.all([
      jornadaHttp.indicadores(estudianteId, grupoId),
      documentoHttp.listarParaEstudiante(grupoId, estudianteId),
      buscarInscripcion((v) => id(v.practiceGroupId) === id(grupoId)),
    ]);

    return {
      vinculacionId: id(inscripcion?.enrollmentId),
      // Lo que el estudiante necesita para ponerse al día (sin las alertas del docente).
      alerta: alertaDelEstudiante(inscripcion),
      mensajesNoLeidos: Number(inscripcion?.unreadMessages) || 0,
      ...avanceMeta(indicadoresJornadas.horasRegistradas, indicadoresJornadas.metaMinimaHoras),
      totalJornadas: indicadoresJornadas.totalJornadas,
      solicitudesPendientes: indicadoresJornadas.solicitudesPendientes,
      correccionesHabilitadas: indicadoresJornadas.correccionesHabilitadas,
      documentosDelGrupo: tarjetas.length,
      entregasPendientes: tarjetas
        .filter(({ entrega }) => entrega && (entrega.estado === ESTADO_ENTREGA.PENDIENTE
          || entrega.estado === ESTADO_ENTREGA.CORRECCION_SOLICITADA)).length,
    };
  },
};

/* ---------------------------------------------------------------- vinculación */

const misInscripciones = () => api.get('/enrollments/my-enrollments').then(datos);

/** StudentEnrollmentDTO -> vinculación del front. */
const mapearVinculacion = (inscripcion) => ({
  id: id(inscripcion.enrollmentId),
  grupoId: id(inscripcion.practiceGroupId),
  estudianteId: id(usuarioActual()?.id),
  vinculadoEn: instante(inscripcion.enrollmentDate),
});

/** Alerta, ritmo y plan del estudiante tal como los calcula el backend. */
const alertaDelEstudiante = (inscripcion) => ({
  nivel: NIVEL_RIESGO[inscripcion?.riskLevel] ?? NIVEL_RIESGO.SIN_ALERTA,
  motivos: inscripcion?.riskReasons ?? [],
  ritmoSemanal: numeroONulo(inscripcion?.requiredWeeklyHours),
  fechaTermino: inscripcion?.endDate ?? null,
  compromisoSemanal: numeroONulo(inscripcion?.weeklyHoursCommitment),
});

const buscarInscripcion = async (predicado) => (await misInscripciones() ?? []).find(predicado) ?? null;

const anioDeInscripcion = (inscripcion) =>
  anioDelGrupo(instante(inscripcion.groupCreationDate)) ?? (Number(inscripcion.period) || null);

/** Traduce los mensajes del backend al código de error del front. */
const conCodigoDeVinculacion = (error) => {
  const texto = String(error?.mensaje ?? '');
  if (/no corresponde a ningún grupo/i.test(texto)) error.codigo = ERRORES.CODIGO_INEXISTENTE;
  else if (/inactivo/i.test(texto)) error.codigo = ERRORES.GRUPO_INACTIVO;
  else if (/ya te encuentras vinculado/i.test(texto)) error.codigo = ERRORES.YA_VINCULADO;
  throw error;
};

const codigoLimpio = (codigo) => encodeURIComponent(String(codigo ?? '').trim().toUpperCase());

export const vinculacionHttp = {
  /** RF-05: todas las prácticas del estudiante, activas primero. */
  listarDelEstudiante: async () => {
    const inscripciones = await misInscripciones() ?? [];

    const practicas = inscripciones.map((v) => ({
      vinculacionId: id(v.enrollmentId),
      vinculadoEn: instante(v.enrollmentDate),
      grupoId: id(v.practiceGroupId),
      nombre: v.courseName ?? '',
      descripcion: v.description ?? '',
      codigo: v.groupCode ?? '',
      estado: estadoGrupo(v.status),
      docenteNombre: v.professorName ?? '',
      metaMinimaHoras: Number(v.requiredHours) || 0,
      anio: anioDeInscripcion(v),
      totalJornadas: v.totalLogs ?? 0,
      ...avanceMeta(redondear(v.registeredHours), v.requiredHours),
      solicitudesPendientes: v.pendingRequests ?? 0,
      alerta: alertaDelEstudiante(v),
      mensajesNoLeidos: Number(v.unreadMessages) || 0,
    }));

    return practicas.sort((a, b) => {
      if (a.estado !== b.estado) return a.estado === ESTADO_GRUPO.ACTIVO ? -1 : 1;
      return new Date(b.vinculadoEn) - new Date(a.vinculadoEn);
    });
  },

  obtener: async (vinculacionId) => {
    const inscripcion = await buscarInscripcion((v) => id(v.enrollmentId) === id(vinculacionId));
    if (!inscripcion) throw fallo(ERRORES.NO_ENCONTRADO, 'La vinculación no existe.');
    return mapearVinculacion(inscripcion);
  },

  /** La vinculación del estudiante con un grupo, o null si no está vinculado. */
  deEstudianteEnGrupo: async (_estudianteId, grupoId) => {
    const inscripcion = await buscarInscripcion((v) => id(v.practiceGroupId) === id(grupoId));
    return inscripcion ? mapearVinculacion(inscripcion) : null;
  },

  /** §4.3: vista previa del grupo antes de confirmar. No crea nada. */
  previsualizarCodigo: async (codigo) => {
    if (!String(codigo ?? '').trim()) {
      throw fallo(ERRORES.CODIGO_INEXISTENTE, 'Ingresa un código de vinculación.');
    }
    const grupo = await api.get(`/enrollments/preview/${codigoLimpio(codigo)}`)
      .then(datos)
      .catch(conCodigoDeVinculacion);
    const completo = await completarGrupo(grupo);

    return {
      grupoId: completo.id,
      nombre: completo.nombre,
      descripcion: completo.descripcion,
      codigo: completo.codigo,
      docenteNombre: completo.docenteNombre,
      metaMinimaHoras: completo.metaMinimaHoras,
      estado: completo.estado,
      anio: completo.anio,
    };
  },

  /** RF-06: crea la vinculación después de la confirmación del estudiante. */
  vincular: async (codigo) => {
    const inscripcion = await api.post(`/enrollments/join/${codigoLimpio(codigo)}`)
      .then(datos)
      .catch(conCodigoDeVinculacion);
    const grupo = await grupoHttp.obtener(inscripcion.practiceGroupId);

    return {
      vinculacion: {
        id: id(inscripcion.enrollmentId),
        grupoId: id(inscripcion.practiceGroupId),
        estudianteId: id(inscripcion.studentId),
        vinculadoEn: instante(inscripcion.enrollmentDate),
      },
      grupo,
    };
  },

  /** Ficha de *Mi práctica* (decisión A-04). */
  fichaDePractica: async (vinculacionId) => {
    const v = await buscarInscripcion((i) => id(i.enrollmentId) === id(vinculacionId));
    if (!v) throw fallo(ERRORES.NO_ENCONTRADO, 'La vinculación no existe.');

    return {
      nombre: v.courseName ?? '',
      descripcion: v.description ?? '',
      codigo: v.groupCode ?? '',
      docenteNombre: v.professorName ?? '',
      metaMinimaHoras: Number(v.requiredHours) || 0,
      estado: estadoGrupo(v.status),
      anio: anioDeInscripcion(v),
      vinculadoEn: instante(v.enrollmentDate),
      totalJornadas: v.totalLogs ?? 0,
      ...avanceMeta(redondear(v.registeredHours), v.requiredHours),
    };
  },
};

/* --------------------------------------------------------------------- archivos */

/** Fila de archivo del backend (GroupDocument, DocumentSubmission, LogEvidence) -> ArchivoRef. */
const mapearArchivo = (fila, prefijo, idFila) => (fila ? {
  id: `${prefijo}_${idFila}`,
  nombre: fila.name ?? 'archivo',
  extension: extensionDe(fila.name),
  tipoMime: fila.fileType ?? 'application/octet-stream',
  // El backend no guarda el tamaño: queda en 0 y la interfaz no lo muestra como dato útil.
  tamanoBytes: 0,
  url: fila.filePath ?? '',
  efimera: false,
} : null);

/** El `File` del navegador que viaja dentro de un ArchivoRef local (ver `archivoHttp.subir`). */
const archivoDe = (referencia) => {
  if (!referencia) return null;
  if (referencia._archivo) return referencia._archivo;
  if (typeof Blob !== 'undefined' && referencia instanceof Blob) return referencia;
  return null;
};

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

export const archivoHttp = {
  /**
   * El backend no tiene una subida «suelta»: el archivo viaja junto con la jornada, el
   * documento o la entrega a la que pertenece. Por eso aquí solo se valida y se prepara un
   * ArchivoRef local que lleva dentro el `File`; la subida real la hace el servicio que
   * crea el elemento (jornada, documento o entrega).
   */
  subir: async (archivo) => {
    const resultado = validarArchivo(archivo);
    if (!resultado.ok) throw fallo(ERRORES.ARCHIVO_INVALIDO, resultado.mensaje);

    // URL temporal para la vista previa; en algunos entornos no existe y queda vacía.
    let url;
    try { url = URL.createObjectURL(archivo); } catch { url = ''; }

    return {
      id: `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      nombre: archivo.name,
      extension: extensionDe(archivo.name),
      tipoMime: archivo.type || 'application/octet-stream',
      tamanoBytes: archivo.size ?? 0,
      url,
      efimera: true,
      _archivo: archivo,
    };
  },

  // Con Supabase Storage la URL guardada ya es la de descarga.
  obtenerUrlDescarga: (archivoRef) => Promise.resolve(archivoRef?.url ?? ''),
};

/* --------------------------------------------------------------------- jornadas */

/** requestStatus del backend -> solicitud del front, o null si nunca se pidió. */
const mapearSolicitud = (log) => {
  const estado = String(log.requestStatus ?? '').toUpperCase();
  if (!ESTADO_SOLICITUD[estado]) return null;

  return {
    id: `sol_${log.logId}`,
    jornadaId: id(log.logId),
    motivo: log.correctionReason ?? '',
    estado,
    creadaEn: null,
    respuestaDocente: log.teacherObservation ?? null,
    resueltaEn: null,
    completadaEn: null,
  };
};

/** PracticeLog -> jornada del front. */
const mapearJornada = (log, contexto = {}, evidencia = null) => ({
  id: id(log.logId),
  vinculacionId: id(log.idEnrollment),
  grupoId: contexto.grupoId ?? null,
  estudianteId: contexto.estudianteId ?? null,
  fecha: log.logDate,
  horaInicio: hora(log.startTime),
  horaTermino: hora(log.endTime),
  descansoMin: log.breakMinutes ?? 0,
  // Jornadas antiguas no tienen actividad principal: se usa la descripción.
  actividadPrincipal: log.mainActivity ?? log.activitiesDescription ?? '',
  descripcion: log.mainActivity ? (log.activitiesDescription || null) : null,
  horas: Number(log.totalHours) || 0,
  evidencia,
  estado: String(log.status).toUpperCase() === ESTADO_JORNADA.OBSERVADA
    ? ESTADO_JORNADA.OBSERVADA
    : ESTADO_JORNADA.REGISTRADA,
  creadaEn: instante(log.createdAt),
  actualizadaEn: instante(log.createdAt),
  solicitud: mapearSolicitud(log),
});

/** Filas de LogEvidence -> la evidencia más reciente de cada jornada. */
const ultimaEvidenciaPorJornada = (filas) => {
  const porJornada = new Map();
  (filas ?? [])
    .sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate))
    .forEach((fila) => porJornada.set(id(fila.logId), mapearArchivo(fila, 'evi', fila.evidenceId)));
  return porJornada;
};

/** Evidencias de todas las jornadas de una inscripción, en una sola consulta. */
const evidenciasDe = (vinculacionId) =>
  api.get(`/documents/evidence/enrollment/${vinculacionId}`)
    .then((respuesta) => ultimaEvidenciaPorJornada(respuesta.data))
    .catch(() => new Map());

/** La evidencia más reciente de una sola jornada. */
const evidenciaDeJornada = (logId) =>
  api.get(`/documents/evidence/${logId}`)
    .then((respuesta) => ultimaEvidenciaPorJornada(respuesta.data).get(id(logId)) ?? null)
    .catch(() => null);

const jornadasDeInscripcion = async (vinculacionId, contexto = {}) => {
  const logs = await api.get(`/logs/enrollment/${vinculacionId}`).then(datos) ?? [];
  const evidencias = logs.length ? await evidenciasDe(vinculacionId) : new Map();
  return logs.map((log) => mapearJornada(log, contexto, evidencias.get(id(log.logId)) ?? null));
};

const subirEvidencia = async (logId, evidencia) => {
  const archivo = archivoDe(evidencia);
  if (!archivo) return null;

  const cuerpo = new FormData();
  cuerpo.append('file', archivo);
  cuerpo.append('logId', logId);
  const fila = await api.post('/documents/evidence', cuerpo, multipart).then(datos);
  return mapearArchivo(fila, 'evi', fila.evidenceId);
};

/** Mismos mensajes que el mock para RN-08 y la actividad obligatoria. */
const validarJornada = ({ horaInicio, horaTermino, descansoMin, actividadPrincipal }) => {
  if (!String(actividadPrincipal ?? '').trim()) {
    throw fallo(ERRORES.HORARIO_INVALIDO, 'Indica la actividad principal de la jornada.');
  }
  const duracion = validarDuracion(horaInicio, horaTermino, descansoMin);
  if (!duracion.valido) throw fallo(duracion.codigo, duracion.mensaje);
};

const cuerpoJornada = (entrada) => ({
  logDate: entrada.fecha,
  startTime: entrada.horaInicio,
  endTime: entrada.horaTermino,
  breakMinutes: Number(entrada.descansoMin) || 0,
  mainActivity: String(entrada.actividadPrincipal ?? '').trim(),
  activitiesDescription: String(entrada.descripcion ?? '').trim() || null,
});

/** Errores del backend sobre jornadas -> código del front. */
const conCodigoDeJornada = (error) => {
  const texto = String(error?.mensaje ?? '');
  if (/ya existe una jornada/i.test(texto)) error.codigo = ERRORES.FECHA_REPETIDA;
  else if (/posterior a hoy/i.test(texto)) error.codigo = ERRORES.FECHA_FUTURA;
  else if (/24 horas/i.test(texto)) error.codigo = ERRORES.PLAZO_VENCIDO;
  else if (/inactivo/i.test(texto)) error.codigo = ERRORES.GRUPO_INACTIVO;
  else if (/ya hay una solicitud/i.test(texto)) error.codigo = ERRORES.SOLICITUD_EN_CURSO;
  throw error;
};

/** Edita una jornada: el backend usa el mismo PUT para la ventana de 24 h y para la corrección. */
const actualizarJornada = async (jornadaId, cambios) => {
  const actual = mapearJornada(await api.get(`/logs/${jornadaId}`).then(datos));
  const combinada = { ...actual, ...cambios, fecha: actual.fecha };
  validarJornada(combinada);

  const log = await api.put(`/logs/${jornadaId}`, cuerpoJornada(combinada))
    .then(datos)
    .catch(conCodigoDeJornada);

  let evidencia = cambios.evidencia ?? null;
  if (archivoDe(evidencia)) evidencia = await subirEvidencia(log.logId, evidencia);
  else if (!evidencia) evidencia = await evidenciaDeJornada(log.logId);

  return mapearJornada(log, {}, evidencia);
};

/** Vinculación del estudiante en el grupo (estudiante) o fila del padrón (docente). */
const filaDelPadron = async (estudianteId, grupoId) =>
  (await padronCrudo(grupoId) ?? []).find((fila) => id(fila.studentId) === id(estudianteId)) ?? null;

export const jornadaHttp = {
  listarPorVinculacion: (vinculacionId) => jornadasDeInscripcion(vinculacionId),

  /** RN-17: el estudiante solo ve sus propias jornadas del grupo seleccionado. */
  listarDeEstudianteEnGrupo: async (estudianteId, grupoId) => {
    const vinculacion = await vinculacionHttp.deEstudianteEnGrupo(estudianteId, grupoId);
    if (!vinculacion) return [];
    return jornadasDeInscripcion(vinculacion.id, { grupoId: id(grupoId), estudianteId: id(estudianteId) });
  },

  obtener: async (jornadaId) => {
    const log = await api.get(`/logs/${jornadaId}`).then(datos);
    return mapearJornada(log, {}, await evidenciaDeJornada(log.logId));
  },

  /** RF-07 y RF-08: una o varias jornadas. Se validan todas antes de enviar la primera. */
  registrar: async (vinculacionId, nuevasJornadas) => {
    const lista = Array.isArray(nuevasJornadas) ? nuevasJornadas : [nuevasJornadas];

    const fechas = [];
    lista.forEach((entrada) => {
      validarJornada(entrada);
      if (!entrada.fecha) throw fallo(ERRORES.FECHA_REPETIDA, 'Indica una fecha válida para la jornada.');
      if (esFechaFutura(entrada.fecha)) {
        throw fallo(ERRORES.FECHA_FUTURA, 'La fecha no puede ser posterior a hoy. Solo se registran jornadas ya realizadas.');
      }
      if (fechas.includes(entrada.fecha)) {
        throw fallo(
          ERRORES.FECHA_REPETIDA,
          `Estás registrando dos jornadas con la fecha ${formatearFecha(entrada.fecha)}.`,
        );
      }
      fechas.push(entrada.fecha);
    });

    const creadas = [];
    // En serie: si una falla (fecha repetida en el historial), el error llega en orden.
    for (const entrada of lista) {
      const log = await api.post(`/logs/enrollment/${vinculacionId}`, cuerpoJornada(entrada))
        .then(datos)
        .catch(conCodigoDeJornada);
      const evidencia = await subirEvidencia(log.logId, entrada.evidencia);
      creadas.push(mapearJornada(log, {}, evidencia));
    }
    return creadas;
  },

  /** RN-11: edición directa dentro de las 24 h. La fecha nunca cambia. */
  editarDirecto: (jornadaId, cambios) => actualizarJornada(jornadaId, cambios),

  /** RN-12: guarda la corrección de una jornada OBSERVADA (el backend la cierra). */
  guardarCorreccion: (jornadaId, cambios) => actualizarJornada(jornadaId, cambios),

  /** Indicadores de la vista Jornadas (§4.7), para el estudiante y para el docente. */
  indicadores: async (estudianteId, grupoId) => {
    if (esDocenteActual()) {
      const [grupo, fila] = await Promise.all([grupoCrudo(grupoId), filaDelPadron(estudianteId, grupoId)]);
      const meta = Number(grupo.minimumHours) || 0;
      const horas = redondear(fila?.registeredHours);
      return {
        horasRegistradas: horas,
        metaMinimaHoras: meta,
        horasRestantes: Math.max(0, redondear(meta - horas)),
        porcentaje: meta > 0 ? Math.min(100, Math.round((horas / meta) * 1000) / 10) : 0,
        totalJornadas: fila?.totalLogs ?? 0,
        solicitudesPendientes: fila?.pendingRequests ?? 0,
        correccionesHabilitadas: fila?.enabledCorrections ?? 0,
      };
    }

    const inscripcion = await buscarInscripcion((v) => id(v.practiceGroupId) === id(grupoId));
    if (!inscripcion) throw fallo(ERRORES.NO_ENCONTRADO, 'No estás vinculado a esta práctica.');

    const jornadas = await jornadasDeInscripcion(inscripcion.enrollmentId);
    const meta = Number(inscripcion.requiredHours) || 0;
    const horas = redondear(jornadas.reduce((total, j) => total + (j.horas ?? 0), 0));

    return {
      horasRegistradas: horas,
      metaMinimaHoras: meta,
      // RN-06: la meta no es un máximo; «restantes» llega a cero y las horas siguen.
      horasRestantes: Math.max(0, redondear(meta - horas)),
      porcentaje: meta > 0 ? Math.min(100, Math.round((horas / meta) * 1000) / 10) : 0,
      totalJornadas: jornadas.length,
      solicitudesPendientes: jornadas
        .filter((j) => j.solicitud?.estado === ESTADO_SOLICITUD.PENDIENTE).length,
      correccionesHabilitadas: jornadas.filter((j) => j.estado === ESTADO_JORNADA.OBSERVADA).length,
    };
  },
};

/* ------------------------------------------------------------------ solicitudes */

const respuestaComoJornada = async (promesa) => {
  const log = await promesa.then(datos).catch(conCodigoDeJornada);
  return mapearJornada(log, {}, await evidenciaDeJornada(log.logId));
};

export const solicitudHttp = {
  /** RF-11: el estudiante pide la corrección con motivo obligatorio. */
  crear: (jornadaId, motivo) => {
    const texto = String(motivo ?? '').trim();
    if (texto.length < 10) {
      return Promise.reject(fallo(
        ERRORES.NO_AUTORIZADO,
        'Explica en el motivo qué necesitas corregir y por qué, con al menos 10 caracteres.',
      ));
    }
    return respuestaComoJornada(api.put(`/logs/${jornadaId}/request-correction`, { reason: texto }));
  },

  /** §5.9: habilitar exige una observación breve obligatoria. */
  habilitar: (jornadaId, observacion) => {
    const texto = String(observacion ?? '').trim();
    if (!texto) {
      return Promise.reject(fallo(
        ERRORES.NO_AUTORIZADO,
        'Escribe una observación para el estudiante antes de habilitar la corrección.',
      ));
    }
    return respuestaComoJornada(api.put(`/logs/${jornadaId}/enable-correction`, { observation: texto }));
  },

  /** §5.11: rechazar exige comentario obligatorio. */
  rechazar: (jornadaId, comentario) => {
    const texto = String(comentario ?? '').trim();
    if (!texto) {
      return Promise.reject(fallo(
        ERRORES.NO_AUTORIZADO,
        'Escribe el motivo del rechazo: el estudiante lo recibirá en su notificación.',
      ));
    }
    return respuestaComoJornada(api.put(`/logs/${jornadaId}/reject-correction`, { comment: texto }));
  },

  /** Solicitudes pendientes del grupo (docente). */
  pendientesDelGrupo: async (grupoId) => {
    const padron = (await padronCrudo(grupoId) ?? []).filter((fila) => (fila.pendingRequests ?? 0) > 0);

    const porEstudiante = await Promise.all(padron.map(async (fila) => {
      const jornadas = await jornadasDeInscripcion(fila.enrollmentId);
      const nombre = fila.studentName || 'Estudiante';
      return jornadas
        .filter((j) => j.solicitud?.estado === ESTADO_SOLICITUD.PENDIENTE)
        .map((j) => ({
          jornadaId: j.id,
          estudianteId: id(fila.studentId),
          estudianteNombre: nombre,
          fecha: j.fecha,
          motivo: j.solicitud.motivo,
          creadaEn: j.creadaEn,
        }));
    }));

    return porEstudiante.flat();
  },

  // El backend guarda solo la solicitud vigente de cada jornada.
  historialDeJornada: () => Promise.resolve([]),
};

/* ------------------------------------------------------------------- documentos */

/** Documentos vistos: id (primera versión) -> { documento, vigenteId }. */
const cacheDocumentos = new Map();

const raizDe = (fila) => fila.rootDocumentId ?? fila.documentId;

/** Filas de GroupDocument (todas las versiones) -> documentos del front, el más reciente primero. */
const mapearDocumentos = (filas) => {
  const porRaiz = new Map();
  (filas ?? []).forEach((fila) => {
    const raiz = id(raizDe(fila));
    if (!porRaiz.has(raiz)) porRaiz.set(raiz, []);
    porRaiz.get(raiz).push(fila);
  });

  const documentos = [];
  porRaiz.forEach((versiones, raiz) => {
    versiones.sort((a, b) => (a.version ?? 1) - (b.version ?? 1));
    const vigente = versiones.find((v) => v.active);
    // Sin versión activa es un documento antiguo ya reemplazado: no se muestra suelto.
    if (!vigente) return;
    const primera = versiones[0];

    const documento = {
      id: raiz,
      grupoId: id(vigente.groupId),
      nombre: vigente.title || primera.title || vigente.name || 'Documento',
      instrucciones: vigente.description ?? '',
      tipo: vigente.requiresSubmission ? TIPO_DOCUMENTO.REQUIERE_ENTREGA : TIPO_DOCUMENTO.INFORMATIVO,
      versionVigente: vigente.version ?? 1,
      versiones: versiones.map((v) => ({
        numero: v.version ?? 1,
        archivo: mapearArchivo(v, 'doc', v.documentId),
        publicadaEn: instante(v.publishedDate),
      })),
      creadoEn: instante(primera.publishedDate),
    };

    cacheDocumentos.set(raiz, { documento, vigenteId: id(vigente.documentId) });
    documentos.push(documento);
  });

  return documentos.sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn));
};

const documentosDelGrupo = (grupoId) =>
  api.get(`/documents/group/${grupoId}/history`).then((respuesta) => mapearDocumentos(respuesta.data));

/**
 * Id de entrega del front: `documento:vinculacion:entregaBackend`. Una entrega PENDIENTE
 * todavía no existe en el backend, pero la pantalla necesita un id para enviarla.
 */
const idEntrega = (documentoId, vinculacionId, submissionId) =>
  `${documentoId}:${vinculacionId}:${submissionId ?? ''}`;

const partesEntrega = (entregaId) => {
  const [documentoId, vinculacionId, submissionId] = String(entregaId ?? '').split(':');
  return { documentoId, vinculacionId, submissionId: submissionId || null };
};

const esCorreccion = (estado) => String(estado ?? '').toLowerCase().startsWith('correcci');

/** Entrega individual de un estudiante en un documento, a partir de sus filas del backend. */
const mapearEntrega = (documento, vinculacionId, estudianteId, filasSubmission) => {
  const filas = (filasSubmission ?? [])
    .filter((f) => id(f.groupDocumentId) === documento.id && id(f.enrollmentId) === id(vinculacionId))
    .sort((a, b) => (a.version ?? 1) - (b.version ?? 1));
  const activa = filas.find((f) => f.active) ?? null;

  let estado = ESTADO_ENTREGA.PENDIENTE;
  if (activa) estado = esCorreccion(activa.status) ? ESTADO_ENTREGA.CORRECCION_SOLICITADA : ESTADO_ENTREGA.ENTREGADO;

  return {
    id: idEntrega(documento.id, id(vinculacionId), activa ? id(activa.submissionId) : null),
    documentoId: documento.id,
    vinculacionId: id(vinculacionId),
    estudianteId: id(estudianteId),
    estado,
    comentarioCorreccion: estado === ESTADO_ENTREGA.CORRECCION_SOLICITADA ? (activa.comments ?? '') : null,
    versionDocumentoUsada: activa?.documentVersion ?? documento.versionVigente,
    versiones: filas.map((f) => ({
      numero: f.version ?? 1,
      archivo: mapearArchivo(f, 'ent', f.submissionId),
      enviadaEn: instante(f.submissionDate),
    })),
  };
};

/** Fila de la tarjeta del docente: la entrega más el nombre del estudiante. */
const filaDocente = (entrega, nombre) => ({
  ...entrega,
  estudianteNombre: nombre,
  versionVigente: entrega.versiones.length,
  ultimoEnvio: entrega.versiones.at(-1)?.enviadaEn ?? null,
});

const documentoEnCache = async (documentoId) => {
  const guardado = cacheDocumentos.get(id(documentoId));
  if (!guardado) throw fallo(ERRORES.NO_ENCONTRADO, 'El documento no existe. Recarga la vista.');
  return guardado;
};

export const documentoHttp = {
  listarPorGrupo: (grupoId) => documentosDelGrupo(grupoId),

  /** §5.18: todos los documentos del grupo con la fila de cada estudiante (docente). */
  listarConEntregas: async (grupoId) => {
    const [documentos, padron, entregas] = await Promise.all([
      documentosDelGrupo(grupoId),
      padronCrudo(grupoId),
      api.get(`/documents/submission/group/${grupoId}/history`).then(datos),
    ]);
    return documentos.map((documento) => {
      if (documento.tipo === TIPO_DOCUMENTO.INFORMATIVO) return { documento, entregas: [] };

      const filas = (padron ?? [])
        .map((fila) => filaDocente(
          mapearEntrega(documento, fila.enrollmentId, fila.studentId, entregas),
          fila.studentName || 'Estudiante',
        ))
        .sort((a, b) => a.estudianteNombre.localeCompare(b.estudianteNombre, 'es'));

      return { documento, entregas: filas };
    });
  },

  /** §4.11 y RN-17: los documentos del grupo con SOLO la entrega propia. */
  listarParaEstudiante: async (grupoId, estudianteId) => {
    const [documentos, vinculacion] = await Promise.all([
      documentosDelGrupo(grupoId),
      vinculacionHttp.deEstudianteEnGrupo(estudianteId, grupoId),
    ]);
    const entregas = vinculacion
      ? await api.get(`/documents/submission/${vinculacion.id}/history`).then(datos)
      : [];

    return documentos.map((documento) => ({
      documento,
      entrega: documento.tipo === TIPO_DOCUMENTO.INFORMATIVO
        ? null
        : mapearEntrega(documento, vinculacion?.id ?? null, estudianteId, entregas),
    }));
  },

  obtener: async (documentoId) => (await documentoEnCache(documentoId)).documento,

  versionVigente: (documento) =>
    documento?.versiones?.find((version) => version.numero === documento.versionVigente) ?? null,

  /** §5.19 y RF-14: publica un documento informativo o una solicitud con entrega. */
  crear: async ({ grupoId, nombre, instrucciones, tipo, archivo } = {}) => {
    const nombreLimpio = String(nombre ?? '').trim();
    if (!nombreLimpio) throw fallo(ERRORES.NO_AUTORIZADO, 'Indica el nombre del documento.');
    if (!Object.values(TIPO_DOCUMENTO).includes(tipo)) {
      throw fallo(ERRORES.NO_AUTORIZADO, 'Indica si el documento es informativo o requiere entrega.');
    }
    const contenido = archivoDe(archivo);
    if (!contenido) throw fallo(ERRORES.ARCHIVO_INVALIDO, 'Adjunta el archivo principal del documento.');

    const cuerpo = new FormData();
    cuerpo.append('file', contenido);
    cuerpo.append('groupId', grupoId);
    cuerpo.append('title', nombreLimpio);
    cuerpo.append('description', String(instrucciones ?? '').trim());
    cuerpo.append('requiresSubmission', String(tipo === TIPO_DOCUMENTO.REQUIERE_ENTREGA));

    const fila = await api.post('/documents/group', cuerpo, multipart).then(datos);
    return mapearDocumentos([fila])[0];
  },

  /** RN-20: cambia el archivo creando una versión nueva; la anterior se conserva. */
  cambiarArchivo: async (documentoId, archivo) => {
    const contenido = archivoDe(archivo);
    if (!contenido) throw fallo(ERRORES.ARCHIVO_INVALIDO, 'Selecciona el archivo nuevo.');

    const { documento, vigenteId } = await documentoEnCache(documentoId);
    const cuerpo = new FormData();
    cuerpo.append('file', contenido);
    await api.put(`/documents/group/${vigenteId}/replace`, cuerpo, multipart);

    const actualizados = await documentosDelGrupo(documento.grupoId);
    return actualizados.find((d) => d.id === id(documentoId)) ?? documento;
  },

  tarjetaDocente: async (documentoId) => {
    const { documento } = await documentoEnCache(documentoId);
    const tarjetas = await documentoHttp.listarConEntregas(documento.grupoId);
    return tarjetas.find((t) => t.documento.id === id(documentoId)) ?? { documento, entregas: [] };
  },
};

/* --------------------------------------------------------------------- entregas */

export const entregaHttp = {
  listarPorDocumento: async (documentoId) => (await documentoHttp.tarjetaDocente(documentoId)).entregas,

  deEstudiante: async (documentoId, estudianteId) => {
    const { documento } = await documentoEnCache(documentoId);
    const tarjetas = await documentoHttp.listarParaEstudiante(documento.grupoId, estudianteId);
    return tarjetas.find((t) => t.documento.id === id(documentoId))?.entrega ?? null;
  },

  obtener: async (entregaId) => {
    const { documentoId } = partesEntrega(entregaId);
    const { documento } = await documentoEnCache(documentoId);
    const tarjetas = esDocenteActual()
      ? await documentoHttp.listarConEntregas(documento.grupoId)
      : await documentoHttp.listarParaEstudiante(documento.grupoId, usuarioActual()?.id);

    const filas = tarjetas.flatMap((t) => (t.entregas ?? (t.entrega ? [t.entrega] : [])));
    const encontrada = filas.find((e) => e.id === entregaId);
    if (!encontrada) throw fallo(ERRORES.NO_ENCONTRADO, 'La entrega no existe.');
    return encontrada;
  },

  /** §4.12 y §4.13: primer envío, o reemplazo si el docente pidió corrección. */
  enviar: async (entregaId, archivo, estudianteId = null) => {
    const contenido = archivoDe(archivo);
    if (!contenido) throw fallo(ERRORES.ARCHIVO_INVALIDO, 'Selecciona el archivo que quieres entregar.');

    const { documentoId, vinculacionId } = partesEntrega(entregaId);
    if (!documentoId || !vinculacionId || vinculacionId === 'null') {
      throw fallo(ERRORES.NO_AUTORIZADO, 'No estás vinculado a esta práctica.');
    }

    const cuerpo = new FormData();
    cuerpo.append('file', contenido);
    cuerpo.append('enrollmentId', vinculacionId);
    cuerpo.append('groupDocumentId', documentoId);
    await api.post('/documents/submission', cuerpo, multipart);

    const entregas = await api.get(`/documents/submission/${vinculacionId}/history`).then(datos);
    const guardado = cacheDocumentos.get(id(documentoId));
    const documento = guardado?.documento ?? { id: id(documentoId), versionVigente: 1 };
    return mapearEntrega(documento, vinculacionId, estudianteId ?? usuarioActual()?.id, entregas);
  },

  /** §5.25: el docente pide corrección; el comentario es obligatorio. */
  solicitarCorreccion: async (entregaId, comentario) => {
    const texto = String(comentario ?? '').trim();
    if (!texto) {
      throw fallo(ERRORES.NO_AUTORIZADO, 'Describe qué debe corregir el estudiante antes de habilitar el reemplazo.');
    }

    const { submissionId } = partesEntrega(entregaId);
    if (!submissionId) {
      throw fallo(ERRORES.NO_AUTORIZADO, 'Solo se puede pedir corrección de una entrega ya enviada.');
    }

    const fila = await api.put(`/documents/submission/${submissionId}/request-correction`, { comment: texto })
      .then(datos);
    return { ...partesEntrega(entregaId), id: entregaId, estado: ESTADO_ENTREGA.CORRECCION_SOLICITADA, comentarioCorreccion: fila?.comments ?? texto };
  },

  /** Indicadores de la vista Documentos del estudiante (§4.11). */
  indicadores: async (estudianteId, grupoId) => {
    const tarjetas = await documentoHttp.listarParaEstudiante(grupoId, estudianteId);
    const propias = tarjetas.map((t) => t.entrega).filter(Boolean);

    return {
      documentosDelGrupo: tarjetas.length,
      entregasPendientes: propias.filter((e) => e.estado === ESTADO_ENTREGA.PENDIENTE).length,
      entregasRealizadas: propias.filter((e) => e.estado === ESTADO_ENTREGA.ENTREGADO).length,
      correccionesSolicitadas: propias
        .filter((e) => e.estado === ESTADO_ENTREGA.CORRECCION_SOLICITADA).length,
    };
  },
};

/* --------------------------------------------------------------- notificaciones */

/** type del backend -> [tipo de notificación, tipo de referencia] del front. */
const TIPOS_NOTIFICACION = {
  CORRECTION_REQUEST: [TIPO_NOTIFICACION.SOLICITUD_ENVIADA, TIPO_REFERENCIA.JORNADA],
  CORRECTION_ENABLED: [TIPO_NOTIFICACION.CORRECCION_HABILITADA, TIPO_REFERENCIA.JORNADA],
  CORRECTION_REJECTED: [TIPO_NOTIFICACION.SOLICITUD_RECHAZADA, TIPO_REFERENCIA.JORNADA],
  CORRECTION_SAVED: [TIPO_NOTIFICACION.CORRECCION_GUARDADA, TIPO_REFERENCIA.JORNADA],
  DOCUMENT: [TIPO_NOTIFICACION.DOCUMENTO_PUBLICADO, TIPO_REFERENCIA.DOCUMENTO],
  DOCUMENT_UPDATE: [TIPO_NOTIFICACION.DOCUMENTO_ACTUALIZADO, TIPO_REFERENCIA.DOCUMENTO],
  // La entrega se abre desde la tarjeta de su documento (§5.18).
  SUBMISSION: [TIPO_NOTIFICACION.ENTREGA_RECIBIDA, TIPO_REFERENCIA.DOCUMENTO],
  CORRECTION: [TIPO_NOTIFICACION.REEMPLAZO_HABILITADO, TIPO_REFERENCIA.DOCUMENTO],
  // Aviso diario: lleva a la lista de estudiantes del grupo.
  RISK_ALERTS: [TIPO_NOTIFICACION.ALERTAS_RIESGO, TIPO_REFERENCIA.GRUPO],
  ENROLLMENT: [TIPO_NOTIFICACION.ESTUDIANTE_VINCULADO, TIPO_REFERENCIA.GRUPO],
  LOG_CREATED: [TIPO_NOTIFICACION.JORNADA_REGISTRADA, TIPO_REFERENCIA.JORNADA],
  LOG_UPDATED: [TIPO_NOTIFICACION.JORNADA_EDITADA, TIPO_REFERENCIA.JORNADA],
  GROUP_DEACTIVATED: [TIPO_NOTIFICACION.GRUPO_DESACTIVADO, TIPO_REFERENCIA.GRUPO],
  GROUP_REACTIVATED: [TIPO_NOTIFICACION.GRUPO_REACTIVADO, TIPO_REFERENCIA.GRUPO],
  // El grupo ya no existe: no hay nada que abrir.
  GROUP_DELETED: [TIPO_NOTIFICACION.GRUPO_ELIMINADO, null],
  // Seguimiento de alertas: al estudiante, al resumen de su práctica.
  RISK_REMINDER: [TIPO_NOTIFICACION.RECORDATORIO_RIESGO, TIPO_REFERENCIA.GRUPO],
  FOLLOW_UP_PLAN: [TIPO_NOTIFICACION.PLAN_SEGUIMIENTO, TIPO_REFERENCIA.GRUPO],
  // La referencia es la vinculación: abre esa conversación.
  MESSAGE: [TIPO_NOTIFICACION.MENSAJE_RECIBIDO, TIPO_REFERENCIA.CONVERSACION],
};

const tipoDeNotificacion = (notificacion) => {
  // Notificaciones antiguas: CORRECTION_REPLY servía para habilitar y para rechazar.
  if (notificacion.type === 'CORRECTION_REPLY') {
    return /habilitada/i.test(notificacion.title ?? '')
      ? TIPOS_NOTIFICACION.CORRECTION_ENABLED
      : TIPOS_NOTIFICACION.CORRECTION_REJECTED;
  }
  return TIPOS_NOTIFICACION[notificacion.type] ?? [notificacion.type, null];
};

const mapearNotificacion = (notificacion) => {
  const [tipo, tipoReferencia] = tipoDeNotificacion(notificacion);
  return {
    id: id(notificacion.idNotification),
    destinatarioId: id(notificacion.userId),
    grupoId: id(notificacion.groupId),
    grupoNombre: notificacion.groupName ?? '',
    grupoCodigo: notificacion.groupCode ?? '',
    tipo,
    titulo: notificacion.title ?? '',
    mensaje: notificacion.message ?? '',
    referencia: tipoReferencia && notificacion.referenceId
      ? { tipo: tipoReferencia, id: id(notificacion.referenceId) }
      : null,
    creadaEn: instante(notificacion.createdAt),
    leida: Boolean(notificacion.read),
  };
};

const masRecientePrimero = (a, b) => new Date(b.creadaEn) - new Date(a.creadaEn);

export const notificacionHttp = {
  generales: (usuarioId) =>
    api.get(`/notifications/user/${usuarioId}`)
      .then((respuesta) => (respuesta.data ?? []).map(mapearNotificacion).sort(masRecientePrimero)),

  delGrupo: (usuarioId, grupoId) =>
    api.get(`/notifications/user/${usuarioId}/group/${grupoId}`)
      .then((respuesta) => (respuesta.data ?? []).map(mapearNotificacion).sort(masRecientePrimero)),

  totalDelUsuario: (usuarioId) =>
    api.get(`/notifications/user/${usuarioId}`).then((respuesta) => (respuesta.data ?? []).length),

  /** Cuántas notificaciones sin leer hay: todas, o solo las de un grupo. */
  noLeidas: (usuarioId, grupoId = null) =>
    api.get(grupoId
      ? `/notifications/user/${usuarioId}/group/${grupoId}/unread-count`
      : `/notifications/user/${usuarioId}/unread-count`)
      .then((respuesta) => Number(respuesta.data) || 0),

  /** Marca como leídas todas las notificaciones, o solo las de un grupo. */
  marcarLeidas: (usuarioId, grupoId = null) =>
    api.put(grupoId
      ? `/notifications/user/${usuarioId}/group/${grupoId}/mark-read`
      : `/notifications/user/${usuarioId}/mark-read`)
      .then(() => undefined),
};

/* --------------------------------------------------- seguimiento de alertas */

/** FollowUpDTO -> seguimiento del front. */
const mapearSeguimiento = (dto) => ({
  vinculacionId: id(dto.enrollmentId),
  estado: ESTADO_SEGUIMIENTO[dto.status] ?? null,
  abiertaEn: instante(dto.openedAt),
  resueltaEn: instante(dto.resolvedAt),
  riesgo: { nivel: NIVEL_RIESGO[dto.riskLevel] ?? NIVEL_RIESGO.SIN_ALERTA, motivos: dto.riskReasons ?? [] },
  ritmoSemanal: numeroONulo(dto.requiredWeeklyHours),
  fechaTermino: dto.endDate ?? null,
  plan: {
    fechaTermino: dto.customEndDate ?? null,
    horasSemanales: numeroONulo(dto.weeklyHoursCommitment),
    desde: dto.commitmentSince ?? null,
  },
  acciones: (dto.actions ?? []).map((accion) => ({
    id: id(accion.actionId),
    tipo: accion.type,
    nota: accion.note ?? '',
    fechaCompromiso: accion.commitmentDate ?? null,
    creadaEn: instante(accion.createdAt),
    // Sin docente: la cerró el sistema porque el estudiante volvió a estar al día.
    automatica: accion.professorId === null || accion.professorId === undefined,
  })),
});

export const seguimientoHttp = {
  /** Estado de la alerta del estudiante y lo que el docente ha hecho con ella. */
  obtener: (vinculacionId) =>
    api.get(`/enrollments/${vinculacionId}/follow-up`).then(datos).then(mapearSeguimiento),

  /** Contacto, acuerdo o nota. La nota es obligatoria. */
  registrarAccion: async (vinculacionId, { tipo, nota, fechaCompromiso = null } = {}) => {
    if (!String(nota ?? '').trim()) {
      throw fallo(ERRORES.NO_AUTORIZADO, 'Describe brevemente lo que hiciste o acordaste.');
    }
    return api.post(`/enrollments/${vinculacionId}/follow-up/actions`, {
      type: tipo, note: nota, commitmentDate: fechaCompromiso || null,
    }).then(datos).then(mapearSeguimiento);
  },

  resolver: (vinculacionId, nota = '') =>
    api.put(`/enrollments/${vinculacionId}/follow-up/resolve`, { note: nota })
      .then(datos).then(mapearSeguimiento),

  /** Prórroga individual y/o horas semanales comprometidas. Los dos vacíos quitan el plan. */
  definirPlan: (vinculacionId, { fechaTermino = null, horasSemanales = null, nota = '' } = {}) =>
    api.put(`/enrollments/${vinculacionId}/plan`, {
      endDate: fechaTermino || null,
      weeklyHours: horasSemanales === '' || horasSemanales === null ? null : Number(horasSemanales),
      note: nota,
    }).then(datos).then(mapearSeguimiento),
};

/* ----------------------------------------------------------------- mensajes */

/** MessageDTO -> mensaje del front. */
const mapearMensaje = (mensaje) => ({
  id: id(mensaje.messageId),
  vinculacionId: id(mensaje.enrollmentId),
  propio: id(mensaje.senderId) === id(usuarioActual()?.id),
  remitenteRol: rolDelBackend(mensaje.senderRole),
  texto: mensaje.content ?? '',
  enviadoEn: instante(mensaje.createdAt),
  leidoEn: instante(mensaje.readAt),
});

export const mensajeHttp = {
  /** La conversación de una vinculación. Al abrirla, lo recibido queda leído. */
  conversacion: (vinculacionId) =>
    api.get(`/enrollments/${vinculacionId}/messages`)
      .then((respuesta) => (respuesta.data ?? []).map(mapearMensaje)),

  enviar: async (vinculacionId, texto) => {
    if (!String(texto ?? '').trim()) {
      throw fallo(ERRORES.NO_AUTORIZADO, 'Escribe un mensaje antes de enviarlo.');
    }
    return api.post(`/enrollments/${vinculacionId}/messages`, { content: texto })
      .then(datos).then(mapearMensaje);
  },

  /** Bandeja del docente: una conversación por estudiante, las no leídas primero. */
  bandejaDelGrupo: (grupoId) =>
    api.get(`/enrollments/group/${grupoId}/conversations`)
      .then((respuesta) => (respuesta.data ?? []).map((c) => ({
        vinculacionId: id(c.enrollmentId),
        estudianteId: id(c.studentId),
        nombre: c.studentName || 'Estudiante',
        ultimoMensaje: c.lastMessage ?? null,
        ultimoEn: instante(c.lastMessageAt),
        noLeidos: Number(c.unread) || 0,
        nivelRiesgo: NIVEL_RIESGO[c.riskLevel] ?? NIVEL_RIESGO.SIN_ALERTA,
      }))),
};
