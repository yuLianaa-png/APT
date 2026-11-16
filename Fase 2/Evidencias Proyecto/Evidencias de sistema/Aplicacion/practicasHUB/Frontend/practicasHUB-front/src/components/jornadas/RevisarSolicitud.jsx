import { Aviso, Boton, InsigniaEstado, Modal } from '../ui';
import DetalleSolicitud from './DetalleSolicitud';
import { VistaPrevia } from '../archivos';
import { formatearDescanso, formatearHoras } from '../../utils/horas';
import { formatearFecha } from '../../utils/fechas';
import { MOTIVOS_BLOQUEO } from '../../utils/constants';

// Modal que permite al docente revisar la solicitud de corrección de jornada de un estudiante, con los datos de la jornada, la evidencia y el detalle de la solicitud.

const RevisarSolicitud = ({
  jornada, estudianteNombre, soloLectura, alHabilitar, alRechazar, alCerrar,
}) => (
  <Modal
    titulo="Revisar solicitud de corrección"
    apoyo={`${estudianteNombre} · jornada del ${formatearFecha(jornada.fecha)}`}
    alCerrar={alCerrar}
    pie={(
      <>
        <Boton variante="secundario" onClick={alCerrar}>Cerrar</Boton>
        <Boton
          variante="peligro"
          bloqueado={soloLectura}
          motivoBloqueo={MOTIVOS_BLOQUEO.GRUPO_INACTIVO}
          mostrarMotivo={false}
          onClick={alRechazar}
        >
          Rechazar solicitud
        </Boton>
        <Boton
          bloqueado={soloLectura}
          motivoBloqueo={MOTIVOS_BLOQUEO.GRUPO_INACTIVO}
          mostrarMotivo={false}
          onClick={alHabilitar}
        >
          Habilitar corrección
        </Boton>
      </>
    )}
  >
    <div className="ph-pila">
      {soloLectura && (
        <Aviso titulo="Este grupo está inactivo">
          Puedes leer la solicitud, pero no resolverla. Para responderla, reactiva el grupo
          desde el Dashboard general.
        </Aviso>
      )}

      <div>
        <h3 className="ph-tarjeta__titulo">Datos de la jornada</h3>
        <dl className="ph-ficha">
          <div>
            <dt>Fecha</dt>
            <dd><strong>{formatearFecha(jornada.fecha)}</strong></dd>
          </div>
          <div>
            <dt>Horario</dt>
            <dd>{`${jornada.horaInicio} a ${jornada.horaTermino}`}</dd>
          </div>
          <div>
            <dt>Descanso</dt>
            <dd>{formatearDescanso(jornada.descansoMin)}</dd>
          </div>
          <div>
            <dt>Horas</dt>
            <dd><strong>{`${formatearHoras(jornada.horas)} h`}</strong></dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd><InsigniaEstado tipo="jornada" estado={jornada.estado} /></dd>
          </div>
          <div className="ph-ficha__ancho">
            <dt>Actividad principal</dt>
            <dd>{jornada.actividadPrincipal}</dd>
          </div>
          {jornada.descripcion && (
            <div className="ph-ficha__ancho">
              <dt>Descripción</dt>
              <dd>{jornada.descripcion}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* RF-10: la evidencia es parte de lo que se revisa para decidir. */}
      {jornada.evidencia && (
        <div>
          <h3 className="ph-tarjeta__titulo">Evidencia</h3>
          <VistaPrevia archivo={jornada.evidencia} alto={300} />
        </div>
      )}

      <div>
        <h3 className="ph-tarjeta__titulo">La solicitud</h3>
        <DetalleSolicitud solicitud={jornada.solicitud} verComoDocente />
      </div>
    </div>
  </Modal>
);

export default RevisarSolicitud;
