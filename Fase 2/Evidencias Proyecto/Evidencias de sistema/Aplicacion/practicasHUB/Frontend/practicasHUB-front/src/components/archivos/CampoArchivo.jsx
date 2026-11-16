import { useId, useRef, useState } from 'react';
import { Boton } from '../ui';
import { LIMITES_ARCHIVO } from '../../utils/constants';
import { formatearTamano, validarArchivo } from '../../utils/archivos';


const CampoArchivo = ({
  etiqueta = 'Archivo',
  ayuda = null,
  obligatorio = false,
  valor = null,
  alCambiar,
  bloqueado = false,
  motivoBloqueo = null,
  errorExterno = null,
}) => {
  const idCampo = useId();
  const idAyuda = `${idCampo}-ayuda`;
  const idError = `${idCampo}-error`;
  const entrada = useRef(null);
  const [error, setError] = useState(null);

  const mensajeError = errorExterno ?? error;

  const alSeleccionar = (evento) => {
    const archivo = evento.target.files?.[0] ?? null;

    if (!archivo) {
      setError(null);
      return;
    }

    const resultado = validarArchivo(archivo);
    if (!resultado.ok) {
      setError(resultado.mensaje);
      // Se descarta la selección pero NO se toca el resto del formulario).
      evento.target.value = '';
      alCambiar?.(null);
      return;
    }

    setError(null);
    alCambiar?.(archivo);
  };

  const quitar = () => {
    setError(null);
    if (entrada.current) entrada.current.value = '';
    alCambiar?.(null);
  };

  const aceptados = LIMITES_ARCHIVO.EXTENSIONES.map((ext) => `.${ext}`).join(',');

  return (
    <div className="ph-campo">
      <span className="ph-campo__etiqueta" id={`${idCampo}-etiqueta`}>
        {etiqueta}
        {obligatorio && (
          <>
            {' '}
            <span className="ph-campo__obligatorio" aria-hidden="true">*</span>
            <span className="ph-solo-lectores">(obligatorio)</span>
          </>
        )}
      </span>

      {valor ? (
        <div className="ph-archivo-elegido">
          <span className="ph-archivo-elegido__datos">
            <strong>{valor.name ?? valor.nombre}</strong>
            <span className="ph-campo__ayuda">
              {formatearTamano(valor.size ?? valor.tamanoBytes)}
            </span>
          </span>
          <Boton
            variante="secundario"
            tamano="pequeno"
            bloqueado={bloqueado}
            motivoBloqueo={motivoBloqueo}
            mostrarMotivo={false}
            onClick={quitar}
          >
            Quitar
          </Boton>
        </div>
      ) : (
        <>
          <input
            ref={entrada}
            id={idCampo}
            className="ph-archivo-entrada"
            type="file"
            accept={aceptados}
            disabled={bloqueado}
            aria-describedby={[ayuda ? idAyuda : null, mensajeError ? idError : null]
              .filter(Boolean).join(' ') || undefined}
            aria-invalid={Boolean(mensajeError)}
            onChange={alSeleccionar}
          />
          {bloqueado && motivoBloqueo && (
            <span className="ph-campo__ayuda">{motivoBloqueo}</span>
          )}
        </>
      )}

      <span id={idAyuda} className="ph-campo__ayuda">
        {ayuda ?? `Hasta 40 MB. Se admiten ${LIMITES_ARCHIVO.EXTENSIONES.join(', ')}.`}
      </span>

      {mensajeError && (
        <span id={idError} className="ph-campo__error" role="alert">
          <span aria-hidden="true">⚠</span>
          {mensajeError}
        </span>
      )}
    </div>
  );
};

export default CampoArchivo;
