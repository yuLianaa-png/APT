/**
 * Vocabulario del dominio de PrácticasHub.
 *
 * Fuente: Manual funcional V1.4 §10 (glosario) y Requerimientos V1.2 (RN-01 a RN-20).
 * Las decisiones sobre los puntos que los documentos dejaron abiertos están en
 * Cerebro/practicasHUB-front/06-Decisiones.md (A-01 a A-13).
 *
 * Reglas que este archivo fija y que NO deben cambiarse sin actualizar la documentación:
 *  - Solo existen dos roles: ESTUDIANTE y DOCENTE (V1.2 §2). No hay administrador.
 *  - Una jornada NO se aprueba (RN-14). Sus únicos estados son REGISTRADA y OBSERVADA.
 *  - OBSERVADA no significa aprobación ni rechazo: habilita edición temporal (RN-13).
 */

/** Perfiles del sistema. V1.2 §2: no existe rol de administración. */
export const ROLES = {
  ESTUDIANTE: 'ESTUDIANTE',
  DOCENTE: 'DOCENTE',
};

/** Grupo y código comparten estado (RN-03). INACTIVO implica solo lectura. */
export const ESTADO_GRUPO = {
  ACTIVO: 'ACTIVO',
  INACTIVO: 'INACTIVO',
};

/**
 * Estados de una jornada (RN-11, RN-13, RN-14).
 * No hay APROBADA ni RECHAZADA: el docente no aprueba jornadas.
 */
export const ESTADO_JORNADA = {
  REGISTRADA: 'REGISTRADA',
  OBSERVADA: 'OBSERVADA',
};

/** Estados de una solicitud de corrección de jornada (RN-12, §6.2). */
export const ESTADO_SOLICITUD = {
  PENDIENTE: 'PENDIENTE',
  HABILITADA: 'HABILITADA',
  COMPLETADA: 'COMPLETADA',
  RECHAZADA: 'RECHAZADA',
};

/**
 * Semáforo de alertas de un estudiante (ver `utils/riesgo.js` y PracticeRiskService).
 * No es una nota ni una evaluación: avisa al docente a quién conviene mirar primero.
 */
export const NIVEL_RIESGO = {
  SIN_ALERTA: 'SIN_ALERTA',
  ATENCION: 'ATENCION',
  RIESGO: 'RIESGO',
};

/** Tipo de publicación documental del docente (§5.19). */
export const TIPO_DOCUMENTO = {
  INFORMATIVO: 'INFORMATIVO',
  REQUIERE_ENTREGA: 'REQUIERE_ENTREGA',
};

/**
 * Estados de la entrega individual de un estudiante (§6.3).
 * Decisión A-08: `Versionado` no es un estado, es un atributo — toda entrega y toda
 * publicación conservan su historial de versiones (RN-20).
 */
export const ESTADO_ENTREGA = {
  PENDIENTE: 'PENDIENTE',
  ENTREGADO: 'ENTREGADO',
  CORRECCION_SOLICITADA: 'CORRECCION_SOLICITADA',
};

/**
 * Catálogo de notificaciones. Decisión A-10: los ocho eventos que nombran los documentos,
 * ampliados con seis más para cerrar el flujo entre estudiante y docente (vinculación,
 * jornadas registradas o editadas y cambios de estado del grupo).
 * No hay leída/no leída porque ningún documento la menciona.
 */
export const TIPO_NOTIFICACION = {
  SOLICITUD_ENVIADA: 'SOLICITUD_ENVIADA',
  CORRECCION_HABILITADA: 'CORRECCION_HABILITADA',
  CORRECCION_GUARDADA: 'CORRECCION_GUARDADA',
  SOLICITUD_RECHAZADA: 'SOLICITUD_RECHAZADA',
  DOCUMENTO_PUBLICADO: 'DOCUMENTO_PUBLICADO',
  DOCUMENTO_ACTUALIZADO: 'DOCUMENTO_ACTUALIZADO',
  REEMPLAZO_HABILITADO: 'REEMPLAZO_HABILITADO',
  ENTREGA_RECIBIDA: 'ENTREGA_RECIBIDA',
  // Del estudiante al docente.
  ESTUDIANTE_VINCULADO: 'ESTUDIANTE_VINCULADO',
  JORNADA_REGISTRADA: 'JORNADA_REGISTRADA',
  JORNADA_EDITADA: 'JORNADA_EDITADA',
  // Del docente a los estudiantes.
  GRUPO_DESACTIVADO: 'GRUPO_DESACTIVADO',
  GRUPO_REACTIVADO: 'GRUPO_REACTIVADO',
  GRUPO_ELIMINADO: 'GRUPO_ELIMINADO',
  // Aviso diario al docente.
  ALERTAS_RIESGO: 'ALERTAS_RIESGO',
  // Seguimiento de alertas: recordatorio y plan al estudiante; mensajes entre ambos.
  RECORDATORIO_RIESGO: 'RECORDATORIO_RIESGO',
  PLAN_SEGUIMIENTO: 'PLAN_SEGUIMIENTO',
  MENSAJE_RECIBIDO: 'MENSAJE_RECIBIDO',
};

