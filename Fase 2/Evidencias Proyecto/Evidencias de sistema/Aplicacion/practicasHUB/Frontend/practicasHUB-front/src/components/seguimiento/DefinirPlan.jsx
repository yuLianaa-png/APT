import { useState } from 'react';
import { Aviso, Boton, Campo, Modal } from '../ui';

// Modal del plan o prórroga: una fecha de término propia del estudiante y/o un
// compromiso de horas por semana. Dejar ambos vacíos quita el plan.

const DefinirPlan = ({ plan, alEnviar, alCerrar, enCurso = false, errorServicio = null }) => {
  const [fechaTermino, setFechaTermino] = useState(plan?.fechaTermino ?? '');
  const [horasSemanales, setHorasSemanales] = useState(plan?.horasSemanales ?? '');
  const [nota, setNota] = useState('');
  const [error, setError] = useState(null);

  const enviar = (evento) => {
    evento.preventDefault();
    const horas = horasSemanales === '' ? null : Number(horasSemanales);
    if (horas !== null && (!Number.isFinite(horas) || horas <= 0 || horas > 80)) {
      setError('Las horas semanales deben ser mayores que 0 y como máximo 80.');
      return;
    }
    setError(null);
    alEnviar({ fechaTermino: fechaTermino || null, horasSemanales: horas, nota: nota.trim() });
  };

  return (
    <Modal
      titulo="Plan o prórroga"
      apoyo="El estudiante recibe un aviso con el plan acordado."
      alCerrar={alCerrar}
      cerrarAlPulsarFuera={false}
      pie={(
        <>
          <Boton variante="secundario" onClick={alCerrar} disabled={enCurso}>Cancelar</Boton>
          <Boton type="submit" form="formulario-plan" disabled={enCurso}>
            {enCurso ? 'Guardando…' : 'Guardar plan'}
          </Boton>
        </>
      )}
    >
      <form id="formulario-plan" className="ph-pila" onSubmit={enviar} noValidate>
        {errorServicio && <Aviso tono="error" titulo="No se pudo guardar">{errorServicio}</Aviso>}

        <Campo etiqueta="Nueva fecha de término" ayuda="Vacío: rige la fecha del grupo.">
          {(atributos) => (
            <input
              {...atributos}
              type="date"
              className="ph-campo__control"
              value={fechaTermino}
              onChange={(evento) => setFechaTermino(evento.target.value)}
              disabled={enCurso}
            />
          )}
        </Campo>

        <Campo etiqueta="Compromiso de horas por semana" error={error} ayuda="Vacío: sin compromiso. Se revisa cada 7 días.">
          {(atributos) => (
            <input
              {...atributos}
              type="number"
              min="1"
              max="80"
              step="0.5"
              className={`ph-campo__control${error ? ' ph-campo__control--error' : ''}`}
              value={horasSemanales}
              onChange={(evento) => { setHorasSemanales(evento.target.value); setError(null); }}
              disabled={enCurso}
            />
          )}
        </Campo>

        <Campo etiqueta="Comentario" ayuda="Opcional. Queda en el historial.">
          {(atributos) => (
            <textarea
              {...atributos}
              className="ph-campo__control"
              maxLength={1000}
              value={nota}
              onChange={(evento) => setNota(evento.target.value)}
              disabled={enCurso}
            />
          )}
        </Campo>
      </form>
    </Modal>
  );
};

export default DefinirPlan;
