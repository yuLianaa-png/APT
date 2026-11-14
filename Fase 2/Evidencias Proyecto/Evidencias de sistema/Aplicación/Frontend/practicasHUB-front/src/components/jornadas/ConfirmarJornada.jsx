import { Aviso, Boton, Modal } from '../ui';
import { formatearDescanso, formatearHoras } from '../../utils/horas';
import { formatearFecha } from '../../utils/fechas';

// Modal que muestra los datos de una jornada antes de confirmarla, con su fecha, horario, descanso, horas efectivas, actividad principal, descripción y evidencia.

const ConfirmarJornada = ({
  datos, alConfirmar, alCerrar, enCurso = false, modoCorreccion = false,
}) => (
  <Modal
    titulo={modoCorreccion ? 'Confirmar la corrección' : 'Confirmar el registro'}
    apoyo="Revisa los datos antes de guardar."
    alCerrar={alCerrar}
    cerrarAlPulsarFuera={false}
    pie={(
      <>
        <Boton variante="secundario" onClick={alCerrar} disabled={enCurso}>
          Volver a editar
        </Boton>
        <Boton onClick={alConfirmar} disabled={enCurso}>
          {enCurso ? 'Guardando…' : (modoCorreccion ? 'Guardar corrección' : 'Confirmar registro')}
        </Boton>
      </>
    )}
  >
    <div className="ph-pila">
      <dl className="ph-ficha">
        <div>
          <dt>Fecha</dt>
          <dd><strong>{formatearFecha(datos.fecha)}</strong></dd>
        </div>
        <div>
          <dt>Horario</dt>
          <dd>{`${datos.horaInicio} a ${datos.horaTermino}`}</dd>
        </div>
        <div>
          <dt>Descanso</dt>
          <dd>{formatearDescanso(datos.descansoMin)}</dd>
        </div>
        <div>
          <dt>Horas efectivas</dt>
          <dd><strong>{`${formatearHoras(datos.horas)} h`}</strong></dd>
        </div>
        <div className="ph-ficha__ancho">
          <dt>Actividad principal</dt>
          <dd>{datos.actividadPrincipal}</dd>
        </div>
        {datos.descripcion && (
          <div className="ph-ficha__ancho">
            <dt>Descripción</dt>
            <dd>{datos.descripcion}</dd>
          </div>
        )}
        <div className="ph-ficha__ancho">
          <dt>Evidencia</dt>
          <dd>{datos.evidencia ? (datos.evidencia.name ?? datos.evidencia.nombre) : 'Sin evidencia'}</dd>
        </div>
      </dl>

      {modoCorreccion ? (
        <Aviso tono="espera" titulo="Al guardar, la jornada vuelve a quedar bloqueada">
          La corrección cierra la solicitud: la jornada pasa otra vez a Registrada y no
          empieza un plazo nuevo de 24 horas. Si hiciera falta cambiar algo más, tendrías
          que volver a solicitarlo.
        </Aviso>
      ) : (
        <Aviso tono="espera" titulo="Tendrás 24 horas para modificarla">
          Desde que la guardes podrás corregir los datos tú mismo durante 24 horas. Pasado
          ese plazo, la jornada queda bloqueada y cualquier cambio necesita que el docente
          lo autorice. <strong>La fecha no se puede cambiar en ningún caso.</strong>
        </Aviso>
      )}
    </div>
  </Modal>
);

export default ConfirmarJornada;