/** Objeto al que apunta una notificación; `Ver` abre ese elemento dentro del grupo (RN-16). */
export const TIPO_REFERENCIA = {
  JORNADA: 'JORNADA',
  DOCUMENTO: 'DOCUMENTO',
  ENTREGA: 'ENTREGA',
  GRUPO: 'GRUPO',
  // Conversación docente-estudiante: el id es la vinculación.
  CONVERSACION: 'CONVERSACION',
};

/** Estado del seguimiento de una alerta: qué hizo el docente con ella. */
export const ESTADO_SEGUIMIENTO = {
  ABIERTA: 'ABIERTA',
  EN_SEGUIMIENTO: 'EN_SEGUIMIENTO',
  RESUELTA: 'RESUELTA',
};

/** Lo que el docente registra en el seguimiento. PLAN y CIERRE los crea el sistema. */
export const TIPO_ACCION_SEGUIMIENTO = {
  CONTACTO: 'CONTACTO',
  ACUERDO: 'ACUERDO',
  NOTA: 'NOTA',
  PLAN: 'PLAN',
  CIERRE: 'CIERRE',
};

/** Largo máximo de un mensaje (igual que en el backend). */
export const LARGO_MAXIMO_MENSAJE = 2000;

/**
 * Validación de archivos (RNF-08, §7.1). 40 MB, lista blanca de formatos.
 * Se rechazan videos, ejecutables y cualquier cosa que no sea documento o imagen.
 */
export const LIMITES_ARCHIVO = {
  TAMANO_MAXIMO_BYTES: 40 * 1024 * 1024,
  EXTENSIONES: [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png',
  ],
  TIPOS_MIME: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
  ],
  /** Decisión A-07: el navegador solo previsualiza estos de forma nativa. */
  EXTENSIONES_PREVISUALIZABLES: ['pdf', 'txt', 'jpg', 'jpeg', 'png'],
};

/**
 * Ventana de edición directa de una jornada: 24 h desde su creación (RN-11).
 * Decisión A-01: la tabla §6.2 del manual dice lo contrario, pero es un error del
 * documento — nueve apariciones de la regla frente a esa única fila.
 */
export const VENTANA_EDICION_MS = 24 * 60 * 60 * 1000;

/**
 * Campos de la jornada que se pueden modificar en la ventana de 24 h y en estado
 * OBSERVADA. Decisión A-06: todo menos la fecha, evidencia incluida (RN-11, RN-13).
 */
export const CAMPOS_EDITABLES_JORNADA = [
  'horaInicio',
  'horaTermino',
  'descansoMin',
  'actividadPrincipal',
  'descripcion',
  'evidencia',
];

/** Códigos de error que devuelven los servicios, con forma `{ codigo, mensaje }`. */
export const ERRORES = {
  CODIGO_INEXISTENTE: 'CODIGO_INEXISTENTE',
  GRUPO_INACTIVO: 'GRUPO_INACTIVO',
  YA_VINCULADO: 'YA_VINCULADO',
  FECHA_REPETIDA: 'FECHA_REPETIDA',
  FECHA_FUTURA: 'FECHA_FUTURA',
  PLAZO_VENCIDO: 'PLAZO_VENCIDO',
  ARCHIVO_INVALIDO: 'ARCHIVO_INVALIDO',
  NO_AUTORIZADO: 'NO_AUTORIZADO',
  HORARIO_INVALIDO: 'HORARIO_INVALIDO',
  SOLICITUD_EN_CURSO: 'SOLICITUD_EN_CURSO',
  NO_ENCONTRADO: 'NO_ENCONTRADO',
};

