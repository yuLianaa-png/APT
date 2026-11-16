import { useState } from 'react';
import { Aviso, Boton, Campo, Modal } from '../ui';

// Modal para definir, cambiar o quitar la fecha de término de un grupo.

const FechaTerminoGrupo = ({
  grupo, alGuardar, alCerrar, guardando = false, errorServicio = null,
}) => {
  const [fecha, setFecha] = useState(grupo.fechaTermino ?? '');
  const minimo = grupo.creadoEn ? grupo.creadoEn.slice(0, 10) : undefined;

  const enviar = (evento) => {
    evento.preventDefault();
    alGuardar(fecha || null);
  };

  return (
    <Modal
      titulo={grupo.fechaTermino ? 'Cambiar la fecha de término' : 'Definir la fecha de término'}
      apoyo={`${grupo.nombre} · ${grupo.codigo}`}
      alCerrar={alCerrar}
      cerrarAlPulsarFuera={false}
      pie={(
        <>
          <Boton variante="secundario" onClick={alCerrar} disabled={guardando}>Cancelar</Boton>
          {grupo.fechaTermino && (
            <Boton variante="tenue" onClick={() => alGuardar(null)} disabled={guardando}>
              Quitar fecha
            </Boton>
          )}
          <Boton type="submit" form="formulario-fecha-termino" disabled={guardando || !fecha}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Boton>
        </>
      )}
    >
      <form id="formulario-fecha-termino" className="ph-pila" onSubmit={enviar} noValidate>
        {errorServicio && <Aviso tono="error" titulo="No se pudo guardar">{errorServicio}</Aviso>}

        <Campo
          etiqueta="Fecha de término de la práctica"
          ayuda="Con ella el sistema estima si, al ritmo actual, cada estudiante alcanzará la meta mínima a tiempo."
        >
          {(atributos) => (
            <input
              {...atributos}
              className="ph-campo__control"
              type="date"
              min={minimo}
              value={fecha}
              onChange={(evento) => setFecha(evento.target.value)}
              disabled={guardando}
            />
          )}
        </Campo>

        <Aviso>
          No cierra el grupo ni bloquea nada: solo se usa para las alertas de ritmo. Para
          cerrar el grupo usa <strong>Desactivar</strong> en el Dashboard.
        </Aviso>
      </form>
    </Modal>
  );
};

export default FechaTerminoGrupo;
