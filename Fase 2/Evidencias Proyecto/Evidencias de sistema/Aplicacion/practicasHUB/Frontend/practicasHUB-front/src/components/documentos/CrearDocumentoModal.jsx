import { useState } from 'react';
import { Aviso, Boton, Campo, Modal } from '../ui';
import { CampoArchivo } from '../archivos';
import { TIPO_DOCUMENTO } from '../../utils/constants';

const CrearDocumentoModal = ({ alCrear, alCerrar, creando = false, errorServicio = null }) => {
  const [campos, setCampos] = useState({
    nombre: '',
    instrucciones: '',
    tipo: TIPO_DOCUMENTO.INFORMATIVO,
    archivo: null,
  });
  const [errores, setErrores] = useState({});

  const cambiar = (clave) => (evento) => {
    setCampos((previo) => ({ ...previo, [clave]: evento.target.value }));
    setErrores((previo) => ({ ...previo, [clave]: null }));
  };

  const requiereEntrega = campos.tipo === TIPO_DOCUMENTO.REQUIERE_ENTREGA;

  const enviar = (evento) => {
    evento.preventDefault();
    const nuevos = {};

    if (!campos.nombre.trim()) {
      nuevos.nombre = 'Ponle un nombre: es lo que verán tus estudiantes en la tarjeta.';
    }
    if (!campos.archivo) {
      nuevos.archivo = requiereEntrega
        ? 'Adjunta la plantilla que deben completar.'
        : 'Adjunta el documento que quieres publicar.';
    }

    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    alCrear({
      nombre: campos.nombre.trim(),
      instrucciones: campos.instrucciones.trim(),
      tipo: campos.tipo,
      archivo: campos.archivo,
    });
  };

  return (
    <Modal
      titulo="Publicar documento"
      apoyo="Se publica para todos los estudiantes vinculados al código."
      alCerrar={alCerrar}
      cerrarAlPulsarFuera={false}
      pie={(
        <>
          <Boton variante="secundario" onClick={alCerrar} disabled={creando}>Cancelar</Boton>
          <Boton type="submit" form="formulario-documento" disabled={creando}>
            {creando ? 'Publicando…' : 'Publicar'}
          </Boton>
        </>
      )}
    >
      <form id="formulario-documento" className="ph-pila" onSubmit={enviar} noValidate>
        {errorServicio && (
          <Aviso tono="error" titulo="No se pudo publicar">{errorServicio}</Aviso>
        )}

        <Campo etiqueta="Nombre del documento" obligatorio error={errores.nombre}>
          {(atributos) => (
            <input
              {...atributos}
              className={`ph-campo__control${errores.nombre ? ' ph-campo__control--error' : ''}`}
              placeholder="Informe de avance de práctica"
              value={campos.nombre}
              onChange={cambiar('nombre')}
              disabled={creando}
            />
          )}
        </Campo>

        <Campo
          etiqueta="Instrucciones"
          ayuda="Opcional. Lo que el estudiante debe saber antes de abrir el archivo."
        >
          {(atributos) => (
            <textarea
              {...atributos}
              className="ph-campo__control"
              placeholder="Completa la pauta con el avance de tus primeras 120 horas."
              value={campos.instrucciones}
              onChange={cambiar('instrucciones')}
              disabled={creando}
            />
          )}
        </Campo>

        <Campo etiqueta="Tipo de publicación" obligatorio>
          {(atributos) => (
            <select
              {...atributos}
              className="ph-campo__control"
              value={campos.tipo}
              onChange={cambiar('tipo')}
              disabled={creando}
            >
              <option value={TIPO_DOCUMENTO.INFORMATIVO}>
                Informativo — solo para consultar
              </option>
              <option value={TIPO_DOCUMENTO.REQUIERE_ENTREGA}>
                Requiere entrega — cada estudiante debe enviar un archivo
              </option>
            </select>
          )}
        </Campo>

        <Aviso tono={requiereEntrega ? 'espera' : 'info'}>
          {requiereEntrega
            ? 'Se creará la misma solicitud para todos los estudiantes del código, pero cada uno tendrá su propia entrega, su estado y su historial de versiones. Quienes se vinculen más adelante también la verán.'
            : 'Quedará disponible para que todos los estudiantes del código lo consulten y descarguen. No se les pedirá nada a cambio.'}
        </Aviso>

        <CampoArchivo
          etiqueta={requiereEntrega ? 'Plantilla a completar' : 'Documento'}
          obligatorio
          valor={campos.archivo}
          errorExterno={errores.archivo}
          alCambiar={(archivo) => {
            setCampos((previo) => ({ ...previo, archivo }));
            setErrores((previo) => ({ ...previo, archivo: null }));
          }}
        />
      </form>
    </Modal>
  );
};

export default CrearDocumentoModal;