/** Motivos por los que un botón queda visible pero bloqueado (§1 y §9 del manual). */
export const MOTIVOS_BLOQUEO = {
  GRUPO_INACTIVO: 'La práctica está inactiva: solo se puede consultar.',
  PLAZO_VENCIDO: 'Pasaron más de 24 horas desde el registro. Solicita una corrección al docente.',
  SOLICITUD_PENDIENTE: 'Ya hay una solicitud de corrección esperando respuesta del docente.',
  CORRECCION_HABILITADA: 'El docente habilitó la corrección: usa Modificar jornada.',
  SIN_CORRECCION_HABILITADA: 'El docente no ha habilitado una corrección para esta jornada.',
  DENTRO_DEL_PLAZO: 'La jornada todavía se puede editar directamente.',
  SOLO_DOCENTE: 'Solo el docente responsable puede realizar esta acción.',
};

/**
 * Etiquetas de interfaz. El vocabulario del glosario (§10) es obligatorio:
 * se dice «jornada», no «actividad»; «grupo de práctica», no «curso»;
 * «docente», no «supervisor».
 */
export const ETIQUETAS = {
  ROLES: {
    ESTUDIANTE: 'Estudiante',
    DOCENTE: 'Docente',
  },
  ESTADO_GRUPO: {
    ACTIVO: 'Activa',
    INACTIVO: 'Inactiva',
  },
  ESTADO_JORNADA: {
    REGISTRADA: 'Registrada',
    OBSERVADA: 'Observada',
  },
  ESTADO_SOLICITUD: {
    PENDIENTE: 'Pendiente',
    HABILITADA: 'Habilitada',
    COMPLETADA: 'Completada',
    RECHAZADA: 'Rechazada',
  },
  TIPO_DOCUMENTO: {
    INFORMATIVO: 'Informativo',
    REQUIERE_ENTREGA: 'Requiere entrega',
  },
  ESTADO_ENTREGA: {
    PENDIENTE: 'Pendiente',
    ENTREGADO: 'Entregado',
    CORRECCION_SOLICITADA: 'Corrección solicitada',
  },
  TIPO_NOTIFICACION: {
    SOLICITUD_ENVIADA: 'Solicitud de corrección recibida',
    CORRECCION_HABILITADA: 'Corrección habilitada',
    CORRECCION_GUARDADA: 'Corrección guardada',
    SOLICITUD_RECHAZADA: 'Solicitud de corrección rechazada',
    DOCUMENTO_PUBLICADO: 'Documento publicado',
    DOCUMENTO_ACTUALIZADO: 'Documento actualizado',
    REEMPLAZO_HABILITADO: 'Reemplazo de entrega habilitado',
    ENTREGA_RECIBIDA: 'Entrega recibida',
    ESTUDIANTE_VINCULADO: 'Nuevo estudiante vinculado',
    JORNADA_REGISTRADA: 'Jornada registrada',
    JORNADA_EDITADA: 'Jornada editada',
    GRUPO_DESACTIVADO: 'Práctica desactivada',
    GRUPO_REACTIVADO: 'Práctica reactivada',
    GRUPO_ELIMINADO: 'Práctica eliminada',
    ALERTAS_RIESGO: 'Estudiantes que requieren tu intervención',
    RECORDATORIO_RIESGO: 'Tu práctica necesita atención',
    PLAN_SEGUIMIENTO: 'Plan de seguimiento',
    MENSAJE_RECIBIDO: 'Nuevo mensaje',
  },
  ESTADO_SEGUIMIENTO: {
    ABIERTA: 'Sin gestionar',
    EN_SEGUIMIENTO: 'En seguimiento',
    RESUELTA: 'Resuelta',
  },
  TIPO_ACCION_SEGUIMIENTO: {
    CONTACTO: 'Contacto con el estudiante',
    ACUERDO: 'Acuerdo',
    NOTA: 'Nota',
    PLAN: 'Plan o prórroga',
    CIERRE: 'Alerta cerrada',
  },
  NIVEL_RIESGO: {
    SIN_ALERTA: 'Al día',
    ATENCION: 'Requiere atención',
    RIESGO: 'En riesgo',
  },
};

/** Claves de la sesión en `localStorage`. */
export const STORAGE_KEYS = {
  TOKEN: 'practicashub_token',
  USER: 'practicashub_user',
};

/**
 * Claves que escribió el prototipo anterior. Se conservan listadas para poder
 * limpiarlas en M-15; ningún código nuevo debe leerlas ni escribirlas.
 */
export const CLAVES_HEREDADAS = [
  'practicahub_token',
  'practicahub_actividades',
  'practicahub_actividades_docente',
  'practicahub_ultima_actividad',
  'practicahub_codigos_vinculacion',
];
