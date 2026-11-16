import { useState } from 'react';
import { Aviso, Boton, Campo, Modal } from '../ui';
import DetalleSolicitud from './DetalleSolicitud';
import { formatearDescanso, formatearHoras } from '../../utils/horas';
import { formatearFecha } from '../../utils/fechas';
import { ESTADO_SOLICITUD } from '../../utils/constants';

/** El motivo tiene que explicar algo; «ups» no es un motivo. Coincide con el servicio. */
const MINIMO_MOTIVO = 10;

// Modal que permite al estudiante solicitar la corrección de una jornada, con su horario, descanso, horas efectivas, actividad principal y un campo para explicar el motivo de la solicitud. Si ya había enviado una solicitud rechazada, se muestra el detalle de esa solicitud.

const SolicitarCorreccion = ({ jornada, alEnviar, alCerrar, enCurso = false, errorServicio = null }) => {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState(null);

  const rechazoAnterior = jornada.solicitud?.estado === ESTADO_SOLICITUD.RECHAZADA
    ? jornada.solicitud
    : null;

  const enviar = (evento) => {
    evento.preventDefault();

    const texto = motivo.trim();
    if (texto.length < MINIMO_MOTIVO) {
      setError('Explica qué necesitas corregir y por qué. El docente solo verá esto para decidir.');
      return;
    }

    setError(null);
    alEnviar(texto);
  };

  return (
    <Modal
      titulo="Solicitar corrección"
      apoyo={`Jornada del ${formatearFecha(jornada.fecha)}`}
      alCerrar={alCerrar}
      cerrarAlPulsarFuera={false}
      pie={(
        <>
          <Boton variante="secundario" onClick={alCerrar} disabled={enCurso}>Cancelar</Boton>
          <Boton type="submit" form="formulario-solicitud" disabled={enCurso}>
            {enCurso ? 'Enviando…' : 'Enviar solicitud'}
          </Boton>
        </>
      )}
    >
      <form id="formulario-solicitud" className="ph-pila" onSubmit={enviar} noValidate>
        {errorServicio && (
          <Aviso tono="error" titulo="No se pudo enviar">{errorServicio}</Aviso>
        )}

        {rechazoAnterior && (
          <>
            <p className="ph-tarjeta__apoyo">
              Ya pediste corregir esta jornada antes y el docente lo rechazó:
            </p>
            <DetalleSolicitud solicitud={rechazoAnterior} />
          </>
        )}

        <dl className="ph-ficha">
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
            <dd>{`${formatearHoras(jornada.horas)} h`}</dd>
          </div>
          <div className="ph-ficha__ancho">
            <dt>Actividad principal</dt>
            <dd>{jornada.actividadPrincipal}</dd>
          </div>
        </dl>

        <Campo
          etiqueta="Motivo de la solicitud"
          obligatorio
          error={error}
          ayuda="Di qué dato está mal y cuál es el correcto. Lo leerá tu docente."
        >
          {(atributos) => (
            <textarea
              {...atributos}
              className={`ph-campo__control${error ? ' ph-campo__control--error' : ''}`}
              placeholder="Registré mal la hora de término: salí a las 19:00, no a las 18:00."
              value={motivo}
              onChange={(evento) => { setMotivo(evento.target.value); setError(null); }}
              disabled={enCurso}
            />
          )}
        </Campo>

        <Aviso tono="espera" titulo="La jornada sigue bloqueada mientras tanto">
          Enviar la solicitud no desbloquea nada por sí solo. La jornada seguirá registrada
          tal como está hasta que el docente habilite la corrección.
          {' '}
          <strong>La fecha no se puede cambiar en ningún caso.</strong>
        </Aviso>
      </form>
    </Modal>
  );
};

export default SolicitarCorreccion;
