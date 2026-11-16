/**
 * Semilla del almacén simulado.
 *
 * Construye un escenario que cubre todos los estados del dominio, para que cada pantalla
 * se pueda verificar sin backend y sin tener que crear los datos a mano:
 *
 *  - 2 docentes y 4 estudiantes.
 *  - 3 grupos, uno INACTIVO (para comprobar el modo de solo lectura, RN-03).
 *  - Un estudiante con DOS prácticas activas a la vez (RN-05).
 *  - Jornadas en los dos estados y solicitudes en los cuatro, incluida una RECHAZADA
 *    sobre la que se puede volver a solicitar (decisión A-09).
 *  - Una jornada dentro de la ventana de 24 h y otras ya vencidas (RN-11).
 *  - La misma fecha usada en dos grupos distintos, que RN-09 permite.
 *  - Documentos de los dos tipos, con historial de versiones, y entregas en los tres
 *    estados (§6.3).
 *
 * Las fechas se calculan siempre relativas al instante que recibe `construirSemilla`,
 * así que el escenario sigue siendo coherente cualquier día que se reinicie.
 */

import {
  ESTADO_ENTREGA,
  ESTADO_GRUPO,
  ESTADO_JORNADA,
  ESTADO_SOLICITUD,
  TIPO_DOCUMENTO,
  TIPO_NOTIFICACION,
  TIPO_REFERENCIA,
  ROLES,
} from '../../utils/constants';
import { calcularHoras } from '../../utils/horas';
import { aFechaISO, formatearFecha } from '../../utils/fechas';

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Muestras estáticas servidas desde `public/muestras/`. Los archivos de la semilla
 * apuntan aquí en lugar de a una URL inventada, para que la vista previa y la descarga
 * (M-03) se puedan comprobar de verdad y sobrevivan a una recarga.
 *
 * Se reparten por formato: lo que el navegador sabe previsualizar usa su muestra real;
 * los formatos de Office no tienen vista previa nativa (decisión A-07) y se descargan,
 * así que apuntan a la muestra de PDF solo para que el enlace funcione.
 */
const MUESTRAS = {
  pdf: '/muestras/documento-ejemplo.pdf',
  png: '/muestras/imagen-ejemplo.png',
  jpg: '/muestras/imagen-ejemplo.png',
  jpeg: '/muestras/imagen-ejemplo.png',
  txt: '/muestras/texto-ejemplo.txt',
};

const archivo = (id, nombre, extension, tipoMime, tamanoBytes) => ({
  id,
  nombre,
  extension,
  tipoMime,
  tamanoBytes,
  url: MUESTRAS[extension] ?? MUESTRAS.pdf,
});

