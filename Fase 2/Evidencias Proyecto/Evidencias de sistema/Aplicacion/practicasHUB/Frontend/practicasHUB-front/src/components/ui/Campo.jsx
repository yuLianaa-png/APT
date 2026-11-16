import { useId } from 'react';


const Campo = ({
  etiqueta,
  children,
  ayuda = null,
  error = null,
  obligatorio = false,
  id,
  className = '',
}) => {
  const idGenerado = useId();
  const idCampo = id ?? idGenerado;
  const idAyuda = `${idCampo}-ayuda`;
  const idError = `${idCampo}-error`;

  const descripcion = [ayuda ? idAyuda : null, error ? idError : null]
    .filter(Boolean)
    .join(' ') || undefined;

  // El control llega como hijo único; se le añaden id, clases y accesibilidad.
  const control = typeof children === 'function'
    ? children({ id: idCampo, 'aria-describedby': descripcion, 'aria-invalid': Boolean(error) })
    : children;

  return (
    <div className={`ph-campo ${className}`.trim()}>
      <label className="ph-campo__etiqueta" htmlFor={idCampo}>
        {etiqueta}
        {obligatorio && (
          <>
            {' '}
            <span className="ph-campo__obligatorio" aria-hidden="true">*</span>
            <span className="ph-solo-lectores">(obligatorio)</span>
          </>
        )}
      </label>

      {control}

      {ayuda && <span id={idAyuda} className="ph-campo__ayuda">{ayuda}</span>}

      {error && (
        <span id={idError} className="ph-campo__error" role="alert">
          <span aria-hidden="true">⚠</span>
          {error}
        </span>
      )}
    </div>
  );
};

export default Campo;
