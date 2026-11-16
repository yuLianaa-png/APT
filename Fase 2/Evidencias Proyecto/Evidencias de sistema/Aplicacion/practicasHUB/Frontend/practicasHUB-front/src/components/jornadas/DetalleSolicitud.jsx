import { Aviso, InsigniaEstado } from '../ui';
import { ESTADO_SOLICITUD } from '../../utils/constants';
import { formatearInstante } from '../../utils/fechas';

// Detalle de una solicitud de corrección de jornada, con su motivo, la respuesta del docente y el estado actual.

const TITULOS = {
  [ESTADO_SOLICITUD.PENDIENTE]: 'Solicitud enviada, esperando al docente',
  [ESTADO_SOLICITUD.HABILITADA]: 'El docente habilitó la corrección',
  [ESTADO_SOLICITUD.COMPLETADA]: 'Corrección guardada',
  [ESTADO_SOLICITUD.RECHAZADA]: 'El docente rechazó la solicitud',
};

const TONOS = {
  [ESTADO_SOLICITUD.PENDIENTE]: 'espera',
  [ESTADO_SOLICITUD.HABILITADA]: 'info',
  [ESTADO_SOLICITUD.COMPLETADA]: 'exito',
  [ESTADO_SOLICITUD.RECHAZADA]: 'error',
};

const DetalleSolicitud = ({ solicitud, verComoDocente = false }) => {
  if (!solicitud) return null;

  const { estado } = solicitud;
  const rechazada = estado === ESTADO_SOLICITUD.RECHAZADA;

  return (
    <div className="ph-pila">
      <div className="ph-fila">
        <InsigniaEstado tipo="solicitud" estado={estado} prefijo="Solicitud" />
        <span className="ph-campo__ayuda">
          {`Enviada el ${formatearInstante(solicitud.creadaEn)}`}
        </span>
      </div>

      <dl className="ph-ficha">
        <div className="ph-ficha__ancho">
          <dt>{verComoDocente ? 'Motivo que escribió el estudiante' : 'Tu motivo'}</dt>
          <dd>{`«${solicitud.motivo}»`}</dd>
        </div>

        {solicitud.respuestaDocente && (
          <div className="ph-ficha__ancho">
            <dt>
              {rechazada ? 'Comentario del rechazo' : 'Observación del docente'}
            </dt>
            <dd>{`«${solicitud.respuestaDocente}»`}</dd>
          </div>
        )}

        {solicitud.resueltaEn && (
          <div>
            <dt>Respondida el</dt>
            <dd>{formatearInstante(solicitud.resueltaEn)}</dd>
          </div>
        )}

        {solicitud.completadaEn && (
          <div>
            <dt>Corregida el</dt>
            <dd>{formatearInstante(solicitud.completadaEn)}</dd>
          </div>
        )}
      </dl>

      <Aviso tono={TONOS[estado]} titulo={TITULOS[estado]}>
        {estado === ESTADO_SOLICITUD.PENDIENTE
          && 'Mientras tanto la jornada sigue registrada y bloqueada.'}
        {estado === ESTADO_SOLICITUD.HABILITADA
          && 'La jornada está Observada: puedes corregir todo salvo la fecha. Al guardar vuelve a quedar registrada y bloqueada.'}
        {estado === ESTADO_SOLICITUD.COMPLETADA
          && 'La jornada volvió a quedar registrada y bloqueada.'}
        {rechazada
          && 'La jornada sigue registrada y bloqueada: un rechazo no habilita ningún cambio. Si sigue siendo necesario corregirla, puedes volver a solicitarlo explicando mejor el motivo.'}
      </Aviso>
    </div>
  );
};

export default DetalleSolicitud;
