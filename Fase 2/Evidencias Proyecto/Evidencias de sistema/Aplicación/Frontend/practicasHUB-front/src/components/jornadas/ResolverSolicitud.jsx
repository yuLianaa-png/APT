import { useState } from 'react';
import { Aviso, Boton, Campo, Modal } from '../ui';
import { ESTADO_SOLICITUD } from '../../utils/constants';

//modal para resolver una solicitud de corrección de jornada: habilitar o rechazar.

const ResolverSolicitud = ({ jornada, accion, alResolver, alCerrar, enCurso = false, errorServicio = null }) => {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState(null);

  const habilitando = accion === ESTADO_SOLICITUD.HABILITADA;

  const enviar = (evento) => {
    evento.preventDefault();

    if (!texto.trim()) {
      setError(habilitando
        ? 'Escribe qué debe corregir el estudiante: es lo único que va a recibir.'
        : 'Explica por qué lo rechazas: el estudiante solo verá este comentario.');
      return;
    }

    setError(null);
    alResolver(texto.trim());
  };

  return (
    <Modal
      titulo={habilitando ? 'Habilitar la corrección' : 'Rechazar la solicitud'}
      apoyo={`Jornada del ${jornada.fecha} de ${jornada.estudianteNombre ?? 'el estudiante'}`}
      alCerrar={alCerrar}
      cerrarAlPulsarFuera={false}
      pie={(
        <>
          <Boton variante="secundario" onClick={alCerrar} disabled={enCurso}>Cancelar</Boton>
          <Boton
            type="submit"
            form="formulario-resolucion"
            variante={habilitando ? 'primario' : 'peligro'}
            disabled={enCurso}
          >
            {enCurso
              ? 'Aplicando…'
              : (habilitando ? 'Habilitar corrección' : 'Rechazar solicitud')}
          </Boton>
        </>
      )}
    >
      <form id="formulario-resolucion" className="ph-pila" onSubmit={enviar} noValidate>
        {errorServicio && (
          <Aviso tono="error" titulo="No se pudo aplicar">{errorServicio}</Aviso>
        )}

        <Campo
          etiqueta={habilitando ? 'Observación para el estudiante' : 'Motivo del rechazo'}
          obligatorio
          error={error}
          ayuda={habilitando
            ? 'Dile qué dato debe corregir. Lo verá junto al formulario.'
            : 'Lo recibirá en su notificación.'}
        >
          {(atributos) => (
            <textarea
              {...atributos}
              className={`ph-campo__control${error ? ' ph-campo__control--error' : ''}`}
              placeholder={habilitando
                ? 'Autorizado. Corrige solo la hora de término y vuelve a guardar.'
                : 'La fecha de una jornada no se modifica. Si la jornada no corresponde, avísame y la revisamos.'}
              value={texto}
              onChange={(evento) => { setTexto(evento.target.value); setError(null); }}
              disabled={enCurso}
            />
          )}
        </Campo>

        {habilitando ? (
          <Aviso tono="info" titulo="La jornada pasará a Observada">
            El estudiante podrá corregir todo salvo la fecha, y al guardar la jornada
            volverá a quedar registrada y bloqueada. Observada no significa aprobada ni
            rechazada: es solo un permiso temporal para corregir.
          </Aviso>
        ) : (
          <Aviso tono="espera" titulo="La jornada no cambiará">
            Seguirá registrada y bloqueada, tal como está. Rechazar no modifica las horas
            ni invalida la jornada. El estudiante podrá volver a solicitarlo si hace falta.
          </Aviso>
        )}
      </form>
    </Modal>
  );
};

export default ResolverSolicitud;
