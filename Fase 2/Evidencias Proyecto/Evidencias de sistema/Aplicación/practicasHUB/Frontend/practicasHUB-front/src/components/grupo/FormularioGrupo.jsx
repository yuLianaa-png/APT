import { useState } from 'react';
import { Aviso, Boton, Campo, Modal } from '../ui';

//Formulario para crear un grupo de práctica.

const FormularioGrupo = ({ alCrear, alCerrar, creando = false, errorServicio = null }) => {
  const [campos, setCampos] = useState({ nombre: '', descripcion: '', metaMinimaHoras: '' });
  const [errores, setErrores] = useState({});

  const cambiar = (clave) => (evento) => {
    setCampos((previo) => ({ ...previo, [clave]: evento.target.value }));
    setErrores((previo) => ({ ...previo, [clave]: null }));
  };

  const validar = () => {
    const nuevos = {};

    if (!campos.nombre.trim()) {
      nuevos.nombre = 'Ponle un nombre al grupo: es lo que verán tus estudiantes.';
    }
    if (!campos.descripcion.trim()) {
      nuevos.descripcion = 'Describe brevemente de qué práctica se trata.';
    }

    const meta = Number(campos.metaMinimaHoras);
    if (!campos.metaMinimaHoras.trim()) {
      nuevos.metaMinimaHoras = 'Indica la meta mínima de horas del grupo.';
    } else if (!Number.isFinite(meta) || meta <= 0) {
      nuevos.metaMinimaHoras = 'La meta debe ser un número de horas mayor que cero.';
    }

    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const enviar = (evento) => {
    evento.preventDefault();
    if (!validar()) return;

    alCrear({
      nombre: campos.nombre.trim(),
      descripcion: campos.descripcion.trim(),
      metaMinimaHoras: Number(campos.metaMinimaHoras),
    });
  };

  return (
    <Modal
      titulo="Crear grupo de práctica"
      apoyo="Al confirmar, el sistema genera el código de vinculación que compartirás con tus estudiantes."
      alCerrar={alCerrar}
      cerrarAlPulsarFuera={false}
      pie={(
        <>
          <Boton variante="secundario" onClick={alCerrar} disabled={creando}>Cancelar</Boton>
          <Boton type="submit" form="formulario-grupo" disabled={creando}>
            {creando ? 'Creando…' : 'Crear grupo'}
          </Boton>
        </>
      )}
    >
      <form id="formulario-grupo" className="ph-pila" onSubmit={enviar} noValidate>
        {errorServicio && <Aviso tono="error" titulo="No se pudo crear">{errorServicio}</Aviso>}

        <Campo etiqueta="Nombre del grupo" obligatorio error={errores.nombre}>
          {(atributos) => (
            <input
              {...atributos}
              className={`ph-campo__control${errores.nombre ? ' ph-campo__control--error' : ''}`}
              placeholder="Práctica Laboral 2026 — Informática"
              value={campos.nombre}
              onChange={cambiar('nombre')}
              disabled={creando}
            />
          )}
        </Campo>

        <Campo
          etiqueta="Descripción"
          obligatorio
          error={errores.descripcion}
          ayuda="Tus estudiantes la ven antes de confirmar la vinculación."
        >
          {(atributos) => (
            <textarea
              {...atributos}
              className={`ph-campo__control${errores.descripcion ? ' ph-campo__control--error' : ''}`}
              placeholder="Seguimiento de práctica laboral para estudiantes de…"
              value={campos.descripcion}
              onChange={cambiar('descripcion')}
              disabled={creando}
            />
          )}
        </Campo>

        <Campo
          etiqueta="Meta mínima de horas"
          obligatorio
          error={errores.metaMinimaHoras}
          ayuda="Es un mínimo por estudiante, no un tope: las horas siguen acumulando después de alcanzarla."
        >
          {(atributos) => (
            <input
              {...atributos}
              className={`ph-campo__control${errores.metaMinimaHoras ? ' ph-campo__control--error' : ''}`}
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              placeholder="360"
              value={campos.metaMinimaHoras}
              onChange={cambiar('metaMinimaHoras')}
              disabled={creando}
            />
          )}
        </Campo>

        <Aviso>
          El código de vinculación lo genera el sistema al crear el grupo. No se escribe a
          mano y no se puede regenerar después.
        </Aviso>
      </form>
    </Modal>
  );
};

export default FormularioGrupo;