export const construirSemilla = (instanteISO) => {
  const base = new Date(instanteISO).getTime();
  /** Instante relativo al momento de sembrar. */
  const menos = (dias, horas = 0) => new Date(base - dias * DIA_MS - horas * 3_600_000).toISOString();
  /** Día civil relativo, como 'YYYY-MM-DD'. */
  const dia = (dias) => aFechaISO(new Date(base - dias * DIA_MS));
  /** El mismo día, como lo lee una persona: para los textos de las notificaciones. */
  const diaLegible = (dias) => formatearFecha(dia(dias));

  const usuarios = [
    { id: 'doc_1', nombre: 'Carolina Soto Lagos', correo: 'carolina.soto@duoc.cl', rol: ROLES.DOCENTE },
    { id: 'doc_2', nombre: 'Rodrigo Peña M.', correo: 'rodrigo.pena@duoc.cl', rol: ROLES.DOCENTE },
    { id: 'est_1', nombre: 'Nicolás Fernández Gallardo', correo: 'nicolas.fernandez@duocuc.cl', rol: ROLES.ESTUDIANTE },
    { id: 'est_2', nombre: 'Yuliana Román Briceño', correo: 'yuliana.roman@duocuc.cl', rol: ROLES.ESTUDIANTE },
    { id: 'est_3', nombre: 'Jonatán Barrios R.', correo: 'jonatan.barrios@duocuc.cl', rol: ROLES.ESTUDIANTE },
    { id: 'est_4', nombre: 'Camila Vera Núñez', correo: 'camila.vera@duocuc.cl', rol: ROLES.ESTUDIANTE },
  ];

  const grupos = [
    {
      id: 'gru_1',
      nombre: 'Práctica Laboral 2026 — Informática',
      descripcion: 'Seguimiento de práctica laboral para estudiantes de Ingeniería en Informática, sede Valparaíso.',
      codigo: 'PRL-2026-A4F2',
      metaMinimaHoras: 360,
      estado: ESTADO_GRUPO.ACTIVO,
      docenteId: 'doc_1',
      docenteNombre: 'Carolina Soto Lagos',
      creadoEn: menos(120),
    },
    {
      id: 'gru_2',
      nombre: 'Práctica Profesional 2026 — Desarrollo',
      descripcion: 'Práctica profesional en empresas de desarrollo de software. Meta superior por exigencia del plan.',
      codigo: 'PRP-2026-B7K9',
      metaMinimaHoras: 540,
      estado: ESTADO_GRUPO.ACTIVO,
      docenteId: 'doc_1',
      docenteNombre: 'Carolina Soto Lagos',
      creadoEn: menos(95),
    },
    {
      id: 'gru_3',
      nombre: 'Práctica Laboral 2025 — Soporte',
      descripcion: 'Grupo cerrado del año anterior. Se conserva para consulta del historial.',
      codigo: 'PRL-2025-C1D8',
      metaMinimaHoras: 360,
      estado: ESTADO_GRUPO.INACTIVO,
      docenteId: 'doc_2',
      docenteNombre: 'Rodrigo Peña M.',
      creadoEn: menos(430),
    },
  ];

  // est_1 mantiene dos prácticas activas a la vez (RN-05).
  const vinculaciones = [
    { id: 'vin_1', grupoId: 'gru_1', estudianteId: 'est_1', vinculadoEn: menos(60) },
    { id: 'vin_2', grupoId: 'gru_2', estudianteId: 'est_1', vinculadoEn: menos(40) },
    { id: 'vin_3', grupoId: 'gru_1', estudianteId: 'est_2', vinculadoEn: menos(58) },
    { id: 'vin_4', grupoId: 'gru_1', estudianteId: 'est_3', vinculadoEn: menos(55) },
    { id: 'vin_5', grupoId: 'gru_3', estudianteId: 'est_4', vinculadoEn: menos(400) },
  ];

  const archivos = [
    archivo('arc_1', 'respaldo-pruebas.pdf', 'pdf', 'application/pdf', 182_400),
    archivo('arc_2', 'pantalla-incidencias.png', 'png', 'image/png', 540_210),
    archivo('arc_3', 'reglamento-practica-laboral.pdf', 'pdf', 'application/pdf', 1_204_800),
    archivo('arc_4', 'informe-avance-plantilla-v1.docx', 'docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 48_120),
    archivo('arc_5', 'informe-avance-plantilla-v2.docx', 'docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 51_300),
    archivo('arc_6', 'informe-avance-nicolas-v1.docx', 'docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 96_500),
    archivo('arc_7', 'informe-avance-nicolas-v2.docx', 'docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 101_880),
    archivo('arc_8', 'informe-avance-jonatan-v1.docx', 'docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 88_300),
    archivo('arc_9', 'acta-cierre-plantilla.pdf', 'pdf', 'application/pdf', 220_100),
    archivo('arc_10', 'acta-cierre-camila.pdf', 'pdf', 'application/pdf', 310_400),
  ];

  /**
   * Construye una jornada calculando sus horas con la regla del dominio (RN-07),
   * nunca con un número escrito a mano.
   */
  const jornada = ({
    id, vinculacionId, grupoId, estudianteId, fecha, horaInicio, horaTermino,
    descansoMin, actividadPrincipal, descripcion = null, evidencia = null,
    estado = ESTADO_JORNADA.REGISTRADA, creadaEn, solicitud = null,
  }) => ({
    id,
    vinculacionId,
    grupoId,
    estudianteId,
    fecha,
    horaInicio,
    horaTermino,
    descansoMin,
    actividadPrincipal,
    descripcion,
    horas: calcularHoras(horaInicio, horaTermino, descansoMin),
    evidencia,
    estado,
    creadaEn,
    actualizadaEn: creadaEn,
    solicitud,
  });

  const jornadas = [
    // --- gru_1 / est_1: una jornada en cada situación de la ventana de 24 h ---
    jornada({
      id: 'jor_1', vinculacionId: 'vin_1', grupoId: 'gru_1', estudianteId: 'est_1',
      fecha: dia(0), horaInicio: '08:30', horaTermino: '17:30', descansoMin: 45,
      actividadPrincipal: 'Pruebas funcionales del módulo de usuarios',
      descripcion: 'Ejecución de casos de prueba y registro de hallazgos.',
      evidencia: archivos[0],
      // Dentro del plazo: editable directamente (RN-11).
      creadaEn: menos(0, 2),
    }),
    jornada({
      id: 'jor_2', vinculacionId: 'vin_1', grupoId: 'gru_1', estudianteId: 'est_1',
      fecha: dia(3), horaInicio: '09:00', horaTermino: '18:00', descansoMin: 60,
      actividadPrincipal: 'Corrección de incidencias reportadas',
      // Plazo vencido y sin solicitud: puede solicitar corrección.
      creadaEn: menos(3),
    }),
    jornada({
      id: 'jor_3', vinculacionId: 'vin_1', grupoId: 'gru_1', estudianteId: 'est_1',
      fecha: dia(5), horaInicio: '08:00', horaTermino: '14:00', descansoMin: 30,
      actividadPrincipal: 'Documentación técnica del módulo de reportes',
      evidencia: archivos[1],
      creadaEn: menos(5),
      solicitud: {
        id: 'sol_1',
        jornadaId: 'jor_3',
        motivo: 'Registré mal la hora de término: salí a las 15:00, no a las 14:00.',
        estado: ESTADO_SOLICITUD.PENDIENTE,
        creadaEn: menos(1),
        respuestaDocente: null,
        resueltaEn: null,
        completadaEn: null,
      },
    }),
    jornada({
      id: 'jor_4', vinculacionId: 'vin_1', grupoId: 'gru_1', estudianteId: 'est_1',
      fecha: dia(8), horaInicio: '08:30', horaTermino: '16:30', descansoMin: 45,
      actividadPrincipal: 'Reunión de levantamiento con la contraparte',
      // Corrección habilitada por el docente: estado OBSERVADA (RN-13).
      estado: ESTADO_JORNADA.OBSERVADA,
      creadaEn: menos(8),
      solicitud: {
        id: 'sol_2',
        jornadaId: 'jor_4',
        motivo: 'Faltó indicar el descanso de colación.',
        estado: ESTADO_SOLICITUD.HABILITADA,
        creadaEn: menos(4),
        respuestaDocente: 'Autorizado. Corrige solo el descanso y vuelve a guardar.',
        resueltaEn: menos(3),
        completadaEn: null,
      },
    }),
    jornada({
      id: 'jor_5', vinculacionId: 'vin_1', grupoId: 'gru_1', estudianteId: 'est_1',
      fecha: dia(12), horaInicio: '09:00', horaTermino: '17:00', descansoMin: 30,
      actividadPrincipal: 'Configuración del entorno de pruebas',
      creadaEn: menos(12),
      solicitud: {
        id: 'sol_3',
        jornadaId: 'jor_5',
        motivo: 'La actividad principal estaba incompleta.',
        estado: ESTADO_SOLICITUD.COMPLETADA,
        creadaEn: menos(11),
        respuestaDocente: 'Autorizado.',
        resueltaEn: menos(11),
        completadaEn: menos(10),
      },
    }),
    jornada({
      id: 'jor_6', vinculacionId: 'vin_1', grupoId: 'gru_1', estudianteId: 'est_1',
      fecha: dia(15), horaInicio: '08:00', horaTermino: '13:00', descansoMin: 0,
      actividadPrincipal: 'Inducción en el área de sistemas',
      creadaEn: menos(15),
      solicitud: {
        id: 'sol_4',
        jornadaId: 'jor_6',
        motivo: 'Quiero cambiar la fecha al día siguiente.',
        estado: ESTADO_SOLICITUD.RECHAZADA,
        creadaEn: menos(14),
        respuestaDocente: 'La fecha de una jornada no se modifica. Si la jornada no corresponde, avísame y la revisamos juntos.',
        resueltaEn: menos(13),
        completadaEn: null,
      },
    }),

    // --- gru_2 / est_1: la misma fecha que jor_2, permitida en otro grupo (RN-09) ---
    jornada({
      id: 'jor_7', vinculacionId: 'vin_2', grupoId: 'gru_2', estudianteId: 'est_1',
      fecha: dia(3), horaInicio: '19:00', horaTermino: '22:00', descansoMin: 0,
      actividadPrincipal: 'Desarrollo del servicio de autenticación',
      descripcion: 'Jornada vespertina en la práctica profesional.',
      creadaEn: menos(3),
    }),
    jornada({
      id: 'jor_8', vinculacionId: 'vin_2', grupoId: 'gru_2', estudianteId: 'est_1',
      fecha: dia(6), horaInicio: '19:00', horaTermino: '23:30', descansoMin: 15,
      actividadPrincipal: 'Pruebas de integración del servicio de autenticación',
      creadaEn: menos(6),
    }),

    // --- gru_1 / est_2 y est_3: para el listado de estudiantes del docente (§5.6) ---
    jornada({
      id: 'jor_9', vinculacionId: 'vin_3', grupoId: 'gru_1', estudianteId: 'est_2',
      fecha: dia(2), horaInicio: '08:30', horaTermino: '17:30', descansoMin: 45,
      actividadPrincipal: 'Soporte en mesa de ayuda',
      creadaEn: menos(2),
    }),
    jornada({
      id: 'jor_10', vinculacionId: 'vin_3', grupoId: 'gru_1', estudianteId: 'est_2',
      fecha: dia(4), horaInicio: '08:30', horaTermino: '18:30', descansoMin: 60,
      actividadPrincipal: 'Inventario de equipos del laboratorio',
      // Jornada de 9 h: RN-15 no impone tope diario, así que es válida.
      creadaEn: menos(4),
    }),
    jornada({
      id: 'jor_11', vinculacionId: 'vin_4', grupoId: 'gru_1', estudianteId: 'est_3',
      fecha: dia(1), horaInicio: '14:00', horaTermino: '20:00', descansoMin: 30,
      actividadPrincipal: 'Migración de datos del sistema antiguo',
      creadaEn: menos(1),
      solicitud: {
        id: 'sol_5',
        jornadaId: 'jor_11',
        motivo: 'Me equivoqué en la actividad principal.',
        estado: ESTADO_SOLICITUD.PENDIENTE,
        creadaEn: menos(0, 6),
        respuestaDocente: null,
        resueltaEn: null,
        completadaEn: null,
      },
    }),

    // --- gru_3 / est_4: grupo INACTIVO, todo debe quedar bloqueado (§4.6, §5.5) ---
    jornada({
      id: 'jor_12', vinculacionId: 'vin_5', grupoId: 'gru_3', estudianteId: 'est_4',
      fecha: dia(395), horaInicio: '09:00', horaTermino: '18:00', descansoMin: 60,
      actividadPrincipal: 'Atención de tickets de soporte',
      creadaEn: menos(395),
      /*
       * Una solicitud que quedó Pendiente cuando el grupo se desactivó. Pasa de verdad:
       * el estudiante pide, el docente desactiva el grupo y la solicitud se queda ahí.
       *
       * Es el escenario que distingue dos cosas que §5.5 separa y que es fácil confundir:
       * el docente **sí** puede abrir y leer la solicitud (consultar), y **no** puede
       * habilitarla ni rechazarla. Sin este dato en la semilla hay que reactivar el
       * grupo, pedir la corrección y volver a desactivarlo para poder comprobarlo.
       */
      solicitud: {
        id: 'sol_6',
        jornadaId: 'jor_12',
        motivo: 'Me faltó registrar media hora adicional que trabajé ese día.',
        estado: ESTADO_SOLICITUD.PENDIENTE,
        creadaEn: menos(392),
        respuestaDocente: null,
        resueltaEn: null,
        completadaEn: null,
      },
    }),
  ];

  const documentos = [
    {
      id: 'doc_inf_1',
      grupoId: 'gru_1',
      nombre: 'Reglamento de práctica laboral',
      instrucciones: 'Lectura obligatoria antes de registrar la primera jornada.',
      tipo: TIPO_DOCUMENTO.INFORMATIVO,
      versionVigente: 1,
      versiones: [{ numero: 1, archivo: archivos[2], publicadaEn: menos(59) }],
      creadoEn: menos(59),
    },
    {
      id: 'doc_ent_1',
      grupoId: 'gru_1',
      nombre: 'Informe de avance de práctica',
      instrucciones: 'Completa la plantilla con el avance de tus primeras 120 horas y súbela en formato Word o PDF.',
      tipo: TIPO_DOCUMENTO.REQUIERE_ENTREGA,
      // Dos versiones: el docente corrigió la plantilla publicada (§5.23).
      versionVigente: 2,
      versiones: [
        { numero: 1, archivo: archivos[3], publicadaEn: menos(30) },
        { numero: 2, archivo: archivos[4], publicadaEn: menos(20) },
      ],
      creadoEn: menos(30),
    },
    {
      id: 'doc_inf_2',
      grupoId: 'gru_2',
      nombre: 'Pauta de evaluación de práctica profesional',
      instrucciones: 'Criterios con los que la empresa evaluará tu desempeño.',
      tipo: TIPO_DOCUMENTO.INFORMATIVO,
      versionVigente: 1,
      versiones: [{ numero: 1, archivo: archivos[2], publicadaEn: menos(38) }],
      creadoEn: menos(38),
    },
    {
      id: 'doc_ent_2',
      grupoId: 'gru_3',
      nombre: 'Acta de cierre de práctica',
      instrucciones: 'Documento firmado por la empresa al término de la práctica.',
      tipo: TIPO_DOCUMENTO.REQUIERE_ENTREGA,
      versionVigente: 1,
      versiones: [{ numero: 1, archivo: archivos[8], publicadaEn: menos(410) }],
      creadoEn: menos(410),
    },
    {
      /*
       * Una solicitud que se quedó sin entregar cuando el grupo se desactivó. Pasa de
       * verdad, y es el único escenario donde se puede comprobar §4.21: que *Entregar*
       * permanezca **visible y bloqueado** en un grupo inactivo. Con todas las entregas
       * ya enviadas no hay botón que bloquear y el criterio no se puede verificar.
       */
      id: 'doc_ent_3',
      grupoId: 'gru_3',
      nombre: 'Encuesta de satisfacción de la práctica',
      instrucciones: 'Quedó pendiente al cerrarse el grupo.',
      tipo: TIPO_DOCUMENTO.REQUIERE_ENTREGA,
      versionVigente: 1,
      versiones: [{ numero: 1, archivo: archivos[8], publicadaEn: menos(400) }],
      creadoEn: menos(400),
    },
  ];

  // Una solicitud documental crea una entrega por estudiante vinculado (§5.19).
  const entregas = [
    {
      id: 'ent_1',
      documentoId: 'doc_ent_1',
      vinculacionId: 'vin_1',
      estudianteId: 'est_1',
      estado: ESTADO_ENTREGA.ENTREGADO,
      comentarioCorreccion: null,
      versionDocumentoUsada: 2,
      versiones: [
        { numero: 1, archivo: archivos[5], enviadaEn: menos(18) },
        { numero: 2, archivo: archivos[6], enviadaEn: menos(9) },
      ],
    },
    {
      id: 'ent_2',
      documentoId: 'doc_ent_1',
      vinculacionId: 'vin_3',
      estudianteId: 'est_2',
      estado: ESTADO_ENTREGA.PENDIENTE,
      comentarioCorreccion: null,
      versionDocumentoUsada: 2,
      versiones: [],
    },
    {
      id: 'ent_3',
      documentoId: 'doc_ent_1',
      vinculacionId: 'vin_4',
      estudianteId: 'est_3',
      estado: ESTADO_ENTREGA.CORRECCION_SOLICITADA,
      comentarioCorreccion: 'Falta el detalle de horas por semana en la sección 3. Completa esa tabla y vuelve a enviarlo.',
      versionDocumentoUsada: 2,
      versiones: [{ numero: 1, archivo: archivos[7], enviadaEn: menos(7) }],
    },
    {
      id: 'ent_4',
      documentoId: 'doc_ent_2',
      vinculacionId: 'vin_5',
      estudianteId: 'est_4',
      estado: ESTADO_ENTREGA.ENTREGADO,
      comentarioCorreccion: null,
      versionDocumentoUsada: 1,
      versiones: [{ numero: 1, archivo: archivos[9], enviadaEn: menos(392) }],
    },
    {
      // La que nunca se llegó a enviar: en un grupo inactivo, *Entregar* tiene que
      // seguir visible y bloqueado (§4.21).
      id: 'ent_5',
      documentoId: 'doc_ent_3',
      vinculacionId: 'vin_5',
      estudianteId: 'est_4',
      estado: ESTADO_ENTREGA.PENDIENTE,
      comentarioCorreccion: null,
      versionDocumentoUsada: 1,
      versiones: [],
    },
  ];

  const notificacion = (id, destinatarioId, grupoId, tipo, mensaje, referencia, creadaEn) => {
    const grupo = grupos.find((g) => g.id === grupoId);
    return {
      id,
      destinatarioId,
      grupoId,
      grupoNombre: grupo.nombre,
      grupoCodigo: grupo.codigo,
      tipo,
      mensaje,
      referencia,
      creadaEn,
    };
  };

  // Cada notificación identifica el grupo de origen: `Ver` carga el grupo y el
  // elemento relacionado (RN-16, §6.5).
  const notificaciones = [
    notificacion('not_1', 'doc_1', 'gru_1', TIPO_NOTIFICACION.SOLICITUD_ENVIADA,
      'Nicolás Fernández solicitó corregir la jornada del ' + diaLegible(5) + '.',
      { tipo: TIPO_REFERENCIA.JORNADA, id: 'jor_3' }, menos(1)),
    notificacion('not_2', 'doc_1', 'gru_1', TIPO_NOTIFICACION.SOLICITUD_ENVIADA,
      'Jonatán Barrios solicitó corregir la jornada del ' + diaLegible(1) + '.',
      { tipo: TIPO_REFERENCIA.JORNADA, id: 'jor_11' }, menos(0, 6)),
    notificacion('not_3', 'est_1', 'gru_1', TIPO_NOTIFICACION.CORRECCION_HABILITADA,
      'La docente habilitó la corrección de tu jornada del ' + diaLegible(8) + '.',
      { tipo: TIPO_REFERENCIA.JORNADA, id: 'jor_4' }, menos(3)),
    notificacion('not_4', 'est_1', 'gru_1', TIPO_NOTIFICACION.SOLICITUD_RECHAZADA,
      'Tu solicitud sobre la jornada del ' + diaLegible(15) + ' fue rechazada.',
      { tipo: TIPO_REFERENCIA.JORNADA, id: 'jor_6' }, menos(13)),
    notificacion('not_5', 'doc_1', 'gru_1', TIPO_NOTIFICACION.CORRECCION_GUARDADA,
      'Nicolás Fernández guardó la corrección de la jornada del ' + diaLegible(12) + '.',
      { tipo: TIPO_REFERENCIA.JORNADA, id: 'jor_5' }, menos(10)),
    notificacion('not_6', 'est_1', 'gru_1', TIPO_NOTIFICACION.DOCUMENTO_ACTUALIZADO,
      'Se publicó una nueva versión de «Informe de avance de práctica».',
      { tipo: TIPO_REFERENCIA.DOCUMENTO, id: 'doc_ent_1' }, menos(20)),
    notificacion('not_7', 'est_3', 'gru_1', TIPO_NOTIFICACION.REEMPLAZO_HABILITADO,
      'La docente pidió una corrección de tu entrega de «Informe de avance de práctica».',
      { tipo: TIPO_REFERENCIA.ENTREGA, id: 'ent_3' }, menos(6)),
    notificacion('not_8', 'doc_1', 'gru_1', TIPO_NOTIFICACION.ENTREGA_RECIBIDA,
      'Nicolás Fernández envió una nueva versión de «Informe de avance de práctica».',
      { tipo: TIPO_REFERENCIA.ENTREGA, id: 'ent_1' }, menos(9)),
    notificacion('not_9', 'est_1', 'gru_1', TIPO_NOTIFICACION.DOCUMENTO_PUBLICADO,
      'Se publicó «Reglamento de práctica laboral».',
      { tipo: TIPO_REFERENCIA.DOCUMENTO, id: 'doc_inf_1' }, menos(59)),
    // De la OTRA práctica de est_1: sin esto, la bandeja general nunca mostraría dos
    // grupos distintos y no se podría comprobar para qué sirve (§4.14, §9).
    notificacion('not_10', 'est_1', 'gru_2', TIPO_NOTIFICACION.DOCUMENTO_PUBLICADO,
      'Se publicó «Pauta de evaluación de práctica profesional».',
      { tipo: TIPO_REFERENCIA.DOCUMENTO, id: 'doc_inf_2' }, menos(38)),
  ];

  return {
    usuarios,
    grupos,
    vinculaciones,
    jornadas,
    documentos,
    entregas,
    notificaciones,
    archivos,
  };
};
