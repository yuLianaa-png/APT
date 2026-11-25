import {
  ESTADO_ENTREGA,
  ESTADO_EVALUACION,
  ESTADO_GRUPO,
  ESTADO_JORNADA,
  ESTADO_PAUTA,
  ESTADO_SEGUIMIENTO,
  ESTADO_SOLICITUD,
  ESTADO_VALIDACION,
  ETIQUETAS,
  NIVEL_RIESGO,
  TIPO_DOCUMENTO,
} from '../../utils/constants';

/// Insignia de estado, con el color y el texto según el tipo y el valor del estado. Se usa en grupos, jornadas, solicitudes, entregas y documentos.

/** Qué tono recibe cada estado. Lo que no está aquí sale en tono neutro. */
const TONOS = {
  grupo: {
    [ESTADO_GRUPO.ACTIVO]: 'exito',
    [ESTADO_GRUPO.INACTIVO]: 'neutro',
  },
  jornada: {
    // REGISTRADA es el estado normal, no un logro: tono neutro a propósito.
    [ESTADO_JORNADA.REGISTRADA]: 'neutro',
    // OBSERVADA no es un problema ni una aprobación (RN-13): es informativo.
    [ESTADO_JORNADA.OBSERVADA]: 'info',
  },
  solicitud: {
    [ESTADO_SOLICITUD.PENDIENTE]: 'espera',
    [ESTADO_SOLICITUD.HABILITADA]: 'info',
    [ESTADO_SOLICITUD.COMPLETADA]: 'exito',
    [ESTADO_SOLICITUD.RECHAZADA]: 'error',
  },
  entrega: {
    [ESTADO_ENTREGA.PENDIENTE]: 'espera',
    [ESTADO_ENTREGA.ENTREGADO]: 'exito',
    [ESTADO_ENTREGA.CORRECCION_SOLICITADA]: 'error',
  },
  documento: {
    [TIPO_DOCUMENTO.INFORMATIVO]: 'neutro',
    [TIPO_DOCUMENTO.REQUIERE_ENTREGA]: 'info',
  },
  // Semáforo de alertas del estudiante.
  riesgo: {
    [NIVEL_RIESGO.SIN_ALERTA]: 'exito',
    [NIVEL_RIESGO.ATENCION]: 'espera',
    [NIVEL_RIESGO.RIESGO]: 'error',
  },
  // Qué hizo el docente con la alerta.
  seguimiento: {
    [ESTADO_SEGUIMIENTO.ABIERTA]: 'espera',
    [ESTADO_SEGUIMIENTO.EN_SEGUIMIENTO]: 'info',
    [ESTADO_SEGUIMIENTO.RESUELTA]: 'exito',
  },
  // Revisión del supervisor del centro de práctica.
  validacion: {
    [ESTADO_VALIDACION.VALIDADA]: 'exito',
    [ESTADO_VALIDACION.OBSERVADA]: 'espera',
  },
  pauta: {
    [ESTADO_PAUTA.BORRADOR]: 'espera',
    [ESTADO_PAUTA.PUBLICADA]: 'exito',
  },
  evaluacion: {
    [ESTADO_EVALUACION.ESPERANDO_PAUTA]: 'espera',
    [ESTADO_EVALUACION.ENVIADA]: 'info',
    [ESTADO_EVALUACION.RESPONDIDA]: 'exito',
  },
};

const CLAVES_ETIQUETA = {
  grupo: 'ESTADO_GRUPO',
  jornada: 'ESTADO_JORNADA',
  solicitud: 'ESTADO_SOLICITUD',
  entrega: 'ESTADO_ENTREGA',
  documento: 'TIPO_DOCUMENTO',
  riesgo: 'NIVEL_RIESGO',
  seguimiento: 'ESTADO_SEGUIMIENTO',
  validacion: 'ESTADO_VALIDACION',
  pauta: 'ESTADO_PAUTA',
  evaluacion: 'ESTADO_EVALUACION',
};

/**
 * @param {'grupo'|'jornada'|'solicitud'|'entrega'|'documento'|'riesgo'|'seguimiento'|'validacion'|'pauta'|'evaluacion'} tipo
 * @param {string} estado valor del enum correspondiente
 * @param {string} [prefijo] texto antes de la etiqueta, p. ej. «Solicitud»
 */
const InsigniaEstado = ({ tipo, estado, prefijo = null }) => {
  if (!estado) return null;

  const tono = TONOS[tipo]?.[estado] ?? 'neutro';
  const etiqueta = ETIQUETAS[CLAVES_ETIQUETA[tipo]]?.[estado] ?? estado;
  const clase = tono === 'neutro' ? 'ph-insignia' : `ph-insignia ph-insignia--${tono}`;

  return (
    <span className={clase}>
      {prefijo ? `${prefijo}: ${etiqueta}` : etiqueta}
    </span>
  );
};

export default InsigniaEstado;
