import { Boton, EstadoVacio } from '../ui';
import { ETIQUETAS, TIPO_NOTIFICACION } from '../../utils/constants';
import { formatearInstante } from '../../utils/fechas';



 /// Lista de notificaciones, compartida por la bandeja general y la del grupo.


/** Un signo por tipo. Es refuerzo: el mensaje ya dice qué pasó. */
const SIGNOS = {
  [TIPO_NOTIFICACION.SOLICITUD_ENVIADA]: '?',
  [TIPO_NOTIFICACION.CORRECCION_HABILITADA]: '✎',
  [TIPO_NOTIFICACION.CORRECCION_GUARDADA]: '✓',
  [TIPO_NOTIFICACION.SOLICITUD_RECHAZADA]: '✕',
  [TIPO_NOTIFICACION.DOCUMENTO_PUBLICADO]: '+',
  [TIPO_NOTIFICACION.DOCUMENTO_ACTUALIZADO]: '↻',
  [TIPO_NOTIFICACION.REEMPLAZO_HABILITADO]: '✎',
  [TIPO_NOTIFICACION.ENTREGA_RECIBIDA]: '↓',
};

const TONOS = {
  [TIPO_NOTIFICACION.SOLICITUD_ENVIADA]: 'espera',
  [TIPO_NOTIFICACION.CORRECCION_HABILITADA]: 'info',
  [TIPO_NOTIFICACION.CORRECCION_GUARDADA]: 'exito',
  [TIPO_NOTIFICACION.SOLICITUD_RECHAZADA]: 'error',
  [TIPO_NOTIFICACION.REEMPLAZO_HABILITADO]: 'info',
  [TIPO_NOTIFICACION.ENTREGA_RECIBIDA]: 'exito',
};

const ListaNotificaciones = ({
  notificaciones,
  mostrarGrupo = false,
  alVer,
  abriendo = null,
  vacio = null,
}) => {
  if (notificaciones.length === 0) {
    return vacio ?? (
      <EstadoVacio titulo="No tienes novedades">
        Aquí aparecerán las solicitudes, correcciones, documentos y entregas a medida que
        ocurran.
      </EstadoVacio>
    );
  }

  return (
    <ul className="ph-notificaciones">
      {notificaciones.map((aviso) => {
        const tono = TONOS[aviso.tipo] ?? 'neutro';

        return (
          <li key={aviso.id} className="ph-notificacion">
            <span
              className={`ph-notificacion__signo ph-notificacion__signo--${tono}`}
              aria-hidden="true"
            >
              {SIGNOS[aviso.tipo] ?? '·'}
            </span>

            <div className="ph-notificacion__cuerpo">
              {/* §9: el grupo de origen, antes de navegar. */}
              {mostrarGrupo && (
                <p className="ph-notificacion__origen">
                  <strong>{aviso.grupoNombre}</strong>
                  <code>{aviso.grupoCodigo}</code>
                </p>
              )}

              <p className="ph-notificacion__tipo">
                {ETIQUETAS.TIPO_NOTIFICACION[aviso.tipo] ?? 'Novedad'}
              </p>
              <p className="ph-notificacion__mensaje">{aviso.mensaje}</p>
              <p className="ph-campo__ayuda">{formatearInstante(aviso.creadaEn)}</p>
            </div>

            <Boton
              variante="secundario"
              tamano="pequeno"
              disabled={abriendo === aviso.id}
              onClick={() => alVer(aviso)}
            >
              {abriendo === aviso.id ? 'Abriendo…' : 'Ver'}
            </Boton>
          </li>
        );
      })}
    </ul>
  );
};

export default ListaNotificaciones;
