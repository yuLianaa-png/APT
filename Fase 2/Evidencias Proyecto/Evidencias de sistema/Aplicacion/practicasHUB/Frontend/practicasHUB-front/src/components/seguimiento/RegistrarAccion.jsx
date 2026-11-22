import { useState } from 'react';
import { Aviso, Boton, Campo, Modal } from '../ui';
import { ETIQUETAS, TIPO_ACCION_SEGUIMIENTO } from '../../utils/constants';

const TIPOS = [
  TIPO_ACCION_SEGUIMIENTO.CONTACTO, TIPO_ACCION_SEGUIMIENTO.ACUERDO, TIPO_ACCION_SEGUIMIENTO.NOTA,
];
const LARGO_MAXIMO = 1000;

// Modal para que el docente deje constancia de lo que hizo con un estudiante en alerta:
// un contacto, un acuerdo (con fecha de compromiso opcional) o una nota.

const RegistrarAccion = ({ alEnviar, alCerrar, enCurso = false, errorServicio = null }) => {
  const [tipo, setTipo] = useState(TIPO_ACCION_SEGUIMIENTO.CONTACTO);
  const [nota, setNota] = useState('');
  const [fechaCompromiso, setFechaCompromiso] = useState('');
  const [error, setError] = useState(null);

  const enviar = (evento) => {
    evento.preventDefault();
    if (!nota.trim()) {
      setError('Describe brevemente lo que hiciste o acordaste.');
      return;
    }
    setError(null);
    alEnviar({ tipo, nota: nota.trim(), fechaCompromiso: fechaCompromiso || null });
  };

  return (
    <Modal
      titulo="Registrar acción"
      apoyo="Queda en el historial del seguimiento. El estudiante no lo ve."
      alCerrar={alCerrar}
      cerrarAlPulsarFuera={false}
      pie={(
        <>
          <Boton variante="secundario" onClick={alCerrar} disabled={enCurso}>Cancelar</Boton>
          <Boton type="submit" form="formulario-accion" disabled={enCurso}>
            {enCurso ? 'Guardando…' : 'Guardar acción'}
          </Boton>
        </>
      )}
    >
      <form id="formulario-accion" className="ph-pila" onSubmit={enviar} noValidate>
        {errorServicio && <Aviso tono="error" titulo="No se pudo guardar">{errorServicio}</Aviso>}

        <Campo etiqueta="Tipo de acción" obligatorio>
          {(atributos) => (
            <select
              {...atributos}
              className="ph-campo__control"
              value={tipo}
              onChange={(evento) => setTipo(evento.target.value)}
              disabled={enCurso}
            >
              {TIPOS.map((opcion) => (
                <option key={opcion} value={opcion}>{ETIQUETAS.TIPO_ACCION_SEGUIMIENTO[opcion]}</option>
              ))}
            </select>
          )}
        </Campo>

        <Campo etiqueta="Detalle" obligatorio error={error} ayuda={`Hasta ${LARGO_MAXIMO} caracteres.`}>
          {(atributos) => (
            <textarea
              {...atributos}
              className={`ph-campo__control${error ? ' ph-campo__control--error' : ''}`}
              placeholder="Lo llamé y me contó que estuvo enfermo; retoma el lunes."
              maxLength={LARGO_MAXIMO}
              value={nota}
              onChange={(evento) => { setNota(evento.target.value); setError(null); }}
              disabled={enCurso}
            />
          )}
        </Campo>

        {tipo === TIPO_ACCION_SEGUIMIENTO.ACUERDO && (
          <Campo etiqueta="Fecha de compromiso" ayuda="Opcional: cuándo debería cumplirse lo acordado.">
            {(atributos) => (
              <input
                {...atributos}
                type="date"
                className="ph-campo__control"
                value={fechaCompromiso}
                onChange={(evento) => setFechaCompromiso(evento.target.value)}
                disabled={enCurso}
              />
            )}
          </Campo>
        )}
      </form>
    </Modal>
  );
};

export default RegistrarAccion;
