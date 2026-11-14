import { useState } from 'react';
import { Aviso, Boton, Campo, Modal } from '../ui';

/**
 * Pedir al estudiante que corrija su entrega (§5.12 y §5.25, RF-15).
 *
 * **Decisión A-02**: §5.12 («Habilitación de reemplazo», comentario obligatorio) y §5.25
 * («Solicitud de corrección documental», descripción breve obligatoria) describen **la
 * misma acción** con dos nombres. RF-15 la nombra una sola vez y la tabla §6.3 le da un
 * solo estado. Se construye una.
 *
 * El comentario es obligatorio porque es **lo único que el estudiante va a recibir**: su
 * tarjeta mostrará ese texto y nada más. Un «corrígelo» sin decir qué deja a alguien
 * reenviando a ciegas.
 *
 * Y se dice lo que no pasa: la entrega vigente **sigue disponible** hasta que llegue la
 * nueva versión (§6.3). Pedir una corrección no borra lo entregado ni lo invalida.
 */
const SolicitarCorreccionEntregaModal = ({
  entrega,
  nombreDocumento,
  alSolicitar,
  alCerrar,
  enCurso = false,
  errorServicio = null,
}) => {
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState(null);

  const enviar = (evento) => {
    evento.preventDefault();

    if (!comentario.trim()) {
      setError('Di qué debe corregir: es lo único que va a recibir.');
      return;
    }

    setError(null);
    alSolicitar(comentario.trim());
  };

  return (
    <Modal
      titulo="Solicitar corrección de la entrega"
      apoyo={`${entrega.estudianteNombre} · ${nombreDocumento}`}
      alCerrar={alCerrar}
      cerrarAlPulsarFuera={false}
      pie={(
        <>
          <Boton variante="secundario" onClick={alCerrar} disabled={enCurso}>Cancelar</Boton>
          <Boton type="submit" form="formulario-correccion-entrega" disabled={enCurso}>
            {enCurso ? 'Enviando…' : 'Solicitar corrección'}
          </Boton>
        </>
      )}
    >
      <form id="formulario-correccion-entrega" className="ph-pila" onSubmit={enviar} noValidate>
        {errorServicio && (
          <Aviso tono="error" titulo="No se pudo solicitar">{errorServicio}</Aviso>
        )}

        <Campo
          etiqueta="Qué debe corregir"
          obligatorio
          error={error}
          ayuda="Aparecerá en su tarjeta y en su notificación."
        >
          {(atributos) => (
            <textarea
              {...atributos}
              className={`ph-campo__control${error ? ' ph-campo__control--error' : ''}`}
              placeholder="Falta el detalle de horas por semana en la sección 3. Completa esa tabla y vuelve a enviarlo."
              value={comentario}
              onChange={(evento) => { setComentario(evento.target.value); setError(null); }}
              disabled={enCurso}
            />
          )}
        </Campo>

        <Aviso tono="info" titulo="Qué pasa al solicitarla">
          {`${entrega.estudianteNombre} recibe un aviso y se le habilita Reemplazar archivo. Su entrega actual (v${entrega.versiones.length}) sigue disponible hasta que envíe la nueva, y no se elimina nunca.`}
        </Aviso>

        <Aviso>
          Esto solo afecta a esta persona. Las entregas de los demás estudiantes del
          documento no cambian.
        </Aviso>
      </form>
    </Modal>
  );
};

export default SolicitarCorreccionEntregaModal;
