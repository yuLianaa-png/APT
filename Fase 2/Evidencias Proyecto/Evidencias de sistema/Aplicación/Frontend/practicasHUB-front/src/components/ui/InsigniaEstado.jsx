import {
  ESTADO_ENTREGA,
  ESTADO_GRUPO,
  ESTADO_JORNADA,
  ESTADO_SOLICITUD,
  ETIQUETAS,
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
};

const CLAVES_ETIQUETA = {
  grupo: 'ESTADO_GRUPO',
  jornada: 'ESTADO_JORNADA',
  solicitud: 'ESTADO_SOLICITUD',
  entrega: 'ESTADO_ENTREGA',
  documento: 'TIPO_DOCUMENTO',
};

/**
 * @param {'grupo'|'jornada'|'solicitud'|'entrega'|'documento'} tipo
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
